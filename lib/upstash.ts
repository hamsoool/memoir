import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

// 90 days in seconds = 7,776,000s
export const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;
export const COOKIE_SESSION_NAME = 'memoir_device_session';

export interface DeviceSession {
  token: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Returns an active Upstash Redis client instance if credentials exist in the environment,
 * or null if unconfigured (allowing graceful fallback).
 */
export function getRedis(): Redis | null {
  if (redisInstance) return redisInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redisInstance = new Redis({
    url,
    token,
  });

  return redisInstance;
}

/**
 * Saves an authorized device session and its IP in Upstash Redis with a 90-day TTL.
 */
export async function saveDeviceSession(session: DeviceSession): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    // 1. Store by session token with 90-day expiration
    await client.set(`memoir:session:${session.token}`, JSON.stringify(session), {
      ex: SESSION_TTL_SECONDS,
    });

    // 2. Also index client IP for seamless network/device recall
    if (session.ip && session.ip !== '127.0.0.1' && session.ip !== '::1') {
      await client.set(`memoir:ip:${session.ip}`, session.token, {
        ex: SESSION_TTL_SECONDS,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to save device session to Upstash Redis:', err);
    return false;
  }
}

/**
 * Retrieves an authorized device session by its unique token.
 */
export async function getDeviceSession(token: string): Promise<DeviceSession | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const raw = await client.get<string | DeviceSession>(`memoir:session:${token}`);
    if (!raw) return null;

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as DeviceSession;
      } catch {
        return null;
      }
    }

    return raw;
  } catch (err) {
    console.error('Failed to get device session from Upstash Redis:', err);
    return null;
  }
}

/**
 * Retrieves an authorized device session by IP address.
 */
export async function getSessionByIp(ip: string): Promise<DeviceSession | null> {
  const client = getRedis();
  if (!client || !ip || ip === '127.0.0.1' || ip === '::1') return null;

  try {
    const token = await client.get<string>(`memoir:ip:${ip}`);
    if (!token) return null;
    return getDeviceSession(token);
  } catch (err) {
    console.error('Failed to get session by IP from Upstash Redis:', err);
    return null;
  }
}

/**
 * Removes a device session from Upstash Redis.
 */
export async function deleteDeviceSession(token: string, ip?: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;

  try {
    await client.del(`memoir:session:${token}`);
    if (ip) {
      await client.del(`memoir:ip:${ip}`);
    }
    return true;
  } catch (err) {
    console.error('Failed to delete device session from Upstash Redis:', err);
    return false;
  }
}

// ── Security & Anti-Bruteforce Rate Limiting ────────────────────────────
export const COOKIE_DEVICE_ID = 'memoir_device_id';
export const WRONG_ATTEMPTS_TIMEOUT_THRESHOLD = 5;
export const WRONG_ATTEMPTS_BAN_THRESHOLD = 20;
export const TIMEOUT_DURATION_SECONDS = 5 * 60; // 5 minutes = 300 seconds

export interface SecurityStatus {
  banned: boolean;
  timedOut: boolean;
  attempts: number;
  remainingSeconds: number;
}

// Local in-memory fallback if Redis is unconfigured
interface MemorySecurityRecord {
  attempts: number;
  banned: boolean;
  timeoutUntil?: number;
}
const memorySecurityMap = new Map<string, MemorySecurityRecord>();

/**
 * Checks if an IP or device is banned or currently in a 5-minute timeout.
 */
export async function checkSecurityStatus(identifier: string): Promise<SecurityStatus> {
  if (!identifier) {
    return { banned: false, timedOut: false, attempts: 0, remainingSeconds: 0 };
  }

  const client = getRedis();

  if (client) {
    try {
      // 1. Check permanent ban
      const isBanned = await client.get<string | boolean>(`memoir:banned:${identifier}`);
      if (isBanned) {
        return { banned: true, timedOut: false, attempts: 20, remainingSeconds: 0 };
      }

      // 2. Check 5-minute timeout
      const ttl = await client.ttl(`memoir:timeout:${identifier}`);
      const attempts = (await client.get<number>(`memoir:attempts:${identifier}`)) || 0;

      if (ttl && ttl > 0) {
        return {
          banned: false,
          timedOut: true,
          attempts: Number(attempts),
          remainingSeconds: ttl,
        };
      }

      return {
        banned: false,
        timedOut: false,
        attempts: Number(attempts),
        remainingSeconds: 0,
      };
    } catch (err) {
      console.error('Security check error in Redis:', err);
    }
  }

  // In-memory fallback
  const record = memorySecurityMap.get(identifier);
  if (!record) {
    return { banned: false, timedOut: false, attempts: 0, remainingSeconds: 0 };
  }

  if (record.banned) {
    return { banned: true, timedOut: false, attempts: 20, remainingSeconds: 0 };
  }

  if (record.timeoutUntil && record.timeoutUntil > Date.now()) {
    const remainingSeconds = Math.ceil((record.timeoutUntil - Date.now()) / 1000);
    return {
      banned: false,
      timedOut: true,
      attempts: record.attempts,
      remainingSeconds,
    };
  }

  return {
    banned: false,
    timedOut: false,
    attempts: record.attempts,
    remainingSeconds: 0,
  };
}

/**
 * Records a failed passcode attempt.
 * - Triggers a 5-minute timeout at 5 attempts.
 * - Triggers a permanent ban at 20 attempts.
 */
export async function recordFailedAttempt(identifier: string): Promise<SecurityStatus> {
  if (!identifier) {
    return { banned: false, timedOut: false, attempts: 1, remainingSeconds: 0 };
  }

  const client = getRedis();

  if (client) {
    try {
      const attempts = await client.incr(`memoir:attempts:${identifier}`);
      // Expire attempts counter after 24h of inactivity
      await client.expire(`memoir:attempts:${identifier}`, 24 * 60 * 60);

      // Ban if 20 or more wrong attempts
      if (attempts >= WRONG_ATTEMPTS_BAN_THRESHOLD) {
        await client.set(`memoir:banned:${identifier}`, 'true');
        await client.del(`memoir:timeout:${identifier}`);
        return { banned: true, timedOut: false, attempts, remainingSeconds: 0 };
      }

      // 5-minute timeout if 5 or more wrong attempts
      if (attempts >= WRONG_ATTEMPTS_TIMEOUT_THRESHOLD) {
        await client.set(`memoir:timeout:${identifier}`, 'active', {
          ex: TIMEOUT_DURATION_SECONDS,
        });
        return {
          banned: false,
          timedOut: true,
          attempts,
          remainingSeconds: TIMEOUT_DURATION_SECONDS,
        };
      }

      return { banned: false, timedOut: false, attempts, remainingSeconds: 0 };
    } catch (err) {
      console.error('Failed to record security attempt in Redis:', err);
    }
  }

  // In-memory fallback
  const record = memorySecurityMap.get(identifier) || { attempts: 0, banned: false };
  record.attempts += 1;

  if (record.attempts >= WRONG_ATTEMPTS_BAN_THRESHOLD) {
    record.banned = true;
    record.timeoutUntil = undefined;
    memorySecurityMap.set(identifier, record);
    return { banned: true, timedOut: false, attempts: record.attempts, remainingSeconds: 0 };
  }

  if (record.attempts >= WRONG_ATTEMPTS_TIMEOUT_THRESHOLD) {
    record.timeoutUntil = Date.now() + TIMEOUT_DURATION_SECONDS * 1000;
    memorySecurityMap.set(identifier, record);
    return {
      banned: false,
      timedOut: true,
      attempts: record.attempts,
      remainingSeconds: TIMEOUT_DURATION_SECONDS,
    };
  }

  memorySecurityMap.set(identifier, record);
  return { banned: false, timedOut: false, attempts: record.attempts, remainingSeconds: 0 };
}

/**
 * Resets the failed attempts counter upon a successful passcode entry.
 */
export async function resetSecurityAttempts(identifier: string): Promise<void> {
  if (!identifier) return;

  const client = getRedis();
  if (client) {
    try {
      await client.del(`memoir:attempts:${identifier}`);
      await client.del(`memoir:timeout:${identifier}`);
    } catch (err) {
      console.error('Failed to reset security attempts in Redis:', err);
    }
  }

  const record = memorySecurityMap.get(identifier);
  if (record && !record.banned) {
    memorySecurityMap.delete(identifier);
  }
}

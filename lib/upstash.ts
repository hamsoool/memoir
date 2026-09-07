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

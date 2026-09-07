import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  COOKIE_DEVICE_ID,
  COOKIE_SESSION_NAME,
  SESSION_TTL_SECONDS,
  checkSecurityStatus,
  recordFailedAttempt,
  resetSecurityAttempts,
  saveDeviceSession,
} from '@/lib/upstash';

export const dynamic = 'force-dynamic';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    let deviceId = cookieStore.get(COOKIE_DEVICE_ID)?.value;
    let isNewDevice = false;

    if (!deviceId) {
      deviceId = crypto.randomUUID();
      isNewDevice = true;
    }

    const clientIp = getClientIp(req);

    // 1. Check if IP or device is banned or timed out
    const ipSec = await checkSecurityStatus(clientIp);
    const devSec = await checkSecurityStatus(deviceId);

    if (ipSec.banned || devSec.banned) {
      return NextResponse.json(
        {
          ok: false,
          banned: true,
          error: 'Access permanently restricted after 20 unauthorized attempts.',
        },
        { status: 403 }
      );
    }

    const activeTimeout = Math.max(ipSec.remainingSeconds, devSec.remainingSeconds);
    if (activeTimeout > 0) {
      return NextResponse.json(
        {
          ok: false,
          timedOut: true,
          remainingSeconds: activeTimeout,
          error: `Too many incorrect attempts. Device is timed out. Try again in ${Math.ceil(
            activeTimeout / 60
          )} minutes.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    const expectedCode = (
      process.env.ACCESS_CODE ||
      process.env.NEXT_PUBLIC_ACCESS_CODE ||
      ''
    ).trim();

    // 2. Verify code
    if (expectedCode && code !== expectedCode) {
      const updatedIp = await recordFailedAttempt(clientIp);
      const updatedDev = await recordFailedAttempt(deviceId);

      const isBanned = updatedIp.banned || updatedDev.banned;
      if (isBanned) {
        return NextResponse.json(
          {
            ok: false,
            banned: true,
            error: 'Access permanently restricted after 20 unauthorized attempts.',
          },
          { status: 403 }
        );
      }

      const remainingSeconds = Math.max(
        updatedIp.remainingSeconds,
        updatedDev.remainingSeconds
      );
      const totalAttempts = Math.max(updatedIp.attempts, updatedDev.attempts);

      if (remainingSeconds > 0) {
        return NextResponse.json(
          {
            ok: false,
            timedOut: true,
            attempts: totalAttempts,
            remainingSeconds,
            error: `Too many incorrect attempts. Device timed out for 5 minutes.`,
          },
          { status: 429 }
        );
      }

      const attemptsLeft = Math.max(1, 5 - (totalAttempts % 5 || 5));
      const response = NextResponse.json(
        {
          ok: false,
          attempts: totalAttempts,
          attemptsLeft,
          error: `Incorrect passcode. ${attemptsLeft} attempt${
            attemptsLeft === 1 ? '' : 's'
          } remaining before a 5-minute timeout.`,
        },
        { status: 401 }
      );

      if (isNewDevice) {
        response.cookies.set({
          name: COOKIE_DEVICE_ID,
          value: deviceId,
          maxAge: 365 * 24 * 60 * 60,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        });
      }

      return response;
    }

    // 3. Reset security attempts on success
    await resetSecurityAttempts(clientIp);
    await resetSecurityAttempts(deviceId);

    const token = crypto.randomUUID();
    const userAgent = req.headers.get('user-agent') || 'Unknown device';
    const expiresAt = new Date(
      Date.now() + SESSION_TTL_SECONDS * 1000
    ).toISOString();

    const session = {
      token,
      ip: clientIp,
      userAgent,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    // Save to Upstash Redis (if configured)
    await saveDeviceSession(session);

    // Set 90-day cookie
    const response = NextResponse.json({
      ok: true,
      message: 'Device authorized for 90 days',
      expiresAt,
    });

    response.cookies.set({
      name: COOKIE_SESSION_NAME,
      value: token,
      maxAge: SESSION_TTL_SECONDS,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    if (isNewDevice) {
      response.cookies.set({
        name: COOKIE_DEVICE_ID,
        value: deviceId,
        maxAge: 365 * 24 * 60 * 60,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('Passcode verification error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify passcode' },
      { status: 500 }
    );
  }
}

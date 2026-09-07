import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  COOKIE_DEVICE_ID,
  COOKIE_SESSION_NAME,
  checkSecurityStatus,
  getDeviceSession,
  getSessionByIp,
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

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_SESSION_NAME)?.value;
    const deviceId = cookieStore.get(COOKIE_DEVICE_ID)?.value || '';
    const clientIp = getClientIp(req);

    // 0. Check if visitor's IP or device is banned or timed out
    const ipSec = await checkSecurityStatus(clientIp);
    const devSec = await checkSecurityStatus(deviceId);

    if (ipSec.banned || devSec.banned) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        gateRequired: true,
        banned: true,
        error: 'Access permanently restricted after 20 unauthorized attempts.',
      });
    }

    const remainingSeconds = Math.max(ipSec.remainingSeconds, devSec.remainingSeconds);
    const timedOut = remainingSeconds > 0;

    // 1. Check if client has a valid 90-day device session token in cookie
    if (token && !timedOut) {
      const session = await getDeviceSession(token);
      if (session) {
        return NextResponse.json({
          ok: true,
          authenticated: true,
          method: 'device_cookie',
          session: {
            ip: session.ip,
            userAgent: session.userAgent,
            expiresAt: session.expiresAt,
          },
        });
      }
    }

    // 2. Check if client's IP is indexed in Upstash Redis as an authorized partner IP
    if (clientIp && clientIp !== '127.0.0.1' && !timedOut) {
      const ipSession = await getSessionByIp(clientIp);
      if (ipSession) {
        return NextResponse.json({
          ok: true,
          authenticated: true,
          method: 'ip_address',
          session: {
            ip: ipSession.ip,
            userAgent: ipSession.userAgent,
            expiresAt: ipSession.expiresAt,
          },
        });
      }
    }

    const gateRequired = Boolean(
      (process.env.ACCESS_CODE || process.env.NEXT_PUBLIC_ACCESS_CODE || '').trim()
    );

    return NextResponse.json({
      ok: true,
      authenticated: false,
      gateRequired,
      timedOut,
      remainingSeconds,
    });
  } catch (err) {
    console.error('Session check error:', err);
    return NextResponse.json(
      { ok: false, authenticated: false, gateRequired: true, error: 'Session check failed' },
      { status: 500 }
    );
  }
}

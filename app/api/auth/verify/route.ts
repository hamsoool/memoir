import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_SESSION_NAME,
  SESSION_TTL_SECONDS,
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
    const body = await req.json();
    const code = typeof body.code === 'string' ? body.code.trim() : '';

    const expectedCode = (
      process.env.ACCESS_CODE ||
      process.env.NEXT_PUBLIC_ACCESS_CODE ||
      ''
    ).trim();

    // Verify code
    if (expectedCode && code !== expectedCode) {
      return NextResponse.json(
        { ok: false, error: 'Incorrect passcode' },
        { status: 401 }
      );
    }

    const token = crypto.randomUUID();
    const clientIp = getClientIp(req);
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

    return response;
  } catch (err) {
    console.error('Passcode verification error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to verify passcode' },
      { status: 500 }
    );
  }
}

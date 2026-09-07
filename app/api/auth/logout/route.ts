import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_SESSION_NAME, deleteDeviceSession } from '@/lib/upstash';

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
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_SESSION_NAME)?.value;
  const clientIp = getClientIp(req);

  if (token) {
    await deleteDeviceSession(token, clientIp);
  }

  const response = NextResponse.json({ ok: true, message: 'Device logged out' });

  response.cookies.set({
    name: COOKIE_SESSION_NAME,
    value: '',
    maxAge: 0,
    path: '/',
  });

  return response;
}

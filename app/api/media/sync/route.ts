import { NextResponse } from 'next/server';
import { getReelVersion } from '@/lib/upstash';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientVersion = searchParams.get('version');
    const currentVersion = await getReelVersion();

    const changed = Boolean(clientVersion && clientVersion !== currentVersion);

    return NextResponse.json(
      {
        ok: true,
        changed,
        version: currentVersion,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('[Memoir Sync] Error checking reel version:', err);
    return NextResponse.json(
      { ok: false, changed: false, version: '' },
      { status: 500 }
    );
  }
}

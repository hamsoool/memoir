import { NextResponse } from 'next/server';
import { sendBatchToDiscord, DiscordNotifyOptions } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body.items as DiscordNotifyOptions[];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No attachment items provided' },
        { status: 400 }
      );
    }

    const ok = await sendBatchToDiscord(items);

    return NextResponse.json({ ok });
  } catch (err) {
    console.error('Discord batch notification API error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to notify Discord' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { sendPhotoStripToDiscord } from '@/lib/discord';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const themeName = (formData.get('themeName') as string) || '';
    const layoutName = (formData.get('layoutName') as string) || '';
    const caption = (formData.get('caption') as string) || '';

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No photo strip file uploaded.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await sendPhotoStripToDiscord({
      buffer: arrayBuffer,
      filename: file.name || 'memoir-photo-strip.png',
      themeName,
      layoutName,
      caption,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal server error';
    console.error('Discord strip upload endpoint error:', err);
    return NextResponse.json(
      { ok: false, error: errMsg },
      { status: 500 }
    );
  }
}

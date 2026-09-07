import { NextResponse } from 'next/server';
import {
  getCloudinaryMedia,
  deleteCloudinaryMedia,
  getCloudinaryAccountUsage,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json({
        ok: true,
        items: [],
        totalBytes: 0,
        configured: false,
        usage: null,
      });
    }

    const [{ items, totalBytes }, usage] = await Promise.all([
      getCloudinaryMedia(),
      getCloudinaryAccountUsage(),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      totalBytes,
      configured: true,
      usage,
    });
  } catch (err) {
    console.error('[Memoir] Error fetching Cloudinary media:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve media.',
        items: [],
        totalBytes: 0,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Cloudinary is not configured.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { publicId, kind } = body;

    if (!publicId) {
      return NextResponse.json(
        { ok: false, error: 'publicId is required.' },
        { status: 400 }
      );
    }

    await deleteCloudinaryMedia(publicId, kind === 'video' ? 'video' : 'image');

    return NextResponse.json({ ok: true, deleted: publicId });
  } catch (err) {
    console.error('[Memoir] Error deleting media from Cloudinary:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to delete media.' },
      { status: 500 }
    );
  }
}

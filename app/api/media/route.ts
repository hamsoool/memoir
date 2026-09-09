import { NextResponse } from 'next/server';
import {
  getCloudinaryMedia,
  deleteCloudinaryMedia,
  bulkDeleteCloudinaryMedia,
  getCloudinaryAccountUsage,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';
import { getReelVersion, bumpReelVersion } from '@/lib/upstash';

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
        version: '',
      });
    }

    const [{ items, totalBytes }, usage, version] = await Promise.all([
      getCloudinaryMedia(),
      getCloudinaryAccountUsage(),
      getReelVersion(),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      totalBytes,
      configured: true,
      usage,
      version,
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

    // Support bulk deletion via body.items
    if (Array.isArray(body.items) && body.items.length > 0) {
      await bulkDeleteCloudinaryMedia(body.items);
      await bumpReelVersion();
      return NextResponse.json({ ok: true, deletedCount: body.items.length });
    }

    // Support single item deletion
    const { publicId, kind } = body;

    if (!publicId) {
      return NextResponse.json(
        { ok: false, error: 'publicId is required.' },
        { status: 400 }
      );
    }

    await deleteCloudinaryMedia(publicId, kind === 'video' ? 'video' : 'image');
    await bumpReelVersion();

    return NextResponse.json({ ok: true, deleted: publicId });
  } catch (err) {
    console.error('[Memoir] Error deleting media from Cloudinary:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to delete media.' },
      { status: 500 }
    );
  }
}

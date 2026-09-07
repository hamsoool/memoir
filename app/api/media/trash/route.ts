import { NextResponse } from 'next/server';
import {
  tagCloudinaryMedia,
  untagCloudinaryMedia,
  deleteCloudinaryMedia,
  getCloudinaryMedia,
  isCloudinaryConfigured,
} from '@/lib/cloudinary';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Cloudinary is not configured.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { publicId, action } = body;

    if (!publicId) {
      return NextResponse.json(
        { ok: false, error: 'publicId is required.' },
        { status: 400 }
      );
    }

    if (action === 'restore') {
      await untagCloudinaryMedia(publicId, 'trash');
    } else {
      await tagCloudinaryMedia(publicId, 'trash');
    }

    return NextResponse.json({ ok: true, publicId, action });
  } catch (err) {
    console.error('[Memoir] Error modifying trash state in Cloudinary:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Action failed.' },
      { status: 500 }
    );
  }
}

/**
 * Empty trash: permanently deletes all items tagged with 'trash' from Cloudinary.
 */
export async function DELETE() {
  try {
    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Cloudinary is not configured.' },
        { status: 400 }
      );
    }

    const { items } = await getCloudinaryMedia();
    const trashedItems = items.filter((i) => i.isTrashed);

    const results = await Promise.all(
      trashedItems.map((item) =>
        deleteCloudinaryMedia(item.publicId, item.kind)
      )
    );

    return NextResponse.json({
      ok: true,
      deletedCount: results.length,
    });
  } catch (err) {
    console.error('[Memoir] Error emptying trash from Cloudinary:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to empty trash.' },
      { status: 500 }
    );
  }
}

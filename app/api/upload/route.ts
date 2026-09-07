import { NextResponse } from 'next/server';
import { uploadBufferToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';
import { sendToDiscord } from '@/lib/discord';

export const runtime = 'nodejs';

// 500MB max limit — raise or lower to taste
const MAX_BYTES = 500 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/|^video\//;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'No file was attached.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.test(file.type)) {
      return NextResponse.json(
        { ok: false, error: 'Only photos and videos can be added here.' },
        { status: 415 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `That file is over the ${MAX_BYTES / (1024 * 1024)}MB limit.`,
        },
        { status: 413 }
      );
    }

    // If Cloudinary is configured, upload directly to the Cloudinary account
    if (isCloudinaryConfigured()) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const result = await uploadBufferToCloudinary(buffer, {
        resourceType: 'auto',
      });

      const skipDiscord = formData.get('skipDiscord') === 'true';

      // Notify Discord channel asynchronously only if not part of a multi-item batch
      if (!skipDiscord) {
        await sendToDiscord({
          filename: file.name,
          url: result.secure_url,
          kind: file.type.startsWith('video/') ? 'video' : 'image',
          publicId: result.public_id,
        });
      }

      return NextResponse.json({
        ok: true,
        key: result.public_id,
        url: result.secure_url,
      });
    }

    // Fallback: If credentials are not yet set in .env.local, simulate upload
    // so the app UI remains testable until keys are added.
    console.warn(
      '[Memoir] Cloudinary credentials not found in environment. Simulated upload used. Add CLOUDINARY_* variables to .env.local to enable real storage.'
    );
    const key = `${Date.now()}-${file.name}`;
    await new Promise((r) => setTimeout(r, 400));

    return NextResponse.json({
      ok: true,
      key,
      url: undefined,
      mock: true,
    });
  } catch (err) {
    console.error('Upload error:', err);
    const message =
      err instanceof Error
        ? err.message
        : 'Something went wrong on our end. Try again in a moment.';

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

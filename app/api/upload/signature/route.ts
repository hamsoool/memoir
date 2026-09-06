import { NextResponse } from 'next/server';
import { generateUploadSignature, isCloudinaryConfigured } from '@/lib/cloudinary';

export const runtime = 'nodejs';

/**
 * Returns a signed payload to allow direct browser-to-Cloudinary uploads.
 * This is useful if uploading large video files that exceed Vercel's
 * 4.5MB serverless body payload limit.
 */
export async function GET() {
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Cloudinary is not configured yet. Please add CLOUDINARY_* variables to .env.local.',
      },
      { status: 500 }
    );
  }

  try {
    const signatureData = generateUploadSignature();
    return NextResponse.json({ ok: true, ...signatureData });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate upload signature.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

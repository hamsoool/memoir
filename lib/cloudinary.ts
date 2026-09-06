import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'auto' | 'raw';
  publicId?: string;
}

/**
 * Uploads a buffer directly to Cloudinary using upload_stream.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<UploadApiResponse> {
  const client = configureCloudinary();
  const folder = options.folder || process.env.CLOUDINARY_FOLDER || 'memoir';

  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed.'));
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Generates an authenticated signature for direct client-side uploads.
 * This allows large photos and videos to be uploaded directly from the browser
 * to Cloudinary, bypassing Vercel serverless request body limits (4.5MB).
 */
export function generateUploadSignature(customFolder?: string) {
  const client = configureCloudinary();
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = customFolder || process.env.CLOUDINARY_FOLDER || 'memoir';

  const paramsToSign = {
    folder,
    timestamp,
  };

  const signature = client.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
  };
}

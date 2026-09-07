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

export interface CloudinaryAsset {
  publicId: string;
  url: string;
  bytes: number;
  format?: string;
  kind: 'image' | 'video';
  createdAt: string;
  name: string;
  isTrashed?: boolean;
}

/**
 * Retrieves all actual uploaded media from the Cloudinary folder.
 */
export async function getCloudinaryMedia(customFolder?: string): Promise<{
  items: CloudinaryAsset[];
  totalBytes: number;
}> {
  if (!isCloudinaryConfigured()) {
    return { items: [], totalBytes: 0 };
  }

  const client = configureCloudinary();
  const folder = customFolder || process.env.CLOUDINARY_FOLDER || 'memoir';

  try {
    // Try the Search API first to get both images and videos ordered chronologically
    const searchRes = await client.search
      .expression(`folder:${folder}/* OR folder:${folder}`)
      .with_field('tags')
      .sort_by('created_at', 'desc')
      .max_results(100)
      .execute();

    const items: CloudinaryAsset[] = (searchRes.resources || []).map(
      (r: {
        public_id: string;
        secure_url?: string;
        url?: string;
        bytes?: number;
        format?: string;
        resource_type?: string;
        created_at?: string;
        filename?: string;
        tags?: string[];
      }) => {
        const rawName = r.filename || r.public_id.split('/').pop() || 'memory';
        const isTrashed = Array.isArray(r.tags) && r.tags.includes('trash');
        return {
          publicId: r.public_id,
          url: r.secure_url || r.url || '',
          bytes: r.bytes || 0,
          format: r.format,
          kind: r.resource_type === 'video' ? 'video' : 'image',
          createdAt: r.created_at || new Date().toISOString(),
          name: r.format ? `${rawName}.${r.format}` : rawName,
          isTrashed,
        };
      }
    );

    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
    return { items, totalBytes };
  } catch (searchError) {
    console.warn(
      '[Cloudinary] Search API failed, falling back to Admin resources API:',
      searchError
    );

    // Fallback: Fetch images & videos via standard Admin resources API
    const [imagesRes, videosRes] = await Promise.all([
      client.api
        .resources({
          type: 'upload',
          prefix: `${folder}/`,
          resource_type: 'image',
          tags: true,
          max_results: 100,
        })
        .catch(() => ({ resources: [] })),
      client.api
        .resources({
          type: 'upload',
          prefix: `${folder}/`,
          resource_type: 'video',
          tags: true,
          max_results: 100,
        })
        .catch(() => ({ resources: [] })),
    ]);

    const combined = [
      ...(imagesRes.resources || []),
      ...(videosRes.resources || []),
    ];

    const items: CloudinaryAsset[] = combined.map(
      (r: {
        public_id: string;
        secure_url?: string;
        url?: string;
        bytes?: number;
        format?: string;
        resource_type?: string;
        created_at?: string;
        tags?: string[];
      }) => {
        const rawName = r.public_id.split('/').pop() || 'memory';
        const isTrashed = Array.isArray(r.tags) && r.tags.includes('trash');
        return {
          publicId: r.public_id,
          url: r.secure_url || r.url || '',
          bytes: r.bytes || 0,
          format: r.format,
          kind: r.resource_type === 'video' ? 'video' : 'image',
          createdAt: r.created_at || new Date().toISOString(),
          name: r.format ? `${rawName}.${r.format}` : rawName,
          isTrashed,
        };
      }
    );

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
    return { items, totalBytes };
  }
}

/**
 * Adds a tag to mark an asset as trashed / archived.
 */
export async function tagCloudinaryMedia(publicId: string, tag: string = 'trash') {
  if (!isCloudinaryConfigured()) return;
  const client = configureCloudinary();
  return client.uploader.add_tag(tag, [publicId]);
}

/**
 * Removes a tag to restore an asset from trash.
 */
export async function untagCloudinaryMedia(publicId: string, tag: string = 'trash') {
  if (!isCloudinaryConfigured()) return;
  const client = configureCloudinary();
  return client.uploader.remove_tag(tag, [publicId]);
}

/**
 * Deletes an asset permanently from Cloudinary storage.
 */
export async function deleteCloudinaryMedia(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
) {
  if (!isCloudinaryConfigured()) return;
  const client = configureCloudinary();
  return client.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Retrieves account usage stats from Cloudinary API.
 */
export async function getCloudinaryAccountUsage() {
  if (!isCloudinaryConfigured()) return null;
  const client = configureCloudinary();
  try {
    const usage = await client.api.usage();
    return {
      storageBytes: usage.storage?.usage || 0,
      creditsUsed: usage.credits?.usage || 0,
      creditsLimit: usage.credits?.limit || 25,
      bandwidthBytes: usage.bandwidth?.usage || 0,
    };
  } catch (e) {
    console.warn('[Cloudinary] Could not fetch account usage:', e);
    return null;
  }
}

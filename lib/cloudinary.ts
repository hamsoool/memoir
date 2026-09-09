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
  context?: Record<string, string>;
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
        context: options.context,
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
    // Use cursor-based pagination to retrieve ALL items across multiple pages (up to 500 per page)
    const allSearchResources: any[] = [];
    let nextCursor: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 50; // Safety guard: up to 25,000 assets

    do {
      let searchReq = client.search
        .expression(`folder:${folder}/* OR folder:${folder}`)
        .with_field('tags')
        .with_field('context')
        .sort_by('created_at', 'desc')
        .max_results(500);

      if (nextCursor) {
        searchReq = searchReq.next_cursor(nextCursor);
      }

      const searchRes = await searchReq.execute();
      const resources = searchRes.resources || [];
      allSearchResources.push(...resources);
      nextCursor = searchRes.next_cursor;
      pageCount++;
    } while (nextCursor && pageCount < MAX_PAGES);

    const items: CloudinaryAsset[] = allSearchResources.map(
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
        context?: { custom?: { original_name?: string } };
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
          name: r.context?.custom?.original_name || (r.format ? `${rawName}.${r.format}` : rawName),
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

    // Fallback: Fetch images & videos via standard Admin resources API across all pages
    const fetchAllAdminResources = async (resourceType: 'image' | 'video') => {
      const resources: any[] = [];
      let cursor: string | undefined = undefined;
      let pages = 0;
      const MAX_ADMIN_PAGES = 50;

      do {
        try {
          const res: any = await client.api.resources({
            type: 'upload',
            prefix: `${folder}/`,
            resource_type: resourceType,
            tags: true,
            max_results: 500,
            next_cursor: cursor,
          });
          if (res.resources && res.resources.length > 0) {
            resources.push(...res.resources);
          }
          cursor = res.next_cursor;
          pages++;
        } catch (e) {
          console.warn(`[Cloudinary] Admin fetch failed for ${resourceType}:`, e);
          break;
        }
      } while (cursor && pages < MAX_ADMIN_PAGES);

      return resources;
    };

    const [imagesRes, videosRes] = await Promise.all([
      fetchAllAdminResources('image'),
      fetchAllAdminResources('video'),
    ]);

    const combined = [...imagesRes, ...videosRes];

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
 * Detects if an asset with the given MD5 checksum or publicId already exists in Cloudinary.
 * If found, returns the existing asset metadata to conserve storage quota.
 */
export async function findDuplicateCloudinaryMedia(
  md5Checksum: string,
  customFolder?: string
): Promise<CloudinaryAsset | null> {
  if (!isCloudinaryConfigured()) return null;
  const client = configureCloudinary();
  const folder = customFolder || process.env.CLOUDINARY_FOLDER || 'memoir';

  try {
    // 1. Search for assets in folder by ETag (Cloudinary ETag is the file's MD5 checksum)
    const searchRes = await client.search
      .expression(`(folder:${folder}/* OR folder:${folder}) AND etag:${md5Checksum}`)
      .with_field('tags')
      .with_field('context')
      .max_results(1)
      .execute();

    if (searchRes.resources && searchRes.resources.length > 0) {
      const r = searchRes.resources[0];
      const rawName = r.filename || r.public_id.split('/').pop() || 'memory';
      const isTrashed = Array.isArray(r.tags) && r.tags.includes('trash');

      // If it was trashed previously, untag it so it returns to the active reel
      if (isTrashed) {
        try {
          await client.uploader.remove_tag('trash', [r.public_id]);
        } catch {
          // ignore tag error
        }
      }

      return {
        publicId: r.public_id,
        url: r.secure_url || r.url || '',
        bytes: r.bytes || 0,
        format: r.format,
        kind: r.resource_type === 'video' ? 'video' : 'image',
        createdAt: r.created_at || new Date().toISOString(),
        name: r.context?.custom?.original_name || (r.format ? `${rawName}.${r.format}` : rawName),
        isTrashed: false,
      };
    }

    // 2. Fallback: Check if an asset was stored directly with publicId === md5Checksum
    try {
      const direct = await client.api
        .resource(`${folder}/${md5Checksum}`, {
          resource_type: 'image',
        })
        .catch(() =>
          client.api.resource(`${folder}/${md5Checksum}`, {
            resource_type: 'video',
          })
        )
        .catch(() => null);

      if (direct) {
        const rawName = direct.filename || direct.public_id.split('/').pop() || 'memory';
        const isTrashed = Array.isArray(direct.tags) && direct.tags.includes('trash');

        if (isTrashed) {
          await client.uploader.remove_tag('trash', [direct.public_id]).catch(() => null);
        }

        return {
          publicId: direct.public_id,
          url: direct.secure_url || direct.url || '',
          bytes: direct.bytes || 0,
          format: direct.format,
          kind: direct.resource_type === 'video' ? 'video' : 'image',
          createdAt: direct.created_at || new Date().toISOString(),
          name: direct.format ? `${rawName}.${direct.format}` : rawName,
          isTrashed: false,
        };
      }
    } catch {
      // ignore direct resource lookup error
    }

    return null;
  } catch (err) {
    console.warn('[Cloudinary] Duplicate search check error:', err);
    return null;
  }
}

/**
 * Deletes an asset permanently from Cloudinary storage and purges CDN cache.
 */
export async function deleteCloudinaryMedia(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
) {
  if (!isCloudinaryConfigured()) return;
  const client = configureCloudinary();

  try {
    // 1. Destroy asset and invalidate CDN caches
    let res = await client.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });

    // If not found with the inferred resource type, try the alternative type
    if (res?.result === 'not found') {
      const alternateType = resourceType === 'video' ? 'image' : 'video';
      res = await client.uploader.destroy(publicId, {
        resource_type: alternateType,
        invalidate: true,
      });

      if (res?.result === 'not found') {
        res = await client.uploader.destroy(publicId, {
          resource_type: 'raw',
          invalidate: true,
        });
      }
    }

    // 2. Also run admin delete_resources to ensure all derived copies and thumbnails are purged
    try {
      await client.api.delete_resources([publicId], {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch {
      // Admin delete_resources is a secondary safeguard; ignore if rate-limited
    }

    return res;
  } catch (err) {
    console.error(`[Cloudinary] Failed to permanently delete asset ${publicId}:`, err);
    throw err;
  }
}

/**
 * Bulk deletes multiple assets permanently from Cloudinary storage.
 */
export async function bulkDeleteCloudinaryMedia(
  items: { publicId: string; kind?: 'image' | 'video' }[]
) {
  if (!isCloudinaryConfigured() || !items || items.length === 0) return;
  const client = configureCloudinary();

  const imageIds = items
    .filter((i) => i.kind !== 'video')
    .map((i) => i.publicId);
  const videoIds = items
    .filter((i) => i.kind === 'video')
    .map((i) => i.publicId);

  const tasks: Promise<unknown>[] = [];

  if (imageIds.length > 0) {
    tasks.push(
      client.api
        .delete_resources(imageIds, {
          resource_type: 'image',
          invalidate: true,
        })
        .catch(async () => {
          await Promise.allSettled(
            imageIds.map((id) =>
              client.uploader.destroy(id, { resource_type: 'image', invalidate: true })
            )
          );
        })
    );
  }

  if (videoIds.length > 0) {
    tasks.push(
      client.api
        .delete_resources(videoIds, {
          resource_type: 'video',
          invalidate: true,
        })
        .catch(async () => {
          await Promise.allSettled(
            videoIds.map((id) =>
              client.uploader.destroy(id, { resource_type: 'video', invalidate: true })
            )
          );
        })
    );
  }

  await Promise.allSettled(tasks);
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

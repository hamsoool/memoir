import type { UploadResponse } from './types';

/**
 * Uploads a single file to our own /api/upload route (see that file for
 * where the real Cloudflare + Discord wiring goes). Uses XHR rather than
 * fetch because fetch has no upload-progress event — and a progress bar
 * matters a lot more for a 200MB video than a 2MB photo.
 */
export function uploadFile(
  file: File,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
  skipDiscord = true
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    if (skipDiscord) {
      formData.append('skipDiscord', 'true');
    }

    xhr.open('POST', '/api/upload');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as UploadResponse;
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Upload failed — the server sent back something unexpected.'));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed — check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(formData);
  });
}

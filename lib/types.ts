export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  file?: File;
  previewUrl: string;
  kind: 'image' | 'video';
  status: UploadStatus;
  progress: number; // 0–100
  error?: string;
  url?: string;
  key?: string;
  bytes?: number;
  name?: string;
  createdAt?: string;
  isTrashed?: boolean;
}

// Shape returned by POST /api/upload once it's wired to real storage.
export interface UploadResponse {
  ok: boolean;
  key?: string;
  url?: string;
  error?: string;
  mock?: boolean;
  isDuplicate?: boolean;
  message?: string;
}

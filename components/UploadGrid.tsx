'use client';

import type { UploadItem } from '@/lib/types';
import PhotoPrint from './PhotoPrint';

export default function UploadGrid({
  items,
  onRemove,
  onRetry,
}: {
  items: UploadItem[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line rounded-sm py-14 text-center">
        <p className="text-ink/50 font-display italic text-lg">
          Nothing developed yet
        </p>
        <p className="text-ink/40 text-sm mt-1">Add your first shot above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
      {items.map((item, i) => (
        <PhotoPrint
          key={item.id}
          item={item}
          index={i}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}

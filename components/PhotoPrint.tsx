'use client';

import type { UploadItem } from '@/lib/types';
import { truncateName } from '@/lib/format';

const ROTATIONS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', '-rotate-1', 'rotate-2'];

export default function PhotoPrint({
  item,
  index,
  onRemove,
  onRetry,
}: {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const rotation = ROTATIONS[index % ROTATIONS.length];

  return (
    <div
      className={`relative bg-paper-light p-3 pb-4 shadow-print rounded-[2px] ${rotation}
        hover:rotate-0 focus-within:rotate-0 transition-transform duration-200`}
    >
      {/* washi-tape corner accent */}
      <span className="absolute -top-2 left-6 w-10 h-4 bg-tape/80 rotate-[-6deg] shadow-sm" />

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.file.name}`}
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-ink/60 hover:bg-ink
          text-paper-light text-xs flex items-center justify-center transition-colors"
      >
        ×
      </button>

      <div className="relative bg-ink/5 aspect-square overflow-hidden">
        {item.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <video
            src={item.previewUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            controls
          />
        )}

        {item.status === 'uploading' && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-ink/10">
            <div
              className="h-full bg-rust transition-all duration-150"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2">
        <p className="font-stamp text-[11px] text-ink/60 truncate">
          {truncateName(item.file.name)}
        </p>
      </div>

      <p className="font-stamp text-[11px] mt-0.5">
        {item.status === 'uploading' && (
          <span className="text-ink/50">developing… {item.progress}%</span>
        )}
        {item.status === 'queued' && <span className="text-ink/40">waiting…</span>}
        {item.status === 'done' && (
          <span className="text-teal flex items-center justify-between">
            <span>developed</span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] underline underline-offset-2 opacity-80 hover:opacity-100 font-sans"
              >
                view
              </a>
            )}
          </span>
        )}
        {item.status === 'error' && (
          <span className="text-rust">
            couldn't develop —{' '}
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="underline underline-offset-2 hover:no-underline"
            >
              try again
            </button>
          </span>
        )}
      </p>
    </div>
  );
}

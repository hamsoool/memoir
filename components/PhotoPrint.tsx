'use client';

import type { UploadItem } from '@/lib/types';
import { formatDate, formatBytes, truncateName } from '@/lib/format';

const ROTATIONS = [
  '-rotate-2',
  'rotate-1',
  '-rotate-1',
  'rotate-2',
  '-rotate-1',
  'rotate-2',
];

export default function PhotoPrint({
  item,
  index,
  onRemove,
  onRetry,
  onTrash,
  onRestore,
  isTrashView = false,
}: {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  isTrashView?: boolean;
}) {
  const rotation = ROTATIONS[index % ROTATIONS.length];
  const displayName = item.file?.name || item.name || 'Memory';
  const mediaSrc = item.previewUrl || item.url || '';
  const itemSize = item.bytes || item.file?.size || 0;

  return (
    <div
      className={`relative bg-paper-light p-2.5 sm:p-3 pb-3 sm:pb-3.5 shadow-print rounded-[2px] ${rotation}
        hover:rotate-0 focus-within:rotate-0 transition-transform duration-200 flex flex-col justify-between`}
    >
      {/* washi-tape corner accent */}
      <span className="absolute -top-1.5 left-5 w-8 sm:w-9 h-3 sm:h-3.5 bg-tape/80 rotate-[-6deg] shadow-xs pointer-events-none" />

      {/* Top right quick-action button */}
      {!isTrashView ? (
        <button
          type="button"
          onClick={() => (onTrash ? onTrash(item.id) : onRemove(item.id))}
          title="Move to Trash"
          aria-label={`Move ${displayName} to trash`}
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-ink/60 hover:bg-rust
            text-paper-light text-xs flex items-center justify-center transition-colors"
        >
          <svg
            className="w-3 h-3 sm:w-3.5 sm:h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          title="Permanently Delete from Cloudinary"
          aria-label={`Permanently delete ${displayName}`}
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-rust hover:bg-rust-dark
            text-paper-light text-xs flex items-center justify-center transition-colors shadow-xs"
        >
          ×
        </button>
      )}

      {/* Media container */}
      <div className="relative bg-ink/5 aspect-square overflow-hidden rounded-xs">
        {item.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <video
            src={mediaSrc}
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

      {/* Metadata & Date Tracker */}
      <div className="mt-2 space-y-0.5">
        <div className="flex items-baseline justify-between gap-1.5">
          <p
            className="font-stamp text-[10px] sm:text-[11px] text-ink/75 truncate font-medium"
            title={displayName}
          >
            {truncateName(displayName, 18)}
          </p>
          {itemSize > 0 && (
            <span className="font-stamp text-[9px] sm:text-[10px] text-ink/45 shrink-0">
              {formatBytes(itemSize)}
            </span>
          )}
        </div>

        {/* Date tracker stamped on the photo */}
        <div className="flex items-center justify-between font-stamp text-[9px] sm:text-[10px] text-ink/50 border-t border-line/40 pt-0.5 sm:pt-1">
          <span>{formatDate(item.createdAt)}</span>
          <span className="uppercase text-[8px] sm:text-[9px] text-ink/40 tracking-wider">
            {item.kind}
          </span>
        </div>
      </div>

      {/* Status or Trash Controls */}
      <div className="font-stamp text-[11px] mt-1 pt-0.5">
        {isTrashView ? (
          <div className="flex items-center justify-between gap-1 pt-1">
            <button
              type="button"
              onClick={() => onRestore && onRestore(item.id)}
              className="text-[10px] text-teal hover:underline flex items-center gap-1 font-medium"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-[10px] text-rust hover:underline font-medium"
            >
              Delete forever
            </button>
          </div>
        ) : (
          <>
            {item.status === 'uploading' && (
              <span className="text-ink/50">developing… {item.progress}%</span>
            )}
            {item.status === 'queued' && (
              <span className="text-ink/40">waiting…</span>
            )}
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
                couldn&apos;t develop —{' '}
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  className="underline underline-offset-2 hover:no-underline"
                >
                  try again
                </button>
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

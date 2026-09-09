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
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onEnlarge,
}: {
  item: UploadItem;
  index: number;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  isTrashView?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onEnlarge?: (item: UploadItem) => void;
}) {
  const rotation = ROTATIONS[index % ROTATIONS.length];
  const displayName = item.file?.name || item.name || 'Memory';
  const mediaSrc = item.previewUrl || item.url || '';
  const itemSize = item.bytes || item.file?.size || 0;

  return (
    <div
      onClick={() => {
        if (isSelectMode && onToggleSelect) {
          onToggleSelect(item.id);
        }
      }}
      className={`relative bg-paper-light p-2.5 sm:p-3 pb-3 sm:pb-3.5 shadow-print rounded-[2px] ${rotation}
        hover:rotate-0 focus-within:rotate-0 transition-all duration-200 flex flex-col justify-between
        ${isSelectMode ? 'cursor-pointer select-none' : ''}
        ${isSelected ? 'ring-2 ring-rust shadow-md scale-[1.01]' : ''}`}
    >
      {/* washi-tape corner accent */}
      <span className="absolute -top-1.5 left-5 w-8 sm:w-9 h-3 sm:h-3.5 bg-tape/80 rotate-[-6deg] shadow-xs pointer-events-none" />

      {/* Top right quick-action button or select checkbox */}
      {isSelectMode ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSelect) onToggleSelect(item.id);
          }}
          aria-label={isSelected ? `Deselect ${displayName}` : `Select ${displayName}`}
          className="absolute top-1.5 right-1.5 z-20 w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full flex items-center justify-center transition-all"
        >
          <div
            className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-rust border-rust text-paper-light shadow-xs scale-105'
                : 'bg-paper-light/95 border-ink/40 hover:border-ink text-transparent'
            }`}
          >
            <svg
              className={`w-3 h-3 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </button>
      ) : !isTrashView ? (
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
          title="Permanently Delete"
          aria-label={`Permanently delete ${displayName}`}
          className="absolute top-1.5 right-1.5 z-10 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-rust hover:bg-rust-dark
            text-paper-light text-xs flex items-center justify-center transition-colors shadow-xs"
        >
          ×
        </button>
      )}

      {/* Media container: click to enlarge */}
      <div
        onClick={(e) => {
          if (isSelectMode && onToggleSelect) {
            return;
          }
          if (mediaSrc && onEnlarge) {
            e.stopPropagation();
            onEnlarge(item);
          }
        }}
        className={`relative bg-ink/5 aspect-square overflow-hidden rounded-xs ${
          !isSelectMode && mediaSrc ? 'cursor-zoom-in group' : ''
        }`}
      >
        {item.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            draggable={false}
          />
        ) : (
          <video
            src={mediaSrc}
            preload="none"
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        )}

        {/* Hover zoom indicator overlay */}
        {!isSelectMode && mediaSrc && (
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/15 transition-all duration-200 flex items-center justify-center pointer-events-none">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full bg-paper-light/90 text-ink shadow-xs transform scale-90 group-hover:scale-100">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </span>
          </div>
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

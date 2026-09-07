'use client';

import { formatBytes, truncateName } from '@/lib/format';
import type { UploadItem } from '@/lib/types';

const CLOUDINARY_MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const CLOUDINARY_MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

interface ConfirmUploadModalProps {
  items: UploadItem[];
  onConfirm: () => void;
  onCancel: () => void;
  onRemoveItem: (id: string) => void;
}

export default function ConfirmUploadModal({
  items,
  onConfirm,
  onCancel,
  onRemoveItem,
}: ConfirmUploadModalProps) {
  if (items.length === 0) return null;

  const totalBytes = items.reduce(
    (acc, curr) => acc + (curr.bytes || curr.file?.size || 0),
    0
  );

  const hasOversized = items.some((i) => {
    const size = i.bytes || i.file?.size || 0;
    return i.kind === 'image'
      ? size > CLOUDINARY_MAX_IMAGE_BYTES
      : size > CLOUDINARY_MAX_VIDEO_BYTES;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-paper-light border border-line rounded-sm shadow-print w-full max-w-md sm:max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-line bg-paper/60">
          <div className="flex items-center justify-between">
            <span className="font-stamp text-[10px] sm:text-[11px] text-ink/50 uppercase tracking-widest">
              ready to develop
            </span>
            <span className="font-stamp text-[11px] sm:text-xs text-rust font-medium">
              {items.length} {items.length === 1 ? 'shot' : 'shots'} • {formatBytes(totalBytes)}
            </span>
          </div>
          <h2 className="font-display italic text-xl sm:text-2xl text-ink mt-0.5">
            Develop these memories?
          </h2>
          <p className="text-xs sm:text-sm text-ink/70 mt-0.5">
            Take a moment to review before developing them into our reel.
          </p>
        </div>

        {/* Scrollable file list */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-line/40">
          {items.map((item) => {
            const size = item.bytes || item.file?.size || 0;
            const name = item.name || item.file?.name || 'Memory';
            const isTooBig =
              item.kind === 'image'
                ? size > CLOUDINARY_MAX_IMAGE_BYTES
                : size > CLOUDINARY_MAX_VIDEO_BYTES;

            return (
              <div
                key={item.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 bg-ink/10 rounded-xs overflow-hidden shrink-0 border border-line/50">
                    {item.kind === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.previewUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-stamp text-xs text-ink truncate">
                      {truncateName(name, 26)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 font-stamp text-[10px] text-ink/50">
                      <span>{item.kind.toUpperCase()}</span>
                      <span>•</span>
                      <span>{formatBytes(size)}</span>
                      {isTooBig && (
                        <span className="text-rust font-bold">
                          (Exceeds free limit)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label="Remove item"
                  className="w-6 h-6 rounded-full text-ink/40 hover:text-rust hover:bg-rust/10 flex items-center justify-center transition-colors shrink-0 text-xs"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {/* Supported sizes banner */}
        <div className="px-4 py-2.5 bg-paper border-t border-b border-line text-[10px] sm:text-[11px] text-ink/65 font-stamp flex flex-wrap items-center justify-between gap-2">
          <span>Supported sizes:</span>
          <div className="flex items-center gap-3">
            <span>Photos up to 10 MB</span>
            <span>Videos up to 100 MB</span>
          </div>
        </div>

        {hasOversized && (
          <div className="px-4 py-2 bg-rust/10 border-b border-rust/30 text-rust text-xs font-stamp flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>One of the files is a bit too large to develop. Try selecting a shorter clip or smaller photo.</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="p-3.5 sm:p-4 flex items-center justify-end gap-2.5 bg-paper-light border-t border-line/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-sm border border-line hover:border-ink/40 text-ink/70 hover:text-ink font-display italic text-sm transition"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-sm bg-rust hover:bg-rust-dark text-paper-light font-display italic font-medium text-sm sm:text-base active:scale-[0.98] transition shadow-xs flex items-center gap-2"
          >
            <span>Confirm & Develop</span>
            <span className="font-stamp text-xs opacity-90 not-italic ml-0.5">
              ({items.length})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

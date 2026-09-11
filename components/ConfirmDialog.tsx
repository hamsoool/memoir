'use client';

import { ReactNode, useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  badge?: string;
  description: string | ReactNode;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  thumbnailUrl?: string;
  thumbnailKind?: 'image' | 'video';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  badge = 'confirmation',
  description,
  itemName,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  thumbnailUrl,
  thumbnailKind = 'image',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/55 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-paper-light border border-line rounded-sm shadow-print w-full max-w-sm sm:max-w-md overflow-hidden flex flex-col animate-scale-up">
        {/* Header Strip */}
        <div className="p-4 sm:p-5 border-b border-line bg-paper/70">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-stamp text-[10px] sm:text-[11px] uppercase tracking-widest ${
                isDestructive ? 'text-rust font-medium' : 'text-ink/50'
              }`}
            >
              {badge}
            </span>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition text-xs font-stamp"
            >
              ✕
            </button>
          </div>
          <h2 className="font-display italic text-xl sm:text-2xl text-ink mt-1 leading-snug">
            {title}
          </h2>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {thumbnailUrl && (
            <div className="flex items-center gap-3 p-2.5 bg-paper border border-line/70 rounded-xs">
              <div className="w-12 h-12 bg-ink/10 rounded-xs overflow-hidden shrink-0 border border-line/50">
                {thumbnailKind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={thumbnailUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
              </div>
              <div className="min-w-0 font-stamp text-xs text-ink/70 leading-relaxed">
                <span className="uppercase text-[10px] text-ink/50 block">
                  selected file
                </span>
                <span className="truncate block text-ink font-medium">
                  {itemName || 'memory print'}
                </span>
              </div>
            </div>
          )}

          <div className="text-xs sm:text-sm text-ink/80 font-display italic leading-relaxed">
            {description}
          </div>

          {isDestructive && (
            <div className="px-3.5 py-2.5 bg-rust/10 border border-rust/30 rounded-xs text-rust text-[11px] sm:text-xs font-stamp flex items-center gap-2">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>This action is permanent and cannot be undone.</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-3.5 sm:p-4 border-t border-line bg-paper/40 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-sm border border-line hover:border-ink/40 text-ink/70 hover:text-ink font-display italic text-sm transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-sm text-paper-light font-display italic font-medium text-sm sm:text-base active:scale-[0.98] transition shadow-xs flex items-center gap-1.5 ${
              isDestructive
                ? 'bg-rust hover:bg-rust-dark'
                : 'bg-ink hover:bg-ink/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

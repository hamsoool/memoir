'use client';

import { useEffect, useCallback } from 'react';
import type { UploadItem } from '@/lib/types';
import { formatBytes, formatDate } from '@/lib/format';

interface PhotoLightboxProps {
  item: UploadItem | null;
  items?: UploadItem[];
  onClose: () => void;
  onNavigate?: (item: UploadItem) => void;
}

export default function PhotoLightbox({
  item,
  items = [],
  onClose,
  onNavigate,
}: PhotoLightboxProps) {
  // Find current index for next/previous navigation
  const currentIndex = item ? items.findIndex((i) => i.id === item.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < items.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(items[currentIndex - 1]);
    }
  }, [hasPrev, onNavigate, items, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(items[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, items, currentIndex]);

  // Keyboard navigation: Escape to close, Arrow keys to navigate
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, handlePrev, handleNext]);

  // Prevent background scrolling when lightbox is open
  useEffect(() => {
    if (item) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [item]);

  if (!item) return null;

  const mediaSrc = item.previewUrl || item.url || '';
  const displayName = item.file?.name || item.name || 'Memory';
  const itemSize = item.bytes || item.file?.size || 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo view"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 sm:top-5 inset-x-3 sm:inset-x-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Memory Index Counter */}
        <div className="pointer-events-auto font-stamp text-xs sm:text-sm text-paper-light/75 bg-ink/60 border border-line/30 px-3 py-1 rounded-full backdrop-blur-sm shadow-xs">
          {currentIndex >= 0 && items.length > 0 ? (
            <span>
              {currentIndex + 1} of {items.length} moments
            </span>
          ) : (
            <span>Memoir</span>
          )}
        </div>

        {/* Action Controls: Download / Open Original & Close */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              download={displayName}
              title="Open or save original file"
              className="p-2 sm:p-2.5 rounded-full bg-ink/60 hover:bg-ink text-paper-light border border-line/30 backdrop-blur-sm transition-all shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <svg
                className="w-4 h-4 sm:w-4.5 sm:h-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close viewer (Esc)"
            className="p-2 sm:p-2.5 rounded-full bg-ink/60 hover:bg-rust text-paper-light border border-line/30 backdrop-blur-sm transition-all shadow-xs hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <svg
              className="w-4 h-4 sm:w-4.5 sm:h-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Left Navigation Arrow */}
      {hasPrev && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous memory"
          className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3.5 rounded-full bg-paper-light/90 hover:bg-paper-light text-ink hover:text-rust transition-all shadow-print hover:scale-110 active:scale-95"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Right Navigation Arrow */}
      {hasNext && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next memory"
          className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3.5 rounded-full bg-paper-light/90 hover:bg-paper-light text-ink hover:text-rust transition-all shadow-print hover:scale-110 active:scale-95"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Enlarged Polaroid Print Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-[92vw] sm:max-w-2xl md:max-w-3xl max-h-[88vh] bg-paper-light p-3 sm:p-4 pb-4 sm:pb-5 rounded-[2px] shadow-2xl border border-line flex flex-col items-center animate-scale-in"
      >
        {/* Authentic washi-tape accent */}
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 sm:h-5 bg-tape/85 rotate-[-2deg] shadow-xs pointer-events-none" />

        {/* Media Frame */}
        <div className="relative w-full max-h-[65vh] sm:max-h-[70vh] flex items-center justify-center overflow-hidden bg-ink/5 rounded-xs border border-line/40">
          {item.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc}
              alt={displayName}
              className="max-h-[65vh] sm:max-h-[70vh] w-auto max-w-full object-contain rounded-xs select-none"
              draggable={false}
            />
          ) : (
            <video
              src={mediaSrc}
              className="max-h-[65vh] sm:max-h-[70vh] w-auto max-w-full rounded-xs"
              controls
              autoPlay
              playsInline
            />
          )}
        </div>

        {/* Bottom Stamped Archival Details */}
        <div className="w-full mt-3 px-1 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5 font-stamp border-t border-line/50 pt-2 text-xs text-ink/70">
          <div className="min-w-0">
            <h3 className="font-display italic text-base sm:text-lg text-ink truncate font-medium">
              {displayName}
            </h3>
            <p className="text-[11px] text-ink/50 mt-0.5">
              Captured {formatDate(item.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] text-ink/60 self-end sm:self-auto">
            {itemSize > 0 && <span>{formatBytes(itemSize)}</span>}
            <span className="uppercase text-[9px] px-1.5 py-0.5 bg-paper rounded-xs border border-line/60 text-ink/50 tracking-wider">
              {item.kind}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

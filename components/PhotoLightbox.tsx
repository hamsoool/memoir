'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
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

  // Zoom and Pan States
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Swipe Navigation States (when scale === 1)
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [swipeVerticalOffset, setSwipeVerticalOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  // References
  const mediaContainerRef = useRef<HTMLDivElement | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const touchStartRef = useRef<{
    x: number;
    y: number;
    dist: number;
    scale: number;
    panX: number;
    panY: number;
    time: number;
  }>({
    x: 0,
    y: 0,
    dist: 0,
    scale: 1,
    panX: 0,
    panY: 0,
    time: 0,
  });

  // Reset zoom & swipe states whenever the active photo changes
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSwipeOffset(0);
    setSwipeVerticalOffset(0);
    setIsPinching(false);
    setIsPanning(false);
    setIsSwiping(false);
  }, [item?.id]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(items[currentIndex - 1]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [hasPrev, onNavigate, items, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(items[currentIndex + 1]);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [hasNext, onNavigate, items, currentIndex]);

  // Keyboard navigation: Escape to close, Arrow keys to navigate
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (scale > 1) {
          setScale(1);
          setPan({ x: 0, y: 0 });
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, handlePrev, handleNext, scale]);

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

  // Intercept native WebKit gesture events on iOS Safari to prevent full-page zoom
  useEffect(() => {
    const el = mediaContainerRef.current;
    if (!el) return;

    function preventDefault(e: Event) {
      e.preventDefault();
    }

    el.addEventListener('gesturestart', preventDefault, { passive: false });
    el.addEventListener('gesturechange', preventDefault, { passive: false });
    el.addEventListener('gestureend', preventDefault, { passive: false });

    return () => {
      el.removeEventListener('gesturestart', preventDefault);
      el.removeEventListener('gesturechange', preventDefault);
      el.removeEventListener('gestureend', preventDefault);
    };
  }, []);

  // Zoom control helpers
  const zoomIn = () => {
    setScale((prev) => Math.min(4.5, prev + 0.5));
  };

  const zoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const resetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Touch Handlers for Multi-touch Pinch & Single-finger Swipe/Pan
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Two fingers: Pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist,
        scale,
        panX: pan.x,
        panY: pan.y,
        time: Date.now(),
      };
      setIsPinching(true);
      setIsSwiping(false);
      setIsPanning(false);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      const isDoubleTap = now - lastTapTimeRef.current < 300;
      lastTapTimeRef.current = now;

      // Double-Tap to Toggle Zoom (iPhone Photos style)
      if (isDoubleTap) {
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
          }
        }
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        dist: 0,
        scale,
        panX: pan.x,
        panY: pan.y,
        time: now,
      };

      if (scale > 1) {
        setIsPanning(true);
      } else {
        setIsSwiping(true);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    // 2-Finger Pinch Zooming
    if (isPinching && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (touchStartRef.current.dist > 0) {
        const ratio = dist / touchStartRef.current.dist;
        const newScale = Math.min(5, Math.max(0.7, touchStartRef.current.scale * ratio));
        setScale(newScale);
      }
      return;
    }

    // 1-Finger Pan when Zoomed In
    if (isPanning && scale > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const boundX = 200 * (scale - 1);
      const boundY = 250 * (scale - 1);

      const targetX = touchStartRef.current.panX + deltaX;
      const targetY = touchStartRef.current.panY + deltaY;

      setPan({
        x: Math.max(-boundX, Math.min(boundX, targetX)),
        y: Math.max(-boundY, Math.min(boundY, targetY)),
      });
      return;
    }

    // 1-Finger Swipe Navigation when scale === 1
    if (isSwiping && scale === 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Check whether horizontal or vertical motion is dominant
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe: Right -> next, Left -> prev
        // Apply resistance if at boundary
        if (deltaX > 0 && !hasNext) {
          setSwipeOffset(deltaX * 0.25);
        } else if (deltaX < 0 && !hasPrev) {
          setSwipeOffset(deltaX * 0.25);
        } else {
          setSwipeOffset(deltaX);
        }
      } else if (deltaY > 0) {
        // Vertical swipe down to close
        setSwipeVerticalOffset(deltaY);
      }
    }
  };

  const handleTouchEnd = () => {
    // Finish Pinch: spring back if below 1 or above 4.5
    if (isPinching) {
      setIsPinching(false);
      if (scale < 1) {
        resetZoom();
      } else if (scale > 4.5) {
        setScale(4.5);
      }
      return;
    }

    // Finish Pan
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Finish Swipe Navigation
    if (isSwiping) {
      setIsSwiping(false);

      // Horizontal swipe navigation:
      // Swipe Right (delta > 55px) -> Next Photo
      // Swipe Left (delta < -55px) -> Previous Photo
      if (swipeOffset > 55 && hasNext) {
        handleNext();
      } else if (swipeOffset < -55 && hasPrev) {
        handlePrev();
      }

      // Vertical swipe down (delta > 85px) -> Dismiss viewer
      if (swipeVerticalOffset > 85) {
        onClose();
        return;
      }

      // Smoothly snap back to 0 offset
      setSwipeOffset(0);
      setSwipeVerticalOffset(0);
    }
  };

  // Mouse wheel zoom support for desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || true) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.2 : -0.2;
      setScale((prev) => {
        const next = Math.min(4.5, Math.max(1, prev + zoomFactor));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  };

  if (!item) return null;

  const mediaSrc = item.previewUrl || item.url || '';
  const displayName = item.file?.name || item.name || 'Memory';
  const itemSize = item.bytes || item.file?.size || 0;

  // Calculate card visual transform during drag/swipe
  const cardTransform =
    scale === 1 && (swipeOffset !== 0 || swipeVerticalOffset !== 0)
      ? `translate3d(${swipeOffset}px, ${swipeVerticalOffset}px, 0) rotate(${swipeOffset * 0.03}deg)`
      : undefined;

  const cardOpacity =
    swipeVerticalOffset > 0
      ? Math.max(0.4, 1 - swipeVerticalOffset / 300)
      : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo view"
      onClick={(e) => {
        if (e.target === e.currentTarget && scale === 1) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-6 select-none overflow-hidden touch-none"
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 sm:top-5 inset-x-3 sm:inset-x-6 flex items-center justify-between z-30 pointer-events-none">
        {/* Memory Index Counter & Swipe Hint */}
        <div className="pointer-events-auto font-stamp text-xs sm:text-sm text-paper-light/80 bg-ink/70 border border-line/30 px-3 py-1 rounded-full backdrop-blur-sm shadow-xs flex items-center gap-2">
          {currentIndex >= 0 && items.length > 0 ? (
            <span>
              {currentIndex + 1} of {items.length} moments
            </span>
          ) : (
            <span>Memoir</span>
          )}
          {scale === 1 && (
            <span className="hidden sm:inline text-paper-light/40 text-[11px] border-l border-line/30 pl-2">
              Swipe → for next
            </span>
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

      {/* Swipe Direction Floating Feedback Badges */}
      {isSwiping && swipeOffset > 30 && hasNext && (
        <div className="absolute right-4 sm:right-8 z-40 bg-rust text-paper-light font-stamp text-xs sm:text-sm px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 animate-pulse pointer-events-none">
          <span>Next</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {isSwiping && swipeOffset < -30 && hasPrev && (
        <div className="absolute left-4 sm:left-8 z-40 bg-rust text-paper-light font-stamp text-xs sm:text-sm px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 animate-pulse pointer-events-none">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Previous</span>
        </div>
      )}

      {isSwiping && swipeVerticalOffset > 45 && (
        <div className="absolute top-16 z-40 bg-ink text-paper-light font-stamp text-xs px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1.5 pointer-events-none">
          <svg className="w-3.5 h-3.5 text-rust animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
          <span>Release to close</span>
        </div>
      )}

      {/* Left Navigation Arrow */}
      {hasPrev && scale === 1 && (
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous memory (or swipe left)"
          className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3.5 rounded-full bg-paper-light/90 hover:bg-paper-light text-ink hover:text-rust transition-all shadow-print hover:scale-110 active:scale-95 hidden sm:flex"
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
      {hasNext && scale === 1 && (
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next memory (or swipe right)"
          className="absolute right-2 sm:right-4 z-20 p-2.5 sm:p-3.5 rounded-full bg-paper-light/90 hover:bg-paper-light text-ink hover:text-rust transition-all shadow-print hover:scale-110 active:scale-95 hidden sm:flex"
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
        style={{
          transform: cardTransform,
          opacity: cardOpacity,
          transition: isSwiping ? 'none' : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease-out',
        }}
        className="relative max-w-[94vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] bg-paper-light p-3 sm:p-4 pb-4 sm:pb-5 rounded-[2px] shadow-2xl border border-line flex flex-col items-center select-none touch-none"
      >
        {/* Authentic washi-tape accent */}
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-14 sm:w-16 h-4 sm:h-5 bg-tape/85 rotate-[-2deg] shadow-xs pointer-events-none z-10" />

        {/* Media Frame with Pinch, Pan, and Double-Tap Zoom */}
        <div
          ref={mediaContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
          className="relative w-full max-h-[64vh] sm:max-h-[70vh] flex items-center justify-center overflow-hidden bg-ink/5 rounded-xs border border-line/40 cursor-grab active:cursor-grabbing select-none touch-none"
        >
          {item.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc}
              alt={displayName}
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
                transition: isPinching || isPanning ? 'none' : 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform',
              }}
              className="max-h-[64vh] sm:max-h-[70vh] w-auto max-w-full object-contain rounded-xs select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <video
              src={mediaSrc}
              className="max-h-[64vh] sm:max-h-[70vh] w-auto max-w-full rounded-xs"
              controls
              autoPlay
              playsInline
            />
          )}

          {/* Tactile On-Screen Zoom Indicator & Pill */}
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 pointer-events-auto">
            <div className="bg-ink/80 text-paper-light font-stamp text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-2 border border-line/30">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomOut();
                }}
                disabled={scale <= 1}
                title="Zoom out"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-paper-light/20 active:scale-90 disabled:opacity-35 transition"
              >
                −
              </button>
              <span className="min-w-[32px] text-center font-medium">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomIn();
                }}
                disabled={scale >= 4.5}
                title="Zoom in"
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-paper-light/20 active:scale-90 disabled:opacity-35 transition"
              >
                +
              </button>
            </div>

            {scale > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                className="bg-rust/90 hover:bg-rust text-paper-light font-stamp text-[10px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs transition active:scale-95 uppercase tracking-wider"
              >
                Reset
              </button>
            )}
          </div>
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

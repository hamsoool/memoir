'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type GridColumns = 2 | 3 | 4;

const STORAGE_KEY = 'memoir_mobile_columns';

export function usePinchGrid() {
  const [columns, setColumnsState] = useState<GridColumns>(2);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load persisted column preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === '2' || saved === '3' || saved === '4')) {
        setColumnsState(Number(saved) as GridColumns);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1200);
  }, []);

  const setColumns = useCallback(
    (newCols: GridColumns) => {
      setColumnsState(newCols);
      try {
        localStorage.setItem(STORAGE_KEY, String(newCols));
      } catch {
        // Ignore storage errors
      }
      showToast(`${newCols} photos per row`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    },
    [showToast]
  );

  const cycleColumns = useCallback(() => {
    setColumnsState((prev) => {
      const next = prev === 2 ? 3 : prev === 3 ? 4 : 2;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      showToast(`${next} photos per row`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      return next;
    });
  }, [showToast]);

  // Touch gesture listener for pinch-in and pinch-out
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let initialDistance = 0;
    let isPinching = false;
    let hasTriggeredInPinch = false;

    function getDistance(touches: TouchList) {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches);
        isPinching = true;
        hasTriggeredInPinch = false;
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (!isPinching || e.touches.length !== 2) return;

      // Prevent native browser viewport pinch-zoom so only the grid columns scale
      if (e.cancelable) {
        e.preventDefault();
      }

      const currentDistance = getDistance(e.touches);
      const diff = currentDistance - initialDistance;

      // Threshold: require at least 45px delta before triggering column change
      if (!hasTriggeredInPinch && Math.abs(diff) > 45) {
        hasTriggeredInPinch = true;

        if (diff > 0) {
          // Pinch-out (spreading fingers apart): Show more photos per row (2 -> 3 -> 4)
          setColumnsState((prev) => {
            const next = prev < 4 ? ((prev + 1) as GridColumns) : prev;
            if (next !== prev) {
              try {
                localStorage.setItem(STORAGE_KEY, String(next));
              } catch {}
              showToast(`${next} photos per row`);
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(15);
              }
            }
            return next;
          });
        } else {
          // Pinch-in (bringing fingers together): Show fewer / larger photos per row (4 -> 3 -> 2)
          setColumnsState((prev) => {
            const next = prev > 2 ? ((prev - 1) as GridColumns) : prev;
            if (next !== prev) {
              try {
                localStorage.setItem(STORAGE_KEY, String(next));
              } catch {}
              showToast(`${next} photos per row`);
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(15);
              }
            }
            return next;
          });
        }

        // Reset base distance for continuous multi-step pinching if user continues spreading/pinching
        initialDistance = currentDistance;
      }
    }

    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        isPinching = false;
        hasTriggeredInPinch = false;
      }
    }

    // Must be non-passive to allow e.preventDefault() on 2-finger touches
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [showToast]);

  return {
    columns,
    setColumns,
    cycleColumns,
    toastMessage,
    containerRef,
  };
}

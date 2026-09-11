'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;

const STORAGE_KEY = 'memoir_mobile_columns';

export function usePinchGrid() {
  const [columns, setColumnsState] = useState<GridColumns>(2);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keep ref to avoid stale closures in gesture listeners
  const columnsRef = useRef<GridColumns>(columns);
  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  // Load persisted column preference on mount, clamped to screen capabilities
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const val = Number(saved);
        const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
        const maxCols = isDesktop ? 6 : 4;
        if (val >= 1 && val <= maxCols) {
          const colVal = val as GridColumns;
          setColumnsState(colVal);
          columnsRef.current = colVal;
        } else if (val > maxCols) {
          setColumnsState(maxCols);
          columnsRef.current = maxCols;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Clamp columns on viewport resize if transitioning from desktop to mobile
  useEffect(() => {
    function handleResize() {
      const isDesktop = window.innerWidth >= 768;
      if (!isDesktop && columnsRef.current > 4) {
        setColumnsState(4);
        columnsRef.current = 4;
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      columnsRef.current = newCols;
      try {
        localStorage.setItem(STORAGE_KEY, String(newCols));
      } catch {
        // Ignore storage errors
      }
      showToast(`${newCols} ${newCols === 1 ? 'photo' : 'photos'} per row`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    },
    [showToast]
  );

  const cycleColumns = useCallback(() => {
    setColumnsState((prev) => {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      const maxCols = isDesktop ? 6 : 4;
      const next: GridColumns = prev >= maxCols ? 1 : ((prev + 1) as GridColumns);
      columnsRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      showToast(`${next} ${next === 1 ? 'photo' : 'photos'} per row`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      return next;
    });
  }, [showToast]);

  // Seamless iPhone-like interactive live pinch-to-zoom gesture listener
  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    let isPinching = false;
    let startDist = 0;
    let currentScale = 1;
    let hasHapticFired = false;

    function getDistance(touches: TouchList) {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    }

    function getCenter(touches: TouchList) {
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    function applyLiveTransform(scale: number, originX?: number, originY?: number) {
      if (!target) return;
      if (
        originX !== undefined &&
        originY !== undefined &&
        Number.isFinite(originX) &&
        Number.isFinite(originY)
      ) {
        const rect = target.getBoundingClientRect();
        const ox = Math.round(originX - rect.left);
        const oy = Math.round(originY - rect.top);
        target.style.transformOrigin = `${ox}px ${oy}px`;
      } else if (!target.style.transformOrigin) {
        target.style.transformOrigin = '50% 35%';
      }
      target.style.transform = `scale(${scale})`;
      target.style.transition = 'none';
      target.style.willChange = 'transform';
    }

    function resetTransformWithAnimation(onComplete?: () => void) {
      if (!target) return;
      target.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      target.style.transform = 'scale(1)';

      const timer = setTimeout(() => {
        if (!target) return;
        target.style.transition = '';
        target.style.transform = '';
        target.style.transformOrigin = '';
        target.style.willChange = '';
        onComplete?.();
      }, 260);

      return () => clearTimeout(timer);
    }

    function commitPinch(scale: number) {
      const currentCols = columnsRef.current;
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      const maxCols = isDesktop ? 6 : 4;

      // Pinch-Out (scale > 1.15): Zoom IN -> larger photos -> fewer columns (e.g. 4 -> 3 -> 2 -> 1)
      if (scale > 1.15) {
        if (currentCols > 1) {
          const nextCols = (currentCols - 1) as GridColumns;
          resetTransformWithAnimation(() => {
            setColumns(nextCols);
          });
          return;
        }
      }
      // Pinch-In (scale < 0.85): Zoom OUT -> smaller photos -> more columns
      else if (scale < 0.85) {
        if (currentCols < maxCols) {
          const nextCols = (currentCols + 1) as GridColumns;
          resetTransformWithAnimation(() => {
            setColumns(nextCols);
          });
          return;
        }
      }

      // If threshold not reached or already at edge boundary, spring back smoothly
      resetTransformWithAnimation();
    }

    function isEventOverTarget(e: Event | TouchEvent) {
      if (!target) return false;
      const t = e.target as Node | null;
      return Boolean(t && (target === t || target.contains(t)));
    }

    // --- WebKit Native Gesture API (iOS Safari / WebKit) ---
    function onGestureStart(e: any) {
      if (!target) return;
      if (!isEventOverTarget(e)) return;
      e.preventDefault();
      isPinching = true;
      currentScale = 1;
      hasHapticFired = false;
      document.body.style.overflow = 'hidden';
      target.style.touchAction = 'none';
      applyLiveTransform(1, e.clientX, e.clientY);
    }

    function onGestureChange(e: any) {
      if (!isPinching) return;
      e.preventDefault();
      currentScale = e.scale || 1;
      const clamped = Math.min(1.5, Math.max(0.65, currentScale));
      applyLiveTransform(clamped);

      if (!hasHapticFired && (currentScale > 1.15 || currentScale < 0.85)) {
        hasHapticFired = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
      }
    }

    function onGestureEnd(e: any) {
      if (!isPinching) return;
      e.preventDefault();
      isPinching = false;
      document.body.style.overflow = '';
      if (target) target.style.touchAction = 'pan-y';
      commitPinch(currentScale);
    }

    // --- Standard TouchEvent API (Android Chrome & Cross-Platform) ---
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2 && isEventOverTarget(e)) {
        if (!target) return;
        isPinching = true;
        hasHapticFired = false;
        startDist = getDistance(e.touches);
        const center = getCenter(e.touches);
        currentScale = 1;
        document.body.style.overflow = 'hidden';
        target.style.touchAction = 'none';
        applyLiveTransform(1, center.x, center.y);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        if (!isPinching && isEventOverTarget(e)) {
          // Both fingers down, initialize pinch dynamically
          isPinching = true;
          hasHapticFired = false;
          startDist = getDistance(e.touches);
          const center = getCenter(e.touches);
          currentScale = 1;
          document.body.style.overflow = 'hidden';
          if (target) target.style.touchAction = 'none';
          applyLiveTransform(1, center.x, center.y);
        }

        if (isPinching) {
          if (e.cancelable) e.preventDefault();

          const dist = getDistance(e.touches);
          if (startDist > 0) {
            currentScale = dist / startDist;
            const clamped = Math.min(1.5, Math.max(0.65, currentScale));
            applyLiveTransform(clamped);

            if (!hasHapticFired && (currentScale > 1.15 || currentScale < 0.85)) {
              hasHapticFired = true;
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(12);
              }
            }
          }
        }
        return;
      }
      if (!isPinching) return;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isPinching) return;
      if (e.touches.length < 2) {
        isPinching = false;
        document.body.style.overflow = '';
        if (target) target.style.touchAction = 'pan-y';
        commitPinch(currentScale);
      }
    }

    // Gesture can originate inside the photo grid target
    target.addEventListener('gesturestart', onGestureStart as any, { passive: false });
    window.addEventListener('gesturestart', onGestureStart as any, { passive: false });

    target.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });

    // Active movement & release tracked on window to guarantee 100% smooth tracking across screen edges
    window.addEventListener('gesturechange', onGestureChange as any, { passive: false });
    window.addEventListener('gestureend', onGestureEnd as any, { passive: false });

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('gesturestart', onGestureStart as any);
      window.removeEventListener('gesturestart', onGestureStart as any);

      target.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchstart', onTouchStart);

      window.removeEventListener('gesturechange', onGestureChange as any);
      window.removeEventListener('gestureend', onGestureEnd as any);

      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);

      document.body.style.overflow = '';
      target.style.touchAction = '';
    };
  }, [setColumns]);

  return {
    columns,
    setColumns,
    cycleColumns,
    toastMessage,
    containerRef,
  };
}

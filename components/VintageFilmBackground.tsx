'use client';

import { useEffect, useRef } from 'react';

// Height of each repeating film frame unit in pixels
const UNIT_HEIGHT = 96;

const REPEATING_MARKS = [
  'MEMOIR 400',
  '▲ 24A',
  'SAFETY FILM',
  '▲ 25',
  'ISO 400',
  '▲ 25A',
  'MEMORIES',
  '▲ 26',
  '35MM FILM',
  '▲ 26A',
];

export default function VintageFilmBackground() {
  const leftTapeRef = useRef<HTMLDivElement>(null);
  const rightTapeRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();

  // Smooth, subtle 60fps continuous vertical tape roll (whisper quiet pace)
  useEffect(() => {
    let currentY = 0;
    let lastTime = performance.now();
    const loopHeight = UNIT_HEIGHT * REPEATING_MARKS.length;

    const roll = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Gentle, slow roll (22px per second) — serene and cinematic
      currentY = (currentY + delta * 22) % loopHeight;

      // Left strip moves down, right strip moves up (simulating reel-to-reel counter-motion)
      const transformDownStr = `translate3d(0, ${currentY - loopHeight}px, 0)`;
      const transformUpStr = `translate3d(0, ${-currentY}px, 0)`;

      if (leftTapeRef.current) {
        leftTapeRef.current.style.transform = transformDownStr;
      }
      if (rightTapeRef.current) {
        rightTapeRef.current.style.transform = transformUpStr;
      }

      animRef.current = requestAnimationFrame(roll);
    };

    animRef.current = requestAnimationFrame(roll);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const renderTapeStrip = (ref: React.RefObject<HTMLDivElement>, isRightSide = false) => {
    const marks = isRightSide ? [...REPEATING_MARKS].reverse() : REPEATING_MARKS;
    // Repeat for continuous buffer
    const list = [...marks, ...marks, ...marks, ...marks];

    return (
      <div
        ref={ref}
        className="w-full flex flex-col items-center will-change-transform opacity-35 hover:opacity-50 transition-opacity duration-300"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {list.map((label, i) => (
          <div
            key={`strip-unit-${i}`}
            style={{ height: `${UNIT_HEIGHT}px` }}
            className="w-full border-b border-ink/15 flex flex-col items-center justify-between py-2.5 shrink-0"
          >
            {/* Delicate sprocket hole */}
            <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[1.5px] bg-paper border border-ink/30 shadow-xs" />

            {/* Subtle vintage stamped edge code */}
            <span
              className="font-stamp text-[7px] sm:text-[8px] text-ink/70 tracking-widest uppercase select-none my-1"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {label}
            </span>

            {/* Matching sprocket hole */}
            <div className="w-3 h-4 sm:w-3.5 sm:h-4.5 rounded-[1.5px] bg-paper border border-ink/30 shadow-xs" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 1. Subtle, serene darkroom warmth — soft amber glow in background */}
      <div className="absolute inset-0 bg-radial-vignette opacity-80" />

      {/* 2. Left Edge: Delicate rolling 35mm film border */}
      <div className="absolute top-0 bottom-0 left-0 w-7 sm:w-9 md:w-11 border-r border-ink/10 bg-ink/[0.02] overflow-hidden flex flex-col items-center">
        {renderTapeStrip(leftTapeRef, false)}
      </div>

      {/* 3. Right Edge: Delicate rolling 35mm film border */}
      <div className="absolute top-0 bottom-0 right-0 w-7 sm:w-9 md:w-11 border-l border-ink/10 bg-ink/[0.02] overflow-hidden flex flex-col items-center">
        {renderTapeStrip(rightTapeRef, true)}
      </div>

      {/* 4. Fine vintage celluloid grain & gentle warmth */}
      <div className="absolute inset-0 bg-grain opacity-40 mix-blend-multiply pointer-events-none" />
    </div>
  );
}

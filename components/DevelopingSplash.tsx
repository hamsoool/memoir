'use client';

import { useEffect, useState } from 'react';

interface DevelopingSplashProps {
  onComplete: () => void;
  isLoadingMedia?: boolean;
}

export default function DevelopingSplash({
  onComplete,
  isLoadingMedia = false,
}: DevelopingSplashProps) {
  const [phase, setPhase] = useState<'exposing' | 'developing' | 'fixing' | 'ready'>('exposing');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Stage 1: Exposing negative
    const t1 = setTimeout(() => {
      setPhase('developing');
    }, 800);

    // Stage 2: Developing print
    const t2 = setTimeout(() => {
      setPhase('fixing');
    }, 1700);

    // Stage 3: Fixing & reel ready
    const t3 = setTimeout(() => {
      setPhase('ready');
    }, 2500);

    // Stage 4: Fade out and hand over to reel once minimum animation + media loading completes
    const t4 = setTimeout(() => {
      setIsFadingOut(true);
      const tEnd = setTimeout(() => {
        onComplete();
      }, 700);
      return () => clearTimeout(tEnd);
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-[#F2E8D3] transition-opacity duration-700 select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top sprocket strip */}
      <div className="absolute top-6 inset-x-8 sm:inset-x-16 sprocket-strip opacity-30" />

      {/* Ambient darkroom safelight warmth */}
      <div className="absolute inset-0 bg-radial-vignette opacity-90 pointer-events-none" />

      {/* The Developing Print Easel */}
      <div className="relative z-10 max-w-sm sm:max-w-md w-full bg-paper-light border border-line rounded-[2px] shadow-print p-8 sm:p-12 text-center flex flex-col items-center">
        {/* Washi tape accent on easel corner */}
        <span className="absolute -top-3 left-8 w-12 h-5 bg-tape/80 rotate-[-5deg] shadow-xs pointer-events-none" />
        <span className="absolute -bottom-3 right-8 w-12 h-5 bg-tape/80 rotate-[4deg] shadow-xs pointer-events-none" />

        {/* Small stamped memories header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-rust animate-pulse" />
          <p className="font-stamp text-[11px] text-ink/50 uppercase tracking-widest">
            Developing Memories
          </p>
        </div>

        {/* The "Memoir" title developing from blur/amber into rich walnut ink */}
        <div className="relative my-4 flex items-center justify-center min-h-[5rem]">
          <h1
            className={`font-display italic text-5xl sm:text-6xl text-ink leading-none tracking-tight transition-all duration-1000 ${
              phase === 'exposing'
                ? 'opacity-20 blur-md scale-95 text-amber-800/40'
                : phase === 'developing'
                ? 'opacity-65 blur-xs scale-100 text-rust/80'
                : 'opacity-100 blur-0 scale-100 text-ink'
            }`}
          >
            Memoir
          </h1>

          {/* Soft photographic chemical shimmer overlay */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent ${
              phase === 'developing' ? 'opacity-100 animate-pulse' : 'opacity-0'
            }`}
          />
        </div>

        {/* Dynamic Memory Status Log */}
        <div className="mt-6 space-y-1.5 min-h-[3rem]">
          <p className="font-stamp text-xs text-ink/75 transition-all duration-300">
            {phase === 'exposing' && 'submerging negative in developer bath…'}
            {phase === 'developing' && 'silver halide reacting • image forming…'}
            {phase === 'fixing' && 'rinsing in fixer • stabilizing our reel…'}
            {phase === 'ready' && 'print fully developed • opening our memories…'}
          </p>

          <p className="font-stamp text-[10px] text-ink/40">
            {isLoadingMedia ? 'syncing our favorite moments…' : 'safe and timeless for the two of us'}
          </p>
        </div>

        {/* Developing chemical progress line */}
        <div className="mt-6 w-36 sm:w-48 h-1 bg-ink/10 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-rust transition-all duration-700 ease-out"
            style={{
              width:
                phase === 'exposing'
                  ? '25%'
                  : phase === 'developing'
                  ? '60%'
                  : phase === 'fixing'
                  ? '90%'
                  : '100%',
            }}
          />
        </div>
      </div>

      {/* Bottom sprocket strip */}
      <div className="absolute bottom-6 inset-x-8 sm:inset-x-16 sprocket-strip opacity-30" />
    </div>
  );
}

'use client';

import { DragEvent, useRef, useState } from 'react';

const CORNER_BASE = 'absolute w-6 h-6 border-ink/40 transition-colors';

export default function DropZone({
  onFiles,
}: {
  onFiles: (files: FileList) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging) setDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
  }

  const cornerColor = dragging ? 'border-rust' : 'border-ink/40';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* The viewfinder: drag-and-drop target on desktop, tappable on mobile */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative w-full aspect-[4/3] sm:aspect-[16/9] rounded-sm cursor-pointer select-none
          transition-colors duration-150
          ${dragging ? 'bg-rust/[0.06]' : 'bg-paper-light/60'}
        `}
      >
        {/* corner brackets */}
        <span className={`${CORNER_BASE} ${cornerColor} top-3 left-3 border-t-2 border-l-2`} />
        <span className={`${CORNER_BASE} ${cornerColor} top-3 right-3 border-t-2 border-r-2`} />
        <span className={`${CORNER_BASE} ${cornerColor} bottom-3 left-3 border-b-2 border-l-2`} />
        <span className={`${CORNER_BASE} ${cornerColor} bottom-3 right-3 border-b-2 border-r-2`} />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            className="mb-3 text-ink/50"
            aria-hidden="true"
          >
            <path
              d="M4 8.5C4 7.67 4.67 7 5.5 7H8l1-1.5C9.3 5.2 9.7 5 10.1 5h3.8c.4 0 .8.2 1 .5L16 7h2.5c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5h-13C4.67 19 4 18.33 4 17.5v-9z"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <circle cx="12" cy="12.5" r="3.2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <p className="font-display text-xl sm:text-2xl text-ink">
            Drop a photo or video here
          </p>
          <p className="text-sm text-ink/60 mt-1 hidden sm:block">
            or click to open your files
          </p>
          <p className="text-sm text-ink/60 mt-1 sm:hidden">
            or use the shutter below
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Explicit shutter button — the obvious, unmissable mobile upload
          action. Kept visible on desktop too as a plain secondary trigger. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex items-center gap-3 rounded-full bg-rust hover:bg-rust-dark
          active:scale-[0.97] transition-all text-paper-light pl-2 pr-6 py-2 shadow-print"
        aria-label="Add a photo or video"
      >
        <span className="flex items-center justify-center w-11 h-11 rounded-full bg-paper-light">
          <span className="w-8 h-8 rounded-full bg-rust group-active:bg-rust-dark transition-colors" />
        </span>
        <span className="font-medium">Add a photo or video</span>
      </button>
    </div>
  );
}

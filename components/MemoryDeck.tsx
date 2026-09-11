'use client';

import { useState } from 'react';
import type { UploadItem } from '@/lib/types';
import { formatBytes, type MemoryDeckGroup } from '@/lib/format';
import PhotoPrint from './PhotoPrint';

interface MemoryDeckProps {
  group: MemoryDeckGroup;
  columns?: 1 | 2 | 3 | 4;
  onCycleColumns?: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
  isTrashView?: boolean;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  selectedBytes?: number;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onToggleSelectMode?: () => void;
  onEnlarge?: (item: UploadItem) => void;
}

export default function MemoryDeck({
  group,
  columns = 2,
  onCycleColumns,
  onRemove,
  onRetry,
  onTrash,
  onRestore,
  isTrashView = false,
  isSelectMode = false,
  selectedIds,
  selectedBytes = 0,
  onToggleSelect,
  onToggleSelectAll,
  onToggleSelectMode,
  onEnlarge,
}: MemoryDeckProps) {
  const [isSpread, setIsSpread] = useState(false);
  const items = group.items;
  const isExpanded = isSpread || Boolean(isSelectMode && isTrashView);

  // If there's only 1 item in the group, render it directly without stacking
  if (items.length === 1) {
    return (
      <div className="flex flex-col w-full max-w-[240px] sm:max-w-[260px] lg:max-w-[280px] mx-auto sm:mx-0">
        <div className="mb-2 flex items-baseline justify-between font-stamp text-xs text-ink/60 px-1 gap-2 flex-wrap">
          <span className="font-display italic text-sm sm:text-base text-ink">{group.title}</span>
          {isTrashView ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleSelect?.(items[0].id)}
                className="font-stamp text-[11px] text-ink/75 hover:text-ink px-2 py-0.5 rounded-xs border border-line bg-paper-light hover:border-ink/40 transition flex items-center gap-1 shadow-xs active:scale-[0.98]"
              >
                <svg className="w-3 h-3 text-ink/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  {selectedIds?.has(items[0].id) && (
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <span>{selectedIds?.has(items[0].id) ? 'Deselect' : 'Select'}</span>
              </button>
            </div>
          ) : (
            <span className="text-[11px]">1 memory</span>
          )}
        </div>
        <PhotoPrint
          item={items[0]}
          index={0}
          onRemove={onRemove}
          onRetry={onRetry}
          onTrash={onTrash}
          onRestore={onRestore}
          isTrashView={isTrashView}
          isSelectMode={isSelectMode}
          isSelected={Boolean(selectedIds?.has(items[0].id))}
          onToggleSelect={onToggleSelect}
          onEnlarge={onEnlarge}
        />
      </div>
    );
  }

  const topItem = items[0];

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isExpanded ? 'col-span-full' : ''
      }`}
    >
      {/* Header of the deck */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <div>
          <h3 className="font-display italic text-sm sm:text-base text-ink font-medium">
            {group.title}
          </h3>
          <p className="font-stamp text-[10px] sm:text-[11px] text-ink/50 mt-0.5">
            {group.subtitle}
          </p>
        </div>

        {/* Controls near the archived photos: Select & Stack/Spread */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {isTrashView && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  const allSelected = items.length > 0 && items.every((i) => selectedIds?.has(i.id));
                  if (allSelected) {
                    items.forEach((item) => {
                      if (selectedIds?.has(item.id)) onToggleSelect?.(item.id);
                    });
                  } else {
                    items.forEach((item) => {
                      if (!selectedIds?.has(item.id)) onToggleSelect?.(item.id);
                    });
                  }
                }}
                className="font-stamp text-xs text-ink/75 hover:text-ink px-2.5 py-1 rounded-xs border border-line bg-paper-light hover:border-ink/40 transition flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <svg
                  className="w-3.5 h-3.5 text-ink/60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  {items.length > 0 && items.every((i) => selectedIds?.has(i.id)) && (
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <span>
                  {items.length > 0 && items.every((i) => selectedIds?.has(i.id))
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </button>
            </div>
          )}

          {/* Column Density Button (only visible when deck is spread) */}
          {isSpread && onCycleColumns && (
            <button
              type="button"
              onClick={onCycleColumns}
              title={`Showing ${columns} photos per row. Tap or pinch to change.`}
              className="font-stamp text-xs text-ink/75 hover:text-ink px-2 sm:px-2.5 py-1 rounded-xs border border-line bg-paper-light hover:border-ink/40 transition flex items-center gap-1.5 shadow-xs active:scale-95 shrink-0"
            >
              <svg
                className="w-3.5 h-3.5 text-rust"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>{columns}/row</span>
            </button>
          )}

          {/* Tactile Toggle to Spread or Stack Deck */}
          <button
            type="button"
            onClick={() => setIsSpread((prev) => !prev)}
            className="font-stamp text-xs text-ink/75 hover:text-ink px-2.5 py-1 rounded-xs border border-line bg-paper-light hover:border-ink/40 transition flex items-center gap-1.5 shadow-xs"
          >
            {isSpread ? (
              <>
                {/* Stack Icon */}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <span>Stack cards</span>
              </>
            ) : (
              <>
                {/* Spread / Fan Icon */}
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <span>Spread deck ({items.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* When Stacked (Card Deck View) */}
      {!isExpanded ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsSpread(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setIsSpread(true);
          }}
          className="group relative cursor-pointer select-none w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[280px] mx-auto sm:mx-0 transition-transform duration-300 active:scale-[0.98]"
        >
          {/* Deck Layer 3 (deepest card) */}
          {items.length > 2 && (
            <div className="absolute inset-0 bg-paper-light border border-line/60 rounded-[2px] shadow-print rotate-4 translate-x-2 translate-y-2 transition-transform duration-300 group-hover:rotate-6 group-hover:translate-x-3 group-hover:translate-y-3 pointer-events-none" />
          )}

          {/* Deck Layer 2 (middle card) */}
          <div className="absolute inset-0 bg-paper-light border border-line/75 rounded-[2px] shadow-print -rotate-3 translate-x-1 translate-y-1 transition-transform duration-300 group-hover:-rotate-5 group-hover:translate-x-2 group-hover:translate-y-2 pointer-events-none" />

          {/* Top Card */}
          <div className="relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
            <PhotoPrint
              item={topItem}
              index={0}
              onRemove={onRemove}
              onRetry={onRetry}
              onTrash={onTrash}
              onRestore={onRestore}
              isTrashView={isTrashView}
              isSelectMode={isSelectMode}
              isSelected={Boolean(selectedIds?.has(topItem.id))}
              onToggleSelect={onToggleSelect}
              onEnlarge={isExpanded ? onEnlarge : undefined}
            />

            {/* Click-to-spread invitation overlay tag */}
            <div className="absolute bottom-14 inset-x-2 z-20 flex justify-center pointer-events-none">
              <span className="bg-ink/90 text-paper-light font-stamp text-[9px] sm:text-[10px] uppercase tracking-wider px-2.5 py-0.5 sm:py-1 rounded-full shadow-md backdrop-blur-xs flex items-center gap-1.5 transition group-hover:scale-105 group-hover:bg-rust">
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                <span>{items.length} cards • tap to spread</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* When Separated / Spread Out */
        <div
          className={`grid ${
            columns === 4
              ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 sm:gap-3'
              : columns === 3
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3.5'
              : columns === 1
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 max-w-xl mx-auto'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4.5'
          } animate-fade-in p-1.5 sm:p-4 bg-paper/40 rounded-sm border border-line/50`}
        >
          {items.map((item, i) => (
            <PhotoPrint
              key={item.id}
              item={item}
              index={i}
              onRemove={onRemove}
              onRetry={onRetry}
              onTrash={onTrash}
              onRestore={onRestore}
              isTrashView={isTrashView}
              isSelectMode={isSelectMode}
              isSelected={Boolean(selectedIds?.has(item.id))}
              onToggleSelect={onToggleSelect}
              onEnlarge={onEnlarge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

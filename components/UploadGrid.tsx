'use client';

import { useState, useEffect, useRef } from 'react';
import type { UploadItem } from '@/lib/types';
import { formatBytes, type MemoryDeckGroup } from '@/lib/format';
import PhotoPrint from './PhotoPrint';
import MemoryDeck from './MemoryDeck';

const BATCH_SIZE = 50;

export default function UploadGrid({
  items,
  groups,
  isDeckMode = true,
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
  columns = 2,
  onCycleColumns,
  emptyMessage = 'Nothing developed yet',
  emptySubMessage = 'Add your first shot above.',
}: {
  items: UploadItem[];
  groups?: MemoryDeckGroup[];
  isDeckMode?: boolean;
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
  columns?: 1 | 2 | 3 | 4;
  onCycleColumns?: () => void;
  emptyMessage?: string;
  emptySubMessage?: string;
}) {
  const [visibleCount, setVisibleCount] = useState<number>(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count when switching between reel and trash views
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [isTrashView]);

  const hasMore = visibleCount < items.length;
  const displayedItems = items.slice(0, visibleCount);

  // IntersectionObserver for mobile-friendly infinite scroll (50 items at a time)
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length));
        }
      },
      {
        rootMargin: '400px 0px', // Preload next batch before user reaches absolute bottom
        threshold: 0,
      }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, items.length]);

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line rounded-sm py-14 text-center bg-paper/30">
        <p className="text-ink/50 font-display italic text-lg">{emptyMessage}</p>
        <p className="text-ink/40 text-sm mt-1">{emptySubMessage}</p>
      </div>
    );
  }

  // If in Deck Mode and grouped decks are provided, render as stacked decks of cards
  if (isDeckMode && groups && groups.length > 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-7 xl:gap-8 items-start">
        {groups.map((group) => (
          <MemoryDeck
            key={group.id}
            group={group}
            columns={columns}
            onCycleColumns={onCycleColumns}
            onRemove={onRemove}
            onRetry={onRetry}
            onTrash={onTrash}
            onRestore={onRestore}
            isTrashView={isTrashView}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            selectedBytes={selectedBytes}
            onToggleSelect={onToggleSelect}
            onToggleSelectAll={onToggleSelectAll}
            onToggleSelectMode={onToggleSelectMode}
            onEnlarge={onEnlarge}
          />
        ))}
      </div>
    );
  }

  // Standard flat grid view with continuous progressive scrolling
  return (
    <div className="flex flex-col">
      {/* Header directly above the archived photos when in flat grid view */}
      {isTrashView && (
        <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-2 px-1">
          <div>
            <h3 className="font-display italic text-sm sm:text-base text-ink font-medium">
              Archived Memories
            </h3>
            <p className="font-stamp text-[10px] sm:text-[11px] text-ink/50 mt-0.5">
              {items.length} {items.length === 1 ? 'memory' : 'memories'} in trash
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onCycleColumns && (
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

            {onToggleSelectAll && (
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="font-stamp text-xs text-ink hover:text-ink/80 px-2.5 py-1 rounded-xs border border-line bg-paper-light hover:border-ink/40 transition flex items-center gap-1.5 shadow-xs active:scale-[0.98]"
              >
                <svg
                  className="w-3.5 h-3.5 text-ink/60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  {selectedIds && selectedIds.size === items.length && items.length > 0 && (
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                <span>
                  {selectedIds && selectedIds.size === items.length && items.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`grid transition-all duration-300 ${
          columns === 4
            ? 'grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8 gap-x-2 sm:gap-x-3.5 lg:gap-x-4 gap-y-3.5 sm:gap-y-5 lg:gap-y-6'
            : columns === 3
            ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-x-2.5 sm:gap-x-4 lg:gap-x-5 gap-y-4 sm:gap-y-5 lg:gap-y-6'
            : columns === 1
            ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-6 sm:gap-y-8 max-w-2xl mx-auto w-full'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-x-3.5 sm:gap-x-5 lg:gap-x-6 gap-y-5 sm:gap-y-6 lg:gap-y-7'
        }`}
      >
        {displayedItems.map((item, i) => (
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

      {/* Sentinel element to trigger auto-load of next batch as user scrolls */}
      {hasMore && (
        <div ref={sentinelRef} className="h-10 w-full pointer-events-none" aria-hidden="true" />
      )}

      {/* Mobile-friendly continuous reel status indicator */}
      {items.length > BATCH_SIZE && (
        <div className="mt-8 mb-2 flex flex-col items-center justify-center gap-2 text-center select-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper-light border border-line shadow-xs font-stamp text-xs text-ink/75">
            {hasMore ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rust animate-pulse" />
                <span>Showing {displayedItems.length} of {items.length} moments</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-rust" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>All {items.length} memories developed</span>
              </>
            )}
          </div>

          {hasMore && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, items.length))}
                className="font-stamp text-[11px] sm:text-xs text-ink/70 hover:text-ink underline decoration-line/60 hover:decoration-ink transition py-0.5"
              >
                Load next 50
              </button>
              <span className="text-ink/30 text-xs">•</span>
              <button
                type="button"
                onClick={() => setVisibleCount(items.length)}
                className="font-stamp text-[11px] sm:text-xs text-rust hover:text-rust-dark font-medium transition py-0.5"
              >
                Show all ({items.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

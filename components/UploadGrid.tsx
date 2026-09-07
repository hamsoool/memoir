'use client';

import type { UploadItem } from '@/lib/types';
import type { MemoryDeckGroup } from '@/lib/format';
import PhotoPrint from './PhotoPrint';
import MemoryDeck from './MemoryDeck';

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
  onToggleSelect,
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
  onToggleSelect?: (id: string) => void;
  emptyMessage?: string;
  emptySubMessage?: string;
}) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {groups.map((group) => (
          <MemoryDeck
            key={group.id}
            group={group}
            onRemove={onRemove}
            onRetry={onRetry}
            onTrash={onTrash}
            onRestore={onRestore}
            isTrashView={isTrashView}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    );
  }

  // Standard flat grid view
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3.5 sm:gap-x-5 gap-y-5 sm:gap-y-6">
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
        />
      ))}
    </div>
  );
}

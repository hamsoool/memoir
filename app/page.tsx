'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import FilmHeader from '@/components/FilmHeader';
import DropZone from '@/components/DropZone';
import UploadGrid from '@/components/UploadGrid';
import AccessGate, { isAlreadyUnlocked } from '@/components/AccessGate';
import ConfirmUploadModal from '@/components/ConfirmUploadModal';
import DevelopingSplash from '@/components/DevelopingSplash';
import { uploadFile } from '@/lib/uploadClient';
import { fileKind, formatBytes, groupMemories, makeId } from '@/lib/format';
import type { UploadItem } from '@/lib/types';

type SortField = 'date' | 'size' | 'type';
type SortOrder = 'desc' | 'asc';

export default function Page() {
  const clientNeedsGate = Boolean(process.env.NEXT_PUBLIC_ACCESS_CODE);
  const [unlocked, setUnlocked] = useState(!clientNeedsGate && isAlreadyUnlocked());
  const [isDevelopingIntro, setIsDevelopingIntro] = useState<boolean>(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [pendingItems, setPendingItems] = useState<UploadItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Tab, Sort, and Deck Layout states
  const [activeTab, setActiveTab] = useState<'reel' | 'trash'>('reel');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isDeckMode, setIsDeckMode] = useState<boolean>(true);

  useEffect(() => {
    async function checkExistingSession() {
      // 1. Fast local session check
      if (isAlreadyUnlocked()) {
        setUnlocked(true);
        setIsDevelopingIntro(true);
        return;
      }

      // 2. Query Upstash Redis session & server-side gate requirement
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (data.ok) {
          if (!data.gateRequired || data.authenticated) {
            setUnlocked(true);
            setIsDevelopingIntro(true);
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check session from server:', err);
      }

      // If no passcode gate was set in client either, unlock
      if (!clientNeedsGate) {
        setUnlocked(true);
        setIsDevelopingIntro(true);
      }
    }

    checkExistingSession();
  }, [clientNeedsGate]);

  const loadMediaFromCloudinary = useCallback(async () => {
    try {
      setIsLoadingMedia(true);
      const res = await fetch('/api/media');
      const data = await res.json();
      if (data.ok && Array.isArray(data.items)) {
        setIsConfigured(Boolean(data.configured));

        const loaded: UploadItem[] = data.items.map(
          (asset: {
            publicId: string;
            url: string;
            kind: 'image' | 'video';
            bytes?: number;
            name?: string;
            createdAt?: string;
            isTrashed?: boolean;
          }) => ({
            id: asset.publicId,
            previewUrl: asset.url,
            url: asset.url,
            key: asset.publicId,
            kind: asset.kind,
            status: 'done' as const,
            progress: 100,
            bytes: asset.bytes,
            name: asset.name,
            createdAt: asset.createdAt,
            isTrashed: Boolean(asset.isTrashed),
          })
        );

        setItems(loaded);
      }
    } catch (err) {
      console.error('Failed to load media from Cloudinary:', err);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) {
      loadMediaFromCloudinary();
    }
  }, [unlocked, loadMediaFromCloudinary]);

  const startUpload = useCallback(
    (item: UploadItem) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'uploading', progress: 0, error: undefined }
            : i
        )
      );

      if (!item.file) return;

      uploadFile(item.file, (percent) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i))
        );
      })
        .then((res) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    status: 'done',
                    progress: 100,
                    url: res.url,
                    key: res.key,
                    bytes: item.file?.size,
                    createdAt: new Date().toISOString(),
                    isTrashed: false,
                  }
                : i
            )
          );
          // Re-sync with Cloudinary
          loadMediaFromCloudinary();
        })
        .catch((err: Error) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'error', error: err.message }
                : i
            )
          );
        });
    },
    [loadMediaFromCloudinary]
  );

  const handleFiles = useCallback((files: FileList) => {
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const newItems: UploadItem[] = accepted.map((file) => ({
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      kind: fileKind(file),
      status: 'queued',
      progress: 0,
      bytes: file.size,
      name: file.name,
      createdAt: new Date().toISOString(),
      isTrashed: false,
    }));

    // Open confirmation modal before sending to Cloudinary
    setPendingItems((prev) => [...prev, ...newItems]);
  }, []);

  function handleConfirmUpload() {
    if (pendingItems.length === 0) return;
    const toUpload = [...pendingItems];
    setItems((prev) => [...toUpload, ...prev]);
    setPendingItems([]);
    toUpload.forEach(startUpload);
  }

  function handleCancelUpload() {
    pendingItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPendingItems([]);
  }

  function handleRemovePendingItem(id: string) {
    setPendingItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  // Move item to Trash / Archive
  async function handleMoveToTrash(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    // Optimistically mark as trashed
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isTrashed: true } : i))
    );

    if (target.key) {
      try {
        await fetch('/api/media/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: target.key, action: 'trash' }),
        });
      } catch (err) {
        console.error('Failed to move item to trash in Cloudinary:', err);
      }
    }
  }

  // Restore item from Trash back to active Reel
  async function handleRestore(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    // Optimistically restore
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isTrashed: false } : i))
    );

    if (target.key) {
      try {
        await fetch('/api/media/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: target.key, action: 'restore' }),
        });
      } catch (err) {
        console.error('Failed to restore item in Cloudinary:', err);
      }
    }
  }

  // Permanent Delete (only executed from Trash or with explicit confirmation)
  async function handlePermanentDelete(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const confirmed = window.confirm(
      `Permanently delete "${target.name || 'this memory'}" from Cloudinary? This action cannot be undone.`
    );
    if (!confirmed) return;

    if (target.previewUrl && target.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.previewUrl);
    }

    // Optimistically remove from state
    setItems((prev) => prev.filter((i) => i.id !== id));

    if (target.key) {
      try {
        await fetch('/api/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: target.key, kind: target.kind }),
        });
        loadMediaFromCloudinary();
      } catch (err) {
        console.error('Failed to permanently delete asset from Cloudinary:', err);
      }
    }
  }

  // Empty entire Trash
  async function handleEmptyTrash() {
    const trashedCount = items.filter((i) => i.isTrashed).length;
    if (trashedCount === 0) return;

    const confirmed = window.confirm(
      `Permanently delete all ${trashedCount} items in the trash from Cloudinary? This cannot be undone.`
    );
    if (!confirmed) return;

    setItems((prev) => prev.filter((i) => !i.isTrashed));

    try {
      await fetch('/api/media/trash', {
        method: 'DELETE',
      });
      loadMediaFromCloudinary();
    } catch (err) {
      console.error('Failed to empty trash from Cloudinary:', err);
    }
  }

  function handleRetry(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) startUpload(item);
  }

  // Split items into active vs trashed
  const activeItems = useMemo(
    () => items.filter((i) => !i.isTrashed),
    [items]
  );
  const trashedItems = useMemo(
    () => items.filter((i) => Boolean(i.isTrashed)),
    [items]
  );

  // Sorting logic based on field and direction
  const sortedItems = useMemo(() => {
    const source = activeTab === 'reel' ? [...activeItems] : [...trashedItems];

    return source.sort((a, b) => {
      if (sortField === 'date') {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }

      if (sortField === 'size') {
        const sizeA = a.bytes || a.file?.size || 0;
        const sizeB = b.bytes || b.file?.size || 0;
        return sortOrder === 'desc' ? sizeB - sizeA : sizeA - sizeB;
      }

      if (sortField === 'type') {
        if (a.kind !== b.kind) {
          const pref = sortOrder === 'desc' ? 'image' : 'video';
          return a.kind === pref ? -1 : 1;
        }
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      }

      return 0;
    });
  }, [activeTab, activeItems, trashedItems, sortField, sortOrder]);

  // Group memories into stacked decks of cards
  const memoryGroups = useMemo(() => {
    const source = activeTab === 'reel' ? activeItems : trashedItems;
    return groupMemories(source, sortField, sortOrder);
  }, [activeTab, activeItems, trashedItems, sortField, sortOrder]);

  // Calculate sizes separated by media type (Images vs Videos)
  const imageItems = useMemo(
    () => items.filter((i) => i.kind === 'image'),
    [items]
  );
  const videoItems = useMemo(
    () => items.filter((i) => i.kind === 'video'),
    [items]
  );

  const totalImageBytes = useMemo(
    () =>
      imageItems.reduce(
        (acc, curr) => acc + (curr.bytes || curr.file?.size || 0),
        0
      ),
    [imageItems]
  );

  const totalVideoBytes = useMemo(
    () =>
      videoItems.reduce(
        (acc, curr) => acc + (curr.bytes || curr.file?.size || 0),
        0
      ),
    [videoItems]
  );

  const totalUploadedBytes = totalImageBytes + totalVideoBytes;

  // 25 GB Cloudinary free capacity in bytes
  const MAX_STORAGE_BYTES = 25 * 1024 * 1024 * 1024;
  const imagePercentage = (totalImageBytes / MAX_STORAGE_BYTES) * 100;
  const videoPercentage = (totalVideoBytes / MAX_STORAGE_BYTES) * 100;
  const usedPercentage = Math.min(100, imagePercentage + videoPercentage);

  // Minimum visibility threshold so tiny uploads remain visible on the bar
  const displayImagePercent =
    totalImageBytes > 0 ? Math.max(0.6, imagePercentage) : 0;
  const displayVideoPercent =
    totalVideoBytes > 0 ? Math.max(0.6, videoPercentage) : 0;

  const usedPercentageLabel =
    usedPercentage < 0.01 && totalUploadedBytes > 0
      ? '< 0.01%'
      : `${usedPercentage.toFixed(2)}%`;
  const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - totalUploadedBytes);

  function handleUnlock() {
    setUnlocked(true);
    setIsDevelopingIntro(true);
  }

  if (!unlocked) {
    return <AccessGate onUnlock={handleUnlock} />;
  }

  return (
    <>
      {isDevelopingIntro && (
        <DevelopingSplash
          onComplete={() => setIsDevelopingIntro(false)}
          isLoadingMedia={isLoadingMedia}
        />
      )}
      <main className="min-h-dvh px-4 sm:px-6 md:px-8 py-6 sm:py-10 max-w-4xl mx-auto">
        <div className="sprocket-strip mb-6 sm:mb-7" />

      <FilmHeader count={activeItems.length} />

      <section className="mb-7 sm:mb-8">
        <DropZone onFiles={handleFiles} />
      </section>

      {/* Confirmation Modal before uploading to Cloudinary */}
      <ConfirmUploadModal
        items={pendingItems}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
        onRemoveItem={handleRemovePendingItem}
      />

      <section>
        {/* View Switcher & Sorting Controls Bar */}
        <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-paper border border-line rounded-sm">
          {/* Tabs: Active Reel vs Trash */}
          <div className="flex items-center gap-1.5 font-stamp text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('reel')}
              className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                activeTab === 'reel'
                  ? 'bg-ink text-paper-light font-medium shadow-xs'
                  : 'text-ink/65 hover:text-ink hover:bg-ink/5'
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
              <span>Active Reel</span>
              <span className="opacity-70 text-[10px]">({activeItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('trash')}
              className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                activeTab === 'trash'
                  ? 'bg-rust text-paper-light font-medium shadow-xs'
                  : 'text-ink/65 hover:text-rust hover:bg-rust/5'
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <span>Trash</span>
              <span className="opacity-70 text-[10px]">({trashedItems.length})</span>
            </button>
          </div>

          {/* Right side controls: Tactile Vintage Sorting & Empty Trash */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-2.5">
            {activeTab === 'trash' && trashedItems.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="font-stamp text-xs text-rust hover:bg-rust/10 border border-rust/40 px-2.5 py-1.5 rounded-xs transition flex items-center gap-1.5"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Empty Trash</span>
              </button>
            )}

            {/* Layout Toggle: Decks vs Spread */}
            <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-xs">
              <button
                type="button"
                onClick={() => setIsDeckMode(true)}
                title="Stack into decks of cards"
                className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                  isDeckMode
                    ? 'bg-ink text-paper-light font-medium shadow-xs'
                    : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                }`}
              >
                <svg
                  className="w-3 h-3"
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
                <span>Decks</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeckMode(false)}
                title="Spread all cards across the grid"
                className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                  !isDeckMode
                    ? 'bg-ink text-paper-light font-medium shadow-xs'
                    : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                }`}
              >
                <svg
                  className="w-3 h-3"
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
                <span>Spread</span>
              </button>
            </div>

            {/* Vintage Tactile Sort Group */}
            <div className="flex items-center gap-1.5">
              <span className="font-stamp text-[10px] uppercase text-ink/40 tracking-wider hidden sm:inline">
                Sort:
              </span>

              {/* Field Segmented Buttons */}
              <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-xs">
                <button
                  type="button"
                  onClick={() => setSortField('date')}
                  className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                    sortField === 'date'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Date</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortField('size')}
                  className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                    sortField === 'size'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <span>Size</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortField('type')}
                  className={`px-2.5 py-1 rounded-xs transition flex items-center gap-1.5 ${
                    sortField === 'type'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span>Type</span>
                </button>
              </div>

              {/* Order direction toggle */}
              <button
                type="button"
                onClick={() =>
                  setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                }
                title={
                  sortOrder === 'desc'
                    ? 'Switch to Ascending'
                    : 'Switch to Descending'
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs border border-line bg-paper-light hover:border-ink/50 text-ink font-stamp text-xs transition active:scale-[0.98]"
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${
                    sortOrder === 'asc' ? 'rotate-180' : ''
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <polyline points="19 12 12 19 5 12" />
                </svg>
                <span className="text-[11px] text-ink/80 font-medium">
                  {sortField === 'date'
                    ? sortOrder === 'desc'
                      ? 'Newest'
                      : 'Oldest'
                    : sortField === 'size'
                    ? sortOrder === 'desc'
                      ? 'Largest'
                      : 'Smallest'
                    : sortOrder === 'desc'
                    ? 'Photos'
                    : 'Videos'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Trash Notice Banner */}
        {activeTab === 'trash' && (
          <div className="mb-6 p-3 bg-rust/5 border border-rust/20 rounded-xs font-stamp text-xs text-rust flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>
              Items in the trash are archived. You can restore them to the reel or delete them permanently from Cloudinary.
            </span>
          </div>
        )}

        {/* The Grid / Decks (Media Uploaded) */}
        <UploadGrid
          items={sortedItems}
          groups={memoryGroups}
          isDeckMode={isDeckMode}
          onRemove={handlePermanentDelete}
          onRetry={handleRetry}
          onTrash={handleMoveToTrash}
          onRestore={handleRestore}
          isTrashView={activeTab === 'trash'}
          emptyMessage={
            activeTab === 'trash'
              ? 'Trash is empty'
              : 'Nothing developed yet'
          }
          emptySubMessage={
            activeTab === 'trash'
              ? 'Photos and videos moved to trash will appear here.'
              : 'Add your first shot above.'
          }
        />

        {/* Storage stats & Cloudinary 25 GB Capacity Tracker Bar (Placed Below Media Uploaded) */}
        <div className="mt-10 sm:mt-12 p-3.5 sm:p-4.5 bg-paper-light border border-line rounded-sm shadow-print">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-2.5 border-b border-line/60">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-stamp text-[10px] sm:text-[11px] text-ink/50 uppercase tracking-widest">
                  Our Reel Capacity
                </p>
                {isLoadingMedia && (
                  <span className="font-stamp text-[9px] sm:text-[10px] text-rust animate-pulse">
                    syncing reel…
                  </span>
                )}
              </div>
              <h2 className="font-display italic text-xl sm:text-2xl text-ink mt-0.5">
                {formatBytes(totalUploadedBytes)} of 25 GB used
              </h2>
            </div>
            <div className="font-stamp text-[11px] sm:text-xs text-ink/60 flex items-center gap-2.5">
              <span>{activeItems.length} {activeItems.length === 1 ? 'moment' : 'moments'} preserved</span>
              {trashedItems.length > 0 && (
                <span className="text-rust font-medium">
                  ({trashedItems.length} in trash)
                </span>
              )}
            </div>
          </div>

          {/* Analog Film Reel Gauge / Storage Bar segmented by Photos vs Videos */}
          <div className="my-3.5">
            {/* Color-coded legend & precise byte breakdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-stamp text-ink/75 mb-2">
              <div className="flex flex-wrap items-center gap-3">
                {/* Photos segment legend */}
                <span className="flex items-center gap-1.5" title="Total space taken by photos">
                  <span className="w-2 h-2 rounded-full bg-rust shrink-0" />
                  <span className="text-ink font-medium">Photos:</span>
                  <span className="text-ink/65">
                    {formatBytes(totalImageBytes)} ({imageItems.length})
                  </span>
                </span>

                {/* Videos segment legend */}
                <span className="flex items-center gap-1.5" title="Total space taken by videos">
                  <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                  <span className="text-ink font-medium">Videos:</span>
                  <span className="text-ink/65">
                    {formatBytes(totalVideoBytes)} ({videoItems.length})
                  </span>
                </span>
              </div>

              <span className="font-medium text-ink/80">
                {formatBytes(totalUploadedBytes)} / 25 GB ({usedPercentageLabel})
              </span>
            </div>

            {/* The Track with recessed bezel and gauge ticks */}
            <div className="relative h-3.5 sm:h-4 w-full bg-ink/10 rounded-xs overflow-hidden border border-line/80 shadow-inner p-[1.5px] flex">
              {/* Subtle vintage millimeter ticks */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none z-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #2c231b 0, #2c231b 1px, transparent 1px, transparent 12px)',
                }}
              />

              {/* Photos segment (Rust) */}
              {totalImageBytes > 0 && (
                <div
                  title={`Photos: ${formatBytes(totalImageBytes)} (${imageItems.length} photos)`}
                  className="h-full bg-rust transition-all duration-700 relative shadow-xs rounded-l-[1px]"
                  style={{ width: `${displayImagePercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/15" />
                </div>
              )}

              {/* Videos segment (Teal) */}
              {totalVideoBytes > 0 && (
                <div
                  title={`Videos: ${formatBytes(totalVideoBytes)} (${videoItems.length} videos)`}
                  className={`h-full bg-teal transition-all duration-700 relative shadow-xs ${
                    totalImageBytes === 0 ? 'rounded-l-[1px]' : ''
                  } rounded-r-[1px]`}
                  style={{ width: `${displayVideoPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/15" />
                </div>
              )}
            </div>

            {/* Capacity tick labels below the bar */}
            <div className="flex items-center justify-between font-stamp text-[9px] sm:text-[10px] text-ink/45 mt-1 px-0.5">
              <span>0 GB</span>
              <span className="hidden sm:inline">6.25 GB</span>
              <span>12.5 GB (half spool)</span>
              <span className="hidden sm:inline">18.75 GB</span>
              <span>25 GB full</span>
            </div>
          </div>

          {/* Bottom stats row */}
          <div className="mt-2.5 pt-2 border-t border-line/40 flex flex-wrap items-center justify-between gap-2 text-xs font-stamp text-ink/75">
            <span className="text-ink/65 text-[10px] sm:text-[11px]">
              {formatBytes(remainingBytes)} of room still open on our roll
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-ink/60">
              <span className="px-2 py-0.5 bg-paper rounded-xs border border-line/60">
                Photos up to 10 MB
              </span>
              <span className="px-2 py-0.5 bg-paper rounded-xs border border-line/60">
                Videos up to 100 MB
              </span>
            </div>
          </div>

          {!isConfigured && (
            <div className="mt-2.5 p-2 bg-paper text-ink/70 text-xs font-stamp rounded-xs border border-line/60">
              Connect your Cloudinary credentials in{' '}
              <code className="text-rust">.env.local</code> to sync live media and view real storage statistics.
            </div>
          )}
        </div>
      </section>

      <div className="sprocket-strip mt-12" />
      <p className="text-center font-stamp text-[11px] text-ink/40 mt-4">
        This memoir stays between the two of us.
      </p>
      </main>
    </>
  );
}

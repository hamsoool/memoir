'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FilmHeader from '@/components/FilmHeader';
import DropZone from '@/components/DropZone';
import UploadGrid from '@/components/UploadGrid';
import AccessGate, { isAlreadyUnlocked } from '@/components/AccessGate';
import ConfirmUploadModal from '@/components/ConfirmUploadModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PhotoLightbox from '@/components/PhotoLightbox';
import PhotoStripStudio from '@/components/PhotoStripStudio';
import DevelopingSplash from '@/components/DevelopingSplash';
import { uploadFile } from '@/lib/uploadClient';
import { fileKind, formatBytes, groupMemories, makeId } from '@/lib/format';
import { usePinchGrid } from '@/lib/usePinchGrid';
import type { UploadItem } from '@/lib/types';
import type { DiscordNotifyOptions } from '@/lib/discord';
import {
  loadPhotoStripDraft,
  clearPhotoStripDraft,
  isDraftMeaningful,
  type PhotoStripDraft,
} from '@/lib/photoStripStorage';

type SortField = 'date' | 'size' | 'type';
type SortOrder = 'desc' | 'asc';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  badge?: string;
  description: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  thumbnailUrl?: string;
  thumbnailKind?: 'image' | 'video';
  onConfirm: () => void;
}

export default function Page() {
  const { columns, cycleColumns, toastMessage, containerRef } = usePinchGrid();
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [isDevelopingIntro, setIsDevelopingIntro] = useState<boolean>(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [pendingItems, setPendingItems] = useState<UploadItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [initialTimeoutSeconds, setInitialTimeoutSeconds] = useState<number>(0);

  // Tab, Sort, and Deck Layout states
  const [activeTab, setActiveTab] = useState<'reel' | 'trash'>('reel');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateGrouping, setDateGrouping] = useState<'month' | 'day'>('month');
  const [isDeckMode, setIsDeckMode] = useState<boolean>(false);
  const [isStripStudioOpen, setIsStripStudioOpen] = useState<boolean>(false);
  const [cachedDraft, setCachedDraft] = useState<PhotoStripDraft | null>(null);

  // Check for in-progress photostrip draft & auto-resume if user was editing when app was backgrounded/closed
  useEffect(() => {
    const draft = loadPhotoStripDraft();
    if (draft && isDraftMeaningful(draft)) {
      setCachedDraft(draft);
      if (draft.wasOpen) {
        setIsStripStudioOpen(true);
      }
    }
  }, []);

  // Sync draft state whenever studio opens or closes
  useEffect(() => {
    if (!isStripStudioOpen) {
      const draft = loadPhotoStripDraft();
      setCachedDraft(draft && isDraftMeaningful(draft) ? draft : null);
    }
  }, [isStripStudioOpen]);

  // Trash Multi-Selection states - default to true when in trash
  const [isSelectingTrash, setIsSelectingTrash] = useState<boolean>(true);
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());

  // Click-to-enlarge Photo Lightbox state
  const [enlargedItem, setEnlargedItem] = useState<UploadItem | null>(null);

  // Reset selection when leaving trash tab, and automatically enable select mode when entering trash
  useEffect(() => {
    if (activeTab !== 'trash') {
      setIsSelectingTrash(false);
      setSelectedTrashIds(new Set());
    } else {
      setIsSelectingTrash(true);
    }
  }, [activeTab]);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();

        if (data.ok) {
          // Check if device or IP is permanently banned
          if (data.banned) {
            setIsBanned(true);
            setUnlocked(false);
            return;
          }

          // Check if device is in a 5-minute cooldown
          if (data.timedOut) {
            setInitialTimeoutSeconds(data.remainingSeconds || 300);
          }

          // If no passcode is set on server, open memories freely
          if (!data.gateRequired) {
            setUnlocked(true);
            setIsDevelopingIntro(true);
            return;
          }

          // If device is already authorized by 90-day cookie or IP in Upstash Redis
          if (data.authenticated) {
            setUnlocked(true);
            setIsDevelopingIntro(true);
            return;
          }

          // Gate is required and device is not yet authorized: keep locked
          setUnlocked(false);
        } else {
          setUnlocked(false);
        }
      } catch (err) {
        console.error('Failed to check session from server:', err);
        setUnlocked(false);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkExistingSession();
  }, []);

  const currentVersionRef = useRef<string>('');

  const loadMediaFromCloudinary = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      try {
        if (!silent) {
          setIsLoadingMedia(true);
        }
        const res = await fetch('/api/media', {
          signal,
          cache: 'no-store',
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.items)) {
          setIsConfigured(Boolean(data.configured));
          if (data.version) {
            currentVersionRef.current = data.version;
          }

          const loaded: UploadItem[] = data.items.map(
            (asset: {
              publicId: string;
              url: string;
              kind: 'image' | 'video';
              bytes?: number;
              name?: string;
              createdAt?: string;
              capturedAt?: string;
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
              capturedAt: asset.capturedAt,
              isTrashed: Boolean(asset.isTrashed),
            })
          );

          setItems((prev) => {
            if (prev.length === 0) return loaded;

            const loadedKeys = new Set(
              loaded.map((item) => item.key || item.id).filter(Boolean)
            );
            const loadedUrls = new Set(
              loaded.map((item) => item.url).filter(Boolean)
            );

            // Revoke blob URLs for items that are now synced with Cloudinary
            prev.forEach((item) => {
              if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
                const isSynced =
                  (item.key && loadedKeys.has(item.key)) ||
                  (item.url && loadedUrls.has(item.url));
                if (isSynced) {
                  URL.revokeObjectURL(item.previewUrl);
                }
              }
            });

            // Keep items from prev that are still uploading, queued, or recently finished but not yet returned by Cloudinary
            const pendingOrUnsynced = prev.filter((item) => {
              if (item.status === 'uploading' || item.status === 'queued') {
                return true;
              }
              if (item.status === 'done') {
                const hasKey = item.key && loadedKeys.has(item.key);
                const hasUrl = item.url && loadedUrls.has(item.url);
                return !hasKey && !hasUrl;
              }
              return false;
            });

            return [...pendingOrUnsynced, ...loaded];
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error('Failed to load media from Cloudinary:', err);
      } finally {
        if (!silent) {
          setIsLoadingMedia(false);
        }
      }
    },
    []
  );

  // Initial load on unlock
  useEffect(() => {
    if (unlocked) {
      loadMediaFromCloudinary();
    }
  }, [unlocked, loadMediaFromCloudinary]);

  // Live Cross-Device Sync (Leak-Proof & Battery-Optimized)
  useEffect(() => {
    if (!unlocked) return;

    let syncInterval: NodeJS.Timeout | null = null;
    let inFlightController: AbortController | null = null;
    let isChecking = false;

    async function checkForUpdates() {
      // Don't run check if document is hidden or if a check is already underway
      if (document.hidden || isChecking) return;

      try {
        isChecking = true;
        inFlightController?.abort();
        inFlightController = new AbortController();

        const currentVer = currentVersionRef.current;
        const res = await fetch(
          `/api/media/sync?version=${encodeURIComponent(currentVer)}`,
          {
            signal: inFlightController.signal,
            cache: 'no-store',
          }
        );
        const data = await res.json();

        if (data.ok && data.version) {
          currentVersionRef.current = data.version;
          if (data.changed) {
            // An external device uploaded, trashed, restored, or deleted media!
            await loadMediaFromCloudinary(true, inFlightController.signal);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Network glitches are gracefully swallowed
      } finally {
        isChecking = false;
      }
    }

    function startPolling() {
      if (syncInterval) clearInterval(syncInterval);
      syncInterval = setInterval(checkForUpdates, 10000);
    }

    function stopPolling() {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
      inFlightController?.abort();
      inFlightController = null;
      isChecking = false;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab is hidden or phone is locked: immediately halt polling to conserve battery and memory
        stopPolling();
      } else {
        // Tab became visible again: immediately check for any uploads that occurred while away, then resume polling
        checkForUpdates();
        startPolling();
      }
    }

    function handleFocusOrOnline() {
      if (!document.hidden) {
        checkForUpdates();
      }
    }

    // Start polling while tab is active
    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
    };
  }, [unlocked, loadMediaFromCloudinary]);

  const startUpload = useCallback(
    async (item: UploadItem): Promise<DiscordNotifyOptions | null> => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: 'uploading', progress: 0, error: undefined }
            : i
        )
      );

      if (!item.file) return null;

      try {
        const res = await uploadFile(item.file, (percent) => {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i))
          );
        });

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
                  capturedAt:
                    res.capturedAt ||
                    (item.file?.lastModified
                      ? new Date(item.file.lastModified).toISOString()
                      : undefined),
                  isTrashed: false,
                }
              : i
          )
        );

        if (res.url && !res.isDuplicate) {
          return {
            filename: item.file.name,
            url: res.url,
            kind: item.kind,
            publicId: res.key,
          };
        }
        return null;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', error: errorMsg }
              : i
          )
        );
        return null;
      }
    },
    []
  );

  const handleFiles = useCallback(
    (files: FileList) => {
      const accepted = Array.from(files).filter(
        (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
      );

      // Filter out files that are already actively in our reel or already queued
      const existingSignatures = new Set(
        [...items.filter((i) => !i.isTrashed), ...pendingItems].map(
          (i) => `${i.name || i.file?.name}-${i.bytes || i.file?.size}`
        )
      );

      const uniqueFiles = accepted.filter((file) => {
        const signature = `${file.name}-${file.size}`;
        return !existingSignatures.has(signature);
      });

      const newItems: UploadItem[] = uniqueFiles.map((file) => ({
        id: makeId(),
        file,
        previewUrl: URL.createObjectURL(file),
        kind: fileKind(file),
        status: 'queued',
        progress: 0,
        bytes: file.size,
        name: file.name,
        createdAt: new Date().toISOString(),
        capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        isTrashed: false,
      }));

      // Open confirmation modal before sending to Cloudinary
      if (newItems.length > 0) {
        setPendingItems((prev) => [...prev, ...newItems]);
      }
    },
    [items, pendingItems]
  );

  async function handleConfirmUpload() {
    if (pendingItems.length === 0) return;
    const toUpload = [...pendingItems];
    setItems((prev) => [...toUpload, ...prev]);
    setPendingItems([]);

    // Upload all files and collect results
    const results = await Promise.all(toUpload.map((item) => startUpload(item)));
    const successful = results.filter(
      (r): r is DiscordNotifyOptions => r !== null && Boolean(r.url)
    );

    // Send adaptive Discord notification for all uploaded attachments in background
    if (successful.length > 0) {
      fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: successful }),
      }).catch((err) => {
        console.error('Failed to send batch Discord notification:', err);
      });
    }

    // Re-sync with Cloudinary once all batch uploads complete
    loadMediaFromCloudinary();
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
  function handlePermanentDelete(id: string) {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    setConfirmModal({
      isOpen: true,
      title: 'Permanently delete memory?',
      badge: 'destructive action',
      itemName: target.name || (target.kind === 'image' ? 'Photograph' : 'Motion Film'),
      description:
        'This memory will be permanently deleted. Once removed, it cannot be recovered or brought back.',
      confirmLabel: 'Delete Forever',
      cancelLabel: 'Keep in Trash',
      isDestructive: true,
      thumbnailUrl: target.previewUrl,
      thumbnailKind: target.kind,
      onConfirm: async () => {
        setConfirmModal(null);
        if (target.previewUrl && target.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl);
        }

        // Optimistically remove from state
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelectedTrashIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        const keyToDelete = target.key || target.id;
        if (keyToDelete) {
          try {
            await fetch('/api/media', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicId: keyToDelete, kind: target.kind }),
            });
            loadMediaFromCloudinary();
          } catch (err) {
            console.error('Failed to permanently delete asset from Cloudinary:', err);
          }
        }
      },
    });
  }

  // Toggle selection for a single trash item
  function handleToggleSelectTrashItem(id: string) {
    setSelectedTrashIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Toggle Select All / Deselect All for trash items
  function handleToggleSelectAllTrash() {
    const trashed = items.filter((i) => i.isTrashed);
    if (selectedTrashIds.size === trashed.length) {
      setSelectedTrashIds(new Set());
    } else {
      setSelectedTrashIds(new Set(trashed.map((i) => i.id)));
    }
  }

  // Permanently delete all selected trash items
  function handleDeleteSelected() {
    const selectedList = items.filter((i) => selectedTrashIds.has(i.id));
    if (selectedList.length === 0) return;

    const count = selectedList.length;
    setConfirmModal({
      isOpen: true,
      title: count === 1 ? 'Permanently delete memory?' : `Permanently delete ${count} memories?`,
      badge: `destructive action • ${count} ${count === 1 ? 'item' : 'items'}`,
      description:
        count === 1
          ? 'This memory will be permanently removed. Once deleted, it cannot be recovered.'
          : `These ${count} memories will be permanently removed. Once deleted, they cannot be recovered.`,
      confirmLabel: `Delete Forever (${count})`,
      cancelLabel: 'Keep in Trash',
      isDestructive: true,
      thumbnailUrl: count === 1 ? selectedList[0].previewUrl : undefined,
      thumbnailKind: count === 1 ? selectedList[0].kind : undefined,
      onConfirm: async () => {
        setConfirmModal(null);
        selectedList.forEach((item) => {
          if (item.previewUrl && item.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.previewUrl);
          }
        });

        // Optimistically remove from state
        setItems((prev) => prev.filter((i) => !selectedTrashIds.has(i.id)));
        setSelectedTrashIds(new Set());

        try {
          const toDelete = selectedList
            .map((target) => ({
              publicId: target.key || target.id,
              kind: target.kind,
            }))
            .filter((t) => Boolean(t.publicId));

          if (toDelete.length > 0) {
            await fetch('/api/media', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: toDelete }),
            });
          }
          loadMediaFromCloudinary();
        } catch (err) {
          console.error('Failed to permanently delete selected assets:', err);
        }
      },
    });
  }

  // Restore all selected trash items back to reel
  async function handleRestoreSelected() {
    const selectedList = items.filter((i) => selectedTrashIds.has(i.id));
    if (selectedList.length === 0) return;

    // Optimistically restore in state
    setItems((prev) =>
      prev.map((i) => (selectedTrashIds.has(i.id) ? { ...i, isTrashed: false } : i))
    );
    setSelectedTrashIds(new Set());

    try {
      await Promise.all(
        selectedList.map(async (target) => {
          if (!target.key) return;
          return fetch('/api/media/trash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId: target.key, action: 'restore' }),
          });
        })
      );
      loadMediaFromCloudinary();
    } catch (err) {
      console.error('Failed to restore selected items:', err);
    }
  }

  // Empty entire Trash
  function handleEmptyTrash() {
    const trashedCount = items.filter((i) => i.isTrashed).length;
    if (trashedCount === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'Empty all discarded memories?',
      badge: `permanent purge • ${trashedCount} ${trashedCount === 1 ? 'item' : 'items'}`,
      description: `All ${trashedCount} discarded ${
        trashedCount === 1 ? 'memory' : 'memories'
      } will be permanently removed. This cannot be undone.`,
      confirmLabel: `Delete All (${trashedCount})`,
      cancelLabel: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(null);
        setItems((prev) => prev.filter((i) => !i.isTrashed));
        setSelectedTrashIds(new Set());
        setIsSelectingTrash(false);

        try {
          await fetch('/api/media/trash', {
            method: 'DELETE',
          });
          loadMediaFromCloudinary();
        } catch (err) {
          console.error('Failed to empty trash from Cloudinary:', err);
        }
      },
    });
  }

  async function handleRetry(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) {
      const res = await startUpload(item);
      if (res && res.url) {
        try {
          await fetch('/api/discord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [res] }),
          });
        } catch (err) {
          console.error('Failed to notify Discord on retry:', err);
        }
      }
    }
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

  // Dynamic storage reduction calculation for selected trash items
  const selectedTrashBytes = useMemo(() => {
    return trashedItems
      .filter((i) => selectedTrashIds.has(i.id))
      .reduce((acc, curr) => acc + (curr.bytes || curr.file?.size || 0), 0);
  }, [trashedItems, selectedTrashIds]);

  const selectedImageBytes = useMemo(() => {
    return trashedItems
      .filter((i) => selectedTrashIds.has(i.id) && i.kind === 'image')
      .reduce((acc, curr) => acc + (curr.bytes || curr.file?.size || 0), 0);
  }, [trashedItems, selectedTrashIds]);

  const selectedVideoBytes = useMemo(() => {
    return trashedItems
      .filter((i) => selectedTrashIds.has(i.id) && i.kind === 'video')
      .reduce((acc, curr) => acc + (curr.bytes || curr.file?.size || 0), 0);
  }, [trashedItems, selectedTrashIds]);

  // Sorting logic based on field and direction
  const sortedItems = useMemo(() => {
    const source = activeTab === 'reel' ? [...activeItems] : [...trashedItems];

    return source.sort((a, b) => {
      if (sortField === 'date') {
        const timeA = new Date(a.capturedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.capturedAt || b.createdAt || 0).getTime();
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
        const timeA = new Date(a.capturedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.capturedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }

      return 0;
    });
  }, [activeTab, activeItems, trashedItems, sortField, sortOrder]);

  // Group memories into stacked decks of cards
  const memoryGroups = useMemo(() => {
    const source = activeTab === 'reel' ? activeItems : trashedItems;
    return groupMemories(source, sortField, sortOrder, dateGrouping);
  }, [activeTab, activeItems, trashedItems, sortField, sortOrder, dateGrouping]);

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

  // Real-time capacity reductions when trash items are selected
  const hasReduction = activeTab === 'trash' && selectedTrashBytes > 0;
  const effectiveUploadedBytes = hasReduction
    ? Math.max(0, totalUploadedBytes - selectedTrashBytes)
    : totalUploadedBytes;
  const effectiveImageBytes = hasReduction
    ? Math.max(0, totalImageBytes - selectedImageBytes)
    : totalImageBytes;
  const effectiveVideoBytes = hasReduction
    ? Math.max(0, totalVideoBytes - selectedVideoBytes)
    : totalVideoBytes;

  // 25 GB Cloudinary free capacity in bytes
  const MAX_STORAGE_BYTES = 25 * 1024 * 1024 * 1024;
  const imagePercentage = (effectiveImageBytes / MAX_STORAGE_BYTES) * 100;
  const videoPercentage = (effectiveVideoBytes / MAX_STORAGE_BYTES) * 100;
  const usedPercentage = Math.min(100, imagePercentage + videoPercentage);

  // Minimum visibility threshold so tiny uploads remain visible on the bar
  const displayImagePercent =
    effectiveImageBytes > 0 ? Math.max(0.6, imagePercentage) : 0;
  const displayVideoPercent =
    effectiveVideoBytes > 0 ? Math.max(0.6, videoPercentage) : 0;

  const usedPercentageLabel =
    usedPercentage < 0.01 && effectiveUploadedBytes > 0
      ? '< 0.01%'
      : `${usedPercentage.toFixed(2)}%`;
  const remainingBytes = Math.max(0, MAX_STORAGE_BYTES - effectiveUploadedBytes);

  function handleUnlock() {
    setUnlocked(true);
    setIsDevelopingIntro(true);
  }

  async function handleLock() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to log out device:', err);
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('memoir-unlocked');
    }
    setUnlocked(false);
  }

  function handleLockRequest() {
    setConfirmModal({
      isOpen: true,
      title: 'Lock memories?',
      badge: 'security • lock reel',
      description:
        'This will end your active session and require entering your passcode to view our memories again.',
      confirmLabel: 'Lock Reel',
      cancelLabel: 'Keep Unlocked',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmModal(null);
        await handleLock();
      },
    });
  }

  if (isCheckingAuth) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-paper">
        <div className="text-center font-display italic text-2xl text-ink/30 animate-pulse tracking-wide">
          Memoir
        </div>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <AccessGate
        onUnlock={handleUnlock}
        initialBanned={isBanned}
        initialTimeoutSeconds={initialTimeoutSeconds}
      />
    );
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

      <FilmHeader count={activeItems.length} onLock={handleLockRequest} />

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

      {/* Darkroom-styled Confirmation Modal */}
      {confirmModal && (
        <ConfirmDialog
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          badge={confirmModal.badge}
          itemName={confirmModal.itemName}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          isDestructive={confirmModal.isDestructive}
          thumbnailUrl={confirmModal.thumbnailUrl}
          thumbnailKind={confirmModal.thumbnailKind}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Click-to-enlarge Photo Lightbox Modal */}
      <PhotoLightbox
        item={enlargedItem}
        items={sortedItems}
        onClose={() => setEnlargedItem(null)}
        onNavigate={(nextItem) => setEnlargedItem(nextItem)}
      />

      {/* Photo Strip Studio Modal */}
      <PhotoStripStudio
        isOpen={isStripStudioOpen}
        onClose={() => setIsStripStudioOpen(false)}
        availableItems={items}
      />

      {/* Emphasized Photo Booth Strip Studio Keepsake Card */}
      <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-paper-light border border-line rounded-sm shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden group">
        {/* washi-tape accent */}
        <span className="absolute -top-1 left-6 w-12 h-3 bg-tape/80 rotate-[-3deg] shadow-2xs pointer-events-none" />

        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-xs bg-rust/10 border border-rust/30 flex items-center justify-center text-rust shrink-0">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 3v18" />
              <path d="M17 3v18" />
              <path d="M3 7.5h4" />
              <path d="M3 12h4" />
              <path d="M3 16.5h4" />
              <path d="M17 7.5h4" />
              <path d="M17 12h4" />
              <path d="M17 16.5h4" />
            </svg>
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="font-display font-medium text-sm sm:text-base text-ink leading-tight">
                Memoir Photobooth
              </h3>
              {cachedDraft && isDraftMeaningful(cachedDraft) && (
                <span className="inline-flex items-center gap-1 font-stamp text-[10px] text-rust bg-rust/10 border border-rust/30 px-1.5 py-0.5 rounded-2xs animate-fade-in">
                  Draft saved {cachedDraft.slotPhotoIds.filter(Boolean).length > 0 ? `(${cachedDraft.slotPhotoIds.filter(Boolean).length} shots)` : ''}
                </span>
              )}
            </div>
            <p className="font-display italic text-xs text-ink/65 mt-0.5">
              {cachedDraft && isDraftMeaningful(cachedDraft)
                ? 'Resume your previous photobooth keepsake'
                : 'Turn our favorite memories into retro photo strips'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {cachedDraft && isDraftMeaningful(cachedDraft) && (
            <button
              type="button"
              onClick={() => {
                clearPhotoStripDraft();
                setCachedDraft(null);
              }}
              className="px-3 py-2 text-ink/65 hover:text-rust hover:bg-rust/10 border border-line/70 font-display text-xs rounded-xs transition"
              title="Discard saved draft"
            >
              Start Fresh
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsStripStudioOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2 bg-rust hover:bg-rust-dark text-paper-light font-display font-medium text-xs rounded-xs shadow-print hover:shadow-md transition flex items-center justify-center gap-2 shrink-0 group-hover:scale-[1.01]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span>
              {cachedDraft && isDraftMeaningful(cachedDraft)
                ? 'Resume Photobooth'
                : 'Create Photo Strip'}
            </span>
          </button>
        </div>
      </div>

      <section>
        {/* View Switcher & Sorting Controls Bar - Ultra-compact 2-row mobile layout */}
        <div className="mb-3 sm:mb-4.5 p-1 sm:p-1.5 md:p-2 bg-paper border border-line rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-1 sm:gap-1.5 md:gap-2 shadow-2xs">
          {/* Row 1 on mobile / Left on desktop: Tabs & Layout Toggle (Single strictly non-wrapping row) */}
          <div className="flex items-center justify-between gap-1.5 w-full md:w-auto flex-nowrap overflow-x-auto no-scrollbar">
            {/* Tabs: Reel vs Trash */}
            <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-[11px] sm:text-xs shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('reel')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 sm:gap-1.5 ${
                  activeTab === 'reel'
                    ? 'bg-ink text-paper-light font-medium shadow-xs'
                    : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                }`}
              >
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
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
                <span>Reel</span>
                <span className="opacity-70 text-[9px] sm:text-[10px]">({activeItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trash')}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 sm:gap-1.5 ${
                  activeTab === 'trash'
                    ? 'bg-rust text-paper-light font-medium shadow-xs'
                    : 'text-ink/65 hover:text-rust hover:bg-rust/5'
                }`}
              >
                <svg
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0"
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
                <span className="opacity-70 text-[9px] sm:text-[10px]">({trashedItems.length})</span>
              </button>
            </div>

            {/* Layout Toggle: Decks vs Spread, Photo Strip, and Trash Empty button */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
              {activeTab === 'trash' && trashedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="font-stamp text-[10px] sm:text-[11px] text-rust hover:bg-rust/10 border border-rust/40 px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 shrink-0"
                  title="Empty all memories in trash"
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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
                  <span>Empty All</span>
                </button>
              )}

              <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-[11px] sm:text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDeckMode(true)}
                  title="Stack into decks of cards"
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 ${
                    isDeckMode
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 ${
                    !isDeckMode
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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

              {/* Mobile & Desktop Column Density Button (Tap or Pinch) */}
              <button
                type="button"
                onClick={cycleColumns}
                title={`Showing ${columns} photos per row. Tap or pinch on mobile to change.`}
                className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-xs border border-line bg-paper-light hover:border-ink/40 text-ink/80 hover:text-ink font-stamp text-[11px] sm:text-xs transition flex items-center gap-1 shadow-2xs active:scale-95 shrink-0"
              >
                <svg
                  className="w-3 h-3 text-rust"
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
            </div>
          </div>

          {/* Row 2 on mobile / Right on desktop: Sorting & Order (Single strictly non-wrapping row) */}
          <div className="flex items-center justify-between md:justify-end gap-1.5 sm:gap-2 w-full md:w-auto pt-1 sm:pt-1.5 md:pt-0 border-t border-line/40 md:border-t-0 flex-nowrap overflow-x-auto no-scrollbar">
            {/* Field Segmented Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-stamp text-[9px] sm:text-[10px] uppercase text-ink/40 tracking-wider hidden lg:inline mr-0.5">
                Sort:
              </span>
              <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-[11px] sm:text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setSortField('date')}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 ${
                    sortField === 'date'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 ${
                    sortField === 'size'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition flex items-center gap-1 ${
                    sortField === 'type'
                      ? 'bg-ink text-paper-light font-medium shadow-xs'
                      : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <svg
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3"
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

              {/* Daily / Monthly toggle when sorting by Date */}
              {sortField === 'date' && (
                <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-stamp text-[10px] sm:text-[11px] shrink-0 animate-in fade-in duration-200">
                  <button
                    type="button"
                    onClick={() => setDateGrouping('month')}
                    title="Sort and group memories by month"
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition ${
                      dateGrouping === 'month'
                        ? 'bg-ink text-paper-light font-medium shadow-xs'
                        : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateGrouping('day')}
                    title="Sort and group memories per day"
                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs transition ${
                      dateGrouping === 'day'
                        ? 'bg-ink text-paper-light font-medium shadow-xs'
                        : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    Daily
                  </button>
                </div>
              )}
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
              className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs border border-line bg-paper-light hover:border-ink/50 text-ink font-stamp text-[11px] sm:text-xs transition active:scale-[0.98] shrink-0"
            >
              <svg
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 transition-transform duration-200 ${
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
              <span className="text-[10px] sm:text-[11px] text-ink/80 font-medium">
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

        {/* Trash Notice Banner */}
        {activeTab === 'trash' && (
          <div className="mb-5 sm:mb-6 p-3 sm:p-3.5 bg-rust/5 border border-rust/20 rounded-xs font-stamp text-xs text-rust flex items-center gap-2.5">
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
            <span className="leading-relaxed">
              Memories here are tucked away safely. You can bring them back to our reel anytime, or delete them forever.
            </span>
          </div>
        )}

        {/* The Grid / Decks (Media Uploaded with Pinch & Dynamic Columns) */}
        <div ref={containerRef} className="pinch-container">
          <UploadGrid
            items={sortedItems}
            groups={memoryGroups}
            isDeckMode={isDeckMode}
            columns={columns}
            onCycleColumns={cycleColumns}
            onRemove={handlePermanentDelete}
            onRetry={handleRetry}
            onTrash={handleMoveToTrash}
            onRestore={handleRestore}
            isTrashView={activeTab === 'trash'}
            isSelectMode={activeTab === 'trash' && isSelectingTrash}
            selectedIds={selectedTrashIds}
            selectedBytes={selectedTrashBytes}
            onToggleSelect={handleToggleSelectTrashItem}
            onToggleSelectAll={handleToggleSelectAllTrash}
            onToggleSelectMode={() => setIsSelectingTrash((prev) => !prev)}
            onEnlarge={setEnlargedItem}
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
        </div>

        {/* Floating Pinch / Column Toast Indicator */}
        {toastMessage && (
          <div className="fixed top-16 sm:top-20 inset-x-0 z-50 flex justify-center pointer-events-none animate-fade-in px-4">
            <div className="bg-ink/90 text-paper-light border border-line/30 shadow-2xl rounded-full px-4 py-1.5 font-stamp text-xs flex items-center gap-2 backdrop-blur-md">
              <svg className="w-3.5 h-3.5 text-rust" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Mobile-First Floating Action Bar for Trash Multi-Select */}
        {activeTab === 'trash' && isSelectingTrash && selectedTrashIds.size > 0 && (
          <div className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex justify-center px-3 sm:px-4 pointer-events-none animate-slide-up">
            <div className="bg-paper-light/95 backdrop-blur-md border border-line shadow-print rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between gap-2.5 sm:gap-3 pointer-events-auto w-full max-w-md">
              <div className="flex items-center gap-1.5 sm:gap-2 font-stamp text-[11px] sm:text-xs">
                <span className="text-ink/80 font-medium whitespace-nowrap">
                  {selectedTrashIds.size} of {trashedItems.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreSelected}
                  disabled={selectedTrashIds.size === 0}
                  className="font-stamp text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-full border border-line bg-paper hover:bg-ink/5 text-ink transition disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
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
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  <span>Restore</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedTrashIds.size === 0}
                  className="font-stamp text-[11px] sm:text-xs px-3 sm:px-3.5 py-1.5 rounded-full bg-rust hover:bg-rust-dark text-paper-light transition shadow-xs disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 font-medium active:scale-[0.98]"
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>
                    Delete Forever
                    {selectedTrashBytes > 0 ? ` (-${formatBytes(selectedTrashBytes)})` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="flex items-baseline gap-2.5 flex-wrap mt-0.5">
                <h2 className="font-display italic text-xl sm:text-2xl text-ink">
                  {hasReduction ? (
                    <>
                      <span className="line-through text-ink/35 text-base sm:text-lg mr-2 font-normal">
                        {formatBytes(totalUploadedBytes)}
                      </span>
                      <span className="text-rust font-bold">
                        {formatBytes(effectiveUploadedBytes)}
                      </span>
                    </>
                  ) : (
                    <span>{formatBytes(totalUploadedBytes)}</span>
                  )}{' '}
                  of 25 GB used
                </h2>
              </div>
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
                    {hasReduction && selectedImageBytes > 0 ? (
                      <>
                        <span className="line-through text-ink/35 mr-1">{formatBytes(totalImageBytes)}</span>
                        <span className="text-rust font-medium">{formatBytes(effectiveImageBytes)}</span>
                      </>
                    ) : (
                      formatBytes(totalImageBytes)
                    )}{' '}
                    ({imageItems.length - (hasReduction ? trashedItems.filter((i) => selectedTrashIds.has(i.id) && i.kind === 'image').length : 0)})
                  </span>
                </span>

                {/* Videos segment legend */}
                <span className="flex items-center gap-1.5" title="Total space taken by videos">
                  <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                  <span className="text-ink font-medium">Videos:</span>
                  <span className="text-ink/65">
                    {hasReduction && selectedVideoBytes > 0 ? (
                      <>
                        <span className="line-through text-ink/35 mr-1">{formatBytes(totalVideoBytes)}</span>
                        <span className="text-teal font-medium">{formatBytes(effectiveVideoBytes)}</span>
                      </>
                    ) : (
                      formatBytes(totalVideoBytes)
                    )}{' '}
                    ({videoItems.length - (hasReduction ? trashedItems.filter((i) => selectedTrashIds.has(i.id) && i.kind === 'video').length : 0)})
                  </span>
                </span>
              </div>

              <span className="font-medium text-ink/80">
                {hasReduction ? (
                  <>
                    <span className="line-through text-ink/35 mr-1 font-normal">{formatBytes(totalUploadedBytes)}</span>
                    <span className="text-rust font-bold">{formatBytes(effectiveUploadedBytes)}</span>
                  </>
                ) : (
                  formatBytes(totalUploadedBytes)
                )}{' '}
                / 25 GB ({usedPercentageLabel})
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
              {effectiveImageBytes > 0 && (
                <div
                  title={`Photos: ${formatBytes(effectiveImageBytes)}`}
                  className="h-full bg-rust transition-all duration-700 relative shadow-xs rounded-l-[1px]"
                  style={{ width: `${displayImagePercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/15" />
                </div>
              )}

              {/* Videos segment (Teal) */}
              {effectiveVideoBytes > 0 && (
                <div
                  title={`Videos: ${formatBytes(effectiveVideoBytes)}`}
                  className={`h-full bg-teal transition-all duration-700 relative shadow-xs ${
                    effectiveImageBytes === 0 ? 'rounded-l-[1px]' : ''
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
              {hasReduction && (
                <span className="text-rust ml-1.5 font-medium">
                  (+{formatBytes(selectedTrashBytes)} freed)
                </span>
              )}
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

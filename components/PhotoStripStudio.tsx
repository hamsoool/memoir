'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { UploadItem } from '@/lib/types';
import {
  loadPhotoStripDraft,
  savePhotoStripDraft,
  clearPhotoStripDraft,
  updateDraftWasOpen,
  isDraftMeaningful,
} from '@/lib/photoStripStorage';

export type StripLayoutId =
  | 'single-1'
  | 'duo-2'
  | 'classic-3'
  | 'classic-4'
  | 'grid-4'
  | 'sheet-6'
  | 'tall-8'
  | 'wide-8';
export type StripThemeId = 'lovely' | 'girlish' | 'vintage' | 'film' | 'retro' | 'noir';
export type StripFilterId = 'original' | 'warm' | 'bw' | 'soft';
export type StripStampId = 'heart' | 'sparkle' | 'film' | 'blossom' | 'none';
export type StudioStep = 'style' | 'photos' | 'note';

interface LayoutDef {
  id: StripLayoutId;
  name: string;
  shortLabel: string;
  slots: number;
  cols: number;
  rows: number;
  aspectDesc: string;
  baseWidth: number;
  baseHeight: number;
}

const LAYOUTS: LayoutDef[] = [
  {
    id: 'single-1',
    name: 'Solo Portrait',
    shortLabel: '1 Photo',
    slots: 1,
    cols: 1,
    rows: 1,
    aspectDesc: 'Single memory card',
    baseWidth: 500,
    baseHeight: 640,
  },
  {
    id: 'duo-2',
    name: 'Duo Strip',
    shortLabel: '2 Cuts',
    slots: 2,
    cols: 1,
    rows: 2,
    aspectDesc: 'Two-photo vertical strip',
    baseWidth: 420,
    baseHeight: 820,
  },
  {
    id: 'classic-3',
    name: 'Vintage 3-Cut',
    shortLabel: '3 Cuts',
    slots: 3,
    cols: 1,
    rows: 3,
    aspectDesc: 'Retro 3-photo strip',
    baseWidth: 420,
    baseHeight: 1080,
  },
  {
    id: 'classic-4',
    name: 'Classic 4-Cut',
    shortLabel: '4 Cuts',
    slots: 4,
    cols: 1,
    rows: 4,
    aspectDesc: 'Vertical strip (Life 4 Cuts)',
    baseWidth: 420,
    baseHeight: 1380,
  },
  {
    id: 'grid-4',
    name: 'Pocket Grid',
    shortLabel: '2 × 2 Grid',
    slots: 4,
    cols: 2,
    rows: 2,
    aspectDesc: 'Square pocket card',
    baseWidth: 640,
    baseHeight: 740,
  },
  {
    id: 'sheet-6',
    name: 'Double Strip',
    shortLabel: '6 Photos',
    slots: 6,
    cols: 2,
    rows: 3,
    aspectDesc: 'Double booth sheet',
    baseWidth: 640,
    baseHeight: 1040,
  },
  {
    id: 'tall-8',
    name: 'Tall Sheet',
    shortLabel: '8 Photos',
    slots: 8,
    cols: 2,
    rows: 4,
    aspectDesc: '2 cols × 4 rows (top to bottom)',
    baseWidth: 640,
    baseHeight: 1340,
  },
  {
    id: 'wide-8',
    name: 'Wide Sheet',
    shortLabel: '8 Photos',
    slots: 8,
    cols: 4,
    rows: 2,
    aspectDesc: '4 cols × 2 rows (landscape sheet)',
    baseWidth: 1320,
    baseHeight: 580,
  },
];

interface ThemeDef {
  id: StripThemeId;
  name: string;
  badge: string;
  bgHex: string;
  cardHex: string;
  borderHex: string;
  textHex: string;
  accentHex: string;
  previewClass: string;
  description: string;
}

const THEMES: ThemeDef[] = [
  {
    id: 'lovely',
    name: 'Lovely Rose',
    badge: 'Blush Pink',
    bgHex: '#FCEEF2',
    cardHex: '#FFF7F9',
    borderHex: '#F0B7C4',
    textHex: '#52232B',
    accentHex: '#D65D7A',
    previewClass: 'bg-[#FCEEF2] border-[#F0B7C4] text-[#52232B]',
    description: 'Soft blush pink with sweet romantic hearts',
  },
  {
    id: 'girlish',
    name: 'Girlish Pastel',
    badge: 'Pastel Lilac',
    bgHex: '#F3EEFB',
    cardHex: '#FAF7FE',
    borderHex: '#C5B4E3',
    textHex: '#3E2A5C',
    accentHex: '#8E67BD',
    previewClass: 'bg-[#F3EEFB] border-[#C5B4E3] text-[#3E2A5C]',
    description: 'Dreamy lavender lilac with cute little sparkles',
  },
  {
    id: 'vintage',
    name: 'Vintage Paper',
    badge: 'Warm Paper',
    bgHex: '#F2E8D3',
    cardHex: '#FBF6EA',
    borderHex: '#C9BA95',
    textHex: '#2C231B',
    accentHex: '#A8432B',
    previewClass: 'bg-[#F2E8D3] border-[#C9BA95] text-[#2C231B]',
    description: 'Nostalgic warm print paper & washi tape accent',
  },
  {
    id: 'film',
    name: '35mm Darkroom',
    badge: 'Film Negative',
    bgHex: '#141210',
    cardHex: '#1F1B18',
    borderHex: '#38322D',
    textHex: '#E5B560',
    accentHex: '#C99A3A',
    previewClass: 'bg-[#141210] border-[#38322D] text-[#E5B560]',
    description: 'Moody 35mm film negative strip with frame numbers',
  },
  {
    id: 'retro',
    name: 'Retro Honey',
    badge: '70s Honey',
    bgHex: '#F7E9CE',
    cardHex: '#FFF8ED',
    borderHex: '#DEB878',
    textHex: '#3D2516',
    accentHex: '#B85335',
    previewClass: 'bg-[#F7E9CE] border-[#DEB878] text-[#3D2516]',
    description: 'Sunny 70s golden honey warmth & terracotta lines',
  },
  {
    id: 'noir',
    name: 'Minimalist Noir',
    badge: 'B&W Editorial',
    bgHex: '#18181B',
    cardHex: '#27272A',
    borderHex: '#52525B',
    textHex: '#FAFAFA',
    accentHex: '#A1A1AA',
    previewClass: 'bg-[#18181B] border-[#52525B] text-[#FAFAFA]',
    description: 'Simple, timeless black & white editorial layout',
  },
];

interface PhotoStripStudioProps {
  isOpen: boolean;
  onClose: () => void;
  availableItems: UploadItem[];
  preselectedIds?: string[];
}

const EMPTY_PRESELECTED_IDS: string[] = [];

function getTodayFormattedDate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export default function PhotoStripStudio({
  isOpen,
  onClose,
  availableItems,
  preselectedIds = EMPTY_PRESELECTED_IDS,
}: PhotoStripStudioProps) {
  // Filter for valid developed photos
  const photoItems = useMemo(() => {
    return availableItems.filter(
      (item) =>
        item.kind === 'image' &&
        !item.isTrashed &&
        (item.status === 'done' || item.url || item.previewUrl)
    );
  }, [availableItems]);

  // Strip layout & theme configuration state (real-time live preview)
  const [layoutId, setLayoutId] = useState<StripLayoutId>('classic-4');
  const [themeId, setThemeId] = useState<StripThemeId>('lovely');
  const [filterId, setFilterId] = useState<StripFilterId>('original');
  const [stampId, setStampId] = useState<StripStampId>('heart');

  // Sequential config steps: 'style' -> 'photos' -> 'note' (Live preview builds in real time!)
  const [studioStep, setStudioStep] = useState<StudioStep>('style');
  const [isMobilePreviewExpanded, setIsMobilePreviewExpanded] = useState(false);
  const [isMobilePreviewVisible, setIsMobilePreviewVisible] = useState(false);

  // Staged progressive adaptive reveal states per studio step:
  // Step 1: Size & Layout first -> short animation reveals Theme & Next button
  // Step 2: Photo Slots first -> short animation reveals Tone filter & Next button
  // Step 3: Note caption first -> short animation reveals Stamp motif & export buttons
  const [isThemeRevealed, setIsThemeRevealed] = useState(false);
  const [isPhotosSubRevealed, setIsPhotosSubRevealed] = useState(false);
  const [isNoteSubRevealed, setIsNoteSubRevealed] = useState(false);

  // Refs for smooth navigation & auto-fit preview scaling
  const themeSectionRef = useRef<HTMLDivElement>(null);
  const nextStyleBtnRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const stripCardRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  const activeLayout = useMemo(
    () => LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0],
    [layoutId]
  );
  const activeTheme = useMemo(
    () => THEMES.find((t) => t.id === themeId) || THEMES[0],
    [themeId]
  );

  // Automatically calculate scale to fit 100% of the photobooth strip inside the stage with zero scroll
  const updatePreviewScale = useCallback(() => {
    if (!previewStageRef.current || !stripCardRef.current) return;
    const stageH = previewStageRef.current.clientHeight;
    const stageW = previewStageRef.current.clientWidth;
    const cardH = stripCardRef.current.offsetHeight;
    const cardW = stripCardRef.current.offsetWidth;

    if (cardH > 0 && stageH > 0 && cardW > 0 && stageW > 0) {
      const scaleY = (stageH - 16) / cardH;
      const scaleX = (stageW - 16) / cardW;
      const fit = Math.min(1, scaleY, scaleX);
      setStageScale(Math.max(0.25, Number(fit.toFixed(3))));
    }
  }, []);

  // Selected photo IDs per slot (array of string or null)
  const [slotPhotoIds, setSlotPhotoIds] = useState<(string | null)[]>([]);
  // Zoom scale per slot (default 1.0 = 100%, clamped between 0.75x and 2.5x)
  const [slotZooms, setSlotZooms] = useState<number[]>([]);
  // Vertical position offset per slot (0 = top, 50 = center midpoint, 100 = bottom)
  const [slotPositionsY, setSlotPositionsY] = useState<number[]>([]);
  const slotPinchStart = useRef<{ slotIdx: number; dist: number; initialZoom: number } | null>(null);

  // Picker drawer state: which slot index is currently choosing a photo
  const [activeSlotPickerIndex, setActiveSlotPickerIndex] = useState<number | null>(null);
  const [selectingPhotoId, setSelectingPhotoId] = useState<string | null>(null);
  const [drawerInitialSlotIds, setDrawerInitialSlotIds] = useState<(string | null)[]>([]);

  // Drag & drop relocation state
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [touchDraggingSlotIndex, setTouchDraggingSlotIndex] = useState<number | null>(null);
  const [touchCurrentPos, setTouchCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [activeRemoveSlotIdx, setActiveRemoveSlotIdx] = useState<number | null>(null);

  // Custom text configuration
  const [headerText, setHeaderText] = useState('MEMOIR PHOTOBOOTH');
  const [showHeader, setShowHeader] = useState(false);
  const [primaryFooter, setPrimaryFooter] = useState('together since 01/07/26');
  const [secondaryFooter, setSecondaryFooter] = useState('captured with love');
  const [showDate, setShowDate] = useState(true);
  const [customDate, setCustomDate] = useState<string>(() => getTodayFormattedDate());

  // Export / downloading & Discord status
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordSuccess, setDiscordSuccess] = useState(false);

  const filledSlotsCount = useMemo(
    () => slotPhotoIds.filter(Boolean).length,
    [slotPhotoIds]
  );

  // Draft caching & auto-restore tracking
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const isInitialOpenRef = useRef(true);
  const activeSlotPickerIndexRef = useRef<number | null>(null);
  activeSlotPickerIndexRef.current = activeSlotPickerIndex;
  const handleCancelPickerRef = useRef<() => void>(() => {});

  // Reset all fields to clean defaults and clear cached draft
  const resetToCleanDefaults = useCallback(() => {
    clearPhotoStripDraft();
    setLayoutId('classic-4');
    setThemeId('lovely');
    setFilterId('original');
    setStampId('heart');
    setStudioStep('style');
    setIsMobilePreviewExpanded(false);
    setIsMobilePreviewVisible(false);
    setHeaderText('MEMOIR PHOTOBOOTH');
    setShowHeader(false);
    setPrimaryFooter('together since 01/07/26');
    setSecondaryFooter('captured with love');
    setShowDate(true);
    setCustomDate(getTodayFormattedDate());
    const defaultSlots = new Array(4).fill(null);
    for (let i = 0; i < 4; i++) {
      if (preselectedIds[i]) defaultSlots[i] = preselectedIds[i];
    }
    setSlotPhotoIds(defaultSlots);
    setSlotZooms(new Array(4).fill(1));
    setSlotPositionsY(new Array(4).fill(50));
    setHasRestoredDraft(false);
    setIsThemeRevealed(false);
    setIsPhotosSubRevealed(false);
    setIsNoteSubRevealed(false);
  }, [preselectedIds]);

  // Gracefully close studio and mark wasOpen as false
  const handleCloseStudio = useCallback(() => {
    updateDraftWasOpen(false);
    onClose();
  }, [onClose]);

  // When opened, restore draft if one exists, otherwise initialize clean defaults
  useEffect(() => {
    if (!isOpen) {
      isInitialOpenRef.current = true;
      return;
    }

    if (isInitialOpenRef.current) {
      isInitialOpenRef.current = false;
      const draft = loadPhotoStripDraft();

      if (draft && isDraftMeaningful(draft)) {
        setLayoutId(draft.layoutId || 'classic-4');
        setThemeId(draft.themeId || 'lovely');
        setFilterId(draft.filterId || 'original');
        setStampId(draft.stampId || 'heart');
        setStudioStep(draft.studioStep || 'style');
        setHeaderText(draft.headerText || 'MEMOIR PHOTOBOOTH');
        setShowHeader(draft.showHeader ?? false);
        setPrimaryFooter(draft.primaryFooter ?? 'together since 01/07/26');
        setSecondaryFooter(draft.secondaryFooter ?? 'captured with love');
        setShowDate(draft.showDate ?? true);
        setCustomDate(draft.customDate || getTodayFormattedDate());

        const layoutDef = LAYOUTS.find((l) => l.id === draft.layoutId) || LAYOUTS[3];
        const targetSize = layoutDef.slots;
        const restoredSlots = new Array(targetSize).fill(null);
        for (let i = 0; i < targetSize; i++) {
          if (draft.slotPhotoIds[i]) {
            restoredSlots[i] = draft.slotPhotoIds[i];
          } else if (preselectedIds[i]) {
            restoredSlots[i] = preselectedIds[i];
          }
        }
        setSlotPhotoIds(restoredSlots);

        const restoredZooms = new Array(targetSize).fill(1);
        for (let i = 0; i < targetSize; i++) {
          if (typeof draft.slotZooms?.[i] === 'number') {
            restoredZooms[i] = draft.slotZooms[i];
          }
        }
        setSlotZooms(restoredZooms);

        const restoredPositionsY = new Array(targetSize).fill(50);
        for (let i = 0; i < targetSize; i++) {
          if (typeof draft.slotPositionsY?.[i] === 'number') {
            restoredPositionsY[i] = draft.slotPositionsY[i];
          }
        }
        setSlotPositionsY(restoredPositionsY);
        setHasRestoredDraft(true);

        // Adaptive reveals based on restored configuration
        if (draft.studioStep !== 'style' || draft.themeId) {
          setIsThemeRevealed(true);
        }
        if (draft.studioStep === 'photos' || draft.filterId !== 'original') {
          setIsPhotosSubRevealed(true);
        }
        if (draft.studioStep === 'note' || draft.stampId !== 'heart') {
          setIsNoteSubRevealed(true);
        }
      } else {
        resetToCleanDefaults();
      }
    }
  }, [isOpen, preselectedIds, resetToCleanDefaults]);

  // Continuous auto-save draft to localStorage whenever editing
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      savePhotoStripDraft({
        layoutId,
        themeId,
        filterId,
        stampId,
        studioStep,
        slotPhotoIds,
        slotZooms,
        slotPositionsY,
        headerText,
        showHeader,
        primaryFooter,
        secondaryFooter,
        showDate,
        customDate,
        wasOpen: true,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    layoutId,
    themeId,
    filterId,
    stampId,
    studioStep,
    slotPhotoIds,
    slotZooms,
    slotPositionsY,
    headerText,
    showHeader,
    primaryFooter,
    secondaryFooter,
    showDate,
    customDate,
  ]);

  // Flush latest draft to localStorage when PWA is backgrounded, minimized, or page unloads
  useEffect(() => {
    if (!isOpen) return;

    const flushDraft = () => {
      savePhotoStripDraft({
        layoutId,
        themeId,
        filterId,
        stampId,
        studioStep,
        slotPhotoIds,
        slotZooms,
        slotPositionsY,
        headerText,
        showHeader,
        primaryFooter,
        secondaryFooter,
        showDate,
        customDate,
        wasOpen: true,
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushDraft();
      }
    };

    window.addEventListener('beforeunload', flushDraft);
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', flushDraft);
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    isOpen,
    layoutId,
    themeId,
    filterId,
    stampId,
    studioStep,
    slotPhotoIds,
    slotZooms,
    slotPositionsY,
    headerText,
    showHeader,
    primaryFooter,
    secondaryFooter,
    showDate,
    customDate,
  ]);

  // Intercept PWA back gesture and hardware back button via History API
  useEffect(() => {
    if (!isOpen) return;

    const stateToken = 'strip-studio-' + Date.now();
    window.history.pushState({ modal: 'photo-strip-studio', token: stateToken }, '');

    const handlePopState = () => {
      // If photo picker drawer was open inside the studio, close only the drawer
      if (activeSlotPickerIndexRef.current !== null) {
        handleCancelPickerRef.current();
        window.history.pushState({ modal: 'photo-strip-studio', token: stateToken }, '');
      } else {
        updateDraftWasOpen(false);
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modal === 'photo-strip-studio' && window.history.state?.token === stateToken) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // Staged adaptive reveals: secondary sections only appear if anything in that step has been tapped
  useEffect(() => {
    if (!isOpen) {
      setIsThemeRevealed(false);
      setIsPhotosSubRevealed(false);
      setIsNoteSubRevealed(false);
      return;
    }

    if (studioStep === 'style') {
      setIsThemeRevealed(false);
    } else if (studioStep === 'photos') {
      setIsPhotosSubRevealed(false);
    } else if (studioStep === 'note') {
      setIsNoteSubRevealed(false);
    }
  }, [isOpen, studioStep]);

  // Dynamically observe preview stage and strip card to guarantee 100% fit with zero scroll
  useEffect(() => {
    if (!isOpen) return;

    const stageEl = previewStageRef.current;
    const cardEl = stripCardRef.current;
    if (!stageEl || !cardEl) return;

    const ro = new ResizeObserver(() => {
      updatePreviewScale();
    });

    ro.observe(stageEl);
    ro.observe(cardEl);

    updatePreviewScale();

    return () => ro.disconnect();
  }, [
    isOpen,
    updatePreviewScale,
    layoutId,
    themeId,
    slotPhotoIds,
    primaryFooter,
    secondaryFooter,
    showDate,
    showHeader,
  ]);

  // Handle selecting a strip size: resize slots directly and smooth gentle scroll to theme section
  const handleSelectLayout = (id: StripLayoutId) => {
    setLayoutId(id);
    setIsThemeRevealed(true);
    const chosenLayout = LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
    setSlotPhotoIds((prev) => {
      const targetSize = chosenLayout.slots;
      const next = new Array(targetSize).fill(null);

      // Carry over existing selections
      for (let i = 0; i < targetSize; i++) {
        if (prev[i]) {
          next[i] = prev[i];
        } else if (preselectedIds[i]) {
          next[i] = preselectedIds[i];
        }
      }

      return next;
    });

    setSlotZooms((prev) => {
      const targetSize = chosenLayout.slots;
      const next = new Array(targetSize).fill(1);
      for (let i = 0; i < targetSize; i++) {
        if (prev[i]) next[i] = prev[i];
      }
      return next;
    });

    setSlotPositionsY((prev) => {
      const targetSize = chosenLayout.slots;
      const next = new Array(targetSize).fill(50);
      for (let i = 0; i < targetSize; i++) {
        if (typeof prev[i] === 'number') next[i] = prev[i];
      }
      return next;
    });

    requestAnimationFrame(() => {
      updatePreviewScale();
    });

    setTimeout(() => {
      themeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  // Handle selecting a color theme: smooth gentle scroll to next button
  const handleSelectTheme = (id: StripThemeId) => {
    setThemeId(id);
    setTimeout(() => {
      nextStyleBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  // Lock body scroll when studio modal is active
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen]);

  // Open the photo picker drawer with snapshot for Cancel support
  const handleOpenPhotoPicker = (slotIdx: number) => {
    setIsPhotosSubRevealed(true);
    setDrawerInitialSlotIds([...slotPhotoIds]);
    setActiveSlotPickerIndex(slotIdx);
  };

  // Cancel photo picker: restore slots to pre-drawer snapshot
  const handleCancelPicker = useCallback(() => {
    if (drawerInitialSlotIds.length > 0) {
      setSlotPhotoIds([...drawerInitialSlotIds]);
    }
    setActiveSlotPickerIndex(null);
    setSelectingPhotoId(null);
  }, [drawerInitialSlotIds]);
  handleCancelPickerRef.current = handleCancelPicker;

  // Done photo picker: confirm current selection
  const handleDonePicker = () => {
    setActiveSlotPickerIndex(null);
    setSelectingPhotoId(null);
  };

  // Deselect / clear photo from a specific slot
  const handleDeselectPhotoFromSlot = (slotIdx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSlotPhotoIds((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setActiveSlotPickerIndex(slotIdx);
  };

  // Keyboard escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSlotPickerIndex !== null) {
          handleCancelPicker();
        } else {
          handleCloseStudio();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, activeSlotPickerIndex, handleCloseStudio, handleCancelPicker]);

  // Map slot IDs to photo objects
  const slotItems = useMemo(() => {
    return slotPhotoIds.map((id) => (id ? photoItems.find((p) => p.id === id) || null : null));
  }, [slotPhotoIds, photoItems]);

  // Handler: Assign or re-assign photo to slot without closing automatically
  const handleSelectPhotoForSlot = (photoId: string) => {
    if (activeSlotPickerIndex === null || selectingPhotoId) return;

    // If currently focused slot already has this photo, deselect it (toggle off)
    if (slotPhotoIds[activeSlotPickerIndex] === photoId) {
      setSlotPhotoIds((prev) => {
        const next = [...prev];
        next[activeSlotPickerIndex] = null;
        return next;
      });
      return;
    }

    // Show immediate confirmation feedback on the tapped photo in the drawer
    setSelectingPhotoId(photoId);

    setTimeout(() => {
      const targetSlot = activeSlotPickerIndex;

      setSlotPhotoIds((prev) => {
        const next = [...prev];
        next[targetSlot] = photoId;
        return next;
      });

      // Find next empty slot after targetSlot, or any earlier empty slot
      const nextEmpty = slotPhotoIds.findIndex(
        (id, idx) => idx > targetSlot && id === null
      );
      if (nextEmpty !== -1) {
        setActiveSlotPickerIndex(nextEmpty);
      } else {
        const anyEmpty = slotPhotoIds.findIndex(
          (id, idx) => idx !== targetSlot && id === null
        );
        if (anyEmpty !== -1) {
          setActiveSlotPickerIndex(anyEmpty);
        } else {
          // All slots filled: KEEP THE DRAWER OPEN! Keep focus on targetSlot
          setActiveSlotPickerIndex(targetSlot);
        }
      }
      setSelectingPhotoId(null);
    }, 200);
  };

  // Handler: Remove photo from slot
  const handleRemovePhotoFromSlot = (slotIdx: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveRemoveSlotIdx(null);
    setSlotPhotoIds((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setSlotZooms((prev) => {
      const next = [...prev];
      next[slotIdx] = 1;
      return next;
    });
    setSlotPositionsY((prev) => {
      const next = [...prev];
      next[slotIdx] = 50;
      return next;
    });
  };

  // Zoom in or out on a photo within its slot (clamped 0.75x to 2.5x)
  const handleZoomSlot = (slotIdx: number, delta: number) => {
    setSlotZooms((prev) => {
      const next = [...prev];
      const current = next[slotIdx] || 1;
      const updated = Math.min(2.5, Math.max(0.75, Number((current + delta).toFixed(2))));
      next[slotIdx] = updated;
      return next;
    });
  };

  // Auto-fill slots with random photos from uploaded memories
  const handleAutoFill = () => {
    setIsPhotosSubRevealed(true);
    if (photoItems.length === 0) return;

    // Pick random photos from available uploaded memories using Fisher-Yates
    const pool = [...photoItems];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const nextIds: (string | null)[] = new Array(activeLayout.slots).fill(null);
    for (let i = 0; i < activeLayout.slots && i < pool.length; i++) {
      nextIds[i] = pool[i].id;
    }

    setSlotPhotoIds(nextIds);
    setSlotZooms(new Array(activeLayout.slots).fill(1));
    setSlotPositionsY(new Array(activeLayout.slots).fill(50));
    setActiveRemoveSlotIdx(null);
  };

  // Shuffle the order of photos currently in the photo strip slots
  const handleShuffle = () => {
    setIsPhotosSubRevealed(true);
    setActiveRemoveSlotIdx(null);

    // Find indices of slots that currently contain a photo
    const filledIndices: number[] = [];
    slotPhotoIds.forEach((id, idx) => {
      if (id !== null) {
        filledIndices.push(idx);
      }
    });

    if (filledIndices.length <= 1) {
      // If the strip is empty, auto-fill with random memories so it's not a no-op
      if (filledIndices.length === 0 && photoItems.length > 0) {
        handleAutoFill();
      }
      return;
    }

    // Extract current photo data (id, zoom, posY) for filled slots
    const itemsToShuffle = filledIndices.map((idx) => ({
      id: slotPhotoIds[idx],
      zoom: slotZooms[idx] ?? 1,
      posY: slotPositionsY[idx] ?? 50,
    }));

    // Fisher-Yates shuffle with a guarantee to change order if multiple items
    const shuffled = [...itemsToShuffle];
    let attempts = 0;
    do {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    } while (
      attempts < 5 &&
      shuffled.length > 1 &&
      shuffled.every((item, i) => item.id === itemsToShuffle[i].id)
    );

    // Apply shuffled items back to the filled slots, preserving individual zoom & vertical positions
    const nextPhotoIds = [...slotPhotoIds];
    const nextZooms = [...slotZooms];
    const nextPositionsY = [...slotPositionsY];

    filledIndices.forEach((slotIdx, i) => {
      nextPhotoIds[slotIdx] = shuffled[i].id;
      nextZooms[slotIdx] = shuffled[i].zoom;
      nextPositionsY[slotIdx] = shuffled[i].posY;
    });

    setSlotPhotoIds(nextPhotoIds);
    setSlotZooms(nextZooms);
    setSlotPositionsY(nextPositionsY);
  };

  // Clear all slots
  const handleClearAll = () => {
    setIsPhotosSubRevealed(true);
    setSlotPhotoIds(new Array(activeLayout.slots).fill(null));
    setSlotZooms(new Array(activeLayout.slots).fill(1));
    setSlotPositionsY(new Array(activeLayout.slots).fill(50));
    setActiveRemoveSlotIdx(null);
  };

  // Relocate or swap photos between two slot indices (preserves individual zoom settings)
  const handleSwapSlots = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setSlotPhotoIds((prev) => {
      const next = [...prev];
      const sourcePhoto = next[fromIdx];
      const targetPhoto = next[toIdx];
      next[fromIdx] = targetPhoto;
      next[toIdx] = sourcePhoto;
      return next;
    });
    setSlotZooms((prev) => {
      const next = [...prev];
      const z1 = next[fromIdx] || 1;
      const z2 = next[toIdx] || 1;
      next[fromIdx] = z2;
      next[toIdx] = z1;
      return next;
    });
    setSlotPositionsY((prev) => {
      const next = [...prev];
      const p1 = typeof next[fromIdx] === 'number' ? next[fromIdx] : 50;
      const p2 = typeof next[toIdx] === 'number' ? next[toIdx] : 50;
      next[fromIdx] = p2;
      next[toIdx] = p1;
      return next;
    });
    setActiveRemoveSlotIdx(null);
  };

  // Slot click handler: Tapping a filled photo reveals center X button to remove it
  const handleSlotClick = (slotIdx: number) => {
    setIsPhotosSubRevealed(true);
    if (touchDraggingSlotIndex !== null || draggedSlotIndex !== null) return;
    const hasPhoto = Boolean(slotPhotoIds[slotIdx]);

    if (hasPhoto) {
      setActiveRemoveSlotIdx((prev) => (prev === slotIdx ? null : slotIdx));
    } else {
      setActiveRemoveSlotIdx(null);
      handleOpenPhotoPicker(slotIdx);
    }
  };

  // HTML5 Drag and drop handlers for desktop
  const handleDragStart = (slotIdx: number, e: React.DragEvent) => {
    if (!slotPhotoIds[slotIdx]) return;
    setDraggedSlotIndex(slotIdx);
    e.dataTransfer.setData('text/plain', String(slotIdx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (slotIdx: number, e: React.DragEvent) => {
    if (draggedSlotIndex !== null && draggedSlotIndex !== slotIdx) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverSlotIndex !== slotIdx) {
        setDragOverSlotIndex(slotIdx);
      }
    }
  };

  const handleDragLeave = (slotIdx: number) => {
    if (dragOverSlotIndex === slotIdx) {
      setDragOverSlotIndex(null);
    }
  };

  const handleDrop = (slotIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    const sourceIdx =
      draggedSlotIndex !== null ? draggedSlotIndex : Number(e.dataTransfer.getData('text/plain'));
    if (!isNaN(sourceIdx) && sourceIdx !== slotIdx) {
      handleSwapSlots(sourceIdx, slotIdx);
    }
    setDraggedSlotIndex(null);
    setDragOverSlotIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSlotIndex(null);
    setDragOverSlotIndex(null);
  };

  // Touch drag-and-drop support for mobile / touch devices (1-finger drag) + 2-finger pinch zoom
  const handleTouchStart = (slotIdx: number, e: React.TouchEvent) => {
    if (!slotPhotoIds[slotIdx]) return;

    if (e.touches.length === 2) {
      // 2-finger pinch on slot: zoom photo
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      slotPinchStart.current = {
        slotIdx,
        dist,
        initialZoom: slotZooms[slotIdx] || 1,
      };
      touchStartPos.current = null;
      setTouchDraggingSlotIndex(null);
      setDragOverSlotIndex(null);
      return;
    }

    if (e.touches.length === 1) {
      // 1-finger touch: prepare to move/swap photo
      slotPinchStart.current = null;
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (slotIdx: number, e: React.TouchEvent) => {
    // Handle 2-finger pinch zoom on this slot
    if (e.touches.length === 2 && slotPinchStart.current?.slotIdx === slotIdx) {
      if (e.cancelable) e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / slotPinchStart.current.dist;
      const targetZoom = Math.min(2.5, Math.max(0.75, Number((slotPinchStart.current.initialZoom * ratio).toFixed(2))));
      setSlotZooms((prev) => {
        const next = [...prev];
        next[slotIdx] = targetZoom;
        return next;
      });
      return;
    }

    // Handle 1-finger drag to relocate/move slot
    if (e.touches.length === 1 && touchStartPos.current && slotPhotoIds[slotIdx]) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);

      if (dx > 6 || dy > 6) {
        if (e.cancelable) {
          e.preventDefault();
        }
        if (touchDraggingSlotIndex === null) {
          setTouchDraggingSlotIndex(slotIdx);
          setActiveRemoveSlotIdx(null);
        }
        setTouchCurrentPos({ x: touch.clientX, y: touch.clientY });

        // Hit-test element at touch position (offset slightly upward toward finger focal point)
        const targetEl =
          document.elementFromPoint(touch.clientX, touch.clientY - 12) ||
          document.elementFromPoint(touch.clientX, touch.clientY);
        const slotEl = targetEl?.closest('[data-slot-index]');
        if (slotEl) {
          const targetIdx = Number(slotEl.getAttribute('data-slot-index'));
          if (!isNaN(targetIdx) && targetIdx !== slotIdx) {
            setDragOverSlotIndex(targetIdx);
          } else {
            setDragOverSlotIndex(null);
          }
        } else {
          setDragOverSlotIndex(null);
        }
      }
    }
  };

  const handleTouchEnd = (slotIdx: number) => {
    slotPinchStart.current = null;
    if (touchDraggingSlotIndex !== null && dragOverSlotIndex !== null && dragOverSlotIndex !== slotIdx) {
      handleSwapSlots(slotIdx, dragOverSlotIndex);
    }
    touchStartPos.current = null;
    setTouchDraggingSlotIndex(null);
    setDragOverSlotIndex(null);
    setTouchCurrentPos(null);
  };

  const handleTouchCancel = () => {
    slotPinchStart.current = null;
    touchStartPos.current = null;
    setTouchDraggingSlotIndex(null);
    setDragOverSlotIndex(null);
    setTouchCurrentPos(null);
  };

  // Get CSS filter rule string based on filterId
  const getFilterStyle = useCallback((filter: StripFilterId): string => {
    switch (filter) {
      case 'warm':
        return 'sepia(0.28) contrast(1.06) brightness(1.03) saturate(1.15)';
      case 'bw':
        return 'grayscale(1) contrast(1.22) brightness(0.98)';
      case 'soft':
        return 'contrast(0.92) brightness(1.08) saturate(0.85)';
      case 'original':
      default:
        return 'none';
    }
  }, []);

  // Canvas Image Loader helper with crossOrigin
  const loadHtmlImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback retry without crossOrigin if external host rejects anonymous
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = (err) => reject(err);
        fallback.src = src;
      };
      img.src = src;
    });
  };

  // Safe cross-browser rounded rect helper for Canvas
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  };

  // High-Resolution Canvas Export Engine with adaptive scaling
  const generateStripCanvas = async (customScale?: number): Promise<HTMLCanvasElement> => {
    // Adaptive scale: for wide-8 (1320px base width) or 8-photo layouts, 2.0x provides
    // crisp 2640px Retina resolution while keeping memory and file size safely within server limits.
    // For smaller 1-4 cut strips, 2.5x gives ultra-crisp print quality.
    const defaultScale = activeLayout.slots >= 8 || activeLayout.baseWidth >= 1000 ? 2.0 : 2.5;
    const scale = customScale || defaultScale;
    const canvas = document.createElement('canvas');
    const width = Math.round(activeLayout.baseWidth * scale);
    const height = Math.round(activeLayout.baseHeight * scale);
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    // 1. Draw Strip Background
    ctx.fillStyle = activeTheme.bgHex;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper/film texture or inner frame
    if (activeTheme.id === 'film') {
      ctx.fillStyle = '#0D0C0A';
      ctx.fillRect(0, 0, width, height);

      const holeW = 16 * scale;
      const holeH = 24 * scale;
      const holeRadius = 4 * scale;
      const holeSpacing = 38 * scale;
      const marginOffset = 10 * scale;

      ctx.fillStyle = '#1A1815';
      for (let y = 20 * scale; y < height - 20 * scale; y += holeSpacing) {
        ctx.beginPath();
        drawRoundedRect(ctx, marginOffset, y, holeW, holeH, holeRadius);
        ctx.fill();

        ctx.beginPath();
        drawRoundedRect(ctx, width - marginOffset - holeW, y, holeW, holeH, holeRadius);
        ctx.fill();
      }

      ctx.fillStyle = '#C99A3A';
      ctx.font = `600 ${10 * scale}px Courier New, monospace`;
      ctx.save();
      ctx.translate(marginOffset + holeW + 8 * scale, 60 * scale);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('MEMOIR 400 FILM • SAFETY FILM', 0, 0);
      ctx.restore();
    } else if (activeTheme.id === 'lovely') {
      ctx.strokeStyle = activeTheme.borderHex;
      ctx.lineWidth = 1.5 * scale;
      ctx.strokeRect(12 * scale, 12 * scale, width - 24 * scale, height - 24 * scale);
    } else if (activeTheme.id === 'vintage') {
      ctx.save();
      ctx.fillStyle = 'rgba(231, 217, 174, 0.85)';
      ctx.translate(28 * scale, 10 * scale);
      ctx.rotate((-4 * Math.PI) / 180);
      ctx.fillRect(0, 0, 90 * scale, 24 * scale);
      ctx.restore();

      ctx.strokeStyle = 'rgba(201, 186, 149, 0.6)';
      ctx.lineWidth = 1.2 * scale;
      ctx.strokeRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale);
    } else if (activeTheme.id === 'retro') {
      ctx.strokeStyle = activeTheme.accentHex;
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(10 * scale, 10 * scale, width - 20 * scale, height - 20 * scale);
      ctx.strokeStyle = activeTheme.borderHex;
      ctx.lineWidth = 1 * scale;
      ctx.strokeRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale);
    }

    // Header Space & Text (if enabled)
    let contentTop = (activeTheme.id === 'film' ? 24 : 26) * scale;
    if (showHeader && headerText.trim()) {
      ctx.fillStyle = activeTheme.textHex;
      ctx.font = `700 ${12 * scale}px Fraunces, Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(headerText.toUpperCase(), width / 2, contentTop + 12 * scale);
      contentTop += 28 * scale;
    }

    // Calculate Photo Grid Bounds
    const footerHeight = (activeTheme.id === 'film' ? 76 : 84) * scale;
    const availablePhotoHeight = height - contentTop - footerHeight;

    const cols = activeLayout.cols;
    const rows = activeLayout.rows;

    const horizontalPadding = (activeTheme.id === 'film' ? 44 : 24) * scale;
    const gapX = 14 * scale;
    const gapY = 16 * scale;

    const totalGapX = (cols - 1) * gapX;
    const totalGapY = (rows - 1) * gapY;

    const photoCellWidth = (width - horizontalPadding * 2 - totalGapX) / cols;
    const photoCellHeight = (availablePhotoHeight - totalGapY) / rows;

    // 2. Draw Photos in Slots
    for (let index = 0; index < activeLayout.slots; index++) {
      const colIndex = index % cols;
      const rowIndex = Math.floor(index / cols);

      const cellX = horizontalPadding + colIndex * (photoCellWidth + gapX);
      const cellY = contentTop + rowIndex * (photoCellHeight + gapY);

      ctx.fillStyle = activeTheme.cardHex;
      const cardBorderRadius = 4 * scale;
      ctx.beginPath();
      drawRoundedRect(ctx, cellX, cellY, photoCellWidth, photoCellHeight, cardBorderRadius);
      ctx.fill();

      ctx.strokeStyle = activeTheme.borderHex;
      ctx.lineWidth = (activeTheme.id === 'film' ? 1.5 : 1) * scale;
      ctx.stroke();

      const item = slotItems[index];
      const imgSrc = item?.previewUrl || item?.url;

      if (imgSrc) {
        try {
          const img = await loadHtmlImage(imgSrc);

          const inset = (activeTheme.id === 'film' ? 4 : 5) * scale;
          const px = cellX + inset;
          const py = cellY + inset;
          const pw = photoCellWidth - inset * 2;
          const ph = photoCellHeight - inset * 2;

          ctx.save();
          ctx.beginPath();
          drawRoundedRect(ctx, px, py, pw, ph, 2 * scale);
          ctx.clip();

          if (filterId === 'warm') {
            ctx.filter = 'sepia(0.3) contrast(1.08) saturate(1.15)';
          } else if (filterId === 'bw') {
            ctx.filter = 'grayscale(1) contrast(1.25)';
          } else if (filterId === 'soft') {
            ctx.filter = 'contrast(0.94) brightness(1.08) saturate(0.88)';
          }

          const imgAspect = img.width / img.height;
          const boxAspect = pw / ph;
          let sx = 0,
            sy = 0,
            sw = img.width,
            sh = img.height;

          if (imgAspect > boxAspect) {
            sw = img.height * boxAspect;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / boxAspect;
            sy = (img.height - sh) / 2;
          }

          // Apply slot zoom scale to canvas crop
          const zoom = slotZooms[index] || 1;
          if (zoom !== 1) {
            const newSw = sw / zoom;
            const newSh = sh / zoom;
            sx += (sw - newSw) / 2;
            sy += (sh - newSh) / 2;
            sw = newSw;
            sh = newSh;
          }

          // Apply vertical repositioning from top (0%) to bottom (100%)
          const posY = typeof slotPositionsY[index] === 'number' ? slotPositionsY[index] : 50;
          if (posY !== 50) {
            const maxSlackY = Math.max(0, img.height - sh);
            if (maxSlackY > 0) {
              sy = maxSlackY * (posY / 100);
            }
          }
          sy = Math.max(0, Math.min(img.height - sh, sy));

          ctx.drawImage(img, sx, sy, sw, sh, px, py, pw, ph);
          ctx.restore();

          if (activeTheme.id === 'film') {
            ctx.fillStyle = '#E5B560';
            ctx.font = `600 ${8 * scale}px Courier New, monospace`;
            ctx.textAlign = 'right';
            ctx.fillText(
              `0${index + 1}A`,
              cellX + photoCellWidth - 6 * scale,
              cellY + photoCellHeight + 11 * scale
            );
          }
        } catch (e) {
          console.error('Failed to load image for canvas slot:', e);
          ctx.fillStyle = activeTheme.textHex;
          ctx.font = `400 ${11 * scale}px Special Elite, Courier New, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('Memory Photo', cellX + photoCellWidth / 2, cellY + photoCellHeight / 2);
        }
      } else {
        ctx.strokeStyle = activeTheme.borderHex;
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.strokeRect(
          cellX + 8 * scale,
          cellY + 8 * scale,
          photoCellWidth - 16 * scale,
          photoCellHeight - 16 * scale
        );
        ctx.setLineDash([]);

        ctx.fillStyle = activeTheme.textHex;
        ctx.globalAlpha = 0.5;
        ctx.font = `italic 400 ${12 * scale}px Fraunces, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `Slot ${index + 1}`,
          cellX + photoCellWidth / 2,
          cellY + photoCellHeight / 2
        );
        ctx.globalAlpha = 1.0;
      }
    }

    // 3. Draw Footer Section
    const footerCenterY = height - footerHeight / 2 - 4 * scale;
    ctx.textAlign = 'center';

    // Decorative Vector Stamp Motif in Canvas
    if (stampId !== 'none') {
      ctx.save();
      ctx.fillStyle = activeTheme.accentHex;
      const iconSize = 14 * scale;
      const iconX = width / 2 - iconSize / 2;
      const iconY = footerCenterY - 24 * scale;

      ctx.translate(iconX, iconY);
      const s = iconSize / 24;
      ctx.scale(s, s);

      if (stampId === 'heart') {
        const p = new Path2D(
          'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
        );
        ctx.fill(p);
      } else if (stampId === 'sparkle') {
        const p = new Path2D('M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z');
        ctx.fill(p);
      } else if (stampId === 'film') {
        const p = new Path2D(
          'M4 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-5-1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z'
        );
        ctx.fill(p);
      } else if (stampId === 'blossom') {
        const p = new Path2D(
          'M12 2a3.5 3.5 0 0 0-3.5 3.5c0 1.5 1 2.8 2.3 3.3A3.5 3.5 0 0 0 7.5 12a3.5 3.5 0 0 0 3.3 3.2A3.5 3.5 0 0 0 12 22a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 16.5 12a3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 12 2z'
        );
        ctx.fill(p);
      }
      ctx.restore();
    }

    // Primary Footer (defaults to "together since 01/07/26")
    ctx.fillStyle = activeTheme.textHex;
    ctx.font = `600 ${13 * scale}px Special Elite, Courier New, monospace`;
    ctx.fillText(primaryFooter, width / 2, footerCenterY);

    // Secondary Footer / Date
    if (secondaryFooter.trim() || showDate) {
      const subText = [secondaryFooter.trim(), showDate ? customDate : '']
        .filter(Boolean)
        .join(' • ');

      ctx.fillStyle = activeTheme.accentHex;
      ctx.font = `italic 400 ${10.5 * scale}px Fraunces, Georgia, serif`;
      ctx.fillText(subText, width / 2, footerCenterY + 16 * scale);
    }

    return canvas;
  };

  // Helper to safely export canvas to a blob under Vercel's 4.5MB payload limit
  const getExportBlob = async (
    canvas: HTMLCanvasElement
  ): Promise<{ blob: Blob; filename: string }> => {
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Try PNG first
    let blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    let filename = `memoir-strip-${themeId}-${dateStr}.png`;

    // 2. If PNG exceeds 3.5MB (approaching Vercel serverless 4.5MB limit),
    // convert to high-quality JPEG (92%) which preserves beautiful clarity with ~1MB file size
    if (blob && blob.size > 3.5 * 1024 * 1024) {
      console.warn(`PNG size (${Math.round(blob.size / 1024)}KB) exceeds upload threshold. Optimizing with high-quality JPEG...`);
      const jpegBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
      if (jpegBlob) {
        blob = jpegBlob;
        filename = `memoir-strip-${themeId}-${dateStr}.jpg`;
      }
    }

    if (!blob) throw new Error('Failed to generate photo strip image');
    return { blob, filename };
  };

  // Download photo strip image to device
  const handleDownload = async () => {
    try {
      setIsExporting(true);
      setExportMessage('Generating photo strip...');

      const canvas = await generateStripCanvas();
      const { blob, filename } = await getExportBlob(canvas);

      // Release backing canvas pixel memory
      canvas.width = 0;
      canvas.height = 0;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Delay revocation by 2.5s so iOS Safari and Android Chrome have sufficient time to dispatch download
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 2500);

      // Clean up cached draft after successful download
      clearPhotoStripDraft();
      setHasRestoredDraft(false);

      setIsExporting(false);
      setExportMessage('');
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setExportMessage('Unable to download photo strip. Please try again.');
      setTimeout(() => setExportMessage(''), 4000);
    }
  };

  // Send Photo Strip directly to Discord server
  const handleSendToDiscord = async () => {
    try {
      setIsSendingDiscord(true);
      setExportMessage('Preparing photo strip for Discord...');
      setDiscordSuccess(false);

      const canvas = await generateStripCanvas();
      const { blob, filename } = await getExportBlob(canvas);
      canvas.width = 0;
      canvas.height = 0;

      setExportMessage('Sending to Discord...');

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('themeName', activeTheme.name);
      formData.append('layoutName', activeLayout.name);
      formData.append('caption', primaryFooter);

      const res = await fetch('/api/discord/strip', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Server error (${res.status})`;
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch {
          if (res.status === 413) {
            errorMsg = 'Image file too large for server upload. Please try again.';
          } else if (text && text.length < 150) {
            errorMsg = text;
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to post to Discord');
      }

      setDiscordSuccess(true);
      setExportMessage('Sent photo strip to Discord!');
      clearPhotoStripDraft();
      setHasRestoredDraft(false);
      setTimeout(() => {
        setDiscordSuccess(false);
        setExportMessage('');
      }, 4000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send to Discord';
      console.error('Send to Discord failed:', err);
      setExportMessage(errMsg);
      setTimeout(() => setExportMessage(''), 4500);
    } finally {
      setIsSendingDiscord(false);
    }
  };

  // Helper to render animated character-by-character photobooth text
  const renderAnimatedText = (text: string, baseClass = '', keyPrefix = 'txt') => {
    const words = text.split(' ');
    let charCounter = 0;

    return (
      <span className={`inline-block ${baseClass}`}>
        {words.map((word, wordIdx) => {
          const wordChars = word.split('');
          const renderedWord = (
            <span key={`${keyPrefix}-w-${wordIdx}`} className="inline-block whitespace-nowrap">
              {wordChars.map((char) => {
                const idx = charCounter++;
                return (
                  <span
                    key={`${keyPrefix}-c-${idx}-${char}`}
                    className="inline-block animate-char-pop"
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          );

          if (wordIdx < words.length - 1) {
            charCounter++;
            return (
              <span key={`${keyPrefix}-wspace-${wordIdx}`}>
                {renderedWord}
                <span className="inline-block">&nbsp;</span>
              </span>
            );
          }
          return renderedWord;
        })}
      </span>
    );
  };

  // Helper to render the live photo strip preview card
  const renderPhotoStripCard = (isInteractive = true) => (
    <div
      id="photo-strip-preview-card"
      key={`strip-${layoutId}-${themeId}`}
      style={{
        backgroundColor: activeTheme.bgHex,
        borderColor: activeTheme.borderHex,
        color: activeTheme.textHex,
      }}
      className={`relative w-full rounded-xs border-2 shadow-2xl p-3.5 sm:p-4 transition-all duration-300 select-none animate-strip-morph ${
        activeTheme.id === 'film' ? 'pt-5 pb-5' : ''
      }`}
    >
      {/* Vintage Washi Tape Accent on Top */}
      {activeTheme.id === 'vintage' && (
        <span className="absolute -top-2 left-6 w-14 h-4 bg-tape/90 rotate-[-5deg] shadow-xs pointer-events-none" />
      )}

      {/* 35mm Sprocket Holes for Film Theme */}
      {activeTheme.id === 'film' && (
        <>
          <div className="absolute left-1.5 top-3 bottom-3 flex flex-col justify-around pointer-events-none opacity-40">
            {Array.from({ length: activeLayout.id === 'wide-8' ? 5 : 8 }).map((_, i) => (
              <span key={i} className="w-2.5 h-3.5 bg-black border border-stone-700 rounded-[1.5px]" />
            ))}
          </div>
          <div className="absolute right-1.5 top-3 bottom-3 flex flex-col justify-around pointer-events-none opacity-40">
            {Array.from({ length: activeLayout.id === 'wide-8' ? 5 : 8 }).map((_, i) => (
              <span key={i} className="w-2.5 h-3.5 bg-black border border-stone-700 rounded-[1.5px]" />
            ))}
          </div>
        </>
      )}

      {/* Optional Strip Header */}
      {showHeader && headerText.trim() && (
        <div className="text-center mb-2.5">
          <p className="font-display font-bold text-xs tracking-widest uppercase opacity-85">
            {renderAnimatedText(headerText, '', 'hdr')}
          </p>
        </div>
      )}

      {/* Photo Grid based on Layout */}
      <div
        className={`grid gap-2 sm:gap-2.5 ${
          activeLayout.cols === 4
            ? 'grid-cols-4'
            : activeLayout.cols === 2
            ? 'grid-cols-2'
            : 'grid-cols-1'
        } ${activeTheme.id === 'film' ? 'px-4' : ''}`}
      >
        {Array.from({ length: activeLayout.slots }).map((_, slotIdx) => {
          const item = slotItems[slotIdx];
          const photoSrc = item?.previewUrl || item?.url;
          const isBeingDragged =
            draggedSlotIndex === slotIdx || touchDraggingSlotIndex === slotIdx;
          const isDropTarget = dragOverSlotIndex === slotIdx;
          const isRemoveSelected = activeRemoveSlotIdx === slotIdx;

          return (
            <div
              key={`slot-${slotIdx}`}
              data-slot-index={slotIdx}
              draggable={isInteractive && Boolean(photoSrc)}
              onDragStart={(e) => handleDragStart(slotIdx, e)}
              onDragOver={(e) => handleDragOver(slotIdx, e)}
              onDragLeave={() => handleDragLeave(slotIdx)}
              onDrop={(e) => handleDrop(slotIdx, e)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(slotIdx, e)}
              onTouchMove={(e) => handleTouchMove(slotIdx, e)}
              onTouchEnd={() => handleTouchEnd(slotIdx)}
              onTouchCancel={handleTouchCancel}
              onWheel={(e) => {
                if (!photoSrc || !isInteractive) return;
                e.preventDefault();
                e.stopPropagation();
                handleZoomSlot(slotIdx, e.deltaY < 0 ? 0.15 : -0.15);
              }}
              onClick={() => {
                if (isInteractive && !touchDraggingSlotIndex && draggedSlotIndex === null) {
                  handleSlotClick(slotIdx);
                }
              }}
              style={{
                backgroundColor: activeTheme.cardHex,
                borderColor: activeTheme.borderHex,
                animationDelay: `${slotIdx * 65}ms`,
              }}
              className={`group relative aspect-[4/3] rounded-[2px] border p-1 sm:p-1.5 touch-none select-none ${
                photoSrc ? 'animate-photo-develop' : 'animate-slot-cascade'
              } ${
                isInteractive
                  ? photoSrc
                    ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-rust/70 hover:scale-[1.01]'
                    : 'cursor-pointer hover:ring-2 hover:ring-rust/70 hover:scale-[1.01]'
                  : ''
              } ${
                isBeingDragged
                  ? 'opacity-30 scale-95 ring-2 ring-rust/60 border-dashed'
                  : isDropTarget
                  ? 'ring-2 ring-rust border-rust bg-rust/20 scale-[1.03] shadow-md z-10'
                  : isRemoveSelected
                  ? 'ring-2 ring-rust border-rust shadow-md scale-[1.01] z-20'
                  : ''
              } transition-all duration-200 flex flex-col items-center justify-center overflow-hidden ${
                !photoSrc ? 'border-dashed opacity-85 hover:opacity-100' : 'border-solid shadow-xs'
              }`}
              title={
                photoSrc
                  ? isRemoveSelected
                    ? 'Tap to cancel removal'
                    : 'Drag photo up or down to rearrange • Tap to remove'
                  : 'Tap to choose photo'
              }
            >
              {isDropTarget && (
                <div className="absolute inset-0 bg-rust/25 border-2 border-rust border-dashed rounded-[2px] flex items-center justify-center z-20 pointer-events-none animate-pulse">
                  <span className="bg-rust text-paper-light font-stamp text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-xs shadow-xs">
                    Relocate here
                  </span>
                </div>
              )}

              {/* Center Remove X Button Overlay when slot is tapped */}
              {isInteractive && photoSrc && isRemoveSelected && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveRemoveSlotIdx(null);
                  }}
                  className="absolute inset-0 bg-ink/50 backdrop-blur-[1px] rounded-[2px] flex flex-col items-center justify-center gap-1 z-30 p-1 pointer-events-auto animate-fade-in"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhotoFromSlot(slotIdx, e);
                      setActiveRemoveSlotIdx(null);
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-rust hover:bg-rust-dark text-paper-light flex items-center justify-center shadow-lg transition transform active:scale-90 hover:scale-105 border-2 border-paper-light"
                    title="Remove photo from slot"
                    aria-label="Remove photo"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <span className="font-stamp text-[9px] sm:text-[10px] text-paper-light tracking-wide drop-shadow-xs pointer-events-none">
                    Remove
                  </span>
                </div>
              )}

              {photoSrc ? (
                <>
                  <div className="w-full h-full overflow-hidden rounded-[1px] flex items-center justify-center pointer-events-none">
                    <img
                      src={photoSrc}
                      alt={`Slot ${slotIdx + 1}`}
                      style={{
                        filter: getFilterStyle(filterId),
                        objectPosition: `50% ${slotPositionsY[slotIdx] ?? 50}%`,
                        transform: `scale(${slotZooms[slotIdx] || 1})`,
                        transformOrigin: `50% ${slotPositionsY[slotIdx] ?? 50}%`,
                      }}
                      className="w-full h-full object-cover transition-all duration-150 pointer-events-none select-none"
                    />
                  </div>

                  {activeTheme.id === 'film' && (
                    <span className="absolute bottom-1 right-1.5 font-stamp text-[9px] text-[#E5B560] drop-shadow-xs pointer-events-none">
                      0{slotIdx + 1}A
                    </span>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center animate-pulse-gentle pointer-events-none">
                  <span className="w-6 h-6 rounded-full border border-dashed border-current/40 flex items-center justify-center text-xs mb-1 opacity-70 group-hover:scale-110 transition">
                    +
                  </span>
                  <span className="font-stamp text-[10px] tracking-wide opacity-60 uppercase">
                    Slot {slotIdx + 1}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Section of Photo Strip */}
      <div className="mt-3 pt-2.5 text-center border-t border-current/15 flex flex-col items-center justify-center gap-1">
        {/* Stamp Vector Motif */}
        {stampId !== 'none' && (
          <div key={`stamp-${stampId}`} className="animate-stamp-bounce flex items-center justify-center">
            {stampId === 'heart' && (
              <svg className="w-4 h-4 text-current opacity-85" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
            {stampId === 'sparkle' && (
              <svg className="w-4 h-4 text-current opacity-85" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" />
              </svg>
            )}
            {stampId === 'film' && (
              <svg className="w-4 h-4 text-current opacity-85" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 3v18" />
                <path d="M17 3v18" />
              </svg>
            )}
            {stampId === 'blossom' && (
              <svg className="w-4 h-4 text-current opacity-85" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2a3.5 3.5 0 0 0-3.5 3.5c0 1.5 1 2.8 2.3 3.3A3.5 3.5 0 0 0 7.5 12a3.5 3.5 0 0 0 3.3 3.2A3.5 3.5 0 0 0 12 22a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 16.5 12a3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 12 2z" />
              </svg>
            )}
          </div>
        )}

        {/* Primary Caption */}
        <p className="font-display font-medium text-xs sm:text-sm tracking-wide">
          {renderAnimatedText(primaryFooter || 'together since 01/07/26', '', 'caption')}
        </p>

        {/* Subtitle & Date */}
        {(secondaryFooter.trim() || showDate) && (
          <p
            style={{ color: activeTheme.accentHex }}
            className="font-display italic text-[11px] leading-tight opacity-90"
          >
            {renderAnimatedText(
              [secondaryFooter.trim(), showDate ? customDate : ''].filter(Boolean).join(' • '),
              '',
              'sub'
            )}
          </p>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto no-scrollbar">
      {/* Outer Studio Dialog Container - Dynamically wide for landscape sheets */}
      <div className={`relative w-full ${
        activeLayout.id === 'wide-8'
          ? 'max-w-4xl lg:max-w-5xl xl:max-w-[1140px]'
          : 'max-w-3xl lg:max-w-4xl'
      } md:h-[620px] max-h-[92vh] bg-paper-light border border-line rounded-sm shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95 duration-200`}>
        {/* Studio Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line/70 bg-paper/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xs bg-rust/10 border border-rust/25 flex items-center justify-center text-rust shrink-0">
              <svg
                className="w-4 h-4"
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
              <div className="flex items-center gap-2">
                <h2 className="font-display font-medium text-ink text-base sm:text-lg leading-none">
                  Memoir Photobooth
                </h2>
                {hasRestoredDraft && (
                  <span className="px-1.5 py-0.5 rounded-2xs text-[9px] font-stamp bg-rust/15 text-rust border border-rust/30 tracking-tight animate-fade-in">
                    Draft Restored
                  </span>
                )}
              </div>
              <p className="font-display italic text-[11px] sm:text-xs text-ink/65 mt-0.5">
                Vintage Photo Strips • Auto-saves as you edit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {(hasRestoredDraft || filledSlotsCount > 0) && (
              <button
                type="button"
                onClick={resetToCleanDefaults}
                className="px-2 py-1 text-ink/65 hover:text-rust hover:bg-rust/10 font-display text-[11px] rounded-xs border border-line/60 transition flex items-center gap-1"
                title="Discard current draft and start fresh"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span className="hidden sm:inline">Start Fresh</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseStudio}
              className="p-1.5 text-ink/60 hover:text-ink hover:bg-ink/5 rounded-xs transition"
              title="Close Studio (Esc)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Step Indicator Navigation - 3 Simple Sequential Steps */}
        <div className="px-3 sm:px-6 py-2 border-b border-line/50 bg-paper/40 shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-paper border border-line/60 rounded-xs">
            <button
              type="button"
              onClick={() => setStudioStep('style')}
              className={`flex-1 py-1.5 px-1 sm:px-2 rounded-xs font-display text-[11px] sm:text-xs transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                studioStep === 'style'
                  ? 'bg-ink text-paper-light font-medium shadow-xs'
                  : 'text-ink/65 hover:text-ink hover:bg-ink/5'
              }`}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a4 4 0 0 1 4 4c0 1.6-1 3-2.4 3.7" />
              </svg>
              <span>1. Style</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioStep('photos')}
              className={`flex-1 py-1.5 px-1 sm:px-2 rounded-xs font-display text-[11px] sm:text-xs transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                studioStep === 'photos'
                  ? 'bg-ink text-paper-light font-medium shadow-xs'
                  : 'text-ink/65 hover:text-ink hover:bg-ink/5'
              }`}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>2. Photos ({filledSlotsCount}/{activeLayout.slots})</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioStep('note')}
              className={`flex-1 py-1.5 px-1 sm:px-2 rounded-xs font-display text-[11px] sm:text-xs transition flex items-center justify-center gap-1 sm:gap-1.5 ${
                studioStep === 'note'
                  ? 'bg-ink text-paper-light font-medium shadow-xs'
                  : 'text-ink/65 hover:text-ink hover:bg-ink/5'
              }`}
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>3. Note</span>
            </button>
          </div>
        </div>

        {/* Main Body: Split into Left (Controls) and Right (Preview Stage) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* On Mobile (< md): Compact Collapsible Preview Bar */}
          <div className="md:hidden w-full bg-paper border-b border-line flex flex-col items-center shrink-0">
            <div className="w-full flex items-center justify-between px-3 py-1.5 bg-paper-light border-b border-line/40">
              <div className="flex items-center gap-1.5">
                <span className="font-stamp text-[11px] text-ink/80 font-medium">Strip Preview</span>
                <span className="font-display italic text-[10px] text-ink/55">
                  ({activeLayout.name})
                </span>
                {activeRemoveSlotIdx !== null && (
                  <span className="font-stamp text-[9px] text-rust bg-rust/10 border border-rust/20 px-1 py-0.5 rounded-2xs">
                    Slot {activeRemoveSlotIdx + 1} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsMobilePreviewExpanded(true)}
                  className="px-2 py-1 bg-rust hover:bg-rust-dark text-paper-light font-display text-[11px] rounded-xs shadow-2xs flex items-center gap-1 transition whitespace-nowrap font-medium"
                  title="Open full photo strip preview"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="2" width="10" height="20" rx="1.5" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="14" x2="17" y2="14" />
                  </svg>
                  <span>View Strip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobilePreviewVisible(!isMobilePreviewVisible)}
                  className="px-2 py-1 border border-line bg-paper text-ink/75 hover:bg-ink hover:text-paper-light font-display text-[11px] rounded-xs shadow-2xs transition whitespace-nowrap flex items-center gap-1"
                  title={isMobilePreviewVisible ? 'Hide in-line preview strip' : 'Show in-line preview strip'}
                >
                  {isMobilePreviewVisible ? (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isMobilePreviewVisible && (
              <div className="w-full max-h-[145px] overflow-y-auto no-scrollbar py-2 px-3 flex justify-center bg-paper/60 border-b border-line/40">
                <div className={`w-full ${
                  activeLayout.id === 'wide-8' ? 'max-w-[420px]' : 'max-w-[260px]'
                } flex flex-col items-center transform scale-[0.62] sm:scale-75 origin-top my-[-10px]`}>
                  {renderPhotoStripCard(true)}
                </div>
              </div>
            )}
          </div>

          {/* Left Panel: Configuration Steps */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-5 min-h-0 flex flex-col">
            {/* STEP 1: STYLE & THEME */}
            {studioStep === 'style' && (
              <div className="flex flex-col gap-3.5 max-w-lg mx-auto w-full animate-studio-reveal">
                {/* Choose Strip Size */}
                <div onClick={() => setIsThemeRevealed(true)}>
                  <div className="mb-2">
                    <h3 className="font-display italic text-sm sm:text-base text-ink leading-tight">
                      Size & Layout
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUTS.map((layout) => {
                      const isSelected = layoutId === layout.id;
                      return (
                        <button
                          key={layout.id}
                          type="button"
                          onClick={() => handleSelectLayout(layout.id)}
                          className={`p-2.5 sm:p-3 rounded-xs border text-left transition-all duration-200 flex items-center justify-between group ${
                            isSelected
                              ? 'border-rust bg-rust/5 ring-2 ring-rust text-ink font-medium shadow-xs scale-[1.01] animate-layout-pop'
                              : 'border-line bg-paper hover:border-ink/40 text-ink/70'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-medium text-xs sm:text-sm text-ink truncate">
                                {layout.name}
                              </span>
                              <span className="font-stamp text-[10px] text-ink/50 shrink-0">
                                {layout.slots}p
                              </span>
                            </div>
                            <span className="font-display italic text-[10px] sm:text-[11px] text-ink/60 truncate block mt-0.5">
                              {layout.aspectDesc}
                            </span>
                          </div>

                          {/* Miniature photobooth wireframe animation */}
                          <div
                            className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xs border shrink-0 flex items-center justify-center p-1 transition-all duration-200 ${
                              isSelected
                                ? 'border-rust/60 bg-rust/10 shadow-2xs'
                                : 'border-line/70 bg-paper-light/90 group-hover:border-ink/30'
                            }`}
                          >
                            {layout.id === 'single-1' && (
                              <div className="w-5 sm:w-6 h-7 sm:h-8 flex items-center justify-center">
                                <div
                                  className={`w-full h-full rounded-[1.5px] transition-all duration-300 ${
                                    isSelected ? 'bg-rust scale-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                  }`}
                                />
                              </div>
                            )}

                            {layout.id === 'duo-2' && (
                              <div className="flex flex-col justify-between w-5 sm:w-6 h-8 sm:h-9 items-center gap-1">
                                {Array.from({ length: 2 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-3.5 sm:h-4 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-x-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'classic-3' && (
                              <div className="flex flex-col justify-between w-5 sm:w-6 h-8 sm:h-9 items-center gap-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-2 sm:h-2.5 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-x-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'classic-4' && (
                              <div className="flex flex-col justify-between w-5 sm:w-6 h-8 sm:h-9 items-center gap-0.5">
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-1.5 sm:h-2 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-x-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'grid-4' && (
                              <div className="grid grid-cols-2 gap-1 w-6 sm:w-7 h-6 sm:h-7 items-center">
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-2.5 sm:h-3 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'sheet-6' && (
                              <div className="grid grid-cols-2 gap-1 w-6 sm:w-7 h-8 sm:h-9 items-center">
                                {Array.from({ length: 6 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-2 sm:h-2.5 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'tall-8' && (
                              <div className="grid grid-cols-2 gap-0.5 w-6 sm:w-7 h-8 sm:h-9 items-center">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-1.5 sm:h-2 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}

                            {layout.id === 'wide-8' && (
                              <div className="grid grid-cols-4 gap-0.5 w-7 sm:w-8 h-6 sm:h-7 items-center">
                                {Array.from({ length: 8 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-full h-2 sm:h-2.5 rounded-[1px] transition-all duration-300 ${
                                      isSelected ? 'bg-rust scale-105 shadow-2xs' : 'bg-ink/25 group-hover:bg-ink/40'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staged Adaptive Appearance: Theme and Next button appear after short animation */}
                {isThemeRevealed && (
                  <div className="flex flex-col gap-3.5 animate-adaptive-reveal">
                    {/* Color Theme */}
                    <div ref={themeSectionRef} className="pt-2 border-t border-line/50">
                      <div className="mb-2">
                        <h3 className="font-display italic text-sm sm:text-base text-ink leading-tight">
                          Theme
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {THEMES.map((theme) => {
                          const isSelected = themeId === theme.id;
                          return (
                            <button
                              key={theme.id}
                              type="button"
                              onClick={() => handleSelectTheme(theme.id)}
                              className={`p-2 rounded-xs border transition-all duration-200 flex items-center gap-2 text-left ${
                                isSelected
                                  ? 'ring-2 ring-rust border-rust shadow-sm scale-[1.01]'
                                  : 'border-line hover:border-ink/40'
                              }`}
                              style={{ backgroundColor: theme.bgHex }}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0 shadow-2xs"
                                style={{ backgroundColor: theme.cardHex }}
                              />
                              <div className="min-w-0">
                                <p
                                  className="font-display font-medium text-[11px] sm:text-xs truncate leading-tight"
                                  style={{ color: theme.textHex }}
                                >
                                  {theme.name}
                                </p>
                                <p
                                  className="font-display italic text-[9px] sm:text-[10px] truncate opacity-75"
                                  style={{ color: theme.textHex }}
                                >
                                  {theme.badge}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div ref={nextStyleBtnRef}>
                      <button
                        type="button"
                        onClick={() => setStudioStep('photos')}
                        className="mt-1 w-full py-2.5 bg-rust hover:bg-rust-dark text-paper-light rounded-xs font-display font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-print"
                      >
                        <span>Next: Pick Photos ({filledSlotsCount}/{activeLayout.slots})</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: OUR PHOTOS */}
            {studioStep === 'photos' && (
              <div className="flex flex-col gap-4 max-w-lg mx-auto animate-studio-reveal">
                <div
                  className="flex flex-col gap-4"
                  onClick={() => setIsPhotosSubRevealed(true)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-display italic text-base text-ink leading-tight">
                    Photos
                  </h3>
                  <div className="flex items-center gap-1 sm:gap-1.5 font-display text-xs flex-nowrap overflow-x-auto no-scrollbar py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        const firstEmpty = slotPhotoIds.findIndex((id) => id === null);
                        handleOpenPhotoPicker(firstEmpty !== -1 ? firstEmpty : 0);
                      }}
                      className="px-2 py-1 rounded-xs border border-rust/40 bg-rust/10 hover:bg-rust hover:text-paper-light text-rust transition text-[11px] sm:text-xs flex items-center gap-1 shadow-2xs font-medium shrink-0 whitespace-nowrap"
                      title="Open photo library"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>Pick Photos</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="px-2 py-1 rounded-xs border border-line bg-paper hover:bg-ink hover:text-paper-light text-ink/75 transition text-[11px] sm:text-xs flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Choose random photos from uploaded memories"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>Auto-fill</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShuffle}
                      className="px-2 py-1 rounded-xs border border-line bg-paper hover:bg-ink hover:text-paper-light text-ink/75 transition text-[11px] sm:text-xs flex items-center gap-1 shadow-2xs shrink-0 whitespace-nowrap"
                      title="Shuffle the order of photos in the strip"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                        <line x1="4" y1="4" x2="9" y2="9" />
                      </svg>
                      <span>Shuffle</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-1 rounded-xs border border-line bg-paper hover:text-rust hover:bg-rust/5 text-ink/60 transition text-[11px] sm:text-xs shrink-0 whitespace-nowrap"
                      title="Clear all photo slots"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Photo Selection Progress Bar */}
                <div className="bg-paper/70 border border-line/60 rounded-xs p-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-display text-ink/70">
                      Selected Photos {activeRemoveSlotIdx !== null && '• Tap X in center to remove'}
                    </span>
                    <span className="font-stamp text-[11px] text-rust font-medium">
                      {filledSlotsCount} / {activeLayout.slots}
                    </span>
                  </div>
                  <div className="w-full bg-paper border border-line/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rust h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, Math.round((filledSlotsCount / activeLayout.slots) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Slots Grid with Cascade & Develop Animations */}
                <div className={`grid gap-2.5 ${
                  activeLayout.id === 'wide-8' ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'
                }`}>
                  {Array.from({ length: activeLayout.slots }).map((_, idx) => {
                    const item = slotItems[idx];
                    const imgSrc = item?.previewUrl || item?.url;
                    const isPickingThis = activeSlotPickerIndex === idx;
                    const isBeingDragged =
                      draggedSlotIndex === idx || touchDraggingSlotIndex === idx;
                    const isDropTarget = dragOverSlotIndex === idx;
                    const isRemoveSelected = activeRemoveSlotIdx === idx;

                    return (
                      <div
                        key={`config-slot-${idx}`}
                        data-slot-index={idx}
                        draggable={Boolean(imgSrc)}
                        onDragStart={(e) => handleDragStart(idx, e)}
                        onDragOver={(e) => handleDragOver(idx, e)}
                        onDragLeave={() => handleDragLeave(idx)}
                        onDrop={(e) => handleDrop(idx, e)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(idx, e)}
                        onTouchMove={(e) => handleTouchMove(idx, e)}
                        onTouchEnd={() => handleTouchEnd(idx)}
                        onTouchCancel={handleTouchCancel}
                        onClick={() => {
                          if (!touchDraggingSlotIndex && draggedSlotIndex === null) {
                            handleSlotClick(idx);
                          }
                        }}
                        style={{ animationDelay: `${idx * 75}ms` }}
                        className={`group relative aspect-[4/3] rounded-xs border flex flex-col items-center justify-center p-1 transition-all duration-200 overflow-hidden touch-none select-none ${
                          isBeingDragged
                            ? 'opacity-30 scale-95 ring-2 ring-rust/60 border-dashed'
                            : isDropTarget
                            ? 'ring-2 ring-rust border-rust bg-rust/20 scale-[1.02] shadow-md z-10'
                            : isRemoveSelected
                            ? 'ring-2 ring-rust border-rust shadow-md scale-[1.01] z-20'
                            : isPickingThis
                            ? 'ring-2 ring-rust border-rust bg-rust/10'
                            : imgSrc
                            ? 'border-line bg-paper-light hover:border-ink shadow-2xs cursor-grab active:cursor-grabbing'
                            : 'border-dashed border-line bg-paper/50 hover:bg-paper cursor-pointer'
                        }`}
                        title={
                          imgSrc
                            ? isRemoveSelected
                              ? 'Tap to cancel removal'
                              : 'Tap to remove photo • Drag to swap'
                            : 'Tap to add photo'
                        }
                      >
                        {isDropTarget && (
                          <div className="absolute inset-0 bg-rust/25 border-2 border-rust border-dashed rounded-xs flex items-center justify-center z-20 pointer-events-none animate-pulse">
                            <span className="bg-rust text-paper-light font-stamp text-[9px] px-1.5 py-0.5 rounded-2xs shadow-xs">
                              Relocate here
                            </span>
                          </div>
                        )}

                        {/* Center Remove X Button Overlay when slot is tapped */}
                        {imgSrc && isRemoveSelected && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRemoveSlotIdx(null);
                            }}
                            className="absolute inset-0 bg-ink/50 backdrop-blur-[1px] rounded-xs flex flex-col items-center justify-center gap-1 z-30 p-1 pointer-events-auto animate-fade-in"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePhotoFromSlot(idx, e);
                                setActiveRemoveSlotIdx(null);
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rust hover:bg-rust-dark text-paper-light flex items-center justify-center shadow-lg transition transform active:scale-90 hover:scale-105 border-2 border-paper-light"
                              title="Remove photo from slot"
                              aria-label="Remove photo"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <span className="font-stamp text-[9px] text-paper-light tracking-wide drop-shadow-xs pointer-events-none">
                              Remove
                            </span>
                          </div>
                        )}

                        {imgSrc ? (
                          <>
                            <img
                              src={imgSrc}
                              alt={`Photo ${idx + 1}`}
                              style={{ filter: getFilterStyle(filterId) }}
                              className="w-full h-full object-cover rounded-2xs animate-photo-develop transition-all duration-300 pointer-events-none select-none"
                            />
                            <span className="absolute bottom-1 right-1 bg-ink/75 text-paper-light font-display text-[9px] px-1 rounded-2xs pointer-events-none">
                              Photo {idx + 1}
                            </span>
                          </>
                        ) : (
                          <div className="text-center p-2 animate-pulse-gentle pointer-events-none">
                            <span className="w-6 h-6 rounded-full border border-dashed border-ink/40 flex items-center justify-center text-xs mx-auto mb-1 text-ink/60 group-hover:scale-110 transition">
                              +
                            </span>
                            <span className="font-display text-[11px] text-ink/60">
                              Photo {idx + 1}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Staged Adaptive Appearance: Photo Tone and navigation buttons appear after short animation */}
              {isPhotosSubRevealed && (
                  <div className="flex flex-col gap-3 animate-adaptive-reveal">
                    {/* Photo Filter Tone */}
                    <div className="p-3 bg-paper/60 border border-line/60 rounded-xs flex items-center justify-between flex-wrap gap-2">
                      <span className="font-display italic text-xs text-ink/75">Photo Tone:</span>
                      <div className="inline-flex rounded-xs border border-line bg-paper-light p-0.5 font-display text-xs">
                        {(
                          [
                            { id: 'original', label: 'Original' },
                            { id: 'warm', label: 'Warm' },
                            { id: 'bw', label: 'B&W' },
                            { id: 'soft', label: 'Soft' },
                          ] as const
                        ).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setFilterId(f.id)}
                            className={`px-2.5 py-0.5 rounded-xs transition text-xs ${
                              filterId === f.id
                                ? 'bg-ink text-paper-light font-medium shadow-2xs'
                                : 'text-ink/65 hover:text-ink hover:bg-ink/5'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step Navigation Buttons */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setStudioStep('style')}
                        className="px-4 py-2.5 border border-line bg-paper hover:bg-paper-light text-ink rounded-xs font-display text-xs transition"
                      >
                        ← Back to Style
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioStep('note')}
                        className="flex-1 py-2.5 bg-rust hover:bg-rust-dark text-paper-light rounded-xs font-display font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-print"
                      >
                        <span>Next: Add Sweet Note</span>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: NOTE & STAMP */}
            {studioStep === 'note' && (
              <div className="flex flex-col gap-4 max-w-lg mx-auto animate-studio-reveal">
                <div
                  className="flex flex-col gap-4"
                  onClick={() => setIsNoteSubRevealed(true)}
                >
                  <div>
                    <h3 className="font-display italic text-base text-ink leading-tight">
                      Note & Stamp
                    </h3>
                  </div>

                {/* Main Title / Caption */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display text-xs text-ink/80 font-medium">Caption</span>
                  </div>
                  <input
                    type="text"
                    value={primaryFooter}
                    onFocus={() => setIsNoteSubRevealed(true)}
                    onChange={(e) => {
                      setPrimaryFooter(e.target.value);
                      setIsNoteSubRevealed(true);
                    }}
                    placeholder="together since 01/07/26"
                    maxLength={40}
                    className="w-full font-display text-xs sm:text-sm bg-paper border border-line px-3 py-2 rounded-xs text-ink focus:border-rust focus:ring-2 focus:ring-rust/20 transition-all duration-200 outline-none"
                  />
                </div>

                {/* Subtitle & Date Stamp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="font-display text-xs text-ink/80 block mb-1">
                      Sweet Note (optional):
                    </span>
                    <input
                      type="text"
                      value={secondaryFooter}
                      onFocus={() => setIsNoteSubRevealed(true)}
                      onChange={(e) => {
                        setSecondaryFooter(e.target.value);
                        setIsNoteSubRevealed(true);
                      }}
                      placeholder="our favorite day"
                      maxLength={30}
                      className="w-full font-display italic text-xs bg-paper border border-line px-3 py-2 rounded-xs text-ink focus:border-rust focus:ring-2 focus:ring-rust/20 transition-all duration-200 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs text-ink/80">Date:</span>
                      <label className="flex items-center gap-1 font-display text-[11px] text-ink/60 cursor-pointer">
                        <input
                           type="checkbox"
                          checked={showDate}
                          onChange={(e) => {
                            setShowDate(e.target.checked);
                            setIsNoteSubRevealed(true);
                          }}
                          className="accent-rust scale-90"
                        />
                        Show
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={!showDate}
                      value={customDate}
                      onFocus={() => setIsNoteSubRevealed(true)}
                      onChange={(e) => {
                        setCustomDate(e.target.value);
                        setIsNoteSubRevealed(true);
                      }}
                      placeholder={getTodayFormattedDate()}
                      className="w-full font-display text-xs bg-paper border border-line px-3 py-2 rounded-xs text-ink disabled:opacity-40 focus:border-rust focus:ring-2 focus:ring-rust/20 transition-all duration-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Staged Adaptive Appearance: Stamp Motif, Top Title, and Save Photo Strip appear after short animation */}
              {isNoteSubRevealed && (
                  <div className="flex flex-col gap-3.5 animate-adaptive-reveal">
                    {/* Stamp Motif */}
                    <div className="pt-2 border-t border-line/50">
                      <span className="font-display text-xs text-ink/80 block mb-1.5">
                        Choose a Stamp Motif:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStampId('heart');
                            setIsNoteSubRevealed(true);
                          }}
                          className={`px-3 py-1.5 rounded-xs transition text-xs flex items-center gap-1.5 border ${
                            stampId === 'heart'
                              ? 'bg-ink text-paper-light border-ink font-medium shadow-xs'
                              : 'bg-paper border-line text-ink/70 hover:text-ink'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          <span>Heart</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStampId('sparkle');
                            setIsNoteSubRevealed(true);
                          }}
                          className={`px-3 py-1.5 rounded-xs transition text-xs flex items-center gap-1.5 border ${
                            stampId === 'sparkle'
                              ? 'bg-ink text-paper-light border-ink font-medium shadow-xs'
                              : 'bg-paper border-line text-ink/70 hover:text-ink'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" />
                          </svg>
                          <span>Sparkle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStampId('film');
                            setIsNoteSubRevealed(true);
                          }}
                          className={`px-3 py-1.5 rounded-xs transition text-xs flex items-center gap-1.5 border ${
                            stampId === 'film'
                              ? 'bg-ink text-paper-light border-ink font-medium shadow-xs'
                              : 'bg-paper border-line text-ink/70 hover:text-ink'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M7 3v18" />
                            <path d="M17 3v18" />
                          </svg>
                          <span>Camera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStampId('blossom');
                            setIsNoteSubRevealed(true);
                          }}
                          className={`px-3 py-1.5 rounded-xs transition text-xs flex items-center gap-1.5 border ${
                            stampId === 'blossom'
                              ? 'bg-ink text-paper-light border-ink font-medium shadow-xs'
                              : 'bg-paper border-line text-ink/70 hover:text-ink'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2a3.5 3.5 0 0 0-3.5 3.5c0 1.5 1 2.8 2.3 3.3A3.5 3.5 0 0 0 7.5 12a3.5 3.5 0 0 0 3.3 3.2A3.5 3.5 0 0 0 12 22a3.5 3.5 0 0 0 3.5-3.5 3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 16.5 12a3.5 3.5 0 0 0-3.3-3.2A3.5 3.5 0 0 0 12 2z" />
                          </svg>
                          <span>Bloom</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStampId('none');
                            setIsNoteSubRevealed(true);
                          }}
                          className={`px-3 py-1.5 rounded-xs transition text-xs border ${
                            stampId === 'none'
                              ? 'bg-ink text-paper-light border-ink font-medium shadow-xs'
                              : 'bg-paper border-line text-ink/70 hover:text-ink'
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </div>

                    {/* Optional Top Title */}
                    <div className="pt-2 border-t border-line/50 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="show-strip-header"
                        checked={showHeader}
                        onChange={(e) => {
                          setShowHeader(e.target.checked);
                          setIsNoteSubRevealed(true);
                        }}
                        className="rounded-2xs accent-rust"
                      />
                      <label htmlFor="show-strip-header" className="font-display text-xs text-ink/80 cursor-pointer">
                        Add top photobooth title
                      </label>
                      {showHeader && (
                        <input
                          type="text"
                          value={headerText}
                          onChange={(e) => {
                            setHeaderText(e.target.value);
                            setIsNoteSubRevealed(true);
                          }}
                          placeholder="MEMOIR PHOTOBOOTH"
                          maxLength={30}
                          className="flex-1 ml-2 font-display text-xs bg-paper border border-line px-2.5 py-1 rounded-xs text-ink focus:border-rust outline-none"
                        />
                      )}
                    </div>

                    {/* Step Navigation: Back to photos & Save */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setStudioStep('photos')}
                        className="px-4 py-2.5 border border-line bg-paper hover:bg-paper-light text-ink rounded-xs font-display text-xs transition"
                      >
                        ← Back to Photos
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isExporting}
                        className="flex-1 py-2.5 bg-rust hover:bg-rust-dark text-paper-light rounded-xs font-display font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-print disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5 text-paper-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Save Photo Strip</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Desktop Preview Stage - Auto-fitted to 100% with ZERO scroll */}
          <div className={`hidden md:flex flex-col items-center ${
            activeLayout.id === 'wide-8'
              ? 'w-[52%] lg:w-[56%]'
              : 'w-[46%] lg:w-[44%]'
          } border-l border-line/70 bg-paper/30 p-2 sm:p-3 overflow-hidden shrink-0 select-none transition-all duration-300`}>
            <div className="w-full flex items-center justify-between mb-1 px-1 shrink-0">
              <span className="font-stamp text-[11px] text-ink/70">
                Preview {activeLayout.id === 'wide-8' ? '• Wide Landscape' : ''}
              </span>
              <span className="font-stamp text-[10px] text-rust/80 flex items-center gap-1">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="5 9 2 12 5 15"/>
                  <polyline points="9 5 12 2 15 5"/>
                  <polyline points="15 19 12 22 9 19"/>
                  <polyline points="19 9 22 12 19 15"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
                <span>Drag to relocate</span>
              </span>
            </div>

            <div
              ref={previewStageRef}
              className="w-full flex-1 flex items-center justify-center overflow-hidden min-h-0 relative"
            >
              <div
                style={{
                  transform: `scale(${stageScale})`,
                  transformOrigin: 'center center',
                  transition: 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                className="flex flex-col items-center justify-center shrink-0"
              >
                <div
                  ref={stripCardRef}
                  className={
                    activeLayout.id === 'wide-8'
                      ? 'w-[580px] sm:w-[640px] lg:w-[700px]'
                      : 'w-[280px] sm:w-[300px]'
                  }
                >
                  {renderPhotoStripCard(true)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Studio Bottom Bar - Always Accessible */}
        <div className="px-4 sm:px-6 py-3 border-t border-line/70 bg-paper/80 flex items-center justify-between gap-3 shrink-0">
          {exportMessage ? (
            <div
              className={`font-display text-xs flex items-center gap-1.5 ${
                discordSuccess ? 'text-[#5865F2]' : 'text-rust'
              }`}
            >
              {isSendingDiscord || isExporting ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : discordSuccess ? (
                <svg className="w-3.5 h-3.5 text-[#5865F2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
              <span>{exportMessage}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSendToDiscord}
              disabled={isExporting || isSendingDiscord}
              className={`px-3.5 py-2 border rounded-xs font-display text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                discordSuccess
                  ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2] font-medium'
                  : 'border-line bg-paper hover:bg-paper-light text-ink'
              }`}
              title="Send photo strip directly to Discord server"
            >
              {isSendingDiscord ? (
                <svg
                  className="w-3.5 h-3.5 animate-spin text-[#5865F2]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              )}
              <span>{isSendingDiscord ? 'Sending...' : discordSuccess ? 'Sent!' : 'Send to Discord'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="px-4 py-2 bg-rust hover:bg-rust-dark text-paper-light font-display font-medium text-xs rounded-xs shadow-print hover:shadow-md transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <svg
                className="w-3.5 h-3.5 text-paper-light"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Save Photo Strip</span>
            </button>
          </div>
        </div>

        {/* PHOTO PICKER DRAWER (Multi-select photo library with progress counter, Done & Cancel) */}
        {activeSlotPickerIndex !== null && (
          <div className="absolute inset-0 z-30 bg-ink/80 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
            <div className="bg-paper-light border-t border-line flex flex-col max-h-[85vh] sm:max-h-[80vh] rounded-t-sm shadow-2xl overflow-hidden animate-studio-reveal">
              {/* Drawer Top Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-line/70 bg-paper/60 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <h3 className="font-display font-medium text-ink text-sm sm:text-base truncate">
                    Select Photos
                  </h3>
                  <span className="font-stamp text-[10px] sm:text-[11px] text-rust bg-rust/10 border border-rust/20 px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {filledSlotsCount} / {activeLayout.slots} Selected
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelPicker}
                    className="px-3.5 py-1.5 border border-line bg-paper hover:bg-paper-light text-ink/80 hover:text-ink rounded-xs font-display text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDonePicker}
                    className="px-4 py-1.5 bg-rust hover:bg-rust-dark text-paper-light font-display font-medium text-xs rounded-xs shadow-print transition flex items-center gap-1.5"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Done</span>
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-paper border-b border-line/40 h-1 overflow-hidden shrink-0">
                <div
                  className="bg-rust h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.min(100, (filledSlotsCount / activeLayout.slots) * 100)}%`,
                  }}
                />
              </div>

              {/* Strip Slots Preview Bar */}
              <div className="px-4 sm:px-6 py-2 border-b border-line/50 bg-paper-light/70 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
                <span className="font-stamp text-[10px] text-ink/50 uppercase tracking-wider shrink-0 mr-1">
                  Slots:
                </span>
                {Array.from({ length: activeLayout.slots }).map((_, idx) => {
                  const item = slotItems[idx];
                  const imgSrc = item?.previewUrl || item?.url;
                  const isCurrent = activeSlotPickerIndex === idx;

                  return (
                    <div
                      key={`drawer-slot-${idx}`}
                      onClick={() => setActiveSlotPickerIndex(idx)}
                      className={`group relative h-11 w-11 sm:h-12 sm:w-12 rounded-xs border shrink-0 cursor-pointer p-0.5 transition-all duration-200 flex flex-col items-center justify-center overflow-hidden ${
                        isCurrent
                          ? 'ring-2 ring-rust border-rust bg-rust/10 shadow-xs scale-105'
                          : imgSrc
                          ? 'border-line bg-paper hover:border-ink/40'
                          : 'border-dashed border-line/80 bg-paper/40 hover:bg-paper'
                      }`}
                      title={imgSrc ? `Slot ${idx + 1} (Click to focus/change)` : `Slot ${idx + 1} (Empty)`}
                    >
                      {imgSrc ? (
                        <>
                          <img
                            src={imgSrc}
                            alt={`Slot ${idx + 1}`}
                            className="w-full h-full object-cover rounded-[1px]"
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-ink/75 text-paper-light font-stamp text-[8px] text-center leading-tight">
                            #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeselectPhotoFromSlot(idx, e)}
                            title="Remove from slot"
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rust text-paper-light rounded-full flex items-center justify-center text-[9px] shadow-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-stamp text-[10px] text-ink/40">+</span>
                          <span className="font-stamp text-[8px] text-ink/40">#{idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Photo Grid from Archive */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 sm:p-5 min-h-[160px]">
                {photoItems.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="font-display italic text-ink/70 text-sm">
                      No developed photos found in our Memoir reel yet.
                    </p>
                    <p className="font-display text-xs text-ink/50 mt-1">
                      Upload some photos to Memoir first to craft photo strips!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                    {photoItems.map((photo) => {
                      const assignedSlots = slotPhotoIds
                        .map((id, i) => (id === photo.id ? i : -1))
                        .filter((i) => i !== -1);
                      const isSelected = assignedSlots.length > 0;
                      const isFocusedSlot =
                        activeSlotPickerIndex !== null &&
                        slotPhotoIds[activeSlotPickerIndex] === photo.id;
                      const isSelectingThis = selectingPhotoId === photo.id;

                      return (
                        <button
                          key={photo.id}
                          type="button"
                          disabled={Boolean(selectingPhotoId)}
                          onClick={() => handleSelectPhotoForSlot(photo.id)}
                          className={`group relative aspect-square rounded-xs border p-1 bg-paper transition-all duration-200 flex flex-col items-center justify-center overflow-hidden text-left ${
                            isSelectingThis || isFocusedSlot
                              ? 'ring-2 ring-rust border-rust shadow-md scale-[1.02]'
                              : isSelected
                              ? 'border-rust/60 ring-1 ring-rust/30 bg-rust/5 shadow-2xs hover:scale-[1.02]'
                              : 'border-line hover:border-ink hover:scale-[1.02]'
                          }`}
                        >
                          <img
                            src={photo.previewUrl || photo.url}
                            alt={photo.name || 'Memory'}
                            className="w-full h-full object-cover rounded-2xs transition-all duration-200"
                          />

                          {/* Selection indicator pill */}
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-rust text-paper-light rounded-full pl-1.5 pr-1 py-0.5 shadow-xs text-[9px] sm:text-[10px] font-display font-medium pointer-events-auto">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>
                                {assignedSlots.length === 1
                                  ? `#${assignedSlots[0] + 1}`
                                  : `${assignedSlots.length}x`}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeselectPhotoFromSlot(
                                    assignedSlots[assignedSlots.length - 1],
                                    e
                                  );
                                }}
                                title="Remove one instance"
                                className="w-3.5 h-3.5 rounded-full bg-paper-light/20 hover:bg-paper-light/40 flex items-center justify-center text-paper-light transition"
                              >
                                <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </span>
                            </div>
                          )}

                          {/* Quick tap feedback */}
                          <div className="absolute inset-0 bg-ink/20 opacity-0 group-hover:opacity-100 transition flex items-end p-1.5 pointer-events-none">
                            <span className="font-display text-[9px] text-paper-light bg-ink/80 px-1.5 py-0.5 rounded-2xs">
                              {isSelected ? '+ Select again' : 'Select'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drawer Bottom Sticky Action Bar */}
              <div className="px-4 sm:px-6 py-3 border-t border-line/70 bg-paper/90 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCancelPicker}
                  className="px-4 py-2 border border-line bg-paper hover:bg-paper-light text-ink rounded-xs font-display text-xs transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-display text-ink/70 hidden sm:inline">
                    {filledSlotsCount === activeLayout.slots
                      ? 'Ready to develop!'
                      : `Pick ${activeLayout.slots - filledSlotsCount} more photo${
                          activeLayout.slots - filledSlotsCount === 1 ? '' : 's'
                        }`}
                  </span>
                  <span className="font-stamp text-[11px] text-rust font-medium">
                    {filledSlotsCount} / {activeLayout.slots} Selected
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDonePicker}
                  className="px-5 py-2 bg-rust hover:bg-rust-dark text-paper-light font-display font-medium text-xs rounded-xs shadow-print transition flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>

      {/* Dedicated Fullscreen Preview & Arrange Modal (completely isolated at root z-[100]) */}
      {isMobilePreviewExpanded && (
        <div className="fixed inset-0 z-[100] bg-paper-light flex flex-col animate-in fade-in duration-200">
          {/* Modal Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-paper shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xs bg-rust/10 border border-rust/25 flex items-center justify-center text-rust shrink-0">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="7" y="2" width="10" height="20" rx="1.5" />
                  <line x1="7" y1="8" x2="17" y2="8" />
                  <line x1="7" y1="14" x2="17" y2="14" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-medium text-ink text-sm leading-tight">
                  Photo Strip Preview
                </h3>
                <p className="font-display italic text-[11px] text-ink/65 leading-none mt-0.5">
                  Drag photos to relocate or swap • Tap a photo to remove
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobilePreviewExpanded(false);
                setActiveRemoveSlotIdx(null);
              }}
              className="px-3.5 py-1.5 bg-rust hover:bg-rust-dark text-paper-light font-display font-medium text-xs rounded-xs shadow-print flex items-center gap-1 transition"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Done</span>
            </button>
          </div>

          {/* Stage Area: Centered, spacious, natural scale (100%), no squishing */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col items-center justify-center min-h-0 bg-paper/30">
            <div className={`w-full ${
              activeLayout.id === 'wide-8' ? 'max-w-[460px]' : 'max-w-[310px]'
            } flex flex-col items-center my-auto transition-all`}>
              {renderPhotoStripCard(true)}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Drag Thumbnail Follower */}
      {touchDraggingSlotIndex !== null && touchCurrentPos && slotPhotoIds[touchDraggingSlotIndex] && (
        <div
          style={{
            left: `${touchCurrentPos.x}px`,
            top: `${touchCurrentPos.y}px`,
          }}
          className="fixed z-[120] pointer-events-none -translate-x-1/2 -translate-y-[135%] transition-transform duration-75"
        >
          <div className="w-16 h-12 bg-paper-light border-2 border-rust shadow-2xl rounded-[2px] overflow-hidden flex items-center justify-center ring-4 ring-black/25">
            {slotItems[touchDraggingSlotIndex] && (
              <img
                src={slotItems[touchDraggingSlotIndex]?.previewUrl || slotItems[touchDraggingSlotIndex]?.url || ''}
                alt="Moving photo"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="bg-rust text-paper-light font-stamp text-[8px] text-center px-1 rounded-2xs mt-0.5 shadow-xs">
            Relocating
          </div>
        </div>
      )}
    </>
  );
}

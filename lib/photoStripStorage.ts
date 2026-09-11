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

export interface PhotoStripDraft {
  version: 1;
  layoutId: StripLayoutId;
  themeId: StripThemeId;
  filterId: StripFilterId;
  stampId: StripStampId;
  studioStep: StudioStep;
  slotPhotoIds: (string | null)[];
  slotZooms: number[];
  slotPositionsY?: number[];
  headerText: string;
  showHeader: boolean;
  primaryFooter: string;
  secondaryFooter: string;
  showDate: boolean;
  customDate: string;
  updatedAt: number;
  wasOpen: boolean;
}

export const PHOTO_STRIP_STORAGE_KEY = 'memoir_photostrip_draft_v1';

export function loadPhotoStripDraft(): PhotoStripDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PHOTO_STRIP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.slotPhotoIds)) {
      return parsed as PhotoStripDraft;
    }
  } catch (err) {
    console.warn('Failed to parse photo strip draft from cache:', err);
  }
  return null;
}

export function savePhotoStripDraft(draft: Omit<PhotoStripDraft, 'version' | 'updatedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const fullDraft: PhotoStripDraft = {
      ...draft,
      version: 1,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PHOTO_STRIP_STORAGE_KEY, JSON.stringify(fullDraft));
  } catch (err) {
    console.warn('Failed to save photo strip draft to cache:', err);
  }
}

export function updateDraftWasOpen(wasOpen: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const draft = loadPhotoStripDraft();
    if (draft) {
      draft.wasOpen = wasOpen;
      draft.updatedAt = Date.now();
      localStorage.setItem(PHOTO_STRIP_STORAGE_KEY, JSON.stringify(draft));
    }
  } catch (err) {
    console.warn('Failed to update draft wasOpen state:', err);
  }
}

export function clearPhotoStripDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PHOTO_STRIP_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear photo strip draft:', err);
  }
}

export function isDraftMeaningful(draft: PhotoStripDraft | null): boolean {
  if (!draft) return false;
  // Has chosen photos
  const hasPhotos = draft.slotPhotoIds.some((id) => Boolean(id));
  if (hasPhotos) return true;

  // Has non-default text or configuration
  if (draft.primaryFooter && draft.primaryFooter !== 'together since 01/07/26') return true;
  if (draft.secondaryFooter && draft.secondaryFooter !== 'captured with love') return true;
  if (draft.showHeader && draft.headerText) return true;
  if (draft.studioStep !== 'style') return true;
  if (draft.layoutId !== 'classic-4') return true;
  if (draft.themeId !== 'lovely') return true;

  return false;
}

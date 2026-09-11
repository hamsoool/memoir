export function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function fileKind(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

export function stampTime(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${mm}/${dd}/${yy}  ${h}:${m}${ampm}`;
}

export function truncateName(name: string, max = 22): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > -1 ? name.slice(dot) : '';
  const base = dot > -1 ? name.slice(0, dot) : name;
  const keep = Math.max(4, max - ext.length - 1);
  return `${base.slice(0, keep)}…${ext}`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStringOrDate?: string | Date): string {
  if (!dateStringOrDate) return stampTime();
  const d = new Date(dateStringOrDate);
  if (isNaN(d.getTime())) return stampTime();
  return stampTime(d);
}

export interface MemoryDeckGroup {
  id: string;
  title: string;
  subtitle: string;
  items: import('./types').UploadItem[];
}

export function groupMemories(
  items: import('./types').UploadItem[],
  sortField: 'date' | 'size' | 'type',
  sortOrder: 'desc' | 'asc',
  dateGrouping: 'month' | 'day' = 'month'
): MemoryDeckGroup[] {
  if (items.length === 0) return [];

  const map = new Map<string, import('./types').UploadItem[]>();

  for (const item of items) {
    let key = '';
    if (sortField === 'date') {
      const rawDate = item.capturedAt || item.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          if (dateGrouping === 'day') {
            key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
          } else {
            key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
        } else {
          key = 'Undated';
        }
      } else {
        key = 'Recently Added';
      }
    } else if (sortField === 'type') {
      key = item.kind === 'image' ? 'Photos' : 'Videos';
    } else if (sortField === 'size') {
      const bytes = item.bytes || item.file?.size || 0;
      if (bytes < 1024 * 1024) {
        key = 'Snapshots (< 1 MB)';
      } else if (bytes < 10 * 1024 * 1024) {
        key = 'High-Res Moments (1 MB – 10 MB)';
      } else {
        key = 'Reels & Extended Clips (> 10 MB)';
      }
    }

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(item);
  }

  const groups: MemoryDeckGroup[] = [];

  for (const [title, groupItems] of map.entries()) {
    groupItems.sort((a, b) => {
      const timeA = new Date(a.capturedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.capturedAt || b.createdAt || 0).getTime();
      const sizeA = a.bytes || a.file?.size || 0;
      const sizeB = b.bytes || b.file?.size || 0;

      if (sortField === 'date') {
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      }
      if (sortField === 'size') {
        return sortOrder === 'desc' ? sizeB - sizeA : sizeA - sizeB;
      }
      return timeB - timeA;
    });

    const photoCount = groupItems.filter((i) => i.kind === 'image').length;
    const videoCount = groupItems.filter((i) => i.kind === 'video').length;
    let subtitle = `${groupItems.length} ${groupItems.length === 1 ? 'memory' : 'memories'}`;
    if (photoCount > 0 && videoCount > 0) {
      subtitle = `${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}, ${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`;
    }

    groups.push({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      subtitle,
      items: groupItems,
    });
  }

  // Sort groups themselves based on date / preference
  if (sortField === 'date') {
    groups.sort((a, b) => {
      const timeA = new Date(a.items[0]?.capturedAt || a.items[0]?.createdAt || 0).getTime();
      const timeB = new Date(b.items[0]?.capturedAt || b.items[0]?.createdAt || 0).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  } else if (sortField === 'type') {
    groups.sort((a, b) => {
      const isAPhoto = a.title === 'Photos';
      const pref = sortOrder === 'desc' ? isAPhoto : !isAPhoto;
      return pref ? -1 : 1;
    });
  }

  return groups;
}

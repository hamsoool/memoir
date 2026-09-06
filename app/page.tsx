'use client';

import { useCallback, useEffect, useState } from 'react';
import FilmHeader from '@/components/FilmHeader';
import DropZone from '@/components/DropZone';
import UploadGrid from '@/components/UploadGrid';
import AccessGate, { isAlreadyUnlocked } from '@/components/AccessGate';
import { uploadFile } from '@/lib/uploadClient';
import { fileKind, makeId } from '@/lib/format';
import type { UploadItem } from '@/lib/types';

export default function Page() {
  const needsGate = Boolean(process.env.NEXT_PUBLIC_ACCESS_CODE);
  const [unlocked, setUnlocked] = useState(!needsGate);
  const [items, setItems] = useState<UploadItem[]>([]);

  useEffect(() => {
    if (needsGate && isAlreadyUnlocked()) setUnlocked(true);
  }, [needsGate]);

  const startUpload = useCallback((item: UploadItem) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: 0, error: undefined } : i))
    );

    uploadFile(
      item.file,
      (percent) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: percent } : i))
        );
      }
    )
      .then((res) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'done', progress: 100, url: res.url, key: res.key }
              : i
          )
        );
      })
      .catch((err: Error) => {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: err.message } : i
          )
        );
      });
  }, []);

  const handleFiles = useCallback(
    (files: FileList) => {
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
      }));

      setItems((prev) => [...prev, ...newItems]);
      newItems.forEach(startUpload);
    },
    [startUpload]
  );

  function handleRemove(id: string) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function handleRetry(id: string) {
    const item = items.find((i) => i.id === id);
    if (item) startUpload(item);
  }

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <main className="min-h-dvh px-5 sm:px-8 lg:px-12 py-8 sm:py-12 max-w-5xl mx-auto">
      <div className="sprocket-strip mb-8" />

      <FilmHeader count={items.length} />

      <section className="mb-12">
        <DropZone onFiles={handleFiles} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display italic text-2xl text-ink">The reel so far</h2>
          {items.length > 0 && (
            <p className="font-stamp text-[11px] text-ink/50">
              {items.length} {items.length === 1 ? 'shot' : 'shots'}
            </p>
          )}
        </div>
        <UploadGrid items={items} onRemove={handleRemove} onRetry={handleRetry} />
      </section>

      <div className="sprocket-strip mt-12" />
      <p className="text-center font-stamp text-[11px] text-ink/40 mt-4">
        This memoir stays between the two of us.
      </p>
    </main>
  );
}

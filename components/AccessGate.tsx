'use client';

import { FormEvent, useState } from 'react';

const SESSION_KEY = 'memoir-unlocked';

export function isAlreadyUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(SESSION_KEY) === 'true';
}

export default function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ACCESS_CODE;
    if (!expected || code === expected) {
      window.sessionStorage.setItem(SESSION_KEY, 'true');
      onUnlock();
    } else {
      setWrong(true);
      setCode('');
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-paper-light border border-line rounded-sm shadow-print px-7 py-9 text-center"
      >
        <p className="font-stamp text-[11px] text-ink/50 mb-3">private reel</p>
        <h1 className="font-display italic text-3xl text-ink mb-2">Enter the darkroom</h1>
        <p className="text-sm text-ink/70 mb-6 leading-relaxed">
          This memoir is just for the two of us. Enter the passcode to get in.
        </p>
        <input
          autoFocus
          type="password"
          inputMode="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setWrong(false);
          }}
          placeholder="Passcode"
          className="w-full text-center bg-paper border border-line rounded-sm px-4 py-3 text-ink font-stamp tracking-widest placeholder:text-ink/30 focus:border-rust transition-colors"
        />
        {wrong && (
          <p className="text-rust text-sm mt-3">That&apos;s not it — try again.</p>
        )}
        <button
          type="submit"
          className="mt-5 w-full bg-rust hover:bg-rust-dark active:scale-[0.98] transition text-paper-light rounded-sm py-3 font-medium"
        >
          Unlock
        </button>
      </form>
    </main>
  );
}

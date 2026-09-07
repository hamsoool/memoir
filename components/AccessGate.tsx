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
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setIsVerifying(true);
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (data.ok) {
        window.sessionStorage.setItem(SESSION_KEY, 'true');
        onUnlock();
      } else {
        setWrong(true);
        setCode('');
      }
    } catch {
      // Offline fallback
      const expected = process.env.NEXT_PUBLIC_ACCESS_CODE?.trim();
      if (!expected || code.trim() === expected) {
        window.sessionStorage.setItem(SESSION_KEY, 'true');
        onUnlock();
      } else {
        setWrong(true);
        setCode('');
      }
    } finally {
      setIsVerifying(false);
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
          disabled={isVerifying}
          className="w-full text-center bg-paper border border-line rounded-sm px-4 py-3 text-ink font-stamp tracking-widest placeholder:text-ink/30 focus:border-rust transition-colors"
        />
        {wrong && (
          <p className="text-rust text-sm mt-3">That&apos;s not it — try again.</p>
        )}
        <button
          type="submit"
          disabled={isVerifying}
          className="mt-5 w-full bg-rust hover:bg-rust-dark active:scale-[0.98] transition text-paper-light rounded-sm py-3 font-medium disabled:opacity-60"
        >
          {isVerifying ? 'Checking passcode…' : 'Unlock'}
        </button>

        <p className="font-stamp text-[10px] text-ink/40 mt-4 flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3 text-ink/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Remembers your device & IP for 90 days</span>
        </p>
      </form>
    </main>
  );
}

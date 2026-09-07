'use client';

import { FormEvent, useEffect, useState } from 'react';

const SESSION_KEY = 'memoir-unlocked';

export function isAlreadyUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(SESSION_KEY) === 'true';
}

interface AccessGateProps {
  onUnlock: () => void;
  initialBanned?: boolean;
  initialTimeoutSeconds?: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AccessGate({
  onUnlock,
  initialBanned = false,
  initialTimeoutSeconds = 0,
}: AccessGateProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(initialBanned);
  const [timeoutSeconds, setTimeoutSeconds] = useState(initialTimeoutSeconds);

  // Sync initial props
  useEffect(() => {
    if (initialBanned) setIsBanned(true);
  }, [initialBanned]);

  useEffect(() => {
    if (initialTimeoutSeconds > 0) setTimeoutSeconds(initialTimeoutSeconds);
  }, [initialTimeoutSeconds]);

  // Live countdown timer for 5-minute timeout
  useEffect(() => {
    if (timeoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimeoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeoutSeconds]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || timeoutSeconds > 0 || isBanned) return;

    try {
      setIsVerifying(true);
      setErrorMessage(null);

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
        if (data.banned) {
          setIsBanned(true);
        } else if (data.timedOut) {
          setTimeoutSeconds(data.remainingSeconds || 300);
          setErrorMessage(
            data.error || 'Too many incorrect attempts. Device is timed out for 5 minutes.'
          );
        } else {
          setErrorMessage(data.error || 'Incorrect passcode — please try again.');
        }
        setCode('');
      }
    } catch {
      // Offline fallback
      const expected = process.env.NEXT_PUBLIC_ACCESS_CODE?.trim();
      if (!expected || code.trim() === expected) {
        window.sessionStorage.setItem(SESSION_KEY, 'true');
        onUnlock();
      } else {
        setErrorMessage('Incorrect passcode — please try again.');
        setCode('');
      }
    } finally {
      setIsVerifying(false);
    }
  }

  // 1. Permanent Ban Screen (after 20 failed attempts)
  if (isBanned) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-6">
        <div className="w-full max-w-xs bg-paper-light border border-rust/40 rounded-sm shadow-print px-7 py-9 text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rust/10 flex items-center justify-center text-rust">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <p className="font-stamp text-[10px] text-rust uppercase tracking-widest mb-1.5">
            security notice
          </p>
          <h1 className="font-display italic text-2xl text-ink mb-2">
            Access Restricted
          </h1>
          <p className="text-xs text-ink/75 leading-relaxed">
            This device and network have been permanently blocked after 20 unauthorized attempts to access this reel.
          </p>
        </div>
      </main>
    );
  }

  // 2. Normal Gate or Active 5-minute Timeout Screen
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs bg-paper-light border border-line rounded-sm shadow-print px-7 py-9 text-center"
      >
        <p className="font-stamp text-[11px] text-ink/50 mb-3">private reel</p>
        <h1 className="font-display italic text-3xl text-ink mb-2">Enter our memories</h1>
        <p className="text-sm text-ink/70 mb-6 leading-relaxed">
          This memoir is just for the two of us. Enter the passcode to get in.
        </p>

        {/* 5-minute Timeout Banner */}
        {timeoutSeconds > 0 && (
          <div className="p-3 bg-rust/10 border border-rust/30 rounded-xs text-rust text-center space-y-1 mb-4 animate-scale-up">
            <p className="font-stamp text-[10px] uppercase tracking-widest">
              security cooldown active
            </p>
            <p className="font-stamp text-xl font-bold tracking-wider">
              {formatTime(timeoutSeconds)}
            </p>
            <p className="text-[11px] text-ink/75 leading-tight font-display italic">
              Too many incorrect attempts. Please wait for the cooldown timer before trying again.
            </p>
          </div>
        )}

        <input
          autoFocus={timeoutSeconds === 0}
          type="password"
          inputMode="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErrorMessage(null);
          }}
          placeholder={timeoutSeconds > 0 ? 'Locked' : 'Passcode'}
          disabled={isVerifying || timeoutSeconds > 0}
          className="w-full text-center bg-paper border border-line rounded-sm px-4 py-3 text-ink font-stamp tracking-widest placeholder:text-ink/30 focus:border-rust transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {errorMessage && timeoutSeconds === 0 && (
          <p className="text-rust text-xs mt-2.5 font-stamp leading-relaxed">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isVerifying || timeoutSeconds > 0 || !code.trim()}
          className="mt-5 w-full bg-rust hover:bg-rust-dark active:scale-[0.98] transition text-paper-light rounded-sm py-3 font-display italic font-medium text-base disabled:opacity-60 shadow-xs flex items-center justify-center gap-2"
        >
          {timeoutSeconds > 0
            ? `Cooldown (${formatTime(timeoutSeconds)})`
            : isVerifying
            ? 'Checking passcode…'
            : 'Unlock'}
        </button>

        <p className="font-stamp text-[10px] text-ink/40 mt-4 flex items-center justify-center gap-1.5">
          <svg
            className="w-3 h-3 text-ink/40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Remembers your device & IP for 90 days</span>
        </p>
      </form>
    </main>
  );
}

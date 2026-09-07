export default function FilmHeader({
  count,
  onLock,
}: {
  count: number;
  onLock?: () => void;
}) {
  return (
    <header className="flex items-start justify-between mb-6 sm:mb-7">
      <div className="text-left">
        <p className="font-stamp text-[11px] sm:text-xs text-ink/50 mb-1.5">
          exposure {String(count).padStart(3, '0')}
        </p>
        <h1 className="font-display italic font-medium text-3xl sm:text-4xl text-ink leading-none">
          Memoir
        </h1>
        <p className="text-ink/75 mt-2 max-w-md leading-relaxed text-xs sm:text-sm font-display italic">
          A quiet reel for our favorite memories, kept safe and timeless between the two of us.
        </p>
      </div>
      {onLock && (
        <button
          type="button"
          onClick={onLock}
          title="Lock the darkroom"
          className="font-stamp text-[11px] text-ink/40 hover:text-ink border border-line/60 hover:border-ink/40 px-2 py-1 rounded-xs transition flex items-center gap-1.5 mt-1"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          lock
        </button>
      )}
    </header>
  );
}

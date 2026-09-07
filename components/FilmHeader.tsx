export default function FilmHeader({
  count,
  onLock,
}: {
  count: number;
  onLock?: () => void;
}) {
  return (
    <header className="relative mb-6 sm:mb-7 text-center">
      {onLock && (
        <button
          type="button"
          onClick={onLock}
          title="Lock memories"
          className="absolute right-0 top-0 font-stamp text-[11px] text-ink/40 hover:text-ink border border-line/60 hover:border-ink/40 px-2 py-1 rounded-xs transition flex items-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <span className="hidden sm:inline">lock</span>
        </button>
      )}

      <p className="font-stamp text-[11px] sm:text-xs text-ink/50 mb-1.5 tracking-wider">
        together since 01/07/26
      </p>
      <h1 className="font-display italic font-medium text-4xl sm:text-5xl text-ink leading-none tracking-tight">
        Memoir
      </h1>
      <p className="text-ink/75 mt-2 max-w-md mx-auto leading-relaxed text-xs sm:text-sm font-display italic">
        A quiet reel for our favorite memories, kept safe and timeless between the two of us.
      </p>
    </header>
  );
}

export default function FilmHeader({ count }: { count: number }) {
  return (
    <header className="text-left mb-6 sm:mb-7">
      <p className="font-stamp text-[11px] sm:text-xs text-ink/50 mb-1.5">
        exposure {String(count).padStart(3, '0')}
      </p>
      <h1 className="font-display italic font-medium text-3xl sm:text-4xl text-ink leading-none">
        Memoir
      </h1>
      <p className="text-ink/75 mt-2 max-w-md leading-relaxed text-xs sm:text-sm font-display italic">
        A quiet reel for our favorite memories, kept safe and timeless between the two of us.
      </p>
    </header>
  );
}

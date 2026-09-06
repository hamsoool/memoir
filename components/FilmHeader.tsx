export default function FilmHeader({ count }: { count: number }) {
  return (
    <header className="text-left mb-8">
      <p className="font-stamp text-xs text-ink/50 mb-2">
        exposure {String(count).padStart(3, '0')}
      </p>
      <h1 className="font-display italic font-medium text-4xl sm:text-5xl text-ink leading-none">
        Memoir
      </h1>
      <p className="text-ink/70 mt-3 max-w-sm leading-relaxed">
        Drop a photo or video below — it develops straight into our private
        reel.
      </p>
    </header>
  );
}

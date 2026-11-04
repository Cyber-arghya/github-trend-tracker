export const LANGUAGE_COLORS: Record<string, string> = {
  Python: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  TypeScript: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  JavaScript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Rust: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Go: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  C: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  'C++': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  HTML: 'bg-red-500/10 text-red-400 border-red-500/20',
  Shell: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Unknown: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export const CATALOG_PAGE_SIZE = 25;

export const parseStars = (str: string): number => {
  if (!str) return 0;
  const clean = str.replace(/[^0-9]/g, '');
  return parseInt(clean, 10) || 0;
};

export const scrollElement = (el: HTMLDivElement | null, offset: number) => {
  if (el) {
    el.scrollBy({ left: offset, behavior: 'smooth' });
  }
};

export const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
  if (e.deltaY !== 0) {
    e.currentTarget.scrollLeft += e.deltaY * 1.5;
  }
};


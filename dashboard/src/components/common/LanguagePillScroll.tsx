import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LanguageCount } from '../../types';
import { scrollElement, handleWheelScroll } from '../../constants/theme';

interface LanguagePillScrollProps {
  languages: LanguageCount[];
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

export const LanguagePillScroll: React.FC<LanguagePillScrollProps> = ({
  languages,
  selectedLanguage,
  onSelectLanguage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => scrollElement(containerRef.current, -250)}
        className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md mr-1.5 shrink-0"
        title="Scroll Left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={containerRef}
        onWheel={handleWheelScroll}
        className="flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth select-none cursor-grab active:cursor-grabbing w-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        title="Scroll with mouse wheel"
      >
        {languages.map(({ name, count }) => {
          const isSelected = selectedLanguage === name;
          return (
            <button
              key={name}
              onClick={() => onSelectLanguage(name)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              <span>{name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected ? 'bg-indigo-500/40 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scrollElement(containerRef.current, 250)}
        className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md ml-1.5 shrink-0"
        title="Scroll Right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

import React from 'react';
import { TrendingUp, Sparkles, BookOpen } from 'lucide-react';
import type { ActiveTab } from '../types';

interface NavigationTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  catalogCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  catalogCount,
}) => {
  return (
    <div className="flex border-b border-slate-800 space-x-8">
      <button
        onClick={() => onTabChange('trending')}
        className={`pb-4 px-1 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
          activeTab === 'trending'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
      >
        <TrendingUp className="h-4 w-4" />
        <span>Trending Snapshots</span>
      </button>

      <button
        onClick={() => onTabChange('summaries')}
        className={`pb-4 px-1 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
          activeTab === 'summaries'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span>AI DevOps & ML Analysis</span>
      </button>

      <button
        onClick={() => onTabChange('catalog')}
        className={`pb-4 px-1 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
          activeTab === 'catalog'
            ? 'border-indigo-500 text-indigo-400'
            : 'border-transparent text-slate-400 hover:text-slate-200'
        }`}
      >
        <BookOpen className="h-4 w-4" />
        <span>Repository Catalog ({catalogCount})</span>
      </button>
    </div>
  );
};

import React from 'react';
import {
  Search,
  Filter,
  Flame,
  RotateCcw,
  Star,
  Code2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import type {
  TrendingSnapshot,
  PeriodType,
  TrendingSortField,
  SortOrder,
  StatusFilter,
  LanguageCount,
} from '../../types';
import { LANGUAGE_COLORS } from '../../constants/theme';
import { LanguagePillScroll } from '../common/LanguagePillScroll';

interface SnapshotsTabProps {
  loading: boolean;
  selectedPeriod: PeriodType;
  setSelectedPeriod: (p: PeriodType) => void;
  selectedPeriodKey: string;
  setSelectedPeriodKey: (k: string) => void;
  availableKeys: string[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedLang: string;
  setSelectedLang: (l: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  trendingSortField: TrendingSortField;
  trendingSortOrder: SortOrder;
  handleTrendingSort: (field: TrendingSortField) => void;
  availableSnapshotLanguages: LanguageCount[];
  filteredSnapshots: TrendingSnapshot[];
}

export const SnapshotsTab: React.FC<SnapshotsTabProps> = ({
  loading,
  selectedPeriod,
  setSelectedPeriod,
  selectedPeriodKey,
  setSelectedPeriodKey,
  availableKeys,
  searchQuery,
  setSearchQuery,
  selectedLang,
  setSelectedLang,
  statusFilter,
  setStatusFilter,
  trendingSortField,
  trendingSortOrder,
  handleTrendingSort,
  availableSnapshotLanguages,
  filteredSnapshots,
}) => {
  return (
    <div className="space-y-6">
      {/* Filter & Period Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        {/* Period Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                selectedPeriod === period
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {period}
            </button>
          ))}

          {/* Period Key Selector */}
          {availableKeys.length > 0 && (
            <div className="relative inline-block ml-1">
              <select
                value={selectedPeriodKey}
                onChange={(e) => setSelectedPeriodKey(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 border border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                {availableKeys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search repository or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 text-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Quick Sort & Status Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/30 p-3.5 rounded-2xl border border-slate-800/60">
        {/* Status Filter (New vs Re-trending) */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center">
            <Filter className="h-3 w-3 mr-1 text-slate-400" /> Status:
          </span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
              statusFilter === 'new'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <Flame className="h-3 w-3 text-rose-400" />
            <span>New Entries</span>
          </button>
          <button
            onClick={() => setStatusFilter('retrending')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 ${
              statusFilter === 'retrending'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <RotateCcw className="h-3 w-3 text-cyan-400" />
            <span>Re-trending</span>
          </button>
        </div>

        {/* Quick Sort Options */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1">Sort by:</span>
          <button
            onClick={() => handleTrendingSort('rank')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              trendingSortField === 'rank' && trendingSortOrder === 'asc'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <span>Rank (#1 First)</span>
          </button>

          <button
            onClick={() => handleTrendingSort('stars')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              trendingSortField === 'stars' && trendingSortOrder === 'desc'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <Star className="h-3 w-3 text-amber-400" />
            <span>Stars (High → Low)</span>
          </button>

          <button
            onClick={() => handleTrendingSort('stars')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              trendingSortField === 'stars' && trendingSortOrder === 'asc'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <Star className="h-3 w-3 text-amber-400" />
            <span>Stars (Low → High)</span>
          </button>

          <button
            onClick={() => handleTrendingSort('is_new')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              trendingSortField === 'is_new' && trendingSortOrder === 'desc'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <Flame className="h-3 w-3 text-rose-400" />
            <span>New First</span>
          </button>

          <button
            onClick={() => handleTrendingSort('repo_name')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
              trendingSortField === 'repo_name' && trendingSortOrder === 'asc'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
          >
            <span>Name (A → Z)</span>
          </button>

          <button
            onClick={() => handleTrendingSort('language')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              trendingSortField === 'language'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
            }`}
            title="Group repos by language with most frequent language first"
          >
            <Code2 className="h-3 w-3 text-emerald-400" />
            <span>Language (Most First)</span>
          </button>
        </div>
      </div>

      {/* Language Filter Pills with Mouse Wheel Scroll */}
      <LanguagePillScroll
        languages={availableSnapshotLanguages}
        selectedLanguage={selectedLang}
        onSelectLanguage={setSelectedLang}
      />

      {/* Responsive Table Following Modern Web Guidance with Clickable Headers */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby="trending-table-caption"
        className="overflow-auto max-h-[650px] rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl backdrop-blur-sm"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption id="trending-table-caption" className="sr-only">
            GitHub Trending Repositories Table for {selectedPeriod} snapshot {selectedPeriodKey}
          </caption>
          <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              {/* Sortable Rank Header */}
              <th
                scope="col"
                className="py-3.5 px-4 text-center w-20 cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleTrendingSort('rank')}
                aria-sort={
                  trendingSortField === 'rank'
                    ? trendingSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center justify-center space-x-1.5 w-full">
                  <span>Rank</span>
                  {trendingSortField === 'rank' ? (
                    trendingSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              {/* Sortable Repository Header */}
              <th
                scope="col"
                className="py-3.5 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleTrendingSort('repo_name')}
                aria-sort={
                  trendingSortField === 'repo_name'
                    ? trendingSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center space-x-1.5">
                  <span>Repository</span>
                  {trendingSortField === 'repo_name' ? (
                    trendingSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              {/* Sortable Language Header (Groups same language, most frequent first) */}
              <th
                scope="col"
                className="py-3.5 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleTrendingSort('language')}
                aria-sort={
                  trendingSortField === 'language'
                    ? trendingSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center space-x-1.5">
                  <span>Language</span>
                  {trendingSortField === 'language' ? (
                    trendingSortOrder === 'desc' ? (
                      <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              {/* Sortable Stars Header */}
              <th
                scope="col"
                className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleTrendingSort('stars')}
                aria-sort={
                  trendingSortField === 'stars'
                    ? trendingSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center justify-end space-x-1.5 w-full">
                  <span>Stars</span>
                  {trendingSortField === 'stars' ? (
                    trendingSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              {/* Sortable Status Header */}
              <th
                scope="col"
                className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleTrendingSort('is_new')}
                aria-sort={
                  trendingSortField === 'is_new'
                    ? trendingSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center justify-center space-x-1.5 w-full">
                  <span>Status</span>
                  {trendingSortField === 'is_new' ? (
                    trendingSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-rose-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-rose-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              <th scope="col" className="py-3.5 px-4 text-center w-24">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading snapshots from Supabase...
                </td>
              </tr>
            ) : filteredSnapshots.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No trending repositories found matching your query.
                </td>
              </tr>
            ) : (
              filteredSnapshots.map((item) => {
                const langStyle =
                  LANGUAGE_COLORS[item.category_lang] ||
                  'bg-slate-500/10 text-slate-400 border-slate-500/20';

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Rank Column */}
                    <td className="py-3.5 px-4 text-center font-bold">
                      {item.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs shadow-sm">
                          🥇 1
                        </span>
                      ) : item.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/30 text-xs shadow-sm">
                          🥈 2
                        </span>
                      ) : item.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 text-xs shadow-sm">
                          🥉 3
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">#{item.rank}</span>
                      )}
                    </td>

                    {/* Repository Name & Link */}
                    <td className="py-3.5 px-4 font-medium text-white">
                      <a
                        href={`https://github.com/${item.repo_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-indigo-400 transition-colors inline-flex items-center space-x-1.5"
                      >
                        <span>{item.repo_name}</span>
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                      </a>
                    </td>

                    {/* Language Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${langStyle}`}
                      >
                        {item.category_lang || 'Unknown'}
                      </span>
                    </td>

                    {/* Total Stars */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-300">
                      <span className="inline-flex items-center space-x-1">
                        <Star className="h-3 w-3 text-amber-400" />
                        <span>{item.stars}</span>
                      </span>
                    </td>

                    {/* Entry Status */}
                    <td className="py-3.5 px-4 text-center">
                      {item.is_new ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Flame className="h-3 w-3 mr-1 text-rose-400" />
                          New Entry
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700/50">
                          <RotateCcw className="h-3 w-3 mr-1 text-slate-400" />
                          Re-trending
                        </span>
                      )}
                    </td>

                    {/* Quick GitHub Action Button */}
                    <td className="py-3.5 px-4 text-center">
                      <a
                        href={`https://github.com/${item.repo_name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline font-medium"
                      >
                        Inspect →
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React from 'react';
import {
  Search,
  Star,
  Calendar,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import type { Repository, CatalogSortField, SortOrder, LanguageCount } from '../../types';
import { LANGUAGE_COLORS } from '../../constants/theme';
import { LanguagePillScroll } from '../common/LanguagePillScroll';

interface CatalogTabProps {
  catalogRepos: Repository[];
  catalogTotal: number;
  catalogLoading: boolean;
  catalogLoadingMore: boolean;
  catalogHasMore: boolean;
  catalogSearch: string;
  setCatalogSearch: (s: string) => void;
  catalogLang: string;
  setCatalogLang: (l: string) => void;
  catalogSortField: CatalogSortField;
  catalogSortOrder: SortOrder;
  handleCatalogSort: (field: CatalogSortField) => void;
  handleCatalogTableScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  availableCatalogLanguages: LanguageCount[];
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalogRepos,
  catalogTotal,
  catalogLoading,
  catalogLoadingMore,
  catalogHasMore,
  catalogSearch,
  setCatalogSearch,
  catalogLang,
  setCatalogLang,
  catalogSortField,
  catalogSortOrder,
  handleCatalogSort,
  handleCatalogTableScroll,
  availableCatalogLanguages,
}) => {
  return (
    <div className="space-y-6">
      {/* Title & Total Count Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">Tracked Repositories Catalog</h3>
          <p className="text-xs text-slate-400">
            Comprehensive historical database of all repositories discovered by GitHub Trend Tracker.
          </p>
        </div>
        <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 self-start sm:self-auto">
          {catalogRepos.length} of {catalogTotal} Records
        </span>
      </div>

      {/* Filter & Quick Sort Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search repository or language..."
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            className="w-full bg-slate-950/80 text-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Quick Sort Options */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">Sort by:</span>
          <button
            onClick={() => handleCatalogSort('total_stars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              catalogSortField === 'total_stars' && catalogSortOrder === 'desc'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Star className="h-3 w-3 text-amber-400" />
            <span>Stars (High → Low)</span>
          </button>

          <button
            onClick={() => handleCatalogSort('total_stars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              catalogSortField === 'total_stars' && catalogSortOrder === 'asc'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Star className="h-3 w-3 text-amber-400" />
            <span>Stars (Low → High)</span>
          </button>

          <button
            onClick={() => handleCatalogSort('discovered_on')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              catalogSortField === 'discovered_on' && catalogSortOrder === 'desc'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Calendar className="h-3 w-3 text-cyan-400" />
            <span>Discovered (Newest)</span>
          </button>

          <button
            onClick={() => handleCatalogSort('discovered_on')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              catalogSortField === 'discovered_on' && catalogSortOrder === 'asc'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <Calendar className="h-3 w-3 text-cyan-400" />
            <span>Discovered (Oldest)</span>
          </button>

          <button
            onClick={() => handleCatalogSort('highest_rank_achieved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              catalogSortField === 'highest_rank_achieved' && catalogSortOrder === 'asc'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            <span>Rank (#1 First)</span>
          </button>
        </div>
      </div>

      {/* Language Filter Pills with Mouse Wheel Scroll */}
      <LanguagePillScroll
        languages={availableCatalogLanguages}
        selectedLanguage={catalogLang}
        onSelectLanguage={setCatalogLang}
      />

      {/* Infinite Scroll Table */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Repository Catalog Table"
        onScroll={handleCatalogTableScroll}
        className="overflow-auto max-h-[650px] rounded-2xl border border-slate-800 bg-slate-900/40 shadow-xl"
      >
        <table className="w-full border-collapse text-left text-sm">
          <thead className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th
                scope="col"
                className="py-3.5 px-4 text-center w-24 cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleCatalogSort('highest_rank_achieved')}
                aria-sort={
                  catalogSortField === 'highest_rank_achieved'
                    ? catalogSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center space-x-1.5">
                  <span>Best Rank</span>
                  {catalogSortField === 'highest_rank_achieved' ? (
                    catalogSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              <th
                scope="col"
                className="py-3.5 px-4 cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleCatalogSort('name')}
                aria-sort={
                  catalogSortField === 'name'
                    ? catalogSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center space-x-1.5">
                  <span>Repository Name</span>
                  {catalogSortField === 'name' ? (
                    catalogSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-indigo-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-indigo-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              <th scope="col" className="py-3.5 px-4">
                Language
              </th>

              <th
                scope="col"
                className="py-3.5 px-4 text-right cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleCatalogSort('total_stars')}
                aria-sort={
                  catalogSortField === 'total_stars'
                    ? catalogSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center justify-end space-x-1.5 w-full">
                  <span>Stars</span>
                  {catalogSortField === 'total_stars' ? (
                    catalogSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              <th
                scope="col"
                className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-white transition-colors group"
                onClick={() => handleCatalogSort('discovered_on')}
                aria-sort={
                  catalogSortField === 'discovered_on'
                    ? catalogSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
              >
                <div className="inline-flex items-center justify-center space-x-1.5 w-full">
                  <span>Discovered On</span>
                  {catalogSortField === 'discovered_on' ? (
                    catalogSortOrder === 'asc' ? (
                      <ArrowUp className="h-3.5 w-3.5 text-cyan-400" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />
                  )}
                </div>
              </th>

              <th scope="col" className="py-3.5 px-4 text-center w-24">
                Link
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {catalogLoading && catalogRepos.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                    <span className="text-xs">Loading repositories from Supabase...</span>
                  </div>
                </td>
              </tr>
            ) : catalogRepos.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  No repositories found matching your query.
                </td>
              </tr>
            ) : (
              catalogRepos.map((repo) => (
                <tr key={repo.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-center font-mono font-bold text-xs text-amber-400">
                    #{repo.highest_rank_achieved}
                  </td>
                  <td className="py-3 px-4 font-medium text-white">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-indigo-400 transition-colors"
                    >
                      {repo.name}
                    </a>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${
                        LANGUAGE_COLORS[repo.category_lang] || 'bg-slate-800 text-slate-300 border-slate-700/50'
                      }`}
                    >
                      {repo.category_lang || 'Unknown'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-200">
                    <span className="inline-flex items-center space-x-1">
                      <Star className="h-3 w-3 text-amber-400" />
                      <span>{repo.total_stars}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs text-cyan-400/90">
                    {repo.discovered_on}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center space-x-1"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Infinite Scroll Indicators */}
        {catalogLoadingMore && (
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center space-x-2 text-indigo-400 text-xs">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Loading more repositories from Supabase...</span>
          </div>
        )}
        {!catalogHasMore && catalogRepos.length > 0 && (
          <div className="p-3 bg-slate-900/40 border-t border-slate-800 text-center text-xs text-slate-500">
            ✓ All {catalogTotal} repositories loaded from Supabase
          </div>
        )}
      </div>
    </div>
  );
};

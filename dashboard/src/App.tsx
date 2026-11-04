import { useState } from 'react';
import type { ActiveTab } from './types';
import { useDashboardData } from './hooks/useDashboardData';
import { useTrendingFilter } from './hooks/useTrendingFilter';
import { useCatalogPagination } from './hooks/useCatalogPagination';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { NavigationTabs } from './components/NavigationTabs';
import { SnapshotsTab } from './components/tabs/SnapshotsTab';
import { AISummaryTab } from './components/tabs/AISummaryTab';
import { CatalogTab } from './components/tabs/CatalogTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('trending');

  // Custom Hook 1: Core Dashboard Data Loading
  const {
    loading,
    refreshing,
    snapshots,
    summaries,
    repositories,
    selectedSummary,
    setSelectedSummary,
    topLanguages,
    loadDashboardData,
  } = useDashboardData();

  // Custom Hook 2: Trending Snapshots Filtering & Sorting
  const {
    selectedPeriod,
    setSelectedPeriod,
    selectedPeriodKey,
    setSelectedPeriodKey,
    availableKeys,
    searchQuery,
    setSearchQuery,
    selectedLang,
    setSelectedLang,
    trendingSortField,
    trendingSortOrder,
    statusFilter,
    setStatusFilter,
    handleTrendingSort,
    availableSnapshotLanguages,
    filteredSnapshots,
  } = useTrendingFilter(snapshots);

  // Custom Hook 3: Repository Catalog Infinite Scroll & Server Pagination
  const {
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
  } = useCatalogPagination(repositories);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <Header refreshing={refreshing} onRefresh={loadDashboardData} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* KPI Metric Summary Cards */}
        <MetricsOverview
          repositories={repositories}
          snapshots={snapshots}
          summaries={summaries}
          topLanguages={topLanguages}
        />

        {/* Tab Navigation Controls */}
        <NavigationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          catalogCount={repositories.length}
        />

        {/* Tab 1: Trending Snapshots View */}
        {activeTab === 'trending' && (
          <SnapshotsTab
            loading={loading}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            selectedPeriodKey={selectedPeriodKey}
            setSelectedPeriodKey={setSelectedPeriodKey}
            availableKeys={availableKeys}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedLang={selectedLang}
            setSelectedLang={setSelectedLang}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            trendingSortField={trendingSortField}
            trendingSortOrder={trendingSortOrder}
            handleTrendingSort={handleTrendingSort}
            availableSnapshotLanguages={availableSnapshotLanguages}
            filteredSnapshots={filteredSnapshots}
          />
        )}

        {/* Tab 2: AI Architecture Summaries View */}
        {activeTab === 'summaries' && (
          <AISummaryTab
            summaries={summaries}
            selectedSummary={selectedSummary}
            onSelectSummary={setSelectedSummary}
          />
        )}

        {/* Tab 3: Repository Catalog Infinite Scroll View */}
        {activeTab === 'catalog' && (
          <CatalogTab
            catalogRepos={catalogRepos}
            catalogTotal={catalogTotal}
            catalogLoading={catalogLoading}
            catalogLoadingMore={catalogLoadingMore}
            catalogHasMore={catalogHasMore}
            catalogSearch={catalogSearch}
            setCatalogSearch={setCatalogSearch}
            catalogLang={catalogLang}
            setCatalogLang={setCatalogLang}
            catalogSortField={catalogSortField}
            catalogSortOrder={catalogSortOrder}
            handleCatalogSort={handleCatalogSort}
            handleCatalogTableScroll={handleCatalogTableScroll}
            availableCatalogLanguages={availableCatalogLanguages}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GitHub Trend Tracker & AI Architecture Analyzer</span>
          <span>Powered by Supabase PostgreSQL & Google Gemini 2.5 Flash</span>
        </div>
      </footer>
    </div>
  );
}

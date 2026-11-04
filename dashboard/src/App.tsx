import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import ReactMarkdown from 'react-markdown';
import {
  TrendingUp,
  Sparkles,
  Database,
  Search,
  ExternalLink,
  Flame,
  RotateCcw,
  Calendar,
  Layers,
  Code2,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  url: string;
  discovered_on: string;
  category_lang: string;
  highest_rank_achieved: number;
  total_stars: string;
}

interface TrendingSnapshot {
  id: number;
  repo_name: string;
  period: 'daily' | 'weekly' | 'monthly';
  period_key: string;
  rank: number;
  stars: string;
  category_lang: string;
  is_new: boolean;
  recorded_at: string;
}

interface AISummary {
  id: number;
  summary_date: string;
  model: string;
  content: string;
  source_files: string[];
  created_at: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
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

export default function App() {
  const [activeTab, setActiveTab] = useState<'trending' | 'summaries' | 'catalog'>('trending');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data states
  const [snapshots, setSnapshots] = useState<TrendingSnapshot[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  // Filter & Sort states for Trending Tab
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('All');
  const [trendingSortField, setTrendingSortField] = useState<'rank' | 'repo_name' | 'stars' | 'is_new'>('rank');
  const [trendingSortOrder, setTrendingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'retrending'>('all');

  const handleTrendingSort = (field: 'rank' | 'repo_name' | 'stars' | 'is_new') => {
    if (trendingSortField === field) {
      setTrendingSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTrendingSortField(field);
      if (field === 'stars' || field === 'is_new') {
        setTrendingSortOrder('desc'); // High stars first, New entries first
      } else {
        setTrendingSortOrder('asc'); // Rank #1 first, A-Z
      }
    }
  };

  // Selected Summary
  const [selectedSummary, setSelectedSummary] = useState<AISummary | null>(null);

  // Filter & Sort states for Repository Catalog Tab
  const CATALOG_PAGE_SIZE = 25;
  const [catalogRepos, setCatalogRepos] = useState<Repository[]>([]);
  const [catalogTotal, setCatalogTotal] = useState<number>(0);
  const [catalogPage, setCatalogPage] = useState<number>(0);
  const [catalogHasMore, setCatalogHasMore] = useState<boolean>(true);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogLang, setCatalogLang] = useState<string>('All');
  const [catalogSortField, setCatalogSortField] = useState<'highest_rank_achieved' | 'name' | 'total_stars' | 'discovered_on'>('highest_rank_achieved');
  const [catalogSortOrder, setCatalogSortOrder] = useState<'asc' | 'desc'>('asc');

  const parseStars = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const handleCatalogSort = (field: 'highest_rank_achieved' | 'name' | 'total_stars' | 'discovered_on') => {
    if (catalogSortField === field) {
      setCatalogSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCatalogSortField(field);
      // Sensible defaults: stars and date default to descending (highest stars first, newest date first)
      if (field === 'total_stars' || field === 'discovered_on') {
        setCatalogSortOrder('desc');
      } else {
        setCatalogSortOrder('asc');
      }
    }
  };

  // Step 3: Synchronous Request Lock Ref to prevent rapid duplicate scroll fetches
  const isFetchingCatalogRef = useRef<boolean>(false);

  // Fetch paginated catalog data directly from Supabase
  const fetchCatalogPage = async (pageToFetch: number, reset: boolean = false) => {
    // Prevent duplicate concurrent requests
    if (isFetchingCatalogRef.current && !reset) return;
    isFetchingCatalogRef.current = true;

    if (reset) {
      setCatalogLoading(true);
    } else {
      setCatalogLoadingMore(true);
    }

    try {
      // Step 2: Only fetch { count: 'exact' } on initial load/reset (Page 0)
      // On subsequent scroll batches (Page 1+), skip count query to save database compute!
      const shouldFetchCount = pageToFetch === 0 || reset;
      let query = supabase.from('repositories');
      let baseSelect = shouldFetchCount
        ? query.select('*', { count: 'exact' })
        : query.select('*');

      // Language filter
      if (catalogLang !== 'All') {
        if (catalogLang === 'Unknown') {
          baseSelect = baseSelect.or('category_lang.eq.Unknown,category_lang.is.null');
        } else {
          baseSelect = baseSelect.eq('category_lang', catalogLang);
        }
      }

      // Search filter
      if (catalogSearch.trim()) {
        const term = catalogSearch.trim();
        baseSelect = baseSelect.or(`name.ilike.%${term}%,category_lang.ilike.%${term}%`);
      }

      // Server-side indexed sort
      const isAsc = catalogSortOrder === 'asc';
      if (catalogSortField === 'total_stars') {
        baseSelect = baseSelect.order('stars_count', { ascending: isAsc, nullsFirst: false });
      } else if (catalogSortField === 'discovered_on') {
        baseSelect = baseSelect.order('discovered_on', { ascending: isAsc });
      } else if (catalogSortField === 'highest_rank_achieved') {
        baseSelect = baseSelect.order('highest_rank_achieved', { ascending: isAsc });
      } else if (catalogSortField === 'name') {
        baseSelect = baseSelect.order('name', { ascending: isAsc });
      }

      const start = pageToFetch * CATALOG_PAGE_SIZE;
      const end = start + CATALOG_PAGE_SIZE - 1;
      baseSelect = baseSelect.range(start, end);

      const { data, count, error } = await baseSelect;

      if (error) {
        console.error('Error fetching catalog page:', error);
        return;
      }

      if (shouldFetchCount && count !== null) {
        setCatalogTotal(count);
      }

      const rows = (data as Repository[]) || [];
      if (reset) {
        setCatalogRepos(rows);
      } else {
        setCatalogRepos((prev) => [...prev, ...rows]);
      }

      const totalFetched = reset ? rows.length : catalogRepos.length + rows.length;
      setCatalogHasMore(rows.length === CATALOG_PAGE_SIZE && (catalogTotal > 0 ? totalFetched < catalogTotal : true));
      setCatalogPage(pageToFetch);
    } catch (err) {
      console.error('Fetch catalog error:', err);
    } finally {
      isFetchingCatalogRef.current = false;
      setCatalogLoading(false);
      setCatalogLoadingMore(false);
    }
  };

  // Trigger catalog fetch when filters/sorting change (with search debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogPage(0, true);
    }, 200);
    return () => clearTimeout(timer);
  }, [catalogLang, catalogSearch, catalogSortField, catalogSortOrder]);

  // Step 3: Scroll Handler with Loading Guard and Request Lock
  const handleCatalogTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Jodi age thekei fetch cholte thake ba shob data load hoye thake, return koro
    if (catalogLoading || catalogLoadingMore || !catalogHasMore || isFetchingCatalogRef.current) {
      return;
    }

    if (scrollHeight - scrollTop <= clientHeight + 150) {
      fetchCatalogPage(catalogPage + 1, false);
    }
  };

  // Helper for mouse wheel horizontal scrolling
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY * 1.5;
    }
  };

  // Helper to scroll horizontal bar using left/right buttons
  const scrollElement = (el: HTMLDivElement | null, offset: number) => {
    if (el) {
      el.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Load Initial Data
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);

      // 1. Fetch available snapshots (limit to 5000 for comprehensive history)
      const { data: snapData } = await supabase
        .from('trending_snapshots')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(5000);

      if (snapData) {
        setSnapshots(snapData as TrendingSnapshot[]);
      }

      // 2. Fetch AI summaries
      const { data: sumData } = await supabase
        .from('ai_summaries')
        .select('*')
        .order('summary_date', { ascending: false });

      if (sumData && sumData.length > 0) {
        setSummaries(sumData as AISummary[]);
        setSelectedSummary(sumData[0] as AISummary);
      }

      // 3. Fetch repositories catalog
      const { data: repoData } = await supabase
        .from('repositories')
        .select('*')
        .order('highest_rank_achieved', { ascending: true })
        .limit(1000);

      if (repoData) {
        setRepositories(repoData as Repository[]);
      }
    } catch (err) {
      console.error('Error loading Supabase data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute available period keys whenever selectedPeriod or snapshots change
  useEffect(() => {
    const keys = Array.from(
      new Set(snapshots.filter((s) => s.period === selectedPeriod).map((s) => s.period_key))
    ).sort((a, b) => b.localeCompare(a));

    setAvailableKeys(keys);
    if (keys.length > 0 && (!selectedPeriodKey || !keys.includes(selectedPeriodKey))) {
      setSelectedPeriodKey(keys[0]);
    }
  }, [snapshots, selectedPeriod]);

  // Languages that actually exist in the currently selected snapshot period & key
  const availableSnapshotLanguages = useMemo(() => {
    const langs = new Set<string>();
    let hasUnknown = false;
    snapshots.forEach((s) => {
      const matchPeriod = s.period === selectedPeriod;
      const matchKey = selectedPeriodKey ? s.period_key === selectedPeriodKey : true;
      if (matchPeriod && matchKey) {
        if (s.category_lang && s.category_lang !== 'Unknown') {
          langs.add(s.category_lang);
        } else if (s.category_lang === 'Unknown' || !s.category_lang) {
          hasUnknown = true;
        }
      }
    });
    const sorted = Array.from(langs).sort();
    return ['All', ...sorted, ...(hasUnknown ? ['Unknown'] : [])];
  }, [snapshots, selectedPeriod, selectedPeriodKey]);

  // Languages that actually exist in the tracked repositories catalog
  const availableCatalogLanguages = useMemo(() => {
    const langs = new Set<string>();
    let hasUnknown = false;
    repositories.forEach((r) => {
      if (r.category_lang && r.category_lang !== 'Unknown') {
        langs.add(r.category_lang);
      } else if (!r.category_lang || r.category_lang === 'Unknown') {
        hasUnknown = true;
      }
    });
    const sorted = Array.from(langs).sort();
    return ['All', ...sorted, ...(hasUnknown ? ['Unknown'] : [])];
  }, [repositories]);

  // Auto-reset selectedLang to 'All' if selected language is not in available snapshot languages
  useEffect(() => {
    if (selectedLang !== 'All' && !availableSnapshotLanguages.includes(selectedLang)) {
      setSelectedLang('All');
    }
  }, [availableSnapshotLanguages, selectedLang]);

  // Filtered & Sorted Snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots
      .filter((s) => {
        const matchPeriod = s.period === selectedPeriod;
        const matchKey = selectedPeriodKey ? s.period_key === selectedPeriodKey : true;
        const matchLang = selectedLang === 'All' || s.category_lang === selectedLang;
        const matchStatus =
          statusFilter === 'all' ||
          (statusFilter === 'new' && s.is_new) ||
          (statusFilter === 'retrending' && !s.is_new);
        const matchSearch =
          searchQuery === '' ||
          s.repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category_lang.toLowerCase().includes(searchQuery.toLowerCase());
        return matchPeriod && matchKey && matchLang && matchStatus && matchSearch;
      })
      .sort((a, b) => {
        let diff = 0;
        if (trendingSortField === 'stars') {
          diff = parseStars(a.stars) - parseStars(b.stars);
        } else if (trendingSortField === 'rank') {
          diff = a.rank - b.rank;
        } else if (trendingSortField === 'repo_name') {
          diff = a.repo_name.localeCompare(b.repo_name);
        } else if (trendingSortField === 'is_new') {
          diff = (a.is_new ? 1 : 0) - (b.is_new ? 1 : 0);
        }
        return trendingSortOrder === 'asc' ? diff : -diff;
      });
  }, [snapshots, selectedPeriod, selectedPeriodKey, selectedLang, statusFilter, searchQuery, trendingSortField, trendingSortOrder]);

  // Top Languages Breakdown
  const topLanguages = useMemo(() => {
    const counts: Record<string, number> = {};
    repositories.forEach((r) => {
      counts[r.category_lang] = (counts[r.category_lang] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [repositories]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  GitHub Trend Tracker
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  Supabase Live
                </span>
              </div>
              <p className="text-xs text-slate-400">Automated Scraper & Gemini AI DevOps Architect</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors shadow-sm"
              title="Refresh Live Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <a
              href="https://github.com/trending"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
            >
              GitHub Trending
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Repositories</span>
              <Database className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {repositories.length > 0 ? repositories.length : '450+'}
              </span>
              <span className="text-xs text-emerald-400 font-medium">Auto-tracked</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Historical Snapshots</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {snapshots.length > 0 ? snapshots.length : '1,840+'}
              </span>
              <span className="text-xs text-cyan-400 font-medium">Daily/Weekly/Monthly</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">AI Architecture Reports</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold text-white tracking-tight">
                {summaries.length > 0 ? summaries.length : '60+'}
              </span>
              <span className="text-xs text-amber-400 font-medium">Gemini 2.5 Flash</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Top Languages</span>
              <Code2 className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-3 flex items-center space-x-1.5 overflow-hidden text-xs">
              {topLanguages.map(([lang, count]) => (
                <span
                  key={lang}
                  className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700/50"
                  title={`${count} repositories`}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-slate-800 space-x-8">
          <button
            onClick={() => setActiveTab('trending')}
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
            onClick={() => setActiveTab('summaries')}
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
            onClick={() => setActiveTab('catalog')}
            className={`pb-4 px-1 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Repository Catalog ({repositories.length})</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: TRENDING SNAPSHOTS
           ========================================================================= */}
        {activeTab === 'trending' && (
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
                  onClick={() => {
                    setTrendingSortField('rank');
                    setTrendingSortOrder('asc');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                    trendingSortField === 'rank' && trendingSortOrder === 'asc'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
                  }`}
                >
                  <span>Rank (#1 First)</span>
                </button>

                <button
                  onClick={() => {
                    setTrendingSortField('stars');
                    setTrendingSortOrder('desc');
                  }}
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
                  onClick={() => {
                    setTrendingSortField('stars');
                    setTrendingSortOrder('asc');
                  }}
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
                  onClick={() => {
                    setTrendingSortField('is_new');
                    setTrendingSortOrder('desc');
                  }}
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
                  onClick={() => {
                    setTrendingSortField('repo_name');
                    setTrendingSortOrder('asc');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                    trendingSortField === 'repo_name' && trendingSortOrder === 'asc'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/40'
                  }`}
                >
                  <span>Name (A → Z)</span>
                </button>
              </div>
            </div>

            {/* Language Filter Pills with Mouse Wheel Scroll */}
            <div className="relative flex items-center">
              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.lang-scroll-container') as HTMLDivElement | null;
                  scrollElement(container, -250);
                }}
                className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md mr-1.5 shrink-0"
                title="Scroll Left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div
                onWheel={handleWheelScroll}
                className="lang-scroll-container flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth select-none cursor-grab active:cursor-grabbing w-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                title="Scroll with mouse wheel"
              >
                {availableSnapshotLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedLang === lang
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.lang-scroll-container') as HTMLDivElement | null;
                  scrollElement(container, 250);
                }}
                className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md ml-1.5 shrink-0"
                title="Scroll Right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

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

                    <th scope="col" className="py-3.5 px-4">
                      Language
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
        )}

        {/* =========================================================================
            TAB 2: AI ARCHITECTURE SUMMARIES
           ========================================================================= */}
        {activeTab === 'summaries' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with Summary Dates */}
            <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3 h-[700px] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Analysis Reports ({summaries.length})
                </span>
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>

              {summaries.map((sum) => {
                const isSelected = selectedSummary?.id === sum.id;
                return (
                  <button
                    key={sum.id}
                    onClick={() => setSelectedSummary(sum)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/40 text-slate-400 border-slate-800/60 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{sum.summary_date}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{sum.model}</div>
                    </div>
                    <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>

            {/* Summary Detail Viewer */}
            <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 h-[700px] overflow-y-auto shadow-xl">
              {selectedSummary ? (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>DevOps & AI Architecture Report</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Report Date: <strong className="text-slate-200">{selectedSummary.summary_date}</strong> | Model:{' '}
                        <span className="font-mono text-indigo-400">{selectedSummary.model}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Production Verified
                      </span>
                    </div>
                  </div>

                  {/* Rendered Markdown Body */}
                  <article className="prose prose-invert prose-slate max-w-none prose-headings:font-bold prose-headings:text-white prose-h2:text-lg prose-h3:text-base prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-indigo-400 prose-strong:text-white prose-ul:text-slate-300">
                    <ReactMarkdown>{selectedSummary.content}</ReactMarkdown>
                  </article>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Select an AI analysis report from the list to view architectural recommendations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: REPOSITORY CATALOG
           ========================================================================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
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
                  onClick={() => {
                    setCatalogSortField('total_stars');
                    setCatalogSortOrder('desc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    catalogSortField === 'total_stars' && catalogSortOrder === 'desc'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-850 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Star className="h-3 w-3 text-amber-400" />
                  <span>Stars (High → Low)</span>
                </button>

                <button
                  onClick={() => {
                    setCatalogSortField('total_stars');
                    setCatalogSortOrder('asc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    catalogSortField === 'total_stars' && catalogSortOrder === 'asc'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'bg-slate-850 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Star className="h-3 w-3 text-amber-400" />
                  <span>Stars (Low → High)</span>
                </button>

                <button
                  onClick={() => {
                    setCatalogSortField('discovered_on');
                    setCatalogSortOrder('desc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    catalogSortField === 'discovered_on' && catalogSortOrder === 'desc'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-850 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Calendar className="h-3 w-3 text-cyan-400" />
                  <span>Discovered (Newest)</span>
                </button>

                <button
                  onClick={() => {
                    setCatalogSortField('discovered_on');
                    setCatalogSortOrder('asc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    catalogSortField === 'discovered_on' && catalogSortOrder === 'asc'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-850 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <Calendar className="h-3 w-3 text-cyan-400" />
                  <span>Discovered (Oldest)</span>
                </button>

                <button
                  onClick={() => {
                    setCatalogSortField('highest_rank_achieved');
                    setCatalogSortOrder('asc');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    catalogSortField === 'highest_rank_achieved' && catalogSortOrder === 'asc'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'bg-slate-850 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <span>Rank (#1 First)</span>
                </button>
              </div>
            </div>

            {/* Language filter pills with Mouse Wheel Horizontal Scrolling */}
            <div className="relative flex items-center">
              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.catalog-lang-container') as HTMLDivElement | null;
                  scrollElement(container, -250);
                }}
                className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md mr-1.5 shrink-0"
                title="Scroll Left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div
                onWheel={handleWheelScroll}
                className="catalog-lang-container flex items-center space-x-1.5 overflow-x-auto py-1 scroll-smooth select-none cursor-grab active:cursor-grabbing w-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                title="Scroll with mouse wheel"
              >
                {availableCatalogLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCatalogLang(lang)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      catalogLang === lang
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={(e) => {
                  const container = e.currentTarget.parentElement?.querySelector('.catalog-lang-container') as HTMLDivElement | null;
                  scrollElement(container, 250);
                }}
                className="hidden sm:flex z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 shadow-md ml-1.5 shrink-0"
                title="Scroll Right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

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
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>GitHub Trend Tracker & AI Architecture Analyzer</span>
          <span>Powered by Supabase PostgreSQL & Google Gemini 2.5 Flash</span>
        </div>
      </footer>
    </div>
  );
}

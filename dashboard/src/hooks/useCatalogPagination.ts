import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Repository, CatalogSortField, SortOrder, LanguageCount } from '../types';
import { CATALOG_PAGE_SIZE } from '../constants/theme';

export function useCatalogPagination(repositories: Repository[]) {
  const [catalogRepos, setCatalogRepos] = useState<Repository[]>([]);
  const [catalogTotal, setCatalogTotal] = useState<number>(0);
  const [catalogPage, setCatalogPage] = useState<number>(0);
  const [catalogHasMore, setCatalogHasMore] = useState<boolean>(true);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogLang, setCatalogLang] = useState<string>('All');
  const [catalogSortField, setCatalogSortField] = useState<CatalogSortField>('highest_rank_achieved');
  const [catalogSortOrder, setCatalogSortOrder] = useState<SortOrder>('asc');

  // Synchronous Request Lock Ref to prevent rapid duplicate scroll fetches
  const isFetchingCatalogRef = useRef<boolean>(false);

  const handleCatalogSort = useCallback(
    (field: CatalogSortField) => {
      if (catalogSortField === field) {
        setCatalogSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setCatalogSortField(field);
        if (field === 'total_stars' || field === 'discovered_on') {
          setCatalogSortOrder('desc');
        } else {
          setCatalogSortOrder('asc');
        }
      }
    },
    [catalogSortField]
  );

  // Fetch paginated catalog data directly from Supabase
  const fetchCatalogPage = useCallback(
    async (pageToFetch: number, reset: boolean = false) => {
      if (isFetchingCatalogRef.current && !reset) return;
      isFetchingCatalogRef.current = true;

      if (reset) {
        setCatalogLoading(true);
      } else {
        setCatalogLoadingMore(true);
      }

      try {
        // Only fetch { count: 'exact' } on initial load/reset (Page 0) to save DB compute
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
        setCatalogHasMore(
          rows.length === CATALOG_PAGE_SIZE && (catalogTotal > 0 ? totalFetched < catalogTotal : true)
        );
        setCatalogPage(pageToFetch);
      } catch (err) {
        console.error('Fetch catalog error:', err);
      } finally {
        isFetchingCatalogRef.current = false;
        setCatalogLoading(false);
        setCatalogLoadingMore(false);
      }
    },
    [catalogLang, catalogSearch, catalogSortField, catalogSortOrder, catalogRepos.length, catalogTotal]
  );

  // Trigger catalog fetch when filters/sorting change (with search debouncing)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalogPage(0, true);
    }, 200);
    return () => clearTimeout(timer);
  }, [catalogLang, catalogSearch, catalogSortField, catalogSortOrder, fetchCatalogPage]);

  // Scroll Handler with Loading Guard and Request Lock
  const handleCatalogTableScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      if (catalogLoading || catalogLoadingMore || !catalogHasMore || isFetchingCatalogRef.current) {
        return;
      }

      if (scrollHeight - scrollTop <= clientHeight + 150) {
        fetchCatalogPage(catalogPage + 1, false);
      }
    },
    [catalogLoading, catalogLoadingMore, catalogHasMore, catalogPage, fetchCatalogPage]
  );

  // Languages that actually exist in the tracked repositories catalog,
  // sorted by repository count descending
  const availableCatalogLanguages: LanguageCount[] = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    repositories.forEach((r) => {
      total++;
      const lang = r.category_lang || 'Unknown';
      counts[lang] = (counts[lang] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .filter(([lang]) => lang !== 'Unknown')
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([lang, count]) => ({ name: lang, count }));

    const hasUnknown = counts['Unknown'] || 0;
    const unknownEntry = hasUnknown > 0 ? [{ name: 'Unknown', count: hasUnknown }] : [];

    return [{ name: 'All', count: total }, ...sorted, ...unknownEntry];
  }, [repositories]);

  return {
    catalogRepos,
    catalogTotal,
    catalogPage,
    catalogHasMore,
    catalogLoading,
    catalogLoadingMore,
    catalogSearch,
    setCatalogSearch,
    catalogLang,
    setCatalogLang,
    catalogSortField,
    setCatalogSortField,
    catalogSortOrder,
    setCatalogSortOrder,
    handleCatalogSort,
    handleCatalogTableScroll,
    availableCatalogLanguages,
  };
}

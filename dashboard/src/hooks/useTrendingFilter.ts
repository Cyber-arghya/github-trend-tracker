import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  TrendingSnapshot,
  PeriodType,
  TrendingSortField,
  SortOrder,
  StatusFilter,
  LanguageCount,
} from '../types';
import { parseStars } from '../constants/theme';

export function useTrendingFilter(snapshots: TrendingSnapshot[]) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('daily');
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string>('');
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLang, setSelectedLang] = useState<string>('All');
  const [trendingSortField, setTrendingSortField] = useState<TrendingSortField>('rank');
  const [trendingSortOrder, setTrendingSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleTrendingSort = useCallback(
    (field: TrendingSortField) => {
      if (trendingSortField === field) {
        setTrendingSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setTrendingSortField(field);
        if (field === 'stars' || field === 'is_new' || field === 'language') {
          setTrendingSortOrder('desc'); // High stars first, New first, Highest language count first
        } else {
          setTrendingSortOrder('asc'); // Rank #1 first, A-Z
        }
      }
    },
    [trendingSortField]
  );

  // Compute available period keys whenever selectedPeriod or snapshots change
  useEffect(() => {
    const keys = Array.from(
      new Set(snapshots.filter((s) => s.period === selectedPeriod).map((s) => s.period_key))
    ).sort((a, b) => b.localeCompare(a));

    setAvailableKeys(keys);
    if (keys.length > 0 && (!selectedPeriodKey || !keys.includes(selectedPeriodKey))) {
      setSelectedPeriodKey(keys[0]);
    }
  }, [snapshots, selectedPeriod, selectedPeriodKey]);

  // Languages that actually exist in the currently selected snapshot period & key,
  // sorted by repository count descending (most popular languages first)
  const availableSnapshotLanguages: LanguageCount[] = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    snapshots.forEach((s) => {
      const matchPeriod = s.period === selectedPeriod;
      const matchKey = selectedPeriodKey ? s.period_key === selectedPeriodKey : true;
      if (matchPeriod && matchKey) {
        total++;
        const lang = s.category_lang || 'Unknown';
        counts[lang] = (counts[lang] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .filter(([lang]) => lang !== 'Unknown')
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([lang, count]) => ({ name: lang, count }));

    const hasUnknown = counts['Unknown'] || 0;
    const unknownEntry = hasUnknown > 0 ? [{ name: 'Unknown', count: hasUnknown }] : [];

    return [{ name: 'All', count: total }, ...sorted, ...unknownEntry];
  }, [snapshots, selectedPeriod, selectedPeriodKey]);

  // Fast map for looking up language counts in current snapshot view
  const snapshotLangCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    availableSnapshotLanguages.forEach(({ name, count }) => {
      map[name] = count;
    });
    return map;
  }, [availableSnapshotLanguages]);

  // Auto-reset selectedLang to 'All' if selected language is not in available snapshot languages
  useEffect(() => {
    const names = availableSnapshotLanguages.map((l) => l.name);
    if (selectedLang !== 'All' && !names.includes(selectedLang)) {
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
        } else if (trendingSortField === 'language') {
          // Group same language repos together, with highest repo frequency first
          const countA = snapshotLangCountMap[a.category_lang] || 0;
          const countB = snapshotLangCountMap[b.category_lang] || 0;
          if (trendingSortOrder === 'desc') {
            diff = countB - countA;
            if (diff === 0) {
              diff = a.category_lang.localeCompare(b.category_lang);
            }
          } else {
            diff = countA - countB;
            if (diff === 0) {
              diff = a.category_lang.localeCompare(b.category_lang);
            }
          }
          // Inside same language group, sort by rank #1 first
          if (diff === 0) {
            return a.rank - b.rank;
          }
          return diff;
        }
        return trendingSortOrder === 'asc' ? diff : -diff;
      });
  }, [
    snapshots,
    selectedPeriod,
    selectedPeriodKey,
    selectedLang,
    statusFilter,
    searchQuery,
    trendingSortField,
    trendingSortOrder,
    snapshotLangCountMap,
  ]);

  return {
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
    setTrendingSortField,
    trendingSortOrder,
    setTrendingSortOrder,
    statusFilter,
    setStatusFilter,
    handleTrendingSort,
    availableSnapshotLanguages,
    filteredSnapshots,
  };
}

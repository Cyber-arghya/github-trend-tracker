import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Repository, TrendingSnapshot, AISummary } from '../types';

export function useDashboardData() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<TrendingSnapshot[]>([]);
  const [summaries, setSummaries] = useState<AISummary[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<AISummary | null>(null);

  const loadDashboardData = useCallback(async () => {
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
        setSelectedSummary((prev) => prev || (sumData[0] as AISummary));
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
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Top 5 Languages Breakdown from repositories catalog
  const topLanguages = useMemo(() => {
    const counts: Record<string, number> = {};
    repositories.forEach((r) => {
      counts[r.category_lang] = (counts[r.category_lang] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [repositories]);

  return {
    loading,
    refreshing,
    snapshots,
    summaries,
    repositories,
    selectedSummary,
    setSelectedSummary,
    topLanguages,
    loadDashboardData,
  };
}

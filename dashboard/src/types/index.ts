export interface Repository {
  id: number;
  name: string;
  url: string;
  discovered_on: string;
  category_lang: string;
  highest_rank_achieved: number;
  total_stars: string;
}

export interface TrendingSnapshot {
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

export interface AISummary {
  id: number;
  summary_date: string;
  model: string;
  content: string;
  source_files: string[];
  created_at: string;
}

export interface LanguageCount {
  name: string;
  count: number;
}

export type PeriodType = 'daily' | 'weekly' | 'monthly';
export type TrendingSortField = 'rank' | 'repo_name' | 'stars' | 'is_new' | 'language';
export type CatalogSortField = 'highest_rank_achieved' | 'name' | 'total_stars' | 'discovered_on';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'new' | 'retrending';
export type ActiveTab = 'trending' | 'summaries' | 'catalog';


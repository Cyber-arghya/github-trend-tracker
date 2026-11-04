-- Migration: 20261104144556_optimize_queries_and_stars.sql
-- Description: Add numeric stars_count and optimized composite indices for infinite scroll and sorting

-- 1. Add stars_count column to repositories and populate from total_stars
ALTER TABLE public.repositories 
ADD COLUMN IF NOT EXISTS stars_count INTEGER DEFAULT 0;

UPDATE public.repositories 
SET stars_count = COALESCE(NULLIF(regexp_replace(total_stars, '[^0-9]', '', 'g'), '')::integer, 0);

-- Trigger to automatically populate stars_count on insert/update
CREATE OR REPLACE FUNCTION public.sync_repository_stars_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.stars_count := COALESCE(NULLIF(regexp_replace(NEW.total_stars, '[^0-9]', '', 'g'), '')::integer, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_repository_stars_count ON public.repositories;
CREATE TRIGGER trg_sync_repository_stars_count
BEFORE INSERT OR UPDATE ON public.repositories
FOR EACH ROW
EXECUTE FUNCTION public.sync_repository_stars_count();

-- 2. Add stars_count to trending_snapshots as well
ALTER TABLE public.trending_snapshots 
ADD COLUMN IF NOT EXISTS stars_count INTEGER DEFAULT 0;

UPDATE public.trending_snapshots 
SET stars_count = COALESCE(NULLIF(regexp_replace(stars, '[^0-9]', '', 'g'), '')::integer, 0);

CREATE OR REPLACE FUNCTION public.sync_snapshot_stars_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.stars_count := COALESCE(NULLIF(regexp_replace(NEW.stars, '[^0-9]', '', 'g'), '')::integer, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_snapshot_stars_count ON public.trending_snapshots;
CREATE TRIGGER trg_sync_snapshot_stars_count
BEFORE INSERT OR UPDATE ON public.trending_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.sync_snapshot_stars_count();

-- 3. Composite & performance indices for fast infinite scroll, pagination, and sorting
CREATE INDEX IF NOT EXISTS idx_repositories_stars_count ON public.repositories(stars_count DESC);
CREATE INDEX IF NOT EXISTS idx_repositories_highest_rank ON public.repositories(highest_rank_achieved ASC);
CREATE INDEX IF NOT EXISTS idx_repositories_lang ON public.repositories(category_lang);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_stars_count ON public.trending_snapshots(stars_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_rank ON public.trending_snapshots(period, period_key, rank ASC);


-- Migration: 20261104153000_safe_stars_count_trigger.sql
-- Description: 
-- 1. Crash-proof safe stars_count trigger (COALESCE + NULLIF)
-- 2. Foreign Key repo_id (BIGINT) relationships on child tables (trending_snapshots, feeder_queue, summary_logs)
-- 3. UNIQUE (repo_name) deduplication constraint on feeder_queue
-- 4. Automatic LEAST rank update trigger on repositories from trending_snapshots

-- ============================================================================
-- 1. Crash-proof Safe Trigger Functions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_stars_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stars_count := COALESCE(
    NULLIF(REGEXP_REPLACE(NEW.total_stars, '[^0-9]', '', 'g'), '')::INTEGER, 
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_repository_stars_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stars_count := COALESCE(
    NULLIF(REGEXP_REPLACE(NEW.total_stars, '[^0-9]', '', 'g'), '')::INTEGER, 
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_snapshot_stars_count()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stars_count := COALESCE(
    NULLIF(REGEXP_REPLACE(NEW.stars, '[^0-9]', '', 'g'), '')::INTEGER, 
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_repository_stars_count ON public.repositories;
CREATE TRIGGER trg_sync_repository_stars_count
BEFORE INSERT OR UPDATE OF total_stars ON public.repositories
FOR EACH ROW
EXECUTE FUNCTION public.sync_repository_stars_count();

DROP TRIGGER IF EXISTS trg_sync_snapshot_stars_count ON public.trending_snapshots;
CREATE TRIGGER trg_sync_snapshot_stars_count
BEFORE INSERT OR UPDATE OF stars ON public.trending_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.sync_snapshot_stars_count();

-- ============================================================================
-- 2. Foreign Key repo_id (BIGINT) in Child Tables
-- ============================================================================
-- trending_snapshots
ALTER TABLE public.trending_snapshots 
ADD COLUMN IF NOT EXISTS repo_id BIGINT REFERENCES public.repositories(id) ON DELETE CASCADE;

UPDATE public.trending_snapshots ts
SET repo_id = r.id
FROM public.repositories r
WHERE ts.repo_name = r.name AND ts.repo_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_trending_snapshots_repo_id ON public.trending_snapshots(repo_id);

-- feeder_queue
ALTER TABLE public.feeder_queue 
ADD COLUMN IF NOT EXISTS repo_id BIGINT REFERENCES public.repositories(id) ON DELETE CASCADE;

UPDATE public.feeder_queue fq
SET repo_id = r.id
FROM public.repositories r
WHERE fq.repo_name = r.name AND fq.repo_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_feeder_queue_repo_id ON public.feeder_queue(repo_id);

-- summary_logs
ALTER TABLE public.summary_logs 
ADD COLUMN IF NOT EXISTS repo_id BIGINT REFERENCES public.repositories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_summary_logs_repo_id ON public.summary_logs(repo_id);

-- ============================================================================
-- 3. feeder_queue Deduplication & UNIQUE Constraint
-- ============================================================================
-- Remove any duplicate entries keeping earliest queue record
DELETE FROM public.feeder_queue
WHERE id NOT IN (
  SELECT MIN(id) FROM public.feeder_queue GROUP BY repo_name
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_feeder_queue_repo_name'
  ) THEN
    ALTER TABLE public.feeder_queue ADD CONSTRAINT uq_feeder_queue_repo_name UNIQUE (repo_name);
  END IF;
END $$;

-- ============================================================================
-- 4. Automatic LEAST Rank Update on repositories
-- (Rank 1 is highest, rank 25 is lower -> LEAST ensures best rank is preserved)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_repo_highest_rank()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically link repo_id if missing
  IF NEW.repo_id IS NULL THEN
    SELECT id INTO NEW.repo_id FROM public.repositories WHERE name = NEW.repo_name;
  END IF;

  UPDATE public.repositories
  SET highest_rank_achieved = LEAST(highest_rank_achieved, NEW.rank),
      stars_count = COALESCE(NEW.stars_count, stars_count),
      total_stars = COALESCE(NEW.stars, total_stars),
      updated_at = NOW()
  WHERE (id = NEW.repo_id) OR (name = NEW.repo_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_repo_highest_rank ON public.trending_snapshots;
CREATE TRIGGER trg_update_repo_highest_rank
BEFORE INSERT OR UPDATE OF rank, stars ON public.trending_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_repo_highest_rank();

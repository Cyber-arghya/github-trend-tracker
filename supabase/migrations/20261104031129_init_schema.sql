-- Migration: 20261104031129_init_schema.sql
-- Description: Decouple Data Storage to Supabase

-- 1. Repositories table (tracks all discovered repos and metadata, replacing history.json)
CREATE TABLE IF NOT EXISTS public.repositories (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    discovered_on DATE NOT NULL DEFAULT CURRENT_DATE,
    category_lang TEXT NOT NULL DEFAULT 'Unknown',
    highest_rank_achieved INTEGER NOT NULL DEFAULT 999,
    total_stars TEXT NOT NULL DEFAULT '0',
    readme_content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_repositories_name ON public.repositories(name);
CREATE INDEX IF NOT EXISTS idx_repositories_discovered_on ON public.repositories(discovered_on DESC);

-- 2. Trending snapshots table (captures daily, weekly, monthly rankings, replacing markdown periodic files)
CREATE TABLE IF NOT EXISTS public.trending_snapshots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repo_name TEXT NOT NULL REFERENCES public.repositories(name) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    period_key TEXT NOT NULL, -- e.g. '2026-08-13', '2026-W32', '2026-08'
    rank INTEGER NOT NULL,
    stars TEXT NOT NULL DEFAULT 'N/A',
    category_lang TEXT NOT NULL DEFAULT 'Unknown',
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_trending_snapshot UNIQUE (repo_name, period, period_key)
);

CREATE INDEX IF NOT EXISTS idx_trending_snapshots_period_key ON public.trending_snapshots(period, period_key);
CREATE INDEX IF NOT EXISTS idx_trending_snapshots_repo ON public.trending_snapshots(repo_name);

-- 3. Feeder queue table (replaces data/feeder/latest queue)
CREATE TABLE IF NOT EXISTS public.feeder_queue (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    repo_name TEXT NOT NULL,
    rank INTEGER NOT NULL,
    period TEXT NOT NULL,
    readme_filename TEXT UNIQUE NOT NULL,
    readme_content TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processed', 'failed')) DEFAULT 'pending',
    queued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_feeder_queue_status ON public.feeder_queue(status);

-- 4. AI Summaries table (replaces data/summaries/*.md)
CREATE TABLE IF NOT EXISTS public.ai_summaries (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
    model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    content TEXT NOT NULL,
    source_files JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_ai_summaries_date UNIQUE (summary_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_summaries_date ON public.ai_summaries(summary_date DESC);

-- 5. Summary logs table (replaces data/summary_log.json)
CREATE TABLE IF NOT EXISTS public.summary_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_summary_logs_filename ON public.summary_logs(filename);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeder_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
DROP POLICY IF EXISTS "Allow public read access on repositories" ON public.repositories;
CREATE POLICY "Allow public read access on repositories" ON public.repositories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated/service on repositories" ON public.repositories;
CREATE POLICY "Allow all for authenticated/service on repositories" ON public.repositories FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access on trending_snapshots" ON public.trending_snapshots;
CREATE POLICY "Allow public read access on trending_snapshots" ON public.trending_snapshots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated/service on trending_snapshots" ON public.trending_snapshots;
CREATE POLICY "Allow all for authenticated/service on trending_snapshots" ON public.trending_snapshots FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for feeder_queue" ON public.feeder_queue;
CREATE POLICY "Allow all for feeder_queue" ON public.feeder_queue FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read access on ai_summaries" ON public.ai_summaries;
CREATE POLICY "Allow public read access on ai_summaries" ON public.ai_summaries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all for authenticated/service on ai_summaries" ON public.ai_summaries;
CREATE POLICY "Allow all for authenticated/service on ai_summaries" ON public.ai_summaries FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all for summary_logs" ON public.summary_logs;
CREATE POLICY "Allow all for summary_logs" ON public.summary_logs FOR ALL USING (true);


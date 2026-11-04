-- Migration: 20261104161000_backfill_snapshots_and_clean_languages.sql
-- Description: Backfill language and stars from repositories into trending_snapshots

-- 1. Ensure repositories have accurate language and stars
UPDATE public.repositories SET category_lang = 'JavaScript' WHERE name = 'affaan-m/ECC' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'Dart' WHERE name = 'flutter/flutter' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'TypeScript' WHERE name = 'mvschwarz/openrig' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'TypeScript' WHERE name = 'cursor/plugins' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'TypeScript' WHERE name = 'Leonxlnx/taste-skill' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'Kotlin' WHERE name = 'android/skills' AND (category_lang = 'Unknown' OR category_lang IS NULL);
UPDATE public.repositories SET category_lang = 'TypeScript' WHERE name = 'vercel-labs/skills' AND (category_lang = 'Unknown' OR category_lang IS NULL);

-- 2. Link repo_id from repositories to trending_snapshots
UPDATE public.trending_snapshots ts
SET repo_id = r.id
FROM public.repositories r
WHERE ts.repo_name = r.name AND ts.repo_id IS NULL;

-- 3. Backfill category_lang from repositories to trending_snapshots
UPDATE public.trending_snapshots ts
SET category_lang = r.category_lang
FROM public.repositories r
WHERE (ts.repo_id = r.id OR ts.repo_name = r.name)
  AND (ts.category_lang = 'Unknown' OR ts.category_lang IS NULL OR ts.category_lang = '')
  AND r.category_lang IS NOT NULL
  AND r.category_lang != 'Unknown';

-- 4. Backfill stars and stars_count from repositories to trending_snapshots
UPDATE public.trending_snapshots ts
SET stars = r.total_stars,
    stars_count = COALESCE(NULLIF(REGEXP_REPLACE(r.total_stars, '[^0-9]', '', 'g'), '')::INTEGER, 0)
FROM public.repositories r
WHERE (ts.repo_id = r.id OR ts.repo_name = r.name)
  AND (ts.stars = 'N/A' OR ts.stars IS NULL OR ts.stars = '' OR ts.stars = '0')
  AND r.total_stars IS NOT NULL
  AND r.total_stars != 'N/A';

-- 5. Recalculate stars_count for all trending_snapshots
UPDATE public.trending_snapshots
SET stars_count = COALESCE(NULLIF(REGEXP_REPLACE(stars, '[^0-9]', '', 'g'), '')::INTEGER, 0)
WHERE stars_count = 0 OR stars_count IS NULL;


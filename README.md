# GitHub Trend Tracker & AI Architecture Analyzer

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![uv](https://img.shields.io/badge/managed%20by-uv-261230.svg)](https://github.com/astral-sh/uv)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An automated engineering intelligence pipeline that tracks GitHub Daily, Weekly, and Monthly trending repositories, captures historical rank trajectories, extracts technical README documentation, and generates actionable production-readiness architecture reports using Google Gemini AI.

All operational data is completely decoupled from git storage into **Supabase** (PostgreSQL) using the **Supabase CLI**, with a live, real-time web dashboard deployed on **Vercel**.

---

## 🌐 Live Web Dashboard (Vercel)

A fast, responsive dashboard built with **React (Vite) + Tailwind CSS + Lucide Icons**, connected live to Supabase.

* **Production URL:** [https://github-trend-tracker-theta.vercel.app](https://github-trend-tracker-theta.vercel.app)
* **Key Features:**
  * **Interactive Infinite Scroll:** Catalog with scroll lock guards and compute-optimized pagination (exact count queried strictly on initial load, subsequent pages fetched via lean `.range(start, end)`).
  * **Frequency-Ordered Language Filter:** Dynamic pills displaying repository counts per language in descending order (e.g., `All (454)`, `Python (120)`, `TypeScript (85)`).
  * **Advanced Multi-Column Sorting:**
    * ⭐ **Stars:** High to Low & Low to High (leveraging server-side `stars_count` index).
    * 📅 **Discovered Date:** Newest First & Oldest First.
    * 🏆 **Best Rank:** Historical highest rank achieved (#1 First).
    * 🔠 **Language Clustering:** Clusters same-language repositories together with dominant languages surfaced first.
  * **Trending Snapshots:** Daily, Weekly, and Monthly rankings with status badges (🔥 **[NEW ENTRY]** vs 🔄 **[Re-trending]**).
  * **AI DevOps Analysis:** Gemini 2.5 Flash architectural analysis reports rendered in rich Markdown.

```bash
# Run the dashboard locally
npm --prefix dashboard run dev

# Build for production
npm --prefix dashboard run build
```

---

## 🔄 360° End-to-End Execution Pipeline

```
 [1. Trigger]
 ┌──────────────────────────────────────────────┐
 │ GitHub Actions Cron (00:00 UTC) OR           │
 │ Manual Dispatch (workflow_dispatch)          │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
 [2. Scraping & HTML Metadata Extraction]
 ┌──────────────────────────────────────────────┐
 │ git-trend.py                                 │
 │ - Fetch GitHub Trending HTML (Daily/Weekly/Mo)│
 │ - Parse Name, Stars, Language, Description   │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
 [3. Two-Tier Fallback Resilience]
 ┌──────────────────────────────────────────────┐
 │ If Stars or Language are missing:            │
 │ ➔ Tier 1: Check Supabase repositories history │
 │ ➔ Tier 2: Query GitHub API + GITHUB_TOKEN    │
 │           (5,000 req/hr authenticated limit) │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
 [4. Transactional Database Ingestion (Supabase)]
 ┌──────────────────────────────────────────────┐
 │ supabase_client.py                           │
 │ ➔ Upsert public.repositories                 │
 │    (Trigger: safe stars_count cast & LEAST)  │
 │ ➔ Insert public.trending_snapshots           │
 │ ➔ Enqueue new READMEs to public.feeder_queue │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
 [5. AI Architecture Analysis]
 ┌──────────────────────────────────────────────┐
 │ summarize.py                                 │
 │ ➔ Batch load from feeder_queue (limit=15)    │
 │ ➔ Execute Gemini 2.5 Flash analysis prompt   │
 │ ➔ Store report in public.ai_summaries        │
 │ ➔ Mark feeder_queue items as 'processed'     │
 └──────────────────────┬───────────────────────┘
                        │
                        ▼
 [6. Live Visualization (Vercel)]
 ┌──────────────────────────────────────────────┐
 │ React 18 + Tailwind CSS Dashboard            │
 │ ➔ Query initial page + exact count           │
 │ ➔ Fetch infinite scroll batches on demand    │
 │ ➔ Sort via indexed stars_count & best rank   │
 └──────────────────────────────────────────────┘
```

---

## 🏗️ Database Architecture & Relational Schema

All historical records, feeder queues, and AI analyses are stored relationally in Supabase PostgreSQL:

```
        ┌───────────────────────────────────────┐
        │          public.repositories          │
        ├───────────────────────────────────────┤
        │ id: BIGSERIAL (PK)                    │
        │ name: TEXT (UNIQUE)                   │
        │ category_lang: TEXT                   │
        │ highest_rank_achieved: INT (LEAST)    │
        │ total_stars: TEXT                     │
        │ stars_count: INT (INDEXED B-Tree)     │ ◄── Safe Trigger Auto-Cast
        │ discovered_on: DATE                   │
        │ readme_content: TEXT                  │
        └──────────────────┬────────────────────┘
                           │
       ┌───────────────────┼───────────────────┐
       │ (1:N CASCADE)     │ (1:N CASCADE)     │ (1:N CASCADE)
       ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│trending_snapshots│ │   feeder_queue   │ │   summary_logs   │
├──────────────────┤ ├──────────────────┤ ├──────────────────┤
│ id (PK)          │ │ id (PK)          │ │ id (PK)          │
│ repo_id (FK)     │ │ repo_id (FK)     │ │ repo_id (FK)     │
│ repo_name        │ │ repo_name(UNIQUE)│ │ filename(UNIQUE) │
│ period           │ │ status (pending) │ │ processed_at     │
│ period_key       │ │ readme_content   │ └──────────────────┘
│ rank             │ └────────┬─────────┘
│ stars_count      │          │
└──────────────────┘          ▼
                     ┌──────────────────┐
                     │   ai_summaries   │
                     ├──────────────────┤
                     │ id (PK)          │
                     │ summary_date (UQ)│
                     │ model (gemini)   │
                     │ content (md)     │
                     └──────────────────┘
```

### Database Invariants & Safety Measures
1. **Crash-Safe Trigger (`set_stars_count`):** Automatic trigger converts string star counts (e.g. `"241,804"`) into an indexed `stars_count INTEGER` column using `COALESCE(NULLIF(REGEXP_REPLACE(NEW.total_stars, '[^0-9]', '', 'g'), '')::INTEGER, 0)`.
2. **Rank Preservation (`LEAST` Logic):** In trending ranks, `#1` is superior to `#25`. The highest rank achieved is preserved deterministically using `LEAST(highest_rank_achieved, new_rank)`.
3. **Queue Deduplication:** `feeder_queue` enforces `UNIQUE(repo_name)` to prevent duplicate pending queue entries during re-scrapes.
4. **Referential Integrity:** Child tables (`trending_snapshots`, `feeder_queue`, `summary_logs`) reference `repositories(id) ON DELETE CASCADE`.

---

## 📁 Repository Directory Anatomy

```
github-trend-tracker/
├── .github/workflows/
│   └── automate.yml          # Automated daily GitHub Action & dynamic branch runner
├── dashboard/                # React (Vite) + Tailwind web application
│   ├── src/
│   │   ├── App.tsx           # Dashboard UI with infinite scroll & dynamic filters
│   │   ├── supabase.ts       # Supabase client initializer
│   │   ├── main.tsx          # React application root entry point
│   │   └── index.css         # Tailwind styles & theme variables
│   ├── index.html            # Single-page HTML container
│   ├── vite.config.ts        # Vite build tool configuration
│   └── package.json          # Frontend dependencies & scripts
├── supabase/
│   ├── config.toml           # Supabase CLI project configuration
│   └── migrations/           # Versioned SQL migrations (triggers, indexes, schema)
│       ├── 20261104031129_init_schema.sql
│       ├── 20261104144556_optimize_queries_and_stars.sql
│       ├── 20261104153000_safe_stars_count_trigger.sql
│       └── 20261104161000_backfill_snapshots_and_clean_languages.sql
├── tests/
│   ├── test_github_collector.py  # Unit tests for scraper & API fallback
│   └── test_decoupling.py        # Integration tests for Supabase data layer
├── data/                     # Local fallback storage (dual/local mode)
├── git-trend.py              # Trending scraper with 2-tier fallback
├── summarize.py              # Gemini AI architecture analyzer
├── supabase_client.py        # Relational Supabase Data Access Layer
├── migrate_to_supabase.py    # Local data/ to Supabase migration script
├── vercel.json               # Root Vercel build configuration for dashboard
├── pyproject.toml            # uv project manifest & pytest configuration
├── requirements.txt          # Standard pip dependencies
├── .env.example              # Environment variables template
└── README.md                 # Complete project documentation
```

---

## 🌿 Dual-Branch Development & Release Cycle

To prevent unverified changes from impacting production, all work follows the isolated **Branch & Release Loop**:

```
[ New Feature / Refactoring ]
              │
              ▼
    [ Branch: test ]
       ├── 1. Code modification & local development
       ├── 2. Run automated tests: uv run pytest -v (15/15 passing)
       └── 3. Push to remote: git push origin test
              │
              ▼
    [ Cloud Verification (GitHub Actions) ]
       ├── Open GitHub Actions ➔ "Run workflow"
       ├── Select: Use workflow from "test"
       └── Verify 37-second run with Green Checkmark (Success)
              │
              ▼
    [ Production Promotion (main) ]
       ├── git checkout main
       ├── git merge --ff-only test  (Clean linear history, no merge bubbles)
       └── git push origin main
              │
              ▼
    [ Automatic Vercel Deployment ]
       └── Root vercel.json triggers automatic build & updates production live site!
```

---

## ⚡ Command Matrix & Quick Reference

| Task | Command | Description |
|---|---|---|
| **Environment Sync** | `uv sync` | Installs virtual environment & dependencies |
| **Run Test Suite** | `uv run pytest -v` | Executes all 15 automated test cases |
| **Scrape Repositories** | `uv run git-trend.py` | Scrapes trending repos & persists to Supabase |
| **Generate Summaries** | `uv run summarize.py` | Pulls pending queue items & generates AI reports |
| **Start Local Dashboard**| `npm --prefix dashboard run dev` | Launches frontend locally on `localhost:5173` |
| **Build Dashboard** | `npm --prefix dashboard run build` | Compiles production bundle in `dashboard/dist` |
| **Database Migrations** | `supabase db push` | Synchronizes versioned SQL migrations |

---

## 🚀 Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
# Supabase Configuration
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-service-role-or-anon-key>
STORAGE_MODE=supabase

# AI Summarization
GEMINI_API_KEY=<your-google-gemini-api-key>

# GitHub API Token (Optional, raises fallback rate limit from 60 to 5,000 req/hr)
GITHUB_TOKEN=<your-github-personal-access-token>
```

---

## 🤖 GitHub Actions CI/CD Automation

Automated daily scraping and summarization run via `.github/workflows/automate.yml`:
* **Schedule:** Daily at midnight UTC (`0 0 * * *`) + manual trigger (`workflow_dispatch`).
* **Dynamic Branch Support:** Automatically resolves target branch (`${GITHUB_REF_NAME:-main}`) for seamless testing on `test` or `main`.
* **Zero Git Bloat:** All records write directly to Supabase; git working tree remains 100% clean.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

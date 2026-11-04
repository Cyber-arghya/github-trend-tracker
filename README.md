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

## 📖 About This Project

### The Problem
Open-source moves at breakneck speed. Groundbreaking developer tools, AI frameworks, and infrastructure libraries trend on GitHub for 24–48 hours and then disappear into the noise. Engineers and tech leads constantly struggle with:
1. **Discovery Fatigue:** Manually browsing GitHub Trending every day is time-consuming.
2. **Missing Architectural Context:** Star counts alone don't indicate if a project is production-ready, well-architected, or safe to adopt.
3. **Lost Historical Trends:** GitHub provides no native historical archive of what was trending 3 months or a year ago.

### The Solution
**GitHub Trend Tracker** solves this with an autonomous, self-healing pipeline:
- **Autonomous Scraper:** Automatically tracks Daily, Weekly, and Monthly trending repositories at midnight UTC.
- **Relational Memory:** Persists long-term discovery dates, highest achieved ranks (#1 is best), and star growth in Supabase.
- **Gemini AI Architect:** Reads technical specifications from raw READMEs and generates structured, developer-focused architecture reports highlighting production viability, security boundaries, and ROI.
- **Modern Web Dashboard:** Provides instant search, infinite scroll cataloging, frequency-based language filters, and rich markdown summary viewers.

---

## ⚙️ How It Works

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    1. DISCOVERY & INGESTION                 │
   │  Scrapes GitHub Trending HTML across Daily, Weekly, Monthly │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  2. TWO-TIER DATA RESILIENCE                │
   │  Missing language or stars?                                 │
   │  Tier 1: Restores known metadata from Supabase history      │
   │  Tier 2: Queries GitHub API with GITHUB_TOKEN (5,000 req/hr)│
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  3. ATOMIC DATABASE STORAGE                 │
   │  - Upserts into public.repositories                         │
   │  - PostgreSQL trigger parses integer stars_count via regex  │
   │  - Preserves LEAST rank (#1 rank beats #20)                 │
   │  - Enqueues unanalyzed repositories into public.feeder_queue│
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  4. GEMINI AI ARCHITECT ENGINE              │
   │  - Pulls bounded batches (max 15 repos) from feeder_queue   │
   │  - Prompts Gemini 2.5 Flash to evaluate production readiness│
   │  - Persists analysis to public.ai_summaries                 │
   │  - Atomically marks feeder items as 'processed'             │
   └──────────────────────────────┬──────────────────────────────┘
                                  │
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                  5. REAL-TIME VERCEL DASHBOARD              │
   │  - Server-side indexed pagination with scroll locks         │
   │  - Frequency-ordered language filters: Python, TS, Rust...  │
   │  - Multi-column sorting & full-text client search           │
   └─────────────────────────────────────────────────────────────┘
```

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

---

## 👤 User Guide: How to Use & Customize

### Scenario A: Local Development & Quick Run
If you want to run the pipeline locally on your machine:

```bash
# 1. Clone the repository
git clone https://github.com/Cyber-arghya/github-trend-tracker.git
cd github-trend-tracker

# 2. Install all dependencies with uv (Lightning fast)
uv sync

# (Alternatively with standard pip: pip install -r requirements.txt)

# 3. Create your .env file
cp .env.example .env

# 4. Fill in your API keys in .env:
#    - GEMINI_API_KEY (Get free key from Google AI Studio)
#    - SUPABASE_URL & SUPABASE_KEY (From Supabase project settings)

# 5. Run the scraper:
uv run git-trend.py

# 6. Run the AI architecture analyzer:
uv run summarize.py

# 7. Launch the local web dashboard:
npm --prefix dashboard install
npm --prefix dashboard run dev
```

---

### Scenario B: Cloud Automation (Fork & Run on Your GitHub)
You can run this entire system 100% in the cloud without keeping your PC on:

1. **Fork this repository** to your GitHub account.
2. Go to **Settings ➔ Secrets and variables ➔ Actions** in your forked repo.
3. Click **New repository secret** and add:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `SUPABASE_URL`: Your Supabase project URL (`https://<id>.supabase.co`).
   - `SUPABASE_KEY`: Your Supabase service role or anon key.
4. **Trigger Manually or Wait for Cron:**
   - Go to the **Actions** tab ➔ Click **Automated Scraper & AI Analyzer** ➔ Click **Run workflow**.
   - It runs automatically every day at midnight UTC (`00:00 UTC`).

---

### Scenario C: Zero-Cloud / Free Local-Only Mode
Don't have a Supabase account? You can run the entire pipeline completely offline or on local storage:

1. In `.env`, set:
   ```env
   STORAGE_MODE=local
   GEMINI_API_KEY=your-gemini-key
   ```
2. Run `uv run git-trend.py` and `uv run summarize.py`.
3. All data will be saved cleanly inside the local `data/` directory (`data/daily/`, `data/readmes/`, `data/summaries/`).

---

### Scenario D: Customizing AI Prompts & Models
You can tailor the AI analysis to your specific engineering discipline:

1. Open `summarize.py`.
2. Modify the `prompt` string (around line 65) to change the focus:
   - *Example:* Change from "DevOps & Infrastructure" to "Web3 & Blockchain", "Cybersecurity Tools", or "Frontend Frameworks".
3. Change the Gemini model:
   ```python
   # In summarize.py
   model='gemini-2.5-flash'  # Fast & cost-effective (Default)
   # Or upgrade to:
   model='gemini-2.5-pro'    # Deep reasoning & extensive architectural breakdown
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

## 📄 License
This project is open-source under the [MIT License](LICENSE).

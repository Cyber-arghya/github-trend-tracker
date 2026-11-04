# GitHub Trend Tracker & AI Architecture Analyzer

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![uv](https://img.shields.io/badge/managed%20by-uv-261230.svg)](https://github.com/astral-sh/uv)
[![Supabase](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E.svg)](https://supabase.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Deployment-Vercel-black.svg)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An automated engineering intelligence pipeline that tracks GitHub Daily, Weekly, and Monthly trending repositories, captures historical rank trajectories, extracts technical README documentation, and generates actionable production-readiness architecture reports using Google Gemini AI.

All operational data is decoupled from git storage into **Supabase** (PostgreSQL) using the **Supabase CLI**, with a live, real-time web dashboard deployed on **Vercel**.

---

## 🌐 Live Web Dashboard (Vercel)

A fast, responsive dashboard built with **React (Vite) + Tailwind CSS + Lucide Icons**, connected live to Supabase.

* **Production URL:** [https://github-trend-tracker-theta.vercel.app](https://github-trend-tracker-theta.vercel.app)
* **Key Features:**
  * **Interactive Infinite Scroll:** Infinite scroll catalog with scroll lock guards and compute-optimized pagination (exact count queried strictly on initial load, subsequent pages fetched via lean `.range(start, end)`).
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
cd dashboard
npm install
npm run dev

# Build and deploy to Vercel
npm run build
vercel deploy --prod
```

---

## 🏗️ Architecture & Decoupled Database Design

All historical records, feeder queues, and AI analyses are stored relationally in Supabase PostgreSQL:

```
                   ┌───────────────────────────┐
                   │   GitHub Trending Page    │
                   └─────────────┬─────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   git-trend.py  │ ◄── [GITHUB_TOKEN 5k req/hr fallback]
                        └────────┬────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌───────────────────────┐       ┌───────────────────────┐
     │  public.repositories  │       │  public.feeder_queue  │
     │  - name (UNIQUE)      │       │  - status: pending    │
     │  - stars_count (INDEX)│       │  - UNIQUE(repo_name)  │
     │  - LEAST rank logic   │       └───────────┬───────────┘
     └───────────────────────┘                   │
                 │                               ▼
                 ▼                      ┌─────────────────┐
     ┌───────────────────────┐          │  summarize.py   │
     │  trending_snapshots   │          │ (Gemini Flash)  │
     │  - daily/weekly/month │          └────────┬────────┘
     │  - FOREIGN KEY CASCADE│                   │
     └───────────────────────┘                   ▼
                                     ┌───────────────────────┐
                                     │  public.ai_summaries  │
                                     │  (DevOps Reports)     │
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │   Vercel Dashboard    │
                                     │ (Live React Analytics)│
                                     └───────────────────────┘
```

### Database Invariants & Safety Measures
1. **Crash-Safe Trigger (`set_stars_count`):** Automatic trigger converts string star counts (e.g. `"241,804"`) into an indexed `stars_count INTEGER` column using `COALESCE(NULLIF(REGEXP_REPLACE(NEW.total_stars, '[^0-9]', '', 'g'), '')::INTEGER, 0)`.
2. **Rank Preservation (`LEAST` Logic):** In trending ranks, `#1` is superior to `#25`. The highest rank achieved is preserved deterministically using `LEAST(highest_rank_achieved, new_rank)`.
3. **Queue Deduplication:** `feeder_queue` enforces `UNIQUE(repo_name)` to prevent duplicate pending queue entries during re-scrapes.
4. **Referential Integrity:** Child tables (`trending_snapshots`, `feeder_queue`, `summary_logs`) reference `repositories(id) ON DELETE CASCADE`.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (managed via `uv` or standard Python)
- Node.js 18+ (Node 20+ LTS recommended)
- Supabase CLI (`npm install -g supabase`)
- Vercel CLI (`npm install -g vercel`)
- Google Gemini API Key

### 2. Installation with `uv` (Recommended)
This repository is fully configured for [uv](https://github.com/astral-sh/uv):

```bash
# Clone the repository
git clone https://github.com/Cyber-arghya/github-trend-tracker.git
cd github-trend-tracker

# Sync virtual environment & all dependencies instantly
uv sync

# Install frontend dashboard dependencies
cd dashboard
npm install
cd ..
```

*(Alternatively with standard pip: `pip install -r requirements.txt`)*

### 3. Environment Configuration
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

## ⚡ Supabase CLI Workflow

Database migrations are version-controlled in `supabase/migrations/`:

```bash
# Link to your hosted Supabase project
supabase link --project-ref <your-project-ref>

# Push migrations to remote database
supabase db push

# (Optional) Local Supabase development via Docker
supabase start
supabase migration up
```

---

## 🏃 Running the Pipeline

### 1. Scrape Trending Repositories
```bash
# Run with uv:
uv run git-trend.py

# Or standard Python:
python git-trend.py
```
- Fetches Daily, Weekly, and Monthly trending pages from GitHub.
- Extracts language, stars, and descriptions with two-tier fallback (local history -> GitHub API).
- Upserts repository records into `repositories`, logs historical snapshots into `trending_snapshots`, and enqueues unanalyzed repositories into `feeder_queue`.

### 2. Generate AI Architecture Reports
```bash
# Run with uv:
uv run summarize.py

# Or standard Python:
python summarize.py
```
- Retrieves pending repositories from `feeder_queue` in bounded batches (max 15 items per run).
- Analyzes tool architecture, ROI, and production viability using Gemini 2.5 Flash.
- Persists reports into `ai_summaries` and marks queue items as processed.
- Gracefully alerts and exits if `GEMINI_API_KEY` is not set or uses a placeholder.

---

## 🧪 Testing & Quality Assurance

Comprehensive automated tests verify HTML scraping, language extraction, fallback API requests, database decoupling, and ranking logic:

```bash
# Run the complete test suite with pytest (15/15 tests passing)
uv run pytest -v

# Or standard Python unittest
python -m unittest discover tests
```

---

## 🤖 GitHub Actions CI/CD Automation

Automated daily scraping and summarization run via `.github/workflows/automate.yml`:
* **Schedule:** Daily at midnight UTC (`0 0 * * *`) + manual trigger (`workflow_dispatch`).
* **Environment Secrets:**
  * `SUPABASE_URL`
  * `SUPABASE_KEY`
  * `GEMINI_API_KEY`
  * `GITHUB_TOKEN` (Automatically provided by GitHub Actions for 5,000 req/hr API access).
* **Zero Git Bloat:** All records write directly to Supabase; git working tree remains 100% clean.

---

## 📁 Repository Structure

```
github-trend-tracker/
├── .github/workflows/
│   └── automate.yml          # Automated daily GitHub Action
├── .agents/                  # Autonomous context, rules & gotchas
├── dashboard/                # React (Vite) + Tailwind web application
│   ├── src/
│   │   ├── App.tsx           # Dashboard UI with infinite scroll & dynamic filters
│   │   └── supabase.ts       # Supabase JS client
│   └── package.json
├── supabase/
│   ├── config.toml           # Supabase CLI project configuration
│   └── migrations/           # Versioned SQL migrations (triggers, indexes, schema)
├── tests/
│   ├── test_github_collector.py  # Unit tests for scraper & API fallback
│   └── test_decoupling.py        # Integration tests for Supabase data layer
├── git-trend.py              # Trending scraper with 2-tier fallback
├── summarize.py              # Gemini AI architecture analyzer
├── supabase_client.py        # Relational Supabase Data Access Layer
├── pyproject.toml            # uv project manifest & pytest configuration
├── requirements.txt          # Standard pip dependencies
└── README.md                 # Complete project documentation
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

# GitHub Trend Tracker & AI Architecture Analyzer

An automated system that scrapes daily, weekly, and monthly GitHub trending repositories, tracks discovery history, extracts README specifications, and generates production-readiness architecture reports using Google Gemini AI.

Data storage is completely decoupled from code using **Supabase** (PostgreSQL) and the **Supabase CLI**, with a live web dashboard deployed on **Vercel**.

---

## 🌐 Live Web Dashboard (Vercel)

A clean, responsive dashboard built with **React (Vite) + Tailwind CSS + Lucide Icons**, connected live to Supabase.

* **Production URL:** [https://github-trend-tracker-theta.vercel.app](https://github-trend-tracker-theta.vercel.app)
* **Features:**
  * **Trending Snapshots:** Browse Daily, Weekly, and Monthly rankings with language filters, star counts, and status indicators (🔥 New Entry vs 🔄 Re-trending).
  * **AI Architecture Summaries:** Read Gemini 2.5 Flash analysis reports directly in rich Markdown.
  * **Repository Catalog:** Searchable table of all 450+ discovered repositories with highest achieved ranks.
  * **Accessible & Responsive:** Implements modern container-aware data tables with sticky headers.

```bash
# Run the dashboard locally
cd dashboard
npm install
npm run dev

# Deploy to Vercel via Vercel CLI
vercel deploy --prod
```

---

## 🏗️ Architecture: Decoupled Data Storage

Previously, trending snapshots, repository history, and AI summaries were committed as markdown and JSON files directly into the repository `data/` directory. 

With Supabase decoupled storage:
- **`public.repositories`**: Replaces `history.json` with a relational repository catalog (name, url, language, stars, highest rank achieved, discovery date).
- **`public.trending_snapshots`**: Replaces `data/daily/`, `data/weekly/`, and `data/monthly/` markdown logs with structured snapshot records.
- **`public.feeder_queue`**: Replaces `data/feeder/latest/` filesystem queue with a transactional pending/processed queue.
- **`public.ai_summaries`**: Replaces `data/summaries/` with structured date-indexed architectural analysis records.
- **`public.summary_logs`**: Replaces `data/summary_log.json` to prevent duplicate summarization.

```
                  ┌──────────────────────┐
                  │ GitHub Trending Page │
                  └──────────┬───────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  git-trend.py   │
                    └────────┬────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌─────────────────────────┐       ┌───────────────────────┐
│  public.repositories    │       │  public.feeder_queue  │
│  (Supabase PostgreSQL)  │       │  (Supabase Pending)   │
└─────────────────────────┘       └───────────┬───────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  summarize.py   │
                                     │ (Gemini Flash)  │
                                     └────────┬────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │  public.ai_summaries  │
                                  │  (Supabase Reports)   │
                                  └───────────┬───────────┘
                                              │
                                              ▼
                                  ┌───────────────────────┐
                                  │   Vercel Dashboard    │
                                  │ (Live React Analytics)│
                                  └───────────────────────┘
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ (Node 22 LTS recommended)
- Supabase CLI (`npm install -g supabase`)
- Vercel CLI (`npm install -g vercel`)
- Google Gemini API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Cyber-arghya/github-trend-tracker.git
cd github-trend-tracker

# Install Python dependencies
pip install -r requirements.txt

# Install Dashboard dependencies
cd dashboard
npm install
cd ..
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your credentials:
```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-service-role-or-anon-key>
GEMINI_API_KEY=<your-gemini-api-key>
STORAGE_MODE=supabase
```

---

## ⚡ Supabase CLI Workflow

The project is initialized with Supabase CLI (`supabase/config.toml` and migrations in `supabase/migrations/`).

### Option A: Hosted Supabase Project (Active)
1. Link to your hosted project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```
2. Push database migrations:
   ```bash
   supabase db push
   ```

### Option B: Local Supabase Development
If you have Docker Desktop running:
1. Start local Supabase containers:
   ```bash
   supabase start
   ```
2. Apply migrations locally:
   ```bash
   supabase migration up
   ```

---

## 🔄 Historical Data Migration

To migrate your existing historical records from `data/` into Supabase:

```bash
# Test migration without modifying the database:
python migrate_to_supabase.py --dry-run

# Run full migration to Supabase:
python migrate_to_supabase.py
```

This migrates:
- All 450+ repositories from `data/history.json` -> `public.repositories`
- All 60+ AI markdown reports from `data/summaries/` -> `public.ai_summaries`
- All 380+ processed entries from `data/summary_log.json` -> `public.summary_logs`
- All 1,800+ historical trending rankings -> `public.trending_snapshots`

---

## 🏃 Running the Pipeline

### 1. Scrape Trending Repositories
```bash
# Using uv:
uv run git-trend.py

# Or standard Python:
python git-trend.py
```
Discovers new trending repos, extracts their READMEs, upserts repository metadata into `repositories`, logs snapshot rankings into `trending_snapshots`, and queues unanalyzed tools into `feeder_queue`.

### 2. Generate AI Architecture Summaries
```bash
# Using uv:
uv run summarize.py

# Or standard Python:
python summarize.py
```
Pulls pending repositories from `feeder_queue`, analyzes production readiness with Gemini 2.5 Flash, saves the output to `ai_summaries`, and marks items as processed.

---

## 🧪 Testing with `uv` & `pytest`

The project is fully **`uv` adaptive**. Run tests or sync environments using high-performance `uv`:

```bash
# Sync virtual environment & development dependencies
uv sync

# Run the complete automated test suite (15/15 tests)
uv run pytest -v

# Or run using standard Python unittest
python -m unittest discover tests
```

---

## 🤖 GitHub Actions Automation

The workflow `.github/workflows/automate.yml` runs daily at midnight UTC:
- Executes `git-trend.py` and `summarize.py`
- Reads `SUPABASE_URL`, `SUPABASE_KEY`, and `GEMINI_API_KEY` from repository secrets
- Stores all data directly into Supabase without bloating git history

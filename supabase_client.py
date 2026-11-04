"""
Supabase Data Access Layer for GitHub Trend Tracker.
Decouples repository history, trending snapshots, feeder queues, and AI summaries
from the local filesystem to Supabase PostgreSQL storage.
"""

from __future__ import annotations

import os, sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Automatically load environment variables from .env if present
load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "").strip()
STORAGE_MODE: str = os.getenv("STORAGE_MODE", "supabase").strip().lower()

_client = None

def get_supabase_client():
    """Lazily initialize and return the Supabase client."""
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_KEY:
        return None

    try:
        from supabase import create_client, Client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _client
    except Exception as exc:
        print(f"⚠️ [Supabase] Failed to initialize Supabase client: {exc}")
        return None

def is_supabase_configured() -> bool:
    """Check if Supabase credentials are configured."""
    return bool(SUPABASE_URL and SUPABASE_KEY)

# =========================================================================
# Repository History Management
# =========================================================================

def fetch_repository_history() -> Dict[str, Dict[str, Any]]:
    """
    Fetch all tracked repositories from Supabase 'repositories' table.
    Returns a dict keyed by repository name, matching the legacy history.json schema.
    """
    client = get_supabase_client()
    if not client:
        return {}

    try:
        # Fetch up to 10,000 repositories in batches of 1,000
        history: Dict[str, Dict[str, Any]] = {}
        batch_size = 1000
        start = 0

        while True:
            res = (
                client.table("repositories")
                .select("name, discovered_on, category_lang, highest_rank_achieved, total_stars, url")
                .range(start, start + batch_size - 1)
                .execute()
            )
            rows = res.data or []
            for row in rows:
                history[row["name"]] = {
                    "discovered_on": str(row.get("discovered_on", "")),
                    "category_lang": row.get("category_lang", "Unknown"),
                    "highest_rank_achieved": row.get("highest_rank_achieved", 999),
                    "total_stars": str(row.get("total_stars", "0")),
                    "url": row.get("url", f"https://github.com/{row['name']}"),
                }

            if len(rows) < batch_size:
                break
            start += batch_size

        return history
    except Exception as exc:
        print(f"⚠️ [Supabase] Error reading repository history: {exc}")
        return {}

def save_repository(
    name: str,
    url: str,
    discovered_on: str,
    category_lang: str,
    highest_rank_achieved: int,
    total_stars: str,
    readme_content: Optional[str] = None,
) -> bool:
    """
    Upsert a single repository record into Supabase.
    Ensures LEAST (best) rank is preserved when repository already exists.
    """
    client = get_supabase_client()
    if not client:
        return False

    # Ensure LEAST rank: rank 1 is highest, rank 25 is lower -> keep min integer
    try:
        existing = client.table("repositories").select("id, highest_rank_achieved").eq("name", name).execute()
        if existing.data and len(existing.data) > 0:
            prev_rank = existing.data[0].get("highest_rank_achieved")
            if prev_rank is not None:
                highest_rank_achieved = min(int(prev_rank), int(highest_rank_achieved))
    except Exception:
        pass

    payload = {
        "name": name,
        "url": url,
        "discovered_on": discovered_on,
        "category_lang": category_lang,
        "highest_rank_achieved": highest_rank_achieved,
        "total_stars": total_stars,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if readme_content is not None:
        payload["readme_content"] = readme_content

    try:
        client.table("repositories").upsert(payload, on_conflict="name").execute()
        return True
    except Exception as exc:
        print(f"⚠️ [Supabase] Error saving repository '{name}': {exc}")
        return False

def bulk_upsert_repositories(repo_list: List[Dict[str, Any]]) -> int:
    """
    Bulk upsert repositories in batches of 100 for high performance.
    """
    client = get_supabase_client()
    if not client or not repo_list:
        return 0

    batch_size = 100
    inserted = 0
    for i in range(0, len(repo_list), batch_size):
        batch = repo_list[i : i + batch_size]
        try:
            client.table("repositories").upsert(batch, on_conflict="name").execute()
            inserted += len(batch)
        except Exception as exc:
            print(f"⚠️ [Supabase] Bulk upsert error on batch {i}-{i+len(batch)}: {exc}")

    return inserted

# =========================================================================
# Trending Snapshots Management
# =========================================================================

def record_trending_snapshot(
    repo_name: str,
    period: str,
    period_key: str,
    rank: int,
    stars: str,
    category_lang: str,
    is_new: bool,
) -> bool:
    """
    Upsert a trending snapshot row into 'trending_snapshots' table.
    """
    client = get_supabase_client()
    if not client:
        return False

    payload = {
        "repo_name": repo_name,
        "period": period,
        "period_key": period_key,
        "rank": rank,
        "stars": stars,
        "category_lang": category_lang,
        "is_new": is_new,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        client.table("trending_snapshots").upsert(
            payload, on_conflict="repo_name,period,period_key"
        ).execute()
        return True
    except Exception as exc:
        print(f"⚠️ [Supabase] Error recording snapshot for '{repo_name}': {exc}")
        return False

# =========================================================================
# Feeder Queue Management
# =========================================================================

def enqueue_feeder(
    repo_name: str,
    rank: int,
    period: str,
    readme_filename: str,
    readme_content: str,
) -> bool:
    """
    Queue a new trending repository README for AI summarization.
    """
    client = get_supabase_client()
    if not client:
        return False

    payload = {
        "repo_name": repo_name,
        "rank": rank,
        "period": period,
        "readme_filename": readme_filename,
        "readme_content": readme_content,
        "status": "pending",
        "queued_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        client.table("feeder_queue").upsert(
            payload, on_conflict="repo_name"
        ).execute()
        return True
    except Exception as exc:
        print(f"⚠️ [Supabase] Error queueing feeder item '{readme_filename}': {exc}")
        return False

def get_pending_feeder_items() -> List[Dict[str, Any]]:
    """
    Fetch all items currently in 'pending' status from the feeder queue.
    """
    client = get_supabase_client()
    if not client:
        return []

    try:
        res = (
            client.table("feeder_queue")
            .select("id, repo_name, rank, period, readme_filename, readme_content")
            .eq("status", "pending")
            .order("id")
            .execute()
        )
        return res.data or []
    except Exception as exc:
        print(f"⚠️ [Supabase] Error fetching pending feeder items: {exc}")
        return []

def mark_feeder_processed(queue_ids: List[int], filenames: List[str]) -> bool:
    """
    Mark feeder items as processed and log them into 'summary_logs'.
    """
    client = get_supabase_client()
    if not client:
        return False

    now_iso = datetime.now(timezone.utc).isoformat()
    success = True

    # 1. Update status in feeder_queue
    if queue_ids:
        try:
            client.table("feeder_queue").update({
                "status": "processed",
                "processed_at": now_iso
            }).in_("id", queue_ids).execute()
        except Exception as exc:
            print(f"⚠️ [Supabase] Error updating feeder_queue status: {exc}")
            success = False

    # 2. Insert into summary_logs
    if filenames:
        logs_payload = [{"filename": fn, "processed_at": now_iso} for fn in filenames]
        try:
            client.table("summary_logs").upsert(
                logs_payload, on_conflict="filename"
            ).execute()
        except Exception as exc:
            print(f"⚠️ [Supabase] Error recording summary logs: {exc}")
            success = False

    return success

# =========================================================================
# AI Summaries Management
# =========================================================================

def save_ai_summary(
    summary_date: str,
    content: str,
    source_files: List[str],
    model: str = "gemini-2.5-flash",
) -> bool:
    """
    Save an AI-generated analysis summary to the 'ai_summaries' table.
    """
    client = get_supabase_client()
    if not client:
        return False

    payload = {
        "summary_date": summary_date,
        "model": model,
        "content": content,
        "source_files": source_files,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        client.table("ai_summaries").upsert(
            payload, on_conflict="summary_date"
        ).execute()
        return True
    except Exception as exc:
        print(f"⚠️ [Supabase] Error saving AI summary: {exc}")
        return False

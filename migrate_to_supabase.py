"""
Migration Script: Decouple & Migrate Existing Local Files to Supabase.
Reads data/history.json, data/summary_log.json, data/summaries/, and
periodic markdown snapshots, and uploads them into Supabase PostgreSQL tables.
"""

from __future__ import annotations

import sys
import re
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from supabase_client import (
    get_supabase_client,
    is_supabase_configured,
    bulk_upsert_repositories,
    save_ai_summary,
)

def migrate_history(base: Path, dry_run: bool = False) -> int:
    """Migrate data/history.json to public.repositories table."""
    hist_file = base / "history.json"
    if not hist_file.exists():
        print("ℹ️ No history.json found to migrate.")
        return 0

    print("📖 Reading data/history.json...")
    try:
        data = json.loads(hist_file.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"❌ Failed to parse history.json: {exc}")
        return 0

    repo_list: List[Dict[str, Any]] = []
    for name, meta in data.items():
        repo_list.append({
            "name": name,
            "url": meta.get("url", f"https://github.com/{name}"),
            "discovered_on": meta.get("discovered_on", "2026-08-01"),
            "category_lang": meta.get("category_lang", "Unknown"),
            "highest_rank_achieved": int(meta.get("highest_rank_achieved", 999)),
            "total_stars": str(meta.get("total_stars", "0")),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    print(f" Found {len(repo_list)} repository records.")
    if dry_run:
        print(f" [DRY-RUN] Would upsert {len(repo_list)} repositories.")
        return len(repo_list)

    count = bulk_upsert_repositories(repo_list)
    print(f"✅ Upserted {count}/{len(repo_list)} repositories into Supabase.")
    return count

def migrate_summaries(base: Path, dry_run: bool = False) -> int:
    """Migrate data/summaries/*.md to public.ai_summaries table."""
    sum_dir = base / "summaries"
    if not sum_dir.exists():
        print("ℹ️ No data/summaries directory found.")
        return 0

    md_files = list(sum_dir.glob("*_devops_ai_analysis.md"))
    print(f" Found {len(md_files)} AI summary markdown files.")

    migrated = 0
    for f in md_files:
        # Expected format: YYYY-MM-DD_devops_ai_analysis.md
        date_str = f.name.split("_")[0]
        content = f.read_text(encoding="utf-8")

        if dry_run:
            print(f" [DRY-RUN] Would migrate summary for date {date_str} ({f.name})")
            migrated += 1
            continue

        success = save_ai_summary(
            summary_date=date_str,
            content=content,
            source_files=[f.name],
            model="gemini-2.5-flash",
        )
        if success:
            migrated += 1

    print(f"✅ Successfully migrated {migrated}/{len(md_files)} summaries to Supabase.")
    return migrated

def migrate_summary_logs(base: Path, dry_run: bool = False) -> int:
    """Migrate data/summary_log.json to public.summary_logs table."""
    log_file = base / "summary_log.json"
    if not log_file.exists():
        print("ℹ️ No data/summary_log.json found.")
        return 0

    logs = json.loads(log_file.read_text(encoding="utf-8"))
    print(f" Found {len(logs)} processed items in summary_log.json.")

    if dry_run:
        print(f" [DRY-RUN] Would migrate {len(logs)} summary log entries.")
        return len(logs)

    client = get_supabase_client()
    if not client:
        return 0

    batch_size = 100
    migrated = 0
    for i in range(0, len(logs), batch_size):
        batch = [{"filename": fn, "processed_at": datetime.now(timezone.utc).isoformat()} for fn in logs[i : i + batch_size]]
        try:
            client.table("summary_logs").upsert(batch, on_conflict="filename").execute()
            migrated += len(batch)
        except Exception as exc:
            print(f"⚠️ Error upserting summary logs batch: {exc}")

    print(f"✅ Successfully migrated {migrated}/{len(logs)} summary log entries to Supabase.")
    return migrated

def migrate_periodic_snapshots(base: Path, dry_run: bool = False) -> int:
    """Migrate data/daily, data/weekly, data/monthly markdown files to public.trending_snapshots table."""
    periods = ["daily", "weekly", "monthly"]
    total_snapshots = 0
    client = get_supabase_client()

    for period in periods:
        p_dir = base / period
        if not p_dir.exists():
            continue

        md_files = list(p_dir.glob("*.md"))
        for f in md_files:
            period_key = f.stem
            content = f.read_text(encoding="utf-8")
            
            # Match ## owner/repo and status
            entries = re.findall(r"##\s+([^\s]+)\s+(?:🔥\s+\*\*\[NEW ENTRY\]\*\*|🔄\s+\[Re-trending\])", content)
            if not entries:
                continue

            snapshots = []
            for rank, repo_name in enumerate(entries, 1):
                snapshots.append({
                    "repo_name": repo_name,
                    "period": period,
                    "period_key": period_key,
                    "rank": rank,
                    "stars": "N/A",
                    "category_lang": "Unknown",
                    "is_new": False,
                    "recorded_at": datetime.now(timezone.utc).isoformat(),
                })

            if dry_run:
                total_snapshots += len(snapshots)
                continue

            if client:
                try:
                    client.table("trending_snapshots").upsert(
                        snapshots, on_conflict="repo_name,period,period_key"
                    ).execute()
                    total_snapshots += len(snapshots)
                except Exception as exc:
                    print(f"⚠️ Error upserting snapshots for {f.name}: {exc}")

    print(f"✅ Migrated {total_snapshots} historical periodic snapshots.")
    return total_snapshots

def main():
    parser = argparse.ArgumentParser(description="Migrate local data folder to Supabase.")
    parser.add_argument("--dry-run", action="store_true", help="Perform a dry run without modifying Supabase.")
    args = parser.parse_args()

    base_dir = Path("data")
    if not is_supabase_configured() and not args.dry_run:
        print("❌ Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY in .env.")
        print("👉 You can still test with --dry-run")
        return

    print("🚀 Starting Historical Data Migration to Supabase...")
    migrate_history(base_dir, dry_run=args.dry_run)
    migrate_summaries(base_dir, dry_run=args.dry_run)
    migrate_summary_logs(base_dir, dry_run=args.dry_run)
    migrate_periodic_snapshots(base_dir, dry_run=args.dry_run)
    print("\n🎉 Migration finished!")

if __name__ == "__main__":
    main()

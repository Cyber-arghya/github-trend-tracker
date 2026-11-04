import os, json, sys
from google import genai
from pathlib import Path
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from supabase_client import (
    is_supabase_configured,
    get_pending_feeder_items,
    mark_feeder_processed,
    save_ai_summary,
    STORAGE_MODE,
)

def main():
    base = Path("data")
    feeder = base / "feeder" / "latest"
    sum_dir = base / "summaries"
    log_file = base / "summary_log.json"

    use_supabase = is_supabase_configured()
    write_local = (STORAGE_MODE in ("dual", "local")) or not use_supabase

    if not os.environ.get("GEMINI_API_KEY"):
        print("⚠️ GEMINI_API_KEY is not set. Skipping AI summary generation.")
        return

    items_to_process = []
    
    if use_supabase:
        print("🔍 Checking Supabase feeder_queue for unanalyzed repositories...")
        supabase_items = get_pending_feeder_items()
        for item in supabase_items:
            items_to_process.append({
                "id": item["id"],
                "filename": item["readme_filename"],
                "content": item["readme_content"][:3000],
            })
    elif feeder.exists():
        log = json.loads(log_file.read_text()) if log_file.exists() else []
        md_files = [f for f in feeder.glob("*.md") if f.name not in log]
        for f in md_files:
            items_to_process.append({
                "id": None,
                "filename": f.name,
                "content": f.read_text(encoding="utf-8")[:3000],
                "path": f,
            })

    if not items_to_process:
        print("ℹ️ No pending repositories found to summarize.")
        return

    print(f"📦 Processing {len(items_to_process)} repositories for AI architecture analysis...")

    # Batch all unread READMEs into a single context string (limiting size per file to prevent overflow)
    context = "\n\n---\n\n".join([f"REPO: {item['filename']}\n{item['content']}" for item in items_to_process])
    
    prompt = f"""You are an Elite AI/ML & DevOps Architect. Analyze these trending GitHub repositories:
    1. Focus strictly on AI/Machine Learning and DevOps/Infrastructure tools.
    2. Create a "Priority Action List" (Top 3-5 tools) based on production readiness and developer ROI.
    3. Format output in Markdown with sections: 🏆 Priority Action List, 🤖 AI/ML Highlights, ⚙️ DevOps Highlights.
    
    Data:
    {context}"""
    
    try:
        client = genai.Client()
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        if response.text:
            today_str = f"{datetime.now():%Y-%m-%d}"
            filenames = [item["filename"] for item in items_to_process]
            queue_ids = [item["id"] for item in items_to_process if item.get("id") is not None]

            # 1. Save to Supabase
            if use_supabase:
                save_ai_summary(
                    summary_date=today_str,
                    content=response.text,
                    source_files=filenames,
                    model='gemini-2.5-flash',
                )
                mark_feeder_processed(queue_ids=queue_ids, filenames=filenames)
                print(f"✅ AI Analysis saved to Supabase 'ai_summaries' table for {today_str}")

            # 2. Save locally if requested
            if write_local:
                sum_dir.mkdir(parents=True, exist_ok=True)
                out_path = sum_dir / f"{today_str}_devops_ai_analysis.md"
                out_path.write_text(response.text, encoding="utf-8")

                log = json.loads(log_file.read_text()) if log_file.exists() else []
                for item in items_to_process:
                    if item["filename"] not in log:
                        log.append(item["filename"])
                    if "path" in item and item["path"].exists():
                        item["path"].unlink()

                log_file.write_text(json.dumps(log, indent=4), encoding="utf-8")
                print(f"✅ AI Analysis saved locally to {out_path.name}")
                
    except Exception as e:
        # On failure, files remain in feeder / status remains pending for the next run
        print(f"❌ API Error: {e}")

if __name__ == "__main__":
    main()

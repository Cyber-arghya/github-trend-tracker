import urllib.request, re, json, shutil, os, sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from supabase_client import (
    is_supabase_configured,
    fetch_repository_history,
    save_repository,
    record_trending_snapshot,
    enqueue_feeder,
    STORAGE_MODE,
)

def fetch(url):
    # Minimal URL fetcher returning string content or empty string on failure
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res: return res.read().decode('utf-8')
    except: return ""

def fetch_repo_metadata_fallback(name: str):
    """
    Fallback fetcher for repository primary language and stars via public GitHub API.
    """
    try:
        req = urllib.request.Request(f"https://api.github.com/repos/{name}", headers={'User-Agent': 'GitHub-Trend-Tracker/1.0'})
        with urllib.request.urlopen(req, timeout=4) as res:
            data = json.loads(res.read().decode('utf-8'))
            lang = data.get("language") or "Unknown"
            raw_stars = data.get("stargazers_count", 0)
            stars = f"{raw_stars:,}" if raw_stars else "0"
            return lang, stars
    except Exception:
        return "Unknown", "N/A"

def parse_trending_block(block: str) -> dict:
    """
    Extracts structured metadata (name, language, stars, description, stars_period)
    from a single GitHub Trending <article class="Box-row"> HTML block.
    """
    name_m = re.search(r'<h2.*?href="/([^"]+)"', block, re.DOTALL)
    if not name_m:
        return {}
    name = name_m.group(1).strip()

    # Primary language
    lang = "Unknown"
    if m_lang := re.search(r'<span itemprop="programmingLanguage">(.*?)</span>', block):
        lang = m_lang.group(1).strip()

    # Total stars
    stars = "N/A"
    if m_stars := re.search(f'href="/{re.escape(name)}/stargazers"[^>]*>[\\s\\S]*?<svg[^>]*>.*?</svg>\\s*([\\d,]+)', block):
        stars = m_stars.group(1).strip()
    elif m_stars_alt := re.search(r'href="[^"]*stargazers"[^>]*>[\s\S]*?<svg[^>]*>.*?</svg>\s*([\d,]+)', block):
        stars = m_stars_alt.group(1).strip()

    # Description
    desc = ""
    if m_desc := re.search(r'<p class="col-9[^"]*"[^>]*>(.*?)</p>', block, re.DOTALL):
        desc = re.sub(r'<[^>]+>', '', m_desc.group(1)).strip()

    # Stars during period
    stars_period = ""
    if m_period := re.search(r'([\d,]+)\s+stars\s+(?:today|this\s+week|this\s+month)', block, re.IGNORECASE):
        stars_period = m_period.group(1).strip()

    return {
        "name": name,
        "language": lang,
        "stars": stars,
        "description": desc,
        "stars_period": stars_period,
    }

def main():
    # Initialize workspace using pathlib for cleaner directory management
    base = Path("data")
    use_supabase = is_supabase_configured()
    write_local = (STORAGE_MODE in ("dual", "local")) or not use_supabase

    if use_supabase:
        print(" Connected to Supabase storage backend.")
        history = fetch_repository_history()
    else:
        print("⚠️ Supabase not configured; operating in local file storage mode.")
        hist_file = base / "history.json"
        history = json.loads(hist_file.read_text()) if hist_file.exists() else {}

    readmes = base / "readmes"
    feeder = base / "feeder" / "latest"

    if write_local:
        readmes.mkdir(parents=True, exist_ok=True)
        feeder.exists() and shutil.rmtree(feeder)
        feeder.mkdir(parents=True, exist_ok=True)
    
    now = datetime.now()
    periods = {
        "daily": f"{now:%Y-%m-%d}.md",
        "weekly": f"{now:%Y-W%W}.md", 
        "monthly": f"{now:%Y-%m}.md"
    }

    for period, fname in periods.items():
        period_key = fname[:-3]
        out_file = base / period / fname
        
        # Load existing markdown or initialize with header (when writing locally)
        content = ""
        if write_local:
            out_file.parent.mkdir(parents=True, exist_ok=True)
            content = out_file.read_text(encoding="utf-8") if out_file.exists() else f"# GitHub Trending - {period.title()} ({period_key})\n\n"
        
        print(f"\n⏳ Fetching {period} data...")
        html = fetch(f"https://github.com/trending?since={period}")
        
        # Split into repo blocks and parse using structured extractor with fallbacks
        for rank, block in enumerate(html.split('<article class="Box-row">')[1:], 1):
            info = parse_trending_block(block)
            if not info or not info.get("name"):
                continue

            name = info["name"]
            
            # Skip if already logged in this period's markdown (local mode)
            if write_local and f"## {name}" in content:
                continue

            lang = info["language"]
            stars = info["stars"]

            # Fallback 1: check if repository is already in history with known language and stars
            if (lang == "Unknown" or stars == "N/A") and name in history:
                prev_info = history[name]
                if lang == "Unknown" and prev_info.get("category_lang") and prev_info.get("category_lang") != "Unknown":
                    lang = prev_info["category_lang"]
                if (stars == "N/A" or stars == "0") and prev_info.get("total_stars") and prev_info.get("total_stars") not in ("N/A", "0"):
                    stars = prev_info["total_stars"]

            # Fallback 2: query GitHub API if still missing
            if lang == "Unknown" or stars == "N/A":
                fb_lang, fb_stars = fetch_repo_metadata_fallback(name)
                if lang == "Unknown" and fb_lang != "Unknown":
                    lang = fb_lang
                if stars == "N/A" and fb_stars != "N/A":
                    stars = fb_stars

            is_new = name not in history
            readme_fname = f"{rank}_{period}_{name.split('/')[-1]}.md"

            if is_new:
                repo_url = f"https://github.com/{name}"
                discovered_date = now.strftime('%Y-%m-%d')
                history[name] = {
                    "discovered_on": discovered_date, "category_lang": lang, 
                    "highest_rank_achieved": rank, "total_stars": stars, "url": repo_url
                }
                
                readme_txt = fetch(f"https://raw.githubusercontent.com/{name}/main/README.md") or \
                             fetch(f"https://raw.githubusercontent.com/{name}/master/README.md") or "README fetch failed."
                
                # Persist to Supabase
                if use_supabase:
                    save_repository(
                        name=name,
                        url=repo_url,
                        discovered_on=discovered_date,
                        category_lang=lang,
                        highest_rank_achieved=rank,
                        total_stars=stars,
                        readme_content=readme_txt,
                    )
                    enqueue_feeder(
                        repo_name=name,
                        rank=rank,
                        period=period,
                        readme_filename=readme_fname,
                        readme_content=readme_txt,
                    )

                if write_local:
                    archive = readmes / readme_fname
                    archive.write_text(f"# {name}\n**Language:** {lang} | **Rank:** {rank} | **Total Stars:** {stars}\n**URL:** https://github.com/{name}\n\n{readme_txt}", encoding="utf-8")
                    feeder.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(archive, feeder / readme_fname)

                print(f"   [+] Queued: {readme_fname} ({stars} stars)")
            else:
                # Re-trending repository: update highest_rank_achieved using LEAST (best rank)
                if use_supabase:
                    save_repository(
                        name=name,
                        url=f"https://github.com/{name}",
                        discovered_on=history.get(name, {}).get("discovered_on", now.strftime('%Y-%m-%d')),
                        category_lang=lang,
                        highest_rank_achieved=rank,
                        total_stars=stars,
                    )

            # Record snapshot in Supabase
            if use_supabase:
                record_trending_snapshot(
                    repo_name=name,
                    period=period,
                    period_key=period_key,
                    rank=rank,
                    stars=stars,
                    category_lang=lang,
                    is_new=is_new,
                )

            if write_local:
                status = "🔥 **[NEW ENTRY]**" if is_new else "🔄 [Re-trending]"
                content += f"## {name} {status}\n- **Archive:** `data/readmes/{readme_fname}`\n- **Link:** https://github.com/{name}\n\n"
        
        if write_local:
            out_file.write_text(content, encoding="utf-8")

    # Persist updated history state locally if configured
    if write_local:
        hist_file = base / "history.json"
        hist_file.write_text(json.dumps(history, indent=4), encoding="utf-8")
    
    print("\n✅ Scraping and persistence cycle completed.")

if __name__ == "__main__":
    main()

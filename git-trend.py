import urllib.request, re, json, shutil
from datetime import datetime
from pathlib import Path

def fetch(url):
    # Minimal URL fetcher returning string content or empty string on failure
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as res: return res.read().decode('utf-8')
    except: return ""

def main():
    # Initialize workspace using pathlib for cleaner directory management
    base = Path("data")
    (readmes := base / "readmes").mkdir(parents=True, exist_ok=True)
    (feeder := base / "feeder" / "latest").exists() and shutil.rmtree(feeder)
    feeder.mkdir(parents=True)
    
    hist_file = base / "history.json"
    history = json.loads(hist_file.read_text()) if hist_file.exists() else {}
    
    now = datetime.now()
    periods = {
        "daily": f"{now:%Y-%m-%d}.md",
        "weekly": f"{now:%Y-W%W}.md", 
        "monthly": f"{now:%Y-%m}.md"
    }

    for period, fname in periods.items():
        out_file = base / period / fname
        out_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing markdown or initialize with header
        content = out_file.read_text(encoding="utf-8") if out_file.exists() else f"# GitHub Trending - {period.title()} ({fname[:-3]})\n\n"
        print(f"\n⏳ Fetching {period} data...")

        html = fetch(f"https://github.com/trending?since={period}")
        
        # Split into repo blocks and parse using walrus operators to minimize conditionals
        for rank, block in enumerate(html.split('<article class="Box-row">')[1:], 1):
            if not (name_m := re.search(r'<h2.*?href="/([^"]+)"', block, re.DOTALL)): continue
            name = name_m.group(1).strip()
            
            # Skip if already logged in this period's markdown
            if f"## {name}" in content: continue

            lang = m.group(1).strip() if (m := re.search(r'<span itemprop="programmingLanguage">(.*?)</span>', block)) else "Unknown"
            stars = m.group(1).strip() if (m := re.search(f'href="/{re.escape(name)}/stargazers"[^>]*>\\s*<svg[^>]*>.*?</svg>\\s*([\\d,]+)', block, re.DOTALL)) else "N/A"
            
            is_new = name not in history
            readme_fname = f"{rank}_{period}_{name.split('/')[-1]}.md"

            if is_new:
                # Register new repository and pull README from raw github user content
                history[name] = {
                    "discovered_on": now.strftime('%Y-%m-%d'), "category_lang": lang, 
                    "highest_rank_achieved": rank, "total_stars": stars, "url": f"https://github.com/{name}"
                }
                
                readme_txt = fetch(f"https://raw.githubusercontent.com/{name}/main/README.md") or \
                             fetch(f"https://raw.githubusercontent.com/{name}/master/README.md") or "README fetch failed."
                
                archive = readmes / readme_fname
                archive.write_text(f"# {name}\n**Language:** {lang} | **Rank:** {rank} | **Total Stars:** {stars}\n**URL:** https://github.com/{name}\n\n{readme_txt}", encoding="utf-8")
                
                shutil.copy2(archive, feeder / readme_fname)
                print(f"   [+] Queued: {readme_fname} ({stars} stars)")

            status = "🔥 **[NEW ENTRY]**" if is_new else "🔄 [Re-trending]"
            content += f"## {name} {status}\n- **Archive:** `data/readmes/{readme_fname}`\n- **Link:** https://github.com/{name}\n\n"
        
        out_file.write_text(content, encoding="utf-8")

    # Persist updated history state
    hist_file.write_text(json.dumps(history, indent=4), encoding="utf-8")

if __name__ == "__main__":
    main()
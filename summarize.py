import os, json
from google import genai
from pathlib import Path
from datetime import datetime

def main():
    base = Path("data")
    feeder = base / "feeder" / "latest"
    (sum_dir := base / "summaries").mkdir(parents=True, exist_ok=True)
    log_file = base / "summary_log.json"
    
    log = json.loads(log_file.read_text()) if log_file.exists() else []
    
    # Modern SDK: Client automatically picks up GEMINI_API_KEY from env
    if not os.environ.get("GEMINI_API_KEY") or not feeder.exists(): return
    client = genai.Client()

    # Filter out already processed files
    md_files = [f for f in feeder.glob("*.md") if f.name not in log]
    if not md_files: return

    # Batch all unread READMEs into a single context string (limiting size per file to prevent overflow)
    context = "\n\n---\n\n".join([f"REPO: {f.name}\n{f.read_text(encoding='utf-8')[:3000]}" for f in md_files])
    
    prompt = f"""You are an Elite AI/ML & DevOps Architect. Analyze these trending GitHub repositories:
    1. Focus strictly on AI/Machine Learning and DevOps/Infrastructure tools.
    2. Create a "Priority Action List" (Top 3-5 tools) based on production readiness and developer ROI.
    3. Format output in Markdown with sections: 🏆 Priority Action List, 🤖 AI/ML Highlights, ⚙️ DevOps Highlights.
    
    Data:
    {context}"""
    
    try:
        # Modern SDK: Using client.models.generate_content
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        
        if response.text:
            out_path = sum_dir / f"{datetime.now():%Y-%m-%d}_devops_ai_analysis.md"
            out_path.write_text(response.text, encoding="utf-8")
            
            # Record success and delete source files from feeder
            for f in md_files:
                log.append(f.name)
                f.unlink() 
                
            log_file.write_text(json.dumps(log, indent=4))
            print(f"✅ AI Analysis saved to {out_path.name}")
            
    except Exception as e:
        # On failure, files remain in feeder for the next run
        print(f"❌ API Error: {e}")

if __name__ == "__main__":
    main()
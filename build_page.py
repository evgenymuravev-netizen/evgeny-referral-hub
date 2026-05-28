"""
Build a beautiful single-file HTML dashboard for Andrey to work through
the 23 outreach items. Data is embedded inline from active_outreach.json,
so the resulting HTML is fully self-contained.

Features:
  - Dark glassmorphism aesthetic, matching referral_hub.html
  - Progress bar weighted by status depth
  - Filter pills by block
  - Per-contact cards with copy-message, LinkedIn link, status dropdown
  - localStorage persistence
  - The pre-drafted messages use the custom_message field when present
"""
import json, pathlib, html as html_mod
HERE = pathlib.Path(__file__).parent
data = json.loads((HERE / "active_outreach.json").read_text())
try:
    open_roles_data = json.loads((HERE / "open_roles.json").read_text())
except FileNotFoundError:
    open_roles_data = {"companies": [], "companies_with_no_resolved_roles": []}

# Reuse the message generator from build_sheet.py
import importlib.util
spec = importlib.util.spec_from_file_location("bs", HERE / "build_sheet.py")
bs = importlib.util.module_from_spec(spec); spec.loader.exec_module(bs)

# Build items with computed messages
items = []
for it in data["items"]:
    msg = it.get("custom_message") or bs.generate_message(it)
    items.append({**it, "_message": msg, "_chars": len(msg), "_limit": bs.char_limit(it)})

# Sort by priority
items.sort(key=lambda x: x["priority"])

# Build a company-name → roles map for the JS layer
company_to_roles = {}
for c in open_roles_data.get("companies", []):
    for alias in c.get("aliases", [c["company"]]):
        company_to_roles[alias.lower()] = {
            "company": c["company"],
            "careers_url": c.get("careers_url"),
            "roles": c.get("roles", []),
        }
    # Also map the canonical company name
    company_to_roles[c["company"].lower()] = {
        "company": c["company"],
        "careers_url": c.get("careers_url"),
        "roles": c.get("roles", []),
    }

# Pass to JS as JSON
items_json = json.dumps(items, ensure_ascii=False)
meta_json = json.dumps(data["_meta"], ensure_ascii=False)
roles_json = json.dumps(company_to_roles, ensure_ascii=False)

# Pretty HTML
HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Outreach for Evgeny — Andrey's mission</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg-0: #0a0e1a;
    --bg-1: #121829;
    --bg-2: #1a2238;
    --bg-3: #232c46;
    --line: rgba(255,255,255,0.08);
    --line-strong: rgba(255,255,255,0.16);
    --text-0: #f5f7ff;
    --text-1: #c8d0e7;
    --text-2: #8a93b0;
    --text-3: #5c6582;
    --accent: #7c5cff;
    --accent-2: #43e7c4;
    --accent-3: #ffb86c;
    --accent-4: #ff7eb6;
    --accent-5: #4eb5e6;
    --danger: #ff5d6c;
    --success: #43e7c4;
    --warning: #ffc857;
    --radius: 16px;
    --radius-sm: 10px;
    --radius-xs: 6px;
    --shadow: 0 20px 60px -20px rgba(0,0,0,0.6);
    --shadow-lift: 0 8px 24px -8px rgba(124,92,255,0.4);

    /* Per-block accent palette */
    --block-recruiters: #ffb86c;
    --block-banks: #4eb5e6;
    --block-companies: #7c5cff;
    --block-telegram_ecosystem: #43e7c4;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg-0); color: var(--text-0);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }
  body {
    background:
      radial-gradient(circle at 10% 5%, rgba(124,92,255,0.16), transparent 40%),
      radial-gradient(circle at 90% 95%, rgba(67,231,196,0.10), transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(255,184,108,0.04), transparent 60%),
      var(--bg-0);
    min-height: 100vh;
  }
  .container { max-width: 1280px; margin: 0 auto; padding: 36px 28px 80px; }

  /* ─── Hero ─── */
  .hero {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 40px;
    align-items: end;
    padding: 44px 44px 36px;
    background: linear-gradient(135deg, rgba(124,92,255,0.10) 0%, rgba(67,231,196,0.04) 60%, transparent 100%);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    margin-bottom: 28px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    top: -50%; right: -10%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(124,92,255,0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-content { position: relative; z-index: 1; min-width: 0; }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: rgba(67,231,196,0.10);
    border: 1px solid rgba(67,231,196,0.30);
    color: var(--accent-2);
    border-radius: 100px;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.8px; text-transform: uppercase;
    margin-bottom: 16px;
  }
  .eyebrow::before {
    content: ''; width: 6px; height: 6px;
    background: var(--accent-2);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.5); }
  }
  h1 {
    font-size: clamp(32px, 4.5vw, 48px);
    font-weight: 800;
    margin: 0 0 14px;
    background: linear-gradient(135deg, #fff 0%, #c8d0e7 70%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .hero-tagline {
    font-size: 17px;
    color: var(--text-1);
    margin: 0 0 4px;
    max-width: 700px;
  }
  .hero-pitch {
    font-size: 14px;
    color: var(--text-2);
    margin: 14px 0 0;
    padding: 14px 18px;
    background: rgba(0,0,0,0.25);
    border-left: 3px solid var(--accent-2);
    border-radius: var(--radius-xs);
    font-style: italic;
    max-width: 700px;
  }

  /* ─── Stats ring ─── */
  .stats {
    position: relative; z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 28px;
    text-align: center;
  }
  .stat-block { white-space: nowrap; }
  .stat-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 36px; font-weight: 700;
    background: linear-gradient(135deg, var(--accent-2), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
  }
  .stat-label {
    font-size: 11px;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-top: 6px;
    font-weight: 600;
  }

  /* ─── Progress ─── */
  .progress-wrap {
    margin: 22px 0 0;
    position: relative; z-index: 1;
  }
  .progress-track {
    height: 10px;
    background: rgba(255,255,255,0.06);
    border-radius: 100px;
    overflow: hidden;
    position: relative;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2), var(--accent-3));
    border-radius: 100px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative; overflow: hidden;
  }
  .progress-fill::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 2s infinite;
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  .progress-labels {
    display: flex; justify-content: space-between;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-2);
  }
  .progress-labels strong {
    color: var(--text-0);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }

  /* ─── Filter bar ─── */
  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 26px;
    padding: 14px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: 100px;
    align-items: center;
    position: sticky;
    top: 12px;
    z-index: 50;
    backdrop-filter: blur(12px);
    background: rgba(18,24,41,0.85);
  }
  .filter-label {
    font-size: 12px;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    padding-left: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    border-radius: 100px;
    background: transparent;
    border: 1px solid var(--line);
    color: var(--text-1);
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .pill:hover { background: rgba(255,255,255,0.05); color: var(--text-0); }
  .pill.active {
    background: rgba(124,92,255,0.15);
    border-color: var(--accent);
    color: var(--text-0);
  }
  .pill-count {
    font-size: 11px;
    background: rgba(255,255,255,0.08);
    padding: 1px 8px;
    border-radius: 100px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }
  .pill.active .pill-count { background: rgba(255,255,255,0.15); }
  .filter-sep {
    width: 1px; height: 24px;
    background: var(--line);
    margin: 0 4px;
  }

  /* ─── Grid ─── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
    gap: 18px;
  }
  .empty-state {
    text-align: center;
    padding: 80px 20px;
    color: var(--text-2);
    grid-column: 1 / -1;
  }
  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  /* ─── Card ─── */
  .card {
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .card:hover {
    border-color: var(--line-strong);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lift);
  }
  .card.is-sent { opacity: 0.65; }
  .card.is-sent:hover { opacity: 1; }
  .card-stripe {
    height: 4px;
    background: var(--block-color, var(--accent));
    width: 100%;
  }
  .card-head {
    padding: 22px 24px 18px;
    border-bottom: 1px solid var(--line);
  }
  .card-meta-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 600;
  }
  .card-prio {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.04);
    padding: 4px 10px;
    border-radius: 100px;
    font-family: 'JetBrains Mono', monospace;
  }
  .card-prio strong { color: var(--block-color, var(--accent)); }
  .card-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-0);
    margin: 0 0 5px;
    letter-spacing: -0.01em;
  }
  .card-name-needs-input {
    color: var(--warning);
  }
  .card-name-needs-input::after {
    content: ' (needs identification)';
    font-size: 13px;
    color: var(--text-3);
    font-weight: 400;
  }
  .card-role {
    font-size: 13px;
    color: var(--text-2);
    margin: 0;
  }
  .card-role strong {
    color: var(--text-1);
    font-weight: 600;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba(255,255,255,0.05);
    color: var(--text-1);
    border: 1px solid var(--line);
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .chip-ask {
    background: rgba(124,92,255,0.12);
    border-color: rgba(124,92,255,0.3);
    color: #b09cff;
  }
  .chip-relocate {
    background: rgba(67,231,196,0.12);
    border-color: rgba(67,231,196,0.3);
    color: var(--accent-2);
  }
  .chip-jobs {
    background: rgba(255,184,108,0.12);
    border-color: rgba(255,184,108,0.3);
    color: var(--accent-3);
  }
  .chip-salary {
    background: rgba(255,200,87,0.10);
    border-color: rgba(255,200,87,0.3);
    color: var(--warning);
  }
  .chip-personal {
    background: rgba(255,126,182,0.10);
    border-color: rgba(255,126,182,0.3);
    color: var(--accent-4);
  }
  .chip-1st { background: rgba(67,231,196,0.10); color: var(--accent-2); border-color: rgba(67,231,196,0.3); }
  .chip-2nd { background: rgba(255,255,255,0.04); color: var(--text-2); }

  /* ─── Message ─── */
  .message-wrap {
    padding: 16px 24px;
    flex: 1;
  }
  .message-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 600;
  }
  .chars {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-2);
  }
  .chars-over { color: var(--danger); }
  .message {
    background: rgba(0,0,0,0.28);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--text-1);
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
    margin: 0;
  }
  .message::-webkit-scrollbar { width: 6px; }
  .message::-webkit-scrollbar-track { background: transparent; }
  .message::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 3px; }

  /* ─── Job URLs ─── */
  .job-urls {
    margin: 14px 24px 0;
    padding: 12px 14px;
    background: rgba(255,184,108,0.06);
    border: 1px solid rgba(255,184,108,0.2);
    border-radius: var(--radius-sm);
  }
  .job-urls-label {
    font-size: 11px;
    color: var(--accent-3);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .job-url {
    display: block;
    color: var(--text-1);
    font-size: 12px;
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 6px;
    margin-bottom: 4px;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--line);
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: all 0.15s ease;
  }
  .job-url:hover {
    background: rgba(255,184,108,0.08);
    border-color: rgba(255,184,108,0.3);
    color: var(--text-0);
  }
  .job-url::before { content: '→ '; color: var(--accent-3); }

  /* ─── Notes ─── */
  .notes {
    margin: 14px 24px 0;
    padding: 10px 14px;
    background: rgba(124,92,255,0.06);
    border-left: 2px solid rgba(124,92,255,0.4);
    border-radius: var(--radius-xs);
    font-size: 12px;
    color: var(--text-2);
    line-height: 1.5;
  }
  .notes-label {
    color: var(--accent);
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-right: 6px;
  }

  /* ─── Actions ─── */
  .actions {
    padding: 16px 24px 22px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--line-strong);
    background: rgba(255,255,255,0.04);
    color: var(--text-0);
    text-decoration: none;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.08); }
  .btn-primary {
    background: linear-gradient(135deg, var(--accent), #5b3eff);
    border-color: transparent;
    box-shadow: 0 4px 14px -4px rgba(124,92,255,0.6);
  }
  .btn-primary:hover { background: linear-gradient(135deg, #8a6bff, #6b4eff); }
  .btn-success {
    background: rgba(67,231,196,0.18);
    border-color: rgba(67,231,196,0.4);
    color: var(--accent-2);
  }
  .btn svg { width: 14px; height: 14px; }
  .btn.is-copied {
    background: var(--accent-2);
    color: var(--bg-0);
    border-color: var(--accent-2);
  }

  .status-select {
    background: var(--bg-2);
    border: 1px solid var(--line);
    color: var(--text-1);
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    margin-left: auto;
  }
  .status-select:focus { outline: none; border-color: var(--accent); }

  /* ─── Block divider ─── */
  .block-divider {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 6px 4px;
    margin-top: 8px;
  }
  .block-divider:first-child { margin-top: 0; }
  .block-divider-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, var(--block-color, var(--accent)), transparent);
    opacity: 0.4;
  }
  .block-divider-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-0);
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .block-divider-title::before {
    content: '';
    width: 10px; height: 10px;
    background: var(--block-color, var(--accent));
    border-radius: 50%;
    box-shadow: 0 0 12px var(--block-color, var(--accent));
  }
  .block-divider-count {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-3);
    background: var(--bg-2);
    padding: 2px 10px;
    border-radius: 100px;
    border: 1px solid var(--line);
  }

  /* ─── Toast ─── */
  .toast {
    position: fixed;
    bottom: 30px; right: 30px;
    background: var(--bg-1);
    border: 1px solid var(--accent-2);
    color: var(--text-0);
    padding: 14px 20px;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
    display: flex; align-items: center; gap: 10px;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 1000;
    font-size: 14px; font-weight: 500;
  }
  .toast.show { transform: translateX(0); }
  .toast::before {
    content: '✓';
    width: 22px; height: 22px;
    background: var(--accent-2);
    color: var(--bg-0);
    border-radius: 50%;
    display: grid; place-items: center;
    font-weight: 700; font-size: 13px;
  }

  /* ─── Footer ─── */
  .footer {
    margin-top: 60px;
    padding: 32px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  .footer h3 {
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 14px;
    color: var(--text-0);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .footer h3::before {
    content: '⚠';
    color: var(--warning);
  }
  .footer ol {
    margin: 0; padding-left: 22px;
    color: var(--text-2);
    font-size: 13px;
    line-height: 1.7;
  }
  .footer ol li { margin-bottom: 4px; }
  .pitch-box {
    margin-top: 22px;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(67,231,196,0.08), rgba(124,92,255,0.04));
    border: 1px solid rgba(67,231,196,0.25);
    border-radius: var(--radius-sm);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--text-0);
    line-height: 1.6;
  }
  .pitch-box-label {
    font-size: 11px;
    color: var(--accent-2);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    margin-bottom: 8px;
    display: block;
  }

  /* ─── Confetti ─── */
  .confetti {
    position: fixed; pointer-events: none;
    inset: 0; z-index: 999;
    overflow: hidden; display: none;
  }
  .confetti.show { display: block; }
  .confetti-piece {
    position: absolute;
    width: 10px; height: 10px;
    background: var(--accent);
    top: -10px;
    animation: fall 3s linear forwards;
  }
  @keyframes fall {
    to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }

  /* ─── LinkedIn search box ─── */
  .li-search {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 16px 20px;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    margin-bottom: 24px;
  }
  .li-search-icon {
    color: #4eb5e6;
    flex-shrink: 0;
  }
  .li-search-icon svg { width: 22px; height: 22px; }
  .li-search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-0);
    font-family: inherit;
    font-size: 14px;
    outline: none;
    padding: 6px 0;
  }
  .li-search-input::placeholder { color: var(--text-3); }
  .li-search-help {
    font-size: 11px;
    color: var(--text-3);
    margin-right: 4px;
    white-space: nowrap;
  }

  /* ─── Add LinkedIn URL inline ─── */
  .add-url {
    margin: 0 24px 14px;
    padding: 10px 12px;
    background: rgba(255,200,87,0.06);
    border: 1px dashed rgba(255,200,87,0.3);
    border-radius: var(--radius-xs);
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .add-url-input {
    flex: 1;
    background: rgba(0,0,0,0.25);
    border: 1px solid var(--line);
    color: var(--text-0);
    padding: 7px 10px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    outline: none;
  }
  .add-url-input:focus { border-color: var(--warning); }
  .add-url-btn {
    background: rgba(255,200,87,0.18);
    border: 1px solid rgba(255,200,87,0.4);
    color: var(--warning);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
  }

  /* ─── Open roles section ─── */
  .open-roles {
    margin: 14px 24px 0;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(67,231,196,0.25);
    background: rgba(67,231,196,0.04);
    overflow: hidden;
  }
  .open-roles-head {
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s ease;
  }
  .open-roles-head:hover { background: rgba(67,231,196,0.08); }
  .open-roles-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--accent-2);
    text-transform: uppercase;
    letter-spacing: 0.7px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .open-roles-toggle {
    transition: transform 0.2s ease;
    color: var(--accent-2);
  }
  .open-roles.open .open-roles-toggle { transform: rotate(180deg); }
  .open-roles-toggle svg { width: 14px; height: 14px; }
  .open-roles-body {
    display: none;
    padding: 0 14px 14px;
  }
  .open-roles.open .open-roles-body { display: block; }
  .role-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--line);
    border-radius: 8px;
    margin-bottom: 8px;
  }
  .role-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-0);
    margin: 0;
  }
  .role-meta {
    font-size: 11px;
    color: var(--text-2);
  }
  .role-meta strong { color: var(--text-1); }
  .role-actions {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .role-actions .btn {
    padding: 6px 10px;
    font-size: 11px;
  }
  .role-actions .btn svg { width: 12px; height: 12px; }
  .careers-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--accent-2);
    text-decoration: none;
    margin-top: 6px;
  }
  .careers-link:hover { text-decoration: underline; }

  /* ─── Sequence Mode (guided) ─── */
  .seq-bar {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 9px 18px 9px 14px;
    background: linear-gradient(135deg, var(--accent), #5b3eff);
    color: white;
    border: none;
    border-radius: 100px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 6px 18px -6px rgba(124,92,255,0.7);
    margin-left: auto;
    transition: transform 0.15s ease;
  }
  .seq-bar:hover { transform: translateY(-1px); }
  .seq-bar svg { width: 16px; height: 16px; }

  .seq-panel {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(200%);
    width: min(720px, calc(100vw - 48px));
    background: var(--bg-1);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    box-shadow: 0 20px 60px -10px rgba(0,0,0,0.7);
    z-index: 200;
    transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    overflow: hidden;
  }
  .seq-panel.show { transform: translateX(-50%) translateY(0); }
  .seq-progress {
    height: 4px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
  }
  .seq-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transition: width 0.3s ease;
  }
  .seq-body {
    padding: 22px 26px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 20px;
    align-items: center;
  }
  .seq-info { min-width: 0; }
  .seq-eyebrow {
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .seq-eyebrow strong { color: var(--accent-2); font-family: 'JetBrains Mono', monospace; }
  .seq-name {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-0);
    margin: 0 0 2px;
  }
  .seq-meta {
    font-size: 13px;
    color: var(--text-2);
    margin: 0 0 8px;
  }
  .seq-hint {
    font-size: 12px;
    color: var(--text-2);
    background: rgba(67,231,196,0.08);
    border: 1px solid rgba(67,231,196,0.25);
    border-radius: var(--radius-xs);
    padding: 8px 12px;
    margin-top: 8px;
    line-height: 1.4;
  }
  .seq-hint kbd {
    background: var(--bg-3);
    border: 1px solid var(--line-strong);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .seq-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }
  .seq-actions .btn {
    width: 200px;
    justify-content: center;
  }

  @media (max-width: 720px) {
    .hero { grid-template-columns: 1fr; }
    .stats { grid-template-columns: repeat(3, 1fr); }
    .grid { grid-template-columns: 1fr; }
    .seq-body { grid-template-columns: 1fr; }
    .seq-actions .btn { width: 100%; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- HERO -->
  <header class="hero">
    <div class="hero-content">
      <span class="eyebrow">Andrey's mission · Refer Evgeny</span>
      <h1>23 asks. One trusted CPO.<br/>Let's get him introduced.</h1>
      <p class="hero-tagline">Each card below is one specific outreach Evgeny asked you for — pre-drafted, ready to copy, channel-specific. Update status as you go.</p>
      <p class="hero-pitch">
        <strong style="color:var(--text-0);">The line that does the work:</strong><br/>
        Evgeny helped us build our merchant lending and payments product, wallets for business in UAE.
      </p>
    </div>
    <div class="stats">
      <div class="stat-block">
        <div class="stat-num" id="stat-sent">0</div>
        <div class="stat-label">Sent</div>
      </div>
      <div class="stat-block">
        <div class="stat-num" id="stat-replied">0</div>
        <div class="stat-label">Replied</div>
      </div>
      <div class="stat-block">
        <div class="stat-num" id="stat-total">__TOTAL__</div>
        <div class="stat-label">Total asks</div>
      </div>
    </div>
    <div class="progress-wrap" style="grid-column: 1 / -1;">
      <div class="progress-track">
        <div class="progress-fill" id="progress-fill" style="width:0%"></div>
      </div>
      <div class="progress-labels">
        <span><strong id="progress-pct">0%</strong> through the pipeline</span>
        <span><strong id="progress-momentum">0</strong> momentum points</span>
      </div>
    </div>
  </header>

  <!-- LINKEDIN LIVE SEARCH -->
  <div class="li-search">
    <span class="li-search-icon">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18v-8.42H5.67V18h2.67zM7 8.4a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zM18.34 18v-4.61c0-2.47-1.32-3.62-3.08-3.62a2.66 2.66 0 0 0-2.42 1.33h-.04V9.58h-2.55V18h2.66v-4.16c0-1.1.21-2.16 1.57-2.16 1.34 0 1.36 1.26 1.36 2.23V18h2.5z"/></svg>
    </span>
    <input class="li-search-input" id="li-search" placeholder="Search LinkedIn live — type name + company, hit Enter (opens results in new tab)" />
    <span class="li-search-help">↵ Enter</span>
  </div>

  <!-- FILTERS -->
  <div class="filter-bar" id="filter-bar">
    <span class="filter-label">Block</span>
    <button class="pill active" data-filter-block="all">All <span class="pill-count" id="count-all">__TOTAL__</span></button>
    <button class="pill" data-filter-block="recruiters">Recruiters <span class="pill-count" id="count-recruiters">__C_RECR__</span></button>
    <button class="pill" data-filter-block="banks">Banks <span class="pill-count" id="count-banks">__C_BANK__</span></button>
    <button class="pill" data-filter-block="companies">Companies <span class="pill-count" id="count-companies">__C_COMP__</span></button>
    <button class="pill" data-filter-block="telegram_ecosystem">Telegram <span class="pill-count" id="count-telegram_ecosystem">__C_TG__</span></button>
    <div class="filter-sep"></div>
    <span class="filter-label">Status</span>
    <button class="pill active" data-filter-status="all">All</button>
    <button class="pill" data-filter-status="not_started">To do</button>
    <button class="pill" data-filter-status="sent">Sent</button>
    <button class="pill" data-filter-status="replied">Replied</button>
    <button class="seq-bar" id="start-sequence">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Start guided sequence
    </button>
  </div>

  <!-- GRID -->
  <div class="grid" id="grid"></div>

  <!-- FOOTER -->
  <div class="footer">
    <h3>Hard rules — please follow</h3>
    <ol>
      <li><strong style="color:var(--text-0);">Never paraphrase the product attribution line.</strong> Use it verbatim every time.</li>
      <li>LinkedIn connection-request notes are HARD CAPPED at 300 characters.</li>
      <li>Don't open with "Hi NAME, hope you're well at COMPANY" — open directly with the introduction.</li>
      <li>Always include the job URLs when they're shown on a card. Evgeny specifically pointed at those roles.</li>
      <li>Always mention relocation when it's chipped on a card — it tells the recipient he's serious.</li>
      <li>Max 10 LinkedIn sends per day — LinkedIn rate-limits aggressively.</li>
      <li>Replies are gold — update status to "Replied" the moment one lands.</li>
    </ol>
    <div class="pitch-box">
      <span class="pitch-box-label">The canonical product attribution</span>
      Evgeny helped us build our merchant lending and payments product, wallets for business in UAE
    </div>
  </div>
</div>

<div class="toast" id="toast">Copied to clipboard</div>
<div class="confetti" id="confetti"></div>

<!-- Guided sequence panel -->
<div class="seq-panel" id="seq-panel">
  <div class="seq-progress"><div class="seq-progress-fill" id="seq-progress-fill" style="width:0%"></div></div>
  <div class="seq-body">
    <div class="seq-info">
      <div class="seq-eyebrow"><strong id="seq-pos">1</strong> of <strong id="seq-total">1</strong> · via <span id="seq-channel">LinkedIn</span></div>
      <h3 class="seq-name" id="seq-name">—</h3>
      <p class="seq-meta" id="seq-meta">—</p>
      <div class="seq-hint" id="seq-hint">Message copied to clipboard. Tab opened. Paste with <kbd>⌘V</kbd> and review before hitting Send.</div>
    </div>
    <div class="seq-actions">
      <button class="btn btn-success" id="seq-sent">✓ Sent — next</button>
      <button class="btn" id="seq-skip">Skip →</button>
      <button class="btn" id="seq-stop">Stop sequence</button>
    </div>
  </div>
</div>

<script>
const ITEMS = __ITEMS__;
const ROLES_BY_COMPANY = __ROLES__;
const STORAGE_KEY = 'andrey_outreach_v1';
const URL_STORAGE_KEY = 'andrey_added_urls_v1';
const EVGENY_LINKEDIN = 'https://linkedin.com/in/evgenymuravev';
const PITCH = 'Evgeny helped us build our merchant lending and payments product, wallets for business in UAE';

const BLOCK_COLORS = {
  recruiters: 'var(--block-recruiters)',
  banks: 'var(--block-banks)',
  companies: 'var(--block-companies)',
  telegram_ecosystem: 'var(--block-telegram_ecosystem)',
};
const BLOCK_NAMES = {
  recruiters: 'Recruiters',
  banks: 'Banks',
  companies: 'Companies',
  telegram_ecosystem: 'Telegram ecosystem',
};
const ASK_LABELS = {
  send_cv: 'send CV',
  recommend_for_role: 'refer to specific role',
  recommend_generally: 'recommend generally',
  intro_to_founders: 'request intro',
  post_in_chat: 'post in chat',
  ask_about_openings: 'ask about openings',
};
const STATUSES = [
  { id: 'not_started', label: '· Not started', momentum: 0 },
  { id: 'in_progress', label: '✍ In progress', momentum: 0 },
  { id: 'sent', label: '📤 Sent', momentum: 1 },
  { id: 'replied', label: '💬 Replied', momentum: 2 },
  { id: 'intro_scheduled', label: '🤝 Intro scheduled', momentum: 3 },
  { id: 'offer', label: '💼 Offer', momentum: 5 },
  { id: 'accepted', label: '🏆 Accepted', momentum: 7 },
  { id: 'declined', label: '❌ Declined', momentum: 0 },
  { id: 'skipped', label: '⊘ Skipped', momentum: 0 },
];
const MAX_MOMENTUM = ITEMS.length * 7;

/* ─── Channel icons & detection ─── */
const ICON_LINKEDIN = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18v-8.42H5.67V18h2.67zM7 8.4a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zM18.34 18v-4.61c0-2.47-1.32-3.62-3.08-3.62a2.66 2.66 0 0 0-2.42 1.33h-.04V9.58h-2.55V18h2.66v-4.16c0-1.1.21-2.16 1.57-2.16 1.34 0 1.36 1.26 1.36 2.23V18h2.5z"/></svg>';
const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4a3 3 0 0 1-2 .9c-.4 0-1.6-.5-3-1.6-1.5-1.4-1.9-2.4-2-2.9 0-.2.1-.5.3-.7l.4-.4c.2-.2.2-.4.1-.6L10.5 7c-.1-.3-.3-.3-.5-.3h-.5c-.3 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.8 0 1.7 1.2 3.3 1.4 3.5.2.3 2.4 3.6 5.7 4.8 2.7 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.2-1.6.3-.7.3-1.4.2-1.6-.1-.1-.3-.2-.6-.4l-2.8-1.4M12 22A10 10 0 0 1 2 12a10 10 0 0 1 10-10 10 10 0 0 1 10 10c0 1.7-.4 3.3-1.2 4.7L22 22l-5.3-1.5c-1.4.7-3 1-4.7 1m0-2.3a7.7 7.7 0 0 0 4.3-1.3l.4-.2 3.1.9-.9-3 .3-.5a7.7 7.7 0 1 0-7.2 4.1z"/></svg>';
const ICON_TG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.05 1.577c-.393-.016-.784.08-1.117.235-.484.186-4.92 1.902-9.41 3.64-2.26.873-4.518 1.746-6.256 2.415-1.737.67-3.045 1.168-3.114 1.195-.46.16-1.082.362-1.61.984a1.61 1.61 0 0 0-.354 1.16c.022.275.13.5.234.66.279.426.617.534.872.665l5.518 1.835 1.18 3.866L6.7 18.3c-.034.106-.04.207-.045.314-.005.107-.025.225.01.354.024.13.103.276.227.379.124.103.292.166.46.166.27 0 .388-.05.51-.09l3.04-2.94 5.382 4.117c.295.17.667.244.974.184.307-.06.602-.218.815-.485 1.144-1.42 1.523-3.083 1.84-4.685.642-3.245 1.305-7.073 1.844-10.265.22-1.295.388-2.39.467-3.16.04-.385.06-.71.046-1.03-.014-.32-.024-.586-.222-.875a1.123 1.123 0 0 0-.59-.41 1.354 1.354 0 0 0-.408-.07Z"/></svg>';
const ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';

function channelsFor(item) {
  // Determine which channel buttons to show, in order of preference
  // based on the item's `channel` field (free-text)
  const ch = (item.channel || 'LinkedIn').toLowerCase();
  const channels = [];
  // Parse channel field: usually "LinkedIn", "WhatsApp or LinkedIn", "Telegram or WhatsApp"
  if (ch.includes('telegram')) channels.push('telegram');
  if (ch.includes('whatsapp') || ch.includes('wa')) channels.push('whatsapp');
  if (ch.includes('linkedin')) channels.push('linkedin');
  if (ch.includes('email') || ch.includes('mail')) channels.push('email');
  if (channels.length === 0) channels.push('linkedin');

  return channels.map(id => {
    if (id === 'linkedin') return { id: 'linkedin', label: 'LinkedIn', svg: ICON_LINKEDIN };
    if (id === 'whatsapp') return { id: 'whatsapp', label: 'WhatsApp', svg: ICON_WA };
    if (id === 'telegram') return { id: 'telegram', label: 'Telegram', svg: ICON_TG };
    if (id === 'email') return { id: 'email', label: 'Email', svg: ICON_MAIL };
    return { id, label: id, svg: '' };
  });
}

function urlFor(item, channelId) {
  // Returns { url, prefilled, hint } for the given channel.
  const msg = item._message;
  const enc = encodeURIComponent(msg);
  if (channelId === 'linkedin') {
    const li = linkedinFor(item);
    const url = li
      ? li
      : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(item.name + ' ' + (item.company || ''))}`;
    return {
      url,
      prefilled: false,
      hint: item.linkedin
        ? 'Profile opened. Click <strong>Message</strong>, then paste with <kbd>⌘V</kbd>.'
        : 'LinkedIn search opened. Click the right profile, then click <strong>Message</strong> → paste with <kbd>⌘V</kbd>.'
    };
  }
  if (channelId === 'whatsapp') {
    if (item.phone) {
      const phone = String(item.phone).replace(/\D/g, '');
      return {
        url: `https://web.whatsapp.com/send?phone=${phone}&text=${enc}`,
        prefilled: true,
        hint: 'WhatsApp opened with message <strong>pre-filled</strong>. Review and hit the send arrow.'
      };
    }
    // No phone — open WA web, message in clipboard
    return {
      url: 'https://web.whatsapp.com/',
      prefilled: false,
      hint: `WhatsApp Web opened. Search for <strong>${escapeHtml(item.name)}</strong> at the top, open the chat, then paste with <kbd>⌘V</kbd>.`
    };
  }
  if (channelId === 'telegram') {
    if (item.tg_username) {
      return {
        url: `https://t.me/${String(item.tg_username).replace(/^@/, '')}`,
        prefilled: false,
        hint: 'Telegram chat opened. Click the input and paste with <kbd>⌘V</kbd>.'
      };
    }
    return {
      url: 'https://web.telegram.org/a/',
      prefilled: false,
      hint: `Telegram opened. Search for <strong>${escapeHtml(item.name)}</strong>, open the chat, then paste with <kbd>⌘V</kbd>.`
    };
  }
  if (channelId === 'email') {
    return {
      url: `mailto:?subject=${encodeURIComponent('intro — ' + item.name + ' for product at ' + (item.company || ''))}&body=${enc}`,
      prefilled: true,
      hint: 'Email composer opened with body pre-filled. Fill in the recipient and send.'
    };
  }
  return { url: '#', prefilled: false, hint: '' };
}

function sendVia(item, channelId) {
  const { url, prefilled, hint } = urlFor(item, channelId);
  // Always copy to clipboard as a safety net (in case pre-fill fails)
  navigator.clipboard.writeText(item._message).catch(() => {});
  // Open in new tab
  const win = window.open(url, '_blank');
  if (!win) {
    showToast('⚠ Popup blocked — allow popups for this page');
    return;
  }
  showToast(prefilled ? 'Pre-filled & copied' : 'Message copied — paste with ⌘V');
}

let state = loadState();
let addedUrls = loadAddedUrls();
let filters = { block: 'all', status: 'all' };

function loadAddedUrls() {
  try { return JSON.parse(localStorage.getItem(URL_STORAGE_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveAddedUrls() {
  try { localStorage.setItem(URL_STORAGE_KEY, JSON.stringify(addedUrls)); }
  catch (e) {}
}
function linkedinFor(item) {
  // Prefer user-added URL over original
  return addedUrls[item.id] || item.linkedin || null;
}

function findRoles(companyName) {
  if (!companyName) return null;
  // Look up by exact match first, then by alias match
  const k = companyName.toLowerCase();
  if (ROLES_BY_COMPANY[k]) return ROLES_BY_COMPANY[k];
  // Try the first word/segment
  const short = k.split(' (')[0].split(' ')[0];
  if (ROLES_BY_COMPANY[short]) return ROLES_BY_COMPANY[short];
  return null;
}

function generateRoleReferral(item, role) {
  // Auto-prepare a referral text that mentions the specific role + URL
  const name = (item.name || '').split(' ')[0] || 'there';
  const company = item.company || 'your company';
  return `${name} — would like to introduce you to Evgeny who is exploring open roles at ${company} in product.

${PITCH}. He's specifically interested in the "${role.title}" role:
${role.url}

I highly recommend him for product roles in payments or lending.

his LinkedIn: ${EVGENY_LINKEDIN}
happy to share his CV directly.

— Andrey`;
}

const $ = s => document.querySelector(s);

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (e) { return {}; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) {}
}
function statusFor(id) { return state[id]?.status || 'not_started'; }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function copy(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('is-copied');
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Copied';
    setTimeout(() => { btn.classList.remove('is-copied'); btn.innerHTML = orig; }, 1800);
    showToast('Message copied');
  });
}

let toastTimeout;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 2400);
}

function setStatus(id, value) {
  state[id] = { ...(state[id] || {}), status: value, updatedAt: new Date().toISOString() };
  saveState();
  renderAll();
  if (value === 'accepted' || value === 'offer') confetti();
}

function confetti() {
  const c = $('#confetti');
  c.classList.add('show');
  c.innerHTML = '';
  const colors = ['#7c5cff','#43e7c4','#ffb86c','#ff7eb6','#4eb5e6','#ffc857'];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = (2 + Math.random() * 2) + 's';
    c.appendChild(p);
  }
  setTimeout(() => c.classList.remove('show'), 5000);
}

function visibleItems() {
  return ITEMS.filter(item => {
    const s = statusFor(item.id);
    if (filters.block !== 'all' && item.block !== filters.block) return false;
    if (filters.status !== 'all') {
      if (filters.status === 'not_started' && s !== 'not_started') return false;
      if (filters.status === 'sent' && s !== 'sent') return false;
      if (filters.status === 'replied' && !['replied','intro_scheduled','offer','accepted'].includes(s)) return false;
    }
    return true;
  });
}

function renderProgress() {
  let sent = 0, replied = 0, momentum = 0;
  for (const item of ITEMS) {
    const s = STATUSES.find(x => x.id === statusFor(item.id));
    if (!s) continue;
    if (['sent','replied','intro_scheduled','offer','accepted'].includes(s.id)) sent++;
    if (['replied','intro_scheduled','offer','accepted'].includes(s.id)) replied++;
    momentum += s.momentum;
  }
  $('#stat-sent').textContent = sent;
  $('#stat-replied').textContent = replied;
  const pct = Math.round((momentum / MAX_MOMENTUM) * 100);
  $('#progress-fill').style.width = pct + '%';
  $('#progress-pct').textContent = pct + '%';
  $('#progress-momentum').textContent = momentum + ' / ' + MAX_MOMENTUM;
}

function cardHtml(item) {
  const blockColor = BLOCK_COLORS[item.block] || 'var(--accent)';
  const ask = ASK_LABELS[item.ask_type] || item.ask_type;
  const status = statusFor(item.id);
  const isSent = ['sent','replied','intro_scheduled','offer','accepted','declined','skipped'].includes(status);
  const liUrl = linkedinFor(item);
  const needsInput = !liUrl;
  const chars = item._chars;
  const limit = item._limit;
  const overLimit = chars > limit;
  const companyRoles = findRoles(item.company);

  const chips = [];
  chips.push(`<span class="chip chip-ask">${escapeHtml(ask)}</span>`);
  if (item.degree === 1) chips.push(`<span class="chip chip-1st">1st degree</span>`);
  if (item.degree === 2) chips.push(`<span class="chip chip-2nd">2nd degree</span>`);
  if (item.message_available) chips.push(`<span class="chip">DMs open</span>`);
  if (item.andrey_direct_mutual) chips.push(`<span class="chip">strong mutual</span>`);
  if (item.relocation) chips.push(`<span class="chip chip-relocate">📍 ${escapeHtml(item.relocation)}</span>`);
  if (item.salary_note) chips.push(`<span class="chip chip-salary">${escapeHtml(item.salary_note)}</span>`);
  if (item.custom_message) chips.push(`<span class="chip chip-personal">personalised</span>`);
  if (item.job_urls && item.job_urls.length) chips.push(`<span class="chip chip-jobs">${item.job_urls.length} job URL${item.job_urls.length > 1 ? 's' : ''}</span>`);

  // Smart channel actions
  const channels = channelsFor(item);
  const channelButtons = channels.map((ch, i) => {
    const isPrimary = i === 0;
    const cls = isPrimary ? 'btn btn-primary send-btn' : 'btn send-btn';
    return `<button class="${cls}" data-id="${item.id}" data-channel="${ch.id}">
      ${ch.svg}
      ${isPrimary ? 'Send via ' : ''}${ch.label}
    </button>`;
  }).join('');

  const jobUrlsHtml = (item.job_urls && item.job_urls.length) ? `
    <div class="job-urls">
      <div class="job-urls-label">Specific roles to mention</div>
      ${item.job_urls.map(u => `<a class="job-url" href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a>`).join('')}
    </div>` : '';

  const notesHtml = item.andrey_notes ? `
    <div class="notes">
      <span class="notes-label">Note</span>${escapeHtml(item.andrey_notes)}
    </div>` : '';

  // Add-URL inline input for unidentified contacts
  const addUrlHtml = needsInput ? `
    <div class="add-url">
      <input class="add-url-input" type="url" placeholder="paste LinkedIn URL here" data-id="${item.id}" />
      <button class="add-url-btn" data-id="${item.id}">Save URL</button>
    </div>` : '';

  // Open roles section for this company
  let rolesHtml = '';
  if (companyRoles && companyRoles.roles && companyRoles.roles.length > 0) {
    const rolesItems = companyRoles.roles.map((r, idx) => `
      <div class="role-item">
        <p class="role-title">${escapeHtml(r.title)}</p>
        <p class="role-meta">
          ${r.location ? '📍 ' + escapeHtml(r.location) + ' · ' : ''}
          ${r.salary ? '💰 ' + escapeHtml(r.salary) + ' · ' : ''}
          ${r.verified ? '<strong style="color:var(--accent-2);">verified live</strong>' : '<strong style="color:var(--warning);">unverified</strong>'}
        </p>
        ${r.note ? `<p class="role-meta" style="opacity:0.7;">${escapeHtml(r.note)}</p>` : ''}
        <div class="role-actions">
          <a class="btn" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View role
          </a>
          <button class="btn btn-primary role-send-btn" data-item="${item.id}" data-role-idx="${idx}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            Send referral for this role
          </button>
        </div>
      </div>
    `).join('');
    rolesHtml = `
    <div class="open-roles" data-roles-for="${item.id}">
      <div class="open-roles-head" onclick="this.parentElement.classList.toggle('open')">
        <div class="open-roles-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          ${companyRoles.roles.length} open role${companyRoles.roles.length > 1 ? 's' : ''} at ${escapeHtml(companyRoles.company)}
        </div>
        <span class="open-roles-toggle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
      <div class="open-roles-body">
        ${rolesItems}
        ${companyRoles.careers_url ? `<a class="careers-link" href="${escapeHtml(companyRoles.careers_url)}" target="_blank" rel="noopener">→ Browse full ${escapeHtml(companyRoles.company)} careers page</a>` : ''}
      </div>
    </div>`;
  }

  const company = item.company || '';
  const role = item.role || '';
  const roleStr = role && company ? `<strong>${escapeHtml(role)}</strong> · ${escapeHtml(company)}` : (role || company);

  return `
    <article class="card ${isSent ? 'is-sent' : ''}" style="--block-color: ${blockColor};" data-id="${item.id}" data-block="${item.block}" data-status="${status}">
      <div class="card-stripe"></div>
      <div class="card-head">
        <div class="card-meta-top">
          <span class="card-prio">priority <strong>${item.priority}</strong></span>
          <span>${escapeHtml(item.id)}</span>
        </div>
        <h2 class="card-name ${needsInput ? 'card-name-needs-input' : ''}">${escapeHtml(item.name)}</h2>
        <p class="card-role">${roleStr}</p>
        <div class="chips">${chips.join('')}</div>
      </div>
      <div class="message-wrap">
        <div class="message-head">
          <span>Pre-drafted message</span>
          <span class="chars ${overLimit ? 'chars-over' : ''}">${chars} / ${limit} chars</span>
        </div>
        <pre class="message">${escapeHtml(item._message)}</pre>
      </div>
      ${jobUrlsHtml}
      ${notesHtml}
      ${addUrlHtml}
      ${rolesHtml}
      <div class="actions">
        ${channelButtons}
        <button class="btn copy-btn" data-msg="${escapeHtml(item._message)}" title="Copy only">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <select class="status-select" data-id="${item.id}">
          ${STATUSES.map(s => `<option value="${s.id}" ${s.id === status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
    </article>`;
}

function blockDivider(block, count) {
  return `
    <div class="block-divider" style="--block-color: ${BLOCK_COLORS[block]};">
      <span class="block-divider-title">${escapeHtml(BLOCK_NAMES[block])}</span>
      <span class="block-divider-count">${count}</span>
      <span class="block-divider-line"></span>
    </div>`;
}

function renderGrid() {
  const items = visibleItems();
  const grid = $('#grid');
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🪜</div>
        <p>No items match your filters.</p>
      </div>`;
    return;
  }
  // Group by block
  const byBlock = {};
  for (const it of items) {
    (byBlock[it.block] = byBlock[it.block] || []).push(it);
  }
  const blockOrder = ['recruiters','banks','companies','telegram_ecosystem'];
  let html = '';
  for (const b of blockOrder) {
    if (!byBlock[b]) continue;
    html += blockDivider(b, byBlock[b].length);
    html += byBlock[b].map(cardHtml).join('');
  }
  grid.innerHTML = html;

  // Wire up handlers
  grid.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copy(btn.dataset.msg, btn));
  });
  grid.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', e => setStatus(sel.dataset.id, sel.value));
  });
  grid.querySelectorAll('.send-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = ITEMS.find(x => x.id === btn.dataset.id);
      sendVia(item, btn.dataset.channel);
      // Auto-update status to in_progress if it was not_started
      if (statusFor(item.id) === 'not_started') {
        state[item.id] = { ...(state[item.id] || {}), status: 'in_progress', updatedAt: new Date().toISOString() };
        saveState();
        renderProgress();
        // Update select without full re-render
        const sel = grid.querySelector(`.status-select[data-id="${item.id}"]`);
        if (sel) sel.value = 'in_progress';
      }
    });
  });
  // Add-URL handlers
  grid.querySelectorAll('.add-url-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const input = grid.querySelector(`.add-url-input[data-id="${id}"]`);
      const url = (input.value || '').trim();
      if (!url || !url.startsWith('http')) {
        showToast('Paste a valid LinkedIn URL (https://...)');
        return;
      }
      addedUrls[id] = url;
      saveAddedUrls();
      renderAll();
      showToast('LinkedIn URL saved');
    });
  });
  // Per-role send-referral buttons
  grid.querySelectorAll('.role-send-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = ITEMS.find(x => x.id === btn.dataset.item);
      const companyRoles = findRoles(item.company);
      const role = companyRoles.roles[parseInt(btn.dataset.roleIdx)];
      const customMsg = generateRoleReferral(item, role);
      navigator.clipboard.writeText(customMsg).catch(() => {});
      // Open the LinkedIn profile or search to pick the recipient
      const li = linkedinFor(item);
      const url = li || `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(item.name + ' ' + (item.company || ''))}`;
      window.open(url, '_blank');
      // Also open the role posting itself for context
      window.open(role.url, '_blank');
      showToast(`Referral for "${role.title.slice(0, 40)}..." copied — paste in LinkedIn`);
    });
  });
}

function renderAll() {
  renderGrid();
  renderProgress();
}

// Filter wiring
document.querySelectorAll('[data-filter-block]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter-block]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    filters.block = b.dataset.filterBlock;
    renderAll();
  });
});
document.querySelectorAll('[data-filter-status]').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter-status]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    filters.status = b.dataset.filterStatus;
    renderAll();
  });
});

/* ─── Guided sequence ─── */
let seqQueue = [];
let seqIdx = 0;

function startSequence() {
  // Take currently visible, not-yet-sent items in priority order
  seqQueue = visibleItems().filter(item => {
    const s = statusFor(item.id);
    return !['sent','replied','intro_scheduled','offer','accepted','skipped','declined'].includes(s);
  });
  if (seqQueue.length === 0) {
    showToast('Nothing to send in current filter');
    return;
  }
  seqIdx = 0;
  showSeqStep();
  $('#seq-panel').classList.add('show');
}

function showSeqStep() {
  const item = seqQueue[seqIdx];
  if (!item) return endSequence();
  const channels = channelsFor(item);
  const primary = channels[0];
  const { url, prefilled, hint } = urlFor(item, primary.id);

  $('#seq-pos').textContent = seqIdx + 1;
  $('#seq-total').textContent = seqQueue.length;
  $('#seq-channel').textContent = primary.label;
  $('#seq-name').textContent = item.name;
  $('#seq-meta').innerHTML = `${escapeHtml(item.role || '')}${item.company ? ' · <strong>' + escapeHtml(item.company) + '</strong>' : ''}`;
  $('#seq-hint').innerHTML = hint;
  $('#seq-progress-fill').style.width = ((seqIdx) / seqQueue.length * 100) + '%';

  // Copy message to clipboard and open tab
  navigator.clipboard.writeText(item._message).catch(() => {});
  const win = window.open(url, '_blank');
  if (!win) {
    $('#seq-hint').innerHTML = '⚠ <strong>Popup blocked.</strong> Allow popups for this site in your browser address bar, then click ✓ Sent — next to advance.';
  }
}

function endSequence() {
  $('#seq-panel').classList.remove('show');
  $('#seq-progress-fill').style.width = '100%';
  setTimeout(() => $('#seq-progress-fill').style.width = '0%', 400);
  showToast('Sequence complete');
  renderAll();
}

// LinkedIn live search — Enter opens results in new tab
$('#li-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    const url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(e.target.value.trim())}`;
    window.open(url, '_blank');
  }
});

$('#start-sequence').addEventListener('click', startSequence);
$('#seq-sent').addEventListener('click', () => {
  const item = seqQueue[seqIdx];
  if (item) setStatus(item.id, 'sent');
  seqIdx++;
  if (seqIdx >= seqQueue.length) endSequence();
  else showSeqStep();
});
$('#seq-skip').addEventListener('click', () => {
  seqIdx++;
  if (seqIdx >= seqQueue.length) endSequence();
  else showSeqStep();
});
$('#seq-stop').addEventListener('click', endSequence);

renderAll();
</script>
</body>
</html>
"""

# Block counts
from collections import Counter
block_counts = Counter(x["block"] for x in items)
HTML = HTML.replace("__TOTAL__", str(len(items)))
HTML = HTML.replace("__C_RECR__", str(block_counts.get("recruiters", 0)))
HTML = HTML.replace("__C_BANK__", str(block_counts.get("banks", 0)))
HTML = HTML.replace("__C_COMP__", str(block_counts.get("companies", 0)))
HTML = HTML.replace("__C_TG__", str(block_counts.get("telegram_ecosystem", 0)))
HTML = HTML.replace("__ITEMS__", items_json)
HTML = HTML.replace("__ROLES__", roles_json)

out = HERE / "andrey_dashboard.html"
out.write_text(HTML)
print(f"✓ Wrote {out}")
print(f"  - {len(items)} cards across {len(block_counts)} blocks")
print(f"  - {sum(1 for x in items if x.get('custom_message'))} have custom personalised messages")
print(f"  - {sum(1 for x in items if x.get('job_urls'))} include specific job URLs")
print(f"  - {sum(1 for x in items if x['linkedin'])} have resolved LinkedIn URLs ({sum(1 for x in items if not x['linkedin'])} still need ID)")
print(f"  - File size: {len(HTML) / 1024:.1f} KB")

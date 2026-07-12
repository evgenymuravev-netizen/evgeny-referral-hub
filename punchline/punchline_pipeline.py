#!/usr/bin/env python3
"""
punchline_pipeline.py — generate the real-model joke pool and publish it to the arena.

USAGE
  Default path — ONE key via OpenRouter (all providers incl. Chinese models):
       export OPENROUTER_API_KEY=...    # openrouter.ai — funds all models below
       python3 punchline_pipeline.py cost        # live price check before spending
       python3 punchline_pipeline.py generate    # merges into pool.json, re-run fills gaps
     -> the arena (index.html) fetches pool.json at runtime when served over HTTP,
        so committing pool.json next to index.html IS publishing. For a single
        self-contained file (email, artifact), additionally run:
       python3 punchline_pipeline.py build --html index.html
     -> writes index.built.html with the pool embedded.

  Useful flags:
       generate --models gpt-5.5,glm-5.2     only these roster ids
       generate --briefs p1,k2               only these briefs
       generate --force                      regenerate even existing entries
       generate --dry-run                    print prompts, call nothing, spend nothing
       coverage                              coverage table for the current pool.json
       validate --html index.html            check brief ids stay in sync with the arena

  Direct-provider path (methodology-grade, no gateway in the serving chain):
       flip entries in ROSTER from gateway=True to gateway=False and export
       ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / DEEPSEEK_API_KEY.

PROTOCOL NOTES (methodology-relevant)
  * Decoding: provider defaults everywhere. Several current models (Claude Fable 5,
    Opus 4.8, Sonnet 5) reject or constrain manual sampling parameters, so the PRD's
    original "fixed temperature 0.9" protocol is not implementable across providers.
    The decoding regime is therefore recorded per entry as "provider-default".
  * Single-shot: one completion per brief per model. No best-of-n (PRD Open Q1).
  * Refusals / failures are recorded, not papered over. Per PRD §3, a brief refused
    by any model should be DROPPED for all models before publication — `coverage`
    prints the table so you can see unbalanced briefs and decide.
  * GATEWAY CAVEAT: OpenRouter routes open-weight models (Qwen, DeepSeek, GLM,
    Kimi, MiniMax) across third-party hosts that may serve different quantizations.
    For a published benchmark that's a serving confound. Mitigations used here:
    the served upstream provider is recorded per entry, and roster entries can pin
    routing via "route" (passed as OpenRouter's `provider` preference). For the
    cleanest protocol, re-run the final pool direct-to-provider (gateway=False).
  * Reasoning/"thinking" tokens are billed as output on several models and can
    3-5x the completion bill. `generate` records actual usage per model;
    `cost` prices the roster from OpenRouter's live catalog before you spend.
  * Transient failures (HTTP 429/5xx, network) are retried 3x with backoff;
    non-transient errors (bad slug, refusal) fail fast and are recorded.
  * Slugs below were read from openrouter.ai/api/v1/models on 2026-07-04.

Requires: Python 3.9+, stdlib only.
"""

import argparse, json, os, re, sys, time, urllib.request, urllib.error
from datetime import date

POOL_FILE = "pool.json"
RETRIES = 3               # attempts per call on transient errors
BACKOFF = 4.0             # seconds, doubled per retry

# ---------------------------------------------------------------- briefs
# IDs must match BRIEFS in index.html — `validate` checks this.
BRIEFS = [
    {"id": "p1", "fmt": "pun",      "brief": "Connect two topics in one pun: coffee × artificial intelligence."},
    {"id": "p2", "fmt": "pun",      "brief": "Connect two topics in one pun: gym × banking."},
    {"id": "p3", "fmt": "pun",      "brief": "Connect two topics in one pun: cats × software updates."},
    {"id": "a1", "fmt": "anecdote", "brief": "An anecdote: a product manager meets a genie. Setting: launch day."},
    {"id": "a2", "fmt": "anecdote", "brief": "An anecdote: a robot performs at an open mic. Setting: comedy club, Tuesday."},
    {"id": "a3", "fmt": "anecdote", "brief": "An anecdote: a pilot and a barista swap jobs for one day."},
    {"id": "m1", "fmt": "meme",     "brief": "Meme captions. Template: robot sweating between two buttons. Topic: work-life balance."},
    {"id": "m2", "fmt": "meme",     "brief": "Meme captions. Template: tiny fire, giant alarm. Topic: production incidents."},
    {"id": "s1", "fmt": "song",     "brief": "A country song, 8 lines: losing your phone charger."},
    {"id": "s2", "fmt": "song",     "brief": "A power ballad, 8 lines: a meeting that could have been an email."},
    {"id": "k1", "fmt": "sketch",   "brief": "A sketch, two speakers: a smart fridge with opinions, and its owner. Half a page."},
    {"id": "k2", "fmt": "sketch",   "brief": "A sketch, two speakers: a customer tries to cancel a gym membership by phone."},
]

# ---------------------------------------------------------------- roster
# Pool key is "id" (stable, used by the arena). API identifier is "slug".
# gateway=True  -> one OPENROUTER_API_KEY, slug is the OpenRouter model id
# gateway=False -> direct provider call (provider/env/url fields used)
# "route" (optional) -> OpenRouter provider preference, e.g.
#     {"order": ["deepseek"], "allow_fallbacks": False}   to pin the official host.
OR_URL = "https://openrouter.ai/api/v1/chat/completions"

ROSTER = [
    # --- Anthropic (Fable 5 optional: arena ships with in-chat-authored entries) ---
    {"id": "claude-fable-5",  "slug": "anthropic/claude-fable-5",  "gateway": True, "enabled": False},
    {"id": "claude-opus-4-8", "slug": "anthropic/claude-opus-4.8", "gateway": True, "enabled": True},
    {"id": "claude-sonnet-5", "slug": "anthropic/claude-sonnet-5", "gateway": True, "enabled": True},
    {"id": "claude-haiku-4-5","slug": "anthropic/claude-haiku-4.5","gateway": True, "enabled": True},
    # --- OpenAI ---
    {"id": "gpt-5.5",         "slug": "openai/gpt-5.5",            "gateway": True, "enabled": True},
    # GPT-5.6 Sol is listed on OpenRouter but GA is gated; enable to probe.
    {"id": "gpt-5.6-sol",     "slug": "openai/gpt-5.6-sol",        "gateway": True, "enabled": False},
    # --- Google ---
    {"id": "gemini-3.1-pro",  "slug": "google/gemini-3.1-pro-preview", "gateway": True, "enabled": True},
    # --- xAI ---
    {"id": "grok-4.5",        "slug": "x-ai/grok-4.5",             "gateway": True, "enabled": True},
    {"id": "grok-4.3",        "slug": "x-ai/grok-4.3",             "gateway": True, "enabled": False},
    # --- Chinese frontier set ---
    {"id": "deepseek-v4-pro", "slug": "deepseek/deepseek-v4-pro",  "gateway": True, "enabled": True},
    {"id": "qwen3.7-max",     "slug": "qwen/qwen3.7-max",          "gateway": True, "enabled": True},
    {"id": "kimi-k2.6",       "slug": "moonshotai/kimi-k2.6",      "gateway": True, "enabled": True},
    {"id": "glm-5.2",         "slug": "z-ai/glm-5.2",              "gateway": True, "enabled": True},
    {"id": "minimax-m3",      "slug": "minimax/minimax-m3",        "gateway": True, "enabled": True},
    # --- Direct-provider fallbacks (methodology-grade; flip enabled to use) ---
    {"id": "claude-opus-4-8", "slug": "claude-opus-4-8", "gateway": False, "provider": "anthropic",
     "env": "ANTHROPIC_API_KEY", "enabled": False},
    {"id": "gpt-5.5",         "slug": "gpt-5.5",         "gateway": False, "provider": "openai_compat",
     "env": "OPENAI_API_KEY", "url": "https://api.openai.com/v1/chat/completions", "enabled": False},
    {"id": "gemini-3.1-pro",  "slug": "gemini-3.1-pro",  "gateway": False, "provider": "google",
     "env": "GEMINI_API_KEY", "enabled": False},
    {"id": "deepseek-v4-pro", "slug": "deepseek-chat",   "gateway": False, "provider": "openai_compat",
     "env": "DEEPSEEK_API_KEY", "url": "https://api.deepseek.com/chat/completions", "enabled": False},
]

# ---------------------------------------------------------------- scaffold (identical to the arena's live path)
def scaffold(b):
    base = ("You are entered in a blind comedy benchmark called Punchline. "
            "Respond to the brief below with exactly one entry. Output ONLY the entry itself — "
            "no preamble, no explanation, no quotation marks around the whole answer.\n\n"
            f"BRIEF: {b['brief']}\n\n")
    f = b["fmt"]
    if f == "pun":
        return base + "FORMAT: one pun, a single sentence or two, at most 280 characters."
    if f == "anecdote":
        return base + "FORMAT: a short anecdote with a setup and a punchline, at most 600 characters."
    if f == "song":
        return base + "FORMAT: exactly 8 lines of lyrics, one line per line, no title, no chords."
    if f == "sketch":
        return base + ("FORMAT: a dialogue of 8-12 lines between exactly two speakers. "
                       "Each line formatted as SPEAKER: text (speaker name in caps).")
    if f == "meme":
        if b["id"] == "m1":
            return base + ('FORMAT: respond with ONLY minified JSON, no code fences: '
                           '{"b1":"label of button one","b2":"label of button two",'
                           '"sub":"caption for the sweating character"} — each value under 60 characters.')
        return base + ('FORMAT: respond with ONLY minified JSON, no code fences: '
                       '{"fire":"label for the tiny fire","alarm":"label for the giant alarm"} '
                       '— each value under 80 characters.')
    return base

# ---------------------------------------------------------------- parsers (mirror of the arena's JS)
def parse_item(b, text):
    t = text.strip()
    f = b["fmt"]
    if f in ("pun", "anecdote"):
        return {"t": t.strip('"“”')}
    if f == "song":
        lines = [x.strip() for x in re.split(r"\n+", t) if x.strip()][:10]
        if len(lines) < 4:
            raise ValueError("too few lines")
        return {"song": lines}
    if f == "sketch":
        sk = []
        for raw in re.split(r"\n+", t):
            m = re.match(r"^([A-Z][A-Z .'\-]{0,18}):\s*(.+)$", raw.strip())
            if m:
                sk.append([m.group(1).strip(), m.group(2).strip()])
        if len(sk) < 4:
            raise ValueError("could not parse speakers")
        return {"sk": sk}
    if f == "meme":
        clean = re.sub(r"```json|```", "", t).strip()
        o = json.loads(clean)
        if b["id"] == "m1":
            if not all(k in o for k in ("b1", "b2", "sub")):
                raise ValueError("missing meme fields")
            return {"meme": {"tpl": "buttons", "b1": o["b1"], "b2": o["b2"], "sub": o["sub"]}}
        if not all(k in o for k in ("fire", "alarm")):
            raise ValueError("missing meme fields")
        return {"meme": {"tpl": "fire", "fire": o["fire"], "alarm": o["alarm"]}}
    raise ValueError("unknown format")

# ---------------------------------------------------------------- provider calls (stdlib only)
class TransientError(RuntimeError):
    """Rate limit / server hiccup / network blip — worth retrying."""

def _post(url, headers, body):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST")
    for k, v in headers.items():
        req.add_header(k, v)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        if e.code in (408, 429, 500, 502, 503, 504):
            raise TransientError(f"HTTP {e.code}") from e
        raise
    except urllib.error.URLError as e:
        raise TransientError(f"network: {e.reason}") from e

def _post_retry(url, headers, body):
    delay = BACKOFF
    for attempt in range(RETRIES):
        try:
            return _post(url, headers, body)
        except TransientError as e:
            if attempt == RETRIES - 1:
                raise
            sys.stdout.write(f"[{e}; retry in {delay:.0f}s] ")
            sys.stdout.flush()
            time.sleep(delay)
            delay *= 2

def call_anthropic(model, prompt, key):
    # Decoding: provider default. Fable 5 / Opus 4.8 / Sonnet 5 reject or constrain
    # manual sampling parameters, so none are sent for any Anthropic model.
    data = _post_retry("https://api.anthropic.com/v1/messages",
                       {"x-api-key": key, "anthropic-version": "2023-06-01"},
                       {"model": model, "max_tokens": 1024,
                        "messages": [{"role": "user", "content": prompt}]})
    if data.get("stop_reason") == "refusal":
        raise RuntimeError("REFUSAL (stop_reason=refusal) — per PRD §3, consider dropping this brief for all models")
    text = "".join(c.get("text", "") for c in data.get("content", []) if c.get("type") == "text")
    if not text:
        raise RuntimeError(f"empty response: {json.dumps(data)[:200]}")
    return text

def call_openai_compat(model, prompt, key, url):
    body = {"model": model, "messages": [{"role": "user", "content": prompt}],
            "max_completion_tokens": 1024}
    try:
        data = _post_retry(url, {"Authorization": f"Bearer {key}"}, body)
    except urllib.error.HTTPError as e:
        if e.code == 400:  # older endpoints want max_tokens
            body.pop("max_completion_tokens")
            body["max_tokens"] = 1024
            data = _post_retry(url, {"Authorization": f"Bearer {key}"}, body)
        else:
            raise
    text = data["choices"][0]["message"]["content"]
    if not text:
        raise RuntimeError(f"empty response: {json.dumps(data)[:200]}")
    return text

def call_google(model, prompt, key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
    data = _post_retry(url, {}, {"contents": [{"parts": [{"text": prompt}]}]})
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts)
    if not text:
        raise RuntimeError(f"empty response: {json.dumps(data)[:200]}")
    return text

def call_openrouter(entry, prompt, key):
    body = {"model": entry["slug"],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
            "usage": {"include": True}}
    if entry.get("route"):
        body["provider"] = entry["route"]
    data = _post_retry(OR_URL,
                       {"Authorization": f"Bearer {key}",
                        "HTTP-Referer": "https://punchline.example",
                        "X-Title": "Punchline benchmark"},
                       body)
    if "error" in data:
        raise RuntimeError(str(data["error"])[:300])
    choice = data["choices"][0]
    text = choice["message"]["content"] or ""
    if not text:
        raise RuntimeError(f"empty response: {json.dumps(data)[:200]}")
    usage = data.get("usage", {}) or {}
    meta = {"served_by": data.get("provider", "unknown"),
            "in_tok": usage.get("prompt_tokens", 0),
            "out_tok": usage.get("completion_tokens", 0)}
    return text, meta

def call_model(entry, prompt):
    if entry.get("gateway"):
        key = os.environ.get("OPENROUTER_API_KEY", "")
        if not key:
            raise KeyError("missing OPENROUTER_API_KEY")
        return call_openrouter(entry, prompt, key)
    key = os.environ.get(entry["env"], "")
    if not key:
        raise KeyError(f"missing {entry['env']}")
    if entry["provider"] == "anthropic":
        return call_anthropic(entry["slug"], prompt, key), {}
    if entry["provider"] == "openai_compat":
        return call_openai_compat(entry["slug"], prompt, key, entry["url"]), {}
    if entry["provider"] == "google":
        return call_google(entry["slug"], prompt, key), {}
    raise ValueError(f"unknown provider {entry.get('provider')}")

# ---------------------------------------------------------------- commands
def load_pool():
    if os.path.exists(POOL_FILE):
        with open(POOL_FILE) as f:
            return json.load(f)
    return {}

def save_pool(pool):
    with open(POOL_FILE, "w") as f:
        json.dump(pool, f, ensure_ascii=False, indent=1)

def _csv(arg):
    return [x.strip() for x in arg.split(",") if x.strip()] if arg else None

def cmd_generate(args):
    pool = load_pool()
    want_models = _csv(args.models)
    want_briefs = _csv(args.briefs)
    if want_briefs:
        unknown = set(want_briefs) - {b["id"] for b in BRIEFS}
        if unknown:
            print(f"unknown brief ids: {', '.join(sorted(unknown))}")
            sys.exit(1)
    briefs = [b for b in BRIEFS if not want_briefs or b["id"] in want_briefs]
    active = [m for m in ROSTER if m.get("enabled")]
    if want_models:
        known = {m["id"] for m in ROSTER}
        unknown = set(want_models) - known
        if unknown:
            print(f"unknown roster ids: {', '.join(sorted(unknown))}")
            sys.exit(1)
        # --models may name a disabled roster entry on purpose (e.g. a probe run).
        # When an id exists on both paths, prefer the gateway entry.
        active, seen = [], set()
        for m in sorted((m for m in ROSTER if m["id"] in want_models),
                        key=lambda m: not m.get("gateway")):
            if m["id"] not in seen:
                seen.add(m["id"])
                active.append(m)

    if args.dry_run:
        print(f"DRY RUN — {len(active)} model(s) × {len(briefs)} brief(s), no calls, no spend.\n")
        for b in briefs:
            print(f"--- {b['id']} ({b['fmt']}) " + "-"*40)
            print(scaffold(b) + "\n")
        print("models: " + ", ".join(m["id"] for m in active))
        return

    def has_key(m):
        return bool(os.environ.get("OPENROUTER_API_KEY") if m.get("gateway")
                    else os.environ.get(m.get("env", "")))
    skipped = [m["id"] for m in active if not has_key(m)]
    runnable = [m for m in active if has_key(m)]
    if skipped:
        print(f"skipping (no key): {', '.join(skipped)}")
    if not runnable:
        print("No usable keys. Export OPENROUTER_API_KEY (default path) and re-run.")
        sys.exit(1)
    prov_base = f"pipeline, {date.today().isoformat()}, provider-default decoding, single-shot"
    spend = {}  # id -> {"in":..,"out":..}
    for entry in runnable:
        mid = entry["id"]
        for b in briefs:
            slot = pool.setdefault(b["id"], {})
            if mid in slot and not slot[mid].get("error") and not args.force:
                continue  # already have it; re-run only fills gaps
            sys.stdout.write(f"{mid} × {b['id']} ({b['fmt']}) … ")
            sys.stdout.flush()
            try:
                raw, meta = call_model(entry, scaffold(b))
                item = parse_item(b, raw)
                via = f" via OpenRouter [{meta.get('served_by','?')}]" if entry.get("gateway") else " direct"
                item["prov"] = prov_base + via
                slot[mid] = item
                s = spend.setdefault(mid, {"in": 0, "out": 0})
                s["in"] += meta.get("in_tok", 0); s["out"] += meta.get("out_tok", 0)
                print("ok")
            except Exception as e:
                slot[mid] = {"error": str(e)[:300], "prov": prov_base}
                print(f"FAIL — {e}")
            save_pool(pool)      # persist after every call: crash-safe
            time.sleep(args.sleep)
    print(f"\npool saved to {POOL_FILE}")
    if spend:
        prices = fetch_prices()
        print("\nACTUAL USAGE THIS RUN:")
        total = 0.0
        for entry in runnable:
            mid = entry["id"]; s = spend.get(mid)
            if not s: continue
            pr = prices.get(entry["slug"])
            cost = (s["in"]*pr[0] + s["out"]*pr[1])/1e6 if pr else None
            total += cost or 0
            print(f"  {mid:18s} in {s['in']:>6} tok  out {s['out']:>6} tok"
                  + (f"  ≈ ${cost:.4f}" if cost is not None else ""))
        print(f"  {'TOTAL':18s}{'':30s}  ≈ ${total:.4f}")
    print_coverage(pool)

def fetch_prices():
    """Live OpenRouter catalog -> {slug: (usd_per_Mtok_in, usd_per_Mtok_out)}."""
    try:
        with urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=30) as r:
            data = json.loads(r.read().decode())["data"]
        return {m["id"]: (float(m["pricing"].get("prompt", 0))*1e6,
                          float(m["pricing"].get("completion", 0))*1e6) for m in data}
    except Exception as e:
        print(f"(price fetch failed: {e})")
        return {}

def cmd_cost(args):
    prices = fetch_prices()
    if not prices:
        sys.exit(1)
    n = len(BRIEFS)
    in_tok, out_tok = 170*n, 350*n           # scaffold + typical completion
    think_mult = 3                            # reasoning tokens billed as output
    print(f"Cost estimate — {n} briefs/model, ~170 in + ~350 out tok/brief, "
          f"×{think_mult} output margin for thinking tokens.\n")
    print(f"{'model':20s}{'slug':38s}{'$/run':>8s}{'$/run hi':>10s}{'$/mo prod*':>12s}")
    total = hi_total = prod_total = 0.0
    for m in [x for x in ROSTER if x.get("enabled") and x.get("gateway")]:
        pr = prices.get(m["slug"])
        if not pr:
            print(f"{m['id']:20s}{m['slug']:38s}   — not in catalog (slug drift?)")
            continue
        run = (in_tok*pr[0] + out_tok*pr[1])/1e6
        hi = (in_tok*pr[0] + out_tok*think_mult*pr[1])/1e6
        prod = hi * (200/n)                   # PRD scale: 200 items/model/month
        total += run; hi_total += hi; prod_total += prod
        print(f"{m['id']:20s}{m['slug']:38s}{run:8.3f}{hi:10.3f}{prod:12.2f}")
    print(f"{'TOTAL (roster)':58s}{total:8.3f}{hi_total:10.3f}{prod_total:12.2f}")
    print("\n* prod = PRD §3 scale, 40 items × 5 formats per model per month, high-margin.")

def print_coverage(pool):
    models = sorted({m for slot in pool.values() for m in slot})
    if not models:
        print("\nCOVERAGE: pool is empty.")
        return
    print("\nCOVERAGE (✓ ok, ✗ error, · missing):")
    header = "brief   " + "".join(m[:15].ljust(16) for m in models)
    print(header)
    for b in BRIEFS:
        row = b["id"].ljust(8)
        for m in models:
            it = pool.get(b["id"], {}).get(m)
            row += ("✗" if (it and it.get("error")) else ("✓" if it else "·")).ljust(16)
        print(row)
    bad = [b["id"] for b in BRIEFS
           if any(pool.get(b["id"], {}).get(m, {}).get("error") for m in models)]
    if bad:
        print(f"\nUnbalanced briefs (a model failed/refused): {', '.join(bad)}")
        print("Per PRD §3, drop these briefs for ALL models before publishing rankings.")

def cmd_coverage(args):
    print_coverage(load_pool())

def html_brief_ids(html):
    """Brief ids declared in the arena's BRIEFS array."""
    m = re.search(r"const BRIEFS = \[(.*?)\];", html, re.S)
    if not m:
        return None
    return set(re.findall(r'\{id:"([a-z]\d+)"', m.group(1)))

def cmd_validate(args):
    ok = True
    try:
        with open(args.html) as f:
            html = f.read()
    except OSError as e:
        print(f"cannot read {args.html}: {e}")
        sys.exit(1)
    ids_here = {b["id"] for b in BRIEFS}
    ids_html = html_brief_ids(html)
    if ids_html is None:
        print(f"✗ could not find a BRIEFS array in {args.html}")
        ok = False
    elif ids_html != ids_here:
        print(f"✗ brief ids out of sync — pipeline only: {sorted(ids_here-ids_html) or '—'}, "
              f"arena only: {sorted(ids_html-ids_here) or '—'}")
        ok = False
    else:
        print(f"✓ brief ids in sync ({len(ids_here)} briefs)")
    for marker in ("/*__POOL_START__*/", "/*__POOL_END__*/"):
        if marker not in html:
            print(f"✗ missing pool marker {marker} in {args.html}")
            ok = False
    if os.path.exists(POOL_FILE):
        try:
            pool = load_pool()
            stray = sorted(set(pool) - ids_here)
            if stray:
                print(f"✗ {POOL_FILE} has brief ids not in BRIEFS: {', '.join(stray)}")
                ok = False
            else:
                print(f"✓ {POOL_FILE} parses, all brief ids known")
        except ValueError as e:
            print(f"✗ {POOL_FILE} is not valid JSON: {e}")
            ok = False
    if ok:
        print("validate: all checks passed")
    sys.exit(0 if ok else 1)

def cmd_build(args):
    pool = load_pool()
    if not pool:
        print(f"{POOL_FILE} is empty — run `generate` first.")
        sys.exit(1)
    with open(args.html) as f:
        html = f.read()
    start, end = "/*__POOL_START__*/", "/*__POOL_END__*/"
    i, j = html.find(start), html.find(end)
    if i < 0 or j < 0:
        print("Pool markers not found in HTML — is this the right file?")
        sys.exit(1)
    # Shipped in-chat Fable 5 entries are preserved: the injected blob merges
    # PIPELINE_POOL over POOL at runtime, overwriting only same-model slots.
    clean = {bid: {m: it for m, it in slot.items() if not it.get("error")}
             for bid, slot in pool.items()}
    blob = "const PIPELINE_POOL = " + json.dumps(clean, ensure_ascii=False) + ";\n" \
           "for(const bid in PIPELINE_POOL){POOL[bid]=POOL[bid]||{};" \
           "Object.assign(POOL[bid],PIPELINE_POOL[bid]);}"
    out = html[:j] + blob + "\n" + html[j:]
    dest = args.html.replace(".html", ".built.html")
    with open(dest, "w") as f:
        f.write(out)
    print(f"built → {dest}")
    print_coverage(pool)

def main():
    ap = argparse.ArgumentParser(description="Punchline generation pipeline")
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("generate", help="call providers, write/merge pool.json")
    g.add_argument("--sleep", type=float, default=1.0, help="seconds between calls (rate-limit courtesy)")
    g.add_argument("--models", help="comma-separated roster ids (default: all enabled)")
    g.add_argument("--briefs", help="comma-separated brief ids (default: all)")
    g.add_argument("--force", action="store_true", help="regenerate even existing entries")
    g.add_argument("--dry-run", action="store_true", help="print prompts, call nothing")
    sub.add_parser("cost", help="price the enabled roster from OpenRouter's live catalog")
    sub.add_parser("coverage", help="coverage table for the current pool.json")
    v = sub.add_parser("validate", help="check pipeline/arena stay in sync")
    v.add_argument("--html", default="index.html")
    b = sub.add_parser("build", help="inject pool.json into the arena HTML (single-file build)")
    b.add_argument("--html", default="index.html")
    args = ap.parse_args()
    {"generate": cmd_generate, "cost": cmd_cost, "coverage": cmd_coverage,
     "validate": cmd_validate, "build": cmd_build}[args.cmd](args)

if __name__ == "__main__":
    main()

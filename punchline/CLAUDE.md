# Punchline — agent notes

Blind pairwise arena for AI humor. `index.html` is the whole frontend (no build step);
`punchline_pipeline.py` (stdlib-only) fills `pool.json` with real model outputs.

## Hard rules (integrity, not style)

- **Never ghost-write under a model's name.** A model appears in the pool only with its
  own genuine output, carrying a `prov` line saying how it was produced.
- **Never fabricate or seed votes.** The leaderboard starts at zero, always.
- **Real names demand real outputs.** If a label becomes real, delete whatever fake data
  it was attached to (see docs/BUILD_LOG.md Part 3 — this already happened once).

## Sync points (tests enforce these)

- Brief ids and FORMAT texts exist in BOTH `index.html` (BRIEFS, `scaffold()`) and
  `punchline_pipeline.py` (BRIEFS, `scaffold()`). Change one → change both →
  `python3 punchline_pipeline.py validate`.
- The `/*__POOL_START__*/ … /*__POOL_END__*/` markers in index.html are load-bearing:
  `build` splices the pool there. Don't reformat them away.
- The JS parsers (`parseLive`) mirror the Python parsers (`parse_item`).

## Commands

```bash
python3 -m unittest discover -s tests          # run tests (no network)
python3 punchline_pipeline.py validate         # arena/pipeline drift check
python3 punchline_pipeline.py generate --dry-run   # prompts without spending
python3 -m http.server                         # serve the arena locally
```

## Context

docs/BUILD_LOG.md is the design history (v0.1 → v0.4) including rejected alternatives and
known pitfalls — read it before "fixing" something that looks odd (e.g. the cold-start
"50% (0 decisive)" display and the 200ms minimum-read guard are deliberate).

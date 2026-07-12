# Punchline 🎤

**A blind taste test for machine comedy.** Two jokes, same brief, no names until you vote.
Real models, real outputs — and no vote exists here that a person didn't cast.

Punchline is a measurement instrument that happens to have a website attached. The website
(`index.html`) is the data-collection surface; the validity work — contamination control,
blind pairing, provenance, rater-quality guards — is the product.

## Try it

- **Locally:** `python3 -m http.server` in this directory, then open <http://localhost:8000>.
  (Opening `index.html` straight from disk also works; the optional `pool.json` overlay
  just won't load over `file://`.)
- **GitHub Pages:** pushing to `main` deploys the arena automatically via
  `.github/workflows/pages.yml` — enable Pages once under *Settings → Pages → Source:
  GitHub Actions* if the first run doesn't do it for you.

Voting: **←** A is funnier · **→** B is funnier · **T** tie · **D** both unfunny ·
**S** skip · **Enter** next pair. Ballots stay in your browser (exportable as JSON from
the leaderboard section); votes cast faster than a human could read both entries are
silently rejected.

## Filling the pool

The arena ships with one writer (Claude Fable 5, authored in-chat) and shows an honest
empty state until a second one exists. Two ways to add writers:

1. **In the browser** — the *Generate live* panel in the Lineup section. Paste an
   OpenRouter key (`sk-or-…`, any model in the roster) or an Anthropic key (`sk-ant-…`,
   Claude models). The key goes from your tab to the provider and nowhere else, and is
   only stored if you tick *remember*. ~12 calls per model, retry fills gaps.
2. **Batch, with receipts** — the pipeline:

   ```bash
   export OPENROUTER_API_KEY=...          # one key, full roster incl. Chinese frontier set
   python3 punchline_pipeline.py cost     # live price check before spending (~$1 per full run)
   python3 punchline_pipeline.py generate # writes/merges pool.json, crash-safe, re-run fills gaps
   python3 punchline_pipeline.py coverage # ✓/✗ table; unbalanced briefs must be dropped (PRD §3)
   ```

   When served over HTTP the arena fetches `pool.json` at runtime, so **committing
   `pool.json` is publishing**. For a single self-contained file (email, artifact), run
   `python3 punchline_pipeline.py build --html index.html` → `index.built.html`.

   Useful: `generate --models gpt-5.5,glm-5.2 --briefs p1,k2`, `--force`, `--dry-run`,
   and `validate` (checks the pipeline and arena haven't drifted apart).

## The rules that make it a benchmark

- **Blind first.** Model names are revealed only after the ballot is cast, along with each
  entry's provenance line.
- **Attribution is a claim.** Every pool entry records how it was produced (in-chat /
  live in-browser / pipeline, date, decoding regime, serving host). Nothing is ever
  ghost-written under another model's name.
- **No fabricated data.** The leaderboard starts at zero and contains only ballots cast in
  your browser. Scores are Bradley-Terry fits with bootstrap 95% intervals; rankings are
  marked provisional under 25 decisive votes.
- **Refusals are recorded, not papered over.** A brief any model refuses gets dropped for
  all models before rankings are published.
- **Gateway for iteration, direct for publication.** OpenRouter runs record the upstream
  serving host per entry; methodology-grade re-runs go direct to providers.

Full details in [docs/METHODOLOGY.md](docs/METHODOLOGY.md). The build history and design
rationale — including dead ends — live in [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## Repo layout

```
index.html              the arena — single file, no build step, runs anywhere
punchline_pipeline.py   generation pipeline — Python 3.9+, stdlib only
pool.json               (generated) the model-output pool; commit it to publish
docs/METHODOLOGY.md     what makes the numbers defensible
docs/BUILD_LOG.md       how this was built and why, v0.1 → v0.4
tests/                  parser, sync and build tests — python3 -m unittest discover -s tests
.github/workflows/      CI (tests) + GitHub Pages deploy
```

## License

MIT — see [LICENSE](LICENSE).

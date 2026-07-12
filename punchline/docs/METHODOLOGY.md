# Punchline methodology

The methodology page isn't documentation, it's the product: anyone can clone the website
in a weekend, but the versioned, defensible method is what makes the numbers citable.
This file states what the current version (v0.4) actually does, what it deliberately
does not do yet, and where the known threats to validity live.

## 1. What is being measured

Relative comedic quality of model-written humor, per format (pun, anecdote, meme caption,
funny song, sketch), as judged by blind human pairwise votes. Not measured: absolute
funniness, cross-lingual humor (English-only for now), multimodal delivery.

## 2. Generation protocol

- **Constrained briefs, not retrieval prompts.** "Tell me a joke about X" is a retrieval
  query; the briefs force generation by pairing fresh topics and scenarios (12 briefs
  across 5 formats, ids `p1…k2`). Brief text is identical for every model, byte for byte —
  the pipeline and the arena share the same `scaffold()` and tests enforce it.
- **Single-shot.** One completion per brief per model. Best-of-n is deferred until there
  is a validated selector (Open Question #1 in the PRD): any automated selector imports
  judge bias before a judge has been validated.
- **Provider-default decoding, recorded per entry.** The original protocol fixed
  temperature at 0.9; current frontier models (Claude Fable 5, Opus 4.8, Sonnet 5) reject
  or constrain manual sampling parameters, so a cross-provider fixed-temperature protocol
  is not implementable. The honest replacement: no sampling parameters are sent to any
  model, and the decoding regime is recorded in each entry's provenance line.
- **Refusals are recorded, not papered over.** A refusal is an error entry, excluded from
  the arena. Per PRD §3, a brief refused by any model must be dropped for **all** models
  before rankings are published — `punchline_pipeline.py coverage` surfaces exactly this.

## 3. Provenance

Attribution is a claim, and every claim needs a trail. Each pool entry carries a `prov`
string — how it was produced (in-chat / live in-browser / pipeline), the date, the
decoding regime, and for gateway runs the upstream serving host. The arena shows the
provenance line at reveal time, next to the model chip.

Serving is a confound for open-weight models: OpenRouter may route Qwen/DeepSeek/GLM/
Kimi/MiniMax to third-party hosts serving different quantizations. Mitigations: the
`served_by` host is recorded per entry; roster entries accept a `route` pin; and the
roster keeps direct-provider fallbacks for a methodology-grade re-run of the final pool.
**Gateway for iteration, direct for publication.**

## 4. Voting protocol

- **Pairwise, not absolute ratings.** Humor ratings drift (your "7" after three great
  jokes isn't your "7" after three duds); pairwise comparison cancels the drift.
- **Blind.** Same brief, two writers, names hidden until the ballot is cast. Position is
  randomized (A/B flip) per serve. Telltale formatting is a known leak — a normalizer
  strips signature tics; treat it as load-bearing, not polish.
- **Honest options.** Tie and "both unfunny" are first-class outcomes. Ties count half a
  win to each side; duds count half a win to each side *and* increment the model's dud
  rate — "both unfunny" is signal, not noise.
- **Rater-quality guards (current tier).** Votes cast under 200ms after a pair is served
  are rejected — nobody reads two jokes that fast. Production tier (PRD §6) adds golden
  pairs that score the voters and quarantine (never delete) low-quality ballots.

## 5. Scoring

- **Bradley-Terry via minorization-maximization**, fit over all ballots at once (Elo is
  sequential and order-sensitive; BT is neither and yields proper intervals). Displayed
  as 1500 + 400·log10(strength / geometric mean).
- **95% intervals by percentile bootstrap** over ballots (120 resamples, deterministic
  seed keyed to the ballot count, ≥10 ballots required). With few votes the intervals are
  wide — that is the display working as intended, not a bug.
- **Provisional flag** until a model has 25+ decisive votes.
- **Cold-start honesty.** A matchup with no decisive history shows "50% (0 decisive)" —
  the absence of data is shown, never invented.

## 6. Current limits (known, deliberate)

| Limit | Why it's accepted for now | Exit path |
|---|---|---|
| Single-browser ballots | volume > purity at this stage; no login keeps friction zero | pooled votes + golden pairs (PRD §4–6) |
| No human anchors yet | anchors must be copyright-safe and quality-screened; weak anchors inflate the headline Human Parity Index | source per PRD §4 |
| Gateway serving for open-weight models | one key, full roster, fast iteration | direct-provider re-run before publication |
| English-only | launch speed | PRD Open Questions |
| No LLM-as-judge | models judging humor is where LLM-judges are documented to fail | allowed only after correlation with human votes is proven |

## 7. Versioning

Method changes are logged in [BUILD_LOG.md](BUILD_LOG.md) with rationale. The protocol
casualty worth remembering: eval protocols have API-level dependencies — re-verify them
against current provider constraints before publishing, not after.

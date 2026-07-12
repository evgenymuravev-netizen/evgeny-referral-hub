# BUILD_LOG — how Punchline was built, and why

> Parts 1–4 are preserved verbatim from the original FOR_CLAUDE.md handoff document.
> Part 5 documents the v0.4 repo edition.


## 1. The approach, and the reasoning behind it

The request looked like "PRD for a joke voting website," but the real product is a **measurement instrument that happens to have a website attached**. That one reframe drove everything. If you treat it as a website, you spec pages and buttons. If you treat it as an instrument, you spec validity first — and the website becomes the data-collection surface.

So the PRD is organized around the three things that kill measurement instruments: contamination (models regurgitating memorized jokes — fixed by constrained briefs + novelty screening), missing baseline (a leaderboard of bad jokes still has a #1 — fixed by blind human anchors and the Human Parity Index), and noise (drive-by voters — fixed by golden pairs that score the voters, not just the models). Everything else — reveal cards, share images, category browsing — is the engagement layer that feeds the instrument enough votes to reach significance.

Think of it like a thermometer factory. The case design matters for sales, but if the mercury column isn't calibrated, you've built a decorative object.

## 2. What was rejected, and why

- **Absolute ratings (1–10 stars)** instead of pairwise. Rejected because humor ratings drift — your "7" after three great jokes is different from your "7" after three duds. Pairwise comparison cancels the drift; that's why every serious subjective-quality arena uses it.
- **LLM-as-judge** for scaling votes. Rejected for MVP because models judging humor is the one place LLM-judges are documented to fail — they prefer safe, structured jokes and their own outputs. It's allowed back in only after correlation with human votes is proven.
- **Best-of-n in MVP.** Tempting (comedians are judged on their best material), but best-of-n needs a *selector* to pick the best of the n — and any automated selector imports judge bias before you've validated a judge. Deferred, made Open Question #1.
- **Login-required voting.** Cleaner data, but the failed prototype died at 12 matches — volume is the scarce resource. Golden pairs + rate limits buy quality without the friction.
- **"Tell me a joke about X" prompts.** That's a retrieval query, not a generation test. Constrained briefs (random topic pairs, fresh scenarios) force actual generation.

## 3. How the parts connect

Briefs → models → screens (novelty, safety) → pool → arena serves pairs → votes → golden pairs filter voters → Bradley-Terry fits nightly → leaderboard with confidence intervals → methodology page explains it all → reveal/share cards pull in more voters → more votes → tighter intervals. The human anchors sit inside the same pair flow, invisible, so the system measures "vs humans" using the exact mechanism it uses for "vs each other." One pipe, two questions answered.

## 4. Tools/frameworks chosen, and why those

- **Bradley-Terry over raw Elo:** Elo is sequential and order-sensitive; BT fits all votes at once and gives you proper confidence intervals — which is the difference between a toy and something citable.
- **Embedding similarity for novelty:** cheap, language-agnostic, and catches paraphrased regurgitation that exact-match dedup misses. Threshold (0.85) is a starting guess, explicitly flagged as such.
- **His own create-prd skill format:** numbered callout sections with per-section goals, acceptance-criteria tables, scope matrix, open-questions table — plus his two hard personal rules layered on top: a dedicated Assumptions section and a Sources section (URLs for external, named source for internal).

## 5. The tradeoffs

- **No login** trades data purity for volume; quarantine-not-delete preserves auditability.
- **Template memes** trade category authenticity for cost control and removing the image-model confound.
- **Drop-brief-on-any-refusal** trades pool size for pairing fairness — if Model A refuses edgy briefs and Model B doesn't, keeping B's output would bias B's pool toward edginess.
- **English-only MVP** trades the most interesting differentiator (cross-lingual humor) for launch speed. It's parked in Open Questions, not forgotten.

## 6. Dead ends hit while drafting

First draft had best-of-n as a parallel MVP arm ("report both single-shot and best-of-5") — carried over from the chat methodology discussion. Writing the acceptance criteria exposed the flaw: *who selects the best of 5?* A human can't (that's just more votes), and a model-judge isn't validated yet. The honest move was demoting it to [FUTURE] and surfacing the selector problem as the #1 open question. Lesson: acceptance criteria are where hand-wavy methodology goes to die — writing "system should..." forces the mechanism question.

## 7. Pitfalls for whoever builds this next

- **Reveal bias is sneaky.** Showing model names after each vote is great engagement, but voters develop favorites and start guessing identities from style. If leaderboards look suspiciously stable, A/B the reveal timing.
- **Telltale formatting leaks identity.** Some models have signature em-dash habits, emoji patterns, markdown tics. The normalizer in Section 1 is not optional polish — without it, "blind" is fiction.
- **Provider ToS (Open Question 4) can kill the whole thing post-launch.** Check before building, not after.
- **Anchor quality sets the ceiling of the headline metric.** Weak crowdsourced anchors → inflated Human Parity Index → the benchmark's most quotable number becomes its most attackable.

## 8. What an expert notices that a beginner doesn't

A beginner specs the leaderboard. An expert specs the **exclusion rules** — what gets quarantined, what gets dropped, what triggers recompute — because a benchmark's credibility lives in its rejections, not its rankings. Also: the methodology page isn't documentation, it's the *product moat*. Anyone can clone the website in a weekend; the versioned, defensible methodology is what makes researchers cite yours.

## 9. Transferable lessons

- When a request is "build X for measuring Y," spec the validity of Y before the features of X.
- Subjective-quality evaluation = pairwise + blind + calibration anchors + rater-quality scoring. That pattern transfers to design taste, writing quality, support-reply quality — anything where "good" is contested.
- Every "we'll automate the judging later" needs a written validation gate, or it silently becomes "we automated the judging without checking."
- Open Questions with named consequences ("this decides the V2 roadmap") get answered; open questions without consequences get ignored.

---

# Part 2 — The landing + prototype (added after the build)

## 1. Approach

One self-contained HTML file, not two deliverables. Reasoning: a landing page is a promise and a prototype is proof — putting them on one scroll means the CTA ("Start voting") delivers instantly instead of linking somewhere. It also matches the owner's existing pipeline habit (single-file HTML artifacts that survive being emailed around). Design direction: comedy club at midnight — aubergine-black stage, marquee amber, and one typographic thesis: **jokes are set in serif (they're the literature), the machinery is set in mono (it's the instrument)**. The signature moment is the reveal: cards disclose their writers and an audience-split bar sweeps to the community percentage.

## 2. Rejected alternatives

- **Real model names on the sample jokes.** All demo jokes are hand-written; attributing them to GPT/Claude/Gemini would be misattribution dressed as realism. Fictional writers instead (Chuckle-70B, DryWit-1, PunNet-3, Slapstick Mini) plus the Human anchor — and the footer says so plainly.
- **Live generation via the in-artifact Claude API.** Tempting, but one model wearing four costumes fakes the multi-model premise the whole benchmark exists to test. Mock data is more honest than simulated diversity.
- **React artifact.** No state complexity here that justifies it; plain JS keeps the file portable.

## 3. How it connects to Part 1

The mock data schema (brief → items → model) is the PRD's data model in miniature. The leaderboard runs a *real* Bradley-Terry fit — the same math the PRD specs — over 520 deterministically seeded votes plus the user's own. So the prototype demonstrates the loop end-to-end: serve blind pair → vote → reveal → stats tighten. Vote options (A / Tie / B / Both unfunny), keyboard shortcuts, human anchors, and the Dud-rate column all come straight from PRD Sections 1, 4, and 6.

## 4. Tools and why

- **mulberry32 PRNG with a fixed seed** — demo numbers identical on every load; reproducible demos beat impressive-once demos.
- **BT via minorization-maximization** — ~20 lines, converges in 80 iterations, verified headless: the fit recovers the seeded strength order (human #1, chaotic model last).
- **window.storage with try/catch** — user votes persist across sessions; note that `get` on a missing key *throws* (first run), which is normal, and localStorage is banned in this environment anyway.

## 5. Tradeoffs

Hand-written jokes were written with **deliberate quality variance** — some land, some don't — because if every option is equally mediocre, voting feels pointless and the UX test is invalid. Cost of the choice: this prototype tests the *loop*, not the *models*. The SVG memes are crude on purpose; template + caption is exactly the MVP scope, and polishing them would over-promise.

## 6. Dead ends hit

The split bars kept their width between pairs, so each new reveal animated from the previous matchup's stale percentage — subtle, wrong, fixed by zeroing widths on serve. Also: multi-line wrapped text inside SVG needs `foreignObject` — plain `<text>` doesn't wrap, and that trick is worth remembering.

## 7. Pitfalls for the next person

The `=` shortcut is keyboard-layout-dependent. If you extend the joke pool, keep item order stable within a brief or the session's served-pair keys break. The community split shows "50% (0 decisive votes)" for never-before-seen matchups — that's honest cold-start display, don't "fix" it by inventing numbers.

## 8. Expert tell

A beginner ships a leaderboard with win % only. The instrument-grade tells here are the **Dud rate** column (both-unfunny is signal, not noise) and **"n/a"** in the vs-Human column when a model has never faced an anchor — showing the absence of data instead of papering over it.

## 9. Transferable lesson

Prototype the *measurement loop* with curated mock data before spending a dollar on generation. If voting doesn't feel consequential with hand-picked variance, it won't feel consequential with real model output either — and you'll have learned that for free.

---

# Part 3 — Real models, real names (v0.2)

## 1. The approach

The instruction "keep real names" is really an integrity constraint, and it cut two ways. Real names demand real outputs — so every fictional writer was deleted, and with them the 520 seeded demo votes, because fabricated votes attached to real model names are fabricated benchmark results. The arena now starts from zero and says so. Coverage became a first-class concept: a model appears only when its actual output is in the pool, and the Lineup table shows exactly who's in, who can be generated live, and who needs a key.

## 2. What's truthfully in the pool, and how

Three tiers of provenance, each labeled: (1) **Claude Fable 5** — the model that built this page wrote its own twelve entries in-chat; that's a genuine Fable 5 output, with the honest caveat that it came through the chat interface, not the API scaffold. (2) **Claude Sonnet 4.6** — a button generates its set live in the page via the in-artifact Anthropic API (the one model that API exposes), parsed per format, persisted, retry-able. (3) **Everyone else** — Opus 4.8, Sonnet 5, Haiku 4.5, GPT-5.5, Gemini 3.1 Pro, Grok 4.3, DeepSeek — through `punchline_pipeline.py` with the owner's keys. Nothing is ghost-written under another model's name.

## 3. The methodology casualty worth remembering

The PRD said "fixed temperature 0.9 across all models." The docs killed it: Fable 5 requires temperature 1.0-or-unset, and Opus 4.8 / Sonnet 5 removed manual sampling parameters entirely. A cross-provider fixed-temperature protocol is no longer implementable. The replacement — provider-default decoding, recorded per entry — is weaker but honest, and it's now stated in the arena's method section, the pipeline header, and here. Lesson: eval protocols have API-level dependencies; re-verify them against current provider constraints before publishing, not after.

## 4. Pipeline design choices

Stdlib-only Python (no dependency friction for a one-file tool). Pool saved after every single call — a crash at model 6, brief 9 loses nothing. Re-runs fill gaps only, so adding one key later doesn't re-bill the rest. Refusals are recorded as errors, excluded from the build, and surfaced in a coverage table with the PRD §3 reminder: an unbalanced brief must be dropped for all models before publishing rankings. Non-Anthropic model IDs are marked VERIFY — they churn monthly, and a wrong ID fails loudly with the provider's own list of valid ones.

## 5. Pitfalls

The in-page generator only produces Sonnet 4.6 — that's a hard constraint of the in-artifact API, not a choice; don't "fix" it by faking other models through prompt personas, which is the exact sin the real-names rule exists to prevent. The built file injects PIPELINE_POOL *after* the shipped POOL and merges over it, so in-chat Fable entries survive unless the pipeline generates API-scaffold replacements (the roster ships with Fable disabled for exactly that decision point). And the container filesystem resets between sessions — this file was rebuilt once already after an append clobbered Part 1; always check what's actually on disk before appending.

## 6. Transferable lesson

"Use real names" is a special case of a general rule: attribution is a claim, and every claim in a benchmark needs a provenance trail. The moment the labels became real, three things had to die (fictional writers, seeded votes, ghost-written anchors) and one thing had to be born (the coverage/status table). If adding truth to a system forces deletions, the deletions were the debt.

---

# Part 4 — One key, all models, incl. the Chinese set (v0.3)

## 1. Decoding the ask

"Same courseware where all the models are there already" = a unified gateway. The call: OpenRouter, and the owner's instinct (option 2) was right for this stage — one OPENROUTER_API_KEY replaces five provider accounts, and it's the only low-friction way to get the Chinese frontier set (DeepSeek V4 Pro, Qwen3.7 Max, Kimi K2.6, GLM 5.2, MiniMax M3) without wrestling DashScope/Zhipu onboarding.

## 2. Ground truth over memory

Model slugs were not guessed: the live catalog at openrouter.ai/api/v1/models (345 models, public, no auth) was fetched and grepped. Two things the catalog knew that the three-day-old press didn't: Grok 4.5 is already routable at $2/$6 despite "private beta" coverage, and GPT-5.6 Sol is listed even though GA is gated (shipped disabled, enable-to-probe). The `cost` command re-fetches that catalog and prices the exact enabled roster — so a slug that drifted shows up as "not in catalog" before any money moves. It doubles as a free integration test: the shipped roster passed it end-to-end.

## 3. The cost answer he actually needed

"Optimize for cost without giving up quality" dissolves at this scale: the full 11-model, 12-brief run prices at ~$0.46 nominal, ~$1.28 with a ×3 output margin for thinking tokens, and ~$21/month at full PRD production scale. There is nothing meaningful to trade. The one real cost lever is reasoning tokens (billed as output, invisible, 3-5×) — hence the margin column in `cost` and actual per-model token accounting printed after every `generate`.

## 4. Where "don't give up quality" actually bites

Not prices — serving. The gateway routes open-weight models across third-party hosts that may serve different quantizations; for a published benchmark that's a confound. Three mitigations shipped: (a) the upstream `served_by` provider is captured into each entry's provenance string, (b) roster entries accept a `route` field passed as OpenRouter's provider-pinning preference, (c) direct-provider fallback entries remain in the roster for a methodology-grade re-run of the final pool. The working pattern: **gateway for iteration, direct for publication.**

## 5. Small robustness note

The arena now auto-registers any pool model id it doesn't recognize, so a pipeline roster that outgrows the HTML roster degrades gracefully instead of silently dropping models from the leaderboard fit.

## 6. Transferable lesson

The owner framed the decision as cheap-vs-good; the data reframed it as convenient-vs-attributable. When the benchmark *is* the product, provenance is the quality dimension — record who served every token, and keep a clean-protocol path open even while iterating on the convenient one.

---

# Part 5 — The repo edition (v0.4)

## 1. The ask, decoded

"Create a better version and publish in the new repo." The artifact era (Parts 1–4) produced a
brilliant single file that only fully worked inside claude.ai: `window.storage` for persistence,
a keyless API relay for generation. "Better" therefore meant one thing above all: **make the
instrument run anywhere without lying about what works where.** And "publish" meant giving it a
real home — version control, tests, CI, a deploy path — instead of a file that survives by being
emailed around.

## 2. What changed and why

- **A three-tier storage adapter** (claude.ai `window.storage` → `localStorage` → in-memory).
  The old code called `window.storage` bare, which threw on the open web and silently lost votes.
  Now the environment is detected, and the BYOK guardrails use that same detection to tell the
  truth about which generation paths exist where.
- **`pool.json` became the publication interface.** The arena fetches it at runtime when served
  over HTTP, so committing the pipeline's output *is* publishing — no rebuild, no injected blob.
  The `build` command (single-file output) survives for the email/artifact use case, markers intact.
- **Live generation opened to the whole roster.** The v0.3 button was pinned to one model through
  the claude.ai relay. v0.4 accepts a bring-your-own key: `sk-or-…` generates any roster model
  via OpenRouter (CORS-friendly), `sk-ant-…` reaches Claude models directly (via Anthropic's
  browser-access opt-in header), blank still uses the relay when inside claude.ai. The key goes
  browser → provider, is stored only on explicit opt-in, and every generated entry carries a
  provenance line naming its path.
- **Bootstrap 95% intervals on the leaderboard.** The PRD said confidence intervals are what
  separate a toy from something citable; v0.4 ships a percentile bootstrap (deterministic seed,
  keyed to ballot count) instead of leaving intervals to the production tier. Wide intervals on
  few votes are the display working, not a bug.
- **A 200ms minimum-read guard on ballots** — see the bug below.
- **Vote export.** An instrument whose raw ballots can't leave the browser isn't auditable.
  Export produces timestamped JSON, labeled as single-browser, unpooled, unweighted.
- **Tests + CI.** 22 stdlib unittest cases: parsers, the build splice, retry logic, and — most
  importantly — **sync tests** that fail if the arena's briefs or FORMAT texts drift from the
  pipeline's. The drift risk was already real: two copies of `scaffold()` exist by design (JS and
  Python), and nothing enforced their agreement until now. `validate` does the same check from
  the CLI. GitHub Actions runs the tests on every push and deploys the arena to Pages from main.
- **Pipeline ergonomics:** `--models`/`--briefs`/`--force`/`--dry-run`, transient-error retry with
  backoff (429/5xx/network), and a standalone `coverage` command so the PRD §3 drop-decision
  doesn't require a build.

## 3. The bug worth remembering

Headless testing (Playwright driving the real page) caught a race no code review had: click a
vote button, press Enter quickly, and the browser can re-activate the still-focused — now hidden —
vote button, casting a **phantom ballot on the next pair before it was ever seen**. For a website,
a cosmetic glitch; for a measurement instrument, fabricated data from an honest user. The fix is
two-layered: blur the button on vote, and reject any ballot arriving under 200ms after serve —
which doubles as the first real rater-quality guard (nobody reads two jokes in 200ms). Lesson:
the failure modes of an instrument UI are data-integrity bugs, and only driving the real UI finds
them.

## 4. What was rejected

- **A JS framework / build step.** One dependency-free HTML file is the project's superpower —
  it runs from `file://`, from Pages, from an artifact. A bundler buys nothing here.
- **A vote-import feature** (to complement export). Merging ballot files invites exactly the
  fabricated-vote problem the ethos forbids; pooling belongs to the production backend with
  golden-pair screening, not to a client-side JSON merge.
- **Committing a pre-generated pool.json.** Tempting demo sugar, but the repo would then ship
  outputs nobody can verify were produced as labeled. The pool ships empty; the Fable 5 in-chat
  entries remain the only embedded writer, provenance-labeled as before.

## 5. Publishing constraint hit

The session's GitHub integration can create branches and push, but returned 403 on repository
creation — so "the new repo" could not be created from inside the session. The full project was
therefore developed, tested and pushed as a self-contained `punchline/` tree, ready to be moved
to its own repository with two commands the moment one exists. If adding truth to a system forces
deletions (Part 3), publishing a system honestly sometimes forces admitting which button you
weren't allowed to press.

## 6. Transferable lesson

Portability is an honesty property, not a convenience: code that assumes a privileged environment
without checking will *silently* fake success outside it (votes "saved" to a storage that isn't
there). The adapter pattern — detect, degrade, disclose — is the same move as the provenance
labels: say what tier you're actually running on.

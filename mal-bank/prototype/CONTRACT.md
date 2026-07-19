# Mizan Prototype — Build Contract v1.0

Interactive prototype of the Mizan shared credit decisioning layer described in
`mal-bank/PRD-credit-decisioning.md`. Read the PRD first — the prototype's job is to make the PRD
tangible for a product-panel walkthrough: both anchor journeys, the policy console, refer
workbench, decision replay, and monitoring — all running against a real (simulated) decision
engine in the browser.

**This contract is binding.** Three files are built in parallel by different authors; they only
work together if everyone follows the shapes and signatures below exactly. If you must deviate,
note the deviation prominently in your final report.

## Files

| File | Owner | Contents |
|---|---|---|
| `mal-bank/prototype/src/engine.js` | Engine author | `globalThis.MizanEngine` — all decision logic, policy store, decision records, metrics. No DOM access. Must run in Node AND browser. |
| `mal-bank/prototype/src/data.js` | Data author | `globalThis.MizanData` — personas, reason codes, sector exclusions, synthetic sample book, seeded history parameters. No DOM access. Must run in Node AND browser. No dependency on engine.js. |
| `mal-bank/prototype/src/engine.selftest.js` | Engine author | Node script: `node engine.selftest.js` loads data.js + engine.js, asserts the acceptance scenarios below, exits non-zero on failure with clear messages. |
| `mal-bank/prototype/index.html` | UI author | Full UI. Loads `./src/data.js` then `./src/engine.js` via plain `<script>` tags placed just before its own inline `<script>`. All CSS inline in `<style>`. No ES modules, no external resources of any kind (fonts, CDNs, images — CSP will block them when published). |

Load order everywhere: **data.js → engine.js → UI**. Both src files start with a header comment
and end with `globalThis.MizanData = MizanData` / `globalThis.MizanEngine = MizanEngine`
(works in Node ≥ 16 and browsers; no `module.exports`, no `import`/`export`).

Everything is deterministic: no `Math.random()` at runtime in engine paths that affect
decisions. Synthetic data (sample book, seeded history) is generated with a small seeded PRNG
(mulberry32 or similar) with fixed seeds so every load produces identical numbers.

All currency is AED, integers. All rates are decimals (0.0649 = 6.49%). Dates ISO 8601.
"Today" for the simulation is `2026-07-19`; derive all synthetic dates from that constant
(`MizanData.TODAY`), never from the wall clock, so the demo is stable.

---

## 1. MizanData

```js
MizanData = {
  VERSION: 'data-1.0',
  TODAY: '2026-07-19',
  personasRetail: [ RetailApplicant, ... ],   // exactly the 5 below, in order r1..r5
  personasSme:    [ SmeApplicant, ... ],      // exactly the 5 below, in order s1..s5
  sectorExclusions: [ {code, labelEn, labelAr, basis} ],  // see §1.3
  reasonCodes: { CODE: {en, ar} },            // see §1.4 — every code the engine emits MUST exist here
  sampleBook: { retail: [SyntheticRetailApp x 140], sme: [SyntheticSmeApp x 80] },
  history: { days: 90, seed: 20260719 }       // parameters the engine uses to seed metrics history
}
```

### 1.1 RetailApplicant shape

```js
{
  id: 'r1', name: 'Ahmed Al Mansoori', nameAr: 'أحمد المنصوري',
  tagline: 'Government employee, salary-transfer customer',  // one-line card description for UI
  age: 34, residency: 'UAE_NATIONAL' | 'RESIDENT' | 'NEW_RESIDENT',
  monthsInUae: 408,
  employment: { employer: 'Abu Dhabi Digital Authority', type: 'GOVERNMENT'|'PRIVATE'|'PENSION',
                salaryMonthly: 28000, salaryBank: 'MAL_BANK'|'OTHER', tenureMonths: 76, retiree: false },
  aecb: { hit: true|false,            // false = no-hit / thin file
          score: 782,                 // null when hit=false
          esrPct: 18,                 // Expense-to-Salary Ratio
          obligationsMonthly: 2800,   // existing installments + card minimums
          tradelines: 3, chequeReturns12m: 0,
          worstDelinquency: 'NONE'|'DPD30'|'DPD90'|'WRITEOFF',
          creditPassportAvailable: false },  // true only for thin-file persona
  bankData: { source: 'INTERNAL'|'ALTAREQ_TPP'|'DOCUMENTS', monthsAvailable: 24,
              salaryDetected: true, avgSalaryCredit: 28000 },
  defaultRequest: { amount: 150000, tenorMonths: 36 }   // pre-filled in UI
}
```

**The five retail personas (fixed IDs, names, and intended outcomes):**

| id | Name | Setup | Intended outcome at default policy |
|---|---|---|---|
| r1 | Ahmed Al Mansoori | National, govt, salary 28k @ Mal Bank, AECB 782, obligations 2.8k | **APPROVE**, grade A, limit bound by requested amount |
| r2 | Priya Nair | New resident 8 months, salary 17k other bank, **no AECB hit**, creditPassportAvailable=true | **REFER** — thin file; UI shows Credit Passport path |
| r3 | Omar Haddad | Salary 22k, AECB 655, obligations 9.2k (heavy) | **APPROVE** but limit sharply reduced, bindingConstraint='DBR_HEADROOM' |
| r4 | Layla Boutros | Salary 9.5k, AECB 588, 1 cheque return, DPD90 history | **DECLINE** — score below cut-off (+ delinquency rule) |
| r5 | Hassan Al Balushi | Retiree 62, pension 18k, AECB 731, obligations 2k | **APPROVE** with retiree 30% DBR cap binding — smaller limit than a salaried equivalent |

### 1.2 SmeApplicant shape

```js
{
  id: 's1', legalName: 'Al Noor Trading LLC', legalNameAr: 'النور للتجارة ش.ذ.م.م',
  tagline: 'Established FMCG trader, 4 years, healthy cash-flow',
  license: { authority: 'Dubai DED', activityCode: '4630', activityDesc: 'Foodstuff trading',
             ageMonths: 49, excludedActivity: false, excludedCode: null },  // excludedCode references sectorExclusions.code when true
  vatRegistered: true,
  owners: [ { name: 'Khalid Rahman', sharePct: 60,
              aecb: { hit: true, score: 741, obligationsMonthly: 4100, chequeReturns12m: 0,
                      worstDelinquency: 'NONE' } },
            { name: 'Sara Rahman', sharePct: 40, aecb: {...} } ],
  aecbCommercial: { hit: true, score: 705, facilities: 2, outstandingTotal: 380000,
                    chequeReturns12m: 0, courtCases: 0 },
  bank: { source: 'ALTAREQ_TPP'|'DOCUMENTS'|'INTERNAL', monthsAvailable: 18,
          avgMonthlyInflow: 420000, avgMonthlyOutflow: 361000,
          inflowVolatilityPct: 22,           // stdev/mean of monthly inflows
          topCounterpartySharePct: 24,
          monthlyInflows: [ 12 numbers, oldest first — MUST be consistent with avg & volatility ] },
  defaultRequest: { amount: 500000, tenorMonths: 12 }
}
```

**The five SME personas:**

| id | Name | Setup | Intended outcome at default policy |
|---|---|---|---|
| s1 | Al Noor Trading LLC | 4y license, inflow 420k/mo, vol 22%, commercial 705, owner 741 | **APPROVE** facility; drawdown demo runs against this decision |
| s2 | Desert Bloom Events LLC | Events services, 2.5y, inflow 180k, **volatility 68%**, seasonal monthlyInflows | **REFER** — volatility above threshold; workbench case |
| s3 | Marhaba Foodstuff Trading | **License age 10 months**, inflow 95k, thin commercial file (hit=false) | **REFER** — minimum trading history not met; override path demo |
| s4 | Oasis Beverages & Liquor TR | activityCode maps to excluded sector (alcohol distribution), excludedActivity=true | **DECLINE** — Shari'ah sector screen, bilingual reason |
| s5 | Gulf Star Electronics LLC | Commercial 690 BUT majority owner AECB **512** + 3 cheque returns, DPD90 | **DECLINE** — owner score floor; demonstrates owner-blend |

### 1.3 sectorExclusions (ISSC-governed list, version shown in UI)

At minimum: conventional-finance services, alcohol production/distribution, gambling/betting,
pork products, adult entertainment, weapons/defense, tobacco (marked `basis: 'ISSC policy'` vs
others `basis: 'AAOIFI SS 21'`). Each entry `{code, labelEn, labelAr, basis}`.

### 1.4 reasonCodes

Bilingual `{en, ar}` customer-safe strings. Required codes (engine may add more; all must exist
here): `RC_SCORE_LOW`, `RC_DELINQUENCY`, `RC_DBR_EXCEEDED`, `RC_THIN_FILE`,
`RC_INCOME_UNVERIFIED`, `RC_SALARY_FLOOR`, `RC_AGE`, `RC_TENOR_CAP`, `RC_SECTOR_EXCLUDED`,
`RC_LICENSE_AGE`, `RC_OWNER_SCORE`, `RC_VOLATILITY`, `RC_CHEQUE_RETURNS`, `RC_LIMIT_REDUCED`,
`RC_RETIREE_CAP`, `RC_MANUAL_REVIEW`, `RC_DRAWDOWN_ARREARS`, `RC_DRAWDOWN_LIMIT`,
`RC_TOKEN_EXPIRED`. Arabic must be real translations (MSA), not transliteration.

### 1.5 sampleBook

Synthetic applications for policy simulation (seeded, deterministic):
- retail: 140 entries `{id, salaryMonthly, aecbScore (or null ~8%), obligationsMonthly, esrPct,
  retiree (~6%), chequeReturns12m, worstDelinquency, amount, tenorMonths, salaryDetected}`
  — distributions roughly UAE-plausible (salaries lognormal 6k–60k, scores centered ~660).
- sme: 80 entries `{id, licenseAgeMonths, excludedActivity (~4%), commercialScore (or null ~15%),
  ownerWorstScore, avgMonthlyInflow, inflowVolatilityPct, chequeReturns12m, amount, tenorMonths}`.

---

## 2. MizanEngine

Stateful in-memory (decisions survive tab switches, not reloads — that's fine; `seedHistory()`
repopulates dashboards). No DOM. Every public function validates inputs and throws
`new Error('Mizan: <message>')` on misuse.

```js
MizanEngine = {
  VERSION: 'engine-1.0',
  init(MizanData),                       // called once by UI before anything else; seeds history
  manifests(),                           // -> [{productId, nameEn, nameAr, segment, structure, pricingMode}]
                                         //    exactly: retail_pf (Murabaha/Tawarruq, pricingMode:'BANDED'),
                                         //    sme_wc (Revolving Tawarruq, 'BANDED'),
                                         //    salary_advance (Qard Hassan, 'FLAT_FEE')
  getPolicy(productId),                  // -> deep copy {productId, version, publishedAt, publishedBy,
                                         //    regulatory: {...}, params: {...}}  (see §2.1)
  publishPolicy(productId, params, meta),// meta = {author, approver}; author===approver -> throw (4-eyes).
                                         //    Regulatory keys in params are ignored/rejected. -> {version}
  policyHistory(productId),              // -> [{version, publishedAt, publishedBy, approvedBy, changes:[{key,from,to}]}]
  decide(application),                   // application = {productId, applicant: <persona or sampleBook row
                                         //    normalized by UI helper below>, amount, tenorMonths,
                                         //    consents: {aecb: true, openFinance: true}}
                                         //    consents.aecb!==true -> throw (consent gate).
                                         //    -> DecisionRecord (see §2.2)
  decideRaw(productId, sampleRow),       // convenience for simulation; no side effects, returns {outcome, reasonCodes}
  simulateBook(productId, candidateParams), // -> {size, before: {APPROVE, REFER, DECLINE}, after: {...},
                                         //    flips: [{id, from, to, why}] (max 20), summary: string}
  drawdownCheck(decisionId, amount, flags), // flags = {arrears: bool, deterioration: bool}
                                         //    -> {allowed, amount, remainingAfter, reasonCodes: []}
  recordEvent(decisionId, eventType),    // eventType ∈ EXEC_EVENTS (ordered):
                                         //    PROMISE_SIGNED, WAKALA_SIGNED, COMMODITY_PURCHASED,
                                         //    MURABAHA_OFFER_SENT, MURABAHA_ACCEPTED, PROCEEDS_CREDITED
                                         //    Out-of-order -> throw with message naming expected next step
                                         //    (this IS the Shari'ah-sequencing demo). -> updated record
  override(decisionId, o),               // o = {outcome:'APPROVE'|'DECLINE', reasonCode, analyst, approver, note}
                                         //    only on REFER records; analyst===approver -> throw. -> record
  listDecisions(),                       // newest first
  getDecision(id),
  referQueue(),                          // -> open REFER records + the seeded queue, with slaHoursLeft
  metrics(),                             // -> see §2.3
}
```

### 2.1 Policy: regulatory (locked) vs params (editable)

`regulatory` (rendered read-only in the console, engine enforces regardless of params):

| key | retail_pf | sme_wc | salary_advance |
|---|---|---|---|
| dbrCapPct | 50 | — | 50 |
| dbrCapRetireePct | 30 | — | 30 |
| salaryMultipleCap | 20 | — | — |
| tenorCapMonths | 48 | 36 (bank policy but rendered locked as credit-committee floor doc; put in params instead — see below) | 1 (next payday) |
| aecbCheckRequired | true | true | true |
| coolingOffDays | 5 | — | — |
| sectorScreenVersion | — | 'ISSC-2026.2' | — |

(Only retail regulatory keys are truly CBUAE-sourced; put SME tenor cap in `params`. Keep the
table's spirit: regulatory = unchangeable in UI + engine double-enforces retail DBR/multiple/tenor.)

`params` defaults (editable in console within given min/max):

- retail_pf: `minSalary: 8000`, `minAge: 21`, `maxAge: 65`, `scoreDecline: 620` (< declines),
  `scoreRefer: 680` (< refers unless strong overlays), `maxEsrPct: 60`, `thinFileAction: 'REFER'`,
  `minMonthsInUae: 6`, `chequeReturnsMax: 1`, `productCap: 2000000`,
  `pricingBands: {A: [0.0549,0.0599], B: [0.0649,0.0699], C: [0.0749,0.0849]}` (annual profit
  rate, benchmark label 'EIBOR 3M + spread'), `tokenValidityDays: 14`.
- sme_wc: `minLicenseAgeMonths: 12`, `minMonthsBankData: 6`, `ownerScoreFloor: 550`,
  `commercialScoreRefer: 640`, `maxVolatilityPct: 45`, `chequeReturnsMax: 2`,
  `inflowMultiple: {A: 1.5, B: 1.2, C: 0.8}` (× avgMonthlyInflow = facility cap),
  `tenorCapMonths: 36`, `productCap: 5000000`, `pricingBands: {A: [0.0699,0.0749], B: [0.0799,0.0899], C: [0.0949,0.1049]}`,
  `guaranteeThreshold: 1000000` (above → condition: 'EDB credit guarantee assessment').
- salary_advance: `pctOfSalary: 80`, `capAmount: 13500`, `flatFee: 150` (**no risk/amount/tenor
  scaling — render a note quoting AAOIFI SS 19**), `minSalary: 5000`, `scoreDecline: 600`.

### 2.2 DecisionRecord

```js
{
  id: 'MZN-000042',                       // sequential
  createdAt, productId, segment: 'RETAIL'|'SME',
  applicantSnapshot: {...},               // frozen copy
  request: { amount, tenorMonths },
  consents: { aecb: {granted: true, at}, openFinance: {granted, at} },
  dataPulls: [ { source: 'AECB_CONSUMER'|'AECB_COMMERCIAL'|'AECB_OWNER'|'OPEN_FINANCE'|'INTERNAL_CORE'|'DOCUMENTS',
                 status: 'HIT'|'NO_HIT'|'OK', latencyMs, cached: false, summary: {..} } ],
  features: { /* named, flat: verifiedIncome, dbrPct, headroomMonthly, netInflowAvg,
                 volatilityPct, ownerWorstScore, esrPct, ... everything rules use */ },
  rules: [ { id: 'REG_DBR_CAP', name, category: 'REGULATORY'|'POLICY'|'SHARIAH',
             result: 'PASS'|'FAIL'|'REFER', observed, threshold } ],   // EVERY rule evaluated, pass or fail
  score: { model: 'scorecard_v0', version: '0.3', base: <aecb score or null>,
           overlays: [{name, delta}], points, grade: 'A'|'B'|'C'|'D'|'E' },
  limit: { requested, approved,           // 0 when declined
           bindingConstraint: 'REQUESTED'|'DBR_HEADROOM'|'SALARY_MULTIPLE'|'PRODUCT_CAP'|'INFLOW_MULTIPLE'|'RETIREE_CAP',
           trace: [ {label, value} ] },   // ordered candidate caps, human-readable
  pricing: { mode: 'BANDED', band, rateMin, rateMax, benchmark: 'EIBOR 3M + spread' }
         | { mode: 'FLAT_FEE', fee, note: 'AAOIFI SS 19 — fee is actual cost, cannot scale' },
  outcome: 'APPROVE'|'REFER'|'DECLINE',
  reasonCodes: [ 'RC_…' ],
  token: { id, issuedAt, expiresAt, conditions: [string] } | null,   // APPROVE only
  policyVersion, engineVersion,
  events: [ {type, at} ],                 // Shari'ah execution events, appended by recordEvent
  audit: [ {at, actor, action, detail} ], // decision created, events, overrides — everything
  override: null | { outcome, reasonCode, analyst, approver, note, at },
  status: 'OPEN'|'EXECUTED'|'OVERRIDDEN'|'EXPIRED'
}
```

Retail limit math (document in code): `headroomMonthly = dbrCap×income − obligations`;
`maxByDbr = PV(annuity: headroomMonthly, midBandRate/12, tenorMonths)` (standard annuity PV,
round down to 1,000); candidates = [requested, maxByDbr, 20×salary, productCap]; approved =
min; bindingConstraint = which one bound. SME: candidates = [requested,
inflowMultiple[grade]×avgMonthlyInflow (round to 10,000), productCap].

Scorecard v0 (retail): base = AECB score; overlays: ESR>40 → −20; chequeReturns12m≥1 → −30;
salaryBank==='MAL_BANK' → +15; tenureMonths≥24 → +10. Grade: ≥740 A, ≥680 B, ≥620 C, ≥560 D,
else E. SME: base = commercial score (or 600 proxy if thin w/ strong bank data); overlays:
ownerWorstScore≥700 → +20, ≤600 → −40; volatility≤25 → +15, ≥45 → −25; monthsBankData≥12 → +10.
Same grade bands. Grades map to pricing/inflow bands: A→A, B→B, C/D→C (D only reachable via
override), E → auto-fail rule.

### 2.3 metrics()

```js
{ window: '90d',
  totals: {decisions, APPROVE, REFER, DECLINE}, stpPct,
  bySegment: {RETAIL: {...same}, SME: {...}},
  declineReasons: [{code, labelEn, count}],       // sorted desc
  gradeDist: [{grade, count}],
  daily: [{date, APPROVE, REFER, DECLINE}],       // 90 entries, seeded + session decisions merged on top
  referAging: [{bucket: '<4h'|'4-24h'|'>24h', count}],
  overrideRatePct,
  vintages: [{mob: 1..6, retailFpdPct, smeFpdPct}] }  // gently rising, plausible
```

Seeded history: ~1,900 retail + ~400 SME decisions across 90 days with realistic outcome mix
(retail ~62% approve / 18% refer / 20% decline, STP ~78%; SME ~35/40/25, STP ~42%) with mild
weekly seasonality. Session decisions from `decide()` are merged into all aggregates.

### 2.4 engine.selftest.js — required assertions

1. Personas r1..r5 / s1..s5 produce exactly the intended outcomes in §1.1/§1.2 tables at
   default policy (and r3's bindingConstraint==='DBR_HEADROOM', r5's ==='RETIREE_CAP',
   s1 APPROVE with a token, s4 reasonCodes includes RC_SECTOR_EXCLUDED, s5 includes RC_OWNER_SCORE).
2. Regulatory enforcement: retail decide() never approves when computed dbrPct>50 (spot check by
   mutating a copy of r1 with huge obligations); tenor 60 for retail_pf → clamped or declined with RC_TENOR_CAP.
3. Consent gate: decide() without consents.aecb throws.
4. 4-eyes: publishPolicy with author===approver throws; override with analyst===approver throws.
5. Shari'ah sequencing: recordEvent out of order throws; full ordered sequence on an approved
   retail decision ends status==='EXECUTED' with 6 events.
6. Qard: salary_advance decision for r1 → limit = min(80%×salary, 13500) and pricing.mode==='FLAT_FEE'
   with fee===150 regardless of amount/tenor requested.
7. Drawdown: on s1's approved facility — allowed within limit; flags.arrears → blocked with
   RC_DRAWDOWN_ARREARS; amount beyond remaining → blocked with RC_DRAWDOWN_LIMIT.
8. simulateBook: raising retail scoreDecline 620→660 strictly decreases APPROVE count and the
   flips list is non-empty; every reason code emitted across the whole selftest exists in
   MizanData.reasonCodes.
9. Determinism: two fresh init() runs produce identical metrics().totals and identical sampleBook
   outcomes.

---

## 3. UI (index.html)

`<title>Mizan — Credit Decisioning Prototype</title>`. Single page, left sidebar nav
(collapses to horizontal scrollable tab bar under 900px). Seven screens:

1. **Overview** — what Mizan is (3 sentences), the six PRD positions as a compact grid, a
   "how to demo" strip (suggested 5-step click path), and a PRD §-mapping table (each screen →
   PRD section it proves). Badge: "Prototype — synthetic data only. Not a real credit system."
   (must be visible on every screen, e.g. in the sidebar footer).
2. **Retail journey** (PRD §5.3) — persona cards (r1–r5) → request form (amount/tenor sliders
   prefilled) → consent step (AECB + open finance checkboxes with legal-basis microcopy;
   AECB unchecked blocks submission explaining why) → animated orchestration timeline
   (each dataPull appears with latency + result as it "runs", ~300ms steps, skippable) →
   decision panel: outcome banner, grade, limit + **binding-constraint trace**, pricing band,
   bilingual reason codes (EN + RTL Arabic rendered `dir="rtl"`), approval token with expiry &
   conditions, KFS preview snippet (profit rate band, total estimated obligation, cooling-off
   note). For APPROVE: "Execute Murabaha" panel — 6 ordered steps as buttons that call
   recordEvent; out-of-order click shows the engine's thrown error inline (that's a feature:
   approval ≠ debt); completed sequence marks EXECUTED and links to Decision log. Also a
   **Salary advance (Qard Hassan)** mini-card: run r1/r2 through salary_advance and show the
   flat-fee note — three manifests, one engine.
3. **SME journey** (PRD §5.4) — persona cards (s1–s5) → consent (entity + each owner) →
   orchestration (AECB commercial + per-owner pulls + bank data) → 12-month inflow bar chart
   (canvas/SVG, no libs) with volatility + concentration callouts → decision panel like retail
   plus facility view; for s1 approved: **drawdown simulator** (amount input + "simulate arrears
   flag" toggle → allowed/blocked with reasons, remaining limit bar).
4. **Policy console** (PRD §8.5) — product picker; **Regulatory primitives** rendered as locked
   rows (lock icon, source citation e.g. "Reg 29/2011"); editable params as inputs with bounds;
   **Simulate** runs simulateBook and renders before/after stacked bars + flips table;
   **Publish** requires author + different approver name (else engine throws, show the error),
   bumps version; policy history list with per-version diffs. Sector-exclusion list shown for
   sme_wc with ISSC version badge and basis per row (locked).
5. **Workbench** (PRD §8.8) — refer queue table (id, name, segment, waiting, SLA left, top
   reason); case view = full pre-assembled file (pulls, features, every rule with pass/fail,
   score breakdown, limit trace); Approve/Decline override form: reason code select, analyst +
   approver (4-eyes enforced by engine — surface its error), note. Resolved cases show override
   chip and drop from queue.
6. **Decision log** (PRD §8.8 replay) — all session decisions (+ note that seeded history is
   aggregate-only); click → **full replay**: inputs snapshot, consents, pulls, features, rules
   fired, score, limit trace, pricing, token, events timeline, audit trail — "everything the
   auditor sees", explicitly labelled for CBUAE model-audit + Shari'ah-audit framing.
7. **Monitoring** (PRD §8.9) — from metrics(): stat tiles (decisions 90d, STP% vs targets
   retail ≥80 / SME ≥40, override rate), daily outcomes stacked area/bar, decline reasons bar,
   grade distribution, refer aging, vintage FPD lines with appetite corridor band. Charts:
   hand-rolled SVG/canvas, no libraries; follow dataviz-skill conventions (invoke the `dataviz`
   skill before writing chart code).

**Cross-cutting requirements**
- New decisions from journeys appear immediately in Workbench (refers), Decision log, Monitoring.
- Design: this is a *tool*, utilitarian-polished. Token-based theming, light + dark
  (`prefers-color-scheme` + `:root[data-theme]` override, theme toggle in sidebar footer).
  Palette (light): ground `#F6F8F7`, panel `#FFFFFF`, ink `#182420`, muted `#5A6B64`,
  accent teal `#0C5D63`, accent-strong `#09454A`, brass detail `#A87B2F` (hairlines/eyebrows
  only); semantic: approve `#1E7F56`, refer `#A9761B`, decline `#AE3B32` (never reuse accent as
  semantic). Dark: ground `#0F1514`, panel `#161D1B`, ink `#E4EBE8`, muted `#93A39D`, accent
  `#4FB3B9`, approve `#4CC08A`, refer `#D9A94E`, decline `#E07B70`. Type: display serif stack
  `Georgia, 'Iowan Old Style', 'Times New Roman', serif` for the Mizan wordmark + screen titles
  (with the Arabic ميزان next to the wordmark); UI/body `system-ui, -apple-system, 'Segoe UI',
  Roboto, sans-serif`; data/mono `ui-monospace, 'SF Mono', Menlo, Consolas, monospace` with
  `font-variant-numeric: tabular-nums` on all numeric tables/tiles. Arabic text: `font-family:
  'Noto Naskh Arabic', 'Geeza Pro', 'Traditional Arabic', serif; direction: rtl`.
- Numbers formatted `AED 1,250,000`; rates `6.49%`.
- Accessibility: visible focus states, aria-labels on icon buttons, `prefers-reduced-motion`
  disables the orchestration animation (render instantly).
- **Fatal-error banner**: `window.onerror` and `unhandledrejection` append a visible
  `<div id="fatal-banner">` with the message at the top of the page (also used by automated
  smoke tests). Expected engine throws that the UI catches (4-eyes, sequencing, consent) must
  NOT hit the banner — catch and render them inline as designed feedback.
- No `alert()`/`prompt()`; no external requests; everything works from `file://`.

## 4. Acceptance (integration phase runs these)

1. `node mal-bank/prototype/src/engine.selftest.js` exits 0.
2. index.html loads headless with zero content in `#fatal-banner`, sidebar shows 7 nav items,
   and every screen section exists in DOM (`data-screen="overview|retail|sme|policy|workbench|log|monitoring"`).
3. Scripted browser run (Playwright if available): r1 journey → APPROVE with token; execute all
   6 events in order → EXECUTED; r2 → REFER appears in workbench; override with 4-eyes succeeds;
   s4 → DECLINE with Arabic reason rendered; policy console: scoreDecline 620→660 simulate shows
   fewer approvals, publish with distinct approver bumps version; monitoring tiles non-zero.

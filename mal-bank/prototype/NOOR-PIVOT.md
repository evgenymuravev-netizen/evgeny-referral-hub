# Noor pivot — Contract Addendum v2.0 (supersedes Shari'ah-specific parts of v1.x)

The prototype is being repurposed from **Mal Bank (Shari'ah-compliant, retail + SME)** to
**Noor (noor finance) — a conventional B2C (consumer) fintech in the UAE**. Read CONTRACT.md for
the architecture and API conventions; THIS file overrides it wherever they conflict.

## Who Noor is (from the brand book — use this voice)

- "noor finance". Noor means "light" in Arabic. Positioning: **"a reliable, calm, self-assured
  fintech"** — "the person we're building for already has four banking apps shouting at them; we're
  not going to be the fifth one shouting." (The brand-book tagline is not used in the prototype — product decision, 9 Oct.)
  Direction: **"AI-driven Installments to Agentic Bank — Know. Think. Act."**
- Core consumer product: **Split a big purchase** — Noor sees a large purchase the customer ALREADY
  made (detected from their connected bank accounts via UAE Open Finance / Al Tareq) and offers to
  split it into **Pay in 3 / Pay in 6 / Pay in 12** monthly instalments with a monthly fee; the cash
  that is "freed" goes back to the customer (and toward their savings goal). Brand example copy:
  "You paid AED 12,000 in school fees. Get it back — split it." / "The freed cash goes to your goal."
- Noor is a budgeting + goals app: connected accounts, budget, spending, goals ("Own apartment 40%").
- Conventional, fee/interest-based. **Remove ALL Shari'ah content**: Murabaha, Tawarruq, Qard
  Hassan, wakala, commodity, AAOIFI, ISSC, HSA, sector-exclusion screen, "profit rate", "finance"
  as a euphemism for loan, Shari'ah audit. Use conventional terms: loan, interest, APR, fee.
- Keep bilingual EN + Arabic reason codes (CBUAE requires Arabic + English disclosure) — update the
  Arabic to conventional terminology (قرض loan, فائدة interest, رسوم fees, معدل الفائدة السنوي APR).
- Replace every "Mal Bank" / "Mal" with "Noor". Keep **Mizan** as the codename of the decisioning
  engine ("Mizan — Noor's credit decisioning layer").
- B2C ONLY: **delete the SME product, personas, sector screen, owner-blend, commercial bureau.**

## Products (manifests) — three, one engine

| productId | nameEn | What it is | Underwriting anchor | pricingMode |
|---|---|---|---|---|
| `split` | Split a purchase | Retroactive instalment plan on a verified past purchase; Pay in 3/6/12; revolving **split capacity** + per-purchase plans | Connected-account **cash flow** (income, spend, free cash flow, volatility) + AECB check | `MONTHLY_FEE` |
| `personal_loan` | Personal loan | Conventional cash personal loan (was retail_pf) | Salary + AECB + DBR | `BANDED_APR` |
| `salary_advance` | Salary advance | Short advance against next salary (was Qard Hassan) | Verified salary + AECB | `FLAT_FEE` |

`manifests()` returns exactly these three, in this order, with fields
`{productId, nameEn, nameAr, segment:'CONSUMER', structure, pricingMode}`.
`structure` strings: split → 'Instalment plan (revolving split capacity)'; personal_loan →
'Amortising loan (reducing balance)'; salary_advance → 'Single-repayment advance'.
All decisions get `segment: 'CONSUMER'` (the RETAIL/SME split is gone). UI and metrics group by
**productId** instead.

### Regulatory primitives (locked; CBUAE, conventional — same values as before where they apply)

- personal_loan: dbrCapPct 50, dbrCapRetireePct 30, salaryMultipleCap 20, tenorCapMonths 48,
  aecbCheckRequired true, coolingOffDays 5, earlySettlementFeeCap '1% of outstanding or AED 10,000'.
- split: dbrCapPct 50, dbrCapRetireePct 30, aecbCheckRequired true, coolingOffDays 5,
  allowedPlansMonths [3, 6, 12] (rendered locked; tenor must be one of these else throw/clamp with
  RC_TENOR_CAP), feeDisclosure 'Monthly fee + APR equivalent shown in KFS'.
- salary_advance: dbrCapPct 50, aecbCheckRequired true, tenorCapMonths 1.
Engine double-enforces DBR (all products), 20× salary + 48 months (personal_loan) regardless of params.

### Pricing

- personal_loan `BANDED_APR` (reducing-balance annual rate): A [0.0599, 0.0699], B [0.0799, 0.0999],
  C [0.1199, 0.1499]; benchmark label 'EIBOR 3M + margin'. pricing = `{mode:'BANDED_APR', band,
  rateMin, rateMax, benchmark}`. KFS figures: monthly instalment at mid-band, total repayable,
  total interest.
- split `MONTHLY_FEE`: monthly fee rate on principal by grade: A 0.0125, B 0.0175, C 0.0225 (params,
  editable). For an approved purchase plan: `monthlyPayment = principal/n + fee`, `fee = principal ×
  rate`, `planTotal = principal + fee×n`, and **`aprEquivalent`** (solve IRR of the monthly schedule,
  annualised ×12; Newton or bisection) — CBUAE KFS must show an APR equivalent. pricing =
  `{mode:'MONTHLY_FEE', band, monthlyFeeRate, plans:[{months, monthlyPayment, monthlyFee, planTotal,
  aprEquivalent}] for 3,6,12, selectedMonths}`.
- salary_advance `FLAT_FEE`: `{mode:'FLAT_FEE', fee: params.flatFee (default 50), note:'Flat fee, no
  interest — within the CBUAE retail fee schedule'}`. Limit = min(pctOfSalary% × salary, capAmount).
  (Fee may no longer cite AAOIFI; it is a commercial choice now.)

### Execution events (replaces Murabaha sequence) — conventional CBUAE consumer-protection order

`EXEC_EVENTS` (ordered, for personal_loan and split; salary_advance may use the same):
`OFFER_ACCEPTED`, `KFS_ACKNOWLEDGED`, `AGREEMENT_SIGNED`, `COOLING_OFF_CLEARED`, `DISBURSED`.
Labels/descriptions (UI): Offer accepted → "Customer accepts the time-boxed offer";
KFS acknowledged → "Key Facts Statement (Arabic + English) read and acknowledged";
Agreement signed → "Loan agreement e-signed via UAE PASS";
Cooling-off cleared → "5 business days elapsed, or written waiver signed (CPR 8/2020)";
Disbursed → personal loan: "Funds credited to the customer's account"; split: "Purchase amount
credited back — freed cash routed to the customer's goal".
Out-of-order `recordEvent` throws `Mizan: out of sequence — expected <NEXT> next (<reason>)` where the
reason cites consumer protection, e.g. "KFS must be acknowledged before the agreement is signed —
CBUAE Consumer Protection Standards" / "no disbursement before the cooling-off period clears or is
waived". Full sequence → status 'EXECUTED'. The point being demoed: **an approval is not a loan**.

### Split product logic (replaces SME working capital — reuse the SME cash-flow code where sensible)

Split applicant shape (personas c1–c5):
```js
{ id:'c1', name, nameAr, tagline, age, residency, monthsInUae,
  employment:{ employer, type:'PRIVATE'|'GOVERNMENT'|'SELF_EMPLOYED', retiree:false },
  aecb:{ hit, score, obligationsMonthly, chequeReturns12m, worstDelinquency, creditPassportAvailable:false },
  connected:{ source:'ALTAREQ_TPP', banks:['ENBD','FAB'] /* labels only, no logos */, monthsAvailable,
    avgMonthlyIncome, avgMonthlySpend, incomeVolatilityPct,
    monthlyIncome:[12 nums oldest first, consistent with avg & volatility; zeros/omitted where
      monthsAvailable<12 — represent unavailable months as null],
    monthlySpend:[12 nums | null] },
  purchase:{ merchant:'School fees', category:'Education', amount:12000, date:'2026-07-08',
    detectedVia:'Connected account (FAB current account)' },
  defaultRequest:{ amount:<purchase.amount>, tenorMonths:6 } }
```
Features: verifiedIncome (=avgMonthlyIncome), freeCashFlowMonthly (= income − spend − AECB
obligations), incomeVolatilityPct, dbrPct (all obligations incl. new instalment / income),
instalmentToFcfPct, purchaseAgeDays (TODAY − purchase.date), connectedMonths.
Rules (every rule recorded PASS/FAIL/REFER): REG_AECB_CHECK, REG_DBR_CAP, POL_MIN_INCOME,
POL_CONNECTED_HISTORY (connectedMonths ≥ minConnectedMonths), POL_PURCHASE_VERIFIED (purchase within
purchaseLookbackDays and seen in connected data), POL_FREE_CASH_FLOW (fcf ≥ minFreeCashFlow, else
DECLINE RC_FREE_CASH_FLOW), POL_INSTALMENT_TO_FCF (instalment ≤ instalmentToFcfMaxPct% of fcf, else
reduce plan/limit), POL_INCOME_VOLATILITY (> maxIncomeVolatilityPct → REFER RC_INCOME_VOLATILITY),
POL_DELINQUENCY (DPD90/WRITEOFF → DECLINE RC_DELINQUENCY), POL_CHEQUE_RETURNS, POL_SCORE
(score < scoreDecline → DECLINE RC_SCORE_LOW; < scoreRefer → REFER), and thin-file handling:
**AECB no-hit + connectedMonths ≥ minConnectedMonths → underwrite on cash flow** (reason
RC_CASH_FLOW_UNDERWRITTEN, base score proxy 640, grade capped at B) — this is Noor's thesis: open
banking makes thin files approvable.
Scorecard (split): base = AECB score (or 640 proxy on cash-flow path); overlays: fcf ≥ 5,000 → +20;
fcf < 1,500 → −30; volatility ≤ 20 → +15; ≥ 40 → −25; connectedMonths ≥ 12 → +10; cheque returns ≥1
→ −30. Grades as before (≥740 A, ≥680 B, ≥620 C, ≥560 D, else E).
Limit: **split capacity** = min(splitCapacityMultiple[grade] × fcf (round down to 500), productCap);
purchase plan approved amount = min(requested purchase amount, capacity); if the requested plan's
instalment breaches instalmentToFcf or DBR, pick the **shortest allowed plan that fits** (3→6→12)
and record bindingConstraint 'FREE_CASH_FLOW'; if none fit → reduce amount. Binding constraint
domain adds: 'SPLIT_CAPACITY', 'FREE_CASH_FLOW', 'DBR_HEADROOM', 'REQUESTED', 'PRODUCT_CAP'.
`limit` adds `capacity` (the revolving split capacity) and `planMonths`.
Drawdown = **"Split another purchase"**: `drawdownCheck(decisionId, amount, flags)` against remaining
capacity (flags.arrears → blocked RC_DRAWDOWN_ARREARS; over capacity → blocked RC_DRAWDOWN_LIMIT),
returns `{allowed, amount, remainingAfter, reasonCodes, plan:{months, monthlyPayment}}` (default
months 6; accept optional flags.months ∈ {3,6,12}).
Split params (editable, with min/max bounds): minMonthlyIncome 5000, minConnectedMonths 3,
purchaseLookbackDays 60, minFreeCashFlow 1000, instalmentToFcfMaxPct 50, maxIncomeVolatilityPct 40,
scoreDecline 600, scoreRefer 650, chequeReturnsMax 1, productCap 50000,
splitCapacityMultiple {A:3.0, B:2.0, C:1.0}, monthlyFeeRate {A:0.0125, B:0.0175, C:0.0225},
tokenValidityDays 7.

### Split personas — fixed outcomes at default policy (TODAY = '2026-07-19')

| id | Name | Setup | Intended outcome |
|---|---|---|---|
| c1 | Mariam Al Zarooni | Salaried 32k/mo, spend ~19k, stable (vol ~8%), AECB 761, obligations 2.4k, 12 months connected; purchase **School fees AED 12,000** on 2026-07-08 | **APPROVE**, grade A, plan Pay in 6, capacity well above 12k; drawdown demo runs on this |
| c2 | Daniel Okafor | Freelance designer, income avg 21k but volatility ~58% (lumpy months), AECB 702, purchase **Laptop AED 8,500** | **REFER** — RC_INCOME_VOLATILITY |
| c3 | Sana Qureshi | Income 16k, spend ~16.2k + obligations 2.1k → negative/low free cash flow, AECB 688, purchase **Sofa AED 6,000** | **DECLINE** — RC_FREE_CASH_FLOW |
| c4 | Arjun Mehta | New to UAE (5 months), **no AECB hit**, salary 18k stable, spend 11k, 5 months connected; purchase **Flights AED 4,800** | **APPROVE** via cash-flow underwriting — RC_CASH_FLOW_UNDERWRITTEN, grade ≤ B, modest capacity |
| c5 | Khalid Rashed | Income 27k, healthy FCF, but AECB 548, DPD90 history, 2 cheque returns; purchase **Car service AED 3,200** | **DECLINE** — RC_DELINQUENCY (+ RC_SCORE_LOW) |

### Personal loan (was retail_pf) — keep personas r1–r5 and their outcomes

Same five personas and intended outcomes (r1 APPROVE A; r2 REFER thin file / APPROVE via Credit
Passport with consent; r3 APPROVE DBR_HEADROOM; r4 DECLINE; r5 APPROVE RETIREE_CAP). Changes:
"Mal Bank" → Noor; `salaryBank: 'MAL_BANK'` concept becomes **salary verified via connected accounts**
(`bankData.source:'ALTAREQ_TPP'`, overlay "Salary verified via connected account +15"); r1 tagline
"Government employee, salary verified via connected accounts". Pricing BANDED_APR. Recourse/token
conditions become conventional: ['Key Facts Statement acknowledged (AR + EN)', 'Salary transfer
assignment or direct debit mandate', 'Credit life & job-loss cover offered (optional)'] — cross-border
approvals add 'Remittance-linked repayment schedule'. Split tokens: ['Key Facts Statement acknowledged
(AR + EN)', 'Direct debit mandate on connected account'].

### Reason codes

Remove: RC_SECTOR_EXCLUDED, RC_LICENSE_AGE, RC_OWNER_SCORE, RC_VOLATILITY (SME). Keep the rest that
are still emitted. Add: RC_FREE_CASH_FLOW, RC_INCOME_VOLATILITY, RC_CASH_FLOW_UNDERWRITTEN,
RC_PURCHASE_UNVERIFIED, RC_CONNECTED_HISTORY. All with real MSA Arabic. Every code the engine can emit
must exist in MizanData.reasonCodes.

### Metrics (replaces RETAIL/SME split)

`metrics()` → `{ window:'90d', totals:{decisions, APPROVE, REFER, DECLINE}, stpPct,
byProduct:{ split:{...same + stpPct}, personal_loan:{...} }, declineReasons, gradeDist, daily,
referAging, overrideRatePct, vintages:[{mob, splitFpdPct, loanFpdPct}], earlyWarning:[5] }`.
Seeded history ~2,600 split + ~1,100 personal-loan decisions over 90 days; split ~70/12/18 with STP
~86%; personal loan ~60/18/22 with STP ~78%. Targets shown in UI: Split STP ≥ 85%, Personal loan
STP ≥ 80%. earlyWarning: keep 5 consumer signals (goal contributions stopped → pre-emptive plan
re-schedule offer; remittance spike → check-in; new home-country credit line → capacity review; salary
6 days late → instalment date moved to salary landing; balance depletion → same-day nudge) — all
`segment:'CONSUMER'`, product label split/personal_loan; no SME rows.
`referQueue()` seeded entries: consumer only.

### Selftest (engine.selftest.js) must assert

1. r1–r5 personal-loan outcomes (incl. r2 both paths) and c1–c5 split outcomes as tabled.
2. DBR never auto-approved > 50% (both products); personal-loan tenor > 48 handled with RC_TENOR_CAP;
   split tenor ∉ {3,6,12} handled.
3. Consent gate (no AECB consent → throw); split also requires `consents.openFinance === true`
   (connected accounts) → throw if missing.
4. 4-eyes on publishPolicy and override.
5. Conventional sequencing: every wrong-order first step throws; full order → EXECUTED with 5 events.
6. Split pricing: plans for 3/6/12 present; planTotal = principal + fee×n; aprEquivalent > 0 and
   increases as plan shortens for the same monthly fee rate (sanity), and fee constant per month.
7. Salary advance: limit = min(80%×salary, cap), FLAT_FEE independent of amount/tenor.
8. Split drawdown on c1: within capacity allowed; arrears blocked; over capacity blocked.
9. simulateBook on both products: tightening a cut-off strictly reduces approvals, flips non-empty.
10. Determinism; every emitted reason code exists with non-empty Arabic; **no string anywhere in
    data.js or engine.js matches /shari|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b/i**
    (add this grep-style assertion by reading both source files).

## Engine API after Noor pivot (v2.0)

The authoritative shapes the UI must consume (`src/data.js` = `data-2.0`, `src/engine.js` =
`engine-2.0`; `node src/engine.selftest.js` → 324 checks green). Globals, load order
(data.js → engine.js → UI), determinism, `TODAY = '2026-07-19'` and the `Mizan: <message>` error
convention are unchanged from CONTRACT.md. Everything below that differs from v1 is called out.

### Renames at a glance (v1 → v2)

| v1 | v2 |
|---|---|
| productId `retail_pf` | `personal_loan` |
| productId `sme_wc` | `split` (consumer; SME is gone) |
| `MizanData.personasRetail` | `MizanData.personasLoan` (r1–r5) |
| `MizanData.personasSme` | `MizanData.personasSplit` (c1–c5) — different shape, see below |
| `MizanData.sectorExclusions` | **removed** |
| `sampleBook.retail` / `.sme` | `sampleBook.personal_loan` (140) / `.split` (120) |
| `segment: 'RETAIL' \| 'SME'` | always `'CONSUMER'` — group/branch on **`productId`** |
| `pricing.mode 'BANDED'` | `'BANDED_APR'` (personal_loan) · new `'MONTHLY_FEE'` (split) · `'FLAT_FEE'` |
| `employment.salaryBank: 'MAL_BANK'` | removed → `bankData.source: 'ALTAREQ_TPP' \| 'DOCUMENTS'` |
| 6 Murabaha `EXEC_EVENTS` (UI hard-codes them at index.html:458) | 5 conventional events — read `MizanEngine.EXEC_EVENTS` / `MizanEngine.execSteps(productId)`; do not hard-code |
| `metrics().bySegment.{RETAIL,SME}` | `metrics().byProduct.{split,personal_loan,salary_advance}` |
| `vintages[].retailFpdPct / smeFpdPct` | `vintages[].loanFpdPct / splitFpdPct` |
| `drawdownCheck` on `sme_wc` | `drawdownCheck` on `split` ("Split another purchase"); returns `plan` |

### MizanData

```js
MizanData = {
  VERSION: 'data-2.0', TODAY: '2026-07-19',
  monthLabels: ['2025-07', …, '2026-06'],     // 12 labels for the split personas' monthly series, oldest first
  personasSplit: [c1, c2, c3, c4, c5],
  personasLoan:  [r1, r2, r3, r4, r5],
  reasonCodes: { RC_…: { en, ar } },
  earlyWarning: [5 × { id, detectedAt, customer, segment:'CONSUMER', productId:'split'|'personal_loan',
                       signal, signalAr, recommendedAction, status:'ACTIONED'|'OPEN' }],
  sampleBook: { split: [120 rows], personal_loan: [140 rows] },
  history: { days: 90, seed: 20260719 }
}
```

**Split persona (c1–c5)** — exactly:

```js
{ id:'c1', name, nameAr, tagline, age, residency:'UAE_NATIONAL'|'RESIDENT'|'NEW_RESIDENT', monthsInUae,
  employment: { employer, type:'PRIVATE'|'GOVERNMENT'|'SELF_EMPLOYED', retiree:false },   // no salaryMonthly
  aecb: { hit, score /*null when hit=false*/, obligationsMonthly, chequeReturns12m,
          worstDelinquency:'NONE'|'DPD30'|'DPD90'|'WRITEOFF', creditPassportAvailable:false },
  connected: { source:'ALTAREQ_TPP', banks:['FAB','ENBD'] /* text labels only */, monthsAvailable,
               avgMonthlyIncome, avgMonthlySpend, incomeVolatilityPct,
               monthlyIncome:[12 numbers|null, oldest first — aligned to MizanData.monthLabels],
               monthlySpend:[12 numbers|null] },          // null = month outside the connected window (c4 has 7 nulls)
  purchase: { merchant, category, amount, date:'YYYY-MM-DD', detectedVia:'Connected account (…)' },
  defaultRequest: { amount /* = purchase.amount */, tenorMonths: 6 } }
```

| id | name | income / spend / obligations | AECB | purchase |
|---|---|---|---|---|
| c1 | Mariam Al Zarooni | 32,000 / 19,000 / 2,400 · vol 8% · 12 mo | 761 | School fees 12,000 · 2026-07-08 |
| c2 | Daniel Okafor | 21,000 / 13,000 / 1,500 · vol 58% · 12 mo | 702 | Laptop 8,500 · 2026-07-02 |
| c3 | Sana Qureshi | 16,000 / 16,200 / 2,100 · vol 10% · 12 mo | 688 | Sofa 6,000 · 2026-06-28 |
| c4 | Arjun Mehta | 18,000 / 11,000 / 0 · vol 2% · 5 mo | no hit | Flights 4,800 · 2026-07-12 |
| c5 | Khalid Rashed | 27,000 / 15,000 / 3,500 · vol 12% · 12 mo | 548, DPD90, 2 cheques | Car service 3,200 · 2026-07-15 |

**Personal-loan persona (r1–r5)** — v1 shape with these changes: `employment` = `{ employer, type:
'GOVERNMENT'|'PRIVATE'|'PENSION', salaryMonthly, tenureMonths, retiree }` (**no `salaryBank`**);
`bankData` = `{ source:'ALTAREQ_TPP'|'DOCUMENTS', banks:[…], monthsAvailable, salaryDetected,
avgSalaryCredit }` (r4 is `'DOCUMENTS'`, the rest `'ALTAREQ_TPP'`); `aecb` unchanged
(`{hit, score, esrPct, obligationsMonthly, tradelines, chequeReturns12m, worstDelinquency,
creditPassportAvailable}`); r2 keeps `homeBureau {country, bureau, score, scoreRange, historyYears,
obligationsMonthlyAed}`. r1 tagline: "Government employee, salary verified via connected accounts".

**sampleBook rows** — split: `{id:'SP-001', income, spend, volatility, aecbScore|null,
connectedMonths, obligations, chequeReturns, worstDelinquency, purchaseAmount, purchaseAgeDays,
tenorMonths:3|6|12}`; personal_loan: v1 retail row + `bankSource`, ids `'PL-001'…`.

### MizanEngine

```js
MizanEngine = { VERSION:'engine-2.0', EXEC_EVENTS:[…5], init, manifests, execSteps /*new*/, getPolicy,
  publishPolicy, policyHistory, decide, decideRaw, simulateBook, drawdownCheck, recordEvent, override,
  listDecisions, getDecision, referQueue, metrics }
```

**`manifests()`** → exactly, in order:

| productId | nameEn | nameAr | structure | pricingMode |
|---|---|---|---|---|
| split | Split a purchase | تقسيط مشترياتك | Instalment plan (revolving split capacity) | MONTHLY_FEE |
| personal_loan | Personal loan | قرض شخصي | Amortising loan (reducing balance) | BANDED_APR |
| salary_advance | Salary advance | سلفة على الراتب | Single-repayment advance | FLAT_FEE |

All with `segment: 'CONSUMER'`.

**`EXEC_EVENTS`** = `['OFFER_ACCEPTED','KFS_ACKNOWLEDGED','AGREEMENT_SIGNED','COOLING_OFF_CLEARED','DISBURSED']`
(same for all three products). **`execSteps(productId)`** → `[{type, label, description}]` ×5:

| type | label | description |
|---|---|---|
| OFFER_ACCEPTED | Offer accepted | Customer accepts the time-boxed offer |
| KFS_ACKNOWLEDGED | KFS acknowledged | Key Facts Statement (Arabic + English) read and acknowledged |
| AGREEMENT_SIGNED | Agreement signed | Loan agreement e-signed via UAE PASS |
| COOLING_OFF_CLEARED | Cooling-off cleared | 5 business days elapsed, or written waiver signed (CPR 8/2020) |
| DISBURSED | Disbursed | personal_loan: "Funds credited to the customer's account" · split: "Purchase amount credited back — freed cash routed to the customer's goal" · salary_advance: "Advance credited to the customer's account" |

**`recordEvent(decisionId, type)`** — out of order throws
`Mizan: out of sequence — expected <NEXT> next (<reason>)`, reason keyed on the expected step, e.g.
`(KFS must be acknowledged before the agreement is signed — CBUAE Consumer Protection Standards)`,
`(no disbursement before the cooling-off period clears or is waived — CBUAE Consumer Protection Regulation 8/2020)`.
Also throws on unknown event names (incl. the v1 names), non-APPROVE decisions, and re-execution.
5th event → `status: 'EXECUTED'`, `events.length === 5`.

**`getPolicy(productId)`** → `{productId, version, publishedAt, publishedBy, approvedBy, regulatory, params}`.
Regulatory (locked; render read-only; note non-numeric values):

| key | split | personal_loan | salary_advance |
|---|---|---|---|
| dbrCapPct | 50 | 50 | 50 |
| dbrCapRetireePct | 30 | 30 | — (engine still applies 30 for retirees) |
| salaryMultipleCap | — | 20 | — |
| tenorCapMonths | — | 48 | 1 |
| allowedPlansMonths | `[3, 6, 12]` (array) | — | — |
| aecbCheckRequired | true | true | true |
| coolingOffDays | 5 | 5 | — |
| feeDisclosure | 'Monthly fee + APR equivalent shown in KFS' | — | — |
| earlySettlementFeeCap | — | '1% of outstanding or AED 10,000' | — |

Editable params (default · [min, max]):

- **split**: `minMonthlyIncome` 5000 [3000, 20000] · `minConnectedMonths` 3 [1, 12] ·
  `purchaseLookbackDays` 60 [14, 120] · `minFreeCashFlow` 1000 [0, 10000] · `instalmentToFcfMaxPct`
  50 [10, 80] · `maxIncomeVolatilityPct` 40 [15, 80] · `scoreDecline` 600 [500, 700] · `scoreRefer` 650
  [550, 760] · `chequeReturnsMax` 1 [0, 5] · `productCap` 50000 [5000, 200000] · `tokenValidityDays` 7
  [1, 30] · `splitCapacityMultiple` `{A:3, B:2, C:1}` (each (0, 6]) · `monthlyFeeRate`
  `{A:0.0125, B:0.0175, C:0.0225}` (each (0, 0.05], must stay A ≤ B ≤ C).
- **personal_loan**: `minSalary` 8000 [4000, 25000] · `minAge` 21 [18, 25] · `maxAge` 65 [60, 70] ·
  `scoreDecline` 620 [550, 720] · `scoreRefer` 680 [600, 780] · `maxEsrPct` 60 [30, 90] ·
  `thinFileAction` 'REFER'|'DECLINE' · `minMonthsInUae` 6 [0, 24] · `chequeReturnsMax` 1 [0, 5] ·
  `productCap` 500000 [100000, 2000000] · `pricingBands` `{A:[0.0599,0.0699], B:[0.0799,0.0999],
  C:[0.1199,0.1499]}` (annual interest, each `[min,max]`, 0 < min < max ≤ 0.30) · `tokenValidityDays` 14 [3, 30].
- **salary_advance**: `pctOfSalary` 80 [50, 90] · `capAmount` 13500 [5000, 25000] · `flatFee` 50
  [25, 300] · `minSalary` 5000 [3000, 15000] · `scoreDecline` 600 [550, 700] · `tokenValidityDays` 7 [3, 14].

`publishPolicy` / `simulateBook` validation adds: `scoreRefer ≥ scoreDecline` (merged with current
params) and the fee-rate ordering; regulatory keys (incl. `allowedPlansMonths`) still throw.

**`decide(application)`** — `{productId, applicant, amount, tenorMonths, consents}`.
`consents.aecb === true` required for every product; **split also requires
`consents.openFinance === true`** (throws `Mizan: Open Finance consent … is required for split …`).
For split, `applicant` is a c-persona, `amount` is the amount to split (capped at
`purchase.amount`), `tenorMonths` should be 3/6/12 (others are snapped up to the next permitted term,
max 12, with `RC_TENOR_CAP`). For personal_loan, `consents.openFinance` drives salary verification
(OPEN_FINANCE pull + the +15 overlay; without it → DOCUMENTS pull, no overlay) and
`consents.creditPassport` keeps the r2 cross-border path.

**DecisionRecord** — same top-level keys as v1 (`id, createdAt, productId, segment, applicantSnapshot,
request, consents, dataPulls, features, rules, score, limit, pricing, outcome, reasonCodes, token,
policyVersion, engineVersion, events, audit, override, status`). Changes:

- `segment` is always `'CONSUMER'`.
- `dataPulls[].source` ∈ `'AECB_CONSUMER' | 'CREDIT_PASSPORT' | 'OPEN_FINANCE' | 'DOCUMENTS'`
  (`AECB_COMMERCIAL`, `AECB_OWNER`, `INTERNAL_CORE` gone). Split: `AECB_CONSUMER` + `OPEN_FINANCE`
  whose `summary = {provider:'Al Tareq (UAE Open Finance)', banks, monthsAvailable, avgMonthlyIncome,
  avgMonthlySpend, incomeVolatilityPct, purchaseMatched}`.
- `rules[].category` ∈ `'REGULATORY' | 'POLICY'` (no `SHARIAH`). Split rule ids, in order:
  `REG_AECB_CHECK, REG_PLAN_TERMS, POL_MIN_INCOME, POL_CONNECTED_HISTORY, POL_PURCHASE_VERIFIED,
  POL_THIN_FILE, POL_DELINQUENCY, POL_SCORE, POL_CHEQUE_RETURNS, POL_INCOME_VOLATILITY,
  POL_FREE_CASH_FLOW, POL_INSTALMENT_TO_FCF, REG_DBR_CAP`.
- `score` = `{model, version, base, overlays:[{name, delta}], points, grade}`; split adds
  `basis: 'AECB' | 'CASH_FLOW_PROXY' | 'NONE'` and uses `model 'cashflow_scorecard_v0' v0.1`
  (personal loan / salary advance: `'scorecard_v0' v0.4`). On the cash-flow path `base = 640` and the
  first overlay is an informational `{name:'Cash-flow proxy base (AECB no-hit) — grade capped at B', delta:0}`.
- **split `features`**: `verifiedIncome, avgMonthlySpend, existingObligations, freeCashFlowMonthly,
  incomeVolatilityPct, connectedMonths, connectedBanks, purchaseMerchant, purchaseCategory,
  purchaseAmount, purchaseDate, purchaseAgeDays, purchaseSeenInConnectedData, cashFlowUnderwritten,
  thinFile, dbrCapApplied, instalmentBudgetFcf, instalmentBudgetDbr, newInstalment,
  instalmentToFcfPct, dbrPct, requestedMonths, effectiveTenor (= chosen plan months), planAdjusted,
  scoreBase, overlayNet`.
  personal_loan `features` = v1 retail set minus `salaryBank`, plus `incomeSource
  ('ALTAREQ_TPP'|'DOCUMENTS'|'UNVERIFIED')` and `salaryVerifiedViaConnectedAccount`.
- `limit` = `{requested, approved, bindingConstraint, trace:[{label, value}]}`; **split adds
  `capacity`** (revolving split capacity; 0 on DECLINE) **and `planMonths`** (chosen plan).
  `bindingConstraint` domain: personal_loan `REQUESTED | DBR_HEADROOM | RETIREE_CAP | SALARY_MULTIPLE |
  PRODUCT_CAP | CROSS_BORDER_HAIRCUT`; split `REQUESTED | SPLIT_CAPACITY | PRODUCT_CAP | FREE_CASH_FLOW |
  DBR_HEADROOM`; salary_advance `REQUESTED | SALARY_MULTIPLE | PRODUCT_CAP`. Split trace (all AED
  principal amounts, `approved === min(values)`): Requested amount · [Verified purchase amount, only if
  lower] · Split capacity (multiple × FCF, floor 500) · Product cap · max principal on the chosen plan
  within the FCF budget · max principal within the DBR headroom.
- `pricing` (null on DECLINE):
  - personal_loan `{mode:'BANDED_APR', band, rateMin, rateMax, benchmark:'EIBOR 3M + margin',
    kfs:{principal, tenorMonths, rateMid, monthlyInstalment, totalRepayable, totalInterest,
    earlySettlementFeeCap, coolingOffDays}}` (KFS at mid-band, reducing balance; money to 2 dp).
  - split `{mode:'MONTHLY_FEE', band, monthlyFeeRate, principal, plans:[{months, monthlyPayment,
    monthlyFee, planTotal, totalFees, aprEquivalent, fits}] for 3/6/12, selectedMonths, disclosure}` —
    `monthlyFee = principal × rate` (constant), `monthlyPayment = principal/n + fee`, `planTotal =
    principal + fee × n`, `aprEquivalent` = 12 × monthly IRR (decimal, 4 dp); `fits` = that plan's
    instalment fits both affordability budgets (grey out plans with `fits:false`).
  - salary_advance `{mode:'FLAT_FEE', fee, note:'Flat fee, no interest — within the CBUAE retail fee schedule'}`.
- `token.conditions`: personal_loan `['Key Facts Statement acknowledged (AR + EN)', 'Salary transfer
  assignment or direct debit mandate', 'Credit life & job-loss cover offered (optional)']` (+ `'Remittance-linked
  repayment schedule'` on the Credit Passport path); split `['Key Facts Statement acknowledged (AR + EN)',
  'Direct debit mandate on connected account']`; salary_advance `['Key Facts Statement acknowledged (AR + EN)',
  'Repayable in full from the next salary credit']`. Override approvals append `'Approved by override — <analyst> / <approver>'`.
  Validity: split 7 days, personal_loan 14, salary_advance 7.

**`decideRaw(productId, row)`** → `{outcome, reasonCodes, grade, approved, bindingConstraint, dbrPct}`
(last four new). **`simulateBook(productId, params)`**: split → `sampleBook.split` (120);
personal_loan and salary_advance → `sampleBook.personal_loan` (140). Return shape unchanged.

**`drawdownCheck(decisionId, amount, flags)`** — split decisions only (other products throw), outcome
APPROVE. `flags = {arrears?, deterioration?, months?: 3|6|12 (default 6)}`. Returns
`{allowed, amount, remainingAfter, reasonCodes, plan:{months, requestedMonths, adjusted, monthlyPayment,
monthlyFee, planTotal, aprEquivalent}}`. Remaining = `limit.capacity − limit.approved − earlier allowed
splits`. Blocking codes: `RC_DRAWDOWN_ARREARS`, `RC_MANUAL_REVIEW` (deterioration), `RC_DRAWDOWN_LIMIT`
(over remaining capacity), `RC_FREE_CASH_FLOW` (no plan keeps total running instalments within the
decision's budgets). If the requested term is unaffordable but a longer one fits, it is allowed with
`plan.adjusted: true`. c1: capacity 31,500, first plan 12,000 → 19,500 available.

**`override`** — unchanged contract (REFER only, 4-eyes). A DECLINE override also nulls `pricing` and
zeroes `limit.capacity`.

**`referQueue()`** → `[{id, name, segment:'CONSUMER', productId, reason, reasonCodes? (live only),
createdAt? (live only), waitingHours, slaHoursLeft, seeded}]`; SLA hours: split 4, personal_loan 8,
salary_advance 4 (seeded queue includes one breached split SLA, `slaHoursLeft < 0`).

**`metrics()`**:

```js
{ window:'90d',
  totals:{decisions, APPROVE, REFER, DECLINE}, stpPct,
  byProduct:{ split:{decisions, APPROVE, REFER, DECLINE, stpPct},          // seeded ≈2,620 · 70/12/18 · STP 86.1
              personal_loan:{…same},                                      // seeded ≈1,090 · 60/18/22 · STP 77.4
              salary_advance:{…same} },                                   // session decisions only (seeded 0)
  stpTargets:{ split:85, personal_loan:80 },                              // UI target lines
  declineReasons:[{code, labelEn, count}],                                // sorted desc
  gradeDist:[{grade, count}] /* A..E */, daily:[{date, APPROVE, REFER, DECLINE}] /* 90, all products */,
  referAging:[{bucket:'<4h'|'4-24h'|'>24h', count}], overrideRatePct,
  vintages:[{mob:1..6, splitFpdPct, loanFpdPct}],
  earlyWarning:[5 × MizanData.earlyWarning entries] }
```

**Reason codes** (all `{en, ar}`): RC_SCORE_LOW, RC_DELINQUENCY, RC_DBR_EXCEEDED, RC_THIN_FILE,
RC_INCOME_UNVERIFIED, RC_SALARY_FLOOR, RC_AGE, RC_TENOR_CAP, RC_CHEQUE_RETURNS, RC_LIMIT_REDUCED,
RC_RETIREE_CAP, RC_MANUAL_REVIEW, RC_DRAWDOWN_ARREARS, RC_DRAWDOWN_LIMIT, RC_TOKEN_EXPIRED,
RC_CROSS_BORDER, RC_FREE_CASH_FLOW, RC_INCOME_VOLATILITY, RC_CASH_FLOW_UNDERWRITTEN,
RC_PURCHASE_UNVERIFIED, RC_CONNECTED_HISTORY, **RC_PLAN_ADJUSTED** (added: split plan lengthened to
stay affordable). Removed: RC_SECTOR_EXCLUDED, RC_LICENSE_AGE, RC_OWNER_SCORE, RC_VOLATILITY.

**Outcomes at default policy** (what the UI journeys will show):

| persona | product | outcome | grade | approved | binding | reason codes |
|---|---|---|---|---|---|---|
| r1 | personal_loan | APPROVE | A (807) | 150,000 | REQUESTED | — |
| r2 | personal_loan | REFER | — | (60,000 provisional) | REQUESTED | RC_THIN_FILE |
| r2 + creditPassport | personal_loan | APPROVE | B (751, capped) | 30,000 | CROSS_BORDER_HAIRCUT | RC_CROSS_BORDER, RC_LIMIT_REDUCED |
| r3 | personal_loan | APPROVE | B (680) | 56,000 | DBR_HEADROOM | RC_LIMIT_REDUCED |
| r4 | personal_loan | DECLINE | E (538) | 0 | (DBR_HEADROOM) | RC_DELINQUENCY, RC_SCORE_LOW |
| r5 | personal_loan | APPROVE | A (756) | 143,000 | RETIREE_CAP | RC_RETIREE_CAP, RC_LIMIT_REDUCED |
| c1 | split | APPROVE | A (806) | 12,000 · Pay in 6 · capacity 31,500 | REQUESTED | — |
| c2 | split | REFER | B (707) | (8,500 provisional · capacity 13,000) | REQUESTED | RC_INCOME_VOLATILITY |
| c3 | split | DECLINE | B (683) | 0 (FCF −2,300) | (SPLIT_CAPACITY) | RC_FREE_CASH_FLOW |
| c4 | split | APPROVE | C (675, proxy 640) | 4,800 · Pay in 6 · capacity 7,000 | REQUESTED | RC_CASH_FLOW_UNDERWRITTEN |
| c5 | split | DECLINE | D (563) | 0 | (REQUESTED) | RC_DELINQUENCY, RC_SCORE_LOW, RC_CHEQUE_RETURNS |

Bindings in parentheses are what the record carries on DECLINE/REFER — informational only (the
engine still computes the trace); show them only for APPROVE.

c1 plans (principal 12,000, 1.25%/mo): Pay in 3 — 4,150/mo, fee 150, total 12,450, APR 22.36% ·
Pay in 6 — 2,150/mo, fee 150, total 12,900, APR 25.28% · Pay in 12 — 1,150/mo, fee 150, total 13,800,
APR 26.62%. Note: with a flat fee on the original principal the APR equivalent **rises** as the plan
lengthens for the same monthly fee rate (selftest group 6 asserts this direction; for the same *total*
fee the shorter plan has the higher APR).

---

## Addendum v2.1 — Starter loan → upgrade case (binding for this change)

**The story.** A thin-file customer was approved earlier for a small **starter loan: AED 1,000 · 1 month ·
50% APR** (partner income AED 41.67) and repaid it on time. Noor now re-decides with richer data —
**connected UAE accounts (Open Finance)** plus **international bank account statements** (home-country
history) — and offers an **upgrade the customer shapes themselves**: amount **up to AED 3,000**, tenor
**up to 6 months**, APR **as low as 35%**. All three levers are combined in one offer; the customer picks
amount and tenor. **The longer the tenor, the lower the APR — and the lending partner still earns more**,
because interest accrues over more months. This is the lifecycle idea ("decisions become a lifecycle, not
an event") made concrete: the starter loan's job was to create a repayment record and an AECB file.

### New product manifest `starter_loan`

Add as the THIRD manifest (order: split, personal_loan, starter_loan, salary_advance):
`{productId:'starter_loan', nameEn:'Starter loan', nameAr:'قرض البداية', segment:'CONSUMER',
structure:'Short amortising loan with an upgrade path', pricingMode:'TENOR_CURVE_APR'}`.
Regulatory (locked): dbrCapPct 50, dbrCapRetireePct 30, aecbCheckRequired true, coolingOffDays 5.
Params (editable, with bounds; validated on publish):
- `starter`: `{amount:1000, tenorMonths:1, apr:0.50}` (the entry offer; shown for reference)
- `tiers.enhanced` (UAE connected accounts + international statements): `{maxAmount:3000,
  maxTenorMonths:6, aprAtOneMonth:0.45, aprAtMaxTenor:0.35}`
- `tiers.base` (connected UAE accounts only): `{maxAmount:1500, maxTenorMonths:3, aprAtOneMonth:0.48,
  aprAtMaxTenor:0.42}`
- `minAmount:500`, `amountStep:100`, `instalmentToFcfMaxPct:50`, `minIncomeHistoryMonthsEnhanced:12`,
  `minOnTimeStarterRepayments:1`, `tokenValidityDays:7`.
**APR curve:** linear in tenor, `apr(t) = aprAtOneMonth − (aprAtOneMonth − aprAtMaxTenor) × (t−1)/(maxTenor−1)`
(enhanced default → 45, 43, 41, 39, 37, 35 %). Monthly payment is standard amortising:
`P = A·r / (1 − (1+r)^−n)`, `r = apr/12` (n=1 → `A·(1+r)`). **Partner income = total interest =
P·n − A** (it is also the customer's total cost of credit — label it as both).
**Publish-time invariants (throw `Mizan: …` with a plain message, surfaced inline in the console):**
(1) `aprAtMaxTenor ≤ aprAtOneMonth` for each tier ("longer tenor must not cost more");
(2) **partner-income guarantee** — partner income must be strictly increasing in tenor for every tier
(check at A = 1; interest is proportional to principal, so it then holds for every amount); message e.g.
"pricing curve breaks the partner-income guarantee — the 6-month option would earn less than the 5-month
option"; (3) enhanced tier must be at least as generous as base (maxAmount, maxTenor ≥; aprAtMaxTenor ≤).
At aprAtMaxTenor 0.10 the guarantee must fail (selftest asserts this).

### Personas `MizanData.personasUpgrade` (u1, u2)

```js
{ id:'u1', name:'Ana Reyes', nameAr:'آنا رييس', tagline:'Nurse, 5 months in the UAE — repaid her starter loan on time',
  age:29, residency:'NEW_RESIDENT', monthsInUae:5,
  employment:{ employer:'Private hospital, Dubai', type:'PRIVATE', retiree:false },
  priorLoan:{ ref:'MZN-S-0412', productId:'starter_loan', amount:1000, tenorMonths:1, apr:0.50,
    disbursedAt:'2026-06-01', dueAt:'2026-07-01', repaidAt:'2026-07-01', dpd:0, partnerIncome:41.67 },
  aecb:{ hit:true, score:null, tradelines:1, worstDelinquency:'NONE', chequeReturns12m:0,
    obligationsMonthly:0, note:'File created by the starter loan — 1 tradeline, paid on time, no score yet' },
  connected:{ source:'ALTAREQ_TPP', banks:['ENBD'], monthsAvailable:5, avgMonthlyIncome:9500,
    avgMonthlySpend:5600, incomeVolatilityPct:4, monthlyIncome:[...12, null for unavailable], monthlySpend:[...] },
  international:{ country:'Philippines', bank:'BDO Unibank', source:'Statements (24 months, parsed)',
    monthsAvailable:24, avgMonthlyIncomeAed:6800, incomeVolatilityPct:6, avgBalanceAed:4200,
    overdrafts12m:0, obligationsMonthlyAed:350 /* home-country personal loan, paid on time */ } }
```
u2 **Bilal Ahmed** — similar profile (driver, 7 months in UAE, income 6,500, spend 4,300; Pakistan, HBL,
18 months statements) but his starter loan was **repaid 14 days late (dpd 14)** → **no upgrade**.

### Upgrade evaluation (route `decide({productId:'starter_loan', …})` to a new evaluator)

Consents: `aecb` (required, throw), `openFinance` (required, throw), `internationalStatements` (optional —
decides the tier). Data pulls: PRIOR_DECISION (the starter loan + repayment), AECB_CONSUMER (1 tradeline,
on time), OPEN_FINANCE (UAE accounts), INTERNATIONAL_STATEMENTS (only when consented).
Features: verifiedIncome (UAE), incomeHistoryMonths (UAE + international when consented → 29 for u1),
homeCountryObligations (only visible WITH statements → 350), freeCashFlowMonthly = income − spend −
AECB obligations − homeCountryObligations (u1 enhanced: 9,500 − 5,600 − 350 = 3,550), maxInstalment =
instalmentToFcfMaxPct% × fcf (1,775), dbr per option.
Rules (record all): REG_AECB_CHECK, REG_DBR_CAP (per selected option), POL_STARTER_REPAID_ON_TIME
(dpd 0, else DECLINE RC_STARTER_LATE), POL_CONNECTED_ACCOUNTS, POL_INCOME_HISTORY (enhanced needs ≥
minIncomeHistoryMonthsEnhanced), POL_FREE_CASH_FLOW, POL_INTERNATIONAL_STATEMENTS (INFO/PASS — sets tier).
Outcome: APPROVE with `tier:'ENHANCED'|'BASE'` (reason RC_UPGRADE_ENHANCED or RC_UPGRADE_BASE);
DECLINE for u2 (RC_STARTER_LATE: "Previous loan was repaid late — starter terms continue; upgrade
can be reviewed after 3 on-time months").
DecisionRecord additions: `kind:'UPGRADE'`, `priorLoan` (copy), `tier`, `upgrade:{ maxAmount,
maxTenorMonths, curve:[{months, apr}], starterPartnerIncome:41.67, counterfactual:{ tier, maxAmount,
maxTenorMonths, aprAtMaxTenor } /* the other tier, so the UI can say what the statements were worth */ },
`selection:null`, pricing `{mode:'TENOR_CURVE_APR', curve, aprFloor}`, limit
`{requested, approved:maxAmount, bindingConstraint:'TIER_CAP', capacity:maxAmount, ...}`.
Default selection = the longest tenor that fits at maxAmount.

### New engine API (additive)

- `quoteUpgrade(decisionId, amount)` → `{ amount, options:[{ months, apr, monthlyPayment, totalRepayable,
  totalInterest, partnerIncome, partnerIncomeVsStarterX, fits, reason /* when !fits */, dbrPct }] }` for
  t = 1..maxTenor. Amount clamped/validated to [minAmount, maxAmount] in amountStep. 2-dp money.
  For u1 at 3,000: 1 month does NOT fit (3,112.50 > 1,775); 2–6 fit.
- `selectUpgradeOption(decisionId, {amount, months})` → stores `selection {amount, months, apr,
  monthlyPayment, totalInterest, partnerIncome}` and refreshes token conditions; throws if the option
  does not fit, if outside the offer, or if OFFER_ACCEPTED was already recorded. Audit-logged.
- `execSteps('starter_loan')` → the same 5 conventional steps; `recordEvent` works on upgrade records
  (OFFER_ACCEPTED requires a selection → else throw "choose an option before accepting").
- `simulateBook('starter_loan', params)`: add a seeded sample book `sampleBook.starter_loan` (~80 starter
  customers: dpd, connected months, statements yes/no, income, spend, home obligations) and return, in
  addition to the usual outcome counts/flips, `pricingImpact:{ avgAprBefore, avgAprAfter,
  partnerIncomeBefore, partnerIncomeAfter }` (sum over approved rows at their default option) so a
  pricing-only change shows its economic effect.
- metrics(): `byProduct.starter_loan` (seed a modest history), no other shape change.
New reason codes (EN + MSA Arabic): RC_UPGRADE_ENHANCED ("Upgraded using your connected UAE accounts and
verified international bank statements"), RC_UPGRADE_BASE ("Upgraded using your connected UAE accounts —
add international statements for a larger limit and a lower rate"), RC_STARTER_LATE, RC_OPTION_UNAFFORDABLE
("This amount and term would take the instalment above what your cash flow supports").

### Selftest additions (keep all 324 existing checks green; update the manifests-count check to 4)

u1 all consents → APPROVE, tier ENHANCED, maxAmount 3000, maxTenor 6, apr(1)=0.45, apr(6)=0.35, APR
strictly decreasing, partnerIncome strictly increasing with tenor, partnerIncome(6m @3000) > 41.67,
1-month @3000 not fit, 2–6 fit, default selection 6 months. u1 without statements → tier BASE (1500 / 3
/ 0.42) and homeCountryObligations not visible. u1 without openFinance → throw. u2 → DECLINE
RC_STARTER_LATE. selectUpgradeOption: unaffordable → throw; valid → stored; after OFFER_ACCEPTED →
throw; OFFER_ACCEPTED without selection → throw. publishPolicy: aprAtMaxTenor > aprAtOneMonth → throw;
aprAtMaxTenor 0.10 → throw (partner-income guarantee); valid change → version bump. quoteUpgrade scales
linearly with amount. simulateBook('starter_loan', lower aprAtMaxTenor e.g. 0.33) returns pricingImpact
with avgAprAfter < avgAprBefore. Determinism; every new reason code has non-empty Arabic; banned-term
regex still clean.

### UI — new screen `data-screen="upgrade"` (8 screens; insert after `loan` in the nav)

Nav label **"Credit upgrade"**, sub "Starter loan → more for less". Screen head eyebrow
"Credit lifecycle — re-decision on new data", title "From starter loan to upgrade".
Left column: persona cards u1/u2; **prior-loan card** (Starter loan · AED 1,000 · 1 month · 50% APR ·
repaid on time 1 Jul 2026 · partner income AED 41.67; u2 shows "repaid 14 days late");
consents (AECB required; Connect UAE bank accounts required; **International bank statements —
optional**: "Add your home-country bank statements to unlock a bigger limit and a lower rate");
"Re-decide" button; animated orchestration timeline (prior decision, AECB file, UAE accounts,
international statements).
Right column after decision: outcome banner ("Upgrade approved" / "No upgrade yet"); a **Starter →
Upgrade comparison strip**: Amount AED 1,000 → up to AED 3,000 · Tenor 1 month → up to 6 months · APR
50% → from 35%; a **counterfactual callout** ("Without the international statements: up to AED 1,500 · 3
months · from 42% APR. The statements added 24 months of income history and surfaced a AED 350/mo
home-country loan."); **amount slider** (minAmount…maxAmount, step 100, default max) + live
**tenor option rows 1…maxTenor** (reuse the plan-row component and the --brand-fill selected style): each
row "6 months · 35% APR · AED 552.27/mo · total interest AED 313.62 · partner income ×7.5 vs starter",
unaffordable rows disabled with the reason; a **chart "Lower APR, more partner income"**: x = tenor
1…6; bars = partner income at the chosen amount (--s1), line = APR (--s2, right axis), dashed reference
line at the starter loan's AED 41.67 labelled "Starter loan"; selected tenor highlighted; unaffordable
tenors faded/hatched; legend + a data-table <details> fallback like the other charts. Then a **KFS
preview** for the selection (APR, monthly payment, number of payments, total repayable, total interest =
total cost of credit, 5-business-day cooling-off) with a one-line note: "A longer term lowers the APR and
the monthly payment but raises the total interest — the KFS shows both." Then **"Accept this option"**
(selectUpgradeOption) → token + the 5 execution steps (same component as the other journeys; selection
locks once OFFER_ACCEPTED). Arabic reasons in dir="rtl". u2 shows the decline reason and the starter
terms that continue.
Overview: add demo step 6 "Upgrade — Ana (u1): starter AED 1,000 → choose up to AED 3,000 · 6 months ·
from 35% APR; the longer term earns the partner more at a lower rate", and a topic-map row "Credit upgrade
→ re-decision on Open Finance + international statements; customer-chosen amount × tenor; APR falls with
tenor while partner income rises (enforced at publish)". Policy console: add starter_loan with its params
(tiers editable) and surface the publish invariants inline; simulate shows the pricingImpact numbers
(avg APR before→after, partner income before→after). Workbench/log/monitoring: product label "Starter
loan" appears naturally; log replay shows priorLoan, tier, selection.

### v2.1 as built

Built as specified (selftest 461 checks green, acceptance 225 green). Deviations and additions:

- **Instalment rounding.** Instalments are rounded *up* to the fils, so equal payments always repay
  the principal. This reproduces the addendum's figures (6 months @ AED 3,000 = AED 552.27/mo, total
  interest 313.62, ×7.5); exact is 552.2639. Totals follow from the rounded instalment
  (total = P × n). The partner-income guarantee is checked on exact, unrounded math.
- **Version strings unchanged** (`data-2.0` / `engine-2.0`), so the existing selftest assertions stay as
  written; everything in v2.1 is additive.
- **Extra API: `policyInvariants(productId, draft)`** (read-only). It returns the three invariant checks
  and each tier's curve (APR + interest per AED 1,000), and powers the console's live checklist.
  The same checks run inside `simulateBook` and `publishPolicy` validation, so a draft that breaks
  them can be neither simulated nor published. Partial nested drafts
  (`{tiers:{enhanced:{aprAtMaxTenor:0.33}}}`) are merged over the live pack. starter_loan history
  records leaf-level diffs (`tiers.enhanced.aprAtMaxTenor: 0.35 → 0.33`).
- **`decide()` for starter_loan:** `amount`/`tenorMonths` are optional. They default to the enhanced
  ceiling and are recorded only as the request, because the customer shapes the offer afterwards.
- **Offer ceiling** = min(tier maxAmount, largest amount whose max-tenor instalment fits the cash-flow
  budget, ditto for DBR), floored to `amountStep`. `bindingConstraint` is `TIER_CAP` unless
  affordability binds. If even `minAmount` doesn't fit, the result is DECLINE `RC_FREE_CASH_FLOW`.
  On DECLINE, `tier`, `upgrade`, `pricing` and `token` are null.
- **Rules.** `POL_INCOME_HISTORY` and `POL_INTERNATIONAL_STATEMENTS` record `INFO` (not PASS) when
  they only place the customer on the base tier. `POL_CONNECTED_ACCOUNTS` needs ≥ 3 connected
  months (else REFER `RC_CONNECTED_HISTORY`); this is a constant, since the addendum lists no param
  for it. `REG_DBR_CAP` is recorded at decision time for the default option. Each selection is
  re-checked and carries its own `dbrPct`; the decision-time rules are never mutated.
- **Options** carry `detail` (plain sentence) next to `reason`. An option that breaks DBR rather than
  the cash-flow budget uses `RC_DBR_EXCEEDED`. `selection` also stores `totalRepayable`, `dbrPct`
  and `selectedAt`. `upgrade` also exposes `defaultSelection`, `minAmount`, `amountStep`,
  `maxInstalment`, `dbr` and `aprFloor`. Quotes and selections read these frozen terms, so a later
  publish never changes an existing offer.
- **No scorecard grade on upgrades** (`starter_upgrade_v0`, basis `REPAYMENT_RECORD`). A one-tradeline
  file has no score yet; the tier carries the decision.
- **Token** is issued at decision time, like the other products. Selection replaces its "choose an
  option" condition with the chosen option. The UI shows it once the customer accepts an option and
  allows switching until `OFFER_ACCEPTED`.
- **Bounds chosen** (the addendum gave none): starter amount 500–5,000, tenor 1–6, APR 5–60%; tier
  maxAmount 500–20,000, maxTenor 2–12 (whole months), APRs 5–60%; minAmount 100–2,000; amountStep
  50–500; instalmentToFcfMaxPct 10–80; minIncomeHistoryMonthsEnhanced 3–36;
  minOnTimeStarterRepayments 1–6; tokenValidityDays 1–30; tier maxAmount ≥ minAmount.
- **Data.** `sampleBook.starter_loan` is 80 rows from a seeded stream: 58 approve / 5 refer /
  17 decline at the default pack. The seeded `metrics().byProduct.starter_loan` (~370 decisions,
  STP 96%) comes from its own seeded stream, so the split / personal-loan history is unchanged.
- **Chart.** The addendum asks for APR on a right-hand axis. Both axes start at zero, and the bars
  use the lower ~58% of the plot so the APR line runs above them rather than through the labels.
  A data table backs the chart.

### v2.3 as built

Built as REPAYMENT-SPEC.md specifies (selftest 678 checks green, acceptance 322 green, counted after v2.4).
Deviations and additions:

- **Platform rule wording.** The locked row on every pack reads "Repayment collection: Al Tareq ≤ AED 1,000 ·
  direct debit above · no salary transfer required". The spec's "· no salary transfer" was extended so that the
  only salary-transfer wording anywhere on screen is the allowed phrase. It is exposed as
  `getPolicy(pid).platform.repaymentCollection` (`{altareqMaxAmount, editable:false, rule}`), and
  publish/simulate refuse `repaymentCollection`, `altareqMaxAmount` and `repaymentRouting` as a platform rule.
- **`repaymentFor`** also returns `labelAr` (دفعة متكررة عبر منصة الطارق / تفويض بالخصم المباشر) and `amount`,
  and it throws on a non-positive amount.
- **Token conditions.** The method condition sits second, right after the KFS line, on every product, and there
  is exactly one. Salary advance carries KFS, the method line and "Repaid in one instalment on the next salary
  date — no salary transfer required", because the rule is shared. Upgrades swap the method line on every
  `selectUpgradeOption`. An approving override sets `repayment`, and a declining one nulls it. A blocked
  "split another purchase" returns `repayment: null`.
- **Sequence.** The `REPAYMENT_SET_UP` event stores `method` and `label`. Once recorded, the event's method
  wins in `execSteps(productId, decisionId)`, which throws for a decision of another product. Without a decision
  id the step is the generic "Repayment set up". Guards stay keyed on the expected step, so clearing cooling-off
  before repayment set-up gets the same "no disbursement until repayment collection is set up" text.
  The AGREEMENT_SIGNED guard now names repayment set-up.
- **UI.** On the upgrade, the repayment line sits under the amount slider and follows the amount live, plus a
  KFS tile. Elsewhere it sits under the outcome banner. The KFS "Repayment method" tile spans the grid row.
  The prior-loan card shows the AED 1,000 starter "Collected via Al Tareq recurring payment".
- **Banned terms.** The scan also forbids `salary transfer assignment` and `transfer (your|their) salary to`.
  The selftest and acceptance additionally fail any "salary transfer" / "salary-transfer" outside "no salary
  transfer required", so an old engine comment was reworded.
- Version strings remain `data-2.0` / `engine-2.0`; every change is additive.

### v2.4 as built

Built as STATEMENTS-SPEC.md specifies. Deviations and the choices the spec left open:

- **Enhanced tier on a 6-month window.** v2.1 credited 24 months of statement history (Anita: 5 UAE + 24 =
  29 ≥ 12). A 6-month window would give 11 and drop her to BASE. Verified statements therefore credit the
  account's history: months since it opened, from the statement header, **capped at 24**, and only when
  integrity, name match and 6/6 months pass. Anita's SBI account has been open since Aug 2014, giving 24
  credited months and 29 in total. Every v2.1 number holds: FCF 3,550, budget 1,775, 3,000 / 6 / 35%,
  AED 552.27/mo. The cap is a constant (`STATEMENT_EVIDENCE.historyCreditMaxMonths`), not a param.
- **Personal loan on statements.** AECB no-hit with usable statements gets a proxy base of 640 (grade capped at
  B) plus overlays: account ≥ 5 years +20, clean conduct +20, buffer ≥ ½ month of income +10, remittances
  ≥ 85% consistent +15, alongside the existing +15 for salary verified via connected account. The newcomer
  haircut is 50% − 10 (conduct) − 5 (buffer) − 10 (corroboration), floor 25%. New binding constraint
  `STATEMENTS_HAIRCUT` and positive reason `RC_STATEMENTS_USED` (EN + MSA). Priya scores 720 (B), and
  60,000 × 75% = **AED 45,000** against 30,000 on Credit Passport, at DBR 14.7% including the AED 450 EMI.
  Usable statements' EMIs count in DBR for every applicant. With Credit Passport as well, the larger of the two
  obligations is counted, not the sum.
- **Parser.** It is deterministic over seeded monthly rows in local currency (`homeStatements` on r2, u1 and
  u2). Fixed FX table: INR 0.044, PKR 0.0132, EGP 0.0757 AED. Remittance consistency = mean over UAE salary
  months of ½ × timing (0–3 days after payday 1, 4–7 days ½) + ½ × amount stability (1 − |x − median| /
  median). That gives Priya 92%, Anita 95% (5 of 5 UAE months; January predates her move) and Bilal 90%.
  `parsed` adds `key`/`status` per finding, `complete`, `missingMonths`, `emis`, `evidence` flags,
  `accountTenureMonths`, `usable` and `reasonCode`. Effects are product-aware when `productId` is passed.
  An unknown file is an integrity FAIL with nothing else read; the genuine file under the wrong country also
  FAILs. `parseStatements` takes an optional `months` (1–6) to exercise the incomplete path.
- **Incomplete upload** keeps `AWAITING_DOCUMENTS` (the customer is asked again; `RC_STATEMENTS_INCOMPLETE` goes
  to the audit and the parse) rather than moving to `DOCUMENTS_RECEIVED`. An integrity or name failure *is*
  received, and its re-decision refers to fraud review.
- **requestDocuments** applies to personal loans and upgrades only (the evaluators that read statements). It
  requires 6 months, an analyst name and a supported corridor, and stores `documentRequest` with the customer
  message in EN + AR. The SLA is frozen (`slaPaused`, `slaHoursLeft`) and resumes on upload. Queue rows gain
  `status`, `slaPaused`, `documentRequest` and `supersedes`. Cases awaiting or holding documents stay in the
  queue, including an approval below the requested amount.
- **Supersede.** `decide()` takes `statements` plus an additive `supersedes`: the customer-initiated
  re-decision, which the upgrade's BASE → ENHANCED uses. It is refused across products or applicants, after
  any execution event, after an override, when already superseded, or without statements. Superseded records
  refuse `selectUpgradeOption`, `recordEvent` and `override`. Records add `homeStatements`,
  `evidenceComparison` (NO_DATA / CREDIT_PASSPORT where the customer has one / HOME_STATEMENTS, computed as
  pure evaluations), `supersedes`, `supersededBy`, `redecision {supersedes, trigger, original,
  documentRequest}`, `documentRequest` and `documents`. New statuses: `AWAITING_DOCUMENTS`,
  `DOCUMENTS_RECEIVED`, `SUPERSEDED`.
- **v2.1 renames.** `INTERNATIONAL_STATEMENTS` → `HOME_STATEMENTS` (data pull), `POL_INTERNATIONAL_STATEMENTS` →
  `POL_HOME_STATEMENTS` (rule), consent `internationalStatements` → `homeStatements` (with `source`), feature
  `internationalMonths` → `homeHistoryMonths`. Persona `international` blocks are removed. The old consent flag
  still works as an alias: Mizan parses the customer's seeded statements as if they were uploaded.
  RC_UPGRADE_ENHANCED / RC_UPGRADE_BASE now say "home-country bank statements".
- **Youssef Hassan** is a summary queue row from `MizanData.seededDocumentCases`. It uses no PRNG draws, so
  every other seeded figure is unchanged, and it counts in refer aging.
- **UI.** The parse panel's Skip control stays in place, disabled once there is nothing left to skip (always,
  under reduced motion). "Philippines — not supported yet" is offered so the corridor refusal can be shown
  inline. The Workbench stepper keeps the upload and re-decide buttons live, so out-of-order clicks get the
  engine's refusal inline, as the execution steps do. The overview demo strip has 7 steps (4 + 3). The queue
  scrolls sideways at phone width. The v2.1 section above still names Ana Reyes; it is historic spec text,
  while code and UI use Anita Thomas.

### v2.5 as built

Built as LENDER-VIEW-SPEC.md specifies (selftest 948 checks green at v2.5, acceptance 365 green). Deviations and
choices the spec left open:

- **Vocabulary check.** The spec's own memo key `sharing` matched the banned pattern `shari`. The selftest and
  acceptance now use `shari(?!ng)`, and the selftest asserts that the narrowed pattern still catches Shari'ah, Sharia
  and shariah.
- **Memo shape (additive).** `borrower.nameAr`; `decision.status` and `decision.route` (`STRAIGHT_THROUGH` /
  `ANALYST_REVIEW` after a 4-eyes override); `bureau.homeCountryFile` (a Credit Passport flag); and extra term
  fields (`repaymentMethodLabel`, `aprBand`, `totalInterest`, `fees`, `earlySettlementFeeCap`, `totalFees`,
  `flatFee`). An upgrade without a chosen option carries `offerUpTo` / `aprFrom` / `customerChoicePending`.
  `terms` is null on REFER and DECLINE. `createdAt` is the decision time. The memo is pure (no clock tick, no audit
  entry) and follows the record's status.
- **NoorScore.** `noorScoreBand()` and the record field `noorScore {value, band}` are new. Factor directions come
  from an allowlist keyed by factor name: a factor not on the list never leaves Noor, proxy-base rows are skipped,
  and no direction contains a number ("Returned cheques in the past year"). Upgrades have no scorecard, so the
  value is null and the factors describe the repayment record.
- **Placeholders.** The masked Emirates ID is a deterministic placeholder, because personas carry no Emirates ID.
  Consent references read `CNS-<seq>-<TYPE>`. The API endpoint and SFTP path shown in the UI are illustrative.
- **Withheld wording.** The group is worded "Line-by-line account history and merchant names", so the memo never
  contains the word "transactions", which the spec's own privacy scan forbids.
- **Free cash flow on personal loans.** Personal-loan records add `freeCashFlowMonthly` and `instalmentToFcfPct`,
  informational only, when connected accounts show spending and Open Finance is consented. No rule reads them.
  Without them the memo says "Not assessed for this product". *(v2.8: no longer informational — the
  `POL_INSTALMENT_TO_FCF` rule and the `FCF` limit candidate read them; see "As built — v2.8".)*
- **Bands.** DBR 50% falls in "35–50%". Instalment share bands: < 25%, 25–50%, > 50%.
- **Privacy scan.** Every leaf of the memo and every SFTP cell is scanned. Band fields are instead asserted equal
  to an independently computed band, because a band boundary can equal a raw monthly value (c3's 15,000 element
  vs "AED 15,000–20,000"). Numbers under 100 are ignored (dates, percentages). The scan was mutation-tested: an
  injected income, bank label, merchant and spend each fail it.
- **`shareWithLender`.** Recorded on every `decide()`; `decide()` accepts an optional `lenderId`, and an unknown
  lender throws.
- **`MizanData.lenders`** was added here (v2.6 defines it), because the memo names the lender.
- **UI.**
  - Delivery tabs sit in a "Delivery" panel below "Shared vs withheld", in the spec's order. The UI tab describes
    the portal channel; the SFTP tab also shows the row column by column.
  - Copy falls back to select-and-copy when clipboard access is denied.
  - Lender view auto-selects the newest memo.
  - The log list's Grade column became NoorScore ("806 · A").
  - The overview demo strip has 8 steps.

### v2.6 as built

Built as JOURNEY-SPEC.md specifies, revised by the orchestrator's update from the team's Figma frames (selftest
990 green, acceptance 457 green, 10 screens). Deviations:

- **Host app.**
  - A dark "botim money" concept replaces the generic chat list: header with avatar and card icon; Pay / Credit /
    Invest / Insights pills; a Connected accounts strip with "Add another +"; blue Send / Request / Add funds /
    Withdraw buttons; an "Insights for you" card; To do, transactions, the ask bar and the bottom nav. Insights is
    a light version (total, "Fin health" chip, "Enough ~3 months", spending mix).
  - The wordmark is plain text; there is no Botim artwork or asset, and Botim's blue is used inside the phone frame
    only. The tag reads "Concept — illustrative host app".
- **Flow (two entries).**
  - Steps keep the spec's numbers 0–16, so 7–16 match it exactly. Entry 1 (0–6) starts at Connected accounts →
    Add another + and runs hand-off → account → code → Al Tareq consent → bank approval outside the web-view →
    **6, back in botim with the new ENBD/FAB tiles**.
  - Entry 2 starts at step 7: Credit → "How much can you borrow?" → Noor reads the accounts → budget summary →
    pre-qualified, as sub-screens of step 7. The spec's "Back in Noor" budget screen moved there.
  - Applying before connecting opens the web-view with "First, connect your bank accounts".
  - Finishing returns to the Credit tab with "Loan funded · managed in Noor", with no amount.
- **What botim receives.** Journey status, plus display tiles: bank, masked number and balance, and the Insights
  mix. The Al Tareq consent states this ("Where you'll see it: in Noor — and as account tiles and insights in botim
  money"). Credit data, the decision and the memo never reach botim. *(Superseded in v2.8: botim receives events
  only; the tiles and insights are Noor embeds, and the consent reads "in Noor — including Noor views inside botim".)*
- **Pre-qualification range — capped by free cash flow (supersedes the spec's DBR-only formula).**
  - The spec's formula (DBR headroom only) gave j1 AED 44,000–110,000: a AED 5,100/month instalment for a customer
    whose spending leaves AED 3,700/month. Within the CBUAE cap, but not what his budget can carry, and the wrong
    thing to show a customer.
  - `prequalify()` now takes the stricter of two budgets: the DBR headroom and 50% of free cash flow (income −
    spending − repayments already going out; the same 50% the split and starter packs use). For j1 that is
    AED 1,850/month, so the range is **AED 10,000–40,000** (24 months at 9.99%); min = 25% of max so his
    AED 15,000 sits inside it. Without spending data it falls back to the DBR headroom.
  - `maxByTermMonths` caps each term: 6 → AED 10,000 · 12 → AED 21,000 · 24 → AED 40,000. The journey's slider
    follows the selected term, and each term row shows its cap.
  - Tests assert the 12-month cap is ≤ the engine's DBR maximum (pre-qualification never promises more than
    decide() allows), and that the approved AED 15,000 is inside the range.
  - The reduced-offer screen (RC_LIMIT_REDUCED) is no longer reachable through the slider; acceptance drives it by
    bypassing the UI, which tests the engine as the safety net.
  - Still open: `decide()` for the personal loan keeps free cash flow informational (the DBR cap is the only
    affordability rule). Promoting it to a policy rule is a policy-pack change, not made here. *(Closed in v2.8:
    `instalmentToFcfMaxPct` on the personal-loan pack and rule `POL_INSTALMENT_TO_FCF`.)*
  - The slider runs from AED 1,000. The personal loan has no product minimum, so AED 1,000 decides and routes to
    Al Tareq without clamping.
- **Engine additions.** `prequalify()` also returns `indicativePricing` (the estimated band B) and `assumptions`.
  `loanInstalment()` is a pure helper. j1 has both `bankData` and a `connected` block (accounts with masks and
  balances, `observedObligationsMonthly` 900); with 30 months' tenure he scores NoorScore 737 (grade B).
- **Sequencing.**
  - "Accept offer" leads to Partner Bank's confirmation; OFFER_ACCEPTED and KFS_ACKNOWLEDGED are recorded at the
    KFS, as specified.
  - DISBURSED is recorded on arriving at step 16.
  - The instalment date is the day after the salary credit (the 28th).
  - Re-applying from step 8 creates a new decision; the earlier one stays in the log.
- **Bank approval.** One simulated screen lists both banks; the panel notes that in production each bank approves
  its own accounts.
- **Copy and tests.**
  - "No salary transfer needed." is allowed alongside "no salary transfer required" in the acceptance scrub.
  - The phone scales to the viewport height on desktop (floor 0.74) and fills the width at ≤ 900px.
  - The overview gains a topic-map row; its demo strip stays at 8 steps.
- **Optional teaser built.** A read-only botim AI chat ("You made 3 large purchases on your Botim Card recently…"),
  opened from the ask bar and labelled "Next: split in chat (needs a 1-month 'repay next month' plan — not in the
  engine yet)". It calls no engine function and shows no prices; split plans stay 3 / 6 / 12.

### As built — v2.7

Built as CAR-LOAN-SPEC.md specifies (selftest 1123 green, of which the 997 earlier checks; acceptance 532 green,
11 screens). Every number in the spec's table reproduces exactly from the engine — no rounding-cent differences:
documents only AED 150,000 · 2,795.77 × 60 · 167,746.25 · DBR 49.99% · NoorScore 780 A · down payment 75,000;
Open Finance AED 180,000 · 3,354.93 × 60 · 201,295.50 · DBR 44.55% (51.23% on salary alone) · NoorScore 795 A ·
down payment 45,000 · 20.6% of FCF 16,300; uplift +AED 30,000; 36 months: 94,000 → 180,000. Decisions and
deviations:

- **Engine (additive).**
  - `car_loan` is appended fifth to `MANIFESTS`, so the four existing products keep their positions. The selftest's
    manifest-order and pricing-mode checks were extended to five products (as v2.1 did for four); the acceptance
    script's screen list, "10 screens" and "8 demo steps" checks were updated to 11 and 9.
  - `evaluateCar` reuses `normalizeLoan` + `loanScore`; hard ceilings live in `HARD_CAR` (LTV 80%, 60 months).
    Besides the spec's rules it records `POL_INCOME_VERIFIED` and `POL_SCORE_REFER`, as the personal loan does.
  - **Binding on a tie.** When the request equals the 80% LTV maximum, `pickMin` would record `REQUESTED`; the car
    loan records `LTV_CAP` instead, because the slider's maximum is the LTV cap. RC_LTV_CAP is emitted whenever the
    request exceeds the LTV maximum; RC_LIMIT_REDUCED only when something other than the LTV cap reduced it.
  - Every limit candidate is floored to AED 1,000 (the request too, per the spec); trace rows carry their `key` so
    the UI marks the binding row by key.
  - **Open Finance works both ways.** With consent, obligations are the larger of AECB and what the accounts show
    leaving every month (Karim: 19,700 = 19,700, "reconciled"). Free cash flow and POL_INSTALMENT_TO_FCF apply only
    when spending is seen.
  - Regular income counts only on the Open Finance path, with ≥ `regularIncomeMinMonths` of history and every
    receipt on schedule, matching the tenancy, at the expected count (MONTHLY 12, QUARTERLY 4); v2.7's regular
    income is rental.
  - `record.openFinanceUplift` is built by a pure re-evaluation with `openFinance:false` (no record, no clock tick);
    besides the spec's fields it carries `explanation` (the "51.23% … 44.55%" line), `salaryOnlyDbrPct` and the LTV
    figures. `record.openFinanceFindings` (internal) holds what the accounts showed; `record.request.vehicle` holds
    the quote. Neither reaches the memo.
  - New pure API `quoteCar(application)`: the same evaluation and uplift with no record and no tick, consent-bound
    (AECB required; the Open Finance path only with Open Finance consent). The screen's tenor rows use it.
  - Token conditions add insurance and the RTA mortgage (naming the lender of record) and the record's down payment;
    an override approval gets them too.
  - PARAM_BOUNDS: `regularIncomeMinMonths` [12, 24] (unspecified — 12 months is the evidence the policy rests on);
    the personal-loan-like bounds otherwise.
  - Monitoring: `car_loan` is in every product iteration with **no seeded history** — a new pack counts this
    session's decisions only, so the seeded numbers of the other products are unchanged.
  - Sample book: 17 hand-written rows (8 approve · 3 refer · 6 decline), each exercising one rule.
    `regularIncomeCountedPct` 0 shrinks CL-001 and flips CL-002 to a decline; `simulateBook('car_loan')` also returns
    `amountImpact` (approved amount before/after), since most car-loan policy changes move amounts, not outcomes.
- **Persona.** a1's `connected.incomeVolatilityPct` is 0: the salary is identical every month and the rent is
  scheduled. The raw monthly series (45,000 / 72,000) has a stdev/mean of 23.6%; the car evaluation does not read
  volatility.
- **Credit memo.** Car memos add `terms.vehicle` (dealer-quote figures), `verification.otherIncome` and
  `verification.downPaymentSource`, one shared line and one withheld group; other products' memos are unchanged.
  Documents-path flags (not specified): "Declared other income not counted — not verifiable in an instant decision"
  and "Own funds — declared, not verified". The privacy scan matches whole numbers, so AED 180,000 never trips
  18,000.
- **UI.**
  - New "Car loan" screen after Personal loan. Tenor rows show each path's amount live from `quoteCar`; nothing is
    recorded until Decide.
  - The binding trace sits in the decision panel. The rules (REGULATORY / POLICY) and the NoorScore breakdown moved to
    a full-width "How Mizan decided" panel below the two columns, so the columns stay balanced. KFS and execution
    follow.
  - The uplift bars are CSS only, scaled to the vehicle price with the LTV line at 80%.
  - The Decision log and the Workbench case file show the v2.4 evidence strip for car decisions, plus the findings.
  - Monitoring gains a "Decisions by product" table.
  - The policy console shows `…Pct` regulatory values with a `%` on every pack.
  - The overview demo step is Step 9 (appended), so existing steps keep their numbers.
  - The Noor skin `<style>` block is byte-identical; all CSS sits under "Noor additions".

### As built — v2.8

Built as BOTIM-V28-SPEC.md specifies (selftest 1217 green, of which the 1123 earlier checks; acceptance 634 green, 11
screens). Every existing persona outcome and number holds except the one the spec changes: Ravi's 110,000 / 6 months is
now reduced to **AED 10,000** (FCF binds; the DBR headroom alone allowed AED 29,000). Decisions and deviations:

- **Engine (additive).**
  - Personal loan: `instalmentToFcfMaxPct: 50` (bounds [10, 80]) and rule `POL_INSTALMENT_TO_FCF`. It runs only when
    connected accounts show spending and Open Finance is consented. The `FCF` limit candidate (PV of 50% × FCF at the
    mid-band rate over the effective tenor, floored to 1,000) sits right after the DBR headroom, so a tie keeps the
    earlier key. `features.freeCashFlowMonthly` is no longer informational. The rule FAILs (→ DECLINE,
    `RC_FREE_CASH_FLOW`) only when no amount fits. Ravi: 6 → 10,000 · 12 → 21,000 · 24 → 40,000 at 8.99%, equal to the
    `prequalify()` caps at 9.99%. 15,000 / 12 is unchanged (APPROVE, 737, AED 1,311.70; the rule passes at 35.5%).
    r1–r5 and the sample books have no spending data, so the rule never runs for them. Only cross-product runs of
    personas that carry spending change (the split persona c3 run through the personal loan now declines on free cash
    flow); no screen or test makes those runs.
  - `assessFootprint(fp, opts)` is pure and exported. `opts` (`aecb` or `aecbFile`, `mode`, `cap`) is an addition:
    without the AECB context, eligibility stays `null` and `eligibleWhen` is stated. MEDIUM means 2 or 3 of the 4
    identity signals. `reasonCodes` lists RC_FOOTPRINT_IDENTITY (HIGH), RC_STEP_UP_AUTH (ELEVATED) and
    RC_FOOTPRINT_OVERLAY (applied). The three codes are in the data with Arabic.
  - `decide()` handles the footprint only when three things hold: `consents.digitalFootprint === true`, the applicant
    has a footprint, and the pack carries `footprintOverlayMode` (split, starter_loan, personal_loan).
    - The DIGITAL_FOOTPRINT pull, the three features and `POL_IDENTITY_FOOTPRINT` are added after the evaluation. The
      rule is PASS on HIGH and INFO otherwise, so it is never a decline reason.
    - RC_FOOTPRINT_IDENTITY is not added to the decision's reasons, because those explain outcomes.
    - ELEVATED adds the step-up token condition and RC_STEP_UP_AUTH.
    - On a thin or no-hit file, `score.footprintOverlay` records `{delta, applied, mode}` outside `score.overlays`. In
      LIVE the evaluation re-runs with the overlay in the scorecard (personal loan, split). The upgrade has no scorecard,
      so there it is recorded as not applied.
    - The selftest drives c4 with a test-only footprint: SHADOW leaves grade C unchanged; LIVE adds +10 → grade B and a
      lower fee rate.
    - `footprintReference` and the footprint screen are untouched.
  - `consents.communications = {service, marketing}` over EMAIL / SMS / WHATSAPP / PUSH is validated before anything
    is recorded: at least one service channel, and unknown channels are refused. It is stored as
    `consents.communications {granted, at, reference 'CNS-<seq>-COMMS', service, marketing, basis}`.
    `consents.digitalFootprint` is stored whenever the customer was asked, granted or declined. Records from the other
    journeys keep their earlier shape.
  - Credit memo: with consent, the identity flag reads "Verified (UAE PASS) · digital footprint: high confidence".
    The withheld group "Raw contact details" became **"Contact details and preferences"**: one group instead of two
    overlapping ones, so the other products keep 7 withheld groups and that existing check is unchanged.
    `CONSENT_CODES`, the memo's allowlist, is unchanged, so neither new consent reaches the memo or the SFTP row.
  - j1 data adds `aecb.cards 1`, `activeLoans 0`, `cardLimitTotal 12000`, `cardBalanceTotal 7440`, a synthetic
    `contact.email` (reserved example domain, only ever shown masked) and the spec's `footprint`.
- **Journey UI.**
  - Every Noor surface in botim is a `.noor-embed` with a "by noor" corner label: the banner, the fifth round "Noor"
    action button (Noor icon mask), the Insights cards, the account tiles, the Credit-tab card, the funded card, variant
    A's Loans tile and the connected part of the Insights tab. The host toast no longer names banks. The "Noor's
    position" callout shows in Behind the scenes on every host screen.
  - What botim receives: events only — impression, click, journey_started, accounts_connected, prequalified, applied,
    funded. Each carries "· variant X" and is sent once per journey. A session event log, kept across restarts and
    variant switches, feeds the Experiment counters (impressions, starts, connects, applications, fundings per variant).
  - Insights: card utilisation comes from j1's card totals, and the AED 900 repayment from the connected accounts.
    Spending and "left after bills" come from the connected accounts. The NoorScore estimate comes from one pure
    `prequalify()` call made on connecting. In production the card limits would come from the card accounts connected
    through Al Tareq; there is no AECB inquiry.
  - Experiment: a panel between Behind the scenes and Steps. The page computes the sample size with the two-proportion
    formula and an inverse-normal approximation: **13,809 per arm** (z 1.960 / 0.842).
  - Paths:
    - Variant B is today's flow plus 3·1 and 3·2.
    - Variant A runs 0 → 7 (Loans) → 8·1 "How much do you need?" → 1–6 → 8·2 affordability check → 9–16, and its step
      list renders in that order. "Change my loan" returns to 8·1.
    - Reached steps are tracked by position on the variant's path.
    - In A, the budget insight leads to 8·1, the card insight to the Loans tile, and jumping to step 6 opens the
      "accounts connected" screen.
  - Email (3·1): the email is verified with its own demo code, and "Use a different email" validates the address. The
    footprint box is unticked by default. Ticking it runs `assessFootprint()` without AECB context, because Noor has
    not pulled the bureau yet, and shows the chips.
  - Contact (3·2): Email joins the service defaults once verified. With no service channel the CTA is disabled and an
    inline message shows.
  - Step 16: the PWA card with a simulated "Open noor.finance in your browser", and the three bullets behind it.
  - Policy console: `instalmentToFcfMaxPct` on the personal loan; `footprintOverlayMode` (a SHADOW / LIVE select) and
    `footprintOverlayCap` on split, starter loan and personal loan. The Decision log replays the new consents and pull.
- **Tests.**
  - The selftest adds group 17 (94 checks). Only one existing message changed: "free cash flow 3,700 (informational)"
    became "a policy rule since v2.8".
  - Acceptance adds a variant-A section, a dark-theme section, v2.8 checks within the B walk, policy-console checks and a
    byte-identity check of the Noor skin `<style>` block.
  - Existing acceptance checks changed only where the behaviour changed: the step-1 hand-off copy (now with the email),
    the "botim receives" message (events only), and the animated and 390px click sequences (they now pass 3·1 and 3·2).
- The Noor skin `<style>` block is byte-identical; all v2.8 CSS sits at the end of "Noor additions".

### As built — v2.9

Built as RED-FLAGS-SPEC.md specifies (selftest 1276 green; acceptance 593 green, 11 screens). The engine's arithmetic
agrees with the spec exactly, so no synthetic input was adjusted to make an outcome hold:

- **r6 Marco Ferreira:** with the rule on, REFER with `RC_RED_FLAGS_REVIEW` only. The flags are RF_CARDS_MAXED
  (41% → 97%), RF_REMITTANCE_SURGE (88.6%, shown as 89%, vs 22% usual, 4.0×) and RF_BALANCES_DRAINED (−84.1%,
  one AED 7,000 transfer = 60% of the AED 11,600 average).
- **r6 with `redFlagsAtOrigination: false`:** APPROVE AED 40,000, NoorScore 709 (694 + 15), grade B, binding REQUESTED,
  AED 1,827.21 × 24, DBR 28.1%.
- **Pricing:** identical either way.
- **Monitoring:** ML-01 HIGH · EXIT_RISK, ML-02 / ML-03 / ML-06 MEDIUM, ML-04 LOW, ML-05 NONE.

Decisions and deviations:

- **Engine (additive).**
  - New pure API `redFlags(subject, {phase, params?})`.
    - It reads an explicit allowlist out of `subject.redFlagData` and nothing else.
    - The selftest proves it two ways. A clone carrying country, nationality and destination fields gives an
      identical result. A recording proxy shows that only allowlisted keys are read.
    - A draft `params` is bounds-checked like a publish.
  - New pure API `earlyWarningScan()`, sorted HIGH → MEDIUM+ → MEDIUM → LOW → NONE, then by loan id.
  - New pure API `simulateEarlyWarning(draft)`: the monitored book, plus every loan persona with `redFlagData` decided
    both ways.
  - New API `askCustomer(decisionId, {analyst, note, channel})`.
  - New exports `RED_FLAG_CODES` and `RED_FLAG_ORIGINATION_CODES`.
- **Additions to existing outputs.**
  - `metrics().exitRiskWatch` holds `{counts, rows}`.
  - `referQueue()` rows add `redFlags` (signal codes) and `customerAsked`.
- **Shared block.** It lives in the policy store as `earlyWarning`, so `getPolicy`, `publishPolicy` (4-eyes) and
  `policyHistory` accept it.
  - It carries `kind: 'SHARED_BLOCK'`, the ten guardrails and the action ladder as locked text, and the v2.8 Al Tareq
    "why" line (`consentWhy`).
  - Publish refuses any guardrail key. It also refuses any unknown key ("nationality … can never be a parameter").
  - `simulateBook` is not used for the block; the console calls `simulateEarlyWarning`.
- **Bounds chosen** (the spec gave none):
  - utilisation 75–100% · cards 2–5 · rise 15–60 pp;
  - remittance share 50–100% · **multiple 1.5–5×** (below 1.5× the usual level could fire; the selftest shows a
    customer sending 90% of income, equal to their baseline, stays NONE at the loosest legal setting);
  - travel AED 500–5,000 within 7–60 days · salary 3–15 days late · on-time run 2–6;
  - balance drop 50–95% · outbound share 25–90%.
  - Counts and days must be whole numbers.
- **Origination.**
  - The gate opens only for personal loan, car loan and split, and only when the applicant has `redFlagData` **and**
    Open Finance consent.
    - It hooks into each evaluator just before the outcome (`redFlagRule`), so a REFER keeps the evaluator's own
      reason-code logic.
    - Without consent nothing is read: r6 without Open Finance is APPROVE.
  - The salary advance and the starter loan are out of scope.
  - Origination reads only the three referring signals. Travel and payments-stopped are **monitoring-only**: the spec
    says so for travel, and before disbursal there is no Noor collection to miss.
  - With the rule off, POL_RED_FLAGS is recorded as INFO and no signal is read.
  - `POL_RED_FLAGS` can only be REFER, PASS or INFO. A decline only ever comes from another rule (tested with r6 at
    DPD90).
  - The record carries:
    - `features.redFlagSignals`, `redFlagSeverity` and `redFlagsAtOrigination`;
    - `record.redFlags` (internal);
    - a `RED_FLAGS_READ` audit entry.
- **Severity.**
  - "MEDIUM+" is `severity: 'MEDIUM'` with `escalated: true` and `severityLabel: 'MEDIUM+'`. The tiles count it as
    MEDIUM.
  - Check-in SLAs (unspecified): MEDIUM 8 hours, the same working day; MEDIUM+ 4 hours. HIGH is a specialist call
    within 24 hours.
  - The check-in offers a payment-date move when the salary is late, otherwise a date move or a restructure.
  - A remittance surge needs a 6-month baseline to fire.
- **Workbench (stricter than the spec).**
  - Overriding a red-flag referral also requires a written note, enforced by the engine on top of the reason code and
    4-eyes.
  - `askCustomer` records the note and a customer message: RC_RED_FLAGS_REVIEW in EN + AR, plus each flag's
    explanation. The case stays open.
- **Data.**
  - r6 is appended with `personasLoan.push` in a new v2.9 block.
  - Chosen values: ESR 15%, salary day 26, bank label RAKBANK, a flat 14,000 income series, and a spending series with
    mean 6,900.
  - Card counts and balances live in `redFlagData.aecb`, and `cardUtilisationPct3mAgo` sits in `redFlagData.baseline`
    (the §1 schema). The persona's `aecb` block keeps the standard shape.
  - `MizanData.monitoredLoans` holds six loans with varied names, no nationality and no destinations. Each has a
    `contactChannel` (the customer's chosen channel).
  - The six reason codes are appended at the end of the reason-code object.
  - The seeded `earlyWarning` table is kept.
- **Unchanged outcomes.** The selftest fingerprints every existing persona path (r1–r5, r2 with Credit Passport,
  c1–c5, u1/u2 with and without statements, j1, a1 on both paths, the salary advance) against the v2.7 engine.
  Mutation tests (9 of 9) confirm the new checks bite.
- **Privacy.** r6's memo and SFTP row, as REFER and after an override approval, contain none of 12,400 · 1,850 · 7,000
  · 58,200 · 60,000, no "airline" and no signal. They carry the outcome and RC_RED_FLAGS_REVIEW only. The lender
  status flag appears in the Monitoring detail for HIGH rows; memos are unchanged.
- **UI.**
  - **Monitoring.** A new "UAE red flags — exit-risk watch" panel sits above the day-zero table, with the policy line,
    four severity tiles and six expandable rows. A row expands to show:
    - the guardrail notes;
    - each reason code in EN + AR;
    - observed / usual / threshold for each flag;
    - for HIGH, what Partner Bank receives.

    At phone width the table becomes stacked cards.
  - **Personal loan.** r6 is selectable. "What tripped" sits right under the outcome banner.
  - **Workbench.** The queue says "Red flags — review". The case has a Red flags panel with "Ask the customer" and
    Approve / Decline (override with a mandatory written reason). It replaces the statements panel and the generic
    override form for that case.
  - **Decision log.** The replay shows the red flags.
  - **Policy console.** A "Shared block · Early warning" button sits beside the product packs: guardrails and ladder
    locked, thresholds editable, its own simulation.
  - **Overview.** Step 10 is appended (the strip is now `demo-10`, ten steps), and a topic-map row is added.
- **Acceptance.** One existing check changed: the demo-strip count went from 9 to 10.
- **Merging with v2.8.** v2.8's personal-loan free-cash-flow rule should leave r6's APPROVE path intact: free cash
  flow is AED 5,000 and the instalment is 36.5% of it.

### As built — v2.10

Built as SME-SPEC.md specifies (selftest 1503 green, of which the 1370 earlier checks and 133 in group 19; acceptance 764
green, 12 screens). Every number in the spec's table reproduces exactly from the engine — no rounding-cent differences:

| | Business accounts only | + the owner's personal accounts |
|---|---|---|
| NoorScore / grade | 732 (702 + 10 + 10 + 10) · B | 747 (+15 owner's income verified) · A |
| APR (mid band) | 13.00% | 10.50% |
| DSCR cap (13,800/month, 12 months) | 154,000 | 156,000 |
| Guarantee | UNVERIFIED × 65% → 100,000 (binds) | VERIFIED_STRONG × 100% (DBR 31.7% incl. contingent, buffer 13.6) |
| Approved · instalment / total | AED 100,000 · 8,931.73 / 107,180.73 | AED 150,000 (request binds) · 13,222.29 / 158,667.49 |
| DSCR | 3.09× | 2.09× |

Uplift +AED 50,000, 2.5 points cheaper. Decisions and deviations:

- **Engine (additive).**
  - `sme_working_capital` is appended sixth to `MANIFESTS` (segment `SME`). Records carry the manifest's segment, so
    every earlier product stays `CONSUMER`; `referQueue()` rows carry the record's segment.
  - The guarantee factor multiplies the **business capacity** (pickMin of the DSCR, revenue and product caps), not the
    request — that is what makes 65% of 154,000 = 100,000. Approved = min(request, capacity × factor), each floored to
    1,000. Binding: `REQUESTED` when the request fits; else `GUARANTEE_FACTOR` (factor < 100%) or the capacity's key.
  - The owner's tests run at the amount the business supports before the factor (min(request, capacity)), so the
    guarantee is judged on the full exposure. Obligations = the larger of AECB consumer and what leaves her accounts.
  - Business features are derived from 12 monthly rows: revenue = credits − owner injections − inter-account
    transfers; operating outflows = debits − inter-account transfers (the owner's drawings, her pay, are inside them).
    Volatility is the population stdev/mean, rounded to a whole percent (14.08% → 14).
  - Rules: the spec's list plus `POL_TENOR` (a request between allowed terms rounds up, RC_TENOR_CAP). `POL_DSCR`
    fails only on a non-positive NOCF and refers below 1.5×; `POL_GUARANTEE` is PASS (strong) or INFO — it scales the
    amount, never declines. `POL_RETURNED_CHEQUES` uses a fixed tolerance of 1 (the other packs' default) because the
    spec's params list has no cheque parameter.
  - An owner red flag refers (RC_RED_FLAGS_REVIEW only) and, per the spec's VERIFIED_STRONG definition, makes the
    guarantee weak (80% of the provisional amount); the score and the price never change. Without the owner's consent
    nothing of hers is read; with `redFlagsAtOrigination` off it is INFO.
  - New pure API `quoteSme()` (the screen's term rows); `rec.ownerAccountsUplift` is a pure re-evaluation with
    `ownerOpenFinance: false` (null without her consent). Records add `borrower`, `guarantee` (status + internal tests),
    `businessFindings`, `ownerFindings` (internal), `request.purpose`, and `consents.ownerOpenFinance` beside the
    signatory's business consent.
  - New reason codes (EN + AR, appended after the v2.9 codes): RC_TRADING_HISTORY, RC_BUSINESS_HISTORY,
    RC_BUSINESS_CASH_FLOW, RC_GUARANTEE_UNVERIFIED, RC_GUARANTEE_WEAK, RC_RF_REVENUE_DROP, RC_RF_FUNDS_TO_OWNER.
- **Policy pack.** The spec's params and locked block exactly, plus `coolingOffDays: 5` in the locked block (an
  addition: the shared six-step sequence needs it; labelled Noor policy for micro businesses). The pack carries
  `lockedBasis: 'NOOR_POLICY'`; publishing a locked key is refused with "locked Noor policy … confirm with compliance".
  Bounds (unspecified): trading 6–60, history 6–24, minimum 10,000–100,000, cap 100,000–2,000,000, terms 1–24 ascending
  whole months, DSCR budget 20–80%, revenue multiple 0.25–3, unverified factor 30–80% (never above the 80% weak
  factor), owner DBR cap 30–50%, contingent share 25–100%, buffer 1–12 instalments, scores as the other packs.
  `REFER_SLA_HOURS.sme_working_capital = 24`.
- **Execution.** The same six events and labels. SME descriptions and guards: the owner acknowledges the key facts and
  the personal-guarantee disclosure (AR + EN), signs the loan and the guarantee via UAE PASS, the mandate sits on the
  business account, and cooling-off is "Noor policy for micro businesses … (confirm with compliance)". Token
  conditions: the disclosure, the business-account mandate, the owner's guarantee, a valid trade licence.
- **Credit memo.** SME memos have their own allowlist: the company as borrower (masked trade licence), the guarantor's
  name and masked Emirates ID, business terms as bands (licence age, annual revenue, DSCR, instalment ÷ NOCF), the
  guarantee status as a flag, AECB commercial and owner consumer score bands, consent references (the owner's own
  consent as a reference). Withheld: the shared seven groups (the first reworded for a business) + "Exact business
  revenue, operating cash flow, balances and customer names" + "Owner's personal account data — used for Noor's
  guarantee assessment only". Revenue is banded annually (AED 1M–5M a year), so no band boundary is a monthly figure.
  SFTP rows for SME add `revenue_band, dscr_band, guarantee_status`; other products keep 16 columns. The recursive scan
  finds none of 35,000 · 180,000 · 21,000 · 4,500 · 27,600 · 200,000, the other business/owner working figures, the
  bank names or the masks — on both paths, a REFER, an override approval and a weak guarantee.
- **Monitoring.** `RF_REVENUE_DROP` and `RF_FUNDS_TO_OWNER` live inside the v2.9 primitive, read from an allowlisted
  `redFlagData.business` block (the company's own inflows and transfers to the owner), monitoring only. Their thresholds
  (30%, 2×) are fixed constants shown as locked text on the shared block, so the v2.9 block's params publish unchanged.
  FUNDS_DIVERSION = RF_FUNDS_TO_OWNER + (owner RF_REMITTANCE_SURGE or RF_BALANCES_DRAINED) → HIGH, specialist call.
  A business revenue drop offers a payment holiday under policy; a same-month dip last year adds a "looks seasonal"
  note. ML-07 (Harbour Point Building Materials) HIGH · FUNDS_DIVERSION; ML-08 (Palm Grove Catering) MEDIUM; ML-01 …
  ML-06 keep their severities. The block's `appliesTo` adds the SME pack and carries the owner's consent line
  ("while the business loan you guarantee is open").
- **Data.** `MizanData.personasSme = [s1]` (Kamal Fresh Foods Trading LLC; Sara Kamal, سارة كمال, 39), a 15-row
  hand-written `sampleBook.sme_working_capital` (7 approve · 2 refer · 6 decline; SM-001/SM-002 reproduce s1's paths),
  ML-07 and ML-08. No nationality, country or destination field anywhere.
- **UI.** New "SME working capital" screen after "Car loan": the CSS-only ten-step flow map (Open Finance steps 2, 3 and
  10 in sky; five a row on tablets, stacked on a phone), business and owner cards, the request with live term quotes,
  the three consents (the owner's a switch, on by default), the decision panel (figures, guarantee chip, business-account
  repayment, keyed trace), "What the owner's accounts changed", internal Owner findings, "How Mizan decided", the offer
  with the bilingual guarantee disclosure, and the six steps. Workbench, Decision log, Lender view, Monitoring
  ("SME" chip, guarantor line, decisions by product), the Policy console (Noor-policy locked block, term list, SME
  simulation with amount impact; business signals on the shared block) and the Overview (step 11, a topic-map row)
  all carry the product. The Noor skin `<style>` block is byte-identical; all CSS sits at the end of "Noor additions".
- **Changed existing checks.** Selftest: the manifest order, segment and pricing-mode checks (six products); "no SME
  personas" (now: only the v2.10 persona, legacy keys still absent); v2.9's monitored-loan count (8), distinct names
  (8), reason-code position (the v2.9 codes followed only by v2.10's), block `appliesTo`, scan order, exit-risk counts
  (HIGH 2 · MEDIUM 4 · LOW 1 · NONE 1) and the recording proxy's allowlist (adds the business keys). Acceptance: the
  screen list and "12 screens", the demo strip (11) and its "eleven-step" heading, the red-flag tiles and rows (8), and
  the vocabulary scrub, which no longer bans "SME" / "working capital".

### As built — v2.11

Built as FLOWS-SPEC.md specifies (selftest 1503 green, unchanged: no engine change; acceptance 885 green, of which the 764
earlier checks and 121 in the new "v2.11 — flow maps" section). Decisions and deviations:

- **One component.** `FlowMap.create(cfg)` in index.html (next to `buildExecPanel`) renders the panel, an `<ol>` of step
  buttons and the detail region. Eight configs: `FLOW_SPLIT`, `FLOW_LOAN`, `FLOW_CAR`, `SME_FLOW`, `FLOW_UPGRADE`,
  `JR_FLOW`, `FLOW_WORKBENCH`, `FLOW_MONITORING`. Map ids: `sp-flow`, `ln-flow`, `car-flow`, `sme-flow`, `up-flow`,
  `jr-flow`, `wb-flow`, `mn-flow` (plus `-panel`, `-detail`, `-b<N>`, `-go`). Every map sits right under its screen head;
  on the journey, above the phone and panel row.
- **SME migrated.** The v2.10 `.sme-flow` / `.sme-fs-*` rules were removed; `.fm-*` at the end of "Noor additions"
  reproduces them, with `--fm-cols` for 5–10 columns. The acceptance compares every step, circle, title, detail line
  and chip with the v2.10 pixels at 1440px. A button does not inherit letter-spacing, so `.fm-btn` sets it explicitly;
  without that, titles wrapped differently.
- **Status.** The keys are as specified. `decided` counts the pending record while the orchestration animates.
  "Next" (the ring) is the step after the last done one, so a skipped optional step never carries it. A done step
  shows a check on the `--ok` tokens, Open Finance steps included; the sky chip and connector stay.
  - Screens call `map.refresh()` in pick / reset / showDecision.
  - `afterEngineMutation()` calls `FlowMap.refreshAll()`, which covers execution events and new decisions.
  - Events are read from `ME.getDecision(id).events`.
- **Targets.** A target counts once it has content; an empty slot does not. A list is a fallback chain. Disabled
  buttons say why:
  - "Appears after you decide" before a decision;
  - "Appears after an approval" when the decision has no such panel;
  - upgrade steps 8–10: "Appears after you accept an option", because the execution panel appears on acceptance;
  - car step 6: "Appears when Open Finance is on", because the documents path shows the CTA instead;
  - Workbench: "Appears when you open a case".
- **Scroll and outline.** The page scrolls below the phone tab bar with the target in the upper third. The scroll is
  smooth unless reduced motion is on (read live from `matchMedia`). `.fm-flash` is a 2px `--brand` outline for 1.5 s;
  under reduced motion it is static, with no animation.
- **Keyboard and ARIA.** All four arrows plus Home / End move the selection and the focus. Esc closes the detail and
  returns focus to the step. A document-level Esc also closes an open detail on the visible screen when the focus is
  elsewhere. Steps carry `aria-pressed`, `aria-expanded` and `aria-controls`; the detail is a labelled region.
  Screen-reader text gives "Step N:" and "— done / — next / — you are here".
- **Journey phases.** They map onto the variant's path:

  | Phase | Journey steps |
  |---|---|
  | 1 | 0, plus variant A's Loans screen (step 7) — A's botim entry |
  | 2 | 1–3, with 3·1 and 3·2 |
  | 3 | 4 |
  | 4 | 5 |
  | 5 | 7 (B) / 8·2 (A) |
  | 6 | 8 (B) / 8·1 (A) |
  | 7 | 9 |
  | 8 | 10–11 |
  | 9 | 12–15 |
  | 10 | 16 |

  - Step 6 (back in botim) belongs to no phase; while it is current, the ring sits on the next phase.
  - A phase is reached when any of its steps is within `reachedIdx`. It is current (`aria-current`) when it holds the
    current step.
  - "Go to this step →" calls `Journey.jump` on the phase's first step, then scrolls to the phone. The existing step
    list is unchanged.
- **Workbench.** Steps 1–3 are done once a case is open (a full record or a seeded row). Step 4 is done when the
  customer was asked (`askCustomer`) or statements were requested. Steps 5–6 are done once the case is re-decided or
  overridden. The header drops the Open Finance clause, because no step uses it.
- **Copy.** Every block is one or two sentences, and the acceptance counts them. Every Rule names its source: Reg
  29/2011, Federal Law 6/2010, CPR 8/2020, the CBUAE Consumer Protection Standards / Regulation, CBUAE Open Finance,
  PDPL, the platform repayment rule, RFC 8252 / FAPI 2.0 for the bank hand-off, or a named Noor policy param. The SME
  locked-block steps (1, 4, 6, 7, 9) say "Noor policy — confirm with compliance".
- **Changed existing check.** One acceptance check changed. The v2.10 dark-theme check read
  `#sme-flow li.of .sme-fs-n`; it now reads `#sme-flow li.of:not(.done) .fm-n`. The class moved, and after Decide
  steps 2–3 are done and wear `--ok`, so the check reads step 10.
- The Noor skin `<style>` block is byte-identical; all v2.11 CSS sits at the end of "Noor additions".

### As built — v2.12

Built as JOURNEY-HOME-SPEC.md specifies (selftest 1503 green, unchanged: no engine change; acceptance 951 green, of which
the 885 earlier checks and 66 in the new "v2.12 — botim main screen" section). Decisions and deviations:

- **The main screen (0·0).** `Journey.home()` renders botim's Home tab as a concept from the same dark host tokens: the
  status bar, a header with the plain-text "botim" wordmark, the "Concept — illustrative host app" tag and the "RK" avatar,
  the search pill, Noor's banner, the services grid, three generic recent chats (Family group, Office, Building
  management) and the bottom nav with Home active. No botim logo, artwork or image. Ids use the `bh-` prefix
  (`#bh-home`, `#bh-banner`, `#bh-noor-icon`, `#bh-svc-<key>`, `#bh-nav-<key>`), so botim money keeps its `bm-` ids.
  - The banner and the Noor icon reuse the money page's classes and copy, so they look the same: Noor embeds with "by noor".
    The icon sits in the services grid. The services glyphs are simple stroked paths; "money" is blue and "Noor" uses Noor's card.
  - Once the loan is funded, the banner becomes a non-tappable embed: "Loan funded · managed in Noor", with the lender line
    and no amount. The Noor icon stays an entry.
  - The behind-the-scenes copy for 0·0 is the spec's, plus the variant's entry and the surface note. Noor's position shows
    there too. The footnote says the team's frames show only botim money, so the main screen is a concept.
- **Navigation.** The journey opens on 0·0 at load, on Restart and on a variant switch. "money" (grid or nav) opens botim
  money on Pay (0·1). Botim money's bottom nav is now tappable too: Home returns to 0·0, so a funded customer can go back
  to the main screen. Calls, Chats and All, the other services, the search pill and the chat rows show a small toast,
  "Not part of this demo", above the nav for 2 s. It never navigates or calls the engine. The money page's ask bar still
  opens the botim AI teaser.
  - **Deviation (small):** ✕ / "Not now" before any bank is connected returns to the botim screen the customer left from
    (`S.hostBack`): the main screen after its banner or icon, and botim money after "Add another +". Before, it always
    returned to botim money, the only host screen. Once connected it still returns to botim money with the tiles (6·1).
- **Events.** `emit(name, surface)`: impression and click carry `surface: 'home' | 'money'`, and are logged once per
  journey per surface. The other events have no surface. "What botim receives" shows them as
  `impression · surface home · variant B`; `data-ev` keeps the bare name and `data-surface` holds the surface.
  The Experiment counters are unchanged. A second table, "Impressions by surface", splits impressions into main screen
  and botim money. A journey that opens botim money now counts two impressions, one per surface. The primary metric's
  denominator (entry impressions) therefore needs a surface choice when the real test is set up.
- **Step list and flow map.** Both variants' paths start with `JR_ENTRY`: 0 "botim — main screen", then the sub-step
  0·1 "botim money — Connected accounts". Variant A's path is 0 → 0·1 → 7 → 8·1 → 1–6 → 8·2 → 9–16. Flow-map phase 1
  ("botim entry") still matches every step-0 entry (plus A's Loans screen), so it covers 0·0 and 0·1. Its detail reads
  "Main screen · banner · Noor icon · money", and its Customer / Mizan / Rule copy names the main screen. "Go to this
  step →" jumps to the phase's first entry, the main screen.
- **Changed existing checks** (the walks now start on the main screen):
  - Clicks only, no change to what is checked: a tap on `#bh-svc-money` before the money page is used. This is in the
    B walk (opening checks, the Noor icon after Restart, Credit before connecting, entry 1, the AI teaser) and the A walk
    (banner, icon). It is also in the animated walk, the dark-theme walk, the 390px walk (incl. variant A) and the v2.11
    flow-map walk and its screenshot walk.
  - "botim gets impression, click and journey_started — each carrying the variant": the exact-text match now allows the
    `· surface home|money` part.
  - "What botim receives: events only …": the pattern allows `impression · surface …` and `click · surface …`.
  - "the step list renders variant A's own path": `0,0·1,7,8·1,…` (was `0,7,8·1,…`).
  - "back to variant B (the default)" and "dark theme: … the botim main page shows the banner" look for the main screen's
    `#bh-banner` (was the money page's `#bm-banner`).
- The Noor skin `<style>` block is byte-identical; all v2.12 CSS sits at the end of "Noor additions".

### As built — v2.13

Built as JOURNEY-CONTACT-SPEC.md specifies (selftest 1544 green, of which the 1503 earlier checks and 41 in group 20;
acceptance 1010 green, of which 956 after updating the existing walks and 54 in the new "v2.13 — contact preferences
after payout" section). Decisions and deviations:

- **Engine (additive).** `recordCommunications(decisionId, {service, marketing})` sits next to `normalizeCommunications`
  and reuses it. It refuses a non-APPROVE record ("contact preferences can only be recorded on an approved loan (… is
  REFER)"), an unknown id and missing preferences. It also refuses a superseded record, like `recordEvent` (stricter
  than the spec). It does not require DISBURSED: an approved record is enough. It writes the v2.8 shape with the same
  basis text, keeps an existing reference (including one recorded at decide time), and adds a `COMMUNICATIONS_RECORDED`
  audit entry (actor `customer`, "recorded" or "updated"). decide()'s v2.8 `consents.communications` is untouched.
  The diff to `src/` only adds lines.
- **Journey.** The email (3·1) continues straight to 4·0, and resuming onboarding never asks for contact preferences.
  Step 16 now has four sub-steps:
  - 16·0 "on its way" (DISBURSED), with a Continue button;
  - 16·1 the contact screen, with the same copy, switches, defaults and validation, and the new line under the title;
  - 16·2 "You’re all set": the choice as recorded, the PWA card and "Back to botim";
  - 16·3 botim (was 16·1).

  The PWA card moved from 16·0 to 16·2 because the spec puts it after the contact choice. An engine refusal on
  Continue renders inline ("We couldn’t save your choice.").
- **Step list.** Both paths lose 3·2 and end `16, 16·1 "How should we contact you?" (recordCommunications()), 16·2 "Noor on
  your home screen · back in botim"`. Step 16's own title is now "Done — the money is on its way". `jrIdx` maps 16·3
  to the 16·2 entry; the rule applies to step 16 only.
- **decide()** no longer passes `consents.communications`, and the "Mizan calls" line drops it.
- **Copy.** The behind-the-scenes copy for 16·1 is the spec's four lines, plus a `recordCommunications()` box. Step 9
  says that, until the customer chooses, service messages stay in the web-view and go by SMS to the verified mobile.
  The main screen's onboarding line drops "contact choices".
- **Decision log.** It appends "· asked after the payout, <time>" when the audit holds COMMUNICATIONS_RECORDED.
- **Flow map.**
  - Phase 2's detail is "Web-view · account · email".
  - Interpretation: phase 10's *title* becomes "Funded · contact preferences · back in botim". Its detail stays
    "botim learns only “funded”"; making it the detail would repeat the title.
  - The Customer / Mizan / Rule copy of both phases is updated (one or two sentences, sources named).
- **Changed existing acceptance checks** (intent kept):
  - B walk: the seven 3·2 checks moved to 16·1. The behind regex reads the new CBUAE line.
  - B walk: "contact choices land in the record’s consents" is now read after the 16·1 Continue. A new
    decide-time check says there are none.
  - B walk: the PWA checks are on 16·2 and "back in botim" is on 16·3.
  - Variant A: the path string (no 3·2; 16·1, 16·2 added); "contact preferences (3·2)" became "4·0".
  - Variant A: "default contact choices recorded" is now after the 16·1 Continue.
  - Variant A: DISBURSED → 16·1 defaults → 16·2 PWA → 16·3.
  - The animated walk, the v2.11 flow-map walk and screenshot walk, and v2.12's `WALK_TO_9` each have one Continue
    fewer. `walkToFunded` has two more, and its check reads 16·3.
  - The dark-theme contact check walks to 16·1.
  - The 390px walk drops the 3·2 scroll check and continues from the offer to 16·1 to check it there.
  - The v2.11 titles list has phase 10's new title.
  - v2.12's "no engine change: src/ is untouched" is now "engine change is additive only" (`git diff --numstat
    8b62ec7 -- src`: no line removed, data.js untouched).
- The Noor skin `<style>` block is byte-identical; v2.13 needed no CSS.

### As built — v2.14

Built as JOURNEY-FOOTPRINT-TC-SPEC.md specifies (selftest 1572 green, of which the 1544 earlier checks and 28 in group 21;
acceptance 1038 green, of which the 1010 earlier checks and 28 in the new "v2.14 — footprint covered by the terms" section).
Decisions and deviations:

- **Engine.**
  - `normalizeFootprintConsent` runs in decide() next to the communications check, before anything is pulled or
    recorded.
  - `true` becomes basis EXPLICIT. `{basis:'TERMS', termsVersion, acceptedAt}` becomes basis TERMS; the version is
    trimmed, and acceptedAt is optional but must be an ISO date-time when given.
  - Any other object throws: no `basis:'TERMS'`, a blank or non-string version, an array, or a bad acceptedAt. Other
    primitives keep v2.8's "declined" meaning.
  - The record's consent is `{granted, basis, termsVersion, at, scope, used}`. For TERMS, `at` is the time the terms
    were accepted (the decision time if none was given), and the scope says the check is covered by the accepted terms
    and that the Privacy policy says how to object.
  - Outcome, score, price, features, rules and pull summaries are identical for either form. The memo is unchanged:
    `CONSENT_CODES` never included the footprint consent.
  - This is the first engine change that edits existing lines (the footprint gate and the consent record), so the
    v2.13 "additive only" acceptance check was relaxed (see v2.15).
- **Journey.**
  - Step 2: "Privacy policy" and "Terms of Use" are inline link buttons (`button.ph-u`) that open a clause sheet
    (`#jr-terms-sheet`, a dialog inside the phone). The sheet has the version line, the spec's clause in plain words
    (curly apostrophe, as elsewhere in the UI) and the objection line.
  - Continue records `S.terms = {version 'T&C v1.0 · Privacy policy v1.0', acceptedAt}`. acceptedAt is the demo day,
    08:58Z, just before the engine's session clock starts.
  - 3·1: the checkbox card is gone. A muted notice sits under "Email verified"; its "Privacy policy" opens the same
    sheet.
  - `assessFootprint()` runs on email verification, with no ticking, and decide() receives the TERMS object. The
    "Mizan calls" line shows it.
  - Step list: 3·1 is now "Your email — digital-footprint check (covered by the terms)".
  - Behind the scenes for 3·1: the email line, the spec's four lines, then v2.8's two "Never used …" lines. Step 2
    gains a line on the terms version; step 9 says the check runs on the accepted terms.
  - Flow-map phase 2: its Customer / Mizan / Rule copy says the check is covered by the terms accepted at sign-up.
  - Decision log: "Digital footprint — covered by the Terms (T&C v1.0 · Privacy policy v1.0)". The pull is labelled
    "Digital footprint (covered by the Terms)" for TERMS records; v2.8 records keep their labels.
- **Changed existing acceptance checks** (intent kept):
  - B walk: "the footprint consent box appears" is now "the footprint notice appears".
  - B walk: "the box is separate, optional and unticked" is now "no box; the notice line".
  - B walk: "no footprint assessment until the customer agrees" is now "the assessment runs on verification, covered
    by the terms", and the `check('#jr-fp')` click is removed.
  - The Decision log check reads the terms line and the new pull label.
  - Variant A: "left unticked — declined" is now "nothing to tick (notice line)", and "the declined check never
    affects the application: no pull, 737" is now "covered by the terms: a pull, 737".
  - The 390px walk drops the `check('#jr-fp')` click and its scroll-check label.
  - v2.13's "Mizan calls" decide() regex has the TERMS form.
- The Noor skin `<style>` block is byte-identical; the v2.14 CSS sits at the end of "Noor additions".

### As built — v2.15

Built as JOURNEY-BANKAPP-SPEC.md specifies (selftest 1587 green, of which the 1572 earlier checks and 15 in group 22;
acceptance 1072 green, of which the 1039 earlier checks and 33 in the new "v2.15 — bank app: cards and loans" section).
Every Mizan number for Ravi holds, and the v2.9 fingerprints still match. Decisions and deviations:

- **Data.**
  - j1 gains the two ENBD accounts exactly as specified, plus `observedObligations`. `aecb.activeLoans` is 1.
  - `observedObligationsLabel` now reads "Credit-card repayment + personal-loan instalment". Only the car-loan path
    reads it, and j1 never takes that path. The engine reads the totals only.
  - Group 22 proves the totals point with j1 as of v2.14 (two deposit accounts, no loan). `prequalify()`, both
    decisions (except the applicant snapshot), the memo and the SFTP row are byte-identical.
- **Privacy.** The v2.5 scan's raw values gain each account's `limit` and `outstanding`. Only j1's accounts carry them.
  The j1 memo regex also forbids 7702, 3317, 7,440, 6,200 and "credit card ••".
- **Changed existing selftest checks:**
  - "j1: … ENBD current ••••4821 + FAB savings ••••0193": the account list is now four entries.
  - "j1 card totals …; 1 card, no loans" now says 1 loan.
  - "j1 memo: no bank, account mask …" now covers the new masks and figures.
- **Journey.**
  - Step 4's read line is updated.
  - 5·1 is the ENBD app and 5·2 the FAB app, built by `Journey.bankApp(bank)`. Accounts are grouped under Accounts /
    Credit cards / Loans. Each row is a label with a real checkbox (the input covers the row, so a tap anywhere toggles
    it), ticked by default.
  - Unticking keeps Ravi's numbers. With nothing ticked, Approve waits ("Tick at least one account to share — or
    decline").
  - The Face ID beat is now a flag on the bank screen, not a sub-step. Approve shows it for 900 ms (instantly under
    reduced motion), then opens the next bank or 6·0. "Open my bank" skips a bank deselected at step 4.
  - 6·0 lists the approved accounts, cards and loans included. The botim tiles and the Insights total use the deposit
    accounts only (`jrDeposits`).
  - The card insight reads "Your credit card is 62% used — AED 400 a month on the card"; the credit state reads
    "1 credit card · 1 loan · …".
  - The budget view lists Credit card AED 400 and Personal loan AED 500 under the AED 900 total.
  - Behind the scenes for step 5: the RFC 8252 / FAPI insight, the spec's two lines (they replace the old "two short
    hops" line), and the unticking note as a callout. Step 7's reading line names the card and the loan.
  - Flow-map phase 4: the Customer copy is updated; the detail stays "Leaves the web-view". The step list is unchanged:
    5·1 and 5·2 sit under step 5.
- **Changed existing acceptance checks** (intent kept):
  - B walk: the step-4 read line.
  - B walk: "Your bank’s app (simulated)" is now "ENBD app (simulated)".
  - B walk: "bank app lists ENBD ••••4821 and FAB ••••0193" is now ENBD only on 5·1, plus a new 5·2 FAB check.
  - B walk: the card insight (AED 400 on the card) and the credit-state insight ("1 loan").
  - One more approve tap in: the B walk, variant A, the animated walk (which waits for 5·2 before the second tap, then
    sees the Face ID beat), the v2.13 dark walk, the 390px walk, the v2.11 flow-map walk and screenshot walk, v2.12's
    `WALK_TO_9`, v2.13's `BANK_TO_9` and the v2.14 walk.
  - v2.12's src check (made "additive only" in v2.13) now reads: "src/ changes since v2.12 are confined to engine.js,
    data.js and the selftest, which grew from 1503 checks". v2.14 and v2.15 edit existing lines on purpose.
- The Noor skin `<style>` block is byte-identical; the v2.15 CSS sits at the end of "Noor additions".

### As built — v2.16

Built as JOURNEY-EID-SPEC.md specifies, including both 9 Oct amendments (selftest 1677 green after v2.16, of which the
1587 earlier checks and 90 in group 23; acceptance 1120 green after v2.16, of which 1073 after updating the existing walks
and 47 in the new "v2.16 — Emirates ID" section). Every Mizan number for Ravi holds with a matching employer, and the v2.9
fingerprints still match. Decisions and deviations:

- **Data (j1).**
  - `emiratesId.front` is `{nameEn, nameAr, idMasked '784-••••-•••••••-4', dob '1995-03-14', nationality 'India', expiry
    '2028-02-09'}` and `emiratesId.back` is `{occupation, employer 'Dunecrest Logistics LLC', issuingPlace 'Dubai'}`.
    The date of birth gives 31 as of TODAY. There is no sex or country field.
  - Nationality was first left out, as the original spec required. Amendment 1 (9 Oct) adds it to the front.
  - `connected.salaryPayer` is 'SALARY/WPS DUNECREST LOGISTICS'. Every account carries `holderName 'RAVI KUMAR'`.
  - Two reason codes, RC_EMPLOYER_MISMATCH and RC_ID_EXPIRED, have Arabic. They sit before the v2.9 block, so the v2.9
    test that the red-flag and SME codes end the table holds.
- **Engine (additive).**
  - `checkEmiratesId(applicant, scan?, opts?)` is pure.
    - It reads only an allowlist: the front's name (EN + AR), masked ID, date of birth, nationality and expiry; the
      back's occupation and employer. The selftest proves this with a property recorder.
    - `notRead` is `['sex']` and `retainedInsideNoor` is `true` (amendment 2).
    - It returns the spec's shape, plus `idMasked`, `expiry`, `nationality`, `enrichment`, `openFinance` and `whatIf`.
    - `enrichment` routes nationality to the corridor (India → Credit Passport and Indian statements; outside India,
      Pakistan and Egypt, nothing is offered). Its `use` line says "identity and enrichment routing only — never a
      NoorScore or decision input".
    - `opts.salaryPayer` overrides the payer for the what-if. `opts.openFinance === false` reads nothing from the
      accounts, so the employer and name checks are null.
  - Employer matching follows the spec: uppercase; drop L.L.C / LLC / FZE / FZCO / LTD / CO, SALARY / WPS / SAL and
    '/'; expand SVCS / TRDG / LOG. It matches when at least 70% of the employer's distinct words appear in the payer.
    The score is that share as a whole percent.
  - `decide()` accepts `emiratesId` (`true` or `{front, back}`) for the **personal loan only**; other products throw.
    A persona without a scan throws.
    - The EMIRATES_ID pull (status SCANNED) comes after OPEN_FINANCE and before DIGITAL_FOOTPRINT. Its summary holds
      flags only: no employer, payer, date of birth, occupation or nationality value.
    - The features are idExpiryValid, idNameMatch, employerMatch and employerMatchScore.
    - POL_ID_VALID and POL_EMPLOYER_MATCH run in `evaluateLoan` after the FCF rule, so the limit and the price are
      computed exactly as before.
    - A mismatch or an expired card is REFER; without Open Finance, or without a salary payer, the result is INFO.
  - `record.emiratesId = {scanned, idMasked, check, images}`. This is internal only. `images` holds the KYC references
    (`KYC-<seq>-EID-FRONT.jpg` / `-BACK.jpg`), `retainedInsideNoor: true` and the AML purpose.
  - The name match has no rule of its own, because the spec defines none. It is a feature, part of POL_ID_VALID's
    observed text, a pull flag and a 7·2 row.
  - **Memo.**
    - The identity flag is "Verified (UAE PASS) · Emirates ID front + back · employer matches salary payer". It reads
      "differs from" on a mismatch, "not yet checked" without Open Finance, and adds "· card expired".
    - The v2.8 footprint confidence follows the flag. The journey's memo therefore reads "… · employer matches salary
      payer · digital footprint: high confidence".
    - **Deviation:** `borrower.emiratesIdMasked` is now the scanned card's mask ('784-…-4') when the decision has a
      scan. The deterministic mask ('…-5' for j1) would have contradicted the card the customer just scanned.
  - Selftest group 23 (90 checks):
    - the data, the normalisation cases and the 70% boundary (67% vs 75%);
    - Ravi unchanged, with his fingerprint;
    - the mismatch, the expired card, both together, no Open Finance and no payer, as REFER or INFO and never a decline,
      at the same price;
    - the guardrail: a Pakistan clone with a sex field gives the same outcome, points, grade, price, limit, features,
      rules and pulls;
    - the image references and the privacy scan.

  The scan is extended in place: `identityWordsOf()` adds the employer, occupation, payer, the date-of-birth formats,
  the nationality and the image references. Records with a scan are also checked for any image reference
  (.jpg / .png, EID-FRONT, "image", "photo").
- **Journey.**
  - 3·2 "Scan your Emirates ID" follows 3·1 in both variants. The email's Continue leads to 3·2, and
    `resumeOnboarding` returns there until the scan is done.
  - The scan screen:
    - Two tiles show a neutral dashed card outline with field labels. There is no card design and no image.
    - Tapping a tile shows a simulated camera frame ("Hold steady…", corner marks) for 1 s, instantly under reduced
      motion. The other tile and Retake wait meanwhile.
    - The captured fields show (front: name EN + AR, the masked ID, date of birth, nationality, expiry). Each side has
      Retake.
    - The muted line is amendment 2's. Continue is disabled until both sides are captured.
  - Step 4 has the methodology line under the bank list.
  - At 7·2, a card under the budget summary shows the spec's employer ↔ payer row and the name row. `checkEmiratesId()`
    runs, pure, on entering 7·2, or 8·2 in variant A. Variant A has no 7·2, so its result shows behind the scenes at 8·2.
  - Behind the scenes for 3·2 has the spec's lines as amended:
    - minimisation, without the photos clause;
    - the KYC images line;
    - "Front and back is enough …" in place of the liveness sentence;
    - the nationality line.

    Its engine box shows read, not read, the images and the nationality-routing chips, and the check result at 7·2.
  - The what-if button at 3·2, 7·2 and 8·2 runs a pure check with the Palmgate payer. It shows the spec's REFER line and
    logs under "Mizan calls"; no record is made.
  - decide() passes `emiratesId:true`. The offer's behind-the-scenes lists POL_ID_VALID PASS and POL_EMPLOYER_MATCH PASS.
  - Flow-map phase 2 reads "Web-view · account · email · Emirates ID", with updated Customer / Mizan / Rule copy of two
    sentences each.
  - PULL_LABEL gains EMIRATES_ID.
- **Changed existing acceptance checks** (intent kept): every onboarding walk now passes 3·2 (front, back, Continue):
  - the B walk;
  - variant A;
  - the animated walk;
  - the v2.8 dark walk;
  - the 390px walk, which adds one scroll check at 3·2;
  - the v2.11 flow-map walk and screenshot walk;
  - v2.12's `WALK_TO_9`;
  - v2.13's onboarding, variant A, dark and 390px walks;
  - the v2.14 decision walk;
  - v2.15's `TO_BANK`.

  The other changed checks:
  - The variant-A path string and v2.13's two step-list checks now include 3·2. "No 3·2" became "3·2 is the Emirates
    ID, not a contact screen".
  - v2.13 "the step list moves 3·1 → 4" now reads 3·2 → 4.
  - v2.13's phase-2 detail string.
  - v2.13's decide() call regex gains `emiratesId:{front, back}`, and `dataSources` for v2.17.
  - The two memo identity regexes (v2.8, v2.14) read the new flag before the footprint confidence.
- The Noor skin `<style>` block is byte-identical; the v2.16 CSS sits at the end of "Noor additions".

### As built — v2.17 (revised 9 Oct, "Two steps to a score")

Built as the revised JOURNEY-CONFIDENCE-SPEC.md specifies (the first draft was never built). With "Noor IP vs lender
view", the lender sees no threshold, weights or bands. Selftest 1726 green: the 1677 earlier checks and 49 in group 24.
Acceptance 1159 green: the 1120 earlier checks and 39 in the new "v2.17 — data completeness" section. Without
`dataSources` nothing changes, and the v2.9 fingerprints match. Decisions and deviations:

- **Engine (additive).**
  - `dataCompleteness(applicant, approvedAccounts, opts?)` is pure. `approvedAccounts` takes masks or account
    objects, and all connected accounts when omitted. The components are:
    - a current account, 50, or 20 when almost empty (under 20 transactions a month, or under 3 months);
    - salary credits in an approved account, 20;
    - a card, 15;
    - a loan, 15.

    It returns the spec's shape, plus `scoreOverlay` (0 at ≥ 85%, −10 from the threshold to 84%, null below the
    threshold), a `note` per component and `thresholdLabel`.
  - j1's current account carries `txPerMonth: 46` (FAB savings 3). An account without it counts as regular.
  - Ravi's results:

    | Accounts | Completeness | Result |
    |---|---|---|
    | All four | 100% | 2 banks · 4 accounts · 12 months |
    | Card and loan unticked | 70% | Ask: Credit cards, Loan accounts |
    | Current unticked | 30% | Ask: Salary account |
    | A non-salary current account only | 50% | — |
    | Almost-empty current only | 20% | — |
  - `completenessThresholdPct` is a personal-loan param: 70, bounds [50, 90], 4-eyes publish. The policy console shows
    it as "illustrative".
  - `prequalify(applicant, consents, opts?)`:
    - With `opts.approvedAccounts` below the threshold, it returns `{productId, status:'NEEDS_DATA', completeness,
      ask, eligible:null, note, sources}`. That is pure: no record, no clock tick.
    - At or above the threshold it returns the unchanged range, plus `status:'OK'` and `completeness`.
    - Without opts its output is byte-identical.
    - The estimate band is never lowered by completeness: only `decide()` applies the overlay.
  - `decide()` takes `dataSources: {approvedAccounts, months}`. It is personal loan only and needs Open Finance consent.
    - The overlay "Data completeness 70–84%" (−10) enters `loanScore`. At 70%, Ravi scores 727, still grade B, with the
      same mid-band rate, amounts and AED 1,311.70.
    - The memo factor reads "Part of the financial picture not connected".
    - POL_DATA_COMPLETENESS is PASS at or above the threshold. Below it the result is REFER with RC_DATA_INCOMPLETE
      (EN + AR), placed with the v2.16 codes.
    - Other additions: `record.dataCompleteness` (internal, threshold and components included), the feature
      dataCompletenessPct and a DATA_COMPLETENESS audit line.
    - **Interpretation:** the backstop REFER keeps the score on the internal record and the price unchanged. "No score
      is issued" is enforced in the journey (NEEDS_DATA), where the spec places it.
  - **Memo:**
    - `dataCompleteness: {pct, banks, accounts, months}` is placed before `consents`, and appears only when the
      decision had dataSources.
    - The sharing list gains one line.
    - The SFTP row gains `data_completeness_pct` and `data_sources` ("2 banks · 4 accounts · 12 months"). Other memos'
      keys and SFTP header are unchanged.
  - Selftest group 24 (49 checks): every case in the spec's test list. The privacy scan flags completeness-internal keys
    and words (threshold, weights, bands, "illustrative") in memos of records with completeness. `forbiddenKeys()` now
    accepts `memo.dataCompleteness.banks` and `.accounts` when they are counts. That is the only existing helper relaxed.
- **Journey.**
  - "Your data" (`#jr-data`) appears at 6·0, 7·2 (under the budget summary, above the v2.16 ID rows) and 7·3. It shows a
    blue bar with a thin red line at the threshold, the percentage, "2 banks · 4 accounts · 12 months" and the checklist.
    Everything comes from `Journey.approvedAccounts()`, so unticking in a bank's app is reflected.
  - At 7·3, `prequalify()` runs on the approved accounts, and again when they change.
    - At or above the threshold, "Based on {pct}% complete data · {banks} · {accounts}" sits under the range.
    - Below it, 7·3 (and 8·0 / 8·2) becomes "Almost there", with the missing-only chips, "No score yet and nothing
      recorded…" and the CTA "Connect another account" → 4·0. botim gets no "prequalified" event.
  - Behind the scenes, from step 6 once connected, the "Two steps to a score" panel shows:
    - the bar with the 70% line, the counts and threshold, the component table and the rule line;
    - step 2, the score: before decide() what will run, after it this decision's NoorScore, DBR, free cash flow and
      rule, with monitoring;
    - the proxy line;
    - the "Current account only (no salary)" what-if (50%, pure).

    At 7·3 below the threshold the step copy explains NEEDS_DATA.
  - The flow-map header note gains "· data completeness {pct}%" through a new optional `note` on FlowMap.
  - decide() passes `dataSources`.
  - The Lender view shows a conic-gradient ring with the percentage and the counts, without the threshold.
  - The Decision log shows the internal line, with the threshold, and the component table.
- **Changed existing acceptance checks:** only v2.13's decide() call regex (shared with v2.16) and the v2.16 section's
  placement check, which now allows "Your data" between the budget summary and the ID rows.
- **Open point:** the Lender view's NoorScore scale line (v2.5) still lists the band boundaries ("Excellent ≥ 740 …").
  The revised spec says risk-band boundaries stay inside Noor. This build does not change that line; it is left for
  the v2.18 lender-view work.
- The Noor skin `<style>` block is byte-identical; the v2.17 CSS sits at the end of "Noor additions".

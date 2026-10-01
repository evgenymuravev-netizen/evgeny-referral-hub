# Noor pivot — Contract Addendum v2.0 (supersedes Shari'ah-specific parts of v1.x)

The prototype is being repurposed from **Mal Bank (Shari'ah-compliant, retail + SME)** to
**Noor (noor finance) — a conventional B2C (consumer) fintech in the UAE**. Read CONTRACT.md for
the architecture and API conventions; THIS file overrides it wherever they conflict.

## Who Noor is (from the brand book — use this voice)

- "noor finance". Noor means "light" in Arabic. Positioning: **"a reliable, calm, self-assured
  fintech"** — "the person we're building for already has four banking apps shouting at them; we're
  not going to be the fifth one shouting." Tagline: **"Noor for your better financial sleep."**
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

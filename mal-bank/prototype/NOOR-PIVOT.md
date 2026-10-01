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

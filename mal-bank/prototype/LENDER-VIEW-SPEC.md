# Addendum v2.5 — Lender view (credit memos) separate from the internal Decision log — binding spec

Source: product decision from Noor + meeting notes (1 Oct 2026, NoorScore / lender partnership): a Tier-3
bank is the **lender of record**; Noor/Mizan decides and sends the lender a **credit memo**. "Cannot share
raw open finance or personal data externally; ranges/aggregates only." The existing **Decision log is
Noor's internal view** (CBUAE audit trail, troubleshooting) and must never be shown to a lender.

## 1. Two views, two audiences

| | Decision log (existing) | **Lender view (new tab)** |
|---|---|---|
| Audience | Noor credit/risk/ops only | The lender of record (partner bank) |
| Contains | Everything: Open Finance data, features, every rule with observed values, statements, audit trail | A **credit memo**: outcome, terms, NoorScore, reason codes, affordability as **bands**, verification **flags**, consent **references** |
| Delivery | Internal UI only | UI · **API** (JSON) · **SFTP** (CSV) |
| Label | Banner: "Internal — CBUAE audit & troubleshooting. Contains customer data from Open Finance. Never shared with lenders." | Banner: "What the lender receives. Built from an allowlist — Open Finance data is never shared, only ranges and verification flags." |

Rename the nav item to **"Decision log"** with sub "Internal · audit & troubleshooting", and add a new nav
item right after it: **"Lender view"**, sub "Credit memos · shareable", `data-screen="lender"`.

## 2. NoorScore (name the score the lender receives)

The score Mizan already computes for each decision (scorecard points = base + overlays) is presented as
**NoorScore** everywhere (internal views keep the breakdown). Bands: ≥ 740 "Excellent", 680–739 "Very
good", 620–679 "Good", 560–619 "Fair", < 560 "Poor" (mirror the existing A–E grade cut-offs; keep grade
letters internally). Internal breakdown copy: "NoorScore = bureau score (AECB, or cash-flow proxy for a
thin file) + factor adjustments" — list each factor with its points. The lender sees NoorScore value,
band, and up to 3 **factor directions** in plain words ("Strong free cash flow", "Stable income", "Long
connected history") — **no factor values derived from Open Finance**.

## 3. Engine — `creditMemo(decisionId, {lenderId})`

Pure function; builds the memo from an **allowlist** (never by deleting fields from the record).
```js
{ memoId:'CM-<decision id>', noorRef, lenderId, lenderName:'Partner bank (lender of record)', createdAt,
  product:{ productId, nameEn }, policyVersion, engineVersion,
  borrower:{ name, emiratesIdMasked:'784-••••-•••••••-4', kycSource:'UAE PASS (onboarding)' },
  decision:{ outcome, reasonCodes:[{code, en, ar}], validUntil },
  terms:{ amount, tenorMonths|planMonths, apr|aprEquivalent|monthlyFeeRate, monthlyPayment,
          totalRepayable, repaymentMethod, coolingOffDays:5 },
  noorScore:{ value, band, factors:[ 'Strong free cash flow', ... ] },
  affordability:{ incomeBand:'AED 30,000–40,000 / month', dbrBand:'< 20%', freeCashFlowBand:'AED 5,000+ / month',
                  instalmentToCashFlowBand:'< 25%', incomeVerifiedVia:'Open Finance (Al Tareq), 12 months' },
  bureau:{ aecbChecked:true, aecbScoreBand:'750–799' | 'No file', delinquencyFlag:'None' | 'DPD90 in history',
           chequeReturnsFlag },
  verification:{ identity:'Verified (UAE PASS)', homeStatements:'6 of 6 months verified · conduct clean' | null,
                 purchaseVerified: 'Education — verified purchase' | null /* category only */ },
  consents:[{ type, grantedAt, reference }] /* references only, never content */,
  sharing:{ shared:[groups], withheld:[{ group, reason }] } }
```
Bands: income in AED 5,000 steps (AED 10,000 steps above 20,000); DBR < 20 / 20–35 / 35–50 / > 50 %;
FCF < 1,000 / 1,000–2,999 / 3,000–4,999 / 5,000+; AECB score bands of 50 points.
**Withheld (always), each with a reason shown to the user:** transactions and merchant names (category
only); account names, banks and identifiers; exact income, spending, balances, free cash flow; salary
dates; home-country statement figures, banks and file names; footprint/vendor raw data; Arabic name
transliterations are fine (KYC), raw contact details are not. Reason text: "Open Finance data is shared
with Noor for this purpose only and cannot be passed on (customer consent scope, CBUAE Open Finance
framework, PDPL)".
`memoApiPayload(memo)` → the same object (JSON); `memoSftpRow(memo)` → `{ header:[...], row:[...] }`
flat CSV (memo_id, noor_ref, product, outcome, amount, tenor, apr_or_fee, monthly_payment,
repayment_method, noorscore, noorscore_band, income_band, dbr_band, aecb_band, reason_codes, created_at).
Memos exist for every decided record (APPROVE, REFER, DECLINE).
Lender-sharing consent: add one line to every consent step — "By applying you agree Noor shares your
application result (not your bank data) with the lender of record" — and record it as consent type
`shareWithLender` automatically on decide().

**Selftest (privacy is the point):** for every persona decision, recursively scan the memo JSON and the
SFTP row and assert none of these appear: the exact avgMonthlyIncome / avgMonthlySpend / any monthlyIncome
or monthlySpend element / avgBalance / obligations amounts / free cash flow exact value; any bank label
(ENBD, FAB, HDFC, SBI, HBL, CIB, State Bank…) ; merchant names; statement file names; the words
"transactions". Assert presence of outcome, NoorScore + band, reason codes with Arabic, the bands, and
consent references. Assert bands are correct: c1's income band is 'AED 30,000–40,000' (its range covers 32,000 — the exact figure itself must not appear), and r3's DBR band matches its dbrPct.

## 4. UI

- **Lender view screen**: left — memo list (session decisions, newest first; product, outcome chip,
  NoorScore, amount, created); right — the memo rendered as a clean one-page document (Noor-styled
  "credit memo" card: header, outcome & terms, NoorScore with band, affordability bands, bureau & verification
  flags, reason codes EN + AR, consent references), then a **"Shared vs withheld"** panel (two columns;
  withheld items with their reason), then **Delivery** tabs: UI (this) · API (pretty JSON, copy button) ·
  SFTP (CSV header + row in a mono block, copy button). Empty state: "Decide an application in any journey —
  its credit memo appears here."
- **Decision log**: internal banner as above; add a "Open the lender's version →" link per record that
  jumps to its memo in Lender view (so troubleshooting can compare what the lender saw).
- Overview: topic-map row + demo strip mention ("Lender view — the credit memo the partner bank receives;
  Open Finance data never leaves Noor").
- Acceptance: lender view lists decided records; memo for c1 shows NoorScore + band, income band, no
  "32,000"/"19,000"/merchant/bank names/"FAB"; API tab JSON parses and matches; SFTP row has the header
  columns; decision log shows the internal banner and the link opens the memo; zero page errors.

# Addendum v2.19 — Reason-code library: three colours, Noor standard codes, partner-requested codes — binding spec

Source: Noor product request (13 Oct 2026):

> Reason codes — we should have a library of reason codes + we can create new reason codes based on partner
> request.
> Green: Detected Additional Income · Saver · Dining Out Lover.
> Yellow: New to UAE · 3M History Shared.
> Red: Fraud Suspicious.
> You can expand exact codes and add more, but keep only three colours.

## 1. One library, three colours

`MizanData.reasonCodeLibrary` is the **only** vocabulary a lender ever sees.

**It replaces:**
- the v2.18 `findings` (FND_*);
- the lender-facing use of the engine's RC_* codes. The memo, the SFTP row and the Lender view show library
  codes only. That settles the open question about RC_* names such as "RC_STATEMENTS_USED" reaching
  partners.

**The customer is unaffected.** They still see the existing RC_* adverse-action reasons in EN + AR, as CBUAE
disclosure requires, and the decision record keeps them.

**There are exactly three colours:**

| Colour | Meaning |
|---|---|
| **GREEN** | positive |
| **YELLOW** | caution |
| **RED** | adverse |

No fourth colour, and no amber: rename "amber" to **yellow** wherever the v2.18 component bars use it. The
Newcomer bar's neutral "not applicable" state stays, because it is a component, not a code.

**Each entry has:**

```
{ code, colour:'GREEN'|'YELLOW'|'RED', labelEn, labelAr, tells (what it tells the lender, one line),
  component:'FRAUD_INTEGRITY'|'NEWCOMER'|'STACKING_SKIP'|'CREDIT_BEHAVIOUR'|'AFFORDABILITY'|'DATA'|'MONITORING',
  source:'NOOR_STANDARD'|'PARTNER_REQUEST', requestedBy:lenderId|null, status:'ACTIVE'|'PROPOSED'|'RETIRED',
  version, ruleRef }
```

`ruleRef` points to the internal rule. The rule itself stays inside Noor, per "Noor IP vs lender view".

**Label rules** (selftest them):
- Title Case, as the request writes them.
- No data-source names except Open Finance.
- No thresholds, numbers of points or weights. Month counts in history codes ("3M", "12M+") are findings, not
  thresholds, so they're fine.
- Never nationality, sex, religion, health, family status or politics.

## 2. The standard library

The request's six codes are kept verbatim. The rest are additions for you to review: the "Fires when" column
is internal and illustrative.

**GREEN**

| Code | Label | Fires when (internal, illustrative) | Replaces |
|---|---|---|---|
| G01 | **Detected Additional Income** | verified regular non-salary income, or variable pay ≥ AED 1,000 a month | FND_ADDITIONAL_INCOME |
| G02 | **Saver** | savings ≥ 1 month of spending, or regular transfers to savings | FND_SAVER |
| G03 | **Dining Out Lover** | dining ≥ 20% of spending | FND_DINING_OUT |
| G04 | Stable Income | income volatility ≤ 10% | FND_STABLE_INCOME |
| G05 | Pays Cards and Loans on Time | repayments seen on time, no delinquency or returned cheque | FND_ON_TIME_PAYER |
| G06 | 12M+ History Shared | ≥ 12 months of connected history | FND_DATA_HISTORY (≥ 12) |
| G07 | Salary Verified | salary credits seen in connected accounts | |
| G08 | Employer Confirmed | ID employer = salary payer (v2.16) | |
| G09 | Low Debt Burden | DBR after the loan < 30% | |
| G10 | Settled in UAE | ≥ 24 months in the UAE, plus anchors | |
| G11 | Full Financial Picture | data completeness ≥ 85% | |

**YELLOW**

| Code | Label | Fires when (internal, illustrative) | Maps the customer RC |
|---|---|---|---|
| Y01 | **New to UAE** | < 12 months of UAE financial footprint | FND_NEW_TO_UAE |
| Y02 | **3M History Shared** | 3–5 months of connected history | |
| Y03 | 6M History Shared | 6–11 months | |
| Y04 | Thin Credit File | AECB no-hit or thin file | RC_THIN_FILE |
| Y05 | Irregular Income | income volatility > 20% | RC_INCOME_VOLATILITY |
| Y06 | High Debt Burden | DBR after the loan 40–50% | |
| Y07 | Partial Financial Picture | completeness 70–84% | |
| Y08 | Home-Country Obligations | EMIs seen in home-country evidence | |
| Y09 | Amount Adjusted to Fit | the approved amount is below the request | RC_LIMIT_REDUCED, RC_LTV_CAP, RC_RETIREE_CAP |
| Y10 | Term Adjusted to Rules | the tenor was clamped | RC_TENOR_CAP |
| Y11 | Employer Differs From ID | employer mismatch | RC_EMPLOYER_MISMATCH |
| Y12 | ID Renewal Needed | the ID has expired | RC_ID_EXPIRED |
| Y13 | More Data Needed | below the completeness threshold | RC_DATA_INCOMPLETE |
| Y14 | Additional Evidence Used | home-country evidence used | RC_CROSS_BORDER, RC_STATEMENTS_USED, the upgrade codes |

**RED**

| Code | Label | Fires when (internal, illustrative) | Maps the customer RC |
|---|---|---|---|
| R01 | **Fraud Suspicious** | a statement-integrity FAIL, ID name ≠ account holder, or other integrity failures | RC_STATEMENTS_INTEGRITY and the integrity codes |
| R02 | Recent Changes in Account Activity | any v2.9 origination red flag | RC_RED_FLAGS_REVIEW |
| R03 | Past-Due History | DPD90 or a write-off | RC_DELINQUENCY |
| R04 | Returned Cheques | over tolerance | RC_CHEQUE_RETURNS |
| R05 | Debt Burden Over Limit | DBR cap exceeded | RC_DBR_EXCEEDED |
| R06 | Weak Credit Profile | below the score cut-off | RC_SCORE_LOW |
| R07 | Cash Flow Too Tight | free cash flow is insufficient | RC_FREE_CASH_FLOW |
| R08 | Outside Product Eligibility | age, salary floor, UAE tenure, the vehicle and similar | RC_AGE, RC_SALARY_FLOOR, … |
| R09 | Late Repayment on Noor Credit | starter repaid late | RC_STARTER_LATE |

**Every RC_* the engine can emit must map to exactly one library code.** The selftest iterates all of them.
The mapping table lives in the engine.

**Ravi's codes:** G02 Saver · G03 Dining Out Lover · G04 Stable Income · G05 Pays Cards and Loans on Time ·
G06 12M+ History Shared · G07 Salary Verified · G08 Employer Confirmed · G09 Low Debt Burden (DBR 18.4%) ·
G10 Settled in UAE · G11 Full Financial Picture. No yellow or red.

**Other personas:**
- a1 (car loan): G01 Detected Additional Income, plus Y09 Amount Adjusted to Fit on the documents path.
- r6: R02.
- A newcomer: Y01.
- A short-history case: Y02.
- A statements integrity FAIL: R01.

## 3. Partner-requested codes

**Engine** (pure, except the library store):
- `proposeReasonCode({ requestedBy, colour, labelEn, labelAr, tells, component, rule:{ metric, op, value } }, { author })`
  creates a **PROPOSED** code `PR-<LENDERSHORT>-<colour letter><nn>`, e.g. `PR-PB-G01`.
- `approveReasonCode(code, { approver })` applies **4-eyes**: the approver must differ from the author. It makes
  the code ACTIVE and adds it to the requesting lender's sharing agreement (versioned: Partner Bank v1 → v2).
- `retireReasonCode(code, { author, approver })`.
- `reasonCodeLibrary()` returns the library.
- `libraryCodesFor(rec, lenderId)` returns the codes that fire for that decision and that lender: the standard
  codes in the agreement, plus that lender's ACTIVE partner codes.

**The rule builder is safe by construction.** `metric` must come from a **whitelist** of engine features:
- monthsHistory
- completenessPct
- dbrPct
- fcfMonthly
- incomeVolatilityPct
- savingsMonths
- diningSharePct
- additionalIncomeMonthly
- salaryViaWps
- monthsInUae
- onTimeRepayments
- redFlagCount
- aecbHit
- approvedAmount
- tenorMonths

`op` is one of ≥, ≤, = and `value` is typed. Proposing any other metric throws: nationality, sex, age, religion,
health, family, any free text. The colour must be one of the three. The labels follow the §1 label rules.

**Seeded partner codes:**
- `PR-PB-G01` **Salary Through WPS** (GREEN, requested by Partner Bank, ACTIVE): fires when the salary arrives
  through WPS. It fires for Ravi, whose payer string is "SALARY/WPS …".
- `PR-LB-Y01` **Variable Pay Above 30%** (YELLOW, requested by Lender B, **PROPOSED**, awaiting 4-eyes), to
  demonstrate the workflow.

## 4. UI

**Policy console: a new block "Reason-code library"**, internal, next to the shared Early-warning block:
- **Three groups:** Green · Yellow · Red. Each row shows the coloured code chip, the label EN + AR, what it
  tells the lender, the component, the source (Noor standard / Partner request: Partner Bank), the status, the
  partners receiving it, and the internal rule (marked "inside Noor").
- **A "New code — partner request" form:**
  - partner select;
  - colour radio with exactly three options;
  - label EN, label AR, what it tells the lender;
  - component;
  - rule: metric select from the whitelist, op, value;
  - author;
  - Propose.

  Validation errors render inline.
- **On a PROPOSED row:** "Approve (4-eyes)" with an approver field. On approval, the agreement version line
  updates ("Partner Bank v2 — adds PR-PB-G02").
- **"Retire"** on ACTIVE partner codes.

**Lender view:**
- The memo's "Reason codes" row and the codes section show **coloured chips with the code id + label**: green,
  yellow or red, using `--ok`, the existing warn/yellow tokens and `--bad`. Add a small legend "Green ·
  Yellow · Red".
- Partner codes show only in that partner's memo. Switching to Lender B hides `PR-PB-G01`.
- The SFTP `reason_codes` column carries the library codes, e.g. `G02|G03|…|PR-PB-G01`.
- **No RC_* names anywhere lender-facing.** Scan for `RC_` and `FND_` in every memo and SFTP row.

**Decision log (internal):**
- the library codes that fired, with their internal rule;
- the customer RC_* reasons beside them, with the mapping ("RC_LIMIT_REDUCED → Y09").

**Component bars:** amber becomes yellow.

**Journey behind the scenes, step 10:** "Partner Bank receives: G02 Saver · G03 Dining Out Lover · …" as
coloured chips.

## 5. Tests

**Selftest:**
- the library has exactly three colours;
- the request's six labels are verbatim with the right colours;
- every engine RC_* maps to exactly one code;
- label hygiene;
- Ravi's set as in §2, and the other personas' codes;
- partner codes:
  - propose → PROPOSED → approve with the same author throws → a different approver makes it ACTIVE and bumps
    the agreement version;
  - the new code fires in that lender's memo only;
  - a forbidden metric (nationality, age) throws;
  - a fourth colour throws;
  - retire works;
- memos and SFTP rows carry no `RC_` or `FND_` and no rule text;
- the fingerprints are unchanged.

**Browser acceptance:**
- the library block shows three groups and the seeded partner codes;
- propose a new code (Partner Bank, GREEN, "Strong Savings Buffer", savingsMonths ≥ 1) → PROPOSED → approve as
  the same person is blocked inline → approve as another person → ACTIVE, and it fires in Ravi's Partner Bank
  memo (savings 1.33 months), not in Lender B's;
- the memo chips are coloured, with the legend;
- no `RC_` in the Lender view;
- the bars use yellow;
- update existing checks that expected FND_* or RC_* in lender-facing output, and list them;
- 390px; zero page errors; light and dark themes.

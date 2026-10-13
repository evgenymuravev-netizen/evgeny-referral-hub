# Addendum v2.9 — UAE red flags and early warning (exit-risk watch) — binding spec

Source: Noor board meeting, 2 Oct 2026. The owner's notes list red flags that UAE banks aren't tracking
today:
- the customer **buys tickets to the home country after taking a loan**;
- the customer **sends most of his money outside the UAE**;
- the customer **has used up all credit-card limits**;
- a previously regular payer **suddenly stops**.

The UAE is about 88% expatriate, so "exit risk" (a borrower leaving the country with the debt) is a real
credit risk. Open Finance makes these signals visible in the customer's own accounts, day zero.

## 0. Guardrails (they are the product)

The flags are behavioural changes against the customer's **own** baseline. They are never attributes of
who the customer is.

- **Never inputs:** nationality, the destination country of a transfer or a trip, religion, or any
  service name. The engine sees "international transfer" and "airline purchase", nothing about where.
- **Sending money home at the customer's usual level is never a flag.** Only a *surge* against their own
  6-month baseline is.
- **Travel alone is never actioned.** People fly home for holidays. It only counts in combination.
- **Origination:** a red flag can only **REFER** to an underwriter. Never an automatic DECLINE, never a
  price change.
- **Monitoring:** actions start with contacting the customer. No automatic default, legal step or
  account action follows from signals alone.
- **Every flag has a reason code in EN + Arabic** and a plain explanation the analyst can read to the
  customer.
- **Consent scope:** the Al Tareq consent covers monitoring while a loan is open. v2.8 updates the "why"
  line in the journey. This spec assumes that wording and cites it in the UI.
- **Governance:** before LIVE, a disparate-impact test across customer groups is run offline (group
  labels are used only for the test, never as features). Cite the CBUAE AI/ML guidance (Feb 2026), the
  Consumer Protection Regulation (fair treatment, collections conduct) and PDPL purpose limitation.
- **The lender of record** (Partner Bank) receives at most a status flag ("Early warning: elevated —
  Noor is in contact with the customer"), never the transactions or the signals' values.

## 1. Engine (additive): `redFlags(subject, opts)`, pure

**Input:** `subject.redFlagData` with:
- `baseline`:
  `{ intlTransfersShareOfIncome6m, salaryCreditDay, avgBalance3m, cardUtilisationPct3mAgo, onTimePaymentsRun }`
- `recent` (last 30 days unless stated):
  `{ incomeAed, intlTransfersAed, airlinePurchases:[{ daysAfterDisbursal|null, amountAed }], salaryLateDays,
  balanceNowAed, largestOutboundTransferAed, missedCollection:bool }`
- `aecb`: `{ cards, cardLimitTotal, cardBalanceTotal }`
- `opts`: `{ phase:'ORIGINATION'|'MONITORING' }`

**Signals** (thresholds are policy params on a new shared `earlyWarning` policy block, shown in the
policy console with 4-eyes like the rest):

| Code | Fires when | Severity alone |
|---|---|---|
| `RF_CARDS_MAXED` | total utilisation ≥ 90% across ≥ 2 cards **and** up ≥ 30 pp vs 3 months ago ("took all limits recently") | MEDIUM |
| `RF_REMITTANCE_SURGE` | 30-day international transfers ≥ 80% of income **and** ≥ 2× the customer's own 6-month share | MEDIUM |
| `RF_TRAVEL_AFTER_DISBURSAL` | airline purchase ≥ AED 1,000 within 30 days after disbursal (monitoring only) | LOW (watch) |
| `RF_PAYMENTS_STOPPED` | salary ≥ 7 days late vs its established day, **or** a missed collection after a run of ≥ 3 on time | MEDIUM |
| `RF_BALANCES_DRAINED` | balances down ≥ 80% vs the 3-month average **and** one outbound transfer ≥ 50% of that average | MEDIUM |

- **Pattern `EXIT_RISK` → HIGH:** RF_TRAVEL_AFTER_DISBURSAL **and** (RF_REMITTANCE_SURGE **or**
  RF_BALANCES_DRAINED) **and** (RF_PAYMENTS_STOPPED **or** RF_CARDS_MAXED).
- **Other combinations:** two or more MEDIUM signals → MEDIUM+ (sooner contact).
- **Output:**
  `{ severity:'NONE'|'LOW'|'MEDIUM'|'HIGH', pattern:'EXIT_RISK'|null, flags:[{ code, observed, baseline, threshold, en, ar }], action:{ code, en, slaHours }, guardrailNotes:[…] }`

**Action ladder:**
- **LOW:** WATCH, no customer contact.
- **MEDIUM:** CHECK_IN, same day. A message on the customer's chosen channel, offering a payment-date
  move or a restructure.
- **HIGH:** SPECIALIST_CALL within 24 hours.
  - New credit is paused: split capacity, limit increases, upgrade offers.
  - The lender of record gets a status flag only.
  - No default or legal step.

**Origination:**
- `decide()` for personal_loan, car_loan and split evaluates `redFlags(applicant, {phase:'ORIGINATION'})`
  when the applicant has `redFlagData` and Open Finance is consented.
- New rule `POL_RED_FLAGS`, REFER-only. It REFERs when RF_CARDS_MAXED or RF_REMITTANCE_SURGE or
  RF_BALANCES_DRAINED fire, with reason code `RC_RED_FLAGS_REVIEW`: "Recent changes in your account
  activity need a quick review by our team" / Arabic.
- The signal codes sit on the record as features.
- Existing personas have no `redFlagData`, so every existing outcome is unchanged. Assert this.

**Monitoring:**
- `earlyWarningScan()` runs `redFlags(..., {phase:'MONITORING'})` over `MizanData.monitoredLoans`.
- It is pure and deterministic.
- It returns one row per loan with the severity, pattern, flags and action, sorted HIGH → NONE.

**New reason codes (EN + Arabic):** RC_RED_FLAGS_REVIEW plus one per RF_* code, in customer-safe wording.

## 2. Data

**Persona r6, personal loan, appended to `personasLoan`:** Marco Ferreira (ماركو فيريرا), 34, 24 months in
the UAE, sales executive, salary 14,000, tenure 20 months.

- AECB: hit, score 694, obligations 2,100/mo, 3 cards, cardLimitTotal 60,000, cardBalanceTotal 58,200
  (97%), cardUtilisationPct3mAgo 41.
- A `connected` block (Open Finance): income 14,000, spending 6,900, 12 months.
- `redFlagData`:
  - baseline: intlTransfersShareOfIncome6m 0.22, avgBalance3m 11,600;
  - recent: intlTransfersAed 12,400 (89% of income), balanceNowAed 1,850, largestOutboundTransferAed
    7,000, salaryLateDays 0.
- Requests 40,000 over 24 months.
- **Expected:**
  - Without the red-flag rule: APPROVE 40,000 (grade B).
  - With it: **REFER** with RC_RED_FLAGS_REVIEW. The flags are RF_CARDS_MAXED (41% → 97%),
    RF_REMITTANCE_SURGE (89% vs 22% usual) and RF_BALANCES_DRAINED (−84%).
- The selftest computes both by toggling a policy param `redFlagsAtOrigination: true|false`.
- If any count assertion assumes 5 loan personas, update it. Keep every existing persona's outcome.

**`MizanData.monitoredLoans` (6 funded loans, synthetic):**

| Loan | Signals | Expected severity |
|---|---|---|
| ML-01 | airline AED 2,450 nine days after disbursal + transfers 85% of income vs 20% usual + balances −91% (one outbound ≥ 50% of average) + salary 10 days late | **HIGH · EXIT_RISK** |
| ML-02 | salary 8 days late only | MEDIUM · check-in, offer date move |
| ML-03 | cards 38% → 96% after disbursal | MEDIUM |
| ML-04 | airline AED 1,900 twenty days after disbursal, nothing else (a holiday trip) | LOW · watch, no contact |
| ML-05 | sends 35% of income home every month, the same as their 6-month baseline | **NONE**; the guardrail demo |
| ML-06 | transfers 3× the usual share in 30 days (≥ 80% of income) | MEDIUM |

Use varied names that don't stereotype any group, and don't attach a nationality to any row.

## 3. UI

**Monitoring screen.** Keep the existing "Early warning — day zero" table. Add a new panel above it,
**"UAE red flags — exit-risk watch"**:
- **Rows:** severity chip, customer, product, the flags as chips (with observed vs baseline), the
  pattern, the action and SLA.
- **Expanding a row** shows the guardrail note and the reason codes in EN + Arabic.
- **Header tiles:** HIGH / MEDIUM / LOW / NONE counts.
- **Policy line:** "Signals are changes against the customer's own history. Sending money home at the
  usual level, or travelling, is never a flag on its own."
- **ML-05 row:** shows explicitly "No flag — sending money home at the usual level (35%, baseline 35%)".

**Personal loan screen.** r6 is selectable like the other personas. The decision shows REFER with the
red-flag rule and the flags. A small "What tripped" panel shows observed vs baseline per flag, with the
REFER-only guardrail stated.

**Workbench.** r6's REFER appears in the queue with the reason "Red flags — review". The case view gets a
"Red flags" panel (the same content) and the analyst actions:
- "Ask the customer" (records a note; the customer message uses the EN/AR reason);
- "Approve" and "Decline", through the existing override mechanism with a mandatory reason.

**Policy console.** A shared **Early warning** block lists the thresholds (editable under 4-eyes) and the
guardrails (locked, shown as text).

**Overview.** A topic-map row and a demo-strip step: "Red flags — Marco (r6): cards maxed in 3 months +
89% of income sent abroad this month → REFER for a human review, never an automatic decline; Monitoring
shows the exit-risk watch."

**Lender view.** r6's memo shows REFER + RC_RED_FLAGS_REVIEW and nothing more. The privacy scan must not
find 12,400, 12,400.00, 1,850, 7,000, 58,200, 60,000 or "airline" in the memo or SFTP row.

## 4. Tests

**Selftest:**
- each RF_* fires exactly at its threshold and not below it;
- the EXIT_RISK pattern requires all three legs: ML-01 is HIGH, and removing travel drops it to MEDIUM+;
- ML-05 → NONE;
- ML-04 → LOW with action WATCH;
- r6 → REFER with the three flags; with the param off → APPROVE 40,000;
- redFlags never reads nationality or country fields: add a `country` field to a test clone, the
  outcome is identical;
- existing outcomes are unchanged;
- the memo privacy scan for r6;
- earlyWarningScan is deterministic and sorted;
- banned vocabulary is clean.

**Browser acceptance:**
- the Monitoring panel shows six rows, ML-01 HIGH first, with the correct counts;
- ML-05's no-flag text is present;
- the r6 decision REFERs with flags on the Personal loan screen;
- the Workbench case shows the red-flags panel, and an analyst approve with reason works;
- the policy console shows the early-warning block;
- the r6 memo is clean;
- zero page errors; 390px works; light and dark themes.

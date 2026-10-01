# Addendum v2.3 — Repayment collection rule (no salary transfer) — binding spec

Product rule from Noor: **Noor never asks the customer to transfer their salary** (not to Noor, not to
any partner wallet). Repayments are collected from the customer's own bank account, and the
collection method is chosen by the **approved amount**:

| Approved amount | Collection method | How it's set up |
|---|---|---|
| **≤ AED 1,000** | **Al Tareq recurring payment** (UAE Open Finance payment initiation) | Customer authorises a recurring payment consent in their banking app via Al Tareq — instant, digital, revocable in the Al Tareq consent dashboard |
| **> AED 1,000** | **Direct debit mandate** (UAE Direct Debit System) | Mandate on the customer's own bank account; must be active before the first collection |

It is a **shared platform rule** (one threshold, every product): salary advance, split (per purchase
plan), personal loan, starter loan, and the upgrade (per selected option). The threshold is AED 1,000
inclusive (1,000 → Al Tareq; 1,000.01+ → direct debit).

## Engine

- Constant `REPAYMENT_ROUTING = { altareqMaxAmount: 1000 }` and `repaymentFor(amount)` →
  `{ method:'ALTAREQ'|'DIRECT_DEBIT', label, setup, threshold:1000, basis:'approved amount' }`.
  Labels: 'Al Tareq recurring payment' / 'Direct debit mandate'. Setup text as in the table.
- Every APPROVE DecisionRecord gets `repayment` computed from the approved amount (split: the approved
  purchase plan amount; upgrade: recomputed on `selectUpgradeOption`; split drawdown results also
  return `repayment` for the new plan). Declines/refers: `repayment:null`.
- **Token conditions** — remove every salary-transfer mention. Replace with the method-specific
  condition: 'Repayment set up via Al Tareq recurring payment consent' or 'Direct debit mandate active
  on the customer's bank account'. Personal loan keeps 'Key Facts Statement acknowledged (AR + EN)' and
  'Credit life & job-loss cover offered (optional)'. Salary advance: 'Repaid in one instalment on the
  next salary date — no salary transfer required'.
- **Execution sequence gains a step** before cooling-off: `OFFER_ACCEPTED → KFS_ACKNOWLEDGED →
  AGREEMENT_SIGNED → REPAYMENT_SET_UP → COOLING_OFF_CLEARED → DISBURSED` (6 steps, all lending
  products incl. starter/upgrade). `execSteps(productId, decisionId?)` returns the REPAYMENT_SET_UP
  label/description for that decision's method ("Al Tareq payment consent authorised" / "Direct debit
  mandate active"). Out-of-order message for disbursing without it: "no disbursement until repayment
  collection is set up".
- Policy console: show a locked **platform rule** row on every product: "Repayment collection: Al Tareq
  ≤ AED 1,000 · direct debit above · no salary transfer" (not editable).
- Banned-term check additionally forbids /salary transfer assignment/i and /transfer (your|their)
  salary to/i in data.js/engine.js (the phrase "no salary transfer required" is allowed).
- Selftest: routing at 999, 1,000 (ALTAREQ) and 1,000.01, 3,000 (DIRECT_DEBIT); every approved persona
  has a `repayment` consistent with its approved amount (e.g. starter AED 1,000 → ALTAREQ; u1 upgrade
  AED 3,000 → DIRECT_DEBIT, and selecting AED 1,000 → ALTAREQ); no token condition mentions salary
  transfer; sequences are now 6 steps (update all existing sequence assertions); DISBURSED before
  REPAYMENT_SET_UP throws.

## UI

- Decision panels (split, personal loan, starter/upgrade, salary advance card): a "Repayment" line —
  method chip + one-line setup text, e.g. "Al Tareq recurring payment — you authorise it once in your
  banking app" / "Direct debit mandate on your bank account". It updates live when the split plan or
  the upgrade option changes the amount across the AED 1,000 line.
- KFS previews: add "Repayment method".
- Execution steps render 6 steps from execSteps() (no hard-coded lists).
- Overview copy: the "An approval is not a loan" position and anywhere the sequence is spelled out
  become "offer → KFS → e-sign → repayment set-up → cooling-off → disbursement".
- Acceptance: update step counts to 6; assert the repayment line shows Al Tareq for a ≤ 1,000 case and
  Direct debit for a > 1,000 case, and switches live when the upgrade amount slider crosses 1,000;
  assert no visible text contains "salary transfer" except "no salary transfer required".

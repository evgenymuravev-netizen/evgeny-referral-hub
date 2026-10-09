# Addendum v2.17 (revised 9 Oct) — Two steps to a score: data completeness first, then the score — binding spec

**Sources:**
- Noor product request (8 Oct 2026): "focus in the journey on the data completeness and therefore confidence
  from our side as the proxy; show how many data sources he provided, like how many bank accounts".
- The NoorScore methodology slide "Two steps to a score" (9 Oct).
- The 8 Oct meeting "Open Finance credit scoring and Botim partnership journey":
  - the score reflects data completeness: low data means a lower score, not just a flag;
  - a minimum amount of data is needed before any score;
  - prompt the user to add more accounts when completeness is low;
  - the lender sees completeness as a circular indicator.

**This replaces the first v2.17 draft.** That draft scored identity, contact and bureau as completeness and
referred anything below 60. Identity checks (Emirates ID, email, phone) are **verification**, not
completeness: they stay as v2.14 and v2.16 built them.

## 1. The model (engine, additive): `dataCompleteness(applicant, approvedAccounts)`

**Step 1 — data completeness, 0–100%.** How full is the customer's financial data? An almost empty account,
or a salary and many retail transactions we can actually calculate on? It is measured from what the customer
connected through Open Finance:

| Component | Weight | Counts when |
|---|---|---|
| Current account | 50% | a connected current account with ≥ 3 months of regular activity (≥ 20 transactions a month). An almost-empty current account counts 20%. |
| Salary account | 20% | salary credits are visible in a connected account. The current account counts if the salary lands there. |
| Credit cards | 15% | at least one credit card connected |
| Loan accounts | 15% | at least one loan connected (personal or car loan) |

- **Threshold:** `completenessThresholdPct`, default **70**, labelled "illustrative". It is a new
  personal-loan policy param, bounds [50, 90], editable in the policy console under 4-eyes.
- **Below the threshold, no score is issued and the customer is asked to act:** add accounts for better
  visibility, starting with the salary account, credit cards and loans.
- **At or above the threshold, Mizan scores (step 2).**
- **Low data lowers the score, not only a flag** (illustrative). Completeness becomes a NoorScore overlay when
  `dataSources` is given:
  - ≥ 85% → 0;
  - 70–84% → −10 points.

**Output:**

```
{ pct, threshold, aboveThreshold, components:[{ key, label, weight, have, points }],
  ask:[ 'Salary account', 'Credit cards', 'Loan accounts' ] (only the missing ones, in that order),
  counts:{ banks, accounts, months } }
```

**Ravi:**

| Accounts approved | Completeness | Result |
|---|---|---|
| ENBD current (his salary account) + card + loan, FAB savings | **100%** (50 + 20 + 15 + 15) | scored, overlay 0, NoorScore 737; counts 2 banks · 4 accounts · 12 months; savings adds visibility but no points |
| card and loan unticked at 5·1 | **70%**, at the threshold | scored, overlay −10 → NoorScore **727** (still grade B, same price band and amounts); ask: Credit cards, Loan accounts |
| ENBD current unticked (card, loan and FAB savings kept) | **30%** (salary seen only in the current account, so 0 + 0 + 15 + 15) | below the threshold, no score; ask: Salary account first |

The deck's example **"current account only: 50%"** is a what-if: a non-salary current account alone gives
50%, with ask Salary account, Credit cards, Loan accounts.

**`prequalify()`** takes the approved accounts. Below the threshold it returns
`{ status:'NEEDS_DATA', completeness, ask }` instead of a range: no record, no AECB.

**`decide()`** accepts `application.dataSources` (the approved accounts and months). It records
`record.dataCompleteness`, adds a `DATA_COMPLETENESS` audit line, and adds rule `POL_DATA_COMPLETENESS`:
- PASS at or above the threshold;
- below it → **REFER** with RC_DATA_INCOMPLETE. This is a backstop: the journey normally asks the customer
  first. Never a decline, never a price change.
- New reason code RC_DATA_INCOMPLETE (EN + Arabic): "We need a fuller picture before we can calculate your
  score — connecting your salary account, credit cards and loans usually does it."

**Without `dataSources`, nothing changes:** no record field, no rule, no overlay. Every other screen and
persona is unchanged; the v2.9 fingerprints must match.

## 2. Journey UI

**"Your data", customer side.** A card with:
- a completeness bar and a thin threshold marker at 70%, in the deck's look: a filled bar plus a red
  threshold line;
- the percentage;
- the counts "2 banks · 4 accounts · 12 months";
- the component checklist (Current account ✓ · Salary account ✓ · Credit cards ✓ · Loan accounts ✓).

It appears at 6·0 (back from the banks), at 7·2 (the budget view) and at 7·3:
- **At or above the threshold,** the pre-qualified screen adds "Based on {pct}% complete data · 2 banks ·
  4 accounts".
- **Below the threshold,** 7·3 becomes **"Almost there"**: "Add your salary account, credit cards and loans so
  we can calculate your score", with the deck's chips (Salary account · Credit cards · Loan accounts, only
  the missing ones). The CTA "Connect another account" returns to step 4. No range is shown and no score is
  issued.
- **Copy** is factual and calm, with no promise of a better price.

**"Two steps to a score", behind the scenes.** A panel from step 6 onwards:
- **Step 1, data completeness:** the bar with the 70% line, the component table, and the line "Below the
  threshold: the customer is asked to act. Above: we score."
- **Step 2, the score itself:** NoorScore, with affordability aggregates (DBR, free cash flow) and monitoring
  alongside. Show what this decision has.
- **The proxy line:** "Noor is the proxy: Partner Bank relies on Noor's data and verification. Completeness
  is how much of the customer's financial picture Noor actually sees — the threshold is the minimum before
  Noor puts a score on it."
- **A what-if button** "Current account only (no salary)" shows 50% and the ask (pure, no record).

**Flow map.** The journey map's header note gains "· data completeness {pct}%" once the accounts are read.

**Lender view and memo:**
- Show completeness as a **circular indicator** (a CSS conic-gradient ring) with the percentage, plus the counts
  (banks, accounts, months).
- **The threshold is NOT shown to the lender.** Per "Noor IP vs lender view" (methodology slide 6), the
  completeness threshold, the risk-band boundaries and the rules behind each flag stay inside Noor.
- The memo carries `dataCompleteness: { pct, banks, accounts, months }`: no threshold, no component weights,
  no bank names, no masks. Add the SFTP columns `data_completeness_pct` and `data_sources`.
- The internal Decision log does show the threshold and the components.

**Decision log.** It shows the completeness line and the component table for journey decisions.

## 3. Tests

**Selftest:**
- Ravi 100% · overlay 0 · 737;
- card and loan unticked → 70% · overlay −10 · 727 · grade B · the same amounts and APR band;
- the current account unticked → 30% · NEEDS_DATA from prequalify with ask[0] 'Salary account';
- decide() below the threshold → REFER with RC_DATA_INCOMPLETE, not a decline;
- the 50% what-if;
- the almost-empty current account → 20%;
- the threshold param bounds and 4-eyes;
- without dataSources, the fingerprints are unchanged;
- the memo carries counts only.

**Browser acceptance:**
- the "Your data" card at 6·0, 7·2 and 7·3 shows 100% and 2 banks · 4 accounts · 12 months;
- unticking the card and loan → 70% and the pre-qualified screen still shows;
- unticking the current account → 7·3 "Almost there" with the Salary account chip first, and "Connect another
  account" → step 4;
- the behind-the-scenes "Two steps" panel and the 50% what-if;
- the Lender view's circular indicator shows 100% and the memo contains no threshold and no weights;
- update existing checks minimally and list them;
- 390px; zero page errors; light and dark themes.

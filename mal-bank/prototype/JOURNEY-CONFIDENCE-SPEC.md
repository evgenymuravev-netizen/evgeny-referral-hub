# Addendum v2.17 — Data completeness and confidence in the journey — binding spec

Source: Noor product request (8 Oct 2026): "we should focus in the journey on the data completeness and
therefore confidence from our side as the proxy. We should show how many data sources he provided, like how
many bank accounts."

**Why.** Noor is the **proxy**. Partner Bank books the loan on Noor's decision and verification. How complete
the customer's data is decides how confidently Noor can stand behind that decision: straight through, or a
person checks first. So the journey makes completeness visible.
- **The customer** sees it as **"Profile strength"**, with the sources they've shared counted (banks,
  accounts, months, ID, credit report).
- **Noor (behind the scenes)** sees it as **data confidence**, with a breakdown.
- **The lender** sees it as a confidence band and counts in the memo. Never the raw data.

## 1. Engine (additive): `dataConfidence(applicant, sources)`

This is a pure function. `sources` describes what the customer actually provided in this journey:

```
{ phoneVerified, emailVerified, emiratesId:{ scanned, nameMatch, employerMatch } | null,
  banks:[{ bank, salaryBank:bool, accounts:[{ type:'Current account'|'Savings account'|'Credit card'|'Personal loan', mask }] }],
  monthsHistory, aecb:{ pulled, hit } | null, obligationsReconciled:bool|null }
```

**Components** (each maximum in brackets; total 100):

| Component | Max | Points |
|---|---|---|
| Identity | 20 | Emirates ID both sides scanned 10 · name on ID = account holder 5 · employer on ID = salary payer 5 |
| Contact | 10 | mobile verified 5 · email verified 5 |
| Banks | 30 | salary bank connected 20 · each additional bank +5 (max +10) |
| Account types | 10 | 2.5 each for current, savings, credit card, loan among the approved accounts |
| History depth | 10 | ≥ 12 months 10 · ≥ 6 → 6 · ≥ 3 → 3 · else 0 |
| Credit bureau | 20 | AECB pulled with a file 15 (pulled, no file: 5) · obligations seen in connected accounts reconcile with AECB (within 10%) 5 |

**Bands:** ≥ 85 **Very high** · 70–84 **High** · 50–69 **Medium** · < 50 **Low**.

**Output:**

```
{ score, band, components:[{ key, label, have, points, max }], counts:{ sources, banks, accounts, months },
  missing:[{ label, gain }] }
```

- `counts.sources` counts the distinct sources: Emirates ID, mobile, email, each bank, AECB.
- `missing` lists what would add points. Example: "Another bank you use — +5".

**Ravi's progression through the journey** (assert these):

| Stage | Score | Band | What it adds |
|---|---|---|---|
| after the OTP (step 3) | 5 | Low | mobile |
| after email (3·1) | 10 | Low | email |
| after the Emirates ID (3·2) | 20 | Low | ID scanned; the matches are pending until the accounts are read |
| after both banks approved and read (step 6/7) | 75 | High | ENBD salary bank 20 + FAB 5; 4 types 10; 12 months 10; name match 5 + employer match 5 |
| after the AECB pull at decide (step 9) | 95 | Very high | file 15 + obligations reconciled (900 vs 900) 5 |

**Final counts:** **6 sources** (Emirates ID, mobile, email, ENBD, FAB, AECB), **2 banks**, **4 accounts**,
**12 months**. Missing: "Another bank you use — +5".

**If the customer unticks the ENBD card and loan at 5·1** (v2.15 allows it):
- account types fall to 5 (2 × 2.5);
- the obligations no longer reconcile (0 seen vs 900 at AECB): −5;
- → **85, Very high**.

Test this, and make the journey reflect the actual approved accounts.

**In `decide()`:** it accepts `application.dataSources` (the shape above). When present:
- record `record.dataConfidence` (the output);
- add a `DATA_SOURCES` audit line ("6 sources · 2 banks · 4 accounts · 12 months · confidence 95 Very high");
- add rule `POL_DATA_CONFIDENCE`: PASS at or above `minDataConfidence`; below it → **REFER** with
  RC_DATA_INCOMPLETE (never a decline, never a price change).
  - `minDataConfidence` is a new personal-loan param: default 60, bounds [0, 90].
  - Without `dataSources`, nothing is recorded and no rule is added. Every other screen and persona is
    unchanged; the v2.9 fingerprints must match.
- New reason code RC_DATA_INCOMPLETE (EN + Arabic): "We need a little more information to decide — connecting
  your salary account or scanning your Emirates ID usually does it."

**Ravi's decision numbers are unchanged** (95 → PASS).

**Memo (allowlist):** add `dataConfidence: { band, score, sources, banks, accounts, months }`, counts only,
to the memo and as SFTP columns `data_confidence_band` and `data_sources`. No bank names or masks. Extend the
privacy scan.

## 2. Journey UI

**Customer side: "Profile strength"** (on the phone, inside the Noor web-view).

A compact card showing:
- a bar, the band word and the score;
- the counts: "6 sources · 2 banks · 4 accounts · 12 months";
- an expandable list of the sources with checks.

It appears at:
- **6·0, back from the banks:** "You shared 2 banks · 4 accounts · 12 months" and the list (ENBD: current,
  credit card, personal loan · FAB: savings).
- **7·2, the budget view:** the card under the budget summary.
- **7·3, pre-qualified:** the line "Based on {N} data sources — profile strength {band}". Under it, the
  missing-item hint as text, not a button: "Bank anywhere else? Adding it makes your profile stronger."
- **9·0, final checks:** "Your credit report completes your profile", shown after decide as the final score.

**Copy tone.** Factual and calm, with no promise of a better price. For example: "A complete profile lets us
decide instantly — gaps can mean a quick manual check."

**Noor side (behind the scenes): a "Data completeness & confidence" panel**, shown on every step from 2
onwards, above the Mizan calls. It has:
- the score and band;
- the counts;
- the component table (component · what we have · points / max), updating as the steps progress;
- the "proxy" explanation: "Noor is the proxy: Partner Bank relies on Noor's verification. The more complete
  the data, the more confidently Noor can stand behind the decision — straight-through rather than a manual
  check, and a confidence band in the credit memo. Below 60 the application goes to a person
  (POL_DATA_CONFIDENCE), never an automatic decline."

**Flow map** (v2.11): the journey map's header note gains "· data sources so far: N".

**Decision log and Lender view:**
- The Decision log shows the confidence line and the component table for journey decisions.
- The Lender view memo shows "Data confidence: Very high (95) · 6 sources · 2 banks · 4 accounts · 12 months".

## 3. Tests

**Selftest:**
- `dataConfidence` for each stage in the table: exact scores and bands;
- the unticked-card-and-loan case → 85;
- counts and the missing list;
- decide() with dataSources: the record, the rule PASS, numbers unchanged;
- a low-data clone (no ID, one bank, 3 months) → REFER with RC_DATA_INCOMPLETE, not a decline, same price;
- without dataSources nothing changes (the fingerprints);
- the memo carries the band and counts only; the privacy scan passes;
- existing checks stay green.

**Browser acceptance:**
- the Profile strength card appears at 6·0, 7·2, 7·3 and 9·0 with the right counts (2 banks · 4 accounts ·
  12 months, then 6 sources);
- the behind-the-scenes score follows the stage table (5 → 10 → 20 → 75 → 95);
- unticking the card and loan at 5·1 gives 85 and "2 banks · 2 accounts";
- the decision has POL_DATA_CONFIDENCE PASS;
- the memo line in the Lender view;
- the flow-map header shows the source count;
- update existing checks minimally and list them;
- 390px; zero page errors; light and dark themes.

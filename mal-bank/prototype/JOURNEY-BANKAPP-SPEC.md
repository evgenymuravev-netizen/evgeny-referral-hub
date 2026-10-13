# Addendum v2.15 — The bank's approval screen shows credit cards and loans; one bank per screen — binding spec

Source: Noor product request (8 Oct 2026), pointing at journey step 5 "Your bank's app (simulated) — Noor
finance wants to view your account information": "Should be able to see credit cards and loan accounts here
from the same bank".

## 1. Data: Ravi (j1) gets an ENBD credit card and an ENBD personal loan, with the same totals

Ravi's AECB obligations stay at **AED 900/month** in total. They are now split into:
- **ENBD credit card ••7702:** limit 12,000, balance 7,440 (62%, as v2.8), monthly repayment **400**;
- **ENBD personal loan ••3317:** outstanding 6,200, instalment **500**/month, ends Mar 2027.

Changes:
- `j1.aecb`: `cards: 1`, `activeLoans: 1`. `tradelines` stays 2, which is now consistent with one card and
  one loan. `obligationsMonthly` stays 900.
- `j1.connected.accounts` gains the two accounts:
  `{ bank:'ENBD', type:'Credit card', mask:'7702', limit:12000, balance:7440, monthlyRepayment:400 }` and
  `{ bank:'ENBD', type:'Personal loan', mask:'3317', outstanding:6200, instalment:500, endsOn:'2027-03' }`.
- `observedObligationsMonthly` stays 900.
- Add `observedObligations: [{ label:'Credit-card repayment', amount:400 }, { label:'Personal-loan instalment', amount:500 }]`.
- **Every number Mizan produces for Ravi is unchanged.** That covers prequal 10,000–40,000, the caps
  6 → 10,000 / 12 → 21,000 / 24 → 40,000, the decision 15,000 / 12 / 8.99% / 1,311.70, NoorScore 737 and the
  memo. The v2.9 fingerprint table must still match.
- The engine reads only the totals.

## 2. Journey

**Step 4, the Al Tareq consent summary.** "What Noor will read" becomes: "Accounts, credit cards and loans —
balances, limits, repayments and 12 months of transactions". The other lines stay.

**Step 5, the bank approval, becomes one screen per bank.** Each bank approves only its own accounts:
- **5·0:** the existing interstitial "We'll open your bank's app to approve…".
- **5·1, "ENBD app (simulated)":** "Request via Al Tareq — Noor finance wants to view your account
  information". The accounts are grouped under small headings, all ticked by default, and each can be
  unticked:
  - **Accounts:** ENBD current ••4821, current account;
  - **Credit cards:** ENBD credit card ••7702, with "limit AED 12,000";
  - **Loans:** ENBD personal loan ••3317, with "AED 500 a month · ends Mar 2027".

  The scope line reads "Accounts, cards and loans: balances, limits, repayments and 12 months of
  transactions · read-only · until 19 Jul 2027". Then "Approve with Face ID".
- **5·2, "FAB app (simulated)"**, the second bank: under the heading "Accounts", FAB savings ••0193. The same
  scope line, then "Approve with Face ID".
- **Then back to botim (step 6)**, as today.

**Unticking an account.** The prototype keeps Ravi's decision numbers as they are. Behind the scenes, add a
note: "Unticking the card or the loan here would hide it from Noor — Mizan would still see the obligation in
the AECB report, which the decision uses for the debt-burden ratio."

**Behind the scenes for step 5:** keep the RFC 8252 / FAPI 2.0 insight, then add:
- "Each bank shows and approves only its own accounts: two short hops, ENBD then FAB."
- "Credit cards and loans come through the same Al Tareq consent. Noor sees real limits, balances and
  repayments, so the obligations Mizan counts can be checked against the AECB report rather than relying on
  the bureau alone."

**Step 6, back in botim.** The Noor-embed tiles stay current + savings. The Noor budget view (step 7 sub 2)
"Repayments already going out" lists two lines: Credit card AED 400, Personal loan AED 500, total AED 900.

**Insights (v2.8):**
- credit state: "1 credit card · 1 loan · NoorScore estimate Very good";
- the card insight keeps "Your credit card is 62% used". It may also say "AED 400 a month on the card". The
  numbers come from data.

**Flow map phase 4** (v2.11): the detail line stays "Leaves the web-view". The Customer copy mentions that
each bank shows its current and savings accounts, cards and loans.

## 3. Privacy

The memo's privacy scan (v2.5) also forbids the new masks (7702, 3317), the limit and balance figures
(12,000 / 7,440 / 6,200), and "credit card ••". The memo is unchanged.

## 4. Tests

**Selftest:**
- j1's data shape: four connected accounts (current, savings, credit card, personal loan), card 400 + loan 500
  = 900, `cards` 1, `activeLoans` 1;
- every j1 number is unchanged;
- the memo privacy holds with the new values;
- update the existing j1 shape assertions that list only ENBD 4821 and FAB 0193, and list them.

**Browser acceptance:**
- step 4's read line;
- 5·1 shows the three headings with the ENBD current account, card and loan, all ticked;
- 5·2 shows FAB savings only;
- no FAB account appears on the ENBD screen, and no ENBD account on the FAB screen;
- approving both returns to botim;
- the budget view lists card 400 + loan 500 = 900;
- the credit-state insight reads "1 credit card · 1 loan";
- update every existing walk that approved on the single step-5 screen (one more approve tap), and list
  them;
- 390px; zero page errors; light and dark themes.

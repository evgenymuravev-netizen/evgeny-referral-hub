# Addendum v2.18 — Action points from the 8 Oct meeting ("Open Finance credit scoring and Botim partnership journey") — binding spec

Build after v2.16 and v2.17. The items below change the prototype. People own the rest (§7).

## 1. The lender-view mockup (explicit next step: "Share lender-view mockup for feedback")

The team wants to circulate the decision log and credit memo before the botim meeting, to align on what to
show and what to protect.

**Credit memo: NoorScore breakdown in five buckets.** Show these as colour-coded bars (green / amber / red)
with a short level word and up to two factor words each. Never weights, points or formulas: the methodology
isn't disclosed to partners. Derive every bucket from signals the engine already has, and document the
derivation in a code comment.

| Bucket | Green | Amber | Red |
|---|---|---|---|
| **Fraud & integrity** | identity verified, with the ID ↔ account holder and employer matches where scanned, no ATO elevation, no statement integrity issue | a check missing (e.g. no ID scan) or ATO elevated | a mismatch, or statements integrity FAIL |
| **Newcomer risk** | ≥ 24 months in the UAE and an AECB file | 6–24 months, or a thin file with home-country data | < 6 months with no file and no home data |
| **Stacking & skip risk** | no v2.9 origination signals | one signal | two or more signals |
| **Creditworthiness & affordability** | DBR < 35% and free cash flow ≥ 3,000 | DBR 35–50%, or free cash flow 1,000–2,999 | above either range (also covers verified additional income, e.g. rent) |
| **Monitoring** | active (Open Finance consent covers monitoring while the loan is open) | elevated (an open early-warning signal) | — |

When there is no Open Finance, the Monitoring bucket reads "not active".

**The memo also shows:**
- the completeness ring (v2.17);
- the income range and free-cash-flow range (already there);
- the line "Methodology not disclosed — outcome and high-level factors only".

**Internal Decision log:** the same five buckets, with what drove each one.

**Deep link:** opening the page with `#lender` (and `#log`) lands on that screen with the most recent journey
decision selected, so the link can be circulated. Without a decision, show a seeded example.

## 2. botim placements: main page and menu page

The main page already has Noor (v2.12). The bottom-nav **All** (menu) currently shows a toast. Make it a
**menu page**: a neutral grid of services with a Noor tile marked "by noor", opening the variant entry. Keep
the "Concept — illustrative host app" tag.

## 3. Phone number: OTP skip for botim-verified UAE numbers; overseas numbers

Add a behind-the-scenes **scenario switch** at step 2 with three options.

| Option | Behaviour |
|---|---|
| (a) UAE number verified by botim — OTP kept *(default, today's flow, until CBUAE confirms)* | as today |
| (b) UAE number verified by botim — OTP skipped *(pending CBUAE rules check)* | step 3 is skipped with the note "botim already confirmed this number" |
| (c) Overseas number (+91…) | a step "Add your UAE mobile number" (needed for assessment and collections), then the OTP to that number |

Copy: "A local UAE number is required for assessment and collection; many botim users registered with a home
number."

## 4. Credit-report consent and who pulls the report

- **The step-9 AECB box becomes pre-ticked (opt-out):** "Check my credit report (AECB) — untick if you don't
  agree". Unticking still blocks the application inline, as today.
- **The behind-the-scenes note:**
  - "Noor's position: an opt-out box; confirm with compliance that a pre-ticked box is valid consent under
    Federal Law 6/2010."
  - "The full credit report is pulled by the licensed lender acting for Noor (precedent: a lender pulling
    reports on another's behalf with CBUAE approval). An AECB score via Open Finance is being explored with
    AECB."

## 5. Open Finance notes (copy only)

- **Step 5:**
  - "Today each bank is approved separately (aggregator flow); Nebras may support one consent for all banks."
  - "Customers without the bank's app approve through the bank's web login in Safari."
- **Step 4, Al Tareq summary, the "coming" line:** "Coming: e-wallets and forex from January; insurance data
  in phase 2 (2027)."
- **Account types:** loans include car loans (v2.17 already counts them).

## 6. Who owns which part of the journey (the proposal for botim)

**Noor owns the journey from assessment to the pre-offer screen.** Origination stays with botim and its
lender. The lender's policy can be loaded into Mizan.

- **Step 10, the offer, becomes Noor's pre-offer.** At the bottom: "Noor's part ends here: assessment,
  recommendation and the credit memo. botim finalises your loan with its lender." Then the CTA "Continue in
  botim".
- **Steps 11–16** (lender confirmation, Key Facts, e-sign, repayment, cooling-off, payout) render in the
  **botim host frame**, not the Noor web-view, under a small header "botim · loan (with Partner Bank)". Their
  content and the recorded execution events are unchanged: they come back to Noor as status events for
  monitoring.
- **The v2.13 contact-preferences step** stays a Noor moment after payout ("Back in Noor") and keeps its
  purpose: Noor's insights and monitoring messages.
- **Repayment copy:** "Direct debit mandate above AED 1,000; at or below, an Al Tareq payment (Noor is
  applying for a payment-initiation licence). Repayments are run by botim's loan flow."
- **Policy console:** a read-only line on the personal-loan pack: "Lender policy: Partner Bank — loaded into
  Mizan for end-to-end decisioning".
- **Flow map:** phases 8–10 get an "Origination — botim" chip.
- **Do not use botim's real product names** in the UI. "Cash Now" is not allowed.

## 7. Not in the prototype (owned by people; listed in the reply)

- the conversation with AECB on score access and pricing;
- verifying the CBUAE OTP rules;
- botim's overseas vs local number handling (Valeria);
- the NoorScore concept and its one case study (Valeria);
- Monday's lender-perspective session (Neil); Tuesday's advisors; botim on Wednesday or Thursday;
- the Gmail data idea (later, more relevant where Noor carries the acquisition cost).

**Pending a decision, so not built here:**
- a NoorScore independent of AECB, on a 0–1,000 scale and relative to the loan amount;
- AECB as an optional add-on.

## Tests

**Selftest:**
- the bucket derivation for r1 (all green), r6 (stacking red), r2 (newcomer amber), j1 and a1;
- the memo carries levels and factor words only, never points or weights;
- the privacy scans pass;
- the fingerprints are unchanged.

**Browser acceptance:**
- the memo shows the five bars and the ring;
- `#lender` and `#log` deep links work;
- the All/menu page has a Noor tile;
- the three phone scenarios: OTP kept, OTP skipped, overseas → UAE number + OTP;
- the AECB box is pre-ticked, and unticking blocks the application;
- the step-4 and step-5 notes;
- step 10 shows "Noor's part ends here", and steps 11–16 render in the botim frame with the events still
  recorded;
- the policy line;
- update existing checks minimally and list them;
- 390px; zero page errors; light and dark themes.

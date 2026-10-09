# Addendum v2.18 — Action points from the 8 Oct meeting ("Open Finance credit scoring and Botim partnership journey") — binding spec

Build after v2.16 and v2.17. The items below change the prototype. People own the rest (§7).

## 1. The lender-view mockup, structured as the NoorScore methodology's six components

Explicit next step from the meeting: "Share lender-view mockup for feedback". The team circulates the
decision log and credit memo before the botim meeting, to align on what to show and what to protect.

The structure follows the methodology slide **"Six components"** (9 Oct). That slide supersedes the meeting's
five buckets:

| Group | Component | The question | Signals the engine already has (illustrative derivation; document it in a code comment) |
|---|---|---|---|
| **Score components** (these four build the NoorScore and its risk band) | **Fraud & Integrity** | Is the applicant real and honest? | identity (UAE PASS; ID name ↔ account holder; employer ↔ salary payer, v2.16), digital footprint identity and ATO (v2.14), statement integrity (v2.4). Device intelligence and mule / income-manipulation patterns show as "not connected yet". Drives decline or extra verification: in the prototype a mismatch or integrity FAIL refers, as built. |
| | **Newcomer Score** | Under 12 months of UAE financial footprint? | applies only when the UAE footprint is < 12 months: home-country history (Credit Passport, home statements) plus settling in (salary regularity since arrival, months of UAE accounts). Otherwise it shows "Established — not applicable" (neutral). |
| | **Stacking & Skip Risk** | Will they take as much credit as possible and leave the UAE? | departure markers (the v2.9 signals), stacking speed (new credit lines in the last 90 days where the data has it, else "none seen") and anchors (months in the UAE, employer tenure, a salary account that's been active ≥ 12 months). |
| | **Credit Behaviour** | Will they pay? | cash-flow behaviour (free cash flow, buffer, volatility), loan and bill payments on time as seen in the accounts, and AECB delinquency when available. |
| **Aggregates** (shared as aggregates such as DBR, **not scored**) | **Affordability & Capacity** | How much can they carry? | the verified income band, obligations, the essential-expenses band, the DBR band and the maximum affordable instalment band. Bands and ranges only. |
| **Post-disbursement** (not part of the score) | **Monitoring & Collections** | What changed after disbursement? | early-warning triggers (v2.9), **best debit date** (the day after the usual salary credit: Ravi's salary lands on the 27th, so the 28th) and the next monthly score refresh date. |

**The memo (lender):**
- **The four score components** appear as colour-coded bars (green / amber / red, or a neutral "not
  applicable"), each with a level word and up to two plain factor words. Never weights, points or formulas.
  Add the line "Methodology not disclosed — outcome and high-level factors only".
- **Affordability & Capacity** appears as bands under the heading "Aggregates — not scored".
- **Monitoring & Collections** appears as one status line: active or elevated, the best debit date and the
  next refresh.
- **Plus** the completeness ring (v2.17) and the NoorScore value and band, as today.

**The internal Decision log** shows the same six, with what drove each one.

**The NoorScore number** stays the current scorecard until the scoring of the four components is defined (see
§7, pending). Label the component bars as "illustrative derivation".

**Deep link:** opening the page with `#lender` (and `#log`) lands on that screen with the most recent journey
decision selected, so the link can be circulated. Without a decision, show a seeded example.

## 1b. Noor IP vs lender view (methodology slide 6) — what the memo may and may not carry

**What stays inside Noor**, never in the memo, the SFTP row or the lender-facing UI:
- **the methodology:** features, component weights, how the components combine, and (later) the trained model;
- **thresholds and cut-offs:** the completeness threshold, the risk-band boundaries and the rules behind each
  flag;
- **the data-source mix:** which alternative data sources are used, when, and how much each counts;
- **raw customer data:** transactions, balances, account details and Emirates ID images.

**What is shared outside Noor:** scores, reason codes and derived aggregates only. The exact set is agreed with
each partner.

**Changes to the memo and the Lender view:**
1. **Drop the NoorScore band boundaries.** Remove "Excellent ≥ 740 · Very good 680–739 …". Keep the band word
   and the value.
2. **Make the flags agnostic about data sources:**
   - the identity flag becomes "Identity verified" (no "digital footprint", no "UAE PASS / Emirates ID" detail
     beyond verified / not verified);
   - "Rental income verified via Open Finance — counted at 75%" becomes "Additional income verified";
   - "6 of 6 months verified · conduct clean" becomes "Additional evidence verified";
   - the purchase flag keeps its category only.

   Open Finance as the core source may be named; it is Noor's external line.
3. **The component bars** (§1) use level words and reason-code-style factor words ("Strong cash flow", "Stable
   income", "Recent changes in account activity"). No feature names, no thresholds.
4. **Per-partner sharing agreements.**
   - `creditMemo(decisionId, { lenderId })` builds the allowlist from `MizanData.sharingAgreements[lenderId]`.
     The agreement is versioned and lists which groups go out: score + band, reason codes, the four component
     levels, affordability aggregates, completeness, the monitoring status, consent references.
   - Partner Bank gets the full set, v1.
   - Add an illustrative second lender, "Lender B (illustrative)", with a narrower set: score + band, reason
     codes and affordability aggregates only.
   - The Lender view shows "Sharing agreement: Partner Bank v1" and a lender switch.
   - The selftest asserts that Lender B's memo omits the groups it hasn't agreed to.
5. **The "Shared vs withheld" panel becomes the slide's two columns:**
   - **Stays inside Noor:** methodology · thresholds and cut-offs · data-source mix · raw customer data.
   - **Shared outside Noor:** the external line, what lenders receive (per agreement), and "why the methodology
     stays private: it protects NoorScore from being copied by competitors and from being gamed by applicants".

   Label the panel "Noor-only explanation — not part of the memo".
6. **The external line, verbatim,** goes in the Lender view header and in the Overview: "NoorScore works with
   Open Finance data as its core component. For enrichment, we use different types of alternative data where
   available."

**Tests:**
- recursive scans of every persona's memo and SFTP row for:
  - band-boundary strings ("≥ 740", "680–739");
  - "threshold";
  - "footprint", "statement", "75%" or "counted at";
  - any weight or point value of a component;
  - EID image fields;
- Lender B's narrower memo;
- update existing memo assertions that expected the old flag texts, and list them.

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
- the six-component derivation for r1 (all green; newcomer not applicable), r6 (Stacking & Skip red), r2 (Newcomer amber, home-country data), j1 (best debit date 28th) and a1;
- the memo carries levels and factor words only, never points or weights;
- the privacy scans pass;
- the fingerprints are unchanged.

**Browser acceptance:**
- the memo shows the four score-component bars, the Affordability aggregates, the Monitoring line and the ring;
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

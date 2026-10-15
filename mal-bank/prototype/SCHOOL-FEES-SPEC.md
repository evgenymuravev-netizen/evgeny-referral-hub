# Addendum v2.21 — Split school fees over 12 months, the default product — binding spec

Source: Noor product request (15 Oct 2026): "Add another product to the customer use cases and it should be the
main one by default: split school fees for 12 months."

## 1. The product

**Split school fees** (`school_fees`, AR "تقسيط الرسوم المدرسية"). A parent splits a school's fee invoice into
**12 equal monthly payments**. Partner Bank pays the school directly; the parent repays Partner Bank in 12 instalments.

- **Term:** always 12 months. This is a locked rule of the pack, not a parameter.
- **Payee:** the school, never the customer. Funds cannot be diverted.
- **Pricing:**
  - **Partner school:** 0% for the parent, with no interest and no fees. The school pays a merchant fee
    (`merchantFeePct`, illustrative 5%). The merchant fee is never shown to the customer and never sent in the memo.
  - **Other licensed school:** a monthly fee on the amount, by band: A 0.50%, B 0.75%, C 1.00% (illustrative).
    The APR equivalent is disclosed, computed as for split, with `splitPlan()` and `monthlyIrr()`.
- **Underwriting:** the same as the personal loan. It uses the scorecard (`loanScore`, scorecard_v0 0.4), the
  AECB, DBR double enforcement, 20× salary, the instalment-to-FCF cap, data completeness, the red-flag origination
  gate (REFER only), the Emirates ID rules and the footprint lanes.
  - So **NoorScore, grade, reason codes and completeness are identical to the personal loan for the same
    customer.** Only the product, the amount, the instalment and the price differ.
- **Limit:**
  - `budget = min(DBR headroom, instalmentToFcfMaxPct% × FCF)`. FCF applies only when spending is seen.
  - Max principal: partner school → `floor1000(12 × budget)`; other school → `floor1000(budget ÷ (1/12 + rate))`.
  - `approved = pickMin(invoice amount, max principal, 20× salary, productCap)`. The binding key is recorded.
  - Below the invoice → RC_LIMIT_REDUCED (library Y09). The plan screen says "Noor splits AED X; pay the remaining
    AED Y to the school directly."
- **Repayment:** the v2.3 platform rule. Amounts above AED 1,000 use a direct debit mandate on the parent's own
  account. The best debit date is the day after the salary (Ravi: the 28th). The first instalment is the first
  best debit date at least 20 days after payout.
- **Execution:** the six steps, unchanged. The DISBURSED description for this product: "Partner Bank pays the
  school directly ({school name})". Cooling-off is 5 business days or a written waiver (CPR 8/2020).
  - If the invoice due date falls before cooling-off ends, the plan screen and the KFS say so and offer the
    waiver. Never auto-waive.

### Policy pack `school_fees` (appended last to MANIFESTS and the packs, so every earlier product keeps its position)

```
regulatory (locked): { dbrCapPct:50, dbrCapRetireePct:30, salaryMultipleCap:20, fixedTenorMonths:12,
                       aecbCheckRequired:true, coolingOffDays:5, payee:'SCHOOL', earlySettlementFee:'None' }
params: { minSalary:5000, minAge:21, maxAge:65, scoreDecline:620, scoreRefer:680, maxEsrPct:60, thinFileAction:'REFER',
          minMonthsInUae:6, chequeReturnsMax:1, minAmount:2000, productCap:120000, instalmentToFcfMaxPct:50,
          partnerSchoolParentFeePct:0, merchantFeePct:5, nonPartnerMonthlyFeeRate:{ A:0.005, B:0.0075, C:0.01 },
          completenessThresholdPct:70, footprintOverlayMode:'SHADOW', footprintOverlayCap:20, tokenValidityDays:14 }
```

**Bounds:**

| Param | Bounds |
|---|---|
| minSalary | [3000, 25000] |
| minAge | [18, 25] |
| maxAge | [60, 70] |
| scoreDecline | [550, 720] |
| scoreRefer | [600, 780] |
| maxEsrPct | [30, 90] |
| minMonthsInUae | [0, 24] |
| chequeReturnsMax | [0, 5] |
| minAmount | [500, 10000] |
| productCap | [20000, 300000] |
| instalmentToFcfMaxPct | [10, 80] |
| partnerSchoolParentFeePct | [0, 0] (0% is the product promise) |
| merchantFeePct | [0, 10] |
| nonPartnerMonthlyFeeRate per band | [0, 0.02], with A ≤ B ≤ C |
| completenessThresholdPct | [50, 90] |
| footprintOverlayCap | [0, 30] |
| tokenValidityDays | [3, 30] |

`fixedTenorMonths` is locked: publish refuses it.

**Policy console:** a read-only line "Lender policy: Partner Bank — loaded into Mizan" (as v2.18 §6).

### Data (MizanData, additive)

- **`schools`:** the illustrative directory. Fictitious names, always shown with "(illustrative)".

  ```
  [{ id:'sch-juniper', name:'Juniper Hill Primary School', city:'Dubai', regulator:'KHDA', partner:true,  ibanMasked:'AE•• •••• •••• •••• •••• 4410' },
   { id:'sch-falcon',  name:'Falcon Ridge Academy',        city:'Dubai', regulator:'KHDA', partner:false, ibanMasked:'AE•• •••• •••• •••• •••• 7783' }]
  ```

- **j1 (Ravi):**
  - Add `schoolFees: { schoolId:'sch-juniper', child:'Child 1 · Grade 1', academicYear:'2026–27', terms:'Terms 1–3', amount:15000, dueDate:'2026-08-20', invoiceRef:'INV-26-0815' }`.
  - Tagline: "Warehouse supervisor, 3 years in the UAE, botim user — his daughter starts Grade 1 in September".
  - Keep `purpose:'Family wedding'` and `defaultRequest`, because the personal-loan path still uses them.
  - Never put a child's name anywhere.

### Engine API (additive)

- **`decide({ productId:'school_fees', applicant, amount, tenorMonths:12, school:{ schoolId, invoiceRef, dueDate }, consents, lenderId, … })`**
  - It accepts the same optional fields as the personal loan: `emiratesId`, `dataSources`, `contactVerification`,
    `footprint consent`.
  - `tenorMonths` other than 12 is clamped to 12 with RC_TENOR_CAP (Y10).
  - An unknown school throws.
  - `record.schoolFees = { school:{ id, name, partner, regulator, ibanMasked }, invoice:{ ref, amount, dueDate }, months:12, monthlyInstalment, totalFees, aprEquivalent, planTotal, firstPaymentDate, lastPaymentDate, coolingOffEndsAfterDueDate }`.
  - Pricing: `mode:'SCHOOL_FEES'`, with `kfs.monthlyInstalment`, so the fingerprint helper reads it.
  - Policy rule `POL_SCHOOL_VERIFIED`: PASS when the school is in the directory. It is informational in the
    prototype.
- **`prequalify(applicant, consents, opts)`:** the personal-loan fields are unchanged. Add a `schoolFees` block:
  `{ months:12, maxPartner, maxOther, instalmentBudgetMonthly, nonPartnerBand, nonPartnerRate }`.
  - Use the same income, spending, obligations and budget.
  - `nonPartnerBand` is the prequal estimate band.
- **`quoteSchoolFees(amount, { schoolId, band })`:** pure. Returns the 12-month plan for the screen.
- **`creditMemo`:** the product line "School fees — 12 months".
  - Purpose: "Education — school fees, paid directly to the school". The school name is not shared: "school
    verified (licensed, in the directory)".
  - Add the flag "Paid to the school — funds cannot be diverted".
  - No merchant fee and no partner flag.
  - The memo groups and bands follow the sharing agreement as today.
  - **SFTP:** `product` = `school_fees`.
- **Reason-code library:** no new codes. Every RC_* still maps to exactly one code.
- **`RF_PRODUCTS`** includes `school_fees` for the origination gate.
- **Monitoring:** a school-fees row in STP vs targets and in the early-warning scan.

### Ravi's numbers (selftest them)

- **Invoice:** AED 15,000, partner school, 12 months.
- **Plan:** 12 × **AED 1,250.00**, fees AED 0, APR 0%, plan total AED 15,000.
- **Score:** NoorScore 737, grade B, the same as the personal loan.
- **DBR:** (900 + 1,250) ÷ 12,000 = **17.9%**. In the memo: band "15–20%" and headroom "AED 3,500–4,000"
  (3,850). These are the same bands as the personal-loan memo.
- **Prequal:** budget = min(5,100, 50% × 3,700 = 1,850) = 1,850.
  - maxPartner = **AED 22,000**.
  - maxOther (band B, 0.75%) = floor1000(1,850 ÷ 0.090833) = **AED 20,000**.
- **Falcon Ridge (other school), AED 15,000, band B:** 12 × AED 1,362.50, fees AED 1,350, APR equivalent from
  `monthlyIrr` (about 16%).
- **Repayment:** direct debit; best debit date the 28th.
- **Library codes:** the same set as Ravi's personal loan (G02–G11 and PR-PB-G01 for Partner Bank).

## 2. The journey: school fees by default

`Journey.S.product`:
- `'school_fees'` is the default, and Restart resets to it;
- `'personal_loan'` is the alternative.

**The personal-loan path must reproduce v2.20 exactly** (same screens, numbers, events and memo) once the
customer picks it.

### Variant A (from the Loans screen)

- **botim Loans screen tile:** "Noor — split school fees over 12 months". Secondary line: "or borrow for
  anything else".
- **8·1 becomes "What do you need?"** Two choice cards:
  - **"School fees · 12 months"**, selected by default;
  - **"Something else — personal loan"**, which opens today's "How much do you need?" unchanged.
- **The school-fees form** (`#jr-sf-form`):
  - a school picker over the directory, each school with a "Partner school · 0%" or "Monthly fee" badge;
  - the child, academic year and terms (read-only from the invoice);
  - the amount, prefilled from the invoice (a slider from minAmount to 50,000, step 500);
  - the due date;
  - a line "12 × AED 1,250 · 0% interest, no fees" (partner) or "12 × AED 1,362.50 · monthly fee 0.75% · APR
    equivalent x%" (other).
  - An optional "Upload the fee invoice (PDF)" control. In the prototype it is simulated, logged and stored
    inside Noor, never sent to the lender.
- **8·2 affordability check:** uses `prequal.schoolFees`. If the amount is above the max, offer "Split AED {max};
  pay the rest to the school directly".

### Variant B (see what you can get)

- **7·3 pre-qualified:**
  - The primary card is "Split school fees over 12 months — up to AED 22,000 · 0% at partner schools".
  - The personal-loan range shows below it as a secondary card, "Or a personal loan: AED 10,000–40,000"
    (today's figures from prequalify()), with "Choose a personal loan".
  - The v2.17 "Based on {pct}% complete data …" line stays.
- **Step 8 is product-aware:**
  - school fees → **"Your school fees"** (the same form);
  - personal loan → today's "Choose your loan", unchanged.

### Both variants

- **Step 9** calls `decide()` with the chosen product. The event-log call text names the product.
- **Step 10:**
  - school fees → **"Your school-fees plan"**: 12 × AED 1,250, 0% interest, total AED 15,000, the first and last
    payment dates, "Partner Bank pays Juniper Hill Primary School directly", and the cooling-off/due-date note
    where it applies;
  - personal loan → today's offer.
  - The v2.18 footer and "Continue in botim" are unchanged.
- **Steps 11–16** (botim frame) adapt their labels:
  - the KFS shows the 12-instalment plan, APR 0% (partner) or the APR equivalent, and payee = school;
  - step 16 reads "Done — the school is paid".
  - Execution events are unchanged.
- **The step list** shows the product-aware titles ("Your school fees", "Your school-fees plan").
- **The flow map** (FLOWS-SPEC):
  - phase 6 becomes "School fees or loan — School, invoice, 12 months (default) · or a personal loan";
  - phase 10 becomes "Paid · back in botim".
- **Behind the scenes** for 8/8·1 and 10:
  - one panel "Split school fees — the default product": paid to the school; 0% for partner schools (the school
    pays a fee); monthly fee by band otherwise; same underwriting as the personal loan;
  - "Mizan calls": `prequalify() → schoolFees`, `quoteSchoolFees()`, `decide({school_fees …})`.
- **botim events:** no change (no product field).

## 3. Other screens

- **Overview:**
  - The product sentence starts "Split school fees over 12 months (the default) · Split a purchase · Personal
    loan · …".
  - The demo strip gains a new **Step 1, "School fees — Ravi (the main product)"**: "AED 15,000 of school fees →
    12 × AED 1,250 at 0%, paid straight to the school". It opens the journey at its start, with the product school
    fees.
  - The existing steps renumber 2–12, and the heading reads "a twelve-step click path". Extend the demo-strip
    grid CSS for 12.
  - The screen map adds a "Split school fees" row.
- **Lender view and #lender:**
  - The seeded example (when no journey decision exists) becomes Ravi's **school-fees** decision.
  - The lender switch, Lender B and Reproduce all work on it.
  - The personal-loan memo stays reachable by deciding the personal loan in the journey.
- **Decision log:** the product label "Split school fees (12 months)". The school-fees record lists the plan
  and the payee.
- **Policy console:** the new pack card with locked and params, bounds validation, 4-eyes publish, and
  "Simulate" on the personal-loan sample book read as 12-month school-fee requests (partner pricing).
- **Monitoring:** the product row.
- **Split screen (c1 Mariam):** a one-line cross-link: "Not paid yet? Split school fees over 12 months — paid
  straight to the school →" (opens the journey).
- **NOOR-PIVOT.md:** an "As built — v2.21" section.

## 4. Guardrails

- **No change to any existing persona's outcome, score, amount or price.** The v2.9 fingerprints must match.
  The Noor skin `<style>` block stays byte-identical, and new CSS goes at the end of "Noor additions".
- **School names** are fictitious and labelled "(illustrative)". No real school, no botim product names, no
  "Cash Now", no tagline, no RiskSeal identifiers.
- **Never put in the memo or SFTP row:** a child's name or details, the school name, the merchant fee, or the
  invoice file.
- **Nationality is never an input,** as before.

## 5. Tests

**Selftest:**
- the pack's locked and params, the bounds, and the fixed term (publish refuses `fixedTenorMonths`);
- Ravi's numbers in §1 (plan, DBR 17.9%, bands, 737, B, codes, prequal 22,000 / 20,000);
- Falcon Ridge pricing and APR;
- an invoice above the max → approved = max with Y09;
- tenor 6 → 12 with Y10;
- an unknown school throws;
- red flags REFER on school_fees (r6-style data);
- data completeness below the threshold → REFER;
- memo hygiene: no school name, merchant fee or child;
- every RC_* maps;
- the fingerprints are unchanged.

**Browser acceptance:**
- the default journey, in both variants, walks school fees end to end:
  - 8·1 / 7·3 cards;
  - the form at 15,000;
  - decide → APPROVE;
  - plan 12 × 1,250;
  - KFS 0%;
  - execution to "Done — the school is paid";
  - contact preferences;
- switching to Falcon Ridge shows the fee and the APR equivalent;
- the amount above the max shows the shortfall offer;
- choosing "personal loan" reproduces v2.20 exactly, so existing personal-loan checks run on that path. Update
  them to pick the personal loan first and list them;
- the Overview step 1 opens the journey;
- `#lender` shows the school-fees memo with the same bands as before and no school name;
- the policy console pack;
- 390px; zero page errors; light and dark themes.

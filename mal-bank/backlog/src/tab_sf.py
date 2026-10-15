from common import row

# Split school fees over 12 months: the main product and the journey's default (prototype v2.21).
SF = []
a = SF.append
C = "Customer (parent)"
E = "School fees, 12 months (main product)"
REF = "SCHOOL-FEES-SPEC.md"

a(row("SF-01", "School fees as the default product", E, "User story", C, "Noor", "MVP",
  "As a parent in botim, Noor opens on splitting my school fees over 12 months, with a personal loan as the alternative, so that the most common reason I need credit comes first.",
  ["Variant A: 'What do you need?' shows 'School fees · 12 months' (selected) and 'Something else, personal loan'",
   "Variant B: the pre-qualified screen leads with 'Split school fees over 12 months, up to AED X, 0% at partner schools'; the personal-loan range shows below it",
   "The chosen product is stored on the application and named in every engine call and event-log line",
   "Restart resets to school fees; botim entry copy leads with 'Split school fees over 12 months'"],
  ["Default product is a configuration flag, so it can be switched without a release"],
  ["CJ-04", "CJ-05", "CJ-17", "SF-02", "SF-05"], ["Application product", "Funnel analytics by product"],
  "FE, BE", "M", "Journey 8·1 and 7·3 · " + REF + " §2"))
a(row("SF-02", "Pick the school", E, "User story", C, "Noor", "MVP",
  "As a parent, I find my child's school in a list, so that Noor pays the right school.",
  ["Search by name and city; each school shows its regulator (KHDA, ADEK, SPEA) and a badge: 'Partner school · 0%' or 'Monthly fee'",
   "'My school isn't listed' captures a request for operations and explains that only licensed schools in the directory can be paid",
   "The school's bank details are never shown in full (masked IBAN)"],
  ["Only schools in the verified directory can be selected (RF-104)"],
  ["PL-32 school directory"], ["schoolId on the application"],
  "FE, BE", "M", "Journey school-fees form · " + REF))
a(row("SF-03", "Enter the fee details and upload the invoice", E, "User story", C, "Noor", "MVP",
  "As a parent, I enter what the invoice says and attach it, so that Noor can check and pay it.",
  ["Fields: child's grade, academic year, terms covered, amount, due date, invoice reference",
   "Amount from AED 2,000 to the product cap (120,000, illustrative)",
   "Optional PDF upload, stored inside Noor (PL-20), never sent to the lender or botim",
   "No child's name is stored on the decision or shared with anyone"],
  ["Due date drives the cooling-off note (SF-07)"],
  ["PL-33 invoice intake", "PL-20"], ["Invoice on the application"],
  "FE, BE", "M", "Journey school-fees form · " + REF))
a(row("SF-04", "See the 12-month plan", E, "User story", C, "Noor", "MVP",
  "As a parent, I see exactly what I pay each month before I apply.",
  ["Partner school: 12 equal payments, 0% interest, no fees (Ravi: AED 15,000 → 12 × AED 1,250)",
   "Other school: monthly fee by band with the APR equivalent (band B: 12 × AED 1,362.50, fees AED 1,350)",
   "First and last payment dates on the best debit date (the day after salary)", "Updates live when the school or amount changes"],
  ["Pricing in RF-103; dates from RF-99"],
  ["RF-103", "RF-99"], ["Plan preview"],
  "FE", "S", "Journey school-fees form · engine quoteSchoolFees()"))
a(row("SF-05", "Pre-qualified amount for school fees", E, "User story", C, "Noor", "MVP",
  "As a parent, I see how much school fees I can split before any credit-report check.",
  ["Shows the maximum for partner schools and for other schools (Ravi: AED 22,000 and AED 20,000)",
   "No AECB pull and no decision record", "Below the data-completeness threshold → 'Almost there' (CJ-15)"],
  ["Logic in RF-102 on the prequal budget (RF-79)"],
  ["RF-102", "RF-79", "RF-39"], ["Pre-qualified card"],
  "FE, BE", "S", "Journey 7·3 · engine prequalify() schoolFees"))
a(row("SF-06", "Fees above the limit: split part, pay the rest", E, "User story", C, "Noor", "MVP",
  "As a parent whose fees are above what fits my budget, I can still split part of them.",
  ["Message: 'Noor splits AED X; pay the remaining AED Y to the school directly'", "Customer accepts or changes the amount",
   "Decision carries Y09 Amount Adjusted to Fit"],
  ["approved = min(invoice, max) from RF-102"],
  ["RF-102", "RF-80"], ["Approved amount, reason code"],
  "FE", "S", "Journey 8·2 · " + REF))
a(row("SF-07", "School-fees plan, Key Facts and signing", E, "User story", C, "Noor + botim + Partner Bank", "MVP",
  "As a parent, I review the plan and the Key Facts in English or Arabic, sign, set up the direct debit and wait out (or waive) the cooling-off.",
  ["'Your school-fees plan': 12 × instalment, interest, total, first and last dates, 'Partner Bank pays the school directly'",
   "KFS: 12 instalments, APR 0% (partner) or the APR equivalent, payee = school, no early-settlement fee",
   "If the due date falls before cooling-off ends, the plan and KFS say so and offer the written waiver; never auto-waived",
   "Steps 11 to 16 run in botim's frame; step 16 reads 'Done, the school is paid'"],
  ["CBUAE Consumer Protection Regulation 8/2020 (5 business days or waiver)"],
  ["CJ-22", "CJ-24", "LP-11"], ["Execution events"],
  "FE, BE, Integration", "M", "Journey steps 10 to 16 · " + REF,
  ["Compliance to confirm KFS wording for a 0% plan funded by the school's merchant fee"]))
a(row("SF-08", "School paid and confirmed", E, "User story", C, "Partner Bank + Noor", "MVP",
  "As a parent, I am told when the school has been paid.",
  ["Partner Bank pays the school's verified IBAN after cooling-off", "Payment confirmation (and the school's receipt, if available) shown in Noor and sent on the parent's channel",
   "Payment returned by the school's bank → case to operations, parent informed, plan not started"],
  ["First instalment only after the school is paid"],
  ["LP-23", "PL-14"], ["Loan card, notification"],
  "BE, Integration", "M", "Journey step 16 · " + REF))
a(row("SF-09", "Already paid? Split a purchase instead", E, "User story", C, "Noor", "Phase 2",
  "As a parent who already paid the school, I can split that payment after the fact.",
  ["Due date passed, or a school payment seen in the last 60 days → offer 'Split a purchase' (CJ-37)", "School-fee payments found by RF-105"],
  ["Refund to the parent's account instead of paying the school"],
  ["CJ-37", "RF-105"], ["Split a purchase application"],
  "FE", "S", "Split screen cross-link (Mariam, c1)"))
a(row("SF-10", "Next term and next year", E, "User story", C, "Noor", "Phase 2",
  "As a parent, Noor reminds me before next year's fees and pre-fills the school and child.",
  ["Reminder 30 days before the usual due date", "Pre-filled from last year's plan; affordability rechecked with fresh data"],
  ["New decision each time"],
  ["RF-98", "PL-14"], ["Repeat applications"],
  "FE, BE", "M", "Not in prototype"))
a(row("SF-11", "Several children or schools", E, "User story", C, "Noor", "Phase 2",
  "As a parent of more than one child, I split each invoice and see one combined view.",
  ["One plan per invoice", "Each new plan's instalment counts in DBR and the FCF budget together with open plans"],
  ["Combined exposure under the product cap"],
  ["RF-102", "RF-28"], ["Plans per parent"],
  "FE, BE", "M", "Not in prototype"))
a(row("SF-12", "Child leaves the school: refunds", E, "User story", C, "Noor + Partner Bank", "Phase 2",
  "As a parent whose child leaves mid-year, the school's refund reduces or closes my plan.",
  ["School refunds unused fees to Partner Bank", "Plan recalculated or settled; parent told what changes", "Any excess paid by the parent is returned"],
  ["Refund rules per school agreement"],
  ["LP-23", "LP-13"], ["Plan changes"],
  "BE, Integration", "M", "Not in prototype",
  ["Refund terms to agree with partner schools"]))

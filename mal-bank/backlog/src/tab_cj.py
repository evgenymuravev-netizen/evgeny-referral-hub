from common import row

C = "Customer"
CJ = []
a = CJ.append

# ---- Entry points in botim
E = "Entry points in botim"
a(row("CJ-01", "Entry on botim main screen", E, "User story", C, "botim + Noor", "MVP",
  "As a botim user, I see a Noor credit entry on botim's main screen, so that I can check what I can borrow without searching for it.",
  ["Tapping the entry opens Noor in the botim web-view with the signed hand-off (PL-01)",
   "The experiment variant is assigned before the first screen (CJ-42)",
   "An impression event with surface = home is sent to botim when the entry is shown; journey_started when it is tapped",
   "No PII in events",
   "Works at 390px width"],
  ["botim owns the placement and artwork; Noor provides the deep link and the copy",
   "No botim product names in Noor copy"],
  ["PL-01 hand-off", "PL-02 events", "CJ-42 experiment"],
  ["Journey start", "Funnel analytics (RP-14)"],
  "FE, Integration", "S", "Journey step 0 · JOURNEY-HOME-SPEC.md",
  ["Placement and copy to be agreed with botim"]))
a(row("CJ-02", "Entry from botim money: Connected accounts", E, "User story", C, "botim + Noor", "MVP",
  "As a botim money user who connects a bank account, I am offered Noor's insights and credit check, so that connecting accounts leads to something useful.",
  ["Connected accounts → Add another opens Noor at the bank-connection step (variant B path)",
   "Impression event with surface = money",
   "If the customer already has a Noor session, they land on their current step"],
  ["Same deep-link contract as CJ-01, with an entry parameter"],
  ["CJ-01", "PL-01"], ["Journey start", "Funnel analytics"],
  "FE, Integration", "S", "Journey step 0·1 · JOURNEY-HOME-SPEC.md"))
a(row("CJ-03", "Entry from botim All page (menu)", E, "User story", C, "botim + Noor", "MVP",
  "As a botim user browsing all services, I find a Noor tile marked 'by noor' in the menu grid.",
  ["Tile opens the assigned variant's entry", "Impression event with surface = all"],
  ["Same deep-link contract as CJ-01"], ["CJ-01"], ["Funnel analytics"],
  "FE, Integration", "S", "botim All page · MEETING-1008-SPEC.md §2"))
a(row("CJ-04", "Variant A: Loans screen, amount first", E, "User story", C, "Noor", "MVP",
  "As a customer coming from botim's Loans screen, I enter how much I need and for how long first, then connect my accounts, so that the check is about my request.",
  ["'How much do you need?' shows an amount input and term choice (6, 12, 24 months)",
   "One indicative monthly instalment is shown below the amount; no 'from x%' rate line",
   "The amount and term are carried into onboarding and pre-fill step 8",
   "After the accounts are connected, the affordability check (CJ-19) runs"],
  ["Indicative instalment uses the band B mid rate (illustrative) and the annuity formula (RF-31)",
   "Copy says the figure is indicative until the check"],
  ["RF-31 annuity", "CJ-19"], ["Requested amount and term on the application"],
  "FE", "M", "Journey variant A, steps 7 and 8·1"))
a(row("CJ-05", "Variant B: see what you can get first", E, "User story", C, "Noor", "MVP",
  "As a customer, I connect my accounts first and Noor shows me what I can borrow, so that I do not have to guess an amount.",
  ["Entry copy 'How much can you borrow?'",
   "Path: onboarding → connect → back in botim with insights → pre-qualified range (CJ-17) → choose loan (CJ-18)",
   "Variant shown in the step list and recorded on every event"],
  ["Variant B is the prequal-first path in the A/B test"],
  ["CJ-17", "CJ-42"], ["Funnel analytics"],
  "FE", "M", "Journey variant B, steps 0 to 8"))

# ---- Onboarding and identity
E = "Onboarding and identity"
a(row("CJ-06", "Noor opens inside botim with the signed hand-off", E, "User story", C, "Noor", "MVP",
  "As a botim user, Noor already knows my verified phone and email from botim, so that I do not type them again.",
  ["Noor validates the botim assertion signature, expiry and nonce (PL-01)",
   "Name, phone and email are pre-filled and read-only unless the customer changes the email",
   "Invalid, expired or replayed assertion → standard sign-up with codes, and a security log entry",
   "The session is bound to the device in the assertion"],
  ["Assertion fields: phone (UAE flag, verified date, device binding), email (verified, date), botim user id, locale"],
  ["PL-01 hand-off", "RF-66 botim reliance"], ["Customer profile", "Consent registry (PL-19)"],
  "FE, BE, Integration", "M", "Journey step 1 · BOTIM-RELIANCE-SPEC.md"))
a(row("CJ-07", "Create your account with terms and privacy", E, "User story", C, "Noor", "MVP",
  "As a customer, I accept Noor's terms and privacy policy once, in plain words, so that I know how my data is used, including the fraud check on my email and phone.",
  ["Terms of Use and Privacy policy links open the plain-words clause",
   "No separate checkbox for the digital-footprint check; it is covered by the terms",
   "Accepted versions and timestamp are stored in the consent registry",
   "'✓ Verified by botim, no code needed' is shown when the assertion covers the number"],
  ["Terms version: T&C v1.0, Privacy v1.0 (illustrative)",
   "The objection route ('contact us in the app') is linked from the clause"],
  ["PL-19 consent registry", "Legal text"], ["Consent record"],
  "FE, BE", "S", "Journey step 2 · JOURNEY-FOOTPRINT-TC-SPEC.md",
  ["Legal to confirm the footprint check under the terms satisfies PDPL"]))
a(row("CJ-08", "Phone code only as a fallback", E, "User story", C, "Noor", "MVP",
  "As a customer whose number botim already verified, I am not asked for a code; I get one only when there is a reason.",
  ["Default: no code, step 3 shows 'Skipped, verified by botim'",
   "A code is sent when: botim verification is older than 90 days or botim reports a SIM change; ATO risk is ELEVATED (RF-63); compliance switch 'always send' is on",
   "6-digit code, expiry, attempt limit and resend timer as per security policy",
   "Each case is logged with the reason"],
  ["Decision by RF-66 botimReliance(assertion, {ato})"],
  ["RF-66", "RF-63", "PL-15 SMS"], ["Verification method on the decision record (Fraud & Integrity driver, internal only)"],
  "FE, BE", "M", "Journey steps 2 and 3 · BOTIM-RELIANCE-SPEC.md",
  ["Open action from 8 Oct: confirm with compliance that relying on botim's OTP is acceptable to CBUAE"]))
a(row("CJ-09", "Overseas number: add a UAE mobile number", E, "User story", C, "Noor", "MVP",
  "As a botim user registered with a home-country number, I add my UAE mobile number, because Noor needs it for assessment and collections.",
  ["When the assertion number is not +971, show 'Add your UAE mobile number' with the reason",
   "Code sent to the UAE number; the verified number is stored as the contact number",
   "The botim number stays as the botim identifier"],
  ["UAE number required for every application"],
  ["CJ-08", "PL-15"], ["Customer profile"],
  "FE, BE", "S", "Journey step 2, scenario (c) · MEETING-1008-SPEC.md §3"))
a(row("CJ-10", "Email: verified by botim, code only if changed", E, "User story", C, "Noor", "MVP",
  "As a customer, my botim-verified email is used without a code; if I change it or botim has none, I confirm the new address with a code.",
  ["Shared email shows '✓ Verified by botim'",
   "'Use a different email' opens the field and a 6-digit code entry",
   "No email from botim → customer types one, then a code",
   "The footprint check (RF-62, RF-63) runs in the background after the email is known"],
  ["Email change is a security event and is logged"],
  ["RF-66", "PL-15 email", "PL-10 footprint vendor"], ["Contact email", "Footprint request"],
  "FE, BE", "S", "Journey step 3·1 · BOTIM-RELIANCE-SPEC.md"))
a(row("CJ-11", "Scan Emirates ID, front and back", E, "User story", C, "Noor", "MVP",
  "As a customer, I scan both sides of my Emirates ID, so that Noor can confirm who I am and check that my salary comes from the employer on my ID.",
  ["Camera capture with framing guide, glare and blur check, retake option",
   "Front and back both required; OCR reads name (EN/AR), ID number, nationality, date of birth, expiry, employer and occupation",
   "Images are stored encrypted inside Noor only; never sent to botim or lenders; lenders get the masked ID number",
   "Expired ID: the journey continues and the case is referred (Y12)",
   "Name compared with the bank account holder and UAE PASS (RF-12); employer compared with the salary payer (RF-11)"],
  ["Nationality is used only to route the newcomer evidence offer (CJ-34); never a score, limit or price input"],
  ["PL-09 OCR", "PL-20 document store", "RF-11", "RF-12", "RF-65"], ["EID data on the application", "POL_ID_VALID, POL_EMPLOYER_MATCH rules"],
  "FE, BE, Integration", "L", "Journey step 3·2 · JOURNEY-EID-SPEC.md",
  ["OCR vendor or in-house", "Optional ICP validation via UAE PASS data"]))

# ---- Open Finance connection
E = "Open Finance connection"
a(row("CJ-12", "Choose banks and give the Al Tareq consent", E, "User story", C, "Noor", "MVP",
  "As a customer, I choose my bank and see why Noor needs my data and for how long, so that I can approve with confidence.",
  ["Bank list from the Al Tareq directory, with 'Other bank'",
   "Consent screen: purpose line, data clusters (accounts, balances, transactions, standing orders, direct debits, account holder), duration, how to revoke",
   "Purpose line: 'To work out what you can afford and, while you have a loan with Noor, to spot early if repayments might become hard for you.'",
   "The customer can connect more than one bank, one after another",
   "Copy notes upcoming coverage (e-wallets and forex from January; insurance in phase 2)"],
  ["One consent per bank today (aggregator flow); a single multi-bank consent if Nebras supports it"],
  ["PL-04 Open Finance AIS", "PL-19 consent registry"], ["Consent id per bank"],
  "FE, BE, Integration", "M", "Journey step 4 · MEETING-1008-SPEC.md §5"))
a(row("CJ-13", "Approve in the bank and return to Noor", E, "User story", C, "Noor + banks", "MVP",
  "As a customer, I approve access in my bank app (or the bank's web login) and come back to Noor, including my current, savings, credit card and loan accounts from the same bank.",
  ["Redirect to the bank app, or to the bank's web login when the app is not installed",
   "On return, Noor lists the accounts shared per bank with masks and types (current, savings, card, loan)",
   "One bank per screen; the customer can untick an account before Noor reads it, and the completeness preview updates",
   "Return handling for: rejected consent, timeout, partial accounts, bank unavailable (retry or choose another bank)"],
  ["Account type mapping feeds completeness (RF-39, RF-41)", "The bank's own screens are the bank's; Noor builds the redirect, the return and the account list"],
  ["PL-04", "RF-39"], ["Approved accounts list", "Data pull job"],
  "FE, BE, Integration", "L", "Journey steps 5 and 5·1 · JOURNEY-BANKAPP-SPEC.md"))
a(row("CJ-14", "Your data card: data completeness", E, "User story", C, "Noor", "MVP",
  "As a customer, I see how complete my financial picture is and what I connected, so that I understand why adding accounts helps.",
  ["Card shows a completeness bar with a thin threshold marker, the percentage, counts ('2 banks · 4 accounts · 12 months') and the checklist (current, salary, cards, loans)",
   "Shown back from the banks (6·0), on the budget view (7·2) and on the pre-qualified screen (7·3)",
   "At or above the threshold, the pre-qualified screen adds 'Based on {pct}% complete data · {banks} banks · {accounts} accounts'",
   "Copy is factual, with no promise of a better price"],
  ["Uses RF-39 output; the threshold value is illustrative (70) and editable under 4-eyes"],
  ["RF-39", "RF-40"], ["Journey screens"],
  "FE", "M", "Journey steps 6·0, 7·2, 7·3 · JOURNEY-CONFIDENCE-SPEC.md"))
a(row("CJ-15", "Almost there: ask for missing accounts", E, "User story", C, "Noor", "MVP",
  "As a customer whose data is below the threshold, I am told which accounts to add, so that Noor can calculate my score.",
  ["7·3 becomes 'Almost there' with chips for the missing items in the order Salary account, Credit cards, Loan accounts",
   "CTA 'Connect another account' returns to step 4",
   "No range and no score are shown; no AECB pull happens",
   "Example: Ravi with his current account unticked → 30%, ask starts with 'Salary account'"],
  ["prequalify() returns NEEDS_DATA below the threshold"],
  ["RF-39", "RF-79"], ["Journey", "Funnel analytics (drop-off)"],
  "FE", "S", "Journey step 7·3 · JOURNEY-CONFIDENCE-SPEC.md"))
a(row("CJ-16", "Back in botim: tiles and spending insights", E, "User story", C, "Noor (embedded in botim)", "MVP",
  "As a customer, after connecting I see my spending mix and budget, so that I get value before any loan.",
  ["Insights: monthly spending by category (Rent and bills, Groceries, Sending home, Transport, Dining, Other)",
   "Budget view (7·2) with income, spending, obligations and free cash flow in plain words",
   "Embeds render inside botim's frame; data stays in Noor"],
  ["Categories from PL-06; numbers from RF-13, RF-14, RF-17"],
  ["PL-06", "RF-13", "RF-14", "RF-17"], ["Insights widgets"],
  "FE, BE", "M", "Journey steps 6 and 7·2"))

# ---- Pre-qualification and loan choice
E = "Pre-qualification and loan choice"
a(row("CJ-17", "Pre-qualified range (soft check)", E, "User story", C, "Noor", "MVP",
  "As a customer, I see the range I can likely borrow, based on my connected accounts, without a credit-report check.",
  ["Shows a min-max range, the terms 6, 12 and 24 months and 'valid for 7 days'",
   "No AECB pull and no decision record at this step",
   "Below the completeness threshold → CJ-15 instead",
   "Range recalculates when accounts are added"],
  ["Logic in RF-79 (24 months, band B, instalment ≤ 50% of free cash flow, minimum 25% of the maximum)"],
  ["RF-79", "RF-39"], ["Range shown", "Prequal event"],
  "FE, BE", "M", "Journey step 7·3 · engine prequalify()"))
a(row("CJ-18", "Choose your loan: amount and term", E, "User story", C, "Noor", "MVP",
  "As a customer, I pick the amount and term within my range and see the monthly instalment for each term, so that I choose what fits.",
  ["Amount slider within the pre-qualified range, step AED 1,000",
   "Term rows 6, 12, 24 months with the monthly instalment; no per-row APR",
   "One indicative note under the rows; the final rate comes with the offer",
   "Selected amount and term go to final checks"],
  ["Instalment by RF-31 at the band mid rate (indicative)"],
  ["RF-31", "CJ-17"], ["Application amount and term"],
  "FE", "S", "Journey step 8"))
a(row("CJ-19", "Affordability check after amount-first (variant A)", E, "User story", C, "Noor", "MVP",
  "As a customer who asked for an amount first, I see whether it fits after my accounts are read, and a lower amount if it does not.",
  ["Runs the prequal caps for the chosen term",
   "If the request is above the cap: show the capped amount and the plain reason (budget or debt burden)",
   "Customer can accept the capped amount or change the term"],
  ["Cap = min(request, prequal maximum for the chosen term)"],
  ["RF-79", "CJ-04"], ["Application amount"],
  "FE, BE", "S", "Journey step 8·2 (variant A)"))

# ---- Final checks and decision
E = "Final checks and decision"
a(row("CJ-20", "Final checks: credit-report consent and UAE PASS", E, "User story", C, "Noor", "MVP",
  "As a customer, I agree to the credit-report check and confirm my identity with UAE PASS, so that Noor can give me a decision.",
  ["AECB consent box (currently proposed as pre-ticked, 'untick if you don't agree'); unticking blocks the application inline",
   "UAE PASS sign-in; the returned name and ID must match the scanned Emirates ID (RF-12)",
   "decide() is called with the application, accounts, EID scan and consents",
   "A progress state with a time budget; on timeout, the customer is told the decision will follow by notification"],
  ["The full AECB report is pulled by the licensed lender acting for Noor (PL-07)"],
  ["PL-07 AECB", "PL-08 UAE PASS", "PL-22 engine", "PL-19 consents"], ["Decision record", "Reason codes"],
  "FE, BE, Integration", "M", "Journey step 9 · MEETING-1008-SPEC.md §4",
  ["Compliance: is a pre-ticked AECB box valid consent under Federal Law 6/2010?"]))
a(row("CJ-21", "Decision outcomes: approve, refer, decline", E, "User story", C, "Noor", "MVP",
  "As a customer, I get a clear outcome: an offer, a short wait while a person checks, or a decline with the reasons in English and Arabic.",
  ["Approve → pre-offer (CJ-22)",
   "Refer → 'We're checking a few things' with the expected answer time; the case appears in the underwriter queue (UW-01)",
   "Decline → adverse-action reasons (RC_* in EN and AR) and what the customer can do next",
   "Red flags or data gaps never decline automatically; they refer"],
  ["Reason texts from the RC_* catalogue; library codes are never shown to the customer"],
  ["PL-22", "UW-01", "RF-80"], ["Customer notification"],
  "FE, BE", "M", "Journey step 9 outcome screens"))
a(row("CJ-22", "Pre-offer and hand-over to botim", E, "User story", C, "Noor", "MVP",
  "As a customer, I see Noor's recommended loan (amount, term, instalment, rate, total cost, validity) and continue in botim to finalise it with the lender.",
  ["Offer shows amount, term, monthly instalment, APR, total repayable, fees and the offer validity (14 days for the personal loan)",
   "Footer: 'Noor's part ends here: assessment, recommendation and the credit memo. botim finalises your loan with its lender.'",
   "CTA 'Continue in botim' hands over the decision id and offer token",
   "The credit memo is sent to the lender (LP-04) at this point"],
  ["Offer token conditions per product (KFS, repayment set-up, cooling-off)"],
  ["PL-22", "LP-04", "PL-01"], ["Offer token", "Credit memo"],
  "FE, BE, Integration", "M", "Journey step 10 · MEETING-1008-SPEC.md §6"))

# ---- Origination in botim (steps 11 to 16)
E = "Origination in botim (lender)"
a(row("CJ-23", "Lender confirms the offer", E, "User story", C, "botim + Partner Bank", "MVP",
  "As a customer, the lender confirms my loan after receiving Noor's memo.",
  ["Runs in botim's frame under 'botim · loan (with Partner Bank)'",
   "Partner decision (accept, decline, counter) comes back to Noor as a status event (LP-06)",
   "Noor shows the status in its loan card"],
  ["Noor's work: receive and store the status event; no screen in Noor"],
  ["LP-06"], ["Status event in the decision record"],
  "Integration", "S", "Journey step 11"))
a(row("CJ-24", "Key Facts Statement, signing, repayment set-up, cooling-off, payout", E, "User story", C, "botim + Partner Bank", "MVP",
  "As a customer, I read the Key Facts in English and Arabic, sign with UAE PASS, set up repayments, pass the 5-day cooling-off (or waive it) and receive the money.",
  ["Order enforced: offer accepted → KFS acknowledged → agreement signed → repayment set up → cooling-off cleared → disbursed",
   "Repayment: Al Tareq recurring payment at or below AED 1,000, direct debit mandate above; no salary transfer",
   "Each step returns to Noor as a status event (LP-11) for monitoring"],
  ["CBUAE Consumer Protection Regulation 8/2020: 5 business days cooling-off or a written waiver"],
  ["LP-11", "RF-99 best debit date"], ["Execution events on the decision record"],
  "Integration", "M", "Journey steps 12 to 16",
  ["Noor's own build is the event intake; screens are botim's and the lender's", "Noor is applying for a payment-initiation licence (Al Tareq PIS)"]))

# ---- After payout
E = "After payout"
a(row("CJ-25", "Contact preferences after payout", E, "User story", C, "Noor", "MVP",
  "As a customer with a new loan, I choose how Noor contacts me (email, SMS, WhatsApp, push), so that insights and check-ins reach me the way I like.",
  ["Shown once, back in Noor after payout",
   "Multi-select channels, at least one; stored with consent and timestamp",
   "recordCommunications() writes the preference; later changes in settings (CJ-30)"],
  ["Used by monitoring check-ins (UW-15) and insights"],
  ["PL-15", "PL-19"], ["Contact preferences"],
  "FE, BE", "S", "Journey step 16·1 · JOURNEY-CONTACT-SPEC.md"))
a(row("CJ-26", "Noor on the home screen and the loan card in botim", E, "User story", C, "Noor + botim", "Phase 2",
  "As a customer, I can add Noor to my home screen and see my loan status in botim.",
  ["Add-to-home-screen prompt (PWA)", "Loan card: amount, next payment date and amount, status"],
  ["Status from lender events (LP-13)"],
  ["PL-03", "LP-13"], ["Customer home"],
  "FE", "S", "Journey step 16·2"))
a(row("CJ-27", "My loan: schedule, next payment, early settlement", E, "User story", C, "Noor (data from lender)", "Phase 2",
  "As a customer, I see my repayment schedule, next payment and an early-settlement figure.",
  ["Schedule and payments from the lender feed", "Early settlement fee shown within the cap (1% of outstanding or AED 10,000)", "Statement download"],
  ["Lender is the source of truth for balances"],
  ["LP-13"], ["Customer loan screen"],
  "FE, BE", "M", "Not in prototype"))
a(row("CJ-28", "Early-warning check-in on the customer's channel", E, "User story", C, "Noor", "Phase 2",
  "As a customer whose finances changed, Noor contacts me first and offers a payment-date move or a restructure.",
  ["Message on the chosen channel with a plain explanation (EN/AR)",
   "Customer can pick a new payment date or request a call",
   "No default, legal step or account action follows from signals alone"],
  ["Triggered by RF-48 severity and the action ladder"],
  ["RF-48", "UW-15", "PL-15"], ["Contact log"],
  "FE, BE", "M", "Monitoring screen · RED-FLAGS-SPEC.md"))
a(row("CJ-29", "Insights after the loan", E, "User story", C, "Noor", "Later",
  "As a customer, I keep getting monthly spending insights while my accounts are connected.",
  ["Monthly refresh updates insights", "Message on the chosen channel"],
  ["Uses the monthly refresh (RF-98)"], ["RF-98", "RF-14"], ["Insights"], "FE", "M", "Not in prototype"))

# ---- Consents and support
E = "Consents and support"
a(row("CJ-30", "Privacy and consent centre", E, "User story", C, "Noor", "MVP",
  "As a customer, I see and manage my consents: Open Finance per bank, credit-report consent, the footprint check, contact channels, and I can ask for my data to be deleted.",
  ["List of consents with date and version", "Revoke Open Finance per bank (also revocable in the Al Tareq dashboard)",
   "Object to the footprint check", "Change contact channels", "Request a copy or deletion of data (PDPL), with the retention exceptions explained"],
  ["Revoking Open Finance while a loan is open stops monitoring; the loan is unaffected"],
  ["PL-19", "PL-26"], ["Consent registry updates", "Data subject request ticket"],
  "FE, BE", "M", "Not in prototype", ["Retention periods to be set with compliance"]))
a(row("CJ-31", "Help and complaints", E, "User story", C, "Noor", "MVP",
  "As a customer, I can ask for help and raise a complaint in the app, and track it.",
  ["Help articles EN/AR", "Complaint form with reference number and status", "Complaints visible to operations with SLA"],
  ["CBUAE consumer protection: complaint handling and timelines"],
  ["PL-15", "PL-21"], ["Complaint queue"],
  "FE, BE", "M", "Not in prototype"))
a(row("CJ-32", "Arabic and English, right-to-left", E, "Feature", C, "Noor", "MVP",
  "As a customer, I can use every Noor screen in Arabic or English.",
  ["All customer copy in EN and AR, including reasons and KFS links", "RTL layout for Arabic", "Language from the botim locale with a switch"],
  ["Numbers and currency formatted per locale"],
  ["PL-03"], ["All customer screens"],
  "FE", "L", "Reason codes EN/AR in prototype"))
a(row("CJ-33", "Application status and notifications", E, "User story", C, "Noor", "MVP",
  "As a customer, I am notified when a referred application is decided, when an offer is about to expire and when my loan is paid out.",
  ["Push via botim where available, otherwise SMS or email", "Templates EN/AR", "Deep link back to the right step"],
  ["Offer expiry from the token validity"],
  ["PL-15", "PL-30 jobs"], ["Notifications"],
  "BE", "M", "Not in prototype"))

# ---- Newcomer evidence
E = "Newcomer evidence"
a(row("CJ-34", "Offer home-country evidence to newcomers", E, "User story", C, "Noor", "Phase 2",
  "As a newcomer with a thin UAE credit file, I can add my home-country credit report or bank statements, so that my history counts.",
  ["Offered only when the AECB file is thin or no-hit and the UAE footprint is under 12 months",
   "Routing by the EID nationality to supported corridors (India, Pakistan, Egypt); other countries see 'not available yet'",
   "Two options: Credit Passport (home bureau import with consent) or upload 6 months of statements",
   "Optional; skipping does not decline"],
  ["Nationality only routes the offer; never a score input"],
  ["RF-55 to RF-60", "PL-20"], ["Evidence on the application"],
  "FE, BE", "M", "Loan screen, newcomer personas · STATEMENTS-SPEC.md"))
a(row("CJ-35", "Upload home-country statements", E, "User story", C, "Noor", "Phase 2",
  "As a newcomer, I upload my last 6 months of home bank statements as PDFs and see whether they can be used.",
  ["PDF upload with progress", "Result: months covered (6 of 6 needed), name match, integrity check",
   "Incomplete → 'not used' with what is missing; integrity or name failure → referred to fraud review, never auto-declined"],
  ["Parsing and checks in RF-55, RF-56"],
  ["RF-55", "RF-56", "PL-20"], ["Statements evidence"],
  "FE, BE", "M", "Loan screen, statements · STATEMENTS-SPEC.md"))

# ---- Other products
E = "Other products"
a(row("CJ-36", "Car loan journey", E, "User story", C, "Noor + Partner Bank", "Phase 2",
  "As a customer buying a car, I enter the vehicle and down payment and see how much Open Finance lets me borrow versus documents only.",
  ["Vehicle price, year (≤ 5 years old), dealer; down payment",
   "Shows the LTV cap (80%), the 60-month cap and the instalment",
   "Comparison 'documents only vs Open Finance' with the uplift explanation (e.g. rent counted at 75% adds capacity)",
   "Dealer payout and RTA mortgage handled by the lender"],
  ["Logic in RF-82 to RF-84"],
  ["RF-82", "RF-83", "RF-84"], ["Car application"],
  "FE, BE", "L", "Car screen · CAR-LOAN-SPEC.md"))
a(row("CJ-37", "Split a purchase", E, "User story", C, "Noor + lender", "Phase 2",
  "As a customer, I pick a recent purchase and split it into 3, 6 or 12 monthly payments, and the purchase amount is credited back.",
  ["Eligible purchases from the last 60 days shown (RF-93)", "Plans 3, 6, 12 months with monthly fee and APR equivalent",
   "Split capacity shown and reduced after each plan"],
  ["Logic in RF-93 to RF-95"],
  ["RF-93", "RF-94", "RF-95"], ["Split plan"],
  "FE, BE", "L", "Split screen · NOOR-PIVOT.md"))
a(row("CJ-38", "Starter loan and upgrade", E, "User story", C, "Noor + lender", "Later",
  "As a customer with little history, I start with a small loan and, after repaying on time, I am offered a larger one.",
  ["Starter AED 1,000 for 1 month", "After ≥ 1 on-time repayment, upgrade options (base or enhanced tier) with the tenor curve price"],
  ["Logic in RF-96"], ["RF-96"], ["Upgrade offer"],
  "FE, BE", "L", "Upgrade screen · NOOR-PIVOT.md v2.1"))
a(row("CJ-39", "Salary advance", E, "User story", C, "Noor + lender", "Later",
  "As a salaried customer, I take an advance on my next salary for a flat fee.",
  ["Up to 80% of salary, capped at AED 13,500", "Flat fee AED 50", "Repaid from the next salary credit"],
  ["Logic in RF-97"], ["RF-97", "RF-04"], ["Advance"],
  "FE, BE", "M", "Loan screen, salary advance"))
a(row("CJ-40", "SME working capital journey", E, "User story", "Business owner", "Noor + lender", "Later",
  "As the owner of a small trading company, I apply for working capital with my business accounts and, separately, my personal accounts as guarantor.",
  ["Trade licence and UBO (KYB)", "Connect business accounts; separate owner consent for personal accounts",
   "Personal guarantee disclosure in EN and AR", "Signatory signs via UAE PASS; direct debit on the business account"],
  ["Logic in RF-85 to RF-92"], ["RF-85 to RF-92", "PL-07 commercial AECB"], ["SME application"],
  "FE, BE", "XL", "SME screen · SME-SPEC.md", ["KYB vendor", "Compliance on cooling-off for micro businesses"]))

# ---- Experiment and analytics
E = "Experiment and analytics"
a(row("CJ-41", "Event stream to botim", E, "Feature", "System (Noor)", "Noor", "MVP",
  "As botim, I receive Noor's funnel events, so that we can measure the placement.",
  ["Events: impression, journey_started, accounts_connected, applied, funded; each with variant and surface",
   "No PII; events go only to botim", "Retries and idempotency keys"],
  ["Schema versioned"], ["PL-02"], ["botim analytics", "RP-14"],
  "BE", "S", "Journey event log · BOTIM-V28-SPEC.md"))
a(row("CJ-42", "A/B assignment of the entry variant", E, "Feature", "System (Noor)", "Noor", "MVP",
  "As the product team, we assign each botim user to variant A (Loans screen, amount first) or B (prequal first) and keep it sticky.",
  ["50/50 random split at first impression, stable per botim user id", "Variant on every event",
   "Sample size target about 13,809 entry users per arm (two-proportion test; the baseline and target funded rates are inputs)"],
  ["Assignment stored server-side; kill switch to force one variant"],
  ["PL-02", "RP-14"], ["Variant per user"],
  "BE", "S", "Journey experiment panel"))
a(row("CJ-43", "Customer journey analytics instrumentation", E, "Feature", "Product analyst", "Noor", "MVP",
  "As a product analyst, I see step-level drop-off for the journey, by variant and surface.",
  ["Every step view and action is tracked (internal analytics, not sent to botim)", "Errors and timeouts tracked per integration"],
  ["No raw financial data in analytics"], ["PL-32"], ["RP-13, RP-14 dashboards"],
  "FE, Data", "M", "Not in prototype"))

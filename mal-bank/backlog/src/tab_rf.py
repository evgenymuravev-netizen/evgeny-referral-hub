from common import row

S = "System (Mizan)"
T = "Risk feature"
RF = []


def f(rid, title, epic, rel, desc, ac, calc, inp, out, comp, size, ref, oq=""):
    RF.append(row(rid, title, epic, T, S, "Noor", rel, desc, ac, calc, inp, out, comp, size, ref, oq))


OF = "Open Finance transactions (PL-04, PL-06)"

# ---- Income
E = "Income"
f("RF-01", "Own-account transfer matching", E, "MVP",
  "Find transfers between the customer's own connected accounts so they are not counted as income or spending.",
  ["A debit in one account and a credit in another own account, same amount, within 2 days → paired and excluded",
   "Card repayments from a current account are tagged as card payments, not spending (spend is read on the card)",
   "Unit tests with paired, unpaired and partial transfers"],
  ["Match on amount (exact, after FX to AED), date window ±2 days, counterparty name = account holder or own IBAN/mask"],
  [OF, "Account list with IBANs/masks"], ["Clean ledger used by RF-02 to RF-24"],
  "Data, BE", "M", "Implicit in prototype fixtures")
f("RF-02", "Salary detection and monthly salary", E, "MVP",
  "Identify salary credits in connected accounts and compute the monthly salary.",
  ["Detects salary for Ravi (AED 12,000, payer 'SALARY/WPS …', day 27)",
   "No salary when credits are irregular or below a minimum",
   "Output includes the account where salary lands (used by completeness)",
   "Rules documented feature-by-feature (Phase 1 is an expert method)"],
  ["Candidate = recurring credit from the same payer, monthly cadence (±5 days), amount within ±20% of its median, or payer text with salary markers (SALARY, WPS, PAYROLL)",
   "salaryMonthly = median of the last 3 to 6 detected credits",
   "POL_INCOME_VERIFIED passes when salary is seen in connected accounts (or in documents)"],
  [OF, "RF-01"], ["salaryMonthly, salaryPayer, salaryAccount, salaryDetected", "DBR (RF-28), scorecard (+15 salary verified), G07 Salary Verified"],
  "Data, BE", "L", "engine uaeSalaryInfo() · Loan screen",
  ["Thresholds (±5 days, ±20%) are proposals for the risk team"])
f("RF-03", "Salary paid through WPS", E, "MVP",
  "Flag whether the salary arrives through the UAE Wage Protection System.",
  ["Ravi → true", "Flag available as whitelist metric salaryViaWps for partner codes (PR-PB-G01 'Salary Through WPS')"],
  ["salaryViaWps = salary payer narrative contains a WPS marker"],
  ["RF-02"], ["salaryViaWps", "Partner reason code PR-PB-G01"],
  "Data", "S", "REASON-CODES-SPEC.md §3")
f("RF-04", "Salary credit day", E, "MVP",
  "The usual day of the month the salary lands.",
  ["Ravi → 27", "Handles month-end shifts (salary on 30th or 1st) and weekends"],
  ["Modal day of month of the last 6 salary credits; weekend/holiday shifts mapped to the nominal day"],
  ["RF-02"], ["salaryCreditDay", "Best debit date (RF-99), RF_PAYMENTS_STOPPED (RF-46)"],
  "Data", "S", "engine monitoringOf()")
f("RF-05", "Salary regularity since arrival", E, "MVP",
  "How many of the connected months show a salary, and since when.",
  ["Returns months with salary / months available (e.g. 12 of 12)", "Used by the Newcomer component and anchors"],
  ["salaryMonthsSeen = count of months with a salary credit; salaryRegular = seen in every month since the first salary"],
  ["RF-02", "RF-40"], ["salaryMonthsSeen, salaryRegular", "Newcomer level (RF-77), anchors (RF-54)"],
  "Data", "S", "engine noorScoreComponents()")
f("RF-06", "Income volatility", E, "MVP",
  "Month-to-month variation of income.",
  ["Population standard deviation / mean of monthly income over the connected months",
   "Boundary tests at 10, 20 and 40%"],
  ["incomeVolatilityPct = stdev(monthly income) / mean × 100",
   "Scorecard: ≤ 20% → +15; ≥ 40% → −25 (split and loan cards)", "Split policy: max 40%",
   "Library: G04 Stable Income ≤ 10%; Y05 Irregular Income > 20%"],
  ["RF-02", "RF-07", "RF-40"], ["incomeVolatilityPct", "Scorecards, policy, reason codes, partner-code whitelist"],
  "Data", "S", "engine splitScore(), library")
f("RF-07", "Additional regular income (non-salary)", E, "MVP",
  "Detect verified regular income other than salary, such as rent received or a second employer.",
  ["a1 (car loan persona): rent AED 5,000 to 10,000 a month detected → G01 Detected Additional Income",
   "Requires the source to repeat for the minimum months (car: 12)", "Typed per source: RENTAL, SECOND_JOB, OTHER"],
  ["Recurring credits from the same non-employer payer, monthly cadence, ≥ regularIncomeMinMonths (12)",
   "Counted in DBR income at regularIncomeCountedPct (75%) for the car loan; CBUAE allows salary plus regular income",
   "G01 fires on regular non-salary income or variable pay ≥ AED 1,000 a month"],
  ["RF-01", "RF-02"], ["regularIncomeMonthly, regularIncomeCountedMonthly, sources[]", "DBR (RF-28), additional income bucket (RF-81), G01"],
  "Data, BE", "M", "Car screen, a1 · CAR-LOAN-SPEC.md",
  ["Which sources Partner Bank accepts for DBR income"])
f("RF-08", "Variable pay (overtime, bonus, commission)", E, "MVP",
  "Income above the base salary from the same employer, averaged over the history.",
  ["Ravi: overtime swings under AED 1,000 → 'None detected (< AED 1,000)'",
   "Share available as a metric for partner code PR-LB-Y01 'Variable Pay Above 30%'"],
  ["variablePayMonthly = mean(max(0, employer credits − base salary)) over the months",
   "variablePaySharePct = variablePayMonthly / total employer income × 100"],
  ["RF-02"], ["variablePayMonthly, variablePaySharePct", "Additional income bucket, partner codes"],
  "Data", "S", "MEETING-1008-SPEC.md §1a")
f("RF-09", "Verified income and income bucket", E, "MVP",
  "Total verified monthly income used for affordability, and its band for lenders.",
  ["Ravi → AED 10,000 to 15,000 / month bucket", "Bands: AED 5,000 steps up to 20,000, then AED 10,000 steps"],
  ["verifiedIncome = salaryMonthly + counted regular income (product rules)", "incomeBand per the steps above"],
  ["RF-02", "RF-07"], ["verifiedIncome, incomeBand", "DBR, memo (RF-81)"],
  "BE", "S", "engine incomeBand()")
f("RF-10", "Employer name from the salary payer", E, "MVP",
  "Extract a clean employer name from the salary narrative.",
  ["Strips markers (SALARY, WPS, reference numbers)", "Normalises case, punctuation, legal suffixes (LLC, FZE, FZCO, L.L.C)"],
  ["Token list of the payer name after cleaning"],
  ["RF-02"], ["employerTokensPayer", "RF-11"],
  "Data", "S", "engine employerTokens()")
f("RF-11", "Employer match: Emirates ID vs salary payer", E, "MVP",
  "Check that the employer on the Emirates ID is the company paying the salary.",
  ["Match at ≥ 70% token similarity → G08 Employer Confirmed",
   "Mismatch → POL_EMPLOYER_MATCH REFER (Y11), never a decline or price change",
   "What-if test: same card with salary from 'PALMGATE TRADING' → mismatch"],
  ["employerMatchScore = token overlap between EID employer and payer tokens (after normalisation, EN and AR transliteration)",
   "match when score ≥ 70"],
  ["CJ-11 EID scan", "RF-10"], ["employerMatch, employerMatchScore", "Fraud & Integrity level, reason codes"],
  "Data, BE", "M", "Journey step 3·2 · JOURNEY-EID-SPEC.md")
f("RF-12", "Name match: ID vs account holder vs UAE PASS", E, "MVP",
  "Confirm the connected accounts belong to the applicant.",
  ["Mismatch → REFER to fraud review (R01 Fraud Suspicious); never an automatic decline",
   "Handles Arabic and English names, order, middle names and transliteration"],
  ["Fuzzy name similarity (token-based plus transliteration table) ≥ agreed threshold between EID name, UAE PASS name and Open Finance account holder"],
  ["CJ-11", "PL-08", "PL-04 parties data"], ["idNameMatch", "Fraud & Integrity, R01"],
  "Data, BE", "M", "Decision log, Fraud & Integrity",
  ["Threshold to be set on real data"])

# ---- Spending and cash flow
E = "Spending and cash flow"
f("RF-13", "Average monthly spending", E, "MVP",
  "Average monthly outgoings that are not debt repayments or own transfers.",
  ["Excludes own-account transfers and card repayments", "Loan instalments go to obligations (RF-25), not spending",
   "Card spending read from card accounts when connected"],
  ["spendMonthly = mean over connected months of debits (current, savings, cards) excluding own transfers, card repayments and loan instalments"],
  ["RF-01", "RF-25", "PL-06"], ["spendMonthly", "FCF (RF-17), savings buffer (RF-19), insights"],
  "Data", "M", "Journey step 7·2 budget")
f("RF-14", "Spending categories and mix", E, "MVP",
  "Share of spending by category for insights and features.",
  ["Categories: Rent and bills, Groceries, Sending home (international transfers), Transport, Dining, Other; plus Airline for monitoring",
   "Shares sum to 100%", "Mizan stores 'international transfer' and 'airline purchase' only, never the destination"],
  ["categoryShare = category spend / total spend"],
  ["PL-06 categorisation"], ["categoryShares", "Insights, essential expenses, dining share, red flags"],
  "Data", "S", "Journey insights (Ravi mix totals AED 7,400)")
f("RF-15", "Essential expenses band", E, "MVP",
  "Monthly essential spending for the affordability aggregates.",
  ["essentials = spend × (Groceries + Bills + Transport shares)", "Band in AED 1,000 steps, 'Below AED 1,000' at the bottom"],
  ["As above; rent included in Bills"],
  ["RF-13", "RF-14"], ["essentialExpensesBand", "Memo aggregates (RF-81)"],
  "BE", "S", "engine memo aggregates")
f("RF-16", "Dining share", E, "MVP",
  "Share of spending on dining out.",
  ["G03 Dining Out Lover fires at ≥ 20% of spending", "Whitelist metric diningSharePct for partner codes"],
  ["diningSharePct = Dining / total spend × 100"],
  ["RF-14"], ["diningSharePct", "G03, partner codes"],
  "Data", "S", "REASON-CODES-SPEC.md")
f("RF-17", "Free cash flow", E, "MVP",
  "What is left each month after spending and debt payments.",
  ["fcf = income − spending − obligations (monthly, rounded)", "Only computed when spending is seen and Open Finance is consented",
   "Scorecard: ≥ AED 5,000 → +20; < AED 1,500 → −30", "Credit Behaviour: red if negative, yellow under 1,500"],
  ["freeCashFlowMonthly = verifiedIncome − spendMonthly − obligations"],
  ["RF-09", "RF-13", "RF-27"], ["freeCashFlowMonthly, fcfBand", "Limit (RF-18), scorecard, components, R07, memo"],
  "BE", "S", "engine evaluateLoan()")
f("RF-18", "Instalment-to-free-cash-flow cap", E, "MVP",
  "The new instalment must fit in a share of free cash flow.",
  ["Budget = 50% of FCF (instalmentToFcfMaxPct, bounds 10 to 80)", "maxByFcf = PV of the budget at the band mid rate over the tenor, floored to AED 1,000",
   "POL_INSTALMENT_TO_FCF fails only when no amount fits"],
  ["fcfBudget = floor(pct/100 × FCF); maxByFcf = floor1000(PV(fcfBudget, midRate/12, tenor))"],
  ["RF-17", "RF-31", "RF-75"], ["maxByFcf, instalment share band", "Limit selection (RF-30)"],
  "BE", "S", "engine evaluateLoan()")
f("RF-19", "Savings buffer in months", E, "MVP",
  "How many months of spending the customer holds in liquid balances.",
  ["Ravi → 1.33 months", "G02 Saver fires at ≥ 1 month or with regular transfers to savings (RF-20)", "Whitelist metric savingsMonths"],
  ["savingsMonths = average liquid balance (current + savings, 3 months) / spendMonthly"],
  ["RF-13", "RF-21"], ["savingsMonths", "G02, Credit Behaviour, partner codes"],
  "Data", "S", "REASON-CODES-SPEC.md")
f("RF-20", "Regular transfers to savings", E, "MVP",
  "Detect a habit of moving money to savings.",
  ["Own transfers to a savings account in ≥ 3 of the last 6 months → true"],
  ["Uses RF-01 pairs where the destination is a savings account"],
  ["RF-01"], ["regularSaver", "G02 Saver"],
  "Data", "S", "REASON-CODES-SPEC.md")
f("RF-21", "Balance baselines", E, "MVP",
  "Current balance and 3-month average balance across connected accounts.",
  ["avgBalance3m and balanceNow per customer, recomputed at each refresh"],
  ["Daily end-of-day balance averaged over 90 days; balanceNow = latest"],
  ["PL-04 balances"], ["avgBalance3m, balanceNow", "RF-44, RF-19, SME buffer"],
  "Data", "S", "engine rfInputs()")
f("RF-22", "Overdraft and negative-balance days", E, "MVP",
  "Days with a negative balance in the last 12 months.",
  ["Count of days with end-of-day balance < 0", "SME scorecard: > 5 days → −20; home statements: 0 days counts as clean conduct"],
  ["negativeBalanceDays = count over 365 days"],
  ["PL-04 balances / transactions"], ["negativeBalanceDays", "Scorecards, conduct"],
  "Data", "S", "engine smeScore()")
f("RF-23", "Returned cheques and returned debits", E, "MVP",
  "Bounced cheques or failed direct debits in the last 12 months.",
  ["Counts from AECB and from connected-account narratives (RETURNED, UNPAID, INSUFFICIENT)",
   "POL_CHEQUE_RETURNS tolerance 1 (bounds 0 to 5); scorecard −30 when ≥ 1; R04 over tolerance"],
  ["chequeReturns12m = max(AECB count, observed count)"],
  ["RF-33", "PL-06"], ["chequeReturns12m", "Policy, scorecard, Credit Behaviour"],
  "Data", "S", "engine evaluateLoan()")
f("RF-24", "International transfer share and own baseline", E, "MVP",
  "Share of income sent abroad in the last 30 days and the customer's own usual share.",
  ["intlShare30d and intlShare6m computed without destination country", "Inputs to RF-43 only"],
  ["intlShare30d = international transfers 30d / income 30d; intlShare6m = same over 6 months"],
  ["PL-06 (international transfer category)", "RF-09"], ["intlShare30d, intlShare6m", "RF_REMITTANCE_SURGE"],
  "Data", "S", "RED-FLAGS-SPEC.md")

# ---- Obligations and affordability
E = "Obligations and affordability"
f("RF-25", "Observed obligations in connected accounts", E, "MVP",
  "Monthly loan and card repayments seen in the customer's accounts.",
  ["Recurring loan instalments (personal, car, mortgage) and card payments detected per facility",
   "Ravi → AED 900 a month"],
  ["observedObligationsMonthly = sum of recurring loan debits + card obligation convention (to agree with Partner Bank, e.g. 5% of card limit)"],
  ["RF-01", "PL-06", "Loan and card accounts (PL-04)"], ["observedObligationsMonthly", "RF-27"],
  "Data", "M", "engine evaluateCar() reconciliation",
  ["Card obligation convention for DBR"])
f("RF-26", "AECB obligations and ESR", E, "MVP",
  "Monthly obligations from the bureau and the expense-to-salary ratio.",
  ["aecbObligations = sum of instalments on active facilities + card convention", "ESR = aecbObligations / salary × 100",
   "POL_MAX_ESR 60% (bounds 30 to 90); scorecard ESR > 40% → −20"],
  ["As above"],
  ["RF-33", "RF-02"], ["aecbObligations, esrPct", "Policy, scorecard, RF-27"],
  "BE", "S", "engine evaluateLoan()")
f("RF-27", "Obligations reconciliation", E, "MVP",
  "Use the higher of observed and bureau obligations, and flag hidden debt.",
  ["obligations = max(observed, AECB) + home-country EMIs from statements (Y08)",
   "Driver text: 'Obligations reconciled with AECB (no hidden debt)' or 'seen above the AECB figure, the higher one counts'"],
  ["As above"],
  ["RF-25", "RF-26", "RF-57"], ["obligationsMonthly, obligationsReconciled", "DBR, FCF, Decision log"],
  "BE", "S", "engine carUplift()")
f("RF-28", "Debt burden ratio before and after the loan", E, "MVP",
  "DBR per CBUAE Regulation 29/2011.",
  ["dbrPct = (obligations + new instalment) / DBR income × 100, one decimal", "Ravi: (900 + 1,311.70) / 12,000 = 18.4%",
   "Cap 50% (retiree 30%), enforced again after the amount is chosen (double enforcement)", "G09 < 30%, Y06 40 to 50%, R05 over the cap"],
  ["DBR income = salary + counted regular income (product rule)", "Engine takes min(policy cap, hard cap) so a pack can never loosen it"],
  ["RF-09", "RF-27", "RF-31"], ["dbrPct, dbrPctSalaryOnly, dbrBand", "REG_DBR_CAP, memo (banded), library"],
  "BE", "S", "engine evaluateLoan()")
f("RF-29", "DBR headroom and maximum affordable instalment", E, "MVP",
  "How much more monthly debt the customer can carry under the cap.",
  ["headroom = cap% × DBR income − obligations", "maxByDbr = PV(headroom, midRate/12, tenor), floored to 1,000",
   "Memo: headroom after the new instalment in AED 500 bands (Ravi: AED 3,500 to 4,000)"],
  ["As above"],
  ["RF-28", "RF-31", "RF-75"], ["headroomMonthly, maxByDbr, headroomBand", "Limit (RF-30), memo"],
  "BE", "S", "engine evaluateLoan()")
f("RF-30", "Limit selection (minimum of candidates)", E, "MVP",
  "Approved amount = the lowest of all caps, with the binding cap recorded.",
  ["Candidates: requested, DBR headroom, FCF cap, 20× salary, product cap (+ LTV, revenue, DSCR, haircuts by product)",
   "Binding key stored (REQUESTED, DBR_HEADROOM, FCF, SALARY_MULTIPLE, PRODUCT_CAP, …)", "Below request → Y09 Amount Adjusted to Fit"],
  ["pickMin(candidates)"],
  ["RF-18", "RF-29", "RF-82", "RF-89"], ["approved, binding, candidates[]", "Offer, Decision log, reason codes"],
  "BE", "S", "engine pickMin()")
f("RF-31", "Loan maths library", E, "MVP",
  "Shared functions for instalments, present values and rates.",
  ["annuityPayment, pvAnnuity, monthly IRR → APR equivalent, floor to 1,000, rounding rules", "Unit tests against known values"],
  ["Standard reducing-balance annuity formulas"],
  ["None"], ["Library used by every product"],
  "BE", "S", "engine pvAnnuity(), annuityPayment(), monthlyIrr()")
f("RF-32", "Tenor rules", E, "MVP",
  "Clamp the term to product rules.",
  ["Personal loan ≤ 48 months; car ≤ 60; split 3, 6, 12 only; SME allowed terms round up", "Clamped → Y10 Term Adjusted to Rules"],
  ["effTenor = min(requested, cap) or next allowed term"],
  ["Policy packs"], ["effectiveTenor", "Pricing and limits, reason codes"],
  "BE", "S", "engine evaluateLoan()")

# ---- Bureau
E = "Bureau (AECB)"
f("RF-33", "AECB report parsing", E, "MVP",
  "Turn the AECB consumer report into features.",
  ["Fields: hit/no-hit, score, active facilities, cards, limits, balances, instalments, worst delinquency (DPD30, DPD90, write-off), returned cheques, enquiries, new credit lines in 90 days",
   "Parser tested on sample reports supplied by Partner Bank"],
  ["Field mapping per the AECB report schema"],
  ["PL-07 AECB"], ["aecb.* features", "RF-26, RF-34 to RF-38, scorecard base"],
  "BE, Integration", "L", "engine aecbOf()")
f("RF-34", "Card utilisation now and 3 months ago", E, "MVP",
  "Share of card limits in use, and its change.",
  ["util = card balances / card limits × 100", "3-month-ago value from AECB history or connected card accounts"],
  ["As above, across all cards"],
  ["RF-33", "PL-04 card accounts"], ["cardUtilPct, cardUtil3mAgo, cards", "RF-42"],
  "Data", "S", "engine rfChecks()")
f("RF-35", "Delinquency history", E, "MVP",
  "Worst payment status on the bureau file.",
  ["POL_DELINQUENCY fails on DPD90 or write-off (R03 Past-Due History)", "DPD30 → Credit Behaviour yellow"],
  ["worstDelinquency over the AECB history window"],
  ["RF-33"], ["worstDelinquency", "Policy, components, library"],
  "BE", "S", "engine evaluateLoan()")
f("RF-36", "Thin file detection and strategy", E, "MVP",
  "Decide how to treat a no-hit or thin bureau file.",
  ["No-hit or thin → Y04 Thin Credit File", "Strategy per pack (thinFileAction REFER for personal loan)",
   "Cash-flow proxy base 640 on split and statements paths, grade capped at B"],
  ["thin = no hit or fewer than N facilities (N to agree)"],
  ["RF-33"], ["thinFile, scoreBasis", "Scorecards, POL_THIN_FILE"],
  "BE", "S", "engine splitScore(), loanScore()")
f("RF-37", "Stacking speed: new credit lines and enquiries", E, "Phase 2",
  "How fast the customer is taking on new credit.",
  ["newCreditLines90d from AECB where available, else 'none seen'", "Stacking & Skip: red at 3+ new lines, yellow at 2"],
  ["Count of facilities opened in the last 90 days; enquiries in 30 and 90 days"],
  ["RF-33"], ["newCreditLines90d, enquiries30d, enquiries90d", "Stacking & Skip level"],
  "BE", "S", "engine noorScoreComponents()",
  ["Depends on what the AECB report returns via the lender"])
f("RF-38", "Pays cards and loans on time (observed)", E, "MVP",
  "Repayments seen in connected accounts are made on time.",
  ["G05 fires when repayments are seen, no delinquency, no returned cheques", "Whitelist metric onTimeRepayments"],
  ["onTime = observed obligations > 0 and worstDelinquency = NONE and chequeReturns = 0; count of on-time repayments"],
  ["RF-25", "RF-35", "RF-23"], ["onTimeRepayments", "G05, Credit Behaviour"],
  "Data", "S", "engine noorScoreComponents()")

# ---- Data completeness
E = "Data completeness"
f("RF-39", "Data completeness score", E, "MVP",
  "Step 1 of the score: how much of the customer's financial picture Noor sees.",
  ["Weights: current account 50 (20 if almost empty), salary account 20, credit cards 15, loan accounts 15",
   "Ravi all accounts → 100%; card and loan unticked → 70%; current unticked → 30% with ask 'Salary account' first",
   "Current account only, no salary → 50%", "Output: pct, threshold, components, ask, counts (banks, accounts, months)"],
  ["Threshold completenessThresholdPct 70 (bounds 50 to 90, 4-eyes)", "Below → prequal NEEDS_DATA; decide() REFER RC_DATA_INCOMPLETE (Y13)",
   "Savings accounts add visibility but no points"],
  ["RF-41", "RF-02"], ["dataCompleteness", "Journey (CJ-14, CJ-15), memo ring (no threshold), G11, Y07, Y13"],
  "BE", "M", "engine dataCompleteness() · JOURNEY-CONFIDENCE-SPEC.md")
f("RF-40", "Connected history months", E, "MVP",
  "How many months of transaction history the customer shared.",
  ["monthsHistory = months covered by the connected accounts", "G06 12M+ History Shared; Y02 3M (3 to 5); Y03 6M (6 to 11); split needs ≥ 3"],
  ["Months between the earliest and latest transaction across approved accounts"],
  ["PL-04"], ["monthsHistory", "Library, policy, scorecard (≥ 12 months → +10 on split)"],
  "Data", "S", "engine dataCompleteness()")
f("RF-41", "Account type and activity classification", E, "MVP",
  "Classify each approved account and whether it is active.",
  ["Types: current, savings, card, loan (car loans count as loans), other",
   "Regular activity: ≥ 3 months with ≥ 20 transactions a month; else 'almost empty'"],
  ["dcKind from the Open Finance account type; txPerMonth from transactions"],
  ["PL-04"], ["account kind, txPerMonth", "RF-39"],
  "Data", "S", "engine dcKind()")
f("RF-74", "Completeness overlay on NoorScore", E, "MVP",
  "Low data lowers the score, not only a flag.",
  ["≥ 85% → 0; 70 to 84% → −10 points", "Ravi at 70% → 727 (still grade B, same price band and amounts)", "No dataSources → no overlay (old behaviour)"],
  ["Applied as a scorecard overlay when the application carries dataSources"],
  ["RF-39", "RF-70"], ["Score overlay", "NoorScore, factor word 'Part of the financial picture not connected'"],
  "BE", "S", "engine loanScore()")

# ---- Red flags (early warning)
E = "Red flags (early warning)"
GR = "Never inputs: nationality, destination country, religion, service names. Own-history baselines only."
f("RF-42", "RF_CARDS_MAXED", E, "MVP",
  "Card use jumped to near the limit.",
  ["Fires when utilisation ≥ 90% across ≥ 2 cards AND up ≥ 30 pp vs 3 months ago", "Does not fire at 89%, +29 pp or with 1 card",
   "Severity MEDIUM; origination → REFER; monitoring → check-in"],
  ["Params: cardsMaxedUtilisationPct 90 (75 to 100), cardsMaxedMinCards 2 (2 to 5), cardsMaxedRisePp 30 (15 to 60)", GR],
  ["RF-34"], ["Flag with observed, baseline, threshold, values", "RF-48, RF-49, Stacking & Skip"],
  "BE", "S", "Policy console early-warning block · RED-FLAGS-SPEC.md")
f("RF-43", "RF_REMITTANCE_SURGE", E, "MVP",
  "Money sent abroad surged against the customer's own habit.",
  ["Fires when 30-day international transfers ≥ 80% of income AND ≥ 2× own 6-month share", "Usual level never fires; multiple cannot go below 1.5×",
   "Severity MEDIUM"],
  ["Params: remittanceShareOfIncomePct 80 (50 to 100), remittanceMultipleOfBaseline 2 (1.5 to 5)", GR],
  ["RF-24"], ["Flag", "RF-48, RF-49"],
  "BE", "S", "RED-FLAGS-SPEC.md")
f("RF-44", "RF_BALANCES_DRAINED", E, "MVP",
  "Balances emptied with a large transfer out.",
  ["Fires when balances are down ≥ 80% vs the 3-month average AND one outgoing transfer ≥ 50% of that average", "Severity MEDIUM"],
  ["Params: balanceDropPct 80 (50 to 95), outboundShareOfAvgBalancePct 50 (25 to 90)", GR],
  ["RF-21"], ["Flag", "RF-48, RF-49"],
  "BE", "S", "RED-FLAGS-SPEC.md")
f("RF-45", "RF_TRAVEL_AFTER_DISBURSAL (monitoring)", E, "Phase 2",
  "Airline purchase soon after the loan was paid out.",
  ["Fires on an airline purchase ≥ AED 1,000 within 30 days after disbursal", "Severity LOW: watch only, never actioned alone"],
  ["Params: travelMinAmountAed 1,000 (500 to 5,000), travelWindowDays 30 (7 to 60)", GR],
  ["RF-14 airline category", "Disbursal date (LP-11)"], ["Flag", "EXIT_RISK (RF-47)"],
  "BE", "S", "RED-FLAGS-SPEC.md")
f("RF-46", "RF_PAYMENTS_STOPPED (monitoring)", E, "Phase 2",
  "Salary late or a missed collection after a good run.",
  ["Fires when salary is ≥ 7 days late vs its usual day, or a collection is missed after ≥ 3 on time", "Severity MEDIUM"],
  ["Params: salaryLateDays 7 (3 to 15), onTimeRunMin 3 (2 to 6)"],
  ["RF-04", "LP-13 repayment feed"], ["Flag", "RF-48"],
  "BE", "S", "RED-FLAGS-SPEC.md")
f("RF-47", "EXIT_RISK pattern", E, "Phase 2",
  "Combination suggesting the customer may leave the UAE without repaying.",
  ["HIGH when travel AND (remittance surge OR balances drained) AND (payments stopped OR cards maxed)", "Only while a loan is open"],
  ["Pattern rule over fired flags"],
  ["RF-42 to RF-46"], ["severity HIGH, pattern", "Specialist call (UW-15), lender status flag (LP-14)"],
  "BE", "S", "RED-FLAGS-SPEC.md")
f("RF-48", "Severity and action ladder", E, "Phase 2",
  "Turn fired flags into a severity and a required action with an SLA.",
  ["NONE → no action; LOW → watch; one MEDIUM → same-day check-in (8 h); two or more MEDIUM → 4 h; HIGH → specialist call within 24 h, new credit paused, lender status flag",
   "Offers: payment-date move or restructure; payment holiday for SME revenue drop"],
  ["Ladder and guardrails are locked text on the early-warning block"],
  ["RF-42 to RF-47", "RF-50 to RF-52"], ["severity, action, slaHours", "Monitoring queue (UW-15), customer (CJ-28)"],
  "BE", "S", "engine rfAction()")
f("RF-49", "Origination red-flag gate (POL_RED_FLAGS)", E, "MVP",
  "At application, the three origination flags can only refer to an underwriter.",
  ["Any of cards maxed, remittance surge, balances drained → REFER with R02 Recent Changes in Account Activity",
   "Never a decline, never a price change", "Switch redFlagsAtOrigination (4-eyes)"],
  ["Rule added only when the gate applies"],
  ["RF-42", "RF-43", "RF-44"], ["POL_RED_FLAGS rule", "Refer queue"],
  "BE", "S", "engine redFlagRule()")
f("RF-50", "RF_REVENUE_DROP (SME monitoring)", E, "Later",
  "Business inflows fell sharply.",
  ["Fires when 30-day inflows are ≥ 30% below the company's own 3-month average", "Shows the same month last year for seasonality", "Severity MEDIUM"],
  ["Fixed threshold 30%"],
  ["RF-85"], ["Flag", "RF-48"],
  "BE", "S", "SME-SPEC.md")
f("RF-51", "RF_FUNDS_TO_OWNER (SME monitoring)", E, "Later",
  "Unusually large transfer from the business to the owner.",
  ["Fires on a business → owner transfer ≥ 2× usual drawings", "Severity MEDIUM"],
  ["Fixed multiple 2×"],
  ["RF-91"], ["Flag", "RF-52"],
  "BE", "S", "SME-SPEC.md")
f("RF-52", "FUNDS_DIVERSION pattern (SME)", E, "Later",
  "Money moved from the business to the owner and then out of the owner's accounts.",
  ["HIGH when RF_FUNDS_TO_OWNER AND the owner's remittance surge OR balances drained", "Specialist call first; nothing frozen on signals alone"],
  ["Pattern rule"],
  ["RF-51", "RF-43", "RF-44"], ["severity HIGH", "Monitoring queue"],
  "BE", "S", "SME-SPEC.md")

# ---- Newcomer
E = "Newcomer"
f("RF-53", "Months in the UAE", E, "MVP",
  "How long the customer has had a UAE financial footprint.",
  ["From the earliest of: first UAE salary credit, oldest UAE account history, EID first issue (if available)",
   "POL_MIN_MONTHS_UAE 6 (bounds 0 to 24); Y01 New to UAE < 12; G10 Settled in UAE ≥ 24 plus anchors; Newcomer component applies < 12"],
  ["monthsInUae as above (whole months)"],
  ["RF-02", "RF-40", "CJ-11"], ["monthsInUae", "Policy, library, components, partner-code whitelist"],
  "Data", "S", "engine noorScoreComponents()",
  ["Which source wins when they disagree"])
f("RF-54", "Anchors (settled in the UAE)", E, "MVP",
  "Signals that the customer is settled.",
  ["Anchors: ≥ 24 months in the UAE; employer tenure ≥ 12 months; salary account active ≥ 12 months",
   "No anchor → Stacking & Skip yellow ('Few anchors yet')"],
  ["List of anchors met"],
  ["RF-53", "RF-05", "Employment tenure (application / AECB)"], ["anchors[]", "Stacking & Skip level, G10"],
  "BE", "S", "engine noorScoreComponents()")
f("RF-55", "Home-country statements parsing", E, "Phase 2",
  "Read 6 months of home-country bank statements (PDF) into transactions.",
  ["Corridors at launch: India, Pakistan, Egypt", "Months present, holder name, opening and closing balances, transactions",
   "Amounts converted to AED with a daily FX source (PL-31)", "Usable = integrity PASS + name match + 6 of 6 months"],
  ["Parser per bank template; fallback to manual review"],
  ["CJ-35 upload", "PL-20", "PL-31"], ["statements object", "RF-56 to RF-60"],
  "Data, ML", "XL", "engine parseStatements() · STATEMENTS-SPEC.md",
  ["Build vs buy (bank statement parsing vendors)"])
f("RF-56", "Statement integrity checks", E, "Phase 2",
  "Detect edited or fake statements.",
  ["Checks: PDF metadata and producer, font and layout consistency vs the bank template, running-balance arithmetic, totals, duplicate files",
   "FAIL → REFER to fraud review (R01), never auto-decline; other parsing steps skipped"],
  ["integrity PASS/FAIL with detail"],
  ["RF-55"], ["integrity, integrityDetail", "Fraud & Integrity, R01"],
  "Data, ML", "L", "engine statementFindings()")
f("RF-57", "Home statements evidence features", E, "Phase 2",
  "Conduct, buffer, tenure and EMIs from home statements.",
  ["Account open ≥ 5 years → +20; clean conduct (0 returned items, 0 overdraft days) → +20; buffer ≥ half a month of income → +10; remittances corroborated (≥ 85%) → +15",
   "Home EMIs added to obligations (Y08)"],
  ["Proxy base 640 on AECB no-hit, grade capped at B"],
  ["RF-55", "RF-58"], ["evidence flags, EMIs", "Scorecard (RF-70), haircut (RF-60), obligations"],
  "BE", "M", "engine loanScore()")
f("RF-58", "Remittance consistency", E, "Phase 2",
  "Do the home-account credits match the UAE salary in timing and amount?",
  ["Per month with a UAE salary: timing (0 to 3 days after payday → 1, 4 to 7 → 0.5, later → 0) × 0.5 + amount stability (1 − |amount − median| / median) × 0.5",
   "Averaged → remittanceConsistencyPct; ≥ 85% = corroborated"],
  ["As above"],
  ["RF-55", "RF-02", "RF-04"], ["remittanceConsistencyPct", "RF-57"],
  "Data", "M", "engine parseStatementsFor()")
f("RF-59", "Credit Passport (home bureau) path", E, "Phase 2",
  "Use a consented home-country bureau score for a thin-file newcomer.",
  ["Base = home bureau score, −40 conservatism overlay, grade capped at B, 50% limit haircut (entry book)", "RC_CROSS_BORDER → Y14 Additional Evidence Used"],
  ["As above"],
  ["Credit Passport vendor (PL-07 note)"], ["crossBorder path", "Scorecard, limit"],
  "BE, Integration", "L", "engine loanScore()")
f("RF-60", "Newcomer limit haircut", E, "Phase 2",
  "Reduce the limit for newcomers, less when evidence is strong.",
  ["Base 50%; −10 clean conduct, −5 buffer, −10 corroborated income; floor 25%", "Added as a pickMin candidate STATEMENTS_HAIRCUT"],
  ["haircutPct = max(25, 50 − relief); kept = floor1000(approved × (1 − haircut))"],
  ["RF-57", "RF-30"], ["statementsHaircutPct", "Limit"],
  "BE", "S", "engine evaluateLoan()")

# ---- Fraud and integrity
E = "Fraud and integrity"
f("RF-61", "Device and session risk", E, "Phase 2",
  "Signals from the device and session.",
  ["Device fingerprint, emulator or rooted device, IP outside the UAE, many applications per device", "Feeds Fraud & Integrity (currently 'not connected yet')"],
  ["Rules first, vendor score later"],
  ["Device intelligence vendor (PL-28)"], ["deviceRisk", "Fraud & Integrity"],
  "BE, Integration", "L", "Decision log 'not connected yet'")
f("RF-62", "Digital footprint: identity lane", E, "MVP",
  "Is the email and phone history consistent with a real person?",
  ["HIGH when all four pass: email ≥ 5 years old, name matched in ≥ 2 sources, phone active on a messenger, email seen by ≤ 2 lenders recently; MEDIUM on 2 or 3; else LOW",
   "Vendor data minimised at ingestion; only the lane results are stored"],
  ["As above"],
  ["PL-10 footprint vendor"], ["footprintIdentity", "Fraud & Integrity level"],
  "BE, Integration", "M", "engine assessFootprint() · FOOTPRINT-SPEC.md")
f("RF-63", "Digital footprint: account-takeover lane", E, "MVP",
  "Is the account at risk of takeover?",
  ["ELEVATED on ≥ 3 breaches or any credential-stuffing compilation", "ELEVATED → step-up (phone code and UAE PASS) before payout",
   "Never affects outcome, price or limit"],
  ["As above"],
  ["PL-10"], ["footprintAtoRisk", "CJ-08 code fallback, Fraud & Integrity yellow"],
  "BE", "S", "engine assessFootprint()")
f("RF-64", "Digital footprint: credit overlay (thin file)", E, "Phase 2",
  "Small positive score help for thin or no-hit files.",
  ["Vendor score ≥ 800 → +20; 700 to 799 → +10; below → 0 (positive only)", "Cap footprintOverlayCap 20 (0 to 30)",
   "SHADOW: computed and logged, not added; LIVE needs a 4-eyes publish after testing (RP-07)"],
  ["As above"],
  ["PL-10", "RF-36"], ["footprint overlay", "Scorecards"],
  "BE", "S", "engine assessFootprint()")
f("RF-65", "Emirates ID checks", E, "MVP",
  "Validity, age and consistency of the scanned ID.",
  ["Expiry vs today → valid or expired (Y12, REFER)", "Age from date of birth → POL_AGE 21 to 65",
   "ID number format and check digit; front and back belong to the same card", "POL_ID_VALID refers only, never declines"],
  ["As above"],
  ["CJ-11", "PL-09"], ["idExpiryValid, age, idChecks", "Policy, Fraud & Integrity"],
  "BE", "S", "engine checkEmiratesId()")
f("RF-66", "botim reliance check", E, "MVP",
  "Decide whether botim's verification is enough or a code is needed.",
  ["Default → no codes", "verifiedDaysAgo > 90 or SIM change → phone code", "ATO ELEVATED → phone code", "Overseas number → UAE number + code",
   "Changed email or no email → email code"],
  ["botimReliance(assertion, {ato})"],
  ["PL-01", "RF-63"], ["contactVerification", "Journey (CJ-08 to CJ-10), Decision log"],
  "BE", "S", "engine botimReliance() · BOTIM-RELIANCE-SPEC.md")
f("RF-67", "Mule and pass-through account pattern", E, "Phase 2",
  "Accounts used to move other people's money.",
  ["High in-out velocity, many unrelated counterparties, balance near zero after inflows", "REFER to fraud review only"],
  ["Rules over transactions; thresholds set on data"],
  ["PL-06"], ["muleRisk", "Fraud & Integrity"],
  "Data, ML", "L", "Decision log 'not connected yet'")
f("RF-68", "Income manipulation", E, "Phase 2",
  "Salary-like credits staged before applying.",
  ["Round-tripping (money in from own or related accounts and out again), new 'salary' from a non-employer just before the application"],
  ["Rules over transactions"],
  ["RF-01", "RF-02"], ["incomeManipulationRisk", "Fraud & Integrity"],
  "Data, ML", "L", "Decision log 'not connected yet'")
f("RF-69", "Repeat applications within Noor", E, "MVP",
  "Velocity of applications per person, device and bank account.",
  ["More than N applications in 30 days → REFER", "Re-application after decline within the cool-down → blocked with message"],
  ["Counts per EID, botim user, device and account"],
  ["PL-16 decision store"], ["applicationVelocity", "Policy rule"],
  "BE", "S", "Not in prototype")

# ---- Scoring and decision
E = "Scoring and decision"
f("RF-70", "NoorScore Phase 1 expert scorecard (personal and car loan)", E, "MVP",
  "The launch score: bureau base plus documented overlays.",
  ["Base = AECB score; or proxy 640 (statements, no-hit); or home bureau score (cross-border)",
   "Overlays: ESR > 40% −20; returned cheques −30; salary verified +15; employment tenure ≥ 24 months +10; cross-border −40; statements evidence (RF-57); footprint (RF-64); completeness (RF-74)",
   "Ravi → 737", "Every feature and point documented; Reproduce gives the same result"],
  ["scorecard_v0 version 0.4"],
  ["RF-26", "RF-23", "RF-02", "RF-33"], ["points, overlays[]", "Grade (RF-73), Decision log, UW-13"],
  "BE", "M", "engine loanScore()")
f("RF-71", "Split cash-flow scorecard", E, "Phase 2",
  "Score for split, built on connected-account cash flow.",
  ["Base AECB or 640 proxy (grade capped at B)", "FCF ≥ 5,000 +20; FCF < 1,500 −30; volatility ≤ 20% +15; ≥ 40% −25; history ≥ 12 months +10; returned cheques −30"],
  ["cashflow_scorecard_v0 version 0.1"],
  ["RF-17", "RF-06", "RF-40", "RF-23"], ["points", "Split decision"],
  "BE", "S", "engine splitScore()")
f("RF-72", "SME scorecard", E, "Later",
  "Score for business working capital.",
  ["Base = AECB commercial score", "Trading ≥ 3 years +10; revenue volatility ≤ 20% +10; negative days > 5 −20; owner AECB ≥ 700 +10; owner income verified +15"],
  ["sme_cashflow_scorecard_v0 version 0.1"],
  ["RF-86", "RF-87", "RF-92", "PL-07"], ["points", "SME decision"],
  "BE", "S", "engine smeScore()")
f("RF-73", "Grade, NoorScore band and factor words", E, "MVP",
  "Map points to a grade and to lender-safe words.",
  ["Grades: A ≥ 740, B ≥ 680, C ≥ 620, D ≥ 560, else E (E auto-fails)", "Band words: Excellent, Very good, Good, Fair, Poor (boundaries never shown to lenders)",
   "Lender factor words from an allowlist, top 3 by effect, no values"],
  ["pointsToGrade, noorScoreBand, noorScoreFactors"],
  ["RF-70"], ["grade, band, factors[]", "Pricing, memo"],
  "BE", "S", "engine pointsToGrade()")
f("RF-75", "Pricing band and rate", E, "MVP",
  "Rate from the grade.",
  ["Grade → band: A→A, B→B, C/D→C", "Personal loan APR: A 5.99 to 6.99%, B 7.99 to 9.99%, C 11.99 to 14.99%; car A 3.99 to 4.99%, B 5.49 to 6.49%, C 7.49 to 8.99%",
   "Mid-band rate used for capacity maths"],
  ["Point within the band to be defined (risk-based or fixed)"],
  ["RF-73", "Policy packs"], ["band, apr, midRate", "Offer, limits"],
  "BE", "S", "Policy console pricing bands",
  ["Who sets the final rate: Noor's recommendation or the lender's pricing"])
f("RF-76", "Knock-out and policy rules", E, "MVP",
  "Eligibility rules that decide FAIL, REFER or PASS.",
  ["Personal loan: age 21 to 65, salary ≥ 8,000, ≥ 6 months in the UAE, income verified, ESR ≤ 60%, no DPD90/write-off, returned cheques ≤ 1, thin file REFER, score < 620 decline, < 680 refer",
   "Regulatory: DBR cap, 20× salary, 48 months (locked)", "Every rule records observed value, threshold, result and reason code"],
  ["Rules engine with PASS / FAIL / REFER / INFO; outcome: any FAIL → DECLINE, else any REFER → REFER, else APPROVE"],
  ["All feature rows"], ["rules[], outcome", "Decision record"],
  "BE", "M", "engine evaluateLoan(), outcomeFromRules()")
f("RF-77", "NoorScore six components (levels)", E, "MVP",
  "Explain the decision in six parts with green, yellow, red levels.",
  ["Fraud & Integrity: red on mismatch or integrity FAIL; yellow on identity partly confirmed or ATO ELEVATED",
   "Newcomer: applies under 12 months; green home history used and regular salary; red neither",
   "Stacking & Skip: red 2+ departure markers or 3+ new lines; yellow 1 marker, 2 new lines or no anchor",
   "Credit Behaviour: red DPD90, returned cheques or negative FCF; yellow DPD30, volatility ≥ 40%, FCF < 1,500 or no file",
   "Affordability (aggregates, not scored) and Monitoring (post-disbursement) as bands and a status line"],
  ["Levels explain; they do not change the score until component scoring is defined"],
  ["RF-11", "RF-12", "RF-62", "RF-56", "RF-53", "RF-37", "RF-54", "RF-35", "RF-17", "RF-06"], ["components[]", "Memo bars, Decision log"],
  "BE", "M", "engine noorScoreComponents() · MEETING-1008-SPEC.md §1")
f("RF-78", "Decision assembly and audit record", E, "MVP",
  "Combine features, rules, score and limit into one immutable decision.",
  ["Record: inputs snapshot, features, rules, score, limit candidates, outcome, RC_* reasons, library codes, policy and engine versions",
   "Reproduce returns the identical result"],
  ["decide() is deterministic: no randomness, synthetic clocks injected"],
  ["All of the above", "PL-16"], ["Decision record", "Journey, Workbench, memo, audit"],
  "BE", "M", "engine decide(), reproduceDecision()")
f("RF-79", "Pre-qualification estimate", E, "MVP",
  "Soft range before the credit-report check.",
  ["24 months at band B (illustrative), instalment ≤ 50% of FCF and within DBR headroom, minimum 25% of the maximum, terms 6, 12, 24, valid 7 days",
   "Below completeness threshold → NEEDS_DATA with ask", "No AECB, no decision record"],
  ["Budget = min(headroom, 50% of FCF); max = PV(budget, band B mid rate, 24)"],
  ["RF-17", "RF-29", "RF-39"], ["prequal range", "Journey (CJ-17, CJ-19)"],
  "BE", "S", "engine prequalify()")
f("RF-80", "Reason-code library firing and mapping", E, "MVP",
  "Evaluate which library codes fire for a decision and lender.",
  ["Standard codes G01 to G11, Y01 to Y14, R01 to R09 fire from features", "Every RC_* the engine can emit maps to exactly one library code (tested)",
   "Partner codes evaluate whitelisted rules (metric, op, value) for that lender only", "Ravi → G02 to G11 (no yellow or red)"],
  ["libraryCodesFor(record, lenderId)"],
  ["Most feature rows", "RP-06"], ["codes[] per lender", "Memo, SFTP, journey step 10 behind the scenes"],
  "BE", "M", "engine libraryCodesFor() · REASON-CODES-SPEC.md")
f("RF-81", "Lender bands for the memo", E, "MVP",
  "Banded values so lenders cannot back out exact income.",
  ["Income bucket; additional income bucket; DBR band (5-point steps); headroom band (AED 500 steps); FCF band; instalment share band; AECB score band; essential expenses band",
   "dbrPrecision BAND by default; EXACT only per agreement"],
  ["Band functions per output"],
  ["RF-09", "RF-07", "RF-28", "RF-29", "RF-17"], ["memo aggregates", "Credit memo (LP-03)"],
  "BE", "S", "engine dbrBand(), headroomBand()")

# ---- Product-specific
E = "Product-specific"
f("RF-82", "Car loan: LTV and vehicle rules", E, "Phase 2",
  "Loan-to-value and vehicle eligibility.",
  ["LTV cap 80% of vehicle price (locked)", "Vehicle ≤ 5 years old; minimum AED 20,000; product cap 750,000", "Down payment = price − approved; check own funds cover it"],
  ["ltvMax = 80% × price added to pickMin"],
  ["Vehicle details (CJ-36)", "RF-21"], ["ltvMaxAmount, downPayment, downPaymentCoveredByOwnFunds", "Limit, memo"],
  "BE", "S", "engine evaluateCar()")
f("RF-83", "Car loan: regular income counted in DBR", E, "Phase 2",
  "Count verified regular income (e.g. rent) in DBR at 75%.",
  ["Counted when seen ≥ 12 months", "Explanation shows DBR on salary alone vs with counted income"],
  ["regularIncomeCountedMonthly = 75% × regularIncomeMonthly"],
  ["RF-07"], ["DBR income", "RF-28"],
  "BE", "S", "engine carUplift()")
f("RF-84", "Car loan: documents-only vs Open Finance", E, "Phase 2",
  "Show the uplift that Open Finance gives.",
  ["Two runs: documents only and Open Finance; uplift AED and explanation", "Affluent scenario: about AED 30,000 more approved"],
  ["Same evaluator with and without connected data"],
  ["RF-83", "RF-27"], ["uplift", "Car journey, memo"],
  "BE", "S", "Car screen · CAR-LOAN-SPEC.md")
f("RF-85", "SME revenue and operating outflows", E, "Later",
  "Monthly business revenue and costs from the business accounts.",
  ["revenue = credits − owner injections − inter-account transfers", "operating outflows = debits − inter-account transfers (drawings included)"],
  ["12 months, per month"],
  ["Business accounts (PL-04)", "RF-01"], ["revenue_m, operating_m", "RF-86, RF-88"],
  "Data", "M", "engine evaluateSme()")
f("RF-86", "SME NOCF and revenue volatility", E, "Later",
  "Net operating cash flow and stability.",
  ["NOCF = mean(revenue) − mean(operating outflows)", "volatility = stdev / mean of revenue"],
  ["As above"],
  ["RF-85"], ["nocfMonthly, revenueVolatilityPct", "Capacity, scorecard"],
  "BE", "S", "engine evaluateSme()")
f("RF-87", "SME negative days and returned cheques", E, "Later",
  "Business account conduct.",
  ["Negative-balance days over 12 months; returned cheques ≤ 1 (POL_RETURNED_CHEQUES)"],
  ["As RF-22, RF-23 on business accounts"],
  ["RF-22", "RF-23"], ["features", "Scorecard, policy"],
  "BE", "S", "engine smeScore()")
f("RF-88", "SME top-customer concentration", E, "Later",
  "Dependence on one customer.",
  ["topCustomerPct = largest payer share of revenue; > 40% → warning finding"],
  ["As above"],
  ["RF-85"], ["topCustomerPct", "Business findings"],
  "BE", "S", "engine evaluateSme()")
f("RF-89", "SME capacity and DSCR", E, "Later",
  "How much the business can borrow.",
  ["DSCR cap = PV(50% × NOCF, mid rate, tenor); revenue cap = 1.0 × average monthly revenue; product cap 500,000; minimum 25,000; floored to 1,000",
   "DSCR = NOCF / instalment ≥ 1.5×"],
  ["pickMin of the caps"],
  ["RF-86", "RF-31"], ["capacity, dscr", "SME limit, memo band"],
  "BE", "S", "engine evaluateSme()")
f("RF-90", "SME guarantee factor, owner DBR and buffer", E, "Later",
  "Test the owner as personal guarantor.",
  ["Factor: verified strong 100%, verified weak 80%, unverified 65%", "Owner DBR = (personal obligations + 50% × instalment) / personal income ≤ 50%",
   "Owner buffer = liquid balances / instalment ≥ 3"],
  ["Tests run at min(request, capacity) before the factor"],
  ["Owner's personal accounts (separate consent)", "RF-91"], ["guaranteeStatus, factor", "Approved amount"],
  "BE", "M", "engine evaluateSme()")
f("RF-91", "SME owner drawings and commingling", E, "Later",
  "Owner income from the business and mixing of funds.",
  ["Drawings regular when seen in ≥ 10 of 12 months", "Commingling: business revenue into personal accounts or business costs paid from them"],
  ["As above"],
  ["RF-85", "Owner accounts"], ["drawingsMonthly, comminglingFound", "Owner findings, RF-51"],
  "Data", "M", "engine evaluateSme()")
f("RF-92", "SME trading age", E, "Later",
  "Months since the trade licence was issued.",
  ["Minimum 12 months trading and 12 months of business history", "≥ 36 months → +10"],
  ["Whole months between licence issue date and today"],
  ["Trade licence (KYB)"], ["tradingMonths", "Policy, scorecard"],
  "BE", "S", "engine wholeMonthsBetween()")
f("RF-93", "Split: eligible purchase detection", E, "Phase 2",
  "Find recent purchases that can be split.",
  ["Card or current-account purchases in the last 60 days (purchaseLookbackDays 14 to 120) not already split", "Category kept, merchant hidden from lenders"],
  ["Filters on category, amount and date"],
  ["PL-06"], ["purchase candidates", "Split journey"],
  "Data", "M", "Split screen")
f("RF-94", "Split capacity", E, "Phase 2",
  "Revolving limit for splits.",
  ["Capacity = multiple of FCF by band: A 3×, B 2×, C 1×; product cap 50,000", "Minimum income 5,000; minimum FCF 1,000; volatility ≤ 40%; ≥ 3 connected months"],
  ["As above"],
  ["RF-17", "RF-71"], ["splitCapacity", "Split journey"],
  "BE", "S", "engine evaluateSplit()")
f("RF-95", "Split pricing", E, "Phase 2",
  "Monthly fee and APR equivalent.",
  ["Monthly fee rate by band: A 1.25%, B 1.75%, C 2.25%", "APR equivalent from monthly IRR, shown in the KFS"],
  ["monthlyIrr of the fee schedule"],
  ["RF-31"], ["fee, aprEquivalent", "Offer, KFS"],
  "BE", "S", "engine splitPlan()")
f("RF-96", "Starter loan and upgrade tiers", E, "Later",
  "Small first loan, then upgrade on good repayment.",
  ["Starter AED 1,000, 1 month, 50% APR", "Enhanced tier (UAE + verified home statements, ≥ 12 months income history): up to 3,000, 6 months, APR 45% → 35%",
   "Base tier: up to 1,500, 3 months, APR 48% → 42%", "≥ 1 on-time starter repayment; late → R09"],
  ["APR falls linearly with tenor; publish-time invariants checked"],
  ["RF-55", "RF-31"], ["upgrade options", "Upgrade journey"],
  "BE", "M", "engine upgradeOptionsFor()",
  ["APR levels need a consumer-protection review"])
f("RF-97", "Salary advance", E, "Later",
  "Advance on the next salary.",
  ["80% of salary (50 to 90), cap 13,500, flat fee 50, minimum salary 5,000, score ≥ 600", "Due on the next salary day"],
  ["As above"],
  ["RF-02", "RF-04"], ["advance amount", "Advance journey"],
  "BE", "S", "engine evaluateAdvance()")

# ---- Monitoring
E = "Monitoring"
f("RF-98", "Monthly refresh while a loan is open", E, "Phase 2",
  "Re-read connected accounts each month and recompute features.",
  ["Runs one month after the decision and monthly after, within the Al Tareq consent", "Recomputes income, FCF, DBR, red flags; stores a snapshot"],
  ["Scheduled job per loan"],
  ["PL-04", "PL-30"], ["monthly snapshot", "Early warning, Phase 2 model data"],
  "Data, BE", "M", "engine monitoringOf()")
f("RF-99", "Best debit date", E, "MVP",
  "The day after the usual salary credit.",
  ["salary day < 28 → day + 1; else the 1st", "Ravi: salary on the 27th → 28th"],
  ["As above"],
  ["RF-04"], ["bestDebitDay", "Repayment set-up, memo monitoring line"],
  "BE", "S", "engine monitoringOf()")
f("RF-100", "Early-warning portfolio scan", E, "Phase 2",
  "Run red flags across all open loans and create cases.",
  ["Runs after each refresh", "Creates cases with severity and SLA; sends the lender status flag on HIGH", "Simulation mode for policy changes"],
  ["earlyWarningScan()"],
  ["RF-42 to RF-52", "RF-98"], ["cases", "UW-15, LP-14"],
  "BE", "M", "Monitoring screen")
f("RF-101", "Monitoring status per loan", E, "Phase 2",
  "One status line per loan.",
  ["Status: Active or Elevated, best debit date, next refresh date"],
  ["From RF-100 and RF-99"],
  ["RF-99", "RF-100"], ["status line", "Memo, Lender view, customer"],
  "BE", "S", "Lender view monitoring line")

RF.sort(key=lambda r: int(r[0].split("-")[1]))

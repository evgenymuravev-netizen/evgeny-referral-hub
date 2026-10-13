# Addendum v2.7 — Car loan for an affluent client: Open Finance finances AED 30,000 more — binding spec

Source: Noor product request (1 Oct 2026): "an affluent client is applying for a car loan and we want to
approve 30k AED more thanks to open banking".

The point to land: **a new product is a policy pack on the shared Mizan layer, not a new engine.** A car loan
reuses AECB, NoorScore, DBR, BANDED_APR pricing, repayment routing, the 6-step execution sequence and the
credit memo. It adds one primitive, **collateral / loan-to-value**, and one evidence rule, **regular income
verified through Open Finance**.

## 1. Regulation (CBUAE Regulation 29/2011, bank retail loans to individuals)

- Car loan ≤ **80% of the vehicle's value**; tenor ≤ **60 months**; secured by a **mortgage over the car**
  (registered with the RTA in favour of the lender).
- **DBR ≤ 50% of gross salary and other regular income** (30% retirees); the car loan sits inside the same 50%
  as every other instalment, including credit cards.
- AECB check before any loan (Federal Law 6/2010); KFS in Arabic and English; cooling-off 5 business days
  (CPR 8/2020); early settlement fee capped at 1% of outstanding or AED 10,000.
- No 20× salary multiple (that cap is for personal loans); the LTV cap does that job.

## 2. Why Open Finance changes the amount (the mechanism, honest)

Market practice: banks count 70–80% of rental income toward DBR, but only with proof the rent is
**received**. A tenancy contract (Ejari) proves a contract, not a payment. In Noor's instant digital journey,
without Open Finance, the only verifiable income is the salary (salary certificate). Declared rental income
would need a manual review of uploaded statements, which takes days, so the **instant offer counts salary
only**. With Open Finance (Al Tareq), Mizan sees 12 months of rent actually landing on schedule, in a
different bank from the salary, and counts it at 75%. It is a policy parameter, so the policy console can
change it under 4-eyes.

It works both ways. The same data shows spending and the obligations actually leaving the accounts. A free
cash flow rule applies when spending is visible.

## 3. Persona a1 (data.js `MizanData.personasCar = [a1]`; loan-persona shape like j1)

**Karim Nassar** (كريم نصار), 44, 11 years in the UAE (monthsInUae 132), Commercial Director at an FMCG
distributor in Dubai (PRIVATE, salaryMonthly **45,000**, tenureMonths 72, not a retiree).
- AECB: hit, score **790**, esrPct 44, obligationsMonthly **19,700** (home mortgage 17,200 + credit cards
  2,500), tradelines 5, chequeReturns12m 0, worstDelinquency NONE.
- `bankData` for documents: `{ source:'DOCUMENTS', salaryDetected:true, salaryCertificate:true }`. The
  documents path verifies salary from a salary certificate. When Open Finance is consented, the engine
  reads `connected` instead.
- `connected` (ALTAREQ_TPP, 12 months, 3 accounts):
  - Mashreq current ••7714 (salary account, balance 64,200)
  - HSBC current ••3302 (rent account, balance 118,500)
  - ADCB savings ••5568 (balance 236,000)
  - avgMonthlyIncome **54,000** (salary 45,000 every month + rent 27,000 in Jan/Apr/Jul/Oct)
  - avgMonthlySpend **18,000**; incomeVolatilityPct small
  - observedObligationsMonthly **19,700** = the AECB figure (mortgage + cards, reconciled)
  - monthly series of 12 consistent with the means
  - `regularIncome: [{ type:'RENTAL', label:'Rent — apartment (tenancy registered with Ejari)', frequency:'QUARTERLY',
    amountPerReceipt:27000, receipts12m:4, monthlyEquivalent:9000, onSchedule:true, matchesTenancy:true,
    account:'HSBC ••3302' }]`
- `vehicleQuote`: `{ category:'SUV', condition:'NEW', modelYear:2026, priceAed:225000, dealer:'Partner dealer, Dubai',
  quoteRef:'DQ-2026-0418', validUntil: TODAY+14 }`. No real make, model or dealer names.
- `defaultRequest: { amount:180000, tenorMonths:60 }`: the maximum the regulation allows (80% of 225,000),
  a 20% down payment of 45,000.
- tagline: "Commercial Director, 11 years in the UAE — buying a family SUV; rents out an apartment".

## 4. Engine (additive only)

**Manifest:** `{ productId:'car_loan', nameEn:'Car loan', nameAr:'قرض سيارة', segment:'CONSUMER',
structure:'Secured amortising loan (vehicle mortgage)', pricingMode:'BANDED_APR' }`.

**Policy pack `car_loan`:**
- regulatory (locked):
  `{ dbrCapPct:50, dbrCapRetireePct:30, ltvCapPct:80, tenorCapMonths:60, aecbCheckRequired:true, coolingOffDays:5,
  earlySettlementFeeCap:'1% of outstanding or AED 10,000', security:'Vehicle mortgage registered with the RTA in favour of the lender' }`
- params:
  `{ minSalary:8000, minAge:21, maxAge:65, scoreDecline:620, scoreRefer:680, minMonthsInUae:6, chequeReturnsMax:1,
  minAmount:20000, productCap:750000, maxVehicleAgeYears:5, regularIncomeCountedPct:75, regularIncomeMinMonths:12,
  instalmentToFcfMaxPct:50, pricingBands:{ A:[0.0399,0.0499], B:[0.0549,0.0649], C:[0.0749,0.0899] }, tokenValidityDays:14 }`
- PARAM_BOUNDS for each scalar, e.g. `regularIncomeCountedPct [0,100]`, `maxVehicleAgeYears [0,10]`,
  `productCap [100000,2000000]`, `minAmount [5000,100000]`, `instalmentToFcfMaxPct [10,80]`, plus the
  personal-loan-like ones.
- The platform rules ride on it as on every pack.
- `REFER_SLA_HOURS.car_loan = 8`.

**decide({ productId:'car_loan', applicant, amount, tenorMonths, vehicle?, consents })**
- `vehicle` defaults to `applicant.vehicleQuote`. It is required: throw "a car loan needs the vehicle quote
  (price, condition, model year)" if absent.
- AECB consent is required, as everywhere.
- Open Finance is optional. Without it, the documents path decides.

**Evaluation (`evaluateCar`).** Reuse `normalizeLoan` + `loanScore`; the grade comes from the existing bands.

Income counted for DBR:
- Salary always counts:
  - verified by the salary certificate on the documents path;
  - verified via connected accounts when Open Finance is granted (score +15 overlay as today).
- Regular income counts **only when Open Finance is granted** and each entry has 12 months of connected
  history, `onSchedule && matchesTenancy`, and `receipts12m` ≥ the expected count (MONTHLY 12, QUARTERLY 4).
  It is counted at `regularIncomeCountedPct`: Karim's 9,000 × 75% = **6,750**.

Rules (rule ids are new where needed; statuses as existing):
- `REG_AECB_CHECK`
- `REG_TENOR_CAP` (60; clamp with RC_TENOR_CAP)
- `REG_LTV_CAP`: "Car loan within 80% of the vehicle value (Reg 29/2011)". Value = approved ÷ price as %.
  Always PASS (the amount is clamped); RC_LTV_CAP when the request exceeds it.
- `REG_DBR_CAP`: final check on (obligations + instalment) ÷ (salary + counted regular income).
- `POL_AGE`, `POL_MIN_SALARY`, `POL_MIN_MONTHS_UAE`, `POL_THIN_FILE` (REFER), `POL_DELINQUENCY`,
  `POL_CHEQUE_RETURNS`, `POL_SCORE_CUTOFF` (decline / refer as the personal loan).
- `POL_VEHICLE`: new, or ≤ maxVehicleAgeYears; quote not expired.
- `POL_MIN_AMOUNT`.
- `POL_REGULAR_INCOME` (informational, never changes the outcome):
  - with Open Finance: "Rental income verified — 4 of 4 quarterly receipts in 12 months, matches the tenancy
    — counted at 75%";
  - without: "Declared other income not counted — not verifiable in an instant decision".
- `POL_INSTALMENT_TO_FCF`: only when spending is seen (Open Finance). It is also a limit candidate.

Limit = `pickMin` over the candidates below, each floored to AED 1,000:
- Requested amount
- **LTV 80% × vehicle price** (key `LTV_CAP`)
- **DBR headroom PV** at the mid-rate over the effective tenor (key `DBR`)
- FCF budget PV (key `FCF`, when spending is seen)
- Product cap

Label each trace row in plain words. Example: "DBR headroom — 50% of AED 51,750 (salary 45,000 + 75% of rent
9,000) − obligations 19,700 = AED 6,175/month".

Pricing: `BANDED_APR` at the mid-band rate. The KFS adds `vehiclePrice`, `downPayment`, `ltvPct`, the
`security` text and the insurance condition.

**Expected numbers (assert exactly):**

| | Documents only (salary certificate + AECB) | With Open Finance (Al Tareq) |
|---|---|---|
| Income counted | 45,000 | 51,750 (45,000 + 75% × 9,000) |
| NoorScore / grade | 780 (790 − 20 ESR + 10 tenure) · A | 795 (+15 salary via connected account) · A · "Excellent" |
| APR | 4.49% (mid A) | 4.49% |
| Approved | **AED 150,000**, DBR binds (headroom 2,800/mo) | **AED 180,000**, the 80% LTV maximum (= request) |
| Instalment / 60 months | AED 2,795.77 | AED 3,354.93 |
| Total repayable | AED 167,746.25 | AED 201,295.50 |
| DBR after the loan | 49.99% | 44.55% (on salary alone it would be 51.23%: over the cap) |
| Down payment | AED 75,000 | AED 45,000 |
| Instalment ÷ free cash flow | — | 20.6% (FCF 16,300) |

Outcome: APPROVE in both. Documents only carries RC_LIMIT_REDUCED; Open Finance carries no reduction.
**Uplift +AED 30,000.**

**`rec.openFinanceUplift`** (car_loan, only when Open Finance is granted): a pure re-evaluation of the same
application with `openFinance:false`. Nothing is stored and no clock tick happens; reuse the
evidenceComparison pattern. It returns:

```
{ documentsOnly:{ outcome, approved, bindingConstraint, monthlyInstalment, downPayment, dbrPct, incomeCounted },
  openFinance:{ ...same for this record },
  upliftAed: 30000, downPaymentSavedAed: 30000,
  drivers:[ 'Rental income verified — counted at 75% (AED 6,750/month)', 'Salary verified in connected accounts',
            'Obligations reconciled with AECB (no hidden debt)', 'Down payment covered by own funds in connected accounts' ] }
```

Without Open Finance, `openFinanceUplift` is null. The UI then shows a CTA: "Connect your accounts — verified
rental income could raise this".

**Execution:**
- The same 6 events. `execSteps('car_loan')` keeps the labels; the DISBURSED description reads "Partner
  Bank pays the dealer; the car is released with the mortgage registered".
- Token conditions:
  - KFS acknowledged (AR + EN)
  - the repayment-method condition (180,000 → direct debit)
  - "Comprehensive motor insurance with Partner Bank as loss payee"
  - "Vehicle mortgage registered with the RTA in favour of Partner Bank"
  - "Down payment of AED 45,000 paid to the dealer" (the figure from the record)

**Credit memo (allowlist, v2.5 rules apply):**
- Terms add `vehicle:{ category, condition, modelYear, priceAed, ltvPct, downPayment }`. These are dealer
  quote data, not Open Finance, so exact figures are fine.
- Affordability bands come from income counted: 51,750 → "AED 50,000–60,000 / month"; DBR band "35–50%".
- Flags:
  - `otherIncome:'Rental income verified via Open Finance (12 months) — counted at 75%'` (category only)
  - `downPaymentSource:'Own funds — verified in connected accounts'`
- Withheld: exact rent, receipts, balances, account names and banks, spending.
- SFTP: existing columns. Product `car_loan`; `tenor` 60.
- Privacy scan for a1's memo and SFTP row must not find: 9000, 9,000, 27000, 27,000, 6750, 6,750, 54000,
  18000, 16300, 64,200 / 118,500 / 236,000, Mashreq, HSBC, ADCB, 7714, 3302, 5568, "transactions".

**Policy simulation:**
- `sampleBook.car_loan`: ≥ 12 seeded rows, a mix of approve, refer and decline, each with
  `vehicle:{priceAed, condition, modelYear}` and amount / tenor.
- `bookFor('car_loan')` returns it.
- `simulateBook('car_loan', params)` works; e.g. lowering `regularIncomeCountedPct` to 0 changes approvals
  for rows with regular income.
- Monitoring totals include `car_loan` wherever products are iterated.

**Reason codes (data.js, EN + MSA Arabic):**
- RC_LTV_CAP: "The amount is limited to 80% of the vehicle's value."
- RC_VEHICLE_INELIGIBLE: "The vehicle does not meet the age or quotation requirements."
- RC_BELOW_MIN_AMOUNT, if not present already.

## 5. UI: new screen "Car loan"

**Nav:** `data-screen="car"`, label **"Car loan"**, sub "Affluent · +AED 30k with Open Finance", placed right
after "Personal loan".

**Header:** eyebrow "New product on the shared layer". Title "Car loan". Lede: "Karim's salary alone supports
AED 150,000. Open Finance shows the rent he receives every quarter — Mizan counts it, and finances the full
80%: AED 30,000 more, on the same engine and the same policy rules."

**Left column:**
- Applicant card: name EN + AR, tagline, salary, AECB 790, obligations 19,700 (mortgage + cards).
- Vehicle quote card: category, condition, model year, AED 225,000, dealer, quote ref, valid until; "Max
  financing (80% LTV): AED 180,000".
- Request: amount slider 20,000…180,000 (step 1,000; max = LTV) and tenor rows 12 / 24 / 36 / 48 / 60
  (default 60).
- Consents: AECB (required; unticking blocks inline, never the fatal banner) and the **Open Finance
  toggle**, on by default.
- "Decide" (black pill).

**Right column, the decision panel:**
- Outcome chip, NoorScore + band.
- Approved amount, APR, instalment, total repayable, down payment, LTV %, repayment chip (direct debit).
- Limit trace with the binding row highlighted.
- Rules list (REGULATORY / POLICY groups, like the personal-loan screen).

**"What Open Finance changed" panel** (the hero of the screen; only when `openFinanceUplift` exists):
- Two columns:
  - "Documents only — salary certificate + AECB": AED 150,000 · down payment 75,000 · DBR binds at 49.99%.
  - "With Open Finance": AED 180,000 · down payment 45,000 · 80% LTV maximum.
- A big terracotta-filled chip: "+AED 30,000 financed".
- A one-line explanation: "At AED 180,000 the DBR on salary alone would be 51.23% — over the 50% cap.
  Verified rent adds AED 6,750/month of counted income and brings it to 44.55%."
- The drivers list.
- A small bar visual comparing the two amounts against the 180,000 LTV line, drawn with CSS only.
  Colour tokens: brand-fill for Open Finance, a muted fill for documents.

**"What Open Finance found" (internal, Noor-only) panel:**
- Each finding as label · observation · effect:
  - rent 4 of 4 quarterly receipts of AED 27,000 into HSBC ••3302, matches the tenancy → counted 6,750/month;
  - salary AED 45,000 every month into Mashreq ••7714, same employer 12 months;
  - obligations 19,700/month seen leaving the accounts = AECB, nothing hidden;
  - balances across 3 accounts cover the AED 45,000 down payment (source of funds);
  - spending ≈ AED 18,000/month → instalment 20.6% of free cash flow.
- Label it "Internal — never sent to the lender".

**Below:**
- The **execution steps** from execSteps (6), with the car-specific conditions (insurance, RTA mortgage,
  down payment) shown in the KFS preview.
- KFS preview: lender Partner Bank, vehicle price, down payment, LTV, APR, instalment, number of payments,
  total repayable, total interest, early settlement cap, cooling-off, security, insurance.
- A link "Open the lender's memo →" to Lender view with this decision selected.
- A link "Open in the Decision log →".

**Interaction:**
- Turning the Open Finance toggle off and re-deciding gives AED 150,000 with the CTA "Connect your
  accounts — verified rental income could raise this". No uplift panel.
- Moving the tenor shows the live uplift from the engine (e.g. 36 months: 94,000 → 180,000).
- Every decide() is a real DecisionRecord that appears in the Decision log and the Lender view.

**Elsewhere:**
- Overview: a topic-map row and a demo-strip step: "Car loan — Karim: salary alone supports AED 150,000;
  Open Finance verifies his rent → AED 180,000, the 80% LTV maximum (+AED 30,000)".
- Mention in the overview copy that a new product is a policy pack.
- Policy console: the car-loan pack appears with editable params and locked regulatory rows (LTV 80%, 60
  months, DBR 50%, security) plus the platform rule row.

## 6. Tests

**Selftest (new group):**
- the persona;
- both paths' exact numbers in the table;
- the uplift object is pure: no new record, no clock tick, deterministic;
- the LTV clamp (request 200,000 → 180,000 + RC_LTV_CAP);
- the 60-month clamp;
- regularIncomeCountedPct 0 via a candidate pack → OF path drops to the DBR limit (150,000 — the same as
  documents only);
- receipts 3 of 4 → rent not counted;
- AECB consent required;
- vehicle required; used vehicle older than 5 years → RC_VEHICLE_INELIGIBLE decline;
- the repayment method is DIRECT_DEBIT;
- token conditions include insurance, RTA mortgage and down payment;
- the memo privacy scan above and the memo bands;
- simulateBook('car_loan') runs;
- all existing checks stay green;
- banned vocabulary stays out.

**Browser acceptance:**
- the nav item appears;
- the default decide shows AED 180,000, the +AED 30,000 chip, both columns' figures, and the 49.99% / 44.55%
  / 51.23% line;
- toggling Open Finance off and re-deciding → 150,000 and the CTA, no uplift panel;
- the tenor at 36 → uplift equals the engine's;
- AECB unticked → blocked inline;
- the memo link opens Lender view with this decision, and the memo shows the vehicle and the bands with
  none of the forbidden figures;
- the decision is in the Decision log;
- the policy console shows the car-loan pack with LTV 80% locked;
- works at 390px without horizontal scroll;
- zero page errors and an empty fatal banner;
- light and dark themes.

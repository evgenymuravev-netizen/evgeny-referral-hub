# Addendum v2.10 — SME route: working capital on business accounts, enhanced with the owner's personal accounts — binding spec

Source: Noor board meeting, 2 Oct 2026:
- "SME route — we need to work on those flows."
- "We can enhance it with B2C open banking data."
- "We can monitor what is happening with the customer's personal bank accounts."

The SME route is the contingency if retail lending takes longer. It builds loan vintage on an
equity-funded book.

**Builds on v2.9:** the `redFlags()` primitive and the monitoring scan. Build this addendum only after
v2.8 and v2.9 are merged.

## 1. Product `sme_working_capital`

**Manifest:** `{ productId:'sme_working_capital', nameEn:'Business working capital', nameAr:'قرض رأس المال العامل', segment:'SME',
structure:'Amortising business loan with the owner's personal guarantee', pricingMode:'BANDED_APR' }`.

**Who:** an owner-managed UAE trading company, with ≥ 12 months trading and ≥ 12 months of business-account
history. The owner is the authorised signatory and the personal guarantor.

**Policy pack:**
- **"Locked" block.** These are the rules Noor holds itself to. Don't present them as CBUAE consumer rules:
  the CBUAE consumer-protection rules cover individuals, so they apply to the owner as guarantor, not to
  the company. Show the line "confirm with compliance".
  ```
  { aecbCommercialRequired:true, aecbConsumerOwnerRequired:true, kybRequired:'Trade licence + UBO',
    personalGuarantee:'Owner (individual) — guarantor disclosures in Arabic and English' }
  ```
- **params:**
  ```
  { minMonthsTrading:12, minBusinessHistoryMonths:12, minAmount:25000, productCap:500000, tenorMonthsAllowed:[3,6,9,12],
    dscrBudgetPct:50, revenueMultiple:1.0, unverifiedGuaranteeFactorPct:65, ownerDbrCapPct:50,
    contingentInstalmentSharePct:50, ownerBufferMinInstalments:3, scoreDecline:600, scoreRefer:650,
    pricingBands:{ A:[0.095,0.115], B:[0.12,0.14], C:[0.15,0.18] }, tokenValidityDays:14 }
  ```
  Add PARAM_BOUNDS for each. The platform rules ride on the pack as on every pack (repayment: direct
  debit on the business account above AED 1,000).

## 2. Underwriting

**Data pulls:**
- Open Finance on the **business** accounts (Al Tareq). The consent is given by the authorised signatory
  for the company.
- AECB commercial report (company).
- AECB consumer report (owner, as guarantor).
- Trade licence (documents/KYB).
- **Optional:** Open Finance on the **owner's personal accounts** (Al Tareq B2C). It is the owner's own,
  separate consent as an individual.

**Business features** (12 months; all from data):
- avg monthly revenue: inflows excluding owner injections and inter-account transfers;
- operating outflows;
- **net operating cash flow (NOCF)**;
- revenue volatility;
- negative-balance days;
- returned business cheques;
- top-customer concentration.

**Owner features** (only with the personal consent):
- drawings from the business, and their regularity;
- other personal income;
- personal obligations (AECB consumer + observed);
- **owner DBR including a contingent share of the new instalment**: (personal obligations +
  contingentInstalmentSharePct% × new instalment) ÷ personal income;
- personal buffer: liquid balances ÷ new instalment;
- commingling check: business revenue landing in personal accounts, or business costs paid from them.
  Informational.
- `redFlags(owner, {phase:'ORIGINATION'})` from v2.9.

**Guarantee status:**
- **VERIFIED_STRONG:** owner DBR (incl. contingent) ≤ ownerDbrCapPct, buffer ≥ ownerBufferMinInstalments,
  drawings regular (≥ 10 of 12 months) and no owner red flags.
- **VERIFIED_WEAK:** personal data present but a condition fails → factor 80%.
- **UNVERIFIED:** no personal consent → factor `unverifiedGuaranteeFactorPct` (65%).
- **Owner red flags** → REFER (v2.9 rule; never auto-decline).

**Score:**
- base = AECB commercial score;
- overlays:
  - trading ≥ 3 years +10;
  - revenue volatility ≤ 20% +10;
  - negative-balance days > 5 → −20;
  - owner AECB consumer ≥ 700 +10;
  - **owner's income verified via connected personal accounts +15** (only with the personal consent);
- grades via the existing bands.

**Limit:** `pickMin` of the candidates below, floored to 1,000.
- requested amount
- **DSCR cap**: the PV of dscrBudgetPct% × NOCF over the tenor at the mid-band rate
- revenue cap: revenueMultiple × average monthly revenue
- product cap

Then × the guarantee factor (1.0 strong / 0.8 weak / 0.65 unverified), floored to 1,000. The factor
appears as a trace row ("Personal guarantee unverified — 65% of the business capacity").

**Rules:**
- REG_AECB_CHECK (commercial + owner consumer)
- POL_MIN_TRADING
- POL_HISTORY_MONTHS
- POL_SCORE_CUTOFF / POL_SCORE_REFER
- POL_RETURNED_CHEQUES
- POL_DSCR (DSCR = NOCF ÷ instalment ≥ 1.5×, reported)
- POL_GUARANTEE (the status)
- POL_RED_FLAGS (owner)
- POL_MIN_AMOUNT

## 3. Persona s1 (`MizanData.personasSme = [s1]`)

**Business:** Kamal Fresh Foods Trading LLC. Dubai mainland, food trading, trade licence issued 4 years
ago, owner and signatory **Sara Kamal** (سارة كمال), 39.
- Business accounts: 2 accounts, 12 months; avg monthly revenue **200,000**; NOCF **27,600**/month;
  volatility 14%; negative-balance days 2; returned cheques 0; top customer 22%.
- AECB commercial score **702**.
- Owner AECB consumer: score **744**, obligations **4,500**/month (car loan 3,200 + cards 1,300).

**Owner's personal accounts** (the optional consent):
- drawings **35,000**/month, 12 of 12 months;
- liquid balances **180,000**;
- spending 21,000/month;
- no remittance surge, cards not maxed, balances stable (no red flags);
- commingling: none found.

**Request:** **AED 150,000 over 12 months** to fund a larger stock order before Ramadan.

**Expected (assert exactly):**

| | Business accounts only | + owner's personal accounts |
|---|---|---|
| Score / grade | 732 (702 +10 +10 +10) · B | 747 (+15 owner income verified) · A |
| Rate (mid band) | 13.00% | 10.50% |
| DSCR cap (50% × 27,600 = 13,800/mo, 12 months) | 154,000 | 156,000 |
| Guarantee | UNVERIFIED → × 65% | VERIFIED_STRONG → × 100% (owner DBR 31.7% incl. contingent; buffer 13.6 instalments) |
| Approved | **AED 100,000** | **AED 150,000** (request binds) |
| Instalment / total | AED 8,931.73 / 107,180.73 | AED 13,222.29 / 158,667.49 |
| DSCR | 3.09× | 2.09× |

**Uplift:** +AED 50,000 and 2.5 points cheaper.

**`rec.ownerAccountsUplift`:** a pure counterfactual without the personal consent, using the
evidenceComparison / car-uplift pattern. Null when the personal consent is absent.

## 4. Monitoring (business + owner)

- **`monitoredLoans` gains 2 SME rows**, scanned by `earlyWarningScan()`. Business signals are new codes
  in the same primitive:
  - `RF_REVENUE_DROP`: business inflows down ≥ 30% vs the 3-month average (MEDIUM);
  - `RF_FUNDS_TO_OWNER`: a business → owner transfer ≥ 2× usual drawings (MEDIUM).
- **The rows:**
  - **ML-07:** revenue −35% + RF_FUNDS_TO_OWNER + owner RF_REMITTANCE_SURGE → **HIGH, pattern
    `FUNDS_DIVERSION`**. The pattern = RF_FUNDS_TO_OWNER plus (owner RF_REMITTANCE_SURGE or owner
    RF_BALANCES_DRAINED).
  - **ML-08:** revenue −32% only (seasonal) → MEDIUM, check-in, offer a payment holiday under policy.
- **Guardrails as in v2.9.** The owner's personal-account monitoring is covered by the owner's own
  consent ("while the business loan you guarantee is open").

## 5. UI: new screen "SME working capital"

**Nav:** `data-screen="sme"`, label **"SME working capital"**, sub "Business + owner's accounts", placed
after "Car loan".

**Header:** eyebrow "SME route — board, 2 Oct". Lede: "The company's accounts support AED 100,000. With
Sara's personal accounts, Mizan verifies her guarantee and her income: AED 150,000, 2.5 points cheaper —
and both sets of accounts are watched while the loan is open."

**The flow map** (the board asked for the flows): a horizontal, CSS-only stepper. On mobile it stacks.
1. Business details (trade licence lookup)
2. Connect business accounts (Al Tareq, the authorised signatory)
3. Owner connects personal accounts (optional, B2C consent)
4. AECB commercial + owner consumer consent
5. Decision (Mizan)
6. Offer + key terms + personal-guarantee disclosure (AR + EN)
7. E-sign (UAE PASS, owner)
8. Repayment: direct debit on the business account
9. Disbursement to the business account
10. Monitoring: business + owner

Highlight the steps that use Open Finance.

**Left column:** a business card, an owner card, the request (amount 25,000–500,000, terms 3/6/9/12) and
the consents: AECB (required), business Open Finance (required), owner personal Open Finance (toggle, on
by default). Then "Decide".

**Right column:**
- the decision panel: outcome, score, approved amount, rate, instalment, total, DSCR, guarantee status,
  repayment chip;
- the limit trace with the binding and guarantee-factor rows;
- **"What the owner's accounts changed"** (the uplift panel): two columns, a "+AED 50,000 · 2.5 points
  cheaper" chip, the drivers;
- an internal "Owner findings" panel (Noor-only): drawings, DBR incl. contingent, buffer, commingling,
  red flags.

**Memo:**
- the vehicle-style terms block becomes business terms: company name, trade-licence age band, revenue
  **band**, DSCR band, guarantee status flag;
- the owner's personal data is withheld (add a withheld row: "Owner's personal account data — used for
  Noor's guarantee assessment only");
- the privacy scan must not find 35,000, 180,000, 21,000, 4,500, 27,600, 200,000 (use bands) or the bank
  names.

**Elsewhere:**
- **Monitoring** shows the 2 SME rows in the red-flags panel, with an "SME" product chip.
- **Policy console** shows the SME pack.
- **Overview:** a topic-map row and a demo-strip step.
- **simulateBook:** a seeded `sampleBook.sme_working_capital` (≥ 12 rows).
- `REFER_SLA_HOURS.sme_working_capital = 24`.

## 6. Tests

**Selftest:**
- both paths' exact numbers;
- the guarantee statuses: strong / weak (owner DBR forced > 50%) / unverified;
- the owner red flag → REFER;
- the uplift is pure;
- the ML-07 FUNDS_DIVERSION pattern → HIGH, and ML-08 → MEDIUM;
- the memo privacy;
- simulateBook runs;
- all existing checks stay green.

**Browser acceptance:**
- the nav item;
- the flow map shows 10 steps;
- the default decide shows 150,000 and the uplift chip;
- toggling the owner's accounts off → 100,000;
- the memo is clean;
- the Monitoring SME rows;
- 390px; no errors; light and dark themes.

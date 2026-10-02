/*
 * Mizan — Noor's credit decisioning layer · MizanEngine (engine-2.0)
 * One shared engine behind Noor's four consumer credit products:
 *   split          — retroactive Pay in 3 / 6 / 12 on a verified past purchase,
 *                    revolving split capacity sized on connected-account cash flow
 *   personal_loan  — conventional amortising cash loan (reducing-balance APR)
 *   starter_loan   — small entry loan with an upgrade path: after an on-time
 *                    repayment, a re-decision on connected UAE accounts (+ optional
 *                    home-country statements, v2.4) offers more for less — the customer
 *                    picks amount × tenor on an APR curve that falls with tenor
 *   salary_advance — single-repayment advance against the next salary, flat fee
 *   car_loan       — secured amortising loan against a vehicle mortgage (Addendum
 *                    v2.7, ../CAR-LOAN-SPEC.md): a new policy pack on the shared
 *                    layer, not a new engine — it adds one primitive (loan-to-value
 *                    ≤ 80% of the vehicle's value) and one evidence rule (regular
 *                    income counts only when verified through Open Finance)
 * Binding spec: ../NOOR-PIVOT.md (overrides ../CONTRACT.md where they conflict;
 * Addendum v2.1 covers the starter-loan upgrade).
 *
 * Guardrails encoded as code reviewers can read:
 *  - DBR ≤ 50% of income, ≤ 30% for retirees (CBUAE Reg 29/2011) — every product,
 *    double-enforced against hard constants regardless of the policy pack.
 *  - Personal loan ≤ 20× salary and tenor ≤ 48 months (CBUAE Reg 29/2011).
 *  - Split plans only in the permitted terms 3 / 6 / 12 months.
 *  - Mandatory AECB pull, consent-gated (Federal Law 6/2010); split additionally
 *    requires UAE Open Finance (Al Tareq) consent — it underwrites on connected
 *    accounts.
 *  - Conventional consumer-protection execution order (CBUAE Consumer Protection
 *    Regulation 8/2020 + Standards): offer accepted → Key Facts Statement
 *    acknowledged → agreement e-signed → repayment set up → cooling-off cleared
 *    → disbursed. An approval is a risk decision, NOT a loan — out-of-order
 *    steps throw.
 *  - Repayment collection (Addendum v2.3, one platform rule for every product):
 *    collected from the customer's own bank account, never via their salary —
 *    approved amount ≤ AED 1,000 → Al Tareq recurring payment (Open Finance
 *    payment initiation), above → direct debit mandate (UAE DDS).
 *  - Home-country bank statements (Addendum v2.4): 6 months from India, Pakistan
 *    or Egypt, parsed for integrity, name match, conduct, EMIs, buffer and
 *    remittance corroboration. Evidence, not an override: the customer uploads
 *    them in a journey, or an underwriter requests them on a refer, and Mizan
 *    re-decides as a NEW decision that supersedes the original. A failed
 *    integrity or name check refers to fraud review — never an automatic decline.
 *  - Split pricing: flat monthly fee on the principal, with the APR equivalent
 *    (IRR of the instalment schedule) disclosed for the KFS.
 *  - Thin-file thesis: an AECB no-hit customer with enough connected-account
 *    history is underwritten on cash flow (proxy base 640, grade capped at B).
 *  - Cross-border Credit Passport path for personal-loan newcomers (consented
 *    home-bureau file, conservative overlay, grade cap B, 50% limit haircut).
 *  - 4-eyes on policy publish and refer overrides; regulatory primitives locked.
 *  - Starter-loan upgrade: a longer tenor must never cost a higher APR, and the
 *    lending partner's income (= total interest) must rise strictly with tenor —
 *    the PARTNER-INCOME GUARANTEE, enforced as a policy invariant at publish.
 *
 * Deterministic: no Math.random() in any decision path; synthetic timestamps and
 * seeded history derive from MizanData.TODAY + MizanData.history.seed. Stateful
 * in-memory; init(MizanData) resets everything. No DOM. Node ≥ 16 and browsers.
 */
(function () {
  'use strict';

  const ENGINE_VERSION = 'engine-2.0';
  const SCORECARDS = {
    loan: { model: 'scorecard_v0', version: '0.4' },             // personal_loan + salary_advance
    split: { model: 'cashflow_scorecard_v0', version: '0.1' }    // split (connected-account cash flow)
  };

  // Hard regulatory ceilings (CBUAE). The locked `regulatory` block of each policy
  // carries the same values; the engine takes min(policy, HARD) so even a
  // mis-configured pack can never loosen them.
  const HARD = { dbrCapPct: 50, dbrCapRetireePct: 30, salaryMultipleCap: 20, tenorCapMonths: 48 };
  // Car loan (v2.7, Reg 29/2011): ≤ 80% of the vehicle's value, tenor ≤ 60 months. No
  // salary multiple — the loan-to-value cap does that job for a secured car loan.
  const HARD_CAR = { ltvCapPct: 80, tenorCapMonths: 60 };
  const SPLIT_PLAN_MONTHS = [3, 6, 12];  // the only permitted split terms
  const CASH_FLOW_PROXY_BASE = 640;      // scorecard base on the AECB no-hit cash-flow path

  // Conventional execution events, in the only valid order (CBUAE consumer protection).
  // REPAYMENT_SET_UP (Addendum v2.3) sits between e-signature and cooling-off:
  // nothing is disbursed until collection from the customer's own account exists.
  const EXEC_EVENTS = ['OFFER_ACCEPTED', 'KFS_ACKNOWLEDGED', 'AGREEMENT_SIGNED',
                       'REPAYMENT_SET_UP', 'COOLING_OFF_CLEARED', 'DISBURSED'];
  // UI labels/descriptions per step, plus the guard text quoted when a step is
  // attempted out of order (keyed by the step that was EXPECTED next).
  const EXEC_STEP_INFO = {
    OFFER_ACCEPTED: {
      label: 'Offer accepted',
      description: 'Customer accepts the time-boxed offer',
      guard: 'the customer must accept the time-boxed offer before any contract step' },
    KFS_ACKNOWLEDGED: {
      label: 'KFS acknowledged',
      description: 'Key Facts Statement (Arabic + English) read and acknowledged',
      guard: 'KFS must be acknowledged before the agreement is signed — CBUAE Consumer Protection Standards' },
    AGREEMENT_SIGNED: {
      label: 'Agreement signed',
      description: 'Loan agreement e-signed via UAE PASS',
      guard: 'the agreement must be e-signed via UAE PASS before repayment collection is set up or the cooling-off period can start' },
    // Label and description follow the decision's repayment method when execSteps
    // is given a decision id (see REPAYMENT_METHODS); these are the generic ones.
    REPAYMENT_SET_UP: {
      label: 'Repayment set up',
      description: 'Al Tareq recurring payment consent up to AED 1,000, direct debit mandate above — from the customer\'s own account, no salary transfer required',
      guard: 'no disbursement until repayment collection is set up — authorise the Al Tareq recurring payment (up to AED 1,000) or activate the direct debit mandate (above) first' },
    COOLING_OFF_CLEARED: {
      label: 'Cooling-off cleared',
      description: '5 business days elapsed, or written waiver signed (CPR 8/2020)',
      guard: 'no disbursement before the cooling-off period clears or is waived — CBUAE Consumer Protection Regulation 8/2020' },
    DISBURSED: {
      label: 'Disbursed',
      description: {
        personal_loan: 'Funds credited to the customer\'s account',
        split: 'Purchase amount credited back — freed cash routed to the customer\'s goal',
        salary_advance: 'Advance credited to the customer\'s account',
        starter_loan: 'Upgraded loan credited to the customer\'s account',
        car_loan: 'Partner Bank pays the dealer; the car is released with the mortgage registered'
      },
      guard: 'funds must be disbursed to complete the sequence' }
  };

  const MANIFESTS = [
    { productId: 'split', nameEn: 'Split a purchase', nameAr: 'تقسيط مشترياتك',
      segment: 'CONSUMER', structure: 'Instalment plan (revolving split capacity)', pricingMode: 'MONTHLY_FEE' },
    { productId: 'personal_loan', nameEn: 'Personal loan', nameAr: 'قرض شخصي',
      segment: 'CONSUMER', structure: 'Amortising loan (reducing balance)', pricingMode: 'BANDED_APR' },
    { productId: 'starter_loan', nameEn: 'Starter loan', nameAr: 'قرض البداية',
      segment: 'CONSUMER', structure: 'Short amortising loan with an upgrade path', pricingMode: 'TENOR_CURVE_APR' },
    { productId: 'salary_advance', nameEn: 'Salary advance', nameAr: 'سلفة على الراتب',
      segment: 'CONSUMER', structure: 'Single-repayment advance', pricingMode: 'FLAT_FEE' },
    // Addendum v2.7 — appended last so the four existing products keep their positions.
    { productId: 'car_loan', nameEn: 'Car loan', nameAr: 'قرض سيارة',
      segment: 'CONSUMER', structure: 'Secured amortising loan (vehicle mortgage)', pricingMode: 'BANDED_APR' }
  ];

  // ---------------------------------------------------------------------------
  // Policy store: regulatory (locked — engine enforces regardless of params)
  // vs params (editable in the console under 4-eyes governance).
  // ---------------------------------------------------------------------------
  function defaultPolicies() {
    const packs = {
      split: {
        productId: 'split', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, aecbCheckRequired: true, coolingOffDays: 5,
                      allowedPlansMonths: [3, 6, 12],
                      feeDisclosure: 'Monthly fee + APR equivalent shown in KFS' },
        params: { minMonthlyIncome: 5000, minConnectedMonths: 3, purchaseLookbackDays: 60,
                  minFreeCashFlow: 1000, instalmentToFcfMaxPct: 50, maxIncomeVolatilityPct: 40,
                  scoreDecline: 600, scoreRefer: 650, chequeReturnsMax: 1, productCap: 50000,
                  splitCapacityMultiple: { A: 3.0, B: 2.0, C: 1.0 },
                  monthlyFeeRate: { A: 0.0125, B: 0.0175, C: 0.0225 },
                  tokenValidityDays: 7 }
      },
      personal_loan: {
        productId: 'personal_loan', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, salaryMultipleCap: 20,
                      tenorCapMonths: 48, aecbCheckRequired: true, coolingOffDays: 5,
                      earlySettlementFeeCap: '1% of outstanding or AED 10,000' },
        params: { minSalary: 8000, minAge: 21, maxAge: 65, scoreDecline: 620,
                  scoreRefer: 680, maxEsrPct: 60, thinFileAction: 'REFER',
                  minMonthsInUae: 6, chequeReturnsMax: 1, productCap: 500000,
                  // Annual interest rate, reducing balance, by grade band.
                  pricingBands: { A: [0.0599, 0.0699], B: [0.0799, 0.0999], C: [0.1199, 0.1499] },
                  tokenValidityDays: 14 }
      },
      // Starter loan → upgrade (Addendum v2.1). `starter` is the entry offer (for
      // reference); `tiers` are the two upgrade offers. Every tier is an APR curve
      // falling linearly from aprAtOneMonth to aprAtMaxTenor (see the pricing math
      // block). Publish-time invariants: see starterInvariants().
      starter_loan: {
        productId: 'starter_loan', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, aecbCheckRequired: true, coolingOffDays: 5 },
        params: { starter: { amount: 1000, tenorMonths: 1, apr: 0.50 },
                  tiers: {
                    // UAE connected accounts + verified home-country statements (v2.4)
                    enhanced: { maxAmount: 3000, maxTenorMonths: 6, aprAtOneMonth: 0.45, aprAtMaxTenor: 0.35 },
                    // UAE connected accounts only
                    base: { maxAmount: 1500, maxTenorMonths: 3, aprAtOneMonth: 0.48, aprAtMaxTenor: 0.42 }
                  },
                  minAmount: 500, amountStep: 100, instalmentToFcfMaxPct: 50,
                  minIncomeHistoryMonthsEnhanced: 12, minOnTimeStarterRepayments: 1, tokenValidityDays: 7 }
      },
      salary_advance: {
        productId: 'salary_advance', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        // Repayable in one go from the next salary credit. A flat fee, no interest:
        // a commercial choice that sits within the CBUAE retail fee schedule.
        regulatory: { dbrCapPct: 50, aecbCheckRequired: true, tenorCapMonths: 1 },
        params: { pctOfSalary: 80, capAmount: 13500, flatFee: 50, minSalary: 5000,
                  scoreDecline: 600, tokenValidityDays: 7 }
      },
      // Car loan (Addendum v2.7). Reuses the personal-loan scorecard, DBR, BANDED_APR
      // pricing, repayment routing, the 6-step execution and the credit memo; adds the
      // loan-to-value primitive and the Open Finance regular-income rule.
      car_loan: {
        productId: 'car_loan', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, ltvCapPct: 80, tenorCapMonths: 60, aecbCheckRequired: true, coolingOffDays: 5,
                      earlySettlementFeeCap: '1% of outstanding or AED 10,000',
                      security: 'Vehicle mortgage registered with the RTA in favour of the lender' },
        params: { minSalary: 8000, minAge: 21, maxAge: 65, scoreDecline: 620, scoreRefer: 680, minMonthsInUae: 6, chequeReturnsMax: 1,
                  minAmount: 20000, productCap: 750000, maxVehicleAgeYears: 5, regularIncomeCountedPct: 75, regularIncomeMinMonths: 12,
                  instalmentToFcfMaxPct: 50,
                  // Annual interest rate, reducing balance, by grade band (secured: below the personal loan).
                  pricingBands: { A: [0.0399, 0.0499], B: [0.0549, 0.0649], C: [0.0749, 0.0899] },
                  tokenValidityDays: 14 }
      }
    };
    // Platform rules (v2.3) ride on every pack, read-only.
    for (const pid of Object.keys(packs)) packs[pid].platform = JSON.parse(JSON.stringify(PLATFORM_RULES));
    return packs;
  }

  // Editable-parameter bounds enforced on publishPolicy/simulateBook.
  const PARAM_BOUNDS = {
    split: { minMonthlyIncome: [3000, 20000], minConnectedMonths: [1, 12], purchaseLookbackDays: [14, 120],
             minFreeCashFlow: [0, 10000], instalmentToFcfMaxPct: [10, 80], maxIncomeVolatilityPct: [15, 80],
             scoreDecline: [500, 700], scoreRefer: [550, 760], chequeReturnsMax: [0, 5],
             productCap: [5000, 200000], tokenValidityDays: [1, 30] },
    personal_loan: { minSalary: [4000, 25000], minAge: [18, 25], maxAge: [60, 70],
                     scoreDecline: [550, 720], scoreRefer: [600, 780], maxEsrPct: [30, 90],
                     minMonthsInUae: [0, 24], chequeReturnsMax: [0, 5], productCap: [100000, 2000000],
                     tokenValidityDays: [3, 30] },
    salary_advance: { pctOfSalary: [50, 90], capAmount: [5000, 25000], flatFee: [25, 300],
                      minSalary: [3000, 15000], scoreDecline: [550, 700], tokenValidityDays: [3, 14] },
    starter_loan: { minAmount: [100, 2000], amountStep: [50, 500], instalmentToFcfMaxPct: [10, 80],
                    minIncomeHistoryMonthsEnhanced: [3, 36], minOnTimeStarterRepayments: [1, 6],
                    tokenValidityDays: [1, 30] },
    car_loan: { minSalary: [4000, 25000], minAge: [18, 25], maxAge: [60, 70],
                scoreDecline: [550, 720], scoreRefer: [600, 780], minMonthsInUae: [0, 24], chequeReturnsMax: [0, 5],
                minAmount: [5000, 100000], productCap: [100000, 2000000], maxVehicleAgeYears: [0, 10],
                regularIncomeCountedPct: [0, 100], regularIncomeMinMonths: [12, 24], instalmentToFcfMaxPct: [10, 80],
                tokenValidityDays: [3, 30] },
    // v2.9 — the shared early-warning block (UAE red flags). The remittance multiple can never
    // go below 1.5×, so sending money home at the usual level can never become a flag.
    earlyWarning: { cardsMaxedUtilisationPct: [75, 100], cardsMaxedMinCards: [2, 5], cardsMaxedRisePp: [15, 60],
                    remittanceShareOfIncomePct: [50, 100], remittanceMultipleOfBaseline: [1.5, 5],
                    travelMinAmountAed: [500, 5000], travelWindowDays: [7, 60],
                    salaryLateDays: [3, 15], onTimeRunMin: [2, 6],
                    balanceDropPct: [50, 95], outboundShareOfAvgBalancePct: [25, 90] }
  };
  // Bounds for the starter loan's nested params ({starter}, {tiers.enhanced|base}).
  // APRs are annual decimals; months must be whole numbers.
  const STARTER_BOUNDS = { amount: [500, 5000], tenorMonths: [1, 6], apr: [0.05, 0.60] };
  const TIER_BOUNDS = { maxAmount: [500, 20000], maxTenorMonths: [2, 12], aprAtOneMonth: [0.05, 0.60], aprAtMaxTenor: [0.05, 0.60] };
  const MONTH_KEYS = ['tenorMonths', 'maxTenorMonths'];
  const TIER_KEYS = ['enhanced', 'base'];
  // Upgrade re-decisions need a few months of connected UAE history to read
  // income and spending at all; below this the case is referred.
  const UPGRADE_MIN_CONNECTED_MONTHS = 3;

  // ---------------------------------------------------------------------------
  // Repayment collection (Addendum v2.3) — ONE platform rule for every product.
  // Noor never asks the customer to move their salary; repayments are collected
  // from the customer's own bank account, and the APPROVED AMOUNT picks the rail:
  //   ≤ AED 1,000 (inclusive)  → Al Tareq recurring payment (UAE Open Finance
  //                               payment initiation; authorised in the banking app)
  //   > AED 1,000               → direct debit mandate (UAE Direct Debit System)
  // Split: the approved purchase-plan amount; upgrade: the selected option's
  // amount (recomputed on selectUpgradeOption); "split another purchase": the
  // new plan's amount. Declines and refers carry repayment: null.
  // ---------------------------------------------------------------------------
  const REPAYMENT_ROUTING = Object.freeze({ altareqMaxAmount: 1000 });
  const REPAYMENT_METHODS = {
    ALTAREQ: {
      label: 'Al Tareq recurring payment', labelAr: 'دفعة متكررة عبر منصة الطارق',
      setup: 'Customer authorises a recurring payment consent in their banking app via Al Tareq — instant, digital, revocable in the Al Tareq consent dashboard',
      condition: 'Repayment set up via Al Tareq recurring payment consent',
      stepLabel: 'Al Tareq payment consent authorised' },
    DIRECT_DEBIT: {
      label: 'Direct debit mandate', labelAr: 'تفويض بالخصم المباشر',
      setup: 'Mandate on the customer\'s own bank account; must be active before the first collection',
      condition: 'Direct debit mandate active on the customer\'s bank account',
      stepLabel: 'Direct debit mandate active' }
  };
  const REPAYMENT_CONDITIONS = [REPAYMENT_METHODS.ALTAREQ.condition, REPAYMENT_METHODS.DIRECT_DEBIT.condition];
  // Shown as a locked row on every policy pack; not a param, so publish refuses it.
  const PLATFORM_RULES = {
    repaymentCollection: { altareqMaxAmount: REPAYMENT_ROUTING.altareqMaxAmount, editable: false,
      rule: 'Repayment collection: Al Tareq ≤ AED 1,000 · direct debit above · no salary transfer required' }
  };
  const PLATFORM_KEYS = ['repaymentCollection', 'altareqMaxAmount', 'repaymentRouting'];
  function repaymentFor(amount) {
    if (!Number.isFinite(amount) || amount <= 0) throw err('repaymentFor needs a positive approved amount in AED');
    const method = amount <= REPAYMENT_ROUTING.altareqMaxAmount ? 'ALTAREQ' : 'DIRECT_DEBIT';
    const m = REPAYMENT_METHODS[method];
    return { method, label: m.label, labelAr: m.labelAr, setup: m.setup,
             threshold: REPAYMENT_ROUTING.altareqMaxAmount, basis: 'approved amount', amount };
  }

  // Approval-token conditions by product (conventional recourse + disclosure).
  // The repayment line is method-specific and sits second on every product.
  const KFS_CONDITION = 'Key Facts Statement acknowledged (AR + EN)';
  const ADVANCE_CONDITION = 'Repaid in one instalment on the next salary date — no salary transfer required';
  // The last upgrade line is replaced by the chosen option when selectUpgradeOption runs.
  const UPGRADE_CHOICE_PENDING = 'Customer chooses the amount and term within the offer before accepting';
  function tokenConditions(productId, repayment) {
    const repay = repayment ? REPAYMENT_METHODS[repayment.method].condition : null;
    const byProduct = {
      personal_loan: [KFS_CONDITION, repay, 'Credit life & job-loss cover offered (optional)'],
      split: [KFS_CONDITION, repay],
      salary_advance: [KFS_CONDITION, repay, ADVANCE_CONDITION],
      starter_loan: [KFS_CONDITION, repay, UPGRADE_CHOICE_PENDING],
      // car_loan: the security lines follow in tokenFor (they name the lender and the down payment)
      car_loan: [KFS_CONDITION, repay]
    };
    return (byProduct[productId] || [KFS_CONDITION, repay]).filter(Boolean);
  }
  // Car loan (v2.7): insurance and the RTA mortgage name the lender of record; the
  // down-payment line carries the figure from the decision record.
  function carConditions(lenderName, downPayment) {
    return ['Comprehensive motor insurance with ' + lenderName + ' as loss payee',
            'Vehicle mortgage registered with the RTA in favour of ' + lenderName,
            'Down payment of ' + aed(downPayment) + ' paid to the dealer'];
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  function err(msg) { return new Error('Mizan: ' + msg); }
  function clone(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function addDaysIso(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(fromIso, toIso) {
    return Math.round((new Date(toIso + 'T00:00:00Z') - new Date(fromIso + 'T00:00:00Z')) / 86400000);
  }
  const floorTo = (x, step) => Math.max(0, Math.floor(x / step) * step);
  const floor1000 = (x) => floorTo(x, 1000);
  const round2 = (x) => Math.round(x * 100) / 100;
  const round4 = (x) => Math.round(x * 10000) / 10000;
  const pct1 = (n, d) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
  // Deterministic thousands separator for human-readable labels (no locale dependency).
  const aed = (n) => 'AED ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Money with fils (2 dp), same deterministic separator: AED 3,112.50
  const money = (n) => 'AED ' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Annual rate as a percentage with 2 dp: 0.35 → '35.00%'
  const pctStr = (r) => (r * 100).toFixed(2) + '%';

  // Standard annuity math (personal-loan DBR headroom, CONTRACT §2.2):
  //   headroomMonthly = dbrCap × income − existing obligations
  //   maxByDbr = PV(annuity: headroomMonthly at midBandRate/12 over tenorMonths), floor to 1,000
  function pvAnnuity(payment, i, n) {
    if (n <= 0 || payment <= 0) return 0;
    if (i === 0) return payment * n;
    return payment * (1 - Math.pow(1 + i, -n)) / i;
  }
  function annuityPayment(principal, i, n) {
    if (n <= 0 || principal <= 0) return 0;
    if (i === 0) return principal / n;
    return principal * i / (1 - Math.pow(1 + i, -n));
  }

  // ---------------------------------------------------------------------------
  // Split pricing math (pricingMode MONTHLY_FEE)
  //
  // Fee schedule. A split of principal P over n ∈ {3, 6, 12} months at the
  // grade-banded monthly fee rate r (default A 1.25%, B 1.75%, C 2.25%) is priced
  // as a flat monthly fee on the ORIGINAL principal:
  //     monthlyFee     = P × r                 — identical every month
  //     monthlyPayment = P / n + monthlyFee    — equal instalments
  //     planTotal      = P + monthlyFee × n    — what the customer repays in total
  // Amounts are rounded to fils (2 dp); the final instalment absorbs any fils
  // rounding so the instalments always sum to planTotal.
  //
  // APR equivalent. The fee is charged on P even though the balance amortises,
  // so the true annual cost is well above 12 × r. The CBUAE Key Facts Statement
  // must show an APR, so we solve for the monthly internal rate of return i of
  // the customer's cash flows (+P today, −monthlyPayment at months 1..n):
  //     P = monthlyPayment × (1 − (1 + i)^−n) / i
  // by bisection (the PV is strictly decreasing in i, so bisection is exact and
  // cannot diverge), then annualise nominally: aprEquivalent = 12 × i.
  // Sanity anchors: n = 1 gives i = r exactly; as n grows i approaches 2r (the
  // average outstanding balance is ~half of P), so 12r ≤ APR < 24r always.
  // Consequence for the SAME monthly fee rate: the APR equivalent RISES as the
  // plan lengthens — at r = 1.25% (12r = 15%): Pay in 3 = 22.36%,
  // Pay in 6 = 25.28%, Pay in 12 = 26.62%. (For the same TOTAL fee it is the
  // other way round: the shorter plan carries the higher APR.)
  // ---------------------------------------------------------------------------
  function monthlyIrr(principal, payment, n) {
    if (!(principal > 0) || !(payment > 0) || !(n > 0)) return 0;
    if (payment * n <= principal) return 0;      // no cost to the customer
    let lo = 0, hi = 1;                          // 0% .. 100% per month brackets any real plan
    for (let k = 0; k < 100; k++) {
      const mid = (lo + hi) / 2;
      if (pvAnnuity(payment, mid, n) > principal) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function splitPlan(principal, months, rate) {
    const monthlyFee = round2(principal * rate);
    const exactPayment = principal / months + principal * rate;
    return {
      months,
      monthlyPayment: round2(exactPayment),
      monthlyFee,
      planTotal: round2(principal + monthlyFee * months),
      totalFees: round2(monthlyFee * months),
      aprEquivalent: round4(12 * monthlyIrr(principal, exactPayment, months))
    };
  }
  // Largest principal (floored to AED 100) whose instalment on an n-month plan at
  // fee rate r fits within a monthly instalment budget:  P × (1/n + r) ≤ budget.
  function maxSplitPrincipal(budgetMonthly, months, rate) {
    return budgetMonthly > 0 ? floorTo(budgetMonthly / (1 / months + rate), 100) : 0;
  }
  // Allowed split terms = policy's locked list ∩ the hard-coded permitted terms.
  function splitTerms(reg) {
    const fromPolicy = Array.isArray(reg.allowedPlansMonths) ? reg.allowedPlansMonths : SPLIT_PLAN_MONTHS;
    const terms = SPLIT_PLAN_MONTHS.filter(n => fromPolicy.includes(n));
    return terms.length ? terms : SPLIT_PLAN_MONTHS.slice();
  }
  // A requested split term outside {3,6,12} is rounded UP to the next permitted
  // term (lower instalment = more affordable), or down to 12 if above it.
  function snapSplitTerm(tenor, terms) {
    for (const n of terms) if (tenor <= n) return n;
    return terms[terms.length - 1];
  }

  // ---------------------------------------------------------------------------
  // Starter-loan upgrade pricing math (pricingMode TENOR_CURVE_APR)
  //
  // 1. APR curve. Each upgrade tier has two anchors, the APR at a 1-month tenor
  //    and the APR at the tier's maximum tenor, and the APR falls in a straight
  //    line between them:
  //        apr(t) = aprAtOneMonth − (aprAtOneMonth − aprAtMaxTenor) × (t − 1) / (maxTenor − 1)
  //    Enhanced default, 45% → 35% over 1..6 months: 45, 43, 41, 39, 37, 35 %.
  //    Base default,     48% → 42% over 1..3 months: 48, 45, 42 %.
  //    APRs are rounded to 4 dp (0.01 percentage point) and the rounded APR is
  //    the one used in the payment math, so the APR disclosed is the APR charged.
  //
  // 2. Amortisation. Standard reducing-balance annuity at r = apr / 12:
  //        P = A × r / (1 − (1 + r)^−n)        (n = 1 reduces to P = A × (1 + r))
  //    The instalment is rounded UP to the fils, so n equal instalments always
  //    repay the principal in full. That convention costs the customer less than
  //    1 fils per instalment, and it is why the 6-month KFS at AED 3,000 reads
  //    AED 552.27 (exact 552.2639). Then:
  //        totalRepayable = P × n
  //        totalInterest  = P × n − A
  //
  // 3. Partner income. The lending partner earns the interest and the upgrade
  //    has no fees, so partner income IS the total interest. The same figure is
  //    the customer's total cost of credit, and the UI labels it as both.
  //
  // 4. Why a longer tenor can carry a lower APR and still earn the partner more.
  //    Interest accrues on the outstanding balance every month, so roughly
  //        totalInterest ≈ (apr / 12) × A × (n + 1) / 2
  //    Adding a month adds about half a month of interest on the whole
  //    principal, which outweighs a 2-point APR cut. A steep enough cut breaks
  //    this, and the publish-time PARTNER-INCOME GUARANTEE catches it: interest
  //    per AED 1 of principal,
  //        interest(t) = t × P(A = 1, apr(t), t) − 1,
  //    must rise strictly with t for every tier. P is proportional to A, so
  //    checking A = 1 proves it for every amount (the guarantee is checked on
  //    exact, unrounded math). Example breach: enhanced aprAtMaxTenor 10% gives
  //    the curve 45, 38, 31, 24, 17, 10 % and interest per AED 1,000 of 37.50,
  //    47.75, 52.11, 50.50 … The 4-month option would earn less than the
  //    3-month option, so publish refuses.
  // ---------------------------------------------------------------------------
  function tenorCurve(tier) {
    const out = [];
    const span = tier.maxTenorMonths - 1;
    for (let t = 1; t <= tier.maxTenorMonths; t++) {
      const apr = span > 0
        ? tier.aprAtOneMonth - (tier.aprAtOneMonth - tier.aprAtMaxTenor) * (t - 1) / span
        : tier.aprAtOneMonth;
      out.push({ months: t, apr: round4(apr) });
    }
    return out;
  }
  // Round UP to the fils; the tiny epsilon stops float noise (3112.5000000001)
  // from adding a spurious fils.
  const ceilFils = (x) => Math.ceil(x * 100 - 1e-7) / 100;
  // Exact (unrounded) amortising instalment for principal A at an annual APR over n months.
  function amortisingPayment(amount, apr, n) {
    const r = apr / 12;
    if (n === 1) return amount * (1 + r);
    return annuityPayment(amount, r, n);
  }
  // One customer-facing option: the instalment is rounded up to the fils and
  // the totals follow from it, so payment × n = total repayable on the KFS.
  function upgradeOption(amount, apr, n) {
    const monthlyPayment = ceilFils(amortisingPayment(amount, apr, n));
    const totalRepayable = round2(monthlyPayment * n);
    const totalInterest = round2(totalRepayable - amount);
    return { months: n, apr, monthlyPayment, totalRepayable, totalInterest, partnerIncome: totalInterest };
  }
  // Exact interest per AED 1 of principal over n months, which is what the guarantee checks.
  function interestPerUnit(apr, n) { return n * amortisingPayment(1, apr, n) - 1; }
  // Largest principal, floored to the amount step, whose n-month instalment
  // (rounded up to the fils) fits within a monthly budget.
  function maxUpgradePrincipal(budget, apr, n, step) {
    if (!(budget > 0)) return 0;
    let A = floorTo(budget / amortisingPayment(1, apr, n), step);
    while (A > 0 && ceilFils(amortisingPayment(A, apr, n)) > budget) A -= step;
    return Math.max(0, A);
  }
  // Every option 1..maxTenor at one amount, each checked against the two
  // affordability budgets frozen on the decision:
  //   cash flow: instalment ≤ instalmentToFcfMaxPct% × free cash flow (maxInstalment)
  //   DBR:       (existing obligations + instalment) / income ≤ dbr cap (50%, 30% retirees)
  // ctx = { curve, maxInstalment, dbr:{capPct, incomeMonthly, obligationsMonthly}, starterPartnerIncome }
  function upgradeOptionsFor(ctx, amount) {
    return ctx.curve.map(c => {
      const o = upgradeOption(amount, c.apr, c.months);
      const dbrPct = ctx.dbr.incomeMonthly > 0
        ? Math.round(((ctx.dbr.obligationsMonthly + o.monthlyPayment) / ctx.dbr.incomeMonthly) * 1000) / 10 : 999;
      const overFcf = o.monthlyPayment > ctx.maxInstalment;
      const overDbr = dbrPct > ctx.dbr.capPct;
      const out = { months: o.months, apr: o.apr, monthlyPayment: o.monthlyPayment, totalRepayable: o.totalRepayable,
                    totalInterest: o.totalInterest, partnerIncome: o.partnerIncome,
                    partnerIncomeVsStarterX: ctx.starterPartnerIncome > 0
                      ? Math.round((o.partnerIncome / ctx.starterPartnerIncome) * 10) / 10 : null,
                    fits: !overFcf && !overDbr };
      if (!out.fits) {
        out.reason = overFcf ? 'RC_OPTION_UNAFFORDABLE' : 'RC_DBR_EXCEEDED';
        out.detail = overFcf
          ? money(o.monthlyPayment) + '/mo is above the ' + money(ctx.maxInstalment) + '/mo your cash flow supports'
          : 'debt burden would be ' + dbrPct + '%, above the ' + ctx.dbr.capPct + '% cap';
      }
      out.dbrPct = dbrPct;
      return out;
    });
  }

  // Publish-time invariants for the starter-loan pack, as a list of checks (pass
  // and fail alike) so the console can show them live. validateParams throws
  // the first failure as a plain "Mizan: …" message.
  //   (1) TENOR_COST         longer tenor must not cost more: aprAtMaxTenor ≤ aprAtOneMonth, each tier
  //   (2) PARTNER_INCOME     partner income strictly increasing in tenor, each tier (checked at A = 1)
  //   (3) TIER_GENEROSITY    enhanced at least as generous as base: maxAmount ≥, maxTenor ≥, aprAtMaxTenor ≤
  function starterInvariants(prm) {
    const tiers = prm.tiers;
    let msg1 = null;
    for (const k of TIER_KEYS) {
      const t = tiers[k];
      if (!(t.aprAtMaxTenor <= t.aprAtOneMonth)) {
        msg1 = 'pricing curve for the ' + k + ' tier charges more for a longer tenor — APR at ' + t.maxTenorMonths +
               ' months (' + pctStr(t.aprAtMaxTenor) + ') is above the 1-month APR (' + pctStr(t.aprAtOneMonth) +
               '); a longer tenor must not cost more';
        break;
      }
    }
    let msg2 = null;
    for (const k of TIER_KEYS) {
      const curve = tenorCurve(tiers[k]);
      for (let i = 1; i < curve.length && !msg2; i++) {
        const prev = interestPerUnit(curve[i - 1].apr, curve[i - 1].months);
        const cur = interestPerUnit(curve[i].apr, curve[i].months);
        if (!(cur > prev + 1e-12)) {
          msg2 = 'pricing curve breaks the partner-income guarantee — the ' + curve[i].months + '-month option would earn ' +
                 (cur < prev ? 'less than' : 'no more than') + ' the ' + curve[i - 1].months + '-month option (' + k +
                 ' tier: ' + money(cur * 1000) + ' vs ' + money(prev * 1000) + ' interest per AED 1,000)';
        }
      }
      if (msg2) break;
    }
    const e = tiers.enhanced, b = tiers.base;
    let msg3 = null;
    if (!(e.maxAmount >= b.maxAmount)) {
      msg3 = 'the enhanced tier must be at least as generous as the base tier — its maximum amount (' + aed(e.maxAmount) +
             ') is below the base tier\'s (' + aed(b.maxAmount) + ')';
    } else if (!(e.maxTenorMonths >= b.maxTenorMonths)) {
      msg3 = 'the enhanced tier must be at least as generous as the base tier — its maximum tenor (' + e.maxTenorMonths +
             ' months) is shorter than the base tier\'s (' + b.maxTenorMonths + ' months)';
    } else if (!(e.aprAtMaxTenor <= b.aprAtMaxTenor)) {
      msg3 = 'the enhanced tier must be at least as generous as the base tier — its lowest APR (' + pctStr(e.aprAtMaxTenor) +
             ') is above the base tier\'s (' + pctStr(b.aprAtMaxTenor) + ')';
    }
    return [
      { id: 'TENOR_COST', label: 'A longer tenor never costs a higher APR (each tier)', ok: !msg1, message: msg1 },
      { id: 'PARTNER_INCOME', label: 'Partner-income guarantee: partner income rises with every extra month (each tier)', ok: !msg2, message: msg2 },
      { id: 'TIER_GENEROSITY', label: 'Enhanced tier at least as generous as base (amount, tenor, lowest APR)', ok: !msg3, message: msg3 }
    ];
  }

  // ---------------------------------------------------------------------------
  // Home-country bank statements (Addendum v2.4) — a deterministic, simulated
  // parser over each customer's seeded statement rows (MizanData personas,
  // `homeStatements`). Three corridors; the window is always the last 6 complete
  // months; amounts are converted at a fixed demo FX table.
  //
  //   integrity     the genuine bank-issued file for that country → PASS; any other
  //                 file (or the right file under the wrong country) → FAIL
  //   name match    account holder on the statement = the Emirates ID name
  //   months        6 of the last 6, continuous — else RC_STATEMENTS_INCOMPLETE
  //   conduct       returned items + overdraft days (0 + 0 = clean)
  //   tenure        account open since (≥ 5 years = long)
  //   EMIs          recurring loan debits → AED, counted in DBR and free cash flow
  //   buffer        average balance in AED (≥ half a month of UAE income = buffer)
  //   remittances   for every statement month in which Open Finance saw a UAE salary
  //                 credit: timing (0–3 days after payday 1, 4–7 days ½, later 0)
  //                 × ½ + amount stability (1 − |amount − median| / median) × ½,
  //                 averaged → remittanceConsistencyPct (≥ 85% = corroborated)
  // Evidence → decision (STATEMENT_EVIDENCE):
  //   personal loan, AECB no-hit: scorecard base 640 (grade capped at B) +20 long
  //     tenure, +20 clean conduct, +10 buffer, +15 corroborated income; the 50%
  //     newcomer haircut shrinks by 10 (conduct), 5 (buffer), 10 (corroboration),
  //     floor 25%. EMIs count in DBR for every applicant.
  //   upgrade: verified statements credit the account history (capped at 24
  //     months) toward the enhanced tier's income-history test, and surface EMIs.
  // ---------------------------------------------------------------------------
  const STATEMENT_CORRIDORS = ['IN', 'PK', 'EG'];
  const CORRIDORS = {
    IN: { name: 'India', adjective: 'Indian', currency: 'INR' },
    PK: { name: 'Pakistan', adjective: 'Pakistani', currency: 'PKR' },
    EG: { name: 'Egypt', adjective: 'Egyptian', currency: 'EGP' }
  };
  // AED per unit of local currency — fixed demo rates, shown in the UI.
  const STATEMENT_FX = Object.freeze({ INR: 0.044, PKR: 0.0132, EGP: 0.0757 });
  const STATEMENT_MONTHS = 6;
  const OTHER_COUNTRIES = { PH: 'Philippines', LK: 'Sri Lanka', NP: 'Nepal', BD: 'Bangladesh', NG: 'Nigeria', KE: 'Kenya' };
  const STATEMENT_EVIDENCE = {
    proxyBase: 640, tenureMonths: 60, bufferIncomeShare: 0.5, corroborationPct: 85,
    overlays: { tenure: 20, conduct: 20, buffer: 10, corroboration: 15 },
    haircut: { basePct: 50, conduct: 10, buffer: 5, corroboration: 10, floorPct: 25 },
    historyCreditMaxMonths: 24
  };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monLabel = (ym) => MON[Number(ym.slice(5, 7)) - 1] + ' ' + ym.slice(0, 4);
  const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  function median(a) {
    if (!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2);
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function shiftMonth(ym, k) {
    const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + k, 1));
    return d.toISOString().slice(0, 7);
  }
  // The last n complete months, oldest first, ending with the last month in MizanData.monthLabels.
  function lastMonths(n) {
    const end = D.monthLabels[D.monthLabels.length - 1];
    const out = [];
    for (let k = n - 1; k >= 0; k--) out.push(shiftMonth(end, -k));
    return out;
  }
  function corridorOf(country) {
    const raw = String(country === undefined || country === null ? '' : country).trim();
    if (!raw) throw err('statements need a country — Mizan reads statements from India, Pakistan and Egypt');
    const up = raw.toUpperCase();
    for (const cc of STATEMENT_CORRIDORS) if (up === cc || up === CORRIDORS[cc].name.toUpperCase()) return cc;
    throw err('statements from ' + (OTHER_COUNTRIES[up] || raw) + ' are not supported yet — Mizan reads statements from India, Pakistan and Egypt');
  }
  const normName = (n) => String(n || '').toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
  // UAE salary months seen via Open Finance, the payday, and monthly UAE income.
  function uaeSalaryInfo(a) {
    const cn = a.connected || null, bd = a.bankData || null;
    let months;
    if (cn && Array.isArray(cn.monthlyIncome) && cn.monthlyIncome.length === D.monthLabels.length) {
      months = D.monthLabels.filter((_, i) => cn.monthlyIncome[i] !== null && cn.monthlyIncome[i] !== undefined);
    } else {
      const n = (bd && bd.monthsAvailable) || (cn && cn.monthsAvailable) || 0;
      months = n > 0 ? lastMonths(n) : [];
    }
    return { months, day: (cn && cn.salaryCreditDay) || (bd && bd.salaryCreditDay) || 28,
             income: (a.employment && a.employment.salaryMonthly) || (cn && cn.avgMonthlyIncome) || (bd && bd.avgSalaryCredit) || 0 };
  }
  // Pure: reads the applicant's seeded statement rows, never the clock or the engine state.
  function parseStatementsFor(a, input) {
    const cc = corridorOf(input.country);
    const hs = a && a.homeStatements;
    if (!hs) throw err('no home-country statements on file for ' + ((a && (a.name || a.id)) || 'this applicant') + ' in this demo');
    const want = input.months === undefined || input.months === null ? STATEMENT_MONTHS : input.months;
    if (!Number.isInteger(want) || want < 1 || want > STATEMENT_MONTHS) throw err('months covered must be a whole number from 1 to 6');
    const productId = input.productId || null;
    const file = String(input.file || hs.file);
    const genuine = file === hs.file && cc === hs.country;
    const currency = hs.currency, fx = STATEMENT_FX[currency];
    const out = { kind: 'HOME_STATEMENTS', applicantId: a.id || null, applicantName: a.name || null,
                  country: cc, countryName: CORRIDORS[cc].name, bank: input.bank || hs.bank, file,
                  currency, fxToAed: fx, monthsExpected: STATEMENT_MONTHS };
    if (!genuine) {
      Object.assign(out, {
        monthsPresent: 0, period: null, missingMonths: [], continuous: false, complete: false,
        integrity: 'FAIL',
        integrityDetail: file === hs.file
          ? 'issuer ' + hs.bank + ' does not match the selected country (' + CORRIDORS[cc].name + ')'
          : 'edits detected — the file is not the bank-issued e-statement (PDF modified after issue; fonts and metadata inconsistent)',
        nameMatch: false, accountHolder: null, accountOpenSince: null, accountTenureMonths: null,
        returnedItems: null, overdraftDays: null, obligationsMonthlyAed: null, emis: [], avgBalanceAed: null,
        remittanceMonths: null, uaeSalaryMonths: null, remittanceConsistencyPct: null, otherIncomeMonthlyAed: null,
        evidence: { tenureLong: false, conductClean: false, bufferOk: false, corroborated: false },
        usable: false, reasonCode: 'RC_STATEMENTS_INTEGRITY' });
      out.findings = statementFindings(out, productId);
      return out;
    }
    const rows = hs.months.slice(-want);
    const months = rows.map(r => r.month);
    const window = lastMonths(STATEMENT_MONTHS);
    const missing = window.filter(m => !months.includes(m));
    const continuous = months.every((m, i) => i === 0 || m === shiftMonth(months[i - 1], 1));
    const complete = missing.length === 0 && continuous;
    const nameMatch = normName(hs.accountHolder) === normName(a.name);
    const t = D.TODAY.slice(0, 7);
    const tenure = (Number(t.slice(0, 4)) - Number(hs.accountOpenSince.slice(0, 4))) * 12 +
                   (Number(t.slice(5, 7)) - Number(hs.accountOpenSince.slice(5, 7)));
    const emiLocal = rows.map(r => r.emi || 0);
    const emiMonths = emiLocal.filter(x => x > 0).length;
    const recurring = emiMonths > 0 && emiMonths >= rows.length - 1;     // a loan debit in (almost) every month
    const obligationsMonthlyAed = recurring ? Math.round(mean(emiLocal) * fx) : 0;
    const avgLocal = mean(rows.map(r => r.avgBalance));
    const avgBalanceAed = Math.round(avgLocal * fx);
    const uae = uaeSalaryInfo(a);
    const salaried = rows.filter(r => uae.months.includes(r.month));
    const rems = salaried.map(r => r.remittance).filter(Boolean);
    const med = median(rems.map(x => x.amount));
    const scores = salaried.map(r => {
      if (!r.remittance) return 0;
      const d = r.remittance.day - uae.day;
      const timing = d >= 0 && d <= 3 ? 1 : (d >= 0 && d <= 7 ? 0.5 : 0);
      const amount = med > 0 ? Math.max(0, 1 - Math.abs(r.remittance.amount - med) / med) : 0;
      return 0.5 * timing + 0.5 * amount;
    });
    const consistency = salaried.length ? Math.round(mean(scores) * 100) : 0;
    const returnedItems = rows.reduce((x, r) => x + (r.returnedItems || 0), 0);
    const overdraftDays = rows.reduce((x, r) => x + (r.overdraftDays || 0), 0);
    const SE = STATEMENT_EVIDENCE;
    Object.assign(out, {
      monthsPresent: window.length - missing.length,
      period: { from: months[0] + '-01', to: months[months.length - 1], label: monLabel(months[0]) + ' – ' + monLabel(months[months.length - 1]) },
      missingMonths: missing, continuous, complete,
      integrity: 'PASS', integrityDetail: 'no edits detected — ' + hs.issuer,
      nameMatch, accountHolder: hs.accountHolder,
      accountOpenSince: hs.accountOpenSince, accountTenureMonths: tenure,
      returnedItems, overdraftDays,
      obligationsMonthlyAed,
      emis: recurring ? [{ label: hs.emiLabel || 'Loan EMI', amountLocal: median(emiLocal.filter(x => x > 0)), amountAed: obligationsMonthlyAed }] : [],
      avgBalanceAed, avgBalanceLocal: Math.round(avgLocal),
      remittanceMonths: rems.length, uaeSalaryMonths: salaried.length, remittanceConsistencyPct: consistency,
      remittanceMedianAed: Math.round(med * fx),
      otherIncomeMonthlyAed: Math.round(mean(rows.map(r => r.otherIncome || 0)) * fx),
      evidence: { tenureLong: tenure >= SE.tenureMonths, conductClean: returnedItems === 0 && overdraftDays === 0,
                  bufferOk: uae.income > 0 && avgBalanceAed >= SE.bufferIncomeShare * uae.income,
                  corroborated: salaried.length > 0 && consistency >= SE.corroborationPct },
      bufferIncomeShare: uae.income > 0 ? Math.round(avgBalanceAed / uae.income * 100) / 100 : null
    });
    out.usable = nameMatch && complete;
    out.reasonCode = !nameMatch ? 'RC_STATEMENTS_INTEGRITY' : (!complete ? 'RC_STATEMENTS_INCOMPLETE' : null);
    out.findings = statementFindings(out, productId);
    return out;
  }
  // The parse panel's checklist: one row per check, each with its effect on the decision.
  function statementFindings(x, productId) {
    const pl = productId === 'personal_loan', up = productId === 'starter_loan';
    const ov = STATEMENT_EVIDENCE.overlays, hc = STATEMENT_EVIDENCE.haircut;
    const f = [];
    const push = (key, label, status, value, effect) => f.push({ key, label, status, value, effect });
    const FRAUD = 'Referred to fraud review (RC_STATEMENTS_INTEGRITY) — never an automatic decline';
    if (x.integrity !== 'PASS') {
      push('integrity', 'Document integrity', 'FAIL', x.integrityDetail, FRAUD);
      for (const [k, l] of [['nameMatch', 'Account holder matches the Emirates ID'], ['months', '6 of the last 6 months'],
                            ['conduct', 'Returned items & overdraft days'], ['tenure', 'Account history'], ['emis', 'Home-country EMIs'],
                            ['buffer', 'Buffer — average balance'], ['remittances', 'Remittances match the UAE salary']]) {
        push(k, l, 'SKIP', 'not read', 'Not used — the document failed integrity');
      }
      return f;
    }
    const e = x.evidence, cur = x.currency;
    push('integrity', 'Document integrity', 'PASS', x.integrityDetail, 'Statements can be used');
    push('nameMatch', 'Account holder matches the Emirates ID', x.nameMatch ? 'PASS' : 'FAIL',
         x.accountHolder + (x.nameMatch ? ' = ' : ' ≠ ') + (x.applicantName || '—') + ' (Emirates ID)', x.nameMatch ? 'Identity confirmed' : FRAUD);
    push('months', '6 of the last 6 months', x.complete ? 'PASS' : 'FAIL',
         x.monthsPresent + ' of 6 months · ' + x.period.label + (x.missingMonths.length ? ' · missing ' + x.missingMonths.map(monLabel).join(', ') : ' · continuous'),
         x.complete ? 'Complete window' : 'RC_STATEMENTS_INCOMPLETE — the customer is asked for the missing months; not used yet');
    push('conduct', 'Returned items & overdraft days', e.conductClean ? 'PASS' : 'WARN', x.returnedItems + ' returned items · ' + x.overdraftDays + ' overdraft days',
         e.conductClean ? (pl ? 'Clean conduct — score +' + ov.conduct + ' · newcomer haircut −' + hc.conduct + ' pts' : (up ? 'Clean conduct — supports the enhanced tier' : 'Clean conduct')) : 'No conduct credit');
    const years = Math.floor(x.accountTenureMonths / 12);
    push('tenure', 'Account history', e.tenureLong ? 'PASS' : 'INFO', 'open since ' + monLabel(x.accountOpenSince) + ' (' + years + ' year' + (years === 1 ? '' : 's') + ')',
         pl ? (e.tenureLong ? 'Long banking relationship — score +' + ov.tenure : 'Under 5 years — no tenure credit')
            : (up ? 'Credited as ' + Math.min(x.accountTenureMonths, STATEMENT_EVIDENCE.historyCreditMaxMonths) + ' months of home-country history (cap 24) toward the enhanced tier' : 'Account tenure'));
    push('emis', 'Home-country EMIs', x.emis.length ? 'INFO' : 'PASS',
         x.emis.length ? x.emis.map(m => m.label + ' ' + cur + ' ' + grp(m.amountLocal) + '/mo = AED ' + grp(m.amountAed) + '/mo').join('; ') : 'none found',
         x.emis.length ? 'Counted in DBR and free cash flow — obligations in both countries' : 'No home-country loans to count');
    push('buffer', 'Buffer — average balance', e.bufferOk ? 'PASS' : 'INFO',
         cur + ' ' + grp(x.avgBalanceLocal) + ' = AED ' + grp(x.avgBalanceAed) + (x.bufferIncomeShare !== null ? ' (' + x.bufferIncomeShare.toFixed(2) + '× monthly UAE income)' : ''),
         e.bufferOk ? (pl ? 'Buffer — score +' + ov.buffer + ' · haircut −' + hc.buffer + ' pts' : 'Buffer above half a month of income') : 'Informational — below half a month of income');
    push('remittances', 'Remittances match the UAE salary', e.corroborated ? 'PASS' : 'WARN',
         x.remittanceMonths + ' of ' + x.uaeSalaryMonths + ' salary months · ' + x.remittanceConsistencyPct + '% consistent with UAE salary credits (Open Finance)',
         e.corroborated ? (pl ? 'UAE income corroborated — score +' + ov.corroboration + ' · haircut −' + hc.corroboration + ' pts' : 'UAE income corroborated') : 'Not corroborated — no credit');
    if (x.otherIncomeMonthlyAed > 0) push('otherIncome', 'Other home-country income', 'INFO', 'AED ' + grp(x.otherIncomeMonthlyAed) + '/mo', 'Informational — not counted toward affordability');
    return f;
  }
  function findApplicant(id) {
    for (const list of [D.personasLoan, D.personasUpgrade, D.personasSplit, D.personasJourney]) for (const p of list || []) if (p.id === id) return p;
    return null;
  }

  // ---------------------------------------------------------------------------
  // NoorScore (Addendum v2.5) — the name the score carries outside the engine.
  // NoorScore = the scorecard points Mizan already computes: the bureau score
  // (AECB, or a proxy base for a thin file) plus factor adjustments. Its bands
  // mirror the A–E grade cut-offs below; the grade letter stays internal.
  // ---------------------------------------------------------------------------
  const NOORSCORE_BANDS = [[740, 'Excellent'], [680, 'Very good'], [620, 'Good'], [560, 'Fair']];
  function noorScoreBand(points) {
    if (!Number.isFinite(points)) return null;
    for (const [floor, band] of NOORSCORE_BANDS) if (points >= floor) return band;
    return 'Poor';
  }
  // Each scorecard factor the lender may see, in plain words — an allowlist keyed
  // by the factor name, so a factor that is not listed here never leaves Noor, and
  // no factor carries a value. Informational zero-point rows (proxy bases) are skipped.
  const FACTOR_WORDS = {
    'Free cash flow ≥ AED 5,000/mo': 'Strong free cash flow',
    'Free cash flow < AED 1,500/mo': 'Low free cash flow',
    'Income volatility ≤ 20%': 'Stable income',
    'Income volatility ≥ 40%': 'Income varies a lot month to month',
    'Connected history ≥ 12 months': 'Long connected history',
    'Returned cheques (12m)': 'Returned cheques in the past year',
    'Salary verified via connected account': 'Salary verified through connected accounts',
    'Employment tenure ≥ 24m': 'Long employment tenure',
    'ESR > 40%': 'High existing repayments on the bureau file',
    'Cross-border conservatism': 'Home-country credit file, conservative adjustment',
    'Home statements — account open ≥ 5 years': 'Long-standing home-country bank account',
    'Home statements — clean conduct (0 returned items, 0 overdraft days)': 'Clean home-country account conduct',
    'Home statements — buffer ≥ half a month of income': 'Savings buffer',
    'Home statements — remittances match the UAE salary (≥ 85%)': 'Remittances consistent with salary'
  };
  // Up to `max` factor directions, largest effect first (ties keep scorecard order).
  function noorScoreFactors(score, max) {
    const ov = (score && score.overlays) || [];
    return ov.map((o, i) => ({ o, i }))
      .filter(x => x.o.delta !== 0 && FACTOR_WORDS[x.o.name])
      .sort((a, b) => Math.abs(b.o.delta) - Math.abs(a.o.delta) || a.i - b.i)
      .slice(0, max || 3)
      .map(x => FACTOR_WORDS[x.o.name]);
  }

  const GRADE_BANDS = [[740, 'A'], [680, 'B'], [620, 'C'], [560, 'D']];
  function pointsToGrade(points) {
    if (points === null || points === undefined) return null;
    for (const [floor, g] of GRADE_BANDS) if (points >= floor) return g;
    return 'E';
  }
  // Grades map to pricing/capacity bands: A→A, B→B, C/D→C (D approvals only via override).
  function gradeToBand(grade) {
    if (grade === 'A') return 'A';
    if (grade === 'B') return 'B';
    if (grade === 'C' || grade === 'D') return 'C';
    return null;
  }
  function dbrCapFor(reg, retiree) {
    return retiree
      ? Math.min(reg.dbrCapRetireePct !== undefined ? reg.dbrCapRetireePct : HARD.dbrCapRetireePct, HARD.dbrCapRetireePct)
      : Math.min(reg.dbrCapPct !== undefined ? reg.dbrCapPct : HARD.dbrCapPct, HARD.dbrCapPct);
  }

  // ---------------------------------------------------------------------------
  // Engine state — reset entirely by init()
  // ---------------------------------------------------------------------------
  let D = null;      // MizanData reference
  let S = null;      // mutable state

  function ensureInit() { if (!D || !S) throw err('init(MizanData) must be called before using the engine'); }

  // Deterministic session clock: TODAY 09:00Z, advancing 37s per audit-worthy action.
  function nowIso() {
    const t = new Date(D.TODAY + 'T09:00:00Z').getTime() + S.clockTicks * 37000;
    S.clockTicks++;
    return new Date(t).toISOString();
  }
  // Deterministic pseudo-latency for simulated data pulls.
  function pullLatency(seq, i) { return 120 + ((seq * 97 + i * 53) % 260); }

  // ---------------------------------------------------------------------------
  // Applicant normalization — accepts persona shapes AND sampleBook rows.
  // ---------------------------------------------------------------------------
  // Personal loan / salary advance. Also accepts a split persona (income taken
  // from its connected accounts) so any persona can be run through any product.
  function normalizeLoan(a) {
    if (!a || typeof a !== 'object') throw err('loan applicant payload missing');
    const emp = a.employment || {};
    const aecb = a.aecb || null;
    const cn = a.connected || null;
    const hit = aecb ? aecb.hit === true : (a.aecbScore !== null && a.aecbScore !== undefined);
    const salary = emp.salaryMonthly !== undefined ? emp.salaryMonthly
                 : (a.salaryMonthly !== undefined ? a.salaryMonthly : (cn ? cn.avgMonthlyIncome : undefined));
    if (!Number.isFinite(salary)) throw err('loan applicant needs a monthly salary/income');
    return {
      id: a.id || null,
      name: a.name || a.id || 'Applicant',
      age: a.age !== undefined ? a.age : 35,
      monthsInUae: a.monthsInUae !== undefined ? a.monthsInUae : 120,
      retiree: emp.retiree !== undefined ? !!emp.retiree : !!a.retiree,
      salaryMonthly: salary,
      tenureMonths: emp.tenureMonths !== undefined ? emp.tenureMonths : 24,
      aecbHit: hit,
      score: aecb ? aecb.score : (hit ? a.aecbScore : null),
      esrPct: aecb ? (aecb.esrPct !== undefined ? aecb.esrPct : null) : (a.esrPct !== undefined ? a.esrPct : null),
      obligationsMonthly: aecb ? (aecb.obligationsMonthly || 0) : (a.obligationsMonthly || 0),
      chequeReturns12m: aecb ? (aecb.chequeReturns12m || 0) : (a.chequeReturns12m || 0),
      worstDelinquency: aecb ? (aecb.worstDelinquency || 'NONE') : (a.worstDelinquency || 'NONE'),
      creditPassportAvailable: aecb ? !!aecb.creditPassportAvailable : false,
      homeBureau: a.homeBureau || null,
      // Average monthly spending seen in connected accounts (v2.5) — informational,
      // feeds free cash flow on the record; null when the applicant has no connected block.
      spendMonthly: cn && Number.isFinite(cn.avgMonthlySpend) ? cn.avgMonthlySpend : null,
      salaryDetected: a.bankData ? a.bankData.salaryDetected === true
                                 : (cn ? true : (a.salaryDetected !== undefined ? !!a.salaryDetected : true)),
      bankSource: a.bankData ? a.bankData.source : (cn ? cn.source : (a.bankSource || 'ALTAREQ_TPP')),
      banks: a.bankData ? (a.bankData.banks || []) : (cn ? (cn.banks || []) : []),
      tradelines: aecb ? (aecb.tradelines || 0) : 0
    };
  }

  // Split. Persona shape (connected/purchase blocks) or a sampleBook split row
  // ({income, spend, volatility, aecbScore, connectedMonths, obligations,
  //   chequeReturns, worstDelinquency, purchaseAmount, purchaseAgeDays, tenorMonths}).
  function normalizeSplit(a) {
    if (!a || typeof a !== 'object') throw err('split applicant payload missing');
    const aecb = a.aecb || null;
    const cn = a.connected || null;
    const emp = a.employment || {};
    const hit = aecb ? aecb.hit === true : (a.aecbScore !== null && a.aecbScore !== undefined);
    let purchase;
    if (a.purchase) {
      const pu = a.purchase;
      purchase = { merchant: pu.merchant || 'Purchase', category: pu.category || null,
                   amount: pu.amount, date: pu.date, ageDays: daysBetween(pu.date, D.TODAY),
                   detectedVia: pu.detectedVia || null,
                   // Seen in connected data = detected from a connected account
                   // (explicit seenInConnectedData flag wins when present).
                   seen: pu.seenInConnectedData !== undefined ? !!pu.seenInConnectedData
                                                              : /^connected account/i.test(pu.detectedVia || '') };
    } else {
      const age = a.purchaseAgeDays !== undefined ? a.purchaseAgeDays : 0;
      purchase = { merchant: 'Purchase', category: null, amount: a.purchaseAmount,
                   date: addDaysIso(D.TODAY, -age), ageDays: age,
                   detectedVia: 'Connected account', seen: a.purchaseSeen !== false };
    }
    const p = {
      id: a.id || null,
      name: a.name || a.id || 'Applicant',
      age: a.age !== undefined ? a.age : 32,
      retiree: !!emp.retiree,
      employmentType: emp.type || null,
      aecbHit: hit,
      score: aecb ? aecb.score : (hit ? a.aecbScore : null),
      obligationsMonthly: aecb ? (aecb.obligationsMonthly || 0) : (a.obligations || 0),
      chequeReturns12m: aecb ? (aecb.chequeReturns12m || 0) : (a.chequeReturns || 0),
      worstDelinquency: aecb ? (aecb.worstDelinquency || 'NONE') : (a.worstDelinquency || 'NONE'),
      connectedSource: cn ? (cn.source || 'ALTAREQ_TPP') : 'ALTAREQ_TPP',
      banks: cn ? (cn.banks || []) : [],
      connectedMonths: cn ? (cn.monthsAvailable || 0) : (a.connectedMonths || 0),
      avgMonthlyIncome: cn ? cn.avgMonthlyIncome : a.income,
      avgMonthlySpend: cn ? cn.avgMonthlySpend : a.spend,
      incomeVolatilityPct: cn ? cn.incomeVolatilityPct : a.volatility,
      purchase
    };
    if (!Number.isFinite(p.avgMonthlyIncome) || !Number.isFinite(p.avgMonthlySpend)) {
      throw err('split applicant needs connected-account income and spend (avgMonthlyIncome / avgMonthlySpend)');
    }
    if (!Number.isFinite(p.incomeVolatilityPct)) p.incomeVolatilityPct = 0;
    return p;
  }

  // ---------------------------------------------------------------------------
  // Scorecards
  // ---------------------------------------------------------------------------
  // Personal loan / salary advance — scorecard v0 (CONTRACT §2.2), with the
  // connected-account salary verification overlay (+15) replacing the v1
  // in-house payroll overlay.
  function loanScore(p, crossBorder, connectedSalary, st) {
    // Cross-border path: consented home-bureau score is the base, with a flat
    // conservatism overlay; grade capped at B. Verified home-country statements
    // (v2.4) on an AECB no-hit: proxy base 640 plus evidence overlays, grade capped at B.
    const stPath = !p.aecbHit && !!st;
    const base = (p.aecbHit && p.score !== null) ? p.score
               : (crossBorder && p.homeBureau ? p.homeBureau.score : (stPath ? STATEMENT_EVIDENCE.proxyBase : null));
    const sc = SCORECARDS.loan;
    if (base === null) {
      return { model: sc.model, version: sc.version, base: null, overlays: [], points: null, grade: null };
    }
    const overlays = [];
    if (crossBorder) overlays.push({ name: 'Cross-border conservatism', delta: -40 });
    if (stPath) {
      const ev = st.evidence, ov = STATEMENT_EVIDENCE.overlays;
      if (!crossBorder) overlays.push({ name: 'Statements proxy base (AECB no-hit) — grade capped at B', delta: 0 });
      if (ev.tenureLong) overlays.push({ name: 'Home statements — account open ≥ 5 years', delta: ov.tenure });
      if (ev.conductClean) overlays.push({ name: 'Home statements — clean conduct (0 returned items, 0 overdraft days)', delta: ov.conduct });
      if (ev.bufferOk) overlays.push({ name: 'Home statements — buffer ≥ half a month of income', delta: ov.buffer });
      if (ev.corroborated) overlays.push({ name: 'Home statements — remittances match the UAE salary (≥ 85%)', delta: ov.corroboration });
    }
    if (p.esrPct !== null && p.esrPct > 40) overlays.push({ name: 'ESR > 40%', delta: -20 });
    if (p.chequeReturns12m >= 1) overlays.push({ name: 'Returned cheques (12m)', delta: -30 });
    if (connectedSalary) overlays.push({ name: 'Salary verified via connected account', delta: 15 });
    if (p.tenureMonths >= 24) overlays.push({ name: 'Employment tenure ≥ 24m', delta: 10 });
    const points = base + overlays.reduce((s, o) => s + o.delta, 0);
    let grade = pointsToGrade(points);
    if ((crossBorder || stPath) && grade === 'A') grade = 'B';
    const out = { model: sc.model, version: sc.version, base, overlays, points, grade };
    if (stPath) out.basis = crossBorder ? 'CREDIT_PASSPORT' : 'HOME_STATEMENTS';
    return out;
  }

  // Split — cash-flow scorecard (repurposed from the v1 business cash-flow card).
  // Base = AECB score, or the 640 proxy on the AECB no-hit cash-flow path (grade
  // capped at B there). Overlays read the connected-account cash flow. With the
  // current overlays the proxy path tops out at 640 + 20 + 15 + 10 = 685 (B), so
  // the B cap is a backstop should overlays ever be re-weighted.
  function splitScore(p, fcf, cashFlowPath) {
    const sc = SCORECARDS.split;
    let base = null, basis = 'NONE';
    if (p.aecbHit && p.score !== null && p.score !== undefined) { base = p.score; basis = 'AECB'; }
    else if (cashFlowPath) { base = CASH_FLOW_PROXY_BASE; basis = 'CASH_FLOW_PROXY'; }
    if (base === null) {
      return { model: sc.model, version: sc.version, basis, base: null, overlays: [], points: null, grade: null };
    }
    const overlays = [];
    if (cashFlowPath) overlays.push({ name: 'Cash-flow proxy base (AECB no-hit) — grade capped at B', delta: 0 });
    if (fcf >= 5000) overlays.push({ name: 'Free cash flow ≥ AED 5,000/mo', delta: 20 });
    if (fcf < 1500) overlays.push({ name: 'Free cash flow < AED 1,500/mo', delta: -30 });
    if (p.incomeVolatilityPct <= 20) overlays.push({ name: 'Income volatility ≤ 20%', delta: 15 });
    if (p.incomeVolatilityPct >= 40) overlays.push({ name: 'Income volatility ≥ 40%', delta: -25 });
    if (p.connectedMonths >= 12) overlays.push({ name: 'Connected history ≥ 12 months', delta: 10 });
    if (p.chequeReturns12m >= 1) overlays.push({ name: 'Returned cheques (12m)', delta: -30 });
    const points = base + overlays.reduce((s, o) => s + o.delta, 0);
    let grade = pointsToGrade(points);
    if (cashFlowPath && grade === 'A') grade = 'B';
    return { model: sc.model, version: sc.version, basis, base, overlays, points, grade };
  }

  // ---------------------------------------------------------------------------
  // Rule helpers — every rule evaluated is recorded, pass or fail.
  // ---------------------------------------------------------------------------
  function makeRuleSet() {
    const rules = [];
    const reasons = [];
    function add(id, name, category, result, observed, threshold, reasonCode) {
      rules.push({ id, name, category, result, observed, threshold });
      if (result !== 'PASS' && reasonCode && !reasons.includes(reasonCode)) reasons.push(reasonCode);
    }
    function reason(code) { if (code && !reasons.includes(code)) reasons.push(code); }
    return { rules, reasons, add, reason };
  }
  function outcomeFromRules(rules) {
    if (rules.some(r => r.result === 'FAIL')) return 'DECLINE';
    if (rules.some(r => r.result === 'REFER')) return 'REFER';
    return 'APPROVE';
  }
  function pickMin(candidates) {
    let approved = Infinity, binding = 'REQUESTED';
    for (const c of candidates) if (c.value < approved) { approved = c.value; binding = c.key; }
    return { approved, binding };
  }

  // ---------------------------------------------------------------------------
  // Personal loan evaluation (formerly the v1 retail product)
  // ---------------------------------------------------------------------------
  function evaluateLoan(p, amount, tenorMonths, pol, consents, statements) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    // Home-country statements (v2.4): usable = integrity PASS + name match + 6 of 6
    // months. Integrity or name failure → REFER to fraud review; incomplete → not used.
    const st = statements || null;
    const stUsable = !!(st && st.usable);
    const stFraud = !!(st && (st.integrity !== 'PASS' || st.nameMatch !== true));
    const statementsPath = !p.aecbHit && stUsable;

    // Cross-border Credit Passport path: a thin-file newcomer whose home-country
    // bureau file is importable AND consented is underwritten on that file —
    // conservative overlay, grade capped at B, 50% limit haircut — instead of
    // falling to the thin-file REFER. No consent → the thin-file path is unchanged.
    const crossBorder = !p.aecbHit && p.creditPassportAvailable === true &&
                        !!(consents && consents.creditPassport === true) && !!p.homeBureau;
    // Consented home-country obligations count toward serviceability: the Credit
    // Passport file's and/or the EMIs found in verified statements (the larger when
    // both are present — they describe the same loans).
    const cpObl = crossBorder ? (p.homeBureau.obligationsMonthlyAed || 0) : 0;
    const stObl = stUsable ? (st.obligationsMonthlyAed || 0) : 0;
    const homeObl = crossBorder && stUsable ? Math.max(cpObl, stObl) : cpObl + stObl;
    const obligations = p.obligationsMonthly + homeObl;
    // Salary verified through connected accounts (UAE Open Finance) — requires the
    // open-finance consent when a consent record is supplied (simulation rows have none).
    const openFinanceOk = !consents || consents.openFinance === true;
    const connectedSalary = p.bankSource === 'ALTAREQ_TPP' && p.salaryDetected && openFinanceOk;

    // REGULATORY — mandatory bureau check (Federal Law 6/2010; consent gated upstream)
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');

    // REGULATORY — tenor cap 48 months (Reg 29/2011); over-cap requests are clamped.
    const tenorCap = Math.min(reg.tenorCapMonths, HARD.tenorCapMonths);
    const effTenor = Math.min(tenorMonths, tenorCap);
    const clamped = tenorMonths > tenorCap;
    rs.add('REG_TENOR_CAP', 'Tenor within regulatory cap (Reg 29/2011)', 'REGULATORY',
           'PASS', clamped ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths, tenorCap, null);
    if (clamped) rs.reason('RC_TENOR_CAP');

    // POLICY knock-outs
    const ageOk = p.age >= prm.minAge && p.age <= prm.maxAge;
    rs.add('POL_AGE', 'Applicant age within eligible range', 'POLICY',
           ageOk ? 'PASS' : 'FAIL', p.age, prm.minAge + '–' + prm.maxAge, 'RC_AGE');
    rs.add('POL_MIN_SALARY', 'Salary at or above product minimum', 'POLICY',
           p.salaryMonthly >= prm.minSalary ? 'PASS' : 'FAIL', p.salaryMonthly, prm.minSalary, 'RC_SALARY_FLOOR');
    rs.add('POL_MIN_MONTHS_UAE', 'Minimum UAE residency period', 'POLICY',
           p.monthsInUae >= prm.minMonthsInUae ? 'PASS' : 'REFER', p.monthsInUae, prm.minMonthsInUae, 'RC_MANUAL_REVIEW');
    rs.add('POL_INCOME_VERIFIED', 'Salary verified (connected accounts or documents)', 'POLICY',
           p.salaryDetected ? 'PASS' : 'REFER',
           p.salaryDetected ? (connectedSalary ? 'verified — connected account' : 'verified — documents') : 'not detected',
           'verified', 'RC_INCOME_UNVERIFIED');
    rs.add('POL_MAX_ESR', 'Bureau expense-to-salary ratio within bound', 'POLICY',
           (p.esrPct === null || p.esrPct <= prm.maxEsrPct) ? 'PASS' : 'REFER',
           p.esrPct === null ? 'n/a' : p.esrPct, prm.maxEsrPct, 'RC_MANUAL_REVIEW');
    const delinq = p.worstDelinquency || 'NONE';
    rs.add('POL_DELINQUENCY', 'Delinquency history acceptable', 'POLICY',
           (delinq === 'DPD90' || delinq === 'WRITEOFF') ? 'FAIL' : (delinq === 'DPD30' ? 'REFER' : 'PASS'),
           delinq, '≤ DPD30 refers, ≥ DPD90 declines', 'RC_DELINQUENCY');
    rs.add('POL_CHEQUE_RETURNS', 'Returned cheques within tolerance', 'POLICY',
           p.chequeReturns12m <= prm.chequeReturnsMax ? 'PASS' : 'FAIL',
           p.chequeReturns12m, prm.chequeReturnsMax, 'RC_CHEQUE_RETURNS');

    // Thin-file strategy: configurable action, default REFER.
    // A consented Credit Passport file substitutes for local depth.
    rs.add('POL_THIN_FILE', 'Credit file depth (thin-file strategy)', 'POLICY',
           p.aecbHit ? 'PASS' : ((crossBorder || statementsPath) ? 'PASS' : (prm.thinFileAction === 'DECLINE' ? 'FAIL' : 'REFER')),
           p.aecbHit ? 'file present'
                     : (crossBorder && statementsPath ? 'no-hit — Credit Passport + verified home-country statements substitute'
                       : (crossBorder ? 'no-hit — Credit Passport substitutes'
                         : (statementsPath ? 'no-hit — verified home-country statements substitute' : 'no-hit / thin file'))),
           'AECB hit', 'RC_THIN_FILE');
    if (crossBorder) {
      rs.add('POL_CREDIT_PASSPORT', 'Consented home-country bureau file verified (Credit Passport)', 'POLICY',
             'PASS', p.homeBureau.bureau + ' · ' + p.homeBureau.score + ' (' + p.homeBureau.country + ', ' +
             p.homeBureau.historyYears + 'y history)', 'consent + home-bureau hit', null);
    }
    if (st) {
      rs.add('POL_HOME_STATEMENTS', 'Home-country bank statements verified (integrity, name match, 6 of the last 6 months)', 'POLICY',
             stUsable ? 'PASS' : (stFraud ? 'REFER' : 'INFO'),
             st.bank + ' (' + st.countryName + ') · ' + (st.integrity === 'PASS' ? st.monthsPresent + ' of 6 months · name ' + (st.nameMatch ? 'matches' : 'does not match') +
               (stUsable ? ' · EMIs AED ' + st.obligationsMonthlyAed + '/mo · remittances ' + st.remittanceConsistencyPct + '% consistent' : '')
               : 'integrity FAIL — fraud review'),
             'integrity PASS · name match · 6 of 6 months',
             stFraud ? 'RC_STATEMENTS_INTEGRITY' : (stUsable ? null : 'RC_STATEMENTS_INCOMPLETE'));
    }

    // Scorecard v0
    const score = loanScore(p, crossBorder, connectedSalary, statementsPath ? st : null);
    const overlayNet = score.overlays.reduce((s, o) => s + o.delta, 0);
    if (score.points !== null) {
      const cutoffOk = score.points >= prm.scoreDecline && score.grade !== 'E';
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off (grade E auto-fails)', 'POLICY',
             cutoffOk ? 'PASS' : 'FAIL', score.points + ' (' + (score.grade || '—') + ')', prm.scoreDecline, 'RC_SCORE_LOW');
      // Below the refer line, only net-positive overlays (verified salary + tenure,
      // no derogatory overlays) allow straight-through approval at grade C.
      const referOk = score.points >= prm.scoreRefer || overlayNet > 0;
      rs.add('POL_SCORE_REFER', 'Score above refer line (or strong positive overlays)', 'POLICY',
             cutoffOk ? (referOk ? 'PASS' : 'REFER') : 'PASS',
             score.points, prm.scoreRefer, 'RC_MANUAL_REVIEW');
    } else {
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off', 'POLICY', 'PASS', 'no score (thin file)', prm.scoreDecline, null);
    }

    // Limit math (CONTRACT §2.2): candidates = [requested, PV-of-DBR-headroom,
    // 20× salary (Reg 29/2011), product cap]; approved = min; binding recorded.
    const dbrCap = dbrCapFor(reg, p.retiree);
    const salaryMultiple = Math.min(reg.salaryMultipleCap, HARD.salaryMultipleCap);
    const headroomMonthly = Math.round((dbrCap / 100) * p.salaryMonthly - obligations);
    const band = gradeToBand(score.grade) || 'C';
    const bandRange = prm.pricingBands[band];
    const midRate = (bandRange[0] + bandRange[1]) / 2;
    const maxByDbr = headroomMonthly > 0 ? floor1000(pvAnnuity(headroomMonthly, midRate / 12, effTenor)) : 0;
    const maxBySalary = salaryMultiple * p.salaryMonthly;
    const candidates = [
      { label: 'Requested amount', value: amount, key: 'REQUESTED' },
      { label: 'DBR headroom @ ' + dbrCap + '% cap (annuity PV at ' + (midRate * 100).toFixed(2) + '% p.a., ' + effTenor + 'm)',
        value: maxByDbr, key: p.retiree ? 'RETIREE_CAP' : 'DBR_HEADROOM' },
      { label: salaryMultiple + '× salary (Reg 29/2011)', value: maxBySalary, key: 'SALARY_MULTIPLE' },
      { label: 'Product cap', value: prm.productCap, key: 'PRODUCT_CAP' }
    ];
    let { approved, binding } = pickMin(candidates);

    // Newcomer haircut. Verified home-country statements (v2.4) prove conduct,
    // buffer and income, so the 50% haircut shrinks: −10 pts clean conduct, −5
    // buffer, −10 corroborated income, floor 25%. Otherwise the Credit Passport
    // entry book starts at 50% of the equivalent local limit.
    let statementsHaircutPct = null;
    if (statementsPath && Number.isFinite(approved) && approved > 0) {
      const ev = st.evidence, hc = STATEMENT_EVIDENCE.haircut;
      const parts = [];
      if (ev.conductClean) parts.push('−' + hc.conduct + ' clean conduct');
      if (ev.bufferOk) parts.push('−' + hc.buffer + ' buffer');
      if (ev.corroborated) parts.push('−' + hc.corroboration + ' corroborated income');
      const relief = (ev.conductClean ? hc.conduct : 0) + (ev.bufferOk ? hc.buffer : 0) + (ev.corroborated ? hc.corroboration : 0);
      statementsHaircutPct = Math.max(hc.floorPct, hc.basePct - relief);
      const kept = floor1000(approved * (1 - statementsHaircutPct / 100));
      candidates.push({ label: 'Newcomer haircut ' + statementsHaircutPct + '% (was ' + hc.basePct + '%' + (parts.length ? ': ' + parts.join(', ') : '') +
                               ') — verified home-country statements', value: kept, key: 'STATEMENTS_HAIRCUT' });
      approved = kept; binding = 'STATEMENTS_HAIRCUT';
    } else if (crossBorder && Number.isFinite(approved) && approved > 0) {
      const haircut = floor1000(approved * 0.5);
      candidates.push({ label: 'Cross-border haircut — 50% of normal limit (Credit Passport entry book)',
                        value: haircut, key: 'CROSS_BORDER_HAIRCUT' });
      approved = haircut; binding = 'CROSS_BORDER_HAIRCUT';
    }

    // REGULATORY — final DBR check on the approved amount (the double-enforcement:
    // even if params were mis-tuned, the engine never approves above the cap).
    const newInstallment = approved > 0 ? Math.round(annuityPayment(approved, midRate / 12, effTenor)) : 0;
    const dbrPct = p.salaryMonthly > 0 ? Math.round(((obligations + newInstallment) / p.salaryMonthly) * 1000) / 10 : 999;
    const dbrOk = headroomMonthly > 0 && dbrPct <= dbrCap + 0.05; // rounding guard only
    rs.add('REG_DBR_CAP', 'Debt burden ratio within ' + dbrCap + '% cap (Reg 29/2011' + (p.retiree ? ', retiree' : '') + ')',
           'REGULATORY', dbrOk ? 'PASS' : 'FAIL', dbrPct + '%', dbrCap + '%', 'RC_DBR_EXCEEDED');
    rs.add('REG_SALARY_MULTIPLE', 'Loan within ' + salaryMultiple + '× salary (Reg 29/2011)', 'REGULATORY',
           approved <= maxBySalary ? 'PASS' : 'FAIL', approved, maxBySalary, 'RC_DBR_EXCEEDED');

    redFlagRule(rs, p);   // v2.9 — POL_RED_FLAGS (REFER only); recorded only when the gate applies
    const outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;

    // Reason codes attached to non-decline outcomes
    if (outcome === 'APPROVE') {
      if (statementsPath) rs.reason('RC_STATEMENTS_USED');
      if (crossBorder) rs.reason('RC_CROSS_BORDER');
      if (binding === 'RETIREE_CAP') rs.reason('RC_RETIREE_CAP');
      if (approved < amount) rs.reason('RC_LIMIT_REDUCED');
    }

    // Free cash flow (v2.5, informational — no rule reads it): only when connected
    // accounts show spending and the customer consented to Open Finance.
    const fcfSeen = connectedSalary && Number.isFinite(p.spendMonthly);
    const freeCashFlowMonthly = fcfSeen ? Math.round(p.salaryMonthly - p.spendMonthly - obligations) : null;
    const features = {
      verifiedIncome: p.salaryDetected ? p.salaryMonthly : null,
      incomeSource: connectedSalary ? 'ALTAREQ_TPP' : (p.salaryDetected ? 'DOCUMENTS' : 'UNVERIFIED'),
      salaryVerifiedViaConnectedAccount: connectedSalary,
      existingObligations: obligations, esrPct: p.esrPct,
      freeCashFlowMonthly,
      instalmentToFcfPct: fcfSeen && freeCashFlowMonthly > 0 ? Math.round((newInstallment / freeCashFlowMonthly) * 1000) / 10 : null,
      dbrCapApplied: dbrCap, headroomMonthly, newInstallment, dbrPct,
      effectiveTenor: effTenor, scoreBase: score.base, overlayNet,
      retiree: p.retiree, thinFile: !p.aecbHit,
      crossBorder: crossBorder,
      homeObligationsMonthly: homeObl,
      homeStatementsUsed: stUsable,
      statementsHaircutPct
    };
    const limit = {
      requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
      bindingConstraint: binding,
      trace: candidates.map(c => ({ label: c.label, value: c.value }))
    };
    // BANDED_APR pricing + Key Facts Statement figures at the mid-band rate
    // (reducing-balance annuity on the approved amount and effective tenor).
    let pricing = null;
    if (outcome !== 'DECLINE') {
      const principal = limit.approved;
      const instalment = annuityPayment(principal, midRate / 12, effTenor);
      pricing = { mode: 'BANDED_APR', band, rateMin: bandRange[0], rateMax: bandRange[1],
                  benchmark: 'EIBOR 3M + margin',
                  kfs: { principal, tenorMonths: effTenor, rateMid: round4(midRate),
                         monthlyInstalment: round2(instalment),
                         totalRepayable: round2(instalment * effTenor),
                         totalInterest: round2(instalment * effTenor - principal),
                         earlySettlementFeeCap: reg.earlySettlementFeeCap || null,
                         coolingOffDays: reg.coolingOffDays || null } };
    }
    return { profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor };
  }

  // ---------------------------------------------------------------------------
  // Salary advance: pure eligibility + limit control. A flat fee that never
  // scales with amount, tenor or risk — there is no pricing lever by design.
  // ---------------------------------------------------------------------------
  function evaluateAdvance(p, amount, tenorMonths, pol) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');
    const effTenor = Math.min(tenorMonths, reg.tenorCapMonths);
    if (tenorMonths > reg.tenorCapMonths) rs.reason('RC_TENOR_CAP');
    rs.add('REG_TENOR_CAP', 'Repayable from next salary credit (single cycle)', 'REGULATORY',
           'PASS', tenorMonths > reg.tenorCapMonths ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths,
           reg.tenorCapMonths, null);
    rs.add('POL_MIN_SALARY', 'Salary at or above product minimum', 'POLICY',
           p.salaryMonthly >= prm.minSalary ? 'PASS' : 'FAIL', p.salaryMonthly, prm.minSalary, 'RC_SALARY_FLOOR');
    rs.add('POL_INCOME_VERIFIED', 'Salary verified (connected accounts or documents)', 'POLICY',
           p.salaryDetected ? 'PASS' : 'REFER', p.salaryDetected ? 'verified' : 'not detected', 'verified', 'RC_INCOME_UNVERIFIED');
    rs.add('POL_THIN_FILE', 'Credit file depth', 'POLICY',
           p.aecbHit ? 'PASS' : 'REFER', p.aecbHit ? 'file present' : 'no-hit / thin file', 'AECB hit', 'RC_THIN_FILE');
    const delinq = p.worstDelinquency || 'NONE';
    rs.add('POL_DELINQUENCY', 'Delinquency history acceptable', 'POLICY',
           (delinq === 'DPD90' || delinq === 'WRITEOFF') ? 'FAIL' : 'PASS', delinq, '< DPD90', 'RC_DELINQUENCY');
    const connectedSalary = p.bankSource === 'ALTAREQ_TPP' && p.salaryDetected;
    const score = loanScore(p, false, connectedSalary);
    if (score.points !== null) {
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off', 'POLICY',
             score.points >= prm.scoreDecline ? 'PASS' : 'FAIL', score.points, prm.scoreDecline, 'RC_SCORE_LOW');
    }
    // DBR guard: the advance is settled from the next salary credit, so the
    // regulatory check applies to existing obligations (the advance is not an
    // instalment). Existing obligations must sit within the 50% / 30% cap.
    const dbrCap = dbrCapFor(reg, p.retiree);
    const existingDbr = p.salaryMonthly > 0 ? Math.round((p.obligationsMonthly / p.salaryMonthly) * 1000) / 10 : 999;
    rs.add('REG_DBR_CAP', 'Existing obligations within ' + dbrCap + '% DBR cap (Reg 29/2011)', 'REGULATORY',
           existingDbr <= dbrCap ? 'PASS' : 'FAIL', existingDbr + '%', dbrCap + '%', 'RC_DBR_EXCEEDED');

    // Limit = min(requested, pctOfSalary% × salary, capAmount) — no other levers.
    const byPct = Math.floor((prm.pctOfSalary / 100) * p.salaryMonthly);
    const candidates = [
      { label: 'Requested amount', value: amount, key: 'REQUESTED' },
      { label: prm.pctOfSalary + '% of verified salary', value: byPct, key: 'SALARY_MULTIPLE' },
      { label: 'Product cap', value: prm.capAmount, key: 'PRODUCT_CAP' }
    ];
    let { approved, binding } = pickMin(candidates);
    const outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;
    if (outcome === 'APPROVE' && approved < amount) rs.reason('RC_LIMIT_REDUCED');

    const features = {
      verifiedIncome: p.salaryDetected ? p.salaryMonthly : null,
      existingObligations: p.obligationsMonthly, dbrPct: existingDbr, dbrCapApplied: dbrCap,
      effectiveTenor: effTenor, scoreBase: score.base, thinFile: !p.aecbHit
    };
    const limit = { requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
                    bindingConstraint: binding, trace: candidates.map(c => ({ label: c.label, value: c.value })) };
    // Flat fee — constant regardless of amount/tenor/risk.
    const pricing = outcome === 'DECLINE' ? null
      : { mode: 'FLAT_FEE', fee: prm.flatFee, note: 'Flat fee, no interest — within the CBUAE retail fee schedule' };
    return { profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor };
  }

  // ---------------------------------------------------------------------------
  // Split evaluation — connected-account cash-flow underwriting (repurposed from
  // the v1 business cash-flow evaluation: inflow/outflow → income/spend,
  // inflow volatility → income volatility, inflow multiple → split capacity).
  //
  // Free cash flow (FCF) = avg monthly income − avg monthly spend − AECB obligations.
  //
  // Limit logic, in order:
  //  1. Split capacity (the revolving limit) =
  //       min( floor500( splitCapacityMultiple[band] × FCF ), productCap )
  //     e.g. grade A, FCF 10,600 → min(floor500(31,800), 50,000) = 31,500.
  //  2. Target amount for this purchase = min(requested, verified purchase amount,
  //     capacity).
  //  3. Monthly instalment budget, two caps:
  //       FCF cap = instalmentToFcfMaxPct% × FCF                 (policy, default 50%)
  //       DBR cap = dbrCap% × income − existing obligations      (regulatory 50% / 30%)
  //     If the requested plan's instalment breaches either cap, take the
  //     SHORTEST permitted longer plan that fits (3 → 6 → 12) and record the
  //     breached cap as the binding constraint (FREE_CASH_FLOW or DBR_HEADROOM).
  //  4. If even Pay in 12 does not fit, the amount is reduced to the largest
  //     principal (floor AED 100) whose Pay in 12 instalment fits both caps.
  //  The trace lists every candidate (requested, purchase, capacity, product cap,
  //  FCF-affordable principal, DBR-affordable principal on the chosen plan), so
  //  approved === min(trace values) always holds.
  // ---------------------------------------------------------------------------
  function evaluateSplit(p, amount, tenorMonths, pol) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    const terms = splitTerms(reg);

    const income = p.avgMonthlyIncome;
    const obligations = p.obligationsMonthly;
    const fcf = Math.round(income - p.avgMonthlySpend - obligations);
    const dbrCap = dbrCapFor(reg, p.retiree);
    // Noor's thesis: open banking makes thin files approvable. An AECB no-hit with
    // enough connected-account history is underwritten on cash flow.
    const cashFlowPath = !p.aecbHit && p.connectedMonths >= prm.minConnectedMonths;

    // REGULATORY — mandatory bureau check (consent gated upstream)
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');

    // REGULATORY — permitted plan terms only (3 / 6 / 12). Others are snapped.
    const effTenor = terms.includes(tenorMonths) ? tenorMonths : snapSplitTerm(tenorMonths, terms);
    const snapped = effTenor !== tenorMonths;
    rs.add('REG_PLAN_TERMS', 'Plan term is a permitted split term (' + terms.join(' / ') + ' months)', 'REGULATORY',
           'PASS', snapped ? tenorMonths + ' → adjusted to ' + effTenor : tenorMonths, terms.join(' / '), null);
    if (snapped) rs.reason('RC_TENOR_CAP');

    // POLICY — eligibility on connected-account data
    rs.add('POL_MIN_INCOME', 'Verified monthly income at or above product minimum', 'POLICY',
           income >= prm.minMonthlyIncome ? 'PASS' : 'FAIL', income, prm.minMonthlyIncome, 'RC_SALARY_FLOOR');
    rs.add('POL_CONNECTED_HISTORY', 'Enough connected-account history (months)', 'POLICY',
           p.connectedMonths >= prm.minConnectedMonths ? 'PASS' : 'REFER',
           p.connectedMonths, prm.minConnectedMonths, 'RC_CONNECTED_HISTORY');
    const pu = p.purchase;
    const inWindow = pu.ageDays >= 0 && pu.ageDays <= prm.purchaseLookbackDays;
    rs.add('POL_PURCHASE_VERIFIED', 'Purchase seen in connected data within the lookback window', 'POLICY',
           !inWindow ? 'FAIL' : (pu.seen ? 'PASS' : 'REFER'),
           pu.merchant + ' · ' + aed(pu.amount) + ' · ' + pu.ageDays + ' days ago' + (pu.seen ? '' : ' · not found in connected data'),
           '≤ ' + prm.purchaseLookbackDays + ' days, seen in connected data', 'RC_PURCHASE_UNVERIFIED');
    rs.add('POL_THIN_FILE', 'Credit file depth (thin-file strategy)', 'POLICY',
           p.aecbHit ? 'PASS' : (cashFlowPath ? 'PASS' : 'REFER'),
           p.aecbHit ? 'AECB file present'
                     : (cashFlowPath ? 'no-hit — underwritten on connected-account cash flow' : 'no-hit and short connected history'),
           'AECB hit, or ≥ ' + prm.minConnectedMonths + ' connected months', 'RC_THIN_FILE');

    // Scorecard (cash-flow overlays)
    const score = splitScore(p, fcf, cashFlowPath);
    const overlayNet = score.overlays.reduce((s, o) => s + o.delta, 0);

    const delinq = p.worstDelinquency || 'NONE';
    rs.add('POL_DELINQUENCY', 'Delinquency history acceptable', 'POLICY',
           (delinq === 'DPD90' || delinq === 'WRITEOFF') ? 'FAIL' : (delinq === 'DPD30' ? 'REFER' : 'PASS'),
           delinq, '≤ DPD30 refers, ≥ DPD90 declines', 'RC_DELINQUENCY');
    if (score.points !== null) {
      const below = score.points < prm.scoreDecline || score.grade === 'E';
      const referBand = !below && score.points < prm.scoreRefer;
      rs.add('POL_SCORE', 'Score vs decline cut-off and refer line (grade E auto-fails)', 'POLICY',
             below ? 'FAIL' : (referBand ? 'REFER' : 'PASS'),
             score.points + ' (' + score.grade + (score.basis === 'CASH_FLOW_PROXY' ? ', cash-flow proxy' : '') + ')',
             '< ' + prm.scoreDecline + ' declines, < ' + prm.scoreRefer + ' refers',
             below ? 'RC_SCORE_LOW' : 'RC_MANUAL_REVIEW');
    } else {
      rs.add('POL_SCORE', 'Score vs decline cut-off and refer line', 'POLICY', 'PASS',
             'no score (thin file)', '< ' + prm.scoreDecline + ' declines, < ' + prm.scoreRefer + ' refers', null);
    }
    rs.add('POL_CHEQUE_RETURNS', 'Returned cheques within tolerance', 'POLICY',
           p.chequeReturns12m <= prm.chequeReturnsMax ? 'PASS' : 'FAIL',
           p.chequeReturns12m, prm.chequeReturnsMax, 'RC_CHEQUE_RETURNS');
    rs.add('POL_INCOME_VOLATILITY', 'Income volatility within auto-approve threshold', 'POLICY',
           p.incomeVolatilityPct <= prm.maxIncomeVolatilityPct ? 'PASS' : 'REFER',
           p.incomeVolatilityPct + '%', '≤ ' + prm.maxIncomeVolatilityPct + '%', 'RC_INCOME_VOLATILITY');
    rs.add('POL_FREE_CASH_FLOW', 'Free cash flow (income − spend − obligations) at or above minimum', 'POLICY',
           fcf >= prm.minFreeCashFlow ? 'PASS' : 'FAIL', fcf, prm.minFreeCashFlow, 'RC_FREE_CASH_FLOW');

    // ---- Limit: split capacity, then fit a plan (see block comment above) ----
    const band = gradeToBand(score.grade) || 'C';     // unscored thin files get the C band provisionally
    const feeRate = prm.monthlyFeeRate[band];
    const multiple = prm.splitCapacityMultiple[band];
    const capacityByFcf = fcf > 0 ? floorTo(multiple * fcf, 500) : 0;
    const capacity = Math.min(capacityByFcf, prm.productCap);
    const purchaseCap = Number.isFinite(pu.amount) && pu.amount > 0 ? pu.amount : amount;
    const target = Math.min(amount, purchaseCap, capacity);

    const fcfBudget = Math.max(0, Math.floor((prm.instalmentToFcfMaxPct / 100) * fcf));
    const dbrBudget = Math.floor((dbrCap / 100) * income - obligations);   // may be ≤ 0
    const byFcf = (n) => maxSplitPrincipal(fcfBudget, n, feeRate);
    const byDbr = (n) => maxSplitPrincipal(dbrBudget, n, feeRate);
    const fits = (P, n) => P <= byFcf(n) && P <= byDbr(n);

    let planMonths = effTenor, planAdjusted = false, breach = null;
    if (target > 0 && !fits(target, effTenor)) {
      breach = target > byFcf(effTenor) ? 'FREE_CASH_FLOW' : 'DBR_HEADROOM';
      const longer = terms.filter(n => n > effTenor);
      const fitting = longer.find(n => fits(target, n));
      planMonths = fitting !== undefined ? fitting : terms[terms.length - 1];
      planAdjusted = planMonths !== effTenor;
    }

    const candidates = [{ label: 'Requested amount', value: amount, key: 'REQUESTED' }];
    if (purchaseCap < amount) {
      candidates.push({ label: 'Verified purchase amount (' + pu.merchant + ')', value: purchaseCap, key: 'REQUESTED' });
    }
    candidates.push(
      { label: 'Split capacity — ' + multiple.toFixed(1) + '× free cash flow ' + aed(fcf) + ' (band ' + band + '), floor 500',
        value: capacityByFcf, key: 'SPLIT_CAPACITY' },
      { label: 'Product cap', value: prm.productCap, key: 'PRODUCT_CAP' },
      { label: 'Pay in ' + planMonths + ' instalment ≤ ' + prm.instalmentToFcfMaxPct + '% of free cash flow (' + aed(fcfBudget) + '/mo)',
        value: byFcf(planMonths), key: 'FREE_CASH_FLOW' },
      { label: 'Pay in ' + planMonths + ' within ' + dbrCap + '% DBR headroom (' + aed(Math.max(0, dbrBudget)) + '/mo)',
        value: byDbr(planMonths), key: 'DBR_HEADROOM' });
    const { approved, binding: minBinding } = pickMin(candidates);
    // A plan lengthened to fit the FULL amount records the breached affordability
    // cap as binding (the cap shaped the offer, not the amount). When even Pay in
    // 12 needed a smaller amount, the cap that sized that amount is already the min.
    const binding = (planAdjusted && approved >= target) ? breach : minBinding;

    const plan = approved > 0 ? splitPlan(approved, planMonths, feeRate) : null;
    const instalment = plan ? plan.monthlyPayment : 0;
    const instalmentToFcfPct = fcf > 0 ? Math.round((instalment / fcf) * 1000) / 10 : null;
    const dbrPct = income > 0 ? Math.round(((obligations + instalment) / income) * 1000) / 10 : 999;

    // POLICY — instalment-to-FCF. FAIL only when no plan at all fits the FCF budget.
    const fcfAffordable = fcf > 0 && byFcf(terms[terms.length - 1]) > 0;
    rs.add('POL_INSTALMENT_TO_FCF', 'Instalment within ' + prm.instalmentToFcfMaxPct + '% of free cash flow (plan lengthened / amount reduced to fit)', 'POLICY',
           fcfAffordable ? 'PASS' : 'FAIL',
           plan ? ('Pay in ' + planMonths + ': ' + aed(instalment) + ' = ' + instalmentToFcfPct + '% of FCF' +
                   (planAdjusted ? ' (requested Pay in ' + effTenor + ')' : ''))
                : 'no plan fits',
           '≤ ' + prm.instalmentToFcfMaxPct + '% of FCF', 'RC_FREE_CASH_FLOW');
    // REGULATORY — final DBR on the chosen plan (double enforcement).
    const dbrOk = dbrBudget > 0 && byDbr(terms[terms.length - 1]) > 0 && dbrPct <= dbrCap + 0.05;
    rs.add('REG_DBR_CAP', 'Debt burden ratio incl. new instalment within ' + dbrCap + '% cap (Reg 29/2011' + (p.retiree ? ', retiree' : '') + ')',
           'REGULATORY', dbrOk ? 'PASS' : 'FAIL', dbrPct + '%', dbrCap + '%', 'RC_DBR_EXCEEDED');

    redFlagRule(rs, p);   // v2.9 — POL_RED_FLAGS (REFER only); recorded only when the gate applies
    const outcome = outcomeFromRules(rs.rules);
    if (outcome !== 'DECLINE' && cashFlowPath) rs.reason('RC_CASH_FLOW_UNDERWRITTEN');
    if (outcome === 'APPROVE') {
      if (planAdjusted) rs.reason('RC_PLAN_ADJUSTED');
      if (approved < Math.min(amount, purchaseCap)) rs.reason('RC_LIMIT_REDUCED');
    }
    const finalApproved = outcome === 'DECLINE' ? 0 : approved;

    const features = {
      verifiedIncome: income,
      avgMonthlySpend: p.avgMonthlySpend,
      existingObligations: obligations,
      freeCashFlowMonthly: fcf,
      incomeVolatilityPct: p.incomeVolatilityPct,
      connectedMonths: p.connectedMonths,
      connectedBanks: p.banks.slice(),
      purchaseMerchant: pu.merchant, purchaseCategory: pu.category,
      purchaseAmount: pu.amount, purchaseDate: pu.date, purchaseAgeDays: pu.ageDays,
      purchaseSeenInConnectedData: pu.seen,
      cashFlowUnderwritten: cashFlowPath,
      thinFile: !p.aecbHit,
      dbrCapApplied: dbrCap,
      instalmentBudgetFcf: fcfBudget,
      instalmentBudgetDbr: dbrBudget,
      newInstalment: instalment,
      instalmentToFcfPct,
      dbrPct,
      requestedMonths: tenorMonths,
      effectiveTenor: planMonths,
      planAdjusted,
      scoreBase: score.base, overlayNet
    };
    const limit = {
      requested: amount, approved: finalApproved,
      bindingConstraint: binding,
      trace: candidates.map(c => ({ label: c.label, value: c.value })),
      capacity: outcome === 'DECLINE' ? 0 : capacity,
      planMonths
    };
    let pricing = null;
    if (outcome !== 'DECLINE') {
      pricing = { mode: 'MONTHLY_FEE', band, monthlyFeeRate: feeRate, principal: finalApproved,
                  plans: terms.map(n => {
                    const pl = splitPlan(finalApproved, n, feeRate);
                    pl.fits = finalApproved > 0 && fits(finalApproved, n);
                    return pl;
                  }),
                  selectedMonths: planMonths,
                  disclosure: reg.feeDisclosure || null };
    }
    return { profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor: planMonths };
  }

  // ---------------------------------------------------------------------------
  // Starter loan → upgrade (Addendum v2.1)
  //
  // Applicant: an upgrade persona (priorLoan + aecb + connected + optional
  // homeStatements block, read only through the v2.4 parser) or a sampleBook.starter_loan row ({starterDpd,
  // connectedMonths, statements, statementMonths, income, spend,
  // aecbObligations, homeObligations}).
  // ---------------------------------------------------------------------------
  function normalizeUpgrade(a) {
    if (!a || typeof a !== 'object') throw err('upgrade applicant payload missing');
    const isRow = !a.priorLoan && a.starterDpd !== undefined;
    if (!a.priorLoan && !isRow) {
      throw err('starter_loan re-decides an existing starter loan — applicant.priorLoan is required');
    }
    const emp = a.employment || {};
    let prior, aecb, connected, intl;
    if (isRow) {
      prior = { ref: 'starter · ' + a.id, productId: 'starter_loan', amount: 1000, tenorMonths: 1, apr: 0.50,
                disbursedAt: null, dueAt: null, repaidAt: 'repaid', dpd: a.starterDpd || 0, partnerIncome: 41.67 };
      aecb = { hit: true, score: null, tradelines: 1, obligationsMonthly: a.aecbObligations || 0,
               worstDelinquency: 'NONE', chequeReturns12m: 0, note: null };
      connected = { source: 'ALTAREQ_TPP', banks: [], monthsAvailable: a.connectedMonths || 0,
                    avgMonthlyIncome: a.income, avgMonthlySpend: a.spend, incomeVolatilityPct: null };
      // Statements exist only for rows that offer them; the home-country loan is a
      // fact about the customer, but it is only visible through the statements.
      intl = a.statements ? { country: null, bank: null, source: 'Statements (parsed)', monthsAvailable: a.statementMonths || 0,
                              avgMonthlyIncomeAed: null, incomeVolatilityPct: null, avgBalanceAed: null, overdrafts12m: null,
                              obligationsMonthlyAed: a.homeObligations || 0 } : null;
    } else {
      const pl = a.priorLoan;
      prior = { ref: pl.ref || null, productId: pl.productId || 'starter_loan', amount: pl.amount, tenorMonths: pl.tenorMonths,
                apr: pl.apr, disbursedAt: pl.disbursedAt || null, dueAt: pl.dueAt || null, repaidAt: pl.repaidAt || null,
                dpd: Number.isFinite(pl.dpd) ? pl.dpd : 0,
                partnerIncome: Number.isFinite(pl.partnerIncome) ? pl.partnerIncome
                  : upgradeOption(pl.amount, pl.apr, pl.tenorMonths).partnerIncome };
      if (Number.isFinite(pl.onTimeRepayments)) prior.onTimeRepayments = pl.onTimeRepayments;
      const ab = a.aecb || {};
      aecb = { hit: ab.hit === true, score: ab.score === undefined ? null : ab.score, tradelines: ab.tradelines || 0,
               obligationsMonthly: ab.obligationsMonthly || 0, worstDelinquency: ab.worstDelinquency || 'NONE',
               chequeReturns12m: ab.chequeReturns12m || 0, note: ab.note || null };
      connected = Object.assign({ source: 'ALTAREQ_TPP', banks: [], monthsAvailable: 0 }, a.connected || {});
      // v2.4: a persona's home-country history reaches the decision only as parsed statements.
      intl = null;
    }
    if (!Number.isFinite(connected.avgMonthlyIncome) || !Number.isFinite(connected.avgMonthlySpend)) {
      throw err('upgrade applicant needs connected-account income and spend (avgMonthlyIncome / avgMonthlySpend)');
    }
    return {
      id: a.id || null, name: a.name || a.id || 'Applicant', retiree: !!emp.retiree, isRow,
      prior, aecbHit: aecb.hit, score: aecb.score, tradelines: aecb.tradelines,
      obligationsMonthly: aecb.obligationsMonthly, worstDelinquency: aecb.worstDelinquency,
      chequeReturns12m: aecb.chequeReturns12m, aecbNote: aecb.note,
      connectedSource: connected.source, banks: (connected.banks || []).slice(), connectedMonths: connected.monthsAvailable || 0,
      income: connected.avgMonthlyIncome, spend: connected.avgMonthlySpend,
      incomeVolatilityPct: Number.isFinite(connected.incomeVolatilityPct) ? connected.incomeVolatilityPct : null,
      intl, statementsOffered: isRow ? !!a.statements : !!intl
    };
  }

  // Upgrade evaluator. Order of work:
  //  1. Tier. Home-country statements are optional (v2.4: uploaded, 6 months,
  //     parsed). Verified statements credit the account's history — months since
  //     it opened, capped at 24 — so income history = UAE connected months +
  //     credited home history; at least minIncomeHistoryMonthsEnhanced (12)
  //     unlocks ENHANCED, otherwise BASE. (Anita: 5 UAE + 24 = 29.) The statements
  //     also surface home-country EMIs, which then count against free cash flow
  //     and DBR. Without statements they stay invisible. Integrity or name failure
  //     → REFER (fraud review); an incomplete window → not used.
  //     Sample-book rows keep their own `statements` / `statementMonths` fields.
  //  2. Affordability.
  //       free cash flow = income − spend − AECB obligations − home-country obligations (if visible)
  //       maxInstalment  = instalmentToFcfMaxPct% × free cash flow       (u1 enhanced: 50% × 3,550 = 1,775)
  //       DBR budget     = dbrCap% × income − all visible obligations     (50%; 30% retirees)
  //  3. Offer ceiling = min(tier maxAmount, largest amount whose max-tenor
  //     instalment fits each budget). Max tenor is the cheapest per month, so
  //     the ceiling always fits there, and the default selection is the longest
  //     tenor that fits at the ceiling.
  //  4. Rules (all recorded): REG_AECB_CHECK, REG_DBR_CAP (at the default option),
  //     POL_STARTER_REPAID_ON_TIME (DPD 0 or DECLINE RC_STARTER_LATE),
  //     POL_CONNECTED_ACCOUNTS, POL_INCOME_HISTORY, POL_FREE_CASH_FLOW,
  //     POL_HOME_STATEMENTS (verified statements set the tier; integrity/name
  //     failure → REFER to fraud review).
  function evaluateUpgrade(p, amount, tenorMonths, pol, consents, statements) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    const st = statements || null;
    let intl = null, stState = 'NONE';
    if (p.isRow) {
      const consented = consents ? (consents.homeStatements === true || consents.internationalStatements === true) : p.statementsOffered;
      if (consented && p.intl) { intl = p.intl; stState = 'USED'; }
    } else if (st) {
      if (st.integrity !== 'PASS' || st.nameMatch !== true) stState = 'FRAUD';
      else if (!st.complete) stState = 'INCOMPLETE';
      else {
        stState = 'USED';
        intl = { country: st.countryName, bank: st.bank, source: 'Home-country statements (' + st.monthsPresent + ' months, parsed)',
                 monthsAvailable: Math.min(st.accountTenureMonths, STATEMENT_EVIDENCE.historyCreditMaxMonths),
                 accountOpenSince: st.accountOpenSince, avgBalanceAed: st.avgBalanceAed,
                 obligationsMonthlyAed: st.obligationsMonthlyAed, remittanceConsistencyPct: st.remittanceConsistencyPct };
      }
    }

    // ---- 1. Tier ----
    const homeHistoryMonths = intl ? (intl.monthsAvailable || 0) : null;
    const incomeHistoryMonths = p.connectedMonths + (homeHistoryMonths || 0);
    const homeCountryObligations = intl ? (intl.obligationsMonthlyAed || 0) : null;   // null = not visible
    const enhancedEligible = !!intl && incomeHistoryMonths >= prm.minIncomeHistoryMonthsEnhanced;
    const tierKey = enhancedEligible ? 'enhanced' : 'base';
    const TIER = enhancedEligible ? 'ENHANCED' : 'BASE';
    const tier = prm.tiers[tierKey];
    const otherKey = enhancedEligible ? 'base' : 'enhanced';
    const curve = tenorCurve(tier);

    // ---- 2. Affordability ----
    const income = p.income;
    const visibleObligations = p.obligationsMonthly + (homeCountryObligations || 0);
    const fcf = Math.round(income - p.spend - visibleObligations);
    const maxInstalment = Math.max(0, Math.floor((prm.instalmentToFcfMaxPct / 100) * fcf));
    const dbrCap = dbrCapFor(reg, p.retiree);
    const dbrBudget = Math.floor((dbrCap / 100) * income - visibleObligations);   // may be ≤ 0
    const step = prm.amountStep;
    const maxTenor = tier.maxTenorMonths;
    const floorApr = curve[curve.length - 1].apr;
    const byFcf = maxUpgradePrincipal(maxInstalment, floorApr, maxTenor, step);
    const byDbr = maxUpgradePrincipal(dbrBudget, floorApr, maxTenor, step);

    // ---- 3. Offer ceiling + default option ----
    const tierLabel = enhancedEligible ? 'Enhanced (UAE accounts + home-country statements)' : 'Base (UAE accounts only)';
    const candidates = [
      { label: 'Tier cap — ' + tierLabel, value: tier.maxAmount, key: 'TIER_CAP' },
      { label: 'Largest amount whose ' + maxTenor + '-month instalment fits ' + prm.instalmentToFcfMaxPct +
               '% of free cash flow (' + aed(maxInstalment) + '/mo)', value: byFcf, key: 'FREE_CASH_FLOW' },
      { label: 'Largest amount within the ' + dbrCap + '% DBR headroom (' + aed(Math.max(0, dbrBudget)) + '/mo) on ' +
               maxTenor + ' months', value: byDbr, key: 'DBR_HEADROOM' }
    ];
    const { approved: ceiling, binding } = pickMin(candidates);
    const ctx = { curve, maxInstalment, dbr: { capPct: dbrCap, incomeMonthly: income, obligationsMonthly: visibleObligations },
                  starterPartnerIncome: p.prior.partnerIncome };
    const offerable = ceiling >= prm.minAmount;
    let defaultOption = null;
    if (offerable) {
      const opts = upgradeOptionsFor(ctx, ceiling);
      for (let i = opts.length - 1; i >= 0; i--) if (opts[i].fits) { defaultOption = opts[i]; break; }
    }
    // DBR is evaluated on the default option, or on the smallest offer at the
    // longest tenor when nothing can be offered at all.
    const dbrProbe = defaultOption || upgradeOptionsFor(ctx, prm.minAmount)[maxTenor - 1];

    // ---- 4. Rules, in the Addendum's order ----
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY', 'PASS',
           p.aecbHit ? 'HIT — ' + p.tradelines + ' tradeline' + (p.tradelines === 1 ? '' : 's') +
                       (p.score === null || p.score === undefined ? ', no score yet' : ', score ' + p.score) : 'NO_HIT',
           'pull required');
    rs.add('REG_DBR_CAP', 'Debt burden ratio incl. the new instalment within ' + dbrCap + '% cap (Reg 29/2011' +
           (p.retiree ? ', retiree' : '') + ') — at the default option; every selection is re-checked', 'REGULATORY',
           dbrBudget > 0 && dbrProbe.dbrPct <= dbrCap ? 'PASS' : 'FAIL',
           dbrProbe.dbrPct + '% (' + aed(defaultOption ? ceiling : prm.minAmount) + ' · ' + dbrProbe.months + ' months)',
           dbrCap + '%', 'RC_DBR_EXCEEDED');
    const pr = p.prior;
    const repaid = !!pr.repaidAt;
    const onTimeRepayments = Number.isFinite(pr.onTimeRepayments) ? pr.onTimeRepayments
                           : (repaid && pr.dpd === 0 ? pr.tenorMonths : 0);
    const repaidOk = repaid && pr.dpd === 0 && onTimeRepayments >= prm.minOnTimeStarterRepayments;
    rs.add('POL_STARTER_REPAID_ON_TIME', 'Starter loan repaid on time (no days past due)', 'POLICY',
           repaidOk ? 'PASS' : 'FAIL',
           (pr.ref ? pr.ref + ' · ' : '') + (repaid ? (pr.dpd === 0 ? 'repaid on time' : 'repaid ' + pr.dpd + ' days late') : 'not yet repaid') +
             ' · ' + onTimeRepayments + ' on-time repayment' + (onTimeRepayments === 1 ? '' : 's'),
           'DPD 0 and ≥ ' + prm.minOnTimeStarterRepayments + ' on-time repayment' + (prm.minOnTimeStarterRepayments === 1 ? '' : 's'),
           'RC_STARTER_LATE');
    const connectedOk = p.connectedMonths >= UPGRADE_MIN_CONNECTED_MONTHS && income > 0;
    rs.add('POL_CONNECTED_ACCOUNTS', 'Connected UAE accounts show income and spending (Open Finance)', 'POLICY',
           connectedOk ? 'PASS' : 'REFER',
           p.connectedMonths + ' months' + (p.banks.length ? ' · ' + p.banks.join(', ') : '') + ' · income ' + aed(income) + '/mo',
           '≥ ' + UPGRADE_MIN_CONNECTED_MONTHS + ' months connected', 'RC_CONNECTED_HISTORY');
    rs.add('POL_INCOME_HISTORY', 'Income history for the enhanced tier (UAE connected months + home-country account history from verified statements, up to 24)', 'POLICY',
           enhancedEligible ? 'PASS' : 'INFO',
           incomeHistoryMonths + ' months (' + p.connectedMonths + ' UAE' +
             (intl ? ' + ' + homeHistoryMonths + ' home-country' + (intl.accountOpenSince ? ' — account open since ' + monLabel(intl.accountOpenSince) : '')
                   : ', no verified home-country statements') + ')' +
             (enhancedEligible ? '' : ' — base tier'),
           '≥ ' + prm.minIncomeHistoryMonthsEnhanced + ' months for the enhanced tier', null);
    rs.add('POL_FREE_CASH_FLOW', 'Free cash flow supports at least the smallest upgrade', 'POLICY',
           byFcf >= prm.minAmount ? 'PASS' : 'FAIL',
           aed(fcf) + '/mo → instalment budget ' + aed(maxInstalment) + '/mo',
           aed(prm.minAmount) + ' over ' + maxTenor + ' months must fit', 'RC_FREE_CASH_FLOW');
    rs.add('POL_HOME_STATEMENTS', 'Home-country bank statements (optional — verified statements set the tier)', 'POLICY',
           stState === 'USED' ? 'PASS' : (stState === 'FRAUD' ? 'REFER' : 'INFO'),
           stState === 'USED'
             ? ((intl.bank ? intl.bank + (intl.country ? ' (' + intl.country + ')' : '') + ' · ' : '') +
                (p.isRow ? homeHistoryMonths + ' months parsed' : '6 of 6 months · ' + homeHistoryMonths + ' months of history credited') +
                (homeCountryObligations ? ' · home-country EMI ' + aed(homeCountryObligations) + '/mo surfaced' : ''))
             : (stState === 'FRAUD' ? st.bank + ' — ' + (st.integrity !== 'PASS' ? 'integrity FAIL' : 'name does not match the Emirates ID') + ' — fraud review'
               : (stState === 'INCOMPLETE' ? st.bank + ' — ' + st.monthsPresent + ' of 6 months; the customer is asked for the rest'
                 : 'not provided — base tier')),
           'optional · integrity, name match, 6 of 6 months',
           stState === 'FRAUD' ? 'RC_STATEMENTS_INTEGRITY' : (stState === 'INCOMPLETE' ? 'RC_STATEMENTS_INCOMPLETE' : null));

    const outcome = outcomeFromRules(rs.rules);
    // The tier code leads an approval; on a refer the refer reason leads (it is what the analyst queue shows).
    const tierCode = enhancedEligible ? 'RC_UPGRADE_ENHANCED' : 'RC_UPGRADE_BASE';
    if (outcome === 'APPROVE') rs.reasons.unshift(tierCode);
    else if (outcome === 'REFER') rs.reasons.push(tierCode);
    const approved = outcome === 'DECLINE' ? 0 : ceiling;

    const features = {
      verifiedIncome: income,
      avgMonthlySpend: p.spend,
      existingObligations: p.obligationsMonthly,
      homeCountryObligations,
      freeCashFlowMonthly: fcf,
      maxInstalment,
      instalmentBudgetDbr: dbrBudget,
      dbrCapApplied: dbrCap,
      incomeHistoryMonths,
      connectedMonths: p.connectedMonths,
      homeHistoryMonths,
      homeStatements: stState,
      connectedBanks: p.banks.slice(),
      incomeVolatilityPct: p.incomeVolatilityPct,
      starterDpd: pr.dpd,
      starterOnTimeRepayments: onTimeRepayments,
      tierEvaluated: TIER,
      defaultMonths: defaultOption ? defaultOption.months : null,
      newInstalment: defaultOption ? defaultOption.monthlyPayment : 0,
      dbrPct: dbrProbe.dbrPct,
      thinFile: p.score === null || p.score === undefined
    };
    const limit = {
      requested: amount, approved,
      bindingConstraint: binding,
      trace: candidates.map(c => ({ label: c.label, value: c.value })),
      capacity: approved,
      planMonths: defaultOption ? defaultOption.months : null
    };
    let upgrade = null, pricing = null;
    if (outcome !== 'DECLINE') {
      const other = prm.tiers[otherKey];
      upgrade = {
        tier: TIER,
        maxAmount: ceiling, tierMaxAmount: tier.maxAmount, minAmount: prm.minAmount, amountStep: step,
        maxTenorMonths: maxTenor,
        curve: curve.map(c => ({ months: c.months, apr: c.apr })),
        aprAtOneMonth: curve[0].apr, aprFloor: floorApr,
        maxInstalment,
        dbr: { capPct: dbrCap, incomeMonthly: income, obligationsMonthly: visibleObligations },
        starterPartnerIncome: pr.partnerIncome,
        defaultSelection: defaultOption ? Object.assign({ amount: ceiling }, defaultOption) : null,
        // The other tier, so the UI can say what the statements were (or would be) worth.
        counterfactual: { tier: otherKey === 'base' ? 'BASE' : 'ENHANCED', maxAmount: other.maxAmount,
                          maxTenorMonths: other.maxTenorMonths, aprAtMaxTenor: other.aprAtMaxTenor }
      };
      pricing = { mode: 'TENOR_CURVE_APR', tier: TIER, curve: upgrade.curve.map(c => ({ months: c.months, apr: c.apr })),
                  aprFloor: floorApr, aprAtOneMonth: curve[0].apr };
    }
    const score = { model: 'starter_upgrade_v0', version: '0.1', basis: 'REPAYMENT_RECORD',
                    base: null, overlays: [], points: null, grade: null };
    return { profile: p, features, rules: rs.rules, score, limit, pricing, outcome, reasonCodes: rs.reasons,
             effTenor: limit.planMonths, tier: outcome === 'DECLINE' ? null : TIER, upgrade };
  }

  // ---------------------------------------------------------------------------
  // Car loan (Addendum v2.7, CAR-LOAN-SPEC.md) — a policy pack on the shared layer.
  //
  // Reuses normalizeLoan + loanScore (grade from the existing bands), the DBR cap,
  // BANDED_APR pricing at the mid-band rate, repayment routing, the 6-step execution
  // and the credit memo. Adds one primitive and one evidence rule:
  //   loan-to-value   approved ≤ 80% of the vehicle's value (Reg 29/2011); tenor ≤ 60
  //                   months; no 20× salary multiple (that cap is for personal loans —
  //                   the loan-to-value cap does that job for a secured car loan)
  //   regular income  counts toward DBR ONLY with Open Finance consent, and only when
  //                   the connected accounts show ≥ regularIncomeMinMonths (12) of history
  //                   and every receipt on schedule, matching the tenancy, with the
  //                   expected count (MONTHLY 12, QUARTERLY 4); counted at the pack's
  //                   regularIncomeCountedPct (75%). On the documents path (salary
  //                   certificate + AECB) declared other income is not counted — it is
  //                   not verifiable in an instant decision.
  //   income counted = salary + Σ counted regular income   (Karim: 45,000 + 75% × 9,000 = 51,750)
  //   obligations    = AECB; with Open Finance, the larger of AECB and what the accounts
  //                    show leaving every month (Open Finance works both ways)
  // Limit = min(requested, 80% LTV, DBR-headroom PV, free-cash-flow PV [spending seen],
  //   product cap), each floored to AED 1,000; PVs at the mid-band rate over the
  //   effective tenor:
  //     DBR headroom = dbrCap% × income counted − obligations           (30% retirees)
  //     FCF budget   = instalmentToFcfMaxPct% × (connected income − spending − obligations)
  //   A request exactly at the LTV maximum records LTV_CAP as binding (it is the cap
  //   that bounds the request, as the slider's maximum).
  // DBR on the record = (obligations + instalment) ÷ income counted, 2 dp; the same
  // ratio on salary alone is kept (dbrPctSalaryOnly) for the "what Open Finance changed" line.
  // ---------------------------------------------------------------------------
  const CAR_RECEIPTS_EXPECTED = { MONTHLY: 12, QUARTERLY: 4, SEMI_ANNUAL: 2, ANNUAL: 1 };
  const CAR_FREQ_WORD = { MONTHLY: 'monthly', QUARTERLY: 'quarterly', SEMI_ANNUAL: 'half-yearly', ANNUAL: 'annual' };
  const CAR_INCOME_WORD = { RENTAL: ['Rental income', 'rent'] };
  const incomeWord = (type) => CAR_INCOME_WORD[type] || ['Regular income', 'regular income'];
  function carVehicle(v) {
    if (!v || typeof v !== 'object' || !Number.isFinite(v.priceAed) || v.priceAed <= 0 ||
        typeof v.condition !== 'string' || !v.condition || !Number.isInteger(v.modelYear)) {
      throw err('a car loan needs the vehicle quote (price, condition, model year)');
    }
    const condition = v.condition.toUpperCase();
    if (condition !== 'NEW' && condition !== 'USED') throw err('vehicle condition must be NEW or USED (got "' + v.condition + '")');
    return { category: v.category || null, condition, modelYear: v.modelYear, priceAed: v.priceAed,
             dealer: v.dealer || null, quoteRef: v.quoteRef || null, validUntil: v.validUntil || null };
  }
  // Persona (employment / aecb / bankData / connected / vehicleQuote) or a sampleBook.car_loan row.
  // The connected block is carried as-is; evaluateCar reads it only on the Open Finance path.
  function normalizeCar(a) {
    const p = normalizeLoan(a);
    const cn = a.connected || null;
    const accounts = cn && Array.isArray(cn.accounts) ? cn.accounts : [];
    p.salaryCertificate = a.bankData ? a.bankData.salaryCertificate === true : (a.salaryCertificate !== undefined ? !!a.salaryCertificate : true);
    p.openFinanceOnRow = a.openFinance === true;      // simulation rows record the consent on the row
    p.vehicleQuote = a.vehicleQuote || a.vehicle || null;
    p.car = cn ? {
      source: cn.source || 'ALTAREQ_TPP', banks: (cn.banks || []).slice(), months: cn.monthsAvailable || 0,
      income: Number.isFinite(cn.avgMonthlyIncome) ? cn.avgMonthlyIncome : null,
      spend: Number.isFinite(cn.avgMonthlySpend) ? cn.avgMonthlySpend : null,
      observedObligations: Number.isFinite(cn.observedObligationsMonthly) ? cn.observedObligationsMonthly : null,
      observedObligationsLabel: cn.observedObligationsLabel || null,
      salarySeen: cn.salaryDetected !== undefined ? cn.salaryDetected === true
                : (accounts.length ? accounts.some(x => x.salaryAccount === true) : !!cn.salaryCredits),
      salaryCredits: cn.salaryCredits ? clone(cn.salaryCredits) : null,
      regularIncome: clone(cn.regularIncome || []),
      accounts: accounts.length,
      balances: accounts.length ? accounts.reduce((s, x) => s + (Number.isFinite(x.balance) ? x.balance : 0), 0) : null
    } : null;
    return p;
  }
  function evaluateCar(p, amount, tenorMonths, pol, consents, vehicleIn) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    const v = carVehicle(vehicleIn || p.vehicleQuote);
    const cn = p.car;
    // Open Finance path: the customer's consent (simulation rows carry it on the row) and
    // a connected block to read. Without it the documents path decides.
    const ofGranted = consents ? consents.openFinance === true : p.openFinanceOnRow;
    const ofPath = ofGranted && !!cn && cn.source === 'ALTAREQ_TPP' && cn.months > 0;
    const connectedSalary = ofPath && p.salaryDetected && cn.salarySeen;
    const documentsSalary = p.salaryDetected && p.salaryCertificate;
    const salaryVerified = connectedSalary || documentsSalary;

    // ---- Income counted: salary always; regular income only when verified via Open Finance ----
    const pct = prm.regularIncomeCountedPct;
    const streams = ofPath ? cn.regularIncome.map(r => {
      const expected = CAR_RECEIPTS_EXPECTED[r.frequency] || 12;
      const receipts = Number.isFinite(r.receipts12m) ? r.receipts12m : 0;
      const freq = CAR_FREQ_WORD[r.frequency] || 'regular';
      const why = cn.months < prm.regularIncomeMinMonths
        ? 'only ' + cn.months + ' months of connected history (needs ' + prm.regularIncomeMinMonths + ')'
        : (receipts < expected ? receipts + ' of ' + expected + ' ' + freq + ' receipts in 12 months'
          : (r.onSchedule !== true ? 'receipts not on schedule' : (r.matchesTenancy !== true ? 'receipts do not match the tenancy' : null)));
      const monthly = Number.isFinite(r.monthlyEquivalent) ? r.monthlyEquivalent : 0;
      const verified = why === null;
      return { type: r.type || 'OTHER', label: r.label || null, frequency: r.frequency || null, freq, receipts, expected,
               amountPerReceipt: Number.isFinite(r.amountPerReceipt) ? r.amountPerReceipt : null, account: r.account || null,
               monthlyEquivalent: monthly, verified, notCountedBecause: why,
               countedMonthly: verified ? Math.round(monthly * pct / 100) : 0 };
    }) : [];
    const regularVerified = streams.filter(s => s.verified).reduce((x, s) => x + s.monthlyEquivalent, 0);
    const regularCounted = streams.reduce((x, s) => x + s.countedMonthly, 0);
    const incomeCounted = p.salaryMonthly + regularCounted;

    // ---- Obligations: AECB; with Open Finance the larger of AECB and what leaves the accounts ----
    const seenObl = ofPath && cn.observedObligations !== null ? cn.observedObligations : null;
    const obligations = seenObl !== null ? Math.max(p.obligationsMonthly, seenObl) : p.obligationsMonthly;
    const reconciled = seenObl === null ? null : seenObl <= p.obligationsMonthly;

    // ---- Tenor ≤ 60 months (Reg 29/2011); over-cap requests are clamped ----
    const tenorCap = Math.min(reg.tenorCapMonths, HARD_CAR.tenorCapMonths);
    const effTenor = Math.min(tenorMonths, tenorCap);
    const clamped = tenorMonths > tenorCap;

    // ---- Scorecard v0 (the personal-loan card): +15 when the salary is seen in connected accounts ----
    const score = loanScore(p, false, connectedSalary);
    const overlayNet = score.overlays.reduce((s, o) => s + o.delta, 0);

    // ---- Limit ----
    const dbrCap = dbrCapFor(reg, p.retiree);
    const band = gradeToBand(score.grade) || 'C';      // a thin file is priced provisionally at C
    const bandRange = prm.pricingBands[band];
    const midRate = (bandRange[0] + bandRange[1]) / 2;
    const i = midRate / 12;
    const over = ' · over ' + effTenor + ' months at ' + pctStr(round4(midRate));
    const headroom = Math.round((dbrCap / 100) * incomeCounted - obligations);
    const maxByDbr = headroom > 0 ? floor1000(pvAnnuity(headroom, i, effTenor)) : 0;
    const ltvCapPct = Math.min(reg.ltvCapPct, HARD_CAR.ltvCapPct);
    const maxByLtv = floor1000((ltvCapPct / 100) * v.priceAed);
    const fcfSeen = ofPath && cn.income !== null && cn.spend !== null;
    const fcf = fcfSeen ? Math.round(cn.income - cn.spend - obligations) : null;
    const fcfBudget = fcfSeen ? Math.max(0, Math.floor((prm.instalmentToFcfMaxPct / 100) * fcf)) : null;
    const maxByFcf = fcfSeen ? (fcfBudget > 0 ? floor1000(pvAnnuity(fcfBudget, i, effTenor)) : 0) : null;
    const incomeTxt = regularCounted > 0
      ? '(salary ' + grp(p.salaryMonthly) + streams.filter(s => s.countedMonthly > 0)
          .map(s => ' + ' + pct + '% of ' + incomeWord(s.type)[1] + ' ' + grp(s.monthlyEquivalent)).join('') + ')'
      : '(salary only)';
    const candidates = [
      { label: 'Requested amount', value: floor1000(amount), key: 'REQUESTED' },
      { label: 'Loan-to-value — ' + ltvCapPct + '% of the vehicle value ' + aed(v.priceAed) + ' (Reg 29/2011)', value: maxByLtv, key: 'LTV_CAP' },
      { label: 'DBR headroom — ' + dbrCap + '% of ' + aed(incomeCounted) + ' ' + incomeTxt + ' − obligations ' + grp(obligations) +
               (headroom > 0 ? ' = ' + aed(headroom) + '/month' + over : ' — no headroom left') + (p.retiree ? ' (retiree cap)' : ''),
        value: maxByDbr, key: 'DBR' }
    ];
    if (fcfSeen) {
      candidates.push({ label: 'Free cash flow — ' + prm.instalmentToFcfMaxPct + '% of ' + aed(fcf) + ' (income ' + grp(cn.income) + ' − spending ' +
                               grp(cn.spend) + ' − obligations ' + grp(obligations) + ')' + (fcfBudget > 0 ? ' = ' + aed(fcfBudget) + '/month' + over : ' — nothing left'),
                        value: maxByFcf, key: 'FCF' });
    }
    candidates.push({ label: 'Product cap', value: prm.productCap, key: 'PRODUCT_CAP' });
    let { approved, binding } = pickMin(candidates);
    if (binding === 'REQUESTED' && approved === maxByLtv) binding = 'LTV_CAP';
    const approvedPre = approved;
    const instalment = approvedPre > 0 ? round2(annuityPayment(approvedPre, i, effTenor)) : 0;
    const dbrPct = incomeCounted > 0 ? round2(((obligations + instalment) / incomeCounted) * 100) : 999;
    const dbrPctSalaryOnly = p.salaryMonthly > 0 ? round2(((obligations + instalment) / p.salaryMonthly) * 100) : 999;
    const ltvPct = round2((approvedPre / v.priceAed) * 100);
    const instalmentToFcfPct = fcfSeen && fcf > 0 ? Math.round((instalment / fcf) * 1000) / 10 : null;

    // ---- Rules, in the addendum's order ----
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');
    rs.add('REG_TENOR_CAP', 'Tenor within the car-loan cap (Reg 29/2011)', 'REGULATORY',
           'PASS', clamped ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths, tenorCap, null);
    if (clamped) rs.reason('RC_TENOR_CAP');
    rs.add('REG_LTV_CAP', 'Car loan within ' + ltvCapPct + '% of the vehicle value (Reg 29/2011)', 'REGULATORY', 'PASS',
           ltvPct + '% (' + aed(approvedPre) + ' of ' + aed(v.priceAed) + ')' + (amount > maxByLtv ? ' — request ' + aed(amount) + ' clamped to ' + aed(maxByLtv) : ''),
           ltvCapPct + '%', null);
    if (amount > maxByLtv) rs.reason('RC_LTV_CAP');
    // Double enforcement: (obligations + instalment) ÷ income counted, never above the cap.
    const dbrOk = headroom > 0 && dbrPct <= dbrCap;
    rs.add('REG_DBR_CAP', 'Debt burden ratio incl. the car loan within ' + dbrCap + '% of salary and verified regular income (Reg 29/2011' +
           (p.retiree ? ', retiree' : '') + ')', 'REGULATORY', dbrOk ? 'PASS' : 'FAIL',
           dbrPct === 999 ? 'no income' : dbrPct.toFixed(2) + '% — (obligations ' + grp(obligations) + ' + instalment ' + money(instalment).slice(4) +
             ') ÷ income counted ' + grp(incomeCounted),
           dbrCap + '%', 'RC_DBR_EXCEEDED');
    const ageOk = p.age >= prm.minAge && p.age <= prm.maxAge;
    rs.add('POL_AGE', 'Applicant age within eligible range', 'POLICY',
           ageOk ? 'PASS' : 'FAIL', p.age, prm.minAge + '–' + prm.maxAge, 'RC_AGE');
    rs.add('POL_MIN_SALARY', 'Salary at or above product minimum', 'POLICY',
           p.salaryMonthly >= prm.minSalary ? 'PASS' : 'FAIL', p.salaryMonthly, prm.minSalary, 'RC_SALARY_FLOOR');
    rs.add('POL_MIN_MONTHS_UAE', 'Minimum UAE residency period', 'POLICY',
           p.monthsInUae >= prm.minMonthsInUae ? 'PASS' : 'REFER', p.monthsInUae, prm.minMonthsInUae, 'RC_MANUAL_REVIEW');
    rs.add('POL_INCOME_VERIFIED', 'Salary verified (salary certificate, or connected accounts with Open Finance)', 'POLICY',
           salaryVerified ? 'PASS' : 'REFER',
           connectedSalary ? 'verified — connected account' : (documentsSalary ? 'verified — salary certificate' : 'not verified'),
           'verified', 'RC_INCOME_UNVERIFIED');
    rs.add('POL_THIN_FILE', 'Credit file depth (thin-file strategy)', 'POLICY',
           p.aecbHit ? 'PASS' : 'REFER', p.aecbHit ? 'file present' : 'no-hit / thin file', 'AECB hit', 'RC_THIN_FILE');
    const delinq = p.worstDelinquency || 'NONE';
    rs.add('POL_DELINQUENCY', 'Delinquency history acceptable', 'POLICY',
           (delinq === 'DPD90' || delinq === 'WRITEOFF') ? 'FAIL' : (delinq === 'DPD30' ? 'REFER' : 'PASS'),
           delinq, '≤ DPD30 refers, ≥ DPD90 declines', 'RC_DELINQUENCY');
    rs.add('POL_CHEQUE_RETURNS', 'Returned cheques within tolerance', 'POLICY',
           p.chequeReturns12m <= prm.chequeReturnsMax ? 'PASS' : 'FAIL',
           p.chequeReturns12m, prm.chequeReturnsMax, 'RC_CHEQUE_RETURNS');
    if (score.points !== null) {
      const cutoffOk = score.points >= prm.scoreDecline && score.grade !== 'E';
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off (grade E auto-fails)', 'POLICY',
             cutoffOk ? 'PASS' : 'FAIL', score.points + ' (' + (score.grade || '—') + ')', prm.scoreDecline, 'RC_SCORE_LOW');
      const referOk = score.points >= prm.scoreRefer || overlayNet > 0;
      rs.add('POL_SCORE_REFER', 'Score above refer line (or strong positive overlays)', 'POLICY',
             cutoffOk ? (referOk ? 'PASS' : 'REFER') : 'PASS', score.points, prm.scoreRefer, 'RC_MANUAL_REVIEW');
    } else {
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off', 'POLICY', 'PASS', 'no score (thin file)', prm.scoreDecline, null);
    }
    const vehicleAge = Math.max(0, Number(D.TODAY.slice(0, 4)) - v.modelYear);
    const vehicleAgeOk = v.condition === 'NEW' || vehicleAge <= prm.maxVehicleAgeYears;
    const quoteOk = !v.validUntil || String(v.validUntil).slice(0, 10) >= D.TODAY;
    rs.add('POL_VEHICLE', 'Vehicle eligible — new, or used up to ' + prm.maxVehicleAgeYears + ' years old; dealer quote not expired', 'POLICY',
           vehicleAgeOk && quoteOk ? 'PASS' : 'FAIL',
           [v.category, v.condition === 'NEW' ? 'new' : 'used', 'model year ' + v.modelYear +
             (v.condition === 'USED' ? ' (' + vehicleAge + ' year' + (vehicleAge === 1 ? '' : 's') + ' old)' : '')].filter(Boolean).join(' · ') +
             ' · quote ' + (v.validUntil ? (quoteOk ? 'valid until ' : 'expired ') + String(v.validUntil).slice(0, 10) : 'with no expiry date'),
           'new, or used ≤ ' + prm.maxVehicleAgeYears + ' years; quote valid', 'RC_VEHICLE_INELIGIBLE');
    rs.add('POL_MIN_AMOUNT', 'Loan at or above the product minimum', 'POLICY',
           approvedPre >= prm.minAmount ? 'PASS' : 'FAIL',
           aed(approvedPre) + (amount < prm.minAmount ? ' (requested ' + aed(amount) + ')' : ''), aed(prm.minAmount), 'RC_BELOW_MIN_AMOUNT');
    // Informational: never changes the outcome — it says what the income counted is made of.
    let riResult = 'INFO', riObserved;
    if (!ofPath) riObserved = 'Declared other income not counted — not verifiable in an instant decision';
    else if (!streams.length) riObserved = 'No other regular income seen in connected accounts';
    else {
      if (regularCounted > 0) riResult = 'PASS';
      riObserved = streams.map(s => incomeWord(s.type)[0] + (s.verified
        ? ' verified — ' + s.receipts + ' of ' + s.expected + ' ' + s.freq + ' receipts in 12 months' +
          (s.type === 'RENTAL' ? ', matches the tenancy' : ', on schedule') + ' — counted at ' + pct + '%'
        : ' not counted — ' + s.notCountedBecause)).join('; ');
    }
    rs.add('POL_REGULAR_INCOME', 'Other regular income counts toward DBR only when verified through Open Finance (informational)', 'POLICY',
           riResult, riObserved, prm.regularIncomeMinMonths + ' months connected · every receipt on schedule · matches the tenancy · counted at ' + pct + '%', null);
    if (fcfSeen) {
      rs.add('POL_INSTALMENT_TO_FCF', 'Instalment within ' + prm.instalmentToFcfMaxPct + '% of free cash flow (spending seen in connected accounts)', 'POLICY',
             fcf > 0 ? 'PASS' : 'FAIL',
             fcf > 0 ? money(instalment) + '/month = ' + instalmentToFcfPct + '% of free cash flow ' + aed(fcf) + '/month'
                     : 'free cash flow ' + aed(fcf) + '/month — nothing left for an instalment',
             '≤ ' + prm.instalmentToFcfMaxPct + '%', 'RC_FREE_CASH_FLOW');
    }

    redFlagRule(rs, p);   // v2.9 — POL_RED_FLAGS (REFER only); recorded only when the gate applies
    const outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;
    if (outcome === 'APPROVE') {
      if (binding === 'DBR' && p.retiree) rs.reason('RC_RETIREE_CAP');
      // Clamped to the LTV maximum: RC_LTV_CAP says why; any other reduction is affordability.
      if (approved < floor1000(amount) && binding !== 'LTV_CAP') rs.reason('RC_LIMIT_REDUCED');
    }
    const downPayment = approved > 0 ? v.priceAed - approved : null;
    const ownFundsCover = ofPath && cn.balances !== null && downPayment !== null ? cn.balances >= downPayment : null;
    const firstStream = streams[0] || null;
    const features = {
      verifiedIncome: salaryVerified ? incomeCounted : null,
      incomeCounted,
      salaryMonthly: p.salaryMonthly,
      incomeSource: connectedSalary ? 'ALTAREQ_TPP' : (documentsSalary ? 'DOCUMENTS' : 'UNVERIFIED'),
      salaryVerifiedViaConnectedAccount: connectedSalary,
      openFinance: ofPath,
      connectedMonths: ofPath ? cn.months : null,
      regularIncomeCategory: firstStream ? firstStream.type : null,
      regularIncomeVerifiedMonthly: ofPath ? regularVerified : null,
      regularIncomeCountedMonthly: regularCounted,
      regularIncomeCountedPct: pct,
      existingObligations: obligations,
      aecbObligations: p.obligationsMonthly,
      observedObligations: seenObl,
      obligationsReconciled: reconciled,
      esrPct: p.esrPct,
      freeCashFlowMonthly: fcf,
      instalmentToFcfPct,
      dbrCapApplied: dbrCap, headroomMonthly: headroom, newInstallment: instalment, dbrPct, dbrPctSalaryOnly,
      effectiveTenor: effTenor, scoreBase: score.base, overlayNet,
      retiree: p.retiree, thinFile: !p.aecbHit,
      vehiclePrice: v.priceAed, vehicleCondition: v.condition, vehicleModelYear: v.modelYear, vehicleAgeYears: vehicleAge,
      ltvCapPct, ltvMaxAmount: maxByLtv, ltvPct: approved > 0 ? ltvPct : 0, downPayment,
      downPaymentCoveredByOwnFunds: ownFundsCover
    };
    const limit = {
      requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
      bindingConstraint: binding,
      // Keys ride on the trace so a UI can mark the binding row even when two candidates tie.
      trace: candidates.map(c => ({ label: c.label, value: c.value, key: c.key }))
    };
    let pricing = null;
    if (outcome !== 'DECLINE') {
      const principal = limit.approved;
      const inst = annuityPayment(principal, i, effTenor);
      pricing = { mode: 'BANDED_APR', band, rateMin: bandRange[0], rateMax: bandRange[1],
                  benchmark: 'EIBOR 3M + margin',
                  kfs: { principal, tenorMonths: effTenor, rateMid: round4(midRate),
                         monthlyInstalment: round2(inst),
                         totalRepayable: round2(inst * effTenor),
                         totalInterest: round2(inst * effTenor - principal),
                         earlySettlementFeeCap: reg.earlySettlementFeeCap || null,
                         coolingOffDays: reg.coolingOffDays || null,
                         // v2.7 KFS additions — dealer-quote data and the security
                         vehiclePrice: v.priceAed, downPayment: v.priceAed - principal,
                         ltvPct: round2((principal / v.priceAed) * 100),
                         security: reg.security || null,
                         insurance: 'Comprehensive motor insurance with the lender as loss payee' } };
    }
    // What the connected accounts showed — internal (car screen, Decision log); never in the memo.
    let findings = null;
    if (ofPath) {
      findings = [];
      for (const s of streams) {
        findings.push({ key: 'regularIncome', label: incomeWord(s.type)[0], status: s.countedMonthly > 0 ? 'PASS' : 'INFO',
          observation: s.receipts + ' of ' + s.expected + ' ' + s.freq + ' receipts' + (s.amountPerReceipt !== null ? ' of ' + aed(s.amountPerReceipt) : '') +
                       (s.account ? ' into ' + s.account : '') + (s.verified ? (s.type === 'RENTAL' ? ', on schedule, matches the tenancy' : ', on schedule') : ' — ' + s.notCountedBecause),
          effect: s.countedMonthly > 0 ? 'Counted at ' + pct + '% → ' + aed(s.countedMonthly) + '/month of income for DBR'
                : (s.verified ? 'Verified, counted at ' + pct + '%' : 'Not counted') });
      }
      const sc = cn.salaryCredits;
      findings.push({ key: 'salary', label: 'Salary', status: connectedSalary ? 'PASS' : 'INFO',
        observation: sc ? aed(sc.monthly) + ' every month' + (sc.account ? ' into ' + sc.account : '') + (sc.sameEmployer ? ' — same employer, ' + sc.months + ' months' : '')
                        : (connectedSalary ? 'Salary credits seen every month' : 'No salary credit seen'),
        effect: connectedSalary ? 'Salary verified in connected accounts → NoorScore +15' : 'Salary taken from the certificate' });
      if (seenObl !== null) {
        findings.push({ key: 'obligations', label: 'Obligations', status: reconciled ? 'PASS' : 'WARN',
          observation: aed(seenObl) + '/month seen leaving the accounts' + (cn.observedObligationsLabel ? ' (' + cn.observedObligationsLabel.toLowerCase() + ')' : '') +
                       (seenObl === p.obligationsMonthly ? ' = the AECB figure' : (reconciled ? ' — within the AECB figure' : ' — AECB shows ' + aed(p.obligationsMonthly))),
          effect: reconciled ? 'Reconciled with AECB — nothing hidden' : 'The higher figure counts in DBR' });
      }
      if (ownFundsCover !== null) {
        findings.push({ key: 'ownFunds', label: 'Source of funds', status: ownFundsCover ? 'PASS' : 'WARN',
          observation: 'Balances across ' + cn.accounts + ' account' + (cn.accounts === 1 ? '' : 's') + (ownFundsCover ? ' cover' : ' do not cover') + ' the ' + aed(downPayment) + ' down payment',
          effect: ownFundsCover ? 'Down payment from own funds — verified' : 'Down-payment source to be evidenced before release' });
      }
      if (fcfSeen) {
        findings.push({ key: 'spending', label: 'Spending', status: fcf > 0 ? 'PASS' : 'WARN',
          observation: '≈ ' + aed(cn.spend) + '/month',
          effect: fcf > 0 ? 'Instalment ' + money(instalment) + ' = ' + instalmentToFcfPct + '% of free cash flow ' + aed(fcf) + '/month (≤ ' + prm.instalmentToFcfMaxPct + '%)'
                          : 'No free cash flow left for an instalment' });
      }
    }
    return { profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor, car: { vehicle: v, streams, findings } };
  }
  // One path of the comparison, as the record and the UI show it.
  function carRow(e) {
    const f = e.features, ok = e.outcome !== 'DECLINE' && e.limit.approved > 0;
    return { outcome: e.outcome, approved: e.outcome === 'DECLINE' ? 0 : e.limit.approved, bindingConstraint: e.limit.bindingConstraint,
             monthlyInstalment: ok && e.pricing ? e.pricing.kfs.monthlyInstalment : null,
             downPayment: ok ? f.downPayment : null, dbrPct: f.dbrPct, incomeCounted: f.incomeCounted,
             ltvPct: ok ? f.ltvPct : null, apr: e.pricing ? e.pricing.kfs.rateMid : null,
             noorScore: Number.isFinite(e.score.points) ? e.score.points : null, grade: e.score.grade, reasonCodes: e.reasonCodes.slice() };
  }
  // What Open Finance was worth: the same application re-evaluated with openFinance:false.
  // Pure (the evidenceComparison pattern) — nothing stored, no clock tick.
  function carUplift(applicant, amount, tenorMonths, pol, consents, vehicle, ev) {
    const docs = evaluate('car_loan', applicant, amount, tenorMonths, pol, Object.assign({}, consents, { openFinance: false }), null, { vehicle });
    const d = carRow(docs), o = carRow(ev);
    const f = ev.features;
    const counted = (ev.car.streams || []).filter(s => s.countedMonthly > 0);
    const drivers = [];
    for (const s of counted) drivers.push(incomeWord(s.type)[0] + ' verified — counted at ' + f.regularIncomeCountedPct + '% (' + aed(s.countedMonthly) + '/month)');
    if (f.salaryVerifiedViaConnectedAccount) drivers.push('Salary verified in connected accounts');
    if (f.obligationsReconciled === true) drivers.push('Obligations reconciled with AECB (no hidden debt)');
    else if (f.obligationsReconciled === false) drivers.push('Obligations seen in connected accounts above the AECB figure — the higher one counts');
    if (f.downPaymentCoveredByOwnFunds === true) drivers.push('Down payment covered by own funds in connected accounts');
    const upliftAed = o.approved - d.approved;
    const cap = f.dbrCapApplied;
    const what = counted.length && counted.every(s => s.type === 'RENTAL') ? 'Verified rent' : 'Verified regular income';
    let explanation;
    if (upliftAed > 0 && counted.length && f.dbrPctSalaryOnly > cap) {
      explanation = 'At ' + aed(o.approved) + ' the DBR on salary alone would be ' + f.dbrPctSalaryOnly.toFixed(2) + '% — over the ' + cap + '% cap. ' + what + ' adds ' +
                    aed(f.regularIncomeCountedMonthly) + '/month of counted income and brings it to ' + f.dbrPct.toFixed(2) + '%.';
    } else if (upliftAed > 0) {
      explanation = 'Open Finance verified the salary in connected accounts: Mizan finances ' + aed(upliftAed) + ' more at a DBR of ' + f.dbrPct.toFixed(2) + '%.';
    } else if (upliftAed === 0) {
      explanation = 'Open Finance confirmed the same amount, ' + aed(o.approved) + ' — DBR ' + f.dbrPct.toFixed(2) + '%.';
    } else {
      explanation = 'The connected accounts showed more going out than the bureau file — the higher figure counts, so the amount is ' + aed(-upliftAed) + ' lower.';
    }
    return { tenorMonths: f.effectiveTenor, documentsOnly: d, openFinance: o,
             upliftAed,
             downPaymentSavedAed: d.downPayment !== null && o.downPayment !== null ? d.downPayment - o.downPayment : null,
             dbrCapPct: cap, salaryOnlyDbrPct: f.dbrPctSalaryOnly, regularIncomeCountedMonthly: f.regularIncomeCountedMonthly,
             ltvCapPct: f.ltvCapPct, ltvMaxAmount: f.ltvMaxAmount, vehiclePrice: f.vehiclePrice,
             explanation, drivers };
  }

  function evaluate(productId, rawApplicant, amount, tenorMonths, pol, consents, statements, opts) {
    if (productId === 'starter_loan') return evaluateUpgrade(normalizeUpgrade(rawApplicant), amount, tenorMonths, pol, consents, statements);
    // v2.9 — split, personal loan and car loan carry the red-flag gate (see gateRedFlags):
    // a no-op for every applicant without redFlagData, so existing outcomes are unchanged.
    const ew = opts && opts.earlyWarningParams;
    if (productId === 'split') return attachRedFlags(evaluateSplit(gateRedFlags(normalizeSplit(rawApplicant), rawApplicant, consents, productId, ew), amount, tenorMonths, pol));
    if (productId === 'personal_loan') return attachRedFlags(evaluateLoan(gateRedFlags(normalizeLoan(rawApplicant), rawApplicant, consents, productId, ew), amount, tenorMonths, pol, consents, statements));
    if (productId === 'salary_advance') return evaluateAdvance(normalizeLoan(rawApplicant), amount, tenorMonths, pol);
    if (productId === 'car_loan') return attachRedFlags(evaluateCar(gateRedFlags(normalizeCar(rawApplicant), rawApplicant, consents, productId, ew), amount, tenorMonths, pol, consents, opts && opts.vehicle));
    throw err('unknown productId "' + productId + '"');
  }

  // ---------------------------------------------------------------------------
  // Simulated data pulls for the decision record / orchestration timeline.
  // Sources: AECB_CONSUMER | CREDIT_PASSPORT | OPEN_FINANCE | DOCUMENTS
  // ---------------------------------------------------------------------------
  // The HOME_STATEMENTS pull (v2.4) — what the parser found, as written to the record.
  function statementsPull(st, seq, i) {
    return { source: 'HOME_STATEMENTS',
             status: st.usable ? 'PARSED' : (st.integrity !== 'PASS' || !st.nameMatch ? 'INTEGRITY_FAIL' : 'INCOMPLETE'),
             latencyMs: pullLatency(seq, i), cached: false,
             summary: { country: st.countryName, bank: st.bank, file: st.file, period: st.period ? st.period.label : '—',
                        months: st.integrity === 'PASS' ? st.monthsPresent + ' of 6' : 'not read', integrity: st.integrity,
                        nameMatch: st.integrity === 'PASS' ? (st.nameMatch ? 'yes' : 'no') : 'not verified',
                        accountOpenSince: st.accountOpenSince ? monLabel(st.accountOpenSince) : '—',
                        returnedItems: st.returnedItems, emisAed: st.obligationsMonthlyAed, avgBalanceAed: st.avgBalanceAed,
                        remittances: st.remittanceConsistencyPct === null ? '—' : st.remittanceMonths + ' of ' + st.uaeSalaryMonths + ' · ' + st.remittanceConsistencyPct + '%',
                        fx: st.currency + '→AED ' + st.fxToAed } };
  }
  function buildDataPulls(productId, ev, consents, seq, statements) {
    const pulls = [];
    let i = 0;
    const p = ev.profile;
    // Upgrade re-decision: the prior decision first (the starter loan and how it
    // was repaid), then the AECB file it created, the connected UAE accounts and,
    // when the customer shared them, the parsed home-country statements (v2.4).
    if (productId === 'starter_loan') {
      const pr = p.prior;
      pulls.push({ source: 'PRIOR_DECISION', status: pr.dpd === 0 && pr.repaidAt ? 'REPAID_ON_TIME' : 'REPAID_LATE',
                   latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { ref: pr.ref, product: 'Starter loan', amount: pr.amount, tenorMonths: pr.tenorMonths,
                              apr: pctStr(pr.apr), repaidAt: pr.repaidAt, dpd: pr.dpd, partnerIncome: money(pr.partnerIncome) } });
      pulls.push({ source: 'AECB_CONSUMER', status: p.aecbHit ? 'HIT' : 'NO_HIT', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { score: p.score === null || p.score === undefined ? 'no score yet' : p.score,
                              tradelines: p.tradelines, worstDelinquency: p.worstDelinquency,
                              obligationsMonthly: p.obligationsMonthly } });
      pulls.push({ source: 'OPEN_FINANCE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { provider: 'Al Tareq (UAE Open Finance)', banks: p.banks.slice(), monthsAvailable: p.connectedMonths,
                              avgMonthlyIncome: p.income, avgMonthlySpend: p.spend, incomeVolatilityPct: p.incomeVolatilityPct } });
      if (statements) pulls.push(statementsPull(statements, seq, i++));
      return pulls;
    }
    pulls.push({ source: 'AECB_CONSUMER', status: p.aecbHit ? 'HIT' : 'NO_HIT',
                 latencyMs: pullLatency(seq, i++), cached: false,
                 summary: productId === 'split'
                   ? { score: p.score, obligationsMonthly: p.obligationsMonthly,
                       chequeReturns12m: p.chequeReturns12m, worstDelinquency: p.worstDelinquency }
                   : { score: p.score, esrPct: p.esrPct, tradelines: p.tradelines,
                       obligationsMonthly: p.obligationsMonthly, worstDelinquency: p.worstDelinquency } });
    // Car loan (v2.7): connected accounts when Open Finance is consented, else the salary certificate.
    if (productId === 'car_loan') {
      const f = ev.features, c = p.car;
      if (f.openFinance) {
        const streams = (ev.car && ev.car.streams) || [];
        pulls.push({ source: 'OPEN_FINANCE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { provider: 'Al Tareq (UAE Open Finance)', banks: c.banks.slice(), monthsAvailable: c.months,
                                salaryDetected: f.salaryVerifiedViaConnectedAccount, avgSalaryCredit: p.salaryMonthly,
                                regularIncome: streams.length ? streams.map(s => incomeWord(s.type)[0] + ' · ' + s.freq + ' · ' + s.receipts + ' of ' + s.expected +
                                  ' receipts · ' + (s.verified ? 'verified' : 'not counted')).join('; ') : 'none seen',
                                observedObligationsMonthly: c.observedObligations, avgMonthlySpend: c.spend } });
      } else {
        pulls.push({ source: 'DOCUMENTS', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { note: 'salary certificate — declared other income is not counted in an instant decision',
                                salaryDetected: f.incomeSource === 'DOCUMENTS', avgSalaryCredit: p.salaryMonthly } });
      }
      return pulls;
    }
    if (productId === 'split') {
      const pu = p.purchase;
      pulls.push({ source: 'OPEN_FINANCE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { provider: 'Al Tareq (UAE Open Finance)', banks: p.banks.slice(),
                              monthsAvailable: p.connectedMonths, avgMonthlyIncome: p.avgMonthlyIncome,
                              avgMonthlySpend: p.avgMonthlySpend, incomeVolatilityPct: p.incomeVolatilityPct,
                              purchaseMatched: pu.seen ? (pu.merchant + ' · ' + aed(pu.amount) + ' · ' + pu.date)
                                                       : 'not found in connected transactions' } });
      return pulls;
    }
    // Cross-border Credit Passport pull — only on local no-hit, with explicit consent.
    if (productId === 'personal_loan' && !p.aecbHit && p.creditPassportAvailable &&
        consents.creditPassport === true && p.homeBureau) {
      pulls.push({ source: 'CREDIT_PASSPORT', status: 'HIT', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { country: p.homeBureau.country, bureau: p.homeBureau.bureau,
                              homeScore: p.homeBureau.score + ' (' + p.homeBureau.scoreRange + ')',
                              historyYears: p.homeBureau.historyYears,
                              obligationsMonthlyAed: p.homeBureau.obligationsMonthlyAed } });
    }
    if (p.bankSource === 'ALTAREQ_TPP' && consents.openFinance === true) {
      pulls.push({ source: 'OPEN_FINANCE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { provider: 'Al Tareq (UAE Open Finance)', banks: (p.banks || []).slice(),
                              salaryDetected: p.salaryDetected, avgSalaryCredit: p.salaryMonthly } });
    } else {
      pulls.push({ source: 'DOCUMENTS', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { note: 'salary certificate / statement upload fallback',
                              salaryDetected: p.salaryDetected, avgSalaryCredit: p.salaryMonthly } });
    }
    if (statements) pulls.push(statementsPull(statements, seq, i++));
    return pulls;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function init(data) {
    if (!data || data.TODAY !== '2026-07-19' || !Array.isArray(data.personasSplit) ||
        !Array.isArray(data.personasLoan) || !data.reasonCodes || !data.sampleBook ||
        !Array.isArray(data.sampleBook.split) || !Array.isArray(data.sampleBook.personal_loan) ||
        !Array.isArray(data.sampleBook.starter_loan) || !data.history) {
      throw err('init() requires the MizanData object (load data.js first)');
    }
    D = data;
    S = {
      policies: defaultPolicies(),
      policyHistory: { split: [], personal_loan: [], starter_loan: [], salary_advance: [], car_loan: [] },
      decisions: [],           // newest first via listDecisions()
      byId: Object.create(null),
      seq: 0, clockTicks: 0,
      splitDraws: Object.create(null),   // decisionId -> [{amount, months, monthlyPayment, at}]
      seeded: null
    };
    // v2.9 — the shared early-warning block sits beside the product packs (same 4-eyes publish + history).
    S.policies[EW_BLOCK_ID] = defaultEarlyWarningBlock();
    S.policyHistory[EW_BLOCK_ID] = [];
    for (const pid of Object.keys(S.policies)) {
      const pol = S.policies[pid];
      pol.publishedAt = D.TODAY + 'T08:00:00.000Z';
      S.policyHistory[pid].push({ version: 1, publishedAt: pol.publishedAt,
                                  publishedBy: pol.publishedBy, approvedBy: pol.approvedBy, changes: [] });
    }
    seedHistory();
    return true;
  }

  // Seeded 90-day metrics history — deterministic from MizanData.history.seed.
  // ~2,600 split decisions (≈70/12/18, STP ≈86%) and ~1,100 personal-loan
  // decisions (≈60/18/22, STP ≈78%). Weekly seasonality (UAE weekend Sat/Sun):
  // split runs slightly HIGHER at weekends (people review purchases in the app),
  // personal-loan applications dip.
  function seedHistory() {
    const rnd = mulberry32(D.history.seed);
    const days = D.history.days;
    const MIX = {
      split:         { base: 27.9, weekend: 1.12, friday: 1.0, A: 0.70, R: 0.12, stp: 0.86 },
      personal_loan: { base: 14.5, weekend: 0.55, friday: 0.8, A: 0.60, R: 0.18, stp: 0.78 }
    };
    const blank = () => ({ decisions: 0, APPROVE: 0, REFER: 0, DECLINE: 0, stp: 0 });
    // car_loan (v2.7) is a new pack: no seeded history — it counts this session's decisions only.
    const tot = { split: blank(), personal_loan: blank(), starter_loan: blank(), salary_advance: blank(), car_loan: blank() };
    const daily = [];
    for (let d = 0; d < days; d++) {
      const date = addDaysIso(D.TODAY, -(days - 1 - d));
      const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 Sun .. 6 Sat
      const row = { date, APPROVE: 0, REFER: 0, DECLINE: 0 };
      for (const pid of ['split', 'personal_loan']) {
        const m = MIX[pid];
        const factor = (dow === 6 || dow === 0) ? m.weekend : (dow === 5 ? m.friday : 1.0);
        const n = Math.max(2, Math.round(m.base * factor * (0.85 + 0.3 * rnd())));
        const a = Math.round(n * (m.A + (rnd() - 0.5) * 0.06));
        const r = Math.round(n * (m.R + (rnd() - 0.5) * 0.04));
        const x = Math.max(0, n - a - r);
        const t = tot[pid];
        t.decisions += n; t.APPROVE += a; t.REFER += r; t.DECLINE += x; t.stp += Math.round(n * m.stp);
        row.APPROVE += a; row.REFER += r; row.DECLINE += x;
      }
      daily.push(row);
    }
    // Starter-loan upgrade re-decisions (Addendum v2.1): a modest seeded history,
    // ~4 a day, ≈74/3/23 (declines are mostly late starter repayments), STP ≈96%.
    // Drawn from a SEPARATE seeded stream so the split / personal-loan history
    // above stays exactly as it was before the addendum.
    const rndU = mulberry32(D.history.seed ^ 0x51A27);
    for (let d = 0; d < days; d++) {
      const dow = new Date(daily[d].date + 'T00:00:00Z').getUTCDay();
      const factor = (dow === 6 || dow === 0) ? 1.1 : 1.0;
      const n = Math.max(1, Math.round(4 * factor * (0.85 + 0.3 * rndU())));
      const a = Math.round(n * (0.74 + (rndU() - 0.5) * 0.08));
      const r = rndU() < 0.12 ? 1 : 0;
      const x = Math.max(0, n - a - r);
      const t = tot.starter_loan;
      // STP accumulated unrounded: at ~4 a day, per-day rounding would read 100%.
      t.decisions += n; t.APPROVE += a; t.REFER += r; t.DECLINE += x; t.stp += n * 0.96;
      daily[d].APPROVE += a; daily[d].REFER += r; daily[d].DECLINE += x;
    }
    // Decline-reason mix (seeded weights over the seeded decline volume).
    const reasonWeights = [
      ['RC_FREE_CASH_FLOW', 0.24], ['RC_SCORE_LOW', 0.22], ['RC_DBR_EXCEEDED', 0.15],
      ['RC_DELINQUENCY', 0.12], ['RC_CHEQUE_RETURNS', 0.08], ['RC_SALARY_FLOOR', 0.08],
      ['RC_PURCHASE_UNVERIFIED', 0.07], ['RC_AGE', 0.04]
    ];
    const declines = tot.split.DECLINE + tot.personal_loan.DECLINE;
    const declineReasons = {};
    let assigned = 0;
    for (let i = 0; i < reasonWeights.length; i++) {
      const [code, w] = reasonWeights[i];
      const n = i === reasonWeights.length - 1 ? declines - assigned : Math.round(declines * w);
      declineReasons[code] = n; assigned += n;
    }
    // Starter-loan upgrade declines: ~80% late starter repayment, the rest free cash flow.
    const starterLate = Math.round(tot.starter_loan.DECLINE * 0.8);
    declineReasons.RC_STARTER_LATE = starterLate;
    declineReasons.RC_FREE_CASH_FLOW += tot.starter_loan.DECLINE - starterLate;
    // Grade distribution over scored seeded decisions (cash-flow path scores thin files too).
    const scored = Math.round((tot.split.decisions + tot.personal_loan.decisions) * 0.94);
    const gradeDist = { A: Math.round(scored * 0.21), B: Math.round(scored * 0.33),
                        C: Math.round(scored * 0.26), D: Math.round(scored * 0.12), E: 0 };
    gradeDist.E = scored - gradeDist.A - gradeDist.B - gradeDist.C - gradeDist.D;
    const refers = tot.split.REFER + tot.personal_loan.REFER;
    const overrides = Math.round(refers * 0.083);
    // Seeded refer queue (open consumer cases visible in the workbench).
    const queueNames = [
      ['Fatima Rashed', 'personal_loan', 'RC_THIN_FILE'], ['Kwame Asante', 'split', 'RC_INCOME_VOLATILITY'],
      ['Jomo Adeyemi', 'personal_loan', 'RC_INCOME_UNVERIFIED'], ['Reem Al Hashimi', 'split', 'RC_CONNECTED_HISTORY'],
      ['Anita D\'Souza', 'personal_loan', 'RC_MANUAL_REVIEW'], ['Lucas Ferreira', 'split', 'RC_THIN_FILE'],
      ['Yusuf Kanaan', 'personal_loan', 'RC_MANUAL_REVIEW'], ['Mei Lin Tan', 'split', 'RC_PURCHASE_UNVERIFIED'],
      ['Grace Mwangi', 'split', 'RC_MANUAL_REVIEW']
    ];
    const queue = queueNames.map(([name, productId, reason], i) => {
      const sla = REFER_SLA_HOURS[productId];
      const waitingHours = Math.round((rnd() * (productId === 'split' ? 5 : 10)) * 10) / 10;
      return { id: 'MZN-H-' + String(101 + i), name, segment: 'CONSUMER', productId, reason,
               waitingHours, slaHoursLeft: Math.round((sla - waitingHours) * 10) / 10, seeded: true };
    });
    // v2.4 — seeded cases already waiting on home-country statements (no PRNG draws).
    for (const c of (D.seededDocumentCases || [])) {
      const cc = corridorOf(c.country);
      queue.push({ id: c.id, name: c.name, segment: 'CONSUMER', productId: c.productId, reason: c.reason,
                   waitingHours: c.waitingHours, slaHoursLeft: c.slaHoursLeftAtPause, seeded: true,
                   status: 'AWAITING_DOCUMENTS', slaPaused: true,
                   documentRequest: { type: 'HOME_STATEMENTS', months: STATEMENT_MONTHS, country: cc, countryName: CORRIDORS[cc].name,
                                      bank: c.bank, analyst: c.requestedBy, requestedAt: c.requestedAt, note: c.note,
                                      reasonCode: 'RC_STATEMENTS_REQUESTED' } });
    }
    const referAging = { '<4h': 0, '4-24h': 0, '>24h': 0 };
    for (const q of queue) referAging[q.waitingHours < 4 ? '<4h' : (q.waitingHours <= 24 ? '4-24h' : '>24h')]++;
    // add aggregate (non-case-level) seeded aging mass
    referAging['<4h'] += 14; referAging['4-24h'] += 6; referAging['>24h'] += 1;
    // Vintages — gently rising first-payment-default curves with tiny seeded noise.
    const vintages = [];
    const sBase = [0.8, 1.1, 1.4, 1.6, 1.8, 1.9], lBase = [1.2, 1.6, 1.9, 2.1, 2.4, 2.6];
    for (let m = 1; m <= 6; m++) {
      vintages.push({ mob: m,
        splitFpdPct: Math.round((sBase[m - 1] + (rnd() - 0.5) * 0.15) * 10) / 10,
        loanFpdPct: Math.round((lBase[m - 1] + (rnd() - 0.5) * 0.2) * 10) / 10 });
    }
    S.seeded = { daily, tot, declineReasons, gradeDist, refers, overrides, queue, referAging, vintages };
  }
  // Refer SLAs: split is an in-app instant product; loans allow a working-day review.
  const REFER_SLA_HOURS = { split: 4, personal_loan: 8, starter_loan: 4, salary_advance: 4, car_loan: 8 };

  function manifests() { ensureInit(); return clone(MANIFESTS); }

  // Execution steps with UI labels for a product (descriptions vary for DISBURSED).
  // With a decision id, REPAYMENT_SET_UP carries that decision's method (v2.3):
  // "Al Tareq payment consent authorised" or "Direct debit mandate active". Once
  // the step is recorded, the method recorded on the event wins.
  function execSteps(productId, decisionId) {
    const pid = productId || 'personal_loan';
    if (!MANIFESTS.some(m => m.productId === pid)) throw err('unknown productId "' + productId + '"');
    let method = null;
    if (decisionId !== undefined && decisionId !== null) {
      ensureInit();
      const rec = getDecisionRef(decisionId);
      if (rec.productId !== pid) throw err('decision ' + decisionId + ' is a ' + rec.productId + ' decision, not ' + pid);
      const done = rec.events.find(e => e.type === 'REPAYMENT_SET_UP');
      method = done && done.method ? done.method : (rec.repayment ? rec.repayment.method : null);
    }
    return EXEC_EVENTS.map(type => {
      const info = EXEC_STEP_INFO[type];
      let label = info.label;
      let description = typeof info.description === 'string' ? info.description : info.description[pid];
      if (type === 'REPAYMENT_SET_UP' && method) {
        label = REPAYMENT_METHODS[method].stepLabel;
        description = REPAYMENT_METHODS[method].setup;
      }
      const step = { type, label, description };
      if (type === 'REPAYMENT_SET_UP') step.method = method;
      return step;
    });
  }

  function getPolicyRef(productId) {
    const pol = S.policies[productId];
    if (!pol) throw err('unknown productId "' + productId + '"');
    return pol;
  }
  function getPolicy(productId) { ensureInit(); return clone(getPolicyRef(productId)); }

  // Starter loan: nested params may be sent partially ({tiers:{enhanced:{aprAtMaxTenor:0.33}}});
  // they are merged over the live values so publish/simulate always see complete objects.
  // Other products pass through unchanged.
  function normalizeParams(productId, params) {
    if (productId !== 'starter_loan' || !params || typeof params !== 'object' || Array.isArray(params)) return params;
    const cur = getPolicyRef(productId).params;
    const out = Object.assign({}, params);
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if ('starter' in params && isObj(params.starter)) out.starter = Object.assign({}, cur.starter, params.starter);
    if ('tiers' in params && isObj(params.tiers)) {
      out.tiers = {};
      for (const k of Object.keys(params.tiers)) {
        if (!TIER_KEYS.includes(k)) throw err('unknown tier "' + k + '" — tiers are enhanced and base');
      }
      for (const k of TIER_KEYS) {
        out.tiers[k] = Object.assign({}, cur.tiers[k], isObj(params.tiers[k]) ? params.tiers[k] : {});
      }
    }
    return out;
  }
  // Bounds check for one nested object of numeric fields (starter, a tier).
  function checkNested(path, obj, bounds) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw err(path + ' must be an object');
    for (const f of Object.keys(obj)) {
      if (!(f in bounds)) throw err('unknown policy parameter "' + path + '.' + f + '"');
    }
    for (const f of Object.keys(bounds)) {
      const v = obj[f], bd = bounds[f];
      if (!Number.isFinite(v)) throw err('parameter "' + path + '.' + f + '" must be a number');
      if (MONTH_KEYS.includes(f) && !Number.isInteger(v)) throw err('parameter "' + path + '.' + f + '" must be a whole number of months');
      if (v < bd[0] || v > bd[1]) {
        throw err('parameter "' + path + '.' + f + '"=' + v + ' outside allowed bounds [' + bd[0] + ', ' + bd[1] + ']');
      }
    }
  }

  // Validates candidate params: known keys only, regulatory keys rejected, bounds
  // enforced, cross-field rules, and (starter loan) the publish-time invariants.
  // Returns the normalised params (complete nested objects for the starter loan).
  function validateParams(productId, rawParams, opts) {
    if (productId === EW_BLOCK_ID) return validateEarlyWarningParams(rawParams);   // v2.9 shared block
    const pol = getPolicyRef(productId);
    if (!rawParams || typeof rawParams !== 'object' || Array.isArray(rawParams)) throw err('params must be an object');
    const params = normalizeParams(productId, rawParams);
    const bounds = PARAM_BOUNDS[productId];
    for (const key of Object.keys(params)) {
      if (PLATFORM_KEYS.includes(key)) {
        throw err('"' + key + '" is a platform rule shared by every Noor product (' + PLATFORM_RULES.repaymentCollection.rule + ') — it cannot be edited via publishPolicy');
      }
      if (key in pol.regulatory) {
        throw err('"' + key + '" is a locked regulatory primitive (CBUAE Reg 29/2011 / Federal Law 6/2010 / Consumer Protection) — it cannot be edited via publishPolicy');
      }
      if (!(key in pol.params)) throw err('unknown policy parameter "' + key + '" for ' + productId);
      const v = params[key];
      if (key === 'pricingBands') {
        for (const b of ['A', 'B', 'C']) {
          const r = v && v[b];
          if (!Array.isArray(r) || r.length !== 2 || !(r[0] > 0) || !(r[1] > r[0]) || r[1] > 0.30) {
            throw err('pricingBands.' + b + ' must be [min,max] with 0 < min < max ≤ 0.30');
          }
        }
      } else if (key === 'splitCapacityMultiple') {
        for (const b of ['A', 'B', 'C']) {
          if (!(v && v[b] > 0 && v[b] <= 6)) throw err('splitCapacityMultiple.' + b + ' must be in (0, 6]');
        }
      } else if (key === 'monthlyFeeRate') {
        for (const b of ['A', 'B', 'C']) {
          if (!(v && v[b] > 0 && v[b] <= 0.05)) throw err('monthlyFeeRate.' + b + ' must be in (0, 0.05]');
        }
        if (!(v.A <= v.B && v.B <= v.C)) throw err('monthlyFeeRate must be risk-ordered: A ≤ B ≤ C');
      } else if (key === 'thinFileAction') {
        if (v !== 'REFER' && v !== 'DECLINE') throw err('thinFileAction must be REFER or DECLINE');
      } else if (productId === 'starter_loan' && key === 'starter') {
        checkNested('starter', v, STARTER_BOUNDS);
      } else if (productId === 'starter_loan' && key === 'tiers') {
        if (!v || typeof v !== 'object') throw err('tiers must be an object with enhanced and base');
        for (const k of TIER_KEYS) checkNested('tiers.' + k, v[k], TIER_BOUNDS);
      } else {
        const bd = bounds[key];
        if (!Number.isFinite(v)) throw err('parameter "' + key + '" must be a number');
        if (bd && (v < bd[0] || v > bd[1])) {
          throw err('parameter "' + key + '"=' + v + ' outside allowed bounds [' + bd[0] + ', ' + bd[1] + ']');
        }
      }
    }
    // Cross-field: the refer line can never sit below the decline cut-off.
    const merged = Object.assign({}, pol.params, params);
    if (merged.scoreRefer !== undefined && merged.scoreDecline !== undefined && merged.scoreRefer < merged.scoreDecline) {
      throw err('scoreRefer (' + merged.scoreRefer + ') must be at or above scoreDecline (' + merged.scoreDecline + ')');
    }
    if (productId === 'starter_loan') {
      for (const k of TIER_KEYS) {
        if (merged.tiers[k].maxAmount < merged.minAmount) {
          throw err('the ' + k + ' tier maximum (' + aed(merged.tiers[k].maxAmount) + ') is below the minimum upgrade amount (' +
                    aed(merged.minAmount) + ')');
        }
      }
      // Publish-time invariants — the first failure is thrown as a plain message.
      if (!(opts && opts.skipInvariants)) {
        const bad = starterInvariants(merged).find(c => !c.ok);
        if (bad) throw err(bad.message);
      }
    }
    return params;
  }

  // Read-only: the starter-loan invariants for a draft, as a checklist (the
  // policy console renders it live). Bounds errors come back as `error`.
  // Also returns each tier's curve with exact interest per AED 1,000, so the
  // console can show the guarantee without re-implementing the math.
  function policyInvariants(productId, draftParams) {
    ensureInit();
    const pol = getPolicyRef(productId);
    if (productId !== 'starter_loan') return { ok: true, error: null, checks: [], curves: null };
    let params;
    try { params = validateParams(productId, draftParams || {}, { skipInvariants: true }); }
    catch (e) { return { ok: false, error: e.message, checks: [], curves: null }; }
    const merged = Object.assign({}, pol.params, params);
    const checks = starterInvariants(merged);
    const curves = {};
    for (const k of TIER_KEYS) {
      curves[k] = tenorCurve(merged.tiers[k]).map(c => ({ months: c.months, apr: c.apr,
        interestPer1000: round2(1000 * interestPerUnit(c.apr, c.months)) }));
    }
    return { ok: checks.every(c => c.ok), error: null, checks, curves };
  }
  // Leaf-level diff of two param values, so nested changes read as
  // "tiers.enhanced.aprAtMaxTenor: 0.35 → 0.33" in the policy history.
  function leafChanges(prefix, before, after, out) {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (isObj(before) && isObj(after)) {
      for (const k of Object.keys(after)) leafChanges(prefix + '.' + k, before[k], after[k], out);
      return out;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) out.push({ key: prefix, from: clone(before), to: clone(after) });
    return out;
  }

  function publishPolicy(productId, params, meta) {
    ensureInit();
    const pol = getPolicyRef(productId);
    if (!meta || typeof meta.author !== 'string' || !meta.author.trim() ||
        typeof meta.approver !== 'string' || !meta.approver.trim()) {
      throw err('publishPolicy requires meta = {author, approver}');
    }
    if (meta.author.trim().toLowerCase() === meta.approver.trim().toLowerCase()) {
      throw err('4-eyes violation — policy author and approver must be different people');
    }
    params = validateParams(productId, params);
    const changes = [];
    for (const key of Object.keys(params)) {
      const before = JSON.stringify(pol.params[key]), after = JSON.stringify(params[key]);
      if (before === after) continue;
      // Starter-loan history records nested changes leaf by leaf; other packs keep the v2.0 top-level diff.
      if (productId === 'starter_loan') leafChanges(key, pol.params[key], params[key], changes);
      else changes.push({ key, from: JSON.parse(before), to: JSON.parse(after) });
    }
    for (const key of Object.keys(params)) pol.params[key] = clone(params[key]);
    pol.version += 1;
    pol.publishedAt = nowIso();
    pol.publishedBy = meta.author;
    pol.approvedBy = meta.approver;
    S.policyHistory[productId].push({ version: pol.version, publishedAt: pol.publishedAt,
                                      publishedBy: meta.author, approvedBy: meta.approver, changes });
    return { version: pol.version };
  }

  function policyHistory(productId) { ensureInit(); getPolicyRef(productId); return clone(S.policyHistory[productId]); }

  function tokenFor(productId, recId, issuedAt, pol, ev, extra, repayment, lenderName) {
    const conditions = tokenConditions(productId, repayment);
    if (productId === 'personal_loan' && ev && ev.features && ev.features.crossBorder) {
      conditions.push('Remittance-linked repayment schedule');
    }
    if (productId === 'car_loan' && ev && ev.features && Number.isFinite(ev.features.downPayment)) {
      conditions.push.apply(conditions, carConditions(lenderName || lendersList()[0].name, ev.features.downPayment));
    }
    if (extra) conditions.push(extra);
    return { id: 'TKN-' + recId, issuedAt,
             expiresAt: addDaysIso(D.TODAY, pol.params.tokenValidityDays) + 'T23:59:59.000Z',
             conditions };
  }

  // `internal` (not part of the public contract) carries redecide()'s trigger.
  function decide(application, internal) {
    ensureInit();
    if (!application || typeof application !== 'object') throw err('decide(application) requires an application object');
    const { productId, applicant, consents } = application;
    const manifest = MANIFESTS.find(m => m.productId === productId);
    if (!manifest) throw err('unknown productId "' + productId + '"');
    if (!applicant || typeof applicant !== 'object') throw err('application.applicant is required');
    // Consent gate — no consent record, no pull, no decision (Federal Law 6/2010).
    if (!consents || consents.aecb !== true) {
      throw err('AECB consent is required before any bureau pull or credit decision (Federal Law 6/2010)');
    }
    // Split underwrites on connected accounts — Open Finance consent is mandatory.
    if (productId === 'split' && consents.openFinance !== true) {
      throw err('Open Finance consent (connected accounts via Al Tareq) is required for split — it underwrites on connected-account cash flow');
    }
    // The starter-loan upgrade re-decides on connected UAE accounts — Open Finance consent is mandatory;
    // home-country statements are optional (they decide the tier).
    if (productId === 'starter_loan' && consents.openFinance !== true) {
      throw err('Open Finance consent (connected UAE accounts via Al Tareq) is required for the starter-loan upgrade — it re-decides on connected-account cash flow');
    }
    let amount = application.amount;
    let tenorMonths = application.tenorMonths;
    if (productId === 'starter_loan') {
      // The customer asks for the upgrade and shapes it afterwards (quoteUpgrade /
      // selectUpgradeOption), so amount and tenor are optional: they default to the
      // enhanced tier's ceiling and are recorded as the request only.
      const en = getPolicyRef('starter_loan').params.tiers.enhanced;
      if (amount === undefined || amount === null) amount = en.maxAmount;
      if (tenorMonths === undefined || tenorMonths === null) tenorMonths = en.maxTenorMonths;
    }
    if (!Number.isFinite(amount) || amount <= 0) throw err('application.amount must be a positive number (AED)');
    if (!Number.isFinite(tenorMonths) || tenorMonths <= 0) throw err('application.tenorMonths must be a positive number');
    // v2.7 — a car loan is decided on the vehicle: the dealer quote is part of the
    // application (defaults to the applicant's vehicleQuote) and is required.
    const vehicle = productId === 'car_loan' ? carVehicle(application.vehicle || applicant.vehicleQuote) : null;

    // v2.4 — home-country statements: a parseStatements() result (customer upload in a
    // journey, or what an underwriter requested), or the v2.1 consent flag, which
    // parses the customer's seeded statements as if they had been uploaded.
    let statements = null;
    if (application.statements !== undefined && application.statements !== null) {
      const sIn = application.statements;
      if (typeof sIn !== 'object' || sIn.kind !== 'HOME_STATEMENTS') throw err('application.statements must be a parseStatements() result');
      if (!STATEMENT_PRODUCTS.includes(productId)) throw err('home-country statements feed personal-loan and upgrade decisions only (not ' + productId + ')');
      if (sIn.applicantId && applicant.id && sIn.applicantId !== applicant.id) {
        throw err('these statements belong to applicant ' + sIn.applicantId + ', not ' + applicant.id);
      }
      statements = clone(sIn);
    } else if ((consents.homeStatements === true || consents.internationalStatements === true) && applicant.homeStatements &&
               STATEMENT_PRODUCTS.includes(productId)) {
      const hs = applicant.homeStatements;
      statements = parseStatementsFor(applicant, { country: hs.country, bank: hs.bank, file: hs.file, productId });
    }
    // A re-decision supersedes an earlier decision for the same customer and product.
    let orig = null;
    if (application.supersedes !== undefined && application.supersedes !== null) {
      orig = S.byId[application.supersedes];
      if (!orig) throw err('unknown decision id "' + application.supersedes + '" to supersede');
      checkSupersedable(orig, productId, applicant, statements);
    }
    const trigger = orig ? ((internal && internal.trigger) || 'CUSTOMER_UPLOAD') : null;

    const pol = getPolicyRef(productId);
    const ev = evaluate(productId, applicant, Math.round(amount), Math.round(tenorMonths), pol, consents, statements, vehicle ? { vehicle } : undefined);

    S.seq += 1;
    const id = 'MZN-' + String(S.seq).padStart(6, '0');
    const createdAt = nowIso();
    const consentAt = createdAt;
    const pulls = buildDataPulls(productId, ev, consents, S.seq, statements);
    // Repayment collection follows the approved amount (v2.3); refer/decline → null.
    const repayment = ev.outcome === 'APPROVE' && ev.limit.approved > 0 ? repaymentFor(ev.limit.approved) : null;
    const token = ev.outcome === 'APPROVE'
      ? tokenFor(productId, id, createdAt, pol, ev, null, repayment, productId === 'car_loan' ? lenderFor(application.lenderId).name : undefined) : null;

    const record = {
      id, createdAt, productId, segment: 'CONSUMER',
      applicantSnapshot: clone(applicant),
      request: { amount: Math.round(amount), tenorMonths: Math.round(tenorMonths) },
      consents: { aecb: { granted: true, at: consentAt },
                  openFinance: { granted: consents.openFinance === true, at: consents.openFinance === true ? consentAt : null },
                  creditPassport: { granted: consents.creditPassport === true, at: consents.creditPassport === true ? consentAt : null },
                  homeStatements: { granted: !!statements, at: statements ? consentAt : null,
                                    source: statements ? (trigger || 'CUSTOMER_UPLOAD') : null },
                  // v2.5 — part of every application: Noor shares the RESULT (the credit
                  // memo), never bank data, with the lender of record.
                  shareWithLender: { granted: true, at: consentAt, lenderId: lenderFor(application.lenderId).id,
                                     scope: 'application result only — credit memo, never bank data', wording: SHARE_WITH_LENDER_WORDING } },
      dataPulls: pulls,
      features: ev.features,
      rules: ev.rules,
      score: ev.score,
      // v2.5 — the score as the customer and the lender see it (the breakdown stays in `score`).
      noorScore: { value: Number.isFinite(ev.score.points) ? ev.score.points : null, band: noorScoreBand(ev.score.points) },
      limit: ev.limit,
      pricing: ev.pricing,
      outcome: ev.outcome,
      reasonCodes: ev.reasonCodes.slice(),
      token,
      repayment,
      policyVersion: pol.version, engineVersion: ENGINE_VERSION,
      events: [],
      audit: [{ at: createdAt, actor: 'engine', action: 'DECISION_CREATED',
                detail: ev.outcome + ' · policy v' + pol.version + ' · ' + ev.score.model + ' ' + ev.score.version }],
      override: null,
      status: 'OPEN',
      // v2.4 — the statements this decision read (null when none), and what they were worth.
      homeStatements: statements,
      evidenceComparison: statements ? evidenceComparison(productId, applicant, Math.round(amount), Math.round(tenorMonths), pol, consents, ev) : null,
      supersedes: orig ? orig.id : null,
      supersededBy: null
    };
    if (ev.redFlags) {
      // v2.9 — what the red-flag rule read (internal: the Decision log and the Workbench).
      // Never part of the credit memo: the lender sees the outcome and RC_RED_FLAGS_REVIEW only.
      record.redFlags = ev.redFlags;
      record.audit.push({ at: createdAt, actor: 'engine', action: 'RED_FLAGS_READ',
                          detail: ev.redFlags.ruleOn
                            ? (ev.redFlags.flags.length ? ev.redFlags.flags.map(f => f.code).join(' · ') : 'no signal') +
                              ' · against the customer’s own history · ' + (ev.redFlags.referred ? 'REFER to an underwriter (never a decline or a price change)' : 'no referral')
                            : 'rule off by policy (earlyWarning.redFlagsAtOrigination = false)' });
    }
    if (productId === 'car_loan') {
      // DecisionRecord additions for the car loan (Addendum v2.7).
      record.request.vehicle = clone(vehicle);
      // What Open Finance was worth — the same application re-evaluated without it (pure:
      // nothing stored, no clock tick). Null on the documents path: the UI shows a CTA.
      record.openFinanceUplift = ev.features.openFinance
        ? carUplift(applicant, Math.round(amount), Math.round(tenorMonths), pol, consents, vehicle, ev) : null;
      // Internal only (the car screen, the Decision log) — never part of the credit memo.
      record.openFinanceFindings = ev.car.findings;
      record.audit[0].detail += ' · ' + (ev.features.openFinance ? 'Open Finance (Al Tareq)' : 'documents only (salary certificate + AECB)');
    }
    if (productId === 'starter_loan') {
      // DecisionRecord additions for the upgrade (Addendum v2.1).
      record.kind = 'UPGRADE';
      record.priorLoan = clone(applicant.priorLoan || ev.profile.prior);
      record.tier = ev.tier;
      record.upgrade = ev.upgrade;
      record.selection = null;
      record.audit[0].detail += ' · tier ' + (ev.tier || '—');
    }
    if (statements) {
      record.audit.push({ at: createdAt, actor: 'engine', action: 'STATEMENTS_READ',
                          detail: statements.bank + ' (' + statements.countryName + ') · ' + statements.file + ' · integrity ' + statements.integrity +
                                  (statements.integrity === 'PASS' ? ' · name ' + (statements.nameMatch ? 'match' : 'mismatch') + ' · ' + statements.monthsPresent + ' of 6 months' : '') });
    }
    if (orig) {
      // Audit-linked both ways: the new record names the original and the original names its successor.
      record.redecision = { supersedes: orig.id, trigger,
                            original: { outcome: orig.outcome, approved: orig.limit.approved, grade: orig.score ? orig.score.grade : null,
                                        tier: orig.tier || null, status: orig.status, reasonCodes: orig.reasonCodes.slice() },
                            documentRequest: orig.documentRequest ? clone(orig.documentRequest) : null };
      record.audit.push({ at: createdAt, actor: 'engine', action: 'REDECISION',
                          detail: 'supersedes ' + orig.id + ' (' + orig.outcome + ') · ' + (trigger === 'UNDERWRITER_REQUEST' ? 'statements requested by the underwriter' : 'statements uploaded by the customer') });
      orig.supersededBy = id;
      orig.status = 'SUPERSEDED';
      orig.audit.push({ at: createdAt, actor: 'engine', action: 'SUPERSEDED',
                        detail: 'superseded by ' + id + ' (' + ev.outcome + ') — re-decided on home-country statements' });
    }
    S.decisions.push(record);
    S.byId[id] = record;
    return record;
  }
  const STATEMENT_PRODUCTS = ['personal_loan', 'starter_loan'];
  function checkSupersedable(orig, productId, applicant, statements) {
    if (orig.productId !== productId) throw err('cannot supersede ' + orig.id + ' — it is a ' + orig.productId + ' decision, not ' + productId);
    const oid = orig.applicantSnapshot && orig.applicantSnapshot.id;
    if (oid && applicant.id && oid !== applicant.id) throw err('cannot supersede ' + orig.id + ' — it belongs to applicant ' + oid);
    if (orig.supersededBy) throw err(orig.id + ' is already superseded by ' + orig.supersededBy);
    if (orig.events.length) throw err('cannot supersede ' + orig.id + ' — the offer was already accepted (' + orig.events[0].type + ' recorded)');
    if (orig.override) throw err('cannot supersede ' + orig.id + ' — it was resolved by override');
    if (!statements) throw err('a re-decision needs new evidence — pass the parsed home-country statements');
  }
  // What the statements were worth: the same application decided without
  // home-country data, with the Credit Passport (where the customer has one),
  // and with the statements. Pure evaluations — nothing is stored.
  function evidenceComparison(productId, applicant, amount, tenorMonths, pol, consents, ev) {
    if (!STATEMENT_PRODUCTS.includes(productId)) return null;
    const base = Object.assign({}, consents, { creditPassport: false, homeStatements: false, internationalStatements: false });
    const row = (path, label, e) => ({ path, label, outcome: e.outcome, approved: e.outcome === 'DECLINE' ? 0 : e.limit.approved,
                                       grade: e.score.grade, bindingConstraint: e.limit.bindingConstraint, tier: e.tier || null,
                                       maxTenorMonths: e.upgrade ? e.upgrade.maxTenorMonths : null, aprFloor: e.upgrade ? e.upgrade.aprFloor : null,
                                       reasonCodes: e.reasonCodes.slice() });
    const out = [row('NO_DATA', productId === 'starter_loan' ? 'UAE accounts only' : 'No home-country data',
                     evaluate(productId, applicant, amount, tenorMonths, pol, base, null))];
    if (productId === 'personal_loan' && applicant.aecb && applicant.aecb.creditPassportAvailable && applicant.homeBureau && !(applicant.aecb.hit)) {
      out.push(row('CREDIT_PASSPORT', 'Credit Passport', evaluate(productId, applicant, amount, tenorMonths, pol, Object.assign({}, base, { creditPassport: true }), null)));
    }
    out.push(row('HOME_STATEMENTS', 'Home-country statements', ev));
    return out;
  }

  // ---------------------------------------------------------------------------
  // Credit memo for the lender of record (Addendum v2.5)
  //
  // A Tier-3 bank (Partner Bank) books and funds the loan; Noor decides and sends
  // it a credit memo. The Decision log is Noor's INTERNAL record; the memo is the
  // only thing a lender receives, over the UI, the API (JSON) or SFTP (CSV).
  //
  // It is built from an ALLOWLIST: every field below is constructed explicitly from
  // the decision record — nothing is copied over and then deleted. Open Finance data
  // never leaves Noor: income, spending, free cash flow, DBR and the bureau score
  // reach the lender as BANDS; identity, statements and the purchase as FLAGS;
  // consents as REFERENCES. creditMemo() is pure: no clock tick, no audit entry.
  // ---------------------------------------------------------------------------
  const DEFAULT_LENDERS = [{ id: 'partner-bank', name: 'Partner Bank', role: 'Lender of record' }];
  const SHARE_WITH_LENDER_WORDING = 'By applying you agree Noor shares your application result (not your bank data) with the lender of record';
  const OPEN_FINANCE_REASON = 'Open Finance data is shared with Noor for this purpose only and cannot be passed on (customer consent scope, CBUAE Open Finance framework, PDPL)';
  const MEMO_SHARED = [
    'Decision, status and reason codes (English + Arabic)',
    'Loan terms and repayment method',
    'NoorScore, its band and up to three factor directions',
    'Affordability as bands — income, debt burden, free cash flow, instalment share',
    'Bureau flags — AECB checked, score band, delinquency, returned cheques',
    'Verification flags — identity, home-country statements, purchase category',
    'Consent references (type, time, reference — never the content)',
    'Borrower name (with Arabic transliteration) and masked Emirates ID'
  ];
  const MEMO_WITHHELD = [
    { group: 'Line-by-line account history and merchant names (only the purchase category is shared)', reason: OPEN_FINANCE_REASON },
    { group: 'Account names, banks and account identifiers', reason: OPEN_FINANCE_REASON },
    { group: 'Exact income, spending, balances and free cash flow', reason: OPEN_FINANCE_REASON },
    { group: 'Salary dates', reason: OPEN_FINANCE_REASON },
    { group: 'Home-country statement figures, banks and file names',
      reason: 'Uploaded for Noor\'s assessment only — the lender receives verification flags (PDPL purpose limitation)' },
    { group: 'Digital-footprint and vendor raw data', reason: 'Never used for credit; dropped at ingestion (PDPL data minimisation)' },
    { group: 'Raw contact details', reason: 'Not needed to book the loan — Noor stays the customer\'s point of contact (PDPL data minimisation)' }
  ];
  // Car loan (v2.7) memos add these lines; other products' memos are unchanged.
  const MEMO_SHARED_CAR = [
    'Vehicle quote — category, condition, model year, price, loan-to-value and down payment (dealer-quote data, not Open Finance)',
    'Other income as a category and the share counted; the down-payment source as a flag'
  ];
  const MEMO_WITHHELD_CAR = [
    { group: 'Rental income amounts, receipts and the account they land in (only the category and the share counted are shared)', reason: OPEN_FINANCE_REASON }
  ];
  const MEMO_SFTP_HEADER = ['memo_id', 'noor_ref', 'product', 'outcome', 'amount', 'tenor', 'apr_or_fee', 'monthly_payment',
                            'repayment_method', 'noorscore', 'noorscore_band', 'income_band', 'dbr_band', 'aecb_band',
                            'reason_codes', 'created_at'];
  function lendersList() { return (D && Array.isArray(D.lenders) && D.lenders.length) ? D.lenders : DEFAULT_LENDERS; }
  function lenderFor(lenderId) {
    const list = lendersList();
    if (lenderId === undefined || lenderId === null) return list[0];
    const l = list.find(x => x.id === lenderId);
    if (!l) throw err('unknown lender "' + lenderId + '" — lenders: ' + list.map(x => x.id).join(', '));
    return l;
  }
  const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Income: AED 5,000 steps up to 20,000, AED 10,000 steps above.
  function incomeBand(x) {
    if (!Number.isFinite(x)) return null;
    if (x < 5000) return 'Below AED 5,000 / month';
    const step = x < 20000 ? 5000 : 10000;
    const lo = Math.floor(x / step) * step;
    return 'AED ' + thousands(lo) + '–' + thousands(lo + step) + ' / month';
  }
  function dbrBand(p) {
    if (!Number.isFinite(p)) return null;
    return p < 20 ? '< 20%' : (p < 35 ? '20–35%' : (p <= 50 ? '35–50%' : '> 50%'));
  }
  function fcfBand(x) {
    if (!Number.isFinite(x)) return null;
    return x < 1000 ? 'Below AED 1,000 / month' : (x < 3000 ? 'AED 1,000–2,999 / month'
         : (x < 5000 ? 'AED 3,000–4,999 / month' : 'AED 5,000+ / month'));
  }
  function shareBand(p) {
    if (!Number.isFinite(p)) return null;
    return p < 25 ? '< 25%' : (p <= 50 ? '25–50%' : '> 50%');
  }
  function aecbScoreBand(aecb) {
    if (!aecb || !aecb.hit) return 'No file';
    if (!Number.isFinite(aecb.score)) return 'File, no score yet';
    const lo = Math.floor(aecb.score / 50) * 50;
    return lo + '–' + (lo + 49);
  }
  const DELINQUENCY_FLAG = { NONE: 'None', DPD30: 'DPD30 in history', DPD90: 'DPD90 in history', WRITEOFF: 'Write-off in history' };
  // The bureau view of the applicant: the snapshot's AECB block, else the AECB pull summary.
  function aecbOf(rec) {
    const a = rec.applicantSnapshot && rec.applicantSnapshot.aecb;
    if (a) return { hit: a.hit === true, score: a.score === undefined ? null : a.score, worstDelinquency: a.worstDelinquency || 'NONE',
                    chequeReturns12m: a.chequeReturns12m || 0 };
    const pull = (rec.dataPulls || []).find(x => x.source === 'AECB_CONSUMER') || { status: 'NO_HIT', summary: {} };
    const s = pull.summary || {};
    return { hit: pull.status === 'HIT', score: Number.isFinite(s.score) ? s.score : null, worstDelinquency: s.worstDelinquency || 'NONE',
             chequeReturns12m: s.chequeReturns12m || 0 };
  }
  // Deterministic masked Emirates ID — only the 784 prefix and a check digit show.
  function maskedEmiratesId(applicantId) {
    const s = String(applicantId || 'applicant');
    let sum = 0; for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return '784-••••-•••••••-' + (sum % 10);
  }
  function memoTerms(rec) {
    if (rec.outcome !== 'APPROVE') return null;
    const p = rec.pricing || {}, lim = rec.limit || {};
    const reg = (S.policies[rec.productId] || {}).regulatory || {};
    const rep = rec.repayment || null;
    const base = { repaymentMethod: rep ? rep.method : null, repaymentMethodLabel: rep ? rep.label : null, coolingOffDays: reg.coolingOffDays || 5 };
    if (p.mode === 'BANDED_APR' && p.kfs) {
      const k = p.kfs;
      const t = Object.assign({ amount: k.principal, tenorMonths: k.tenorMonths, apr: k.rateMid, aprBand: [p.rateMin, p.rateMax],
                                monthlyPayment: k.monthlyInstalment, totalRepayable: k.totalRepayable, totalInterest: k.totalInterest,
                                fees: 0, earlySettlementFeeCap: k.earlySettlementFeeCap || null }, base);
      // v2.7 — the vehicle: dealer-quote data, not Open Finance, so exact figures are fine.
      if (rec.productId === 'car_loan' && Number.isFinite(k.vehiclePrice)) {
        const rv = (rec.request && rec.request.vehicle) || {};
        t.vehicle = { category: rv.category || null, condition: rv.condition || null, modelYear: rv.modelYear || null,
                      priceAed: k.vehiclePrice, ltvPct: k.ltvPct, downPayment: k.downPayment };
      }
      return t;
    }
    if (p.mode === 'MONTHLY_FEE') {
      const plan = (p.plans || []).find(x => x.months === p.selectedMonths) || {};
      return Object.assign({ amount: p.principal, planMonths: p.selectedMonths, monthlyFeeRate: p.monthlyFeeRate,
                             aprEquivalent: plan.aprEquivalent, monthlyPayment: plan.monthlyPayment, totalRepayable: plan.planTotal,
                             totalFees: plan.totalFees }, base);
    }
    if (p.mode === 'FLAT_FEE') {
      return Object.assign({ amount: lim.approved, tenorMonths: 1, flatFee: p.fee, apr: null,
                             monthlyPayment: round2(lim.approved + p.fee), totalRepayable: round2(lim.approved + p.fee) }, base);
    }
    if (p.mode === 'TENOR_CURVE_APR') {
      const s = rec.selection;
      if (s) return Object.assign({ amount: s.amount, tenorMonths: s.months, apr: s.apr, monthlyPayment: s.monthlyPayment,
                                    totalRepayable: s.totalRepayable, totalInterest: s.totalInterest, fees: 0 }, base);
      const up = rec.upgrade || {};
      return Object.assign({ amount: null, offerUpTo: up.maxAmount, tenorMonths: null, maxTenorMonths: up.maxTenorMonths, apr: null,
                             aprFrom: up.aprFloor, monthlyPayment: null, totalRepayable: null, customerChoicePending: true }, base);
    }
    return null;
  }
  function memoInstalmentShare(rec) {
    const f = rec.features || {};
    if (Number.isFinite(f.instalmentToFcfPct)) return f.instalmentToFcfPct;
    if (rec.kind === 'UPGRADE' && rec.selection && f.freeCashFlowMonthly > 0) {
      return Math.round((rec.selection.monthlyPayment / f.freeCashFlowMonthly) * 1000) / 10;
    }
    return null;
  }
  function memoIncomeVia(rec) {
    const f = rec.features || {}, a = rec.applicantSnapshot || {};
    const of = rec.consents && rec.consents.openFinance && rec.consents.openFinance.granted;
    const months = (a.connected && a.connected.monthsAvailable) || (a.bankData && a.bankData.monthsAvailable) || f.connectedMonths || null;
    const viaOf = 'Open Finance (Al Tareq)' + (months ? ', ' + months + ' months' : '');
    let via;
    if (f.verifiedIncome === null || f.verifiedIncome === undefined) via = 'Not verified';
    else if (rec.productId === 'personal_loan') via = f.incomeSource === 'ALTAREQ_TPP' ? viaOf : 'Salary documents';
    else if (rec.productId === 'salary_advance') via = of && a.bankData && a.bankData.source === 'ALTAREQ_TPP' ? viaOf : 'Salary documents';
    else if (rec.productId === 'car_loan') {
      via = !f.openFinance ? 'Salary certificate'
        : (f.incomeSource === 'ALTAREQ_TPP' ? viaOf : 'Salary certificate + ' + viaOf) +
          (f.regularIncomeCountedMonthly > 0 ? ' — salary and ' + incomeWord(f.regularIncomeCategory)[0].toLowerCase() : ' — salary');
    }
    else via = viaOf;
    const st = rec.homeStatements;
    if (st && st.usable) via += ' + home-country statements (6 months)';
    return via;
  }
  function memoStatementsFlag(st) {
    if (!st) return null;
    if (st.integrity !== 'PASS' || st.nameMatch !== true) return 'Not verified — referred to fraud review';
    if (!st.complete) return st.monthsPresent + ' of 6 months — incomplete, not used';
    const clean = st.evidence && st.evidence.conductClean;
    return '6 of 6 months verified · conduct ' + (clean ? 'clean' : 'issues noted') + (st.obligationsMonthlyAed ? ' · home-country loan counted in DBR' : '');
  }
  function memoUpgradeFactors(rec) {
    const out = [];
    const pr = rec.priorLoan || {};
    out.push(pr.dpd === 0 ? 'Starter loan repaid on time' : 'Starter loan repaid late');
    if (rec.homeStatements && rec.homeStatements.usable) out.push('Home-country statements verified');
    return out;
  }
  // Car loan (v2.7) flags: other income as a category and the share counted, never the
  // amounts; the down-payment source as a flag, never the balances.
  function memoCarFlags(rec) {
    const f = rec.features || {};
    const word = incomeWord(f.regularIncomeCategory)[0];
    let otherIncome;
    if (!f.openFinance) otherIncome = 'Declared other income not counted — not verifiable in an instant decision';
    else if (f.regularIncomeCountedMonthly > 0) otherIncome = word + ' verified via Open Finance (' + f.connectedMonths + ' months) — counted at ' + f.regularIncomeCountedPct + '%';
    else if (f.regularIncomeVerifiedMonthly > 0) otherIncome = word + ' verified via Open Finance — counted at ' + f.regularIncomeCountedPct + '%';
    else if (f.regularIncomeCategory) otherIncome = word + ' seen in connected accounts — not counted (did not meet the verification rule)';
    else otherIncome = 'None seen in connected accounts';
    const downPaymentSource = rec.outcome === 'DECLINE' || !Number.isFinite(f.downPayment) ? null
      : (f.downPaymentCoveredByOwnFunds === true ? 'Own funds — verified in connected accounts'
        : (f.openFinance ? 'Own funds — to be evidenced before release' : 'Own funds — declared, not verified'));
    return { otherIncome, downPaymentSource };
  }
  const CONSENT_CODES = [['aecb', 'AECB'], ['openFinance', 'ALTAREQ'], ['creditPassport', 'CPASS'], ['homeStatements', 'STMT'], ['shareWithLender', 'LENDER']];
  function creditMemo(decisionId, opts) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    const lender = lenderFor(opts && opts.lenderId);
    const a = rec.applicantSnapshot || {};
    const f = rec.features || {};
    const man = MANIFESTS.find(m => m.productId === rec.productId) || {};
    const aecb = aecbOf(rec);
    const sc = rec.score || {};
    const value = Number.isFinite(sc.points) ? sc.points : null;
    const seq = rec.id.replace(/^MZN-/, '');
    const crossBorder = !!f.crossBorder;
    const car = rec.productId === 'car_loan';
    return {
      memoId: 'CM-' + rec.id,
      noorRef: rec.id,
      lenderId: lender.id,
      lenderName: lender.name + ' (' + String(lender.role || 'lender of record').toLowerCase() + ')',
      createdAt: rec.createdAt,
      product: { productId: rec.productId, nameEn: man.nameEn || rec.productId },
      policyVersion: rec.policyVersion,
      engineVersion: rec.engineVersion,
      borrower: { name: a.name || null, nameAr: a.nameAr || null, emiratesIdMasked: maskedEmiratesId(a.id), kycSource: 'UAE PASS (onboarding)' },
      decision: {
        outcome: rec.outcome,
        status: rec.status,
        route: rec.override ? 'ANALYST_REVIEW' : 'STRAIGHT_THROUGH',
        reasonCodes: (rec.reasonCodes || []).map(code => {
          const rc = D.reasonCodes[code] || {};
          return { code, en: rc.en || code, ar: rc.ar || '' };
        }),
        validUntil: rec.token ? rec.token.expiresAt : null
      },
      terms: memoTerms(rec),
      noorScore: {
        value,
        band: noorScoreBand(value),
        factors: rec.kind === 'UPGRADE' ? memoUpgradeFactors(rec) : noorScoreFactors(sc, 3)
      },
      affordability: {
        incomeBand: incomeBand(f.verifiedIncome),
        dbrBand: dbrBand(f.dbrPct),
        freeCashFlowBand: fcfBand(f.freeCashFlowMonthly),
        instalmentToCashFlowBand: shareBand(memoInstalmentShare(rec)),
        incomeVerifiedVia: memoIncomeVia(rec)
      },
      bureau: {
        aecbChecked: (rec.rules || []).some(r => r.id === 'REG_AECB_CHECK'),
        aecbScoreBand: aecbScoreBand(aecb),
        delinquencyFlag: DELINQUENCY_FLAG[aecb.worstDelinquency] || aecb.worstDelinquency,
        chequeReturnsFlag: aecb.chequeReturns12m > 0
          ? aecb.chequeReturns12m + ' returned cheque' + (aecb.chequeReturns12m === 1 ? '' : 's') + ' in 12 months' : 'None',
        homeCountryFile: crossBorder ? 'Home-country credit file used (Credit Passport, consented)' : null
      },
      verification: Object.assign({
        identity: 'Verified (UAE PASS)',
        homeStatements: memoStatementsFlag(rec.homeStatements),
        purchaseVerified: rec.productId === 'split'
          ? (f.purchaseSeenInConnectedData ? (f.purchaseCategory || 'Purchase') + ' — verified purchase' : 'Purchase not verified')
          : null
      }, car ? memoCarFlags(rec) : {}),
      consents: CONSENT_CODES
        .filter(([k]) => rec.consents && rec.consents[k] && rec.consents[k].granted)
        .map(([k, code]) => ({ type: k, grantedAt: rec.consents[k].at, reference: 'CNS-' + seq + '-' + code })),
      sharing: { shared: MEMO_SHARED.concat(car ? MEMO_SHARED_CAR : []),
                 withheld: MEMO_WITHHELD.concat(car ? MEMO_WITHHELD_CAR : []).map(w => ({ group: w.group, reason: w.reason })) }
    };
  }
  function assertMemo(memo, fn) {
    if (!memo || typeof memo !== 'object' || typeof memo.memoId !== 'string' || !/^CM-/.test(memo.memoId)) {
      throw err(fn + ' needs a creditMemo() result');
    }
  }
  // API delivery: the memo itself, as a detached JSON object.
  function memoApiPayload(memo) { assertMemo(memo, 'memoApiPayload'); return clone(memo); }
  // SFTP delivery: one flat CSV row per memo (header + row, all strings).
  function memoSftpRow(memo) {
    assertMemo(memo, 'memoSftpRow');
    const t = memo.terms || {};
    const s = (v) => (v === null || v === undefined ? '' : String(v));
    let aprOrFee = '';
    if (Number.isFinite(t.monthlyFeeRate)) aprOrFee = 'Fee ' + pctStr(t.monthlyFeeRate) + '/mo (APR equivalent ' + pctStr(t.aprEquivalent) + ')';
    else if (Number.isFinite(t.flatFee)) aprOrFee = 'Flat fee ' + aed(t.flatFee);
    else if (Number.isFinite(t.apr)) aprOrFee = 'APR ' + pctStr(t.apr);
    else if (Number.isFinite(t.aprFrom)) aprOrFee = 'APR from ' + pctStr(t.aprFrom);
    const row = [memo.memoId, memo.noorRef, memo.product.productId, memo.decision.outcome,
                 s(Number.isFinite(t.amount) ? t.amount : t.offerUpTo), s(t.tenorMonths || t.planMonths || t.maxTenorMonths), aprOrFee,
                 s(t.monthlyPayment), s(t.repaymentMethod), s(memo.noorScore.value), s(memo.noorScore.band),
                 s(memo.affordability.incomeBand), s(memo.affordability.dbrBand), s(memo.bureau.aecbScoreBand),
                 memo.decision.reasonCodes.map(r => r.code).join('|'), memo.createdAt];
    return { header: MEMO_SFTP_HEADER.slice(), row };
  }

  // ---------------------------------------------------------------------------
  // Home-country statements — public API (Addendum v2.4)
  // ---------------------------------------------------------------------------
  // Pure: parse a customer's seeded statements. Unknown file → integrity FAIL.
  function parseStatements(input) {
    ensureInit();
    if (!input || typeof input !== 'object') throw err('parseStatements needs {country, bank, file, applicantId}');
    corridorOf(input.country);
    const a = findApplicant(input.applicantId);
    if (!a) throw err('unknown applicant "' + input.applicantId + '"');
    return parseStatementsFor(a, input);
  }
  // Underwriter asks for evidence on a refer (or an approval below the request):
  // status AWAITING_DOCUMENTS, refer SLA paused, customer message RC_STATEMENTS_REQUESTED.
  function requestDocuments(decisionId, req) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.supersededBy) throw err(decisionId + ' was superseded by ' + rec.supersededBy + ' — work on the newer decision');
    if (rec.status === 'AWAITING_DOCUMENTS') throw err('statements were already requested on ' + decisionId + ' — waiting for the customer to upload them');
    if (rec.status === 'DOCUMENTS_RECEIVED') throw err('statements were already received on ' + decisionId + ' — re-decide with them');
    const below = rec.outcome === 'APPROVE' && rec.limit.approved < rec.limit.requested && rec.events.length === 0;
    const openRefer = rec.outcome === 'REFER' && !rec.override;
    if (!openRefer && !below) {
      throw err('statements can be requested only on an open REFER or an approval below the requested amount — ' + decisionId + ' is ' +
                rec.outcome + (rec.override ? ' (resolved by override)' : (rec.events.length ? ' (offer already accepted)' : '')));
    }
    if (!STATEMENT_PRODUCTS.includes(rec.productId)) throw err('home-country statements feed personal-loan and upgrade decisions only (' + decisionId + ' is ' + rec.productId + ')');
    if (!req || typeof req !== 'object') throw err('requestDocuments needs {type:"HOME_STATEMENTS", months:6, country, analyst, note}');
    if (req.type !== undefined && req.type !== 'HOME_STATEMENTS') throw err('requestDocuments supports type HOME_STATEMENTS only');
    if (req.months !== undefined && req.months !== STATEMENT_MONTHS) throw err('home-country statements always cover the last 6 months (asked ' + req.months + ')');
    const cc = corridorOf(req.country);
    if (typeof req.analyst !== 'string' || !req.analyst.trim()) throw err('requestDocuments needs the analyst name');
    const at = nowIso();
    const msg = D.reasonCodes.RC_STATEMENTS_REQUESTED;
    rec.documentRequest = { type: 'HOME_STATEMENTS', months: STATEMENT_MONTHS, country: cc, countryName: CORRIDORS[cc].name,
                            analyst: req.analyst.trim(), note: req.note ? String(req.note) : '', requestedAt: at,
                            reasonCode: 'RC_STATEMENTS_REQUESTED', customerMessage: { en: msg.en, ar: msg.ar },
                            slaHoursLeftAtPause: REFER_SLA_HOURS[rec.productId] || 8, statusBefore: rec.status };
    rec.status = 'AWAITING_DOCUMENTS';
    rec.audit.push({ at, actor: req.analyst.trim(), action: 'DOCUMENTS_REQUESTED',
                     detail: '6 months of ' + CORRIDORS[cc].name + ' bank statements · RC_STATEMENTS_REQUESTED · refer SLA paused' + (req.note ? ' · ' + req.note : '') });
    return rec;
  }
  // The customer's upload: parsed and attached. Integrity/name failures are kept
  // (the re-decision refers them to fraud review); an incomplete window stays
  // AWAITING_DOCUMENTS — the customer is asked again (RC_STATEMENTS_INCOMPLETE).
  function submitStatements(decisionId, upload) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.status !== 'AWAITING_DOCUMENTS') {
      throw err('no statements were requested on ' + decisionId +
                (rec.status === 'DOCUMENTS_RECEIVED' ? ' — statements already received; re-decide with them' : ' — request them first (requestDocuments)'));
    }
    if (!upload || typeof upload !== 'object') throw err('submitStatements needs {country, bank, file}');
    const parsed = parseStatementsFor(rec.applicantSnapshot, { country: upload.country, bank: upload.bank, file: upload.file,
                                                               months: upload.months, productId: rec.productId });
    const at = nowIso();
    const incomplete = parsed.integrity === 'PASS' && parsed.nameMatch && !parsed.complete;
    rec.documents = { type: 'HOME_STATEMENTS', file: parsed.file, country: parsed.country, submittedAt: at, parsed };
    if (incomplete) {
      rec.audit.push({ at, actor: 'customer', action: 'DOCUMENTS_INCOMPLETE',
                       detail: parsed.file + ' · ' + parsed.monthsPresent + ' of 6 months · RC_STATEMENTS_INCOMPLETE — customer asked for the missing months' });
      return rec;
    }
    rec.status = 'DOCUMENTS_RECEIVED';
    rec.audit.push({ at, actor: 'customer', action: 'DOCUMENTS_RECEIVED',
                     detail: parsed.file + ' · integrity ' + parsed.integrity + (parsed.integrity === 'PASS'
                       ? ' · name ' + (parsed.nameMatch ? 'match' : 'mismatch') + ' · ' + parsed.monthsPresent + ' of 6 months · EMIs AED ' +
                         parsed.obligationsMonthlyAed + '/mo · remittances ' + parsed.remittanceConsistencyPct + '%'
                       : ' — fraud review on re-decision') + ' · refer SLA resumes' });
    return rec;
  }
  // Mizan re-decides on the evidence: a NEW DecisionRecord that supersedes the original.
  function redecide(decisionId) {
    ensureInit();
    const orig = getDecisionRef(decisionId);
    if (orig.supersededBy) throw err(decisionId + ' is already superseded by ' + orig.supersededBy);
    if (orig.status !== 'DOCUMENTS_RECEIVED' || !orig.documents) {
      throw err('re-deciding needs documents — no home-country statements have been received on ' + decisionId +
                (orig.status === 'AWAITING_DOCUMENTS' ? ' (still waiting for the customer)' : ' (request them first)'));
    }
    const c = orig.consents || {};
    return decide({ productId: orig.productId, applicant: orig.applicantSnapshot,
                    amount: orig.request.amount, tenorMonths: orig.request.tenorMonths,
                    consents: { aecb: true, openFinance: !!(c.openFinance && c.openFinance.granted),
                                creditPassport: !!(c.creditPassport && c.creditPassport.granted) },
                    statements: orig.documents.parsed, supersedes: orig.id }, { trigger: 'UNDERWRITER_REQUEST' });
  }

  // ---------------------------------------------------------------------------
  // Pre-qualification (Addendum v2.6) — "how much could I borrow?", before any
  // application. Pure and indicative: NO DecisionRecord, NO AECB pull, no clock
  // tick. It reads only what the customer's connected accounts show (Open
  // Finance via Al Tareq): verified income, spending and the repayments already
  // leaving the accounts (observed obligations).
  //   per term n:  min( PV of the DBR headroom (50%, 30% retirees, × income −
  //                     observed obligations),
  //                     PV of the cash-flow budget (50% of free cash flow =
  //                     income − spending − observed obligations; the same 50%
  //                     the split and starter packs use),
  //                     20× salary, product cap ), at the TOP of band B, floor 1,000
  //   max = the 24-month figure; min = 25% of max, floored to AED 1,000
  // The DBR cap alone is the regulatory ceiling, not what a household can carry:
  // a customer whose spending leaves AED 3,700/month must not be told he could
  // borrow against AED 5,100/month. maxByTermMonths caps each term the customer
  // can pick (shorter term → smaller amount). The NoorScore estimate is the
  // cash-flow proxy base (640) plus the connected-account factors only.
  // ---------------------------------------------------------------------------
  const PREQUAL = { productId: 'personal_loan', tenorMonths: 24, band: 'B', minShareOfMax: 0.25,
                    instalmentToFcfMaxPct: 50, termsMonths: [6, 12, 24], validForDays: 7 };
  function prequalify(applicant, consents) {
    ensureInit();
    if (!applicant || typeof applicant !== 'object') throw err('prequalify(applicant, consents) needs an applicant');
    if (!consents || consents.openFinance !== true) {
      throw err('pre-qualification reads connected accounts only — Open Finance consent (connected accounts via Al Tareq) is required');
    }
    const cn = applicant.connected || null, bd = applicant.bankData || null;
    const income = cn && Number.isFinite(cn.avgMonthlyIncome) ? cn.avgMonthlyIncome
                 : (bd && bd.source === 'ALTAREQ_TPP' && Number.isFinite(bd.avgSalaryCredit) ? bd.avgSalaryCredit : null);
    if (!Number.isFinite(income) || income <= 0) throw err('pre-qualification needs income seen in connected accounts — connect the salary account first');
    const months = (cn && cn.monthsAvailable) || (bd && bd.monthsAvailable) || 0;
    const observed = cn && Number.isFinite(cn.observedObligationsMonthly) ? cn.observedObligationsMonthly : 0;
    const spend = cn && Number.isFinite(cn.avgMonthlySpend) ? cn.avgMonthlySpend : null;
    const vol = cn && Number.isFinite(cn.incomeVolatilityPct) ? cn.incomeVolatilityPct : null;
    const pol = getPolicyRef(PREQUAL.productId);
    const reg = pol.regulatory, prm = pol.params;
    const dbrCap = dbrCapFor(reg, !!(applicant.employment && applicant.employment.retiree));
    const topRate = prm.pricingBands[PREQUAL.band][1];
    const tenor = Math.min(PREQUAL.tenorMonths, reg.tenorCapMonths, HARD.tenorCapMonths);
    const headroom = Math.round((dbrCap / 100) * income - observed);
    const fcf = Number.isFinite(spend) ? Math.round(income - spend - observed) : null;
    const fcfBudget = fcf === null ? null : Math.max(0, Math.floor((PREQUAL.instalmentToFcfMaxPct / 100) * fcf));
    const bySalary = Math.min(reg.salaryMultipleCap, HARD.salaryMultipleCap) * income;
    const maxFor = (n) => {
      const byDbr = headroom > 0 ? pvAnnuity(headroom, topRate / 12, n) : 0;
      const byFcf = fcfBudget === null ? Infinity : (fcfBudget > 0 ? pvAnnuity(fcfBudget, topRate / 12, n) : 0);
      return floor1000(Math.min(byDbr, byFcf, bySalary, prm.productCap));
    };
    const max = maxFor(tenor);
    const min = floor1000(PREQUAL.minShareOfMax * max);
    const maxByTermMonths = {};
    for (const n of PREQUAL.termsMonths) maxByTermMonths[n] = Math.min(maxFor(Math.min(n, reg.tenorCapMonths, HARD.tenorCapMonths)), max);
    // NoorScore estimate — no bureau yet: proxy base + what the accounts show.
    let est = CASH_FLOW_PROXY_BASE + 15;                 // salary seen in connected accounts
    if (months >= 12) est += 10;
    if (vol !== null && vol <= 20) est += 15;
    if (vol !== null && vol >= 40) est -= 25;
    if (fcf !== null && fcf >= 5000) est += 20;
    if (fcf !== null && fcf < 1500) est -= 30;
    const estBand = gradeToBand(pointsToGrade(est)) || 'C';
    const bandRange = prm.pricingBands[estBand];
    return {
      productId: PREQUAL.productId,
      indicativeMin: min,
      indicativeMax: max,
      maxByTermMonths,
      eligible: max > 0,
      noorScoreEstimateBand: noorScoreBand(est),
      basis: [
        'Income ' + aed(income) + '/month verified from ' + months + ' months of connected accounts',
        'Repayments already leaving your accounts: ' + aed(observed) + '/month',
        'Up to ' + dbrCap + '% of income may go to loan repayments (CBUAE)'
      ].concat(fcf === null ? [] : [
        'Left after spending and repayments: ' + aed(fcf) + '/month — a new loan is kept within ' + PREQUAL.instalmentToFcfMaxPct +
        '% of it (' + aed(fcfBudget) + '/month)'
      ]).concat([
        'Worked out over ' + tenor + ' months at up to ' + pctStr(topRate) + ' APR'
      ]),
      note: 'No credit bureau check yet — this does not affect your credit score',
      validForDays: PREQUAL.validForDays,
      validUntil: addDaysIso(D.TODAY, PREQUAL.validForDays),
      sources: ['OPEN_FINANCE'],
      assumptions: { tenorMonths: tenor, apr: topRate, dbrCapPct: dbrCap,
                     instalmentToFcfMaxPct: fcf === null ? null : PREQUAL.instalmentToFcfMaxPct,
                     instalmentBudgetMonthly: fcf === null ? Math.max(0, headroom) : Math.min(Math.max(0, headroom), fcfBudget) },
      // Indicative pricing for the estimated band (the loan screen's "from X% APR").
      indicativePricing: { band: estBand, aprMin: bandRange[0], aprMax: bandRange[1], aprMid: round4((bandRange[0] + bandRange[1]) / 2),
                           termsMonths: [6, 12, 24] }
    };
  }
  // Pure: the reducing-balance instalment Mizan uses for personal-loan KFS figures
  // (annual rate, 2-dp money) — for indicative quotes before a decision exists.
  function loanInstalment(principal, months, annualRate) {
    if (!Number.isFinite(principal) || principal <= 0 || !Number.isInteger(months) || months <= 0 || !Number.isFinite(annualRate) || annualRate < 0) {
      throw err('loanInstalment needs a positive principal, whole months and an annual rate');
    }
    return round2(annuityPayment(principal, annualRate / 12, months));
  }

  // ---------------------------------------------------------------------------
  // Car loan — a live quote for the car screen (Addendum v2.7). Pure: the same
  // evaluation decide() runs, but NO DecisionRecord, no audit entry, no clock tick.
  // It lets the screen show, per tenor, what the documents path and the Open Finance
  // path would finance before the customer decides. Consent-bound like decide():
  // AECB consent is required, and the Open Finance path (and so the uplift) is only
  // evaluated when the customer has granted Open Finance.
  // ---------------------------------------------------------------------------
  function quoteCar(application) {
    ensureInit();
    if (!application || typeof application !== 'object') throw err('quoteCar(application) needs {applicant, amount, tenorMonths, consents}');
    const { applicant, consents } = application;
    if (!applicant || typeof applicant !== 'object') throw err('application.applicant is required');
    if (!consents || consents.aecb !== true) {
      throw err('AECB consent is required before any bureau pull or credit decision (Federal Law 6/2010)');
    }
    const amount = application.amount, tenorMonths = application.tenorMonths;
    if (!Number.isFinite(amount) || amount <= 0) throw err('application.amount must be a positive number (AED)');
    if (!Number.isFinite(tenorMonths) || tenorMonths <= 0) throw err('application.tenorMonths must be a positive number');
    const vehicle = carVehicle(application.vehicle || applicant.vehicleQuote);
    const pol = getPolicyRef('car_loan');
    const amt = Math.round(amount), ten = Math.round(tenorMonths);
    const ev = evaluate('car_loan', applicant, amt, ten, pol, consents, null, { vehicle });
    return { productId: 'car_loan', amount: amt, requestedTenorMonths: ten, tenorMonths: ev.features.effectiveTenor,
             ltvMaxAmount: ev.features.ltvMaxAmount, openFinance: ev.features.openFinance,
             row: carRow(ev),
             openFinanceUplift: ev.features.openFinance ? carUplift(applicant, amt, ten, pol, consents, vehicle, ev) : null };
  }

  // ---------------------------------------------------------------------------
  // UAE red flags and early warning — exit-risk watch (Addendum v2.9,
  // ../RED-FLAGS-SPEC.md). About 88% of UAE residents are expatriates, so a borrower
  // leaving the country with the debt is a real credit risk; Open Finance shows the
  // behaviour that precedes it in the customer's own accounts, day zero.
  //
  // Guardrails — they ARE the product:
  //  - Signals are changes against the customer's OWN baseline, never attributes of
  //    who the customer is. The engine reads an allowlist of fields from
  //    subject.redFlagData (rfInputs) and nothing else: no nationality, no
  //    destination country of a transfer or trip, no religion, no service name.
  //  - Sending money home at the usual level is never a flag: only a surge against
  //    the customer's own 6-month share (the multiple can never be set below 1.5×).
  //  - Travel alone is never actioned (LOW = watch, no contact); it counts only in
  //    combination (the EXIT_RISK pattern), and only while a loan is open.
  //  - Origination: POL_RED_FLAGS can only REFER to an underwriter — never an
  //    automatic decline, never a price change.
  //  - Monitoring: actions start with contacting the customer; no default, legal
  //    step or account action follows from signals alone.
  //  - The lender of record gets at most a status flag, never values or account history.
  // Thresholds are params on a shared policy block (`earlyWarning`), published under
  // 4-eyes like every pack; the guardrails ride on the block as locked text.
  // ---------------------------------------------------------------------------
  const EW_BLOCK_ID = 'earlyWarning';
  const RF_CODES = ['RF_CARDS_MAXED', 'RF_REMITTANCE_SURGE', 'RF_TRAVEL_AFTER_DISBURSAL', 'RF_PAYMENTS_STOPPED', 'RF_BALANCES_DRAINED'];
  // The three signals POL_RED_FLAGS refers on. Travel and repayment signals need an open loan.
  const RF_ORIGINATION = ['RF_CARDS_MAXED', 'RF_REMITTANCE_SURGE', 'RF_BALANCES_DRAINED'];
  const RF_SEVERITY = { RF_CARDS_MAXED: 'MEDIUM', RF_REMITTANCE_SURGE: 'MEDIUM', RF_TRAVEL_AFTER_DISBURSAL: 'LOW',
                        RF_PAYMENTS_STOPPED: 'MEDIUM', RF_BALANCES_DRAINED: 'MEDIUM' };
  const RF_PRODUCTS = ['personal_loan', 'car_loan', 'split'];
  const EW_RANK = { HIGH: 0, 'MEDIUM+': 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  const EW_LENDER_STATUS = 'Early warning: elevated — Noor is in contact with the customer';
  const EW_PAUSED = ['Split capacity', 'Limit increases', 'Upgrade offers'];
  // The Al Tareq consent "why" line (BOTIM-V28-SPEC §8) — monitoring sits inside this scope.
  const EW_CONSENT_WHY = 'To work out what you can afford — and, while you have a loan with Noor, to spot early if repayments might become hard for you.';
  const EW_INT_KEYS = ['cardsMaxedMinCards', 'travelWindowDays', 'salaryLateDays', 'onTimeRunMin'];
  const EW_GUARDRAILS = [
    { key: 'ownBaseline', label: 'Own history only',
      text: 'Signals are changes against the customer’s own history — never attributes of who the customer is.' },
    { key: 'neverInputs', label: 'Never inputs',
      text: 'Nationality, the destination country of a transfer or a trip, religion and service names are never inputs. Mizan sees “international transfer” and “airline purchase”, nothing about where.' },
    { key: 'usualLevel', label: 'Usual level is never a flag',
      text: 'Sending money home at the customer’s usual level is never a flag — only a surge against their own 6-month share. The multiple cannot be set below 1.5×.' },
    { key: 'travelAlone', label: 'Travel alone is never actioned',
      text: 'People fly home for holidays. Travel only counts in combination; on its own it is a watch, with no contact.' },
    { key: 'originationReferOnly', label: 'Origination: refer only',
      text: 'A red flag can only refer an application to an underwriter — never an automatic decline, never a price change.' },
    { key: 'contactFirst', label: 'Monitoring: contact first',
      text: 'Actions start with contacting the customer. No automatic default, legal step or account action follows from signals alone.' },
    { key: 'reasonCodes', label: 'Explainable',
      text: 'Every flag has a reason code in English and Arabic and a plain explanation the analyst can read to the customer.' },
    { key: 'consentScope', label: 'Consent scope',
      text: 'The Al Tareq consent covers monitoring while a loan is open: “' + EW_CONSENT_WHY + '”' },
    { key: 'governance', label: 'Governance before LIVE',
      text: 'An offline disparate-impact test across customer groups runs before LIVE (group labels are used only for the test, never as features). CBUAE AI/ML guidance (Feb 2026) · Consumer Protection Regulation (fair treatment, collections conduct) · PDPL purpose limitation.' },
    { key: 'lenderStatusOnly', label: 'Lender of record: a status flag only',
      text: 'Partner Bank receives at most “' + EW_LENDER_STATUS + '” — never the account history or the signals’ values.' }
  ];
  const EW_LADDER = [
    { severity: 'NONE', code: 'NONE', text: 'No action.' },
    { severity: 'LOW', code: 'WATCH', text: 'Watch — no customer contact.' },
    { severity: 'MEDIUM', code: 'CHECK_IN', text: 'Same-day check-in on the customer’s chosen channel, offering a payment-date move or a restructure (8 hours; two or more signals: 4 hours).' },
    { severity: 'HIGH', code: 'SPECIALIST_CALL', text: 'Specialist call within 24 hours. New credit paused (split capacity, limit increases, upgrade offers). The lender of record gets a status flag only. No default or legal step.' }
  ];
  function defaultEarlyWarningBlock() {
    return {
      blockId: EW_BLOCK_ID, kind: 'SHARED_BLOCK', productId: null,
      nameEn: 'Early warning — UAE red flags', nameAr: 'الإنذار المبكر — مؤشرات المخاطر',
      appliesTo: ['personal_loan', 'car_loan', 'split', 'monitoring'],
      version: 1, publishedAt: null, publishedBy: 'system (default block)', approvedBy: 'system',
      guardrails: clone(EW_GUARDRAILS),     // locked — shown as text, never editable
      actionLadder: clone(EW_LADDER),       // locked
      consentWhy: EW_CONSENT_WHY,
      params: { redFlagsAtOrigination: true,
                cardsMaxedUtilisationPct: 90, cardsMaxedMinCards: 2, cardsMaxedRisePp: 30,
                remittanceShareOfIncomePct: 80, remittanceMultipleOfBaseline: 2,
                travelMinAmountAed: 1000, travelWindowDays: 30,
                salaryLateDays: 7, onTimeRunMin: 3,
                balanceDropPct: 80, outboundShareOfAvgBalancePct: 50 }
    };
  }
  function validateEarlyWarningParams(raw) {
    const pol = getPolicyRef(EW_BLOCK_ID);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw err('params must be an object');
    const bounds = PARAM_BOUNDS[EW_BLOCK_ID];
    for (const key of Object.keys(raw)) {
      if (key === 'guardrails' || key === 'actionLadder' || EW_GUARDRAILS.some(g => g.key === key)) {
        throw err('"' + key + '" is a locked guardrail of the early-warning block — shown as text, never editable');
      }
      if (!(key in pol.params)) {
        throw err('unknown parameter "' + key + '" for the early-warning block — signals read only the customer’s own history; nationality, destination, religion or a service name can never be a parameter');
      }
      const v = raw[key];
      if (key === 'redFlagsAtOrigination') {
        if (typeof v !== 'boolean') throw err('redFlagsAtOrigination must be true or false');
        continue;
      }
      if (!Number.isFinite(v)) throw err('parameter "' + key + '" must be a number');
      if (EW_INT_KEYS.includes(key) && !Number.isInteger(v)) throw err('parameter "' + key + '" must be a whole number');
      const bd = bounds[key];
      if (v < bd[0] || v > bd[1]) {
        throw err('parameter "' + key + '"=' + v + ' outside allowed bounds [' + bd[0] + ', ' + bd[1] + ']' +
                  (key === 'remittanceMultipleOfBaseline' && v < bd[0] ? ' — closer to 1× would flag sending money home at the usual level' : ''));
      }
    }
    return clone(raw);
  }

  // The ONLY fields the red-flag engine reads — an explicit allowlist out of
  // subject.redFlagData. Anything else on the subject (name, residency, a country
  // or nationality field, a destination on a transfer) is never touched.
  function rfNum(x) { return typeof x === 'number' && Number.isFinite(x) ? x : null; }
  function rfInputs(subject) {
    const rf = subject && typeof subject === 'object' ? subject.redFlagData : null;
    if (!rf || typeof rf !== 'object') throw err('redFlags(subject) needs subject.redFlagData {baseline, recent, aecb}');
    const b = rf.baseline || {}, r = rf.recent || {}, a = rf.aecb || {};
    const trips = Array.isArray(r.airlinePurchases) ? r.airlinePurchases : [];
    return {
      baseline: { intlShare6m: rfNum(b.intlTransfersShareOfIncome6m), salaryCreditDay: rfNum(b.salaryCreditDay),
                  avgBalance3m: rfNum(b.avgBalance3m), cardUtil3mAgo: rfNum(b.cardUtilisationPct3mAgo),
                  onTimeRun: rfNum(b.onTimePaymentsRun) },
      recent: { income: rfNum(r.incomeAed), intl: rfNum(r.intlTransfersAed),
                trips: trips.map(t => ({ days: t ? rfNum(t.daysAfterDisbursal) : null, amount: t ? rfNum(t.amountAed) : null })),
                salaryLateDays: rfNum(r.salaryLateDays), balanceNow: rfNum(r.balanceNowAed),
                largestOut: rfNum(r.largestOutboundTransferAed), missedCollection: r.missedCollection === true },
      aecb: { cards: rfNum(a.cards), limit: rfNum(a.cardLimitTotal), balance: rfNum(a.cardBalanceTotal) }
    };
  }
  const RF_EPS = 1e-9;
  const rf1 = (x) => x === null ? null : Math.round(x * 10) / 10;
  const rfAed = (x) => aed(Math.round(x));
  function rfFlag(code, fired, observed, baseline, threshold, values) {
    const rc = D.reasonCodes['RC_' + code] || {};
    return { code, fired, severity: RF_SEVERITY[code], reasonCode: 'RC_' + code, observed, baseline, threshold, values,
             en: rc.en || '', ar: rc.ar || '' };
  }
  // One check per signal — the comparisons the policy console describes (≥ at the threshold).
  function rfChecks(x, prm, phase) {
    const out = [];
    // RF_CARDS_MAXED — utilisation ≥ 90% across ≥ 2 cards AND up ≥ 30 pp vs 3 months ago.
    {
      const util = x.aecb.limit > 0 && x.aecb.balance !== null ? x.aecb.balance / x.aecb.limit * 100 : null;
      const was = x.baseline.cardUtil3mAgo;
      const rise = util !== null && was !== null ? util - was : null;
      const fired = util !== null && rise !== null && (x.aecb.cards || 0) >= prm.cardsMaxedMinCards &&
                    util >= prm.cardsMaxedUtilisationPct - RF_EPS && rise >= prm.cardsMaxedRisePp - RF_EPS;
      out.push(rfFlag('RF_CARDS_MAXED', fired,
        util === null ? 'no card file' : Math.round(util) + '% of card limits used · ' + (x.aecb.cards || 0) + ' card' + (x.aecb.cards === 1 ? '' : 's'),
        was === null ? 'no 3-month history' : was + '% three months ago',
        '≥ ' + prm.cardsMaxedUtilisationPct + '% across ≥ ' + prm.cardsMaxedMinCards + ' cards, up ≥ ' + prm.cardsMaxedRisePp + ' pp',
        { utilisationPct: rf1(util), utilisationPct3mAgo: was, risePp: rf1(rise), cards: x.aecb.cards }));
    }
    // RF_REMITTANCE_SURGE — 30-day international transfers ≥ 80% of income AND ≥ 2× the customer's own 6-month share.
    {
      const share = x.recent.income > 0 && x.recent.intl !== null ? x.recent.intl / x.recent.income : null;
      const base = x.baseline.intlShare6m;
      const fired = share !== null && base !== null && share * 100 >= prm.remittanceShareOfIncomePct - RF_EPS &&
                    share >= prm.remittanceMultipleOfBaseline * base - RF_EPS;
      out.push(rfFlag('RF_REMITTANCE_SURGE', fired,
        share === null ? 'no income seen' : Math.round(share * 100) + '% of income in international transfers (30 days)',
        base === null ? 'no 6-month baseline' : Math.round(base * 100) + '% usual (own 6-month share)',
        '≥ ' + prm.remittanceShareOfIncomePct + '% of income and ≥ ' + prm.remittanceMultipleOfBaseline + '× the usual share',
        { sharePct: share === null ? null : rf1(share * 100), baselinePct: base === null ? null : rf1(base * 100),
          multiple: share !== null && base > 0 ? rf1(share / base) : null }));
    }
    // RF_TRAVEL_AFTER_DISBURSAL — monitoring only: an airline purchase ≥ AED 1,000 within 30 days after disbursal.
    if (phase === 'MONITORING') {
      const hits = x.recent.trips.filter(t => t.days !== null && t.days >= 0 && t.days <= prm.travelWindowDays &&
                                              t.amount !== null && t.amount >= prm.travelMinAmountAed - RF_EPS);
      const t0 = hits[0] || null;
      out.push(rfFlag('RF_TRAVEL_AFTER_DISBURSAL', !!t0,
        t0 ? 'Airline purchase ' + rfAed(t0.amount) + ', ' + t0.days + ' days after the loan was paid out' : 'no airline purchase in the window',
        'travel alone is never actioned',
        '≥ ' + aed(prm.travelMinAmountAed) + ' within ' + prm.travelWindowDays + ' days after disbursal',
        { amountAed: t0 ? t0.amount : null, daysAfterDisbursal: t0 ? t0.days : null, purchases: hits.length }));
    }
    // RF_PAYMENTS_STOPPED — monitoring only: salary ≥ 7 days late vs its established day, or a missed
    // collection after a run of ≥ 3 on time.
    if (phase === 'MONITORING') {
      const late = x.recent.salaryLateDays, run = x.baseline.onTimeRun;
      const lateFired = late !== null && late >= prm.salaryLateDays - RF_EPS;
      const missFired = x.recent.missedCollection && run !== null && run >= prm.onTimeRunMin;
      const obs = [];
      if (late !== null && late > 0) obs.push('Salary ' + late + ' day' + (late === 1 ? '' : 's') + ' late');
      if (x.recent.missedCollection) obs.push('missed collection after ' + (run || 0) + ' on time');
      out.push(rfFlag('RF_PAYMENTS_STOPPED', lateFired || missFired,
        obs.length ? obs.join(' · ') : 'salary on time · no missed collection',
        (x.baseline.salaryCreditDay !== null ? 'salary usually lands on day ' + x.baseline.salaryCreditDay : 'established salary day') +
          (run !== null ? ' · ' + run + ' on-time repayment' + (run === 1 ? '' : 's') + ' in a row' : ''),
        '≥ ' + prm.salaryLateDays + ' days late, or a missed collection after ≥ ' + prm.onTimeRunMin + ' on time',
        { salaryLateDays: late, missedCollection: x.recent.missedCollection, onTimeRun: run, salaryLate: lateFired, missedAfterRun: missFired }));
    }
    // RF_BALANCES_DRAINED — balances down ≥ 80% vs the 3-month average AND one outgoing transfer ≥ 50% of that average.
    {
      const avg = x.baseline.avgBalance3m, now = x.recent.balanceNow, outT = x.recent.largestOut;
      const drop = avg > 0 && now !== null ? (avg - now) / avg : null;
      const fired = drop !== null && outT !== null && drop * 100 >= prm.balanceDropPct - RF_EPS &&
                    outT >= prm.outboundShareOfAvgBalancePct / 100 * avg - RF_EPS;
      out.push(rfFlag('RF_BALANCES_DRAINED', fired,
        drop === null ? 'no balance history' : 'Balances ' + rfAed(now) + ' (' + (drop >= 0 ? '−' : '+') + Math.round(Math.abs(drop) * 100) + '%)' +
          (outT !== null ? ' · largest transfer out ' + rfAed(outT) : ''),
        avg === null ? 'no 3-month average' : rfAed(avg) + ' average (3 months)',
        'down ≥ ' + prm.balanceDropPct + '% and one transfer out ≥ ' + prm.outboundShareOfAvgBalancePct + '% of the average',
        { balanceNowAed: now, avgBalance3mAed: avg, dropPct: drop === null ? null : rf1(drop * 100), largestOutboundAed: outT,
          outboundShareOfAvgPct: avg > 0 && outT !== null ? rf1(outT / avg * 100) : null }));
    }
    return out;
  }
  function rfAction(phase, severity, escalated, flags) {
    if (phase === 'ORIGINATION') {
      return flags.some(f => RF_ORIGINATION.includes(f.code))
        ? { code: 'UNDERWRITER_REVIEW', en: 'Refer to an underwriter — a person reviews the case. Never an automatic decline, never a price change.', slaHours: null }
        : { code: 'NONE', en: 'No action — nothing changed against the customer’s own history.', slaHours: null };
    }
    if (severity === 'HIGH') {
      return { code: 'SPECIALIST_CALL', en: 'Specialist call within 24 hours. New credit paused; the lender of record gets a status flag only; no default or legal step.',
               slaHours: 24, pausesNewCredit: EW_PAUSED.slice(), lenderStatus: EW_LENDER_STATUS };
    }
    if (severity === 'MEDIUM') {
      const salaryLate = flags.some(f => f.code === 'RF_PAYMENTS_STOPPED' && f.values.salaryLate);
      const offer = salaryLate ? 'PAYMENT_DATE_MOVE' : 'PAYMENT_DATE_MOVE_OR_RESTRUCTURE';
      const offerText = salaryLate ? 'offer to move the payment date to when the salary lands' : 'offer a payment-date move or a restructure';
      return escalated
        ? { code: 'CHECK_IN', en: 'Check-in sooner (two or more signals) on the customer’s chosen channel — ' + offerText + '.', slaHours: 4, offer }
        : { code: 'CHECK_IN', en: 'Same-day check-in on the customer’s chosen channel — ' + offerText + '.', slaHours: 8, offer };
    }
    if (severity === 'LOW') return { code: 'WATCH', en: 'Watch — no customer contact. Travel alone is never actioned.', slaHours: null };
    return { code: 'NONE', en: 'No action — nothing changed against the customer’s own history.', slaHours: null };
  }
  // Pure: the same subject and params always give the same result; no clock tick, no state.
  function redFlagsWith(subject, phase, prm) {
    const x = rfInputs(subject);
    const checks = rfChecks(x, prm, phase);
    const flags = checks.filter(c => c.fired);
    const has = (c) => flags.some(f => f.code === c);
    let severity = 'NONE', pattern = null, escalated = false;
    if (phase === 'MONITORING' && has('RF_TRAVEL_AFTER_DISBURSAL') && (has('RF_REMITTANCE_SURGE') || has('RF_BALANCES_DRAINED')) &&
        (has('RF_PAYMENTS_STOPPED') || has('RF_CARDS_MAXED'))) {
      severity = 'HIGH'; pattern = 'EXIT_RISK';
    } else {
      const medium = flags.filter(f => f.severity === 'MEDIUM').length;
      if (medium >= 2) { severity = 'MEDIUM'; escalated = true; }
      else if (medium === 1) severity = 'MEDIUM';
      else if (flags.length) severity = 'LOW';
    }
    const severityLabel = escalated ? 'MEDIUM+' : severity;
    const notes = ['Compared with the customer’s own history only. Not read: nationality, where money or a trip goes, religion, or any service name.'];
    const remit = checks.find(c => c.code === 'RF_REMITTANCE_SURGE');
    let noFlagNote = null;
    if (remit && !remit.fired && remit.values.sharePct > 0 && remit.values.baselinePct !== null) {
      const t = 'sending money home at the usual level (' + Math.round(remit.values.sharePct) + '%, baseline ' + Math.round(remit.values.baselinePct) + '%)';
      notes.push('Not a flag: ' + t + '.');
      if (!flags.length) noFlagNote = 'No flag — ' + t;
    }
    if (phase === 'ORIGINATION') {
      notes.push('A red flag can only refer to an underwriter — never an automatic decline, never a price change.');
      notes.push('Travel and repayment signals are read only while a loan is open.');
    } else {
      if (severity === 'LOW' && has('RF_TRAVEL_AFTER_DISBURSAL')) notes.push('Travel alone is never actioned — watch only, no customer contact.');
      if (severity === 'MEDIUM') notes.push('The check-in offers help (a payment-date move or a restructure); it is not a collections step.');
      if (severity === 'HIGH') notes.push('New credit paused (split capacity, limit increases, upgrade offers). The lender of record gets a status flag only. No default or legal step.');
      notes.push('Actions start with contacting the customer — no default, legal step or account action follows from signals alone.');
    }
    return { phase, severity, severityLabel, escalated, pattern,
             flags, checks,
             notEvaluated: phase === 'ORIGINATION' ? ['RF_TRAVEL_AFTER_DISBURSAL', 'RF_PAYMENTS_STOPPED'] : [],
             action: rfAction(phase, severity, escalated, flags),
             guardrailNotes: notes, noFlagNote,
             lenderStatus: phase === 'MONITORING' && severity === 'HIGH' ? EW_LENDER_STATUS : null };
  }
  function ewParamsFor(override) {
    const live = getPolicyRef(EW_BLOCK_ID).params;
    return override ? Object.assign({}, live, validateEarlyWarningParams(override)) : live;
  }
  // Public: redFlags(subject, {phase:'ORIGINATION'|'MONITORING', params?}) — params (a draft) are
  // bounds-checked like a publish, so no caller can set a threshold the console could not.
  function redFlags(subject, opts) {
    ensureInit();
    const phase = (opts && opts.phase) || 'MONITORING';
    if (phase !== 'ORIGINATION' && phase !== 'MONITORING') throw err('redFlags phase must be ORIGINATION or MONITORING');
    return redFlagsWith(subject, phase, ewParamsFor(opts && opts.params));
  }
  // Origination gate: only for split / personal loan / car loan, only when the applicant carries
  // redFlagData AND granted Open Finance consent (the signals come from their own accounts).
  function gateRedFlags(p, raw, consents, productId, ewOverride) {
    if (!RF_PRODUCTS.includes(productId) || !raw || !raw.redFlagData || !consents || consents.openFinance !== true) return p;
    const prm = ewParamsFor(ewOverride);
    p.redFlagGate = prm.redFlagsAtOrigination ? { on: true, result: redFlagsWith(raw, 'ORIGINATION', prm) } : { on: false, result: null };
    return p;
  }
  function redFlagRule(rs, p) {
    const g = p && p.redFlagGate;
    if (!g) return;
    const name = 'Red flags — recent changes against the customer’s own history (refer only: never a decline, never a price change)';
    const threshold = 'refers on ' + RF_ORIGINATION.join(' · ');
    if (!g.on) {
      rs.add('POL_RED_FLAGS', name, 'POLICY', 'INFO', 'off by policy (earlyWarning.redFlagsAtOrigination = false)', threshold, null);
      return;
    }
    const fired = g.result.flags.filter(f => RF_ORIGINATION.includes(f.code)).map(f => f.code);
    rs.add('POL_RED_FLAGS', name, 'POLICY', fired.length ? 'REFER' : 'PASS',
           fired.length ? fired.join(' · ') : 'no signal fired', threshold, 'RC_RED_FLAGS_REVIEW');
  }
  // The signal codes sit on the record as features; the full result rides on ev.redFlags.
  function attachRedFlags(ev) {
    const g = ev && ev.profile && ev.profile.redFlagGate;
    if (!g) return ev;
    ev.features.redFlagsAtOrigination = g.on;
    if (g.on) {
      const referred = g.result.flags.some(f => RF_ORIGINATION.includes(f.code));
      ev.features.redFlagSignals = g.result.flags.map(f => f.code);
      ev.features.redFlagSeverity = g.result.severityLabel;
      ev.redFlags = Object.assign({ ruleOn: true, referred }, g.result);
    } else {
      ev.redFlags = { ruleOn: false, referred: false, phase: 'ORIGINATION', severity: null, severityLabel: null, escalated: false, pattern: null,
                      flags: [], checks: [], notEvaluated: RF_CODES.slice(), action: null,
                      guardrailNotes: ['The red-flag rule is off by policy — signals were not read for this decision.'],
                      noFlagNote: null, lenderStatus: null };
    }
    return ev;
  }
  function ewCounts(rows) {
    const c = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
    for (const r of rows) c[r.severity]++;
    return c;
  }
  // Pure + deterministic: one row per monitored loan, sorted HIGH → MEDIUM+ → MEDIUM → LOW → NONE (then by loan id).
  function earlyWarningScan(opts) {
    ensureInit();
    const prm = ewParamsFor(opts && opts.params);
    const rows = (D.monitoredLoans || []).map(l => {
      const r = redFlagsWith(l, 'MONITORING', prm);
      const action = Object.assign({ channel: r.action.code === 'CHECK_IN' ? (l.contactChannel || 'In-app message')
                                            : (r.action.code === 'SPECIALIST_CALL' ? 'Phone — specialist' : null) }, r.action);
      return { loanId: l.id, customer: l.customer, productId: l.productId, amountAed: l.amountAed, tenorMonths: l.tenorMonths || null,
               disbursedAt: l.disbursedAt, severity: r.severity, severityLabel: r.severityLabel, escalated: r.escalated, pattern: r.pattern,
               flags: r.flags, checks: r.checks, action, guardrailNotes: r.guardrailNotes, noFlagNote: r.noFlagNote, lenderStatus: r.lenderStatus };
    });
    return rows.sort((a, b) => (EW_RANK[a.severityLabel] - EW_RANK[b.severityLabel]) || (a.loanId < b.loanId ? -1 : a.loanId > b.loanId ? 1 : 0));
  }
  // Simulate a draft early-warning block before publishing: the monitored book, and every loan
  // persona that carries redFlagData decided with the live block and with the draft (pure).
  function simulateEarlyWarning(draftParams) {
    ensureInit();
    const params = validateEarlyWarningParams(draftParams || {});
    const cand = Object.assign({}, getPolicyRef(EW_BLOCK_ID).params, params);
    const before = earlyWarningScan(), after = earlyWarningScan({ params: cand });
    const changes = after.filter(a => {
      const b = before.find(x => x.loanId === a.loanId);
      return b.severityLabel !== a.severityLabel || b.flags.map(f => f.code).join() !== a.flags.map(f => f.code).join();
    }).map(a => {
      const b = before.find(x => x.loanId === a.loanId);
      return { loanId: a.loanId, customer: a.customer, from: b.severityLabel, to: a.severityLabel,
               flagsFrom: b.flags.map(f => f.code), flagsTo: a.flags.map(f => f.code) };
    });
    const pol = getPolicyRef('personal_loan');
    const consents = { aecb: true, openFinance: true };
    const origination = (D.personasLoan || []).filter(p => p.redFlagData).map(p => {
      const rq = p.defaultRequest || { amount: 10000, tenorMonths: 12 };
      const b = evaluate('personal_loan', p, rq.amount, rq.tenorMonths, pol, consents, null);
      const a = evaluate('personal_loan', p, rq.amount, rq.tenorMonths, pol, consents, null, { earlyWarningParams: cand });
      return { id: p.id, name: p.name, from: b.outcome, to: a.outcome, amountFrom: b.limit.approved, amountTo: a.limit.approved,
               pricingUnchanged: JSON.stringify(b.pricing) === JSON.stringify(a.pricing) };
    });
    const cb = ewCounts(before), ca = ewCounts(after);
    return { before: cb, after: ca, changes, origination,
             summary: 'Scanned ' + after.length + ' monitored loans vs early-warning block v' + getPolicyRef(EW_BLOCK_ID).version +
                      ': HIGH ' + cb.HIGH + ' → ' + ca.HIGH + ', MEDIUM ' + cb.MEDIUM + ' → ' + ca.MEDIUM + ', LOW ' + cb.LOW + ' → ' + ca.LOW +
                      ', NONE ' + cb.NONE + ' → ' + ca.NONE + ' (' + changes.length + ' row' + (changes.length === 1 ? '' : 's') + ' changed).' };
  }
  // The analyst asks the customer (Workbench): a note on the record and a customer message in
  // English + Arabic from the reason code — RC_RED_FLAGS_REVIEW on a red-flag referral. The
  // case stays open; the refer SLA keeps running.
  function askCustomer(decisionId, req) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.outcome !== 'REFER' || rec.override) throw err('askCustomer applies only to open REFER decisions');
    if (rec.supersededBy) throw err(decisionId + ' was superseded by ' + rec.supersededBy + ' — work on the newer decision');
    if (!req || typeof req.analyst !== 'string' || !req.analyst.trim()) throw err('askCustomer requires the analyst’s name');
    const rf = rec.redFlags && rec.redFlags.referred ? rec.redFlags : null;
    const code = rf ? 'RC_RED_FLAGS_REVIEW' : (rec.reasonCodes[0] || 'RC_MANUAL_REVIEW');
    const rc = D.reasonCodes[code] || { en: code, ar: '' };
    const at = nowIso();
    const q = { at, analyst: req.analyst.trim(), channel: (typeof req.channel === 'string' && req.channel.trim()) || 'In-app message',
                note: typeof req.note === 'string' ? req.note.trim() : '',
                message: { reasonCode: code, en: rc.en, ar: rc.ar },
                explanations: rf ? rf.flags.map(f => ({ code: f.reasonCode, en: f.en, ar: f.ar })) : [] };
    rec.customerQueries = (rec.customerQueries || []).concat([q]);
    rec.audit.push({ at, actor: q.analyst, action: 'CUSTOMER_ASKED', detail: code + ' · ' + q.channel + (q.note ? ' · ' + q.note : '') });
    return rec;
  }

  // Convenience for simulation — same logic, no side effects, no record stored.
  function rowAmount(row) {
    return row.amount !== undefined ? row.amount : (row.purchaseAmount !== undefined ? row.purchaseAmount : 100000);
  }
  // Starter-loan rows carry no request: the upgrade is offered up to the tier ceiling.
  function rowRequest(productId, row) {
    return productId === 'starter_loan' ? [null, null] : [rowAmount(row), row.tenorMonths || 12];
  }
  function decideRaw(productId, sampleRow) {
    ensureInit();
    const pol = getPolicyRef(productId);
    const rq = rowRequest(productId, sampleRow);
    const ev = evaluate(productId, sampleRow, rq[0], rq[1], pol);
    return { outcome: ev.outcome, reasonCodes: ev.reasonCodes.slice(),
             grade: ev.score.grade, approved: ev.limit.approved,
             bindingConstraint: ev.limit.bindingConstraint, dbrPct: ev.features.dbrPct };
  }

  function bookFor(productId) {
    if (productId === 'starter_loan') return D.sampleBook.starter_loan;
    if (productId === 'car_loan') return D.sampleBook.car_loan || [];
    return productId === 'split' ? D.sampleBook.split : D.sampleBook.personal_loan;  // salary_advance reuses the loan book
  }

  function simulateBook(productId, candidateParams) {
    ensureInit();
    const pol = getPolicyRef(productId);
    const params = validateParams(productId, candidateParams);
    const book = bookFor(productId);
    const candidate = clone(pol);
    for (const key of Object.keys(params)) candidate.params[key] = clone(params[key]);
    const before = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const after = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const flips = [];
    let flipCount = 0;
    // Starter loan: the economic effect of a pricing change, summed over the rows
    // each policy approves, at each row's default option (the ceiling amount at
    // the longest tenor that fits).
    const isUpgrade = productId === 'starter_loan';
    const econ = { b: { n: 0, apr: 0, pi: 0 }, a: { n: 0, apr: 0, pi: 0 } };
    const tally = (acc, ev) => {
      const d = ev.outcome === 'APPROVE' && ev.upgrade ? ev.upgrade.defaultSelection : null;
      if (d) { acc.n++; acc.apr += d.apr; acc.pi += d.partnerIncome; }
    };
    // Car loan (v2.7): most policy changes move amounts, not outcomes — sum the approved
    // amounts and count the approvals that shrink or grow.
    const isCar = productId === 'car_loan';
    const amt = { b: 0, a: 0, reduced: 0, raised: 0 };
    for (const row of book) {
      const rq = rowRequest(productId, row);
      const b = evaluate(productId, row, rq[0], rq[1], pol);
      const a = evaluate(productId, row, rq[0], rq[1], candidate);
      before[b.outcome]++; after[a.outcome]++;
      if (isUpgrade) { tally(econ.b, b); tally(econ.a, a); }
      if (isCar) {
        if (b.outcome === 'APPROVE') amt.b += b.limit.approved;
        if (a.outcome === 'APPROVE') amt.a += a.limit.approved;
        if (b.outcome === 'APPROVE' && a.outcome === 'APPROVE') {
          if (a.limit.approved < b.limit.approved) amt.reduced++;
          else if (a.limit.approved > b.limit.approved) amt.raised++;
        }
      }
      if (b.outcome !== a.outcome) {
        flipCount++;
        if (flips.length < 20) {
          const why = a.reasonCodes.find(c => !b.reasonCodes.includes(c)) ||
                      b.reasonCodes.find(c => !a.reasonCodes.includes(c)) ||
                      a.reasonCodes[0] || 'RC_MANUAL_REVIEW';
          flips.push({ id: row.id, from: b.outcome, to: a.outcome, why });
        }
      }
    }
    const summary = 'Simulated ' + book.length + ' applications vs policy v' + pol.version +
      ': approvals ' + before.APPROVE + ' → ' + after.APPROVE +
      ', refers ' + before.REFER + ' → ' + after.REFER +
      ', declines ' + before.DECLINE + ' → ' + after.DECLINE +
      ' (' + flipCount + ' outcome flips).';
    if (isCar) {
      const amountImpact = { approvedAmountBefore: amt.b, approvedAmountAfter: amt.a, approvalsReduced: amt.reduced, approvalsRaised: amt.raised };
      return { size: book.length, before, after, flips, amountImpact,
               summary: summary + ' Approved amount across approvals ' + aed(amt.b) + ' → ' + aed(amt.a) +
                        ' (' + amt.reduced + ' approval' + (amt.reduced === 1 ? '' : 's') + ' reduced, ' + amt.raised + ' raised).' };
    }
    if (!isUpgrade) return { size: book.length, before, after, flips, summary };
    const pricingImpact = {
      avgAprBefore: econ.b.n ? round4(econ.b.apr / econ.b.n) : null,
      avgAprAfter: econ.a.n ? round4(econ.a.apr / econ.a.n) : null,
      partnerIncomeBefore: round2(econ.b.pi),
      partnerIncomeAfter: round2(econ.a.pi),
      approvedBefore: econ.b.n, approvedAfter: econ.a.n
    };
    const impactLine = ' At each approved customer\'s default option: average APR ' +
      (pricingImpact.avgAprBefore === null ? '—' : pctStr(pricingImpact.avgAprBefore)) + ' → ' +
      (pricingImpact.avgAprAfter === null ? '—' : pctStr(pricingImpact.avgAprAfter)) + ', partner income ' +
      money(pricingImpact.partnerIncomeBefore) + ' → ' + money(pricingImpact.partnerIncomeAfter) + '.';
    return { size: book.length, before, after, flips, summary: summary + impactLine, pricingImpact };
  }

  // ---------------------------------------------------------------------------
  // Starter-loan upgrade: the customer shapes the offer (Addendum v2.1).
  // Both calls read the terms FROZEN on the decision (curve, budgets, bounds), so
  // a policy published later never changes an offer already made.
  // ---------------------------------------------------------------------------
  function upgradeRecord(decisionId, fn) {
    const rec = getDecisionRef(decisionId);
    if (rec.kind !== 'UPGRADE') throw err(fn + ' applies to starter-loan upgrade decisions only (' + decisionId + ' is ' + rec.productId + ')');
    if (!rec.upgrade) throw err('no upgrade offer on ' + decisionId + ' (outcome ' + rec.outcome + ') — starter terms continue');
    return rec;
  }
  // Every option 1..maxTenor at one amount. The amount is snapped to the amount
  // step and clamped into [minAmount, maxAmount]; `amount` in the result is the
  // one actually quoted.
  function quoteUpgrade(decisionId, amount) {
    ensureInit();
    const rec = upgradeRecord(decisionId, 'quoteUpgrade');
    if (!Number.isFinite(amount)) throw err('quoteUpgrade needs an amount in AED');
    const up = rec.upgrade;
    const snapped = Math.round(amount / up.amountStep) * up.amountStep;
    const used = Math.min(up.maxAmount, Math.max(up.minAmount, snapped));
    return { amount: used, requested: amount, clamped: used !== amount, options: upgradeOptionsFor(up, used) };
  }
  // Store the customer's choice. Refuses an option that does not fit, anything
  // outside the offer, and any change once OFFER_ACCEPTED is recorded.
  function selectUpgradeOption(decisionId, choice) {
    ensureInit();
    const rec = upgradeRecord(decisionId, 'selectUpgradeOption');
    if (rec.outcome !== 'APPROVE') throw err('options can only be chosen on an approved upgrade (outcome is ' + rec.outcome + ')');
    if (rec.supersededBy) throw err('this offer was superseded by ' + rec.supersededBy + ' — choose on the newer decision');
    if (rec.events.length > 0) {
      throw err('the option is fixed — the offer was already accepted (OFFER_ACCEPTED recorded ' + rec.events[0].at + ')');
    }
    if (!choice || !Number.isFinite(choice.amount) || !Number.isFinite(choice.months)) {
      throw err('selectUpgradeOption needs {amount, months}');
    }
    const up = rec.upgrade;
    const amount = choice.amount, months = choice.months;
    if (!Number.isInteger(months) || months < 1 || months > up.maxTenorMonths) {
      throw err('outside the offer — the term must be 1 to ' + up.maxTenorMonths + ' months (asked ' + months + ')');
    }
    const onStep = Math.abs(amount / up.amountStep - Math.round(amount / up.amountStep)) < 1e-9;
    if (amount < up.minAmount || amount > up.maxAmount || !onStep) {
      throw err('outside the offer — the amount must be ' + aed(up.minAmount) + ' to ' + aed(up.maxAmount) +
                ' in steps of ' + aed(up.amountStep) + ' (asked ' + aed(amount) + ')');
    }
    const opt = upgradeOptionsFor(up, amount)[months - 1];
    if (!opt.fits) {
      throw err('this option does not fit — ' + aed(amount) + ' over ' + months + ' month' + (months === 1 ? '' : 's') + ': ' +
                opt.detail + ' (' + opt.reason + ')');
    }
    const at = nowIso();
    rec.selection = { amount, months, apr: opt.apr, monthlyPayment: opt.monthlyPayment, totalRepayable: opt.totalRepayable,
                      totalInterest: opt.totalInterest, partnerIncome: opt.partnerIncome, dbrPct: opt.dbrPct, selectedAt: at };
    // Repayment collection follows the chosen amount (v2.3): AED 1,000 → Al Tareq, AED 1,100 → direct debit.
    rec.repayment = repaymentFor(amount);
    // Token conditions refreshed: the repayment line follows the method, and the
    // "choose an option" line becomes the option itself.
    if (rec.token) {
      const line = 'Selected option: ' + aed(amount) + ' over ' + months + ' month' + (months === 1 ? '' : 's') + ' at ' +
                   pctStr(opt.apr) + ' APR (' + money(opt.monthlyPayment) + '/mo) — fixed when the offer is accepted';
      const kept = rec.token.conditions
        .filter(c => c !== UPGRADE_CHOICE_PENDING && !/^Selected option: /.test(c) && !REPAYMENT_CONDITIONS.includes(c));
      const at1 = kept.indexOf(KFS_CONDITION) + 1;
      kept.splice(at1, 0, REPAYMENT_METHODS[rec.repayment.method].condition);
      rec.token.conditions = kept.concat([line]);
    }
    rec.audit.push({ at, actor: 'customer', action: 'OPTION_SELECTED',
                     detail: aed(amount) + ' · ' + months + ' months · APR ' + pctStr(opt.apr) + ' · ' + money(opt.monthlyPayment) +
                             '/mo · partner income ' + money(opt.partnerIncome) + ' · DBR ' + opt.dbrPct + '% · repayment ' +
                             rec.repayment.label });
    return rec;
  }

  function getDecisionRef(decisionId) {
    const r = S.byId[decisionId];
    if (!r) throw err('unknown decision id "' + decisionId + '"');
    return r;
  }

  // "Split another purchase" — a lightweight check against the remaining split
  // capacity of an approved split decision (NOT a re-underwrite):
  //   remaining = capacity − first plan principal − previously split amounts
  //   arrears flag → blocked (RC_DRAWDOWN_ARREARS); deterioration flag → blocked
  //   for review (RC_MANUAL_REVIEW); amount > remaining → blocked (RC_DRAWDOWN_LIMIT).
  // Affordability stays live: the new plan's instalment, added to the
  // instalments already running on this capacity, must fit both the FCF and the
  // DBR budgets captured at decision time. If the requested term (default 6)
  // breaches, the shortest longer term that fits is used (plan.adjusted = true);
  // if none fits, the split is blocked with RC_FREE_CASH_FLOW.
  function drawdownCheck(decisionId, amount, flags) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.productId !== 'split') throw err('drawdownCheck applies to split capacity only ("Split another purchase")');
    if (rec.outcome !== 'APPROVE') throw err('drawdownCheck requires an approved split (decision is ' + rec.outcome + ')');
    if (!Number.isFinite(amount) || amount <= 0) throw err('purchase amount must be a positive number (AED)');
    const f = flags || {};
    const pol = getPolicyRef('split');
    const terms = splitTerms(pol.regulatory);
    const reqMonths = f.months !== undefined ? f.months : 6;
    if (!terms.includes(reqMonths)) throw err('flags.months must be one of ' + terms.join(', ') + ' (permitted split terms)');

    const draws = S.splitDraws[decisionId] || [];
    const drawn = draws.reduce((s, d) => s + d.amount, 0);
    const capacity = rec.limit.capacity || 0;
    const used = rec.limit.approved + drawn;
    const remaining = Math.max(0, capacity - used);
    const feeRate = rec.pricing && rec.pricing.monthlyFeeRate ? rec.pricing.monthlyFeeRate : pol.params.monthlyFeeRate.C;

    // Instalments already running on this capacity (first plan + earlier splits).
    const firstPlan = rec.pricing && rec.pricing.plans
      ? rec.pricing.plans.find(pl => pl.months === rec.limit.planMonths) : null;
    const running = (firstPlan ? firstPlan.monthlyPayment : 0) + draws.reduce((s, d) => s + d.monthlyPayment, 0);
    const budget = Math.min(rec.features.instalmentBudgetFcf, rec.features.instalmentBudgetDbr);
    let months = reqMonths, plan = splitPlan(amount, months, feeRate), affordable = running + plan.monthlyPayment <= budget;
    if (!affordable) {
      for (const n of terms.filter(n => n > reqMonths)) {
        const pl = splitPlan(amount, n, feeRate);
        if (running + pl.monthlyPayment <= budget) { months = n; plan = pl; affordable = true; break; }
      }
    }

    const reasonCodes = [];
    if (f.arrears === true) reasonCodes.push('RC_DRAWDOWN_ARREARS');
    if (f.deterioration === true) reasonCodes.push('RC_MANUAL_REVIEW');
    if (amount > remaining) reasonCodes.push('RC_DRAWDOWN_LIMIT');
    else if (!affordable) reasonCodes.push('RC_FREE_CASH_FLOW');
    const allowed = reasonCodes.length === 0;
    const at = nowIso();
    if (allowed) {
      draws.push({ amount, months, monthlyPayment: plan.monthlyPayment, at });
      S.splitDraws[decisionId] = draws;
    }
    const remainingAfter = allowed ? remaining - amount : remaining;
    // Each split is its own purchase plan, so it gets its own collection rail (v2.3).
    const repayment = allowed ? repaymentFor(amount) : null;
    rec.audit.push({ at, actor: 'engine', action: 'SPLIT_CHECK',
                     detail: (allowed ? 'allowed' : 'blocked') + ' · ' + aed(amount) + ' · Pay in ' + months +
                             (reasonCodes.length ? ' · ' + reasonCodes.join(',') : '') +
                             (repayment ? ' · repayment ' + repayment.label : '') });
    return { allowed, amount, remainingAfter, reasonCodes, repayment,
             plan: { months, requestedMonths: reqMonths, adjusted: months !== reqMonths,
                     monthlyPayment: plan.monthlyPayment, monthlyFee: plan.monthlyFee,
                     planTotal: plan.planTotal, aprEquivalent: plan.aprEquivalent } };
  }

  // Conventional execution sequencing: the product layer posts contract events
  // against the decision; any out-of-order event throws, naming the expected next
  // step and the consumer-protection reason. This IS the "an approval is not a
  // loan" demo.
  function recordEvent(decisionId, eventType) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (!EXEC_EVENTS.includes(eventType)) {
      throw err('unknown execution event "' + eventType + '" — valid events: ' + EXEC_EVENTS.join(' → '));
    }
    if (rec.outcome !== 'APPROVE') throw err('execution events can only be recorded against an approved decision (outcome is ' + rec.outcome + ')');
    if (rec.supersededBy) throw err(decisionId + ' was superseded by ' + rec.supersededBy + ' — execute the newer decision');
    if (rec.status === 'EXECUTED') throw err('agreement already fully executed for ' + decisionId);
    const expected = EXEC_EVENTS[rec.events.length];
    if (eventType !== expected) {
      throw err('out of sequence — expected ' + expected + ' next (' + EXEC_STEP_INFO[expected].guard + ')');
    }
    // An upgrade offer is a menu: the customer must pick amount × tenor first.
    if (eventType === 'OFFER_ACCEPTED' && rec.kind === 'UPGRADE' && !rec.selection) {
      throw err('choose an option before accepting — select an amount and term (selectUpgradeOption) first');
    }
    const at = nowIso();
    const event = { type: eventType, at };
    if (eventType === 'REPAYMENT_SET_UP') {
      // The method is fixed here: upgrades by the option accepted, everything else by the approved amount.
      const rep = rec.repayment || repaymentFor(rec.limit.approved);
      event.method = rep.method;
      event.label = REPAYMENT_METHODS[rep.method].stepLabel;
    }
    rec.events.push(event);
    rec.audit.push({ at, actor: 'product-layer', action: 'EXEC_EVENT', detail: eventType + (event.label ? ' · ' + event.label : '') });
    if (rec.events.length === EXEC_EVENTS.length) {
      rec.status = 'EXECUTED';
      rec.audit.push({ at: nowIso(), actor: 'engine', action: 'STATUS',
                       detail: 'EXECUTED — consumer-protection sequence complete; ' +
                               (rec.productId === 'split' ? 'the instalment plan now exists'
                                 : (rec.kind === 'UPGRADE' ? 'the upgraded loan now exists' : 'the loan now exists')) });
    }
    return rec;
  }

  // Analyst override on a referred case — reason-coded, 4-eyes enforced.
  function override(decisionId, o) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.outcome !== 'REFER' || rec.override) throw err('override applies only to open REFER decisions');
    if (rec.supersededBy) throw err(decisionId + ' was superseded by ' + rec.supersededBy + ' — work on the newer decision');
    if (!o || (o.outcome !== 'APPROVE' && o.outcome !== 'DECLINE')) throw err('override outcome must be APPROVE or DECLINE');
    if (!o.reasonCode || !D.reasonCodes[o.reasonCode]) throw err('override requires a valid reasonCode from MizanData.reasonCodes');
    if (typeof o.analyst !== 'string' || !o.analyst.trim() || typeof o.approver !== 'string' || !o.approver.trim()) {
      throw err('override requires analyst and approver names');
    }
    if (o.analyst.trim().toLowerCase() === o.approver.trim().toLowerCase()) {
      throw err('4-eyes violation — override analyst and approver must be different people');
    }
    // v2.9 — a red-flag referral is a human review: approve or decline, the analyst writes down why.
    if (rec.redFlags && rec.redFlags.referred && !(typeof o.note === 'string' && o.note.trim())) {
      throw err('a red-flag referral needs the analyst’s written reason (note) — approve or decline, it is a human review');
    }
    const at = nowIso();
    rec.override = { outcome: o.outcome, reasonCode: o.reasonCode, analyst: o.analyst,
                     approver: o.approver, note: o.note || '', at };
    rec.outcome = o.outcome;
    rec.status = 'OVERRIDDEN';
    if (!rec.reasonCodes.includes(o.reasonCode)) rec.reasonCodes.push(o.reasonCode);
    if (o.outcome === 'APPROVE' && rec.limit.approved > 0) rec.repayment = repaymentFor(rec.limit.approved);
    if (o.outcome === 'APPROVE' && !rec.token && rec.limit.approved > 0) {
      const pol = getPolicyRef(rec.productId);
      const sw = rec.consents && rec.consents.shareWithLender;
      rec.token = tokenFor(rec.productId, rec.id, at, pol, { features: rec.features },
                           'Approved by override — ' + o.analyst + ' / ' + o.approver, rec.repayment,
                           rec.productId === 'car_loan' && sw ? lenderFor(sw.lenderId).name : undefined);
    }
    if (o.outcome === 'DECLINE') {
      rec.limit.approved = 0; rec.token = null; rec.pricing = null; rec.repayment = null;
      if (rec.limit.capacity !== undefined) rec.limit.capacity = 0;
    }
    rec.audit.push({ at, actor: o.analyst, action: 'OVERRIDE',
                     detail: o.outcome + ' · ' + o.reasonCode + ' · approved by ' + o.approver });
    return rec;
  }

  function listDecisions() { ensureInit(); return S.decisions.slice().reverse(); }
  function getDecision(id) { ensureInit(); return getDecisionRef(id); }

  function referQueue() {
    ensureInit();
    // Open refers plus cases waiting on (or holding) requested statements; a
    // superseded decision drops out — its re-decision takes its place if still open.
    const open = S.decisions
      .filter(r => !r.supersededBy && ((r.outcome === 'REFER' && !r.override) || r.status === 'AWAITING_DOCUMENTS' || r.status === 'DOCUMENTS_RECEIVED'))
      .map(r => {
        const sla = REFER_SLA_HOURS[r.productId] || 8;
        const name = r.applicantSnapshot.name || r.id;
        const dr = r.documentRequest;
        return { id: r.id, name, segment: 'CONSUMER', productId: r.productId, createdAt: r.createdAt,
                 reason: r.reasonCodes[0] || 'RC_MANUAL_REVIEW', reasonCodes: r.reasonCodes.slice(),
                 waitingHours: 0, slaHoursLeft: dr ? dr.slaHoursLeftAtPause : sla, seeded: false,
                 status: r.status, slaPaused: r.status === 'AWAITING_DOCUMENTS',
                 documentRequest: dr ? { country: dr.country, countryName: dr.countryName, analyst: dr.analyst, requestedAt: dr.requestedAt } : null,
                 supersedes: r.supersedes || null,
                 // v2.9 — red-flag referrals carry their signal codes; askCustomer() notes are counted
                 redFlags: r.redFlags && r.redFlags.referred ? r.redFlags.flags.map(f => f.code) : null,
                 customerAsked: (r.customerQueries || []).length };
      });
    return open.concat(clone(S.seeded.queue));
  }

  function metrics() {
    ensureInit();
    const sd = S.seeded;
    const prod = {};
    for (const pid of ['split', 'personal_loan', 'starter_loan', 'salary_advance', 'car_loan']) prod[pid] = Object.assign({}, sd.tot[pid]);
    const declineReasons = Object.assign({}, sd.declineReasons);
    const gradeDist = Object.assign({}, sd.gradeDist);
    const daily = clone(sd.daily);
    const todayRow = daily[daily.length - 1];
    let refers = sd.refers, overrides = sd.overrides;
    const referAging = Object.assign({}, sd.referAging);

    // Merge live session decisions into every aggregate.
    for (const r of S.decisions) {
      const b = prod[r.productId];
      const finalOutcome = r.outcome; // override already applied to r.outcome
      b.decisions++; b[finalOutcome]++;
      if (finalOutcome !== 'REFER' && !r.override) b.stp++;
      todayRow[finalOutcome]++;
      if (finalOutcome === 'DECLINE') {
        const code = r.reasonCodes[0] || 'RC_MANUAL_REVIEW';
        declineReasons[code] = (declineReasons[code] || 0) + 1;
      }
      if (r.score && r.score.grade) gradeDist[r.score.grade] = (gradeDist[r.score.grade] || 0) + 1;
      if (finalOutcome === 'REFER') { refers++; referAging['<4h']++; }
      if (r.override) { refers++; overrides++; }
    }
    const totals = { decisions: 0, APPROVE: 0, REFER: 0, DECLINE: 0 };
    let stpAll = 0;
    const byProduct = {};
    for (const pid of Object.keys(prod)) {
      const b = prod[pid];
      totals.decisions += b.decisions; totals.APPROVE += b.APPROVE; totals.REFER += b.REFER; totals.DECLINE += b.DECLINE;
      stpAll += b.stp;
      byProduct[pid] = { decisions: b.decisions, APPROVE: b.APPROVE, REFER: b.REFER, DECLINE: b.DECLINE,
                         stpPct: pct1(b.stp, b.decisions) };
    }
    return {
      window: '90d',
      totals,
      stpPct: pct1(stpAll, totals.decisions),
      byProduct,
      stpTargets: { split: 85, personal_loan: 80 },
      declineReasons: Object.keys(declineReasons)
        .map(code => ({ code, labelEn: (D.reasonCodes[code] || { en: code }).en, count: declineReasons[code] }))
        .sort((a, b) => b.count - a.count),
      gradeDist: ['A', 'B', 'C', 'D', 'E'].map(g => ({ grade: g, count: gradeDist[g] || 0 })),
      daily,
      referAging: [{ bucket: '<4h', count: referAging['<4h'] },
                   { bucket: '4-24h', count: referAging['4-24h'] },
                   { bucket: '>24h', count: referAging['>24h'] }],
      overrideRatePct: pct1(overrides, refers),
      vintages: clone(S.seeded.vintages),
      // Day-zero early-warning signals — seeded, deterministic, consumer only.
      earlyWarning: clone(D.earlyWarning || []),
      // v2.9 — UAE red flags, exit-risk watch over MizanData.monitoredLoans (pure scan, live block)
      exitRiskWatch: (() => { const rows = earlyWarningScan(); return { counts: ewCounts(rows), rows }; })()
    };
  }

  const MizanEngine = {
    VERSION: ENGINE_VERSION,
    EXEC_EVENTS: EXEC_EVENTS.slice(),
    REPAYMENT_ROUTING,
    repaymentFor,
    STATEMENT_CORRIDORS: STATEMENT_CORRIDORS.slice(),
    STATEMENT_FX,
    parseStatements, requestDocuments, submitStatements, redecide,
    // v2.5 — NoorScore + the lender's credit memo (UI · API · SFTP)
    NOORSCORE_BANDS: NOORSCORE_BANDS.map(b => ({ min: b[0], band: b[1] })).concat([{ min: null, band: 'Poor' }]),
    noorScoreBand, creditMemo, memoApiPayload, memoSftpRow,
    // v2.6 — the customer journey: pre-qualification on connected accounts only
    prequalify, loanInstalment,
    // v2.7 — car loan: a pure live quote (documents path vs Open Finance path) for the car screen
    quoteCar,
    lenders: function () { ensureInit(); return clone(lendersList()); },
    init, manifests, execSteps, getPolicy, publishPolicy, policyHistory, policyInvariants,
    decide, decideRaw, simulateBook, drawdownCheck, recordEvent, override,
    quoteUpgrade, selectUpgradeOption,
    listDecisions, getDecision, referQueue, metrics,
    // v2.9 — UAE red flags and early warning (exit-risk watch)
    RED_FLAG_CODES: RF_CODES.slice(), RED_FLAG_ORIGINATION_CODES: RF_ORIGINATION.slice(),
    redFlags, earlyWarningScan, simulateEarlyWarning, askCustomer
  };

  globalThis.MizanEngine = MizanEngine;
})();

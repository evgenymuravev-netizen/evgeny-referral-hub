/*
 * Mizan — Noor's credit decisioning layer · MizanData (data-2.0)
 * Synthetic, deterministic data layer for the Mizan demo, repurposed for Noor
 * ("noor finance"), a conventional B2C consumer fintech in the UAE.
 * Binding spec: ../NOOR-PIVOT.md (overrides ../CONTRACT.md where they conflict).
 *
 * Contents:
 *  - 5 split personas (c1..c5): connected-account (UAE Open Finance / Al Tareq)
 *    cash-flow customers who already made a big purchase and may split it
 *    into Pay in 3 / 6 / 12.
 *  - 5 personal-loan personas (r1..r5), unchanged intended outcomes.
 *  - 2 starter-loan upgrade personas (u1..u2, Addendum v2.1): thin-file
 *    newcomers re-decided after their AED 1,000 starter loan.
 *  - 1 customer-journey persona (j1, Addendum v2.6): a Botim user who applies
 *    for a personal loan through Noor's web-view; plus the lender of record.
 *  - 1 car-loan persona (a1, Addendum v2.7): an affluent client buying a family
 *    SUV, whose verified rental income (Open Finance) finances AED 30,000 more;
 *    plus a hand-written car-loan sample book (16 rows) for policy simulation.
 *  - Seeded home-country bank statements (Addendum v2.4) for r2, u1 and u2:
 *    6 monthly rows each, in local currency, read by Mizan's simulated parser;
 *    plus one seeded Workbench case awaiting Egyptian statements.
 *  - Bilingual (EN + Modern Standard Arabic) customer-safe reason codes.
 *  - 5 seeded day-zero early-warning signals (consumer only).
 *  - A seeded deterministic sample book (120 split + 140 personal-loan +
 *    80 starter-loan rows, + 17 hand-written car-loan rows) for policy simulation.
 *
 * No DOM access. No dependency on engine.js. Runs in Node >= 16 and browsers.
 * All synthetic dates derive from TODAY — never from the wall clock.
 */
(function () {
  'use strict';

  const TODAY = '2026-07-19';

  // ---------------------------------------------------------------------------
  // Seeded PRNG (mulberry32) — every load produces identical synthetic numbers.
  // ---------------------------------------------------------------------------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Box–Muller normal deviate driven by the seeded PRNG.
  function makeNormal(rnd) {
    return function (mu, sigma) {
      let u = rnd(); const v = rnd();
      if (u < 1e-12) u = 1e-12;
      return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
  }
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const roundTo = (x, step) => Math.round(x / step) * step;
  function addDaysIso(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Labels for the 12 complete months of connected-account history behind every
  // split persona's monthlyIncome / monthlySpend arrays (oldest first).
  const monthLabels = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
                       '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

  // Seeded home-country statements (Addendum v2.4). Each statement is the last
  // 6 complete months in the account's own currency, one row per month:
  //   avgBalance — average daily balance; remittance — the credit received from
  //   the customer's UAE account that month ({day, amount}) or null; emi — the
  //   recurring loan debit (0 when none); returnedItems / overdraftDays — conduct.
  // `file` is the genuine bank-issued e-statement; any other file name parses as
  // an integrity failure (the tamper path). Mizan converts to AED at its fixed
  // demo FX table and derives every figure — nothing below is pre-aggregated.
  function homeStatements(country, bank, file, accountHolder, accountOpenSince, emiLabel, emi, rows) {
    return {
      country, bank, file, accountHolder, accountOpenSince,
      currency: { IN: 'INR', PK: 'PKR', EG: 'EGP' }[country],
      issuer: bank + ' e-statement (digitally signed PDF)',
      emiLabel,
      months: rows.map(([month, avgBalance, remittance]) => ({
        month, avgBalance, remittance, emi, otherIncome: 0, returnedItems: 0, overdraftDays: 0 }))
    };
  }

  // ---------------------------------------------------------------------------
  // Split personas (NOOR-PIVOT §Split personas). Each one already made a big
  // purchase that Noor detected in their connected accounts; Mizan decides
  // whether (and how) it can be split into monthly instalments.
  //
  // monthlyIncome / monthlySpend: 12 numbers oldest first (see monthLabels),
  // null where the month is outside the connected window. They are tuned so that
  // mean(non-null) === avgMonthlyIncome / avgMonthlySpend exactly and population
  // stdev / mean ≈ incomeVolatilityPct (selftest checks consistency).
  // "Spend" is living + discretionary spend; AECB-reported repayments are held
  // separately in aecb.obligationsMonthly, so
  //   free cash flow = avgMonthlyIncome − avgMonthlySpend − aecb.obligationsMonthly.
  // ---------------------------------------------------------------------------
  const personasSplit = [
    { // c1 — APPROVE, grade A, Pay in 6; capacity well above the purchase; drawdown demo
      id: 'c1', name: 'Mariam Al Zarooni', nameAr: 'مريم الزروني',
      tagline: 'Salaried, stable cash flow — paid the school fees, wants the cash back',
      age: 36, residency: 'UAE_NATIONAL', monthsInUae: 432,
      employment: { employer: 'Dubai Health Authority', type: 'GOVERNMENT', retiree: false },
      aecb: { hit: true, score: 761, obligationsMonthly: 2400, chequeReturns12m: 0,
              worstDelinquency: 'NONE', creditPassportAvailable: false },
      connected: { source: 'ALTAREQ_TPP', banks: ['FAB', 'ENBD'], monthsAvailable: 12,
                   avgMonthlyIncome: 32000, avgMonthlySpend: 19000, incomeVolatilityPct: 8,
                   // Salary ~30.6k + December bonus; mean 32,000, vol 7.97%
                   monthlyIncome: [30900, 30600, 31100, 30300, 30800, 39500, 31100, 30600, 30800, 34300, 30600, 33400],
                   monthlySpend: [19700, 17600, 21200, 18500, 17100, 22300, 19200, 17800, 20400, 16400, 20000, 17800] },
      purchase: { merchant: 'School fees', category: 'Education', amount: 12000, date: '2026-07-08',
                  detectedVia: 'Connected account (FAB current account)' },
      defaultRequest: { amount: 12000, tenorMonths: 6 }
    },
    { // c2 — REFER: income volatility ~58% above the 40% auto-approve threshold
      id: 'c2', name: 'Daniel Okafor', nameAr: 'دانيال أوكافور',
      tagline: 'Freelance designer — good file, lumpy income',
      age: 31, residency: 'RESIDENT', monthsInUae: 54,
      employment: { employer: 'Self-employed (freelance permit, Dubai)', type: 'SELF_EMPLOYED', retiree: false },
      aecb: { hit: true, score: 702, obligationsMonthly: 1500, chequeReturns12m: 0,
              worstDelinquency: 'NONE', creditPassportAvailable: false },
      connected: { source: 'ALTAREQ_TPP', banks: ['ENBD', 'Wio'], monthsAvailable: 12,
                   avgMonthlyIncome: 21000, avgMonthlySpend: 13000, incomeVolatilityPct: 58,
                   // Project-based invoices; mean 21,000, vol 57.95%
                   monthlyIncome: [23600, 9900, 40700, 13600, 8700, 44400, 25900, 11100, 7400, 32100, 12400, 22200],
                   monthlySpend: [14600, 10700, 16700, 11700, 10000, 17000, 13700, 11000, 10300, 15000, 12000, 13300] },
      purchase: { merchant: 'Laptop', category: 'Electronics', amount: 8500, date: '2026-07-02',
                  detectedVia: 'Connected account (ENBD credit card)' },
      defaultRequest: { amount: 8500, tenorMonths: 6 }
    },
    { // c3 — DECLINE: spending + repayments exceed income → negative free cash flow
      id: 'c3', name: 'Sana Qureshi', nameAr: 'ثناء قريشي',
      tagline: 'Spending already outpaces income — no free cash flow to split',
      age: 28, residency: 'RESIDENT', monthsInUae: 70,
      employment: { employer: 'Majid Al Futtaim Retail', type: 'PRIVATE', retiree: false },
      aecb: { hit: true, score: 688, obligationsMonthly: 2100, chequeReturns12m: 0,
              worstDelinquency: 'NONE', creditPassportAvailable: false },
      connected: { source: 'ALTAREQ_TPP', banks: ['ADCB'], monthsAvailable: 12,
                   avgMonthlyIncome: 16000, avgMonthlySpend: 16200, incomeVolatilityPct: 10,
                   // mean 16,000, vol 10.0%; spend mean 16,200
                   monthlyIncome: [15500, 16700, 14800, 20300, 15000, 16500, 15300, 14600, 17000, 15800, 13800, 16700],
                   monthlySpend: [17600, 15300, 16600, 19100, 14400, 17300, 15500, 14600, 18200, 15100, 15800, 14900] },
      purchase: { merchant: 'Sofa', category: 'Home & furniture', amount: 6000, date: '2026-06-28',
                  detectedVia: 'Connected account (ADCB credit card)' },
      defaultRequest: { amount: 6000, tenorMonths: 6 }
    },
    { // c4 — APPROVE via cash-flow underwriting: no AECB hit, 5 months connected
      id: 'c4', name: 'Arjun Mehta', nameAr: 'أرجون ميهتا',
      tagline: 'New to the UAE (5 months), no AECB file — approvable on cash flow',
      age: 27, residency: 'NEW_RESIDENT', monthsInUae: 5,
      employment: { employer: 'Careem Networks FZ', type: 'PRIVATE', retiree: false },
      aecb: { hit: false, score: null, obligationsMonthly: 0, chequeReturns12m: 0,
              worstDelinquency: 'NONE', creditPassportAvailable: false },
      connected: { source: 'ALTAREQ_TPP', banks: ['Mashreq'], monthsAvailable: 5,
                   avgMonthlyIncome: 18000, avgMonthlySpend: 11000, incomeVolatilityPct: 2,
                   // Only 5 months in country → 5 months of data; mean 18,000, vol 2.02%
                   monthlyIncome: [null, null, null, null, null, null, null, 18000, 18100, 17800, 18600, 17500],
                   monthlySpend: [null, null, null, null, null, null, null, 10300, 11900, 10900, 11300, 10600] },
      purchase: { merchant: 'Flights', category: 'Travel', amount: 4800, date: '2026-07-12',
                  detectedVia: 'Connected account (Mashreq debit card)' },
      defaultRequest: { amount: 4800, tenorMonths: 6 }
    },
    { // c5 — DECLINE: DPD90 history + score below cut-off (+ returned cheques)
      id: 'c5', name: 'Khalid Rashed', nameAr: 'خالد راشد',
      tagline: 'Healthy cash flow, but a DPD90 history and returned cheques',
      age: 44, residency: 'RESIDENT', monthsInUae: 190,
      employment: { employer: 'Emirates Logistics LLC', type: 'PRIVATE', retiree: false },
      aecb: { hit: true, score: 548, obligationsMonthly: 3500, chequeReturns12m: 2,
              worstDelinquency: 'DPD90', creditPassportAvailable: false },
      connected: { source: 'ALTAREQ_TPP', banks: ['RAKBANK', 'ENBD'], monthsAvailable: 12,
                   avgMonthlyIncome: 27000, avgMonthlySpend: 15000, incomeVolatilityPct: 12,
                   // mean 27,000, vol 12.0%
                   monthlyIncome: [28800, 24100, 27900, 25600, 35000, 24700, 27500, 23300, 29800, 26100, 22800, 28400],
                   monthlySpend: [14200, 16300, 13200, 15500, 17800, 14000, 16500, 12700, 15800, 14500, 16000, 13500] },
      purchase: { merchant: 'Car service', category: 'Auto', amount: 3200, date: '2026-07-15',
                  detectedVia: 'Connected account (RAKBANK current account)' },
      defaultRequest: { amount: 3200, tenorMonths: 6 }
    }
  ];

  // ---------------------------------------------------------------------------
  // Personal-loan personas r1..r5 — same people and intended outcomes as v1.
  // Salary verification now comes from connected accounts (bankData.source
  // 'ALTAREQ_TPP' → scorecard overlay "Salary verified via connected account +15")
  // or uploaded documents ('DOCUMENTS').
  // ---------------------------------------------------------------------------
  const personasLoan = [
    { // r1 — APPROVE, grade A, limit bound by requested amount
      id: 'r1', name: 'Ahmed Al Mansoori', nameAr: 'أحمد المنصوري',
      tagline: 'Government employee, salary verified via connected accounts',
      age: 34, residency: 'UAE_NATIONAL', monthsInUae: 408,
      employment: { employer: 'Abu Dhabi Digital Authority', type: 'GOVERNMENT',
                    salaryMonthly: 28000, tenureMonths: 76, retiree: false },
      aecb: { hit: true, score: 782, esrPct: 18, obligationsMonthly: 2800,
              tradelines: 3, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'ALTAREQ_TPP', banks: ['FAB'], monthsAvailable: 24,
                  salaryDetected: true, avgSalaryCredit: 28000 },
      defaultRequest: { amount: 150000, tenorMonths: 36 }
    },
    { // r2 — REFER (thin file); APPROVE via Credit Passport when consented
      id: 'r2', name: 'Priya Nair', nameAr: 'بريا ناير',
      tagline: 'New resident (8 months), no UAE credit history — thin file',
      age: 31, residency: 'NEW_RESIDENT', monthsInUae: 8,
      employment: { employer: 'Medcare Hospital Group', type: 'PRIVATE',
                    salaryMonthly: 17000, tenureMonths: 8, retiree: false },
      aecb: { hit: false, score: null, esrPct: null, obligationsMonthly: 0,
              tradelines: 0, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: true },
      // Consented home-country bureau file, importable via the AECB × Nova Credit
      // Passport rail — used only when the applicant opts in.
      homeBureau: { country: 'India', bureau: 'CIBIL via AECB × Nova Credit Passport',
                    score: 776, scoreRange: '300–900', historyYears: 6, obligationsMonthlyAed: 1100 },
      bankData: { source: 'ALTAREQ_TPP', banks: ['ENBD'], monthsAvailable: 7,
                  salaryDetected: true, avgSalaryCredit: 17000, salaryCreditDay: 27 },
      // v2.4 — 6 months of HDFC statements (India), uploaded when the analyst asks.
      // Education-loan EMI INR 10,227 (≈ AED 450), average balance ≈ AED 9,800,
      // a remittance from her UAE salary every month (≈ 92% consistent).
      homeStatements: homeStatements('IN', 'HDFC Bank', 'HDFC_Statement_Jan–Jun_2026.pdf', 'PRIYA NAIR', '2016-03',
        'Education loan EMI (HDFC Credila)', 10227,
        [ // month, avg balance (INR), remittance from the UAE {day, amount INR} | null
          ['2026-01', 214800, { day: 28, amount: 113600 }],
          ['2026-02', 219600, { day: 28, amount: 100000 }],
          ['2026-03', 226300, { day: 29, amount: 113600 }],
          ['2026-04', 221900, { day: 28, amount: 127200 }],
          ['2026-05', 228400, { day: 31, amount: 104500 }],   // 4 days after salary — still consistent, scored half on timing
          ['2026-06', 225362, { day: 28, amount: 131800 }]
        ]),
      defaultRequest: { amount: 60000, tenorMonths: 24 }
    },
    { // r3 — APPROVE but limit sharply reduced; bindingConstraint DBR_HEADROOM
      id: 'r3', name: 'Omar Haddad', nameAr: 'عمر حداد',
      tagline: 'Well-banked but heavily obligated — DBR headroom binds',
      age: 39, residency: 'RESIDENT', monthsInUae: 132,
      employment: { employer: 'Emaar Properties', type: 'PRIVATE',
                    salaryMonthly: 22000, tenureMonths: 60, retiree: false },
      aecb: { hit: true, score: 655, esrPct: 39, obligationsMonthly: 9200,
              tradelines: 6, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'ALTAREQ_TPP', banks: ['ENBD', 'ADCB'], monthsAvailable: 24,
                  salaryDetected: true, avgSalaryCredit: 22000 },
      defaultRequest: { amount: 200000, tenorMonths: 36 }
    },
    { // r4 — DECLINE: score below cut-off + delinquency rule
      id: 'r4', name: 'Layla Boutros', nameAr: 'ليلى بطرس',
      tagline: 'Low score, DPD90 history, returned cheque',
      age: 29, residency: 'RESIDENT', monthsInUae: 84,
      employment: { employer: 'Landmark Retail LLC', type: 'PRIVATE',
                    salaryMonthly: 9500, tenureMonths: 18, retiree: false },
      aecb: { hit: true, score: 588, esrPct: 47, obligationsMonthly: 4200,
              tradelines: 5, chequeReturns12m: 1, worstDelinquency: 'DPD90',
              creditPassportAvailable: false },
      bankData: { source: 'DOCUMENTS', banks: [], monthsAvailable: 6,
                  salaryDetected: true, avgSalaryCredit: 9500 },
      defaultRequest: { amount: 80000, tenorMonths: 48 }
    },
    { // r5 — APPROVE with the retiree 30% DBR cap binding (RETIREE_CAP)
      id: 'r5', name: 'Hassan Al Balushi', nameAr: 'حسن البلوشي',
      tagline: 'Retiree, pension income — 30% DBR cap applies',
      age: 62, residency: 'UAE_NATIONAL', monthsInUae: 480,
      employment: { employer: 'GPSSA (government pension)', type: 'PENSION',
                    salaryMonthly: 18000, tenureMonths: 240, retiree: true },
      aecb: { hit: true, score: 731, esrPct: 14, obligationsMonthly: 2000,
              tradelines: 2, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'ALTAREQ_TPP', banks: ['FAB'], monthsAvailable: 24,
                  salaryDetected: true, avgSalaryCredit: 18000 },
      defaultRequest: { amount: 250000, tenorMonths: 48 }
    }
  ];

  // ---------------------------------------------------------------------------
  // Starter-loan upgrade personas u1..u2 (NOOR-PIVOT Addendum v2.1). Thin-file
  // newcomers who took Noor's starter loan (AED 1,000 · 1 month · 50% APR) and
  // are now re-decided on richer data: connected UAE accounts (Open Finance)
  // plus, optionally, 6 months of home-country bank statements (v2.4) that the
  // customer uploads and Mizan parses.
  //
  // connected.monthlyIncome / monthlySpend follow the split-persona convention:
  // 12 slots aligned to monthLabels, null outside the connected window, mean of
  // the non-null months === the stated average, stdev/mean ≈ incomeVolatilityPct.
  // The home-loan EMI in homeStatements is only visible to the decision when the
  // customer shares the statements.
  // ---------------------------------------------------------------------------
  const personasUpgrade = [
    { // u1 — APPROVE: BASE without statements; ENHANCED (up to AED 3,000 · 6 months · from 35% APR) with them
      id: 'u1', name: 'Anita Thomas', nameAr: 'أنيتا توماس',
      tagline: 'Nurse from Kerala, 5 months in the UAE — repaid her starter loan on time',
      age: 29, residency: 'NEW_RESIDENT', monthsInUae: 5,
      employment: { employer: 'Private hospital, Dubai', type: 'PRIVATE', retiree: false },
      priorLoan: { ref: 'MZN-S-0412', productId: 'starter_loan', amount: 1000, tenorMonths: 1, apr: 0.50,
                   disbursedAt: '2026-06-01', dueAt: '2026-07-01', repaidAt: '2026-07-01', dpd: 0, partnerIncome: 41.67 },
      aecb: { hit: true, score: null, tradelines: 1, worstDelinquency: 'NONE', chequeReturns12m: 0,
              obligationsMonthly: 0, note: 'File created by the starter loan — 1 tradeline, paid on time, no score yet' },
      connected: { source: 'ALTAREQ_TPP', banks: ['ENBD'], monthsAvailable: 5, avgMonthlyIncome: 9500,
                   avgMonthlySpend: 5600, incomeVolatilityPct: 4, salaryCreditDay: 28,
                   // Salary + shift allowances since arrival; mean 9,500, vol 4.04%
                   monthlyIncome: [null, null, null, null, null, null, null, 9000, 9950, 9150, 9900, 9500],
                   monthlySpend: [null, null, null, null, null, null, null, 5400, 5900, 5300, 5800, 5600] },
      // v2.4 — State Bank of India, account open since 2014; home-loan EMI INR 7,955
      // (≈ AED 350), average balance ≈ AED 4,200. January is her last month in
      // Kerala (no UAE salary yet); Feb–Jun each carry a remittance from her UAE
      // salary (≈ 95% consistent).
      homeStatements: homeStatements('IN', 'State Bank of India', 'SBI_Statement_Jan–Jun_2026.pdf', 'ANITA THOMAS', '2014-08',
        'Home loan EMI (SBI)', 7955,
        [
          ['2026-01', 101200, null],
          ['2026-02', 88600, { day: 28, amount: 56800 }],
          ['2026-03', 92300, { day: 29, amount: 48300 }],
          ['2026-04', 97800, { day: 30, amount: 56800 }],
          ['2026-05', 93900, { day: 29, amount: 68000 }],
          ['2026-06', 98930, { day: 28, amount: 50000 }]
        ])
    },
    { // u2 — DECLINE: the starter loan was repaid 14 days late → starter terms continue (RC_STARTER_LATE)
      id: 'u2', name: 'Bilal Ahmed', nameAr: 'بلال أحمد',
      tagline: 'Driver, 7 months in the UAE — repaid his starter loan 14 days late',
      age: 33, residency: 'NEW_RESIDENT', monthsInUae: 7,
      employment: { employer: 'Fleet operator, Dubai', type: 'PRIVATE', retiree: false },
      priorLoan: { ref: 'MZN-S-0377', productId: 'starter_loan', amount: 1000, tenorMonths: 1, apr: 0.50,
                   disbursedAt: '2026-05-15', dueAt: '2026-06-15', repaidAt: '2026-06-29', dpd: 14, partnerIncome: 41.67 },
      aecb: { hit: true, score: null, tradelines: 1, worstDelinquency: 'NONE', chequeReturns12m: 0,
              obligationsMonthly: 0, note: 'File created by the starter loan — 1 tradeline, repaid 14 days late, no score yet' },
      connected: { source: 'ALTAREQ_TPP', banks: ['Mashreq'], monthsAvailable: 7, avgMonthlyIncome: 6500,
                   avgMonthlySpend: 4300, incomeVolatilityPct: 5, salaryCreditDay: 26,
                   // mean 6,500, vol 5.25%
                   monthlyIncome: [null, null, null, null, null, 6100, 6950, 6250, 6850, 6050, 6750, 6550],
                   monthlySpend: [null, null, null, null, null, 4100, 4500, 4200, 4600, 4000, 4400, 4300] },
      // v2.4 — HBL (Pakistan), 6 months, clean: no EMIs, average balance ≈ AED 1,600.
      // The statements are fine; the late starter repayment still blocks the upgrade.
      homeStatements: homeStatements('PK', 'HBL', 'HBL_Statement_Jan–Jun_2026.pdf', 'BILAL AHMED', '2019-05',
        null, 0,
        [
          ['2026-01', 116400, { day: 27, amount: 151500 }],
          ['2026-02', 124900, { day: 27, amount: 140900 }],
          ['2026-03', 118700, { day: 31, amount: 151500 }],
          ['2026-04', 127300, { day: 27, amount: 162100 }],
          ['2026-05', 119800, { day: 31, amount: 151500 }],
          ['2026-06', 120172, { day: 28, amount: 137800 }]
        ])
    }
  ];

  // ---------------------------------------------------------------------------
  // Customer-journey persona (Addendum v2.6). A Botim user who reaches Noor as a
  // web-view inside the host app, connects his accounts through Al Tareq and
  // applies for a personal loan. Personal-loan shape (employment / aecb /
  // bankData), so decide({productId:'personal_loan'}) works unchanged, plus a
  // `connected` block (split-persona convention: 12 monthly slots aligned to
  // monthLabels, mean === the stated average) that prequalify() reads — income,
  // spending and the repayments already going out (observedObligationsMonthly).
  // Accounts carry masked numbers and balances for the host-app tiles.
  // ---------------------------------------------------------------------------
  const personasJourney = [
    { // j1 — pre-qualifies on connected accounts only, then APPROVE (grade B) at AED 15,000 · 12 months
      id: 'j1', name: 'Ravi Kumar', nameAr: 'رافي كومار',
      tagline: 'Warehouse supervisor, 3 years in the UAE, Botim user — a family wedding at home',
      age: 31, residency: 'RESIDENT', monthsInUae: 36,
      employment: { employer: 'Logistics company, Jebel Ali', type: 'PRIVATE',
                    salaryMonthly: 12000, tenureMonths: 30, retiree: false },
      aecb: { hit: true, score: 712, esrPct: 8, obligationsMonthly: 900,
              tradelines: 2, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false,
              // v2.8 — card totals behind the journey's Noor insights (62% used); one card, no loans
              cards: 1, activeLoans: 0, cardLimitTotal: 12000, cardBalanceTotal: 7440 },
      bankData: { source: 'ALTAREQ_TPP', banks: ['ENBD', 'FAB'], monthsAvailable: 12,
                  salaryDetected: true, avgSalaryCredit: 12000, salaryCreditDay: 27 },
      connected: { source: 'ALTAREQ_TPP', banks: ['ENBD', 'FAB'], monthsAvailable: 12,
                   accounts: [
                     { bank: 'ENBD', type: 'Current account', mask: '4821', balance: 6240.35, salaryAccount: true },
                     { bank: 'FAB', type: 'Savings account', mask: '0193', balance: 9860.00, salaryAccount: false }
                   ],
                   avgMonthlyIncome: 12000, avgMonthlySpend: 7400, incomeVolatilityPct: 1, salaryCreditDay: 27,
                   // The credit-card repayment the accounts show leaving every month (= the AECB obligation)
                   observedObligationsMonthly: 900, observedObligationsLabel: 'Credit-card repayment',
                   // Salary 12,000 with small overtime swings; mean 12,000, vol 1.4%
                   monthlyIncome: [11800, 12000, 12200, 11900, 12000, 12400, 11700, 12000, 12100, 11900, 12000, 12000],
                   // mean 7,400 (December higher: travel home)
                   monthlySpend: [7100, 7650, 7300, 7900, 7250, 8200, 7000, 7350, 7450, 7200, 7600, 6800] },
      purpose: 'Family wedding',
      defaultRequest: { amount: 15000, tenorMonths: 12 },
      // v2.8 — the email botim shares at hand-off (synthetic, reserved domain). The journey shows it
      // masked; it never reaches the credit memo or the SFTP row.
      contact: { email: 'ravi.k@example.com', emailSharedBy: 'botim' },
      // v2.8 — synthetic digital footprint, minimised at ingestion (same shape as FOOTPRINT-SPEC.md):
      // identity HIGH, account-takeover risk NORMAL; the thin-file overlay is not eligible (AECB file).
      footprint: { vendorScore: 731, emailAgeYearsMin: 7, nameMatchSources: 2, phoneOnMessenger: true,
                   velocity: { emailSeenByLenders: 1 },
                   breaches: { count: 1, includesCredentialStuffingCompilation: false } }
    }
  ];

  // ---------------------------------------------------------------------------
  // Car-loan persona (Addendum v2.7, CAR-LOAN-SPEC.md). Loan-persona shape like
  // j1 (employment / aecb / bankData), so normalizeLoan() reads him unchanged,
  // plus a `connected` block that the engine reads ONLY when the customer grants
  // Open Finance consent, and the dealer's `vehicleQuote`.
  //   Documents path: salary from the salary certificate + AECB → salary counts,
  //     declared rental income does not (not verifiable in an instant decision).
  //   Open Finance path: 12 months of connected accounts show the salary every
  //     month and the rent landing every quarter in a different bank, so the rent
  //     counts at the policy's regularIncomeCountedPct (75%).
  // connected.monthlyIncome / monthlySpend follow the split-persona convention
  // (12 slots aligned to monthLabels, mean === the stated average). Bank names,
  // masks and balances are internal text labels only — the lender never sees them.
  // ---------------------------------------------------------------------------
  const personasCar = [
    { // a1 — APPROVE both ways: documents only AED 150,000 (DBR binds); Open Finance AED 180,000 (80% LTV maximum)
      id: 'a1', name: 'Karim Nassar', nameAr: 'كريم نصار',
      tagline: 'Commercial Director, 11 years in the UAE — buying a family SUV; rents out an apartment',
      age: 44, residency: 'RESIDENT', monthsInUae: 132,
      employment: { employer: 'FMCG distributor, Dubai', title: 'Commercial Director', type: 'PRIVATE',
                    salaryMonthly: 45000, tenureMonths: 72, retiree: false },
      aecb: { hit: true, score: 790, esrPct: 44, obligationsMonthly: 19700,
              obligationsBreakdown: [{ label: 'Home mortgage', monthly: 17200 }, { label: 'Credit cards', monthly: 2500 }],
              tradelines: 5, chequeReturns12m: 0, worstDelinquency: 'NONE', creditPassportAvailable: false },
      // The documents path: salary verified from the salary certificate.
      bankData: { source: 'DOCUMENTS', salaryDetected: true, salaryCertificate: true },
      connected: { source: 'ALTAREQ_TPP', banks: ['Mashreq', 'HSBC', 'ADCB'], monthsAvailable: 12,
                   accounts: [
                     { bank: 'Mashreq', type: 'Current account', mask: '7714', balance: 64200, salaryAccount: true },
                     { bank: 'HSBC', type: 'Current account', mask: '3302', balance: 118500, rentAccount: true },
                     { bank: 'ADCB', type: 'Savings account', mask: '5568', balance: 236000 }
                   ],
                   // Salary 45,000 every month + rent 27,000 in Jan / Apr / Jul / Oct → mean 54,000
                   avgMonthlyIncome: 54000, avgMonthlySpend: 18000,
                   // The salary is identical every month and the rent lands on schedule, so the
                   // income is treated as stable (the quarterly rent is scheduled, not volatility).
                   incomeVolatilityPct: 0, salaryCreditDay: 25,
                   salaryCredits: { monthly: 45000, months: 12, sameEmployer: true, account: 'Mashreq ••7714' },
                   // Repayments seen leaving the accounts every month — the same as the AECB figure
                   observedObligationsMonthly: 19700, observedObligationsLabel: 'Home mortgage + credit cards',
                   regularIncome: [
                     { type: 'RENTAL', label: 'Rent — apartment (tenancy registered with Ejari)', frequency: 'QUARTERLY',
                       amountPerReceipt: 27000, receipts12m: 4, monthlyEquivalent: 9000, onSchedule: true, matchesTenancy: true,
                       account: 'HSBC ••3302' }
                   ],
                   // Jul '25 … Jun '26: rent months are Jul, Oct, Jan, Apr
                   monthlyIncome: [72000, 45000, 45000, 72000, 45000, 45000, 72000, 45000, 45000, 72000, 45000, 45000],
                   // mean 18,000 (December higher: travel)
                   monthlySpend: [17600, 18400, 17900, 18200, 17300, 19600, 17800, 17500, 18100, 18300, 17700, 17600] },
      // The dealer's quote — no real make, model or dealer. Valid for 14 days from TODAY.
      vehicleQuote: { category: 'SUV', condition: 'NEW', modelYear: 2026, priceAed: 225000, dealer: 'Partner dealer, Dubai',
                      quoteRef: 'DQ-2026-0418', validUntil: addDaysIso(TODAY, 14) },
      // The regulatory maximum: 80% of AED 225,000, so a 20% down payment of AED 45,000.
      defaultRequest: { amount: 180000, tenorMonths: 60 }
    }
  ];

  // ---------------------------------------------------------------------------
  // Seeded Workbench case (v2.4) — an analyst has already asked this customer for
  // 6 months of Egyptian bank statements; the refer SLA is paused while Noor waits.
  // Summary data only (like the other seeded queue rows).
  // ---------------------------------------------------------------------------
  const seededDocumentCases = [
    { id: 'MZN-H-110', name: 'Youssef Hassan', nameAr: 'يوسف حسن', productId: 'personal_loan',
      reason: 'RC_THIN_FILE', country: 'EG', bank: 'CIB (Commercial International Bank)',
      waitingHours: 2.6, slaHoursLeftAtPause: 5.4, requestedBy: 'A. Farsi (Credit Analyst)',
      requestedAt: TODAY + 'T07:12:00.000Z',
      note: 'Thin file, 4 months in the UAE, salary verified via connected account — 6 months of CIB statements to size the limit.' }
  ];

  // ---------------------------------------------------------------------------
  // Reason codes — customer-safe, bilingual (EN + Modern Standard Arabic), as
  // CBUAE disclosure requires. Conventional terminology: قرض (loan), فائدة
  // (interest), رسوم (fees), معدل الفائدة السنوي (APR). Every code the engine can
  // emit exists here (selftest asserts this).
  // ---------------------------------------------------------------------------
  const reasonCodes = {
    RC_SCORE_LOW: {
      en: 'Credit score is below the approval threshold for this product.',
      ar: 'درجة التصنيف الائتماني أقل من الحد المطلوب للموافقة على هذا المنتج.' },
    RC_DELINQUENCY: {
      en: 'Significant past-due history appears on the credit report.',
      ar: 'يُظهر تقرير الائتمان سجلاً سابقاً لتأخر السداد بشكل جوهري.' },
    RC_DBR_EXCEEDED: {
      en: 'Total monthly repayments would exceed the permitted debt burden ratio.',
      ar: 'إجمالي الأقساط الشهرية سيتجاوز نسبة عبء الدين المسموح بها.' },
    RC_THIN_FILE: {
      en: 'Insufficient credit history — the application was routed for specialist review.',
      ar: 'السجل الائتماني غير كافٍ — تم تحويل الطلب إلى مراجعة متخصصة.' },
    RC_INCOME_UNVERIFIED: {
      en: 'Income could not be verified automatically.',
      ar: 'تعذّر التحقق من الدخل بشكل آلي.' },
    RC_SALARY_FLOOR: {
      en: 'Monthly income is below the minimum required for this product.',
      ar: 'الدخل الشهري أقل من الحد الأدنى المطلوب لهذا المنتج.' },
    RC_AGE: {
      en: 'Applicant age is outside the eligible range for this product.',
      ar: 'عمر مقدم الطلب خارج النطاق العمري المؤهل لهذا المنتج.' },
    RC_TENOR_CAP: {
      en: 'The requested term is outside the permitted terms for this product; it was adjusted to a permitted term.',
      ar: 'مدة السداد المطلوبة خارج المدد المسموح بها لهذا المنتج؛ وتم تعديلها إلى مدة مسموح بها.' },
    RC_CHEQUE_RETURNS: {
      en: 'Returned-cheque history exceeds the permitted level.',
      ar: 'عدد الشيكات المرتجعة يتجاوز الحد المسموح به.' },
    RC_LIMIT_REDUCED: {
      en: 'The approved amount was reduced to remain within affordability limits.',
      ar: 'تم تخفيض المبلغ الموافق عليه ليبقى ضمن حدود القدرة على السداد.' },
    RC_RETIREE_CAP: {
      en: 'The retiree debt burden cap (30%) was applied to the approved amount.',
      ar: 'تم تطبيق حد عبء الدين الخاص بالمتقاعدين (30٪) على المبلغ الموافق عليه.' },
    RC_MANUAL_REVIEW: {
      en: 'The application requires review by a credit analyst.',
      ar: 'يتطلب الطلب مراجعة من محلل ائتمان.' },
    RC_DRAWDOWN_ARREARS: {
      en: 'New split blocked: there is an overdue instalment on your account.',
      ar: 'تم إيقاف التقسيط الجديد: يوجد قسط متأخر السداد على حسابك.' },
    RC_DRAWDOWN_LIMIT: {
      en: 'The purchase amount exceeds your available split capacity.',
      ar: 'مبلغ الشراء يتجاوز الحد المتاح لديك للتقسيط.' },
    RC_TOKEN_EXPIRED: {
      en: 'The offer validity window has expired — a new decision is required.',
      ar: 'انتهت صلاحية العرض — يلزم إصدار قرار جديد.' },
    RC_CROSS_BORDER: {
      en: 'Approved using consented home-country credit history via Credit Passport.',
      ar: 'تمت الموافقة استناداً إلى السجل الائتماني في بلد المنشأ الذي تمت مشاركته بموافقة العميل عبر خدمة جواز الائتمان.' },
    // --- Split (connected-account cash-flow underwriting) ---------------------
    RC_FREE_CASH_FLOW: {
      en: 'Monthly free cash flow (income after spending and existing repayments) is too low to support new instalments.',
      ar: 'التدفق النقدي الشهري الحر (الدخل بعد المصروفات والأقساط القائمة) غير كافٍ لتحمّل أقساط جديدة.' },
    RC_INCOME_VOLATILITY: {
      en: 'Monthly income varies more than the automatic-approval threshold allows — the application was routed for review.',
      ar: 'يتفاوت الدخل الشهري بدرجة تتجاوز حد الموافقة التلقائية — تمت إحالة الطلب إلى المراجعة.' },
    RC_CASH_FLOW_UNDERWRITTEN: {
      en: 'Assessed on connected-account cash flow because no UAE credit bureau (AECB) history was found.',
      ar: 'تم تقييم الطلب بناءً على التدفقات النقدية في الحسابات المرتبطة نظراً لعدم وجود سجل لدى شركة الاتحاد للمعلومات الائتمانية.' },
    RC_PURCHASE_UNVERIFIED: {
      en: 'The purchase could not be verified in connected-account transactions within the eligible window.',
      ar: 'تعذّر التحقق من عملية الشراء ضمن معاملات الحسابات المرتبطة خلال الفترة المؤهلة.' },
    RC_CONNECTED_HISTORY: {
      en: 'Not enough connected-account history yet — connect your salary account or wait for more months of data.',
      ar: 'لا يتوفر سجل كافٍ للحسابات المرتبطة بعد — يرجى ربط حساب الراتب أو الانتظار حتى تتوفر بيانات لأشهر إضافية.' },
    RC_PLAN_ADJUSTED: {
      en: 'To keep instalments affordable, the plan was set to a longer term.',
      ar: 'لإبقاء الأقساط ضمن القدرة على السداد، تم تحديد خطة تقسيط بمدة أطول.' },
    // --- Starter loan → upgrade (Addendum v2.1) ---------------------------------
    RC_UPGRADE_ENHANCED: {
      en: 'Upgraded using your connected UAE accounts and your verified home-country bank statements.',
      ar: 'تمت ترقية عرضك بناءً على حساباتك المصرفية المرتبطة في الإمارات وكشوف حسابك المصرفي في بلدك الأم التي تم التحقق منها.' },
    RC_UPGRADE_BASE: {
      en: 'Upgraded using your connected UAE accounts — add 6 months of home-country bank statements for a larger limit and a lower rate.',
      ar: 'تمت ترقية عرضك بناءً على حساباتك المصرفية المرتبطة في الإمارات — أضف كشوف حسابك المصرفي في بلدك الأم عن آخر ستة أشهر للحصول على حد أعلى ومعدل فائدة أقل.' },
    RC_STARTER_LATE: {
      en: 'Previous loan was repaid late — starter terms continue; upgrade can be reviewed after 3 on-time months.',
      ar: 'تم سداد القرض السابق بعد موعد استحقاقه — تستمر شروط قرض البداية، ويمكن مراجعة الترقية بعد ثلاثة أشهر من السداد في المواعيد المحددة.' },
    RC_OPTION_UNAFFORDABLE: {
      en: 'This amount and term would take the instalment above what your cash flow supports.',
      ar: 'هذا المبلغ مع هذه المدة سيرفع القسط الشهري فوق ما يسمح به تدفقك النقدي.' },
    // --- Home-country bank statements (Addendum v2.4) ---------------------------
    RC_STATEMENTS_REQUESTED: {
      en: 'Send us 6 months of your home-country bank statements so we can review a higher amount.',
      ar: 'يُرجى تزويدنا بكشوف حسابك المصرفي في بلدك الأم عن آخر ستة أشهر حتى نتمكن من دراسة منحك مبلغاً أعلى.' },
    RC_STATEMENTS_INCOMPLETE: {
      en: 'The bank statements do not cover all of the last 6 months — please upload the missing months.',
      ar: 'لا تغطي كشوف الحساب المصرفي الأشهر الستة الأخيرة كاملةً — يُرجى تحميل الأشهر الناقصة.' },
    RC_STATEMENTS_INTEGRITY: {
      en: 'The bank statements could not be verified (document integrity or account-holder name) — the application was referred for review.',
      ar: 'تعذّر التحقق من كشوف الحساب المصرفي (سلامة المستند أو اسم صاحب الحساب) — تمت إحالة الطلب إلى المراجعة.' },
    RC_STATEMENTS_USED: {
      en: 'Decided using your verified home-country bank statements — account history, clean conduct and remittances that match your UAE salary.',
      ar: 'تم اتخاذ القرار استناداً إلى كشوف حسابك المصرفي في بلدك الأم التي تم التحقق منها — سجل الحساب وانتظام التعاملات والتحويلات المتوافقة مع راتبك في الإمارات.' },
    // --- Car loan (Addendum v2.7) ---------------------------------------------------
    RC_LTV_CAP: {
      en: 'The amount is limited to 80% of the vehicle\'s value.',
      ar: 'يقتصر مبلغ القرض على 80٪ من قيمة المركبة.' },
    RC_VEHICLE_INELIGIBLE: {
      en: 'The vehicle does not meet the age or quotation requirements.',
      ar: 'لا تستوفي المركبة متطلبات العمر أو عرض السعر.' },
    RC_BELOW_MIN_AMOUNT: {
      en: 'The amount we can offer is below the minimum for this product.',
      ar: 'المبلغ الذي يمكن تقديمه أقل من الحد الأدنى المطلوب لهذا المنتج.' },
    // --- Digital footprint (FOOTPRINT-SPEC.md engine, built in v2.8) ---------------
    RC_FOOTPRINT_IDENTITY: {
      en: 'Your identity was confirmed with a digital-footprint check you agreed to.',
      ar: 'تم التحقق من هويتك من خلال فحص البصمة الرقمية الذي وافقت عليه.' },
    RC_FOOTPRINT_OVERLAY: {
      en: 'With little credit history, a digital-footprint check you agreed to added to your score.',
      ar: 'نظراً لمحدودية سجلك الائتماني، أضاف فحص البصمة الرقمية الذي وافقت عليه نقاطاً إلى درجتك.' },
    RC_STEP_UP_AUTH: {
      en: 'For your security, please sign in again with UAE PASS before the money is paid out.',
      ar: 'حرصاً على أمانك، يُرجى تسجيل الدخول مجدداً عبر الهوية الرقمية (UAE PASS) قبل صرف المبلغ.' },
    // --- UAE red flags and early warning (Addendum v2.9) ------------------------------
    // Customer-safe: each one is a change against the customer's own history, worded
    // so an analyst can read it to the customer. No values, no places, no services.
    RC_RED_FLAGS_REVIEW: {
      en: 'Recent changes in your account activity need a quick review by our team.',
      ar: 'تحتاج التغييرات الأخيرة في نشاط حسابك إلى مراجعة سريعة من فريقنا.' },
    RC_RF_CARDS_MAXED: {
      en: 'Your credit cards are close to their limits, and most of that was used in the last three months.',
      ar: 'بطاقاتك الائتمانية قريبة من حدودها، وقد استُخدم معظم ذلك خلال الأشهر الثلاثة الماضية.' },
    RC_RF_REMITTANCE_SURGE: {
      en: 'Much more of your income went out in international transfers this month than you usually send.',
      ar: 'خرج هذا الشهر جزء من دخلك في تحويلات دولية أكبر بكثير مما ترسله عادةً.' },
    RC_RF_TRAVEL_AFTER_DISBURSAL: {
      en: 'We noticed a travel purchase soon after your loan was paid out. On its own this never changes anything.',
      ar: 'لاحظنا عملية شراء متعلقة بالسفر بعد صرف قرضك بفترة قصيرة، وهذا وحده لا يغيّر شيئاً على الإطلاق.' },
    RC_RF_PAYMENTS_STOPPED: {
      en: 'Your salary arrived later than usual, or a repayment was missed after a run of on-time payments.',
      ar: 'وصل راتبك متأخراً عن موعده المعتاد، أو فاتتك دفعة بعد سلسلة من الدفعات في مواعيدها.' },
    RC_RF_BALANCES_DRAINED: {
      en: 'Your account balances dropped sharply compared with your usual level, after one large outgoing transfer.',
      ar: 'انخفضت أرصدة حساباتك بشكل حاد مقارنةً بمستواها المعتاد، بعد تحويل صادر كبير واحد.' }
  };

  // ---------------------------------------------------------------------------
  // Early warning — day-zero consumer signals. Seeded, deterministic: detected
  // within the last 3 days of TODAY, each paired with a same-day action.
  // Distress surfaces weeks before DPD 30; the tracked metric is signal-to-action time.
  // ---------------------------------------------------------------------------
  const earlyWarning = [
    { id: 'EW-001', detectedAt: addDaysIso(TODAY, 0), customer: 'Ravi Menon', segment: 'CONSUMER', productId: 'split',
      signal: 'Goal contributions stopped — 3 weeks without a transfer to the savings goal',
      signalAr: 'توقفت المساهمات في هدف الادخار منذ ثلاثة أسابيع',
      recommendedAction: 'Pre-emptive plan re-schedule offered (Pay in 6 → Pay in 12, same monthly fee rate)', status: 'ACTIONED' },
    { id: 'EW-002', detectedAt: addDaysIso(TODAY, -1), customer: 'Blessing Okafor', segment: 'CONSUMER', productId: 'personal_loan',
      signal: 'Remittance spike — 3× monthly average sent home within one week',
      signalAr: 'ارتفاع التحويلات إلى بلد المنشأ إلى ثلاثة أضعاف المتوسط الشهري خلال أسبوع',
      recommendedAction: 'Proactive in-app check-in sent', status: 'ACTIONED' },
    { id: 'EW-003', detectedAt: addDaysIso(TODAY, -1), customer: 'Arjun Pillai', segment: 'CONSUMER', productId: 'split',
      signal: 'New credit line opened in home country (consented home-bureau feed)',
      signalAr: 'فتح خط ائتمان جديد في بلد المنشأ',
      recommendedAction: 'Split capacity review queued', status: 'OPEN' },
    { id: 'EW-004', detectedAt: addDaysIso(TODAY, -2), customer: 'Maricel Santos', segment: 'CONSUMER', productId: 'personal_loan',
      signal: 'Salary credit 6 days late vs established pattern',
      signalAr: 'تأخر إيداع الراتب ستة أيام عن النمط المعتاد',
      recommendedAction: 'Instalment date moved to salary landing day', status: 'ACTIONED' },
    { id: 'EW-005', detectedAt: addDaysIso(TODAY, -2), customer: 'Hamdan Al Ketbi', segment: 'CONSUMER', productId: 'split',
      signal: 'Balance depletion velocity high — current account runs dry 9 days before payday',
      signalAr: 'تسارع مرتفع في استنزاف رصيد الحساب الجاري قبل موعد الراتب',
      recommendedAction: 'Same-day nudge: pause flexible budget categories until payday', status: 'OPEN' }
  ];

  // ---------------------------------------------------------------------------
  // UAE red flags and early warning — exit-risk watch (Addendum v2.9,
  // RED-FLAGS-SPEC.md). Signals are changes against the customer's OWN baseline,
  // read from their consented accounts (Open Finance) and the AECB card file.
  //
  // `redFlagData` is the only input the red-flag engine reads:
  //   baseline — the customer's own history: 6-month share of income sent in
  //              international transfers, the established salary day, the 3-month
  //              average balance, card utilisation 3 months ago, the run of
  //              on-time Noor repayments;
  //   recent   — the last 30 days: income, international transfers (an amount,
  //              never where to), airline purchases (amount + days after the loan
  //              was paid out, never where to), salary lateness, balance now,
  //              the largest outgoing transfer, a missed Noor collection;
  //   aecb     — cards, total card limits and balances.
  // There is deliberately no nationality, destination, religion or service-name
  // field anywhere in this block — and the engine reads an allowlist anyway.
  // ---------------------------------------------------------------------------
  // r6 — personal loan. On the numbers alone: APPROVE AED 40,000 (grade B). With the
  // red-flag rule (redFlagsAtOrigination on): REFER RC_RED_FLAGS_REVIEW, three flags —
  // cards 41% → 97% · 89% of income in international transfers vs 22% usual ·
  // balances −84% after one AED 7,000 transfer out. Never a decline, never a price change.
  const personaR6 = {
    id: 'r6', name: 'Marco Ferreira', nameAr: 'ماركو فيريرا',
    tagline: 'Sales executive, 2 years in the UAE — recent changes in his own accounts',
    age: 34, residency: 'RESIDENT', monthsInUae: 24,
    employment: { employer: 'Retail group, Dubai', type: 'PRIVATE',
                  salaryMonthly: 14000, tenureMonths: 20, retiree: false },
    aecb: { hit: true, score: 694, esrPct: 15, obligationsMonthly: 2100,
            tradelines: 3, chequeReturns12m: 0, worstDelinquency: 'NONE',
            creditPassportAvailable: false },
    bankData: { source: 'ALTAREQ_TPP', banks: ['RAKBANK'], monthsAvailable: 12,
                salaryDetected: true, avgSalaryCredit: 14000, salaryCreditDay: 26 },
    connected: { source: 'ALTAREQ_TPP', banks: ['RAKBANK'], monthsAvailable: 12,
                 avgMonthlyIncome: 14000, avgMonthlySpend: 6900, incomeVolatilityPct: 0, salaryCreditDay: 26,
                 // The same salary every month; spending mean 6,900
                 monthlyIncome: [14000, 14000, 14000, 14000, 14000, 14000, 14000, 14000, 14000, 14000, 14000, 14000],
                 monthlySpend: [6700, 7100, 6800, 7000, 6600, 7400, 6900, 6800, 7000, 6700, 6900, 6900] },
    redFlagData: {
      baseline: { intlTransfersShareOfIncome6m: 0.22, salaryCreditDay: 26, avgBalance3m: 11600,
                  cardUtilisationPct3mAgo: 41, onTimePaymentsRun: 0 },
      recent: { incomeAed: 14000, intlTransfersAed: 12400, airlinePurchases: [], salaryLateDays: 0,
                balanceNowAed: 1850, largestOutboundTransferAed: 7000, missedCollection: false },
      aecb: { cards: 3, cardLimitTotal: 60000, cardBalanceTotal: 58200 }
    },
    defaultRequest: { amount: 40000, tenorMonths: 24 }
  };
  personasLoan.push(personaR6);

  // Six funded loans under watch (synthetic). Varied names, no nationality on any row,
  // no destination on any transfer or trip. Expected at the default early-warning block:
  //   ML-01 HIGH · EXIT_RISK (travel + transfers 85% vs 20% + balances −91% + salary 10 days late)
  //   ML-02 MEDIUM (salary 8 days late only → check-in, offer a payment-date move)
  //   ML-03 MEDIUM (cards 38% → 96% since the loan)
  //   ML-04 LOW (one AED 1,900 trip 20 days after disbursal — watch, no contact)
  //   ML-05 NONE (35% of income sent every month = the 6-month baseline — the guardrail)
  //   ML-06 MEDIUM (transfers 84% of income, 3× the usual 28%)
  const monitoredLoans = [
    { id: 'ML-01', customer: 'Daniel Brooks', productId: 'personal_loan', amountAed: 45000, tenorMonths: 36,
      disbursedAt: addDaysIso(TODAY, -12), contactChannel: 'Phone',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.20, salaryCreditDay: 25, avgBalance3m: 14000, cardUtilisationPct3mAgo: 35, onTimePaymentsRun: 0 },
        recent: { incomeAed: 16000, intlTransfersAed: 13600, airlinePurchases: [{ daysAfterDisbursal: 9, amountAed: 2450 }],
                  salaryLateDays: 10, balanceNowAed: 1260, largestOutboundTransferAed: 9500, missedCollection: false },
        aecb: { cards: 2, cardLimitTotal: 30000, cardBalanceTotal: 11400 } } },
    { id: 'ML-02', customer: 'Rohan Mehta', productId: 'personal_loan', amountAed: 30000, tenorMonths: 24,
      disbursedAt: addDaysIso(TODAY, -95), contactChannel: 'In-app message',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.15, salaryCreditDay: 28, avgBalance3m: 6000, cardUtilisationPct3mAgo: 28, onTimePaymentsRun: 3 },
        recent: { incomeAed: 11000, intlTransfersAed: 1650, airlinePurchases: [], salaryLateDays: 8,
                  balanceNowAed: 4100, largestOutboundTransferAed: 900, missedCollection: false },
        aecb: { cards: 2, cardLimitTotal: 20000, cardBalanceTotal: 6000 } } },
    { id: 'ML-03', customer: 'Sofia Marino', productId: 'split', amountAed: 9000, tenorMonths: 6,
      disbursedAt: addDaysIso(TODAY, -70), contactChannel: 'In-app message',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.10, salaryCreditDay: 27, avgBalance3m: 9000, cardUtilisationPct3mAgo: 38, onTimePaymentsRun: 2 },
        recent: { incomeAed: 13000, intlTransfersAed: 1300, airlinePurchases: [], salaryLateDays: 0,
                  balanceNowAed: 7200, largestOutboundTransferAed: 1500, missedCollection: false },
        aecb: { cards: 3, cardLimitTotal: 45000, cardBalanceTotal: 43200 } } },
    { id: 'ML-04', customer: 'Lina Haddad', productId: 'personal_loan', amountAed: 25000, tenorMonths: 24,
      disbursedAt: addDaysIso(TODAY, -24), contactChannel: 'Email',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.12, salaryCreditDay: 25, avgBalance3m: 8500, cardUtilisationPct3mAgo: 30, onTimePaymentsRun: 0 },
        recent: { incomeAed: 12000, intlTransfersAed: 1500, airlinePurchases: [{ daysAfterDisbursal: 20, amountAed: 1900 }],
                  salaryLateDays: 0, balanceNowAed: 6300, largestOutboundTransferAed: 1200, missedCollection: false },
        aecb: { cards: 2, cardLimitTotal: 25000, cardBalanceTotal: 8000 } } },
    { id: 'ML-05', customer: 'Elena Petrova', productId: 'car_loan', amountAed: 85000, tenorMonths: 60,
      disbursedAt: addDaysIso(TODAY, -150), contactChannel: 'In-app message',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.35, salaryCreditDay: 27, avgBalance3m: 10500, cardUtilisationPct3mAgo: 22, onTimePaymentsRun: 5 },
        recent: { incomeAed: 15000, intlTransfersAed: 5250, airlinePurchases: [], salaryLateDays: 0,
                  balanceNowAed: 9800, largestOutboundTransferAed: 5250, missedCollection: false },
        aecb: { cards: 1, cardLimitTotal: 15000, cardBalanceTotal: 3000 } } },
    { id: 'ML-06', customer: 'Peter Lindqvist', productId: 'personal_loan', amountAed: 35000, tenorMonths: 36,
      disbursedAt: addDaysIso(TODAY, -45), contactChannel: 'SMS',
      redFlagData: {
        baseline: { intlTransfersShareOfIncome6m: 0.28, salaryCreditDay: 26, avgBalance3m: 7500, cardUtilisationPct3mAgo: 25, onTimePaymentsRun: 1 },
        recent: { incomeAed: 12500, intlTransfersAed: 10500, airlinePurchases: [], salaryLateDays: 0,
                  balanceNowAed: 5400, largestOutboundTransferAed: 4000, missedCollection: false },
        aecb: { cards: 2, cardLimitTotal: 18000, cardBalanceTotal: 5000 } } }
  ];

  // ---------------------------------------------------------------------------
  // sampleBook — seeded synthetic applications for policy simulation.
  //
  // personal_loan (140 rows): salaries lognormal 6k–60k, AECB scores centred
  //   ~660, ~8% no-hit, ~6% retirees. Generated with the same seed/draw order as
  //   v1 so the rows are unchanged; `bankSource` is derived deterministically.
  //
  // split (120 rows): consumer cash-flow profiles as seen through connected
  //   accounts — income lognormal (median ~15k), spend 40–105% of income (mean 60%),
  //   AECB obligations 0–32% of income, ~15% no-hit newcomers (with shorter
  //   connected history), ~15% freelancers with lumpy income, purchases
  //   AED 1k–30k, ~8% older than the 60-day lookback, plans 3/6/12.
  // ---------------------------------------------------------------------------
  function buildLoanBook() {
    const rnd = mulberry32(20260719 ^ 0x5EED);
    const normal = makeNormal(rnd);
    const rows = [];
    for (let i = 1; i <= 140; i++) {
      const salary = roundTo(clamp(Math.exp(Math.log(15000) + 0.55 * normal(0, 1)), 6000, 60000), 100);
      const retiree = rnd() < 0.06;
      const noHit = rnd() < 0.08;
      const score = noHit ? null : Math.round(clamp(normal(660, 55), 380, 880));
      const obligations = roundTo(salary * (0.05 + 0.55 * Math.pow(rnd(), 2)), 50);
      const esrPct = Math.round(clamp((obligations / salary) * 100 + normal(0, 6), 3, 95));
      // Cheque returns & delinquency correlate with low score.
      const risky = score !== null && score < 610;
      const cq = rnd();
      const chequeReturns12m = cq < (risky ? 0.65 : 0.92) ? 0 : (cq < (risky ? 0.88 : 0.98) ? 1 : 2);
      let worstDelinquency = 'NONE';
      if (score !== null) {
        const dq = rnd();
        if (score < 580) worstDelinquency = dq < 0.45 ? 'DPD90' : (dq < 0.65 ? 'DPD30' : (dq < 0.72 ? 'WRITEOFF' : 'NONE'));
        else if (score < 645) worstDelinquency = dq < 0.28 ? 'DPD30' : 'NONE';
        else worstDelinquency = dq < 0.05 ? 'DPD30' : 'NONE';
      }
      const amount = (2 + Math.floor(rnd() * 49)) * 10000;                  // 20k..500k
      const tenorMonths = [12, 24, 36, 48][Math.floor(rnd() * 4)];
      const salaryDetected = rnd() < 0.90;
      // Three in four verified salaries come through connected accounts; the rest via documents.
      const bankSource = salaryDetected && (i % 4 !== 0) ? 'ALTAREQ_TPP' : 'DOCUMENTS';
      rows.push({ id: 'PL-' + String(i).padStart(3, '0'), salaryMonthly: salary,
                  aecbScore: score, obligationsMonthly: obligations, esrPct, retiree,
                  chequeReturns12m, worstDelinquency, amount, tenorMonths, salaryDetected, bankSource });
    }
    return rows;
  }

  function buildSplitBook() {
    const rnd = mulberry32(20260719 ^ 0x5B117);
    const normal = makeNormal(rnd);
    const rows = [];
    for (let i = 1; i <= 120; i++) {
      const income = roundTo(clamp(Math.exp(Math.log(15000) + 0.5 * normal(0, 1)), 5000, 60000), 100);
      const freelancer = rnd() < 0.15;
      const volatility = freelancer ? Math.round(30 + rnd() * 45) : Math.round(clamp(normal(11, 6), 2, 38));
      const noHit = rnd() < 0.15;
      const aecbScore = noHit ? null : Math.round(clamp(normal(675, 55), 420, 860));
      // Newcomers (no-hit) have shorter connected history; most others have the full 12 months.
      const connectedMonths = noHit ? 1 + Math.floor(rnd() * 8) : (rnd() < 0.8 ? 12 : 3 + Math.floor(rnd() * 9));
      const obligations = noHit ? 0 : roundTo(income * 0.32 * Math.pow(rnd(), 1.8), 50);
      const spend = roundTo(income * clamp(normal(0.6, 0.14), 0.4, 1.05), 100);
      const risky = aecbScore !== null && aecbScore < 610;
      const cq = rnd();
      const chequeReturns = cq < (risky ? 0.6 : 0.93) ? 0 : (cq < (risky ? 0.85 : 0.985) ? 1 : 2);
      let worstDelinquency = 'NONE';
      if (aecbScore !== null) {
        const dq = rnd();
        if (aecbScore < 580) worstDelinquency = dq < 0.4 ? 'DPD90' : (dq < 0.6 ? 'DPD30' : (dq < 0.66 ? 'WRITEOFF' : 'NONE'));
        else if (aecbScore < 640) worstDelinquency = dq < 0.22 ? 'DPD30' : 'NONE';
        else worstDelinquency = dq < 0.04 ? 'DPD30' : 'NONE';
      }
      const purchaseAmount = roundTo(clamp(Math.exp(Math.log(5500) + 0.65 * normal(0, 1)), 1000, 30000), 100);
      const purchaseAgeDays = rnd() < 0.08 ? 61 + Math.floor(rnd() * 30) : Math.floor(rnd() * 45);
      const tenorMonths = [3, 6, 6, 12][Math.floor(rnd() * 4)];
      rows.push({ id: 'SP-' + String(i).padStart(3, '0'), income, spend, volatility, aecbScore,
                  connectedMonths, obligations, chequeReturns, worstDelinquency,
                  purchaseAmount, purchaseAgeDays, tenorMonths });
    }
    return rows;
  }

  // starter_loan (80 rows): customers who took the AED 1,000 starter loan and
  //   are due a re-decision. ~80% repaid on time (starterDpd 0), the rest late;
  //   most have 3–12 months of connected UAE accounts (~5% only 1–2); ~55%
  //   share home-country statements (6–30 months of credited history); income lognormal (median
  //   ~7.5k), spend 40–102% of income; ~20% carry a small AECB obligation and
  //   ~35% a home-country loan (homeObligations) that is only visible to the
  //   decision when statements are shared.
  function buildStarterBook() {
    const rnd = mulberry32(20260719 ^ 0x57A28);
    const normal = makeNormal(rnd);
    const rows = [];
    for (let i = 1; i <= 80; i++) {
      const income = roundTo(clamp(Math.exp(Math.log(7500) + 0.35 * normal(0, 1)), 3500, 20000), 100);
      const spend = roundTo(income * clamp(normal(0.66, 0.13), 0.4, 1.02), 100);
      const aecbObligations = rnd() < 0.2 ? roundTo(income * (0.03 + 0.12 * rnd()), 50) : 0;
      const homeObligations = rnd() < 0.35 ? roundTo(150 + 700 * rnd(), 50) : 0;
      const connectedMonths = rnd() < 0.05 ? 1 + Math.floor(rnd() * 2) : 3 + Math.floor(rnd() * 10);
      const statements = rnd() < 0.55;
      const statementMonths = statements ? 6 + Math.floor(rnd() * 25) : 0;
      const starterDpd = rnd() < 0.8 ? 0 : [3, 7, 14, 21, 35][Math.floor(rnd() * 5)];
      rows.push({ id: 'SL-' + String(i).padStart(3, '0'), starterDpd, connectedMonths, statements, statementMonths,
                  income, spend, aecbObligations, homeObligations });
    }
    return rows;
  }

  // car_loan (17 rows, hand-written — Addendum v2.7): a small, readable book in
  //   which every row exercises one rule, so a simulation reads like a story.
  //   Row shape = a personal-loan row (salaryMonthly, aecbScore, esrPct, …) plus
  //   `vehicle` {priceAed, condition, modelYear}, amount / tenor, and — on the
  //   rows whose customer granted Open Finance — `openFinance: true` with a
  //   `connected` block (income, spending, observed obligations, regular income).
  //   At the default pack: 8 APPROVE · 3 REFER · 6 DECLINE. Setting
  //   regularIncomeCountedPct to 0 shrinks CL-001 (160,000 → 134,000) and flips
  //   CL-002 to a decline (the rent was the difference).
  function buildCarBook() {
    const rent = (perReceipt, receipts) => [{ type: 'RENTAL', label: 'Rent — apartment', frequency: 'QUARTERLY', amountPerReceipt: perReceipt,
      receipts12m: receipts, monthlyEquivalent: perReceipt * 4 / 12, onSchedule: true, matchesTenancy: true }];
    const of = (income, spend, observed, ri) => ({ openFinance: true, connected: { source: 'ALTAREQ_TPP', monthsAvailable: 12, salaryDetected: true,
      avgMonthlyIncome: income, avgMonthlySpend: spend, observedObligationsMonthly: observed, regularIncome: ri || [] } });
    const car = (priceAed, condition, modelYear) => ({ vehicle: { priceAed, condition, modelYear } });
    const base = { age: 38, monthsInUae: 72, retiree: false, salaryDetected: true, salaryCertificate: true,
                   chequeReturns12m: 0, worstDelinquency: 'NONE', openFinance: false };
    const rows = [
      // APPROVE — Open Finance: verified rent lifts the DBR limit to the 80% LTV maximum (134,000 without it)
      ['CL-001', { salaryMonthly: 30000, aecbScore: 760, esrPct: 32, obligationsMonthly: 12500, amount: 160000, tenorMonths: 60 }, car(200000, 'NEW', 2026), of(36000, 14000, 12500, rent(18000, 4))],
      // APPROVE — Open Finance: without the rent the limit is below the AED 20,000 minimum (decline)
      ['CL-002', { salaryMonthly: 20000, aecbScore: 720, esrPct: 48, obligationsMonthly: 9700, amount: 88000, tenorMonths: 60 }, car(110000, 'USED', 2023), of(24000, 9000, 9700, rent(12000, 4))],
      // APPROVE — documents only, the request binds
      ['CL-003', { salaryMonthly: 25000, aecbScore: 745, esrPct: 20, obligationsMonthly: 3000, amount: 80000, tenorMonths: 48 }, car(120000, 'NEW', 2025)],
      // APPROVE — documents only, DBR headroom binds (RC_LIMIT_REDUCED)
      ['CL-004', { salaryMonthly: 18000, aecbScore: 700, esrPct: 36, obligationsMonthly: 6500, amount: 150000, tenorMonths: 60 }, car(190000, 'NEW', 2026)],
      // REFER — no AECB file (thin file)
      ['CL-005', { salaryMonthly: 22000, aecbScore: null, esrPct: null, obligationsMonthly: 0, monthsInUae: 14, amount: 70000, tenorMonths: 48 }, car(100000, 'NEW', 2026)],
      // REFER — score 650 sits between the decline cut-off and the refer line, no positive overlays
      ['CL-006', { salaryMonthly: 15000, aecbScore: 650, esrPct: 13, obligationsMonthly: 2000, employment: { tenureMonths: 12 }, amount: 60000, tenorMonths: 48 }, car(85000, 'USED', 2024)],
      // DECLINE — score below the cut-off
      ['CL-007', { salaryMonthly: 16000, aecbScore: 600, esrPct: 19, obligationsMonthly: 3000, amount: 60000, tenorMonths: 48 }, car(90000, 'NEW', 2026)],
      // DECLINE — used vehicle older than 5 years (RC_VEHICLE_INELIGIBLE)
      ['CL-008', { salaryMonthly: 26000, aecbScore: 735, esrPct: 15, obligationsMonthly: 4000, amount: 45000, tenorMonths: 48 }, car(60000, 'USED', 2018)],
      // DECLINE — DPD90 on the bureau file
      ['CL-009', { salaryMonthly: 19000, aecbScore: 640, esrPct: 26, obligationsMonthly: 5000, worstDelinquency: 'DPD90', amount: 80000, tenorMonths: 60 }, car(110000, 'NEW', 2026)],
      // REFER — no salary certificate on the documents path (income not verified)
      ['CL-010', { salaryMonthly: 28000, aecbScore: 742, esrPct: 9, obligationsMonthly: 2500, salaryCertificate: false, amount: 100000, tenorMonths: 60 }, car(140000, 'NEW', 2026)],
      // APPROVE — Open Finance, but only 3 of 4 quarterly rent receipts: rent not counted, DBR binds
      ['CL-011', { salaryMonthly: 24000, aecbScore: 750, esrPct: 38, obligationsMonthly: 9000, amount: 184000, tenorMonths: 60 }, car(230000, 'NEW', 2026), of(29000, 11000, 9000, rent(15000, 3))],
      // DECLINE — salary below the product minimum
      ['CL-012', { salaryMonthly: 7000, aecbScore: 700, esrPct: 7, obligationsMonthly: 500, amount: 30000, tenorMonths: 36 }, car(50000, 'USED', 2023)],
      // APPROVE — Open Finance, no regular income: the 80% LTV maximum binds
      ['CL-013', { salaryMonthly: 40000, aecbScore: 770, esrPct: 15, obligationsMonthly: 6000, amount: 240000, tenorMonths: 60 }, car(300000, 'NEW', 2026), of(40000, 15000, 6000)],
      // APPROVE — a 3-year-old used car within the 5-year limit (grade B)
      ['CL-014', { salaryMonthly: 21000, aecbScore: 728, esrPct: 19, obligationsMonthly: 4000, amount: 60000, tenorMonths: 48 }, car(75000, 'USED', 2023)],
      // APPROVE — retiree: the 30% DBR cap binds (RC_RETIREE_CAP)
      ['CL-015', { salaryMonthly: 20000, aecbScore: 760, esrPct: 23, obligationsMonthly: 4500, age: 63, retiree: true, amount: 120000, tenorMonths: 60 }, car(160000, 'NEW', 2026)],
      // DECLINE — request below the AED 20,000 product minimum
      ['CL-016', { salaryMonthly: 12000, aecbScore: 710, esrPct: 13, obligationsMonthly: 1500, amount: 15000, tenorMonths: 36 }, car(25000, 'USED', 2022)],
      // DECLINE — existing obligations already above 50% of salary (no DBR headroom)
      ['CL-017', { salaryMonthly: 15000, aecbScore: 700, esrPct: 53, obligationsMonthly: 8000, amount: 60000, tenorMonths: 48 }, car(90000, 'NEW', 2026)]
    ];
    return rows.map(([id, r, v, o]) => Object.assign({ id }, base, r, v, o || {}));
  }

  // ---------------------------------------------------------------------------
  // Lenders of record (Addendum v2.5 / v2.6). Noor arranges and decides; a
  // partner bank books, funds and collects the loan, and receives a credit memo
  // built from an allowlist (never Open Finance data).
  // ---------------------------------------------------------------------------
  const lenders = [
    { id: 'partner-bank', name: 'Partner Bank', nameAr: 'البنك الشريك', role: 'Lender of record' }
  ];

  const MizanData = {
    VERSION: 'data-2.0',
    TODAY: TODAY,
    monthLabels: monthLabels,
    personasSplit: personasSplit,
    personasLoan: personasLoan,
    personasUpgrade: personasUpgrade,
    personasJourney: personasJourney,
    personasCar: personasCar,
    seededDocumentCases: seededDocumentCases,
    lenders: lenders,
    reasonCodes: reasonCodes,
    earlyWarning: earlyWarning,
    monitoredLoans: monitoredLoans,
    sampleBook: { split: buildSplitBook(), personal_loan: buildLoanBook(), starter_loan: buildStarterBook(), car_loan: buildCarBook() },
    history: { days: 90, seed: 20260719 }
  };

  globalThis.MizanData = MizanData;
})();

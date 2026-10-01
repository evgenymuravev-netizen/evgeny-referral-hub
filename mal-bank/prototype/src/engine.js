/*
 * Mizan — Noor's credit decisioning layer · MizanEngine (engine-2.0)
 * One shared engine behind Noor's three consumer credit products:
 *   split          — retroactive Pay in 3 / 6 / 12 on a verified past purchase,
 *                    revolving split capacity sized on connected-account cash flow
 *   personal_loan  — conventional amortising cash loan (reducing-balance APR)
 *   salary_advance — single-repayment advance against the next salary, flat fee
 * Binding spec: ../NOOR-PIVOT.md (overrides ../CONTRACT.md where they conflict).
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
 *    acknowledged → agreement e-signed → cooling-off cleared → disbursed.
 *    An approval is a risk decision, NOT a loan — out-of-order steps throw.
 *  - Split pricing: flat monthly fee on the principal, with the APR equivalent
 *    (IRR of the instalment schedule) disclosed for the KFS.
 *  - Thin-file thesis: an AECB no-hit customer with enough connected-account
 *    history is underwritten on cash flow (proxy base 640, grade capped at B).
 *  - Cross-border Credit Passport path for personal-loan newcomers (consented
 *    home-bureau file, conservative overlay, grade cap B, 50% limit haircut).
 *  - 4-eyes on policy publish and refer overrides; regulatory primitives locked.
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
  const SPLIT_PLAN_MONTHS = [3, 6, 12];  // the only permitted split terms
  const CASH_FLOW_PROXY_BASE = 640;      // scorecard base on the AECB no-hit cash-flow path

  // Conventional execution events, in the only valid order (CBUAE consumer protection).
  const EXEC_EVENTS = ['OFFER_ACCEPTED', 'KFS_ACKNOWLEDGED', 'AGREEMENT_SIGNED',
                       'COOLING_OFF_CLEARED', 'DISBURSED'];
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
      guard: 'the agreement must be e-signed via UAE PASS before the cooling-off period can start' },
    COOLING_OFF_CLEARED: {
      label: 'Cooling-off cleared',
      description: '5 business days elapsed, or written waiver signed (CPR 8/2020)',
      guard: 'no disbursement before the cooling-off period clears or is waived — CBUAE Consumer Protection Regulation 8/2020' },
    DISBURSED: {
      label: 'Disbursed',
      description: {
        personal_loan: 'Funds credited to the customer\'s account',
        split: 'Purchase amount credited back — freed cash routed to the customer\'s goal',
        salary_advance: 'Advance credited to the customer\'s account'
      },
      guard: 'funds must be disbursed to complete the sequence' }
  };

  const MANIFESTS = [
    { productId: 'split', nameEn: 'Split a purchase', nameAr: 'تقسيط مشترياتك',
      segment: 'CONSUMER', structure: 'Instalment plan (revolving split capacity)', pricingMode: 'MONTHLY_FEE' },
    { productId: 'personal_loan', nameEn: 'Personal loan', nameAr: 'قرض شخصي',
      segment: 'CONSUMER', structure: 'Amortising loan (reducing balance)', pricingMode: 'BANDED_APR' },
    { productId: 'salary_advance', nameEn: 'Salary advance', nameAr: 'سلفة على الراتب',
      segment: 'CONSUMER', structure: 'Single-repayment advance', pricingMode: 'FLAT_FEE' }
  ];

  // ---------------------------------------------------------------------------
  // Policy store: regulatory (locked — engine enforces regardless of params)
  // vs params (editable in the console under 4-eyes governance).
  // ---------------------------------------------------------------------------
  function defaultPolicies() {
    return {
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
      salary_advance: {
        productId: 'salary_advance', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        // Repayable in one go from the next salary credit. A flat fee, no interest:
        // a commercial choice that sits within the CBUAE retail fee schedule.
        regulatory: { dbrCapPct: 50, aecbCheckRequired: true, tenorCapMonths: 1 },
        params: { pctOfSalary: 80, capAmount: 13500, flatFee: 50, minSalary: 5000,
                  scoreDecline: 600, tokenValidityDays: 7 }
      }
    };
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
                      minSalary: [3000, 15000], scoreDecline: [550, 700], tokenValidityDays: [3, 14] }
  };

  // Approval-token conditions by product (conventional recourse + disclosure).
  const TOKEN_CONDITIONS = {
    personal_loan: ['Key Facts Statement acknowledged (AR + EN)',
                    'Salary transfer assignment or direct debit mandate',
                    'Credit life & job-loss cover offered (optional)'],
    split: ['Key Facts Statement acknowledged (AR + EN)',
            'Direct debit mandate on connected account'],
    salary_advance: ['Key Facts Statement acknowledged (AR + EN)',
                     'Repayable in full from the next salary credit']
  };

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
  // connected-account salary verification overlay replacing the old in-house
  // salary-transfer overlay.
  function loanScore(p, crossBorder, connectedSalary) {
    // Cross-border path: consented home-bureau score is the base, with a flat
    // conservatism overlay; grade capped at B.
    const base = (p.aecbHit && p.score !== null) ? p.score
               : (crossBorder && p.homeBureau ? p.homeBureau.score : null);
    const sc = SCORECARDS.loan;
    if (base === null) {
      return { model: sc.model, version: sc.version, base: null, overlays: [], points: null, grade: null };
    }
    const overlays = [];
    if (crossBorder) overlays.push({ name: 'Cross-border conservatism', delta: -40 });
    if (p.esrPct !== null && p.esrPct > 40) overlays.push({ name: 'ESR > 40%', delta: -20 });
    if (p.chequeReturns12m >= 1) overlays.push({ name: 'Returned cheques (12m)', delta: -30 });
    if (connectedSalary) overlays.push({ name: 'Salary verified via connected account', delta: 15 });
    if (p.tenureMonths >= 24) overlays.push({ name: 'Employment tenure ≥ 24m', delta: 10 });
    const points = base + overlays.reduce((s, o) => s + o.delta, 0);
    let grade = pointsToGrade(points);
    if (crossBorder && grade === 'A') grade = 'B';
    return { model: sc.model, version: sc.version, base, overlays, points, grade };
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
  function evaluateLoan(p, amount, tenorMonths, pol, consents) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();

    // Cross-border Credit Passport path: a thin-file newcomer whose home-country
    // bureau file is importable AND consented is underwritten on that file —
    // conservative overlay, grade capped at B, 50% limit haircut — instead of
    // falling to the thin-file REFER. No consent → the thin-file path is unchanged.
    const crossBorder = !p.aecbHit && p.creditPassportAvailable === true &&
                        !!(consents && consents.creditPassport === true) && !!p.homeBureau;
    // Consented home-country obligations count toward serviceability.
    const obligations = p.obligationsMonthly + (crossBorder ? (p.homeBureau.obligationsMonthlyAed || 0) : 0);
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
           p.aecbHit ? 'PASS' : (crossBorder ? 'PASS' : (prm.thinFileAction === 'DECLINE' ? 'FAIL' : 'REFER')),
           p.aecbHit ? 'file present' : (crossBorder ? 'no-hit — Credit Passport substitutes' : 'no-hit / thin file'),
           'AECB hit', 'RC_THIN_FILE');
    if (crossBorder) {
      rs.add('POL_CREDIT_PASSPORT', 'Consented home-country bureau file verified (Credit Passport)', 'POLICY',
             'PASS', p.homeBureau.bureau + ' · ' + p.homeBureau.score + ' (' + p.homeBureau.country + ', ' +
             p.homeBureau.historyYears + 'y history)', 'consent + home-bureau hit', null);
    }

    // Scorecard v0
    const score = loanScore(p, crossBorder, connectedSalary);
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

    // Cross-border haircut: the limit is computed normally, then halved — the
    // entry book on home-country data starts at 50% of the equivalent local limit.
    if (crossBorder && Number.isFinite(approved) && approved > 0) {
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

    const outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;

    // Reason codes attached to non-decline outcomes
    if (outcome === 'APPROVE') {
      if (crossBorder) rs.reason('RC_CROSS_BORDER');
      if (binding === 'RETIREE_CAP') rs.reason('RC_RETIREE_CAP');
      if (approved < amount) rs.reason('RC_LIMIT_REDUCED');
    }

    const features = {
      verifiedIncome: p.salaryDetected ? p.salaryMonthly : null,
      incomeSource: connectedSalary ? 'ALTAREQ_TPP' : (p.salaryDetected ? 'DOCUMENTS' : 'UNVERIFIED'),
      salaryVerifiedViaConnectedAccount: connectedSalary,
      existingObligations: obligations, esrPct: p.esrPct,
      dbrCapApplied: dbrCap, headroomMonthly, newInstallment, dbrPct,
      effectiveTenor: effTenor, scoreBase: score.base, overlayNet,
      retiree: p.retiree, thinFile: !p.aecbHit,
      crossBorder: crossBorder,
      homeObligationsMonthly: crossBorder ? (p.homeBureau.obligationsMonthlyAed || 0) : 0
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

  function evaluate(productId, rawApplicant, amount, tenorMonths, pol, consents) {
    if (productId === 'split') return evaluateSplit(normalizeSplit(rawApplicant), amount, tenorMonths, pol);
    if (productId === 'personal_loan') return evaluateLoan(normalizeLoan(rawApplicant), amount, tenorMonths, pol, consents);
    if (productId === 'salary_advance') return evaluateAdvance(normalizeLoan(rawApplicant), amount, tenorMonths, pol);
    throw err('unknown productId "' + productId + '"');
  }

  // ---------------------------------------------------------------------------
  // Simulated data pulls for the decision record / orchestration timeline.
  // Sources: AECB_CONSUMER | CREDIT_PASSPORT | OPEN_FINANCE | DOCUMENTS
  // ---------------------------------------------------------------------------
  function buildDataPulls(productId, ev, consents, seq) {
    const pulls = [];
    let i = 0;
    const p = ev.profile;
    pulls.push({ source: 'AECB_CONSUMER', status: p.aecbHit ? 'HIT' : 'NO_HIT',
                 latencyMs: pullLatency(seq, i++), cached: false,
                 summary: productId === 'split'
                   ? { score: p.score, obligationsMonthly: p.obligationsMonthly,
                       chequeReturns12m: p.chequeReturns12m, worstDelinquency: p.worstDelinquency }
                   : { score: p.score, esrPct: p.esrPct, tradelines: p.tradelines,
                       obligationsMonthly: p.obligationsMonthly, worstDelinquency: p.worstDelinquency } });
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
    return pulls;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function init(data) {
    if (!data || data.TODAY !== '2026-07-19' || !Array.isArray(data.personasSplit) ||
        !Array.isArray(data.personasLoan) || !data.reasonCodes || !data.sampleBook ||
        !Array.isArray(data.sampleBook.split) || !Array.isArray(data.sampleBook.personal_loan) || !data.history) {
      throw err('init() requires the MizanData object (load data.js first)');
    }
    D = data;
    S = {
      policies: defaultPolicies(),
      policyHistory: { split: [], personal_loan: [], salary_advance: [] },
      decisions: [],           // newest first via listDecisions()
      byId: Object.create(null),
      seq: 0, clockTicks: 0,
      splitDraws: Object.create(null),   // decisionId -> [{amount, months, monthlyPayment, at}]
      seeded: null
    };
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
    const tot = { split: blank(), personal_loan: blank(), salary_advance: blank() };
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
  const REFER_SLA_HOURS = { split: 4, personal_loan: 8, salary_advance: 4 };

  function manifests() { ensureInit(); return clone(MANIFESTS); }

  // Execution steps with UI labels for a product (descriptions vary for DISBURSED).
  function execSteps(productId) {
    const pid = productId || 'personal_loan';
    if (!MANIFESTS.some(m => m.productId === pid)) throw err('unknown productId "' + productId + '"');
    return EXEC_EVENTS.map(type => {
      const info = EXEC_STEP_INFO[type];
      const description = typeof info.description === 'string' ? info.description : info.description[pid];
      return { type, label: info.label, description };
    });
  }

  function getPolicyRef(productId) {
    const pol = S.policies[productId];
    if (!pol) throw err('unknown productId "' + productId + '"');
    return pol;
  }
  function getPolicy(productId) { ensureInit(); return clone(getPolicyRef(productId)); }

  // Validates candidate params: known keys only, regulatory keys rejected, bounds enforced.
  function validateParams(productId, params) {
    const pol = getPolicyRef(productId);
    if (!params || typeof params !== 'object' || Array.isArray(params)) throw err('params must be an object');
    const bounds = PARAM_BOUNDS[productId];
    for (const key of Object.keys(params)) {
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
    validateParams(productId, params);
    const changes = [];
    for (const key of Object.keys(params)) {
      const before = JSON.stringify(pol.params[key]), after = JSON.stringify(params[key]);
      if (before !== after) changes.push({ key, from: JSON.parse(before), to: JSON.parse(after) });
    }
    for (const c of changes) pol.params[c.key] = clone(params[c.key]);
    pol.version += 1;
    pol.publishedAt = nowIso();
    pol.publishedBy = meta.author;
    pol.approvedBy = meta.approver;
    S.policyHistory[productId].push({ version: pol.version, publishedAt: pol.publishedAt,
                                      publishedBy: meta.author, approvedBy: meta.approver, changes });
    return { version: pol.version };
  }

  function policyHistory(productId) { ensureInit(); getPolicyRef(productId); return clone(S.policyHistory[productId]); }

  function tokenFor(productId, recId, issuedAt, pol, ev, extra) {
    const conditions = TOKEN_CONDITIONS[productId].slice();
    if (productId === 'personal_loan' && ev && ev.features && ev.features.crossBorder) {
      conditions.push('Remittance-linked repayment schedule');
    }
    if (extra) conditions.push(extra);
    return { id: 'TKN-' + recId, issuedAt,
             expiresAt: addDaysIso(D.TODAY, pol.params.tokenValidityDays) + 'T23:59:59.000Z',
             conditions };
  }

  function decide(application) {
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
    const amount = application.amount;
    const tenorMonths = application.tenorMonths;
    if (!Number.isFinite(amount) || amount <= 0) throw err('application.amount must be a positive number (AED)');
    if (!Number.isFinite(tenorMonths) || tenorMonths <= 0) throw err('application.tenorMonths must be a positive number');

    const pol = getPolicyRef(productId);
    const ev = evaluate(productId, applicant, Math.round(amount), Math.round(tenorMonths), pol, consents);

    S.seq += 1;
    const id = 'MZN-' + String(S.seq).padStart(6, '0');
    const createdAt = nowIso();
    const consentAt = createdAt;
    const pulls = buildDataPulls(productId, ev, consents, S.seq);
    const token = ev.outcome === 'APPROVE' ? tokenFor(productId, id, createdAt, pol, ev) : null;

    const record = {
      id, createdAt, productId, segment: 'CONSUMER',
      applicantSnapshot: clone(applicant),
      request: { amount: Math.round(amount), tenorMonths: Math.round(tenorMonths) },
      consents: { aecb: { granted: true, at: consentAt },
                  openFinance: { granted: consents.openFinance === true, at: consents.openFinance === true ? consentAt : null },
                  creditPassport: { granted: consents.creditPassport === true, at: consents.creditPassport === true ? consentAt : null } },
      dataPulls: pulls,
      features: ev.features,
      rules: ev.rules,
      score: ev.score,
      limit: ev.limit,
      pricing: ev.pricing,
      outcome: ev.outcome,
      reasonCodes: ev.reasonCodes.slice(),
      token,
      policyVersion: pol.version, engineVersion: ENGINE_VERSION,
      events: [],
      audit: [{ at: createdAt, actor: 'engine', action: 'DECISION_CREATED',
                detail: ev.outcome + ' · policy v' + pol.version + ' · ' + ev.score.model + ' ' + ev.score.version }],
      override: null,
      status: 'OPEN'
    };
    S.decisions.push(record);
    S.byId[id] = record;
    return record;
  }

  // Convenience for simulation — same logic, no side effects, no record stored.
  function rowAmount(row) {
    return row.amount !== undefined ? row.amount : (row.purchaseAmount !== undefined ? row.purchaseAmount : 100000);
  }
  function decideRaw(productId, sampleRow) {
    ensureInit();
    const pol = getPolicyRef(productId);
    const ev = evaluate(productId, sampleRow, rowAmount(sampleRow), sampleRow.tenorMonths || 12, pol);
    return { outcome: ev.outcome, reasonCodes: ev.reasonCodes.slice(),
             grade: ev.score.grade, approved: ev.limit.approved,
             bindingConstraint: ev.limit.bindingConstraint, dbrPct: ev.features.dbrPct };
  }

  function bookFor(productId) {
    return productId === 'split' ? D.sampleBook.split : D.sampleBook.personal_loan;  // salary_advance reuses the loan book
  }

  function simulateBook(productId, candidateParams) {
    ensureInit();
    const pol = getPolicyRef(productId);
    validateParams(productId, candidateParams);
    const book = bookFor(productId);
    const candidate = clone(pol);
    for (const key of Object.keys(candidateParams)) candidate.params[key] = clone(candidateParams[key]);
    const before = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const after = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const flips = [];
    let flipCount = 0;
    for (const row of book) {
      const amt = rowAmount(row), ten = row.tenorMonths || 12;
      const b = evaluate(productId, row, amt, ten, pol);
      const a = evaluate(productId, row, amt, ten, candidate);
      before[b.outcome]++; after[a.outcome]++;
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
    return { size: book.length, before, after, flips, summary };
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
    rec.audit.push({ at, actor: 'engine', action: 'SPLIT_CHECK',
                     detail: (allowed ? 'allowed' : 'blocked') + ' · ' + aed(amount) + ' · Pay in ' + months +
                             (reasonCodes.length ? ' · ' + reasonCodes.join(',') : '') });
    return { allowed, amount, remainingAfter, reasonCodes,
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
    if (rec.status === 'EXECUTED') throw err('agreement already fully executed for ' + decisionId);
    const expected = EXEC_EVENTS[rec.events.length];
    if (eventType !== expected) {
      throw err('out of sequence — expected ' + expected + ' next (' + EXEC_STEP_INFO[expected].guard + ')');
    }
    const at = nowIso();
    rec.events.push({ type: eventType, at });
    rec.audit.push({ at, actor: 'product-layer', action: 'EXEC_EVENT', detail: eventType });
    if (rec.events.length === EXEC_EVENTS.length) {
      rec.status = 'EXECUTED';
      rec.audit.push({ at: nowIso(), actor: 'engine', action: 'STATUS',
                       detail: 'EXECUTED — consumer-protection sequence complete; ' +
                               (rec.productId === 'split' ? 'the instalment plan now exists' : 'the loan now exists') });
    }
    return rec;
  }

  // Analyst override on a referred case — reason-coded, 4-eyes enforced.
  function override(decisionId, o) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.outcome !== 'REFER' || rec.override) throw err('override applies only to open REFER decisions');
    if (!o || (o.outcome !== 'APPROVE' && o.outcome !== 'DECLINE')) throw err('override outcome must be APPROVE or DECLINE');
    if (!o.reasonCode || !D.reasonCodes[o.reasonCode]) throw err('override requires a valid reasonCode from MizanData.reasonCodes');
    if (typeof o.analyst !== 'string' || !o.analyst.trim() || typeof o.approver !== 'string' || !o.approver.trim()) {
      throw err('override requires analyst and approver names');
    }
    if (o.analyst.trim().toLowerCase() === o.approver.trim().toLowerCase()) {
      throw err('4-eyes violation — override analyst and approver must be different people');
    }
    const at = nowIso();
    rec.override = { outcome: o.outcome, reasonCode: o.reasonCode, analyst: o.analyst,
                     approver: o.approver, note: o.note || '', at };
    rec.outcome = o.outcome;
    rec.status = 'OVERRIDDEN';
    if (!rec.reasonCodes.includes(o.reasonCode)) rec.reasonCodes.push(o.reasonCode);
    if (o.outcome === 'APPROVE' && !rec.token && rec.limit.approved > 0) {
      const pol = getPolicyRef(rec.productId);
      rec.token = tokenFor(rec.productId, rec.id, at, pol, { features: rec.features },
                           'Approved by override — ' + o.analyst + ' / ' + o.approver);
    }
    if (o.outcome === 'DECLINE') {
      rec.limit.approved = 0; rec.token = null; rec.pricing = null;
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
    const open = S.decisions
      .filter(r => r.outcome === 'REFER' && !r.override)
      .map(r => {
        const sla = REFER_SLA_HOURS[r.productId] || 8;
        const name = r.applicantSnapshot.name || r.id;
        return { id: r.id, name, segment: 'CONSUMER', productId: r.productId, createdAt: r.createdAt,
                 reason: r.reasonCodes[0] || 'RC_MANUAL_REVIEW', reasonCodes: r.reasonCodes.slice(),
                 waitingHours: 0, slaHoursLeft: sla, seeded: false };
      });
    return open.concat(clone(S.seeded.queue));
  }

  function metrics() {
    ensureInit();
    const sd = S.seeded;
    const prod = {};
    for (const pid of ['split', 'personal_loan', 'salary_advance']) prod[pid] = Object.assign({}, sd.tot[pid]);
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
      earlyWarning: clone(D.earlyWarning || [])
    };
  }

  const MizanEngine = {
    VERSION: ENGINE_VERSION,
    EXEC_EVENTS: EXEC_EVENTS.slice(),
    init, manifests, execSteps, getPolicy, publishPolicy, policyHistory,
    decide, decideRaw, simulateBook, drawdownCheck, recordEvent, override,
    listDecisions, getDecision, referQueue, metrics
  };

  globalThis.MizanEngine = MizanEngine;
})();

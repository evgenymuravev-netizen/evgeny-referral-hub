/*
 * Mizan prototype — MizanEngine (engine-1.0)
 * Shared credit decisioning engine for the Mizan demo. See
 * mal-bank/PRD-credit-decisioning.md and mal-bank/prototype/CONTRACT.md (§2).
 *
 * Encodes the regulatory & Shari'ah guardrails as code the reviewers can read:
 *  - DBR ≤ 50% of gross salary + regular income, ≤ 30% for retirees (Reg 29/2011)
 *  - Personal finance ≤ 20× salary; tenor ≤ 48 months (Reg 29/2011)
 *  - Mandatory AECB pull, consent-gated (Federal Law 6/2010)
 *  - Qard Hassan flat admin fee only — never scales with amount/tenor (AAOIFI SS 19)
 *  - Murabaha/Tawarruq execution sequencing enforced event-by-event (AAOIFI SS 8/30):
 *    approval is a risk decision, NOT a contract — the debt exists only after the
 *    ordered promise → wakala → commodity purchase → offer/acceptance sequence.
 *  - ISSC sector screen (AAOIFI SS 21 taxonomy + ISSC tobacco ruling)
 *  - 4-eyes on policy publish and refer overrides; regulatory primitives locked.
 *
 * Deterministic: no Math.random() in any decision path; synthetic timestamps and
 * seeded history derive from MizanData.TODAY + MizanData.history.seed. Stateful
 * in-memory; init(MizanData) resets everything. No DOM. Node ≥ 16 and browsers.
 */
(function () {
  'use strict';

  const ENGINE_VERSION = 'engine-1.0';
  const SCORECARD = { model: 'scorecard_v0', version: '0.3' };

  // Shari'ah execution events, in the only valid order (AAOIFI SS 8 / SS 30).
  const EXEC_EVENTS = ['PROMISE_SIGNED', 'WAKALA_SIGNED', 'COMMODITY_PURCHASED',
                       'MURABAHA_OFFER_SENT', 'MURABAHA_ACCEPTED', 'PROCEEDS_CREDITED'];

  const MANIFESTS = [
    { productId: 'retail_pf', nameEn: 'Retail Personal Finance', nameAr: 'التمويل الشخصي',
      segment: 'RETAIL', structure: 'Murabaha/Tawarruq', pricingMode: 'BANDED' },
    { productId: 'sme_wc', nameEn: 'SME Working Capital', nameAr: 'تمويل رأس المال العامل',
      segment: 'SME', structure: 'Revolving Tawarruq', pricingMode: 'BANDED' },
    { productId: 'salary_advance', nameEn: 'Salary Advance', nameAr: 'السلفة على الراتب (قرض حسن)',
      segment: 'RETAIL', structure: 'Qard Hassan', pricingMode: 'FLAT_FEE' }
  ];

  // ---------------------------------------------------------------------------
  // Policy store: regulatory (locked — engine enforces regardless of params)
  // vs params (editable in the console under 4-eyes governance).
  // ---------------------------------------------------------------------------
  function defaultPolicies() {
    return {
      retail_pf: {
        productId: 'retail_pf', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, salaryMultipleCap: 20,
                      tenorCapMonths: 48, aecbCheckRequired: true, coolingOffDays: 5 },
        params: { minSalary: 8000, minAge: 21, maxAge: 65, scoreDecline: 620,
                  scoreRefer: 680, maxEsrPct: 60, thinFileAction: 'REFER',
                  minMonthsInUae: 6, chequeReturnsMax: 1, productCap: 2000000,
                  pricingBands: { A: [0.0549, 0.0599], B: [0.0649, 0.0699], C: [0.0749, 0.0849] },
                  tokenValidityDays: 14 }
      },
      sme_wc: {
        productId: 'sme_wc', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        regulatory: { aecbCheckRequired: true, sectorScreenVersion: 'ISSC-2026.2' },
        params: { minLicenseAgeMonths: 12, minMonthsBankData: 6, ownerScoreFloor: 550,
                  commercialScoreRefer: 640, maxVolatilityPct: 45, chequeReturnsMax: 2,
                  inflowMultiple: { A: 1.5, B: 1.2, C: 0.8 },
                  tenorCapMonths: 36, productCap: 5000000,
                  pricingBands: { A: [0.0699, 0.0749], B: [0.0799, 0.0899], C: [0.0949, 0.1049] },
                  guaranteeThreshold: 1000000, tokenValidityDays: 14 }
      },
      salary_advance: {
        productId: 'salary_advance', version: 1,
        publishedAt: null, publishedBy: 'system (default pack)', approvedBy: 'system',
        // Qard Hassan: repayable next payday; the only "pricing" is a flat admin
        // fee equal to actual service cost (AAOIFI SS 19) — no scaling levers exist.
        regulatory: { dbrCapPct: 50, dbrCapRetireePct: 30, tenorCapMonths: 1, aecbCheckRequired: true },
        params: { pctOfSalary: 80, capAmount: 13500, flatFee: 150, minSalary: 5000,
                  scoreDecline: 600, tokenValidityDays: 7 }
      }
    };
  }

  // Editable-parameter bounds enforced on publishPolicy/simulateBook.
  const PARAM_BOUNDS = {
    retail_pf: { minSalary: [4000, 25000], minAge: [18, 25], maxAge: [60, 70],
                 scoreDecline: [550, 720], scoreRefer: [600, 780], maxEsrPct: [30, 90],
                 minMonthsInUae: [0, 24], chequeReturnsMax: [0, 5], productCap: [100000, 5000000],
                 tokenValidityDays: [3, 30] },
    sme_wc: { minLicenseAgeMonths: [6, 60], minMonthsBankData: [3, 24], ownerScoreFloor: [450, 650],
              commercialScoreRefer: [550, 720], maxVolatilityPct: [20, 90], chequeReturnsMax: [0, 6],
              tenorCapMonths: [6, 36], productCap: [500000, 20000000],
              guaranteeThreshold: [250000, 5000000], tokenValidityDays: [3, 30] },
    salary_advance: { pctOfSalary: [50, 90], capAmount: [5000, 25000], flatFee: [50, 300],
                      minSalary: [3000, 15000], scoreDecline: [550, 700], tokenValidityDays: [3, 14] }
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
  const floor1000 = (x) => Math.max(0, Math.floor(x / 1000) * 1000);
  const round10000 = (x) => Math.round(x / 10000) * 10000;

  // Standard annuity math (used for retail DBR headroom, documented in CONTRACT §2.2):
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

  const GRADE_BANDS = [[740, 'A'], [680, 'B'], [620, 'C'], [560, 'D']];
  function pointsToGrade(points) {
    if (points === null || points === undefined) return null;
    for (const [floor, g] of GRADE_BANDS) if (points >= floor) return g;
    return 'E';
  }
  // Grades map to pricing/inflow bands: A→A, B→B, C/D→C (D approvals only via override).
  function gradeToBand(grade) {
    if (grade === 'A') return 'A';
    if (grade === 'B') return 'B';
    if (grade === 'C' || grade === 'D') return 'C';
    return null;
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
  function normalizeRetail(a) {
    if (!a || typeof a !== 'object') throw err('retail applicant payload missing');
    const emp = a.employment || {};
    const aecb = a.aecb || null;
    const hit = aecb ? aecb.hit === true : (a.aecbScore !== null && a.aecbScore !== undefined);
    return {
      id: a.id || null,
      name: a.name || a.id || 'Applicant',
      age: a.age !== undefined ? a.age : 35,
      monthsInUae: a.monthsInUae !== undefined ? a.monthsInUae : 120,
      retiree: emp.retiree !== undefined ? !!emp.retiree : !!a.retiree,
      salaryMonthly: emp.salaryMonthly !== undefined ? emp.salaryMonthly : a.salaryMonthly,
      salaryBank: emp.salaryBank || 'OTHER',
      tenureMonths: emp.tenureMonths !== undefined ? emp.tenureMonths : 24,
      aecbHit: hit,
      score: aecb ? aecb.score : (hit ? a.aecbScore : null),
      esrPct: aecb ? aecb.esrPct : (a.esrPct !== undefined ? a.esrPct : null),
      obligationsMonthly: aecb ? aecb.obligationsMonthly : (a.obligationsMonthly || 0),
      chequeReturns12m: aecb ? aecb.chequeReturns12m : (a.chequeReturns12m || 0),
      worstDelinquency: aecb ? aecb.worstDelinquency : (a.worstDelinquency || 'NONE'),
      creditPassportAvailable: aecb ? !!aecb.creditPassportAvailable : false,
      salaryDetected: a.bankData ? a.bankData.salaryDetected === true
                                 : (a.salaryDetected !== undefined ? !!a.salaryDetected : true),
      bankSource: a.bankData ? a.bankData.source : 'ALTAREQ_TPP',
      tradelines: aecb ? (aecb.tradelines || 0) : 0
    };
  }

  function normalizeSme(a) {
    if (!a || typeof a !== 'object') throw err('SME applicant payload missing');
    const lic = a.license || {};
    const com = a.aecbCommercial || null;
    const bank = a.bank || {};
    let ownerWorstScore = null, ownerWorstDelinquency = 'NONE', ownerCheques = 0, owners = [];
    if (Array.isArray(a.owners)) {
      owners = a.owners;
      const sev = { NONE: 0, DPD30: 1, DPD90: 2, WRITEOFF: 3 };
      for (const o of a.owners) {
        const oa = o.aecb || {};
        if (oa.hit && oa.score !== null && oa.score !== undefined) {
          ownerWorstScore = ownerWorstScore === null ? oa.score : Math.min(ownerWorstScore, oa.score);
        }
        if (sev[oa.worstDelinquency || 'NONE'] > sev[ownerWorstDelinquency]) ownerWorstDelinquency = oa.worstDelinquency;
        ownerCheques += oa.chequeReturns12m || 0;
      }
    } else if (a.ownerWorstScore !== undefined) {
      ownerWorstScore = a.ownerWorstScore;
    }
    const commercialHit = com ? com.hit === true : (a.commercialScore !== null && a.commercialScore !== undefined);
    return {
      id: a.id || null,
      name: a.legalName || a.id || 'Entity',
      licenseAgeMonths: lic.ageMonths !== undefined ? lic.ageMonths : a.licenseAgeMonths,
      excludedActivity: lic.excludedActivity !== undefined ? !!lic.excludedActivity : !!a.excludedActivity,
      excludedCode: lic.excludedCode || null,
      commercialHit: commercialHit,
      commercialScore: com ? com.score : (commercialHit ? a.commercialScore : null),
      entityCheques: com ? (com.chequeReturns12m || 0) : (a.chequeReturns12m || 0),
      ownerWorstScore: ownerWorstScore,
      ownerWorstDelinquency: ownerWorstDelinquency,
      ownerCheques: ownerCheques,
      owners: owners,
      monthsBankData: bank.monthsAvailable !== undefined ? bank.monthsAvailable : 12,
      avgMonthlyInflow: bank.avgMonthlyInflow !== undefined ? bank.avgMonthlyInflow : a.avgMonthlyInflow,
      avgMonthlyOutflow: bank.avgMonthlyOutflow !== undefined ? bank.avgMonthlyOutflow : null,
      inflowVolatilityPct: bank.inflowVolatilityPct !== undefined ? bank.inflowVolatilityPct : a.inflowVolatilityPct,
      topCounterpartySharePct: bank.topCounterpartySharePct !== undefined ? bank.topCounterpartySharePct : null,
      bankSource: bank.source || 'DOCUMENTS'
    };
  }

  // ---------------------------------------------------------------------------
  // Scorecard v0 (CONTRACT §2.2)
  // ---------------------------------------------------------------------------
  function retailScore(p) {
    if (!p.aecbHit || p.score === null) {
      return { model: SCORECARD.model, version: SCORECARD.version, base: null, overlays: [], points: null, grade: null };
    }
    const overlays = [];
    if (p.esrPct !== null && p.esrPct > 40) overlays.push({ name: 'ESR > 40%', delta: -20 });
    if (p.chequeReturns12m >= 1) overlays.push({ name: 'Returned cheques (12m)', delta: -30 });
    if (p.salaryBank === 'MAL_BANK') overlays.push({ name: 'Salary-transfer customer', delta: 15 });
    if (p.tenureMonths >= 24) overlays.push({ name: 'Employment tenure ≥ 24m', delta: 10 });
    const points = p.score + overlays.reduce((s, o) => s + o.delta, 0);
    return { model: SCORECARD.model, version: SCORECARD.version, base: p.score, overlays, points, grade: pointsToGrade(points) };
  }

  function smeScore(p) {
    // Base = commercial score, or a 600 proxy for thin commercial files with
    // sufficiently strong bank data (≥6 months of verified flows).
    let base = null;
    if (p.commercialHit && p.commercialScore !== null) base = p.commercialScore;
    else if (p.monthsBankData >= 6 && p.avgMonthlyInflow > 0) base = 600;
    if (base === null) {
      return { model: SCORECARD.model, version: SCORECARD.version, base: null, overlays: [], points: null, grade: null };
    }
    const overlays = [];
    if (p.ownerWorstScore !== null && p.ownerWorstScore >= 700) overlays.push({ name: 'Owner worst score ≥ 700', delta: 20 });
    if (p.ownerWorstScore !== null && p.ownerWorstScore <= 600) overlays.push({ name: 'Owner worst score ≤ 600', delta: -40 });
    if (p.inflowVolatilityPct <= 25) overlays.push({ name: 'Inflow volatility ≤ 25%', delta: 15 });
    if (p.inflowVolatilityPct >= 45) overlays.push({ name: 'Inflow volatility ≥ 45%', delta: -25 });
    if (p.monthsBankData >= 12) overlays.push({ name: 'Bank data ≥ 12 months', delta: 10 });
    const points = base + overlays.reduce((s, o) => s + o.delta, 0);
    return { model: SCORECARD.model, version: SCORECARD.version, base, overlays, points, grade: pointsToGrade(points) };
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
    return { rules, reasons, add };
  }
  function outcomeFromRules(rules) {
    if (rules.some(r => r.result === 'FAIL')) return 'DECLINE';
    if (rules.some(r => r.result === 'REFER')) return 'REFER';
    return 'APPROVE';
  }

  // ---------------------------------------------------------------------------
  // Retail personal finance evaluation (PRD §5.3, §6.1)
  // ---------------------------------------------------------------------------
  function evaluateRetail(p, amount, tenorMonths, pol) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();

    // REGULATORY — mandatory bureau check (Federal Law 6/2010; consent gated upstream)
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');

    // REGULATORY — tenor cap 48 months (Reg 29/2011); over-cap requests are clamped.
    const effTenor = Math.min(tenorMonths, reg.tenorCapMonths);
    const clamped = tenorMonths > reg.tenorCapMonths;
    rs.add('REG_TENOR_CAP', 'Tenor within regulatory cap (Reg 29/2011)', 'REGULATORY',
           'PASS', clamped ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths, reg.tenorCapMonths,
           null);
    if (clamped) rs.reasons.push('RC_TENOR_CAP');

    // POLICY knock-outs
    const ageOk = p.age >= prm.minAge && p.age <= prm.maxAge;
    rs.add('POL_AGE', 'Applicant age within eligible range', 'POLICY',
           ageOk ? 'PASS' : 'FAIL', p.age, prm.minAge + '–' + prm.maxAge, 'RC_AGE');
    rs.add('POL_MIN_SALARY', 'Salary at or above product minimum', 'POLICY',
           p.salaryMonthly >= prm.minSalary ? 'PASS' : 'FAIL', p.salaryMonthly, prm.minSalary, 'RC_SALARY_FLOOR');
    rs.add('POL_MIN_MONTHS_UAE', 'Minimum UAE residency period', 'POLICY',
           p.monthsInUae >= prm.minMonthsInUae ? 'PASS' : 'REFER', p.monthsInUae, prm.minMonthsInUae, 'RC_MANUAL_REVIEW');
    rs.add('POL_INCOME_VERIFIED', 'Salary verified from account data', 'POLICY',
           p.salaryDetected ? 'PASS' : 'REFER', p.salaryDetected ? 'verified' : 'not detected', 'verified', 'RC_INCOME_UNVERIFIED');
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

    // Thin-file strategy (PRD §5.3 step 3): configurable action, default REFER.
    rs.add('POL_THIN_FILE', 'Credit file depth (thin-file strategy)', 'POLICY',
           p.aecbHit ? 'PASS' : (prm.thinFileAction === 'DECLINE' ? 'FAIL' : 'REFER'),
           p.aecbHit ? 'file present' : 'no-hit / thin file', 'AECB hit', 'RC_THIN_FILE');

    // Scorecard v0
    const score = retailScore(p);
    const overlayNet = score.overlays.reduce((s, o) => s + o.delta, 0);
    if (score.points !== null) {
      const cutoffOk = score.points >= prm.scoreDecline && score.grade !== 'E';
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off (grade E auto-fails)', 'POLICY',
             cutoffOk ? 'PASS' : 'FAIL', score.points + ' (' + (score.grade || '—') + ')', prm.scoreDecline, 'RC_SCORE_LOW');
      // Below the refer line, only net-positive overlays (e.g. salary-transfer
      // relationship + tenure, with no derogatory overlays) allow straight-through
      // approval at grade C — otherwise the case goes to an analyst.
      const referOk = score.points >= prm.scoreRefer || overlayNet > 0;
      rs.add('POL_SCORE_REFER', 'Score above refer line (or strong positive overlays)', 'POLICY',
             cutoffOk ? (referOk ? 'PASS' : 'REFER') : 'PASS',
             score.points, prm.scoreRefer, 'RC_MANUAL_REVIEW');
    } else {
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off', 'POLICY', 'PASS', 'no score (thin file)', prm.scoreDecline, null);
    }

    // Limit math (CONTRACT §2.2): candidates = [requested, PV-of-DBR-headroom,
    // 20× salary (Reg 29/2011), product cap]; approved = min; binding recorded.
    const dbrCap = p.retiree ? reg.dbrCapRetireePct : reg.dbrCapPct;
    const headroomMonthly = Math.round((dbrCap / 100) * p.salaryMonthly - p.obligationsMonthly);
    const band = gradeToBand(score.grade) || 'C';
    const bandRange = prm.pricingBands[band];
    const midRate = (bandRange[0] + bandRange[1]) / 2;
    const maxByDbr = headroomMonthly > 0 ? floor1000(pvAnnuity(headroomMonthly, midRate / 12, effTenor)) : 0;
    const maxBySalary = reg.salaryMultipleCap * p.salaryMonthly;
    const candidates = [
      { label: 'Requested amount', value: amount, key: 'REQUESTED' },
      { label: 'DBR headroom @ ' + dbrCap + '% cap (annuity PV, ' + effTenor + 'm)', value: maxByDbr,
        key: p.retiree ? 'RETIREE_CAP' : 'DBR_HEADROOM' },
      { label: reg.salaryMultipleCap + '× salary (Reg 29/2011)', value: maxBySalary, key: 'SALARY_MULTIPLE' },
      { label: 'Product cap', value: prm.productCap, key: 'PRODUCT_CAP' }
    ];
    let approved = Infinity, binding = 'REQUESTED';
    for (const c of candidates) if (c.value < approved) { approved = c.value; binding = c.key; }

    // REGULATORY — final DBR check on the approved amount (the double-enforcement:
    // even if params were mis-tuned, the engine never approves above the cap).
    const newInstallment = approved > 0 ? Math.round(annuityPayment(approved, midRate / 12, effTenor)) : 0;
    const dbrPct = p.salaryMonthly > 0 ? Math.round(((p.obligationsMonthly + newInstallment) / p.salaryMonthly) * 1000) / 10 : 999;
    const dbrOk = headroomMonthly > 0 && dbrPct <= dbrCap + 0.05; // rounding guard only
    rs.add('REG_DBR_CAP', 'Debt burden ratio within ' + dbrCap + '% cap (Reg 29/2011' + (p.retiree ? ', retiree' : '') + ')',
           'REGULATORY', dbrOk ? 'PASS' : 'FAIL', dbrPct + '%', dbrCap + '%', 'RC_DBR_EXCEEDED');
    rs.add('REG_SALARY_MULTIPLE', 'Facility within 20× salary (Reg 29/2011)', 'REGULATORY',
           approved <= maxBySalary ? 'PASS' : 'FAIL', approved, maxBySalary, 'RC_DBR_EXCEEDED');

    let outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;

    // Reason codes attached to non-decline outcomes
    if (outcome === 'APPROVE') {
      if (binding === 'RETIREE_CAP') { rs.reasons.push('RC_RETIREE_CAP'); }
      if (approved < amount && !rs.reasons.includes('RC_LIMIT_REDUCED')) rs.reasons.push('RC_LIMIT_REDUCED');
    }

    const features = {
      verifiedIncome: p.salaryDetected ? p.salaryMonthly : null,
      incomeSource: p.bankSource, salaryBank: p.salaryBank,
      existingObligations: p.obligationsMonthly, esrPct: p.esrPct,
      dbrCapApplied: dbrCap, headroomMonthly, newInstallment, dbrPct,
      effectiveTenor: effTenor, scoreBase: score.base, overlayNet,
      retiree: p.retiree, thinFile: !p.aecbHit
    };
    const limit = {
      requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
      bindingConstraint: binding,
      trace: candidates.map(c => ({ label: c.label, value: c.value }))
    };
    const pricing = outcome === 'DECLINE' ? null
      : { mode: 'BANDED', band, rateMin: bandRange[0], rateMax: bandRange[1], benchmark: 'EIBOR 3M + spread' };
    return { segment: 'RETAIL', profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor };
  }

  // ---------------------------------------------------------------------------
  // Salary advance — Qard Hassan (AAOIFI SS 19): pure eligibility + limit control.
  // The flat admin fee equals actual service cost and NEVER scales with amount,
  // tenor or risk — there is no pricing lever on this product by design.
  // ---------------------------------------------------------------------------
  function evaluateQard(p, amount, tenorMonths, pol) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();
    rs.add('REG_AECB_CHECK', 'AECB consumer report pulled before credit decision', 'REGULATORY',
           'PASS', p.aecbHit ? 'HIT' : 'NO_HIT', 'pull required');
    const effTenor = Math.min(tenorMonths, reg.tenorCapMonths);
    if (tenorMonths > reg.tenorCapMonths) rs.reasons.push('RC_TENOR_CAP');
    rs.add('REG_TENOR_CAP', 'Repayable from next salary credit (single cycle)', 'REGULATORY',
           'PASS', tenorMonths > reg.tenorCapMonths ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths,
           reg.tenorCapMonths, null);
    rs.add('POL_MIN_SALARY', 'Salary at or above product minimum', 'POLICY',
           p.salaryMonthly >= prm.minSalary ? 'PASS' : 'FAIL', p.salaryMonthly, prm.minSalary, 'RC_SALARY_FLOOR');
    rs.add('POL_INCOME_VERIFIED', 'Salary verified from account data', 'POLICY',
           p.salaryDetected ? 'PASS' : 'REFER', p.salaryDetected ? 'verified' : 'not detected', 'verified', 'RC_INCOME_UNVERIFIED');
    rs.add('POL_THIN_FILE', 'Credit file depth', 'POLICY',
           p.aecbHit ? 'PASS' : 'REFER', p.aecbHit ? 'file present' : 'no-hit / thin file', 'AECB hit', 'RC_THIN_FILE');
    const delinq = p.worstDelinquency || 'NONE';
    rs.add('POL_DELINQUENCY', 'Delinquency history acceptable', 'POLICY',
           (delinq === 'DPD90' || delinq === 'WRITEOFF') ? 'FAIL' : 'PASS', delinq, '< DPD90', 'RC_DELINQUENCY');
    const score = retailScore(p);
    if (score.points !== null) {
      rs.add('POL_SCORE_CUTOFF', 'Score at or above decline cut-off', 'POLICY',
             score.points >= prm.scoreDecline ? 'PASS' : 'FAIL', score.points, prm.scoreDecline, 'RC_SCORE_LOW');
    }
    // DBR-style guard: the advance is settled from the next salary credit, so the
    // regulatory check applies to existing obligations (the advance is not an
    // installment). Existing obligations must sit within the 50%/30% cap.
    const dbrCap = p.retiree ? reg.dbrCapRetireePct : reg.dbrCapPct;
    const existingDbr = p.salaryMonthly > 0 ? Math.round((p.obligationsMonthly / p.salaryMonthly) * 1000) / 10 : 999;
    rs.add('REG_DBR_CAP', 'Existing obligations within ' + dbrCap + '% DBR cap (Reg 29/2011)', 'REGULATORY',
           existingDbr <= dbrCap ? 'PASS' : 'FAIL', existingDbr + '%', dbrCap + '%', 'RC_DBR_EXCEEDED');

    // Limit = min(requested, pctOfSalary × salary, capAmount) — no other levers.
    const byPct = Math.floor((prm.pctOfSalary / 100) * p.salaryMonthly);
    const candidates = [
      { label: 'Requested amount', value: amount, key: 'REQUESTED' },
      { label: prm.pctOfSalary + '% of verified salary', value: byPct, key: 'SALARY_MULTIPLE' },
      { label: 'Product cap', value: prm.capAmount, key: 'PRODUCT_CAP' }
    ];
    let approved = Infinity, binding = 'REQUESTED';
    for (const c of candidates) if (c.value < approved) { approved = c.value; binding = c.key; }
    let outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;
    if (outcome === 'APPROVE' && approved < amount && !rs.reasons.includes('RC_LIMIT_REDUCED')) rs.reasons.push('RC_LIMIT_REDUCED');

    const features = {
      verifiedIncome: p.salaryDetected ? p.salaryMonthly : null,
      existingObligations: p.obligationsMonthly, dbrPct: existingDbr, dbrCapApplied: dbrCap,
      effectiveTenor: effTenor, scoreBase: score.base, thinFile: !p.aecbHit
    };
    const limit = { requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
                    bindingConstraint: binding, trace: candidates.map(c => ({ label: c.label, value: c.value })) };
    // Flat fee — constant regardless of amount/tenor/risk (AAOIFI SS 19).
    const pricing = outcome === 'DECLINE' ? null
      : { mode: 'FLAT_FEE', fee: prm.flatFee, note: 'AAOIFI SS 19 — fee is actual cost, cannot scale' };
    return { segment: 'RETAIL', profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor };
  }

  // ---------------------------------------------------------------------------
  // SME working capital evaluation (PRD §5.4)
  // ---------------------------------------------------------------------------
  function evaluateSme(p, amount, tenorMonths, pol) {
    const reg = pol.regulatory, prm = pol.params;
    const rs = makeRuleSet();

    rs.add('REG_AECB_CHECK', 'AECB commercial + owner reports pulled', 'REGULATORY',
           'PASS', p.commercialHit ? 'HIT' : 'NO_HIT', 'pull required');

    // SHARIAH — ISSC sector screen (AAOIFI SS 21 taxonomy + ISSC tobacco ruling)
    rs.add('SH_SECTOR_SCREEN', 'Activity permitted under ISSC sector screen', 'SHARIAH',
           p.excludedActivity ? 'FAIL' : 'PASS',
           p.excludedActivity ? ('excluded' + (p.excludedCode ? ' (' + p.excludedCode + ')' : '')) : 'permitted',
           reg.sectorScreenVersion, 'RC_SECTOR_EXCLUDED');

    rs.add('POL_LICENSE_AGE', 'Minimum trading history (license age)', 'POLICY',
           p.licenseAgeMonths >= prm.minLicenseAgeMonths ? 'PASS' : 'REFER',
           p.licenseAgeMonths, prm.minLicenseAgeMonths, 'RC_LICENSE_AGE');
    rs.add('POL_BANK_DATA', 'Minimum months of verified bank data', 'POLICY',
           p.monthsBankData >= prm.minMonthsBankData ? 'PASS' : 'REFER',
           p.monthsBankData, prm.minMonthsBankData, 'RC_INCOME_UNVERIFIED');
    rs.add('POL_OWNER_SCORE', 'Major shareholder score above floor (owner blend)', 'POLICY',
           (p.ownerWorstScore === null || p.ownerWorstScore >= prm.ownerScoreFloor) ? 'PASS' : 'FAIL',
           p.ownerWorstScore === null ? 'n/a' : p.ownerWorstScore, prm.ownerScoreFloor, 'RC_OWNER_SCORE');
    const od = p.ownerWorstDelinquency || 'NONE';
    rs.add('POL_OWNER_DELINQ', 'Owner delinquency history acceptable', 'POLICY',
           (od === 'DPD90' || od === 'WRITEOFF') ? 'FAIL' : (od === 'DPD30' ? 'REFER' : 'PASS'),
           od, '≤ DPD30 refers, ≥ DPD90 declines', 'RC_DELINQUENCY');
    const chequesTotal = (p.entityCheques || 0) + (p.ownerCheques || 0);
    rs.add('POL_CHEQUE_RETURNS', 'Entity + owner returned cheques within tolerance', 'POLICY',
           chequesTotal <= prm.chequeReturnsMax ? 'PASS' : 'FAIL',
           chequesTotal, prm.chequeReturnsMax, 'RC_CHEQUE_RETURNS');
    rs.add('POL_VOLATILITY', 'Inflow volatility within auto-approve threshold', 'POLICY',
           p.inflowVolatilityPct <= prm.maxVolatilityPct ? 'PASS' : 'REFER',
           p.inflowVolatilityPct + '%', prm.maxVolatilityPct + '%', 'RC_VOLATILITY');
    rs.add('POL_COMMERCIAL_THIN', 'Commercial credit file depth', 'POLICY',
           p.commercialHit ? 'PASS' : 'REFER', p.commercialHit ? 'file present' : 'no-hit / thin file',
           'AECB commercial hit', 'RC_THIN_FILE');

    const score = smeScore(p);
    if (score.points !== null) {
      rs.add('POL_SCORE_CUTOFF', 'Blended score above floor (grade E auto-fails)', 'POLICY',
             score.grade !== 'E' ? 'PASS' : 'FAIL', score.points + ' (' + score.grade + ')', '≥ 560', 'RC_SCORE_LOW');
      rs.add('POL_SCORE_REFER', 'Blended score above refer line', 'POLICY',
             score.grade === 'E' ? 'PASS' : (score.points >= prm.commercialScoreRefer ? 'PASS' : 'REFER'),
             score.points, prm.commercialScoreRefer, 'RC_MANUAL_REVIEW');
    }

    // Tenor cap is bank policy for SME (credit committee), held in params.
    const effTenor = Math.min(tenorMonths, prm.tenorCapMonths);
    if (tenorMonths > prm.tenorCapMonths) rs.reasons.push('RC_TENOR_CAP');
    rs.add('POL_TENOR_CAP', 'Tenor within SME policy cap', 'POLICY', 'PASS',
           tenorMonths > prm.tenorCapMonths ? tenorMonths + ' → clamped to ' + effTenor : tenorMonths,
           prm.tenorCapMonths, null);

    // Facility limit: inflowMultiple[band] × verified avg monthly inflow, round 10k.
    const band = gradeToBand(score.grade) || 'C';
    const byInflow = round10000(prm.inflowMultiple[band] * (p.avgMonthlyInflow || 0));
    const candidates = [
      { label: 'Requested amount', value: amount, key: 'REQUESTED' },
      { label: 'Inflow multiple ' + prm.inflowMultiple[band] + '× avg monthly inflow (band ' + band + ')',
        value: byInflow, key: 'INFLOW_MULTIPLE' },
      { label: 'Product cap', value: prm.productCap, key: 'PRODUCT_CAP' }
    ];
    let approved = Infinity, binding = 'REQUESTED';
    for (const c of candidates) if (c.value < approved) { approved = c.value; binding = c.key; }
    let outcome = outcomeFromRules(rs.rules);
    if (outcome === 'DECLINE') approved = 0;
    if (outcome === 'APPROVE' && approved < amount && !rs.reasons.includes('RC_LIMIT_REDUCED')) rs.reasons.push('RC_LIMIT_REDUCED');

    const bandRange = pol.params.pricingBands[band];
    const features = {
      netInflowAvg: p.avgMonthlyOutflow !== null ? (p.avgMonthlyInflow - p.avgMonthlyOutflow) : null,
      avgMonthlyInflow: p.avgMonthlyInflow, volatilityPct: p.inflowVolatilityPct,
      topCounterpartySharePct: p.topCounterpartySharePct, monthsBankData: p.monthsBankData,
      ownerWorstScore: p.ownerWorstScore, chequeReturnsTotal: chequesTotal,
      licenseAgeMonths: p.licenseAgeMonths, effectiveTenor: effTenor,
      thinCommercialFile: !p.commercialHit
    };
    const limit = { requested: amount, approved: outcome === 'DECLINE' ? 0 : approved,
                    bindingConstraint: binding, trace: candidates.map(c => ({ label: c.label, value: c.value })) };
    const pricing = outcome === 'DECLINE' ? null
      : { mode: 'BANDED', band, rateMin: bandRange[0], rateMax: bandRange[1], benchmark: 'EIBOR 3M + spread' };
    return { segment: 'SME', profile: p, features, rules: rs.rules, score, limit, pricing,
             outcome, reasonCodes: rs.reasons, effTenor };
  }

  function evaluate(productId, rawApplicant, amount, tenorMonths, pol) {
    if (productId === 'retail_pf') return evaluateRetail(normalizeRetail(rawApplicant), amount, tenorMonths, pol);
    if (productId === 'salary_advance') return evaluateQard(normalizeRetail(rawApplicant), amount, tenorMonths, pol);
    if (productId === 'sme_wc') return evaluateSme(normalizeSme(rawApplicant), amount, tenorMonths, pol);
    throw err('unknown productId "' + productId + '"');
  }

  // ---------------------------------------------------------------------------
  // Simulated data pulls for the decision record / orchestration timeline.
  // ---------------------------------------------------------------------------
  function buildDataPulls(productId, ev, rawApplicant, consents, seq) {
    const pulls = [];
    let i = 0;
    if (ev.segment === 'RETAIL') {
      const p = ev.profile;
      pulls.push({ source: 'AECB_CONSUMER', status: p.aecbHit ? 'HIT' : 'NO_HIT',
                   latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { score: p.score, esrPct: p.esrPct, tradelines: p.tradelines,
                              obligationsMonthly: p.obligationsMonthly, worstDelinquency: p.worstDelinquency } });
      if (p.salaryBank === 'MAL_BANK' || p.bankSource === 'INTERNAL') {
        pulls.push({ source: 'INTERNAL_CORE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { salaryDetected: p.salaryDetected, avgSalaryCredit: p.salaryMonthly } });
      } else if (consents.openFinance) {
        pulls.push({ source: 'OPEN_FINANCE', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { salaryDetected: p.salaryDetected, avgSalaryCredit: p.salaryMonthly } });
      } else {
        pulls.push({ source: 'DOCUMENTS', status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { note: 'statement/payslip upload fallback' } });
      }
    } else {
      const p = ev.profile;
      pulls.push({ source: 'AECB_COMMERCIAL', status: p.commercialHit ? 'HIT' : 'NO_HIT',
                   latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { score: p.commercialScore, chequeReturns12m: p.entityCheques } });
      for (const o of (p.owners || [])) {
        pulls.push({ source: 'AECB_OWNER', status: o.aecb && o.aecb.hit ? 'HIT' : 'NO_HIT',
                     latencyMs: pullLatency(seq, i++), cached: false,
                     summary: { owner: o.name, sharePct: o.sharePct, score: o.aecb ? o.aecb.score : null } });
      }
      const src = p.bankSource === 'ALTAREQ_TPP' ? 'OPEN_FINANCE' : (p.bankSource === 'INTERNAL' ? 'INTERNAL_CORE' : 'DOCUMENTS');
      pulls.push({ source: src, status: 'OK', latencyMs: pullLatency(seq, i++), cached: false,
                   summary: { monthsAvailable: p.monthsBankData, avgMonthlyInflow: p.avgMonthlyInflow,
                              inflowVolatilityPct: p.inflowVolatilityPct } });
    }
    return pulls;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  function init(data) {
    if (!data || data.TODAY !== '2026-07-19' || !Array.isArray(data.personasRetail) ||
        !data.reasonCodes || !data.sampleBook || !data.history) {
      throw err('init() requires the MizanData object (load data.js first)');
    }
    D = data;
    S = {
      policies: defaultPolicies(),
      policyHistory: { retail_pf: [], sme_wc: [], salary_advance: [] },
      decisions: [],           // newest first via listDecisions()
      byId: Object.create(null),
      seq: 0, clockTicks: 0,
      drawn: Object.create(null),   // decisionId -> total drawn
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
  // ~1,900 retail + ~400 SME decisions; retail ≈62/18/20 (STP ≈78%),
  // SME ≈35/40/25 (STP ≈42%), mild weekly seasonality (UAE weekend Sat/Sun).
  function seedHistory() {
    const rnd = mulberry32(D.history.seed);
    const days = D.history.days;
    const daily = [];
    const tot = { RETAIL: { decisions: 0, APPROVE: 0, REFER: 0, DECLINE: 0, stp: 0 },
                  SME: { decisions: 0, APPROVE: 0, REFER: 0, DECLINE: 0, stp: 0 } };
    for (let d = 0; d < days; d++) {
      const date = addDaysIso(D.TODAY, -(days - 1 - d));
      const dow = new Date(date + 'T00:00:00Z').getUTCDay(); // 0 Sun .. 6 Sat
      const factor = (dow === 6 || dow === 0) ? 0.45 : (dow === 5 ? 0.8 : 1.0);
      const nR = Math.max(2, Math.round(24 * factor * (0.85 + 0.3 * rnd())));
      const nS = Math.max(1, Math.round(5.3 * factor * (0.8 + 0.4 * rnd())));
      const aR = Math.round(nR * (0.62 + (rnd() - 0.5) * 0.06));
      const rR = Math.round(nR * (0.18 + (rnd() - 0.5) * 0.04));
      const dR = Math.max(0, nR - aR - rR);
      const aS = Math.round(nS * (0.35 + (rnd() - 0.5) * 0.08));
      const rS = Math.round(nS * (0.40 + (rnd() - 0.5) * 0.08));
      const dS = Math.max(0, nS - aS - rS);
      tot.RETAIL.decisions += nR; tot.RETAIL.APPROVE += aR; tot.RETAIL.REFER += rR; tot.RETAIL.DECLINE += dR;
      tot.SME.decisions += nS; tot.SME.APPROVE += aS; tot.SME.REFER += rS; tot.SME.DECLINE += dS;
      tot.RETAIL.stp += Math.round(nR * 0.78); tot.SME.stp += Math.round(nS * 0.42);
      daily.push({ date, APPROVE: aR + aS, REFER: rR + rS, DECLINE: dR + dS });
    }
    // Decline-reason mix (seeded weights over the seeded decline volume).
    const reasonWeights = [
      ['RC_SCORE_LOW', 0.30], ['RC_DBR_EXCEEDED', 0.18], ['RC_DELINQUENCY', 0.13],
      ['RC_OWNER_SCORE', 0.10], ['RC_CHEQUE_RETURNS', 0.09], ['RC_SALARY_FLOOR', 0.07],
      ['RC_SECTOR_EXCLUDED', 0.05], ['RC_LICENSE_AGE', 0.04], ['RC_AGE', 0.04]
    ];
    const declines = tot.RETAIL.DECLINE + tot.SME.DECLINE;
    const declineReasons = {};
    let assigned = 0;
    for (let i = 0; i < reasonWeights.length; i++) {
      const [code, w] = reasonWeights[i];
      const n = i === reasonWeights.length - 1 ? declines - assigned : Math.round(declines * w);
      declineReasons[code] = n; assigned += n;
    }
    // Grade distribution over scored (non-thin) seeded decisions.
    const scored = Math.round((tot.RETAIL.decisions + tot.SME.decisions) * 0.9);
    const gradeDist = { A: Math.round(scored * 0.18), B: Math.round(scored * 0.31),
                        C: Math.round(scored * 0.27), D: Math.round(scored * 0.14), E: 0 };
    gradeDist.E = scored - gradeDist.A - gradeDist.B - gradeDist.C - gradeDist.D;
    const refers = tot.RETAIL.REFER + tot.SME.REFER;
    const overrides = Math.round(refers * 0.083);
    // Seeded refer queue (open cases visible in the workbench).
    const queueNames = [
      ['Fatima Rashed', 'RETAIL', 'RC_THIN_FILE'], ['Bright Path Logistics LLC', 'SME', 'RC_VOLATILITY'],
      ['Jomo Adeyemi', 'RETAIL', 'RC_INCOME_UNVERIFIED'], ['Silver Palm Interiors LLC', 'SME', 'RC_LICENSE_AGE'],
      ['Anita D\'Souza', 'RETAIL', 'RC_MANUAL_REVIEW'], ['Nahda Auto Spare Parts', 'SME', 'RC_THIN_FILE'],
      ['Yusuf Kanaan', 'RETAIL', 'RC_MANUAL_REVIEW'], ['Coral Reef Marine Services', 'SME', 'RC_MANUAL_REVIEW'],
      ['Grace Mwangi', 'RETAIL', 'RC_THIN_FILE']
    ];
    const queue = queueNames.map(([name, segment, reason], i) => {
      const sla = segment === 'RETAIL' ? 8 : 24;
      const waitingHours = Math.round((rnd() * (segment === 'RETAIL' ? 10 : 30)) * 10) / 10;
      return { id: 'MZN-H-' + String(101 + i), name, segment, reason,
               waitingHours, slaHoursLeft: Math.round((sla - waitingHours) * 10) / 10, seeded: true };
    });
    const referAging = { '<4h': 0, '4-24h': 0, '>24h': 0 };
    for (const q of queue) referAging[q.waitingHours < 4 ? '<4h' : (q.waitingHours <= 24 ? '4-24h' : '>24h')]++;
    // add aggregate (non-case-level) seeded aging mass
    referAging['<4h'] += 11; referAging['4-24h'] += 7; referAging['>24h'] += 2;
    // Vintages — gently rising FPD-style curves with tiny seeded noise.
    const vintages = [];
    const rBase = [1.2, 1.6, 1.9, 2.1, 2.4, 2.6], sBase = [2.0, 2.6, 3.1, 3.6, 4.0, 4.3];
    for (let m = 1; m <= 6; m++) {
      vintages.push({ mob: m,
        retailFpdPct: Math.round((rBase[m - 1] + (rnd() - 0.5) * 0.2) * 10) / 10,
        smeFpdPct: Math.round((sBase[m - 1] + (rnd() - 0.5) * 0.3) * 10) / 10 });
    }
    S.seeded = { daily, tot, declineReasons, gradeDist, refers, overrides, queue, referAging, vintages };
  }

  function manifests() { ensureInit(); return clone(MANIFESTS); }

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
        throw err('"' + key + '" is a locked regulatory primitive (Reg 29/2011 / Federal Law 6/2010) — it cannot be edited via publishPolicy');
      }
      if (!(key in pol.params)) throw err('unknown policy parameter "' + key + '" for ' + productId);
      const v = params[key];
      if (key === 'pricingBands') {
        for (const b of ['A', 'B', 'C']) {
          const r = v && v[b];
          if (!Array.isArray(r) || r.length !== 2 || !(r[0] > 0) || !(r[1] > r[0]) || r[1] > 0.25) {
            throw err('pricingBands.' + b + ' must be [min,max] with 0 < min < max ≤ 0.25');
          }
        }
      } else if (key === 'inflowMultiple') {
        for (const b of ['A', 'B', 'C']) {
          if (!(v && v[b] > 0 && v[b] <= 3)) throw err('inflowMultiple.' + b + ' must be in (0, 3]');
        }
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
    const amount = application.amount;
    const tenorMonths = application.tenorMonths;
    if (!Number.isFinite(amount) || amount <= 0) throw err('application.amount must be a positive number (AED)');
    if (!Number.isFinite(tenorMonths) || tenorMonths <= 0) throw err('application.tenorMonths must be a positive number');

    const pol = getPolicyRef(productId);
    const ev = evaluate(productId, applicant, Math.round(amount), Math.round(tenorMonths), pol);

    S.seq += 1;
    const id = 'MZN-' + String(S.seq).padStart(6, '0');
    const createdAt = nowIso();
    const consentAt = createdAt;
    const pulls = buildDataPulls(productId, ev, applicant, consents, S.seq);

    let token = null;
    if (ev.outcome === 'APPROVE') {
      const conditions = [];
      if (productId === 'retail_pf') {
        conditions.push('Execute Murabaha sequence within validity window (AAOIFI SS 8/30) — approval is not a contract');
        conditions.push('Cooling-off: ' + pol.regulatory.coolingOffDays + ' business days (waivable in writing)');
      } else if (productId === 'sme_wc') {
        conditions.push('Each drawdown executes a fresh commodity-Murabaha cycle (AAOIFI SS 30)');
        if (ev.limit.approved > pol.params.guaranteeThreshold) conditions.push('EDB credit guarantee assessment');
      } else {
        conditions.push('Repayable in full from next salary credit (Qard Hassan)');
      }
      token = { id: 'TKN-' + id, issuedAt: createdAt,
                expiresAt: addDaysIso(D.TODAY, pol.params.tokenValidityDays) + 'T23:59:59.000Z',
                conditions };
    }

    const record = {
      id, createdAt, productId, segment: ev.segment,
      applicantSnapshot: clone(applicant),
      request: { amount: Math.round(amount), tenorMonths: Math.round(tenorMonths) },
      consents: { aecb: { granted: true, at: consentAt },
                  openFinance: { granted: consents.openFinance === true, at: consents.openFinance === true ? consentAt : null } },
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
                detail: ev.outcome + ' · policy v' + pol.version + ' · ' + SCORECARD.model + ' ' + SCORECARD.version }],
      override: null,
      status: 'OPEN'
    };
    S.decisions.push(record);
    S.byId[id] = record;
    return record;
  }

  // Convenience for simulation — same logic, no side effects, no record stored.
  function decideRaw(productId, sampleRow) {
    ensureInit();
    const pol = getPolicyRef(productId);
    const ev = evaluate(productId, sampleRow, sampleRow.amount || 100000, sampleRow.tenorMonths || 12, pol);
    return { outcome: ev.outcome, reasonCodes: ev.reasonCodes.slice() };
  }

  function simulateBook(productId, candidateParams) {
    ensureInit();
    const pol = getPolicyRef(productId);
    validateParams(productId, candidateParams);
    const book = (MANIFESTS.find(m => m.productId === productId).segment === 'SME')
      ? D.sampleBook.sme : D.sampleBook.retail;
    const candidate = clone(pol);
    for (const key of Object.keys(candidateParams)) candidate.params[key] = clone(candidateParams[key]);
    const before = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const after = { APPROVE: 0, REFER: 0, DECLINE: 0 };
    const flips = [];
    let flipCount = 0;
    for (const row of book) {
      const b = evaluate(productId, row, row.amount, row.tenorMonths, pol);
      const a = evaluate(productId, row, row.amount, row.tenorMonths, candidate);
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

  // Lightweight drawdown check (PRD §5.4 step 6): availability, arrears status,
  // deterioration flag — NOT a re-underwrite, so Tawarruq execution stays instant.
  function drawdownCheck(decisionId, amount, flags) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (rec.productId !== 'sme_wc') throw err('drawdownCheck applies to SME working-capital facilities only');
    if (rec.outcome !== 'APPROVE') throw err('drawdownCheck requires an approved facility (decision is ' + rec.outcome + ')');
    if (!Number.isFinite(amount) || amount <= 0) throw err('drawdown amount must be a positive number (AED)');
    const f = flags || {};
    const drawn = S.drawn[decisionId] || 0;
    const remaining = rec.limit.approved - drawn;
    const reasonCodes = [];
    if (f.arrears === true) reasonCodes.push('RC_DRAWDOWN_ARREARS');
    if (f.deterioration === true) reasonCodes.push('RC_MANUAL_REVIEW');
    if (amount > remaining) reasonCodes.push('RC_DRAWDOWN_LIMIT');
    const allowed = reasonCodes.length === 0;
    if (allowed) S.drawn[decisionId] = drawn + amount;
    const remainingAfter = rec.limit.approved - (S.drawn[decisionId] || 0);
    rec.audit.push({ at: nowIso(), actor: 'engine', action: 'DRAWDOWN_CHECK',
                     detail: (allowed ? 'allowed' : 'blocked') + ' · AED ' + amount +
                             (reasonCodes.length ? ' · ' + reasonCodes.join(',') : '') });
    return { allowed, amount, remainingAfter, reasonCodes };
  }

  // Shari'ah execution sequencing (AAOIFI SS 8 / SS 30): the product layer posts
  // contract events against the decision; any out-of-order event throws, naming
  // the expected next step. This IS the "approval ≠ debt" demo.
  function recordEvent(decisionId, eventType) {
    ensureInit();
    const rec = getDecisionRef(decisionId);
    if (!EXEC_EVENTS.includes(eventType)) {
      throw err('unknown execution event "' + eventType + '" — valid events: ' + EXEC_EVENTS.join(' → '));
    }
    if (rec.outcome !== 'APPROVE') throw err('execution events can only be recorded against an approved decision (outcome is ' + rec.outcome + ')');
    if (rec.status === 'EXECUTED') throw err('contract already fully executed for ' + decisionId);
    const expected = EXEC_EVENTS[rec.events.length];
    if (eventType !== expected) {
      throw err('Shari\'ah sequencing violation (AAOIFI SS 8/30) — expected next event ' + expected +
                ', got ' + eventType + '. The Murabaha sequence must run promise → wakala → commodity purchase → offer → acceptance → proceeds.');
    }
    const at = nowIso();
    rec.events.push({ type: eventType, at });
    rec.audit.push({ at, actor: 'product-layer', action: 'EXEC_EVENT', detail: eventType });
    if (rec.events.length === EXEC_EVENTS.length) {
      rec.status = 'EXECUTED';
      rec.audit.push({ at: nowIso(), actor: 'engine', action: 'STATUS', detail: 'EXECUTED — Murabaha sequence complete; debt now exists' });
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
      rec.token = { id: 'TKN-' + rec.id, issuedAt: at,
                    expiresAt: addDaysIso(D.TODAY, pol.params.tokenValidityDays) + 'T23:59:59.000Z',
                    conditions: ['Approved by override — ' + o.analyst + ' / ' + o.approver] };
    }
    if (o.outcome === 'DECLINE') { rec.limit.approved = 0; rec.token = null; }
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
        const sla = r.segment === 'RETAIL' ? 8 : 24;
        const name = r.applicantSnapshot.name || r.applicantSnapshot.legalName || r.id;
        return { id: r.id, name, segment: r.segment, createdAt: r.createdAt,
                 reason: r.reasonCodes[0] || 'RC_MANUAL_REVIEW', reasonCodes: r.reasonCodes.slice(),
                 waitingHours: 0, slaHoursLeft: sla, seeded: false };
      });
    return open.concat(clone(S.seeded.queue));
  }

  function metrics() {
    ensureInit();
    const sd = S.seeded;
    const seg = {
      RETAIL: { decisions: sd.tot.RETAIL.decisions, APPROVE: sd.tot.RETAIL.APPROVE,
                REFER: sd.tot.RETAIL.REFER, DECLINE: sd.tot.RETAIL.DECLINE, stp: sd.tot.RETAIL.stp },
      SME: { decisions: sd.tot.SME.decisions, APPROVE: sd.tot.SME.APPROVE,
             REFER: sd.tot.SME.REFER, DECLINE: sd.tot.SME.DECLINE, stp: sd.tot.SME.stp }
    };
    const declineReasons = Object.assign({}, sd.declineReasons);
    const gradeDist = Object.assign({}, sd.gradeDist);
    const daily = clone(sd.daily);
    const todayRow = daily[daily.length - 1];
    let refers = sd.refers, overrides = sd.overrides;
    const referAging = Object.assign({}, sd.referAging);

    // Merge live session decisions into every aggregate.
    for (const r of S.decisions) {
      const sgm = seg[r.segment];
      const finalOutcome = r.outcome; // override already applied to r.outcome
      sgm.decisions++; sgm[finalOutcome]++;
      if (finalOutcome !== 'REFER' && !r.override) sgm.stp++;
      todayRow[finalOutcome]++;
      if (finalOutcome === 'DECLINE') {
        const code = r.reasonCodes[0] || 'RC_MANUAL_REVIEW';
        declineReasons[code] = (declineReasons[code] || 0) + 1;
      }
      if (r.score && r.score.grade) gradeDist[r.score.grade] = (gradeDist[r.score.grade] || 0) + 1;
      if (finalOutcome === 'REFER') { refers++; referAging['<4h']++; }
      if (r.override) { refers++; overrides++; }
    }
    const totals = {
      decisions: seg.RETAIL.decisions + seg.SME.decisions,
      APPROVE: seg.RETAIL.APPROVE + seg.SME.APPROVE,
      REFER: seg.RETAIL.REFER + seg.SME.REFER,
      DECLINE: seg.RETAIL.DECLINE + seg.SME.DECLINE
    };
    const stpAll = seg.RETAIL.stp + seg.SME.stp;
    const pct1 = (n, d) => d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
    return {
      window: '90d',
      totals,
      stpPct: pct1(stpAll, totals.decisions),
      bySegment: {
        RETAIL: { decisions: seg.RETAIL.decisions, APPROVE: seg.RETAIL.APPROVE, REFER: seg.RETAIL.REFER,
                  DECLINE: seg.RETAIL.DECLINE, stpPct: pct1(seg.RETAIL.stp, seg.RETAIL.decisions) },
        SME: { decisions: seg.SME.decisions, APPROVE: seg.SME.APPROVE, REFER: seg.SME.REFER,
               DECLINE: seg.SME.DECLINE, stpPct: pct1(seg.SME.stp, seg.SME.decisions) }
      },
      declineReasons: Object.keys(declineReasons)
        .map(code => ({ code, labelEn: (D.reasonCodes[code] || { en: code }).en, count: declineReasons[code] }))
        .sort((a, b) => b.count - a.count),
      gradeDist: ['A', 'B', 'C', 'D', 'E'].map(g => ({ grade: g, count: gradeDist[g] || 0 })),
      daily,
      referAging: [{ bucket: '<4h', count: referAging['<4h'] },
                   { bucket: '4-24h', count: referAging['4-24h'] },
                   { bucket: '>24h', count: referAging['>24h'] }],
      overrideRatePct: pct1(overrides, refers),
      vintages: clone(S.seeded.vintages)
    };
  }

  const MizanEngine = {
    VERSION: ENGINE_VERSION,
    EXEC_EVENTS: EXEC_EVENTS.slice(),
    init, manifests, getPolicy, publishPolicy, policyHistory,
    decide, decideRaw, simulateBook, drawdownCheck, recordEvent, override,
    listDecisions, getDecision, referQueue, metrics
  };

  globalThis.MizanEngine = MizanEngine;
})();

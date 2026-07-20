/*
 * Mizan prototype — MizanData (data-1.0)
 * Synthetic, deterministic data layer for the Mizan shared credit decisioning demo.
 * See mal-bank/PRD-credit-decisioning.md and mal-bank/prototype/CONTRACT.md (§1).
 *
 * Contents: 5 retail personas (r1..r5), 5 SME personas (s1..s5), the ISSC-governed
 * sector exclusion list (AAOIFI SS 21 seeded + tobacco per ISSC policy), bilingual
 * (EN + Modern Standard Arabic) customer-safe reason codes, and a seeded
 * deterministic sample book (140 retail + 80 SME rows) for policy simulation.
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

  // ---------------------------------------------------------------------------
  // 1.1 Retail personas — fixed IDs, names and intended outcomes (contract §1.1)
  // ---------------------------------------------------------------------------
  const personasRetail = [
    { // r1 — APPROVE, grade A, limit bound by requested amount
      id: 'r1', name: 'Ahmed Al Mansoori', nameAr: 'أحمد المنصوري',
      tagline: 'Government employee, salary-transfer customer',
      age: 34, residency: 'UAE_NATIONAL', monthsInUae: 408,
      employment: { employer: 'Abu Dhabi Digital Authority', type: 'GOVERNMENT',
                    salaryMonthly: 28000, salaryBank: 'MAL_BANK', tenureMonths: 76, retiree: false },
      aecb: { hit: true, score: 782, esrPct: 18, obligationsMonthly: 2800,
              tradelines: 3, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'INTERNAL', monthsAvailable: 36, salaryDetected: true, avgSalaryCredit: 28000 },
      defaultRequest: { amount: 150000, tenorMonths: 36 }
    },
    { // r2 — REFER (thin file; Credit Passport path shown in UI)
      id: 'r2', name: 'Priya Nair', nameAr: 'بريا ناير',
      tagline: 'New resident (8 months), no UAE credit history — thin file',
      age: 31, residency: 'NEW_RESIDENT', monthsInUae: 8,
      employment: { employer: 'Medcare Hospital Group', type: 'PRIVATE',
                    salaryMonthly: 17000, salaryBank: 'OTHER', tenureMonths: 8, retiree: false },
      aecb: { hit: false, score: null, esrPct: null, obligationsMonthly: 0,
              tradelines: 0, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: true },
      // Consented home-country bureau file, importable via the AECB × Nova Credit
      // Passport rail (dossier §11) — used only when the applicant opts in.
      homeBureau: { country: 'India', bureau: 'CIBIL via AECB × Nova Credit Passport',
                    score: 776, scoreRange: '300–900', historyYears: 6, obligationsMonthlyAed: 1100 },
      bankData: { source: 'ALTAREQ_TPP', monthsAvailable: 7, salaryDetected: true, avgSalaryCredit: 17000 },
      defaultRequest: { amount: 60000, tenorMonths: 24 }
    },
    { // r3 — APPROVE but limit sharply reduced; bindingConstraint DBR_HEADROOM
      id: 'r3', name: 'Omar Haddad', nameAr: 'عمر حداد',
      tagline: 'Well-banked but heavily obligated — DBR headroom binds',
      age: 39, residency: 'RESIDENT', monthsInUae: 132,
      employment: { employer: 'Emaar Properties', type: 'PRIVATE',
                    salaryMonthly: 22000, salaryBank: 'MAL_BANK', tenureMonths: 60, retiree: false },
      aecb: { hit: true, score: 655, esrPct: 39, obligationsMonthly: 9200,
              tradelines: 6, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'INTERNAL', monthsAvailable: 24, salaryDetected: true, avgSalaryCredit: 22000 },
      defaultRequest: { amount: 200000, tenorMonths: 36 }
    },
    { // r4 — DECLINE: score below cut-off + delinquency rule
      id: 'r4', name: 'Layla Boutros', nameAr: 'ليلى بطرس',
      tagline: 'Low score, DPD90 history, returned cheque',
      age: 29, residency: 'RESIDENT', monthsInUae: 84,
      employment: { employer: 'Landmark Retail LLC', type: 'PRIVATE',
                    salaryMonthly: 9500, salaryBank: 'OTHER', tenureMonths: 18, retiree: false },
      aecb: { hit: true, score: 588, esrPct: 47, obligationsMonthly: 4200,
              tradelines: 5, chequeReturns12m: 1, worstDelinquency: 'DPD90',
              creditPassportAvailable: false },
      bankData: { source: 'ALTAREQ_TPP', monthsAvailable: 12, salaryDetected: true, avgSalaryCredit: 9500 },
      defaultRequest: { amount: 80000, tenorMonths: 48 }
    },
    { // r5 — APPROVE with the retiree 30% DBR cap binding (RETIREE_CAP)
      id: 'r5', name: 'Hassan Al Balushi', nameAr: 'حسن البلوشي',
      tagline: 'Retiree, pension income — 30% DBR cap applies',
      age: 62, residency: 'UAE_NATIONAL', monthsInUae: 480,
      employment: { employer: 'GPSSA (government pension)', type: 'PENSION',
                    salaryMonthly: 18000, salaryBank: 'MAL_BANK', tenureMonths: 240, retiree: true },
      aecb: { hit: true, score: 731, esrPct: 14, obligationsMonthly: 2000,
              tradelines: 2, chequeReturns12m: 0, worstDelinquency: 'NONE',
              creditPassportAvailable: false },
      bankData: { source: 'INTERNAL', monthsAvailable: 48, salaryDetected: true, avgSalaryCredit: 18000 },
      defaultRequest: { amount: 250000, tenorMonths: 48 }
    }
  ];

  // ---------------------------------------------------------------------------
  // 1.2 SME personas (contract §1.2). monthlyInflows are hand-tuned so that
  // mean === avgMonthlyInflow and population stdev/mean === inflowVolatilityPct.
  // ---------------------------------------------------------------------------
  const personasSme = [
    { // s1 — APPROVE facility; drawdown demo runs against this decision
      id: 's1', legalName: 'Al Noor Trading LLC', legalNameAr: 'النور للتجارة ش.ذ.م.م',
      tagline: 'Established FMCG trader, 4 years, healthy cash-flow',
      license: { authority: 'Dubai DED', activityCode: '4630', activityDesc: 'Foodstuff trading',
                 ageMonths: 49, excludedActivity: false, excludedCode: null },
      vatRegistered: true,
      owners: [
        { name: 'Khalid Rahman', sharePct: 60,
          aecb: { hit: true, score: 741, obligationsMonthly: 4100, chequeReturns12m: 0, worstDelinquency: 'NONE' } },
        { name: 'Sara Rahman', sharePct: 40,
          aecb: { hit: true, score: 720, obligationsMonthly: 1800, chequeReturns12m: 0, worstDelinquency: 'NONE' } }
      ],
      aecbCommercial: { hit: true, score: 705, facilities: 2, outstandingTotal: 380000,
                        chequeReturns12m: 0, courtCases: 0 },
      bank: { source: 'ALTAREQ_TPP', monthsAvailable: 18,
              avgMonthlyInflow: 420000, avgMonthlyOutflow: 361000,
              inflowVolatilityPct: 22, topCounterpartySharePct: 24,
              // mean 420,000; stdev ≈ 92,100 → 22% of mean
              monthlyInflows: [319000, 527000, 380000, 264000, 460000, 545000,
                               346000, 454000, 536000, 314000, 493000, 402000] },
      defaultRequest: { amount: 500000, tenorMonths: 12 }
    },
    { // s2 — REFER: inflow volatility 68% above the 45% threshold
      id: 's2', legalName: 'Desert Bloom Events LLC', legalNameAr: 'ديزرت بلوم للفعاليات ش.ذ.م.م',
      tagline: 'Events services, 2.5 years — strong season, volatile cash-flow',
      license: { authority: 'Dubai DED', activityCode: '8230', activityDesc: 'Events management & organisation',
                 ageMonths: 30, excludedActivity: false, excludedCode: null },
      vatRegistered: true,
      owners: [
        { name: 'Mariam Al Suwaidi', sharePct: 70,
          aecb: { hit: true, score: 690, obligationsMonthly: 5200, chequeReturns12m: 0, worstDelinquency: 'NONE' } },
        { name: 'Tarek Aziz', sharePct: 30,
          aecb: { hit: true, score: 665, obligationsMonthly: 2900, chequeReturns12m: 0, worstDelinquency: 'NONE' } }
      ],
      aecbCommercial: { hit: true, score: 668, facilities: 1, outstandingTotal: 140000,
                        chequeReturns12m: 1, courtCases: 0 },
      bank: { source: 'ALTAREQ_TPP', monthsAvailable: 14,
              avgMonthlyInflow: 180000, avgMonthlyOutflow: 158000,
              inflowVolatilityPct: 68, topCounterpartySharePct: 41,
              // Jul-2025..Jun-2026, event-season peak Oct–Feb; mean 180,000, stdev ≈ 122,000 → 68%
              monthlyInflows: [45000, 33000, 92000, 260000, 340000, 390000,
                               310000, 265000, 180000, 120000, 75000, 50000] },
      defaultRequest: { amount: 250000, tenorMonths: 12 }
    },
    { // s3 — REFER: license 10 months < 12-month minimum; thin commercial file
      id: 's3', legalName: 'Marhaba Foodstuff Trading', legalNameAr: 'مرحبا لتجارة المواد الغذائية',
      tagline: 'Young trader, 10-month license, thin commercial file',
      license: { authority: 'Sharjah DED', activityCode: '4630', activityDesc: 'Foodstuff trading',
                 ageMonths: 10, excludedActivity: false, excludedCode: null },
      vatRegistered: false,
      owners: [
        { name: 'Imran Qureshi', sharePct: 100,
          aecb: { hit: true, score: 660, obligationsMonthly: 2400, chequeReturns12m: 0, worstDelinquency: 'NONE' } }
      ],
      aecbCommercial: { hit: false, score: null, facilities: 0, outstandingTotal: 0,
                        chequeReturns12m: 0, courtCases: 0 },
      bank: { source: 'DOCUMENTS', monthsAvailable: 9,
              avgMonthlyInflow: 95000, avgMonthlyOutflow: 83000,
              inflowVolatilityPct: 28, topCounterpartySharePct: 38,
              // 9 trading months only (license is 10 months old) — mean 95,000, stdev ≈ 26,300 → 28%.
              // Deviation from contract's "12 numbers": a 10-month-old business cannot
              // show 12 months of statements; length matches monthsAvailable instead.
              monthlyInflows: [52000, 68000, 75000, 90000, 108000, 84000, 121000, 130000, 127000] },
      defaultRequest: { amount: 80000, tenorMonths: 6 }
    },
    { // s4 — DECLINE: Shari'ah sector screen (alcohol distribution), bilingual reason
      id: 's4', legalName: 'Oasis Beverages & Liquor TR', legalNameAr: 'الواحة للمشروبات والمشروبات الكحولية (مؤسسة تجارية)',
      tagline: 'Alcohol distribution — excluded under the ISSC sector screen',
      license: { authority: 'Dubai DED', activityCode: '4635', activityDesc: 'Alcoholic beverages distribution',
                 ageMonths: 88, excludedActivity: true, excludedCode: 'SEC_ALCOHOL' },
      vatRegistered: true,
      owners: [
        { name: 'Rashid Al Marzooqi', sharePct: 100,
          aecb: { hit: true, score: 702, obligationsMonthly: 3600, chequeReturns12m: 0, worstDelinquency: 'NONE' } }
      ],
      aecbCommercial: { hit: true, score: 712, facilities: 2, outstandingTotal: 510000,
                        chequeReturns12m: 0, courtCases: 0 },
      bank: { source: 'ALTAREQ_TPP', monthsAvailable: 20,
              avgMonthlyInflow: 610000, avgMonthlyOutflow: 548000,
              inflowVolatilityPct: 16, topCounterpartySharePct: 19,
              // mean 610,000, stdev ≈ 96,300 → 16%
              monthlyInflows: [520000, 705000, 588000, 464000, 672000, 741000,
                               553000, 660000, 730000, 500000, 690000, 497000] },
      defaultRequest: { amount: 750000, tenorMonths: 12 }
    },
    { // s5 — DECLINE: majority-owner score 512 below the 550 floor (owner-blend demo)
      id: 's5', legalName: 'Gulf Star Electronics LLC', legalNameAr: 'جلف ستار للإلكترونيات ش.ذ.م.م',
      tagline: 'Healthy entity, distressed majority owner — owner-blend declines',
      license: { authority: 'Dubai DED', activityCode: '4652', activityDesc: 'Electronics & appliances trading',
                 ageMonths: 61, excludedActivity: false, excludedCode: null },
      vatRegistered: true,
      owners: [
        { name: 'Faisal Karim', sharePct: 65,
          aecb: { hit: true, score: 512, obligationsMonthly: 7800, chequeReturns12m: 3, worstDelinquency: 'DPD90' } },
        { name: 'Noor Karim', sharePct: 35,
          aecb: { hit: true, score: 668, obligationsMonthly: 2100, chequeReturns12m: 0, worstDelinquency: 'NONE' } }
      ],
      aecbCommercial: { hit: true, score: 690, facilities: 3, outstandingTotal: 820000,
                        chequeReturns12m: 1, courtCases: 0 },
      bank: { source: 'ALTAREQ_TPP', monthsAvailable: 16,
              avgMonthlyInflow: 350000, avgMonthlyOutflow: 322000,
              inflowVolatilityPct: 22, topCounterpartySharePct: 33,
              // mean 350,000, stdev ≈ 76,900 → 22%
              monthlyInflows: [260000, 415000, 330000, 238000, 400000, 455000,
                               305000, 370000, 470000, 250000, 405000, 302000] },
      defaultRequest: { amount: 400000, tenorMonths: 12 }
    }
  ];

  // ---------------------------------------------------------------------------
  // 1.3 Sector exclusions — ISSC-governed list, seeded from the AAOIFI SS 21
  // taxonomy; tobacco added by ISSC ruling. Version badge shown in UI: ISSC-2026.2.
  // ---------------------------------------------------------------------------
  const sectorExclusions = [
    { code: 'SEC_CONV_FIN', labelEn: 'Conventional (riba-based) financial services',
      labelAr: 'الخدمات المالية التقليدية القائمة على الربا', basis: 'AAOIFI SS 21' },
    { code: 'SEC_ALCOHOL', labelEn: 'Alcohol production or distribution',
      labelAr: 'إنتاج المشروبات الكحولية أو توزيعها', basis: 'AAOIFI SS 21' },
    { code: 'SEC_GAMBLING', labelEn: 'Gambling, betting and games of chance',
      labelAr: 'القمار والمراهنات وألعاب الحظ', basis: 'AAOIFI SS 21' },
    { code: 'SEC_PORK', labelEn: 'Pork and pork products',
      labelAr: 'لحم الخنزير ومنتجاته', basis: 'AAOIFI SS 21' },
    { code: 'SEC_ADULT', labelEn: 'Adult entertainment and related media',
      labelAr: 'الترفيه الموجَّه للبالغين والمحتوى المخالف للآداب', basis: 'AAOIFI SS 21' },
    { code: 'SEC_WEAPONS', labelEn: 'Weapons and defense equipment',
      labelAr: 'الأسلحة والمعدات الدفاعية', basis: 'AAOIFI SS 21' },
    { code: 'SEC_TOBACCO', labelEn: 'Tobacco and tobacco products',
      labelAr: 'التبغ ومنتجاته', basis: 'ISSC policy' }
  ];

  // ---------------------------------------------------------------------------
  // 1.4 Reason codes — customer-safe, bilingual (EN + Modern Standard Arabic).
  // Every code the engine can emit exists here (selftest group 8 asserts this).
  // ---------------------------------------------------------------------------
  const reasonCodes = {
    RC_SCORE_LOW: {
      en: 'Credit score is below the approval threshold for this product.',
      ar: 'درجة التصنيف الائتماني أقل من الحد المطلوب للموافقة على هذا المنتج.' },
    RC_DELINQUENCY: {
      en: 'Significant past-due history appears on the credit report.',
      ar: 'يُظهر تقرير الائتمان سجلاً سابقاً لتأخر السداد بشكل جوهري.' },
    RC_DBR_EXCEEDED: {
      en: 'Total monthly obligations exceed the permitted debt burden ratio.',
      ar: 'إجمالي الالتزامات الشهرية يتجاوز نسبة عبء الدين المسموح بها.' },
    RC_THIN_FILE: {
      en: 'Insufficient credit history — the application was routed for specialist review.',
      ar: 'السجل الائتماني غير كافٍ — تم تحويل الطلب إلى مراجعة متخصصة.' },
    RC_INCOME_UNVERIFIED: {
      en: 'Income could not be verified automatically.',
      ar: 'تعذّر التحقق من الدخل بشكل آلي.' },
    RC_SALARY_FLOOR: {
      en: 'Monthly salary is below the minimum required for this product.',
      ar: 'الراتب الشهري أقل من الحد الأدنى المطلوب لهذا المنتج.' },
    RC_AGE: {
      en: 'Applicant age is outside the eligible range for this product.',
      ar: 'عمر مقدم الطلب خارج النطاق العمري المؤهل لهذا المنتج.' },
    RC_TENOR_CAP: {
      en: 'Requested tenor exceeds the maximum permitted term; the term was adjusted to the cap.',
      ar: 'مدة التمويل المطلوبة تتجاوز الحد الأقصى المسموح به؛ وتم تعديل المدة إلى الحد الأقصى.' },
    RC_SECTOR_EXCLUDED: {
      en: 'The business activity is not eligible under the bank’s Shari’ah sector screen.',
      ar: 'نشاط المنشأة غير مؤهل وفق قائمة الأنشطة المستبعدة شرعاً المعتمدة من لجنة الرقابة الشرعية الداخلية.' },
    RC_LICENSE_AGE: {
      en: 'Trade license history is below the minimum required trading period.',
      ar: 'عمر الرخصة التجارية أقل من الحد الأدنى المطلوب لمدة مزاولة النشاط.' },
    RC_OWNER_SCORE: {
      en: 'A major shareholder’s credit score is below the eligibility floor.',
      ar: 'درجة التصنيف الائتماني لأحد الشركاء الرئيسيين أقل من الحد الأدنى المؤهل.' },
    RC_VOLATILITY: {
      en: 'Business cash-flow volatility is above the automatic-approval threshold.',
      ar: 'تقلب التدفقات النقدية للمنشأة أعلى من حد الموافقة التلقائية.' },
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
      en: 'Drawdown blocked: the facility is currently in arrears.',
      ar: 'تم إيقاف السحب: توجد متأخرات قائمة على التسهيل.' },
    RC_DRAWDOWN_LIMIT: {
      en: 'The requested drawdown exceeds the available facility limit.',
      ar: 'مبلغ السحب المطلوب يتجاوز الحد المتاح من التسهيل.' },
    RC_TOKEN_EXPIRED: {
      en: 'The approval validity window has expired — a new decision is required.',
      ar: 'انتهت صلاحية الموافقة — يلزم إصدار قرار جديد.' },
    RC_CROSS_BORDER: {
      en: 'Approved using consented home-country credit history via Credit Passport.',
      ar: 'تمت الموافقة استناداً إلى السجل الائتماني في بلد المنشأ الذي تمت مشاركته بموافقة العميل عبر خدمة جواز الائتمان.' }
  };

  // ---------------------------------------------------------------------------
  // Early warning — day-zero signals (dossier §08). Seeded, deterministic:
  // detected within the last 3 days of TODAY, each with a same-day action.
  // Distress surfaces weeks before DPD 30; the tracked metric is signal-to-action time.
  // ---------------------------------------------------------------------------
  const earlyWarning = [
    { id: 'EW-001', detectedAt: addDaysIso(TODAY, 0), customer: 'Ravi Menon', segment: 'RETAIL',
      signal: 'Goal contributions stopped — 3 weeks without a transfer to the savings goal',
      signalAr: 'توقفت مساهمات هدف الادخار منذ ثلاثة أسابيع',
      recommendedAction: 'Pre-emptive tenor-matched restructure offer proposed', status: 'ACTIONED' },
    { id: 'EW-002', detectedAt: addDaysIso(TODAY, -1), customer: 'Blessing Okafor', segment: 'RETAIL',
      signal: 'Remittance spike — 3× monthly average sent home within one week',
      signalAr: 'ارتفاع التحويلات إلى بلد المنشأ إلى ثلاثة أضعاف المتوسط الشهري',
      recommendedAction: 'Proactive check-in call scheduled', status: 'ACTIONED' },
    { id: 'EW-003', detectedAt: addDaysIso(TODAY, -1), customer: 'Arjun Pillai', segment: 'RETAIL',
      signal: 'New credit line opened in home country (consented home-bureau feed)',
      signalAr: 'فتح خط ائتمان جديد في بلد المنشأ',
      recommendedAction: 'Limit review queued', status: 'OPEN' },
    { id: 'EW-004', detectedAt: addDaysIso(TODAY, -2), customer: 'Maricel Santos', segment: 'RETAIL',
      signal: 'Salary credit 6 days late vs established pattern',
      signalAr: 'تأخر إيداع الراتب ستة أيام عن النمط المعتاد',
      recommendedAction: 'Instalment shifted to salary landing date', status: 'ACTIONED' },
    { id: 'EW-005', detectedAt: addDaysIso(TODAY, -2), customer: 'Zahra Interiors FZE', segment: 'SME',
      signal: 'Balance depletion velocity high — runway under 3 weeks at current burn',
      signalAr: 'تسارع مرتفع في استنزاف رصيد الحساب',
      recommendedAction: 'Agent outreach same day', status: 'OPEN' }
  ];

  // ---------------------------------------------------------------------------
  // 1.5 sampleBook — seeded synthetic applications for policy simulation.
  // Distributions roughly UAE-plausible: salaries lognormal 6k–60k, AECB scores
  // centered ~660, ~8% retail no-hit, ~6% retirees, ~4% SME excluded activity,
  // ~15% SME thin commercial file.
  // ---------------------------------------------------------------------------
  function buildSampleBook() {
    const rnd = mulberry32(20260719 ^ 0x5EED);
    const normal = makeNormal(rnd);
    const retail = [];
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
      retail.push({ id: 'SR-' + String(i).padStart(3, '0'), salaryMonthly: salary,
                    aecbScore: score, obligationsMonthly: obligations, esrPct, retiree,
                    chequeReturns12m, worstDelinquency, amount, tenorMonths, salaryDetected });
    }
    const sme = [];
    for (let i = 1; i <= 80; i++) {
      const licenseAgeMonths = Math.round(6 + rnd() * 180);
      const excludedActivity = rnd() < 0.04;
      const thin = rnd() < 0.15;
      const commercialScore = thin ? null : Math.round(clamp(normal(650, 60), 400, 850));
      const ownerWorstScore = Math.round(clamp(normal(655, 80), 350, 850));
      const avgMonthlyInflow = roundTo(clamp(Math.exp(Math.log(220000) + 0.7 * normal(0, 1)), 60000, 1500000), 1000);
      const inflowVolatilityPct = Math.round(12 + rnd() * 65);
      const cq = rnd();
      const chequeReturns12m = cq < 0.72 ? 0 : (cq < 0.88 ? 1 : (cq < 0.95 ? 2 : (cq < 0.985 ? 3 : 4)));
      const amount = roundTo(100000 + rnd() * 2900000, 10000);
      const tenorMonths = [6, 12, 18, 24, 36][Math.floor(rnd() * 5)];
      sme.push({ id: 'SS-' + String(i).padStart(3, '0'), licenseAgeMonths, excludedActivity,
                 commercialScore, ownerWorstScore, avgMonthlyInflow, inflowVolatilityPct,
                 chequeReturns12m, amount, tenorMonths });
    }
    return { retail, sme };
  }

  const MizanData = {
    VERSION: 'data-1.1',
    TODAY: TODAY,
    personasRetail: personasRetail,
    personasSme: personasSme,
    sectorExclusions: sectorExclusions,
    reasonCodes: reasonCodes,
    earlyWarning: earlyWarning,
    sampleBook: buildSampleBook(),
    history: { days: 90, seed: 20260719 }
  };

  globalThis.MizanData = MizanData;
})();

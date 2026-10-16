/*
 * Mizan — engine self-test (NOOR-PIVOT.md §Selftest, groups 1–10; group 11 =
 * Addendum v2.1, starter loan → upgrade; group 12 = v2.3 repayment collection
 * (REPAYMENT-SPEC.md); group 13 = v2.4 home-country statements (STATEMENTS-SPEC.md);
 * group 14 = v2.5 NoorScore + the lender's credit memo (LENDER-VIEW-SPEC.md); group 15 =
 * v2.6 customer journey: prequalify() and persona j1 (JOURNEY-SPEC.md); group 16 = v2.7 car loan
 * (CAR-LOAN-SPEC.md); group 17 = v2.8 digital footprint, the personal-loan FCF rule and contact
 * preferences (BOTIM-V28-SPEC.md); group 18 = v2.9 UAE red flags (RED-FLAGS-SPEC.md); group 19 =
 * v2.10 SME working capital (SME-SPEC.md))
 * Group 20 = v2.13 contact preferences recorded after the loan is issued (JOURNEY-CONTACT-SPEC.md).
 * Group 21 = v2.14 the digital-footprint check covered by the accepted terms (JOURNEY-FOOTPRINT-TC-SPEC.md).
 * Group 22 = v2.15 j1's ENBD credit card and personal loan, same totals (JOURNEY-BANKAPP-SPEC.md).
 * Group 23 = v2.16 the Emirates ID front + back, employer cross-checked against the salary payer (JOURNEY-EID-SPEC.md).
 * Group 24 = v2.17 "Two steps to a score": data completeness first, then the score (JOURNEY-CONFIDENCE-SPEC.md).
 * Group 25 = v2.18 what lenders receive, Noor IP vs lender view, findings, six components, reproduce (MEETING-1008-SPEC.md).
 * Group 26 = v2.19 the reason-code library: three colours, standard and partner-requested codes, 4-eyes (REASON-CODES-SPEC.md).
 * Group 27 = v2.20 rely on botim’s phone and email verification; one-time codes only as a fallback (BOTIM-RELIANCE-SPEC.md).
 * Group 28 = v2.21 split school fees over 12 months, the default product; underwritten like the personal loan (SCHOOL-FEES-SPEC.md).
 * Plain Node script: loads data.js + engine.js, asserts the acceptance groups,
 * exits non-zero on any failure with clear messages. Fully deterministic.
 *
 *   node mal-bank/prototype/src/engine.selftest.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('./data.js');
require('./engine.js');

const D = globalThis.MizanData;
const E = globalThis.MizanEngine;

let failures = 0;
let checks = 0;
const emittedCodes = new Set();

function ok(cond, msg) {
  checks++;
  if (!cond) { failures++; console.error('  FAIL: ' + msg); }
}
function eq(actual, expected, msg) {
  ok(actual === expected, msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function near(actual, expected, tol, msg) {
  ok(Math.abs(actual - expected) <= tol, msg + ' — expected ≈' + expected + ' (±' + tol + '), got ' + actual);
}
function throwsWith(fn, needle, msg) {
  checks++;
  try { fn(); failures++; console.error('  FAIL: ' + msg + ' — expected a throw, none thrown'); return null; }
  catch (e) {
    const needles = Array.isArray(needle) ? needle : (needle ? [needle] : []);
    for (const n of needles) {
      if (!String(e.message).toLowerCase().includes(n.toLowerCase())) {
        failures++; console.error('  FAIL: ' + msg + ' — thrown message "' + e.message + '" does not mention "' + n + '"');
        break;
      }
    }
    return e;
  }
}
function group(name, fn) {
  console.log('\n[' + name + ']');
  try { fn(); } catch (e) { failures++; console.error('  FAIL (unexpected throw): ' + (e && e.stack || e)); }
}
function collect(codes) { for (const c of codes || []) emittedCodes.add(c); }
const CONSENT_ALL = { aecb: true, openFinance: true };
function decidePersona(productId, persona, overrides) {
  const rec = E.decide(Object.assign({
    productId, applicant: persona,
    amount: persona.defaultRequest.amount, tenorMonths: persona.defaultRequest.tenorMonths,
    consents: CONSENT_ALL
  }, overrides || {}));
  collect(rec.reasonCodes);
  return rec;
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const ARABIC = /[؀-ۿ]/;
// v2.3 repayment conditions (method-specific; replace every salary-transfer mention)
const DD_COND = 'Direct debit mandate active on the customer\'s bank account';
const AT_COND = 'Repayment set up via Al Tareq recurring payment consent';
const KFS_COND = 'Key Facts Statement acknowledged (AR + EN)';
// Any mention of moving a salary, except the allowed phrase "no salary transfer required".
const mentionsSalaryTransfer = (t) => /salary[\s-]transfer/i.test(String(t).replace(/no salary transfer required/gi, ''));

// Independent IRR (Newton's method on the annuity equation) to cross-check the
// engine's bisection-based aprEquivalent.
function independentApr(principal, payment, n) {
  let i = 0.02;
  for (let k = 0; k < 60; k++) {
    const v = Math.pow(1 + i, -n);
    const f = payment * (1 - v) / i - principal;
    const df = payment * (n * Math.pow(1 + i, -n - 1) * i - (1 - v)) / (i * i);
    const next = i - f / df;
    if (!Number.isFinite(next) || next <= 0) break;
    if (Math.abs(next - i) < 1e-13) { i = next; break; }
    i = next;
  }
  return 12 * i;
}

E.init(D);
const P = {};
for (const p of D.personasLoan) P[p.id] = p;
for (const p of D.personasSplit) P[p.id] = p;
const recs = {};

// ---------------------------------------------------------------------------
group('1. Persona intended outcomes at default policy (r1–r5 personal loan, c1–c5 split)', () => {
  // Manifests: five consumer products, in order (starter_loan third — Addendum v2.1; car_loan appended fifth — Addendum v2.7),
  // then the SME route appended sixth (Addendum v2.10), then split school fees appended seventh (Addendum v2.21).
  const mans = E.manifests();
  eq(mans.map(m => m.productId).join(','), 'split,personal_loan,starter_loan,salary_advance,car_loan,sme_working_capital,school_fees', 'manifests are split, personal_loan, starter_loan, salary_advance, car_loan, sme_working_capital, school_fees (v2.21) in order');
  ok(mans.every(m => m.segment === (m.productId === 'sme_working_capital' ? 'SME' : 'CONSUMER') && m.nameEn && m.nameAr && m.structure && m.pricingMode),
     'every consumer manifest is CONSUMER (the v2.10 SME route is SME) with names, structure, pricingMode');
  eq(mans.map(m => m.pricingMode).join(','), 'MONTHLY_FEE,BANDED_APR,TENOR_CURVE_APR,FLAT_FEE,BANDED_APR,BANDED_APR,SCHOOL_FEES', 'pricing modes per product (v2.21: SCHOOL_FEES)');
  eq(mans[0].structure, 'Instalment plan (revolving split capacity)', 'split structure string');
  eq(mans[1].structure, 'Amortising loan (reducing balance)', 'personal_loan structure string');
  eq(mans[3].structure, 'Single-repayment advance', 'salary_advance structure string');

  // --- Personal loan r1..r5 ---
  recs.r1 = decidePersona('personal_loan', P.r1);
  eq(recs.r1.outcome, 'APPROVE', 'r1 outcome');
  eq(recs.r1.score.grade, 'A', 'r1 grade');
  eq(recs.r1.limit.bindingConstraint, 'REQUESTED', 'r1 binding constraint');
  eq(recs.r1.limit.approved, P.r1.defaultRequest.amount, 'r1 approved = requested');
  eq(recs.r1.segment, 'CONSUMER', 'r1 decision segment CONSUMER');
  ok(recs.r1.score.overlays.some(o => o.name === 'Salary verified via connected account' && o.delta === 15),
     'r1 scorecard carries "Salary verified via connected account +15"');
  ok(recs.r1.dataPulls.some(d => d.source === 'OPEN_FINANCE'), 'r1 salary pulled via OPEN_FINANCE');
  ok(recs.r1.token && recs.r1.token.expiresAt, 'r1 approval token issued with expiry');
  ok(recs.r1.token.conditions.includes(KFS_COND) &&
     recs.r1.token.conditions.includes(DD_COND) &&
     recs.r1.token.conditions.includes('Credit life & job-loss cover offered (optional)'),
     'r1 token carries the conventional personal-loan conditions (KFS, direct debit for AED 150,000, cover offered)');
  ok(!recs.r1.token.conditions.some(mentionsSalaryTransfer), 'r1 token never mentions a salary transfer');
  ok(!recs.r1.token.conditions.includes('Remittance-linked repayment schedule'), 'remittance-linked condition is cross-border only');

  recs.r2 = decidePersona('personal_loan', P.r2);
  eq(recs.r2.outcome, 'REFER', 'r2 outcome without Credit Passport consent (thin file)');
  ok(recs.r2.reasonCodes.includes('RC_THIN_FILE'), 'r2 reasons include RC_THIN_FILE');
  ok(!recs.r2.dataPulls.some(d => d.source === 'CREDIT_PASSPORT'), 'no CREDIT_PASSPORT pull without consent');

  recs.r2cp = decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } });
  eq(recs.r2cp.outcome, 'APPROVE', 'r2 with Credit Passport consent approves');
  ok(['B', 'C', 'D'].includes(recs.r2cp.score.grade), 'r2 Credit Passport grade capped at B (got ' + recs.r2cp.score.grade + ')');
  eq(recs.r2cp.score.base, P.r2.homeBureau.score, 'home-bureau score used as scorecard base');
  ok(recs.r2cp.score.overlays.some(o => o.name === 'Cross-border conservatism' && o.delta === -40), 'cross-border conservatism overlay −40');
  ok(recs.r2cp.dataPulls.some(d => d.source === 'CREDIT_PASSPORT' && d.status === 'HIT'), 'CREDIT_PASSPORT pull recorded with HIT');
  eq(recs.r2cp.limit.bindingConstraint, 'CROSS_BORDER_HAIRCUT', 'r2 Credit Passport binding constraint');
  const unHaircut = Math.min.apply(null, recs.r2cp.limit.trace.filter(t => !/cross-border/i.test(t.label)).map(t => t.value));
  ok(recs.r2cp.limit.approved < unHaircut, 'haircut limit ' + recs.r2cp.limit.approved + ' below un-haircut ' + unHaircut);
  ok(recs.r2cp.reasonCodes.includes('RC_CROSS_BORDER'), 'r2 Credit Passport reasons include RC_CROSS_BORDER');
  ok(recs.r2cp.token && recs.r2cp.token.conditions.includes('Remittance-linked repayment schedule'),
     'cross-border token adds the remittance-linked repayment schedule');

  recs.r3 = decidePersona('personal_loan', P.r3);
  eq(recs.r3.outcome, 'APPROVE', 'r3 outcome');
  eq(recs.r3.limit.bindingConstraint, 'DBR_HEADROOM', 'r3 binding constraint');
  ok(recs.r3.limit.approved < P.r3.defaultRequest.amount / 2,
     'r3 limit sharply reduced (' + recs.r3.limit.approved + ' vs requested ' + P.r3.defaultRequest.amount + ')');
  ok(recs.r3.reasonCodes.includes('RC_LIMIT_REDUCED'), 'r3 reasons include RC_LIMIT_REDUCED');

  recs.r4 = decidePersona('personal_loan', P.r4);
  eq(recs.r4.outcome, 'DECLINE', 'r4 outcome');
  ok(recs.r4.reasonCodes.includes('RC_SCORE_LOW'), 'r4 reasons include RC_SCORE_LOW');
  ok(recs.r4.reasonCodes.includes('RC_DELINQUENCY'), 'r4 reasons include RC_DELINQUENCY');
  eq(recs.r4.limit.approved, 0, 'r4 approved amount 0');
  eq(recs.r4.pricing, null, 'r4 has no pricing');

  recs.r5 = decidePersona('personal_loan', P.r5);
  eq(recs.r5.outcome, 'APPROVE', 'r5 outcome');
  eq(recs.r5.limit.bindingConstraint, 'RETIREE_CAP', 'r5 binding constraint (30% retiree DBR cap)');
  ok(recs.r5.reasonCodes.includes('RC_RETIREE_CAP'), 'r5 reasons include RC_RETIREE_CAP');
  ok(recs.r5.limit.approved < P.r5.defaultRequest.amount, 'r5 limit below requested');
  const salaried = clone(P.r5); salaried.employment.retiree = false; salaried.employment.type = 'GOVERNMENT';
  const r5Salaried = decidePersona('personal_loan', salaried);
  ok(r5Salaried.limit.approved > recs.r5.limit.approved,
     'r5 limit (' + recs.r5.limit.approved + ') smaller than salaried equivalent (' + r5Salaried.limit.approved + ')');

  // --- Split c1..c5 ---
  recs.c1 = decidePersona('split', P.c1);
  eq(recs.c1.outcome, 'APPROVE', 'c1 outcome');
  eq(recs.c1.score.grade, 'A', 'c1 grade');
  eq(recs.c1.limit.planMonths, 6, 'c1 plan Pay in 6');
  eq(recs.c1.limit.approved, P.c1.purchase.amount, 'c1 approved = school fees amount');
  ok(recs.c1.limit.capacity >= 2 * P.c1.purchase.amount, 'c1 split capacity ' + recs.c1.limit.capacity + ' well above 12,000');
  eq(recs.c1.segment, 'CONSUMER', 'c1 decision segment CONSUMER');
  ok(recs.c1.dataPulls.some(d => d.source === 'AECB_CONSUMER') && recs.c1.dataPulls.some(d => d.source === 'OPEN_FINANCE'),
     'c1 pulls AECB_CONSUMER + OPEN_FINANCE');
  ok(recs.c1.token && recs.c1.token.conditions.length === 2 &&
     recs.c1.token.conditions.includes(KFS_COND) &&
     recs.c1.token.conditions.includes(DD_COND), 'c1 token carries the split conditions (KFS + direct debit for AED 12,000)');
  eq(recs.c1.features.freeCashFlowMonthly, 32000 - 19000 - 2400, 'c1 free cash flow = income − spend − obligations');
  eq(recs.c1.features.purchaseAgeDays, 11, 'c1 purchaseAgeDays (2026-07-08 → TODAY)');

  recs.c2 = decidePersona('split', P.c2);
  eq(recs.c2.outcome, 'REFER', 'c2 outcome (income volatility)');
  ok(recs.c2.reasonCodes.includes('RC_INCOME_VOLATILITY'), 'c2 reasons include RC_INCOME_VOLATILITY');

  recs.c3 = decidePersona('split', P.c3);
  eq(recs.c3.outcome, 'DECLINE', 'c3 outcome (free cash flow)');
  ok(recs.c3.reasonCodes.includes('RC_FREE_CASH_FLOW'), 'c3 reasons include RC_FREE_CASH_FLOW');
  ok(recs.c3.features.freeCashFlowMonthly < 1000, 'c3 free cash flow below minimum (' + recs.c3.features.freeCashFlowMonthly + ')');
  eq(recs.c3.limit.approved, 0, 'c3 approved amount 0');

  recs.c4 = decidePersona('split', P.c4);
  eq(recs.c4.outcome, 'APPROVE', 'c4 outcome (cash-flow underwriting)');
  ok(recs.c4.reasonCodes.includes('RC_CASH_FLOW_UNDERWRITTEN'), 'c4 reasons include RC_CASH_FLOW_UNDERWRITTEN');
  ok(['B', 'C', 'D'].includes(recs.c4.score.grade), 'c4 grade ≤ B (got ' + recs.c4.score.grade + ')');
  eq(recs.c4.score.base, 640, 'c4 scorecard base is the 640 cash-flow proxy');
  eq(recs.c4.dataPulls[0].status, 'NO_HIT', 'c4 AECB pull is a no-hit');
  ok(recs.c4.limit.capacity > 0 && recs.c4.limit.capacity <= 10000 && recs.c4.limit.capacity < recs.c1.limit.capacity,
     'c4 modest capacity (' + recs.c4.limit.capacity + ')');

  recs.c5 = decidePersona('split', P.c5);
  eq(recs.c5.outcome, 'DECLINE', 'c5 outcome');
  eq(recs.c5.reasonCodes[0], 'RC_DELINQUENCY', 'c5 primary reason RC_DELINQUENCY');
  ok(recs.c5.reasonCodes.includes('RC_SCORE_LOW'), 'c5 reasons include RC_SCORE_LOW');

  // Split scorecard arithmetic (spec overlays) on three personas.
  const ov = (rec) => rec.score.overlays.filter(o => o.delta !== 0).map(o => o.delta).join(',');
  eq(recs.c1.score.points, 761 + 20 + 15 + 10, 'c1 points = AECB 761 + FCF≥5k 20 + vol≤20 15 + connected≥12m 10');
  eq(ov(recs.c1), '20,15,10', 'c1 overlay deltas');
  eq(recs.c4.score.points, 640 + 20 + 15, 'c4 points = proxy 640 + FCF≥5k 20 + vol≤20 15');
  eq(recs.c5.score.points, 548 + 20 + 15 + 10 - 30, 'c5 points = 548 + 20 + 15 + 10 − cheque returns 30');
  eq(recs.c2.score.points, 702 + 20 - 25 + 10, 'c2 points = 702 + 20 − vol≥40 25 + 10');
  eq(recs.c3.score.points, 688 - 30 + 15 + 10, 'c3 points = 688 − FCF<1.5k 30 + 15 + 10');

  // Persona data consistency: connected series match the stated averages/volatility.
  for (const p of D.personasSplit) {
    const cn = p.connected;
    ok(cn.monthlyIncome.length === 12 && cn.monthlySpend.length === 12, p.id + ' has 12-slot income/spend series');
    const inc = cn.monthlyIncome.filter(v => v !== null), sp = cn.monthlySpend.filter(v => v !== null);
    eq(inc.length, cn.monthsAvailable, p.id + ' non-null months = monthsAvailable');
    const mean = inc.reduce((a, b) => a + b, 0) / inc.length;
    const sd = Math.sqrt(inc.reduce((a, b) => a + (b - mean) * (b - mean), 0) / inc.length);
    near(mean, cn.avgMonthlyIncome, 1, p.id + ' income series mean');
    near(sd / mean * 100, cn.incomeVolatilityPct, 1, p.id + ' income series volatility');
    near(sp.reduce((a, b) => a + b, 0) / sp.length, cn.avgMonthlySpend, 1, p.id + ' spend series mean');
    eq(p.defaultRequest.amount, p.purchase.amount, p.id + ' default request = purchase amount');
  }
});

// ---------------------------------------------------------------------------
group('2. Regulatory enforcement: DBR ≤ 50% on both products, tenor caps, permitted split terms', () => {
  // Personal loan — existing DBR already above 50%: never approves.
  const heavy = clone(P.r1); heavy.aecb.obligationsMonthly = 20000;
  const rHeavy = decidePersona('personal_loan', heavy);
  eq(rHeavy.outcome, 'DECLINE', 'personal loan: r1 with huge obligations declines');
  ok(rHeavy.reasonCodes.includes('RC_DBR_EXCEEDED'), 'personal loan heavy-obligation decline carries RC_DBR_EXCEEDED');
  const mid = clone(P.r1); mid.aecb.obligationsMonthly = 13000;
  const rMid = decidePersona('personal_loan', mid);
  eq(rMid.outcome, 'APPROVE', 'personal loan: moderate obligations approve at a reduced limit');
  ok(rMid.features.dbrPct <= 50, 'personal loan computed DBR ' + rMid.features.dbrPct + '% ≤ 50% on approval');
  eq(rMid.limit.bindingConstraint, 'DBR_HEADROOM', 'personal loan moderate case binds on DBR headroom');

  // Split — DBR headroom binds before free cash flow: plan lengthened, then amount reduced.
  const tight = clone(P.c1); tight.aecb.obligationsMonthly = 15000; tight.connected.avgMonthlySpend = 5000;
  const sTight = decidePersona('split', tight);
  eq(sTight.outcome, 'APPROVE', 'split: c1 with heavy obligations still approves a smaller plan');
  ok(sTight.features.dbrPct <= 50, 'split computed DBR ' + sTight.features.dbrPct + '% ≤ 50% on approval');
  eq(sTight.limit.bindingConstraint, 'DBR_HEADROOM', 'split heavy-obligation case binds on DBR_HEADROOM');
  eq(sTight.limit.planMonths, 12, 'split heavy-obligation case lengthened to Pay in 12');
  ok(sTight.limit.approved < P.c1.purchase.amount && sTight.reasonCodes.includes('RC_LIMIT_REDUCED'),
     'split heavy-obligation amount reduced (' + sTight.limit.approved + ') with RC_LIMIT_REDUCED');
  const over = clone(P.c1); over.aecb.obligationsMonthly = 17000; over.connected.avgMonthlySpend = 3000;
  const sOver = decidePersona('split', over);
  eq(sOver.outcome, 'DECLINE', 'split: existing DBR above 50% declines');
  ok(sOver.reasonCodes.includes('RC_DBR_EXCEEDED'), 'split DBR decline carries RC_DBR_EXCEEDED');

  // Split — FCF budget forces a longer plan for the full amount (binding FREE_CASH_FLOW).
  // c1 with a AED 20,000 purchase on Pay in 3: 6,916.67/mo > 50% × FCF 10,600 = 5,300 → Pay in 6 (3,583.33) fits.
  const big = clone(P.c1); big.purchase.amount = 20000;
  const pay3 = decidePersona('split', big, { amount: 20000, tenorMonths: 3 });
  eq(pay3.outcome, 'APPROVE', 'c1 AED 20,000 Pay in 3 request still approves');
  eq(pay3.limit.approved, 20000, 'full amount kept');
  eq(pay3.limit.planMonths, 6, 'Pay in 3 breaches the FCF budget → shortest fitting plan Pay in 6');
  eq(pay3.limit.bindingConstraint, 'FREE_CASH_FLOW', 'lengthened plan records FREE_CASH_FLOW as binding');
  ok(pay3.reasonCodes.includes('RC_PLAN_ADJUSTED'), 'lengthened plan carries RC_PLAN_ADJUSTED');
  ok(pay3.features.newInstalment <= 0.5 * pay3.features.freeCashFlowMonthly, 'instalment within 50% of FCF after lengthening');
  ok(!pay3.pricing.plans.find(p => p.months === 3).fits && pay3.pricing.plans.find(p => p.months === 6).fits,
     'pricing.plans flags Pay in 3 as not fitting, Pay in 6 as fitting');

  // Sweep both sample books: no auto-approval ever exceeds the DBR cap.
  let approvals = 0, worst = 0;
  for (const pid of ['split', 'personal_loan']) {
    for (const row of D.sampleBook[pid]) {
      const x = E.decideRaw(pid, row);
      collect(x.reasonCodes);
      if (x.outcome === 'APPROVE') {
        approvals++; worst = Math.max(worst, x.dbrPct);
        const cap = row.retiree ? 30 : 50;
        if (!(x.dbrPct <= cap)) ok(false, pid + ' ' + row.id + ' approved with DBR ' + x.dbrPct + '% > ' + cap + '%');
      }
    }
  }
  ok(approvals > 0, 'sample-book sweep: ' + approvals + ' approvals, worst DBR ' + worst + '% (all ≤ cap)');

  // Personal loan tenor 60 → clamped to 48 with RC_TENOR_CAP.
  const rTenor = decidePersona('personal_loan', P.r1, { tenorMonths: 60 });
  ok(rTenor.reasonCodes.includes('RC_TENOR_CAP'), 'personal loan tenor 60 carries RC_TENOR_CAP');
  eq(rTenor.features.effectiveTenor, 48, 'personal loan tenor clamped to 48 months (Reg 29/2011)');

  // Split tenor ∉ {3, 6, 12} → snapped to a permitted term with RC_TENOR_CAP.
  for (const [asked, expect] of [[9, 12], [24, 12], [1, 3], [4, 6]]) {
    const s = decidePersona('split', P.c1, { tenorMonths: asked });
    eq(s.limit.planMonths, expect, 'split tenor ' + asked + ' → Pay in ' + expect);
    ok(s.reasonCodes.includes('RC_TENOR_CAP'), 'split tenor ' + asked + ' carries RC_TENOR_CAP');
    ok([3, 6, 12].includes(s.pricing.selectedMonths), 'split selected plan is a permitted term');
  }
  const s12 = decidePersona('split', P.c1, { tenorMonths: 12 });
  ok(!s12.reasonCodes.includes('RC_TENOR_CAP'), 'permitted split tenor 12 has no RC_TENOR_CAP');
  throwsWith(() => E.publishPolicy('split', { allowedPlansMonths: [3, 6, 24] }, { author: 'a.hassan', approver: 'm.rashid' }),
             'regulatory', 'split permitted terms are a locked regulatory primitive');
});

// ---------------------------------------------------------------------------
group('3. Consent gate (AECB for all; Open Finance for split)', () => {
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: P.r1, amount: 100000, tenorMonths: 24,
                              consents: { openFinance: true } }),
             'consent', 'personal loan without AECB consent throws');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: P.r1, amount: 100000, tenorMonths: 24 }),
             'consent', 'decide() without a consents object throws');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6,
                              consents: { openFinance: true } }),
             'AECB consent', 'split without AECB consent throws');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6,
                              consents: { aecb: true } }),
             ['open finance', 'consent'], 'split without Open Finance consent throws');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6,
                              consents: { aecb: true, openFinance: false } }),
             ['open finance', 'consent'], 'split with openFinance:false throws');
  const noOf = decidePersona('personal_loan', P.r1, { consents: { aecb: true } });
  ok(noOf.dataPulls.some(d => d.source === 'DOCUMENTS') && !noOf.dataPulls.some(d => d.source === 'OPEN_FINANCE'),
     'personal loan without Open Finance consent falls back to DOCUMENTS (no connected-account pull)');
  ok(!noOf.score.overlays.some(o => /connected account/.test(o.name)), 'no connected-salary overlay without Open Finance consent');
});

// ---------------------------------------------------------------------------
group('4. 4-eyes on publishPolicy and override', () => {
  throwsWith(() => E.publishPolicy('personal_loan', { scoreDecline: 640 }, { author: 'a.hassan', approver: 'a.hassan' }),
             '4-eyes', 'personal loan publish with author===approver throws');
  throwsWith(() => E.publishPolicy('split', { minFreeCashFlow: 1500 }, { author: 'n.saeed', approver: 'N.Saeed ' }),
             '4-eyes', 'split publish with author===approver (case/space-insensitive) throws');
  throwsWith(() => E.publishPolicy('personal_loan', { dbrCapPct: 60 }, { author: 'a.hassan', approver: 'm.rashid' }),
             'regulatory', 'publish rejects edits to locked regulatory primitives');
  throwsWith(() => E.publishPolicy('split', { monthlyFeeRate: { A: 0.03, B: 0.02, C: 0.025 } }, { author: 'a.hassan', approver: 'm.rashid' }),
             'risk-ordered', 'fee rates must stay risk-ordered A ≤ B ≤ C');
  const v = E.publishPolicy('personal_loan', { maxEsrPct: 60 }, { author: 'a.hassan', approver: 'm.rashid' });
  eq(v.version, 2, 'valid personal loan publish bumps version to 2');
  const vs = E.publishPolicy('split', { tokenValidityDays: 7 }, { author: 'n.saeed', approver: 'm.rashid' });
  eq(vs.version, 2, 'valid split publish bumps version to 2');
  const hist = E.policyHistory('split');
  eq(hist.length, 2, 'split policy history has 2 versions');
  eq(hist[1].approvedBy, 'm.rashid', 'history records the approver');

  throwsWith(() => E.override(recs.c2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW',
                                            analyst: 'a.hassan', approver: 'a.hassan' }),
             '4-eyes', 'override with analyst===approver throws');
  const od = E.override(recs.c2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW',
                                      analyst: 'a.hassan', approver: 'm.rashid',
                                      note: 'Invoices verified; two retainer clients' });
  collect(od.reasonCodes);
  eq(od.status, 'OVERRIDDEN', 'valid 4-eyes override lands (c2 split refer)');
  eq(od.outcome, 'APPROVE', 'override outcome applied');
  ok(od.token && od.token.conditions.includes(DD_COND) &&
     od.token.conditions.some(c => /override/i.test(c)), 'override token carries split conditions + override note');
  ok(od.repayment && od.repayment.method === 'DIRECT_DEBIT' && od.repayment.amount === od.limit.approved,
     'approving override sets repayment from the approved amount (' + (od.repayment && od.repayment.method) + ')');
  const od2 = E.override(recs.r2.id, { outcome: 'DECLINE', reasonCode: 'RC_THIN_FILE', analyst: 'x.one', approver: 'y.two' });
  eq(od2.limit.approved, 0, 'declining override zeroes the limit');
  eq(od2.repayment, null, 'declining override carries no repayment');
  throwsWith(() => E.override(recs.r1.id, { outcome: 'DECLINE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'x', approver: 'y' }),
             'REFER', 'override on a non-REFER decision throws');
});

// ---------------------------------------------------------------------------
group('5. Conventional execution sequencing (an approval is not a loan)', () => {
  const ev = E.EXEC_EVENTS;
  eq(ev.join(','), 'OFFER_ACCEPTED,KFS_ACKNOWLEDGED,AGREEMENT_SIGNED,REPAYMENT_SET_UP,COOLING_OFF_CLEARED,DISBURSED', 'EXEC_EVENTS order (v2.3: repayment set-up before cooling-off)');
  const steps = E.execSteps('split');
  const stepOf = (list, t) => list.find(s => s.type === t) || {};
  ok(steps.length === 6 && steps.every(s => s.type && s.label && s.description), 'execSteps returns 6 labelled steps');
  ok(/goal/.test(stepOf(steps, 'DISBURSED').description), 'split DISBURSED description routes freed cash to the goal');
  ok(/customer's account/.test(stepOf(E.execSteps('personal_loan'), 'DISBURSED').description), 'personal loan DISBURSED description');

  // Every wrong step at every position throws, naming the expected next step.
  for (const recId of [recs.r1.id, recs.c1.id]) {
    for (let k = 0; k < ev.length; k++) {
      for (const wrong of ev) {
        if (wrong === ev[k]) continue;
        throwsWith(() => E.recordEvent(recId, wrong), ['out of sequence', 'expected ' + ev[k] + ' next'],
                   recId + ': ' + wrong + ' at step ' + (k + 1) + ' throws');
      }
      E.recordEvent(recId, ev[k]);
    }
    const done = E.getDecision(recId);
    eq(done.status, 'EXECUTED', recId + ' full ordered sequence ends EXECUTED');
    eq(done.events.length, 6, recId + ' six execution events recorded');
  }
  // Message format and consumer-protection reasons.
  const fresh = decidePersona('personal_loan', P.r1);
  const e1 = throwsWith(() => E.recordEvent(fresh.id, 'DISBURSED'), 'Mizan: out of sequence — expected OFFER_ACCEPTED next (',
                        'message format "Mizan: out of sequence — expected <NEXT> next (<reason>)"');
  ok(e1 && e1.message.startsWith('Mizan: out of sequence — expected OFFER_ACCEPTED next ('), 'message starts with the contract format');
  E.recordEvent(fresh.id, 'OFFER_ACCEPTED');
  throwsWith(() => E.recordEvent(fresh.id, 'AGREEMENT_SIGNED'),
             'KFS must be acknowledged before the agreement is signed — CBUAE Consumer Protection Standards',
             'signing before KFS cites consumer protection');
  E.recordEvent(fresh.id, 'KFS_ACKNOWLEDGED');
  E.recordEvent(fresh.id, 'AGREEMENT_SIGNED');
  throwsWith(() => E.recordEvent(fresh.id, 'DISBURSED'), ['expected REPAYMENT_SET_UP next', 'no disbursement until repayment collection is set up'],
             'disbursing before repayment set-up cites the repayment rule (v2.3)');
  throwsWith(() => E.recordEvent(fresh.id, 'COOLING_OFF_CLEARED'), 'expected REPAYMENT_SET_UP next',
             'cooling-off cannot clear before repayment collection is set up');
  E.recordEvent(fresh.id, 'REPAYMENT_SET_UP');
  throwsWith(() => E.recordEvent(fresh.id, 'DISBURSED'), 'no disbursement before the cooling-off period clears or is waived',
             'disbursing before cooling-off cites the cooling-off rule');
  throwsWith(() => E.recordEvent(recs.r1.id, 'OFFER_ACCEPTED'), 'already', 're-executing a completed agreement throws');
  throwsWith(() => E.recordEvent(recs.r4.id, 'OFFER_ACCEPTED'), 'approved', 'events on a declined decision throw');
  throwsWith(() => E.recordEvent(fresh.id, 'PROMISE_SIGNED'), 'unknown execution event', 'legacy event names are rejected');
});

// ---------------------------------------------------------------------------
group('6. Split pricing: Pay in 3/6/12, fee schedule, APR equivalent', () => {
  const pr = recs.c1.pricing;
  eq(pr.mode, 'MONTHLY_FEE', 'c1 pricing mode MONTHLY_FEE');
  eq(pr.band, 'A', 'c1 pricing band A');
  eq(pr.monthlyFeeRate, 0.0125, 'c1 monthly fee rate 1.25%');
  eq(pr.selectedMonths, 6, 'c1 selected plan 6');
  eq(pr.plans.map(p => p.months).join(','), '3,6,12', 'plans for 3, 6, 12 present');
  const P0 = pr.principal;
  eq(P0, 12000, 'pricing principal = approved amount');
  const fee = P0 * pr.monthlyFeeRate;
  for (const pl of pr.plans) {
    near(pl.monthlyFee, fee, 0.005, 'Pay in ' + pl.months + ' monthly fee = principal × rate (constant per month)');
    near(pl.planTotal, P0 + pl.monthlyFee * pl.months, 0.01, 'Pay in ' + pl.months + ' planTotal = principal + fee × n');
    near(pl.monthlyPayment, P0 / pl.months + pl.monthlyFee, 0.01, 'Pay in ' + pl.months + ' monthlyPayment = principal/n + fee');
    ok(pl.aprEquivalent > 0, 'Pay in ' + pl.months + ' aprEquivalent > 0 (' + pl.aprEquivalent + ')');
    near(pl.aprEquivalent, independentApr(P0, P0 / pl.months + fee, pl.months), 0.0001,
         'Pay in ' + pl.months + ' APR matches an independent IRR solve');
    ok(pl.aprEquivalent >= 12 * pr.monthlyFeeRate && pl.aprEquivalent < 24 * pr.monthlyFeeRate,
       'Pay in ' + pl.months + ' APR within [12r, 24r) sanity band');
  }
  ok(new Set(pr.plans.map(p => p.monthlyFee)).size === 1, 'fee identical across plans for the same principal and rate');
  // Direction (see report): with a flat fee on the ORIGINAL principal, the APR
  // equivalent RISES as the plan lengthens for the same monthly fee rate; for the
  // same TOTAL fee, the shorter plan has the higher APR.
  ok(pr.plans[0].aprEquivalent < pr.plans[1].aprEquivalent && pr.plans[1].aprEquivalent < pr.plans[2].aprEquivalent,
     'same monthly fee rate: APR equivalent rises with plan length (' + pr.plans.map(p => p.aprEquivalent).join(' < ') + ')');
  const totalFee = 900;  // same total fee spread over 3 vs 12 months
  const aprShortSameTotal = independentApr(P0, (P0 + totalFee) / 3, 3);
  const aprLongSameTotal = independentApr(P0, (P0 + totalFee) / 12, 12);
  ok(aprShortSameTotal > aprLongSameTotal, 'same total fee: shorter plan has the higher APR (' +
     aprShortSameTotal.toFixed(4) + ' > ' + aprLongSameTotal.toFixed(4) + ')');
  // Riskier band → higher fee → higher APR.
  const c4pr = recs.c4.pricing;
  eq(c4pr.monthlyFeeRate, 0.0225, 'c4 (grade C) monthly fee rate 2.25%');
  const c4six = c4pr.plans.find(p => p.months === 6);
  ok(c4six.aprEquivalent > pr.plans[1].aprEquivalent, 'grade C Pay in 6 APR above grade A Pay in 6 APR');
  // Personal loan KFS figures (BANDED_APR).
  const lp = recs.r1.pricing;
  eq(lp.mode, 'BANDED_APR', 'r1 pricing mode BANDED_APR');
  eq(JSON.stringify([lp.rateMin, lp.rateMax]), JSON.stringify([0.0599, 0.0699]), 'r1 band A 5.99%–6.99%');
  eq(lp.benchmark, 'EIBOR 3M + margin', 'personal loan benchmark label');
  near(lp.kfs.totalRepayable, lp.kfs.monthlyInstalment * lp.kfs.tenorMonths, 0.5, 'KFS total repayable = instalment × n');
  near(lp.kfs.totalInterest, lp.kfs.totalRepayable - lp.kfs.principal, 0.01, 'KFS total interest = repayable − principal');
});

// ---------------------------------------------------------------------------
group('7. Salary advance: limit = min(80% × salary, cap), flat fee independent of amount/tenor', () => {
  const pol = E.getPolicy('salary_advance');
  eq(pol.params.flatFee, 50, 'default flat fee AED 50');
  const q1 = decidePersona('salary_advance', P.r1, { amount: 20000, tenorMonths: 1 });
  eq(q1.outcome, 'APPROVE', 'r1 salary advance approves');
  eq(q1.limit.approved, Math.min(0.8 * 28000, pol.params.capAmount), 'limit = min(80% × 28,000, cap 13,500)');
  eq(q1.limit.bindingConstraint, 'PRODUCT_CAP', 'cap amount binds for r1');
  eq(q1.pricing.mode, 'FLAT_FEE', 'pricing mode FLAT_FEE');
  eq(q1.pricing.fee, 50, 'flat fee 50');
  ok(/no interest/i.test(q1.pricing.note), 'pricing note states no interest');
  const q2 = decidePersona('salary_advance', P.r1, { amount: 6000, tenorMonths: 3 });
  eq(q2.pricing.fee, 50, 'fee unchanged for a different amount/tenor');
  eq(q2.limit.approved, 6000, 'smaller request approved as requested');
  eq(q2.features.effectiveTenor, 1, 'tenor clamped to the next-salary cycle');
  ok(q2.reasonCodes.includes('RC_TENOR_CAP'), 'over-cycle tenor carries RC_TENOR_CAP');
  const lower = clone(P.r1); lower.employment.salaryMonthly = 12000; lower.bankData.avgSalaryCredit = 12000;
  const q3 = decidePersona('salary_advance', lower, { amount: 20000, tenorMonths: 1 });
  eq(q3.limit.approved, Math.min(0.8 * 12000, pol.params.capAmount), 'salary 12,000 → limit 80% × salary = 9,600');
  eq(q3.limit.bindingConstraint, 'SALARY_MULTIPLE', '80%-of-salary binds below the cap');
  eq(q3.pricing.fee, q1.pricing.fee, 'fee identical across salaries/amounts');
});

// ---------------------------------------------------------------------------
group('8. Split another purchase (drawdownCheck) on c1', () => {
  const rec = E.getDecision(recs.c1.id);
  const cap = rec.limit.capacity;
  eq(cap, 31500, 'c1 split capacity = floor500(3.0 × 10,600) = 31,500');
  const remaining0 = cap - rec.limit.approved;
  const d1 = E.drawdownCheck(rec.id, 5000, {});
  collect(d1.reasonCodes);
  eq(d1.allowed, true, 'split within remaining capacity allowed');
  eq(d1.remainingAfter, remaining0 - 5000, 'remaining capacity after the split');
  eq(d1.plan.months, 6, 'default plan Pay in 6');
  near(d1.plan.monthlyPayment, 5000 / 6 + 5000 * 0.0125, 0.01, 'plan monthly payment at the decision fee rate');
  const d2 = E.drawdownCheck(rec.id, 1000, { arrears: true });
  collect(d2.reasonCodes);
  eq(d2.allowed, false, 'arrears flag blocks the split');
  ok(d2.reasonCodes.includes('RC_DRAWDOWN_ARREARS'), 'blocked with RC_DRAWDOWN_ARREARS');
  eq(d2.remainingAfter, d1.remainingAfter, 'blocked split does not consume capacity');
  const d3 = E.drawdownCheck(rec.id, d1.remainingAfter + 500, {});
  collect(d3.reasonCodes);
  eq(d3.allowed, false, 'over-capacity split blocked');
  ok(d3.reasonCodes.includes('RC_DRAWDOWN_LIMIT'), 'blocked with RC_DRAWDOWN_LIMIT');
  const d4 = E.drawdownCheck(rec.id, 14000, { months: 3 });
  collect(d4.reasonCodes);
  eq(d4.allowed, true, 'large split within capacity allowed on a longer plan');
  ok(d4.plan.adjusted && d4.plan.months > 3, 'Pay in 3 lengthened to Pay in ' + d4.plan.months + ' to stay within 50% of FCF');
  throwsWith(() => E.drawdownCheck(rec.id, 1000, { months: 9 }), 'permitted split terms', 'flags.months must be 3/6/12');
  throwsWith(() => E.drawdownCheck(recs.r1.id, 1000, {}), 'split', 'drawdownCheck on a personal loan throws');
  throwsWith(() => E.drawdownCheck(recs.c3.id, 1000, {}), 'approved', 'drawdownCheck on a declined split throws');
});

// ---------------------------------------------------------------------------
group('9. simulateBook on both products', () => {
  const s1 = E.simulateBook('split', { minFreeCashFlow: 2500 });
  eq(s1.size, 120, 'split sample book has 120 rows');
  ok(s1.after.APPROVE < s1.before.APPROVE, 'split: raising minFreeCashFlow 1,000→2,500 strictly reduces approvals (' +
     s1.before.APPROVE + ' → ' + s1.after.APPROVE + ')');
  ok(s1.flips.length > 0, 'split flips non-empty (' + s1.flips.length + ')');
  const s2 = E.simulateBook('split', { scoreRefer: 700 });
  ok(s2.after.APPROVE < s2.before.APPROVE, 'split: raising scoreRefer 650→700 strictly reduces approvals (' +
     s2.before.APPROVE + ' → ' + s2.after.APPROVE + ')');
  ok(s2.flips.length > 0, 'split scoreRefer flips non-empty');
  const l1 = E.simulateBook('personal_loan', { scoreDecline: 660 });
  eq(l1.size, 140, 'personal-loan sample book has 140 rows');
  ok(l1.after.APPROVE < l1.before.APPROVE, 'personal loan: raising scoreDecline 620→660 strictly reduces approvals (' +
     l1.before.APPROVE + ' → ' + l1.after.APPROVE + ')');
  ok(l1.flips.length > 0, 'personal loan flips non-empty (' + l1.flips.length + ')');
  for (const f of s1.flips.concat(s2.flips, l1.flips)) emittedCodes.add(f.why);
  ok(typeof l1.summary === 'string' && l1.summary.length > 0 && typeof s1.summary === 'string', 'summary strings present');
  eq(E.getPolicy('split').params.minFreeCashFlow, 1000, 'simulation does not mutate the live split policy');
  throwsWith(() => E.simulateBook('split', { dbrCapPct: 60 }), 'regulatory', 'simulateBook rejects regulatory edits');
  ok(D.sampleBook.split.every(r => [3, 6, 12].includes(r.tenorMonths) && 'aecbScore' in r && Number.isFinite(r.income)),
     'split rows carry the documented fields with tenor ∈ {3,6,12}');
  ok(D.sampleBook.split.some(r => r.aecbScore === null), 'split book includes AECB no-hit rows');
});

// ---------------------------------------------------------------------------
group('10. Determinism, reason-code completeness (EN + AR), no legacy vocabulary', () => {
  eq(D.VERSION, 'data-2.0', 'data VERSION');
  eq(E.VERSION, 'engine-2.0', 'engine VERSION');
  eq(recs.c1.engineVersion, 'engine-2.0', 'decision records carry engineVersion');

  // Reason codes: every emitted code exists bilingually.
  for (const rec of E.listDecisions()) collect(rec.reasonCodes);
  const missing = [...emittedCodes].filter(c => !D.reasonCodes[c]);
  ok(missing.length === 0, 'every emitted reason code exists in MizanData.reasonCodes (missing: ' + missing.join(', ') + ')');
  const badAr = Object.keys(D.reasonCodes).filter(c => !(D.reasonCodes[c].en && ARABIC.test(D.reasonCodes[c].ar || '')));
  ok(badAr.length === 0, 'every reason code has English + non-empty Arabic (bad: ' + badAr.join(', ') + ')');
  ok(emittedCodes.size >= 14, 'a meaningful spread of reason codes was exercised (' + emittedCodes.size + ')');
  for (const c of ['RC_FREE_CASH_FLOW', 'RC_INCOME_VOLATILITY', 'RC_CASH_FLOW_UNDERWRITTEN', 'RC_PURCHASE_UNVERIFIED', 'RC_CONNECTED_HISTORY']) {
    ok(!!D.reasonCodes[c], 'new code ' + c + ' present');
  }
  for (const c of ['RC_SECTOR_EXCLUDED', 'RC_LICENSE_AGE', 'RC_OWNER_SCORE', 'RC_VOLATILITY']) {
    ok(!D.reasonCodes[c], 'removed code ' + c + ' absent');
  }
  // v2.10 reintroduces an SME route on purpose (persona s1, sampleBook.sme_working_capital); the legacy v1 keys stay gone.
  ok(Array.isArray(D.personasSme) && D.personasSme.map(p => p.id).join(',') === 's1' && !('sectorExclusions' in D) && !('retail' in D.sampleBook) && !('sme' in D.sampleBook),
     'no legacy SME personas, sector screen or legacy sample-book keys (personasSme holds only the v2.10 route, s1)');

  // No legacy vocabulary anywhere in the engine or data source. v2.3 also bans
  // salary-transfer recourse wording ("no salary transfer required" is allowed).
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  for (const f of ['data.js', 'engine.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const lines = src.split('\n');
    const hits = [];
    lines.forEach((line, i) => { const m = line.match(banned); if (m) hits.push((i + 1) + ':"' + m[0] + '"'); });
    ok(hits.length === 0, f + ' contains no banned legacy terms (hits: ' + hits.slice(0, 5).join(', ') + ')');
    const st = [];
    lines.forEach((line, i) => { if (mentionsSalaryTransfer(line)) st.push(i + 1); });
    ok(st.length === 0, f + ' never mentions a salary transfer except "no salary transfer required" (lines: ' + st.join(', ') + ')');
  }

  // Metrics shape (seeded history + session decisions).
  const m = E.metrics();
  eq(m.window, '90d', 'metrics window');
  ok(!('bySegment' in m) && m.byProduct && m.byProduct.split && m.byProduct.personal_loan, 'metrics grouped byProduct (no bySegment)');
  ok(m.byProduct.split.decisions >= 2400 && m.byProduct.split.decisions <= 2800, 'split ~2,600 decisions / 90d (' + m.byProduct.split.decisions + ')');
  ok(m.byProduct.personal_loan.decisions >= 1000 && m.byProduct.personal_loan.decisions <= 1200, 'personal loan ~1,100 decisions / 90d (' + m.byProduct.personal_loan.decisions + ')');
  ok(m.byProduct.split.stpPct >= 83 && m.byProduct.split.stpPct <= 89, 'split STP ~86% (' + m.byProduct.split.stpPct + ')');
  ok(m.byProduct.personal_loan.stpPct >= 74 && m.byProduct.personal_loan.stpPct <= 82, 'personal loan STP ~78% (' + m.byProduct.personal_loan.stpPct + ')');
  const sp = m.byProduct.split;
  ok(Math.abs(sp.APPROVE / sp.decisions - 0.70) < 0.03 && Math.abs(sp.REFER / sp.decisions - 0.12) < 0.03,
     'split mix ≈70/12/18 (' + [sp.APPROVE, sp.REFER, sp.DECLINE].map(x => Math.round(x / sp.decisions * 100)).join('/') + ')');
  eq(m.totals.decisions, Object.keys(m.byProduct).reduce((s, k) => s + m.byProduct[k].decisions, 0), 'totals = sum of byProduct');
  ok(m.daily.length === 90, 'daily series has 90 entries');
  ok(m.vintages.length === 6 && m.vintages.every(v => 'splitFpdPct' in v && 'loanFpdPct' in v) &&
     m.vintages[5].splitFpdPct > m.vintages[0].splitFpdPct && m.vintages[5].loanFpdPct > m.vintages[0].loanFpdPct,
     'vintages {mob, splitFpdPct, loanFpdPct} gently rising');
  const ew = m.earlyWarning;
  ok(Array.isArray(ew) && ew.length === 5, 'metrics().earlyWarning has 5 entries');
  const floor = new Date(new Date(D.TODAY + 'T00:00:00Z').getTime() - 3 * 86400000).toISOString().slice(0, 10);
  ok(ew.every(s => s.detectedAt >= floor && s.detectedAt <= D.TODAY), 'signals detected within the last 3 days of TODAY');
  ok(ew.every(s => s.segment === 'CONSUMER' && ['split', 'personal_loan'].includes(s.productId) &&
                   s.customer && s.signal && s.signalAr && s.recommendedAction && ['ACTIONED', 'OPEN'].includes(s.status)),
     'every signal is CONSUMER with productId, signal (EN + AR), action and status');
  const q = E.referQueue();
  ok(q.length > 0 && q.every(r => r.segment === 'CONSUMER' && ['split', 'personal_loan', 'salary_advance'].includes(r.productId)),
     'refer queue is consumer-only with productId');

  // Determinism: two fresh inits produce identical metrics, books and decisions.
  function snapshot() {
    E.init(D);
    const out = [];
    for (const p of D.personasLoan) out.push(decidePersona('personal_loan', p));
    for (const p of D.personasSplit) out.push(decidePersona('split', p));
    return JSON.stringify({ totals: E.metrics().totals,
                            book: ['split', 'personal_loan'].map(pid => D.sampleBook[pid].map(r => E.decideRaw(pid, r))),
                            decisions: out });
  }
  const a = snapshot(), b = snapshot();
  ok(a === b, 'two fresh init() runs produce identical metrics, sample-book outcomes and decision records');
});

// ---------------------------------------------------------------------------
group('11. Starter loan → upgrade (Addendum v2.1): tiers, curve, partner-income guarantee', () => {
  E.init(D);
  const U = {};
  for (const p of D.personasUpgrade) U[p.id] = p;
  const ALL3 = { aecb: true, openFinance: true, internationalStatements: true };
  const up = (persona, consents) => {
    const rec = E.decide({ productId: 'starter_loan', applicant: persona, consents });
    collect(rec.reasonCodes);
    return rec;
  };
  // Independent amortising instalment (rounded up to the fils) for cross-checks.
  const indepPay = (A, apr, n) => {
    const r = apr / 12;
    return Math.ceil((n === 1 ? A * (1 + r) : A * r / (1 - Math.pow(1 + r, -n))) * 100 - 1e-7) / 100;
  };

  // Manifest + regulatory + execution steps
  const man = E.manifests().find(m => m.productId === 'starter_loan');
  ok(man && man.nameEn === 'Starter loan' && man.nameAr === 'قرض البداية' && man.segment === 'CONSUMER' &&
     man.structure === 'Short amortising loan with an upgrade path' && man.pricingMode === 'TENOR_CURVE_APR',
     'starter_loan manifest: names, CONSUMER, structure, TENOR_CURVE_APR');
  const pol = E.getPolicy('starter_loan');
  eq(JSON.stringify(pol.regulatory), JSON.stringify({ dbrCapPct: 50, dbrCapRetireePct: 30, aecbCheckRequired: true, coolingOffDays: 5 }),
     'starter_loan regulatory primitives');
  eq(JSON.stringify(pol.params.tiers.enhanced), JSON.stringify({ maxAmount: 3000, maxTenorMonths: 6, aprAtOneMonth: 0.45, aprAtMaxTenor: 0.35 }),
     'enhanced tier defaults');
  eq(JSON.stringify(pol.params.tiers.base), JSON.stringify({ maxAmount: 1500, maxTenorMonths: 3, aprAtOneMonth: 0.48, aprAtMaxTenor: 0.42 }),
     'base tier defaults');
  const st = E.execSteps('starter_loan');
  ok(st.length === 6 && st.map(x => x.type).join(',') === E.EXEC_EVENTS.join(',') && /credited/.test(st[5].description),
     'execSteps(starter_loan) → the same 6 conventional steps');

  // Persona data consistency (same conventions as the split personas)
  for (const p of D.personasUpgrade) {
    const cn = p.connected;
    const inc = cn.monthlyIncome.filter(v => v !== null), sp = cn.monthlySpend.filter(v => v !== null);
    ok(cn.monthlyIncome.length === 12 && inc.length === cn.monthsAvailable, p.id + ' 12-slot series, non-null = monthsAvailable');
    const mean = inc.reduce((a, b) => a + b, 0) / inc.length;
    const sd = Math.sqrt(inc.reduce((a, b) => a + (b - mean) * (b - mean), 0) / inc.length);
    near(mean, cn.avgMonthlyIncome, 1, p.id + ' income series mean');
    near(sd / mean * 100, cn.incomeVolatilityPct, 1, p.id + ' income series volatility');
    near(sp.reduce((a, b) => a + b, 0) / sp.length, cn.avgMonthlySpend, 1, p.id + ' spend series mean');
  }

  // ---- u1, all three consents → ENHANCED ----
  const u1 = up(U.u1, ALL3);
  eq(u1.outcome, 'APPROVE', 'u1 (all consents) → APPROVE');
  eq(u1.kind, 'UPGRADE', 'u1 record kind UPGRADE');
  eq(u1.tier, 'ENHANCED', 'u1 tier ENHANCED');
  eq(u1.reasonCodes[0], 'RC_UPGRADE_ENHANCED', 'u1 reason RC_UPGRADE_ENHANCED');
  eq(u1.upgrade.maxAmount, 3000, 'u1 maxAmount 3,000');
  eq(u1.upgrade.maxTenorMonths, 6, 'u1 maxTenor 6');
  const curve = u1.upgrade.curve;
  eq(curve[0].apr, 0.45, 'u1 apr(1) = 45%');
  eq(curve[5].apr, 0.35, 'u1 apr(6) = 35%');
  eq(curve.map(c => c.apr).join(','), '0.45,0.43,0.41,0.39,0.37,0.35', 'enhanced curve 45, 43, 41, 39, 37, 35 %');
  ok(curve.every((c, i) => i === 0 || c.apr < curve[i - 1].apr), 'APR strictly decreasing with tenor');
  eq(u1.upgrade.starterPartnerIncome, 41.67, 'starter partner income AED 41.67');
  eq(JSON.stringify(u1.priorLoan), JSON.stringify(U.u1.priorLoan), 'priorLoan copied onto the record');
  eq(u1.selection, null, 'selection null at decision time');
  eq(u1.pricing.mode, 'TENOR_CURVE_APR', 'pricing mode TENOR_CURVE_APR');
  eq(u1.pricing.aprFloor, 0.35, 'pricing aprFloor 35%');
  eq(u1.limit.approved, 3000, 'limit.approved = maxAmount');
  eq(u1.limit.capacity, 3000, 'limit.capacity = maxAmount');
  eq(u1.limit.bindingConstraint, 'TIER_CAP', 'binding constraint TIER_CAP');
  eq(Math.min.apply(null, u1.limit.trace.map(t => t.value)), u1.limit.approved, 'approved = min(trace)');
  eq(u1.features.incomeHistoryMonths, 29, 'income history 29 months (5 UAE + 24 home-country account history, v2.4 statements)');
  eq(u1.features.homeCountryObligations, 350, 'home-country obligations visible with statements (350)');
  eq(u1.features.freeCashFlowMonthly, 9500 - 5600 - 350, 'free cash flow 3,550 = income − spend − home-country obligations');
  eq(u1.features.maxInstalment, 1775, 'max instalment 1,775 = 50% × free cash flow');
  eq(u1.dataPulls.map(d => d.source).join(','), 'PRIOR_DECISION,AECB_CONSUMER,OPEN_FINANCE,HOME_STATEMENTS',
     'data pulls: prior decision, AECB, Open Finance, home-country statements (v2.4 name)');
  eq(u1.rules.map(r => r.id).join(','), 'REG_AECB_CHECK,REG_DBR_CAP,POL_STARTER_REPAID_ON_TIME,POL_CONNECTED_ACCOUNTS,POL_INCOME_HISTORY,POL_FREE_CASH_FLOW,POL_HOME_STATEMENTS',
     'all seven upgrade rules recorded in order');
  ok(u1.rules.every(r => r.result === 'PASS'), 'u1 every rule PASS');
  ok(u1.consents.homeStatements && u1.consents.homeStatements.granted === true, 'home-country statements consent recorded');
  ok(u1.token && u1.token.conditions.some(c => /chooses the amount and term/.test(c)), 'token issued; conditions ask the customer to choose');
  eq(JSON.stringify(u1.upgrade.counterfactual), JSON.stringify({ tier: 'BASE', maxAmount: 1500, maxTenorMonths: 3, aprAtMaxTenor: 0.42 }),
     'counterfactual = the base tier');

  // Options at AED 3,000
  const q = E.quoteUpgrade(u1.id, 3000);
  eq(q.amount, 3000, 'quote at 3,000');
  eq(q.options.length, 6, 'options for 1..6 months');
  const o1 = q.options[0], o6 = q.options[5];
  eq(o1.monthlyPayment, 3112.50, '1 month @3,000: AED 3,112.50/mo');
  eq(o1.fits, false, '1 month @3,000 does NOT fit (3,112.50 > 1,775)');
  eq(o1.reason, 'RC_OPTION_UNAFFORDABLE', 'unfit option carries RC_OPTION_UNAFFORDABLE');
  ok(q.options.slice(1).every(o => o.fits), '2–6 months @3,000 all fit');
  eq(o6.monthlyPayment, 552.27, '6 months @3,000: AED 552.27/mo');
  eq(o6.totalInterest, 313.62, '6 months @3,000: total interest AED 313.62');
  eq(o6.partnerIncomeVsStarterX, 7.5, '6 months @3,000: partner income ×7.5 vs starter');
  ok(o6.partnerIncome > 41.67, 'partnerIncome(6m @3,000) ' + o6.partnerIncome + ' > starter 41.67');
  ok(q.options.every((o, i) => i === 0 || o.partnerIncome > q.options[i - 1].partnerIncome),
     'partner income strictly increasing with tenor (' + q.options.map(o => o.partnerIncome).join(' < ') + ')');
  ok(q.options.every((o, i) => i === 0 || o.apr < q.options[i - 1].apr), 'quoted APR strictly decreasing with tenor');
  ok(q.options.every((o, i) => i === 0 || o.monthlyPayment < q.options[i - 1].monthlyPayment), 'monthly payment falls with tenor');
  ok(q.options.every(o => o.partnerIncome === o.totalInterest), 'partner income = total interest (= total cost of credit)');
  ok(q.options.every(o => Math.abs(o.totalRepayable - o.monthlyPayment * o.months) < 0.005 &&
                          Math.abs(o.totalInterest - (o.totalRepayable - 3000)) < 0.005), 'total repayable = P × n, total interest = P × n − A');
  ok(q.options.every(o => o.monthlyPayment === indepPay(3000, o.apr, o.months)), 'instalments match an independent amortisation');
  eq(JSON.stringify(u1.upgrade.defaultSelection && [u1.upgrade.defaultSelection.amount, u1.upgrade.defaultSelection.months]),
     JSON.stringify([3000, 6]), 'default selection = longest tenor that fits at maxAmount (6 months)');

  // quoteUpgrade scales linearly with amount (to the fils per instalment)
  const qh = E.quoteUpgrade(u1.id, 1500);
  ok(qh.options.every((o, i) => Math.abs(2 * o.monthlyPayment - q.options[i].monthlyPayment) <= 0.011),
     'instalment @3,000 = 2 × instalment @1,500 (within a fils)');
  ok(qh.options.every((o, i) => Math.abs(2 * o.partnerIncome - q.options[i].partnerIncome) <= 0.011 * 2 * o.months),
     'partner income @3,000 = 2 × partner income @1,500 (within fils rounding × n)');
  eq(qh.options[0].fits, true, 'at 1,500 the 1-month option fits (1,556.25 ≤ 1,775)');
  eq(E.quoteUpgrade(u1.id, 10000).amount, 3000, 'quote clamps above the offer to 3,000');
  eq(E.quoteUpgrade(u1.id, 100).amount, 500, 'quote clamps below minAmount to 500');
  eq(E.quoteUpgrade(u1.id, 1234).amount, 1200, 'quote snaps to the AED 100 step');
  throwsWith(() => E.quoteUpgrade(u1.id, 'abc'), 'amount', 'quote with a non-number amount throws');

  // ---- u1 without international statements → BASE ----
  const u1b = up(U.u1, { aecb: true, openFinance: true });
  eq(u1b.outcome, 'APPROVE', 'u1 without statements → APPROVE');
  eq(u1b.tier, 'BASE', 'u1 without statements → tier BASE');
  eq(u1b.reasonCodes[0], 'RC_UPGRADE_BASE', 'reason RC_UPGRADE_BASE');
  eq(u1b.upgrade.maxAmount, 1500, 'base maxAmount 1,500');
  eq(u1b.upgrade.maxTenorMonths, 3, 'base maxTenor 3');
  eq(u1b.upgrade.aprFloor, 0.42, 'base APR floor 42%');
  eq(u1b.upgrade.curve.map(c => c.apr).join(','), '0.48,0.45,0.42', 'base curve 48, 45, 42 %');
  eq(u1b.features.homeCountryObligations, null, 'home-country obligations not visible without statements');
  eq(u1b.features.incomeHistoryMonths, 5, 'income history = UAE months only');
  eq(u1b.features.freeCashFlowMonthly, 3900, 'free cash flow 3,900 without the (invisible) home-country loan');
  ok(!u1b.dataPulls.some(d => d.source === 'HOME_STATEMENTS'), 'no statements pull without statements');
  eq(u1b.rules.find(r => r.id === 'POL_HOME_STATEMENTS').result, 'INFO', 'POL_HOME_STATEMENTS informational without statements');
  eq(JSON.stringify(u1b.upgrade.counterfactual), JSON.stringify({ tier: 'ENHANCED', maxAmount: 3000, maxTenorMonths: 6, aprAtMaxTenor: 0.35 }),
     'base counterfactual = the enhanced tier');
  eq(u1b.upgrade.defaultSelection.months, 3, 'base default selection 3 months at 1,500');

  // ---- consent gate ----
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, internationalStatements: true } }),
             ['open finance', 'consent'], 'u1 without Open Finance consent throws');
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { openFinance: true } }),
             'AECB consent', 'u1 without AECB consent throws');
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: D.personasSplit[0], consents: ALL3 }),
             'priorLoan', 'an applicant without a starter loan cannot be upgraded');

  // ---- u2 → DECLINE (late starter) ----
  const u2 = up(U.u2, ALL3);
  eq(u2.outcome, 'DECLINE', 'u2 → DECLINE');
  eq(u2.reasonCodes[0], 'RC_STARTER_LATE', 'u2 reason RC_STARTER_LATE');
  eq(u2.rules.find(r => r.id === 'POL_STARTER_REPAID_ON_TIME').result, 'FAIL', 'POL_STARTER_REPAID_ON_TIME fails at DPD 14');
  ok(u2.tier === null && u2.upgrade === null && u2.pricing === null && u2.token === null && u2.limit.approved === 0,
     'u2: no tier, no offer, no pricing, no token, approved 0');
  throwsWith(() => E.quoteUpgrade(u2.id, 1000), 'no upgrade offer', 'quoteUpgrade on a declined upgrade throws');
  const splitRec = decidePersona('split', P.c1);
  throwsWith(() => E.quoteUpgrade(splitRec.id, 1000), ['starter-loan upgrade'], 'quoteUpgrade on a non-upgrade decision throws');
  throwsWith(() => E.selectUpgradeOption(splitRec.id, { amount: 1000, months: 1 }), ['starter-loan upgrade'], 'selectUpgradeOption on a split decision throws');

  // ---- selectUpgradeOption + execution ----
  throwsWith(() => E.selectUpgradeOption(u1.id, { amount: 3000, months: 1 }), ['does not fit', 'RC_OPTION_UNAFFORDABLE'],
             'selecting the unaffordable 1-month option at 3,000 throws');
  throwsWith(() => E.selectUpgradeOption(u1.id, { amount: 3500, months: 6 }), 'outside the offer', 'amount above the offer throws');
  throwsWith(() => E.selectUpgradeOption(u1.id, { amount: 3000, months: 7 }), 'outside the offer', 'tenor above the offer throws');
  throwsWith(() => E.selectUpgradeOption(u1.id, { amount: 2050, months: 6 }), 'steps of', 'amount off the AED 100 step throws');
  throwsWith(() => E.recordEvent(u1.id, 'OFFER_ACCEPTED'), 'choose an option before accepting', 'OFFER_ACCEPTED without a selection throws');
  throwsWith(() => E.recordEvent(u1.id, 'KFS_ACKNOWLEDGED'), 'out of sequence', 'out-of-order step on an upgrade throws');
  const s4 = E.selectUpgradeOption(u1.id, { amount: 3000, months: 4 });
  ok(s4.selection && s4.selection.amount === 3000 && s4.selection.months === 4 && s4.selection.apr === 0.39 &&
     s4.selection.monthlyPayment === q.options[3].monthlyPayment && s4.selection.partnerIncome === q.options[3].partnerIncome,
     'valid selection stored with the quoted figures (3,000 · 4 months · 39%)');
  ok(s4.token.conditions.some(c => /^Selected option: AED 3,000 over 4 months at 39\.00% APR/.test(c)) &&
     !s4.token.conditions.some(c => /chooses the amount and term/.test(c)), 'token conditions refreshed with the selection');
  ok(s4.audit.some(a => a.action === 'OPTION_SELECTED'), 'selection audit-logged');
  const s6 = E.selectUpgradeOption(u1.id, { amount: 3000, months: 6 });
  eq(s6.selection.months, 6, 'customer can change the selection before accepting');
  eq(s6.token.conditions.filter(c => /^Selected option/.test(c)).length, 1, 'only the current selection appears in the token');
  for (const ev of E.EXEC_EVENTS) E.recordEvent(u1.id, ev);
  eq(E.getDecision(u1.id).status, 'EXECUTED', 'upgrade: 6 steps in order → EXECUTED');
  throwsWith(() => E.selectUpgradeOption(u1.id, { amount: 2000, months: 6 }), 'already accepted', 'selection after OFFER_ACCEPTED throws');
  throwsWith(() => E.selectUpgradeOption(u2.id, { amount: 1000, months: 1 }), 'no upgrade offer', 'selecting on a declined upgrade throws');

  // ---- policy: invariants on publish ----
  const tiersWith = (k, patch) => { const t = clone(E.getPolicy('starter_loan').params.tiers); Object.assign(t[k], patch); return t; };
  const meta = { author: 'R. Haddad', approver: 'S. Nair' };
  throwsWith(() => E.publishPolicy('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.50 }) }, meta),
             'longer tenor must not cost more', 'publish: aprAtMaxTenor > aprAtOneMonth throws');
  throwsWith(() => E.publishPolicy('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.10 }) }, meta),
             ['partner-income guarantee', 'would earn less than'], 'publish: aprAtMaxTenor 10% breaks the partner-income guarantee');
  throwsWith(() => E.publishPolicy('starter_loan', { tiers: { enhanced: { aprAtMaxTenor: 0.10 } } }, meta),
             'partner-income guarantee', 'partial nested draft is merged and still checked');
  throwsWith(() => E.publishPolicy('starter_loan', { tiers: tiersWith('enhanced', { maxAmount: 1000 }) }, meta),
             'at least as generous', 'publish: enhanced less generous than base throws');
  throwsWith(() => E.publishPolicy('starter_loan', { tiers: tiersWith('base', { maxTenorMonths: 2.5 }) }, meta),
             'whole number', 'tenor must be whole months');
  throwsWith(() => E.publishPolicy('starter_loan', { coolingOffDays: 2 }, meta), 'regulatory', 'starter_loan regulatory keys are locked');
  throwsWith(() => E.publishPolicy('starter_loan', { minAmount: 600 }, { author: 'x.y', approver: 'X.Y' }), '4-eyes', 'starter_loan publish is 4-eyes');
  throwsWith(() => E.simulateBook('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.10 }) }), 'partner-income guarantee',
             'simulateBook refuses a draft that breaks the guarantee');
  const inv = E.policyInvariants('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.10 }) });
  ok(!inv.ok && inv.checks.find(c => c.id === 'PARTNER_INCOME').ok === false &&
     inv.checks.find(c => c.id === 'TENOR_COST').ok === true, 'policyInvariants reports the guarantee breach (and only it)');
  ok(inv.curves.enhanced.length === 6 && inv.curves.enhanced[3].interestPer1000 < inv.curves.enhanced[2].interestPer1000,
     'policyInvariants curve shows the 4-month option earning less than the 3-month');
  ok(E.policyInvariants('starter_loan', {}).ok, 'default pack satisfies every invariant');
  eq(E.getPolicy('starter_loan').version, 1, 'refused drafts never changed the live pack');

  // ---- simulateBook: pricing impact ----
  ok(D.sampleBook.starter_loan.length >= 70 && D.sampleBook.starter_loan.length <= 90, 'starter sample book ~80 rows (' + D.sampleBook.starter_loan.length + ')');
  ok(D.sampleBook.starter_loan.some(r => r.starterDpd > 0) && D.sampleBook.starter_loan.some(r => r.statements) &&
     D.sampleBook.starter_loan.some(r => !r.statements), 'starter book mixes late payers and statements yes / no');
  const sim = E.simulateBook('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.33 }) });
  ok(sim.pricingImpact && sim.pricingImpact.avgAprAfter < sim.pricingImpact.avgAprBefore,
     'lower enhanced aprAtMaxTenor 35% → 33%: avg APR ' + (sim.pricingImpact && sim.pricingImpact.avgAprBefore) + ' → ' + (sim.pricingImpact && sim.pricingImpact.avgAprAfter));
  ok(sim.pricingImpact.partnerIncomeBefore > 0 && Number.isFinite(sim.pricingImpact.partnerIncomeAfter), 'pricingImpact carries partner income before / after');
  eq(sim.flips.length, 0, 'a pricing-only change flips no outcomes');
  eq(sim.size, D.sampleBook.starter_loan.length, 'simulation covers the whole starter book');
  let worst = 0, approvals = 0;
  for (const row of D.sampleBook.starter_loan) {
    const x = E.decideRaw('starter_loan', row);
    collect(x.reasonCodes);
    if (x.outcome === 'APPROVE') { approvals++; worst = Math.max(worst, x.dbrPct); }
  }
  ok(approvals > 0 && worst <= 50, 'starter book: ' + approvals + ' approvals, worst DBR at the default option ' + worst + '% (≤ 50%)');
  const v = E.publishPolicy('starter_loan', { tiers: tiersWith('enhanced', { aprAtMaxTenor: 0.33 }) }, meta);
  eq(v.version, 2, 'valid starter_loan publish bumps the version');
  const hist = E.policyHistory('starter_loan');
  ok(hist[1].changes.length === 1 && hist[1].changes[0].key === 'tiers.enhanced.aprAtMaxTenor' &&
     hist[1].changes[0].from === 0.35 && hist[1].changes[0].to === 0.33, 'history records the leaf-level change');
  const u1v2 = up(U.u1, ALL3);
  eq(u1v2.upgrade.aprFloor, 0.33, 'new decisions use the published curve');
  eq(E.quoteUpgrade(u1.id, 3000).options[5].apr, 0.35, 'an existing offer keeps its frozen curve');

  // ---- metrics + reason codes + determinism ----
  const m = E.metrics();
  ok(m.byProduct.starter_loan && m.byProduct.starter_loan.decisions > 200, 'metrics byProduct.starter_loan seeded (' + m.byProduct.starter_loan.decisions + ')');
  eq(m.totals.decisions, Object.keys(m.byProduct).reduce((s, k) => s + m.byProduct[k].decisions, 0), 'totals = sum of byProduct incl. starter_loan');
  ok(m.declineReasons.some(r => r.code === 'RC_STARTER_LATE'), 'decline reasons include RC_STARTER_LATE');
  ok(E.referQueue().every(r => ['split', 'personal_loan', 'starter_loan', 'salary_advance'].includes(r.productId)), 'refer queue product ids valid');
  for (const c of ['RC_UPGRADE_ENHANCED', 'RC_UPGRADE_BASE', 'RC_STARTER_LATE', 'RC_OPTION_UNAFFORDABLE']) {
    ok(D.reasonCodes[c] && D.reasonCodes[c].en && ARABIC.test(D.reasonCodes[c].ar), 'new code ' + c + ' has English + Arabic');
  }
  collect(['RC_OPTION_UNAFFORDABLE']);
  const missing = [...emittedCodes].filter(c => !D.reasonCodes[c]);
  ok(missing.length === 0, 'every emitted reason code exists (missing: ' + missing.join(', ') + ')');
  function snap() {
    E.init(D);
    const a = up(U.u1, ALL3), b = up(U.u1, { aecb: true, openFinance: true }), c = up(U.u2, ALL3);
    return JSON.stringify({ a, b, c, q: E.quoteUpgrade(a.id, 2200), sim: E.simulateBook('starter_loan', { tiers: { enhanced: { aprAtMaxTenor: 0.33 } } }),
                            m: E.metrics().byProduct.starter_loan, book: D.sampleBook.starter_loan.map(r => E.decideRaw('starter_loan', r)) });
  }
  ok(snap() === snap(), 'two fresh init() runs produce identical upgrade records, quotes, simulation and metrics');
});

// ---------------------------------------------------------------------------
group('12. Repayment collection (v2.3): Al Tareq ≤ AED 1,000, direct debit above, no salary transfer', () => {
  E.init(D);
  const U = {};
  for (const p of D.personasUpgrade) U[p.id] = p;
  // ---- routing constant + threshold (inclusive) ----
  eq(E.REPAYMENT_ROUTING && E.REPAYMENT_ROUTING.altareqMaxAmount, 1000, 'REPAYMENT_ROUTING = { altareqMaxAmount: 1000 }');
  for (const [amt, m] of [[999, 'ALTAREQ'], [1000, 'ALTAREQ'], [1000.01, 'DIRECT_DEBIT'], [3000, 'DIRECT_DEBIT']]) {
    eq(E.repaymentFor(amt).method, m, 'repaymentFor(' + amt + ') → ' + m);
  }
  const at = E.repaymentFor(1000), dd = E.repaymentFor(1000.01);
  ok(at.label === 'Al Tareq recurring payment' && dd.label === 'Direct debit mandate', 'labels: Al Tareq recurring payment / Direct debit mandate');
  ok(at.threshold === 1000 && dd.threshold === 1000 && at.basis === 'approved amount' && dd.basis === 'approved amount', 'threshold 1000 and basis "approved amount" on both');
  ok(/banking app via Al Tareq/.test(at.setup) && /revocable in the Al Tareq consent dashboard/.test(at.setup), 'Al Tareq setup text (banking app, revocable in the consent dashboard)');
  ok(/own bank account/.test(dd.setup) && /active before the first collection/.test(dd.setup), 'direct-debit setup text (own account, active before the first collection)');
  ok(ARABIC.test(at.labelAr) && ARABIC.test(dd.labelAr), 'both methods carry an Arabic label');
  throwsWith(() => E.repaymentFor(0), 'positive', 'repaymentFor(0) throws');
  throwsWith(() => E.repaymentFor('abc'), 'positive', 'repaymentFor(non-number) throws');

  // ---- every approved persona carries a repayment consistent with its approved amount; refers/declines null ----
  const runs = [];
  const add = (label, rec) => { collect(rec.reasonCodes); runs.push([label, rec]); return rec; };
  for (const p of D.personasLoan) add(p.id + ' personal loan', decidePersona('personal_loan', p));
  add('r2 + Credit Passport', decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } }));
  for (const p of D.personasSplit) add(p.id + ' split', decidePersona('split', p));
  add('r1 salary advance', decidePersona('salary_advance', P.r1, { amount: 20000, tenorMonths: 1 }));
  add('u1 upgrade (with statements)', E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true, internationalStatements: true } }));
  add('u1 upgrade (no statements)', E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true } }));
  add('u2 upgrade', E.decide({ productId: 'starter_loan', applicant: U.u2, consents: { aecb: true, openFinance: true, internationalStatements: true } }));
  let approvedRuns = 0;
  for (const [label, rec] of runs) {
    if (rec.outcome === 'APPROVE') {
      approvedRuns++;
      const want = rec.limit.approved <= 1000 ? 'ALTAREQ' : 'DIRECT_DEBIT';
      ok(rec.repayment && rec.repayment.method === want && rec.repayment.amount === rec.limit.approved,
         label + ': repayment ' + (rec.repayment && rec.repayment.method) + ' for approved ' + rec.limit.approved);
      ok(rec.token.conditions.includes(want === 'ALTAREQ' ? AT_COND : DD_COND) &&
         !rec.token.conditions.includes(want === 'ALTAREQ' ? DD_COND : AT_COND), label + ': token carries the matching method condition only');
    } else {
      eq(rec.repayment, null, label + ' (' + rec.outcome + '): repayment null');
    }
    ok(!(rec.token ? rec.token.conditions : []).some(mentionsSalaryTransfer), label + ': no token condition mentions a salary transfer');
  }
  ok(approvedRuns >= 9, 'repayment checked on ' + approvedRuns + ' approvals');
  const byLabel = (l) => runs.find(r => r[0] === l)[1];
  eq(byLabel('c1 split').repayment.method, 'DIRECT_DEBIT', 'c1 school fees AED 12,000 → direct debit');
  eq(byLabel('c4 split').repayment.method, 'DIRECT_DEBIT', 'c4 flights AED 4,800 → direct debit');
  eq(byLabel('r1 salary advance').repayment.method, 'DIRECT_DEBIT', 'r1 salary advance AED 13,500 → direct debit');
  ok(byLabel('r1 salary advance').token.conditions.includes('Repaid in one instalment on the next salary date — no salary transfer required'),
     'salary advance token: repaid in one instalment on the next salary date — no salary transfer required');
  ok(byLabel('r2 + Credit Passport').token.conditions.includes('Remittance-linked repayment schedule'), 'cross-border approval keeps the remittance-linked schedule');

  // ---- the starter loan itself (AED 1,000) and the upgrade, per selected option ----
  eq(E.repaymentFor(U.u1.priorLoan.amount).method, 'ALTAREQ', 'starter loan AED 1,000 → Al Tareq recurring payment');
  const u1 = byLabel('u1 upgrade (with statements)');
  eq(u1.limit.approved, 3000, 'u1 upgrade offer ceiling AED 3,000');
  eq(u1.repayment.method, 'DIRECT_DEBIT', 'u1 upgrade AED 3,000 → direct debit at decision time');
  E.selectUpgradeOption(u1.id, { amount: 1000, months: 6 });
  let u1r = E.getDecision(u1.id);
  ok(u1r.repayment.method === 'ALTAREQ' && u1r.repayment.amount === 1000, 'selecting AED 1,000 → Al Tareq');
  ok(u1r.token.conditions.includes(AT_COND) && !u1r.token.conditions.includes(DD_COND) && u1r.token.conditions[1] === AT_COND,
     'token repayment line switches to Al Tareq (second line, after the KFS)');
  eq(E.execSteps('starter_loan', u1.id).find(x => x.type === 'REPAYMENT_SET_UP').label, 'Al Tareq payment consent authorised',
     'execSteps(starter_loan, id) labels REPAYMENT_SET_UP for Al Tareq');
  E.selectUpgradeOption(u1.id, { amount: 1100, months: 6 });
  u1r = E.getDecision(u1.id);
  ok(u1r.repayment.method === 'DIRECT_DEBIT' && u1r.token.conditions.includes(DD_COND) && !u1r.token.conditions.includes(AT_COND),
     'switching to AED 1,100 → direct debit, token follows');
  eq(u1r.token.conditions.filter(c => c === AT_COND || c === DD_COND).length, 1, 'exactly one repayment condition after switching');
  const rs = E.execSteps('starter_loan', u1.id).find(x => x.type === 'REPAYMENT_SET_UP');
  ok(rs.label === 'Direct debit mandate active' && rs.method === 'DIRECT_DEBIT' && /own bank account/.test(rs.description),
     'execSteps label/description follow the method (Direct debit mandate active)');
  E.selectUpgradeOption(u1.id, { amount: 1000, months: 6 });
  for (const t of ['OFFER_ACCEPTED', 'KFS_ACKNOWLEDGED', 'AGREEMENT_SIGNED']) E.recordEvent(u1.id, t);
  throwsWith(() => E.recordEvent(u1.id, 'DISBURSED'), 'no disbursement until repayment collection is set up', 'upgrade: DISBURSED before REPAYMENT_SET_UP throws');
  E.recordEvent(u1.id, 'REPAYMENT_SET_UP');
  const evRs = E.getDecision(u1.id).events.find(e => e.type === 'REPAYMENT_SET_UP');
  ok(evRs && evRs.method === 'ALTAREQ' && evRs.label === 'Al Tareq payment consent authorised', 'REPAYMENT_SET_UP event records the method (Al Tareq)');
  ok(E.getDecision(u1.id).audit.some(a => a.detail === 'REPAYMENT_SET_UP · Al Tareq payment consent authorised'), 'audit trail names the method');
  E.recordEvent(u1.id, 'COOLING_OFF_CLEARED'); E.recordEvent(u1.id, 'DISBURSED');
  ok(E.getDecision(u1.id).status === 'EXECUTED' && E.getDecision(u1.id).events.length === 6, 'upgrade at AED 1,000: 6 steps → EXECUTED');

  // ---- generic step list, product guard ----
  const gen = E.execSteps('personal_loan').find(x => x.type === 'REPAYMENT_SET_UP');
  ok(gen.label === 'Repayment set up' && gen.method === null && /no salary transfer required/.test(gen.description), 'execSteps without a decision: generic repayment step');
  throwsWith(() => E.execSteps('personal_loan', u1.id), 'not personal_loan', 'execSteps with a decision of another product throws');
  const r1 = byLabel('r1 personal loan');
  eq(E.execSteps('personal_loan', r1.id)[3].label, 'Direct debit mandate active', 'r1 AED 150,000: step 4 is "Direct debit mandate active"');

  // ---- split purchase ≤ AED 1,000 and "split another purchase" ----
  const small = clone(P.c1); small.purchase.amount = 900; small.defaultRequest.amount = 900;
  const sSmall = decidePersona('split', small);
  ok(sSmall.outcome === 'APPROVE' && sSmall.limit.approved === 900 && sSmall.repayment.method === 'ALTAREQ' &&
     sSmall.token.conditions.includes(AT_COND), 'split of AED 900 → Al Tareq recurring payment (token follows)');
  const c1 = byLabel('c1 split');
  const d1 = E.drawdownCheck(c1.id, 800, {});
  ok(d1.allowed && d1.repayment && d1.repayment.method === 'ALTAREQ', 'split another purchase AED 800 → Al Tareq');
  const d2 = E.drawdownCheck(c1.id, 5000, {});
  ok(d2.allowed && d2.repayment.method === 'DIRECT_DEBIT', 'split another purchase AED 5,000 → direct debit');
  const d3 = E.drawdownCheck(c1.id, 900, { arrears: true });
  ok(!d3.allowed && d3.repayment === null, 'blocked split carries no repayment');
  const adv = clone(P.r1);
  const aSmall = decidePersona('salary_advance', adv, { amount: 1000, tenorMonths: 1 });
  ok(aSmall.repayment.method === 'ALTAREQ' && aSmall.token.conditions.includes(AT_COND), 'salary advance of AED 1,000 → Al Tareq');

  // ---- platform rule: shown on every pack, never editable ----
  for (const pid of ['split', 'personal_loan', 'starter_loan', 'salary_advance']) {
    const pr = E.getPolicy(pid).platform;
    ok(pr && pr.repaymentCollection && pr.repaymentCollection.altareqMaxAmount === 1000 && pr.repaymentCollection.editable === false &&
       pr.repaymentCollection.rule === 'Repayment collection: Al Tareq ≤ AED 1,000 · direct debit above · no salary transfer required',
       pid + ' pack carries the locked repayment platform rule');
  }
  throwsWith(() => E.publishPolicy('personal_loan', { altareqMaxAmount: 5000 }, { author: 'a.hassan', approver: 'm.rashid' }),
             'platform rule', 'publish cannot change the Al Tareq threshold');
  throwsWith(() => E.simulateBook('split', { repaymentCollection: {} }), 'platform rule', 'simulate refuses the platform rule too');

  // ---- no decision anywhere mentions a salary transfer ----
  const all = E.listDecisions();
  ok(all.every(r => !(r.token ? r.token.conditions : []).some(mentionsSalaryTransfer)), 'no token condition on any of ' + all.length + ' decisions mentions a salary transfer');
  ok(E.execSteps('split').every(x => !mentionsSalaryTransfer(x.label + ' ' + x.description)), 'no execution step mentions a salary transfer');
});

// ---------------------------------------------------------------------------
group('13. Home-country statements (v2.4): parser, underwriter request, re-decision that supersedes', () => {
  E.init(D);
  const U = {};
  for (const p of D.personasUpgrade) U[p.id] = p;
  const HDFC = 'HDFC_Statement_Jan–Jun_2026.pdf', SBI = 'SBI_Statement_Jan–Jun_2026.pdf', HBL = 'HBL_Statement_Jan–Jun_2026.pdf';
  const META = { type: 'HOME_STATEMENTS', months: 6, country: 'IN', analyst: 'A. Farsi (Credit Analyst)', note: 'Thin file — 6 months of Indian statements' };

  // ---- personas + vocabulary ----
  eq(U.u1.name, 'Anita Thomas', 'u1 is Anita Thomas');
  eq(U.u1.nameAr, 'أنيتا توماس', 'u1 Arabic name أنيتا توماس');
  ok(/Kerala/.test(U.u1.tagline) && U.u1.monthsInUae === 5 && U.u1.connected.avgMonthlyIncome === 9500 && U.u1.connected.avgMonthlySpend === 5600,
     'Anita: nurse from Kerala, 5 months in the UAE, income 9,500, spend 5,600');
  ok(!('international' in U.u1) && !('international' in U.u2), 'v2.1 international blocks replaced by homeStatements');
  for (const f of ['data.js', 'engine.js']) {
    ok(!/Ana Reyes|آنا رييس/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), f + ' no longer mentions Ana Reyes');
  }
  eq(E.STATEMENT_CORRIDORS.join(','), 'IN,PK,EG', 'STATEMENT_CORRIDORS = IN, PK, EG');
  ok(E.STATEMENT_FX.INR > 0 && E.STATEMENT_FX.PKR > 0 && E.STATEMENT_FX.EGP > 0, 'fixed demo FX table for INR, PKR, EGP → AED');
  for (const c of ['RC_STATEMENTS_REQUESTED', 'RC_STATEMENTS_INCOMPLETE', 'RC_STATEMENTS_INTEGRITY', 'RC_STATEMENTS_USED']) {
    ok(D.reasonCodes[c] && D.reasonCodes[c].en && ARABIC.test(D.reasonCodes[c].ar), 'new code ' + c + ' has English + Arabic');
  }
  eq(D.reasonCodes.RC_STATEMENTS_REQUESTED.en, 'Send us 6 months of your home-country bank statements so we can review a higher amount.', 'RC_STATEMENTS_REQUESTED customer message');

  // ---- parser (pure) ----
  const before = E.listDecisions().length;
  const pr = E.parseStatements({ country: 'IN', bank: 'HDFC Bank', file: HDFC, applicantId: 'r2', productId: 'personal_loan' });
  eq(E.listDecisions().length, before, 'parseStatements stores nothing');
  ok(JSON.stringify(pr) === JSON.stringify(E.parseStatements({ country: 'India', bank: 'HDFC Bank', file: HDFC, applicantId: 'r2', productId: 'personal_loan' })),
     'parser is deterministic (country by code or name)');
  ok(pr.kind === 'HOME_STATEMENTS' && pr.country === 'IN' && pr.bank === 'HDFC Bank' && pr.file === HDFC && pr.currency === 'INR', 'r2 parse: India · HDFC Bank · file · INR');
  ok(pr.integrity === 'PASS' && pr.nameMatch === true && pr.monthsPresent === 6 && pr.complete && pr.period.from === '2026-01-01' && pr.period.to === '2026-06',
     'r2 parse: integrity PASS, name matches the Emirates ID, 6 of 6 months (Jan–Jun 2026)');
  ok(pr.accountOpenSince === '2016-03' && pr.returnedItems === 0 && pr.overdraftDays === 0, 'r2 parse: account open since 2016, 0 returned items, 0 overdraft days');
  ok(pr.obligationsMonthlyAed === 450 && pr.emis.length === 1 && /Education loan/.test(pr.emis[0].label), 'r2 parse: education-loan EMI ≈ AED 450/mo');
  eq(pr.avgBalanceAed, 9800, 'r2 parse: average balance ≈ AED 9,800');
  ok(pr.remittanceMonths === 6 && pr.uaeSalaryMonths === 6 && pr.remittanceConsistencyPct >= 90 && pr.remittanceConsistencyPct <= 94,
     'r2 parse: remittances 6 of 6 months, ≈ 92% consistent with the UAE salary (' + pr.remittanceConsistencyPct + '%)');
  eq(pr.otherIncomeMonthlyAed, 0, 'r2 parse: no other home-country income');
  ok(pr.usable === true && pr.reasonCode === null, 'r2 statements usable');
  const keys = pr.findings.map(f => f.key).join(',');
  eq(keys, 'integrity,nameMatch,months,conduct,tenure,emis,buffer,remittances', 'findings: integrity, name, 6/6 months, conduct, tenure, EMIs, buffer, remittances');
  ok(pr.findings.every(f => f.label && f.value && f.effect && f.status), 'every finding has label, value, effect and status');
  ok(/DBR and free cash flow/.test(pr.findings.find(f => f.key === 'emis').effect), 'EMI finding: counted in DBR and free cash flow');
  ok(/haircut/.test(pr.findings.find(f => f.key === 'remittances').effect), 'personal-loan findings name their effect on the decision (haircut)');
  throwsWith(() => E.parseStatements({ country: 'Philippines', file: HDFC, applicantId: 'r2' }), 'statements from Philippines are not supported yet', 'unsupported country throws');
  throwsWith(() => E.parseStatements({ country: 'PH', file: HDFC, applicantId: 'r2' }), 'statements from Philippines are not supported yet', 'unsupported country code throws with the country name');
  throwsWith(() => E.parseStatements({ country: 'IN', applicantId: 'r1' }), 'no home-country statements', 'applicant without statements throws');
  const fake = E.parseStatements({ country: 'IN', bank: 'HDFC Bank', file: 'HDFC_Statement_Jan–Jun_2026_edited.pdf', applicantId: 'r2' });
  ok(fake.integrity === 'FAIL' && fake.usable === false && fake.reasonCode === 'RC_STATEMENTS_INTEGRITY' && fake.nameMatch === false,
     'unknown / tampered file → integrity FAIL (RC_STATEMENTS_INTEGRITY)');
  ok(fake.findings[0].status === 'FAIL' && /fraud review/.test(fake.findings[0].effect) && fake.findings.slice(1).every(f => f.status === 'SKIP'), 'tampered file: nothing else is read');
  const wrongCountry = E.parseStatements({ country: 'PK', file: HDFC, applicantId: 'r2' });
  eq(wrongCountry.integrity, 'FAIL', 'genuine file under the wrong country → integrity FAIL');
  const part = E.parseStatements({ country: 'IN', file: HDFC, applicantId: 'r2', months: 5 });
  ok(part.integrity === 'PASS' && part.monthsPresent === 5 && !part.complete && part.reasonCode === 'RC_STATEMENTS_INCOMPLETE' && part.missingMonths[0] === '2026-01',
     '5 of 6 months → RC_STATEMENTS_INCOMPLETE (Jan 2026 missing)');
  throwsWith(() => E.parseStatements({ country: 'IN', file: HDFC, applicantId: 'r2', months: 7 }), 'months covered', 'months covered beyond 6 throws');

  // ---- r2: refer → request → upload → parse → re-decide ----
  const r2 = decidePersona('personal_loan', P.r2);
  eq(r2.outcome, 'REFER', 'r2 (no data) → REFER thin file');
  throwsWith(() => E.redecide(r2.id), 'no home-country statements have been received', 're-deciding without documents throws');
  throwsWith(() => E.submitStatements(r2.id, { country: 'IN', file: HDFC }), 'request them first', 'uploading before a request throws');
  throwsWith(() => E.requestDocuments(r2.id, Object.assign({}, META, { country: 'Philippines' })), 'not supported yet', 'requesting an unsupported corridor throws');
  throwsWith(() => E.requestDocuments(r2.id, Object.assign({}, META, { analyst: ' ' })), 'analyst', 'request needs the analyst name');
  throwsWith(() => E.requestDocuments(r2.id, Object.assign({}, META, { months: 3 })), 'last 6 months', 'request is always 6 months');
  const rq = E.requestDocuments(r2.id, META);
  ok(rq.status === 'AWAITING_DOCUMENTS' && rq.documentRequest.country === 'IN' && rq.documentRequest.months === 6 &&
     rq.documentRequest.reasonCode === 'RC_STATEMENTS_REQUESTED' && ARABIC.test(rq.documentRequest.customerMessage.ar),
     'request: AWAITING_DOCUMENTS, India, 6 months, RC_STATEMENTS_REQUESTED (EN + AR)');
  ok(rq.audit.some(a => a.action === 'DOCUMENTS_REQUESTED' && a.actor === META.analyst && /SLA paused/.test(a.detail)), 'request audit-logged with the analyst; SLA paused');
  const qr = E.referQueue().find(x => x.id === r2.id);
  ok(qr && qr.status === 'AWAITING_DOCUMENTS' && qr.slaPaused === true && qr.slaHoursLeft === 8, 'queue: "awaiting documents", SLA paused at 8h');
  throwsWith(() => E.requestDocuments(r2.id, META), 'already requested', 'requesting twice throws (wrong state)');
  throwsWith(() => E.redecide(r2.id), 'still waiting for the customer', 're-deciding before the upload throws');
  throwsWith(() => E.submitStatements(r2.id, { country: 'Egypt-ish', file: HDFC }), 'not supported yet', 'upload from an unsupported country throws');
  const inc = E.submitStatements(r2.id, { country: 'IN', bank: 'HDFC Bank', file: HDFC, months: 5 });
  ok(inc.status === 'AWAITING_DOCUMENTS' && inc.documents.parsed.reasonCode === 'RC_STATEMENTS_INCOMPLETE' &&
     inc.audit.some(a => a.action === 'DOCUMENTS_INCOMPLETE'), 'incomplete upload: stays AWAITING_DOCUMENTS, customer asked again');
  const sub = E.submitStatements(r2.id, { country: 'IN', bank: 'HDFC Bank', file: HDFC });
  ok(sub.status === 'DOCUMENTS_RECEIVED' && sub.documents.parsed.usable && sub.documents.file === HDFC, 'complete upload: DOCUMENTS_RECEIVED with the parsed statements');
  ok(E.referQueue().find(x => x.id === r2.id).slaPaused === false, 'queue: SLA resumes once documents arrive');
  throwsWith(() => E.submitStatements(r2.id, { country: 'IN', file: HDFC }), 'already received', 'uploading again throws');
  const r2s = E.redecide(r2.id);
  collect(r2s.reasonCodes);
  ok(r2s.id !== r2.id && r2s.supersedes === r2.id && E.getDecision(r2.id).supersededBy === r2s.id && E.getDecision(r2.id).status === 'SUPERSEDED',
     're-decision is a NEW record: supersedes ' + r2.id + ', original marked SUPERSEDED');
  ok(r2s.redecision && r2s.redecision.trigger === 'UNDERWRITER_REQUEST' && r2s.redecision.original.outcome === 'REFER' &&
     r2s.redecision.documentRequest.analyst === META.analyst, 'redecision links trigger, original outcome and the request');
  ok(r2s.audit.some(a => a.action === 'REDECISION' && a.detail.includes(r2.id)) && E.getDecision(r2.id).audit.some(a => a.action === 'SUPERSEDED'),
     'both records are audit-linked');
  eq(r2s.outcome, 'APPROVE', 'r2 with statements → APPROVE');
  eq(r2s.score.grade, 'B', 'r2 statements grade B (capped)');
  eq(r2s.score.basis, 'HOME_STATEMENTS', 'scorecard basis HOME_STATEMENTS (proxy 640)');
  eq(r2s.limit.approved, 45000, 'r2 statements approve AED 45,000');
  eq(r2s.limit.bindingConstraint, 'STATEMENTS_HAIRCUT', 'binding: the smaller statements haircut (25%)');
  eq(r2s.features.statementsHaircutPct, 25, 'haircut 25% (50% − conduct 10 − buffer 5 − corroboration 10)');
  ok(r2s.reasonCodes.includes('RC_STATEMENTS_USED'), 'reason RC_STATEMENTS_USED');
  ok(r2s.features.existingObligations === 450 && r2s.features.dbrPct <= 50, 'the AED 450 EMI is counted in DBR (' + r2s.features.dbrPct + '%)');
  ok(r2s.dataPulls.some(d => d.source === 'HOME_STATEMENTS' && d.status === 'PARSED'), 'HOME_STATEMENTS data pull recorded');
  ok(r2s.homeStatements && r2s.homeStatements.file === HDFC && r2s.consents.homeStatements.source === 'UNDERWRITER_REQUEST', 'record carries the parsed statements + consent source');
  ok(r2s.rules.find(r => r.id === 'POL_HOME_STATEMENTS').result === 'PASS' && r2s.rules.find(r => r.id === 'POL_THIN_FILE').result === 'PASS',
     'POL_HOME_STATEMENTS PASS; thin file substituted');
  ok(r2s.repayment && r2s.repayment.method === 'DIRECT_DEBIT', 'AED 45,000 approval repaid by direct debit (v2.3)');
  const r2cp = decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } });
  ok(r2s.limit.approved > r2cp.limit.approved && r2cp.limit.approved === 30000, 'statements approve more than the Credit Passport path (45,000 > 30,000)');
  const cmp = r2s.evidenceComparison;
  eq(cmp.map(c => c.path).join(','), 'NO_DATA,CREDIT_PASSPORT,HOME_STATEMENTS', 'comparison: no data / Credit Passport / statements');
  ok(cmp[0].outcome === 'REFER' && cmp[1].outcome === 'APPROVE' && cmp[1].approved === 30000 && cmp[1].grade === 'B' &&
     cmp[2].approved === 45000 && cmp[2].grade === 'B', 'comparison figures: REFER · AED 30,000 B · AED 45,000 B');
  ok(!E.referQueue().some(x => x.id === r2.id) && !E.referQueue().some(x => x.id === r2s.id), 'queue drops the original; the approval is not a refer');
  throwsWith(() => E.redecide(r2.id), 'already superseded', 're-deciding a superseded decision throws');
  throwsWith(() => E.override(r2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'a', approver: 'b' }), 'superseded', 'overriding a superseded decision throws');

  // ---- tampered upload → fraud review (REFER), never a decline ----
  const r2b = decidePersona('personal_loan', P.r2);
  E.requestDocuments(r2b.id, META);
  E.submitStatements(r2b.id, { country: 'IN', bank: 'HDFC Bank', file: 'HDFC_Statement_Jan–Jun_2026_edited.pdf' });
  eq(E.getDecision(r2b.id).status, 'DOCUMENTS_RECEIVED', 'tampered upload is received (fraud review happens on the re-decision)');
  const r2f = E.redecide(r2b.id);
  collect(r2f.reasonCodes);
  ok(r2f.outcome === 'REFER' && r2f.reasonCodes.includes('RC_STATEMENTS_INTEGRITY') && r2f.rules.find(r => r.id === 'POL_HOME_STATEMENTS').result === 'REFER',
     'integrity FAIL → REFER to fraud review (RC_STATEMENTS_INTEGRITY), not DECLINE');
  ok(r2f.dataPulls.some(d => d.source === 'HOME_STATEMENTS' && d.status === 'INTEGRITY_FAIL'), 'pull recorded as INTEGRITY_FAIL');
  ok(E.referQueue().some(x => x.id === r2f.id) && !E.referQueue().some(x => x.id === r2b.id), 'the fraud-review re-decision replaces the original in the queue');

  // ---- wrong states ----
  const r1 = decidePersona('personal_loan', P.r1);
  throwsWith(() => E.requestDocuments(r1.id, META), 'only on an open REFER', 'request on an approval at the requested amount throws');
  const r4 = decidePersona('personal_loan', P.r4);
  throwsWith(() => E.requestDocuments(r4.id, META), 'only on an open REFER', 'request on a DECLINE throws');
  const c2 = decidePersona('split', P.c2);
  throwsWith(() => E.requestDocuments(c2.id, META), 'personal-loan and upgrade', 'request on a split refer throws (statements feed loans and upgrades)');
  const below = E.requestDocuments(r2cp.id, META);
  eq(below.status, 'AWAITING_DOCUMENTS', 'request allowed on an approval below the requested amount (Credit Passport 30,000 of 60,000)');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: CONSENT_ALL, statements: pr }), 'personal-loan and upgrade', 'statements on a split decision throw');

  // ---- Anita (u1): BASE → upload → ENHANCED (customer-initiated, supersedes) ----
  const base = E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true } });
  ok(base.tier === 'BASE' && base.upgrade.maxAmount === 1500 && base.upgrade.maxTenorMonths === 3 && base.upgrade.aprFloor === 0.42,
     'Anita without statements → BASE (1,500 · 3 months · 42%)');
  const sbi = E.parseStatements({ country: 'IN', bank: 'State Bank of India', file: SBI, applicantId: 'u1', productId: 'starter_loan' });
  ok(sbi.integrity === 'PASS' && sbi.nameMatch && sbi.monthsPresent === 6 && sbi.accountOpenSince === '2014-08' && sbi.returnedItems === 0,
     'SBI parse: PASS, name match, 6 of 6, account since 2014, 0 returned items');
  ok(sbi.obligationsMonthlyAed === 350 && sbi.avgBalanceAed === 4200 && sbi.remittanceConsistencyPct >= 93 && sbi.remittanceConsistencyPct <= 97 &&
     sbi.remittanceMonths === 5 && sbi.uaeSalaryMonths === 5, 'SBI parse: home-loan EMI AED 350, balance AED 4,200, remittances 5 of 5 UAE salary months ≈ 95% (' + sbi.remittanceConsistencyPct + '%)');
  ok(/24 months/.test(sbi.findings.find(f => f.key === 'tenure').effect), 'upgrade findings: account history credited as 24 months');
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: U.u2, consents: { aecb: true, openFinance: true }, statements: sbi }),
             'belong to applicant u1', 'statements of another applicant throw');
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, supersedes: base.id }),
             'needs new evidence', 'superseding without statements throws');
  const enh = E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, statements: sbi, supersedes: base.id });
  collect(enh.reasonCodes);
  ok(enh.outcome === 'APPROVE' && enh.tier === 'ENHANCED' && enh.upgrade.maxAmount === 3000 && enh.upgrade.maxTenorMonths === 6 && enh.upgrade.aprFloor === 0.35,
     'Anita with statements → ENHANCED (3,000 · 6 months · 35%)');
  ok(enh.features.freeCashFlowMonthly === 3550 && enh.features.maxInstalment === 1775 && enh.features.incomeHistoryMonths === 29 &&
     enh.features.homeCountryObligations === 350, 'v2.1 numbers kept: FCF 3,550 · budget 1,775 · history 29 · EMI 350');
  eq(E.quoteUpgrade(enh.id, 3000).options[5].monthlyPayment, 552.27, 'v2.1 number kept: 6 months @ 3,000 = AED 552.27/mo');
  ok(enh.supersedes === base.id && E.getDecision(base.id).supersededBy === enh.id && enh.redecision.trigger === 'CUSTOMER_UPLOAD',
     'ENHANCED offer supersedes the BASE offer (customer upload)');
  ok(enh.evidenceComparison.map(c => c.path + ':' + c.tier).join(',') === 'NO_DATA:BASE,HOME_STATEMENTS:ENHANCED', 'upgrade comparison: BASE → ENHANCED');
  throwsWith(() => E.selectUpgradeOption(base.id, { amount: 1500, months: 3 }), 'superseded', 'the superseded BASE offer can no longer be chosen');
  const u1x = E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true } });
  E.selectUpgradeOption(u1x.id, { amount: 1500, months: 3 }); E.recordEvent(u1x.id, 'OFFER_ACCEPTED');
  throwsWith(() => E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, statements: sbi, supersedes: u1x.id }),
             'already accepted', 'an accepted offer cannot be superseded');
  const tampered = E.parseStatements({ country: 'IN', file: 'SBI_Statement_Jan–Jun_2026_edited.pdf', applicantId: 'u1', productId: 'starter_loan' });
  const fr = E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, statements: tampered });
  collect(fr.reasonCodes);
  ok(fr.outcome === 'REFER' && fr.reasonCodes[0] === 'RC_STATEMENTS_INTEGRITY', 'tampered upgrade statements → REFER (fraud review), not DECLINE');
  const part1 = E.parseStatements({ country: 'IN', file: SBI, applicantId: 'u1', productId: 'starter_loan', months: 4 });
  const pb = E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, statements: part1 });
  collect(pb.reasonCodes);
  ok(pb.outcome === 'APPROVE' && pb.tier === 'BASE' && pb.reasonCodes.includes('RC_STATEMENTS_INCOMPLETE'), 'incomplete upgrade statements → not used (BASE + RC_STATEMENTS_INCOMPLETE)');

  // ---- Bilal (u2): HBL statements don't override a repayment breach ----
  const hbl = E.parseStatements({ country: 'PK', bank: 'HBL', file: HBL, applicantId: 'u2', productId: 'starter_loan' });
  ok(hbl.integrity === 'PASS' && hbl.nameMatch && hbl.monthsPresent === 6 && hbl.country === 'PK' && hbl.currency === 'PKR', 'HBL (Pakistan) parse: PASS, 6 of 6, PKR');
  const u2 = E.decide({ productId: 'starter_loan', applicant: U.u2, consents: { aecb: true, openFinance: true }, statements: hbl });
  collect(u2.reasonCodes);
  ok(u2.outcome === 'DECLINE' && u2.reasonCodes[0] === 'RC_STARTER_LATE' && u2.rules.find(r => r.id === 'POL_HOME_STATEMENTS').result === 'PASS',
     'Bilal with verified statements → still DECLINE RC_STARTER_LATE');

  // ---- Youssef (seeded, Egypt, awaiting documents) ----
  const y = E.referQueue().find(x => x.name === 'Youssef Hassan');
  ok(y && y.seeded && y.status === 'AWAITING_DOCUMENTS' && y.slaPaused === true && y.documentRequest.country === 'EG' && /CIB/.test(y.documentRequest.bank),
     'seeded Youssef Hassan: Egypt, CIB statements requested, AWAITING_DOCUMENTS, SLA paused');

  // ---- reason codes + determinism ----
  for (const rec of E.listDecisions()) collect(rec.reasonCodes);
  const missing = [...emittedCodes].filter(c => !D.reasonCodes[c]);
  ok(missing.length === 0, 'every emitted reason code exists (missing: ' + missing.join(', ') + ')');
  for (const c of ['RC_STATEMENTS_INCOMPLETE', 'RC_STATEMENTS_INTEGRITY', 'RC_STATEMENTS_USED']) ok(emittedCodes.has(c), c + ' is emitted');
  function snap() {
    E.init(D);
    const a = decidePersona('personal_loan', P.r2);
    E.requestDocuments(a.id, META);
    E.submitStatements(a.id, { country: 'IN', bank: 'HDFC Bank', file: HDFC });
    const b = E.redecide(a.id);
    return JSON.stringify({ a: E.getDecision(a.id), b, q: E.referQueue() });
  }
  ok(snap() === snap(), 'two fresh init() runs produce identical request → upload → re-decision records');
});

// ---------------------------------------------------------------------------
// v2.5 helpers — an independent implementation of the memo bands, and the raw
// values a memo must never contain (per record: its persona + what Mizan derived).
// v2.18 — the memo opens with the output table (sharingAgreement, outputs, outputsNote, findings, scoreComponents, monitoring
// are new; the "sharing" lists became the Noor-only panel, outside the memo). A memo with data completeness adds
// dataCompleteness before consents. v2.19 — the findings key left the memo: the reason-code library replaces it
// (decision.reasonCodes carries library codes only).
const MEMO_KEYS = ['memoId', 'noorRef', 'lenderId', 'lenderName', 'sharingAgreement', 'createdAt', 'product', 'policyVersion', 'engineVersion',
                   'borrower', 'decision', 'terms', 'outputs', 'outputsNote', 'noorScore', 'scoreComponents', 'affordability', 'monitoring',
                   'bureau', 'verification', 'consents'];
// The v2.5 columns keep their order; v2.18 appends after created_at (Partner Bank v1, a consumer memo). v2.19 — the findings
// column is gone: reason_codes carries the library codes.
const SFTP_V25 = ['memo_id', 'noor_ref', 'product', 'outcome', 'amount', 'tenor', 'apr_or_fee', 'monthly_payment',
                  'repayment_method', 'noorscore', 'noorscore_band', 'income_band', 'dbr_band', 'aecb_band', 'reason_codes', 'created_at'];
const SFTP_HEADER = SFTP_V25.concat(['sharing_agreement', 'additional_income_band', 'headroom_band', 'free_cash_flow_band', 'instalment_share_band',
                     'component_fraud_integrity', 'component_newcomer', 'component_stacking_skip', 'component_credit_behaviour',
                     'monitoring_status', 'best_debit_date', 'next_refresh', 'data_completeness_pct', 'data_sources']);
const grp3 = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const T = {
  income: (x) => x === null || x === undefined ? null : (x < 5000 ? 'Below AED 5,000 / month'
    : (() => { const st = x < 20000 ? 5000 : 10000, lo = Math.floor(x / st) * st; return 'AED ' + grp3(lo) + '–' + grp3(lo + st) + ' / month'; })()),
  // v2.18 — DBR in 5-point steps (was < 20 / 20–35 / 35–50 / > 50)
  dbr: (p) => p === null || p === undefined ? null : (p >= 50 ? '50% or more' : (Math.floor(p / 5) * 5) + '–' + (Math.floor(p / 5) * 5 + 5) + '%'),
  headroom: (x) => x === null || x === undefined ? null : (x <= 0 ? 'None — at the cap' : x < 500 ? 'Below AED 500 / month'
    : 'AED ' + grp3(Math.floor(x / 500) * 500) + '–' + grp3(Math.floor(x / 500) * 500 + 500) + ' / month'),
  fcf: (x) => x === null || x === undefined ? null : (x < 1000 ? 'Below AED 1,000 / month' : x < 3000 ? 'AED 1,000–2,999 / month' : x < 5000 ? 'AED 3,000–4,999 / month' : 'AED 5,000+ / month'),
  share: (p) => p === null || p === undefined ? null : (p < 25 ? '< 25%' : p <= 50 ? '25–50%' : '> 50%'),
  aecb: (a) => !a || !a.hit ? 'No file' : (a.score === null || a.score === undefined ? 'File, no score yet' : (Math.floor(a.score / 50) * 50) + '–' + (Math.floor(a.score / 50) * 50 + 49)),
  noor: (v) => v === null || v === undefined ? null : (v >= 740 ? 'Excellent' : v >= 680 ? 'Very good' : v >= 620 ? 'Good' : v >= 560 ? 'Fair' : 'Poor')
};
const BAND_KEYS = { incomeBand: 1, dbrBand: 1, freeCashFlowBand: 1, instalmentToCashFlowBand: 1, aecbScoreBand: 1, additionalIncomeBand: 1, headroomBand: 1 };
const SFTP_BAND_COLS = { income_band: 1, dbr_band: 1, aecb_band: 1, additional_income_band: 1, headroom_band: 1, free_cash_flow_band: 1, instalment_share_band: 1 };
// v2.18 — an independent derivation of the buckets (§1a): regular income = the salary on the salary-based products
// (the car loan's salary alone), else each connected month capped at the median, averaged; additional = verified
// non-salary income + variable income above the base, net of it; headroom = cap × income − obligations − the instalment.
function median3(a) { const b = a.slice().sort((x, y) => x - y), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
function bucketsOf(rec) {
  const f = rec.features || {}, a = rec.applicantSnapshot || {}, cn = a.connected || {};
  const of = rec.consents && rec.consents.openFinance && rec.consents.openFinance.granted;
  const xs = of ? (cn.monthlyIncome || []).filter(v => typeof v === 'number') : [];
  const salaryBased = ['personal_loan', 'salary_advance', 'car_loan', 'school_fees'].includes(rec.productId);   /* v2.21 — school fees reads the salary */
  const salary = a.employment && typeof a.employment.salaryMonthly === 'number' ? a.employment.salaryMonthly : null;
  const base = salaryBased && salary !== null ? salary : (xs.length ? median3(xs) : null);
  const regular = rec.productId === 'car_loan' ? (typeof f.salaryMonthly === 'number' ? f.salaryMonthly : f.verifiedIncome)
    : (salaryBased ? f.verifiedIncome : (xs.length ? xs.reduce((t, m) => t + Math.min(m, base), 0) / xs.length : f.verifiedIncome));
  const second = rec.productId === 'car_loan' && f.openFinance && f.regularIncomeVerifiedMonthly > 0 ? f.regularIncomeVerifiedMonthly : 0;
  const variable = Math.max(0, (xs.length ? xs.reduce((t, m) => t + Math.max(0, m - base), 0) / xs.length : 0) - second);
  const add = Math.round((second + variable) * 100) / 100;
  const addBand = !(xs.length || second) ? 'Not assessed' : (add < 1000 ? 'None detected (< AED 1,000)'
    : T.income(add) + ' (' + (second ? (variable >= 1000 ? 'rent + variable pay' : 'rent') : 'variable pay') + ')');
  const dbr = rec.kind === 'UPGRADE' && rec.selection ? rec.selection.dbrPct : f.dbrPct;
  const inc = rec.productId === 'car_loan' ? f.incomeCounted : f.verifiedIncome;
  const inst = rec.productId === 'salary_advance' ? 0 : (rec.outcome === 'APPROVE' && rec.pricing && rec.pricing.kfs ? rec.pricing.kfs.monthlyInstalment
    : (rec.outcome === 'APPROVE' && rec.pricing && rec.pricing.mode === 'MONTHLY_FEE' ? (rec.pricing.plans.find(x => x.months === rec.pricing.selectedMonths) || {}).monthlyPayment
      : (rec.kind === 'UPGRADE' && rec.selection ? rec.selection.monthlyPayment : (typeof f.newInstallment === 'number' ? f.newInstallment : (f.newInstalment || 0)))));
  const head = typeof inc === 'number' && inc > 0 && typeof f.dbrCapApplied === 'number' && typeof f.existingObligations === 'number'
    ? Math.round((f.dbrCapApplied / 100 * inc - f.existingObligations - inst) * 100) / 100 : null;
  const dbrOk = typeof dbr === 'number' && dbr < 999;
  return { regular, additional: add, additionalIncomeBand: addBand, dbrPct: dbrOk ? dbr : null, headroom: dbrOk ? head : null,
           incomeBand: T.income(regular), dbrBand: dbrOk ? T.dbr(dbr) : null, headroomBand: dbrOk ? T.headroom(head) : null };
}
const BANK_LABELS = (() => {
  const s = new Set(['ENBD', 'FAB', 'HDFC', 'SBI', 'HBL', 'CIB', 'State Bank', 'ADCB', 'Mashreq', 'RAKBANK', 'Wio', 'Emirates NBD', 'First Abu Dhabi']);
  for (const list of [D.personasSplit, D.personasLoan, D.personasUpgrade, D.personasJourney || []]) {
    for (const p of list) {
      for (const b of ((p.connected || {}).banks || []).concat((p.bankData || {}).banks || [])) s.add(b);
      if (p.homeStatements) s.add(p.homeStatements.bank);
      for (const acc of ((p.connected || {}).accounts || [])) s.add(acc.bank);
    }
  }
  return [...s];
})();
const MERCHANTS = D.personasSplit.map(p => p.purchase.merchant);
const STATEMENT_FILES = [].concat(D.personasLoan, D.personasUpgrade).filter(p => p.homeStatements)
  .map(p => p.homeStatements.file).reduce((a, f) => a.concat([f, f.replace(/\.pdf$/, '_edited.pdf')]), []);
function rawValuesOf(rec) {
  const out = new Set();
  const add = (v) => { if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) >= 100) { out.add(Math.round(Math.abs(v) * 100) / 100); } };
  const a = rec.applicantSnapshot || {}, cn = a.connected || {}, bd = a.bankData || {}, f = rec.features || {};
  [cn.avgMonthlyIncome, cn.avgMonthlySpend, cn.observedObligationsMonthly, bd.avgSalaryCredit, (a.employment || {}).salaryMonthly,
   (a.aecb || {}).obligationsMonthly, (a.homeBureau || {}).obligationsMonthlyAed].forEach(add);
  (cn.monthlyIncome || []).forEach(add); (cn.monthlySpend || []).forEach(add);
  (cn.accounts || []).forEach(x => { add(x.balance); add(x.limit); add(x.outstanding); });   /* v2.15: a card's limit, a loan's outstanding */
  if (a.homeStatements) a.homeStatements.months.forEach(m => { add(m.avgBalance); add(m.emi); if (m.remittance) add(m.remittance.amount); });
  const st = rec.homeStatements;
  if (st) [st.obligationsMonthlyAed, st.avgBalanceAed, st.avgBalanceLocal, st.remittanceMedianAed].forEach(add);
  [f.verifiedIncome, f.avgMonthlySpend, f.existingObligations, f.freeCashFlowMonthly, f.homeCountryObligations, f.homeObligationsMonthly,
   f.instalmentBudgetFcf, f.instalmentBudgetDbr, f.maxInstalment, f.headroomMonthly].forEach(add);
  return out;
}
// v2.16 — the Emirates ID strings a memo must never contain (per record): the employer, the
// occupation, the date of birth (in the usual formats), the nationality, the salary payer and their distinctive words.
function identityWordsOf(rec) {
  const a = rec.applicantSnapshot || {}, id = a.emiratesId || {}, fr = id.front || {}, bk = id.back || {};
  const chk = (rec.emiratesId && rec.emiratesId.check) || {}, em = chk.employerMatch || {};
  const out = new Set();
  const addStr = (v) => { if (typeof v === 'string' && v.trim()) out.add(v.trim()); };
  [bk.employer, bk.occupation, (a.connected || {}).salaryPayer, em.idEmployer, em.salaryPayer].forEach(v => {
    addStr(v);
    for (const w of String(v || '').split(/[\s/]+/)) if (/^[A-Za-z]{4,}$/.test(w) && !/^(salary|llc|fzco|ltd)$/i.test(w)) out.add(w);
  });
  if (/^\d{4}-\d{2}-\d{2}$/.test(fr.dob || '')) {
    const [y, m, d] = fr.dob.split('-');
    const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    [fr.dob, d + '/' + m + '/' + y, d + '-' + m + '-' + y, m + '/' + d + '/' + y, Number(d) + ' ' + MON3[Number(m) - 1] + ' ' + y].forEach(addStr);
  }
  addStr(fr.nationality);   /* amendment 9 Oct: read for identity and enrichment routing — never in the memo */
  ((rec.emiratesId && rec.emiratesId.images && rec.emiratesId.images.refs) || []).forEach(addStr);   /* amendment 2: the KYC image references */
  return [...out];
}
// Recursive privacy scan: every leaf of the memo (and every SFTP cell). Strings are
// checked for bank labels, merchant names, statement files and "transactions", and
// every number inside them — like every numeric leaf — must not be a raw value.
// Band fields are instead checked to equal the independently computed band.
// v2.16 — strings are also checked for the Emirates ID employer, occupation, date of birth, nationality and the salary payer.
function privacyScan(rec, memo, sftp, expect) {
  // v2.18 — the new bands are always checked against bucketsOf(); the exact headroom joins the forbidden raw values
  const bk = bucketsOf(rec);
  expect = Object.assign({ additionalIncomeBand: bk.additionalIncomeBand, headroomBand: bk.headroomBand }, expect);
  const raw = rawValuesOf(rec);
  if (bk.headroom !== null && Math.abs(bk.headroom) >= 100) { raw.add(Math.round(Math.abs(bk.headroom) * 100) / 100); raw.add(Math.round(Math.abs(bk.headroom))); }
  const bandNums = new Set();
  for (const v of Object.values(expect)) for (const tok of String(v || '').match(/\d[\d,]*(?:\.\d+)?/g) || []) bandNums.add(parseFloat(tok.replace(/,/g, '')));
  const exactDbr = bk.dbrPct !== null && !bandNums.has(bk.dbrPct) && !(memo.sharingAgreement && memo.sharingAgreement.dbrPrecision === 'EXACT') ? bk.dbrPct : null;
  const hits = [];
  const wordRe = (w) => new RegExp('(^|[^A-Za-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z])', 'i');
  const words = BANK_LABELS.concat(MERCHANTS, STATEMENT_FILES, identityWordsOf(rec)).map(w => [w, wordRe(w)]);
  const numHit = (n, where, allowBands) => {
    const v = Math.round(Math.abs(n) * 100) / 100;
    if (raw.has(v) && !(allowBands && bandNums.has(v))) hits.push(where + ' = ' + n);
    if (exactDbr !== null && v === exactDbr) hits.push(where + ' = ' + n + ' (the exact DBR)');
  };
  function str(s0, where, allowBands) {
    const s = String(s0).replace(/\b(RC|FND)_[A-Z0-9_]+\b/g, '');   /* codes are the engine's identifiers; their words are checked */
    if (/transactions/i.test(s)) hits.push(where + ' says "transactions"');
    for (const [w, re] of words) if (re.test(s)) hits.push(where + ' names "' + w + '"');
    /* v2.16 amendment 2 — v2.18: for every record, not only those with a scan */
    if (/\.(jpe?g|png|heic|webp)\b|EID-(FRONT|BACK)|\bimages?\b|\bphotos?\b/i.test(s)) hits.push(where + ' references an ID image');
    if (rec.dataCompleteness && /threshold|illustrative|\bweights?\b|aboveThreshold|scoreOverlay|70–84|≥ ?85/i.test(s.replace(/^Illustrative derivation$/, ''))) hits.push(where + ' shows the completeness threshold, weights or bands');   /* v2.17 (v2.18: the component bars' required label "Illustrative derivation" is allowed) */
    /* v2.18 §1b — Noor IP vs lender view */
    if (/≥ ?\d{3}|680–739|620–679|560–619|< ?560/.test(s)) hits.push(where + ' shows a NoorScore band boundary');
    if (/threshold/i.test(s)) hits.push(where + ' says "threshold"');
    if (/footprint|statement|counted at|(^|[^\d.,])75 ?%|credit ?passport|uae pass|emirates id/i.test(s)) hits.push(where + ' names a data source or the share counted');
    if (/\bpoints?\b|\bweights?\b|\bpts\b|[+−]\s?\d/i.test(s)) hits.push(where + ' shows a weight or points');
    for (const tok of s.match(/\d[\d,]*(?:\.\d+)?/g) || []) numHit(parseFloat(tok.replace(/,/g, '')), where + ' ("' + tok + '")', allowBands);
  }
  (function walk(x, path, key, inOutputs) {
    if (x === null || x === undefined) return;
    if (rec.dataCompleteness && /^(threshold|aboveThreshold|components|weight|scoreOverlay|ask|thresholdLabel)$/.test(key) && !/scoreComponents/.test(path)) hits.push(path + ' — an internal completeness field');   /* v2.17 */
    if (/^(weights?|points|delta|overlays|drivers|rule|rules|threshold|images|base)$/.test(key)) hits.push(path + ' — an internal field');   /* v2.18 */
    if (BAND_KEYS[key]) { if (x !== expect[key]) hits.push(path + ' band "' + x + '" ≠ expected "' + expect[key] + '"'); return; }
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + '[' + i + ']', key, inOutputs)); return; }
    if (typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], path + '.' + k, k, inOutputs || k === 'outputs'); return; }
    if (typeof x === 'number') { numHit(x, path, inOutputs); return; }
    if (typeof x === 'string') str(x, path, inOutputs);
  })(memo, 'memo', '', false);
  sftp.header.forEach((col, i) => {
    const cell = sftp.row[i];
    if (SFTP_BAND_COLS[col]) {
      const want = { income_band: expect.incomeBand, dbr_band: expect.dbrBand, aecb_band: expect.aecbScoreBand,
                     additional_income_band: expect.additionalIncomeBand, headroom_band: expect.headroomBand,
                     free_cash_flow_band: expect.freeCashFlowBand, instalment_share_band: expect.instalmentToCashFlowBand }[col] || '';
      if (cell !== want) hits.push('sftp.' + col + ' "' + cell + '" ≠ "' + want + '"');
    } else str(cell, 'sftp.' + col, false);
  });
  return hits;
}
function forbiddenKeys(memo) {
  const bad = ['applicantSnapshot', 'features', 'dataPulls', 'rules', 'connected', 'bankData', 'monthlyIncome', 'monthlySpend', 'banks',
               'avgMonthlyIncome', 'avgMonthlySpend', 'freeCashFlowMonthly', 'homeBureau', 'audit', 'purchase', 'accounts'];
  const found = [];
  (function walk(x, path) {
    if (!x || typeof x !== 'object') return;
    for (const k of Object.keys(x)) {
      /* v2.17 — memo.dataCompleteness.banks / .accounts are counts (numbers), not the bank or account lists */
      if (bad.includes(k) && !(path === 'memo.dataCompleteness' && (k === 'accounts' || k === 'banks') && typeof x[k] === 'number')) found.push(path + '.' + k);
      walk(x[k], path + '.' + k);
    }
  })(memo, 'memo');
  return found;
}

group('14. Lender view (v2.5): NoorScore, credit memo from an allowlist, API + SFTP delivery, privacy', () => {
  E.init(D);
  const U = {}; for (const p of D.personasUpgrade) U[p.id] = p;
  // The narrowed vocabulary check still catches every Shari'ah form, and lets "sharing" (the spec's memo key) through.
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b/i;
  ok(banned.test('Shari\'ah') && banned.test('Sharia') && banned.test('shariah') && banned.test('Shari') && !banned.test('sharing') && !banned.test('shared'),
     'vocabulary regex: shari(?!ng) still catches Shari\'ah / Sharia / shariah and allows "sharing"');

  // NoorScore bands mirror the A–E grade cut-offs.
  const nb = [[806, 'Excellent'], [740, 'Excellent'], [739, 'Very good'], [680, 'Very good'], [679, 'Good'], [620, 'Good'], [619, 'Fair'], [560, 'Fair'], [559, 'Poor'], [400, 'Poor']];
  ok(nb.every(([v, b]) => E.noorScoreBand(v) === b), 'noorScoreBand: ≥740 Excellent · 680–739 Very good · 620–679 Good · 560–619 Fair · <560 Poor');
  eq(E.noorScoreBand(null), null, 'noorScoreBand(null) → null (no score yet)');
  ok(Array.isArray(E.NOORSCORE_BANDS) && E.NOORSCORE_BANDS.length === 5, 'NOORSCORE_BANDS lists five bands');

  // Every decided persona record: APPROVE, REFER, DECLINE, Credit Passport, statements, upgrades, salary advance, override, executed.
  const all = [];
  const push = (label, rec) => { collect(rec.reasonCodes); all.push({ label, rec }); return rec; };
  for (const p of D.personasLoan) push(p.id, decidePersona('personal_loan', p));
  push('r2+creditPassport', decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } }));
  for (const p of D.personasSplit) push(p.id, decidePersona('split', p));
  const r2ref = all.find(x => x.label === 'r2').rec;
  E.requestDocuments(r2ref.id, { type: 'HOME_STATEMENTS', months: 6, country: 'IN', analyst: 'A. Farsi (Credit Analyst)' });
  E.submitStatements(r2ref.id, { country: 'IN', bank: 'HDFC Bank', file: P.r2.homeStatements.file });
  push('r2+statements', E.redecide(r2ref.id));
  const ubase = push('u1 base', E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true } }));
  const sbi = E.parseStatements({ country: 'IN', file: U.u1.homeStatements.file, applicantId: 'u1', productId: 'starter_loan' });
  const uenh = push('u1 enhanced', E.decide({ productId: 'starter_loan', applicant: U.u1, consents: { aecb: true, openFinance: true }, statements: sbi, supersedes: ubase.id }));
  push('u2', E.decide({ productId: 'starter_loan', applicant: U.u2, consents: { aecb: true, openFinance: true, homeStatements: true } }));
  push('salary advance r1', E.decide({ productId: 'salary_advance', applicant: P.r1, amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } }));
  E.selectUpgradeOption(uenh.id, { amount: 2000, months: 5 });
  const c1 = all.find(x => x.label === 'c1').rec;
  for (const t of E.EXEC_EVENTS) E.recordEvent(c1.id, t);
  const c2 = all.find(x => x.label === 'c2').rec;
  E.override(c2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'S. Nair' });
  ok(['APPROVE', 'REFER', 'DECLINE'].every(o => all.some(x => x.rec.outcome === o || (x.label === 'c2' && o === 'REFER'))), 'memo set spans APPROVE, REFER and DECLINE');

  // shareWithLender is recorded on every decide(), automatically.
  ok(all.every(x => x.rec.consents.shareWithLender && x.rec.consents.shareWithLender.granted === true && x.rec.consents.shareWithLender.lenderId === 'partner-bank' &&
                    /application result \(not your bank data\)/.test(x.rec.consents.shareWithLender.wording)),
     'every decision records consent shareWithLender (granted, partner-bank, "application result (not your bank data)")');
  ok(all.every(x => x.rec.noorScore && x.rec.noorScore.value === (Number.isFinite(x.rec.score.points) ? x.rec.score.points : null) &&
                    x.rec.noorScore.band === T.noor(x.rec.noorScore.value)), 'every record carries noorScore = scorecard points, with its band');

  let leaks = 0, checked = 0;
  for (const { label, rec } of all) {
    const r = E.getDecision(rec.id);
    const memo = E.creditMemo(r.id, { lenderId: 'partner-bank' });
    const api = E.memoApiPayload(memo);
    const sftp = E.memoSftpRow(memo);
    checked++;
    eq(Object.keys(memo).join(','), MEMO_KEYS.join(','), label + ': memo has exactly the allowlisted top-level keys');
    ok(forbiddenKeys(memo).length === 0, label + ': memo carries no record internals (' + forbiddenKeys(memo).join(', ') + ')');
    eq(JSON.stringify(api), JSON.stringify(memo), label + ': API payload = the memo (JSON)');
    ok(api !== memo && api.decision !== memo.decision, label + ': API payload is a detached copy');
    eq(sftp.header.join(','), SFTP_HEADER.join(','), label + ': SFTP header columns (the v2.5 sixteen, then the v2.18 columns)');
    ok(sftp.row.length === SFTP_HEADER.length && sftp.row.every(c => typeof c === 'string') && !sftp.row.some(c => /[\r\n]/.test(c)), label + ': SFTP row is ' + SFTP_HEADER.length + ' flat string cells');
    ok(sftp.row[0] === memo.memoId && sftp.row[1] === r.id && sftp.row[3] === r.outcome && sftp.row[9] === (memo.noorScore.value === null ? '' : String(memo.noorScore.value)) &&
       sftp.row[14] === memo.decision.reasonCodes.map(c => c.code).join('|'), label + ': SFTP row matches the memo (v2.19: reason_codes = the memo’s library codes)');
    // presence
    ok(memo.memoId === 'CM-' + r.id && memo.noorRef === r.id && memo.lenderName === 'Partner Bank (lender of record)', label + ': memo id, Noor reference, lender of record');
    ok(memo.decision.outcome === r.outcome && r.reasonCodes.every(rc => memo.decision.reasonCodes.some(c => c.code === E.REASON_CODE_MAP[rc])) &&
       memo.decision.reasonCodes.every(c => Object.keys(c).join() === 'code,colour,en,ar' && /^(GREEN|YELLOW|RED)$/.test(c.colour) && c.en && ARABIC.test(c.ar)),
       label + ': outcome + every reason code, as its library code (v2.19), in English and Arabic with its colour');
    ok(memo.noorScore.value === (Number.isFinite(r.score.points) ? r.score.points : null) && memo.noorScore.band === T.noor(memo.noorScore.value) &&
       Array.isArray(memo.noorScore.factors) && memo.noorScore.factors.length <= 3 && memo.noorScore.factors.every(w => !/\d/.test(w)),
       label + ': NoorScore + band, ≤ 3 factor directions with no numbers');
    const types = memo.consents.map(c => c.type);
    ok(types.includes('aecb') && types.includes('shareWithLender') && memo.consents.every(c => /^CNS-\d{6}-[A-Z]+$/.test(c.reference) && c.grantedAt && Object.keys(c).join() === 'type,grantedAt,reference'),
       label + ': consent references only (type, grantedAt, reference) incl. aecb + shareWithLender');
    ok(memo.bureau.aecbChecked === true && memo.verification.identity === 'Identity verified' && /^784-••••-•••••••-\d$/.test(memo.borrower.emiratesIdMasked),
       label + ': AECB checked, identity flag ("Identity verified" — v2.18, source-agnostic), masked Emirates ID');
    ok(!('sharing' in memo) && memo.sharingAgreement.label === 'Partner Bank v1' && memo.outputs.map(o => o.key).join() === 'noorScore,reasonCodes,dataCompleteness,incomeBucket,additionalIncomeBucket,dbr',
       label + ': v2.18 — no shared/withheld lists in the memo (the Noor-only panel replaces them); Partner Bank v1, the six output rows');
    ok(r.outcome === 'APPROVE' ? !!memo.terms && Number.isFinite(memo.terms.coolingOffDays) : memo.terms === null, label + ': terms only on an approval');
    // bands, computed independently
    const f = r.features, aSnap = r.applicantSnapshot;
    const share = Number.isFinite(f.instalmentToFcfPct) ? f.instalmentToFcfPct
      : (r.kind === 'UPGRADE' && r.selection && f.freeCashFlowMonthly > 0 ? Math.round(r.selection.monthlyPayment / f.freeCashFlowMonthly * 1000) / 10 : null);
    const expect = { incomeBand: bucketsOf(r).incomeBand, dbrBand: bucketsOf(r).dbrBand, freeCashFlowBand: T.fcf(f.freeCashFlowMonthly),
                     instalmentToCashFlowBand: T.share(share), aecbScoreBand: T.aecb(aSnap.aecb) };
    const hits = privacyScan(r, memo, sftp, expect);
    if (hits.length) leaks++;
    ok(hits.length === 0, label + ': recursive privacy scan — no raw Open Finance values, bank labels, merchants, files or "transactions"' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));
  }
  ok(checked >= 16 && leaks === 0, 'privacy scan ran over ' + checked + ' memos with zero leaks');

  // Spec anchors
  const m1 = E.creditMemo(c1.id);
  ok(m1.affordability.incomeBand.startsWith('AED 30,000–40,000') && !JSON.stringify(m1).includes('32,000') && !JSON.stringify(m1).includes('32000'),
     'c1 income band is AED 30,000–40,000 (covers 32,000; the exact figure never appears)');
  ok(m1.noorScore.value === 806 && m1.noorScore.band === 'Excellent' && m1.noorScore.factors.join('|') === 'Strong free cash flow|Stable income|Long connected history',
     'c1 NoorScore 806 Excellent — Strong free cash flow · Stable income · Long connected history');
  ok(m1.verification.purchaseVerified === 'Education — verified purchase' && !/School fees/i.test(JSON.stringify(m1)), 'c1 purchase shared as its category only (Education)');
  ok(m1.terms.amount === 12000 && m1.terms.planMonths === 6 && m1.terms.monthlyPayment === 2150 && m1.terms.repaymentMethod === 'DIRECT_DEBIT' && m1.decision.status === 'EXECUTED',
     'c1 terms: AED 12,000 · Pay in 6 · AED 2,150/mo · direct debit; status EXECUTED');
  const r3 = E.getDecision(all.find(x => x.label === 'r3').rec.id);
  eq(E.creditMemo(r3.id).affordability.dbrBand, T.dbr(r3.features.dbrPct), 'r3 DBR band matches its dbrPct (' + r3.features.dbrPct + '%)');
  ok(r3.features.dbrPct > 45 && E.creditMemo(r3.id).affordability.dbrBand === '45–50%', 'r3 sits in the 45–50% DBR band (v2.18: 5-point steps; was 35–50%)');
  const c2m = E.creditMemo(c2.id);
  ok(c2m.decision.route === 'ANALYST_REVIEW' && c2m.decision.outcome === 'APPROVE' && c2m.terms, 'override approval: route ANALYST_REVIEW, terms present');
  const r2s = E.creditMemo(all.find(x => x.label === 'r2+statements').rec.id);
  ok(r2s.verification.additionalEvidence === 'Additional evidence verified' && !/HDFC|Statement_/i.test(JSON.stringify(r2s)), 'r2 statements: a source-agnostic verification flag ("Additional evidence verified", v2.18), never the bank or the file');
  const r2c = E.creditMemo(all.find(x => x.label === 'r2+creditPassport').rec.id);
  ok(r2c.bureau.homeCountryFile === 'Home-country credit history used (consented)' && !/CIBIL|Nova|Credit Passport/.test(JSON.stringify(r2c)), 'Credit Passport: a source-agnostic bureau flag (v2.18), never the home bureau, its score or the rail\'s name');
  const um = E.creditMemo(uenh.id);
  ok(um.terms.amount === 2000 && um.terms.tenorMonths === 5 && um.noorScore.value === null && um.noorScore.factors.includes('Starter loan repaid on time'),
     'upgrade memo: the chosen option, no NoorScore yet, repayment-record factor');
  ok(E.creditMemo(all.find(x => x.label === 'c3').rec.id).affordability.freeCashFlowBand === 'Below AED 1,000 / month', 'c3 negative free cash flow shows only as "Below AED 1,000 / month"');
  ok(E.creditMemo(all.find(x => x.label === 'r4').rec.id).noorScore.band === 'Poor' && E.creditMemo(all.find(x => x.label === 'r4').rec.id).terms === null,
     'r4 DECLINE memo: NoorScore band Poor, no terms');

  // Pure: no clock tick, no audit entry, identical output.
  const auditLen = E.getDecision(c1.id).audit.length;
  const a1 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: CONSENT_ALL });
  const s1 = JSON.stringify(E.creditMemo(c1.id)); for (let i = 0; i < 5; i++) E.creditMemo(a1.id);
  const a2 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: CONSENT_ALL });
  eq(new Date(a2.createdAt) - new Date(a1.createdAt), 37000, 'creditMemo() never advances the engine clock (one tick per decide)');
  ok(s1 === JSON.stringify(E.creditMemo(c1.id)) && E.getDecision(c1.id).audit.length === auditLen, 'creditMemo() is pure: identical output, no audit entry');
  const mutated = E.memoApiPayload(E.creditMemo(c1.id)); mutated.decision.outcome = 'X';
  eq(E.creditMemo(c1.id).decision.outcome, 'APPROVE', 'mutating an API payload never touches the record');

  throwsWith(() => E.creditMemo(c1.id, { lenderId: 'other-bank' }), 'unknown lender', 'unknown lender → throws');
  throwsWith(() => E.creditMemo('MZN-999999'), 'unknown decision id', 'unknown decision → throws');
  throwsWith(() => E.memoSftpRow({ foo: 1 }), 'creditMemo() result', 'memoSftpRow refuses a non-memo');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: CONSENT_ALL, lenderId: 'nope' }), 'unknown lender', 'decide() with an unknown lender → throws');
  eq(JSON.stringify(E.lenders()), JSON.stringify(D.lenders), 'lenders() = MizanData.lenders');
  ok(D.lenders.length === 2 && D.lenders[0].id === 'partner-bank' && D.lenders[0].name === 'Partner Bank' && D.lenders[0].role === 'Lender of record' && D.lenders[1].id === 'lender-b',
     'MizanData.lenders = [Partner Bank, lender of record; v2.18: + Lender B (illustrative)]');

  // Determinism of memos across fresh inits.
  function snap() {
    E.init(D);
    const rr = [decidePersona('split', P.c1), decidePersona('personal_loan', P.r3), decidePersona('personal_loan', P.r4)];
    return JSON.stringify(rr.map(x => [E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(x.id))]));
  }
  ok(snap() === snap(), 'two fresh init() runs produce identical memos and SFTP rows');
});

// ---------------------------------------------------------------------------
group('15. Customer journey (v2.6): persona j1, prequalify() on Open Finance only, decide() → memo → execution', () => {
  E.init(D);
  const J = D.personasJourney;
  ok(Array.isArray(J) && J.length === 1 && J[0].id === 'j1', 'MizanData.personasJourney = [j1]');
  const j = J[0], cn = j.connected;
  ok(j.name === 'Ravi Kumar' && ARABIC.test(j.nameAr) && j.age === 31 && j.monthsInUae === 36 && j.employment.salaryMonthly === 12000 &&
     j.aecb.score === 712 && j.aecb.obligationsMonthly === 900 && j.aecb.chequeReturns12m === 0 && j.aecb.worstDelinquency === 'NONE',
     'j1 Ravi Kumar (رافي كومار): 31, 3 years in the UAE, salary 12,000, AECB 712, obligations 900, no returns, no delinquency');
  ok(j.bankData.source === 'ALTAREQ_TPP' && j.bankData.salaryDetected && cn.monthsAvailable === 12 && cn.banks.join(',') === 'ENBD,FAB' &&
     cn.accounts.map(a => a.bank + ' ' + a.mask).join(',') === 'ENBD 4821,FAB 0193,ENBD 7702,ENBD 3317',
     'j1: salary verified via connected accounts; 12 months, ENBD current ••••4821 + FAB savings ••••0193 (+ the v2.15 ENBD card ••••7702 and loan ••••3317)');
  const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok(cn.monthlyIncome.length === 12 && meanOf(cn.monthlyIncome) === cn.avgMonthlyIncome && meanOf(cn.monthlySpend) === cn.avgMonthlySpend && cn.avgMonthlySpend === 7400,
     'j1 monthly series consistent: mean income 12,000, mean spend 7,400');
  ok(j.defaultRequest.amount === 15000 && j.defaultRequest.tenorMonths === 12 && j.purpose === 'Family wedding', 'j1 default request 15,000 / 12 months, purpose "Family wedding"');

  // prequalify(): pure — no record, no AECB pull, no clock tick.
  const before = E.listDecisions().length;
  const t0 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: CONSENT_ALL });
  const pq = E.prequalify(j, { openFinance: true });
  E.prequalify(j, { openFinance: true });
  const t1 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: CONSENT_ALL });
  eq(E.listDecisions().length, before + 2, 'prequalify() creates no DecisionRecord');
  eq(new Date(t1.createdAt) - new Date(t0.createdAt), 37000, 'prequalify() never advances the engine clock');
  eq(t1.id, 'MZN-' + String(Number(t0.id.slice(4)) + 1).padStart(6, '0'), 'decision ids continue without a gap after prequalify()');
  // independent arithmetic at 9.99%: DBR headroom 50% × 12,000 − 900 = 5,100/mo; free cash flow
  // 12,000 − 7,400 − 900 = 3,700/mo → cash-flow budget 50% = 1,850/mo (binds), floored to 1,000
  const i = 0.0999 / 12, pvOf = (pmt, n) => pmt * (1 - Math.pow(1 + i, -n)) / i;
  const capAt = (n) => Math.floor(Math.min(pvOf(5100, n), pvOf(1850, n), 240000, 500000) / 1000) * 1000;
  eq(pq.indicativeMax, capAt(24), 'indicativeMax = min(DBR-headroom PV, 50%-of-free-cash-flow PV, 20× salary, product cap) at 24 months @ 9.99%, floor 1,000');
  eq(pq.indicativeMax, 40000, 'j1 indicativeMax AED 40,000 — bound by free cash flow, not the AED 110,000 the DBR cap alone would allow');
  ok(Math.floor(pvOf(5100, 24) / 1000) * 1000 === 110000 && pq.indicativeMax < 110000, 'the DBR cap alone (AED 110,000) would over-promise: an instalment of 5,100/mo against 3,700/mo left after spending');
  eq(pq.indicativeMin, Math.floor(0.25 * pq.indicativeMax / 1000) * 1000, 'indicativeMin = 25% of max, floor 1,000 (AED 10,000)');
  ok(pq.maxByTermMonths[6] === capAt(6) && pq.maxByTermMonths[12] === capAt(12) && pq.maxByTermMonths[24] === pq.indicativeMax &&
     pq.maxByTermMonths[6] === 10000 && pq.maxByTermMonths[12] === 21000, 'maxByTermMonths: 6 → AED 10,000 · 12 → AED 21,000 · 24 → AED 40,000 (shorter term, smaller amount)');
  ok(pq.assumptions.instalmentBudgetMonthly === 1850 && pq.basis.some(b => /Left after spending and repayments: AED 3,700\/month .* within 50% of it \(AED 1,850\/month\)/.test(b)),
     'prequal basis explains the cash-flow budget (AED 1,850 of AED 3,700/month)');
  [6, 12, 24].forEach(n => ok(E.loanInstalment(pq.maxByTermMonths[n], n, 0.0999) <= 1850, 'at the ' + n + '-month cap the instalment fits the cash-flow budget'));
  const noSpend = clone(j); delete noSpend.connected.avgMonthlySpend;
  eq(E.prequalify(noSpend, { openFinance: true }).indicativeMax, 110000, 'without spending data the cap falls back to DBR headroom (AED 110,000)');
  eq(pq.note, 'No credit bureau check yet — this does not affect your credit score', 'prequal note');
  ok(pq.validForDays === 7 && pq.sources.join() === 'OPEN_FINANCE' && pq.basis.length >= 3 && /Income AED 12,000\/month verified from 12 months of connected accounts/.test(pq.basis[0]),
     'prequal: valid 7 days, Open Finance only, basis lines (income from 12 months of connected accounts)');
  ok(!pq.basis.some(b => /AECB|bureau score|712/i.test(b)), 'prequal basis never cites the bureau');
  eq(pq.noorScoreEstimateBand, 'Very good', 'NoorScore estimate band (proxy 640 + salary seen +15 + 12 months +10 + stable income +15 = 680)');
  // a prequal that cannot see the bureau ignores it: same result without the AECB block
  const noBureau = clone(j); delete noBureau.aecb;
  eq(JSON.stringify(E.prequalify(noBureau, { openFinance: true })), JSON.stringify(pq), 'prequalify() reads no bureau data (identical without the AECB block)');
  throwsWith(() => E.prequalify(j, { openFinance: false }), 'Open Finance consent', 'prequalify() without Open Finance consent throws');
  throwsWith(() => E.prequalify(j), 'Open Finance consent', 'prequalify() without consents throws');
  throwsWith(() => E.prequalify({ name: 'x', employment: { salaryMonthly: 9000 } }, { openFinance: true }), 'connect the salary account', 'prequalify() with no connected income throws');
  ok(JSON.stringify(E.prequalify(j, { openFinance: true })) === JSON.stringify(pq), 'prequalify() is deterministic');

  // decide(): the real engine, unchanged
  const rec = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: { aecb: true, openFinance: true } });
  collect(rec.reasonCodes);
  ok(rec.outcome === 'APPROVE' && rec.score.grade === 'B' && rec.score.points === 737 && rec.limit.approved === 15000 && rec.limit.bindingConstraint === 'REQUESTED',
     'decide(j1, 15,000 / 12) → APPROVE, grade B, NoorScore 737, AED 15,000 (REQUESTED binds)');
  eq(rec.noorScore.band, pq.noorScoreEstimateBand, 'the final NoorScore band equals the pre-qualification estimate (Very good)');
  const k = rec.pricing.kfs;
  ok(k.tenorMonths === 12 && k.rateMid === 0.0899 && k.monthlyInstalment === E.loanInstalment(15000, 12, 0.0899) && k.monthlyInstalment === 1311.7,
     'j1 KFS: 12 months, 8.99% APR (mid band B), AED 1,311.70/mo — loanInstalment() matches the record');
  const dbrMax = rec.limit.trace.find(t => /DBR headroom/.test(t.label)).value;
  ok(pq.maxByTermMonths[12] <= dbrMax, 'pre-qualification never promises more than the engine allows: 12-month cap AED ' + pq.maxByTermMonths[12] + ' ≤ the engine’s DBR maximum AED ' + dbrMax);
  ok(pq.indicativeMin <= rec.limit.approved && rec.limit.approved <= pq.maxByTermMonths[12], 'the approved AED 15,000 is inside the pre-qualified range and within the 12-month cap');
  eq(rec.repayment && rec.repayment.method, 'DIRECT_DEBIT', 'j1 at AED 15,000 → repayment DIRECT_DEBIT');
  ok(rec.features.freeCashFlowMonthly === 3700 && rec.features.instalmentToFcfPct > 25 && rec.features.dbrPct < 20, 'j1 features: free cash flow 3,700 (a policy rule since v2.8), DBR < 20%');
  const small = E.decide({ productId: 'personal_loan', applicant: j, amount: 1000, tenorMonths: 12, consents: { aecb: true, openFinance: true } });
  ok(small.outcome === 'APPROVE' && small.limit.approved === 1000 && small.repayment.method === 'ALTAREQ', 'j1 at AED 1,000 → APPROVE, repayment ALTAREQ (no product minimum, no clamp needed)');
  const big = E.decide({ productId: 'personal_loan', applicant: j, amount: 110000, tenorMonths: 6, consents: { aecb: true, openFinance: true } });
  collect(big.reasonCodes);
  ok(big.outcome === 'APPROVE' && big.limit.approved < 110000 && big.reasonCodes.includes('RC_LIMIT_REDUCED'), 'an unaffordable choice (110,000 / 6) is reduced with RC_LIMIT_REDUCED, never above the DBR cap');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: { openFinance: true } }), 'AECB consent', 'apply without AECB consent → throws');

  // the lender memo for the journey decision is private
  const memo = E.creditMemo(rec.id);
  const hits = privacyScan(rec, memo, E.memoSftpRow(memo), { incomeBand: T.income(12000), dbrBand: T.dbr(rec.features.dbrPct), freeCashFlowBand: T.fcf(3700),
    instalmentToCashFlowBand: T.share(rec.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) });
  ok(hits.length === 0, 'j1 memo: recursive privacy scan clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));
  ok(!/ENBD|FAB|4821|0193|7702|3317|12,000|12000|7,400|7400|7,440|7440|6,200|6200|credit card ••|wedding/i.test(JSON.stringify(memo)),
     'j1 memo: no bank, account mask (incl. the v2.15 card ••7702 and loan ••3317), card limit/balance, loan outstanding, exact income/spend or purpose');
  ok(memo.affordability.incomeBand === 'AED 10,000–15,000 / month' && memo.affordability.freeCashFlowBand === 'AED 3,000–4,999 / month' &&
     memo.noorScore.value === 737 && memo.noorScore.band === 'Very good' && memo.terms.amount === 15000 && memo.terms.repaymentMethod === 'DIRECT_DEBIT' &&
     memo.lenderName === 'Partner Bank (lender of record)', 'j1 memo: income band 10–15k, FCF band 3–5k, NoorScore 737 Very good, AED 15,000, direct debit, Partner Bank');

  // the six conventional steps, in order
  throwsWith(() => E.recordEvent(rec.id, 'DISBURSED'), 'out of sequence', 'j1: disbursing first throws');
  for (const t of E.EXEC_EVENTS.slice(0, 3)) E.recordEvent(rec.id, t);
  throwsWith(() => E.recordEvent(rec.id, 'COOLING_OFF_CLEARED'), 'repayment collection is set up', 'j1: cooling-off before repayment set-up throws');
  for (const t of E.EXEC_EVENTS.slice(3)) E.recordEvent(rec.id, t);
  ok(E.getDecision(rec.id).status === 'EXECUTED' && E.getDecision(rec.id).events.length === 6, 'j1: six steps → EXECUTED');
  eq(E.execSteps('personal_loan', rec.id)[3].label, 'Direct debit mandate active', 'j1 repayment step label from execSteps (direct debit)');
  eq(E.execSteps('personal_loan', small.id)[3].label, 'Al Tareq payment consent authorised', 'AED 1,000 repayment step label from execSteps (Al Tareq)');
  eq(E.creditMemo(rec.id).decision.status, 'EXECUTED', 'the memo follows the record: status EXECUTED');
  throwsWith(() => E.loanInstalment(0, 12, 0.08), 'positive principal', 'loanInstalment refuses a zero principal');

  function snap() {
    E.init(D);
    const p1 = E.prequalify(j, { openFinance: true });
    const r = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: { aecb: true, openFinance: true } });
    return JSON.stringify([p1, r, E.creditMemo(r.id)]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical prequal, decision and memo');
  for (const r of E.listDecisions()) collect(r.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted so far exists with Arabic');
});

// ---------------------------------------------------------------------------
// v2.7 — the a1 memo privacy scan (CAR-LOAN-SPEC.md §4): a recursive walk over every
// memo leaf and every SFTP cell. Numbers (numeric leaves, and every number inside a
// string, commas stripped) must not equal a forbidden figure — matched as whole
// numbers, so AED 180,000 never trips 18,000; words are matched as words.
const CAR_FORBIDDEN_NUMBERS = [9000, 27000, 6750, 54000, 18000, 16300, 64200, 118500, 236000, 7714, 3302, 5568];
const CAR_FORBIDDEN_WORDS = ['Mashreq', 'HSBC', 'ADCB', 'transactions'];
function carPrivacyScan(memo, sftp) {
  const hits = [];
  const num = (n, where) => { if (CAR_FORBIDDEN_NUMBERS.includes(Math.round(Math.abs(n) * 100) / 100)) hits.push(where + ' = ' + n); };
  const str = (s, where) => {
    for (const w of CAR_FORBIDDEN_WORDS) if (new RegExp('(^|[^A-Za-z])' + w + '($|[^A-Za-z])', 'i').test(s)) hits.push(where + ' names "' + w + '"');
    for (const tok of s.match(/\d[\d,]*(?:\.\d+)?/g) || []) num(parseFloat(tok.replace(/,/g, '')), where + ' ("' + tok + '")');
  };
  (function walk(x, path) {
    if (x === null || x === undefined) return;
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + '[' + i + ']')); return; }
    if (typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], path + '.' + k); return; }
    if (typeof x === 'number') num(x, path);
    else if (typeof x === 'string') str(x, path);
  })(memo, 'memo');
  sftp.row.forEach((c, i) => str(c, 'sftp.' + sftp.header[i]));
  // Belt and braces: the spec's comma forms never appear as whole numbers in the raw text.
  const raw = JSON.stringify(memo) + '\n' + sftp.row.join(',');
  for (const t of ['9,000', '27,000', '6,750', '64,200', '118,500', '236,000', '16,300', '18,000', '54,000']) {
    if (new RegExp('(^|[^\\d,.])' + t.replace(/,/g, ',') + '(?![\\d]|,\\d)').test(raw)) hits.push('raw text has "' + t + '"');
  }
  return hits;
}

// ---------------------------------------------------------------------------
group('16. Car loan (v2.7): a new policy pack — LTV 80%, 60 months, rental income verified by Open Finance (+AED 30,000)', () => {
  E.init(D);
  const C = D.personasCar;
  ok(Array.isArray(C) && C.length === 1 && C[0].id === 'a1', 'MizanData.personasCar = [a1]');
  const a1 = C[0], cn = a1.connected, AR = { aecb: true, openFinance: true }, DOCS = { aecb: true, openFinance: false };
  const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  // ---- persona ----
  ok(a1.name === 'Karim Nassar' && a1.nameAr === 'كريم نصار' && a1.age === 44 && a1.monthsInUae === 132 &&
     a1.tagline === 'Commercial Director, 11 years in the UAE — buying a family SUV; rents out an apartment',
     'a1 Karim Nassar (كريم نصار), 44, 132 months in the UAE, tagline');
  ok(a1.employment.type === 'PRIVATE' && a1.employment.salaryMonthly === 45000 && a1.employment.tenureMonths === 72 && a1.employment.retiree === false &&
     /Commercial Director/.test(a1.employment.title) && /FMCG/.test(a1.employment.employer), 'a1 employment: Commercial Director at an FMCG distributor, PRIVATE, salary 45,000, 72 months, not a retiree');
  const ab = a1.aecb;
  ok(ab.hit === true && ab.score === 790 && ab.esrPct === 44 && ab.obligationsMonthly === 19700 && ab.tradelines === 5 && ab.chequeReturns12m === 0 &&
     ab.worstDelinquency === 'NONE' && ab.obligationsBreakdown.reduce((s, o) => s + o.monthly, 0) === 19700 &&
     ab.obligationsBreakdown.map(o => o.label + ' ' + o.monthly).join(',') === 'Home mortgage 17200,Credit cards 2500',
     'a1 AECB: hit, 790, ESR 44, obligations 19,700 (mortgage 17,200 + cards 2,500), 5 tradelines, no returns, no delinquency');
  eq(JSON.stringify(a1.bankData), JSON.stringify({ source: 'DOCUMENTS', salaryDetected: true, salaryCertificate: true }), 'a1 bankData: documents path with a salary certificate');
  ok(cn.source === 'ALTAREQ_TPP' && cn.monthsAvailable === 12 && cn.accounts.length === 3 &&
     cn.accounts.map(x => x.bank + ' ' + x.mask + ' ' + x.balance).join(',') === 'Mashreq 7714 64200,HSBC 3302 118500,ADCB 5568 236000' &&
     cn.accounts[0].salaryAccount === true, 'a1 connected: Al Tareq, 12 months, Mashreq ••7714 (salary) 64,200 · HSBC ••3302 118,500 · ADCB ••5568 236,000');
  ok(cn.avgMonthlyIncome === 54000 && cn.avgMonthlySpend === 18000 && cn.observedObligationsMonthly === 19700 && cn.incomeVolatilityPct <= 5 &&
     cn.monthlyIncome.length === 12 && cn.monthlySpend.length === 12 && meanOf(cn.monthlyIncome) === 54000 && meanOf(cn.monthlySpend) === 18000,
     'a1 connected means: income 54,000, spend 18,000, observed obligations 19,700 = AECB; monthly series consistent');
  const rentMonths = D.monthLabels.filter((m, i) => cn.monthlyIncome[i] === 72000).map(m => m.slice(5)).sort().join(',');
  ok(rentMonths === '01,04,07,10' && cn.monthlyIncome.every(x => x === 45000 || x === 72000), 'a1 income series: salary 45,000 every month + rent 27,000 in Jan / Apr / Jul / Oct');
  eq(JSON.stringify(cn.regularIncome), JSON.stringify([{ type: 'RENTAL', label: 'Rent — apartment (tenancy registered with Ejari)', frequency: 'QUARTERLY',
    amountPerReceipt: 27000, receipts12m: 4, monthlyEquivalent: 9000, onSchedule: true, matchesTenancy: true, account: 'HSBC ••3302' }]), 'a1 regularIncome: rent 27,000 quarterly, 4 of 4, 9,000/month, on schedule, matches the tenancy');
  const plus14 = new Date(new Date(D.TODAY + 'T00:00:00Z').getTime() + 14 * 86400000).toISOString().slice(0, 10);
  eq(JSON.stringify(a1.vehicleQuote), JSON.stringify({ category: 'SUV', condition: 'NEW', modelYear: 2026, priceAed: 225000, dealer: 'Partner dealer, Dubai',
    quoteRef: 'DQ-2026-0418', validUntil: plus14 }), 'a1 vehicleQuote: SUV, new, 2026, AED 225,000, partner dealer, DQ-2026-0418, valid until TODAY+14');
  ok(a1.defaultRequest.amount === 180000 && a1.defaultRequest.tenorMonths === 60 && 0.8 * a1.vehicleQuote.priceAed === 180000,
     'a1 default request: AED 180,000 / 60 months — the 80% LTV maximum, a 20% down payment of 45,000');

  // ---- manifest, pack, bounds, SLA ----
  const man = E.manifests().find(m => m.productId === 'car_loan');
  eq(JSON.stringify(man), JSON.stringify({ productId: 'car_loan', nameEn: 'Car loan', nameAr: 'قرض سيارة', segment: 'CONSUMER',
    structure: 'Secured amortising loan (vehicle mortgage)', pricingMode: 'BANDED_APR' }), 'car_loan manifest');
  const pol = E.getPolicy('car_loan');
  eq(JSON.stringify(pol.regulatory), JSON.stringify({ dbrCapPct: 50, dbrCapRetireePct: 30, ltvCapPct: 80, tenorCapMonths: 60, aecbCheckRequired: true,
    coolingOffDays: 5, earlySettlementFeeCap: '1% of outstanding or AED 10,000', security: 'Vehicle mortgage registered with the RTA in favour of the lender' }),
    'car_loan regulatory primitives (locked): DBR 50/30, LTV 80, 60 months, AECB, 5 days, early-settlement cap, RTA mortgage');
  eq(JSON.stringify(pol.params), JSON.stringify({ minSalary: 8000, minAge: 21, maxAge: 65, scoreDecline: 620, scoreRefer: 680, minMonthsInUae: 6, chequeReturnsMax: 1,
    minAmount: 20000, productCap: 750000, maxVehicleAgeYears: 5, regularIncomeCountedPct: 75, regularIncomeMinMonths: 12, instalmentToFcfMaxPct: 50,
    pricingBands: { A: [0.0399, 0.0499], B: [0.0549, 0.0649], C: [0.0749, 0.0899] }, tokenValidityDays: 14 }), 'car_loan params');
  ok(pol.platform && pol.platform.repaymentCollection && pol.platform.repaymentCollection.editable === false && pol.platform.repaymentCollection.altareqMaxAmount === 1000,
     'car_loan pack carries the locked repayment platform rule');
  ok(E.policyHistory('car_loan').length === 1 && pol.version === 1, 'car_loan pack v1 with a baseline history entry');
  const meta = { author: 'R. Haddad (Credit Policy)', approver: 'S. Nair (CRO)' };
  throwsWith(() => E.publishPolicy('car_loan', { ltvCapPct: 90 }, meta), 'locked regulatory primitive', 'publish refuses ltvCapPct (locked)');
  throwsWith(() => E.publishPolicy('car_loan', { tenorCapMonths: 72 }, meta), 'locked regulatory primitive', 'publish refuses tenorCapMonths (locked)');
  throwsWith(() => E.publishPolicy('car_loan', { regularIncomeCountedPct: 120 }, meta), 'outside allowed bounds [0, 100]', 'regularIncomeCountedPct bounded [0, 100]');
  throwsWith(() => E.publishPolicy('car_loan', { maxVehicleAgeYears: 11 }, meta), 'outside allowed bounds [0, 10]', 'maxVehicleAgeYears bounded [0, 10]');
  throwsWith(() => E.publishPolicy('car_loan', { productCap: 50000 }, meta), 'outside allowed bounds [100000, 2000000]', 'productCap bounded [100000, 2000000]');
  throwsWith(() => E.publishPolicy('car_loan', { minAmount: 1000 }, meta), 'outside allowed bounds [5000, 100000]', 'minAmount bounded [5000, 100000]');
  throwsWith(() => E.publishPolicy('car_loan', { instalmentToFcfMaxPct: 90 }, meta), 'outside allowed bounds [10, 80]', 'instalmentToFcfMaxPct bounded [10, 80]');
  throwsWith(() => E.publishPolicy('car_loan', { altareqMaxAmount: 5000 }, meta), 'platform rule', 'the platform rule is not editable on the car pack');
  eq(E.getPolicy('car_loan').version, 1, 'refused publishes leave car_loan at v1');
  const ex = E.execSteps('car_loan');
  ok(ex.length === 6 && ex.map(s => s.type).join() === E.EXEC_EVENTS.join() &&
     ex[5].description === 'Partner Bank pays the dealer; the car is released with the mortgage registered' && ex[0].label === 'Offer accepted',
     'execSteps(car_loan): the same 6 events and labels; DISBURSED reads "Partner Bank pays the dealer; the car is released with the mortgage registered"');

  // ---- both paths, the spec's exact numbers ----
  const t0 = E.listDecisions().length;
  const of = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR });
  const dc = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: DOCS });
  collect(of.reasonCodes); collect(dc.reasonCodes);
  eq(E.listDecisions().length, t0 + 2, 'two decide() calls → exactly two DecisionRecords (the uplift stores nothing)');
  eq(new Date(dc.createdAt) - new Date(of.createdAt), 37000, 'one clock tick per decide() — the uplift re-evaluation never ticks the clock');
  eq(dc.id, 'MZN-' + String(Number(of.id.slice(4)) + 1).padStart(6, '0'), 'decision ids continue without a gap');
  const k = of.pricing.kfs, kd = dc.pricing.kfs;
  // Documents only
  ok(dc.outcome === 'APPROVE' && dc.limit.approved === 150000 && dc.limit.bindingConstraint === 'DBR' && dc.reasonCodes.join() === 'RC_LIMIT_REDUCED',
     'documents only: APPROVE AED 150,000, DBR binds, RC_LIMIT_REDUCED');
  ok(dc.features.incomeCounted === 45000 && dc.features.headroomMonthly === 2800 && dc.features.regularIncomeCountedMonthly === 0 && dc.features.openFinance === false,
     'documents only: income counted 45,000 (salary only), DBR headroom 2,800/month');
  ok(dc.score.points === 780 && dc.score.grade === 'A' && dc.noorScore.value === 780 && dc.noorScore.band === 'Excellent' && dc.score.base === 790 &&
     dc.score.overlays.map(o => o.name + ' ' + o.delta).join('|') === 'ESR > 40% -20|Employment tenure ≥ 24m 10',
     'documents only: NoorScore 780 (790 − 20 ESR + 10 tenure) · A · Excellent');
  ok(kd.rateMid === 0.0449 && kd.tenorMonths === 60 && kd.monthlyInstalment === 2795.77 && kd.totalRepayable === 167746.25 && kd.totalInterest === 17746.25,
     'documents only: 4.49% APR (mid A), AED 2,795.77 × 60, total repayable AED 167,746.25');
  ok(dc.features.dbrPct === 49.99 && kd.downPayment === 75000 && dc.features.downPayment === 75000 && kd.ltvPct === 66.67 && dc.features.instalmentToFcfPct === null,
     'documents only: DBR 49.99%, down payment AED 75,000, LTV 66.67%, no free-cash-flow share (spending not seen)');
  // With Open Finance
  ok(of.outcome === 'APPROVE' && of.limit.approved === 180000 && of.limit.bindingConstraint === 'LTV_CAP' && of.reasonCodes.length === 0,
     'Open Finance: APPROVE AED 180,000, the 80% LTV maximum (= request) binds, no reduction');
  ok(of.features.incomeCounted === 51750 && of.features.regularIncomeCountedMonthly === 6750 && of.features.headroomMonthly === 6175 &&
     of.features.salaryVerifiedViaConnectedAccount === true && of.features.openFinance === true,
     'Open Finance: income counted 51,750 (45,000 + 75% × 9,000), headroom 6,175/month, salary verified in connected accounts');
  ok(of.score.points === 795 && of.score.grade === 'A' && of.noorScore.band === 'Excellent' &&
     of.score.overlays.some(o => o.name === 'Salary verified via connected account' && o.delta === 15), 'Open Finance: NoorScore 795 (+15 salary via connected account) · A · Excellent');
  ok(k.rateMid === 0.0449 && k.monthlyInstalment === 3354.93 && k.totalRepayable === 201295.5 && k.totalInterest === 21295.5,
     'Open Finance: 4.49% APR, AED 3,354.93 × 60, total repayable AED 201,295.50');
  ok(of.features.dbrPct === 44.55 && of.features.dbrPctSalaryOnly === 51.23 && k.downPayment === 45000 && k.ltvPct === 80,
     'Open Finance: DBR 44.55% (51.23% on salary alone — over the cap), down payment AED 45,000, LTV 80%');
  ok(of.features.freeCashFlowMonthly === 16300 && of.features.instalmentToFcfPct === 20.6, 'Open Finance: instalment = 20.6% of free cash flow AED 16,300');
  // Independent arithmetic for both instalments and the DBR headroom PVs
  const i = 0.0449 / 12, pv = (pmt, n) => pmt * (1 - Math.pow(1 + i, -n)) / i, pay = (P, n) => P * i / (1 - Math.pow(1 + i, -n));
  ok(Math.floor(pv(2800, 60) / 1000) * 1000 === 150000 && Math.floor(pv(6175, 60) / 1000) * 1000 > 180000 &&
     Math.round(pay(150000, 60) * 100) / 100 === 2795.77 && Math.round(pay(180000, 60) * 100) / 100 === 3354.93,
     'independent annuity math: PV(2,800) floors to 150,000; PV(6,175) exceeds 180,000; instalments 2,795.77 / 3,354.93');
  const trace = (r, key) => r.limit.trace.find(t => t.key === key);
  ok(trace(of, 'DBR').label.startsWith('DBR headroom — 50% of AED 51,750 (salary 45,000 + 75% of rent 9,000) − obligations 19,700 = AED 6,175/month') &&
     trace(dc, 'DBR').label.startsWith('DBR headroom — 50% of AED 45,000 (salary only) − obligations 19,700 = AED 2,800/month'),
     'trace labels in plain words ("DBR headroom — 50% of AED 51,750 (salary 45,000 + 75% of rent 9,000) − obligations 19,700 = AED 6,175/month")');
  ok(of.limit.trace.map(t => t.key).join() === 'REQUESTED,LTV_CAP,DBR,FCF,PRODUCT_CAP' && dc.limit.trace.map(t => t.key).join() === 'REQUESTED,LTV_CAP,DBR,PRODUCT_CAP' &&
     trace(of, 'LTV_CAP').value === 180000 && trace(of, 'FCF').value > 180000 && trace(of, 'PRODUCT_CAP').value === 750000 &&
     of.limit.trace.every(t => t.value % 1000 === 0), 'limit candidates: requested · LTV 80% · DBR PV · FCF PV (spending seen) · product cap, each floored to AED 1,000');
  const rule = (r, id) => r.rules.find(x => x.id === id) || {};
  ok(rule(of, 'REG_LTV_CAP').result === 'PASS' && /^80% \(AED 180,000 of AED 225,000\)/.test(rule(of, 'REG_LTV_CAP').observed) &&
     rule(of, 'REG_LTV_CAP').name === 'Car loan within 80% of the vehicle value (Reg 29/2011)' && rule(dc, 'REG_DBR_CAP').result === 'PASS' && /^49\.99%/.test(rule(dc, 'REG_DBR_CAP').observed),
     'REG_LTV_CAP "Car loan within 80% of the vehicle value (Reg 29/2011)" = approved ÷ price; REG_DBR_CAP 49.99% on the documents path');
  ok(rule(of, 'POL_REGULAR_INCOME').observed === 'Rental income verified — 4 of 4 quarterly receipts in 12 months, matches the tenancy — counted at 75%' &&
     rule(dc, 'POL_REGULAR_INCOME').observed === 'Declared other income not counted — not verifiable in an instant decision' &&
     ['PASS', 'INFO'].includes(rule(of, 'POL_REGULAR_INCOME').result) && rule(dc, 'POL_REGULAR_INCOME').result === 'INFO',
     'POL_REGULAR_INCOME (informational): the Open Finance and documents wording');
  ok(rule(of, 'POL_INSTALMENT_TO_FCF').result === 'PASS' && !dc.rules.some(r => r.id === 'POL_INSTALMENT_TO_FCF'), 'POL_INSTALMENT_TO_FCF only when spending is seen (Open Finance)');
  const want = ['REG_AECB_CHECK', 'REG_TENOR_CAP', 'REG_LTV_CAP', 'REG_DBR_CAP', 'POL_AGE', 'POL_MIN_SALARY', 'POL_MIN_MONTHS_UAE', 'POL_THIN_FILE', 'POL_DELINQUENCY',
                'POL_CHEQUE_RETURNS', 'POL_SCORE_CUTOFF', 'POL_VEHICLE', 'POL_MIN_AMOUNT', 'POL_REGULAR_INCOME', 'POL_INSTALMENT_TO_FCF'];
  ok(want.every(id => of.rules.some(r => r.id === id)) && of.rules.every(r => r.result !== 'FAIL' && r.result !== 'REFER'), 'every rule the addendum names is evaluated; all pass for Karim');
  ok(of.dataPulls.map(p => p.source).join() === 'AECB_CONSUMER,OPEN_FINANCE' && dc.dataPulls.map(p => p.source).join() === 'AECB_CONSUMER,DOCUMENTS',
     'data pulls: AECB + connected accounts (Open Finance) vs AECB + salary certificate (documents)');

  // ---- the uplift: pure, deterministic, the spec's object ----
  const up = of.openFinanceUplift;
  ok(dc.openFinanceUplift === null, 'without Open Finance, openFinanceUplift is null (the UI shows the CTA)');
  eq(JSON.stringify(Object.keys(up.documentsOnly).filter(x => ['outcome', 'approved', 'bindingConstraint', 'monthlyInstalment', 'downPayment', 'dbrPct', 'incomeCounted'].includes(x))),
     JSON.stringify(['outcome', 'approved', 'bindingConstraint', 'monthlyInstalment', 'downPayment', 'dbrPct', 'incomeCounted']), 'uplift rows carry outcome, approved, bindingConstraint, monthlyInstalment, downPayment, dbrPct, incomeCounted');
  const pick = (r) => [r.outcome, r.approved, r.bindingConstraint, r.monthlyInstalment, r.downPayment, r.dbrPct, r.incomeCounted].join('|');
  eq(pick(up.documentsOnly), 'APPROVE|150000|DBR|2795.77|75000|49.99|45000', 'uplift.documentsOnly = APPROVE · 150,000 · DBR · 2,795.77 · 75,000 · 49.99% · 45,000');
  eq(pick(up.openFinance), 'APPROVE|180000|LTV_CAP|3354.93|45000|44.55|51750', 'uplift.openFinance = APPROVE · 180,000 · LTV_CAP · 3,354.93 · 45,000 · 44.55% · 51,750');
  ok(up.upliftAed === 30000 && up.downPaymentSavedAed === 30000, 'upliftAed 30,000 · downPaymentSavedAed 30,000');
  eq(JSON.stringify(up.drivers), JSON.stringify(['Rental income verified — counted at 75% (AED 6,750/month)', 'Salary verified in connected accounts',
    'Obligations reconciled with AECB (no hidden debt)', 'Down payment covered by own funds in connected accounts']), 'uplift drivers (the spec\'s four)');
  eq(up.explanation, 'At AED 180,000 the DBR on salary alone would be 51.23% — over the 50% cap. Verified rent adds AED 6,750/month of counted income and brings it to 44.55%.',
     'uplift explanation line (49.99% / 44.55% / 51.23%)');
  ok(up.salaryOnlyDbrPct === 51.23 && up.regularIncomeCountedMonthly === 6750 && up.ltvMaxAmount === 180000, 'uplift: salary-only DBR 51.23%, 6,750/month counted, LTV maximum 180,000');
  // re-evaluating the same documents-only application by hand gives the uplift's left column
  ok(up.documentsOnly.approved === dc.limit.approved && up.documentsOnly.monthlyInstalment === dc.pricing.kfs.monthlyInstalment && up.documentsOnly.dbrPct === dc.features.dbrPct,
     'uplift.documentsOnly equals a real documents-only decision of the same application');
  // quoteCar(): pure — no record, no tick, and the same uplift
  const nBefore = E.listDecisions().length;
  const q = E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 60, consents: AR });
  const q2 = E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 60, consents: AR });
  const tick = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: DOCS });
  eq(E.listDecisions().length, nBefore + 1, 'quoteCar() creates no DecisionRecord');
  eq(new Date(tick.createdAt) - new Date(dc.createdAt), 37000, 'quoteCar() never advances the engine clock');
  ok(JSON.stringify(q.openFinanceUplift) === JSON.stringify(up) && JSON.stringify(q) === JSON.stringify(q2), 'quoteCar() returns the record\'s uplift, deterministically');
  ok(E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 60, consents: DOCS }).openFinanceUplift === null, 'quoteCar() without Open Finance consent never reads the connected accounts (no uplift)');
  throwsWith(() => E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 60, consents: { openFinance: true } }), 'AECB consent', 'quoteCar() without AECB consent throws');
  // the tenor moves the uplift (36 months: 94,000 → 180,000)
  const r36 = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 36, consents: AR });
  const q36 = E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 36, consents: AR }).openFinanceUplift;
  ok(r36.openFinanceUplift.documentsOnly.approved === 94000 && r36.openFinanceUplift.openFinance.approved === 180000 && r36.openFinanceUplift.upliftAed === 86000 &&
     JSON.stringify(q36) === JSON.stringify(r36.openFinanceUplift), '36 months: documents only AED 94,000 → Open Finance AED 180,000 (+86,000), quote = record');
  ok(Math.floor(pv(2800, 36) / 1000) * 1000 === 94000, 'independent: PV(2,800) over 36 months floors to 94,000');
  const per = [12, 24, 36, 48, 60].map(n => E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: n, consents: AR }).openFinanceUplift);
  ok(per.map(u => u.documentsOnly.approved + '>' + u.openFinance.approved).join(' ') === '32000>72000 64000>141000 94000>180000 122000>180000 150000>180000',
     'per tenor (12/24/36/48/60): 32,000→72,000 · 64,000→141,000 · 94,000→180,000 · 122,000→180,000 · 150,000→180,000');
  ok(per.every(u => u.openFinance.dbrPct <= 50 && u.documentsOnly.dbrPct <= 50), 'every tenor stays within the 50% DBR cap on both paths');

  // ---- clamps, counterfactuals, gates ----
  const big = E.decide({ productId: 'car_loan', applicant: a1, amount: 200000, tenorMonths: 60, consents: AR });
  collect(big.reasonCodes);
  ok(big.outcome === 'APPROVE' && big.limit.approved === 180000 && big.limit.bindingConstraint === 'LTV_CAP' && big.reasonCodes.join() === 'RC_LTV_CAP' &&
     rule(big, 'REG_LTV_CAP').result === 'PASS' && /clamped to AED 180,000/.test(rule(big, 'REG_LTV_CAP').observed), 'LTV clamp: request 200,000 → 180,000 + RC_LTV_CAP (REG_LTV_CAP passes, no RC_LIMIT_REDUCED)');
  const bigDocs = E.decide({ productId: 'car_loan', applicant: a1, amount: 200000, tenorMonths: 60, consents: DOCS });
  ok(bigDocs.limit.approved === 150000 && bigDocs.reasonCodes.join() === 'RC_LTV_CAP,RC_LIMIT_REDUCED', 'documents only at 200,000: RC_LTV_CAP and RC_LIMIT_REDUCED (DBR binds below the LTV)');
  const long = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 72, consents: AR });
  collect(long.reasonCodes);
  ok(long.pricing.kfs.tenorMonths === 60 && long.features.effectiveTenor === 60 && long.reasonCodes.includes('RC_TENOR_CAP') &&
     rule(long, 'REG_TENOR_CAP').observed === '72 → clamped to 60' && rule(long, 'REG_TENOR_CAP').threshold === 60 && long.limit.approved === 180000,
     '60-month clamp: tenor 72 → 60 (RC_TENOR_CAP)');
  const three = clone(a1); three.connected.regularIncome[0].receipts12m = 3;
  const r3of4 = E.decide({ productId: 'car_loan', applicant: three, amount: 180000, tenorMonths: 60, consents: AR });
  ok(r3of4.features.regularIncomeCountedMonthly === 0 && r3of4.features.incomeCounted === 45000 && r3of4.limit.approved === 150000 &&
     rule(r3of4, 'POL_REGULAR_INCOME').observed === 'Rental income not counted — 3 of 4 quarterly receipts in 12 months' && rule(r3of4, 'POL_REGULAR_INCOME').result === 'INFO' &&
     r3of4.openFinanceUplift.upliftAed === 0 && !r3of4.openFinanceUplift.drivers.some(d => /Rental/.test(d)) && r3of4.score.points === 795,
     '3 of 4 quarterly receipts → rent not counted: 150,000 (salary still verified, +15), no uplift');
  const offSchedule = clone(a1); offSchedule.connected.regularIncome[0].onSchedule = false;
  const noTenancy = clone(a1); noTenancy.connected.regularIncome[0].matchesTenancy = false;
  const shortHist = clone(a1); shortHist.connected.monthsAvailable = 9;
  ok([offSchedule, noTenancy, shortHist].every(x => E.decide({ productId: 'car_loan', applicant: x, amount: 180000, tenorMonths: 60, consents: AR }).features.regularIncomeCountedMonthly === 0),
     'rent not counted when off schedule, not matching the tenancy, or with under 12 months of connected history');
  const hidden = clone(a1); hidden.connected.observedObligationsMonthly = 21700;
  const rh = E.decide({ productId: 'car_loan', applicant: hidden, amount: 180000, tenorMonths: 60, consents: AR });
  ok(rh.features.existingObligations === 21700 && rh.features.obligationsReconciled === false &&
     rh.openFinanceUplift.drivers.some(d => /above the AECB figure/.test(d)), 'it works both ways: obligations seen above AECB count (the higher figure)');
  // regularIncomeCountedPct 0 via a candidate pack (published under 4-eyes) → the OF path drops to the DBR limit
  const sim0 = E.simulateBook('car_loan', { regularIncomeCountedPct: 0 });
  const v2 = E.publishPolicy('car_loan', { regularIncomeCountedPct: 0 }, meta);
  const zero = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR });
  collect(zero.reasonCodes);
  ok(v2.version === 2 && zero.policyVersion === 2 && zero.limit.approved === 150000 && zero.limit.bindingConstraint === 'DBR' && zero.features.incomeCounted === 45000 &&
     zero.reasonCodes.join() === 'RC_LIMIT_REDUCED' && zero.openFinanceUplift.upliftAed === 0 && zero.openFinanceUplift.documentsOnly.approved === 150000,
     'regularIncomeCountedPct 0 (candidate pack v2) → the Open Finance path drops to the DBR limit, AED 150,000 — the same as documents only');
  ok(/counted at 0%/.test(rule(zero, 'POL_REGULAR_INCOME').observed), 'POL_REGULAR_INCOME reads "counted at 0%" under the candidate pack');
  ok(E.getDecision(of.id).limit.approved === 180000 && E.getDecision(of.id).policyVersion === 1, 'an existing decision keeps its v1 terms after the publish');
  E.publishPolicy('car_loan', { regularIncomeCountedPct: 75 }, meta);
  // AECB consent, vehicle, eligibility
  throwsWith(() => E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: { openFinance: true } }), 'AECB consent', 'car loan without AECB consent → throws');
  const noCar = clone(a1); delete noCar.vehicleQuote;
  throwsWith(() => E.decide({ productId: 'car_loan', applicant: noCar, amount: 180000, tenorMonths: 60, consents: AR }),
             'a car loan needs the vehicle quote (price, condition, model year)', 'no vehicle quote → throws "a car loan needs the vehicle quote (price, condition, model year)"');
  throwsWith(() => E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR, vehicle: { priceAed: 200000, condition: 'NEW' } }),
             'vehicle quote', 'a vehicle without a model year → throws');
  const old = E.decide({ productId: 'car_loan', applicant: a1, amount: 60000, tenorMonths: 48, consents: AR,
                         vehicle: { category: 'Sedan', condition: 'USED', modelYear: 2019, priceAed: 80000 } });
  collect(old.reasonCodes);
  ok(old.outcome === 'DECLINE' && old.reasonCodes.includes('RC_VEHICLE_INELIGIBLE') && rule(old, 'POL_VEHICLE').result === 'FAIL' && /7 years old/.test(rule(old, 'POL_VEHICLE').observed) &&
     old.limit.approved === 0 && old.token === null && old.repayment === null && old.openFinanceUplift.openFinance.outcome === 'DECLINE',
     'used vehicle older than 5 years (2019) → DECLINE RC_VEHICLE_INELIGIBLE');
  const fiveYears = E.decide({ productId: 'car_loan', applicant: a1, amount: 60000, tenorMonths: 48, consents: AR, vehicle: { category: 'Sedan', condition: 'USED', modelYear: 2021, priceAed: 80000 } });
  ok(fiveYears.outcome === 'APPROVE' && fiveYears.limit.approved === 60000 && fiveYears.request.vehicle.modelYear === 2021, 'a 5-year-old used vehicle (2021) is eligible; application.vehicle overrides the quote');
  const expired = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR, vehicle: Object.assign({}, a1.vehicleQuote, { validUntil: '2026-07-01' }) });
  ok(expired.outcome === 'DECLINE' && expired.reasonCodes.includes('RC_VEHICLE_INELIGIBLE') && /expired/.test(rule(expired, 'POL_VEHICLE').observed), 'an expired dealer quote → DECLINE RC_VEHICLE_INELIGIBLE');
  const tiny = E.decide({ productId: 'car_loan', applicant: a1, amount: 15000, tenorMonths: 24, consents: AR });
  collect(tiny.reasonCodes);
  ok(tiny.outcome === 'DECLINE' && tiny.reasonCodes.includes('RC_BELOW_MIN_AMOUNT') && rule(tiny, 'POL_MIN_AMOUNT').result === 'FAIL', 'request below AED 20,000 → DECLINE RC_BELOW_MIN_AMOUNT');
  throwsWith(() => E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR, statements: E.parseStatements({ country: 'IN', applicantId: 'r2' }) }),
             'personal-loan and upgrade decisions only', 'home-country statements are refused on a car loan');

  // ---- repayment, token conditions, execution ----
  ok(of.repayment && of.repayment.method === 'DIRECT_DEBIT' && dc.repayment.method === 'DIRECT_DEBIT', 'repayment method DIRECT_DEBIT (AED 180,000 / 150,000 > AED 1,000)');
  eq(JSON.stringify(of.token.conditions), JSON.stringify([KFS_COND, DD_COND, 'Comprehensive motor insurance with Partner Bank as loss payee',
    'Vehicle mortgage registered with the RTA in favour of Partner Bank', 'Down payment of AED 45,000 paid to the dealer']),
    'token conditions: KFS, direct debit, insurance (Partner Bank loss payee), RTA mortgage, down payment AED 45,000');
  ok(dc.token.conditions.includes('Down payment of AED 75,000 paid to the dealer'), 'documents-only token: down payment AED 75,000 (the figure from the record)');
  ok(of.token.expiresAt.slice(0, 10) === plus14 && !of.token.conditions.some(mentionsSalaryTransfer), 'token valid 14 days; no salary-transfer wording');
  throwsWith(() => E.recordEvent(of.id, 'DISBURSED'), 'out of sequence', 'car loan: disbursing first throws');
  for (const t of E.EXEC_EVENTS) E.recordEvent(of.id, t);
  ok(E.getDecision(of.id).status === 'EXECUTED' && E.execSteps('car_loan', of.id)[3].label === 'Direct debit mandate active' &&
     E.getDecision(of.id).events[3].method === 'DIRECT_DEBIT', 'car loan: six steps in order → EXECUTED; repayment step "Direct debit mandate active"');

  // ---- the credit memo: allowlist, vehicle, bands, flags, privacy ----
  const m = E.creditMemo(of.id), sm = E.memoSftpRow(m), md = E.creditMemo(dc.id), smd = E.memoSftpRow(md);
  eq(Object.keys(m).join(','), MEMO_KEYS.join(','), 'car memo has exactly the allowlisted top-level keys');
  ok(forbiddenKeys(m).length === 0 && forbiddenKeys(md).length === 0, 'car memos carry no record internals');
  eq(JSON.stringify(m.terms.vehicle), JSON.stringify({ category: 'SUV', condition: 'NEW', modelYear: 2026, priceAed: 225000, ltvPct: 80, downPayment: 45000 }),
     'memo terms.vehicle {category, condition, modelYear, priceAed, ltvPct, downPayment} — dealer-quote data');
  ok(m.terms.amount === 180000 && m.terms.tenorMonths === 60 && m.terms.apr === 0.0449 && m.terms.monthlyPayment === 3354.93 && m.terms.repaymentMethod === 'DIRECT_DEBIT',
     'memo terms: AED 180,000 · 60 months · 4.49% · AED 3,354.93 · direct debit');
  /* v2.18 — the income bucket is the salary alone (the rent is the additional-income bucket; the share counted never shows); DBR in 5-point steps */
  ok(m.affordability.incomeBand === 'AED 40,000–50,000 / month' && m.affordability.additionalIncomeBand === 'AED 5,000–10,000 / month (rent)' && m.affordability.dbrBand === '40–45%' &&
     m.affordability.freeCashFlowBand === 'AED 5,000+ / month' && m.affordability.instalmentToCashFlowBand === '< 25%' && /^Open Finance \(Al Tareq\), 12 months/.test(m.affordability.incomeVerifiedVia),
     'memo bands: income AED 40,000–50,000 (salary) + additional AED 5,000–10,000 (rent); DBR 40–45%; FCF 5,000+; instalment share < 25%');
  ok(md.affordability.incomeBand === 'AED 40,000–50,000 / month' && md.affordability.additionalIncomeBand === 'Not assessed' && md.affordability.dbrBand === '45–50%' && md.affordability.freeCashFlowBand === null &&
     md.affordability.incomeVerifiedVia === 'Salary certificate', 'documents-only memo: income band AED 40,000–50,000, additional not assessed, DBR 45–50%, no free-cash-flow band, salary certificate');
  ok(m.verification.otherIncome === 'Additional income verified' &&
     m.verification.downPaymentSource === 'Own funds — verified in connected accounts', 'memo flags: otherIncome "Additional income verified" (v2.18, source-agnostic, no share counted) and downPaymentSource');
  ok(md.verification.otherIncome === 'Additional income declared — not verified' && md.verification.downPaymentSource === 'Own funds — declared, not verified',
     'documents-only memo flags: additional income declared, not verified; down payment declared');
  ok(m.noorScore.value === 795 && m.noorScore.band === 'Excellent' && m.bureau.aecbScoreBand === '750–799', 'memo NoorScore 795 Excellent, AECB band 750–799');
  ok(!('sharing' in m) && !/27,000|27000|9,000|6,750|HSBC|Ejari|counted/i.test(JSON.stringify(m)),
     'v2.18: no shared/withheld lists in the memo; the rent amount, receipts, account and the share counted never appear');
  const plMemo = E.creditMemo(decidePersona('personal_loan', P.r1).id);
  ok(!('otherIncome' in plMemo.verification) &&
     !('downPaymentSource' in plMemo.verification) && !('vehicle' in plMemo.terms), 'other products\' memos are unchanged (no vehicle, no car flags)');
  ok(sm.row[2] === 'car_loan' && sm.row[5] === '60' && sm.row[4] === '180000' && sm.row[6] === 'APR 4.49%' && sm.row[7] === '3354.93' && sm.row.length === SFTP_HEADER.length &&
     sm.header.join(',') === SFTP_HEADER.join(','), 'SFTP: the v2.5 sixteen columns in place (v2.18 appends after them); product car_loan, tenor 60');
  const scanOf = carPrivacyScan(m, sm), scanDc = carPrivacyScan(md, smd);
  ok(scanOf.length === 0, 'a1 memo + SFTP (Open Finance): no 9,000 / 27,000 / 6,750 / 54,000 / 18,000 / 16,300 / balances / Mashreq / HSBC / ADCB / 7714 / 3302 / 5568 / "transactions"' + (scanOf.length ? ' (' + scanOf.slice(0, 4).join('; ') + ')' : ''));
  ok(scanDc.length === 0, 'a1 memo + SFTP (documents only): the same privacy scan is clean' + (scanDc.length ? ' (' + scanDc.slice(0, 4).join('; ') + ')' : ''));
  // the scan itself bites: a planted rent figure, a bank name and "transactions" are all caught, and AED 180,000 is not mistaken for 18,000
  const planted = clone(m); planted.verification.otherIncome = 'Rent AED 27,000 into HSBC — 4 transactions'; planted.terms.extra = 9000;
  ok(carPrivacyScan(planted, sm).length >= 4 && carPrivacyScan({ a: 'AED 180,000 and AED 190,000' }, { header: [], row: [] }).length === 0,
     'the privacy scan catches a planted 27,000 / 9,000 / HSBC / "transactions", and never mistakes AED 180,000 for 18,000');
  // and the generic v2.5 scan agrees once the dealer-quote block (allowed exact figures) is set aside
  const noVehicle = clone(m); delete noVehicle.terms.vehicle;
  const gen = privacyScan(E.getDecision(of.id), noVehicle, sm, { incomeBand: T.income(45000), dbrBand: T.dbr(44.55), freeCashFlowBand: T.fcf(16300),
    instalmentToCashFlowBand: T.share(20.6), aecbScoreBand: T.aecb(a1.aecb) });
  ok(gen.length === 0, 'the generic v2.5 recursive scan (raw Open Finance values, bank labels, bands) is also clean' + (gen.length ? ' (' + gen.slice(0, 4).join('; ') + ')' : ''));
  ok(!/Mashreq|HSBC|ADCB|7714|3302|5568/.test(JSON.stringify(m.verification) + JSON.stringify(m.affordability)) && !('openFinanceUplift' in m) && !('openFinanceFindings' in m),
     'the uplift and the findings never reach the memo');
  // the findings exist on the record (internal) and name what the lender never sees
  const fnd = E.getDecision(of.id).openFinanceFindings;
  ok(Array.isArray(fnd) && fnd.map(x => x.key).join() === 'regularIncome,salary,obligations,ownFunds,spending' &&
     /4 of 4 quarterly receipts of AED 27,000 into HSBC ••3302/.test(fnd[0].observation) && /AED 6,750\/month/.test(fnd[0].effect) &&
     /AED 45,000 every month into Mashreq ••7714/.test(fnd[1].observation) && /= the AECB figure/.test(fnd[2].observation) &&
     /3 accounts cover the AED 45,000 down payment/.test(fnd[3].observation) && /20\.6% of free cash flow AED 16,300/.test(fnd[4].effect) && dc.openFinanceFindings === null,
     'record.openFinanceFindings (internal): rent 4 of 4 into HSBC ••3302 → 6,750/month; salary into Mashreq ••7714; obligations = AECB; balances cover the down payment; 20.6% of FCF');

  // ---- reason codes, refer queue, metrics ----
  for (const c of ['RC_LTV_CAP', 'RC_VEHICLE_INELIGIBLE', 'RC_BELOW_MIN_AMOUNT']) {
    ok(D.reasonCodes[c] && D.reasonCodes[c].en && ARABIC.test(D.reasonCodes[c].ar), 'new code ' + c + ' has English + Arabic');
  }
  eq(D.reasonCodes.RC_LTV_CAP.en, 'The amount is limited to 80% of the vehicle\'s value.', 'RC_LTV_CAP wording');
  eq(D.reasonCodes.RC_VEHICLE_INELIGIBLE.en, 'The vehicle does not meet the age or quotation requirements.', 'RC_VEHICLE_INELIGIBLE wording');
  const thin = clone(a1); thin.aecb = { hit: false, score: null, esrPct: null, obligationsMonthly: 0, tradelines: 0, chequeReturns12m: 0, worstDelinquency: 'NONE' };
  const ref = E.decide({ productId: 'car_loan', applicant: thin, amount: 180000, tenorMonths: 60, consents: DOCS });
  collect(ref.reasonCodes);
  const qrow = E.referQueue().find(x => x.id === ref.id);
  ok(ref.outcome === 'REFER' && ref.reasonCodes.includes('RC_THIN_FILE') && qrow && qrow.productId === 'car_loan' && qrow.slaHoursLeft === 8,
     'a thin-file car application refers (RC_THIN_FILE) and sits in the queue with the 8-hour SLA');
  const ovr = E.override(ref.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'S. Nair' });
  ok(ovr.token && ovr.token.conditions.includes('Vehicle mortgage registered with the RTA in favour of Partner Bank') &&
     ovr.token.conditions.some(c => /^Down payment of AED [\d,]+ paid to the dealer$/.test(c)) && /Approved by override/.test(ovr.token.conditions[ovr.token.conditions.length - 1]),
     'an override approval issues the car token conditions too');
  const mt = E.metrics();
  const carN = E.listDecisions().filter(r => r.productId === 'car_loan').length;
  ok(mt.byProduct.car_loan && mt.byProduct.car_loan.decisions === carN && carN > 10, 'metrics byProduct.car_loan counts this session\'s car decisions (' + carN + '; no seeded history for a new pack)');
  eq(mt.totals.decisions, Object.keys(mt.byProduct).reduce((s, x) => s + mt.byProduct[x].decisions, 0), 'totals = sum of byProduct incl. car_loan');

  // ---- simulation ----
  const book = D.sampleBook.car_loan;
  ok(Array.isArray(book) && book.length >= 12 && book.every(r => r.vehicle && Number.isFinite(r.vehicle.priceAed) && ['NEW', 'USED'].includes(r.vehicle.condition) &&
     Number.isInteger(r.vehicle.modelYear) && Number.isFinite(r.amount) && Number.isFinite(r.tenorMonths)), 'sampleBook.car_loan: ' + book.length + ' rows, each with vehicle {priceAed, condition, modelYear} and amount / tenor');
  const raw = book.map(r => E.decideRaw('car_loan', r));
  const mix = ['APPROVE', 'REFER', 'DECLINE'].map(o => raw.filter(x => x.outcome === o).length);
  ok(mix.every(n => n > 0) && mix.join('/') === '8/3/6', 'the car book mixes approve / refer / decline (' + mix.join('/') + ')');
  const sim = E.simulateBook('car_loan', {});
  ok(sim.size === book.length && sim.before.APPROVE === 8 && sim.after.APPROVE === 8 && sim.flips.length === 0 && sim.amountImpact &&
     sim.amountImpact.approvedAmountBefore === sim.amountImpact.approvedAmountAfter, 'simulateBook(car_loan) runs; the live pack replays to itself');
  ok(sim0.after.APPROVE === sim0.before.APPROVE - 1 && sim0.flips.length === 1 && sim0.flips[0].id === 'CL-002' && sim0.flips[0].to === 'DECLINE' &&
     sim0.amountImpact.approvalsReduced === 1 && sim0.amountImpact.approvedAmountAfter < sim0.amountImpact.approvedAmountBefore,
     'regularIncomeCountedPct 0: CL-002 flips to DECLINE (the rent was the difference) and CL-001 shrinks (' + sim0.amountImpact.approvedAmountBefore + ' → ' + sim0.amountImpact.approvedAmountAfter + ')');
  throwsWith(() => E.simulateBook('car_loan', { ltvCapPct: 90 }), 'locked regulatory primitive', 'simulate refuses a locked primitive');
  ok(raw.filter(x => x.outcome === 'APPROVE').every(x => x.dbrPct <= 50), 'every car-book approval stays within the 50% DBR cap');

  // ---- vocabulary + determinism ----
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const carText = JSON.stringify([a1, book, ['RC_LTV_CAP', 'RC_VEHICLE_INELIGIBLE', 'RC_BELOW_MIN_AMOUNT'].map(c => D.reasonCodes[c]), E.getPolicy('car_loan'),
    E.listDecisions().filter(r => r.productId === 'car_loan'), m, md, E.execSteps('car_loan')]);
  ok(!banned.test(carText) && !mentionsSalaryTransfer(carText), 'no banned vocabulary or salary-transfer wording anywhere in the car-loan data, records or memos');
  ok(!/Toyota|Nissan|Lexus|Mercedes|BMW|Audi|Land Cruiser|Patrol|Al-Futtaim|Arabian Automobiles/i.test(JSON.stringify([a1, book])), 'no real car makes, models or dealers');
  function snap() {
    E.init(D);
    const x = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: AR });
    const y = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: DOCS });
    return JSON.stringify([x, y, E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(x.id)), E.quoteCar({ applicant: a1, amount: 180000, tenorMonths: 36, consents: AR }),
                           E.simulateBook('car_loan', { regularIncomeCountedPct: 0 }), E.metrics().byProduct.car_loan]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical car decisions, uplift, memo, quote, simulation and metrics');
  for (const r of E.listDecisions()) collect(r.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. the car loan) exists with Arabic');
});

// ---------------------------------------------------------------------------
// v2.8 — botim placement, digital footprint, contact consent, personal-loan free-cash-flow rule
// (BOTIM-V28-SPEC.md §4, §5, §6, §9).
group('17. Addendum v2.8: assessFootprint, the personal-loan FCF rule, contact preferences — never in the memo', () => {
  E.init(D);
  const j = D.personasJourney[0];
  const OF = { aecb: true, openFinance: true };
  const decideJ = (amount, months, extra) => E.decide({ productId: 'personal_loan', applicant: j, amount, tenorMonths: months, consents: Object.assign({}, OF, extra || {}) });
  const fpBase = j.footprint;
  const fpWith = (patch) => Object.assign(clone(fpBase), patch);

  // ---- data ----
  ok(j.aecb.cardLimitTotal === 12000 && j.aecb.cardBalanceTotal === 7440 && j.aecb.cards === 1 && j.aecb.activeLoans === 1 &&
     Math.round(j.aecb.cardBalanceTotal / j.aecb.cardLimitTotal * 100) === 62, 'j1 card totals: limit 12,000, balance 7,440 → 62% used; 1 card, 1 loan (v2.15)');
  ok(fpBase.vendorScore === 731 && fpBase.emailAgeYearsMin === 7 && fpBase.nameMatchSources === 2 && fpBase.phoneOnMessenger === true &&
     fpBase.velocity.emailSeenByLenders === 1 && fpBase.breaches.count === 1 && fpBase.breaches.includesCredentialStuffingCompilation === false,
     'j1.footprint: vendor 731, email 7 years, 2 name sources, phone on a messenger, 1 lender, 1 breach, no stuffing compilation');
  ok(!/gender|\bmale\b|female|photo|lifestyle|gambl/i.test(JSON.stringify(fpBase)) && !('services' in fpBase) && !('email' in fpBase) && !('phone' in fpBase),
     'j1.footprint is minimised: no gender, photos, lifestyle traits, service names or raw contact details');

  // ---- assessFootprint (pure) ----
  const before = E.listDecisions().length;
  const t0 = E.decide({ productId: 'personal_loan', applicant: P.r1, amount: P.r1.defaultRequest.amount, tenorMonths: P.r1.defaultRequest.tenorMonths, consents: OF });
  const fa = E.assessFootprint(fpBase, { aecb: j.aecb });
  const t1 = E.decide({ productId: 'personal_loan', applicant: P.r1, amount: P.r1.defaultRequest.amount, tenorMonths: P.r1.defaultRequest.tenorMonths, consents: OF });
  eq(E.listDecisions().length, before + 2, 'assessFootprint() creates no DecisionRecord');
  eq(new Date(t1.createdAt) - new Date(t0.createdAt), 37000, 'assessFootprint() never advances the engine clock');
  ok(fa.identity.confidence === 'HIGH' && fa.identity.signals.length === 4 && fa.identity.signals.every(s => s.pass), 'j1: identity HIGH — all four signals pass');
  ok(fa.security.atoRisk === 'NORMAL' && fa.security.action === 'Standard sign-in', 'j1: account-takeover risk NORMAL — standard sign-in');
  ok(fa.creditOverlay.eligible === false && fa.creditOverlay.aecbFile === 'FILE' && fa.creditOverlay.applied === false && fa.creditOverlay.mode === 'SHADOW' &&
     fa.creditOverlay.points === 10 && fa.creditOverlay.cap === 20 && fa.creditOverlay.eligibleWhen === 'thin or no-hit AECB file' && /Not eligible/.test(fa.creditOverlay.status),
     'j1: overlay not eligible (AECB file present) — +10 computed for vendor 731, SHADOW, not applied');
  ok(JSON.stringify(fa.reasonCodes) === '["RC_FOOTPRINT_IDENTITY"]', 'j1 assessment reason codes: RC_FOOTPRINT_IDENTITY only');
  const exItems = fa.excluded.map(x => x.item).join(' | ');
  ok(['Gender', 'Lifestyle traits', 'Individual service names', 'Breach source names', 'Photos', 'Raw contact details'].every(w => exItems.includes(w)) &&
     fa.excluded.every(x => x.reason && /PDPL|CBUAE/.test(x.reason)), 'excluded list: gender, lifestyle traits, service names, breach sources, photos, raw contact details — each with its reason');
  ok(JSON.stringify(E.assessFootprint(fpBase, { aecb: j.aecb })) === JSON.stringify(fa), 'assessFootprint() is deterministic');
  eq(E.assessFootprint(fpBase).creditOverlay.eligible, null, 'without the AECB context, eligibility is left open (eligibleWhen stays stated)');
  eq(E.assessFootprint(fpWith({ nameMatchSources: 1, phoneOnMessenger: false })).identity.confidence, 'MEDIUM', 'identity MEDIUM on 2 of 4 signals');
  eq(E.assessFootprint(fpWith({ emailAgeYearsMin: 1, nameMatchSources: 1, phoneOnMessenger: false })).identity.confidence, 'LOW', 'identity LOW on 1 of 4 signals');
  eq(E.assessFootprint(fpWith({ velocity: { emailSeenByLenders: 3 } })).identity.confidence, 'MEDIUM', 'email seen by 3 lenders: no longer HIGH');
  ok(E.assessFootprint(fpWith({ breaches: { count: 3, includesCredentialStuffingCompilation: false } })).security.atoRisk === 'ELEVATED' &&
     E.assessFootprint(fpWith({ breaches: { count: 1, includesCredentialStuffingCompilation: true } })).security.atoRisk === 'ELEVATED' &&
     E.assessFootprint(fpWith({ breaches: { count: 2, includesCredentialStuffingCompilation: false } })).security.atoRisk === 'NORMAL',
     'ATO ELEVATED on ≥ 3 breaches or a credential-stuffing compilation; 2 breaches stay NORMAL');
  ok(E.assessFootprint(fpWith({ vendorScore: 300 }), { aecbFile: 'NO_HIT' }).creditOverlay.points === 0 &&
     E.assessFootprint(fpWith({ vendorScore: 699 }), { aecbFile: 'NO_HIT' }).creditOverlay.points === 0 &&
     E.assessFootprint(fpWith({ vendorScore: 850 }), { aecbFile: 'NO_HIT' }).creditOverlay.points === 20 &&
     E.assessFootprint(fpWith({ vendorScore: 850 }), { aecbFile: 'NO_HIT', cap: 15 }).creditOverlay.points === 15 &&
     E.assessFootprint(fpWith({ vendorScore: 850 }), { aecbFile: 'NO_HIT', cap: 0 }).creditOverlay.points === 0,
     'overlay positive-only: 300 → 0, 699 → 0, 850 → +20, capped by policy (15 → 15, 0 → 0)');
  ok(E.assessFootprint(fpBase, { aecbFile: 'THIN' }).creditOverlay.eligible === true && E.assessFootprint(fpBase, { aecb: null }).creditOverlay.eligible === true &&
     E.assessFootprint(fpBase, { aecbFile: 'NO_HIT', mode: 'LIVE' }).creditOverlay.applied === true &&
     E.assessFootprint(fpBase, { aecbFile: 'NO_HIT', mode: 'SHADOW' }).creditOverlay.applied === false, 'eligible on a thin or no-hit file; applied only in LIVE mode');
  throwsWith(() => E.assessFootprint(null), 'digital-footprint object', 'assessFootprint(null) throws');
  throwsWith(() => E.assessFootprint({ emailAgeYearsMin: 3 }), 'vendorScore', 'assessFootprint without a vendor score throws');

  // ---- decide(): the footprint pull only with consent; Ravi unchanged either way ----
  const recNo = decideJ(15000, 12);
  const recYes = decideJ(15000, 12, { digitalFootprint: true });
  const recDecl = decideJ(15000, 12, { digitalFootprint: false });
  const idFlagNo = E.creditMemo(recNo.id).verification.identity, idFlagDecl = E.creditMemo(recDecl.id).verification.identity;
  ok(!recNo.dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT') && !recDecl.dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'),
     'no footprint consent (not asked, or declined) → no DIGITAL_FOOTPRINT pull');
  const fpPull = recYes.dataPulls.find(p => p.source === 'DIGITAL_FOOTPRINT');
  ok(!!fpPull && fpPull.summary.identity === 'HIGH' && fpPull.summary.atoRisk === 'NORMAL' && /not eligible/.test(fpPull.summary.overlay), 'with consent → a DIGITAL_FOOTPRINT pull (identity HIGH, ATO NORMAL, overlay not eligible)');
  ok(recYes.features.footprintIdentity === 'HIGH' && recYes.features.footprintAtoRisk === 'NORMAL' && recYes.features.footprintVendorScore === 731 &&
     !('footprintIdentity' in recNo.features), 'features.footprintIdentity / footprintAtoRisk / footprintVendorScore recorded only with consent');
  const pif = recYes.rules.find(r => r.id === 'POL_IDENTITY_FOOTPRINT');
  ok(!!pif && pif.result === 'PASS' && pif.category === 'POLICY' && !recNo.rules.some(r => r.id === 'POL_IDENTITY_FOOTPRINT'), 'rule POL_IDENTITY_FOOTPRINT: PASS when HIGH (only with consent)');
  ok(recYes.consents.digitalFootprint.granted === true && recDecl.consents.digitalFootprint.granted === false && !('digitalFootprint' in recNo.consents),
     'the footprint consent is recorded when asked (granted or declined)');
  const same = (a, b) => a.outcome === b.outcome && a.score.points === b.score.points && a.score.grade === b.score.grade && a.limit.approved === b.limit.approved &&
    a.limit.bindingConstraint === b.limit.bindingConstraint && JSON.stringify(a.pricing) === JSON.stringify(b.pricing) && JSON.stringify(a.reasonCodes) === JSON.stringify(b.reasonCodes) &&
    JSON.stringify(a.token.conditions) === JSON.stringify(b.token.conditions);
  ok(same(recNo, recYes) && same(recNo, recDecl) && recYes.score.points === 737 && recYes.score.grade === 'B' && recYes.limit.approved === 15000 &&
     recYes.pricing.kfs.monthlyInstalment === 1311.7, 'Ravi unchanged with and without footprint consent: 737 · B · AED 15,000 · AED 1,311.70/mo, same reasons and conditions');
  ok(!('footprintOverlay' in recYes.score) && !recYes.score.overlays.some(o => /footprint/i.test(o.name)), 'no overlay on Ravi’s score (AECB file present)');
  ok(!E.decide({ productId: 'personal_loan', applicant: P.r1, amount: P.r1.defaultRequest.amount, tenorMonths: P.r1.defaultRequest.tenorMonths,
                 consents: Object.assign({}, OF, { digitalFootprint: true }) }).dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'),
     'consent without a footprint on the applicant (r1) → no pull');
  const carFp = Object.assign(clone(D.personasCar[0]), { footprint: clone(fpBase) });
  ok(!E.decide({ productId: 'car_loan', applicant: carFp, amount: 180000, tenorMonths: 60, consents: Object.assign({}, OF, { digitalFootprint: true }) })
       .dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'), 'a pack without the overlay params (car loan) never pulls the footprint');
  // ATO ELEVATED: step-up condition + RC_STEP_UP_AUTH, informational only
  const jAto = Object.assign(clone(j), { footprint: fpWith({ breaches: { count: 4, includesCredentialStuffingCompilation: true } }) });
  const recAto = E.decide({ productId: 'personal_loan', applicant: jAto, amount: 15000, tenorMonths: 12, consents: Object.assign({}, OF, { digitalFootprint: true }) });
  collect(recAto.reasonCodes);
  ok(recAto.outcome === recNo.outcome && recAto.limit.approved === recNo.limit.approved && JSON.stringify(recAto.pricing) === JSON.stringify(recNo.pricing) &&
     recAto.score.points === recNo.score.points, 'ATO ELEVATED changes neither the outcome, the amount, the score nor the price');
  ok(recAto.token.conditions.includes('Step-up sign-in (UAE PASS) before disbursement') && recAto.reasonCodes.includes('RC_STEP_UP_AUTH') &&
     recAto.token.conditions.length === recNo.token.conditions.length + 1, 'ATO ELEVATED → token condition "Step-up sign-in (UAE PASS) before disbursement" + RC_STEP_UP_AUTH');
  ok(['RC_FOOTPRINT_IDENTITY', 'RC_FOOTPRINT_OVERLAY', 'RC_STEP_UP_AUTH'].every(c => D.reasonCodes[c] && D.reasonCodes[c].en && ARABIC.test(D.reasonCodes[c].ar)),
     'reason codes RC_FOOTPRINT_IDENTITY, RC_FOOTPRINT_OVERLAY, RC_STEP_UP_AUTH exist in EN + Arabic');

  // ---- the thin-file overlay: SHADOW by default, LIVE only by a 4-eyes publish ----
  ['split', 'starter_loan', 'personal_loan'].forEach(pid => {
    const prm = E.getPolicy(pid).params;
    ok(prm.footprintOverlayMode === 'SHADOW' && prm.footprintOverlayCap === 20, pid + ': footprintOverlayMode SHADOW, footprintOverlayCap 20 by default');
    throwsWith(() => E.simulateBook(pid, { footprintOverlayCap: 31 }), 'outside allowed bounds', pid + ': footprintOverlayCap above 30 is refused');
    throwsWith(() => E.simulateBook(pid, { footprintOverlayMode: 'ON' }), 'SHADOW or LIVE', pid + ': footprintOverlayMode must be SHADOW or LIVE');
  });
  ok(!('footprintOverlayMode' in E.getPolicy('car_loan').params) && !('footprintOverlayMode' in E.getPolicy('salary_advance').params), 'car loan and salary advance packs carry no overlay params');
  const c4fp = Object.assign(clone(P.c4), { footprint: { vendorScore: 742, emailAgeYearsMin: 6, nameMatchSources: 2, phoneOnMessenger: true,
                                                         velocity: { emailSeenByLenders: 1 }, breaches: { count: 1, includesCredentialStuffingCompilation: false } } });
  const splitReq = (cons) => E.decide({ productId: 'split', applicant: c4fp, amount: P.c4.defaultRequest.amount, tenorMonths: P.c4.defaultRequest.tenorMonths, consents: cons });
  const c4None = splitReq(OF), c4Shadow = splitReq(Object.assign({}, OF, { digitalFootprint: true }));
  ok(c4Shadow.outcome === c4None.outcome && c4Shadow.score.points === c4None.score.points && c4Shadow.score.grade === 'C' &&
     JSON.stringify(c4Shadow.pricing) === JSON.stringify(c4None.pricing) && c4Shadow.score.footprintOverlay.delta === 10 && c4Shadow.score.footprintOverlay.applied === false,
     'c4 (AECB no-hit) in SHADOW: +10 recorded, not applied — grade C and price unchanged');
  throwsWith(() => E.publishPolicy('split', { footprintOverlayMode: 'LIVE' }, { author: 'risk.lead', approver: 'Risk.Lead' }), '4-eyes', 'switching the overlay LIVE needs a different approver');
  E.publishPolicy('split', { footprintOverlayMode: 'LIVE' }, { author: 'risk.lead', approver: 'cro' });
  const c4Live = splitReq(Object.assign({}, OF, { digitalFootprint: true }));
  collect(c4Live.reasonCodes);
  ok(c4Live.score.points === c4None.score.points + 10 && c4Live.score.grade === 'B' && c4Live.score.footprintOverlay.applied === true &&
     c4Live.reasonCodes.includes('RC_FOOTPRINT_OVERLAY') && c4Live.pricing.monthlyFeeRate < c4None.pricing.monthlyFeeRate,
     'c4 LIVE: +10 applied → grade B, a lower monthly fee rate, RC_FOOTPRINT_OVERLAY');
  ok(splitReq(OF).score.points === c4None.score.points, 'LIVE without the footprint consent: no overlay — declining is never held against the customer');
  E.init(D);

  // ---- personal-loan free-cash-flow rule (closes open question 7) ----
  const pl = E.getPolicy('personal_loan');
  eq(pl.params.instalmentToFcfMaxPct, 50, 'personal_loan.instalmentToFcfMaxPct = 50 by default');
  throwsWith(() => E.simulateBook('personal_loan', { instalmentToFcfMaxPct: 85 }), 'outside allowed bounds', 'instalmentToFcfMaxPct above 80 is refused');
  throwsWith(() => E.simulateBook('personal_loan', { instalmentToFcfMaxPct: 5 }), 'outside allowed bounds', 'instalmentToFcfMaxPct below 10 is refused');
  for (const id of ['r1', 'r2', 'r3', 'r4', 'r5']) {
    const p = P[id];
    const r = E.decide({ productId: 'personal_loan', applicant: p, amount: p.defaultRequest.amount, tenorMonths: p.defaultRequest.tenorMonths, consents: OF });
    ok(!r.rules.some(x => x.id === 'POL_INSTALMENT_TO_FCF') && !r.limit.trace.some(t => /Free cash flow/.test(t.label)) && r.features.freeCashFlowMonthly === null,
       id + ': no spending data → the FCF rule never runs (no rule, no limit candidate)');
  }
  const simLo = E.simulateBook('personal_loan', { instalmentToFcfMaxPct: 10 }), simHi = E.simulateBook('personal_loan', { instalmentToFcfMaxPct: 80 });
  ok(JSON.stringify(simLo.candidate) === JSON.stringify(simHi.candidate) && JSON.stringify(simLo.candidate) === JSON.stringify(simLo.current),
     'the personal-loan sample book has no spending data: instalmentToFcfMaxPct 10 vs 80 changes no outcome');
  const iMid = 0.0899 / 12, pvMid = (pmt, n) => pmt * (1 - Math.pow(1 + iMid, -n)) / iMid;
  const pq = E.prequalify(j, OF);
  const want = { 6: 10000, 12: 21000, 24: 40000 };
  [6, 12, 24].forEach(n => {
    const capMid = Math.floor(pvMid(1850, n) / 1000) * 1000;
    const r = decideJ(500000, n);
    const fcfRow = r.limit.trace.find(t => /^Free cash flow — 50% of AED 3,700\/month/.test(t.label));
    ok(capMid === want[n] && !!fcfRow && fcfRow.value === want[n] && r.limit.approved === want[n] && r.limit.bindingConstraint === 'FCF',
       'Ravi ' + n + ' months: FCF cap at mid-rate 8.99% = AED ' + want[n].toLocaleString('en-US') + ' (50% of 3,700 = 1,850/mo), FCF binds');
    eq(pq.maxByTermMonths[n], want[n], 'the prequalify() cap for ' + n + ' months equals the decide() FCF cap');
    ok(pq.maxByTermMonths[n] <= r.limit.approved, 'pre-qualification never promises more than decide() allows — ' + n + ' months');
    const atCap = decideJ(pq.maxByTermMonths[n], n);
    ok(atCap.outcome === 'APPROVE' && atCap.limit.approved === pq.maxByTermMonths[n] && !atCap.reasonCodes.includes('RC_LIMIT_REDUCED') &&
       atCap.pricing.kfs.monthlyInstalment <= 1850, n + ' months: applying for the pre-qualified cap is approved in full (instalment ≤ AED 1,850)');
  });
  const big = decideJ(110000, 6);
  collect(big.reasonCodes);
  const bigFcf = big.rules.find(r => r.id === 'POL_INSTALMENT_TO_FCF');
  ok(big.outcome === 'APPROVE' && big.limit.approved === 10000 && big.limit.bindingConstraint === 'FCF' && big.reasonCodes.includes('RC_LIMIT_REDUCED') &&
     !!bigFcf && bigFcf.result === 'PASS', '110,000 / 6 months → reduced to AED 10,000 with FCF binding (was the DBR-only AED 29,000)');
  ok(big.limit.trace.find(t => /DBR headroom/.test(t.label)).value === 29000, 'the DBR headroom alone would have allowed AED 29,000 over 6 months');
  const std = decideJ(15000, 12);
  const stdFcf = std.rules.find(r => r.id === 'POL_INSTALMENT_TO_FCF');
  ok(std.outcome === 'APPROVE' && std.score.points === 737 && std.score.grade === 'B' && std.limit.approved === 15000 && std.limit.bindingConstraint === 'REQUESTED' &&
     std.pricing.kfs.monthlyInstalment === 1311.7 && !!stdFcf && stdFcf.result === 'PASS' && /35\.5% of free cash flow AED 3,700\/month/.test(stdFcf.observed),
     '15,000 / 12 unchanged: APPROVE · 737 · AED 1,311.70 — POL_INSTALMENT_TO_FCF PASS at 35.5% of free cash flow');
  eq(std.features.freeCashFlowMonthly, 3700, 'features.freeCashFlowMonthly = 3,700 — now read by a rule, no longer informational');
  const noOf = E.decide({ productId: 'personal_loan', applicant: j, amount: 110000, tenorMonths: 6, consents: { aecb: true, openFinance: false } });
  ok(!noOf.rules.some(r => r.id === 'POL_INSTALMENT_TO_FCF') && noOf.limit.bindingConstraint === 'DBR_HEADROOM' && noOf.limit.approved === 29000,
     'without Open Finance consent spending is not seen: no FCF rule, DBR binds (AED 29,000)');
  const broke = Object.assign(clone(j), { connected: Object.assign(clone(j.connected), { avgMonthlySpend: 11500 }) });
  const brokeRec = E.decide({ productId: 'personal_loan', applicant: broke, amount: 15000, tenorMonths: 12, consents: OF });
  collect(brokeRec.reasonCodes);
  ok(brokeRec.outcome === 'DECLINE' && brokeRec.reasonCodes.includes('RC_FREE_CASH_FLOW') && brokeRec.rules.find(r => r.id === 'POL_INSTALMENT_TO_FCF').result === 'FAIL',
     'nothing left after spending (FCF −400/month) → DECLINE with RC_FREE_CASH_FLOW');
  E.publishPolicy('personal_loan', { instalmentToFcfMaxPct: 40 }, { author: 'risk.lead', approver: 'cro' });
  const tighter = decideJ(500000, 12);
  ok(tighter.limit.approved === Math.floor(pvMid(1480, 12) / 1000) * 1000 && tighter.limit.approved < 21000 && tighter.limit.bindingConstraint === 'FCF',
     'instalmentToFcfMaxPct is a live policy lever: 40% → AED ' + tighter.limit.approved.toLocaleString('en-US') + ' over 12 months');
  E.init(D);

  // ---- contact preferences: a consent with a reference, never in the memo or the SFTP row ----
  const COMMS = { service: ['PUSH', 'SMS', 'EMAIL'], marketing: ['WHATSAPP'] };
  const n0 = E.listDecisions().length;
  throwsWith(() => decideJ(15000, 12, { communications: { service: [], marketing: [] } }), 'at least one channel', 'no service channel → refused');
  throwsWith(() => decideJ(15000, 12, { communications: { service: ['FAX'], marketing: [] } }), 'unknown contact channel', 'an unknown channel → refused');
  throwsWith(() => decideJ(15000, 12, { communications: ['SMS'] }), 'service', 'communications must be {service, marketing}');
  eq(E.listDecisions().length, n0, 'refused contact preferences create no record');
  const rc = decideJ(15000, 12, { digitalFootprint: true, communications: COMMS });
  const cc = rc.consents.communications;
  ok(!!cc && cc.granted === true && /^CNS-\d{6}-COMMS$/.test(cc.reference) && cc.reference === 'CNS-' + rc.id.slice(4) + '-COMMS' &&
     JSON.stringify(cc.service) === '["EMAIL","SMS","PUSH"]' && JSON.stringify(cc.marketing) === '["WHATSAPP"]' && !!cc.at,
     'consents.communications recorded as a consent with a reference (service EMAIL · SMS · PUSH; marketing WhatsApp)');
  ok(!('communications' in recNo.consents), 'no contact preferences passed → none recorded');
  ok(same(rc, recNo), 'contact preferences change nothing about the decision');
  const memo = E.creditMemo(rc.id), sftp = E.memoSftpRow(memo);
  /* v2.18 §1b — the identity flag is source-agnostic: verified or not verified, never the footprint's confidence */
  eq(memo.verification.identity, 'Identity verified', 'memo identity flag with the footprint check: "Identity verified" (v2.18 — no footprint detail)');
  eq(idFlagNo, 'Identity verified', 'without footprint consent the identity flag is the same');
  eq(idFlagDecl, 'Identity verified', 'a declined footprint check leaves the identity flag the same');
  ok(!('sharing' in memo) && !/footprint|vendor/i.test(JSON.stringify(memo)) && E.NOOR_IP.staysInside.some(g => g.group === 'Raw customer data'),
     'v2.18: the memo names neither the footprint nor the vendor; the Noor-only panel (outside the memo) lists raw customer data as staying inside Noor');
  ok(memo.consents.map(c => c.type).join(',') === 'aecb,openFinance,shareWithLender' && !memo.consents.some(c => /COMMS|FOOT/.test(c.reference)),
     'memo consent references: AECB, Al Tareq, lender only — no contact or footprint consent');
  const memoBody = JSON.stringify(Object.assign({}, memo, { sharing: null }));
  const email = j.contact.email;
  ok(JSON.stringify(rc.applicantSnapshot).includes(email), 'the internal record holds the email (so the scan below is meaningful)');
  const leaks = [email, 'example.com', '@', 'WHATSAPP', 'WhatsApp', 'SMS', 'PUSH', 'EMAIL', 'marketing', 'communications', 'COMMS', 'vendor', 'breach', 'messenger',
                 'emailAge', 'nameMatch', 'velocity', 'footprintVendorScore', 'footprintAtoRisk', 'atoRisk', 'NORMAL', 'r•••••']
    .filter(w => memoBody.toLowerCase().includes(w.toLowerCase()) || sftp.row.join(',').toLowerCase().includes(w.toLowerCase()));
  ok(leaks.length === 0, 'memo + SFTP row: no email, channels, contact preferences or vendor fields' + (leaks.length ? ' (found: ' + leaks.join(', ') + ')' : ''));
  const nums = [];
  (function walk(x) { if (x === null || x === undefined) return; if (Array.isArray(x)) return x.forEach(walk); if (typeof x === 'object') return Object.keys(x).forEach(k => walk(x[k]));
    if (typeof x === 'number') nums.push(x); else if (typeof x === 'string') (x.match(/\d[\d,]*(?:\.\d+)?/g) || []).forEach(t => nums.push(parseFloat(t.replace(/,/g, '')))); })(memo);
  sftp.row.forEach(c => (c.match(/\d[\d,]*(?:\.\d+)?/g) || []).forEach(t => nums.push(parseFloat(t.replace(/,/g, '')))));
  ok(!nums.includes(731) && !nums.includes(7440), 'memo + SFTP row: the vendor score (731) and the card balance (7,440) never appear');
  ok(forbiddenKeys(memo).length === 0 && !/footprint(Identity|AtoRisk|VendorScore)|digitalFootprint|communications|contact/.test(JSON.stringify(Object.keys(memo))),
     'memo keys stay on the allowlist');
  const hits = privacyScan(rc, memo, sftp, { incomeBand: T.income(12000), dbrBand: T.dbr(rc.features.dbrPct), freeCashFlowBand: T.fcf(3700),
    instalmentToCashFlowBand: T.share(rc.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) });
  ok(hits.length === 0, 'j1 memo with footprint + contact consents: the recursive privacy scan stays clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));

  // ---- vocabulary + determinism ----
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const v28Text = JSON.stringify([fa, rc, memo, recAto, D.reasonCodes.RC_FOOTPRINT_IDENTITY, D.reasonCodes.RC_FOOTPRINT_OVERLAY, D.reasonCodes.RC_STEP_UP_AUTH,
                                  E.getPolicy('personal_loan'), big, std]);
  ok(!banned.test(v28Text) && !mentionsSalaryTransfer(v28Text), 'no banned vocabulary or salary-transfer wording in the v2.8 assessments, records, memos or reason codes');
  function snap() {
    E.init(D);
    const a = decideJ(15000, 12, { digitalFootprint: true, communications: COMMS });
    const b = decideJ(110000, 6);
    return JSON.stringify([E.assessFootprint(fpBase, { aecb: j.aecb }), a, b, E.creditMemo(a.id), E.memoSftpRow(E.creditMemo(a.id)), E.prequalify(j, OF)]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical assessment, decisions, memo and SFTP row');
  for (const r of E.listDecisions()) collect(r.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. v2.8) exists with Arabic');
});

// v2.9 — every existing persona outcome, fingerprinted from the v2.7 engine (before the red-flag
// rule existed): outcome · approved · grade · points · binding · reasons · instalment/fee/APR · DBR.
const V27_FINGERPRINTS = {
  'r1': 'APPROVE 150000 A 807 REQUESTED  4596.67 26.4',
  'r2': 'REFER 60000   REQUESTED RC_THIN_FILE 2866.34 16.9',
  'r3': 'APPROVE 56000 B 680 DBR_HEADROOM RC_LIMIT_REDUCED 1780.52 49.9',
  'r4': 'DECLINE 0 E 538 DBR_HEADROOM RC_DELINQUENCY|RC_SCORE_LOW  49.9',
  'r5': 'APPROVE 143000 A 756 RETIREE_CAP RC_RETIREE_CAP|RC_LIMIT_REDUCED 3390.58 30',
  'r2+cp': 'APPROVE 30000 B 751 CROSS_BORDER_HAIRCUT RC_CROSS_BORDER|RC_LIMIT_REDUCED 1370.4 14.5',
  'c1': 'APPROVE 12000 A 806 REQUESTED  2150 14.2',
  'c2': 'REFER 8500 B 707 REQUESTED RC_INCOME_VOLATILITY 1565.42 14.6',
  'c3': 'DECLINE 0 B 683 SPLIT_CAPACITY RC_FREE_CASH_FLOW  13.1',
  'c4': 'APPROVE 4800 C 675 REQUESTED RC_CASH_FLOW_UNDERWRITTEN 908 5',
  'c5': 'DECLINE 0 D 563 REQUESTED RC_DELINQUENCY|RC_SCORE_LOW|RC_CHEQUE_RETURNS  15.2',
  'u1': 'APPROVE 1500   TIER_CAP RC_UPGRADE_BASE 0.42 5.6',
  'u1+st': 'APPROVE 3000   TIER_CAP RC_UPGRADE_ENHANCED 0.35 9.5',
  'u2': 'DECLINE 0   TIER_CAP RC_STARTER_LATE  8.2',
  'u2+st': 'DECLINE 0   TIER_CAP RC_STARTER_LATE  8.5',
  'j1': 'APPROVE 15000 B 737 REQUESTED  1311.7 18.4',
  'a1+of': 'APPROVE 180000 A 795 LTV_CAP  3354.93 44.55',
  'a1+docs': 'APPROVE 150000 A 780 DBR RC_LIMIT_REDUCED 2795.77 49.99',
  'r1 advance': 'APPROVE 13500 A 807 PRODUCT_CAP RC_LIMIT_REDUCED 50 10'
};
function fingerprint(rec) {
  const p = rec.pricing || {};
  const price = p.kfs ? p.kfs.monthlyInstalment : (p.mode === 'MONTHLY_FEE' ? (p.plans || []).filter(x => x.months === p.selectedMonths).map(x => x.monthlyPayment)[0]
    : (p.mode === 'FLAT_FEE' ? p.fee : (p.mode === 'TENOR_CURVE_APR' ? p.aprFloor : null)));
  return [rec.outcome, rec.limit.approved, rec.score.grade || null, Number.isFinite(rec.score.points) ? rec.score.points : null,
          rec.limit.bindingConstraint, rec.reasonCodes.join('|'), price === undefined ? null : price, rec.features.dbrPct === undefined ? null : rec.features.dbrPct].join(' ');
}

group('18. UAE red flags and early warning (v2.9): own-baseline signals, refer-only origination, exit-risk watch', () => {
  E.init(D);
  const ALL = { aecb: true, openFinance: true };
  const byId = (list, id) => D[list].find(p => p.id === id);
  const r6 = byId('personasLoan', 'r6');
  const ML = {}; for (const l of D.monitoredLoans || []) ML[l.id] = l;
  const MON = { phase: 'MONITORING' }, ORIG = { phase: 'ORIGINATION' };
  const codes = (r) => r.flags.map(f => f.code);
  const FORBIDDEN_KEY = /nation|countr|destin|relig|service|merchant|carrier|city|airport/i;
  const keysDeep = (x, out) => { out = out || []; if (x && typeof x === 'object') for (const k of Object.keys(x)) { out.push(k); keysDeep(x[k], out); } return out; };

  // ---- data ----
  eq(D.personasLoan.map(p => p.id).join(','), 'r1,r2,r3,r4,r5,r6', 'personasLoan is r1–r6 (r6 appended; r1–r5 keep their positions)');
  ok(r6 && r6.name === 'Marco Ferreira' && r6.nameAr === 'ماركو فيريرا' && r6.age === 34 && r6.monthsInUae === 24 &&
     r6.employment.salaryMonthly === 14000 && r6.employment.tenureMonths === 20 && /sales executive/i.test(r6.tagline),
     'r6 Marco Ferreira (ماركو فيريرا), 34, 24 months in the UAE, sales executive, salary 14,000, tenure 20 months');
  ok(r6.aecb.hit === true && r6.aecb.score === 694 && r6.aecb.obligationsMonthly === 2100 &&
     r6.redFlagData.aecb.cards === 3 && r6.redFlagData.aecb.cardLimitTotal === 60000 && r6.redFlagData.aecb.cardBalanceTotal === 58200 &&
     r6.redFlagData.baseline.cardUtilisationPct3mAgo === 41, 'r6 AECB: hit, 694, obligations 2,100; 3 cards, limits 60,000, balances 58,200 (97%), 41% three months ago');
  const cn6 = r6.connected, mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  ok(cn6.avgMonthlyIncome === 14000 && cn6.avgMonthlySpend === 6900 && cn6.monthsAvailable === 12 &&
     mean(cn6.monthlyIncome) === 14000 && mean(cn6.monthlySpend) === 6900, 'r6 connected block: income 14,000, spending 6,900, 12 months (monthly series mean = the stated average)');
  const b6 = r6.redFlagData.baseline, n6 = r6.redFlagData.recent;
  ok(b6.intlTransfersShareOfIncome6m === 0.22 && b6.avgBalance3m === 11600 && n6.intlTransfersAed === 12400 && n6.balanceNowAed === 1850 &&
     n6.largestOutboundTransferAed === 7000 && n6.salaryLateDays === 0 && r6.defaultRequest.amount === 40000 && r6.defaultRequest.tenorMonths === 24,
     'r6 redFlagData as specified (22% usual, avg 11,600; 12,400 sent, balance 1,850, one 7,000 transfer out, salary on time); requests 40,000 over 24 months');
  ok(Array.isArray(D.monitoredLoans) && D.monitoredLoans.length === 9 && D.monitoredLoans.map(l => l.id).join(',') === 'ML-01,ML-02,ML-03,ML-04,ML-05,ML-06,ML-07,ML-08,ML-09',
     'MizanData.monitoredLoans: 9 funded loans ML-01 … ML-09 (v2.10 adds the two SME loans, v2.21 the school-fees plan)');
  const surnames = D.monitoredLoans.map(l => l.customer.split(' ').slice(-1)[0]);
  ok(new Set(surnames).size === 9 && new Set(D.monitoredLoans.map(l => l.customer.split(' ')[0])).size === 9, 'monitored loans carry nine different names (' + D.monitoredLoans.map(l => l.customer).join(', ') + ')');
  const badKeys = keysDeep(D.monitoredLoans).concat(keysDeep(r6.redFlagData)).filter(k => FORBIDDEN_KEY.test(k));
  ok(badKeys.length === 0, 'no nationality, country, destination, religion or service field anywhere in monitoredLoans or r6.redFlagData (' + badKeys.join(', ') + ')');
  ok(D.earlyWarning.length === 5, 'the seeded day-zero earlyWarning table is kept (5 rows)');

  // ---- reason codes ----
  const RF = ['RF_CARDS_MAXED', 'RF_REMITTANCE_SURGE', 'RF_TRAVEL_AFTER_DISBURSAL', 'RF_PAYMENTS_STOPPED', 'RF_BALANCES_DRAINED'];
  eq(E.RED_FLAG_CODES.join(','), RF.join(','), 'engine exposes the five RF_* signal codes');
  eq(E.RED_FLAG_ORIGINATION_CODES.join(','), 'RF_CARDS_MAXED,RF_REMITTANCE_SURGE,RF_BALANCES_DRAINED', 'POL_RED_FLAGS refers on cards, remittance surge and drained balances only');
  eq(D.reasonCodes.RC_RED_FLAGS_REVIEW && D.reasonCodes.RC_RED_FLAGS_REVIEW.en, 'Recent changes in your account activity need a quick review by our team.', 'RC_RED_FLAGS_REVIEW English wording');
  for (const c of ['RC_RED_FLAGS_REVIEW'].concat(RF.map(x => 'RC_' + x))) {
    const rc = D.reasonCodes[c];
    ok(rc && rc.en && ARABIC.test(rc.ar || '') && !/\d/.test(rc.en) && !/airline|nationalit|country|India|Pakistan|Egypt|Philippines/i.test(rc.en),
       c + ': English + Arabic, customer-safe (no figures, no airline, no place)');
  }
  const rcKeys = Object.keys(D.reasonCodes);
  const rfAt = rcKeys.indexOf('RC_RED_FLAGS_REVIEW');
  const V210_RC = ['RC_TRADING_HISTORY', 'RC_BUSINESS_HISTORY', 'RC_BUSINESS_CASH_FLOW', 'RC_GUARANTEE_UNVERIFIED', 'RC_GUARANTEE_WEAK', 'RC_RF_REVENUE_DROP', 'RC_RF_FUNDS_TO_OWNER'];
  eq(rcKeys.slice(rfAt, rfAt + 6).join(',') + ' | ' + rcKeys.slice(rfAt + 6).join(','), 'RC_RED_FLAGS_REVIEW,' + RF.map(x => 'RC_' + x).join(',') + ' | ' + V210_RC.join(','),
     'the six new reason codes are appended after every earlier code (only the v2.10 codes follow them)');

  // ---- the shared early-warning block ----
  const blk = E.getPolicy('earlyWarning');
  ok(blk.kind === 'SHARED_BLOCK' && blk.version === 1 && blk.appliesTo.join(',') === 'personal_loan,car_loan,split,sme_working_capital,school_fees,monitoring', 'getPolicy("earlyWarning"): a shared block for personal loan, car loan, split, SME working capital (v2.10), school fees (v2.21) and monitoring, v1');
  eq(JSON.stringify(blk.params), JSON.stringify({ redFlagsAtOrigination: true, cardsMaxedUtilisationPct: 90, cardsMaxedMinCards: 2, cardsMaxedRisePp: 30,
    remittanceShareOfIncomePct: 80, remittanceMultipleOfBaseline: 2, travelMinAmountAed: 1000, travelWindowDays: 30, salaryLateDays: 7, onTimeRunMin: 3,
    balanceDropPct: 80, outboundShareOfAvgBalancePct: 50 }), 'default thresholds = the spec (90% / 2 cards / +30 pp · 80% and 2× · AED 1,000 in 30 days · 7 days or 3 on time · −80% and 50%)');
  ok(blk.guardrails.length === 10 && blk.guardrails.every(g => g.key && g.label && g.text) &&
     ['ownBaseline', 'neverInputs', 'usualLevel', 'travelAlone', 'originationReferOnly', 'contactFirst', 'reasonCodes', 'consentScope', 'governance', 'lenderStatusOnly'].every(k => blk.guardrails.some(g => g.key === k)),
     'the block carries the ten guardrails as locked text');
  const gtext = blk.guardrails.map(g => g.text).join(' ');
  ok(/CBUAE AI\/ML guidance \(Feb 2026\)/.test(gtext) && /Consumer Protection Regulation/.test(gtext) && /PDPL purpose limitation/.test(gtext) && /disparate-impact test/.test(gtext),
     'governance guardrail cites CBUAE AI/ML guidance (Feb 2026), the Consumer Protection Regulation and PDPL; disparate-impact test before LIVE');
  eq(blk.consentWhy, 'To work out what you can afford — and, while you have a loan with Noor, to spot early if repayments might become hard for you.', 'consent scope cites the v2.8 Al Tareq "why" line');
  ok(/Early warning: elevated — Noor is in contact with the customer/.test(gtext), 'lender guardrail: a status flag only');
  throwsWith(() => E.publishPolicy('earlyWarning', { nationality: 'X' }, { author: 'R. Haddad', approver: 'S. Nair' }), 'never be a parameter', 'publish refuses a nationality parameter');
  throwsWith(() => E.publishPolicy('earlyWarning', { destinationCountry: 'X' }, { author: 'R. Haddad', approver: 'S. Nair' }), 'never be a parameter', 'publish refuses a destination parameter');
  throwsWith(() => E.publishPolicy('earlyWarning', { guardrails: [] }, { author: 'R. Haddad', approver: 'S. Nair' }), 'locked guardrail', 'guardrails are locked');
  throwsWith(() => E.publishPolicy('earlyWarning', { travelAlone: false }, { author: 'R. Haddad', approver: 'S. Nair' }), 'locked guardrail', 'a guardrail key cannot be published');
  throwsWith(() => E.publishPolicy('earlyWarning', { remittanceMultipleOfBaseline: 1 }, { author: 'R. Haddad', approver: 'S. Nair' }), ['outside allowed bounds', 'usual level'], 'the remittance multiple cannot go below 1.5× (the usual level would flag)');
  throwsWith(() => E.publishPolicy('earlyWarning', { cardsMaxedMinCards: 2.5 }, { author: 'R. Haddad', approver: 'S. Nair' }), 'whole number', 'card count must be whole');
  throwsWith(() => E.publishPolicy('earlyWarning', { redFlagsAtOrigination: 'no' }, { author: 'R. Haddad', approver: 'S. Nair' }), 'true or false', 'redFlagsAtOrigination is a boolean');
  throwsWith(() => E.publishPolicy('earlyWarning', { salaryLateDays: 5 }, { author: 'R. Haddad', approver: 'r. haddad' }), '4-eyes', 'the block publishes under 4-eyes like every pack');
  throwsWith(() => E.redFlags(r6, { phase: 'MONITORING', params: { remittanceMultipleOfBaseline: 1.2 } }), 'outside allowed bounds', 'a draft passed to redFlags() is bounds-checked like a publish');
  eq(E.getPolicy('earlyWarning').version, 1, 'refused publishes leave the block at v1');

  // ---- each RF_* fires exactly at its threshold and not below it ----
  const base = () => ({ redFlagData: {
    baseline: { intlTransfersShareOfIncome6m: 0.2, salaryCreditDay: 25, avgBalance3m: 10000, cardUtilisationPct3mAgo: 40, onTimePaymentsRun: 4 },
    recent: { incomeAed: 10000, intlTransfersAed: 1000, airlinePurchases: [], salaryLateDays: 0, balanceNowAed: 9000, largestOutboundTransferAed: 1000, missedCollection: false },
    aecb: { cards: 2, cardLimitTotal: 20000, cardBalanceTotal: 4000 } } });
  const mod = (fn) => { const s = base(); fn(s.redFlagData); return s; };
  const fires = (s, code, phase) => codes(E.redFlags(s, { phase: phase || 'MONITORING' })).includes(code);
  const n0 = E.redFlags(base(), MON);
  ok(n0.severity === 'NONE' && n0.flags.length === 0 && n0.checks.length === 5 && n0.action.code === 'NONE', 'a neutral customer: five checks, no flag, severity NONE, no action');
  ok(fires(mod(d => { d.aecb.cardBalanceTotal = 18000; }), 'RF_CARDS_MAXED') && !fires(mod(d => { d.aecb.cardBalanceTotal = 17998; }), 'RF_CARDS_MAXED'),
     'RF_CARDS_MAXED: 90.0% fires, 89.99% does not');
  ok(fires(mod(d => { d.aecb.cardBalanceTotal = 18000; d.baseline.cardUtilisationPct3mAgo = 60; }), 'RF_CARDS_MAXED') &&
     !fires(mod(d => { d.aecb.cardBalanceTotal = 18000; d.baseline.cardUtilisationPct3mAgo = 60.1; }), 'RF_CARDS_MAXED'),
     'RF_CARDS_MAXED: up 30 pp fires, up 29.9 pp does not ("took all limits recently")');
  ok(!fires(mod(d => { d.aecb.cardBalanceTotal = 18000; d.aecb.cards = 1; }), 'RF_CARDS_MAXED'), 'RF_CARDS_MAXED: one card at 90% does not fire (needs ≥ 2 cards)');
  ok(fires(mod(d => { d.recent.intlTransfersAed = 8000; }), 'RF_REMITTANCE_SURGE') && !fires(mod(d => { d.recent.intlTransfersAed = 7999; }), 'RF_REMITTANCE_SURGE'),
     'RF_REMITTANCE_SURGE: 80.0% of income fires, 79.99% does not');
  ok(fires(mod(d => { d.recent.intlTransfersAed = 8000; d.baseline.intlTransfersShareOfIncome6m = 0.4; }), 'RF_REMITTANCE_SURGE') &&
     !fires(mod(d => { d.recent.intlTransfersAed = 8000; d.baseline.intlTransfersShareOfIncome6m = 0.41; }), 'RF_REMITTANCE_SURGE'),
     'RF_REMITTANCE_SURGE: exactly 2× the own 6-month share fires, 1.95× does not');
  ok(fires(mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 30, amountAed: 1000 }]; }), 'RF_TRAVEL_AFTER_DISBURSAL') &&
     !fires(mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 30, amountAed: 999 }]; }), 'RF_TRAVEL_AFTER_DISBURSAL') &&
     !fires(mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 31, amountAed: 1000 }]; }), 'RF_TRAVEL_AFTER_DISBURSAL') &&
     !fires(mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: null, amountAed: 5000 }]; }), 'RF_TRAVEL_AFTER_DISBURSAL'),
     'RF_TRAVEL_AFTER_DISBURSAL: AED 1,000 on day 30 fires; AED 999, day 31 or no disbursal do not');
  ok(!fires(mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 5, amountAed: 3000 }]; }), 'RF_TRAVEL_AFTER_DISBURSAL', 'ORIGINATION') &&
     E.redFlags(base(), ORIG).checks.length === 3 && E.redFlags(base(), ORIG).notEvaluated.join(',') === 'RF_TRAVEL_AFTER_DISBURSAL,RF_PAYMENTS_STOPPED',
     'travel and repayment signals are monitoring-only (origination reads the three origination signals)');
  ok(fires(mod(d => { d.recent.salaryLateDays = 7; }), 'RF_PAYMENTS_STOPPED') && !fires(mod(d => { d.recent.salaryLateDays = 6; }), 'RF_PAYMENTS_STOPPED'),
     'RF_PAYMENTS_STOPPED: salary 7 days late fires, 6 does not');
  ok(fires(mod(d => { d.recent.missedCollection = true; d.baseline.onTimePaymentsRun = 3; }), 'RF_PAYMENTS_STOPPED') &&
     !fires(mod(d => { d.recent.missedCollection = true; d.baseline.onTimePaymentsRun = 2; }), 'RF_PAYMENTS_STOPPED'),
     'RF_PAYMENTS_STOPPED: a missed collection after 3 on time fires, after 2 does not');
  ok(fires(mod(d => { d.recent.balanceNowAed = 2000; d.recent.largestOutboundTransferAed = 5000; }), 'RF_BALANCES_DRAINED') &&
     !fires(mod(d => { d.recent.balanceNowAed = 2001; d.recent.largestOutboundTransferAed = 5000; }), 'RF_BALANCES_DRAINED') &&
     !fires(mod(d => { d.recent.balanceNowAed = 2000; d.recent.largestOutboundTransferAed = 4999; }), 'RF_BALANCES_DRAINED'),
     'RF_BALANCES_DRAINED: −80% with one transfer out of 50% fires; −79.99% or a 49.99% transfer does not');
  const sevAlone = RF.map(c => {
    const s = { RF_CARDS_MAXED: mod(d => { d.aecb.cardBalanceTotal = 19000; }), RF_REMITTANCE_SURGE: mod(d => { d.recent.intlTransfersAed = 9000; }),
                RF_TRAVEL_AFTER_DISBURSAL: mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 3, amountAed: 2000 }]; }),
                RF_PAYMENTS_STOPPED: mod(d => { d.recent.salaryLateDays = 9; }), RF_BALANCES_DRAINED: mod(d => { d.recent.balanceNowAed = 500; d.recent.largestOutboundTransferAed = 8000; }) }[c];
    const r = E.redFlags(s, MON);
    return c + ':' + codes(r).join('+') + '=' + r.severityLabel;
  });
  eq(sevAlone.join(' '), 'RF_CARDS_MAXED:RF_CARDS_MAXED=MEDIUM RF_REMITTANCE_SURGE:RF_REMITTANCE_SURGE=MEDIUM RF_TRAVEL_AFTER_DISBURSAL:RF_TRAVEL_AFTER_DISBURSAL=LOW ' +
     'RF_PAYMENTS_STOPPED:RF_PAYMENTS_STOPPED=MEDIUM RF_BALANCES_DRAINED:RF_BALANCES_DRAINED=MEDIUM', 'severity alone: four MEDIUM signals, travel LOW');
  ok(E.redFlags(mod(d => { d.aecb.cardBalanceTotal = 19000; d.recent.salaryLateDays = 9; }), MON).severityLabel === 'MEDIUM+' &&
     E.redFlags(mod(d => { d.aecb.cardBalanceTotal = 19000; d.recent.salaryLateDays = 9; }), MON).action.slaHours === 4, 'two MEDIUM signals → MEDIUM+ (check-in sooner: 4 hours)');

  // ---- guardrails as behaviour ----
  // Sending money home at the usual level never fires, at ANY legal setting (even when it is 90% of income).
  const usual = mod(d => { d.baseline.intlTransfersShareOfIncome6m = 0.9; d.recent.intlTransfersAed = 9000; });
  const loosest = { remittanceShareOfIncomePct: 50, remittanceMultipleOfBaseline: 1.5 };
  ok(E.redFlags(usual, MON).severity === 'NONE' && E.redFlags(usual, { phase: 'MONITORING', params: loosest }).severity === 'NONE' &&
     /^No flag — sending money home at the usual level \(90%, baseline 90%\)$/.test(E.redFlags(usual, MON).noFlagNote),
     'sending money home at the usual level (90% of income = own baseline) is never a flag, even at the loosest legal thresholds');
  const trip = mod(d => { d.recent.airlinePurchases = [{ daysAfterDisbursal: 1, amountAed: 9000 }]; });
  const tightest = { travelMinAmountAed: 500, travelWindowDays: 60 };
  ok([E.redFlags(trip, MON), E.redFlags(trip, { phase: 'MONITORING', params: tightest })].every(r => r.severity === 'LOW' && r.action.code === 'WATCH' && r.action.slaHours === null &&
     r.guardrailNotes.some(n => /Travel alone is never actioned/.test(n))), 'travel alone is never actioned — LOW, WATCH, no contact, at any legal setting');

  // ---- monitored book: EXIT_RISK needs all three legs ----
  const m1 = E.redFlags(ML['ML-01'], MON);
  ok(m1.severity === 'HIGH' && m1.pattern === 'EXIT_RISK' &&
     codes(m1).join(',') === 'RF_REMITTANCE_SURGE,RF_TRAVEL_AFTER_DISBURSAL,RF_PAYMENTS_STOPPED,RF_BALANCES_DRAINED',
     'ML-01: travel + transfers 85% vs 20% + balances −91% + salary 10 days late → HIGH · EXIT_RISK');
  const f1 = (c) => m1.flags.find(f => f.code === c).values;
  ok(f1('RF_TRAVEL_AFTER_DISBURSAL').amountAed === 2450 && f1('RF_TRAVEL_AFTER_DISBURSAL').daysAfterDisbursal === 9 && f1('RF_REMITTANCE_SURGE').sharePct === 85 &&
     f1('RF_REMITTANCE_SURGE').baselinePct === 20 && f1('RF_BALANCES_DRAINED').dropPct === 91 && f1('RF_PAYMENTS_STOPPED').salaryLateDays === 10,
     'ML-01 values: AED 2,450 nine days after disbursal · 85% vs 20% · −91% · 10 days late');
  ok(m1.action.code === 'SPECIALIST_CALL' && m1.action.slaHours === 24 && m1.action.pausesNewCredit.join(',') === 'Split capacity,Limit increases,Upgrade offers' &&
     m1.lenderStatus === 'Early warning: elevated — Noor is in contact with the customer' && m1.guardrailNotes.some(n => /No default or legal step/.test(n)),
     'HIGH → specialist call within 24h, new credit paused, the lender gets a status flag only, no default or legal step');
  const noTravel = clone(ML['ML-01']); noTravel.redFlagData.recent.airlinePurchases = [];
  const nt = E.redFlags(noTravel, MON);
  ok(nt.severity === 'MEDIUM' && nt.escalated && nt.severityLabel === 'MEDIUM+' && nt.pattern === null && nt.action.code === 'CHECK_IN',
     'ML-01 without the trip drops to MEDIUM+ (three MEDIUM signals, no pattern, check-in)');
  const noMoneyLeg = clone(ML['ML-01']); noMoneyLeg.redFlagData.recent.intlTransfersAed = 3000; noMoneyLeg.redFlagData.recent.balanceNowAed = 12000;
  const nm = E.redFlags(noMoneyLeg, MON);
  ok(nm.pattern === null && nm.severity !== 'HIGH' && codes(nm).join(',') === 'RF_TRAVEL_AFTER_DISBURSAL,RF_PAYMENTS_STOPPED',
     'without the money-out leg (no surge, no drained balances) travel + late salary is not EXIT_RISK');
  const noStress = clone(ML['ML-01']); noStress.redFlagData.recent.salaryLateDays = 0;
  const ns = E.redFlags(noStress, MON);
  ok(ns.pattern === null && ns.severity !== 'HIGH' && !codes(ns).includes('RF_PAYMENTS_STOPPED') && !codes(ns).includes('RF_CARDS_MAXED'),
     'without the stress leg (payments on time, cards not maxed) travel + money out is not EXIT_RISK');
  const cardLeg = clone(noStress); cardLeg.redFlagData.aecb.cardBalanceTotal = 28000; cardLeg.redFlagData.baseline.cardUtilisationPct3mAgo = 40;
  ok(E.redFlags(cardLeg, MON).pattern === 'EXIT_RISK', 'cards maxed completes the stress leg instead of late payments → EXIT_RISK');
  ok(E.redFlags(ML['ML-01'], ORIG).severity !== 'HIGH' && E.redFlags(ML['ML-01'], ORIG).pattern === null, 'EXIT_RISK is a monitoring pattern only (never at origination)');
  const m2 = E.redFlags(ML['ML-02'], MON), m3 = E.redFlags(ML['ML-03'], MON), m4 = E.redFlags(ML['ML-04'], MON), m5 = E.redFlags(ML['ML-05'], MON), m6 = E.redFlags(ML['ML-06'], MON);
  ok(m2.severityLabel === 'MEDIUM' && codes(m2).join() === 'RF_PAYMENTS_STOPPED' && m2.action.code === 'CHECK_IN' && m2.action.offer === 'PAYMENT_DATE_MOVE' && m2.action.slaHours === 8,
     'ML-02: salary 8 days late only → MEDIUM, same-day check-in offering a payment-date move');
  ok(m3.severityLabel === 'MEDIUM' && codes(m3).join() === 'RF_CARDS_MAXED' && m3.flags[0].values.utilisationPct === 96 && m3.flags[0].values.utilisationPct3mAgo === 38,
     'ML-03: cards 38% → 96% → MEDIUM');
  ok(m4.severity === 'LOW' && codes(m4).join() === 'RF_TRAVEL_AFTER_DISBURSAL' && m4.action.code === 'WATCH' && m4.action.slaHours === null,
     'ML-04: one AED 1,900 trip 20 days after disbursal → LOW, WATCH, no contact');
  ok(m5.severity === 'NONE' && m5.flags.length === 0 && m5.action.code === 'NONE' &&
     m5.noFlagNote === 'No flag — sending money home at the usual level (35%, baseline 35%)', 'ML-05: 35% sent every month = the baseline → NONE, with the guardrail note');
  ok(m6.severityLabel === 'MEDIUM' && codes(m6).join() === 'RF_REMITTANCE_SURGE' && m6.flags[0].values.multiple === 3 && m6.flags[0].values.sharePct === 84,
     'ML-06: transfers 84% of income, 3× the usual share → MEDIUM');

  // ---- earlyWarningScan: pure, deterministic, sorted ----
  const scan = E.earlyWarningScan();
  eq(scan.map(r => r.loanId + ':' + r.severityLabel).join(' '), 'ML-01:HIGH ML-07:HIGH ML-02:MEDIUM ML-03:MEDIUM ML-06:MEDIUM ML-08:MEDIUM ML-04:LOW ML-05:NONE ML-09:NONE', 'scan: one row per loan, sorted HIGH → NONE (v2.10 adds ML-07 HIGH and ML-08 MEDIUM; v2.21 ML-09 NONE)');
  ok(scan.every(r => r.customer && r.productId && r.action && Array.isArray(r.flags) && Array.isArray(r.guardrailNotes) && r.guardrailNotes.length) &&
     scan.every(r => r.flags.every(f => f.en && ARABIC.test(f.ar) && f.observed && f.baseline && f.threshold)), 'every row: severity, flags (observed / baseline / threshold, EN + AR), action, guardrail notes');
  ok(scan.find(r => r.loanId === 'ML-02').action.channel === 'In-app message' && scan.find(r => r.loanId === 'ML-06').action.channel === 'SMS' &&
     scan.find(r => r.loanId === 'ML-04').action.channel === null, 'check-ins go to the customer’s chosen channel; a watch contacts nobody');
  const tick0 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: ALL });
  const scanJson = JSON.stringify(E.earlyWarningScan()); for (let i = 0; i < 4; i++) E.earlyWarningScan();
  const tick1 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: ALL });
  ok(scanJson === JSON.stringify(scan) && new Date(tick1.createdAt) - new Date(tick0.createdAt) === 37000, 'earlyWarningScan() is pure: identical output, no clock tick');
  const mm = E.metrics().exitRiskWatch;
  ok(mm && JSON.stringify(mm.counts) === JSON.stringify({ HIGH: 2, MEDIUM: 4, LOW: 1, NONE: 2 }) && mm.rows.length === 9, 'metrics().exitRiskWatch: HIGH 2 · MEDIUM 4 · LOW 1 · NONE 2 (v2.10: + ML-07 HIGH, + ML-08 MEDIUM; v2.21: + ML-09 NONE)');

  // ---- redFlags never reads nationality, country or destination fields ----
  const tagged = clone(r6);
  Object.assign(tagged, { nationality: 'XX', country: 'XX', homeCountry: 'XX', religion: 'XX' });
  Object.assign(tagged.redFlagData, { country: 'XX', nationality: 'XX' });
  tagged.redFlagData.recent.intlTransfersDestination = 'XX';
  tagged.redFlagData.recent.airlinePurchases = [{ daysAfterDisbursal: null, amountAed: 900, destinationCountry: 'XX', airline: 'XX' }];
  const plain = clone(r6); plain.redFlagData.recent.airlinePurchases = [{ daysAfterDisbursal: null, amountAed: 900 }];
  for (const ph of ['ORIGINATION', 'MONITORING']) {
    eq(JSON.stringify(E.redFlags(tagged, { phase: ph })), JSON.stringify(E.redFlags(plain, { phase: ph })), 'a country / nationality / destination field changes nothing (' + ph + ')');
  }
  const t2 = clone(ML['ML-01']); t2.country = 'XX'; t2.redFlagData.recent.airlinePurchases[0].destination = 'XX'; t2.redFlagData.baseline.nationality = 'XX';
  eq(JSON.stringify(E.redFlags(t2, MON)), JSON.stringify(E.redFlags(ML['ML-01'], MON)), 'ML-01 with country, destination and nationality fields: identical HIGH result');
  const dTag = E.decide({ productId: 'personal_loan', applicant: tagged, amount: 40000, tenorMonths: 24, consents: ALL });
  const dPlain = E.decide({ productId: 'personal_loan', applicant: plain, amount: 40000, tenorMonths: 24, consents: ALL });
  ok(dTag.outcome === dPlain.outcome && JSON.stringify(dTag.rules) === JSON.stringify(dPlain.rules) && JSON.stringify(dTag.redFlags) === JSON.stringify(dPlain.redFlags) &&
     JSON.stringify(dTag.reasonCodes) === JSON.stringify(dPlain.reasonCodes), 'decide(): the tagged clone gets the identical outcome, rules, reasons and red flags');
  // A recording proxy proves which fields are read at all: only the allowlist under redFlagData.
  const ALLOWED = new Set(['redFlagData', 'baseline', 'recent', 'aecb', 'intlTransfersShareOfIncome6m', 'salaryCreditDay', 'avgBalance3m', 'cardUtilisationPct3mAgo',
    'onTimePaymentsRun', 'incomeAed', 'intlTransfersAed', 'airlinePurchases', 'daysAfterDisbursal', 'amountAed', 'salaryLateDays', 'balanceNowAed',
    'largestOutboundTransferAed', 'missedCollection', 'cards', 'cardLimitTotal', 'cardBalanceTotal',
    // v2.10 — the business block of an SME loan (the company's own inflows and transfers to the owner)
    'business', 'inflows3mAvgAed', 'usualDrawingsAed', 'sameMonthLastYearDropPct', 'inflowsAed', 'largestTransferToOwnerAed']);
  const ARRAY_INTERNALS = new Set(['length', 'map', 'constructor']);
  function recorder(obj, log) {
    return new Proxy(obj, { get(target, prop, recv) {
      if (typeof prop === 'string') log.add(prop);
      const v = Reflect.get(target, prop, recv);
      return v && typeof v === 'object' ? recorder(v, log) : v;
    } });
  }
  for (const [label, subj] of [['r6 tagged', tagged], ['ML-01 tagged', t2]]) {
    for (const ph of ['ORIGINATION', 'MONITORING']) {
      const log = new Set();
      E.redFlags(recorder(clone(subj), log), { phase: ph });
      const read = [...log].filter(k => !/^\d+$/.test(k) && !ARRAY_INTERNALS.has(k));
      const outside = read.filter(k => !ALLOWED.has(k));
      ok(outside.length === 0 && !read.some(k => FORBIDDEN_KEY.test(k)) && !log.has('name') && !log.has('residency'),
         label + ' (' + ph + '): redFlags() reads only the allowlisted redFlagData fields (outside: ' + outside.join(', ') + ')');
    }
  }

  // ---- origination: r6 REFERs with three flags; with the param off, APPROVE 40,000 ----
  E.init(D);
  const rf = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL });
  collect(rf.reasonCodes);
  ok(rf.outcome === 'REFER' && rf.reasonCodes.join() === 'RC_RED_FLAGS_REVIEW', 'r6 → REFER with RC_RED_FLAGS_REVIEW (the only reason)');
  eq(rf.features.redFlagSignals.join(','), 'RF_CARDS_MAXED,RF_REMITTANCE_SURGE,RF_BALANCES_DRAINED', 'r6 flags: RF_CARDS_MAXED, RF_REMITTANCE_SURGE, RF_BALANCES_DRAINED (signal codes sit on the record as features)');
  const g6 = (c) => rf.redFlags.flags.find(f => f.code === c);
  ok(g6('RF_CARDS_MAXED').values.utilisationPct3mAgo === 41 && g6('RF_CARDS_MAXED').values.utilisationPct === 97 &&
     /^97%/.test(g6('RF_CARDS_MAXED').observed) && /^41%/.test(g6('RF_CARDS_MAXED').baseline), 'r6 cards: 41% → 97%');
  ok(Math.round(g6('RF_REMITTANCE_SURGE').values.sharePct) === 89 && g6('RF_REMITTANCE_SURGE').values.baselinePct === 22 &&
     /^89%/.test(g6('RF_REMITTANCE_SURGE').observed) && /^22% usual/.test(g6('RF_REMITTANCE_SURGE').baseline), 'r6 transfers: 89% of income vs 22% usual');
  ok(Math.round(g6('RF_BALANCES_DRAINED').values.dropPct) === 84 && /\(−84%\)/.test(g6('RF_BALANCES_DRAINED').observed), 'r6 balances: −84% after one AED 7,000 transfer out');
  const rule = rf.rules.find(r => r.id === 'POL_RED_FLAGS');
  ok(rule && rule.result === 'REFER' && rule.category === 'POLICY' && /refer only/.test(rule.name), 'POL_RED_FLAGS recorded as a POLICY rule with result REFER');
  ok(rf.score.grade === 'B' && rf.limit.approved === 40000 && rf.pricing && rf.pricing.band === 'B' && rf.repayment === null && rf.token === null,
     'r6 REFER: grade B, provisional AED 40,000, band-B pricing kept — no token until a person decides');
  ok(rf.redFlags.ruleOn && rf.redFlags.referred && rf.redFlags.phase === 'ORIGINATION' && rf.redFlags.action.code === 'UNDERWRITER_REVIEW' &&
     rf.audit.some(a => a.action === 'RED_FLAGS_READ'), 'record.redFlags (internal) + a RED_FLAGS_READ audit entry');
  ok(E.referQueue().some(q => q.id === rf.id && q.reason === 'RC_RED_FLAGS_REVIEW' && q.redFlags.length === 3 && q.customerAsked === 0),
     'r6 sits in the refer queue with reason RC_RED_FLAGS_REVIEW and its three signal codes');
  // param off (4-eyes publish) → the numbers alone: APPROVE 40,000, grade B
  E.publishPolicy('earlyWarning', { redFlagsAtOrigination: false }, { author: 'R. Haddad (Credit Policy)', approver: 'S. Nair (CRO)' });
  const ap = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL });
  ok(ap.outcome === 'APPROVE' && ap.limit.approved === 40000 && ap.score.grade === 'B' && ap.reasonCodes.length === 0 && ap.repayment.method === 'DIRECT_DEBIT',
     'redFlagsAtOrigination false → APPROVE AED 40,000, grade B (direct debit)');
  ok(ap.rules.find(r => r.id === 'POL_RED_FLAGS').result === 'INFO' && ap.redFlags.ruleOn === false && !('redFlagSignals' in ap.features),
     'with the rule off it is recorded as INFO and no signal is read');
  ok(JSON.stringify(ap.pricing) === JSON.stringify(rf.pricing) && ap.score.points === rf.score.points && ap.features.dbrPct === rf.features.dbrPct,
     'never a price change: pricing, NoorScore and DBR are identical with and without the red-flag rule');
  const hist = E.policyHistory('earlyWarning');
  ok(hist.length === 2 && hist[1].version === 2 && hist[1].changes.length === 1 && hist[1].changes[0].key === 'redFlagsAtOrigination' &&
     hist[1].changes[0].from === true && hist[1].changes[0].to === false && hist[1].approvedBy === 'S. Nair (CRO)', 'block history v2 records redFlagsAtOrigination true → false with its approver');
  E.publishPolicy('earlyWarning', { redFlagsAtOrigination: true }, { author: 'R. Haddad (Credit Policy)', approver: 'S. Nair (CRO)' });
  eq(E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL }).outcome, 'REFER', 'switched back on (v3) → REFER again');
  // Open Finance consent gates the read: no consent, no signals
  const noOf = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: { aecb: true, openFinance: false } });
  ok(noOf.outcome === 'APPROVE' && !noOf.rules.some(r => r.id === 'POL_RED_FLAGS') && !noOf.redFlags, 'without Open Finance consent the red-flag rule is not evaluated (signals come from the customer’s own accounts)');
  // never a decline: with a real decline reason, the outcome is the other rule's; POL_RED_FLAGS stays REFER
  const r6d = clone(r6); r6d.aecb.worstDelinquency = 'DPD90';
  const dd = E.decide({ productId: 'personal_loan', applicant: r6d, amount: 40000, tenorMonths: 24, consents: ALL });
  ok(dd.outcome === 'DECLINE' && dd.reasonCodes[0] === 'RC_DELINQUENCY' && dd.rules.find(r => r.id === 'POL_RED_FLAGS').result === 'REFER' &&
     !dd.rules.some(r => r.id === 'POL_RED_FLAGS' && r.result === 'FAIL'), 'a decline comes from another rule (DPD90); POL_RED_FLAGS itself can only REFER');
  // the same rule on car loan and split
  const carRf = clone(D.personasCar[0]); carRf.redFlagData = clone(r6.redFlagData);
  const cr = E.decide({ productId: 'car_loan', applicant: carRf, amount: 180000, tenorMonths: 60, consents: ALL });
  const spRf = clone(P.c1); spRf.redFlagData = clone(r6.redFlagData);
  const sr = E.decide({ productId: 'split', applicant: spRf, amount: P.c1.defaultRequest.amount, tenorMonths: P.c1.defaultRequest.tenorMonths, consents: ALL });
  ok(cr.outcome === 'REFER' && cr.reasonCodes.includes('RC_RED_FLAGS_REVIEW') && sr.outcome === 'REFER' && sr.reasonCodes.includes('RC_RED_FLAGS_REVIEW'),
     'decide() for car_loan and split reads the same rule (REFER, RC_RED_FLAGS_REVIEW)');
  const adv = E.decide({ productId: 'salary_advance', applicant: r6, amount: 5000, tenorMonths: 1, consents: ALL });
  ok(!adv.rules.some(r => r.id === 'POL_RED_FLAGS'), 'the salary advance is not in the rule’s scope');

  // ---- existing outcomes are unchanged ----
  E.init(D);
  const now = {};
  for (const id of ['r1', 'r2', 'r3', 'r4', 'r5']) now[id] = decidePersona('personal_loan', P[id]);
  now['r2+cp'] = decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } });
  for (const p of D.personasSplit) now[p.id] = decidePersona('split', p);
  for (const p of D.personasUpgrade) {
    now[p.id] = E.decide({ productId: 'starter_loan', applicant: p, consents: ALL });
    now[p.id + '+st'] = E.decide({ productId: 'starter_loan', applicant: p, consents: { aecb: true, openFinance: true, homeStatements: true } });
  }
  for (const p of D.personasJourney) now[p.id] = decidePersona('personal_loan', p);
  for (const p of D.personasCar) {
    now[p.id + '+of'] = decidePersona('car_loan', p);
    now[p.id + '+docs'] = decidePersona('car_loan', p, { consents: { aecb: true, openFinance: false } });
  }
  now['r1 advance'] = decidePersona('salary_advance', P.r1, { amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } });
  eq(Object.keys(now).join(','), Object.keys(V27_FINGERPRINTS).join(','), 'fingerprints cover r1–r5, r2+Credit Passport, c1–c5, u1, u2, j1, a1 (both paths) and the salary advance');
  for (const k of Object.keys(V27_FINGERPRINTS)) eq(fingerprint(now[k]), V27_FINGERPRINTS[k], k + ' unchanged vs the v2.7 engine');
  ok(Object.values(now).every(r => !r.rules.some(x => x.id === 'POL_RED_FLAGS') && !r.redFlags && !('redFlagSignals' in r.features) && !('redFlagsAtOrigination' in r.features)),
     'no existing persona record carries POL_RED_FLAGS, red-flag features or record.redFlags');
  ok([].concat(D.personasSplit, D.personasLoan.filter(p => p.id !== 'r6'), D.personasUpgrade, D.personasJourney, D.personasCar).every(p => !p.redFlagData),
     'existing personas have no redFlagData');
  ok(['split', 'personal_loan', 'starter_loan', 'car_loan'].every(pid => D.sampleBook[pid].every(r => !r.redFlagData && !E.decideRaw(pid, r).reasonCodes.includes('RC_RED_FLAGS_REVIEW'))),
     'the sample books carry no redFlagData — simulations are unchanged');
  const a1rf = clone(D.personasCar[0]); a1rf.redFlagData = clone(r6.redFlagData);
  ok(fingerprint(E.decide({ productId: 'car_loan', applicant: a1rf, amount: 180000, tenorMonths: 60, consents: { aecb: true, openFinance: false } })) === V27_FINGERPRINTS['a1+docs'],
     'redFlagData without Open Finance consent changes nothing (a1, documents path)');

  // ---- Workbench: ask the customer, then approve / decline through the override with a written reason ----
  E.init(D);
  const w = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL });
  throwsWith(() => E.askCustomer(w.id, { analyst: '' }), 'analyst', 'askCustomer needs the analyst');
  const asked = E.askCustomer(w.id, { analyst: 'A. Farsi (Credit Analyst)', note: 'Called — moving abroad? Customer says a family emergency; sent money to help.', channel: 'In-app message' });
  const q0 = asked.customerQueries[0];
  ok(q0 && q0.message.reasonCode === 'RC_RED_FLAGS_REVIEW' && q0.message.en === D.reasonCodes.RC_RED_FLAGS_REVIEW.en && q0.message.ar === D.reasonCodes.RC_RED_FLAGS_REVIEW.ar &&
     q0.explanations.length === 3 && q0.explanations.every(x => x.en && ARABIC.test(x.ar)), 'askCustomer: the customer message uses RC_RED_FLAGS_REVIEW in EN + AR, plus a plain explanation per flag');
  ok(asked.status === 'OPEN' && asked.outcome === 'REFER' && asked.audit.some(a => a.action === 'CUSTOMER_ASKED' && a.actor === 'A. Farsi (Credit Analyst)') &&
     E.referQueue().find(x => x.id === w.id).customerAsked === 1, 'the note is on the record and in the audit; the case stays open in the queue');
  throwsWith(() => E.override(w.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'S. Nair' }), 'written reason', 'a red-flag override needs a written reason');
  throwsWith(() => E.override(w.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'a. farsi', note: 'ok' }), '4-eyes', 'and a second approver');
  const ov = E.override(w.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi (Credit Analyst)', approver: 'S. Nair (CRO)',
                                note: 'One-off family support, salary unchanged, cards paid down plan agreed.' });
  ok(ov.outcome === 'APPROVE' && ov.status === 'OVERRIDDEN' && ov.limit.approved === 40000 && ov.repayment.method === 'DIRECT_DEBIT' && ov.token &&
     !E.referQueue().some(x => x.id === w.id), 'analyst approve with a reason → APPROVE AED 40,000, token and direct debit; dropped from the queue');
  throwsWith(() => E.askCustomer(w.id, { analyst: 'A. Farsi' }), 'open REFER', 'askCustomer refuses a resolved case');
  const w2 = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL });
  const dv = E.override(w2.id, { outcome: 'DECLINE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi (Credit Analyst)', approver: 'S. Nair (CRO)', note: 'Customer confirmed leaving the UAE next month.' });
  ok(dv.outcome === 'DECLINE' && dv.limit.approved === 0 && dv.pricing === null && dv.override.note.length > 0, 'analyst decline with a reason works through the same override');

  // ---- privacy: r6's memo and SFTP row ----
  const FORBID_NUM = [12400, 1850, 7000, 58200, 60000];
  const FORBID_TXT = ['12,400', '12,400.00', '1,850', '7,000', '58,200', '60,000'];
  for (const [label, id] of [['r6 REFER', w2.id === dv.id ? E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL }).id : w2.id], ['r6 approved by override', ov.id]]) {
    const memo = E.creditMemo(id), sftp = E.memoSftpRow(memo);
    const text = JSON.stringify(memo) + '\n' + sftp.header.join(',') + '\n' + sftp.row.join(',');
    const nums = (text.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(t => parseFloat(t.replace(/,/g, '')));
    const hits = FORBID_TXT.filter(t => new RegExp('(^|[^\\d,])' + t.replace(/[.,]/g, '\\$&') + '($|[^\\d])').test(text))
      .concat(FORBID_NUM.filter(n => nums.includes(n)).map(String));
    const signalText = text.split('RC_RED_FLAGS_REVIEW').join('');   // the one allowed code
    ok(hits.length === 0 && !/airline/i.test(text) && !/RF_|red.flag|exit.risk|international transfer|baseline/i.test(signalText),
       label + ': memo + SFTP row never contain 12,400 · 1,850 · 7,000 · 58,200 · 60,000, "airline" or any signal (' + hits.join(', ') + ')');
  }
  const mr = E.creditMemo(E.listDecisions().find(r => r.outcome === 'REFER' && r.applicantSnapshot.id === 'r6').id);
  ok(mr.decision.outcome === 'REFER' && mr.decision.reasonCodes.filter(c => c.colour !== 'GREEN').map(c => c.code).join() === 'R02' && mr.terms === null && !('redFlags' in mr) &&
     !/RC_|RF_/.test(JSON.stringify(mr)), 'r6 memo: REFER + R02 Recent Changes in Account Activity (v2.19: the library code for RC_RED_FLAGS_REVIEW) as its only yellow or red code, and nothing more (no terms, no flags)');

  // ---- simulate before publish ----
  const s1 = E.simulateEarlyWarning({ remittanceShareOfIncomePct: 90 });
  ok(s1.changes.some(c => c.loanId === 'ML-06' && c.from === 'MEDIUM' && c.to === 'NONE') && s1.after.HIGH === 1 &&
     s1.origination.length === 1 && s1.origination[0].id === 'r6' && s1.origination[0].from === 'REFER' && s1.origination[0].to === 'REFER' && s1.origination[0].pricingUnchanged,
     'simulateEarlyWarning: remittance at 90% clears ML-06; ML-01 stays HIGH; r6 still refers (cards + balances), pricing unchanged');
  const s2 = E.simulateEarlyWarning({ redFlagsAtOrigination: false });
  ok(s2.origination[0].from === 'REFER' && s2.origination[0].to === 'APPROVE' && s2.origination[0].amountTo === 40000 && s2.changes.length === 0,
     'simulateEarlyWarning: the origination switch flips r6 to APPROVE 40,000 and leaves monitoring as it is');
  throwsWith(() => E.simulateEarlyWarning({ remittanceMultipleOfBaseline: 1 }), 'outside allowed bounds', 'simulate refuses an out-of-bounds draft');
  eq(E.getPolicy('earlyWarning').version, 1, 'simulation never publishes');

  // ---- vocabulary + determinism ----
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const v29Text = JSON.stringify([r6, D.monitoredLoans, ['RC_RED_FLAGS_REVIEW'].concat(RF.map(x => 'RC_' + x)).map(c => D.reasonCodes[c]), E.getPolicy('earlyWarning'),
    E.earlyWarningScan(), E.listDecisions().filter(r => r.redFlags), s1, s2]);
  ok(!banned.test(v29Text) && !mentionsSalaryTransfer(v29Text), 'no banned vocabulary or salary-transfer wording in the v2.9 data, block, scan or records');
  function snap() {
    E.init(D);
    const x = E.decide({ productId: 'personal_loan', applicant: r6, amount: 40000, tenorMonths: 24, consents: ALL });
    return JSON.stringify([x, E.creditMemo(x.id), E.earlyWarningScan(), E.redFlags(ML['ML-01'], MON), E.simulateEarlyWarning({ salaryLateDays: 9 }), E.metrics().exitRiskWatch]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical r6 record, memo, scan, simulation and exit-risk metrics');
  for (const r of E.listDecisions()) collect(r.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. RC_RED_FLAGS_REVIEW) exists with Arabic');
});

// ---------------------------------------------------------------------------
// v2.10 — SME working capital (SME-SPEC.md). The memo privacy scan: a recursive walk over every memo
// leaf and every SFTP cell; numbers (numeric leaves and every number inside a string, commas stripped)
// must not equal a forbidden figure — matched as whole numbers; bank names and masks as words.
const SME_FORBIDDEN_NUMBERS = [35000, 180000, 21000, 4500, 27600, 200000,
  // beyond the spec's list: other business / owner working figures that must stay with Noor
  13800, 172400, 154000, 156000, 96500, 41200, 46000, 134000, 3200, 1300, 6611.15, 4410, 7302, 2207, 8815];
const SME_FORBIDDEN_WORDS = ['CBD', 'NBF', 'Emirates NBD', 'FAB', 'transactions', 'drawings', 'commingling'];
function smePrivacyScan(memo, sftp) {
  const hits = [];
  const num = (n, where) => { if (SME_FORBIDDEN_NUMBERS.includes(Math.round(Math.abs(n) * 100) / 100)) hits.push(where + ' = ' + n); };
  const str = (s, where) => {
    for (const w of SME_FORBIDDEN_WORDS) if (new RegExp('(^|[^A-Za-z])' + w + '($|[^A-Za-z])', 'i').test(s)) hits.push(where + ' names "' + w + '"');
    for (const tok of s.match(/\d[\d,]*(?:\.\d+)?/g) || []) num(parseFloat(tok.replace(/,/g, '')), where + ' ("' + tok + '")');
  };
  (function walk(x, path) {
    if (x === null || x === undefined) return;
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + '[' + i + ']')); return; }
    if (typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], path + '.' + k); return; }
    if (typeof x === 'number') num(x, path);
    else if (typeof x === 'string') str(x, path);
  })(memo, 'memo');
  sftp.row.forEach((c, i) => str(c, 'sftp.' + sftp.header[i]));
  const raw = JSON.stringify(memo) + '\n' + sftp.row.join(',');
  for (const t of ['35,000', '180,000', '21,000', '4,500', '27,600', '200,000']) {
    if (new RegExp('(^|[^\\d,.])' + t + '(?![\\d]|,\\d)').test(raw)) hits.push('raw text has "' + t + '"');
  }
  return hits;
}

group('19. SME working capital (v2.10): business accounts + the owner’s personal accounts, guarantee factor, business + owner monitoring', () => {
  E.init(D);
  const PID = 'sme_working_capital';
  const s1 = D.personasSme && D.personasSme[0];
  const OWN = { aecb: true, openFinance: true, ownerOpenFinance: true }, BIZ = { aecb: true, openFinance: true, ownerOpenFinance: false };
  const decideSme = (applicant, consents, over) => {
    const r = E.decide(Object.assign({ productId: PID, applicant, amount: 150000, tenorMonths: 12, consents }, over || {}));
    collect(r.reasonCodes); return r;
  };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const FORBIDDEN_KEY = /nation|countr|destin|relig|service|merchant|carrier|city|airport/i;
  const keysDeep = (x, out) => { out = out || []; if (x && typeof x === 'object') for (const k of Object.keys(x)) { out.push(k); keysDeep(x[k], out); } return out; };

  // ---- manifest, pack, bounds ----
  const man = E.manifests().find(m => m.productId === PID);
  eq(JSON.stringify(man), JSON.stringify({ productId: 'sme_working_capital', nameEn: 'Business working capital', nameAr: 'قرض رأس المال العامل', segment: 'SME',
    structure: 'Amortising business loan with the owner\'s personal guarantee', pricingMode: 'BANDED_APR' }), 'manifest exactly as specified (appended sixth; Arabic name uses قرض)');
  const pol = E.getPolicy(PID);
  eq(JSON.stringify(pol.params), JSON.stringify({ minMonthsTrading: 12, minBusinessHistoryMonths: 12, minAmount: 25000, productCap: 500000, tenorMonthsAllowed: [3, 6, 9, 12],
    dscrBudgetPct: 50, revenueMultiple: 1.0, unverifiedGuaranteeFactorPct: 65, ownerDbrCapPct: 50, contingentInstalmentSharePct: 50, ownerBufferMinInstalments: 3,
    scoreDecline: 600, scoreRefer: 650, pricingBands: { A: [0.095, 0.115], B: [0.12, 0.14], C: [0.15, 0.18] }, tokenValidityDays: 14 }), 'params exactly as specified');
  ok(pol.regulatory.aecbCommercialRequired === true && pol.regulatory.aecbConsumerOwnerRequired === true && pol.regulatory.kybRequired === 'Trade licence + UBO' &&
     pol.regulatory.personalGuarantee === 'Owner (individual) — guarantor disclosures in Arabic and English' && pol.regulatory.coolingOffDays === 5,
     'locked block: AECB commercial + owner consumer, KYB "Trade licence + UBO", the owner\'s personal guarantee with AR + EN disclosures (+ the Noor-policy cooling-off)');
  ok(pol.lockedBasis === 'NOOR_POLICY' && /confirm with compliance/.test(pol.lockedNote) && /apply to the owner as guarantor, not to the company/.test(pol.lockedNote),
     'the locked block is labelled Noor policy — "confirm with compliance"; consumer-protection rules apply to the owner as guarantor, not the company');
  ok(pol.platform && pol.platform.repaymentCollection && pol.platform.repaymentCollection.altareqMaxAmount === 1000, 'the platform repayment rule rides on the SME pack');
  const META = { author: 'R. Haddad (Credit Policy)', approver: 'S. Nair (CRO)' };
  throwsWith(() => E.publishPolicy(PID, { personalGuarantee: 'none' }, META), 'confirm with compliance', 'a locked Noor-policy key cannot be published');
  const bounded = { minMonthsTrading: 5, minBusinessHistoryMonths: 30, minAmount: 5000, productCap: 50000, dscrBudgetPct: 90, revenueMultiple: 4, unverifiedGuaranteeFactorPct: 85,
                    ownerDbrCapPct: 60, contingentInstalmentSharePct: 10, ownerBufferMinInstalments: 13, scoreDecline: 500, scoreRefer: 800, tokenValidityDays: 40 };
  for (const k of Object.keys(bounded)) throwsWith(() => E.simulateBook(PID, { [k]: bounded[k] }), 'outside allowed bounds', 'PARAM_BOUNDS refuses ' + k + ' = ' + bounded[k]);
  throwsWith(() => E.simulateBook(PID, { tenorMonthsAllowed: [6, 3] }), 'ascending whole months', 'tenorMonthsAllowed must be ascending');
  throwsWith(() => E.simulateBook(PID, { tenorMonthsAllowed: [3, 6, 36] }), 'ascending whole months', 'tenorMonthsAllowed terms are bounded');
  throwsWith(() => E.simulateBook(PID, { ownerBufferMinInstalments: 2.5 }), 'whole number', 'the buffer minimum is a whole number of instalments');
  throwsWith(() => E.simulateBook(PID, { pricingBands: { A: [0.1, 0.09], B: [0.12, 0.14], C: [0.15, 0.18] } }), 'pricingBands.A', 'pricing bands are validated');
  eq(E.REFER_SLA_HOURS.sme_working_capital, 24, 'REFER_SLA_HOURS.sme_working_capital = 24');

  // ---- persona s1 (as specified) ----
  ok(s1 && s1.id === 's1' && s1.name === 'Kamal Fresh Foods Trading LLC' && s1.owner.name === 'Sara Kamal' && s1.owner.nameAr === 'سارة كمال' && s1.owner.age === 39 &&
     s1.business.tradeLicence.issuedOn === '2022-07-04' && s1.business.aecb.score === 702 && s1.owner.aecb.score === 744 && s1.owner.aecb.obligationsMonthly === 4500 &&
     s1.owner.aecb.obligationsBreakdown.map(o => o.monthly).join('+') === '3200+1300', 's1: Kamal Fresh Foods Trading LLC, owner Sara Kamal (سارة كمال), 39; AECB commercial 702; owner 744, obligations 4,500 (3,200 + 1,300)');
  const bm = s1.business.accounts.months, pa = s1.owner.personalAccounts;
  const rev = bm.map(m => m.credits - m.ownerInjections - m.interAccount), opx = bm.map(m => m.debits - m.interAccount);
  ok(s1.business.accounts.accounts.length === 2 && bm.length === 12 && mean(rev) === 200000 && mean(rev) - mean(opx) === 27600 &&
     bm.reduce((x, m) => x + m.negativeBalanceDays, 0) === 2 && bm.reduce((x, m) => x + m.returnedCheques, 0) === 0 &&
     Math.round(bm.reduce((x, m) => x + m.topCustomer, 0) / rev.reduce((x, y) => x + y, 0) * 100) === 22,
     's1 business accounts: 2 accounts, 12 months, revenue 200,000, NOCF 27,600, 2 negative-balance days, 0 returned cheques, top customer 22% (all derived from the monthly series)');
  ok(mean(pa.drawingsFromBusiness) === 35000 && pa.drawingsFromBusiness.filter(x => x > 0).length === 12 && pa.accounts.reduce((x, a) => x + a.balance, 0) === 180000 &&
     mean(pa.spending) === 21000 && pa.commingling.businessRevenueIntoPersonalAed === 0 && pa.commingling.businessCostsPaidFromPersonalAed === 0,
     's1 owner accounts: drawings 35,000 in 12 of 12 months, liquid balances 180,000, spending 21,000, no commingling');
  ok(s1.defaultRequest.amount === 150000 && s1.defaultRequest.tenorMonths === 12 && /stock order before Ramadan/.test(s1.defaultRequest.purpose), 's1 requests AED 150,000 over 12 months for a stock order before Ramadan');
  const sBad = keysDeep(s1).concat(keysDeep(D.monitoredLoans.slice(6))).filter(k => FORBIDDEN_KEY.test(k));
  ok(sBad.length === 0 && !JSON.stringify([s1, D.monitoredLoans.slice(6)]).match(/nationalit|"country"/i), 'no nationality, country, destination or service field on s1 or the SME monitored loans (' + sBad.join(', ') + ')');

  // ---- consent gate ----
  throwsWith(() => E.decide({ productId: PID, applicant: s1, amount: 150000, tenorMonths: 12, consents: { aecb: true, openFinance: false, ownerOpenFinance: true } }),
             ['business accounts', 'authorised signatory'], 'business Open Finance (the authorised signatory) is required');
  throwsWith(() => E.decide({ productId: PID, applicant: s1, amount: 150000, tenorMonths: 12, consents: { aecb: false, openFinance: true } }), 'AECB consent', 'AECB consent is required');
  eq(E.listDecisions().length, 0, 'refused applications record nothing');

  // ---- the two paths, exactly as the spec's table ----
  const nB = E.listDecisions().length;
  const bz = decideSme(s1, BIZ), ow = decideSme(s1, OWN);
  const fig = (r) => [r.outcome, r.score.points, r.score.grade, r.pricing.kfs.rateMid, r.limit.approved, r.pricing.kfs.monthlyInstalment, r.pricing.kfs.totalRepayable,
                      r.features.dscr, r.features.guaranteeStatus, r.features.guaranteeFactorPct, r.limit.bindingConstraint].join(' ');
  eq(fig(bz), 'APPROVE 732 B 0.13 100000 8931.73 107180.73 3.09 UNVERIFIED 65 GUARANTEE_FACTOR', 'business accounts only: 732 · B · 13.00% · AED 100,000 · 8,931.73 / 107,180.73 · DSCR 3.09× · UNVERIFIED × 65%');
  eq(fig(ow), 'APPROVE 747 A 0.105 150000 13222.29 158667.49 2.09 VERIFIED_STRONG 100 REQUESTED', '+ owner’s personal accounts: 747 · A · 10.50% · AED 150,000 (request binds) · 13,222.29 / 158,667.49 · DSCR 2.09× · VERIFIED_STRONG');
  eq(bz.score.overlays.map(o => o.name + ' ' + o.delta).join(' | '), 'Trading ≥ 3 years 10 | Revenue volatility ≤ 20% 10 | Owner AECB consumer score ≥ 700 10', 'business-only score: 702 + 10 + 10 + 10');
  ok(bz.score.base === 702 && ow.score.base === 702 && ow.score.overlays.some(o => /^Owner’s income verified via connected personal accounts$/.test(o.name) && o.delta === 15) &&
     !bz.score.overlays.some(o => o.delta === 15), 'with the owner’s accounts: +15 owner income verified (only with the personal consent)');
  const dscrRow = (r) => r.limit.trace.find(t => t.key === 'DSCR_CAP');
  ok(dscrRow(bz).value === 154000 && dscrRow(ow).value === 156000 && /50% of net operating cash flow AED 27,600\/month = AED 13,800\/month over 12 months/.test(dscrRow(bz).label),
     'DSCR cap (50% × 27,600 = 13,800/month, 12 months): 154,000 at 13.00% · 156,000 at 10.50%');
  ok(bz.limit.trace.find(t => t.key === 'REVENUE_CAP').value === 200000 && bz.limit.trace.find(t => t.key === 'PRODUCT_CAP').value === 500000, 'revenue cap 200,000 (1.0 × revenue) · product cap 500,000');
  const gRow = bz.limit.trace.find(t => t.key === 'GUARANTEE_FACTOR');
  ok(gRow && gRow.value === 100000 && /^Personal guarantee unverified — 65% of the business capacity/.test(gRow.label), 'trace row "Personal guarantee unverified — 65% of the business capacity" = AED 100,000');
  ok(ow.limit.trace.find(t => t.key === 'GUARANTEE_FACTOR').value === 156000 && /verified \(strong\) — 100%/.test(ow.limit.trace.find(t => t.key === 'GUARANTEE_FACTOR').label), 'strong: 100% of the capacity (156,000); the request binds');
  ok(ow.features.ownerDbrInclContingentPct === 31.7 && ow.features.ownerBufferInstalments === 13.6 && ow.features.ownerDrawingsMonths === 12 && ow.features.comminglingFound === false,
     'owner DBR 31.7% incl. 50% contingent; buffer 13.6 instalments; drawings 12 of 12; no commingling');
  ok(ow.features.avgMonthlyRevenue === 200000 && ow.features.nocfMonthly === 27600 && ow.features.revenueVolatilityPct === 14 && ow.features.negativeBalanceDays === 2 &&
     ow.features.returnedCheques12m === 0 && ow.features.topCustomerPct === 22 && ow.features.tradingMonths === 48, 'business features from data: revenue 200,000 · NOCF 27,600 · volatility 14% · 2 days · 0 cheques · top customer 22% · 48 months trading');
  eq(bz.reasonCodes.join(','), 'RC_GUARANTEE_UNVERIFIED', 'business-only reason: RC_GUARANTEE_UNVERIFIED (the guarantee, not affordability, limits it)');
  eq(ow.reasonCodes.length, 0, 'with the owner’s accounts: no adverse reason');
  eq(ow.rules.map(r => r.id).join(','), 'REG_AECB_CHECK,POL_TENOR,POL_MIN_TRADING,POL_HISTORY_MONTHS,POL_SCORE_CUTOFF,POL_SCORE_REFER,POL_RETURNED_CHEQUES,POL_DSCR,POL_GUARANTEE,POL_RED_FLAGS,POL_MIN_AMOUNT',
     'rules: the spec\'s list (+ POL_TENOR), every one recorded');
  ok(ow.rules.find(r => r.id === 'POL_DSCR').result === 'PASS' && /^2\.09×/.test(ow.rules.find(r => r.id === 'POL_DSCR').observed) && ow.rules.find(r => r.id === 'POL_GUARANTEE').result === 'PASS' &&
     bz.rules.find(r => r.id === 'POL_GUARANTEE').result === 'INFO' && !bz.rules.some(r => r.id === 'POL_RED_FLAGS'), 'POL_DSCR 2.09× PASS; POL_GUARANTEE PASS (strong) / INFO (unverified); no owner red-flag read without her consent');
  ok(bz.segment === 'SME' && ow.segment === 'SME' && ow.consents.ownerOpenFinance.granted === true && bz.consents.ownerOpenFinance.granted === false &&
     /authorised signatory/.test(ow.consents.openFinance.scope) && /while the business loan the owner guarantees is open/.test(ow.consents.ownerOpenFinance.scope),
     'records: segment SME; the business consent (signatory) and the owner’s own consent recorded separately');
  eq(ow.dataPulls.map(p => p.source).join(','), 'AECB_COMMERCIAL,AECB_CONSUMER,KYB,OPEN_FINANCE,OPEN_FINANCE_OWNER', 'pulls: AECB commercial, AECB consumer (owner), KYB, business Open Finance, the owner’s Open Finance');
  eq(bz.dataPulls.map(p => p.source).join(','), 'AECB_COMMERCIAL,AECB_CONSUMER,KYB,OPEN_FINANCE', 'business-only path: no owner pull');
  ok(ow.repayment.method === 'DIRECT_DEBIT' && ow.repayment.account === 'BUSINESS' && /business account/.test(ow.repayment.setup) &&
     ow.token.conditions.join(' | ') === 'Key facts and the personal-guarantee disclosure acknowledged by the owner (AR + EN) | Direct debit mandate active on the company’s business account | Personal guarantee signed by the owner via UAE PASS | Trade licence valid on the day of disbursement',
     'repayment: direct debit on the business account; token: disclosure (AR + EN), mandate, the owner’s guarantee, a valid trade licence');
  const gd = ow.pricing.kfs.guaranteeDisclosure;
  ok(gd && /personally/.test(gd.en) && ARABIC.test(gd.ar) && /كفالة شخصية/.test(gd.ar) && ow.pricing.kfs.coolingOffDays === 5, 'KFS carries the personal-guarantee disclosure in English and Arabic');
  ok(ow.ownerFindings.map(f => f.key).join(',') === 'drawings,ownerDbr,buffer,spending,commingling,redFlags' && ow.ownerFindings.every(f => f.label && f.observation && f.effect) &&
     bz.ownerFindings === null && ow.businessFindings.length === 6, 'internal findings: owner (drawings, DBR, buffer, spending, commingling, red flags) and business; none without her consent');

  // ---- the uplift: +AED 50,000 and 2.5 points cheaper; pure ----
  const up = ow.ownerAccountsUplift;
  ok(up && up.upliftAed === 50000 && up.aprDeltaPts === 2.5 && up.businessOnly.approved === 100000 && up.withOwnerAccounts.approved === 150000 &&
     up.guaranteeFrom === 'UNVERIFIED' && up.guaranteeTo === 'VERIFIED_STRONG' && up.drivers.length >= 3, 'rec.ownerAccountsUplift: +AED 50,000, 2.5 points cheaper (UNVERIFIED → VERIFIED_STRONG)');
  eq(bz.ownerAccountsUplift, null, 'ownerAccountsUplift is null without the personal consent');
  eq(JSON.stringify(up.businessOnly), JSON.stringify(Object.assign({}, up.businessOnly, { outcome: bz.outcome, approved: bz.limit.approved, apr: bz.pricing.kfs.rateMid, noorScore: 732 })),
     'the uplift’s business-only column equals the real business-only decision');
  const n1 = E.listDecisions().length;
  const q1 = E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: 12, consents: OWN });
  const tA = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: CONSENT_ALL });
  const q2 = E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: 12, consents: OWN }); for (let k = 0; k < 3; k++) E.quoteSme({ applicant: s1, amount: 90000, tenorMonths: 6, consents: OWN });
  const tB = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: CONSENT_ALL });
  ok(JSON.stringify(q1.ownerAccountsUplift) === JSON.stringify(up) && JSON.stringify(q1) === JSON.stringify(q2) && E.listDecisions().length === n1 + 2 &&
     new Date(tB.createdAt) - new Date(tA.createdAt) === 37000 && n1 === nB + 2, 'the uplift is pure: quoteSme() returns the same uplift, stores nothing and never ticks the clock');
  throwsWith(() => E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: 12, consents: { aecb: true, openFinance: false } }), 'business accounts', 'quoteSme is consent-bound like decide()');
  eq(E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: 12, consents: BIZ }).ownerAccountsUplift, null, 'quoteSme without the owner’s consent: no uplift');
  const terms = [3, 6, 9, 12].map(n => E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: n, consents: OWN }));
  ok(terms.every(q => q.row.approved > 0 && q.ownerAccountsUplift.upliftAed >= 0) && terms[0].row.approved < terms[3].row.approved, 'quotes for 3 / 6 / 9 / 12 months: a shorter term supports less');

  // ---- guarantee statuses: strong / weak / unverified ----
  const weak = clone(s1); weak.owner.aecb.obligationsMonthly = 12000; weak.owner.personalAccounts.observedObligationsMonthly = 12000;
  const wk = decideSme(weak, OWN);
  ok(wk.features.guaranteeStatus === 'VERIFIED_WEAK' && wk.features.ownerDbrInclContingentPct > 50 && wk.features.guaranteeFactorPct === 80 && wk.limit.approved === 124000 &&
     wk.limit.bindingConstraint === 'GUARANTEE_FACTOR' && wk.reasonCodes.join() === 'RC_GUARANTEE_WEAK' && wk.outcome === 'APPROVE',
     'owner DBR forced over 50% (' + wk.features.ownerDbrInclContingentPct + '%) → VERIFIED_WEAK × 80% → AED 124,000');
  ok(wk.score.points === 747 && wk.pricing.kfs.rateMid === 0.105, 'a weak guarantee changes the amount, not the score or the price');
  const lowBuf = clone(s1); lowBuf.owner.personalAccounts.accounts = [{ bank: 'FAB', type: 'Savings account', mask: '8815', balance: 30000 }];
  ok(decideSme(lowBuf, OWN).features.guaranteeStatus === 'VERIFIED_WEAK', 'a buffer under 3 instalments → VERIFIED_WEAK');
  const irregular = clone(s1); irregular.owner.personalAccounts.drawingsFromBusiness = [35000, 0, 35000, 0, 35000, 35000, 0, 35000, 35000, 35000, 35000, 35000];
  ok(decideSme(irregular, OWN).features.guaranteeStatus === 'VERIFIED_WEAK', 'drawings in only 9 of 12 months → VERIFIED_WEAK');
  ok(bz.features.guaranteeStatus === 'UNVERIFIED' && ow.features.guaranteeStatus === 'VERIFIED_STRONG', 'no personal consent → UNVERIFIED (65%); all four tests pass → VERIFIED_STRONG');

  // ---- owner red flags → REFER (v2.9 rule, never an automatic decline, never a price change) ----
  const rfOwner = clone(s1); Object.assign(rfOwner.owner.personalAccounts.redFlagData.baseline, { intlTransfersShareOfIncome6m: 0.1 });
  rfOwner.owner.personalAccounts.redFlagData.recent.intlTransfersAed = 31000;
  const rr = decideSme(rfOwner, OWN);
  ok(rr.outcome === 'REFER' && rr.reasonCodes.join() === 'RC_RED_FLAGS_REVIEW' && rr.rules.find(r => r.id === 'POL_RED_FLAGS').result === 'REFER' &&
     /the owner’s own history/.test(rr.rules.find(r => r.id === 'POL_RED_FLAGS').name) && rr.features.redFlagSignals.join() === 'RF_REMITTANCE_SURGE',
     'an owner red flag (remittance surge in her own accounts) → REFER with RC_RED_FLAGS_REVIEW only');
  ok(rr.features.guaranteeStatus === 'VERIFIED_WEAK' && rr.pricing.kfs.rateMid === ow.pricing.kfs.rateMid && rr.score.points === ow.score.points && rr.token === null && rr.repayment === null,
     'the guarantee is not strong with an owner red flag (spec) — but the score and the price are unchanged; no token until a person decides');
  ok(!rr.rules.some(r => r.result === 'FAIL') && rr.audit.some(a => a.action === 'RED_FLAGS_READ' && /owner’s own history/.test(a.detail)), 'never a decline; the read is audited as the owner’s history');
  const qRow = E.referQueue().find(q => q.id === rr.id);
  ok(qRow && qRow.segment === 'SME' && qRow.slaHoursLeft === 24 && qRow.redFlags.join() === 'RF_REMITTANCE_SURGE', 'the referral is in the queue: segment SME, SLA 24 hours, its signal code');
  const noOwn = decideSme(rfOwner, BIZ);
  ok(noOwn.outcome === 'APPROVE' && !noOwn.redFlags && !noOwn.rules.some(r => r.id === 'POL_RED_FLAGS'), 'without the owner’s consent her accounts are not read: no red-flag rule');
  E.publishPolicy('earlyWarning', { redFlagsAtOrigination: false }, META);
  const off = decideSme(rfOwner, OWN);
  ok(off.outcome === 'APPROVE' && off.features.guaranteeStatus === 'VERIFIED_STRONG' && off.rules.find(r => r.id === 'POL_RED_FLAGS').result === 'INFO' && off.limit.approved === 150000,
     'red-flag rule off by policy → INFO, nothing read, guarantee strong, AED 150,000');
  E.publishPolicy('earlyWarning', { redFlagsAtOrigination: true }, META);
  throwsWith(() => E.override(rr.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi (Credit Analyst)', approver: 'S. Nair (CRO)' }), 'written reason', 'an SME red-flag override needs a written reason');
  const ov = E.override(rr.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi (Credit Analyst)', approver: 'S. Nair (CRO)', note: 'Owner sent family support from her own salary-like drawings; business unaffected.' });
  ok(ov.outcome === 'APPROVE' && ov.repayment.account === 'BUSINESS' && ov.token && ov.token.conditions.includes('Personal guarantee signed by the owner via UAE PASS'), 'override approve: business-account mandate and the SME conditions');

  // ---- execution: the shared 6 steps, business wording ----
  const st = E.execSteps(PID, ow.id);
  ok(st.length === 6 && st.map(x => x.type).join() === 'OFFER_ACCEPTED,KFS_ACKNOWLEDGED,AGREEMENT_SIGNED,REPAYMENT_SET_UP,COOLING_OFF_CLEARED,DISBURSED' &&
     /personal-guarantee disclosure \(Arabic \+ English\)/.test(st[1].description) && /UAE PASS/.test(st[2].description) && /business account/.test(st[3].description) &&
     /Noor policy for micro businesses/.test(st[4].description) && /confirm with compliance/.test(st[4].description) && /business account/.test(st[5].description),
     'execSteps(sme): the shared 6 steps — owner disclosures AR + EN, UAE PASS, mandate on the business account, cooling-off as Noor policy for micro businesses, disbursed to the business account');
  ok(!st.some(x => /CPR 8\/2020|Consumer Protection Regulation/.test(x.description)), 'no SME step is labelled with the CBUAE consumer-protection regulation');
  throwsWith(() => E.recordEvent(ow.id, 'DISBURSED'), 'out of sequence', 'out-of-order execution is refused');
  for (const t of ['OFFER_ACCEPTED', 'KFS_ACKNOWLEDGED', 'AGREEMENT_SIGNED', 'REPAYMENT_SET_UP']) E.recordEvent(ow.id, t);
  throwsWith(() => E.recordEvent(ow.id, 'DISBURSED'), 'Noor policy for micro businesses', 'disbursing before the cooling-off quotes the Noor-policy guard');
  E.recordEvent(ow.id, 'COOLING_OFF_CLEARED'); E.recordEvent(ow.id, 'DISBURSED');
  ok(E.getDecision(ow.id).status === 'EXECUTED' && /business loan now exists/.test(E.getDecision(ow.id).audit.slice(-1)[0].detail), 'all six steps → EXECUTED, "the business loan now exists"');

  // ---- the credit memo: allowlist, bands only, the owner's personal data withheld ----
  const rr2 = decideSme(rfOwner, OWN);   // an open referral (rr was resolved by the override above)
  for (const [label, rec] of [['owner path', ow], ['business only', bz], ['REFER', rr2], ['override approval', ov], ['weak', wk]]) {
    const memo = E.creditMemo(rec.id), sftp = E.memoSftpRow(memo);
    const hits = smePrivacyScan(memo, sftp);
    ok(hits.length === 0, label + ': memo + SFTP row contain none of 35,000 · 180,000 · 21,000 · 4,500 · 27,600 · 200,000, no bank name or mask (' + hits.slice(0, 4).join(', ') + ')');
    /* v2.18 — the shared/withheld lists left the memo (the Noor-only panel replaces them); the SME memo opens with its output table */
    ok(!('sharing' in memo) && memo.sharingAgreement.label === 'Partner Bank v1' && !('findings' in memo) &&
       memo.outputs.map(o => o.output).join('|') === 'NoorScore and risk band|Reason codes|Revenue bucket|Debt service cover' &&
       !/business capacity|100%|80%/.test(JSON.stringify(memo)), label + ': v2.18 output table (Core + revenue and DSCR rows), no findings for a business (v2.19: no findings key), no guarantee factor');
    const leak = keysDeep(memo).filter(k => /^(features|applicantSnapshot|ownerFindings|businessFindings|guarantee|owner|personalAccounts|business\.accounts|redFlags|dataPulls|rules|audit)$/.test(k) && k !== 'guarantee');
    ok(leak.length === 0 && !/ownerFindings|drawingsFromBusiness|liquidBalances|ownerDbr/.test(JSON.stringify(memo)), label + ': no internal key reaches the memo');
  }
  const mo = E.creditMemo(ow.id), mb = E.creditMemo(bz.id);
  ok(JSON.stringify(mo.terms.business) === JSON.stringify({ companyName: 'Kamal Fresh Foods Trading LLC', tradeLicenceAgeBand: '3–5 years', revenueBand: 'AED 1M–5M a year',
     dscrBand: '2.0–3.0×', guaranteeStatus: 'VERIFIED_STRONG', guaranteeFlag: 'Verified (strong) — through the owner’s connected accounts' }),
     'business terms: company name, trade-licence age band, revenue band, DSCR band, guarantee status flag (v2.18: without the share of the business capacity)');
  ok(mb.terms.business.dscrBand === '3.0× or more' && mb.terms.business.guaranteeStatus === 'UNVERIFIED' && mb.terms.amount === 100000 && mo.terms.amount === 150000 && mo.terms.repaymentAccount === 'Business account',
     'business-only memo: DSCR band 3.0× or more, UNVERIFIED, AED 100,000');
  ok(mo.borrower.kind === 'COMPANY' && mo.borrower.name === 'Kamal Fresh Foods Trading LLC' && /^DED •+\d$/.test(mo.borrower.tradeLicenceMasked) && mo.borrower.guarantor.name === 'Sara Kamal' &&
     /^784-••••-•••••••-\d$/.test(mo.borrower.guarantor.emiratesIdMasked) && mo.bureau.aecbScoreBand === '700–749' && mo.bureau.ownerConsumerScoreBand === '700–749',
     'borrower = the company (masked trade licence); the guarantor named with a masked Emirates ID; AECB commercial and owner consumer as bands');
  ok(mo.consents.map(c => c.reference.replace(/^CNS-\d+-/, '')).join() === 'AECB,ALTAREQ,ALTAREQ-OWNER,LENDER' && mb.consents.map(c => c.reference.replace(/^CNS-\d+-/, '')).join() === 'AECB,ALTAREQ,LENDER',
     'consent references only (the owner’s consent as a reference when given)');
  const sf = E.memoSftpRow(mo);
  ok(sf.header.slice(-3).join() === 'revenue_band,dscr_band,guarantee_status' && sf.row.slice(-3).join('|') === 'AED 1M–5M a year|2.0–3.0×|VERIFIED_STRONG' && sf.row[2] === PID && sf.row[4] === '150000',
     'SFTP row adds revenue_band, dscr_band, guarantee_status (bands and the flag)');
  ok(E.memoSftpRow(E.creditMemo(E.listDecisions().find(r => r.productId === 'split').id)).header.join() === SFTP_HEADER.join(), 'other products’ SFTP rows: the v2.5 sixteen columns, then the v2.18 consumer columns');
  const mr = E.creditMemo(rr2.id);
  ok(mr.terms === null && mr.decision.reasonCodes.map(c => c.code).join() === 'R02' && !/RC_|RF_|exit.risk|international transfer/i.test(JSON.stringify(mr)),
     'SME REFER memo: R02 (v2.19: the library code for RC_RED_FLAGS_REVIEW) and nothing more');

  // ---- simulateBook ----
  const book = D.sampleBook.sme_working_capital;
  ok(Array.isArray(book) && book.length >= 12 && book.every(r => !r.redFlagData), 'sampleBook.sme_working_capital: ' + book.length + ' rows (≥ 12), no redFlagData');
  const sim0 = E.simulateBook(PID, {});
  ok(sim0.size === book.length && sim0.before.APPROVE + sim0.before.REFER + sim0.before.DECLINE === book.length && sim0.before.APPROVE >= 4 && sim0.before.DECLINE >= 4 && sim0.before.REFER >= 1 &&
     sim0.flips.length === 0 && sim0.amountImpact, 'simulateBook runs on the SME book (' + sim0.before.APPROVE + ' approve · ' + sim0.before.REFER + ' refer · ' + sim0.before.DECLINE + ' decline)');
  const sm1 = E.decideRaw(PID, book[0]), sm2 = E.decideRaw(PID, book[1]);
  ok(sm1.approved === 150000 && sm1.grade === 'A' && sm2.approved === 100000 && sm2.bindingConstraint === 'GUARANTEE_FACTOR', 'SM-001 / SM-002 reproduce s1’s two paths (150,000 A · 100,000 guarantee-bound)');
  const sim1 = E.simulateBook(PID, { unverifiedGuaranteeFactorPct: 50 });
  ok(sim1.amountImpact.approvalsReduced >= 1 && sim1.amountImpact.approvedAmountAfter < sim1.amountImpact.approvedAmountBefore && /approval/.test(sim1.summary),
     'unverifiedGuaranteeFactorPct 65 → 50: approvals without the owner’s accounts shrink (' + sim1.summary + ')');
  eq(E.getPolicy(PID).version, 1, 'simulation never publishes');
  const pub = E.publishPolicy(PID, { tenorMonthsAllowed: [3, 6, 9, 12, 18] }, META);
  ok(pub.version === 2 && E.policyHistory(PID).length === 2 && decideSme(s1, OWN, { tenorMonths: 15 }).features.effectiveTenor === 18, 'a 4-eyes publish adds an 18-month term; a 15-month request rounds up to it');
  ok(decideSme(s1, OWN, { tenorMonths: 7 }).reasonCodes.includes('RC_TENOR_CAP') && decideSme(s1, OWN, { tenorMonths: 7 }).features.effectiveTenor === 9, 'a 7-month request rounds up to 9 months (RC_TENOR_CAP)');

  // ---- monitoring: ML-07 FUNDS_DIVERSION → HIGH; ML-08 → MEDIUM ----
  E.init(D);
  const MON = { phase: 'MONITORING' };
  const ML7 = D.monitoredLoans.find(l => l.id === 'ML-07'), ML8 = D.monitoredLoans.find(l => l.id === 'ML-08');
  ok(ML7 && ML8 && ML7.productId === PID && ML8.productId === PID && ML7.segment === 'SME' && ML7.owner && ML8.owner, 'ML-07 and ML-08 are SME loans with a named guarantor');
  eq(E.RED_FLAG_BUSINESS_CODES.join(','), 'RF_REVENUE_DROP,RF_FUNDS_TO_OWNER', 'the two business signal codes');
  const m7 = E.redFlags(ML7, MON), m8 = E.redFlags(ML8, MON);
  ok(m7.severity === 'HIGH' && m7.pattern === 'FUNDS_DIVERSION' && m7.flags.map(f => f.code).join(',') === 'RF_REVENUE_DROP,RF_FUNDS_TO_OWNER,RF_REMITTANCE_SURGE',
     'ML-07: revenue −35% + RF_FUNDS_TO_OWNER + owner RF_REMITTANCE_SURGE → HIGH · FUNDS_DIVERSION');
  const v7 = (c) => m7.flags.find(f => f.code === c).values;
  ok(v7('RF_REVENUE_DROP').dropPct === 35 && v7('RF_FUNDS_TO_OWNER').multiple === 2.6 && v7('RF_FUNDS_TO_OWNER').transferToOwnerAed === 90000 && v7('RF_REMITTANCE_SURGE').sharePct === 88,
     'ML-07 values: inflows −35% · AED 90,000 to the owner = 2.6× drawings · 88% of the owner’s income sent out');
  ok(m7.action.code === 'SPECIALIST_CALL' && m7.action.slaHours === 24 && m7.lenderStatus === 'Early warning: elevated — Noor is in contact with the customer' &&
     m7.guardrailNotes.some(n => /Funds diversion/.test(n)) && m7.guardrailNotes.some(n => /no default, legal step or account action/i.test(n)) &&
     m7.guardrailNotes.some(n => /owner’s own consent — while the business loan the owner guarantees is open/.test(n)), 'ML-07 → specialist call within 24h, contact first, the lender gets a status flag only; the owner’s consent scope noted');
  ok(m8.severityLabel === 'MEDIUM' && m8.flags.map(f => f.code).join() === 'RF_REVENUE_DROP' && m8.flags[0].values.dropPct === 32 && m8.action.code === 'CHECK_IN' &&
     m8.action.offer === 'PAYMENT_HOLIDAY' && /payment holiday under policy/.test(m8.action.en) && m8.guardrailNotes.some(n => /looks seasonal/.test(n)),
     'ML-08: revenue −32% only (seasonal) → MEDIUM, check-in, a payment holiday under policy');
  const noRemit = clone(ML7); noRemit.redFlagData.recent.intlTransfersAed = 4000;
  const nr = E.redFlags(noRemit, MON);
  ok(nr.pattern === null && nr.severityLabel === 'MEDIUM+', 'RF_FUNDS_TO_OWNER without an owner money-out leg is not FUNDS_DIVERSION (MEDIUM+)');
  const drained = clone(noRemit); drained.redFlagData.recent.balanceNowAed = 6000; drained.redFlagData.recent.largestOutboundTransferAed = 50000;
  ok(E.redFlags(drained, MON).pattern === 'FUNDS_DIVERSION' && E.redFlags(drained, MON).flags.some(f => f.code === 'RF_BALANCES_DRAINED'), 'the owner’s drained balances complete the pattern instead of a remittance surge');
  const noToOwner = clone(ML7); noToOwner.redFlagData.business.recent.largestTransferToOwnerAed = 35000;
  ok(E.redFlags(noToOwner, MON).pattern === null, 'without RF_FUNDS_TO_OWNER the owner’s remittance alone is never FUNDS_DIVERSION');
  const o7 = E.redFlags(ML7, { phase: 'ORIGINATION' });
  ok(o7.notEvaluated.join(',') === 'RF_TRAVEL_AFTER_DISBURSAL,RF_PAYMENTS_STOPPED,RF_REVENUE_DROP,RF_FUNDS_TO_OWNER' && o7.pattern === null && !o7.flags.some(f => E.RED_FLAG_BUSINESS_CODES.includes(f.code)),
     'business signals and FUNDS_DIVERSION are monitoring-only');
  // guardrails: no nationality / destination input; the allowlist only
  const t7 = clone(ML7); t7.nationality = 'XX'; t7.redFlagData.business.destinationCountry = 'XX'; t7.redFlagData.recent.intlTransfersDestination = 'XX'; t7.redFlagData.business.recent.ownerNationality = 'XX';
  eq(JSON.stringify(E.redFlags(t7, MON)), JSON.stringify(m7), 'ML-07 with nationality / destination fields: identical HIGH result');
  const ALLOWED7 = new Set(['redFlagData', 'baseline', 'recent', 'aecb', 'business', 'intlTransfersShareOfIncome6m', 'salaryCreditDay', 'avgBalance3m', 'cardUtilisationPct3mAgo',
    'onTimePaymentsRun', 'incomeAed', 'intlTransfersAed', 'airlinePurchases', 'daysAfterDisbursal', 'amountAed', 'salaryLateDays', 'balanceNowAed', 'largestOutboundTransferAed',
    'missedCollection', 'cards', 'cardLimitTotal', 'cardBalanceTotal', 'inflows3mAvgAed', 'usualDrawingsAed', 'sameMonthLastYearDropPct', 'inflowsAed', 'largestTransferToOwnerAed']);
  const log7 = new Set();
  const rec7 = (obj) => new Proxy(obj, { get(tg, pr, rv) { if (typeof pr === 'string') log7.add(pr); const v = Reflect.get(tg, pr, rv); return v && typeof v === 'object' ? rec7(v) : v; } });
  E.redFlags(rec7(clone(t7)), MON);
  const out7 = [...log7].filter(k => !/^\d+$/.test(k) && !['length', 'map', 'constructor'].includes(k) && !ALLOWED7.has(k));
  ok(out7.length === 0 && !log7.has('customer') && !log7.has('owner'), 'ML-07: redFlags() reads only the allowlisted fields — not the names (outside: ' + out7.join(', ') + ')');
  const scan = E.earlyWarningScan();
  const r7 = scan.find(r => r.loanId === 'ML-07'), r8 = scan.find(r => r.loanId === 'ML-08');
  ok(r7.segment === 'SME' && r7.guarantor === ML7.owner && r7.action.channel === 'Phone — specialist' && r8.action.channel === 'Email' && r8.severityLabel === 'MEDIUM',
     'scan rows: SME segment and guarantor; ML-07 a specialist phone call, ML-08 a check-in on the chosen channel (Email)');
  ok(scan.filter(r => r.productId !== PID && r.productId !== 'school_fees').map(r => r.loanId + ':' + r.severityLabel).join(' ') === 'ML-01:HIGH ML-02:MEDIUM ML-03:MEDIUM ML-06:MEDIUM ML-04:LOW ML-05:NONE',
     'ML-01 … ML-06 keep their v2.9 severities');
  const blk = E.getPolicy('earlyWarning');
  ok(blk.businessSignals.map(b => b.code).join() === 'RF_REVENUE_DROP,RF_FUNDS_TO_OWNER,FUNDS_DIVERSION' && /while the business loan you guarantee is open/.test(blk.consentWhyOwner),
     'the shared block documents the business signals and the owner’s consent scope ("while the business loan you guarantee is open")');
  for (const c of ['RC_RF_REVENUE_DROP', 'RC_RF_FUNDS_TO_OWNER']) {
    const rc = D.reasonCodes[c];
    ok(rc && rc.en && ARABIC.test(rc.ar) && !/\d/.test(rc.en) && !/nationalit|country|abroad/i.test(rc.en), c + ': English + Arabic, customer-safe (no figures, no place)');
  }
  const sim = E.simulateEarlyWarning({ remittanceShareOfIncomePct: 90 });
  ok(sim.changes.some(c => c.loanId === 'ML-07' && c.from === 'HIGH' && c.to === 'MEDIUM+'), 'simulateEarlyWarning: remittance at 90% takes ML-07’s owner leg away (HIGH → MEDIUM+)');

  // ---- metrics, every product list ----
  const d1 = decideSme(s1, OWN), d2 = decideSme(s1, BIZ);
  const mt = E.metrics();
  ok(mt.byProduct.sme_working_capital && mt.byProduct.sme_working_capital.decisions === 2 && mt.byProduct.sme_working_capital.APPROVE === 2 &&
     mt.totals.decisions === Object.keys(mt.byProduct).reduce((x, k) => x + mt.byProduct[k].decisions, 0), 'metrics(): sme_working_capital counts this session’s decisions (no seeded history); totals add up');
  ok(mt.exitRiskWatch.rows.filter(r => r.productId === PID).length === 2 && mt.exitRiskWatch.counts.HIGH === 2, 'exit-risk watch carries the two SME rows');
  eq(E.policyHistory(PID).length, 1, 'the SME pack has its own policy history');

  // ---- existing outcomes unchanged; vocabulary; determinism ----
  E.init(D);
  const now = {};
  for (const id of ['r1', 'r2', 'r3', 'r4', 'r5']) now[id] = decidePersona('personal_loan', P[id]);
  now['r2+cp'] = decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } });
  for (const p of D.personasSplit) now[p.id] = decidePersona('split', p);
  for (const p of D.personasUpgrade) {
    now[p.id] = E.decide({ productId: 'starter_loan', applicant: p, consents: CONSENT_ALL });
    now[p.id + '+st'] = E.decide({ productId: 'starter_loan', applicant: p, consents: { aecb: true, openFinance: true, homeStatements: true } });
  }
  for (const p of D.personasJourney) now[p.id] = decidePersona('personal_loan', p);
  for (const p of D.personasCar) { now[p.id + '+of'] = decidePersona('car_loan', p); now[p.id + '+docs'] = decidePersona('car_loan', p, { consents: { aecb: true, openFinance: false } }); }
  now['r1 advance'] = decidePersona('salary_advance', P.r1, { amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } });
  const changed = Object.keys(V27_FINGERPRINTS).filter(k => fingerprint(now[k]) !== V27_FINGERPRINTS[k]);
  ok(changed.length === 0 && Object.keys(now).length === Object.keys(V27_FINGERPRINTS).length, 'every existing persona path still matches its fingerprint after v2.10 (changed: ' + changed.join(', ') + ')');
  ok(Object.values(now).every(r => r.segment === 'CONSUMER'), 'existing products’ records stay CONSUMER');
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const a1 = decideSme(s1, OWN), a2 = decideSme(s1, BIZ);
  const v210Text = JSON.stringify([s1, D.sampleBook.sme_working_capital, D.monitoredLoans.slice(6), ['RC_TRADING_HISTORY', 'RC_BUSINESS_HISTORY', 'RC_BUSINESS_CASH_FLOW', 'RC_GUARANTEE_UNVERIFIED',
    'RC_GUARANTEE_WEAK', 'RC_RF_REVENUE_DROP', 'RC_RF_FUNDS_TO_OWNER'].map(c => D.reasonCodes[c]), E.getPolicy(PID), a1, a2, E.creditMemo(a1.id), E.creditMemo(a2.id), E.execSteps(PID, a1.id), E.earlyWarningScan()]);
  ok(!banned.test(v210Text) && !mentionsSalaryTransfer(v210Text), 'no banned vocabulary or salary-transfer wording in the v2.10 data, pack, records, memos, steps or scan');
  ok(/قرض/.test(man.nameAr) && ['RC_TRADING_HISTORY', 'RC_BUSINESS_HISTORY', 'RC_BUSINESS_CASH_FLOW', 'RC_GUARANTEE_UNVERIFIED', 'RC_GUARANTEE_WEAK'].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)),
     'the v2.10 reason codes exist in English and Arabic');
  function snap() {
    E.init(D);
    const x = E.decide({ productId: PID, applicant: s1, amount: 150000, tenorMonths: 12, consents: OWN });
    return JSON.stringify([x, E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(x.id)), E.quoteSme({ applicant: s1, amount: 150000, tenorMonths: 12, consents: OWN }),
                           E.simulateBook(PID, { dscrBudgetPct: 40 }), E.earlyWarningScan(), E.metrics().exitRiskWatch]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical SME record, memo, SFTP row, quote, simulation and scan');
  for (const r of E.listDecisions()) collect(r.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. v2.10) exists with Arabic');
});

// ---------------------------------------------------------------------------
// v2.13 — contact preferences asked after the loan is issued (JOURNEY-CONTACT-SPEC.md §2, §3):
// recordCommunications() on the funded loan, in the v2.8 consent shape, never in the memo.
group('20. Addendum v2.13: recordCommunications() on the funded loan — same consent shape, outcome and memo untouched', () => {
  E.init(D);
  const j = D.personasJourney[0];
  const OF = { aecb: true, openFinance: true };
  const decideJ = (amount, months, extra) => E.decide({ productId: 'personal_loan', applicant: j, amount, tenorMonths: months,
                                                        consents: Object.assign({}, OF, extra || {}) });
  ok(typeof E.recordCommunications === 'function', 'MizanEngine exports recordCommunications');

  // ---- the journey's decide() call no longer carries contact preferences ----
  const rec = decideJ(15000, 12, { digitalFootprint: true });
  ok(rec.outcome === 'APPROVE' && rec.limit.approved === 15000 && rec.score.points === 737, 'j1 15,000 / 12 with footprint consent only: APPROVE · AED 15,000 · 737');
  ok(!('communications' in rec.consents), 'decide() without consents.communications records no contact preferences (asked later now)');
  for (const t of E.EXEC_EVENTS) E.recordEvent(rec.id, t);
  ok(rec.status === 'EXECUTED' && rec.events.length === 6 && rec.events[5].type === 'DISBURSED', 'j1: the six execution events are recorded — DISBURSED, the loan exists');

  // ---- recordCommunications on the approved, disbursed record ----
  const freeze = (r) => JSON.stringify({ outcome: r.outcome, status: r.status, events: r.events, token: r.token, limit: r.limit, pricing: r.pricing,
                                          score: r.score, reasonCodes: r.reasonCodes, rules: r.rules, repayment: r.repayment, features: r.features,
                                          dataPulls: r.dataPulls, digitalFootprint: r.consents.digitalFootprint });
  const before = freeze(rec);
  const memoBefore = JSON.stringify(E.creditMemo(rec.id));
  const sftpBefore = JSON.stringify(E.memoSftpRow(E.creditMemo(rec.id)));
  const nDec = E.listDecisions().length, nAudit = rec.audit.length;
  const out = E.recordCommunications(rec.id, { service: ['PUSH', 'SMS', 'EMAIL'], marketing: [] });
  ok(out === E.getDecision(rec.id), 'recordCommunications returns the stored record');
  const cc = rec.consents.communications;
  ok(!!cc && cc.granted === true && cc.reference === 'CNS-' + rec.id.slice(4) + '-COMMS' && /^CNS-\d{6}-COMMS$/.test(cc.reference) &&
     JSON.stringify(cc.service) === '["EMAIL","SMS","PUSH"]' && JSON.stringify(cc.marketing) === '[]' && /^\d{4}-\d\d-\d\dT/.test(cc.at),
     'consent recorded: granted, reference CNS-…-COMMS, service EMAIL · SMS · PUSH (canonical order), marketing none, a timestamp');
  const v28 = decideJ(15000, 12, { communications: { service: ['SMS'], marketing: [] } }).consents.communications;
  eq(Object.keys(cc).join(','), Object.keys(v28).join(','), 'the same shape as the v2.8 decide-time consent (granted, at, reference, service, marketing, basis)');
  eq(cc.basis, v28.basis, 'the same basis text as v2.8 (CBUAE consumer protection; WhatsApp by explicit opt-in)');
  ok(new Date(cc.at) > new Date(rec.events[5].at), 'recorded after DISBURSED (the engine clock moved on)');
  const au = rec.audit.filter(a => a.action === 'COMMUNICATIONS_RECORDED');
  ok(au.length === 1 && au[0].actor === 'customer' && /^recorded · CNS-\d{6}-COMMS · service EMAIL · SMS · PUSH · marketing none/.test(au[0].detail) &&
     au[0].at === cc.at, 'one COMMUNICATIONS_RECORDED audit entry (actor customer, "recorded", the reference and the channels)');
  eq(rec.audit.length, nAudit + 1, 'exactly one audit entry added');
  eq(freeze(rec), before, 'outcome, status, events, token, limit, pricing, score, reasons, rules, repayment, features, pulls and the footprint consent unchanged');
  eq(JSON.stringify(E.creditMemo(rec.id)), memoBefore, 'the credit memo is unchanged');
  eq(JSON.stringify(E.memoSftpRow(E.creditMemo(rec.id))), sftpBefore, 'the SFTP row is unchanged');
  eq(E.listDecisions().length, nDec + 1, 'no new DecisionRecord (the +1 is the v2.8 comparison decision above)');

  // ---- refused: no service channel, unknown channel, wrong shape, not approved, unknown id ----
  const snapC = JSON.stringify(rec.consents.communications), nA = rec.audit.length;
  throwsWith(() => E.recordCommunications(rec.id, { service: [], marketing: ['EMAIL'] }), 'at least one channel', 'no service channel → throws');
  throwsWith(() => E.recordCommunications(rec.id, { service: ['FAX'], marketing: [] }), 'unknown contact channel', 'an unknown channel → throws');
  throwsWith(() => E.recordCommunications(rec.id, { service: ['SMS'], marketing: ['PIGEON'] }), 'unknown contact channel', 'an unknown marketing channel → throws');
  throwsWith(() => E.recordCommunications(rec.id, ['SMS']), 'service', 'preferences must be {service, marketing}');
  throwsWith(() => E.recordCommunications(rec.id), 'service', 'no preferences → throws');
  ok(JSON.stringify(rec.consents.communications) === snapC && rec.audit.length === nA, 'a refused call leaves the consent and the audit trail unchanged');
  const dec = E.decide({ productId: 'personal_loan', applicant: P.r4, amount: P.r4.defaultRequest.amount, tenorMonths: P.r4.defaultRequest.tenorMonths, consents: OF });
  const ref = E.decide({ productId: 'personal_loan', applicant: P.r2, amount: P.r2.defaultRequest.amount, tenorMonths: P.r2.defaultRequest.tenorMonths, consents: OF });
  ok(dec.outcome === 'DECLINE' && ref.outcome === 'REFER', 'fixtures: r4 DECLINE, r2 REFER');
  throwsWith(() => E.recordCommunications(dec.id, { service: ['SMS'], marketing: [] }), ['approved loan', 'DECLINE'], 'a DECLINE record → throws, naming the outcome');
  throwsWith(() => E.recordCommunications(ref.id, { service: ['SMS'], marketing: [] }), ['approved loan', 'REFER'], 'a REFER record → throws, naming the outcome');
  ok(!('communications' in dec.consents) && !('communications' in ref.consents) && !dec.audit.some(a => a.action === 'COMMUNICATIONS_RECORDED'),
     'nothing is recorded on the refused DECLINE / REFER records');
  throwsWith(() => E.recordCommunications('DEC-999999', { service: ['SMS'], marketing: [] }), 'unknown decision id', 'an unknown id → throws');
  E.override(ref.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'a.hassan', approver: 'm.rashid' });
  ok(E.recordCommunications(ref.id, { service: ['SMS'], marketing: [] }).consents.communications.reference === 'CNS-' + ref.id.slice(4) + '-COMMS',
     'a REFER approved by a 4-eyes override is an approved loan: the preferences are recorded');

  // ---- idempotent: a second call replaces the preferences, keeps the reference, adds an "updated" entry ----
  const ref1 = cc.reference, at1 = cc.at;
  E.recordCommunications(rec.id, { service: ['SMS'], marketing: ['WHATSAPP', 'EMAIL'] });
  const cc2 = rec.consents.communications;
  ok(cc2.reference === ref1 && JSON.stringify(cc2.service) === '["SMS"]' && JSON.stringify(cc2.marketing) === '["EMAIL","WHATSAPP"]' && cc2.granted === true,
     'second call: preferences replaced (service SMS; marketing Email · WhatsApp), the reference unchanged');
  ok(new Date(cc2.at) > new Date(at1), 'second call: a new timestamp');
  const au2 = rec.audit.filter(a => a.action === 'COMMUNICATIONS_RECORDED');
  ok(au2.length === 2 && /^updated · /.test(au2[1].detail) && au2[1].detail.includes(ref1) && /marketing EMAIL · WHATSAPP/.test(au2[1].detail),
     'second call: a second COMMUNICATIONS_RECORDED audit entry, "updated"');
  eq(freeze(rec), before, 'second call: the decision and its events are still unchanged');
  eq(JSON.stringify(E.creditMemo(rec.id)), memoBefore, 'second call: the credit memo is still unchanged');

  // ---- backward compatibility: a decide-time (v2.8) consent keeps its reference when updated ----
  const old = decideJ(15000, 12, { communications: { service: ['PUSH'], marketing: [] } });
  const oldRef = old.consents.communications.reference;
  E.recordCommunications(old.id, { service: ['EMAIL', 'PUSH'], marketing: [] });
  ok(old.consents.communications.reference === oldRef && JSON.stringify(old.consents.communications.service) === '["EMAIL","PUSH"]' &&
     /^updated · /.test(old.audit.find(a => a.action === 'COMMUNICATIONS_RECORDED').detail),
     'a v2.8 decide-time consent is updated in place: same reference, "updated"');
  const fresh = decideJ(15000, 12);
  ok(fresh.events.length === 0 && E.recordCommunications(fresh.id, { service: ['SMS'], marketing: [] }).consents.communications.granted === true && fresh.events.length === 0,
     'the API needs an approved record only (no events required) and records no execution event');

  // ---- privacy: the memo and the SFTP row never carry the channels ----
  const memo = E.creditMemo(rec.id), sftp = E.memoSftpRow(memo);
  ok(!('sharing' in memo) && !/contact|preferences|channel/i.test(JSON.stringify(memo)),
     'contact details and preferences stay out of the memo (v2.18: the shared/withheld lists became the Noor-only panel, outside the memo)');
  ok(memo.consents.map(c => c.type).join(',') === 'aecb,openFinance,shareWithLender' && !memo.consents.some(c => /COMMS/.test(c.reference)),
     'memo consent references: AECB, Al Tareq, lender only — no contact consent');
  const memoBody = JSON.stringify(Object.assign({}, memo, { sharing: null })), row = sftp.row.join(',').toLowerCase();
  const leaks = [j.contact.email, 'example.com', '@', 'WHATSAPP', 'WhatsApp', 'SMS', 'PUSH', 'EMAIL', 'marketing', 'communications', 'COMMS', ref1]
    .filter(w => memoBody.toLowerCase().includes(w.toLowerCase()) || row.includes(w.toLowerCase()));
  ok(leaks.length === 0, 'memo + SFTP row after recordCommunications: no email, channels, preferences or the consent reference' + (leaks.length ? ' (found: ' + leaks.join(', ') + ')' : ''));
  ok(forbiddenKeys(memo).length === 0 && !/communications|contact/.test(JSON.stringify(Object.keys(memo))), 'memo keys stay on the allowlist');
  const hits = privacyScan(rec, memo, sftp, { incomeBand: T.income(12000), dbrBand: T.dbr(rec.features.dbrPct), freeCashFlowBand: T.fcf(3700),
    instalmentToCashFlowBand: T.share(rec.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) });
  ok(hits.length === 0, 'j1 memo after the post-payout consent: the recursive privacy scan stays clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));
  ok(JSON.stringify(E.memoApiPayload(memo)) === JSON.stringify(memo), 'the API payload equals the memo (no channels either)');

  // ---- determinism ----
  function snap() {
    E.init(D);
    const a = decideJ(15000, 12, { digitalFootprint: true });
    for (const t of E.EXEC_EVENTS) E.recordEvent(a.id, t);
    E.recordCommunications(a.id, { service: ['EMAIL', 'SMS', 'PUSH'], marketing: [] });
    E.recordCommunications(a.id, { service: ['PUSH'], marketing: ['EMAIL'] });
    return JSON.stringify([a, E.creditMemo(a.id), E.memoSftpRow(E.creditMemo(a.id))]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical record, consent, audit, memo and SFTP row');
  E.init(D);
});

// ---------------------------------------------------------------------------
// v2.14 — the digital-footprint check covered by the Terms of Use and Privacy policy accepted at sign-up
// (JOURNEY-FOOTPRINT-TC-SPEC.md §2, §3): consents.digitalFootprint = {basis:'TERMS', termsVersion, acceptedAt}.
group('21. Addendum v2.14: the footprint check on the basis of the accepted terms — basis recorded, decision and memo unchanged', () => {
  E.init(D);
  const j = D.personasJourney[0];
  const OF = { aecb: true, openFinance: true };
  const TV = 'T&C v1.0 · Privacy policy v1.0', AT = '2026-07-19T08:58:00.000Z';
  const TERMS = { basis: 'TERMS', termsVersion: TV, acceptedAt: AT };
  const decideJ = (fp, extra) => E.decide(Object.assign({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12,
                                                          consents: Object.assign({}, OF, fp === undefined ? {} : { digitalFootprint: fp }) }, extra || {}));

  // ---- the object form runs the check and records basis TERMS with the version ----
  const recT = decideJ(TERMS), recE = decideJ(true), recN = decideJ(undefined), recD = decideJ(false);
  const cT = recT.consents.digitalFootprint, cE = recE.consents.digitalFootprint, cD = recD.consents.digitalFootprint;
  const pullT = recT.dataPulls.find(p => p.source === 'DIGITAL_FOOTPRINT');
  ok(!!pullT && pullT.summary.identity === 'HIGH' && pullT.summary.atoRisk === 'NORMAL' && recT.features.footprintIdentity === 'HIGH' &&
     recT.rules.some(r => r.id === 'POL_IDENTITY_FOOTPRINT' && r.result === 'PASS'), 'TERMS form: the check runs — DIGITAL_FOOTPRINT pull (identity HIGH, ATO NORMAL), POL_IDENTITY_FOOTPRINT PASS');
  ok(!!cT && cT.granted === true && cT.basis === 'TERMS' && cT.termsVersion === TV && cT.at === AT && cT.used === true && /Covered by the Terms of Use and Privacy policy accepted at sign-up/.test(cT.scope),
     'TERMS form: record.consents.digitalFootprint = {granted, basis TERMS, termsVersion "' + TV + '", at = when the terms were accepted, scope, used}');
  eq(Object.keys(cT).join(','), 'granted,basis,termsVersion,at,scope,used', 'the consent’s shape: granted, basis, termsVersion, at, scope, used');
  const recT2 = decideJ({ basis: 'TERMS', termsVersion: '  ' + TV + ' ' });
  ok(recT2.consents.digitalFootprint.termsVersion === TV && recT2.consents.digitalFootprint.at === recT2.createdAt, 'TERMS without acceptedAt: at falls back to the decision time; the version is trimmed');

  // ---- the boolean form still works, as EXPLICIT ----
  ok(!!cE && cE.granted === true && cE.basis === 'EXPLICIT' && cE.termsVersion === null && cE.at === recE.createdAt && cE.used === true && recE.dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'),
     'boolean true (v2.8): still runs the check and records basis EXPLICIT, termsVersion null');
  ok(!!cD && cD.granted === false && cD.basis === 'EXPLICIT' && cD.at === null && cD.used === false && !recD.dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'),
     'boolean false (v2.8 declined): no pull, recorded as declined (basis EXPLICIT)');
  ok(!('digitalFootprint' in recN.consents) && !recN.dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'), 'not passed: not asked, no pull, nothing recorded (unchanged)');

  // ---- a bad object throws, before anything is recorded ----
  const n0 = E.listDecisions().length;
  throwsWith(() => decideJ({}), ['digitalFootprint', 'TERMS'], 'an object without a basis → throws');
  throwsWith(() => decideJ({ basis: 'EXPLICIT', termsVersion: TV }), ['digitalFootprint', 'EXPLICIT'], 'an object with basis EXPLICIT → throws (the explicit form is the boolean)');
  throwsWith(() => decideJ({ basis: 'TERMS' }), 'termsVersion', 'basis TERMS without a termsVersion → throws');
  throwsWith(() => decideJ({ basis: 'TERMS', termsVersion: '   ' }), 'termsVersion', 'basis TERMS with a blank termsVersion → throws');
  throwsWith(() => decideJ({ basis: 'TERMS', termsVersion: 42 }), 'termsVersion', 'a non-string termsVersion → throws');
  throwsWith(() => decideJ({ basis: 'TERMS', termsVersion: TV, acceptedAt: 'yesterday' }), 'acceptedAt', 'an acceptedAt that is not a date-time → throws');
  throwsWith(() => decideJ(['TERMS']), 'digitalFootprint', 'an array → throws');
  eq(E.listDecisions().length, n0, 'refused footprint consents create no record');

  // ---- Ravi: identical outcome, score and price with either form ----
  const same = (a, b) => a.outcome === b.outcome && a.score.points === b.score.points && a.score.grade === b.score.grade && a.limit.approved === b.limit.approved &&
    a.limit.bindingConstraint === b.limit.bindingConstraint && JSON.stringify(a.pricing) === JSON.stringify(b.pricing) && JSON.stringify(a.reasonCodes) === JSON.stringify(b.reasonCodes) &&
    JSON.stringify(a.token.conditions) === JSON.stringify(b.token.conditions) && JSON.stringify(a.repayment) === JSON.stringify(b.repayment);
  ok(same(recT, recE) && same(recT, recN) && recT.score.points === 737 && recT.score.grade === 'B' && recT.limit.approved === 15000 && recT.pricing.kfs.monthlyInstalment === 1311.7,
     'Ravi with the TERMS form = the boolean form = no footprint: APPROVE · 737 · B · AED 15,000 · AED 1,311.70/mo, same reasons, conditions and repayment');
  ok(JSON.stringify(recT.features) === JSON.stringify(recE.features) && JSON.stringify(recT.rules) === JSON.stringify(recE.rules) &&
     JSON.stringify(recT.dataPulls.map(p => p.summary)) === JSON.stringify(recE.dataPulls.map(p => p.summary)), 'TERMS and EXPLICIT: the same features, rules and pull summaries — only the consent’s basis differs');

  // ---- other paths follow the same gate ----
  ok(!E.decide({ productId: 'personal_loan', applicant: P.r1, amount: P.r1.defaultRequest.amount, tenorMonths: P.r1.defaultRequest.tenorMonths,
                 consents: Object.assign({}, OF, { digitalFootprint: TERMS }) }).dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'),
     'TERMS on an applicant without a footprint (r1) → no pull');
  const carFp = Object.assign(clone(D.personasCar[0]), { footprint: clone(j.footprint) });
  ok(!E.decide({ productId: 'car_loan', applicant: carFp, amount: 180000, tenorMonths: 60, consents: Object.assign({}, OF, { digitalFootprint: TERMS }) })
       .dataPulls.some(p => p.source === 'DIGITAL_FOOTPRINT'), 'TERMS on a pack without the overlay params (car loan) → no pull');
  const c4fp = Object.assign(clone(P.c4), { footprint: { vendorScore: 742, emailAgeYearsMin: 6, nameMatchSources: 2, phoneOnMessenger: true,
                                                         velocity: { emailSeenByLenders: 1 }, breaches: { count: 1, includesCredentialStuffingCompilation: false } } });
  const c4 = (fp) => E.decide({ productId: 'split', applicant: c4fp, amount: P.c4.defaultRequest.amount, tenorMonths: P.c4.defaultRequest.tenorMonths,
                                consents: Object.assign({}, OF, fp === undefined ? {} : { digitalFootprint: fp }) });
  const c4T = c4(TERMS), c4E = c4(true), c4N = c4(undefined);
  ok(c4T.score.footprintOverlay && c4T.score.footprintOverlay.delta === 10 && c4T.score.footprintOverlay.applied === false && c4T.score.points === c4N.score.points &&
     JSON.stringify(c4T.score.footprintOverlay) === JSON.stringify(c4E.score.footprintOverlay), 'c4 (AECB no-hit) with TERMS: +10 in SHADOW, not applied — the same as the boolean form');

  // ---- the memo: only the identity flag; no terms version, no email, no vendor fields ----
  const memo = E.creditMemo(recT.id), sftp = E.memoSftpRow(memo), memoE = E.creditMemo(recE.id);
  eq(memo.verification.identity, 'Identity verified', 'memo identity flag with the TERMS basis: "Identity verified" (v2.18 — no footprint detail)');
  eq(JSON.stringify(memo.verification), JSON.stringify(memoE.verification), 'the memo’s verification block is the same with either basis');
  /* the memo's own "terms" (the loan terms) and the withheld-list labels are fine; the sharing block is checked separately below */
  const body = (JSON.stringify(Object.assign({}, memo, { sharing: null })) + '\n' + sftp.row.join(',')).toLowerCase();
  const leaks = [TV, 'T&C', 'termsVersion', 'Terms of Use', 'privacy policy', 'v1.0', 'basis', 'EXPLICIT', j.contact.email, 'example.com', '@', 'vendor', 'breach', 'messenger', 'footprintVendorScore']
    .filter(w => body.includes(w.toLowerCase()));
  ok(leaks.length === 0, 'memo + SFTP row: no terms version, no basis, no email, no vendor fields' + (leaks.length ? ' (found: ' + leaks.join(', ') + ')' : ''));
  ok(memo.consents.map(c => c.type).join(',') === 'aecb,openFinance,shareWithLender', 'memo consent references: AECB, Al Tareq, lender only — the footprint consent is not among them');
  ok(!('sharing' in memo) && !JSON.stringify(memo).includes(TV) && !/T&C|Terms of Use|footprint|vendor/i.test(JSON.stringify(memo)),
     'v2.18: no sharing block; the memo carries no terms version and names neither the footprint nor the vendor');
  const hits = privacyScan(recT, memo, sftp, { incomeBand: T.income(12000), dbrBand: T.dbr(recT.features.dbrPct), freeCashFlowBand: T.fcf(3700),
    instalmentToCashFlowBand: T.share(recT.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) });
  ok(hits.length === 0, 'j1 memo on the TERMS basis: the recursive privacy scan stays clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));

  // ---- recordCommunications (v2.13) leaves the footprint consent alone; determinism ----
  for (const t of E.EXEC_EVENTS) E.recordEvent(recT.id, t);
  const fpBefore = JSON.stringify(recT.consents.digitalFootprint);
  E.recordCommunications(recT.id, { service: ['SMS'], marketing: [] });
  eq(JSON.stringify(recT.consents.digitalFootprint), fpBefore, 'recording contact preferences after the payout leaves the footprint consent unchanged');
  function snap() {
    E.init(D);
    const a = decideJ(TERMS);
    return JSON.stringify([a, E.creditMemo(a.id), E.memoSftpRow(E.creditMemo(a.id))]);
  }
  ok(snap() === snap(), 'two fresh init() runs: identical TERMS-basis record, memo and SFTP row');
  E.init(D);
});

// ---------------------------------------------------------------------------
// v2.15 — Ravi's ENBD credit card and personal loan come through the same Al Tareq consent
// (JOURNEY-BANKAPP-SPEC.md §1, §3, §4). Same totals (AED 900/month), so every Mizan number is unchanged.
group('22. Addendum v2.15: j1’s ENBD card ••7702 and loan ••3317 — same AED 900 total, every Mizan number unchanged', () => {
  E.init(D);
  const j = D.personasJourney[0], cn = j.connected;
  const OF = { aecb: true, openFinance: true };

  // ---- the data shape ----
  ok(cn.accounts.length === 4 && cn.accounts.map(a => a.type).join(',') === 'Current account,Savings account,Credit card,Personal loan' &&
     cn.accounts.map(a => a.bank + ' ' + a.mask).join(',') === 'ENBD 4821,FAB 0193,ENBD 7702,ENBD 3317',
     'j1 has four connected accounts: ENBD current ••4821, FAB savings ••0193, ENBD credit card ••7702, ENBD personal loan ••3317');
  const card = cn.accounts[2], loan = cn.accounts[3];
  ok(card.limit === 12000 && card.balance === 7440 && card.monthlyRepayment === 400 && Math.round(card.balance / card.limit * 100) === 62 &&
     card.limit === j.aecb.cardLimitTotal && card.balance === j.aecb.cardBalanceTotal, 'the card: limit 12,000, balance 7,440 (62%, = the AECB card totals), AED 400 a month');
  ok(loan.outstanding === 6200 && loan.instalment === 500 && loan.endsOn === '2027-03', 'the loan: outstanding 6,200, AED 500 a month, ends Mar 2027');
  ok(card.monthlyRepayment + loan.instalment === 900 && cn.observedObligationsMonthly === 900 && j.aecb.obligationsMonthly === 900 &&
     JSON.stringify(cn.observedObligations) === JSON.stringify([{ label: 'Credit-card repayment', amount: 400 }, { label: 'Personal-loan instalment', amount: 500 }]) &&
     cn.observedObligations.reduce((s, o) => s + o.amount, 0) === 900, 'card 400 + loan 500 = 900 = observedObligationsMonthly = the AECB obligations');
  ok(j.aecb.cards === 1 && j.aecb.activeLoans === 1 && j.aecb.tradelines === 2, 'AECB: 1 card, 1 active loan, 2 tradelines (now consistent)');
  ok(cn.accounts.filter(a => /account$/i.test(a.type)).map(a => a.mask).join(',') === '4821,0193', 'the deposit accounts (the botim tiles) are still current + savings');

  // ---- every Mizan number for Ravi is unchanged: the engine reads the totals only ----
  const pre = JSON.parse(JSON.stringify(j));   // j1 as of v2.14: two deposit accounts, no loan on file
  pre.connected.accounts = pre.connected.accounts.slice(0, 2); pre.aecb.activeLoans = 0;
  delete pre.connected.observedObligations; pre.connected.observedObligationsLabel = 'Credit-card repayment';
  const runOf = (applicant) => {
    E.init(D);
    const pq = E.prequalify(applicant, OF);
    const r = E.decide({ productId: 'personal_loan', applicant, amount: 15000, tenorMonths: 12, consents: OF });
    const big = E.decide({ productId: 'personal_loan', applicant, amount: 110000, tenorMonths: 6, consents: OF });
    const rest = (x) => { const o = Object.assign({}, x); delete o.applicantSnapshot; return o; };
    const memo = E.creditMemo(r.id);
    return { pq, r, big, key: JSON.stringify([pq, rest(r), rest(big), memo, E.memoSftpRow(memo)]) };
  };
  const now = runOf(j), was = runOf(pre);
  ok(now.pq.indicativeMin === 10000 && now.pq.indicativeMax === 40000 && now.pq.maxByTermMonths[6] === 10000 && now.pq.maxByTermMonths[12] === 21000 &&
     now.pq.maxByTermMonths[24] === 40000, 'prequalify(): AED 10,000–40,000; caps 6 → 10,000 · 12 → 21,000 · 24 → 40,000');
  ok(now.r.outcome === 'APPROVE' && now.r.limit.approved === 15000 && now.r.pricing.kfs.tenorMonths === 12 && now.r.pricing.kfs.rateMid === 0.0899 &&
     now.r.pricing.kfs.monthlyInstalment === 1311.7 && now.r.score.points === 737 && now.r.score.grade === 'B' && now.r.features.existingObligations === 900,
     'decide(): APPROVE AED 15,000 · 12 months · 8.99% · AED 1,311.70 · NoorScore 737 (B) · obligations AED 900');
  ok(now.big.limit.approved === 10000 && now.big.limit.bindingConstraint === 'FCF', '110,000 / 6 months: still reduced to AED 10,000 (FCF binds)');
  ok(now.key === was.key, 'with the card and the loan in the data, prequalify(), both decisions (all but the applicant snapshot), the memo and the SFTP row are identical to v2.14’s');

  // ---- privacy: the new masks and figures never reach the memo ----
  const memo = E.creditMemo((runOf(j)).r.id), sftp = E.memoSftpRow(memo), rec = E.listDecisions()[1];
  const body = JSON.stringify(memo) + '\n' + sftp.row.join(',');
  const bad = ['7702', '3317', '12,000', '12000', '7,440', '7440', '6,200', '6200', 'credit card ••', 'Credit card', 'Personal loan ••', 'Personal-loan instalment', 'Mar 2027', '2027-03'].filter(w => body.includes(w));
  ok(bad.length === 0, 'memo + SFTP row: no card or loan mask, no limit, balance or outstanding, no "credit card ••"' + (bad.length ? ' (found: ' + bad.join(', ') + ')' : ''));
  ok(rawValuesOf(rec).has(6200) && rawValuesOf(rec).has(12000) && rawValuesOf(rec).has(7440), 'the v2.5 privacy scan now also forbids the loan outstanding (6,200) and the card limit and balance (12,000 / 7,440)');
  const hits = privacyScan(rec, memo, sftp, { incomeBand: T.income(12000), dbrBand: T.dbr(rec.features.dbrPct), freeCashFlowBand: T.fcf(3700),
    instalmentToCashFlowBand: T.share(rec.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) });
  ok(hits.length === 0, 'j1 memo with the card and the loan: the recursive privacy scan stays clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));
  ok(forbiddenKeys(memo).length === 0, 'memo keys stay on the allowlist (no accounts)');
  ok(runOf(j).key === runOf(j).key, 'two fresh init() runs: identical');
  E.init(D);
});

group('23. Addendum v2.16: the Emirates ID front + back — employer cross-checked against the WPS salary payer; refer only, every Ravi number unchanged', () => {
  E.init(D);
  const j = D.personasJourney[0], cn = j.connected, eidData = j.emiratesId;
  const OF = { aecb: true, openFinance: true };
  const TERMS = { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0', acceptedAt: D.TODAY + 'T08:58:00.000Z' };
  const FORBIDDEN_KEY = /nation|countr|destin|relig|service|merchant|carrier|city|airport/i;
  const keysDeep = (x, out) => { out = out || []; if (x && typeof x === 'object') for (const k of Object.keys(x)) { out.push(k); keysDeep(x[k], out); } return out; };
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const NEW_RULES = ['POL_ID_VALID', 'POL_EMPLOYER_MATCH'];
  const ruleOf = (rec, id) => rec.rules.find(r => r.id === id) || {};
  const decideJ = (applicant, over) => { const r = E.decide(Object.assign({ productId: 'personal_loan', applicant, amount: 15000, tenorMonths: 12, consents: OF, emiratesId: true }, over || {})); collect(r.reasonCodes); return r; };
  const withPayer = (payer) => { const c = clone(j); if (payer === null) delete c.connected.salaryPayer; else c.connected.salaryPayer = payer; return c; };
  const withExpiry = (iso) => { const c = clone(j); c.emiratesId.front.expiry = iso; return c; };
  const PALMGATE = 'SALARY/WPS PALMGATE TRADING';
  const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

  // ---- the data ----
  eq(JSON.stringify(eidData.front), JSON.stringify({ nameEn: 'Ravi Kumar', nameAr: 'رافي كومار', idMasked: '784-••••-•••••••-4', dob: '1995-03-14', nationality: 'India', expiry: '2028-02-09' }),
     'j1.emiratesId.front exactly as specified (amendment 9 Oct: nationality India read from the front)');
  eq(JSON.stringify(eidData.back), JSON.stringify({ occupation: 'Warehouse Supervisor', employer: 'Dunecrest Logistics LLC', issuingPlace: 'Dubai' }), 'j1.emiratesId.back exactly as specified (a fictitious employer)');
  eq(cn.salaryPayer, 'SALARY/WPS DUNECREST LOGISTICS', 'connected.salaryPayer is the WPS payer name on the salary credit');
  ok(cn.accounts.length === 4 && cn.accounts.every(a => a.holderName === 'RAVI KUMAR'), 'every connected account carries holderName "RAVI KUMAR"');
  /* amendment 9 Oct: the one nationality field is the ID front's (identity and enrichment routing); no sex or country field anywhere */
  const badK = keysDeep(eidData.back).concat(keysDeep(cn), Object.keys(eidData.front).filter(k => k !== 'nationality')).filter(k => FORBIDDEN_KEY.test(k) || /^(sex|gender)$/i.test(k));
  const natKeys = []; (function walk(x, at) { if (x && typeof x === 'object') for (const k of Object.keys(x)) { if (/nation/i.test(k)) natKeys.push(at + k); walk(x[k], at + k + '.'); } })(j, '');
  ok(badK.length === 0 && !keysDeep(j).some(k => /^(sex|gender|country)$/i.test(k)) && !/"sex"|"gender"|"country"/i.test(JSON.stringify(j)) && natKeys.join() === 'emiratesId.front.nationality',
     'no sex or country field on j1; the v2.9 FORBIDDEN_KEY regex is clean on the ID back, the rest of the front and j1.connected; the only nationality field is emiratesId.front.nationality' + (badK.length ? ' (' + badK.join(', ') + ')' : ''));
  const [dy, dm, dd] = eidData.front.dob.split('-').map(Number), [ty, tm, td] = D.TODAY.split('-').map(Number);
  eq(ty - dy - ((tm < dm || (tm === dm && td < dd)) ? 1 : 0), j.age, 'date of birth 1995-03-14 → age 31 as of TODAY (' + D.TODAY + ') = j1.age');
  eq(D.reasonCodes.RC_EMPLOYER_MISMATCH && D.reasonCodes.RC_EMPLOYER_MISMATCH.en, 'Your salary comes from a different company than your Emirates ID shows — maybe you changed jobs? A salary certificate or employment letter will sort it out.', 'RC_EMPLOYER_MISMATCH English wording');
  eq(D.reasonCodes.RC_ID_EXPIRED && D.reasonCodes.RC_ID_EXPIRED.en, 'Your Emirates ID has expired — please renew it or scan your new card.', 'RC_ID_EXPIRED English wording');
  for (const c of ['RC_EMPLOYER_MISMATCH', 'RC_ID_EXPIRED']) {
    const rc = D.reasonCodes[c];
    ok(rc && ARABIC.test(rc.ar || '') && !/\d/.test(rc.en) && !/dunecrest|palmgate|wps|nationalit|\bsex\b/i.test(rc.en + rc.ar), c + ': English + Arabic, customer-safe (no figures, no company, no payer)');
  }

  // ---- checkEmiratesId() for j1: pure ----
  const before = E.listDecisions().length;
  const t0 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF });
  const ck = E.checkEmiratesId(j);
  E.checkEmiratesId(j, true, { salaryPayer: PALMGATE });
  const t1 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF });
  ok(E.listDecisions().length === before + 2 && new Date(t1.createdAt) - new Date(t0.createdAt) === 37000, 'checkEmiratesId() is pure: no record, no clock tick (the what-if too)');
  ok(ck.employerMatch.match === true && ck.employerMatch.score === 100 && ck.employerMatch.idEmployer === 'Dunecrest Logistics LLC' && ck.employerMatch.salaryPayer === 'SALARY/WPS DUNECREST LOGISTICS',
     'j1: "Dunecrest Logistics LLC" ↔ "SALARY/WPS DUNECREST LOGISTICS" → match (100% of the employer’s words)');
  ok(ck.nameMatch.match === true && ck.nameMatch.idName === 'Ravi Kumar' && ck.nameMatch.accountHolder === 'RAVI KUMAR', 'j1: the name on the ID matches the account holder ("Ravi Kumar" ↔ "RAVI KUMAR")');
  ok(ck.expiryValid === true && ck.ageFromDob === 31, 'j1: the card is valid (expires 2028-02-09); age from the date of birth 31');
  eq(JSON.stringify(ck.notRead), JSON.stringify(['sex']), 'notRead lists sex only (amendments 9 Oct: nationality is read; the images are kept inside Noor)');
  eq(ck.retainedInsideNoor, true, 'retainedInsideNoor: true — the ID images are Noor’s KYC records (amendment 2)');
  eq(JSON.stringify(E.EMIRATES_ID_NOT_READ), JSON.stringify(['sex']), 'the engine exports the not-read list');
  eq(ck.fieldsRead.join(','), 'nameEn,nameAr,idMasked,dob,nationality,expiry,occupation,employer', 'fieldsRead: name (EN + AR), masked ID, date of birth, nationality, expiry, occupation, employer — nothing else');
  ok(ck.nationality === 'India' && ck.enrichment && ck.enrichment.corridor === 'IN' && ck.enrichment.offer.length === 2 && /Credit Passport/.test(ck.enrichment.offer[0]) && /statements/.test(ck.enrichment.offer[1]) &&
     /identity and enrichment routing only — never a NoorScore or decision input/.test(ck.enrichment.use),
     'nationality India routes enrichment: the Indian corridor (Credit Passport, home-country statements) — identity and enrichment only, never a score input');
  ok(E.checkEmiratesId(j, { front: Object.assign({}, eidData.front, { nationality: 'Philippines' }), back: eidData.back }).enrichment.corridor === null &&
     E.checkEmiratesId(j, { front: Object.assign({}, eidData.front, { nationality: 'Egypt' }), back: eidData.back }).enrichment.corridor === 'EG',
     'outside the India / Pakistan / Egypt corridors no home-country data is offered (Philippines → none; Egypt → EG)');
  ok(['fieldsRead', 'notRead', 'expiryValid', 'ageFromDob', 'nameMatch', 'employerMatch'].every(k => k in ck) && ['idName', 'accountHolder', 'match'].every(k => k in ck.nameMatch) &&
     ['idEmployer', 'salaryPayer', 'score', 'match'].every(k => k in ck.employerMatch), 'the result carries the specified shape');
  eq(JSON.stringify(E.checkEmiratesId(j, { front: eidData.front, back: eidData.back })), JSON.stringify(ck), 'an explicit {front, back} gives the same result as the record (true)');
  const pg = E.checkEmiratesId(j, true, { salaryPayer: PALMGATE });
  ok(pg.employerMatch.match === false && pg.employerMatch.score === 0 && pg.employerMatch.salaryPayer === PALMGATE && pg.nameMatch.match === true,
     'the what-if payer "SALARY/WPS PALMGATE TRADING" → no match (0%); the name still matches');
  const noOf = E.checkEmiratesId(j, true, { openFinance: false });
  ok(noOf.employerMatch.match === null && noOf.employerMatch.salaryPayer === null && noOf.nameMatch.match === null && noOf.expiryValid === true,
     'without Open Finance nothing is read from the accounts: employer and name checks wait (null)');
  throwsWith(() => E.checkEmiratesId(j, { front: eidData.front }), 'both sides', 'a scan without the back is refused');
  throwsWith(() => E.checkEmiratesId(P.r1), 'no Emirates ID scan', 'a persona without a scan on file is refused');

  // ---- normalisation: suffixes, payroll words, abbreviations, the 70% threshold ----
  const em = (employer, payer) => E.checkEmiratesId(j, { front: eidData.front, back: { occupation: 'Clerk', employer } }, { salaryPayer: payer }).employerMatch;
  const CASES = [
    ['Dunecrest Logistics L.L.C.', 'SAL/DUNECREST LOG', true, 100, 'L.L.C. dropped; SAL and "/" dropped; LOG → LOGISTICS'],
    ['dunecrest logistics llc', 'salary/wps dunecrest logistics', true, 100, 'case-insensitive'],
    ['Palmgate Trdg FZCO', PALMGATE, true, 100, 'FZCO dropped; TRDG → TRADING'],
    ['Oasis Facility Svcs Ltd', 'WPS OASIS FACILITY SERVICES CO', true, 100, 'LTD and CO dropped; SVCS → SERVICES'],
    ['Saffron Bay FZE', 'SALARY SAFFRON BAY', true, 100, 'FZE dropped'],
    ['Dunecrest Marine Logistics Services LLC', 'WPS/DUNECREST MARINE LOGISTICS', true, 75, '3 of 4 words = 75% ≥ 70% → match'],
    ['Dunecrest Logistics Group LLC', 'SALARY/WPS DUNECREST LOGISTICS', false, 67, '2 of 3 words = 67% < 70% → no match'],
    ['Dunecrest Logistics LLC', PALMGATE, false, 0, 'a different company → no match'],
    ['LLC', 'SALARY/WPS LLC', false, 0, 'nothing left after the suffixes → no match']
  ];
  for (const [e1, p1, want, score, why] of CASES) {
    const r = em(e1, p1);
    ok(r.match === want && r.score === score, '"' + e1 + '" ↔ "' + p1 + '": ' + (want ? 'match' : 'no match') + ' ' + score + '% — ' + why + ' (got ' + r.match + ' ' + r.score + '%)');
  }

  // ---- decide() with the ID: the pull, both rules PASS, Ravi's numbers unchanged ----
  E.init(D);
  const base = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF });
  E.init(D);
  const r = decideJ(j);
  eq(r.dataPulls.map(p => p.source).join(','), 'AECB_CONSUMER,OPEN_FINANCE,EMIRATES_ID', 'pulls: AECB, Open Finance, then EMIRATES_ID');
  const pull = r.dataPulls[2];
  ok(pull.status === 'SCANNED' && pull.summary.scan === 'front + back scanned' && pull.summary.notRead === 'sex' && /kept inside Noor \(KYC records\) — never shared/.test(pull.summary.images) && pull.summary.employerMatch === 'match — 100% (WPS salary payer)' &&
     pull.summary.nameMatch === 'matches the account holder' && pull.summary.expiry === 'valid' && /nationality \(identity and enrichment routing only\)/.test(pull.summary.fieldsRead),
     'the EMIRATES_ID pull: "front + back scanned", not read: sex, images kept inside Noor, nationality for identity and enrichment routing only, employer match, name match, valid');
  ok(!/dunecrest|warehouse|1995|palmgate|india/i.test(JSON.stringify(pull)), 'the pull summary carries flags only — no employer, payer, occupation, date of birth or nationality value');
  ok(!Object.keys(r.features).some(k => /nation|enrich|corridor/i.test(k)) && !/india|nationality/i.test(JSON.stringify(r.rules) + JSON.stringify(r.score) + JSON.stringify(r.features)),
     'no feature, rule or score field carries the nationality');
  ok(ruleOf(r, 'POL_ID_VALID').result === 'PASS' && ruleOf(r, 'POL_EMPLOYER_MATCH').result === 'PASS' && ruleOf(r, 'POL_ID_VALID').category === 'POLICY',
     'POL_ID_VALID PASS and POL_EMPLOYER_MATCH PASS');
  ok(r.features.idExpiryValid === true && r.features.idNameMatch === true && r.features.employerMatch === true && r.features.employerMatchScore === 100,
     'features: idExpiryValid, idNameMatch, employerMatch true; employerMatchScore 100');
  ok(r.outcome === 'APPROVE' && r.limit.approved === 15000 && r.pricing.kfs.tenorMonths === 12 && r.pricing.kfs.rateMid === 0.0899 && r.pricing.kfs.monthlyInstalment === 1311.7 &&
     r.score.points === 737 && r.score.grade === 'B' && r.noorScore.value === 737 && r.reasonCodes.length === 0, 'Ravi with a matching ID: APPROVE AED 15,000 · 12 months · 8.99% · AED 1,311.70 · NoorScore 737 (B), no reason codes');
  eq(fingerprint(r), V27_FINGERPRINTS.j1, 'the v2.9 fingerprint for j1 still matches with the Emirates ID');
  const same = (x) => JSON.stringify([x.outcome, x.limit, x.pricing, x.score, x.noorScore, x.reasonCodes, x.token, x.repayment, x.consents, x.status]);
  eq(same(r), same(base), 'outcome, limit, pricing, score, reason codes, token, repayment and consents are identical with and without the scan');
  const stripNew = (x) => { const o = clone(x); for (const k of ['idExpiryValid', 'idNameMatch', 'employerMatch', 'employerMatchScore']) delete o[k]; return JSON.stringify(o); };
  ok(stripNew(r.features) === JSON.stringify(base.features) && JSON.stringify(r.rules.filter(x => !NEW_RULES.includes(x.id))) === JSON.stringify(base.rules),
     'the other features and rules are unchanged; the two rules are added');
  const big = decideJ(j, { amount: 110000, tenorMonths: 6 });
  ok(big.limit.approved === 10000 && big.limit.bindingConstraint === 'FCF' && big.outcome === 'APPROVE', '110,000 / 6 months with the ID: still reduced to AED 10,000 (FCF binds)');
  ok(r.emiratesId && r.emiratesId.scanned === 'FRONT_AND_BACK' && r.emiratesId.idMasked === '784-••••-•••••••-4' && r.emiratesId.check.employerMatch.match === true,
     'the record keeps the check internally (record.emiratesId)');
  ok(r.emiratesId.images.retainedInsideNoor === true && /KYC record-keeping \(AML\)/.test(r.emiratesId.images.purpose) &&
     r.emiratesId.images.refs.join() === 'KYC-' + r.id.slice(4) + '-EID-FRONT.jpg,KYC-' + r.id.slice(4) + '-EID-BACK.jpg',
     'the ID images are kept inside Noor as KYC records (internal references on the record, amendment 2)');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF, emiratesId: true }), 'personal-loan decisions only', 'the scan feeds personal-loan decisions only');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: P.r1, amount: 50000, tenorMonths: 24, consents: OF, emiratesId: true }), 'no Emirates ID scan', 'emiratesId:true for a persona without a scan is refused');

  // ---- the memo: the flag only ----
  const memo = E.creditMemo(r.id), sftp = E.memoSftpRow(memo);
  /* v2.18 §1b — verified / not verified only; the employer match shows as the Fraud & Integrity factor "Employment confirmed" */
  eq(memo.verification.identity, 'Identity verified', 'memo identity flag: "Identity verified" (v2.18 — no UAE PASS / Emirates ID detail)');
  eq(memo.scoreComponents.components[0].factors.join('|'), 'Identity verified|Employment confirmed', 'the Fraud & Integrity bar: "Identity verified · Employment confirmed"');
  eq(memo.borrower.emiratesIdMasked, '784-••••-•••••••-4', 'the memo carries the scanned card’s masked ID only');
  E.init(D);
  const baseMemo = E.creditMemo(E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF }).id);
  const shape = (x) => JSON.stringify(keysDeep(x));
  /* v2.18 — the Fraud & Integrity factors differ by design ("Employment confirmed" needs the scan); compare everything else.
     v2.19 — so does the library code G08 Employer Confirmed (it fires on the employer match the scan makes possible). */
  const stripO = (m) => { const o = clone(m); delete o.verification.identity; delete o.borrower.emiratesIdMasked; delete o.scoreComponents.components[0].factors;
    o.decision.reasonCodes = o.decision.reasonCodes.filter(c => c.code !== 'G08'); o.outputs[1].value = o.outputs[1].value.replace(' · G08 Employer Confirmed', ''); return o; };
  const strip = (m) => JSON.stringify(stripO(m));
  const noG08 = (row) => row.map(c => c.split('|').filter(x => x !== 'G08').join('|')).join('|');
  ok(memo.decision.reasonCodes.some(c => c.code === 'G08') && !baseMemo.decision.reasonCodes.some(c => c.code === 'G08') &&
     shape(stripO(memo)) === shape(stripO(baseMemo)) && strip(memo) === strip(baseMemo) && JSON.stringify(sftp.header) === JSON.stringify(E.memoSftpRow(baseMemo).header) &&
     noG08(sftp.row) === noG08(E.memoSftpRow(baseMemo).row), 'the memo shape and every other memo field and SFTP cell are unchanged (v2.19: G08 Employer Confirmed added by the scan)');
  /* v2.19 — "Salary Through WPS" is Partner Bank's requested code (the payment channel, never the payer's name) */
  const body = (JSON.stringify(memo) + '\n' + sftp.row.join(',')).split('Salary Through WPS').join('');
  const leaked = ['Dunecrest', 'DUNECREST', 'Logistics', 'SALARY/WPS', 'WPS', 'Warehouse', 'Supervisor', '1995-03-14', '14/03/1995', '1995', '2028-02-09', 'Dubai', 'idEmployer', 'salaryPayer', 'occupation',
    'India', 'Indian', 'nationality', 'enrichment'].filter(w => body.includes(w));
  ok(leaked.length === 0, 'memo + SFTP row: no employer, payer, occupation, date of birth, expiry, issuing place or nationality' + (leaked.length ? ' (found: ' + leaked.join(', ') + ')' : ''));
  const expect = { incomeBand: T.income(12000), dbrBand: T.dbr(r.features.dbrPct), freeCashFlowBand: T.fcf(3700), instalmentToCashFlowBand: T.share(r.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) };
  const words = identityWordsOf(r);
  ok(['Dunecrest Logistics LLC', 'Warehouse Supervisor', 'SALARY/WPS DUNECREST LOGISTICS', '1995-03-14', '14/03/1995', 'Dunecrest', 'India'].every(w => words.includes(w)),
     'the privacy scan now also forbids the employer, the occupation, the salary payer, the date of birth and the nationality');
  let hits = privacyScan(r, memo, sftp, expect);
  ok(hits.length === 0, 'j1 memo with the Emirates ID: the recursive privacy scan stays clean' + (hits.length ? ' (' + hits.slice(0, 4).join('; ') + ')' : ''));
  ok(words.includes(r.emiratesId.images.refs[0]) && words.includes(r.emiratesId.images.refs[1]), 'the privacy scan also forbids the ID image references (amendment 2)');
  for (const leak of ['Dunecrest Logistics LLC', 'warehouse supervisor', 'SALARY/WPS DUNECREST LOGISTICS', '14/03/1995', 'India', r.emiratesId.images.refs[0], 'scan of the ID: eid-front.png', 'ID images on file']) {
    const m2 = clone(memo); m2.verification.identity += ' · ' + leak;
    ok(privacyScan(r, m2, sftp, expect).length > 0, 'the extended scan catches "' + leak + '" planted in the memo');
  }
  ok(forbiddenKeys(memo).length === 0, 'memo keys stay on the allowlist');
  E.init(D);
  const rt = decideJ(j, { consents: { aecb: true, openFinance: true, digitalFootprint: TERMS } });
  eq(E.creditMemo(rt.id).verification.identity, 'Identity verified',
     'with the footprint check (covered by the terms) the identity flag is still "Identity verified" (v2.18 — no footprint confidence in the memo)');
  eq(rt.dataPulls.map(p => p.source).join(','), 'AECB_CONSUMER,OPEN_FINANCE,EMIRATES_ID,DIGITAL_FOOTPRINT', 'the journey’s pulls: AECB, Open Finance, Emirates ID, digital footprint');
  ok(fingerprint(rt) === V27_FINGERPRINTS.j1, 'the journey decision (ID + footprint) keeps the j1 fingerprint');

  // ---- a mismatch → REFER, never a decline, same price ----
  E.init(D);
  const mm = decideJ(withPayer(PALMGATE));
  ok(mm.outcome === 'REFER' && mm.reasonCodes.join() === 'RC_EMPLOYER_MISMATCH' && ruleOf(mm, 'POL_EMPLOYER_MATCH').result === 'REFER' && ruleOf(mm, 'POL_ID_VALID').result === 'PASS',
     'a Palmgate payer → REFER with RC_EMPLOYER_MISMATCH (POL_EMPLOYER_MATCH REFER)');
  ok(mm.outcome !== 'DECLINE' && mm.limit.approved === 15000 && mm.pricing.band === 'B' && mm.pricing.kfs.rateMid === r.pricing.kfs.rateMid &&
     mm.pricing.kfs.monthlyInstalment === 1311.7 && mm.score.points === 737 && mm.features.employerMatch === false && mm.features.employerMatchScore === 0,
     'the mismatch is not a decline: the same amount, price band B, 8.99% and AED 1,311.70; score 737');
  ok(!mm.token && E.referQueue().some(q => q.id === mm.id && q.reason === 'RC_EMPLOYER_MISMATCH'), 'the mismatch goes to the refer queue (a person looks at it)');
  const mmMemo = E.creditMemo(mm.id), mmSftp = E.memoSftpRow(mmMemo);
  ok(mmMemo.verification.identity === 'Identity verified' && mmMemo.scoreComponents.components[0].tone === 'red' && mmMemo.scoreComponents.components[0].factors.includes('Details differ — under review') &&
     mmMemo.decision.reasonCodes.filter(c => c.colour !== 'GREEN').map(c => c.code).join() === 'Y11' && mmMemo.decision.reasonCodes.find(c => c.code === 'Y11').en === 'Employer Differs From ID' &&
     ARABIC.test(mmMemo.decision.reasonCodes.find(c => c.code === 'Y11').ar) && !/RC_/.test(JSON.stringify(mmMemo)),
     'the mismatch memo (v2.18): Fraud & Integrity red, "Details differ — under review"; the reason travels as its library code Y11 Employer Differs From ID (v2.19, no RC_* name) with its Arabic');
  ok(!/palmgate|dunecrest|wps/i.test((JSON.stringify(mmMemo) + mmSftp.row.join(',')).split('Salary Through WPS').join('')) && privacyScan(mm, mmMemo, mmSftp, Object.assign({}, expect, { dbrBand: T.dbr(mm.features.dbrPct), instalmentToCashFlowBand: T.share(mm.features.instalmentToFcfPct) })).length === 0,
     'the mismatch memo names neither company nor the payer; the privacy scan stays clean');

  // ---- an expired card → REFER with RC_ID_EXPIRED ----
  E.init(D);
  const ex = decideJ(withExpiry(addDays(D.TODAY, -1)));
  ok(ex.outcome === 'REFER' && ex.reasonCodes.join() === 'RC_ID_EXPIRED' && ruleOf(ex, 'POL_ID_VALID').result === 'REFER' && ruleOf(ex, 'POL_EMPLOYER_MATCH').result === 'PASS' &&
     ex.limit.approved === 15000 && ex.pricing.kfs.monthlyInstalment === 1311.7 && ex.features.idExpiryValid === false,
     'a card that expired yesterday → REFER with RC_ID_EXPIRED; the same amount and price');
  ok(E.creditMemo(ex.id).verification.identity === 'Identity not verified' && E.creditMemo(ex.id).scoreComponents.components[0].factors.includes('ID document expired'),
     'the expired memo (v2.18): "Identity not verified", and the Fraud & Integrity bar says the ID document expired');
  ok(decideJ(withExpiry(D.TODAY)).outcome === 'APPROVE', 'a card expiring today is still valid');
  const both = decideJ((() => { const c = withPayer(PALMGATE); c.emiratesId.front.expiry = '2026-01-31'; return c; })());
  ok(both.outcome === 'REFER' && both.reasonCodes.join() === 'RC_ID_EXPIRED,RC_EMPLOYER_MISMATCH' && both.pricing.kfs.monthlyInstalment === 1311.7, 'expired and mismatched → REFER with both codes, never a decline');

  // ---- without Open Finance → INFO ----
  E.init(D);
  const nf = decideJ(j, { consents: { aecb: true, openFinance: false } });
  ok(ruleOf(nf, 'POL_EMPLOYER_MATCH').result === 'INFO' && /checked once accounts are connected/.test(ruleOf(nf, 'POL_EMPLOYER_MATCH').observed) && nf.features.employerMatch === null &&
     nf.dataPulls.some(p => p.source === 'EMIRATES_ID' && /checked once accounts are connected/.test(p.summary.employerMatch)) && !nf.reasonCodes.includes('RC_EMPLOYER_MISMATCH'),
     'without Open Finance: POL_EMPLOYER_MATCH INFO ("checked once accounts are connected"), no reason code');
  ok(E.creditMemo(nf.id).verification.identity === 'Identity verified' && E.creditMemo(nf.id).scoreComponents.components[0].factors.join() === 'Identity verified',
     'without Open Finance (v2.18): "Identity verified", and the Fraud & Integrity bar does not claim the employment is confirmed');
  E.init(D);
  const nfBase = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: { aecb: true, openFinance: false } });
  ok(nf.outcome === nfBase.outcome && JSON.stringify(nf.limit) === JSON.stringify(nfBase.limit) && JSON.stringify(nf.pricing) === JSON.stringify(nfBase.pricing),
     'without Open Finance the scan changes neither the outcome nor the limit nor the price');
  const np = decideJ(withPayer(null));
  ok(ruleOf(np, 'POL_EMPLOYER_MATCH').result === 'INFO' && /no salary payer seen/.test(ruleOf(np, 'POL_EMPLOYER_MATCH').observed) && np.outcome === 'APPROVE',
     'Open Finance without a salary payer → INFO, APPROVE');
  const all = [r, mm, ex, both, nf, np];
  ok(all.every(x => x.outcome !== 'DECLINE' && NEW_RULES.every(id => ['PASS', 'REFER', 'INFO'].includes(ruleOf(x, id).result))), 'the two rules only PASS, REFER or INFO — never FAIL, never a decline');

  // ---- the v2.9 guardrail (amendment 9 Oct): nationality is read for identity and enrichment only — never a score or decision input; sex never read ----
  const tagged = clone(j);
  tagged.emiratesId.front.nationality = 'Pakistan'; tagged.emiratesId.front.sex = 'M'; tagged.emiratesId.back.sex = 'M';
  const ckTag = E.checkEmiratesId(tagged);
  const noNat = (x) => { const o = clone(x); delete o.nationality; delete o.enrichment; return JSON.stringify(o); };
  ok(ckTag.nationality === 'Pakistan' && ckTag.enrichment.corridor === 'PK' && noNat(ckTag) === noNat(ck) && !/"M"/.test(JSON.stringify(ckTag)) && !ckTag.fieldsRead.includes('sex'),
     'a scan with a different nationality (and a sex field): checkEmiratesId() differs only in the nationality and its enrichment route — sex is never read');
  E.init(D);
  const rTag = decideJ(tagged);
  const cmp = (x) => JSON.stringify([x.outcome, x.limit, x.pricing, x.score, x.noorScore, x.reasonCodes, x.features, x.rules, x.dataPulls, x.token && x.token.conditions]);
  ok(cmp(rTag) === cmp(r) && rTag.score.points === 737 && rTag.score.grade === 'B' && rTag.limit.approved === 15000 && rTag.pricing.kfs.monthlyInstalment === 1311.7,
     'a different nationality gives an identical decision: outcome, points 737, grade B, price, limit, features, rules and pulls (the v2.9 guardrail)');
  ok(!/Pakistan|"M"/.test(JSON.stringify(rTag.rules) + JSON.stringify(rTag.dataPulls) + JSON.stringify(rTag.features) + JSON.stringify(E.creditMemo(rTag.id)) + E.memoSftpRow(E.creditMemo(rTag.id)).row.join(',')),
     'the nationality value and the sex field reach no rule, pull, feature, memo or SFTP row');
  const log = new Set();
  const recorder = (obj) => new Proxy(obj, { get(t, prop, recv) { if (typeof prop === 'string') log.add(prop); const v = Reflect.get(t, prop, recv); return v && typeof v === 'object' ? recorder(v) : v; } });
  E.checkEmiratesId(j, recorder(clone(tagged.emiratesId)));
  const read = [...log];
  ok(read.every(k => ['front', 'back', 'nameEn', 'nameAr', 'idMasked', 'dob', 'nationality', 'expiry', 'occupation', 'employer'].includes(k)) && !log.has('sex') && !log.has('issuingPlace'),
     'checkEmiratesId() reads only the allowlisted card fields (nationality included, for identity and enrichment) — never sex (read: ' + read.join(', ') + ')');

  // ---- vocabulary, determinism ----
  const v216Text = JSON.stringify([ck, pg, r.rules, r.dataPulls, mm.rules, ex.rules, nf.rules, memo, mmMemo, D.reasonCodes.RC_EMPLOYER_MISMATCH, D.reasonCodes.RC_ID_EXPIRED, j.emiratesId]);
  ok(!banned.test(v216Text) && !mentionsSalaryTransfer(v216Text), 'no banned vocabulary or salary-transfer wording in the v2.16 data, checks, rules, pulls or memos');
  const run = () => { E.init(D); const x = decideJ(j); const m = E.creditMemo(x.id); return JSON.stringify([E.checkEmiratesId(j), x, m, E.memoSftpRow(m)]); };
  ok(run() === run(), 'two fresh init() runs: identical');
  for (const x of E.listDecisions()) collect(x.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. v2.16) exists with Arabic');
  E.init(D);
});

group('24. Addendum v2.17 (revised 9 Oct): two steps to a score — data completeness first (threshold 70, illustrative), then NoorScore', () => {
  E.init(D);
  const j = D.personasJourney[0];
  const OF = { aecb: true, openFinance: true };
  const ALL = ['4821', '0193', '7702', '3317'], NO_CARD_LOAN = ['4821', '0193'], NO_CURRENT = ['0193', '7702', '3317'];
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|salary transfer assignment|transfer (your|their) salary to/i;
  const decideDs = (approved, over) => { const r = E.decide(Object.assign({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF,
    dataSources: { approvedAccounts: approved, months: 12 } }, over || {})); collect(r.reasonCodes); return r; };
  const comp = (dc) => dc.components.map(c => c.key + ':' + c.points + '/' + c.weight).join(' ');
  const rule = (r) => r.rules.find(x => x.id === 'POL_DATA_COMPLETENESS') || {};

  // ---- the param ----
  const prm = E.getPolicy('personal_loan').params;
  eq(prm.completenessThresholdPct, 70, 'personal_loan.completenessThresholdPct = 70 by default (illustrative)');
  throwsWith(() => E.simulateBook('personal_loan', { completenessThresholdPct: 49 }), 'outside allowed bounds', 'completenessThresholdPct below 50 is refused');
  throwsWith(() => E.simulateBook('personal_loan', { completenessThresholdPct: 91 }), 'outside allowed bounds', 'completenessThresholdPct above 90 is refused');
  throwsWith(() => E.publishPolicy('personal_loan', { completenessThresholdPct: 80 }, { author: 'risk.lead', approver: 'risk.lead' }), '4-eyes', 'publishing the threshold needs 4-eyes (author ≠ approver)');
  eq(RC_TEXT(), 'We need a fuller picture before we can calculate your score — connecting your salary account, credit cards and loans usually does it.', 'RC_DATA_INCOMPLETE English wording');
  function RC_TEXT() { return D.reasonCodes.RC_DATA_INCOMPLETE && D.reasonCodes.RC_DATA_INCOMPLETE.en; }
  ok(ARABIC.test(D.reasonCodes.RC_DATA_INCOMPLETE.ar) && !/\d/.test(D.reasonCodes.RC_DATA_INCOMPLETE.en), 'RC_DATA_INCOMPLETE: Arabic, no figures (no threshold) in the customer text');

  // ---- step 1 for Ravi ----
  const full = E.dataCompleteness(j, ALL);
  ok(full.pct === 100 && full.threshold === 70 && full.aboveThreshold && full.scoreOverlay === 0 && comp(full) === 'current:50/50 salary:20/20 cards:15/15 loans:15/15' && full.ask.length === 0,
     'Ravi, everything approved: 100% (current 50 + salary 20 + cards 15 + loans 15), above the threshold, overlay 0, nothing to ask');
  eq(JSON.stringify(full.counts), JSON.stringify({ banks: 2, accounts: 4, months: 12 }), 'counts: 2 banks · 4 accounts · 12 months');
  eq(JSON.stringify(E.dataCompleteness(j)), JSON.stringify(full), 'no approved list = every connected account');
  const noSav = E.dataCompleteness(j, ['4821', '7702', '3317']);
  ok(noSav.pct === 100 && noSav.counts.accounts === 3 && noSav.counts.banks === 1, 'the FAB savings adds visibility (a bank, an account) but no points');
  const cl = E.dataCompleteness(j, NO_CARD_LOAN);
  ok(cl.pct === 70 && cl.aboveThreshold && cl.scoreOverlay === -10 && JSON.stringify(cl.ask) === '["Credit cards","Loan accounts"]' && cl.counts.accounts === 2 && cl.counts.banks === 2,
     'card and loan unticked: 70% — at the threshold, scored with −10; ask: Credit cards, Loan accounts; 2 banks · 2 accounts');
  const nc = E.dataCompleteness(j, NO_CURRENT);
  ok(nc.pct === 30 && !nc.aboveThreshold && nc.scoreOverlay === null && JSON.stringify(nc.ask) === '["Salary account"]' && comp(nc) === 'current:0/50 salary:0/20 cards:15/15 loans:15/15',
     'the ENBD current unticked: 30% (the salary lands only there: 0 + 0 + 15 + 15) — below the threshold, no score; ask: Salary account first');
  const whatIf = E.dataCompleteness(j, [{ bank: 'ENBD', type: 'Current account', mask: '9999', salaryAccount: false, txPerMonth: 40 }]);
  ok(whatIf.pct === 50 && JSON.stringify(whatIf.ask) === '["Salary account","Credit cards","Loan accounts"]' && !whatIf.aboveThreshold,
     'the deck’s what-if, a non-salary current account only: 50%; ask Salary account, Credit cards, Loan accounts');
  const empty = E.dataCompleteness(j, [{ bank: 'ENBD', type: 'Current account', mask: '9998', salaryAccount: false, txPerMonth: 4 }]);
  ok(empty.pct === 20 && empty.components[0].points === 20 && /almost empty/.test(empty.components[0].note), 'an almost-empty current account (< 20 transactions a month) counts 20%');
  ok(E.dataCompleteness(j, [{ bank: 'ENBD', type: 'Current account', mask: '9997', salaryAccount: false, txPerMonth: 40 }], { months: 2 }).pct === 20, 'under 3 months of activity the current account counts as almost empty (20%)');
  const jEmpty = clone(j); jEmpty.connected.accounts[0].txPerMonth = 5;
  eq(E.dataCompleteness(jEmpty, ALL).pct, 70, 'Ravi with an almost-empty ENBD current account: 20 + 20 + 15 + 15 = 70%');
  eq(E.dataCompleteness(j, []).pct, 0, 'nothing approved: 0%');
  throwsWith(() => E.dataCompleteness(j, ['1234']), 'unknown account', 'an unknown mask is refused');

  // ---- prequalify: NEEDS_DATA below the threshold (pure) ----
  const n0 = E.listDecisions().length;
  const t0 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF });
  const pqNeed = E.prequalify(j, OF, { approvedAccounts: NO_CURRENT });
  const t1 = E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF });
  ok(pqNeed.status === 'NEEDS_DATA' && pqNeed.ask[0] === 'Salary account' && pqNeed.completeness.pct === 30 && !('indicativeMax' in pqNeed) && !('noorScoreEstimateBand' in pqNeed),
     'prequalify() with the current account unticked: NEEDS_DATA, ask[0] "Salary account" — no range, no score estimate');
  ok(E.listDecisions().length === n0 + 2 && new Date(t1.createdAt) - new Date(t0.createdAt) === 37000, 'NEEDS_DATA is pure: no record, no clock tick');
  const pqBase = E.prequalify(j, OF), pqAll = E.prequalify(j, OF, { approvedAccounts: ALL }), pqCl = E.prequalify(j, OF, { approvedAccounts: NO_CARD_LOAN });
  ok(!('status' in pqBase) && !('completeness' in pqBase), 'prequalify() without approved accounts is unchanged (no status, no completeness)');
  const strip = (x) => { const o = clone(x); delete o.status; delete o.completeness; return JSON.stringify(o); };
  ok(pqAll.status === 'OK' && pqAll.completeness.pct === 100 && strip(pqAll) === JSON.stringify(pqBase) && pqCl.status === 'OK' && pqCl.completeness.pct === 70 && strip(pqCl) === JSON.stringify(pqBase),
     'at or above the threshold prequalify() returns the same range (AED 10,000–40,000) with status OK and the completeness');

  // ---- decide(): 100% → 737 unchanged ----
  E.init(D);
  const base = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF });
  E.init(D);
  const r = decideDs(ALL);
  ok(r.outcome === 'APPROVE' && r.score.points === 737 && r.score.grade === 'B' && r.limit.approved === 15000 && r.pricing.kfs.monthlyInstalment === 1311.7 && rule(r).result === 'PASS',
     'decide() with dataSources at 100%: APPROVE AED 15,000 · AED 1,311.70 · NoorScore 737 (B); POL_DATA_COMPLETENESS PASS');
  eq(fingerprint(r), V27_FINGERPRINTS.j1, 'the j1 fingerprint holds at 100% completeness');
  ok(JSON.stringify([r.outcome, r.limit, r.pricing, r.score, r.reasonCodes, r.token]) === JSON.stringify([base.outcome, base.limit, base.pricing, base.score, base.reasonCodes, base.token]),
     'at 100%: outcome, limit, pricing, score, reasons and token identical to the decision without dataSources');
  ok(r.dataCompleteness && r.dataCompleteness.pct === 100 && r.dataCompleteness.threshold === 70 && r.features.dataCompletenessPct === 100,
     'the record keeps the completeness (internal: threshold and components) and the feature dataCompletenessPct');
  const au = r.audit.find(a => a.action === 'DATA_COMPLETENESS');
  ok(au && au.detail === '100% complete · 2 banks · 4 accounts · 12 months · threshold 70% (illustrative) · scored (nothing to add)', 'a DATA_COMPLETENESS audit line (' + (au && au.detail) + ')');

  // ---- 70% → 727, still grade B, same amounts and APR band ----
  E.init(D);
  const r70 = decideDs(NO_CARD_LOAN);
  ok(r70.outcome === 'APPROVE' && r70.score.points === 727 && r70.score.grade === 'B' && r70.score.overlays.some(o => o.name === 'Data completeness 70–84%' && o.delta === -10) && rule(r70).result === 'PASS',
     'card and loan unticked: 70% → overlay −10 → NoorScore 727, still grade B; POL_DATA_COMPLETENESS PASS');
  ok(r70.limit.approved === 15000 && r70.pricing.band === 'B' && r70.pricing.kfs.rateMid === r.pricing.kfs.rateMid && r70.pricing.kfs.monthlyInstalment === 1311.7 && JSON.stringify(r70.limit.trace) === JSON.stringify(r.limit.trace),
     'at 70%: the same amounts, APR band B, 8.99% and AED 1,311.70 (low data lowers the score, not the price)');
  ok(E.creditMemo(r70.id).noorScore.factors.includes('Part of the financial picture not connected') && E.creditMemo(r70.id).noorScore.value === 727, 'the 70% memo: NoorScore 727 with the factor "Part of the financial picture not connected"');

  // ---- 30% → REFER backstop, never a decline, same price ----
  const r30 = decideDs(NO_CURRENT);
  ok(r30.outcome === 'REFER' && r30.reasonCodes.join() === 'RC_DATA_INCOMPLETE' && rule(r30).result === 'REFER' && /missing: Salary account/.test(rule(r30).observed) &&
     r30.limit.approved === 15000 && r30.pricing.kfs.monthlyInstalment === 1311.7 && r30.pricing.band === 'B',
     'the current account unticked: decide() REFERs with RC_DATA_INCOMPLETE — not a decline, the same price');
  ok(E.referQueue().some(q => q.id === r30.id && q.reason === 'RC_DATA_INCOMPLETE'), 'the backstop REFER goes to the refer queue');
  E.publishPolicy('personal_loan', { completenessThresholdPct: 80 }, { author: 'risk.lead', approver: 'cro' });
  const r70at80 = decideDs(NO_CARD_LOAN);
  ok(E.getPolicy('personal_loan').params.completenessThresholdPct === 80 && r70at80.outcome === 'REFER' && r70at80.reasonCodes.includes('RC_DATA_INCOMPLETE') && r70at80.dataCompleteness.threshold === 80,
     'published to 80% under 4-eyes: the same 70% application now REFERs (threshold recorded as 80)');
  E.init(D);

  // ---- without dataSources nothing changes ----
  const plain = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF });
  ok(!('dataCompleteness' in plain) && !plain.rules.some(x => x.id === 'POL_DATA_COMPLETENESS') && !plain.audit.some(a => a.action === 'DATA_COMPLETENESS') && !('dataCompletenessPct' in plain.features) &&
     fingerprint(plain) === V27_FINGERPRINTS.j1 && !('dataCompleteness' in E.creditMemo(plain.id)) && E.memoSftpRow(E.creditMemo(plain.id)).header.join() === SFTP_HEADER.join(),
     'without dataSources: no record field, no rule, no audit line, no overlay; the fingerprint, the memo keys and the SFTP header are unchanged');
  throwsWith(() => E.decide({ productId: 'split', applicant: P.c1, amount: 12000, tenorMonths: 6, consents: OF, dataSources: { approvedAccounts: [] } }), 'personal-loan decisions only', 'dataSources feed personal-loan decisions only');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: { aecb: true, openFinance: false }, dataSources: { approvedAccounts: ALL } }), 'Open Finance', 'dataSources need Open Finance consent');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF, dataSources: ALL }), 'dataSources', 'dataSources must be { approvedAccounts, months }');

  // ---- the memo: the percentage and counts only ----
  E.init(D);
  const rm = decideDs(ALL), memo = E.creditMemo(rm.id), sftp = E.memoSftpRow(memo);
  eq(JSON.stringify(memo.dataCompleteness), JSON.stringify({ pct: 100, banks: 2, accounts: 4, months: 12 }), 'memo.dataCompleteness = { pct, banks, accounts, months } — counts only');
  ok(Object.keys(memo).join(',') === MEMO_KEYS.slice(0, MEMO_KEYS.indexOf('consents')).concat(['dataCompleteness'], MEMO_KEYS.slice(MEMO_KEYS.indexOf('consents'))).join(','),
     'the memo’s top-level keys: the allowlist plus dataCompleteness');
  ok(sftp.header.slice(-2).join() === 'data_completeness_pct,data_sources' && sftp.row.slice(-2).join('|') === '100|2 banks · 4 accounts · 12 months' && sftp.header.join() === SFTP_HEADER.join(),
     'SFTP: the completeness pair ends the row — data_completeness_pct 100, data_sources "2 banks · 4 accounts · 12 months" (v2.18: the columns follow the agreement, empty when not measured)');
  /* v2.18 — the component bars carry the required "Illustrative derivation" label and a "components" list; checked on their own */
  ok(JSON.stringify(Object.keys(memo.scoreComponents)) === '["note","derivation","components"]' && memo.scoreComponents.derivation === 'Illustrative derivation' &&
     memo.scoreComponents.components.every(c => Object.keys(c).join() === 'key,name,level,tone,factors'), 'the component bars: level, tone and factor words only, labelled "Illustrative derivation"');
  const body = JSON.stringify((() => { const o = clone(memo); delete o.scoreComponents; delete o.sharingAgreement; return o; })()) + '\n' + sftp.row.join(',');   /* the bars and the agreement's group keys are checked on their own */
  ok(!/threshold|illustrative|weight|aboveThreshold|components|scoreOverlay|70–84|"ask"/i.test(body) && !/ENBD|FAB|4821|0193|7702|3317/.test(body),
     'memo + SFTP row: no threshold, no weights, no bands, no bank names, no masks');
  const expect = { incomeBand: T.income(12000), dbrBand: T.dbr(rm.features.dbrPct), freeCashFlowBand: T.fcf(3700), instalmentToCashFlowBand: T.share(rm.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) };
  let hits = privacyScan(rm, memo, sftp, expect);
  ok(hits.length === 0, 'the privacy scan stays clean with completeness in the memo' + (hits.length ? ' (' + hits.slice(0, 3).join('; ') + ')' : ''));
  const leak = clone(memo); leak.dataCompleteness.threshold = 70;
  const leak2 = clone(memo); leak2.verification.identity += ' · completeness threshold 70%';
  ok(privacyScan(rm, leak, sftp, expect).some(h => /internal completeness field/.test(h)) && privacyScan(rm, leak2, sftp, expect).some(h => /threshold, weights or bands/.test(h)),
     'the extended privacy scan catches a threshold planted in the memo (as a field or as text)');
  ok(forbiddenKeys(memo).length === 0, 'memo keys stay on the allowlist (no accounts, no features)');
  ok(memo.outputs.find(o => o.key === 'dataCompleteness').value === '100% · 2 banks · 4 accounts · 12 months' && memo.outputs.find(o => o.key === 'dataCompleteness').status === 'Proposed',
     'the memo’s output table carries the completeness row (Proposed): 100% · 2 banks · 4 accounts · 12 months (v2.18: replaces the sharing-list line)');

  // ---- with the Emirates ID and the footprint: the journey decision ----
  E.init(D);
  const rj = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: Object.assign({ digitalFootprint: { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0' } }, OF),
                        emiratesId: true, dataSources: { approvedAccounts: ALL, months: 12 } });
  ok(fingerprint(rj) === V27_FINGERPRINTS.j1 && rj.rules.filter(x => /^POL_(ID_VALID|EMPLOYER_MATCH|DATA_COMPLETENESS)$/.test(x.id)).every(x => x.result === 'PASS'),
     'the full journey decision (Emirates ID, footprint, completeness): the j1 fingerprint, three PASSes');

  // ---- vocabulary, determinism ----
  const txt17 = JSON.stringify([full, cl, nc, whatIf, pqNeed, r.rules, r30.rules, memo, D.reasonCodes.RC_DATA_INCOMPLETE]);
  ok(!banned.test(txt17) && !mentionsSalaryTransfer(txt17), 'no banned vocabulary or salary-transfer wording in the v2.17 outputs');
  const run = () => { E.init(D); const x = decideDs(NO_CARD_LOAN); const m = E.creditMemo(x.id); return JSON.stringify([E.dataCompleteness(j, NO_CURRENT), x, m, E.memoSftpRow(m)]); };
  ok(run() === run(), 'two fresh init() runs: identical');
  for (const x of E.listDecisions()) collect(x.reasonCodes);
  ok([...emittedCodes].every(c => D.reasonCodes[c] && ARABIC.test(D.reasonCodes[c].ar)), 'every reason code emitted (incl. v2.17) exists with Arabic');
  E.init(D);
});

// ---------------------------------------------------------------------------
// v2.18 — a scan for every memo (consumer and SME, any lender): what stays inside Noor never shows (§1b).
function ipScan(memo, sftp, rec) {
  const hits = [];
  const f = (rec && rec.features) || {};
  const exactDbr = rec && Number.isFinite(f.dbrPct) && f.dbrPct < 999 ? f.dbrPct : null;
  const bk = rec && rec.productId !== 'sme_working_capital' ? bucketsOf(rec) : { headroom: null, dbrBand: null };
  const dbrBandNums = new Set((bk.dbrBand || '').match(/\d+/g) || []);   /* an exact DBR on a band boundary (r5 30%, c4 5%) is the band itself */
  const headroomNums = bk.headroom !== null ? [Math.round(bk.headroom * 100) / 100, Math.round(bk.headroom)].filter(x => Math.abs(x) >= 100) : [];
  function str(s0, where) {
    const s = String(s0).replace(/\b(RC|FND)_[A-Z0-9_]+\b/g, '').replace(/^Illustrative derivation$/, '');
    if (/≥ ?\d{3}|680–739|620–679|560–619|< ?560/.test(s)) hits.push(where + ': a NoorScore band boundary');
    if (/threshold/i.test(s)) hits.push(where + ': "threshold"');
    if (/footprint|statement|counted at|(^|[^\d.,])75 ?%|credit ?passport|uae pass|emirates id/i.test(s)) hits.push(where + ': a data-source word or the share counted');
    if (/\bpoints?\b|\bweights?\b|\bpts\b|[+−]\s?\d/i.test(s)) hits.push(where + ': a weight or points');
    if (/\.(jpe?g|png|heic|webp)\b|EID-(FRONT|BACK)|\bimages?\b|\bphotos?\b/i.test(s)) hits.push(where + ': an ID image');
    for (const tok of s.match(/\d[\d,]*(?:\.\d+)?/g) || []) {
      const v = parseFloat(tok.replace(/,/g, ''));
      if (exactDbr !== null && v === exactDbr && !dbrBandNums.has(String(v))) hits.push(where + ': the exact DBR ' + tok);
      if (headroomNums.includes(v)) hits.push(where + ': the exact headroom ' + tok);
    }
  }
  (function walk(x, path, key) {
    if (x === null || x === undefined) return;
    if (/^(weights?|points|delta|overlays|drivers|rule|rules|threshold|images|base|features|applicantSnapshot|sharing|withheld)$/.test(key)) hits.push(path + ': an internal field');
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + '[' + i + ']', key)); return; }
    if (typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], path + '.' + k, k); return; }
    if (typeof x === 'number') { if (exactDbr !== null && x === exactDbr && !dbrBandNums.has(String(x)) && path !== 'memo.affordability.dbrPct') hits.push(path + ': the exact DBR'); if (headroomNums.includes(x) && path !== 'memo.affordability.headroomMonthly') hits.push(path + ': the exact headroom'); return; }
    if (typeof x === 'string') str(x, path);
  })(memo, 'memo', '');
  sftp.header.forEach((c, i) => str(sftp.row[i], 'sftp.' + c));
  return hits;
}

group('25. Addendum v2.18 (meeting 8 Oct, methodology slides 5–8): what lenders receive, Noor IP vs lender view, findings, six components, explainable and auditable', () => {
  E.init(D);
  const j = D.personasJourney[0], a1 = D.personasCar[0], s1 = D.personasSme[0];
  const OF = { aecb: true, openFinance: true };
  const TERMS = { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0', acceptedAt: '2026-07-19T08:58:00.000Z' };
  const ALL4 = ['4821', '0193', '7702', '3317'];
  const ravi = () => E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: Object.assign({ digitalFootprint: TERMS }, OF),
                                emiratesId: true, dataSources: { approvedAccounts: ALL4, months: 12 }, lenderId: 'partner-bank' });

  // ---- data: agreements, lenders, the findings vocabulary ----
  ok(D.sharingAgreements['partner-bank'].label === 'Partner Bank v1' && D.sharingAgreements['partner-bank'].version === 'v1' && D.sharingAgreements['partner-bank'].dbrPrecision === 'BAND' &&
     D.sharingAgreements['partner-bank'].groups.length === 12, 'Partner Bank v1: the full set — Core, every Proposed output, every extra and the supporting groups (12), DBR banded');
  eq(D.sharingAgreements['lender-b'].groups.join(), 'noorScore,reasonCodes', 'Lender B (illustrative): Core only — NoorScore and band, reason codes (with findings)');
  ok(D.lenders.some(l => l.id === 'lender-b' && l.name === 'Lender B (illustrative)'), 'MizanData.lenders adds "Lender B (illustrative)"');
  eq(Object.keys(D.findings).join(), 'FND_ADDITIONAL_INCOME,FND_SAVER,FND_NEW_TO_UAE,FND_DINING_OUT,FND_DATA_HISTORY,FND_STABLE_INCOME,FND_ON_TIME_PAYER', 'MizanData.findings: the seven codes of the controlled vocabulary');
  ok(Object.values(D.findings).every(x => x.en && ARABIC.test(x.ar)), 'every finding has English and Arabic');
  eq(JSON.stringify(j.connected.spendCategories), JSON.stringify({ Dining: 24, Groceries: 22, Transport: 12, Bills: 18, Shopping: 14, Other: 10 }), 'j1 connected.spendCategories (sums to 100)');
  /* v2.19 — the per-code lender wordings are gone: lenders read library labels (EN + AR), which name no source or threshold */
  ok(!('reasonCodesLender' in D) && D.reasonCodeLibrary.every(e => ARABIC.test(e.labelAr) && !/threshold|statement|footprint|passport|uae pass|emirates id|payer/i.test(e.labelEn + ' ' + e.tells)),
     'lender wordings come from the reason-code library only (v2.19), with Arabic, naming no source or threshold');

  // ---- §1a — the output table (Ravi) ----
  const r = ravi(), m = E.creditMemo(r.id), sf = E.memoSftpRow(m);
  eq(m.outputs.map(o => o.output + ':' + o.status).join(' | '),
     'NoorScore and risk band:Core | Reason codes:Core | Data completeness:Proposed | Income bucket:Proposed | Additional income bucket:Proposed | DBR:Proposed',
     'the memo opens with the slide-8 table, in order, with the Core / Proposed tags');
  ok(Object.keys(m).indexOf('outputs') < Object.keys(m).indexOf('noorScore') && m.outputs.every(o => o.tells && o.value), 'each row: output, what it tells the lender, status, value — before the detail sections');
  /* v2.19 — the Reason codes row carries library codes with their labels (REASON-CODES-SPEC.md §2, Ravi), not finding words */
  eq(m.outputs.map(o => o.value).join(' | '), '737 · Very good | G02 Saver · G03 Dining Out Lover · G04 Stable Income · G05 Pays Cards and Loans on Time · G06 12M+ History Shared · ' +
     'G07 Salary Verified · G08 Employer Confirmed · G09 Low Debt Burden · G10 Settled in UAE · G11 Full Financial Picture · PR-PB-G01 Salary Through WPS | ' +
     '100% · 2 banks · 4 accounts · 12 months | AED 10,000–15,000 / month | None detected (< AED 1,000) | 15–20% · headroom AED 3,500–4,000 / month', 'Ravi’s values match the spec table (v2.19: library codes)');
  eq(m.outputsNote, 'The set of aggregates is open: we are flexible and want to hear what each partner needs to see.', 'the banner, verbatim');
  const bkR = bucketsOf(r);
  ok(r.features.dbrPct === 18.4 && bkR.headroom === 3788.3, 'internally: DBR 18.4% ((900 + 1,311.70) ÷ 12,000) and headroom AED 3,788.30 (6,000 − 2,211.70)');
  const mj = JSON.stringify(m) + '\n' + sf.row.join(',');
  ok(!/18\.4|3788|3,788/.test(mj), 'BAND precision: the memo JSON and the SFTP row carry no exact DBR (18.4) and no exact headroom (3,788.30)');
  ok(m.affordability.dbrBand === '15–20%' && m.affordability.headroomBand === 'AED 3,500–4,000 / month' && !('dbrPct' in m.affordability) && !('headroomMonthly' in m.affordability),
     'the DBR band in 5-point steps, the headroom in AED 500 steps');
  ok(bkR.additional < 1000 && bkR.additional > 0, 'Ravi’s overtime swings are below AED 1,000 a month (' + bkR.additional + ') → "None detected (< AED 1,000)"');
  // a1: the rent is the additional-income bucket
  const ra = E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF });
  const ma = E.creditMemo(ra.id);
  eq(ma.outputs.find(o => o.key === 'additionalIncomeBucket').value, 'AED 5,000–10,000 / month (rent)', 'a1: additional income AED 5,000–10,000 / month (rent)');
  eq(ma.outputs.find(o => o.key === 'incomeBucket').value, 'AED 40,000–50,000 / month', 'a1: the income bucket is the salary alone (the share of rent counted never shows)');
  // EXACT on a test agreement
  const DX = Object.assign({}, D, { sharingAgreements: Object.assign({}, D.sharingAgreements, { 'partner-bank': Object.assign({}, D.sharingAgreements['partner-bank'], { dbrPrecision: 'EXACT', label: 'Partner Bank (test, EXACT)' }) }) });
  E.init(DX);
  const rx = ravi(), mx = E.creditMemo(rx.id), sx = E.memoSftpRow(mx);
  ok(mx.affordability.dbrPct === 18.4 && mx.affordability.headroomMonthly === 3788.3 && mx.outputs.find(o => o.key === 'dbr').value === '18.4% · headroom AED 3,788.30 / month' &&
     sx.header.includes('dbr_pct') && sx.row[sx.header.indexOf('dbr_pct')] === '18.4' && sx.row[sx.header.indexOf('headroom_aed')] === '3788.3',
     'dbrPrecision EXACT (a test agreement): the memo and the SFTP row show 18.4% and AED 3,788.30');
  throwsWith(() => { E.init(Object.assign({}, D, { sharingAgreements: { 'partner-bank': { label: 'X', groups: ['noorScore', 'incomeBucket'] } } })); E.creditMemo(ravi().id); }, 'Core outputs', 'an agreement without the Core outputs is refused');
  throwsWith(() => { E.init(Object.assign({}, D, { sharingAgreements: { 'partner-bank': { label: 'X', groups: ['noorScore', 'reasonCodes', 'rawTransactions'] } } })); E.creditMemo(ravi().id); }, 'unknown groups', 'an agreement naming an unknown group is refused');
  throwsWith(() => { E.init(Object.assign({}, D, { sharingAgreements: { 'partner-bank': { label: 'X', groups: ['noorScore', 'reasonCodes'], dbrPrecision: 'ROUGH' } } })); E.creditMemo(ravi().id); }, 'BAND or EXACT', 'dbrPrecision other than BAND / EXACT is refused');
  throwsWith(() => { E.init(Object.assign({}, D, { sharingAgreements: { 'partner-bank': D.sharingAgreements['partner-bank'] } })); E.creditMemo(ravi().id, { lenderId: 'lender-b' }); }, 'no sharing agreement', 'a lender without an agreement on file gets no memo');

  // ---- §1b — Lender B's narrower memo; the agreement in the memo ----
  E.init(D);
  const r2 = ravi(), mb = E.creditMemo(r2.id, { lenderId: 'lender-b' }), sb = E.memoSftpRow(mb);
  eq(Object.keys(mb).join(), 'memoId,noorRef,lenderId,lenderName,sharingAgreement,createdAt,product,policyVersion,engineVersion,borrower,decision,terms,outputs,outputsNote,noorScore',
     'Lender B’s memo: the envelope, the Core rows, NoorScore and the reason codes in decision — nothing else (v2.19: no findings key)');
  ok(mb.outputs.map(o => o.key).join() === 'noorScore,reasonCodes' && mb.outputs.every(o => o.status === 'Core'), 'Lender B shows only the Core rows');
  ok(['scoreComponents', 'affordability', 'monitoring', 'bureau', 'verification', 'dataCompleteness', 'consents'].every(k => !(k in mb)), 'Lender B’s memo omits every group it has not agreed to');
  eq(sb.header.join(), 'memo_id,noor_ref,product,outcome,amount,tenor,apr_or_fee,monthly_payment,repayment_method,noorscore,noorscore_band,reason_codes,created_at,sharing_agreement',
     'Lender B’s SFTP columns follow its agreement (v2.19: no findings column)');
  ok(mb.lenderName === 'Lender B (illustrative, lender of record)' && mb.sharingAgreement.label === 'Lender B v1 (illustrative)' && m.sharingAgreement.label === 'Partner Bank v1',
     'each memo names its sharing agreement (Partner Bank v1 · Lender B v1)');
  /* v2.19 — the same Core rows, except Partner Bank's own requested code (partner codes show only in that partner's memo) */
  const mpb = E.creditMemo(r2.id), notPb = (cs) => cs.filter(c => !/^PR-PB-/.test(c.code));
  ok(JSON.stringify(mb.outputs[0]) === JSON.stringify(mpb.outputs[0]) && JSON.stringify(mb.decision.reasonCodes) === JSON.stringify(notPb(mpb.decision.reasonCodes)) &&
     mb.outputs[1].value === mpb.outputs[1].value.replace(' · PR-PB-G01 Salary Through WPS', '') && mpb.decision.reasonCodes.some(c => c.code === 'PR-PB-G01'),
     'the Core rows are the same for both lenders, but for Partner Bank’s own code PR-PB-G01');
  const sa = E.sharingAgreement('lender-b');
  ok(sa.groupsDetail.map(g => g.status).join() === 'Core,Core' && E.sharingAgreement().label === 'Partner Bank v1', 'sharingAgreement(lenderId) — the agreement as the UI shows it');
  ok(E.NOOR_IP.label === 'Noor-only explanation — not part of the memo' && E.NOOR_IP.staysInside.map(x => x.group).join(' · ') === 'Methodology · Thresholds and cut-offs · Data-source mix · Raw customer data' &&
     /protects NoorScore from being copied by competitors and from being gamed by applicants/.test(E.NOOR_IP.sharedOutside.why), 'the Noor-only panel: the slide’s two columns, outside the memo');
  eq(E.EXTERNAL_LINE, 'NoorScore works with Open Finance data as its core component. For enrichment, we use different types of alternative data where available.', 'the external line, verbatim');
  eq(E.METHODOLOGY_LINE, 'Explainable internally (expert scorecard, documented feature-by-feature); lenders receive findings and reason codes, not the formula.', 'the methodology line (§1c.4), verbatim');

  // ---- §1b — the scans, over every persona's memo and SFTP row, for both lenders ----
  E.init(D);
  const set = [];
  const add = (label, rec) => { collect(rec.reasonCodes); set.push([label, rec]); return rec; };
  for (const p of D.personasLoan) add(p.id, decidePersona('personal_loan', p));
  add('r2+creditPassport', decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } }));
  add('r2+statements', decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, homeStatements: true } }));
  for (const p of D.personasSplit) add(p.id, decidePersona('split', p));
  for (const p of D.personasUpgrade) { add(p.id, E.decide({ productId: 'starter_loan', applicant: p, consents: OF })); add(p.id + '+statements', E.decide({ productId: 'starter_loan', applicant: p, consents: { aecb: true, openFinance: true, homeStatements: true } })); }
  add('j1 journey', ravi());
  add('j1 70%', E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF, dataSources: { approvedAccounts: ['4821', '0193'], months: 12 } }));
  add('a1 Open Finance', E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF }));
  add('a1 documents', E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: { aecb: true, openFinance: false } }));
  add('salary advance r1', E.decide({ productId: 'salary_advance', applicant: P.r1, amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } }));
  add('s1 owner', E.decide({ productId: 'sme_working_capital', applicant: s1, amount: 150000, tenorMonths: 12, consents: { aecb: true, openFinance: true, ownerOpenFinance: true } }));
  add('s1 business only', E.decide({ productId: 'sme_working_capital', applicant: s1, amount: 150000, tenorMonths: 12, consents: OF }));
  let dirty = 0;
  for (const [label, rec] of set) for (const lenderId of ['partner-bank', 'lender-b']) {
    const memo = E.creditMemo(rec.id, { lenderId }), row = E.memoSftpRow(memo), hits = ipScan(memo, row, rec);
    if (hits.length) { dirty++; ok(false, label + ' (' + lenderId + '): ' + hits.slice(0, 3).join('; ')); }
  }
  ok(set.length >= 24 && dirty === 0, 'Noor IP scans over ' + set.length + ' persona decisions × 2 lenders: no band boundary, "threshold", data-source word, "75%" / "counted at", weight or points, ID image, exact DBR or headroom');
  const jrec = set.find(x => x[0] === 'j1 journey')[1];
  const caught = (label, mut) => { const mm = clone(E.creditMemo(jrec.id)); mut(mm); return ipScan(mm, E.memoSftpRow(E.creditMemo(jrec.id)), jrec).length > 0; };
  ok(caught('boundary', x => { x.noorScore.band += ' (Excellent ≥ 740)'; }) && caught('threshold', x => { x.outputsNote += ' Completeness threshold applies.'; }) &&
     caught('footprint', x => { x.verification.identity = 'Verified · digital footprint: high'; }) && caught('statements', x => { x.verification.additionalEvidence = '6 of 6 months of statements'; }) &&
     caught('75', x => { x.verification.identity += ' — counted at 75%'; }) && caught('points', x => { x.scoreComponents.components[0].factors.push('+15 points'); }) &&
     caught('weight key', x => { x.scoreComponents.components[0].weight = 0.25; }) && caught('image', x => { x.borrower.idImage = 'KYC-000001-EID-FRONT.jpg'; }) &&
     caught('exact DBR', x => { x.outputs[5].value = '18.4%'; }) && caught('exact headroom', x => { x.affordability.note = 'headroom AED 3,788.30'; }),
     'the scan bites: a boundary, "threshold", footprint, statements, "counted at 75%", +15 points, a weight key, an ID image, the exact DBR and headroom are each caught');
  for (const [label, rec] of set.filter(x => x[1].productId !== 'sme_working_capital')) {
    const memo = E.creditMemo(rec.id), b = bucketsOf(rec);
    if (memo.outputs.find(o => o.key === 'incomeBucket').value !== (b.incomeBand || 'Not verified') || memo.affordability.additionalIncomeBand !== b.additionalIncomeBand ||
        memo.affordability.dbrBand !== b.dbrBand || memo.affordability.headroomBand !== b.headroomBand) ok(false, label + ': buckets match the independent derivation');
  }
  ok(true, 'every consumer memo’s income, additional-income, DBR and headroom bands match an independent derivation');
  ok(set.every(([, rec]) => { const mm = E.creditMemo(rec.id); return !('sharing' in mm) && !(mm.verification && /UAE PASS|Emirates ID|footprint/.test(mm.verification.identity || '')) &&
     (!mm.consents || mm.consents.every(c => !/creditPassport|homeStatements/.test(c.type))); }),
     'no shared/withheld lists in any memo; identity says verified / not verified; alternative-data consents travel as "additionalEvidence"');
  const r2st = E.creditMemo(set.find(x => x[0] === 'r2+statements')[1].id);
  ok(r2st.verification.additionalEvidence === 'Additional evidence verified' && r2st.consents.some(c => c.type === 'additionalEvidence' && /-DOCUMENTS$/.test(c.reference)) &&
     r2st.decision.reasonCodes.some(c => c.code === 'Y14' && c.en === 'Additional Evidence Used') && !/RC_STATEMENTS/.test(JSON.stringify(r2st)),
     'r2 with statements: "Additional evidence verified"; the consent as additionalEvidence; RC_STATEMENTS_USED travels as Y14 Additional Evidence Used (v2.19)');
  ok(E.creditMemo(set.find(x => x[0] === 'a1 Open Finance')[1].id).verification.otherIncome === 'Additional income verified', 'a1: "Additional income verified" (was "Rental income verified via Open Finance — counted at 75%")');

  // ---- §1 — the six components ----
  const C = (label) => E.noorScoreComponents(set.find(x => x[0] === label)[1].id).components;
  const tone = (cs, k) => cs.find(c => c.key === k).tone;
  const cr1 = C('r1');
  ok(cr1.length === 6 && cr1.map(c => c.name).join(' · ') === 'Fraud & Integrity · Newcomer Score · Stacking & Skip Risk · Credit Behaviour · Affordability & Capacity · Monitoring & Collections' &&
     cr1.map(c => c.group).join() === 'score,score,score,score,aggregate,post', 'six components: four score components, the aggregates (not scored), post-disbursement monitoring');
  ok(['fraudIntegrity', 'stackingSkip', 'creditBehaviour'].every(k => tone(cr1, k) === 'green') && tone(cr1, 'newcomer') === 'neutral' && cr1[1].level === 'Established — not applicable',
     'r1: all green; Newcomer "Established — not applicable" (neutral)');
  ok(tone(C('r6'), 'stackingSkip') === 'red' && C('r6')[2].level === 'High' && C('r6')[2].factors.includes('Recent changes in account activity') && C('r6')[5].level === 'Elevated',
     'r6: Stacking & Skip red (High) — "Recent changes in account activity"; monitoring Elevated');
  ok(tone(C('r2'), 'newcomer') === 'yellow' && C('r2')[1].level === 'Building' && C('r2')[1].factors.includes('Home-country history available') && /Credit Passport available/.test(C('r2')[1].drivers.join(' ')),
     'r2: Newcomer yellow (v2.19, was amber) — home-country history available (Credit Passport, not yet consented)');
  ok(tone(C('r2+creditPassport'), 'newcomer') === 'green', 'r2 with the Credit Passport consented: Newcomer green');
  const cj = C('j1 journey');
  ok(cj[5].bestDebitDate === '28th of the month' && cj[5].nextRefresh === '2026-08-19' && /the day after the usual salary credit \(27th\)/.test(cj[5].drivers.join(' ')),
     'j1: best debit date the 28th (salary on the 27th); next refresh 19 Aug 2026');
  ok(cj.slice(0, 4).every(c => c.tone === 'green' || c.tone === 'neutral') && cj[0].factors.join() === 'Identity verified,Employment confirmed' && cj[3].factors.join() === 'Strong cash flow,Pays cards and loans on time',
     'j1: Fraud & Integrity "Identity verified · Employment confirmed"; Credit Behaviour "Strong cash flow · Pays cards and loans on time"');
  const ca = C('a1 Open Finance');
  ok(ca[4].bands.additionalIncomeBand === 'AED 5,000–10,000 / month (rent)' && ca[4].bands.incomeBand === 'AED 40,000–50,000 / month' && ca[4].level === 'Aggregates — not scored' &&
     tone(ca, 'creditBehaviour') === 'green', 'a1: the aggregates (income 40–50k + rent 5–10k), Credit Behaviour green');
  ok(tone(C('c4'), 'newcomer') === 'yellow' && tone(C('c5'), 'creditBehaviour') === 'red' && tone(C('c2'), 'creditBehaviour') === 'yellow' && tone(C('c3'), 'creditBehaviour') === 'red' &&
     C('u2')[3].factors.includes('Late payment in history'), 'c4 newcomer yellow; c5 (DPD90) and c3 (negative cash flow) red; c2 (volatile income) yellow (v2.19, was amber); u2 (starter repaid late) "Late payment in history"');
  ok(cj[0].drivers.some(d => /Not connected yet: device intelligence; mule and income-manipulation patterns/.test(d)), 'Fraud & Integrity names what is not connected yet (device intelligence, mule / income manipulation)');
  // the memo: levels and factor words only
  ok(set.filter(x => x[1].productId !== 'sme_working_capital').every(([, rec]) => {
       const sc = E.creditMemo(rec.id).scoreComponents;
       return sc.note === 'Methodology not disclosed — outcome and high-level factors only' && sc.derivation === 'Illustrative derivation' && sc.components.length === 4 &&
         sc.components.every(c => Object.keys(c).join() === 'key,name,level,tone,factors' && c.factors.length <= 2 && c.factors.every(w => !/\d/.test(w)));
     }), 'every consumer memo: four component bars with a level, a tone and up to two factor words — no numbers, no drivers, "Methodology not disclosed", "Illustrative derivation"');
  const jr = set.find(x => x[0] === 'j1 journey')[1];
  eq(E.creditMemo(jr.id).monitoring.line, 'Active · best debit date 28th of the month · next refresh 19 Aug 2026', 'the Monitoring line in the memo');
  eq(sf.row.slice(sf.header.indexOf('component_fraud_integrity'), sf.header.indexOf('component_credit_behaviour') + 1).join('|'), 'Clear|Established — not applicable|Low|Strong', 'the SFTP row carries the four levels');
  eq(E.noorScoreComponents(set.find(x => x[0] === 's1 owner')[1].id).components.length, 0, 'no consumer components for a business borrower');

  // ---- §1c — findings ----
  const F = (label) => E.customerFindings(set.find(x => x[0] === label)[1].id).map(x => x.en).join(' · ');
  eq(F('j1 journey'), 'Saver · Dining out lover · 12 months of data history · Stable income · Pays cards and loans on time', 'j1 findings');
  eq(F('a1 Open Finance'), 'Detected additional income · Saver · 12 months of data history · Stable income · Pays cards and loans on time', 'a1 findings (Open Finance)');
  ok(!/Detected additional income|Saver/.test(F('a1 documents')), 'a1 on documents only: no connected-account findings');
  ok(/^New to the UAE/.test(F('r2')) && /^New to the UAE/.test(F('c4')) && /^New to the UAE/.test(F('u1')), 'newcomers (r2, c4, u1): "New to the UAE"');
  ok(E.customerFindings(j).map(x => x.code).join() === 'FND_SAVER,FND_DINING_OUT,FND_DATA_HISTORY,FND_STABLE_INCOME,FND_ON_TIME_PAYER' && E.customerFindings(j)[0].rule,
     'customerFindings(applicant) — a pure what-if — gives the same codes; each finding carries its internal rule');
  const sens = clone(j); sens.connected.spendCategories = { Health: 30, Religion: 12, Gambling: 25, FamilyStatus: 8, Politics: 5, Dining: 10, Other: 10 };
  const fsens = E.customerFindings(sens).map(x => x.code);
  ok(fsens.join() === 'FND_SAVER,FND_DATA_HISTORY,FND_STABLE_INCOME,FND_ON_TIME_PAYER', 'a clone spending on health, religion, gambling, family, politics: nothing extra (and no Dining finding at 10%)');
  const nat = clone(j); nat.emiratesId.front.nationality = 'Pakistan'; nat.nationality = 'Egypt'; nat.residency = 'RESIDENT';
  eq(E.customerFindings(nat).map(x => x.code).join(), E.customerFindings(j).map(x => x.code).join(), 'a nationality clone: the same findings');
  /* v2.19 — the memo carries library codes (code, colour, EN + AR) only: no finding words, no FND_* codes, never the rule */
  const vocab = new Set(D.reasonCodeLibrary.map(e => e.code));
  ok(set.every(([, rec]) => { const mm = E.creditMemo(rec.id); return !('findings' in mm) && mm.decision.reasonCodes.every(x => vocab.has(x.code) && Object.keys(x).join() === 'code,colour,en,ar' && ARABIC.test(x.ar)); }),
     'memos carry library codes (EN + AR, with the colour) from the library only — no findings, never the rule (v2.19)');
  const rulesText = Object.values(E.customerFindings(j)).map(x => x.rule);
  ok(set.every(([, rec]) => { const t = JSON.stringify(E.creditMemo(rec.id)); return rulesText.every(rt => !t.includes(rt)) && !/"rule"/.test(t) && !/FND_/.test(t); }), 'no finding rule (and no FND_* code) reaches any memo');
  /* v2.19 — the findings column is gone; reason_codes carries the library codes (codes only) */
  ok(!sf.header.includes('findings') && sf.row[sf.header.indexOf('reason_codes')] === 'G02|G03|G04|G05|G06|G07|G08|G09|G10|G11|PR-PB-G01', 'the SFTP reason_codes column carries the library codes (codes only; the findings column is gone)');
  const r4rec = set.find(x => x[0] === 'r4')[1];
  ok(r4rec.reasonCodes.join() === 'RC_DELINQUENCY,RC_SCORE_LOW' && E.creditMemo(r4rec.id).decision.reasonCodes.filter(c => c.colour === 'RED').map(c => c.code).join() === 'R03,R06',
     'the decline is still explained: the record keeps RC_DELINQUENCY, RC_SCORE_LOW for the customer; the lender reads R03 Past-Due History, R06 Weak Credit Profile');

  // ---- §1c.2 — the contribution chart (internal) ----
  const cc = E.scoreContributions(jr.id);
  ok(cc.base === 712 && cc.baseLabel === 'AECB score' && cc.steps.map(x => x.delta).join() === '15,10' && cc.points === 737 && cc.reconciles &&
     cc.label === 'Phase 1: scorecard points · Phase 2: SHAP values per feature' && cc.phase === 'Phase 1 — expert scorecard',
     'scoreContributions: 712 (AECB) → +15 → +10 = 737, labelled "Phase 1: scorecard points · Phase 2: SHAP values per feature"');
  ok(set.every(([, rec]) => { const x = E.scoreContributions(rec.id); return x.points === null ? x.steps.length === 0 : x.reconciles; }), 'every scored decision’s waterfall reconciles from the base to NoorScore');
  ok(E.scoreContributions(set.find(x => x[0] === 'c3')[1].id).steps.some(x => x.delta < 0), 'negative factors appear as negative bars (c3)');

  // ---- §1c.3 — reproduceDecision ----
  const n0 = E.listDecisions().length, probe0 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: OF });
  const audits = E.listDecisions().map(x => x.audit.length).join();
  let notSame = 0;
  for (const rec of E.listDecisions()) { const rp = E.reproduceDecision(rec.id); if (!rp.identical) { notSame++; ok(false, rec.id + ': ' + rp.message); } }
  const probe1 = E.decide({ productId: 'split', applicant: P.c4, amount: 4800, tenorMonths: 6, consents: OF });
  ok(notSame === 0 && E.listDecisions().length === n0 + 2, 'reproduceDecision is identical for every decision in this session (' + (n0 + 1) + ') — and creates no record');
  eq(new Date(probe1.createdAt) - new Date(probe0.createdAt), 37000, 'reproduceDecision never advances the engine clock');
  eq(E.listDecisions().slice(1).map(x => x.audit.length).join(), audits, 'reproduceDecision adds no audit entry');
  const rp = E.reproduceDecision(jr.id);
  ok(rp.message === 'Reproduced — identical score, outcome and price' && rp.checks.map(c => c.field).join() === 'outcome,score.points,score.grade,reasonCodes,limit.approved,limit.bindingConstraint,pricing' &&
     rp.inputs.some(x => /Applicant snapshot/.test(x)) && rp.inputs.some(x => /Policy personal_loan v1/.test(x)), 'the result names the logged inputs and the fields compared');
  // human actions: an override, a superseding re-decision, an upgrade choice, execution events
  const c2 = set.find(x => x[0] === 'c2')[1];
  E.override(c2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'S. Nair' });
  const r6 = set.find(x => x[0] === 'r6')[1];
  E.override(r6.id, { outcome: 'DECLINE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'A. Farsi', approver: 'S. Nair', note: 'transfers explained badly' });
  const u1 = set.find(x => x[0] === 'u1+statements')[1]; E.selectUpgradeOption(u1.id, { amount: 2000, months: 5 });
  for (const t of E.EXEC_EVENTS) E.recordEvent(jr.id, t);
  ok([c2, r6, u1, jr].every(x => E.reproduceDecision(x.id).identical) && E.reproduceDecision(r6.id).notes.some(n => /not compared/.test(n)) &&
     E.reproduceDecision(c2.id).checks[0].logged === 'REFER', 'after an override (to APPROVE, to DECLINE), an upgrade choice and execution: still reproduced against the engine’s own result');
  // a policy published later does not change how an earlier decision reproduces
  E.publishPolicy('personal_loan', { maxEsrPct: 60 }, { author: 'a.hassan', approver: 'm.rashid' });
  const later = ravi();
  ok(later.policyVersion === 2 && E.reproduceDecision(jr.id).identical && E.reproduceDecision(jr.id).inputs.some(x => / v1 /.test(x)) && E.reproduceDecision(later.id).identical,
     'a decision on policy v1 reproduces on v1 after v2 is published; the v2 decision on v2');
  // tampering is caught
  const ref = E.getDecision(probe0.id); ref.score.points += 5;
  const tam = E.reproduceDecision(probe0.id);
  ok(!tam.identical && tam.diffs.map(d => d.field).join() === 'score.points' && /^Not reproduced — 1 difference: score.points$/.test(tam.message), 'a tampered record is caught: "Not reproduced — 1 difference: score.points"');
  ref.score.points -= 5;
  ok(E.reproduceDecision(probe0.id).identical, 'restored: identical again');
  throwsWith(() => E.reproduceDecision('MZN-999999'), 'unknown decision id', 'an unknown id → throws');

  // ---- fingerprints, determinism, vocabulary ----
  E.init(D);
  const fp = { r1: decidePersona('personal_loan', P.r1), r3: decidePersona('personal_loan', P.r3), r6: decidePersona('personal_loan', P.r6), c1: decidePersona('split', P.c1),
               j1: ravi(), 'a1+of': E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF }) };
  ok(['r1', 'r3', 'c1', 'j1', 'a1+of'].every(k => fingerprint(fp[k]) === V27_FINGERPRINTS[k]), 'the v2.9 fingerprints still match (r1, r3, c1, j1, a1) — decisions, not memos');
  const snap = () => { E.init(D); const x = ravi(); return JSON.stringify([E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(x.id)), E.creditMemo(x.id, { lenderId: 'lender-b' }), E.noorScoreComponents(x.id), E.reproduceDecision(x.id), E.scoreContributions(x.id)]); };
  ok(snap() === snap(), 'two fresh init() runs: identical memos (both lenders), components, contributions and reproduction');
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|cash now/i;
  const txt = JSON.stringify([D.findings, D.reasonCodeLibrary, D.sharingAgreements, E.NOOR_IP, E.MEMO_OUTPUTS, snap()]);
  ok(!banned.test(txt) && !mentionsSalaryTransfer(txt), 'no banned vocabulary (incl. a botim product name) in the v2.18 data, panel or memos');
  E.init(D);
});

// ---------------------------------------------------------------------------
group('26. Addendum v2.19: the reason-code library — three colours, Noor standard codes, partner-requested codes (4-eyes); the only vocabulary a lender sees', () => {
  E.init(D);
  const j = D.personasJourney[0], a1 = D.personasCar[0], s1 = D.personasSme[0];
  const OF = { aecb: true, openFinance: true };
  const TERMS = { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0', acceptedAt: '2026-07-19T08:58:00.000Z' };
  const ALL4 = ['4821', '0193', '7702', '3317'];
  const ravi = () => E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: Object.assign({ digitalFootprint: TERMS }, OF),
                                emiratesId: true, dataSources: { approvedAccounts: ALL4, months: 12 }, lenderId: 'partner-bank' });
  const L = D.reasonCodeLibrary;
  const codesOf = (rec, lenderId) => E.creditMemo(rec.id, { lenderId }).decision.reasonCodes.map(c => c.code);

  // ---- §1 — one library, exactly three colours ----
  eq(E.REASON_CODE_COLOURS.join(), 'GREEN,YELLOW,RED', 'the engine knows exactly three colours: GREEN, YELLOW, RED');
  eq(Array.from(new Set(L.map(e => e.colour))).sort().join(), 'GREEN,RED,YELLOW', 'the library uses exactly three colours — no fourth, no amber');
  const SHAPE = 'code,colour,labelEn,labelAr,tells,component,source,requestedBy,status,version,ruleRef';
  ok(L.every(e => Object.keys(e).slice(0, 11).join() === SHAPE && E.REASON_CODE_COMPONENTS.includes(e.component) && E.REASON_CODE_SOURCES.includes(e.source) &&
     E.REASON_CODE_STATUSES.includes(e.status) && Number.isInteger(e.version) && e.ruleRef === 'RULE-' + e.code),
     'every entry: { code, colour, labelEn, labelAr, tells, component, source, requestedBy, status, version, ruleRef } with valid values');
  ok(L.filter(e => e.source === 'NOOR_STANDARD').every(e => /^[GYR]\d{2}$/.test(e.code) && e.code[0] === e.colour[0] && e.requestedBy === null && e.status === 'ACTIVE') &&
     L.filter(e => e.source === 'PARTNER_REQUEST').every(e => /^PR-[A-Z]{2}-[GYR]\d{2}$/.test(e.code) && e.code.split('-')[2][0] === e.colour[0] && D.lenders.some(l => l.id === e.requestedBy)),
     'codes carry their colour letter: G·· / Y·· / R·· (Noor standard, ACTIVE) and PR-<lender>-<letter>nn (partner requests)');
  eq(L.filter(e => e.source === 'NOOR_STANDARD').map(e => e.code).join(' '),
     'G01 G02 G03 G04 G05 G06 G07 G08 G09 G10 G11 Y01 Y02 Y03 Y04 Y05 Y06 Y07 Y08 Y09 Y10 Y11 Y12 Y13 Y14 Y15 Y16 R01 R02 R03 R04 R05 R06 R07 R08 R09',
     'the standard library: G01–G11, Y01–Y16, R01–R09');
  const SIX = [['G01', 'GREEN', 'Detected Additional Income'], ['G02', 'GREEN', 'Saver'], ['G03', 'GREEN', 'Dining Out Lover'],
               ['Y01', 'YELLOW', 'New to UAE'], ['Y02', 'YELLOW', '3M History Shared'], ['R01', 'RED', 'Fraud Suspicious']];
  ok(SIX.every(([c, col, label]) => { const e = L.find(x => x.code === c); return e && e.colour === col && e.labelEn === label && e.source === 'NOOR_STANDARD' && e.status === 'ACTIVE'; }),
     'the request’s six codes, verbatim: Green Detected Additional Income · Saver · Dining Out Lover; Yellow New to UAE · 3M History Shared; Red Fraud Suspicious');
  ok(L.every(e => ARABIC.test(e.labelAr) && e.tells && !/[\r\n]/.test(e.tells)), 'every code has an Arabic label and a one-line “what it tells the lender”');

  // ---- §1 — label hygiene (an independent check) ----
  const SMALL = ['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'with'];
  const titleCase = (s) => s.split(/\s+/).every((w, i) => w.split('-').every(p => (i > 0 && SMALL.includes(p)) || /^[A-Z0-9]/.test(p)));
  const numbersOk = (s) => s.split(/[\s-]+/).every(w => !/\d/.test(w) || /^\d{1,2}M\+?$/.test(w)) && !/%|AED|\bpoints?\b|\bweights?\b|threshold/i.test(s);
  const SOURCES = /\b(aecb|al ?tareq|credit ?passport|uae ?pass|emirates ?id|footprint|statements?|bureau|telecom|enbd|fab|adcb|mashreq|hdfc|sbi)\b/i;
  const SENSITIVE = /\b(nationality|national|citizen|emirati|indian|pakistani|egyptian|filipino|arab|male|female|woman|man|gender|sex|religio\w*|muslim|christian|hindu|mosque|church|health|medical|hospital|pregnan\w*|married|single|divorced|family|spouse|children|political|politics|party)\b/i;
  const hyg = L.filter(e => !(titleCase(e.labelEn) && numbersOk(e.labelEn) && !SOURCES.test(e.labelEn.replace(/open finance/ig, '')) && !SENSITIVE.test(e.labelEn) && !SENSITIVE.test(e.tells) &&
                             !SOURCES.test(e.tells.replace(/open finance/ig, '')) && !/\d/.test(e.tells) && !/[A-Za-z%]/.test(e.labelAr)));
  ok(hyg.length === 0, 'label hygiene: Title Case; month counts only (3M, 12M+) — no thresholds, points or weights; no data source but Open Finance; never a sensitive category' +
     (hyg.length ? ' (' + hyg.map(e => e.code).join(', ') + ')' : ''));
  ok(titleCase('Pays Cards and Loans on Time') && !titleCase('dining out lover') && !numbersOk('Salary Above 20,000') && !numbersOk('Variable Pay Above 30%') && numbersOk('12M+ History Shared') &&
     SOURCES.test('AECB Clean File') && SENSITIVE.test('Married With Children'), 'the hygiene check bites (lower case, a threshold, a percentage, a data source, family status)');
  eq(L.find(e => e.code === 'PR-LB-Y01').labelEn, 'High Variable Pay', 'the seeded Lender B request "Variable Pay Above 30%" is labelled "High Variable Pay": the 30% stays in its rule, inside Noor');

  // ---- §2 — every RC_* the engine can emit maps to exactly one library code ----
  const src = fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8');
  const fromSource = new Set((src.match(/'RC_[A-Z0-9_]+'/g) || []).map(x => x.slice(1, -1)));
  E.RED_FLAG_CODES.concat(E.RED_FLAG_BUSINESS_CODES).forEach(c => fromSource.add('RC_' + c));
  const allRc = Array.from(new Set(Object.keys(D.reasonCodes).concat(Array.from(emittedCodes), Array.from(fromSource))));
  const inverse = {};
  for (const e of E.reasonCodeLibrary()) for (const rc of e.mapsRc) inverse[rc] = (inverse[rc] || []).concat([e.code]);
  const notOne = allRc.filter(rc => !inverse[rc] || inverse[rc].length !== 1 || E.REASON_CODE_MAP[rc] !== inverse[rc][0]);
  ok(allRc.length >= 52 && notOne.length === 0, 'every RC_* (' + allRc.length + ': the data, every code emitted in this run, every literal in engine.js) maps to exactly one library code' +
     (notOne.length ? ' (not exactly one: ' + notOne.join(', ') + ')' : ''));
  ok(Object.keys(inverse).every(rc => D.reasonCodes[rc]) && Object.values(E.REASON_CODE_MAP).every(c => L.some(e => e.code === c && e.source === 'NOOR_STANDARD')),
     'the mapping names real RC_* codes and standard library codes only');
  ok(E.REASON_CODE_MAP.RC_LIMIT_REDUCED === 'Y09' && E.REASON_CODE_MAP.RC_LTV_CAP === 'Y09' && E.REASON_CODE_MAP.RC_RETIREE_CAP === 'Y09' && E.REASON_CODE_MAP.RC_TENOR_CAP === 'Y10' &&
     E.REASON_CODE_MAP.RC_STATEMENTS_INTEGRITY === 'R01' && E.REASON_CODE_MAP.RC_RED_FLAGS_REVIEW === 'R02' && E.REASON_CODE_MAP.RC_DELINQUENCY === 'R03' && E.REASON_CODE_MAP.RC_SCORE_LOW === 'R06' &&
     E.REASON_CODE_MAP.RC_THIN_FILE === 'Y04' && E.REASON_CODE_MAP.RC_INCOME_VOLATILITY === 'Y05' && E.REASON_CODE_MAP.RC_STATEMENTS_USED === 'Y14' && E.REASON_CODE_MAP.RC_STARTER_LATE === 'R09' &&
     E.REASON_CODE_MAP.RC_DATA_INCOMPLETE === 'Y13' && E.REASON_CODE_MAP.RC_EMPLOYER_MISMATCH === 'Y11' && E.REASON_CODE_MAP.RC_ID_EXPIRED === 'Y12' && E.REASON_CODE_MAP.RC_AGE === 'R08',
     'the spec’s mappings: RC_LIMIT_REDUCED / LTV / retiree cap → Y09, tenor → Y10, integrity → R01, red flags → R02, delinquency → R03, score → R06, …');

  // ---- §2 — Ravi and the other personas ----
  const r = ravi();
  const RAVI = 'G02,G03,G04,G05,G06,G07,G08,G09,G10,G11';
  eq(codesOf(r, 'partner-bank').join(), RAVI + ',PR-PB-G01', 'Ravi, Partner Bank: G02 Saver · G03 Dining Out Lover · G04 · G05 · G06 · G07 · G08 · G09 Low Debt Burden · G10 · G11, plus PR-PB-G01 Salary Through WPS');
  eq(codesOf(r, 'lender-b').join(), RAVI, 'Ravi, Lender B: the same standard codes — never Partner Bank’s PR-PB-G01');
  ok(E.creditMemo(r.id).decision.reasonCodes.every(c => c.colour === 'GREEN'), 'Ravi: no yellow or red');
  const lb = E.libraryCodesFor(r.id, 'partner-bank');
  ok(lb.find(c => c.code === 'PR-PB-G01').rule === 'salaryViaWps = true' && /SALARY\/WPS/.test(j.connected.salaryPayer) && E.reasonCodeTrace(r.id).metrics.savingsMonths === 1.33 &&
     E.reasonCodeTrace(r.id).metrics.dbrPct === 18.4, 'PR-PB-G01 fires on Ravi’s “SALARY/WPS …” payer; internally savings cover 1.33 months, DBR 18.4%');
  ok(JSON.stringify(E.libraryCodesFor(r, 'partner-bank')) === JSON.stringify(lb) && E.libraryCodesFor(r.id).length === lb.length, 'libraryCodesFor takes a record or an id; the default lender is Partner Bank');
  throwsWith(() => E.libraryCodesFor('MZN-999999', 'partner-bank'), 'unknown decision id', 'libraryCodesFor: an unknown decision → throws');
  const P26 = (label, rec) => ({ label, rec, codes: codesOf(rec, 'partner-bank') });
  const a1of = P26('a1 OF', E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF }));
  const a1dc = P26('a1 docs', E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: { aecb: true, openFinance: false } }));
  ok(a1of.codes.includes('G01') && a1dc.codes.includes('Y09') && !a1dc.codes.includes('G01') && a1dc.rec.reasonCodes.includes('RC_LIMIT_REDUCED'),
     'a1 (car loan): G01 Detected Additional Income on Open Finance; Y09 Amount Adjusted to Fit on the documents path (RC_LIMIT_REDUCED)');
  const r6 = P26('r6', decidePersona('personal_loan', P.r6));
  ok(r6.rec.outcome === 'REFER' && r6.codes.includes('R02') && r6.codes.filter(c => /^[YR]/.test(c)).join() === 'R02', 'r6: R02 Recent Changes in Account Activity (the only yellow or red code)');
  const r2 = P26('r2', decidePersona('personal_loan', P.r2)), c4 = P26('c4', decidePersona('split', P.c4)), u1 = P26('u1', E.decide({ productId: 'starter_loan', applicant: D.personasUpgrade[0], consents: OF }));
  ok([r2, c4, u1].every(x => x.codes.includes('Y01')), 'newcomers (r2, c4, u1): Y01 New to UAE');
  ok(c4.codes.includes('Y02') && u1.codes.includes('Y02') && E.reasonCodeTrace(c4.rec.id).metrics.monthsHistory === 5, 'short history (c4, u1 — 5 months shared): Y02 3M History Shared');
  const tampered = E.parseStatements({ country: 'IN', file: 'SBI_Statement_Jan–Jun_2026_edited.pdf', applicantId: 'u1', productId: 'starter_loan' });
  const fr = E.decide({ productId: 'starter_loan', applicant: D.personasUpgrade[0], consents: OF, statements: tampered });
  ok(fr.outcome === 'REFER' && fr.reasonCodes[0] === 'RC_STATEMENTS_INTEGRITY' && codesOf(fr, 'partner-bank').includes('R01') && codesOf(fr, 'lender-b').includes('R01'),
     'a statements integrity FAIL: R01 Fraud Suspicious (for every lender)');
  const r3 = decidePersona('personal_loan', P.r3), r4 = decidePersona('personal_loan', P.r4), c2 = decidePersona('split', P.c2);
  ok(codesOf(r3, 'partner-bank').includes('Y09') && codesOf(r4, 'partner-bank').filter(c => /^R/.test(c)).join() === 'R03,R06' && codesOf(c2, 'partner-bank').includes('Y05'),
     'r3 (limit reduced) Y09; r4 (declined) R03 Past-Due History + R06 Weak Credit Profile; c2 (volatile income) Y05 Irregular Income');
  const j70 = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF, dataSources: { approvedAccounts: ['4821', '0193'], months: 12 } });
  ok(codesOf(j70, 'partner-bank').includes('Y07') && !codesOf(j70, 'partner-bank').includes('G11'), 'Ravi at 70% complete: Y07 Partial Financial Picture instead of G11');
  const sBiz = E.decide({ productId: 'sme_working_capital', applicant: s1, amount: 150000, tenorMonths: 12, consents: OF });
  eq(codesOf(sBiz, 'partner-bank').join(), 'Y09', 'SME (business accounts only): RC_GUARANTEE_UNVERIFIED travels as Y09 — no consumer codes for a business');
  const tr = E.reasonCodeTrace(r3.id);
  ok(tr.rcMap.map(x => x.rc + ' → ' + x.code).join() === 'RC_LIMIT_REDUCED → Y09' && tr.codes.find(c => c.code === 'Y09').via.join() === 'RC_LIMIT_REDUCED' && tr.codes.every(c => c.rule && Array.isArray(c.receivedBy)),
     'reasonCodeTrace (the Decision log): the customer’s RC_* beside its library code ("RC_LIMIT_REDUCED → Y09"), each code with its internal rule and receivers');

  // ---- §3 — partner-requested codes: propose → 4-eyes approve → the lender's agreement, versioned ----
  E.init(D);
  const rv = ravi();
  ok(E.sharingAgreement('partner-bank').label === 'Partner Bank v1' && E.sharingAgreement('partner-bank').libraryCodes.partner.join() === 'PR-PB-G01' &&
     E.sharingAgreement('lender-b').libraryCodes.partner.length === 0 && E.sharingAgreement('partner-bank').libraryCodes.standard === 'ALL',
     'seeded: Partner Bank v1 carries every standard code and PR-PB-G01; Lender B v1 every standard code');
  ok(E.reasonCodeLibrary().find(e => e.code === 'PR-LB-Y01').status === 'PROPOSED' && E.reasonCodeLibrary().find(e => e.code === 'PR-PB-G01').receivedBy.join() === 'partner-bank' &&
     E.reasonCodeLibrary().find(e => e.code === 'G02').receivedBy.join() === 'partner-bank,lender-b', 'seeded: PR-LB-Y01 awaits 4-eyes; each code lists who receives it');
  const SSB = { requestedBy: 'partner-bank', colour: 'GREEN', labelEn: 'Strong Savings Buffer', labelAr: 'احتياطي ادخار قوي', tells: 'Savings cover at least a month of spending',
                component: 'CREDIT_BEHAVIOUR', rule: { metric: 'savingsMonths', op: '≥', value: 1 } };
  const n0 = E.listDecisions().length;
  const pr = E.proposeReasonCode(SSB, { author: 'L. Haddad' });
  ok(pr.code === 'PR-PB-G02' && pr.status === 'PROPOSED' && pr.source === 'PARTNER_REQUEST' && pr.requestedBy === 'partner-bank' && pr.author === 'L. Haddad' && pr.ruleRef === 'RULE-PR-PB-G02',
     'propose (Partner Bank, GREEN, "Strong Savings Buffer", savingsMonths ≥ 1) → PR-PB-G02, PROPOSED');
  ok(!codesOf(rv, 'partner-bank').includes('PR-PB-G02') && E.sharingAgreement('partner-bank').label === 'Partner Bank v1', 'a PROPOSED code fires nowhere; the agreement stays v1');
  throwsWith(() => E.approveReasonCode('PR-PB-G02', { approver: 'L. Haddad' }), '4-eyes', 'approving as the author → 4-eyes violation');
  throwsWith(() => E.approveReasonCode('PR-PB-G02', { approver: '  l. haddad ' }), '4-eyes', 'the same person in other case and spacing → still refused');
  throwsWith(() => E.approveReasonCode('PR-PB-G02', {}), 'approver', 'approving without an approver → refused');
  const ap = E.approveReasonCode('PR-PB-G02', { approver: 'S. Iyer' });
  ok(ap.status === 'ACTIVE' && ap.approver === 'S. Iyer' && ap.agreement.line === 'Partner Bank v2 — adds PR-PB-G02' && E.sharingAgreement('partner-bank').label === 'Partner Bank v2' &&
     E.sharingAgreement('partner-bank').version === 'v2' && E.sharingAgreement('partner-bank').id === 'SA-PARTNER-BANK-V2' && E.sharingAgreement('partner-bank').libraryCodes.partner.join() === 'PR-PB-G01,PR-PB-G02',
     'a different approver → ACTIVE; the agreement becomes Partner Bank v2 — adds PR-PB-G02');
  eq(E.sharingAgreement('partner-bank').history.map(hh => hh.version + ' ' + hh.change).join(' | '), 'v1 agreed | v2 adds PR-PB-G02', 'the agreement keeps its version history');
  const mPb = E.creditMemo(rv.id, { lenderId: 'partner-bank' }), mLb = E.creditMemo(rv.id, { lenderId: 'lender-b' });
  ok(mPb.decision.reasonCodes.slice(-2).map(c => c.code).join() === 'PR-PB-G01,PR-PB-G02' && mPb.decision.reasonCodes.find(c => c.code === 'PR-PB-G02').en === 'Strong Savings Buffer' &&
     mPb.sharingAgreement.label === 'Partner Bank v2' && E.memoSftpRow(mPb).row[E.memoSftpRow(mPb).header.indexOf('reason_codes')] === RAVI.split(',').join('|') + '|PR-PB-G01|PR-PB-G02' &&
     E.memoSftpRow(mPb).row[E.memoSftpRow(mPb).header.indexOf('sharing_agreement')] === 'Partner Bank v2',
     'PR-PB-G02 fires in Ravi’s Partner Bank memo (savings 1.33 months) and its SFTP row: reason_codes G02|…|G11|PR-PB-G01|PR-PB-G02, Partner Bank v2');
  ok(!mLb.decision.reasonCodes.some(c => /^PR-/.test(c.code)) && mLb.sharingAgreement.label === 'Lender B v1 (illustrative)', '… and not in Lender B’s (still v1)');
  ok(!codesOf(decidePersona('personal_loan', P.r1), 'partner-bank').includes('PR-PB-G02'), 'it fires only where its rule holds (r1 has no savings seen)');
  ok(E.listDecisions().length === n0 + 1 && fingerprint(rv) === V27_FINGERPRINTS.j1 && E.reproduceDecision(rv.id).identical && fingerprint(ravi()) === V27_FINGERPRINTS.j1,
     'the library never touches a decision: no record created by propose/approve, Ravi’s fingerprint and reproduction unchanged');
  throwsWith(() => E.approveReasonCode('PR-PB-G02', { approver: 'M. Rashid' }), 'only a PROPOSED code', 'approving twice → refused');
  throwsWith(() => E.approveReasonCode('G02', { approver: 'M. Rashid' }), 'Noor standard code', 'a standard code is not approved through this flow');
  throwsWith(() => E.approveReasonCode('PR-XX-G99', { approver: 'M. Rashid' }), 'unknown reason code', 'an unknown code → refused');
  // the seeded Lender B request
  const apLb = E.approveReasonCode('PR-LB-Y01', { approver: 'S. Iyer' });
  ok(apLb.status === 'ACTIVE' && apLb.agreement.line === 'Lender B v2 (illustrative) — adds PR-LB-Y01' && E.sharingAgreement('partner-bank').label === 'Partner Bank v2',
     'approving the seeded PR-LB-Y01 versions Lender B’s agreement only: "Lender B v2 (illustrative) — adds PR-LB-Y01"');
  E.init(D);
  const c2b = decidePersona('split', P.c2), rvb = ravi();
  E.approveReasonCode('PR-LB-Y01', { approver: 'S. Iyer' });
  ok(codesOf(c2b, 'lender-b').includes('PR-LB-Y01') && !codesOf(c2b, 'partner-bank').includes('PR-LB-Y01') && !codesOf(rvb, 'lender-b').includes('PR-LB-Y01') &&
     E.sharingAgreement('lender-b').label === 'Lender B v2 (illustrative)' && E.sharingAgreement('partner-bank').label === 'Partner Bank v1',
     'approving the seeded PR-LB-Y01: Lender B v2 (illustrative); it fires for c2 (volatile pay) in Lender B’s memo only, not for Ravi');

  // ---- §3 — the rule builder is safe by construction ----
  E.init(D);
  const bad = (patch, needle, msg) => throwsWith(() => E.proposeReasonCode(Object.assign({}, SSB, { labelEn: 'Probe Code' }, patch), { author: 'L. Haddad' }), needle, msg);
  bad({ rule: { metric: 'nationality', op: '=', value: 1 } }, 'never allowed', 'a nationality metric → refused');
  bad({ rule: { metric: 'age', op: '≥', value: 40 } }, 'never allowed', 'an age metric → refused');
  bad({ rule: { metric: 'sex', op: '=', value: 1 } }, 'never allowed', 'a sex metric → refused');
  bad({ rule: { metric: 'religion', op: '=', value: 1 } }, 'never allowed', 'a religion metric → refused');
  bad({ rule: { metric: 'healthSpendPct', op: '≥', value: 5 } }, 'never allowed', 'a health metric → refused');
  bad({ rule: { metric: 'familySize', op: '≥', value: 3 } }, 'never allowed', 'a family metric → refused');
  bad({ rule: 'customers who seem reliable' }, 'free text', 'a free-text rule → refused');
  bad({ rule: { metric: 'savingsMonths', op: '≥', value: 1, text: 'and looks reliable' } }, 'free text', 'free text beside the rule → refused');
  bad({ rule: { metric: 'merchantName', op: '=', value: 1 } }, 'whitelist', 'any metric off the whitelist → refused');
  bad({ rule: { metric: 'savingsMonths', op: '>', value: 1 } }, 'op must be', 'an operator other than ≥ ≤ = → refused');
  bad({ rule: { metric: 'savingsMonths', op: '≥', value: '1' } }, 'takes a number', 'a typed value: savingsMonths needs a number');
  bad({ rule: { metric: 'salaryViaWps', op: '≥', value: true } }, 'use the = operator', 'a true/false metric takes =');
  bad({ rule: { metric: 'aecbHit', op: '=', value: 'yes' } }, 'true or false', 'a true/false metric takes true or false');
  bad({ colour: 'AMBER' }, 'GREEN, YELLOW or RED', 'a fourth colour (AMBER) → refused');
  bad({ colour: 'BLUE' }, 'exactly three colours', 'a fourth colour (BLUE) → refused');
  bad({ labelEn: 'Savings Above AED 10,000' }, 'no thresholds', 'a label with a threshold → refused');
  bad({ labelEn: 'Saves 30% of Pay' }, 'no thresholds', 'a label with a percentage → refused');
  bad({ labelEn: 'strong savings buffer' }, 'Title Case', 'a label not in Title Case → refused');
  bad({ labelEn: 'Clean AECB File' }, 'data-source', 'a label naming a data source → refused');
  bad({ labelEn: 'Married Saver' }, 'never nationality', 'a label naming family status → refused');
  bad({ labelEn: 'Saver' }, 'already in the library', 'a duplicate label → refused');
  bad({ labelAr: 'Strong buffer' }, 'Arabic', 'an Arabic label without Arabic → refused');
  bad({ tells: 'Savings above AED 10,000 in the AECB file' }, 'tells the lender', 'a "tells" line with a threshold or source → refused');
  bad({ component: 'LIFESTYLE' }, 'component must be', 'a component outside the seven → refused');
  bad({ requestedBy: 'unknown-bank' }, 'unknown lender', 'an unknown partner → refused');
  throwsWith(() => E.proposeReasonCode(SSB, {}), 'author', 'propose without an author → refused');
  ok(E.reasonCodeLibrary().length === L.length, 'nothing refused reached the library');
  const yl = E.proposeReasonCode(Object.assign({}, SSB, { colour: 'YELLOW', labelEn: 'Thin Savings Buffer', labelAr: 'احتياطي ادخار محدود', tells: 'Savings cover little of monthly spending',
                                                          rule: { metric: 'savingsMonths', op: '<=', value: 0.5 } }), { author: 'L. Haddad' });
  ok(yl.code === 'PR-PB-Y01' && yl.rule.op === '≤' && /^\d{4}-\d{2}-\d{2}T/.test(yl.proposedAt), 'a YELLOW request numbers on its own: PR-PB-Y01; "<=" is stored as ≤');

  // ---- §3 — retire ----
  E.init(D);
  const rr = ravi();
  E.proposeReasonCode(SSB, { author: 'L. Haddad' }); E.approveReasonCode('PR-PB-G02', { approver: 'S. Iyer' });
  throwsWith(() => E.retireReasonCode('PR-PB-G02', { author: 'S. Iyer', approver: 'S. Iyer' }), '4-eyes', 'retire with one person → 4-eyes violation');
  throwsWith(() => E.retireReasonCode('PR-LB-Y01', { author: 'L. Haddad', approver: 'S. Iyer' }), 'only an ACTIVE code', 'retire a PROPOSED code → refused');
  throwsWith(() => E.retireReasonCode('R01', { author: 'L. Haddad', approver: 'S. Iyer' }), 'Noor standard code', 'retire a standard code → refused');
  const rt = E.retireReasonCode('PR-PB-G02', { author: 'L. Haddad', approver: 'S. Iyer' });
  ok(rt.status === 'RETIRED' && rt.agreement.line === 'Partner Bank v3 — retires PR-PB-G02' && !codesOf(rr, 'partner-bank').includes('PR-PB-G02') && codesOf(rr, 'partner-bank').includes('PR-PB-G01') &&
     E.sharingAgreement('partner-bank').libraryCodes.partner.join() === 'PR-PB-G01' && E.reasonCodeLibrary().find(e => e.code === 'PR-PB-G02').receivedBy.length === 0,
     'retire works: RETIRED, Partner Bank v3 — retires PR-PB-G02; it no longer fires; PR-PB-G01 still does');

  // ---- §4/§5 — no RC_*, no FND_*, no rule text in any memo or SFTP row, every persona × both lenders ----
  E.init(D);
  E.proposeReasonCode(SSB, { author: 'L. Haddad' }); E.approveReasonCode('PR-PB-G02', { approver: 'S. Iyer' }); E.approveReasonCode('PR-LB-Y01', { approver: 'S. Iyer' });
  const set = [];
  for (const p of D.personasLoan) set.push(decidePersona('personal_loan', p));
  set.push(decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, creditPassport: true } }), decidePersona('personal_loan', P.r2, { consents: { aecb: true, openFinance: true, homeStatements: true } }));
  for (const p of D.personasSplit) set.push(decidePersona('split', p));
  for (const p of D.personasUpgrade) set.push(E.decide({ productId: 'starter_loan', applicant: p, consents: OF }), E.decide({ productId: 'starter_loan', applicant: p, consents: { aecb: true, openFinance: true, homeStatements: true } }));
  set.push(ravi(), j70Again(), E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF }),
           E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: { aecb: true, openFinance: false } }),
           E.decide({ productId: 'salary_advance', applicant: P.r1, amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } }),
           E.decide({ productId: 'sme_working_capital', applicant: s1, amount: 150000, tenorMonths: 12, consents: { aecb: true, openFinance: true, ownerOpenFinance: true } }),
           E.decide({ productId: 'sme_working_capital', applicant: s1, amount: 150000, tenorMonths: 12, consents: OF }),
           E.decide({ productId: 'starter_loan', applicant: D.personasUpgrade[0], consents: OF, statements: tampered }));
  function j70Again() { return E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: OF, dataSources: { approvedAccounts: ['4821', '0193'], months: 12 } }); }
  const lib = E.reasonCodeLibrary();
  const ruleTexts = lib.map(e => e.ruleText).filter(t => t && t !== '—');
  /* metric names that are also memo field names (terms.tenorMonths; EXACT agreements' dbrPct) are checked as "metric op value" only */
  const metricNames = Object.keys(E.REASON_CODE_METRICS).filter(mn => !['tenorMonths', 'dbrPct'].includes(mn));
  const metricRule = new RegExp('\\b(' + Object.keys(E.REASON_CODE_METRICS).join('|') + ') (≥|≤|=) ');
  const vocab = new Set(lib.map(e => e.code));
  let dirty = 0, n = 0;
  for (const rec of set) for (const lenderId of ['partner-bank', 'lender-b']) {
    const memo = E.creditMemo(rec.id, { lenderId }), row = E.memoSftpRow(memo);
    const t = JSON.stringify(memo) + '\n' + row.header.join(',') + '\n' + row.row.join(',');
    n++;
    const probs = [];
    if (/RC_|FND_|RF_/.test(t)) probs.push('an RC_ / FND_ / RF_ name');
    if (ruleTexts.some(rt => t.includes(rt))) probs.push('rule text');
    if (metricNames.some(mn => t.includes(mn)) || metricRule.test(t) || /ruleRef|RULE-|"rule"|"ruleText"|"mapsRc"/.test(t)) probs.push('a metric, rule or ruleRef');
    if (/amber/i.test(t)) probs.push('amber');
    if (!memo.decision.reasonCodes.every(c => vocab.has(c.code) && Object.keys(c).join() === 'code,colour,en,ar')) probs.push('a code outside the library');
    if (row.row[row.header.indexOf('reason_codes')] !== memo.decision.reasonCodes.map(c => c.code).join('|')) probs.push('SFTP reason_codes ≠ the memo');
    if (!rec.reasonCodes.every(rc => memo.decision.reasonCodes.some(c => c.code === E.REASON_CODE_MAP[rc]))) probs.push('a customer RC_* without its library code');
    if (memo.decision.reasonCodes.some(c => /^PR-/.test(c.code) && !c.code.startsWith(lenderId === 'partner-bank' ? 'PR-PB-' : 'PR-LB-'))) probs.push('another partner’s code');
    if (probs.length) { dirty++; ok(false, rec.id + ' (' + lenderId + '): ' + probs.join('; ')); }
  }
  ok(n === set.length * 2 && n >= 50 && dirty === 0, 'every memo and SFTP row (' + n + ': ' + set.length + ' decisions × 2 lenders): library codes only — no RC_ or FND_ name, no rule text, metric or ruleRef, no amber; every customer RC_* present as its library code; partner codes in their own lender’s memo only');
  ok(set.every(rec => !/RC_|FND_/.test(E.creditMemo(rec.id).outputs.map(o => o.tells + ' ' + o.value).join(' '))) && !/RC_/.test(JSON.stringify(E.MEMO_OUTPUTS)),
     'the output table’s Reason codes row names no RC_* (what it tells the lender, and its value)');
  ok(set.every(rec => rec.reasonCodes.every(rc => D.reasonCodes[rc] && ARABIC.test(D.reasonCodes[rc].ar))), 'the customer still has every RC_* reason on the record, in English and Arabic (CBUAE disclosure)');

  // ---- amber → yellow; fingerprints; determinism; vocabulary ----
  ok(set.filter(rec => rec.productId !== 'sme_working_capital').every(rec => E.noorScoreComponents(rec.id).components.every(c => ['green', 'yellow', 'red', 'neutral'].includes(c.tone))) &&
     set.some(rec => E.noorScoreComponents(rec.id).components.some(c => c.tone === 'yellow')), 'component tones: green / yellow / red or neutral — amber is gone');
  E.init(D);
  E.proposeReasonCode(SSB, { author: 'L. Haddad' }); E.approveReasonCode('PR-PB-G02', { approver: 'S. Iyer' });
  const fp = { r1: decidePersona('personal_loan', P.r1), r2: decidePersona('personal_loan', P.r2), r3: decidePersona('personal_loan', P.r3), r4: decidePersona('personal_loan', P.r4),
               r5: decidePersona('personal_loan', P.r5), c1: decidePersona('split', P.c1), c2: decidePersona('split', P.c2), c3: decidePersona('split', P.c3), c4: decidePersona('split', P.c4),
               c5: decidePersona('split', P.c5), j1: ravi(), 'a1+of': E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: OF }),
               'a1+docs': E.decide({ productId: 'car_loan', applicant: a1, amount: 180000, tenorMonths: 60, consents: { aecb: true, openFinance: false } }) };
  const changed = Object.keys(fp).filter(k => fingerprint(fp[k]) !== V27_FINGERPRINTS[k]);
  ok(changed.length === 0, 'the v2.9 fingerprints still match with a partner code approved (' + Object.keys(fp).join(', ') + ')' + (changed.length ? ' — changed: ' + changed.join(', ') : ''));
  const snap = () => { E.init(D); const x = ravi(); E.proposeReasonCode(SSB, { author: 'L. Haddad' }); E.approveReasonCode('PR-PB-G02', { approver: 'S. Iyer' });
    return JSON.stringify([E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(x.id)), E.creditMemo(x.id, { lenderId: 'lender-b' }), E.reasonCodeLibrary(), E.reasonCodeTrace(x.id), E.sharingAgreement('partner-bank')]); };
  ok(snap() === snap(), 'two fresh init() runs: identical memos, library, trace and agreement versions');
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|cash now/i;
  const txt26 = JSON.stringify([D.reasonCodeLibrary, D.sharingAgreements, E.reasonCodeLibrary(), snap()]);
  ok(!banned.test(txt26) && !mentionsSalaryTransfer(txt26), 'no banned vocabulary in the v2.19 library, agreements or memos');
  E.init(D);
});

group('27. Addendum v2.20: rely on botim’s phone and email verification — one-time codes only as a fallback; never a decision input', () => {
  E.init(D);
  const j = D.personasJourney[0];
  const OF = { aecb: true, openFinance: true };
  const TERMS = { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0', acceptedAt: '2026-07-19T08:58:00.000Z' };
  const ALL4 = ['4821', '0193', '7702', '3317'];
  const BB = { phone: 'BOTIM', email: 'BOTIM' };
  const app = (cv, applicant) => Object.assign({ productId: 'personal_loan', applicant: applicant || j, amount: 15000, tenorMonths: 12, consents: Object.assign({ digitalFootprint: TERMS }, OF),
                                                 emiratesId: true, dataSources: { approvedAccounts: ALL4, months: 12 }, lenderId: 'partner-bank' }, cv ? { contactVerification: cv } : {});
  const R = E.botimReliance;
  const withPhone = (patch) => Object.assign({}, j.botimAssertion, { phone: Object.assign({}, j.botimAssertion.phone, patch) });
  const DEFAULT_LINE = 'phone ✓ (UAE, verified 14 days ago, device-bound) · email ✓ — no codes sent';

  // ---- data: Ravi's hand-off carries botim's signed assertion ----
  eq(JSON.stringify(j.botimAssertion), JSON.stringify({ phone: { uae: true, verifiedDaysAgo: 14, deviceBound: true }, email: { verified: true, verifiedDaysAgo: 14 } }),
     'j1’s hand-off carries botimAssertion { phone: { uae, verifiedDaysAgo 14, deviceBound }, email: { verified, verifiedDaysAgo 14 } }');
  ok([].concat(D.personasLoan, D.personasSplit, D.personasUpgrade, D.personasCar, D.personasSme || []).every(p => !('botimAssertion' in p)), 'only the botim journey persona carries a botim assertion');
  eq(E.BOTIM_MAX_AGE_DAYS, 90, 'botim’s verification is relied on for 90 days');

  // ---- the helper: the default → no codes ----
  const d0 = R(j.botimAssertion, { ato: 'NORMAL' });
  ok(d0.phone.relied && d0.email.relied && d0.codes.length === 0 && !d0.phone.code && !d0.email.code && !d0.phone.addUaeNumber, 'the default (UAE, 14 days, device-bound, email verified, ATO NORMAL) → no codes');
  eq(d0.summary, DEFAULT_LINE, 'the default summary, as logged under “Mizan calls”');
  ok(d0.phone.uae === true && d0.phone.verifiedDaysAgo === 14 && d0.phone.deviceBound === true && d0.email.verifiedDaysAgo === 14 && d0.ato === 'NORMAL',
     'the result names what was relied on: UAE number, verified 14 days ago, device-bound; email verified 14 days ago');
  eq(R(j.botimAssertion).summary, DEFAULT_LINE, 'no footprint result yet (no ato) → the same: no codes');
  ok(d0.strongIdentity === 'UAE PASS at step 9 remains the strong identity check before any decision' && d0.position === 'Noor’s position — confirm with compliance (open action from 8 Oct)',
     'the result carries the strong-identity line (UAE PASS at step 9) and Noor’s position (confirm with compliance)');

  // ---- stale: older than 90 days → a code to the number ----
  const s90 = R(withPhone({ verifiedDaysAgo: 90 })), s91 = R(withPhone({ verifiedDaysAgo: 91 })), s120 = R(withPhone({ verifiedDaysAgo: 120 }));
  ok(s90.phone.relied && s90.codes.length === 0, 'verifiedDaysAgo 90 → still relied on (the boundary)');
  ok(!s91.phone.relied && s91.phone.code && s91.phone.reasons.join() === 'STALE' && s91.email.relied && s91.codes.join() === 'PHONE' && !s91.phone.addUaeNumber,
     'verifiedDaysAgo 91 → a code to the number (STALE); the email is still relied on');
  eq(s120.summary, 'phone → code (last verified 120 days ago, over 90) · email ✓ — a code to the number', 'the 120-days what-if: a code to the number');
  ok(!R(withPhone({ simChanged: true })).phone.relied && R(withPhone({ simChanged: true })).phone.reasons.join() === 'SIM_CHANGE', 'botim signals a SIM change → a code to the number');
  ok(!R(withPhone({ deviceBound: false })).phone.relied && R(withPhone({ deviceBound: false })).phone.reasons.join() === 'NOT_DEVICE_BOUND', 'no device binding → a code to the number');

  // ---- account-takeover risk → a step-up code ----
  const ato = R(j.botimAssertion, { ato: 'ELEVATED' });
  ok(!ato.phone.relied && ato.phone.reasons.join() === 'ATO_ELEVATED' && ato.email.relied && ato.codes.join() === 'PHONE' && /step-up/.test(ato.summary),
     'ATO ELEVATED → a code to the number (step-up); the email is still relied on');
  ok(R(j.botimAssertion, { ato: 'elevated' }).phone.reasons.join() === 'ATO_ELEVATED', 'the ATO level is read case-insensitively');

  // ---- overseas → a UAE number, then a code ----
  const ov = R(withPhone({ uae: false }));
  ok(!ov.phone.relied && ov.phone.addUaeNumber && ov.phone.reasons.join() === 'OVERSEAS' && ov.email.relied && ov.codes.join() === 'PHONE',
     'overseas number → “Add your UAE mobile number”, then a code to it; the email is still relied on');
  eq(ov.summary, 'phone → UAE number + code (overseas number) · email ✓ — a code to the number', 'the overseas summary');

  // ---- the email: changed, or none from botim → a code ----
  const ch = R(j.botimAssertion, { emailChanged: true });
  ok(ch.phone.relied && !ch.email.relied && ch.email.reasons.join() === 'CHANGED' && !ch.email.enterEmail && ch.codes.join() === 'EMAIL',
     'a changed email (“Use a different email”) → a code to the new address; the number is still relied on');
  const ne = R({ phone: j.botimAssertion.phone });
  ok(ne.phone.relied && !ne.email.relied && ne.email.enterEmail && ne.email.reasons.join() === 'NO_ASSERTION' && ne.codes.join() === 'EMAIL',
     'no email from botim → the customer enters one, then a code');
  ok(R({ phone: j.botimAssertion.phone, email: { verified: false } }).email.enterEmail, 'an email botim did not verify → the customer enters one, then a code');
  ok([undefined, null, 'signed', [], {}].every(x => { const r = R(x); return r.codes.join() === 'PHONE,EMAIL' && r.phone.reasons[0] === 'NO_ASSERTION' && r.email.enterEmail; }),
     'no assertion at all (undefined, null, a string, an array, an empty object) → codes to the number and the email');
  ok(R(withPhone({ uae: false, verifiedDaysAgo: 200 }), { ato: 'ELEVATED', emailChanged: true }).phone.reasons.join() === 'OVERSEAS,STALE,ATO_ELEVATED' &&
     R(withPhone({ uae: false, verifiedDaysAgo: 200 }), { ato: 'ELEVATED', emailChanged: true }).codes.join() === 'PHONE,EMAIL', 'several fallbacks at once are all listed');

  // ---- pure ----
  const before = JSON.stringify(j.botimAssertion);
  const r1 = R(j.botimAssertion, { ato: 'NORMAL' }); r1.phone.reasons.push('X'); r1.codes.push('X');
  ok(JSON.stringify(j.botimAssertion) === before && JSON.stringify(R(j.botimAssertion, { ato: 'NORMAL' })) === JSON.stringify(d0), 'pure: the assertion is not mutated, and a mutated result does not leak into the next call');
  throwsWith(() => R(j.botimAssertion, { ato: 'HIGH' }), 'NORMAL or ELEVATED', 'an unknown ATO level is refused');
  throwsWith(() => R(j.botimAssertion, 'ELEVATED'), 'opts must be an object', 'opts must be an object');

  // ---- decide(): contactVerification — recorded with the inputs, a Fraud & Integrity driver, never a decision input ----
  E.init(D); const plain = E.decide(app(null));
  const plainMemo = JSON.stringify(E.creditMemo(plain.id)), plainSftp = JSON.stringify(E.memoSftpRow(E.creditMemo(plain.id))), plainB = JSON.stringify(E.creditMemo(plain.id, { lenderId: 'lender-b' }));
  const plainComps = E.noorScoreComponents(plain.id).components;
  E.init(D); const rv = E.decide(app(BB));
  eq(fingerprint(rv), V27_FINGERPRINTS.j1, 'Ravi relying on botim: the v2.9 fingerprint for j1 still matches (APPROVE 15000 B 737)');
  const core = (r) => JSON.stringify([r.outcome, r.score, r.noorScore, r.limit, r.pricing, r.reasonCodes, r.features, r.rules, r.dataPulls, r.consents, r.token, r.repayment]);
  ok(core(rv) === core(plain), 'outcome, score, limit, price, reason codes, features, rules, pulls, consents and token are identical with and without contactVerification');
  eq(JSON.stringify(rv.inputs.contactVerification), JSON.stringify(BB), 'record.inputs.contactVerification = {phone BOTIM, email BOTIM}');
  ok(!('contactVerification' in plain.inputs) && Object.keys(plain.inputs).join() === 'consents,emiratesId,dataSources,lenderId,earlyWarningVersion',
     'without it, the logged inputs keep their v2.18 shape (no contactVerification key)');
  ok(JSON.stringify(E.creditMemo(rv.id)) === plainMemo && JSON.stringify(E.memoSftpRow(E.creditMemo(rv.id))) === plainSftp && JSON.stringify(E.creditMemo(rv.id, { lenderId: 'lender-b' })) === plainB,
     'the credit memo (Partner Bank and Lender B) and the SFTP row are byte-identical with and without it');
  const comps = E.noorScoreComponents(rv.id).components, fi = comps[0], fi0 = plainComps[0];
  ok(fi.key === 'fraudIntegrity' && fi.drivers[1] === 'Mobile and email verified by botim (relied on)', 'Fraud & Integrity (Decision log, internal): the driver “Mobile and email verified by botim (relied on)”');
  ok(fi.tone === fi0.tone && fi.level === fi0.level && JSON.stringify(fi.factors) === JSON.stringify(fi0.factors) &&
     JSON.stringify(fi.drivers.filter((x, i) => i !== 1)) === JSON.stringify(fi0.drivers), 'the level (' + fi.level + ') and the memo’s factor words are unchanged — one driver line more');
  ok(JSON.stringify(comps.slice(1)) === JSON.stringify(plainComps.slice(1)), 'the other five components are unchanged');
  ok(!plainComps[0].drivers.some(x => /botim|one-time code/i.test(x)), 'a decision without contactVerification has no such driver');
  const rp = E.reproduceDecision(rv.id);
  ok(rp.identical && rp.inputs.includes('Contact verification: Mobile and email verified by botim (relied on)'), 'reproduceDecision(): identical, and the logged inputs name the contact verification');
  const lines = [['CODE', 'BOTIM', 'Mobile verified with Noor’s one-time code · email verified by botim (relied on)'],
                 ['BOTIM', 'CODE', 'Mobile verified by botim (relied on) · email verified with Noor’s one-time code'],
                 ['CODE', 'CODE', 'Mobile and email verified with Noor’s one-time codes']];
  for (const [p, e, line] of lines) {
    const r = E.decide(app({ phone: p, email: e }));
    ok(E.noorScoreComponents(r.id).components[0].drivers[1] === line && fingerprint(r) === V27_FINGERPRINTS.j1, 'phone ' + p + ' · email ' + e + ' → “' + line + '”; the fingerprint holds');
  }

  // ---- refusals: the shape, and relying on botim without an assertion that supports it ----
  const n0 = E.listDecisions().length;
  for (const bad of [{ phone: 'BOTIM' }, { phone: 'BOTIM', email: 'BOTIM', sms: 'CODE' }, { phone: 'botim', email: 'BOTIM' }, ['BOTIM', 'BOTIM'], 'BOTIM', { phone: 'OTP', email: 'CODE' }]) {
    throwsWith(() => E.decide(app(bad)), 'contactVerification must be {phone, email}', 'a malformed contactVerification is refused: ' + JSON.stringify(bad));
  }
  const stale = Object.assign({}, j, { botimAssertion: withPhone({ verifiedDaysAgo: 120 }) });
  throwsWith(() => E.decide(app(BB, stale)), ['phone is BOTIM', 'STALE', 'one-time code'], 'relying on botim’s number verified 120 days ago is refused (a code is needed)');
  const atoJ = Object.assign({}, j, { footprint: Object.assign({}, j.footprint, { breaches: { count: 3, includesCredentialStuffingCompilation: false } }) });
  throwsWith(() => E.decide(app(BB, atoJ)), ['phone is BOTIM', 'ATO_ELEVATED'], 'ATO ELEVATED on the footprint: relying on botim’s number is refused (step-up code)');
  const noEmail = Object.assign({}, j, { botimAssertion: { phone: j.botimAssertion.phone } });
  throwsWith(() => E.decide(app(BB, noEmail)), ['email is BOTIM', 'NO_ASSERTION'], 'no verified email from botim: relying on it is refused');
  throwsWith(() => E.decide({ productId: 'personal_loan', applicant: D.personasLoan[0], amount: 15000, tenorMonths: 12, consents: OF, contactVerification: BB }), 'phone is BOTIM',
             'a persona without a botim assertion (r1) cannot be recorded as relied on');
  eq(E.listDecisions().length, n0, 'refusals record nothing');
  const atoOk = E.decide(app({ phone: 'CODE', email: 'BOTIM' }, atoJ)), staleOk = E.decide(app({ phone: 'CODE', email: 'BOTIM' }, stale));
  ok(atoOk.outcome === 'APPROVE' && staleOk.outcome === 'APPROVE' && fingerprint(staleOk) === V27_FINGERPRINTS.j1 && atoOk.reasonCodes.includes('RC_STEP_UP_AUTH'),
     'with the fallback code recorded (phone CODE), both decide as before (the ATO case keeps its v2.8 step-up sign-in before payout)');

  // ---- privacy: the assertion and the reliance never reach a lender ----
  const memo = E.creditMemo(rv.id), sftp = E.memoSftpRow(memo);
  const t = JSON.stringify(memo) + '\n' + sftp.header.join(',') + '\n' + sftp.row.join(',');
  ok(!/botim|relied|verifiedDaysAgo|deviceBound|contactVerification|BOTIM|one-time code|assertion/i.test(t), 'the memo and the SFTP row carry no botim assertion, reliance or code wording');
  const expect = { incomeBand: T.income(12000), dbrBand: T.dbr(rv.features.dbrPct), freeCashFlowBand: T.fcf(3700), instalmentToCashFlowBand: T.share(rv.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) };
  const hits = privacyScan(rv, memo, sftp, expect).concat(ipScan(memo, sftp, rv));
  ok(hits.length === 0, 'the v2.5 privacy scan and the v2.18 Noor-IP scan stay clean' + (hits.length ? ' (' + hits.slice(0, 3).join('; ') + ')' : ''));

  // ---- fingerprints, determinism, vocabulary ----
  E.init(D);
  const P = {}; for (const p of D.personasLoan) P[p.id] = p; for (const p of D.personasSplit) P[p.id] = p;
  const fp = { r1: decidePersona('personal_loan', P.r1), r3: decidePersona('personal_loan', P.r3), c1: decidePersona('split', P.c1), j1: E.decide(app(BB)) };
  ok(Object.keys(fp).every(k => fingerprint(fp[k]) === V27_FINGERPRINTS[k]), 'the v2.9 fingerprints still match (r1, r3, c1, j1 relying on botim)');
  const run = () => { E.init(D); const x = E.decide(app(BB)); return JSON.stringify([x, E.noorScoreComponents(x.id), E.creditMemo(x.id), R(j.botimAssertion, { ato: 'NORMAL' })]); };
  ok(run() === run(), 'two fresh init() runs: identical records, components, memos and reliance');
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|cash now/i;
  const txt27 = JSON.stringify([d0, s120, ato, ov, ch, ne, lines]);
  ok(!banned.test(txt27) && !mentionsSalaryTransfer(txt27), 'no banned vocabulary in the v2.20 reliance results or driver lines');
  E.init(D);
});

// ---------------------------------------------------------------------------
// Group 28 — Addendum v2.21 (SCHOOL-FEES-SPEC.md): split school fees over 12 months, the default product. Underwritten
// like the personal loan (same NoorScore, grade, reason codes and completeness for the same customer); paid to the school.
// ---------------------------------------------------------------------------
group('28. Addendum v2.21: split school fees over 12 months — the default product; the personal loan’s underwriting, paid to the school', () => {
  E.init(D);
  const j = D.personasJourney[0], r6 = D.personasLoan.find(p => p.id === 'r6');
  const OF = { aecb: true, openFinance: true };
  const META = { author: 'R. Haddad (Credit Policy)', approver: 'S. Nair (CRO)' };
  const JUNIPER = { schoolId: 'sch-juniper', invoiceRef: 'INV-26-0815', dueDate: '2026-08-20' };
  const FALCON = { schoolId: 'sch-falcon', invoiceRef: 'INV-26-0815', dueDate: '2026-08-20' };
  const ALL_ACC = ['4821', '0193', '7702', '3317'], NO_CARD_LOAN = ['4821', '0193'], NO_CURRENT = ['0193', '7702', '3317'];
  const TERMS = { basis: 'TERMS', termsVersion: 'T&C v1.0 · Privacy policy v1.0', acceptedAt: '2026-07-19T08:58:00.000Z' };
  const sf = (over, applicant) => { const r = E.decide(Object.assign({ productId: 'school_fees', applicant: applicant || j, amount: 15000, tenorMonths: 12, school: JUNIPER,
    consents: OF, lenderId: 'partner-bank' }, over || {})); collect(r.reasonCodes); return r; };
  const pl = (over, applicant) => { const r = E.decide(Object.assign({ productId: 'personal_loan', applicant: applicant || j, amount: 15000, tenorMonths: 12,
    consents: OF, lenderId: 'partner-bank' }, over || {})); collect(r.reasonCodes); return r; };
  // the journey's application: the terms-based footprint check, the Emirates ID, the approved accounts, botim's verification relied on
  const JOURNEY = { consents: Object.assign({}, OF, { digitalFootprint: TERMS }), emiratesId: true, dataSources: { approvedAccounts: ALL_ACC, months: 12 },
                    contactVerification: { phone: 'BOTIM', email: 'BOTIM' } };
  const codes = (r, lender) => E.libraryCodesFor(r.id, lender || 'partner-bank').map(c => c.code).join('|');
  const rule = (r, id) => r.rules.find(x => x.id === id) || {};
  const keysDeep = (x, out) => { out = out || []; if (x && typeof x === 'object') for (const kk of Object.keys(x)) { out.push(kk); keysDeep(x[kk], out); } return out; };

  // ---- the manifest, the directory, j1 ----
  const man = E.manifests().find(m => m.productId === 'school_fees');
  ok(man && man.nameEn === 'Split school fees' && man.nameAr === 'تقسيط الرسوم المدرسية' && man.segment === 'CONSUMER' && man.pricingMode === 'SCHOOL_FEES' &&
     E.manifests().length === 7 && E.manifests()[6].productId === 'school_fees', 'manifest school_fees appended seventh: "Split school fees" / تقسيط الرسوم المدرسية, CONSUMER, pricing mode SCHOOL_FEES');
  eq(JSON.stringify(D.schools), JSON.stringify([
    { id: 'sch-juniper', name: 'Juniper Hill Primary School', city: 'Dubai', regulator: 'KHDA', partner: true, ibanMasked: 'AE•• •••• •••• •••• •••• 4410' },
    { id: 'sch-falcon', name: 'Falcon Ridge Academy', city: 'Dubai', regulator: 'KHDA', partner: false, ibanMasked: 'AE•• •••• •••• •••• •••• 7783' }]),
    'MizanData.schools: the illustrative directory exactly as specified (Juniper Hill — partner; Falcon Ridge — other licensed school)');
  ok(E.schools().length === 2 && E.schools()[0].partner === true && E.schools()[1].partner === false, 'MizanEngine.schools() serves the directory');
  eq(JSON.stringify(j.schoolFees), JSON.stringify({ schoolId: 'sch-juniper', child: 'Child 1 · Grade 1', academicYear: '2026–27', terms: 'Terms 1–3', amount: 15000,
    dueDate: '2026-08-20', invoiceRef: 'INV-26-0815' }), 'j1.schoolFees: the invoice exactly as specified');
  ok(j.tagline === 'Warehouse supervisor, 3 years in the UAE, botim user — his daughter starts Grade 1 in September' && j.purpose === 'Family wedding' &&
     j.defaultRequest.amount === 15000 && j.defaultRequest.tenorMonths === 12, 'j1: the new tagline; purpose and defaultRequest kept for the personal-loan path');
  ok(!keysDeep(j.schoolFees).some(k => /name/i.test(k)) && j.schoolFees.child === 'Child 1 · Grade 1', 'the child is "Child 1 · Grade 1" — no name key, no name');

  // ---- the pack: locked block, params, bounds, the fixed term ----
  const pol = E.getPolicy('school_fees');
  eq(JSON.stringify(pol.regulatory), JSON.stringify({ dbrCapPct: 50, dbrCapRetireePct: 30, salaryMultipleCap: 20, fixedTenorMonths: 12, aecbCheckRequired: true,
    coolingOffDays: 5, payee: 'SCHOOL', earlySettlementFee: 'None' }), 'the locked block exactly as specified (fixedTenorMonths 12, payee SCHOOL)');
  eq(JSON.stringify(pol.params), JSON.stringify({ minSalary: 5000, minAge: 21, maxAge: 65, scoreDecline: 620, scoreRefer: 680, maxEsrPct: 60, thinFileAction: 'REFER',
    minMonthsInUae: 6, chequeReturnsMax: 1, minAmount: 2000, productCap: 120000, instalmentToFcfMaxPct: 50, partnerSchoolParentFeePct: 0, merchantFeePct: 5,
    nonPartnerMonthlyFeeRate: { A: 0.005, B: 0.0075, C: 0.01 }, completenessThresholdPct: 70, footprintOverlayMode: 'SHADOW', footprintOverlayCap: 20, tokenValidityDays: 14 }),
    'the params exactly as specified');
  ok(pol.version === 1 && E.policyHistory('school_fees').length === 1 && pol.platform && pol.platform.repaymentCollection && pol.platform.repaymentCollection.altareqMaxAmount === 1000,
     'pack v1 with its own history; the v2.3 platform rule rides on it');
  throwsWith(() => E.publishPolicy('school_fees', { fixedTenorMonths: 6 }, META), ['fixedTenorMonths', 'locked rule'], 'publish refuses fixedTenorMonths (12 months is a locked rule of the pack)');
  throwsWith(() => E.publishPolicy('school_fees', { payee: 'CUSTOMER' }, META), ['payee', 'locked rule'], 'publish refuses the payee (always the school)');
  throwsWith(() => E.publishPolicy('school_fees', { dbrCapPct: 55 }, META), 'locked regulatory primitive', 'publish refuses the DBR cap (regulatory)');
  throwsWith(() => E.publishPolicy('school_fees', { monthlyFeeRate: { A: 0.01, B: 0.01, C: 0.01 } }, META), 'unknown policy parameter', 'an unknown param is refused');
  const BOUNDS = [['minSalary', 3000, 25000], ['minAge', 18, 25], ['maxAge', 60, 70], ['maxEsrPct', 30, 90], ['minMonthsInUae', 0, 24], ['chequeReturnsMax', 0, 5],
                  ['minAmount', 500, 10000], ['productCap', 20000, 300000], ['instalmentToFcfMaxPct', 10, 80], ['merchantFeePct', 0, 10],
                  ['completenessThresholdPct', 50, 90], ['footprintOverlayCap', 0, 30], ['tokenValidityDays', 3, 30]];
  for (const [k, lo, hi] of BOUNDS) {
    const okLo = (() => { try { E.simulateBook('school_fees', { [k]: lo }); return true; } catch (e) { return false; } })();
    const okHi = (() => { try { E.simulateBook('school_fees', { [k]: hi }); return true; } catch (e) { return false; } })();
    const below = (() => { try { E.simulateBook('school_fees', { [k]: lo - (lo >= 100 ? 100 : 1) }); return false; } catch (e) { return /outside allowed bounds/.test(e.message); } })();
    const above = (() => { try { E.simulateBook('school_fees', { [k]: hi + (hi >= 100 ? 100 : 1) }); return false; } catch (e) { return /outside allowed bounds/.test(e.message); } })();
    ok(okLo && okHi && below && above, 'bounds ' + k + ' [' + lo + ', ' + hi + ']: both ends accepted, outside refused');
  }
  ok((() => { try { E.simulateBook('school_fees', { scoreDecline: 550, scoreRefer: 600 }); E.simulateBook('school_fees', { scoreDecline: 720, scoreRefer: 780 }); return true; } catch (e) { return false; } })(),
     'bounds scoreDecline [550, 720] and scoreRefer [600, 780]: the ends accepted');
  throwsWith(() => E.simulateBook('school_fees', { scoreDecline: 549 }), 'outside allowed bounds', 'scoreDecline 549 refused');
  throwsWith(() => E.simulateBook('school_fees', { scoreRefer: 781 }), 'outside allowed bounds', 'scoreRefer 781 refused');
  throwsWith(() => E.simulateBook('school_fees', { scoreDecline: 700, scoreRefer: 690 }), 'must be at or above scoreDecline', 'the refer line can never sit below the decline cut-off');
  throwsWith(() => E.simulateBook('school_fees', { partnerSchoolParentFeePct: 1 }), ['partnerSchoolParentFeePct', 'product promise'], 'partnerSchoolParentFeePct is [0, 0] — 0% is the product promise');
  ok((() => { try { E.simulateBook('school_fees', { partnerSchoolParentFeePct: 0 }); return true; } catch (e) { return false; } })(), 'partnerSchoolParentFeePct 0 accepted');
  throwsWith(() => E.simulateBook('school_fees', { nonPartnerMonthlyFeeRate: { A: 0.005, B: 0.0075, C: 0.021 } }), 'must be in [0, 0.02]', 'a non-partner rate above 2% a month is refused');
  throwsWith(() => E.simulateBook('school_fees', { nonPartnerMonthlyFeeRate: { A: -0.001, B: 0.0075, C: 0.01 } }), 'must be in [0, 0.02]', 'a negative non-partner rate is refused');
  throwsWith(() => E.simulateBook('school_fees', { nonPartnerMonthlyFeeRate: { A: 0.01, B: 0.0075, C: 0.01 } }), 'risk-ordered', 'non-partner rates must be risk-ordered A ≤ B ≤ C');
  throwsWith(() => E.simulateBook('school_fees', { nonPartnerMonthlyFeeRate: { A: 0.005, B: 0.0075 } }), 'nonPartnerMonthlyFeeRate.C', 'all three bands are required');
  ok((() => { try { E.simulateBook('school_fees', { nonPartnerMonthlyFeeRate: { A: 0, B: 0.01, C: 0.02 } }); return true; } catch (e) { return false; } })(), 'non-partner rates at 0 and 2% accepted');
  throwsWith(() => E.publishPolicy('school_fees', { merchantFeePct: 4 }, { author: 'risk.lead', approver: 'Risk.Lead' }), '4-eyes', 'publishing the pack needs 4-eyes (author ≠ approver)');
  eq(E.getPolicy('school_fees').version, 1, 'refused publishes change nothing');

  // ---- Ravi, AED 15,000 at Juniper Hill (partner), 12 months ----
  const plain = sf();
  ok(plain.outcome === 'APPROVE' && plain.limit.approved === 15000 && plain.limit.bindingConstraint === 'REQUESTED' && plain.score.points === 737 && plain.score.grade === 'B' &&
     plain.reasonCodes.length === 0, 'decide(school_fees, j1, AED 15,000, Juniper Hill): APPROVE AED 15,000 (the invoice binds) · NoorScore 737 · grade B · no reason codes');
  const k = plain.pricing.kfs;
  ok(plain.pricing.mode === 'SCHOOL_FEES' && k.tenorMonths === 12 && k.monthlyInstalment === 1250 && k.totalFees === 0 && k.aprEquivalent === 0 && k.planTotal === 15000 &&
     plain.pricing.monthlyFeeRate === 0 && plain.pricing.partnerSchool === true, 'the plan: 12 × AED 1,250.00 · fees AED 0 · APR 0% · plan total AED 15,000 (mode SCHOOL_FEES, kfs.monthlyInstalment)');
  ok(plain.features.dbrPct === 17.9 && plain.features.newInstallment === 1250 && plain.features.existingObligations === 900 && rule(plain, 'REG_DBR_CAP').result === 'PASS',
     'DBR (900 + 1,250) ÷ 12,000 = 17.9% (REG_DBR_CAP PASS)');
  ok(plain.features.instalmentBudgetMonthly === 1850 && plain.features.maxPrincipal === 22000 && plain.features.freeCashFlowMonthly === 3700 && plain.features.headroomMonthly === 5100,
     'budget = min(DBR headroom 5,100, 50% × FCF 3,700 = 1,850) = 1,850 → partner max AED 22,000');
  const tr = plain.limit.trace.map(t => t.key + ':' + t.value).join(' ');
  eq(tr, 'REQUESTED:15000 DBR_HEADROOM:61000 FCF:22000 SALARY_MULTIPLE:240000 PRODUCT_CAP:120000', 'limit trace: invoice 15,000 · DBR 61,000 · FCF 22,000 · 20× salary 240,000 · cap 120,000');
  ok(plain.repayment && plain.repayment.method === 'DIRECT_DEBIT' && plain.token.conditions.includes('Paid directly to the school against the fee invoice — never to the customer') &&
     plain.token.conditions.includes(DD_COND) && plain.token.conditions[0] === KFS_COND, 'repayment: a direct debit mandate (above AED 1,000); the token: KFS, the mandate, paid directly to the school');
  const sfr = plain.schoolFees;
  ok(sfr && sfr.school.id === 'sch-juniper' && sfr.school.partner === true && sfr.school.regulator === 'KHDA' && sfr.school.ibanMasked === 'AE•• •••• •••• •••• •••• 4410' &&
     sfr.invoice.ref === 'INV-26-0815' && sfr.invoice.amount === 15000 && sfr.invoice.dueDate === '2026-08-20' && sfr.months === 12 && sfr.monthlyInstalment === 1250 &&
     sfr.totalFees === 0 && sfr.aprEquivalent === 0 && sfr.planTotal === 15000 && sfr.payee === 'SCHOOL', 'record.schoolFees: the school, the invoice, 12 months, 12 × 1,250, no fees, APR 0, payee the school');
  ok(sfr.bestDebitDay === 28 && sfr.coolingOffEndsOn === '2026-07-24' && sfr.firstPaymentDate === '2026-08-28' && sfr.lastPaymentDate === '2027-07-28' && sfr.coolingOffEndsAfterDueDate === false,
     'dates: best debit date the 28th (the day after the salary); cooling-off ends 24 Jul (5 business days); first payment 28 Aug 2026 (≥ 20 days after payout), last 28 Jul 2027; before the due date');
  ok(!('child' in sfr) && !JSON.stringify(sfr).includes('Child 1') && !JSON.stringify(plain.inputs).includes('Child 1'), 'the record carries nothing about the child');
  ok(rule(plain, 'POL_SCHOOL_VERIFIED').result === 'PASS' && rule(plain, 'REG_FIXED_TERM').result === 'PASS' && rule(plain, 'POL_MIN_AMOUNT').result === 'PASS' &&
     rule(plain, 'POL_INSTALMENT_TO_FCF').result === 'PASS', 'rules: POL_SCHOOL_VERIFIED PASS (in the directory) · REG_FIXED_TERM · POL_MIN_AMOUNT · POL_INSTALMENT_TO_FCF');
  ok(plain.dataPulls.some(x => x.source === 'SCHOOL_DIRECTORY' && x.status === 'VERIFIED') && plain.dataPulls[0].source === 'AECB_CONSUMER' && plain.dataPulls.some(x => x.source === 'OPEN_FINANCE'),
     'data pulls: AECB, Open Finance and the school directory (internal)');
  ok(plain.features.salaryVerifiedViaConnectedAccount === true && plain.score.overlays.some(o => /Salary verified via connected account/.test(o.name)), 'salary verified via connected accounts (+15), as on the personal loan');

  // ---- the same customer on the personal loan: identical NoorScore, grade, reason codes and completeness ----
  const sfJ = sf(JOURNEY), plJ = pl(JOURNEY);
  ok(sfJ.outcome === 'APPROVE' && sfJ.score.points === plJ.score.points && sfJ.score.points === 737 && sfJ.score.grade === plJ.score.grade &&
     JSON.stringify(sfJ.reasonCodes) === JSON.stringify(plJ.reasonCodes) && JSON.stringify(sfJ.dataCompleteness) === JSON.stringify(plJ.dataCompleteness) &&
     JSON.stringify(sfJ.score.overlays) === JSON.stringify(plJ.score.overlays), 'the journey application: NoorScore 737, grade B, reason codes, completeness and score overlays identical to the personal loan');
  eq(codes(sfJ), 'G02|G03|G04|G05|G06|G07|G08|G09|G10|G11|PR-PB-G01', 'library codes for Partner Bank: G02–G11 and PR-PB-G01');
  eq(codes(sfJ), codes(plJ), 'the same library codes as Ravi’s personal loan');
  eq(codes(sfJ, 'lender-b'), codes(plJ, 'lender-b'), 'the same library codes for Lender B');
  ok(['POL_ID_VALID', 'POL_EMPLOYER_MATCH', 'POL_DATA_COMPLETENESS', 'POL_IDENTITY_FOOTPRINT'].every(id => rule(sfJ, id).result === rule(plJ, id).result) &&
     sfJ.dataPulls.some(x => x.source === 'EMIRATES_ID') && sfJ.dataPulls.some(x => x.source === 'DIGITAL_FOOTPRINT') && sfJ.inputs.contactVerification.phone === 'BOTIM',
     'the Emirates ID rules, data completeness, the terms-based footprint check and botim’s verification run exactly as on the personal loan');
  ok(sfJ.limit.approved === 15000 && sfJ.pricing.kfs.monthlyInstalment === 1250 && plJ.pricing.kfs.monthlyInstalment === 1311.7, 'only the product, the instalment and the price differ (1,250.00 vs 1,311.70)');
  const mS = E.creditMemo(sfJ.id), mP = E.creditMemo(plJ.id);
  ok(JSON.stringify(mS.outputs) === JSON.stringify(mP.outputs), 'the memo’s output table is identical to the personal loan’s (NoorScore, codes, completeness, income, additional income, DBR)');
  const dbrRow = mS.outputs.find(o => o.key === 'dbr');
  ok(dbrRow.value === '15–20% · headroom AED 3,500–4,000 / month' && mS.affordability.dbrBand === '15–20%' && mS.affordability.headroomBand === 'AED 3,500–4,000 / month',
     'memo DBR band "15–20%" and headroom "AED 3,500–4,000 / month" (3,850) — the same bands as the personal-loan memo');
  ok(['incomeBand', 'additionalIncomeBand', 'freeCashFlowBand', 'instalmentToCashFlowBand', 'incomeVerifiedVia'].every(x => mS.affordability[x] === mP.affordability[x]) &&
     JSON.stringify(mS.scoreComponents) === JSON.stringify(mP.scoreComponents) && JSON.stringify(mS.monitoring) === JSON.stringify(mP.monitoring) &&
     JSON.stringify(mS.bureau) === JSON.stringify(mP.bureau) && JSON.stringify(mS.dataCompleteness) === JSON.stringify(mP.dataCompleteness),
     'the affordability bands, score components, monitoring (best debit date the 28th), bureau flags and completeness match the personal-loan memo');
  ok(mS.monitoring.bestDebitDate === '28th of the month', 'monitoring: best debit date the 28th');

  // ---- pre-qualification ----
  const pq = E.prequalify(j, OF);
  eq(JSON.stringify(pq.schoolFees), JSON.stringify({ months: 12, maxPartner: 22000, maxOther: 20000, instalmentBudgetMonthly: 1850, nonPartnerBand: 'B', nonPartnerRate: 0.0075 }),
     'prequalify().schoolFees: maxPartner AED 22,000 · maxOther (band B, 0.75%) AED 20,000 · budget 1,850');
  ok(pq.indicativeMin === 10000 && pq.indicativeMax === 40000 && pq.maxByTermMonths[12] === 21000 && pq.assumptions.instalmentBudgetMonthly === 1850,
     'the personal-loan fields are unchanged (AED 10,000–40,000; 12 → 21,000; budget 1,850)');
  ok(pq.schoolFees.maxPartner === plain.features.maxPrincipal, 'pre-qualification never promises more than decide() allows (22,000 = the decision’s partner max)');
  const pqNeed = E.prequalify(j, OF, { approvedAccounts: NO_CURRENT });
  ok(pqNeed.status === 'NEEDS_DATA' && !('schoolFees' in pqNeed), 'below the completeness threshold: NEEDS_DATA and no school-fees block either');
  const pqOk = E.prequalify(j, OF, { approvedAccounts: ALL_ACC });
  eq(JSON.stringify(pqOk.schoolFees), JSON.stringify(pq.schoolFees), 'at or above the threshold the school-fees block is the same');

  // ---- Falcon Ridge (another licensed school), AED 15,000, band B ----
  const f = sf({ school: FALCON });
  const fk = f.pricing.kfs;
  ok(f.outcome === 'APPROVE' && f.score.points === 737 && f.pricing.partnerSchool === false && f.pricing.monthlyFeeRate === 0.0075 && fk.monthlyInstalment === 1362.5 &&
     fk.monthlyFee === 112.5 && fk.totalFees === 1350 && fk.planTotal === 16350, 'Falcon Ridge: 12 × AED 1,362.50 (1,250 + 0.75% × 15,000) · fees AED 1,350 · total AED 16,350');
  near(fk.aprEquivalent, independentApr(15000, 1362.5, 12), 0.0001, 'the APR equivalent matches an independent IRR (Newton)');
  ok(fk.aprEquivalent > 0.15 && fk.aprEquivalent < 0.17 && fk.aprEquivalent === 0.1622, 'APR equivalent about 16% (16.22%)');
  ok(f.features.dbrPct === 18.9 && f.pricing.merchantFeePct === null && plain.pricing.merchantFeePct === 5, 'DBR 18.9% with the fee; the merchant fee is internal and only at a partner school');
  const q = E.quoteSchoolFees(15000, { schoolId: 'sch-falcon', band: 'B' });
  ok(q.monthlyInstalment === 1362.5 && q.totalFees === 1350 && q.aprEquivalent === fk.aprEquivalent && q.line === '12 × AED 1,362.50 · monthly fee 0.75% · APR equivalent 16.22%' &&
     q.school.name === 'Falcon Ridge Academy' && q.partner === false, 'quoteSchoolFees(15,000, Falcon Ridge, B): "12 × AED 1,362.50 · monthly fee 0.75% · APR equivalent 16.22%"');
  const qj = E.quoteSchoolFees(15000, { schoolId: 'sch-juniper' });
  ok(qj.monthlyInstalment === 1250 && qj.totalFees === 0 && qj.aprEquivalent === 0 && qj.line === '12 × AED 1,250 · 0% interest, no fees' && qj.partner === true,
     'quoteSchoolFees(15,000, Juniper Hill): "12 × AED 1,250 · 0% interest, no fees"');
  ok(E.quoteSchoolFees(15000, { schoolId: 'sch-falcon', band: 'A' }).monthlyFeeRate === 0.005 && E.quoteSchoolFees(15000, { schoolId: 'sch-falcon', band: 'C' }).monthlyFeeRate === 0.01 &&
     E.quoteSchoolFees(15000, { schoolId: 'sch-falcon' }).monthlyFeeRate === 0.0075, 'bands A 0.50% · B 0.75% (the default) · C 1.00%');
  ok(E.quoteSchoolFees(15500, { schoolId: 'sch-juniper' }).monthlyInstalment === 1291.67 && E.quoteSchoolFees(15500, { schoolId: 'sch-juniper' }).planTotal === 15500,
     'AED 15,500: 12 × 1,291.67, the plan total stays 15,500 (the last instalment absorbs the fils)');
  const nq = E.listDecisions().length, tq0 = sf({ amount: 3000 });
  E.quoteSchoolFees(20000, { schoolId: 'sch-falcon', band: 'C' }); E.quoteSchoolFees(20000, { schoolId: 'sch-juniper' });
  const tq1 = sf({ amount: 3000 });
  ok(E.listDecisions().length === nq + 2 && new Date(tq1.createdAt) - new Date(tq0.createdAt) === 37000, 'quoteSchoolFees() is pure: no record, no clock tick');
  throwsWith(() => E.quoteSchoolFees(0, { schoolId: 'sch-juniper' }), 'positive amount', 'quoteSchoolFees() needs a positive amount');
  throwsWith(() => E.quoteSchoolFees(15000, { schoolId: 'sch-juniper', band: 'D' }), 'band must be', 'quoteSchoolFees() refuses an unknown band');

  // ---- an invoice above the max: approved = the max, RC_LIMIT_REDUCED → Y09 ----
  const big = sf({ amount: 30000 });
  ok(big.outcome === 'APPROVE' && big.limit.approved === 22000 && big.limit.bindingConstraint === 'FCF' && big.reasonCodes.join('|') === 'RC_LIMIT_REDUCED' &&
     big.schoolFees.shortfall === 8000 && big.pricing.kfs.monthlyInstalment === 1833.33, 'invoice AED 30,000: approved AED 22,000 (FCF binds) with RC_LIMIT_REDUCED; Noor splits 22,000, the parent pays 8,000 to the school');
  ok(codes(big).split('|').includes('Y09') && E.REASON_CODE_MAP.RC_LIMIT_REDUCED === 'Y09', 'the memo carries Y09 Amount Adjusted to Fit');
  const bigF = sf({ amount: 30000, school: FALCON });
  ok(bigF.limit.approved === 20000 && bigF.limit.bindingConstraint === 'FCF', 'at Falcon Ridge (band B) the max is AED 20,000');

  // ---- tenor 6 → 12, RC_TENOR_CAP → Y10 ----
  const t6 = sf({ tenorMonths: 6 });
  ok(t6.outcome === 'APPROVE' && t6.pricing.kfs.tenorMonths === 12 && t6.features.effectiveTenor === 12 && t6.reasonCodes.join('|') === 'RC_TENOR_CAP' &&
     t6.request.tenorMonths === 6 && rule(t6, 'REG_FIXED_TERM').observed === '6 → set to 12', 'tenor 6 → set to 12 with RC_TENOR_CAP (the request keeps 6)');
  ok(codes(t6).split('|').includes('Y10') && E.REASON_CODE_MAP.RC_TENOR_CAP === 'Y10', 'the memo carries Y10 Term Adjusted to Rules');
  ok(sf({ tenorMonths: 24 }).pricing.kfs.tenorMonths === 12, 'tenor 24 → 12 too');

  // ---- an unknown school throws; nothing recorded ----
  const nU = E.listDecisions().length;
  throwsWith(() => sf({ school: { schoolId: 'sch-nowhere', invoiceRef: 'X', dueDate: '2026-08-20' } }), 'unknown school', 'an unknown school throws');
  const noInv = clone(j); delete noInv.schoolFees;
  throwsWith(() => E.decide({ productId: 'school_fees', applicant: noInv, amount: 15000, tenorMonths: 12, consents: OF }), 'application.school', 'no school and no invoice on the applicant: refused');
  throwsWith(() => sf({ school: { schoolId: 'sch-juniper', dueDate: 'soon' } }), 'dueDate', 'a malformed due date is refused');
  throwsWith(() => E.quoteSchoolFees(15000, { schoolId: 'sch-nowhere' }), 'unknown school', 'quoteSchoolFees() with an unknown school throws');
  throwsWith(() => sf({ consents: { aecb: false, openFinance: true } }), 'AECB consent', 'AECB consent is required, as for every product');
  eq(E.listDecisions().length, nU, 'refusals record nothing');
  const dflt = E.decide({ productId: 'school_fees', applicant: j, amount: 15000, tenorMonths: 12, consents: OF });
  ok(dflt.schoolFees.school.id === 'sch-juniper' && dflt.schoolFees.invoice.ref === 'INV-26-0815', 'without application.school the applicant’s own invoice is used');

  // ---- red flags REFER on school_fees (r6) — never a decline, never a price change ----
  const rf = sf({}, r6);
  const r6plain = clone(r6); delete r6plain.redFlagData;
  const rfOff = sf({}, r6plain);
  ok(rf.outcome === 'REFER' && rf.reasonCodes.includes('RC_RED_FLAGS_REVIEW') && rule(rf, 'POL_RED_FLAGS').result === 'REFER' && rf.redFlags && rf.redFlags.referred,
     'r6 on school fees: REFER with RC_RED_FLAGS_REVIEW (POL_RED_FLAGS — cards maxed, balances drained)');
  ok(rfOff.outcome === 'APPROVE' && JSON.stringify(rf.pricing) === JSON.stringify(rfOff.pricing) && rf.score.points === rfOff.score.points && rf.limit.approved === rfOff.limit.approved,
     'refer only: the same score, amount and price as without the signals');
  ok(codes(rf).split('|').includes('R02'), 'the memo carries R02 Recent Changes in Account Activity');

  // ---- data completeness below the threshold → REFER (never a decline, never a price change) ----
  const dcLow = sf({ dataSources: { approvedAccounts: NO_CURRENT, months: 12 } });
  const dcPl = pl({ dataSources: { approvedAccounts: NO_CURRENT, months: 12 } });
  ok(dcLow.outcome === 'REFER' && dcLow.reasonCodes.join('|') === 'RC_DATA_INCOMPLETE' && rule(dcLow, 'POL_DATA_COMPLETENESS').result === 'REFER' && dcLow.dataCompleteness.pct === 30 &&
     dcLow.pricing.kfs.monthlyInstalment === 1250, 'completeness 30% (current unticked): REFER with RC_DATA_INCOMPLETE; the price is unchanged');
  ok(dcPl.outcome === dcLow.outcome && JSON.stringify(dcPl.reasonCodes) === JSON.stringify(dcLow.reasonCodes) && dcPl.score.points === dcLow.score.points,
     'the same outcome, reason code and score as the personal loan');
  const dc70 = sf({ dataSources: { approvedAccounts: NO_CARD_LOAN, months: 12 } });
  ok(dc70.outcome === 'APPROVE' && dc70.score.points === 727 && dc70.score.grade === 'B' && dc70.pricing.kfs.monthlyInstalment === 1250, 'completeness 70%: scored 727 (−10), still B, the same plan');
  ok(codes(dcLow).split('|').includes('Y13'), 'below the threshold the memo carries Y13 More Data Needed');

  // ---- the memo: product line, purpose, flags — never the school's name, the merchant fee, the invoice or the child ----
  const memo = E.creditMemo(sfJ.id), sftp = E.memoSftpRow(memo);
  ok(memo.product.productId === 'school_fees' && memo.product.nameEn === 'School fees — 12 months' && memo.product.purpose === 'Education — school fees, paid directly to the school',
     'memo product line "School fees — 12 months", purpose "Education — school fees, paid directly to the school"');
  ok(memo.verification.school === 'School verified (licensed, in the directory)' && memo.verification.payee === 'Paid to the school — funds cannot be diverted' &&
     memo.verification.identity === 'Identity verified', 'memo flags: "School verified (licensed, in the directory)" and "Paid to the school — funds cannot be diverted"');
  ok(memo.terms.amount === 15000 && memo.terms.tenorMonths === 12 && memo.terms.monthlyPayment === 1250 && memo.terms.totalRepayable === 15000 && memo.terms.totalFees === 0 &&
     memo.terms.aprEquivalent === 0 && memo.terms.monthlyFeeRate === 0 && memo.terms.payee === 'The school — paid directly by the lender' && memo.terms.repaymentMethod === 'DIRECT_DEBIT',
     'memo terms: AED 15,000 · 12 months · 1,250 · total 15,000 · fees 0 · APR 0 · payee the school · direct debit');
  eq(Object.keys(memo).join(','), MEMO_KEYS.slice(0, -1).concat(['dataCompleteness', 'consents']).join(','), 'memo keys: the v2.19 consumer memo’s (with completeness)');
  eq(sftp.header.join(), SFTP_HEADER.join(), 'SFTP header unchanged');
  ok(sftp.row[2] === 'school_fees' && sftp.row[6] === 'No interest, no fees (APR 0.00%)' && sftp.row[7] === '1250', 'SFTP: product school_fees · "No interest, no fees (APR 0.00%)" · 1250');
  const sftpF = E.memoSftpRow(E.creditMemo(f.id));
  ok(sftpF.row[6] === 'Fee 0.75%/mo (APR equivalent 16.22%)' && sftpF.row[7] === '1362.5', 'SFTP at Falcon Ridge: "Fee 0.75%/mo (APR equivalent 16.22%)" · 1362.5');
  const NO_SCHOOL = /juniper|falcon|primary school|academy|khda|merchant|partner school|partnerSchool|INV-26|invoice|\.pdf|child|grade 1|daughter|4410|7783|AE••|ibanMasked|sch-juniper|sch-falcon/i;
  const sfMemos = [sfJ, plain, f, big, t6, rf, dcLow, dc70];
  const leaks = [];
  for (const r of sfMemos) for (const lender of ['partner-bank', 'lender-b']) {
    const m = E.creditMemo(r.id, { lenderId: lender }), row = E.memoSftpRow(m);
    const body = JSON.stringify(m) + '\n' + row.header.join(',') + '\n' + row.row.join(',');
    const hit = body.match(NO_SCHOOL);
    if (hit) leaks.push(r.id + '/' + lender + ': ' + hit[0]);
    if (keysDeep(m).some(x => /merchant|partner|school(?!Fees)|invoice|child/i.test(x) && x !== 'school')) leaks.push(r.id + '/' + lender + ': key');
  }
  ok(leaks.length === 0, 'memos (Partner Bank and Lender B) and SFTP rows of every school-fees decision: no school name, regulator, IBAN, merchant fee, partner flag, invoice or child' + (leaks.length ? ' (' + leaks.slice(0, 3).join('; ') + ')' : ''));
  const expect = { incomeBand: T.income(12000), dbrBand: T.dbr(sfJ.features.dbrPct), freeCashFlowBand: T.fcf(3700), instalmentToCashFlowBand: T.share(sfJ.features.instalmentToFcfPct), aecbScoreBand: T.aecb(j.aecb) };
  /* c1's split purchase is "School fees" (a merchant word for the scan); here it is the product's own name and purpose — set aside there only */
  const hits = privacyScan(sfJ, memo, sftp, expect).concat(ipScan(memo, sftp, sfJ)).filter(x => !/^memo\.product\.(nameEn|purpose) names "School fees"$/.test(x));
  ok(hits.length === 0, 'the v2.5 privacy scan and the v2.18 Noor-IP scan stay clean on the school-fees memo (the product line itself may say "School fees")' + (hits.length ? ' (' + hits.slice(0, 3).join('; ') + ')' : ''));
  ok(forbiddenKeys(memo).length === 0, 'no internal keys in the memo (' + forbiddenKeys(memo).join(', ') + ')');
  const mB = E.creditMemo(sfJ.id, { lenderId: 'lender-b' });
  ok(mB.product.nameEn === 'School fees — 12 months' && !('verification' in mB) && !('affordability' in mB) && mB.outputs.map(o => o.key).join(',') === 'noorScore,reasonCodes',
     'Lender B (Core only): the product line, NoorScore and reason codes — no flags, no bands (the sharing agreement, as today)');

  // ---- every RC_* maps; no new codes ----
  ok(Object.keys(D.reasonCodes).length === 52 && Object.keys(D.reasonCodes).every(rc => typeof E.REASON_CODE_MAP[rc] === 'string'), 'no new reason codes (52); every RC_* still maps to exactly one library code');
  ok([...emittedCodes].every(rc => E.REASON_CODE_MAP[rc]), 'every code a school-fees decision emitted maps to a library code');
  ok(D.reasonCodeLibrary.length === 38, 'the library is unchanged (36 standard + 2 partner codes)');

  // ---- execution: the six steps, unchanged; "Partner Bank pays the school directly (…)" ----
  const steps = E.execSteps('school_fees', plain.id);
  ok(steps.map(x => x.type).join() === E.EXEC_EVENTS.join() && steps[5].description === 'Partner Bank pays the school directly (Juniper Hill Primary School)' &&
     steps[3].label === 'Direct debit mandate active' && /5 business days elapsed, or written waiver signed \(CPR 8\/2020\)/.test(steps[4].description),
     'execSteps: the six steps; DISBURSED "Partner Bank pays the school directly (Juniper Hill Primary School)"; cooling-off 5 business days or a written waiver');
  eq(E.execSteps('school_fees')[5].description, 'Partner Bank pays the school directly', 'without a decision: "Partner Bank pays the school directly"');
  throwsWith(() => E.recordEvent(plain.id, 'KFS_ACKNOWLEDGED'), 'out of sequence', 'out-of-order execution is refused');
  for (const t of E.EXEC_EVENTS) E.recordEvent(plain.id, t);
  const ex = E.getDecision(plain.id);
  ok(ex.status === 'EXECUTED' && /the 12-month school-fees plan now exists and the school is paid/.test(ex.audit[ex.audit.length - 1].detail), 'all six recorded: EXECUTED — the plan exists and the school is paid');
  const cm = E.recordCommunications(plain.id, { service: ['SMS', 'EMAIL'], marketing: [] });
  ok(cm.consents.communications.reference === 'CNS-' + plain.id.slice(4) + '-COMMS' && !JSON.stringify(E.creditMemo(plain.id)).includes('COMMS'), 'contact preferences on the funded plan — never in the memo');

  // ---- cooling-off vs the invoice due date: said, never auto-waived ----
  const early = sf({ school: Object.assign({}, JUNIPER, { dueDate: '2026-07-22' }) });
  ok(early.schoolFees.coolingOffEndsAfterDueDate === true && early.schoolFees.coolingOffEndsOn === '2026-07-24' && early.events.length === 0 && early.outcome === 'APPROVE',
     'an invoice due 22 Jul, before cooling-off ends (24 Jul): flagged on the record (the screen offers the waiver); nothing is waived automatically');

  // ---- reproduce, determinism ----
  const rp = E.reproduceDecision(sfJ.id);
  ok(rp.identical && rp.inputs.some(x => /^School invoice: the school \(directory id sch-juniper\), INV-26-0815, due 2026-08-20$/.test(x)), 'reproduceDecision(): identical; the logged inputs name the school invoice');
  ok(E.reproduceDecision(f.id).identical && E.reproduceDecision(big.id).identical && E.reproduceDecision(rf.id).identical, 'Falcon Ridge, the reduced plan and the red-flag refer reproduce');
  const tampered = E.getDecision(f.id); const keep = tampered.pricing.kfs.monthlyInstalment; tampered.pricing.kfs.monthlyInstalment = 1300;
  ok(!E.reproduceDecision(f.id).identical && /pricing/.test(E.reproduceDecision(f.id).message), 'a tampered price is caught');
  tampered.pricing.kfs.monthlyInstalment = keep;

  // ---- policy console: simulate the personal-loan book as 12-month school-fee requests (partner pricing) ----
  const sim = E.simulateBook('school_fees', {});
  ok(sim.size === D.sampleBook.personal_loan.length && sim.amountImpact && sim.before.APPROVE === sim.after.APPROVE && /Simulated \d+ applications/.test(sim.summary),
     'simulateBook(school_fees): the personal-loan sample book read as 12-month school-fee requests, with the amount impact');
  const simCap = E.simulateBook('school_fees', { productCap: 20000 });
  ok(simCap.amountImpact.approvalsReduced > 0 && simCap.amountImpact.approvedAmountAfter < simCap.amountImpact.approvedAmountBefore, 'a lower product cap reduces approved amounts (' + simCap.amountImpact.approvalsReduced + ' reduced)');
  const raw = E.decideRaw('school_fees', D.sampleBook.personal_loan[0]);
  ok(raw && raw.outcome && Number.isFinite(raw.approved), 'decideRaw(school_fees) evaluates a sample row (partner pricing)');
  const pub = E.publishPolicy('school_fees', { merchantFeePct: 4 }, META);
  const after = sf();
  ok(pub.version === 2 && E.policyHistory('school_fees').length === 2 && after.policyVersion === 2 && after.pricing.merchantFeePct === 4 && after.pricing.kfs.monthlyInstalment === 1250 &&
     E.reproduceDecision(sfJ.id).identical, 'a 4-eyes publish (merchant fee 4%) versions the pack; the parent’s plan is unchanged; v1 decisions still reproduce');

  // ---- monitoring: STP vs targets and the early-warning scan ----
  const mt = E.metrics();
  ok(mt.byProduct.school_fees && mt.byProduct.school_fees.decisions === E.listDecisions().filter(r => r.productId === 'school_fees').length && mt.stpTargets.school_fees === 85 &&
     mt.totals.decisions === Object.keys(mt.byProduct).reduce((x, kk) => x + mt.byProduct[kk].decisions, 0), 'metrics(): a school_fees row (this session’s decisions; no seeded history), STP target 85%, totals add up');
  const ml9 = E.earlyWarningScan().find(r => r.loanId === 'ML-09');
  ok(ml9 && ml9.productId === 'school_fees' && ml9.severityLabel === 'NONE' && ml9.flags.length === 0 && ml9.action && ml9.tenorMonths === 12 && !/school|child|juniper|falcon/i.test(JSON.stringify(D.monitoredLoans.find(l => l.id === 'ML-09')).replace(/school_fees/g, '')),
     'early-warning scan: ML-09, a school-fees plan, NONE — no school, invoice or child on the monitored loan');
  ok(E.getPolicy('earlyWarning').appliesTo.includes('school_fees') && E.REFER_SLA_HOURS.school_fees === 8, 'the early-warning block applies to school fees; refer SLA 8 hours');
  const q9 = E.referQueue().find(x => x.id === rf.id);
  ok(q9 && q9.productId === 'school_fees' && q9.slaHoursLeft === 8 && q9.redFlags && q9.redFlags.length, 'the red-flag refer sits in the queue with an 8-hour SLA');

  // ---- nationality is never an input ----
  const natA = clone(j), natB = clone(j);
  natA.emiratesId.front.nationality = 'Philippines'; natB.emiratesId.front.nationality = 'Egypt';
  const nA = sf(JOURNEY, natA), nB = sf(JOURNEY, natB);
  ok(nA.score.points === nB.score.points && nA.outcome === nB.outcome && JSON.stringify(nA.pricing) === JSON.stringify(nB.pricing) && nA.limit.approved === nB.limit.approved,
     'nationality changes nothing: the same score, outcome, amount and price');

  // ---- fingerprints, determinism, vocabulary ----
  E.init(D);
  const ALLc = { aecb: true, openFinance: true };
  const fpNow = {};
  for (const id of ['r1', 'r2', 'r3', 'r4', 'r5']) { const p = P[id]; fpNow[id] = E.decide({ productId: 'personal_loan', applicant: p, amount: p.defaultRequest.amount, tenorMonths: p.defaultRequest.tenorMonths, consents: ALLc }); }
  fpNow['r2+cp'] = E.decide({ productId: 'personal_loan', applicant: P.r2, amount: P.r2.defaultRequest.amount, tenorMonths: P.r2.defaultRequest.tenorMonths, consents: { aecb: true, openFinance: true, creditPassport: true } });
  for (const p of D.personasSplit) fpNow[p.id] = E.decide({ productId: 'split', applicant: p, amount: p.defaultRequest.amount, tenorMonths: p.defaultRequest.tenorMonths, consents: ALLc });
  for (const p of D.personasUpgrade) { fpNow[p.id] = E.decide({ productId: 'starter_loan', applicant: p, consents: ALLc }); fpNow[p.id + '+st'] = E.decide({ productId: 'starter_loan', applicant: p, consents: { aecb: true, openFinance: true, homeStatements: true } }); }
  fpNow.j1 = E.decide({ productId: 'personal_loan', applicant: j, amount: 15000, tenorMonths: 12, consents: ALLc });
  const a1 = D.personasCar[0];
  fpNow['a1+of'] = E.decide({ productId: 'car_loan', applicant: a1, amount: a1.defaultRequest.amount, tenorMonths: a1.defaultRequest.tenorMonths, consents: ALLc });
  fpNow['a1+docs'] = E.decide({ productId: 'car_loan', applicant: a1, amount: a1.defaultRequest.amount, tenorMonths: a1.defaultRequest.tenorMonths, consents: { aecb: true, openFinance: false } });
  fpNow['r1 advance'] = E.decide({ productId: 'salary_advance', applicant: P.r1, amount: 20000, tenorMonths: 1, consents: { aecb: true, openFinance: false } });
  const changed = Object.keys(V27_FINGERPRINTS).filter(kk => !fpNow[kk] || fingerprint(fpNow[kk]) !== V27_FINGERPRINTS[kk]);
  ok(changed.length === 0, 'every v2.9 fingerprint still matches after v2.21 (changed: ' + changed.join(', ') + ')');
  eq(fingerprint(E.decide({ productId: 'school_fees', applicant: j, amount: 15000, tenorMonths: 12, school: JUNIPER, consents: ALLc })), 'APPROVE 15000 B 737 REQUESTED  1250 17.9',
     'the school-fees fingerprint for Ravi: APPROVE 15000 B 737 REQUESTED · 1250 · 17.9');
  const run = () => { E.init(D); const x = sf(JOURNEY), y = sf({ school: FALCON, amount: 30000 }); return JSON.stringify([x, y, E.creditMemo(x.id), E.memoSftpRow(E.creditMemo(y.id)), E.prequalify(j, OF), E.quoteSchoolFees(15000, { schoolId: 'sch-falcon' })]); };
  ok(run() === run(), 'two fresh init() runs: identical records, memos, pre-qualification and quotes');
  const banned = /shari(?!ng)|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b|cash now|better financial sleep/i;
  const txt28 = JSON.stringify([E.getPolicy('school_fees'), E.manifests(), D.schools, E.quoteSchoolFees(15000, { schoolId: 'sch-falcon' }), E.execSteps('school_fees')]);
  ok(!banned.test(txt28) && !mentionsSalaryTransfer(txt28), 'no banned vocabulary in the school-fees pack, manifest, directory, quotes or steps');
  ok(D.schools.every(sch => /^(Juniper Hill Primary School|Falcon Ridge Academy)$/.test(sch.name)), 'the directory holds only the two fictitious schools');
  E.init(D);
});

// ---------------------------------------------------------------------------
console.log('\n' + '─'.repeat(60));
if (failures > 0) {
  console.error('SELFTEST FAILED: ' + failures + ' of ' + checks + ' checks failed.');
  process.exit(1);
} else {
  console.log('SELFTEST PASSED: all ' + checks + ' checks green.');
  process.exit(0);
}

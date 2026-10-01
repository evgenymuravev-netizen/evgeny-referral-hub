/*
 * Mizan — engine self-test (NOOR-PIVOT.md §Selftest, groups 1–10; group 11 =
 * Addendum v2.1, starter loan → upgrade; group 12 = v2.3 repayment collection
 * (REPAYMENT-SPEC.md); group 13 = v2.4 home-country statements (STATEMENTS-SPEC.md);
 * group 14 = v2.5 NoorScore + the lender's credit memo (LENDER-VIEW-SPEC.md); group 15 =
 * v2.6 customer journey: prequalify() and persona j1 (JOURNEY-SPEC.md))
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
  // Manifests: five consumer products, in order (starter_loan third — Addendum v2.1; car_loan appended fifth — Addendum v2.7).
  const mans = E.manifests();
  eq(mans.map(m => m.productId).join(','), 'split,personal_loan,starter_loan,salary_advance,car_loan', 'manifests are split, personal_loan, starter_loan, salary_advance, car_loan in order');
  ok(mans.every(m => m.segment === 'CONSUMER' && m.nameEn && m.nameAr && m.structure && m.pricingMode), 'every manifest is CONSUMER with names, structure, pricingMode');
  eq(mans.map(m => m.pricingMode).join(','), 'MONTHLY_FEE,BANDED_APR,TENOR_CURVE_APR,FLAT_FEE,BANDED_APR', 'pricing modes per product');
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
  ok(!('personasSme' in D) && !('sectorExclusions' in D) && !('retail' in D.sampleBook) && !('sme' in D.sampleBook),
     'no SME personas, sector screen or legacy sample-book keys');

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
const MEMO_KEYS = ['memoId', 'noorRef', 'lenderId', 'lenderName', 'createdAt', 'product', 'policyVersion', 'engineVersion',
                   'borrower', 'decision', 'terms', 'noorScore', 'affordability', 'bureau', 'verification', 'consents', 'sharing'];
const SFTP_HEADER = ['memo_id', 'noor_ref', 'product', 'outcome', 'amount', 'tenor', 'apr_or_fee', 'monthly_payment',
                     'repayment_method', 'noorscore', 'noorscore_band', 'income_band', 'dbr_band', 'aecb_band', 'reason_codes', 'created_at'];
const grp3 = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const T = {
  income: (x) => x === null || x === undefined ? null : (x < 5000 ? 'Below AED 5,000 / month'
    : (() => { const st = x < 20000 ? 5000 : 10000, lo = Math.floor(x / st) * st; return 'AED ' + grp3(lo) + '–' + grp3(lo + st) + ' / month'; })()),
  dbr: (p) => p === null || p === undefined ? null : (p < 20 ? '< 20%' : p < 35 ? '20–35%' : p <= 50 ? '35–50%' : '> 50%'),
  fcf: (x) => x === null || x === undefined ? null : (x < 1000 ? 'Below AED 1,000 / month' : x < 3000 ? 'AED 1,000–2,999 / month' : x < 5000 ? 'AED 3,000–4,999 / month' : 'AED 5,000+ / month'),
  share: (p) => p === null || p === undefined ? null : (p < 25 ? '< 25%' : p <= 50 ? '25–50%' : '> 50%'),
  aecb: (a) => !a || !a.hit ? 'No file' : (a.score === null || a.score === undefined ? 'File, no score yet' : (Math.floor(a.score / 50) * 50) + '–' + (Math.floor(a.score / 50) * 50 + 49)),
  noor: (v) => v === null || v === undefined ? null : (v >= 740 ? 'Excellent' : v >= 680 ? 'Very good' : v >= 620 ? 'Good' : v >= 560 ? 'Fair' : 'Poor')
};
const BAND_KEYS = { incomeBand: 1, dbrBand: 1, freeCashFlowBand: 1, instalmentToCashFlowBand: 1, aecbScoreBand: 1 };
const SFTP_BAND_COLS = { income_band: 1, dbr_band: 1, aecb_band: 1 };
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
  (cn.accounts || []).forEach(x => add(x.balance));
  if (a.homeStatements) a.homeStatements.months.forEach(m => { add(m.avgBalance); add(m.emi); if (m.remittance) add(m.remittance.amount); });
  const st = rec.homeStatements;
  if (st) [st.obligationsMonthlyAed, st.avgBalanceAed, st.avgBalanceLocal, st.remittanceMedianAed].forEach(add);
  [f.verifiedIncome, f.avgMonthlySpend, f.existingObligations, f.freeCashFlowMonthly, f.homeCountryObligations, f.homeObligationsMonthly,
   f.instalmentBudgetFcf, f.instalmentBudgetDbr, f.maxInstalment, f.headroomMonthly].forEach(add);
  return out;
}
// Recursive privacy scan: every leaf of the memo (and every SFTP cell). Strings are
// checked for bank labels, merchant names, statement files and "transactions", and
// every number inside them — like every numeric leaf — must not be a raw value.
// Band fields are instead checked to equal the independently computed band.
function privacyScan(rec, memo, sftp, expect) {
  const raw = rawValuesOf(rec);
  const hits = [];
  const wordRe = (w) => new RegExp('(^|[^A-Za-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^A-Za-z])', 'i');
  const words = BANK_LABELS.concat(MERCHANTS, STATEMENT_FILES).map(w => [w, wordRe(w)]);
  const numHit = (n, where) => { const v = Math.round(Math.abs(n) * 100) / 100; if (raw.has(v)) hits.push(where + ' = ' + n); };
  function str(s, where) {
    if (/transactions/i.test(s)) hits.push(where + ' says "transactions"');
    for (const [w, re] of words) if (re.test(s)) hits.push(where + ' names "' + w + '"');
    for (const tok of s.match(/\d[\d,]*(?:\.\d+)?/g) || []) numHit(parseFloat(tok.replace(/,/g, '')), where + ' ("' + tok + '")');
  }
  (function walk(x, path, key) {
    if (x === null || x === undefined) return;
    if (BAND_KEYS[key]) { if (x !== expect[key]) hits.push(path + ' band "' + x + '" ≠ expected "' + expect[key] + '"'); return; }
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, path + '[' + i + ']', key)); return; }
    if (typeof x === 'object') { for (const k of Object.keys(x)) walk(x[k], path + '.' + k, k); return; }
    if (typeof x === 'number') { numHit(x, path); return; }
    if (typeof x === 'string') str(x, path);
  })(memo, 'memo', '');
  sftp.header.forEach((col, i) => {
    const cell = sftp.row[i];
    if (SFTP_BAND_COLS[col]) {
      const want = { income_band: expect.incomeBand, dbr_band: expect.dbrBand, aecb_band: expect.aecbScoreBand }[col] || '';
      if (cell !== want) hits.push('sftp.' + col + ' "' + cell + '" ≠ "' + want + '"');
    } else str(cell, 'sftp.' + col);
  });
  return hits;
}
function forbiddenKeys(memo) {
  const bad = ['applicantSnapshot', 'features', 'dataPulls', 'rules', 'connected', 'bankData', 'monthlyIncome', 'monthlySpend', 'banks',
               'avgMonthlyIncome', 'avgMonthlySpend', 'freeCashFlowMonthly', 'homeBureau', 'audit', 'purchase', 'accounts'];
  const found = [];
  (function walk(x, path) {
    if (!x || typeof x !== 'object') return;
    for (const k of Object.keys(x)) { if (bad.includes(k)) found.push(path + '.' + k); walk(x[k], path + '.' + k); }
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
    eq(sftp.header.join(','), SFTP_HEADER.join(','), label + ': SFTP header columns');
    ok(sftp.row.length === 16 && sftp.row.every(c => typeof c === 'string') && !sftp.row.some(c => /[\r\n]/.test(c)), label + ': SFTP row is 16 flat string cells');
    ok(sftp.row[0] === memo.memoId && sftp.row[1] === r.id && sftp.row[3] === r.outcome && sftp.row[9] === (memo.noorScore.value === null ? '' : String(memo.noorScore.value)) &&
       sftp.row[14] === r.reasonCodes.join('|'), label + ': SFTP row matches the memo');
    // presence
    ok(memo.memoId === 'CM-' + r.id && memo.noorRef === r.id && memo.lenderName === 'Partner Bank (lender of record)', label + ': memo id, Noor reference, lender of record');
    ok(memo.decision.outcome === r.outcome && memo.decision.reasonCodes.length === r.reasonCodes.length &&
       memo.decision.reasonCodes.every(c => c.en && ARABIC.test(c.ar)), label + ': outcome + every reason code in English and Arabic');
    ok(memo.noorScore.value === (Number.isFinite(r.score.points) ? r.score.points : null) && memo.noorScore.band === T.noor(memo.noorScore.value) &&
       Array.isArray(memo.noorScore.factors) && memo.noorScore.factors.length <= 3 && memo.noorScore.factors.every(w => !/\d/.test(w)),
       label + ': NoorScore + band, ≤ 3 factor directions with no numbers');
    const types = memo.consents.map(c => c.type);
    ok(types.includes('aecb') && types.includes('shareWithLender') && memo.consents.every(c => /^CNS-\d{6}-[A-Z]+$/.test(c.reference) && c.grantedAt && Object.keys(c).join() === 'type,grantedAt,reference'),
       label + ': consent references only (type, grantedAt, reference) incl. aecb + shareWithLender');
    ok(memo.bureau.aecbChecked === true && memo.verification.identity === 'Verified (UAE PASS)' && /^784-••••-•••••••-\d$/.test(memo.borrower.emiratesIdMasked),
       label + ': AECB checked, identity flag, masked Emirates ID');
    ok(memo.sharing.withheld.length >= 6 && memo.sharing.withheld.every(w => w.group && w.reason) &&
       memo.sharing.withheld.some(w => /Open Finance data is shared with Noor for this purpose only and cannot be passed on/.test(w.reason)),
       label + ': withheld groups each carry a reason');
    ok(r.outcome === 'APPROVE' ? !!memo.terms && Number.isFinite(memo.terms.coolingOffDays) : memo.terms === null, label + ': terms only on an approval');
    // bands, computed independently
    const f = r.features, aSnap = r.applicantSnapshot;
    const share = Number.isFinite(f.instalmentToFcfPct) ? f.instalmentToFcfPct
      : (r.kind === 'UPGRADE' && r.selection && f.freeCashFlowMonthly > 0 ? Math.round(r.selection.monthlyPayment / f.freeCashFlowMonthly * 1000) / 10 : null);
    const expect = { incomeBand: T.income(f.verifiedIncome), dbrBand: T.dbr(f.dbrPct), freeCashFlowBand: T.fcf(f.freeCashFlowMonthly),
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
  ok(r3.features.dbrPct > 35 && E.creditMemo(r3.id).affordability.dbrBand === '35–50%', 'r3 sits in the 35–50% DBR band');
  const c2m = E.creditMemo(c2.id);
  ok(c2m.decision.route === 'ANALYST_REVIEW' && c2m.decision.outcome === 'APPROVE' && c2m.terms, 'override approval: route ANALYST_REVIEW, terms present');
  const r2s = E.creditMemo(all.find(x => x.label === 'r2+statements').rec.id);
  ok(/^6 of 6 months verified · conduct clean/.test(r2s.verification.homeStatements) && !/HDFC|Statement_/i.test(JSON.stringify(r2s)), 'r2 statements: a verification flag, never the bank or the file');
  const r2c = E.creditMemo(all.find(x => x.label === 'r2+creditPassport').rec.id);
  ok(/Credit Passport/.test(r2c.bureau.homeCountryFile) && !/CIBIL|Nova/.test(JSON.stringify(r2c)), 'Credit Passport: a bureau flag, never the home bureau or its score');
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
  ok(D.lenders.length === 1 && D.lenders[0].id === 'partner-bank' && D.lenders[0].name === 'Partner Bank' && D.lenders[0].role === 'Lender of record',
     'MizanData.lenders = [Partner Bank, lender of record]');

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
     cn.accounts.map(a => a.bank + ' ' + a.mask).join(',') === 'ENBD 4821,FAB 0193', 'j1: salary verified via connected accounts; 12 months, ENBD current ••••4821 + FAB savings ••••0193');
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
  ok(rec.features.freeCashFlowMonthly === 3700 && rec.features.instalmentToFcfPct > 25 && rec.features.dbrPct < 20, 'j1 features: free cash flow 3,700 (informational), DBR < 20%');
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
  ok(!/ENBD|FAB|4821|0193|12,000|12000|7,400|7400|wedding/i.test(JSON.stringify(memo)), 'j1 memo: no bank, account mask, exact income/spend or purpose');
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
  ok(m.affordability.incomeBand === 'AED 50,000–60,000 / month' && m.affordability.dbrBand === '35–50%' && m.affordability.freeCashFlowBand === 'AED 5,000+ / month' &&
     m.affordability.instalmentToCashFlowBand === '< 25%' && /^Open Finance \(Al Tareq\), 12 months/.test(m.affordability.incomeVerifiedVia),
     'memo bands from income counted: AED 50,000–60,000 / month; DBR 35–50%; FCF 5,000+; instalment share < 25%');
  ok(md.affordability.incomeBand === 'AED 40,000–50,000 / month' && md.affordability.dbrBand === '35–50%' && md.affordability.freeCashFlowBand === null &&
     md.affordability.incomeVerifiedVia === 'Salary certificate', 'documents-only memo: income band AED 40,000–50,000, DBR 35–50%, no free-cash-flow band, salary certificate');
  ok(m.verification.otherIncome === 'Rental income verified via Open Finance (12 months) — counted at 75%' &&
     m.verification.downPaymentSource === 'Own funds — verified in connected accounts', 'memo flags: otherIncome (category only) and downPaymentSource');
  ok(md.verification.otherIncome === 'Declared other income not counted — not verifiable in an instant decision' && md.verification.downPaymentSource === 'Own funds — declared, not verified',
     'documents-only memo flags: other income not counted; down payment declared');
  ok(m.noorScore.value === 795 && m.noorScore.band === 'Excellent' && m.bureau.aecbScoreBand === '750–799', 'memo NoorScore 795 Excellent, AECB band 750–799');
  ok(m.sharing.shared.some(s => /^Vehicle quote/.test(s)) && m.sharing.withheld.some(w => /^Rental income amounts, receipts/.test(w.group) && /cannot be passed on/.test(w.reason)),
     'shared vs withheld: the vehicle quote is shared; rent amounts and receipts are withheld with the Open Finance reason');
  const plMemo = E.creditMemo(decidePersona('personal_loan', P.r1).id);
  ok(!plMemo.sharing.shared.some(s => /Vehicle/.test(s)) && plMemo.sharing.withheld.length === 7 && !('otherIncome' in plMemo.verification) &&
     !('downPaymentSource' in plMemo.verification) && !('vehicle' in plMemo.terms), 'other products\' memos are unchanged (no vehicle, no car flags, the same 7 withheld groups)');
  ok(sm.row[2] === 'car_loan' && sm.row[5] === '60' && sm.row[4] === '180000' && sm.row[6] === 'APR 4.49%' && sm.row[7] === '3354.93' && sm.row.length === 16 &&
     sm.header.join(',') === SFTP_HEADER.join(','), 'SFTP: the existing 16 columns; product car_loan, tenor 60');
  const scanOf = carPrivacyScan(m, sm), scanDc = carPrivacyScan(md, smd);
  ok(scanOf.length === 0, 'a1 memo + SFTP (Open Finance): no 9,000 / 27,000 / 6,750 / 54,000 / 18,000 / 16,300 / balances / Mashreq / HSBC / ADCB / 7714 / 3302 / 5568 / "transactions"' + (scanOf.length ? ' (' + scanOf.slice(0, 4).join('; ') + ')' : ''));
  ok(scanDc.length === 0, 'a1 memo + SFTP (documents only): the same privacy scan is clean' + (scanDc.length ? ' (' + scanDc.slice(0, 4).join('; ') + ')' : ''));
  // the scan itself bites: a planted rent figure, a bank name and "transactions" are all caught, and AED 180,000 is not mistaken for 18,000
  const planted = clone(m); planted.verification.otherIncome = 'Rent AED 27,000 into HSBC — 4 transactions'; planted.terms.extra = 9000;
  ok(carPrivacyScan(planted, sm).length >= 4 && carPrivacyScan({ a: 'AED 180,000 and AED 190,000' }, { header: [], row: [] }).length === 0,
     'the privacy scan catches a planted 27,000 / 9,000 / HSBC / "transactions", and never mistakes AED 180,000 for 18,000');
  // and the generic v2.5 scan agrees once the dealer-quote block (allowed exact figures) is set aside
  const noVehicle = clone(m); delete noVehicle.terms.vehicle;
  const gen = privacyScan(E.getDecision(of.id), noVehicle, sm, { incomeBand: T.income(51750), dbrBand: T.dbr(44.55), freeCashFlowBand: T.fcf(16300),
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
console.log('\n' + '─'.repeat(60));
if (failures > 0) {
  console.error('SELFTEST FAILED: ' + failures + ' of ' + checks + ' checks failed.');
  process.exit(1);
} else {
  console.log('SELFTEST PASSED: all ' + checks + ' checks green.');
  process.exit(0);
}

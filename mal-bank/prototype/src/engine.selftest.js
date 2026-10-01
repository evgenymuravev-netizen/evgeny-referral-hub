/*
 * Mizan — engine self-test (NOOR-PIVOT.md §Selftest, groups 1–10)
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
  // Manifests: exactly three consumer products, in order.
  const mans = E.manifests();
  eq(mans.map(m => m.productId).join(','), 'split,personal_loan,salary_advance', 'manifests are split, personal_loan, salary_advance in order');
  ok(mans.every(m => m.segment === 'CONSUMER' && m.nameEn && m.nameAr && m.structure && m.pricingMode), 'every manifest is CONSUMER with names, structure, pricingMode');
  eq(mans.map(m => m.pricingMode).join(','), 'MONTHLY_FEE,BANDED_APR,FLAT_FEE', 'pricing modes per product');
  eq(mans[0].structure, 'Instalment plan (revolving split capacity)', 'split structure string');
  eq(mans[1].structure, 'Amortising loan (reducing balance)', 'personal_loan structure string');
  eq(mans[2].structure, 'Single-repayment advance', 'salary_advance structure string');

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
  ok(recs.r1.token.conditions.includes('Key Facts Statement acknowledged (AR + EN)') &&
     recs.r1.token.conditions.includes('Salary transfer assignment or direct debit mandate') &&
     recs.r1.token.conditions.includes('Credit life & job-loss cover offered (optional)'),
     'r1 token carries the conventional personal-loan conditions');
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
     recs.c1.token.conditions.includes('Key Facts Statement acknowledged (AR + EN)') &&
     recs.c1.token.conditions.includes('Direct debit mandate on connected account'), 'c1 token carries the split conditions');
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
  ok(od.token && od.token.conditions.includes('Direct debit mandate on connected account') &&
     od.token.conditions.some(c => /override/i.test(c)), 'override token carries split conditions + override note');
  const od2 = E.override(recs.r2.id, { outcome: 'DECLINE', reasonCode: 'RC_THIN_FILE', analyst: 'x.one', approver: 'y.two' });
  eq(od2.limit.approved, 0, 'declining override zeroes the limit');
  throwsWith(() => E.override(recs.r1.id, { outcome: 'DECLINE', reasonCode: 'RC_MANUAL_REVIEW', analyst: 'x', approver: 'y' }),
             'REFER', 'override on a non-REFER decision throws');
});

// ---------------------------------------------------------------------------
group('5. Conventional execution sequencing (an approval is not a loan)', () => {
  const ev = E.EXEC_EVENTS;
  eq(ev.join(','), 'OFFER_ACCEPTED,KFS_ACKNOWLEDGED,AGREEMENT_SIGNED,COOLING_OFF_CLEARED,DISBURSED', 'EXEC_EVENTS order');
  const steps = E.execSteps('split');
  ok(steps.length === 5 && steps.every(s => s.type && s.label && s.description), 'execSteps returns 5 labelled steps');
  ok(/goal/.test(steps[4].description), 'split DISBURSED description routes freed cash to the goal');
  ok(/customer's account/.test(E.execSteps('personal_loan')[4].description), 'personal loan DISBURSED description');

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
    eq(done.events.length, 5, recId + ' five execution events recorded');
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

  // No legacy vocabulary anywhere in the engine or data source.
  const banned = /shari|murabaha|tawarruq|qard|aaoifi|issc|wakala|commodity|profit rate|\bmal\b/i;
  for (const f of ['data.js', 'engine.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const lines = src.split('\n');
    const hits = [];
    lines.forEach((line, i) => { const m = line.match(banned); if (m) hits.push((i + 1) + ':"' + m[0] + '"'); });
    ok(hits.length === 0, f + ' contains no banned legacy terms (hits: ' + hits.slice(0, 5).join(', ') + ')');
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
console.log('\n' + '─'.repeat(60));
if (failures > 0) {
  console.error('SELFTEST FAILED: ' + failures + ' of ' + checks + ' checks failed.');
  process.exit(1);
} else {
  console.log('SELFTEST PASSED: all ' + checks + ' checks green.');
  process.exit(0);
}

/*
 * Mizan prototype — engine self-test (CONTRACT §2.4)
 * Plain Node script: loads data.js + engine.js, asserts the 9 acceptance groups,
 * exits non-zero on any failure with clear messages. Fully deterministic.
 *
 *   node mal-bank/prototype/src/engine.selftest.js
 */
'use strict';

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
function throwsWith(fn, needle, msg) {
  checks++;
  try { fn(); failures++; console.error('  FAIL: ' + msg + ' — expected a throw, none thrown'); }
  catch (e) {
    if (needle && !String(e.message).toLowerCase().includes(needle.toLowerCase())) {
      failures++; console.error('  FAIL: ' + msg + ' — thrown message "' + e.message + '" does not mention "' + needle + '"');
    }
  }
}
function group(name, fn) {
  console.log('\n[' + name + ']');
  try { fn(); } catch (e) { failures++; console.error('  FAIL (unexpected throw): ' + (e && e.stack || e)); }
}
function collect(codes) { for (const c of codes || []) emittedCodes.add(c); }
function decidePersona(productId, persona, overrides) {
  const rec = E.decide(Object.assign({
    productId, applicant: persona,
    amount: persona.defaultRequest.amount, tenorMonths: persona.defaultRequest.tenorMonths,
    consents: { aecb: true, openFinance: true }
  }, overrides || {}));
  collect(rec.reasonCodes);
  return rec;
}
const clone = (x) => JSON.parse(JSON.stringify(x));

E.init(D);
const personas = {};
for (const p of D.personasRetail) personas[p.id] = p;
for (const p of D.personasSme) personas[p.id] = p;
const recs = {};

// ---------------------------------------------------------------------------
group('1. Persona intended outcomes at default policy', () => {
  recs.r1 = decidePersona('retail_pf', personas.r1);
  eq(recs.r1.outcome, 'APPROVE', 'r1 outcome');
  eq(recs.r1.score.grade, 'A', 'r1 grade');
  eq(recs.r1.limit.bindingConstraint, 'REQUESTED', 'r1 binding constraint');
  eq(recs.r1.limit.approved, personas.r1.defaultRequest.amount, 'r1 approved = requested');
  ok(recs.r1.token && recs.r1.token.expiresAt, 'r1 approval token issued with expiry');

  recs.r2 = decidePersona('retail_pf', personas.r2);
  eq(recs.r2.outcome, 'REFER', 'r2 outcome (thin file)');
  ok(recs.r2.reasonCodes.includes('RC_THIN_FILE'), 'r2 reasons include RC_THIN_FILE');

  recs.r3 = decidePersona('retail_pf', personas.r3);
  eq(recs.r3.outcome, 'APPROVE', 'r3 outcome');
  eq(recs.r3.limit.bindingConstraint, 'DBR_HEADROOM', 'r3 binding constraint');
  ok(recs.r3.limit.approved < personas.r3.defaultRequest.amount / 2,
     'r3 limit sharply reduced (' + recs.r3.limit.approved + ' vs requested ' + personas.r3.defaultRequest.amount + ')');
  ok(recs.r3.reasonCodes.includes('RC_LIMIT_REDUCED'), 'r3 reasons include RC_LIMIT_REDUCED');

  recs.r4 = decidePersona('retail_pf', personas.r4);
  eq(recs.r4.outcome, 'DECLINE', 'r4 outcome');
  ok(recs.r4.reasonCodes.includes('RC_SCORE_LOW'), 'r4 reasons include RC_SCORE_LOW');
  ok(recs.r4.reasonCodes.includes('RC_DELINQUENCY'), 'r4 reasons include RC_DELINQUENCY');
  eq(recs.r4.limit.approved, 0, 'r4 approved amount 0');

  recs.r5 = decidePersona('retail_pf', personas.r5);
  eq(recs.r5.outcome, 'APPROVE', 'r5 outcome');
  eq(recs.r5.limit.bindingConstraint, 'RETIREE_CAP', 'r5 binding constraint (30% retiree DBR cap)');
  ok(recs.r5.reasonCodes.includes('RC_RETIREE_CAP'), 'r5 reasons include RC_RETIREE_CAP');
  ok(recs.r5.limit.approved < personas.r5.defaultRequest.amount, 'r5 limit below requested');

  recs.s1 = decidePersona('sme_wc', personas.s1);
  eq(recs.s1.outcome, 'APPROVE', 's1 outcome');
  ok(recs.s1.token, 's1 approval token issued');

  recs.s2 = decidePersona('sme_wc', personas.s2);
  eq(recs.s2.outcome, 'REFER', 's2 outcome (volatility)');
  ok(recs.s2.reasonCodes.includes('RC_VOLATILITY'), 's2 reasons include RC_VOLATILITY');

  recs.s3 = decidePersona('sme_wc', personas.s3);
  eq(recs.s3.outcome, 'REFER', 's3 outcome (license age / thin file)');
  ok(recs.s3.reasonCodes.includes('RC_LICENSE_AGE'), 's3 reasons include RC_LICENSE_AGE');

  recs.s4 = decidePersona('sme_wc', personas.s4);
  eq(recs.s4.outcome, 'DECLINE', 's4 outcome (sector screen)');
  ok(recs.s4.reasonCodes.includes('RC_SECTOR_EXCLUDED'), 's4 reasons include RC_SECTOR_EXCLUDED');

  recs.s5 = decidePersona('sme_wc', personas.s5);
  eq(recs.s5.outcome, 'DECLINE', 's5 outcome (owner blend)');
  ok(recs.s5.reasonCodes.includes('RC_OWNER_SCORE'), 's5 reasons include RC_OWNER_SCORE');
});

// ---------------------------------------------------------------------------
group('2. Regulatory enforcement: DBR cap and tenor cap', () => {
  // Huge obligations: existing DBR already above 50% — engine must never approve.
  const heavy = clone(personas.r1);
  heavy.aecb.obligationsMonthly = 20000; // 71% of 28k salary before any new installment
  const rHeavy = decidePersona('retail_pf', heavy);
  eq(rHeavy.outcome, 'DECLINE', 'r1-with-huge-obligations declines');
  ok(rHeavy.reasonCodes.includes('RC_DBR_EXCEEDED'), 'heavy-obligation decline carries RC_DBR_EXCEEDED');
  eq(rHeavy.limit.approved, 0, 'no approved amount above the DBR cap');

  // Moderate obligations: approval sized so that final DBR stays ≤ 50%.
  const mid = clone(personas.r1);
  mid.aecb.obligationsMonthly = 13000; // headroom AED 1,000/month
  const rMid = decidePersona('retail_pf', mid);
  eq(rMid.outcome, 'APPROVE', 'moderate-obligation case approves at a reduced limit');
  ok(rMid.features.dbrPct <= 50, 'computed DBR ' + rMid.features.dbrPct + '% never exceeds 50% on approval');
  eq(rMid.limit.bindingConstraint, 'DBR_HEADROOM', 'moderate case binds on DBR headroom');

  // Tenor 60 → clamped to the regulatory 48-month cap with RC_TENOR_CAP.
  const rTenor = decidePersona('retail_pf', personas.r1, { tenorMonths: 60 });
  ok(rTenor.reasonCodes.includes('RC_TENOR_CAP'), 'tenor 60 carries RC_TENOR_CAP');
  eq(rTenor.features.effectiveTenor, 48, 'tenor clamped to 48 months (Reg 29/2011)');
  ok(rTenor.outcome !== 'DECLINE' ? rTenor.features.dbrPct <= 50 : true, 'clamped-tenor approval respects DBR');
});

// ---------------------------------------------------------------------------
group('3. Consent gate', () => {
  throwsWith(() => E.decide({ productId: 'retail_pf', applicant: personas.r1,
                              amount: 100000, tenorMonths: 24, consents: { openFinance: true } }),
             'consent', 'decide() without AECB consent throws');
  throwsWith(() => E.decide({ productId: 'retail_pf', applicant: personas.r1,
                              amount: 100000, tenorMonths: 24 }),
             'consent', 'decide() without consents object throws');
});

// ---------------------------------------------------------------------------
group('4. 4-eyes enforcement', () => {
  throwsWith(() => E.publishPolicy('retail_pf', { scoreDecline: 640 }, { author: 'a.hassan', approver: 'a.hassan' }),
             '4-eyes', 'publishPolicy with author===approver throws');
  throwsWith(() => E.publishPolicy('retail_pf', { dbrCapPct: 60 }, { author: 'a.hassan', approver: 'm.rashid' }),
             'regulatory', 'publishPolicy rejects edits to locked regulatory primitives');
  const v = E.publishPolicy('retail_pf', { maxEsrPct: 60 }, { author: 'a.hassan', approver: 'm.rashid' });
  eq(v.version, 2, 'valid publish bumps version to 2');
  const hist = E.policyHistory('retail_pf');
  eq(hist.length, 2, 'policy history has 2 versions');
  eq(hist[1].approvedBy, 'm.rashid', 'history records the approver');

  throwsWith(() => E.override(recs.r2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW',
                                            analyst: 'a.hassan', approver: 'a.hassan' }),
             '4-eyes', 'override with analyst===approver throws');
  const od = E.override(recs.r2.id, { outcome: 'APPROVE', reasonCode: 'RC_MANUAL_REVIEW',
                                      analyst: 'a.hassan', approver: 'm.rashid',
                                      note: 'Credit Passport verified; starter limit' });
  collect(od.reasonCodes);
  eq(od.status, 'OVERRIDDEN', 'valid 4-eyes override lands');
  eq(od.outcome, 'APPROVE', 'override outcome applied');
  throwsWith(() => E.override(recs.r1.id, { outcome: 'DECLINE', reasonCode: 'RC_MANUAL_REVIEW',
                                            analyst: 'x', approver: 'y' }),
             'REFER', 'override on a non-REFER decision throws');
});

// ---------------------------------------------------------------------------
group('5. Shari\'ah execution sequencing (AAOIFI SS 8/30)', () => {
  throwsWith(() => E.recordEvent(recs.r1.id, 'WAKALA_SIGNED'),
             'PROMISE_SIGNED', 'out-of-order event throws naming the expected next step');
  for (const evName of E.EXEC_EVENTS) E.recordEvent(recs.r1.id, evName);
  const done = E.getDecision(recs.r1.id);
  eq(done.status, 'EXECUTED', 'full ordered sequence ends EXECUTED');
  eq(done.events.length, 6, 'six execution events recorded');
  throwsWith(() => E.recordEvent(recs.r1.id, 'PROMISE_SIGNED'),
             'already', 're-executing a completed contract throws');
  throwsWith(() => E.recordEvent(recs.r4.id, 'PROMISE_SIGNED'),
             'approved', 'events on a declined decision throw');
});

// ---------------------------------------------------------------------------
group('6. Qard Hassan flat-fee mode (AAOIFI SS 19)', () => {
  const q1 = decidePersona('salary_advance', personas.r1, { amount: 20000, tenorMonths: 1 });
  eq(q1.outcome, 'APPROVE', 'r1 salary advance approves');
  eq(q1.limit.approved, 13500, 'limit = min(80% × 28,000 = 22,400; cap 13,500) = 13,500');
  eq(q1.limit.bindingConstraint, 'PRODUCT_CAP', 'cap amount binds');
  eq(q1.pricing.mode, 'FLAT_FEE', 'pricing mode FLAT_FEE');
  eq(q1.pricing.fee, 150, 'flat fee 150');
  const q2 = decidePersona('salary_advance', personas.r1, { amount: 6000, tenorMonths: 3 });
  eq(q2.pricing.fee, 150, 'fee unchanged for different amount/tenor (no scaling — SS 19)');
  eq(q2.limit.approved, 6000, 'smaller request approved as requested');
  eq(q2.features.effectiveTenor, 1, 'tenor clamped to next-payday cycle');
});

// ---------------------------------------------------------------------------
group('7. Drawdown checks on s1\'s approved facility', () => {
  const fac = recs.s1;
  eq(fac.limit.approved, 500000, 's1 facility is AED 500,000');
  const d1 = E.drawdownCheck(fac.id, 200000, {});
  collect(d1.reasonCodes);
  eq(d1.allowed, true, 'drawdown within limit allowed');
  eq(d1.remainingAfter, 300000, 'remaining after first drawdown');
  const d2 = E.drawdownCheck(fac.id, 100000, { arrears: true });
  collect(d2.reasonCodes);
  eq(d2.allowed, false, 'arrears flag blocks drawdown');
  ok(d2.reasonCodes.includes('RC_DRAWDOWN_ARREARS'), 'blocked with RC_DRAWDOWN_ARREARS');
  eq(d2.remainingAfter, 300000, 'blocked drawdown does not consume limit');
  const d3 = E.drawdownCheck(fac.id, 400000, {});
  collect(d3.reasonCodes);
  eq(d3.allowed, false, 'beyond-remaining drawdown blocked');
  ok(d3.reasonCodes.includes('RC_DRAWDOWN_LIMIT'), 'blocked with RC_DRAWDOWN_LIMIT');
});

// ---------------------------------------------------------------------------
group('8. simulateBook + reason-code completeness', () => {
  const sim = E.simulateBook('retail_pf', { scoreDecline: 660 });
  eq(sim.size, 140, 'retail sample book has 140 rows');
  ok(sim.after.APPROVE < sim.before.APPROVE,
     'raising scoreDecline 620→660 strictly decreases approvals (' + sim.before.APPROVE + ' → ' + sim.after.APPROVE + ')');
  ok(sim.flips.length > 0, 'flips list is non-empty (' + sim.flips.length + ' shown)');
  for (const f of sim.flips) emittedCodes.add(f.why);
  ok(typeof sim.summary === 'string' && sim.summary.length > 0, 'summary string present');

  // decideRaw across both books — collect every emitted code.
  for (const row of D.sampleBook.retail) collect(E.decideRaw('retail_pf', row).reasonCodes);
  for (const row of D.sampleBook.sme) collect(E.decideRaw('sme_wc', row).reasonCodes);
  for (const rec of E.listDecisions()) collect(rec.reasonCodes);
  const missing = [...emittedCodes].filter(c => !D.reasonCodes[c]);
  ok(missing.length === 0, 'every emitted reason code exists in MizanData.reasonCodes (missing: ' + missing.join(', ') + ')');
  ok([...emittedCodes].length >= 10, 'a meaningful spread of reason codes was exercised (' + [...emittedCodes].length + ')');
});

// ---------------------------------------------------------------------------
group('9. Determinism: fresh init() runs are identical', () => {
  E.init(D);
  const m1 = JSON.stringify(E.metrics().totals);
  const book1 = JSON.stringify(D.sampleBook.retail.map(r => E.decideRaw('retail_pf', r).outcome)
    .concat(D.sampleBook.sme.map(r => E.decideRaw('sme_wc', r).outcome)));
  E.init(D);
  const m2 = JSON.stringify(E.metrics().totals);
  const book2 = JSON.stringify(D.sampleBook.retail.map(r => E.decideRaw('retail_pf', r).outcome)
    .concat(D.sampleBook.sme.map(r => E.decideRaw('sme_wc', r).outcome)));
  eq(m1, m2, 'metrics().totals identical across two fresh inits');
  ok(book1 === book2, 'sampleBook outcomes identical across two fresh inits');
  const m = E.metrics();
  ok(m.totals.decisions > 2000, 'seeded history volume plausible (' + m.totals.decisions + ' decisions / 90d)');
  ok(m.daily.length === 90, 'daily series has 90 entries');
  ok(m.bySegment.RETAIL.stpPct > 70 && m.bySegment.RETAIL.stpPct < 85, 'retail STP ~78% (' + m.bySegment.RETAIL.stpPct + ')');
  ok(m.bySegment.SME.stpPct > 35 && m.bySegment.SME.stpPct < 50, 'SME STP ~42% (' + m.bySegment.SME.stpPct + ')');
  ok(m.vintages.length === 6 && m.vintages[5].retailFpdPct > m.vintages[0].retailFpdPct, 'vintages gently rising');
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

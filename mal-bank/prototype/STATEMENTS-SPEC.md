# Addendum v2.4 — Home-country bank statements (upload + parse + underwriter request) — binding spec

Customers can bring **6 months of bank statements from their home country** — **India, Pakistan or
Egypt** — which Mizan parses and uses for underwriting. It can come from two directions:
1. **Customer-initiated** — in a journey, as an optional data source ("add your home-country statements to
   unlock more").
2. **Underwriter-initiated** — on a referred case in the Workbench, the analyst **requests** the
   statements ("send us 6 months of your bank statements so we can approve more"). The analyst asks for
   evidence; **Mizan re-decides** on it. It is not a manual override: the outcome stays consistent,
   explainable and audit-linked to the original decision.

This SUPERSEDES the international-statements details in v2.1: the corridors are India / Pakistan /
Egypt, the window is the last 6 months, and u1 changes (below).

## What the parser reads (simulated parser, deterministic, over seeded statement data)

Input: country ∈ {IN, PK, EG}, bank label, file name, months covered. Checks and outputs:
- **Authenticity** (fraud): document integrity "no edits detected", **account-holder name matches the
  Emirates ID name**, statement period continuous, months present (must be 6 of the last 6 → else
  `RC_STATEMENTS_INCOMPLETE`, ask again).
- **Conduct**: returned/bounced items, overdraft days, account open since (tenure).
- **Home-country obligations**: recurring EMIs/loan debits (converted to AED) → counted in DBR and free
  cash flow (responsible lending: obligations in both countries).
- **Buffer**: average balance (AED-equivalent).
- **Income corroboration**: inbound remittances from the UAE that line up with the UAE salary credits
  seen via Open Finance (amount/date consistency score), and any home-country income (rent, pension).
- Currency conversion at a fixed demo rate table (INR, PKR, EGP → AED), shown in the UI.
Output: `parsed = { country, bank, file, monthsPresent, period, integrity:'PASS'|'FAIL',
nameMatch:bool, accountOpenSince, returnedItems, overdraftDays, obligationsMonthlyAed, avgBalanceAed,
remittanceConsistencyPct, otherIncomeMonthlyAed, findings:[{label, value, effect}] }`.
Statements are used as **evidence that strengthens a thin file**: tenure + clean conduct + buffer +
corroborated income → better grade/limit/price; discovered home obligations reduce affordability
(honest both ways). Integrity FAIL or name mismatch → REFER to fraud review (RC_STATEMENTS_INTEGRITY),
never auto-decline.

## Engine API (additive)

- `parseStatements({country, bank, file, applicantId})` → `parsed` (pure; uses the persona's seeded
  `homeStatements` sample; unknown file → integrity FAIL path for testing).
- `requestDocuments(decisionId, {type:'HOME_STATEMENTS', months:6, analyst, note})` — only on REFER (or
  APPROVE below the requested amount); sets `status:'AWAITING_DOCUMENTS'`, pauses the refer SLA,
  audit-logged; reason/customer message RC_STATEMENTS_REQUESTED ("Send us 6 months of your
  home-country bank statements so we can review a higher amount").
- `submitStatements(decisionId, {country, bank, file})` → parses, attaches `parsed` to the record,
  status 'DOCUMENTS_RECEIVED'.
- `redecide(decisionId)` → creates a **new DecisionRecord** with `supersedes: <original id>` (original
  gets `supersededBy`), same application + the parsed statements as a data pull
  `HOME_STATEMENTS`; returns it. Workbench queue drops the original.
- In journeys: `decide()` accepts `statements: parsed` (customer-initiated) — used by the upgrade.
- Supported corridors constant `STATEMENT_CORRIDORS = ['IN','PK','EG']`; others → throw "statements
  from <country> are not supported yet".

## Personas / cases

- **r2 Priya Nair** (personal loan, India) gets `homeStatements`: HDFC Bank, 6 months, account open since
  2016, 0 returned items, education-loan EMI ≈ AED 450/mo, avg balance ≈ AED 9,800, remittances 6/6
  consistent with her UAE salary (≈ 92%). Workbench flow: r2 REFER (thin file) → analyst "Request bank
  statements" → upload "HDFC_Statement_Jan–Jun_2026.pdf" → parsed → `redecide` → **APPROVE** with a
  limit **higher than the Credit Passport path** (target ≈ AED 45,000, grade B; the statements replace
  the 50% cross-border haircut with a smaller one because conduct + buffer + corroboration are proven;
  the EMI is counted in DBR). Show the comparison: no data → REFER · Credit Passport → AED 30,000 ·
  Statements → ≈ AED 45,000.
- **u1 becomes Anita Thomas** (replaces Ana Reyes; keep id u1): nurse from Kerala, 5 months in UAE,
  income 9,500, spend 5,600; starter loan AED 1,000 · 1 month · 50% APR repaid on time; `homeStatements`:
  State Bank of India, 6 months, account since 2014, 0 returned items, home-loan EMI ≈ AED 350/mo, avg
  balance ≈ AED 4,200, remittance consistency ≈ 95%. Upgrade: without statements → BASE (1,500 / 3 /
  42%) with an in-flow CTA "Upload 6 months of your Indian bank statements to unlock up to AED 3,000 at
  35%" → upload → re-decide → ENHANCED (3,000 / 6 / 35%). Keep every v2.1 number (FCF 3,550 etc.).
  Arabic name: أنيتا توماس.
- **u2 Bilal Ahmed** keeps HBL Pakistan, 6 months — still no upgrade (starter repaid late): statements
  don't override a repayment breach.
- Seed one extra Workbench REFER for variety: **Youssef Hassan** (Egypt, CIB statements requested,
  status AWAITING_DOCUMENTS) so the queue shows the new state.

## UI

- **Workbench case view**: an action "Request bank statements (6 months, home country)" with country
  select (India / Pakistan / Egypt), note field, analyst name — enabled on thin-file / income-unverified
  refers; queue shows the status chip "Awaiting documents" and SLA "paused". A "Customer uploads" step
  (simulated: pick the sample file) → **parse panel** (animated checklist: integrity, name match, 6/6
  months, returned items, EMIs found, buffer, remittance consistency, each with its effect on the
  decision) → "Re-decide with statements" → shows the new decision side by side with the original and
  the "approve more" comparison strip (no data / Credit Passport / Statements for r2).
- **Credit upgrade screen**: the international-statements consent becomes an **upload** step ("Upload 6
  months of bank statements — India · Pakistan · Egypt"), with the same parse panel; BASE offer shows the
  unlock CTA; ENHANCED after re-decide. Copy uses Anita.
- **Decision log**: re-decisions show "supersedes MZN-…" and the parsed-statement findings in the replay.
- Overview: demo-strip step "Underwriter asks for statements — Priya (r2): refer → request 6 months of
  Indian statements → parsed → approved for more"; topic-map row.
- Acceptance additions: r2 workbench request → status chip → upload → parse panel shows 6/6 + name match
  + EMI → re-decide APPROVE with amount > 30,000 and a supersedes link; statements for an unsupported
  country throw inline; tampered/unknown file → integrity FAIL → REFER (fraud review), not decline;
  upgrade: BASE then upload → ENHANCED; Anita everywhere (no "Ana Reyes" left).

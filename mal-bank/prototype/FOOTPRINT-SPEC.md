# Addendum v2.2 — Digital footprint data source (RiskSeal-style) — binding spec

Read NOOR-PIVOT.md (incl. "Engine API after Noor pivot (v2.0)" and the v2.1 upgrade addendum + its
"as built" note) first. This file adds one data source and one screen. Engine codename stays **Mizan**.

## Why (the product stance — put this voice into the UI copy)

Noor's customers are often thin-file expats. A digital-footprint check (email + phone → account age,
name matches, which services the email/phone are registered on, a vendor score, data breaches) is the
cheapest signal available **before** there is any bureau history — it is what makes a starter loan
possible. But it is also the easiest data to misuse. Mizan's position:

1. **Identity & fraud — live from day one.** Long-lived email (10+ yrs), name matched across sources,
   phone active on a messenger, not seen in a burst of applications → identity confidence. Effect:
   remove friction (skip the manual document check on the starter loan), flag synthetic identities.
2. **Account security, never credit.** Data breaches (incl. credential-stuffing compilations) raise
   **account-takeover** risk → require step-up authentication (UAE PASS) before disbursement. Being
   breached is not the customer's fault: it never touches price or limit.
3. **Thin-file credit overlay — bounded, positive-only, shadow first.** The vendor score may lift a
   thin file (no-hit / thin AECB) by a capped overlay; it can never lower a score, and having no
   footprint is neutral. It runs in **SHADOW** (computed and logged, not applied) until back-tested on
   Noor's own starter-loan outcomes and bias-tested; credit risk switches it **LIVE** in the policy
   console with 4-eyes. (CBUAE Model Management Standards; CBUAE AI/ML guidance note 11 Feb 2026:
   fairness, explainability, bias testing, LFI accountable for vendor models.)
4. **Never used — dropped at ingestion.** Gender; vendor lifestyle traits (social media, travel, "old
   school", tech-savvy, solvency, gambler) — opaque proxies; individual service names (they can reveal
   nationality, religion, family status, health); photos; map-review content and locations; raw
   contact details. (PDPL Federal Decree-Law 45/2021 purpose limitation and minimisation.) Explain the
   reason per excluded item in the UI.
Consent: a separate, explicit "Digital footprint check" consent (email + phone, purpose-limited to
identity, security and — when live — thin-file scoring); declining it is never a decline reason.
Vendor note for the UI: processing location must meet the CBUAE Outsourcing Regulation (customer data
in-UAE unless CBUAE + customer consent) — vendor due diligence item.

## Data

- `MizanData.footprintReference` = the JSON in
  /tmp/claude-0/-home-user-evgeny-referral-hub/321fab62-bed0-58c0-a932-66adea5bb957/scratchpad/footprint-reference.json
  (a REAL report, already minimised — use the values exactly; never re-add raw contact details, service
  names, breach source names, gender or photos; subject shown as "Evgeny M.").
- Synthetic footprints (same shape, minimised) on personas, used by decisions:
  - c4 Arjun Mehta: vendorScore 742, emailAgeYearsMin 6, nameMatchSources 2, phoneOnMessenger true,
    velocity emailSeenByLenders 1, breaches {count 1, includesCredentialStuffingCompilation false}.
  - u1 Ana Reyes: vendorScore 768, emailAgeYearsMin 8, nameMatchSources 3, phoneOnMessenger true,
    velocity 1, breaches {count 2, includesCredentialStuffingCompilation true} (this is what made her
    original starter loan possible — show that on her prior-loan card: "Approved on connected accounts +
    digital footprint, no AECB file").

## Engine (additive; existing outcomes must not change while the overlay mode is SHADOW)

- `assessFootprint(fp)` → `{ identity:{ confidence:'HIGH'|'MEDIUM'|'LOW', signals:[{name, value, pass}] },
  security:{ atoRisk:'ELEVATED'|'NORMAL', action, signals }, creditOverlay:{ eligibleWhen:'thin or no-hit
  AECB file', points, cap, mode, basis }, excluded:[{ item, reason }] , reasonCodes }`.
  Identity HIGH when emailAgeYearsMin ≥ 5 AND nameMatchSources ≥ 2 AND phoneOnMessenger AND velocity
  emailSeenByLenders ≤ 2; MEDIUM if 2 of the 4; else LOW. atoRisk ELEVATED when breaches.count ≥ 3 OR
  includesCredentialStuffingCompilation. Overlay points by vendor score: ≥ 800 → +20, 700–799 → +10,
  < 700 → 0 (positive-only), capped by policy `footprintOverlayCap` (default 20).
  For footprintReference: identity HIGH, atoRisk ELEVATED, overlay +20.
- Policy params on `split` and `starter_loan`: `footprintOverlayMode: 'SHADOW'|'LIVE'` (default
  SHADOW), `footprintOverlayCap` (0–30, default 20). Mode change publishes with 4-eyes like any param.
- In decisions where `consents.digitalFootprint === true` and the applicant has a `footprint`: add data
  pull `DIGITAL_FOOTPRINT`; record `features.footprintIdentity`, `features.footprintAtoRisk`,
  `features.footprintVendorScore`; rule `POL_IDENTITY_FOOTPRINT` (PASS when HIGH); when the AECB file is
  thin/no-hit, add a score overlay `{name:'Digital footprint (vendor score N)', delta, applied}` —
  `applied:true` only in LIVE mode (SHADOW → delta recorded, applied:false, not added to points); when
  atoRisk ELEVATED add token condition "Step-up sign-in (UAE PASS) before disbursement" and reason
  RC_STEP_UP_AUTH (informational — never changes the outcome or price).
- `footprintImpact(application)` → pure what-if, no records: `{ shadow:{outcome, grade, points,
  capacity|approved, monthlyFeeRate|apr}, live:{...} }` for the same application in both modes.
  For c4 (split, AECB no-hit, consents incl. digitalFootprint): shadow = today's outcome (grade C);
  live = +10 → grade B → higher split capacity and lower monthly fee rate.
- New reason codes (EN + MSA Arabic): RC_FOOTPRINT_IDENTITY, RC_FOOTPRINT_OVERLAY, RC_STEP_UP_AUTH.
- Selftest: footprintReference assessment (HIGH / ELEVATED / +20, all excluded items present, gender
  never appears in any decision record); c4 SHADOW unchanged vs no-consent outcome; c4 LIVE grade B and
  capacity strictly higher; overlay never negative (vendorScore 300 → 0); no footprint consent →
  no DIGITAL_FOOTPRINT pull; ATO ELEVATED adds the step-up condition without changing outcome/price;
  publish LIVE requires distinct approver; all existing checks still green; banned-term regex clean.

## UI — new screen `data-screen="footprint"` (9 screens; insert after `upgrade` in the nav)

Nav label **"Digital footprint"**, sub "Alternative data, used carefully". Eyebrow "Data source — digital
footprint (RiskSeal-style)". Title "What a digital footprint is good for — and what it isn't".
1. **Reference report** card (left): "Evgeny M. · RiskSeal report · 28 Aug 2026 · contact details
   masked" with the vendor score shown on the 0–999 band scale (816, Very low risk), identity facts
   (email 10+ yrs, deliverable, name matched in 3 sources, phone active on a messenger, maps local
   profile), footprint as **category counts** (32 of 90 services; Work tools 8, Digital services 6, …;
   Gambling 0), breaches (7 since 2015, most recent Nov 2025, incl. a credential-stuffing compilation),
   and a small "Dropped at ingestion" list. A toggle "As the vendor sends it / As Mizan keeps it" that
   greys out the dropped fields in the first view (fields named generically — never show raw values).
2. **How Mizan uses it** (right): four lanes as cards — Identity & fraud (LIVE), Account security (LIVE,
   never credit), Thin-file credit overlay (SHADOW until back-tested), Never used — each listing the
   signals it reads, the effect, and the governing rule (cite PDPL, CBUAE AI guidance 2026, MMS,
   Outsourcing Regulation). Show assessFootprint() outputs for the reference report as chips:
   Identity HIGH · ATO risk ELEVATED → step-up · Overlay +20 (shadow).
3. **See it in a decision**: run c4 Arjun (Split, no AECB file) through footprintImpact and show
   Shadow vs Live side by side (grade, points, split capacity, monthly fee rate), with the line "Live
   only after back-testing on Noor's starter-loan outcomes and a bias test — a credit-risk decision with
   4-eyes in the policy console." Link/button to the policy console param.
4. **Where it plugs in** small table: Starter loan entry (identity → no document check) · Split thin-file
   path (overlay) · Login & disbursement (step-up) · Upgrade (not needed — repayment record and
   statements outweigh it).
Also: add a "Digital footprint check" consent box (optional) to the Split screen and the Credit upgrade
screen; show the DIGITAL_FOOTPRINT pull in their orchestration timelines when consented; overview gets a
seventh demo step and a topic-map row; policy console shows footprintOverlayMode/cap for split and
starter_loan. Same rules as before: new CSS only at the end of the Noor additions block, tokens only;
expected engine errors inline; fatal banner never fires; Arabic in dir="rtl".
Privacy check in acceptance: read the forbidden strings (one per line) from
/tmp/claude-0/-home-user-evgeny-referral-hub/321fab62-bed0-58c0-a932-66adea5bb957/scratchpad/footprint-forbidden.txt
(kept OUT of the repo on purpose — it holds the raw identifiers) and assert that none appears,
case-insensitively, in the built index.html (data: URIs stripped) or in src/*.js; also assert the
gender VALUE is absent (regex /\bMale\b/, case-sensitive). The word "gender" itself is allowed —
the "Never used" lane must name it as an excluded field.

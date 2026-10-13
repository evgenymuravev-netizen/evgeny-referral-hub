# Addendum v2.8 — botim placement, A/B entry, contact consent, email + digital footprint, Noor-rendered insights — binding spec

Source: Noor board meeting, 2 Oct 2026 (owner's notes). Builds on JOURNEY-SPEC.md (v2.6) and the as-built
notes in NOOR-PIVOT.md. Customer persona is still **j1 Ravi Kumar**. Engine codename stays **Mizan**.

## 1. Noor renders, botim hosts

Board position: "use the Noor web-view (or PWA) inside botim — we leverage our licence, provide insights
without limitations, don't violate anything, give proper CTAs, and skip heavy marketing spend."

- **Every Noor surface inside botim is a Noor embed.** This means a view served from Noor's own origin
  (noor.finance) in a sandboxed web-view or iframe.
  - botim's native code never receives Open Finance or credit data.
  - botim receives **events only**: `impression`, `click`, `journey_started`, `accounts_connected`,
    `prequalified`, `applied`, `funded`. Every event carries `variant` (§3).
- **The surfaces:**
  - the main-page banner and the Noor icon (§2)
  - the Insights carousel cards (below)
  - the connected-account tiles after step 6. The existing build sends botim "display tiles"; that changes
    to a Noor embed showing the tiles, so botim gets `accounts_connected` as an event only.
  - the Credit-tab card
  - the variant-A tile on the Loans screen (§3)
- **Visual marker:** each embed in the mock carries a small corner label "by noor".
- **"Behind the scenes" copy** (label it "Noor's position — confirm with counsel and the Nebras design
  rules"). Showing the data is lawful when:
  1. the embed runs on Noor's own origin;
  2. no JavaScript bridge hands data to the host app;
  3. no host analytics SDK runs inside the embed;
  4. botim gets events only;
  5. the Al Tareq consent names where the data is shown: "in Noor — including Noor views inside botim".
  Under those conditions it is Noor showing its own customer their own data on a Noor-controlled surface,
  not onward sharing.
- **Update everywhere "What botim receives" appears** (all steps, the panel, the as-built notes): the
  display tiles are no longer received by botim.
- **Insights carousel (Noor-powered; the three insights from Wave 3 discovery).** They appear only after
  the accounts are connected. Before that, a single card reads "Connect your bank accounts — securely,
  through Noor".
  - **Card insight:** "Your credit cards are 62% used — AED 900 a month in repayments". CTA "See your
    options" → the pre-qualification (variant B) or the Loans tile (variant A).
    Add `j1.aecb.cardLimitTotal = 12000` and `cardBalanceTotal = 7440` to data.
  - **Budget insight:** "You spend about AED 7,400 a month — about AED 3,700 left after bills". CTA "See
    your budget" → the Noor budget view (step 7, sub 2).
  - **Credit state insight:** "1 credit card · no loans · NoorScore estimate Very good". CTA "How much
    could you borrow?" → the variant's credit entry.
  - Every figure comes from data or engine calls (the NoorScore estimate from `prequalify()`), never
    hard-coded.

## 2. Main-page placement (Max's request)

- **Banner** on the botim home main page (the Pay tab), above "Connected accounts". It is a Noor embed in
  Noor brand style. Copy: "How much could you borrow? Check in 2 minutes — no impact on your credit score".
  Tap → the active variant's credit entry.
- **Icon:** a fifth round action button labelled **"Noor"** using the existing Noor icon mask. Tap → the
  same entry. The row must fit at 390px.

## 3. A/B test of the credit entry

- **Toggle:** a variant switch in the journey's right column ("Experiment"): **A · From the Loans screen**
  / **B · See what you can get**. The default is B, which is today's flow. Switching restarts the journey.
- **Variant A, from botim's existing loans area.** Inside the Credit tab the host shows a generic
  "Loans" list. Do not reproduce any real botim product UI or name.
  - The list holds a neutral row "Cash loan · current partner" and a Noor tile: "Personal loan · noor
    finance · AED 1,000–50,000 · Apply in minutes".
  - Tap → the Noor web-view **"How much do you need?"**: amount slider 1,000–50,000, terms 6/12/24, no
    pre-qualification yet.
  - If no Noor account yet: steps 1–3 plus the new 3/x sub-steps (§5, §6).
  - Then connect the bank (steps 4–5) and come back (step 6).
  - Then an **affordability check** sub-step uses the real `prequalify()` caps for the chosen term:
    - if the request fits: "Good news — AED 15,000 over 12 months fits your budget" → final checks (step 9);
    - if it doesn't: "Based on your accounts, over 12 months you can borrow up to AED 21,000", with two
      choices, "Borrow AED 21,000 instead" and "Change the term".
  - Then steps 9–16 as today.
  - The step list renders the variant's own path (entry and order differ). Keep top-level step numbers
    0–16 for the shared steps and use sub-steps for the variant-A additions.
- **Variant B:** today's flow. Credit tab, banner or icon → "How much can you borrow?" →
  pre-qualification → choose the loan, and so on.
- **The Experiment panel shows:**
  - **Hypothesis:** "Showing the approvable amount first (B) turns more botim users into funded loans and
    cuts reduced offers, compared with applying from the Loans screen (A)."
  - **Randomisation:** 50/50 on a hashed botim user id, sticky per user. Noor assigns the variant;
    botim's events carry it.
  - **Primary metric:** funded loans per 1,000 entry impressions.
  - **Secondary metrics:** start → apply, apply → funded, the reduced-offer rate, time to fund.
  - **Guardrails:** decline rate, 30+ DPD at month 3, complaints.
  - **Sample size:** about 13,800 entry users per arm to detect 2.0% → 2.5% funded at 80% power with a
    two-sided α of 0.05. Compute it in code with the standard two-proportion formula and show the result.
  - This session's variant counters: starts, connects, applications and fundings per variant, from the
    event log.

## 4. Personal loan: free-cash-flow rule in decide() (closes open question 7)

- **Rule:** `evaluateLoan` gains `POL_INSTALMENT_TO_FCF`. It applies only when spending is visible:
  - the applicant has `connected.avgMonthlySpend`, and
  - Open Finance is consented.
- **The cap** is also a limit candidate, key `FCF`: the PV of `instalmentToFcfMaxPct`% × free cash flow at
  the **mid**-band rate over the effective tenor, floored to 1,000.
  Free cash flow = income − spending − obligations.
- **New personal-loan param:** `instalmentToFcfMaxPct: 50`, bounds [10, 80], editable in the policy console.
- **Must not change:** r1–r5 have no spending data, so their outcomes are unchanged (assert every existing
  number).
- **Ravi (j1):**
  - 15,000 over 12 months: unchanged (APPROVE, 737, AED 1,311.70).
  - The FCF caps at mid-rate 8.99% are 10,000 over 6 months, 21,000 over 12 and 40,000 over 24. They
    equal the `prequalify()` caps.
  - The unaffordable case 110,000 over 6 months is now reduced to **AED 10,000**, with FCF binding.
- **Selftest:** pre-qualification never promises more than decide() allows, for every term.
- **Copy:** `features.freeCashFlowMonthly` stops being "informational" for the personal loan; update the
  code comment and the as-built note.

## 5. Email step and digital-footprint check (RiskSeal-style) — sub-step 3/1

- **Step 1 consent sheet:** "Botim will share your name, mobile number and email with Noor to get you
  started".
- **New sub-step "Your email"**, after the OTP:
  - prefilled and masked "r•••••@•••.com · shared by botim", with "Use a different email";
  - verify with a 6-digit code (auto-fill in the demo).
- **Then an optional, separate consent box** "Digital footprint check":
  - "We check your email and phone with a digital-footprint provider to confirm it's you and protect
    your account. Declining never affects your application."
  - Purpose: identity, account security and, only when switched live, thin-file scoring.
- **Engine — implement `assessFootprint(fp)`** exactly as in FOOTPRINT-SPEC.md §Engine, first bullet.
  Identity confidence, ATO risk, the positive-only overlay with policy mode `SHADOW` by default, and the
  excluded list.
  - `decide()` handles `consents.digitalFootprint === true` when the applicant has a `footprint`:
    - a `DIGITAL_FOOTPRINT` data pull;
    - `features.footprintIdentity`, `footprintAtoRisk` and `footprintVendorScore`;
    - rule `POL_IDENTITY_FOOTPRINT` (PASS when HIGH);
    - when ATO is ELEVATED: the token condition "Step-up sign-in (UAE PASS) before disbursement" and
      RC_STEP_UP_AUTH, informational only;
    - the overlay only on a thin or no-hit AECB file, and applied only in LIVE mode.
  - Params `footprintOverlayMode` ('SHADOW'|'LIVE') and `footprintOverlayCap` (0–30, default 20) go on
    the split, starter_loan and personal_loan packs.
- **Synthetic `j1.footprint`:** vendorScore 731, emailAgeYearsMin 7, nameMatchSources 2,
  phoneOnMessenger true, velocity `{ emailSeenByLenders: 1 }`,
  breaches `{ count: 1, includesCredentialStuffingCompilation: false }`.
  → Identity HIGH, ATO NORMAL, overlay not eligible (Ravi has an AECB file).
  → **Ravi's decision is unchanged** (NoorScore 737, grade B).
- **Behind the scenes for this step:**
  - the assessFootprint chips;
  - "Never used for credit here: Ravi has an AECB file; on a thin file the overlay runs in shadow until
    back-tested";
  - "Never used at all: gender, lifestyle traits, service names, breach sources (PDPL minimisation)".
- **Credit memo:** the identity flag becomes "Verified (UAE PASS) · digital footprint: high confidence".
  The email and every vendor field stay withheld.
- **Out of scope:** the dedicated Digital-footprint screen and the real reference report stay out of
  this addendum. Do not touch `footprintReference`.

## 6. Contact consent — sub-step 3/2 "How should we contact you?"

- **"About your account and loan" (required: at least one channel).** Channels: Email, SMS, WhatsApp,
  Push.
  - Default on: Push and SMS, plus Email once it is verified.
  - Note: "Some messages are required by law — like your Key Facts and payment reminders. We send them on
    the channels you choose."
- **"Offers and news" (optional):** the same four channels, all off by default. Note: "Change this anytime
  in Settings. We never share your contact details with botim or the lender."
- **Validation:** with no service channel the CTA is disabled and an inline message shows.
- **Recording:** the choice is stored in the journey state and passed to `decide()` as
  `consents.communications = { service:[…], marketing:[…] }`.
  - The record stores it as a consent with a reference.
  - It is **not** in the credit memo (data minimisation): add it to the memo's withheld list as "Contact
    details and preferences".
- **Behind the scenes:** "CBUAE consumer-protection rules: marketing only with prior consent and an easy
  opt-out; WhatsApp needs explicit opt-in under the platform's policy; service messages follow the
  channels the customer picked."

## 7. PWA (step 16)

- **Card** after "Done": "Get Noor on your home screen — manage repayments without opening botim".
  Button "Open noor.finance in your browser" (simulated).
- **Behind the scenes:**
  - In-app web-views (iOS WKWebView, Android WebView) can't install a PWA: there is no install prompt.
    Installing needs the phone's browser.
  - The PWA is a second, Noor-owned servicing channel: repayments, statements, the Al Tareq consent
    dashboard link. It isn't tied to botim's release cycle.
  - iOS web push needs iOS 16.4+ and a Home Screen install.

## 8. Consent wording for monitoring (shared with v2.9)

- **Al Tareq consent summary "Why" line:** "To work out what you can afford — and, while you have a loan
  with Noor, to spot early if repayments might become hard for you." The step-5 bank-app copy stays as is.

## 9. Tests

**Selftest:**
- assessFootprint for j1 (HIGH / NORMAL / not eligible);
- the footprint pull is present only with consent;
- Ravi's record is unchanged with and without footprint consent (points, grade, amount, price);
- the personal-loan FCF rule:
  - r1–r5 unchanged;
  - Ravi's caps per term;
  - 110,000 / 6 → 10,000 with FCF binding;
  - prequalify ≤ decide for every term;
- `consents.communications` is recorded and absent from the memo and the SFTP row;
- all existing checks stay green;
- banned vocabulary stays clean.

**Browser acceptance:**
- the banner and the Noor icon are on the main page; tapping each opens the entry;
- insights:
  - the three cards appear after connecting;
  - their figures match the engine;
  - the CTAs route correctly;
  - before connecting, only the connect card;
- "What botim receives" never lists tiles or any amount; events carry the variant;
- every embed has its "by noor" marker;
- variant B: the full walk to DISBURSED works as today;
- variant A: Loans → Noor tile → "How much do you need?"
  - 30,000 over 12 months → after connecting, the affordability check offers 21,000 → accept → decide →
    APPROVE 21,000;
  - also walk a fitting request (15,000 / 12) straight to final checks;
- the Experiment panel shows the sample size (≈13,800 per arm) and per-variant counters that increment;
- email step: prefilled masked email, verify, the footprint consent is optional, declining still lets
  the user apply;
- contact consent: no service channel → blocked inline; the choices land in the record's consents and
  are absent from the memo;
- the PWA card and its explanation are present;
- the Al Tareq "why" copy is updated;
- works at 390px; zero page errors; light and dark themes.

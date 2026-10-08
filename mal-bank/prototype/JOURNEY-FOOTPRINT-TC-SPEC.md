# Addendum v2.14 — Digital-footprint check covered by the Terms, not a separate checkbox — binding spec

Source: Noor product request (8 Oct 2026), pointing at the "Your email" screen's "Digital footprint check ·
Optional" checkbox: "we do not ask so explicitly — we add it in the T&Cs".

This supersedes the explicit opt-in in BOTIM-V28-SPEC.md §5 and FOOTPRINT-SPEC.md ("a separate, explicit
consent"). Everything else in v2.8's footprint design stays:
- purpose limited to identity and account security;
- the thin-file overlay in SHADOW until switched LIVE;
- the excluded fields;
- never in the credit memo.

## 1. Journey

- **"Your email" (3·1).** Remove the "Digital footprint check · Optional" checkbox card. The email field, the
  "shared by botim" chip and the verification stay.
- **Add one small muted line** under the verified-email confirmation: "We verify your email and phone to
  protect your account — see our Privacy policy." It is a notice, not a question: no checkbox, no toggle.
- **"Create your account" (step 2).** The existing line "By continuing you agree to Privacy policy and Terms of
  Use" is where this is agreed.
  - Record the acceptance in the journey state as `terms = { version:'T&C v1.0 · Privacy policy v1.0', acceptedAt }`.
  - Make "Privacy policy" and "Terms of Use" look like links. Tapping one shows a small sheet with the
    relevant clause, written in plain words:
    - "Digital footprint check: to confirm it's you and protect your account, we check your email and mobile
      number with a fraud-prevention provider. We use it for identity and security — and, only if we switch
      it on after testing, to help when you have little credit history. We never use your gender, the apps
      or services you use, or where a data breach came from."
    - Plus one line on how to object or ask questions: "Contact us in the app to ask about or object to this
      check."
- **The footprint check runs for every journey applicant** who has accepted the terms, which is everyone who
  passes step 2. decide() receives:
  `consents.digitalFootprint = { basis:'TERMS', termsVersion:'T&C v1.0 · Privacy policy v1.0', acceptedAt }`.
- **Behind the scenes for 3·1:**
  - "No separate checkbox: the check is covered by the Terms of Use and Privacy policy accepted when the
    account was created (step 2).
  - Purpose stays limited to identity and account security; the thin-file overlay runs in shadow until
    switched live.
  - The Privacy policy says how to object.
  - Noor's position — confirm with counsel that a terms-based basis is enough under PDPL for a third-party
    provider, including where the provider processes data."
- **Flow-map phase 2** (v2.11): update its Customer / Mizan / Rule copy to say the check is covered by the
  terms accepted at sign-up.

## 2. Engine (additive)

- **`decide()` accepts `consents.digitalFootprint`** as `true` (v2.8 behaviour, kept for backward
  compatibility) or as an object `{ basis:'TERMS', termsVersion, acceptedAt }`. Either form runs the check
  when the applicant has a `footprint`.
- **The record's consent shows the basis:**
  `record.consents.digitalFootprint = { granted:true, basis:'TERMS'|'EXPLICIT', termsVersion|null, at, scope, used }`.
  - `basis:'EXPLICIT'` is the v2.8 boolean form.
  - The Decision log shows "Digital footprint — covered by the Terms (T&C v1.0 · Privacy policy v1.0)".
- **An object without `basis:'TERMS'`** or without a termsVersion → throw, with a clear message.
- **Nothing changes in the outcome,** score or price for Ravi.
- **The memo still carries only the identity flag;** the email, the vendor fields and the terms version are
  not in it.

## 3. Tests

**Selftest:**
- the object form runs the check and records `basis:'TERMS'` with the version;
- the boolean form still records `basis:'EXPLICIT'`;
- a bad object throws;
- Ravi's record is identical in outcome, score and price with either form;
- the memo has no terms version and no email;
- existing checks stay green.

**Browser acceptance:**
- the email step has no checkbox and shows the notice line;
- the step-2 links open the clause sheet;
- the journey decision has a DIGITAL_FOOTPRINT pull and `consents.digitalFootprint.basis === 'TERMS'`;
- the Decision log shows the terms line;
- update every existing v2.8 check that ticked or declined the footprint checkbox, keep their intent, and
  list them;
- 390px; zero page errors; light and dark themes.

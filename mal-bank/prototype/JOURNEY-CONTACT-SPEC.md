# Addendum v2.13 — Ask "How should we contact you?" after the loan is issued — binding spec

Source: Noor product request (8 Oct 2026), pointing at the contact-preferences screen (v2.8 sub-step 3·2):
"let's have it later in the journey (after we would issue the loan)".

**Why:** one screen fewer before the decision means less drop-off before the moment that matters.
Preferences only start to matter once there is a loan to remind people about.

## 1. Journey

- **Remove** sub-step 3·2 "How should we contact you?" from the onboarding path, in both variants.
  - The email step (3·1) stays where it is: the digital-footprint check needs it before the decision.
  - Remove the 3·2 entry from the step list.
- **Add** the same screen, with the same copy, toggles, defaults and validation, as a **new sub-step right
  after the loan is disbursed**: step 16, after the "on its way" / DISBURSED confirmation and before "Back
  to botim".
  - The screen's title stays "How should we contact you?".
  - Add one line under the title: "Your loan is on its way. Pick how we reach you about repayments and your
    account."
- **Defaults:**
  - "About your account and loan": Push and SMS on, plus Email when it was verified at 3·1.
  - "Offers and news": all off.
  - With no service channel, Continue stays disabled and an inline message shows (as today).
- **Continue** records the choice (§2) and moves on to the existing PWA card and "Back to botim", which work
  as today.
- **Before the customer chooses,** service messages already have a channel. The Key Facts, the e-signature
  and the confirmations happen inside the Noor web-view, and the verified mobile (the OTP number) gets SMS
  service messages. Say so in the behind-the-scenes text.
- **Behind the scenes for the new sub-step:**
  - "Asked once the loan is issued — one screen fewer before the decision.
  - Until now, service messages lived in the Noor web-view and went by SMS to the verified mobile; from
    here, repayment reminders and statements follow the channels chosen.
  - Offers and news stay opt-in, off by default (CBUAE consumer-protection rules: marketing only with prior
    consent and an easy opt-out; WhatsApp needs explicit opt-in under the platform's policy).
  - Recorded on the loan as a consent with its own reference — never in the credit memo, and botim gets
    none of it."
- **The decide() call in the journey** no longer passes `consents.communications`. Update the "Mizan calls"
  log line accordingly.
- **Flow map** (v2.11):
  - phase 2's detail becomes "Web-view · account · email";
  - phase 10 becomes "Funded · contact preferences · back in botim", covering the new sub-step;
  - update their Customer / Mizan / Rule copy to match.

## 2. Engine (additive)

- **New** `recordCommunications(decisionId, { service:[…], marketing:[…] })`.
  - It reuses the existing `normalizeCommunications` validation: at least one service channel, and the
    channels are Email, SMS, WhatsApp, Push.
  - It works only on an APPROVE record. It throws otherwise, with a clear message.
  - It sets `record.consents.communications = { granted:true, at, reference:'CNS-…-COMMS', service, marketing, basis }`,
    the same shape as v2.8.
  - It adds an audit entry `COMMUNICATIONS_RECORDED`.
  - It is idempotent: calling it again replaces the preferences and adds a second audit entry ("updated").
    The reference stays the same.
  - It does not change the outcome, the events, the token or the memo.
- **Keep** decide()'s v2.8 `consents.communications` support for backward compatibility; existing tests keep
  passing.
- **The credit memo stays unchanged:** "Contact details and preferences" remains on the withheld list, and
  the privacy scans stay.

## 3. Tests

**Selftest:**
- recordCommunications on an approved, disbursed record sets the consent; the outcome, events and memo
  are unchanged;
- no service channel → throws; a DECLINE or REFER record → throws; an unknown id → throws;
- a second call replaces the preferences and keeps the reference;
- the memo and the SFTP row still don't contain the channels;
- all existing checks stay green.

**Browser acceptance:**
- the onboarding goes 3·1 → step 4 with no contact screen, in both variants;
- the step list has no 3·2;
- after DISBURSED, the contact screen appears with the new line and the defaults;
- no service channel → blocked inline;
- Continue → the record shows the communications consent (the Decision log shows it), then the PWA card
  and "Back to botim" work;
- botim's events contain no channels;
- flow-map phases 2 and 10 show the new details;
- update every existing check that walked through 3·2 or asserted communications at decide time, keep
  their intent, and list them;
- 390px; zero page errors; light and dark themes.

# Addendum v2.20 — Rely on botim's phone and email verification; one-time codes only as a fallback — binding spec

Source: Noor product request (13 Oct 2026), pointing at "Create your account" ("We'll send a one-time code to
confirm it's you"): "do we need the OTP? we already know that the phone number is legit as it is passed from
Botim and they have done the OTP. Same for email."

## 1. Decision

**Skip both codes by default.** Noor relies on botim's verification when the hand-off carries a **signed botim
assertion**:
- the number is verified by botim and is a UAE number (+971);
- the email is verified by botim;
- the verification date;
- the device binding.

**A code is sent only as a fallback**, in these cases:

| Case | What happens |
|---|---|
| **Overseas number** (the botim account uses a home-country number) | "Add your UAE mobile number", then a code to that number. A UAE number is needed for assessment and collections (8 Oct meeting). This is v2.18 scenario (c). |
| **Stale or changed** | botim's last verification is older than 90 days, or botim signals a SIM change → a code to the number. |
| **Account-takeover risk** | the footprint shows ATO ELEVATED (v2.14) → a code (step-up). |
| **The customer changes the email** | "Use a different email" → a code to the new address. |
| **No assertion** | botim didn't share a verified email → the customer enters one, then a code. |

**Strong identity is unchanged.** UAE PASS at final checks (step 9) still confirms the customer before any
decision, and the Emirates ID scan (v2.16) still runs.

**Compliance.** Confirm with compliance that relying on botim's verification is acceptable. This is the open 8
Oct action "Verify CBUAE OTP rules for Botim-passed phone numbers". Say so in the behind-the-scenes text.

## 2. Journey

- **Default.** The default phone scenario becomes **"UAE number verified by botim — no code"**, today's
  scenario (b), renamed from "pending" to the default.
  - The scenario switch keeps three options: (a) "Code sent anyway (if compliance requires it)", (b) the
    default, (c) overseas.
- **Step 2, "Create your account".** Replace "We'll send a one-time code to confirm it's you" with a check line:
  "✓ Verified by botim — no code needed". Continue goes straight to the email (3·1). Step 3 (the OTP) shows as
  "Skipped — verified by botim" in the step list.
- **3·1, "Your email".**
  - The email shared by botim shows "✓ Verified by botim", with no code entry.
  - "Use a different email" opens the field plus the 6-digit code, as today, and the notice line stays.
  - Without a botim email, the customer types one and gets a code.
- **Behind the scenes for steps 2 and 3·1.** Explain the reliance:
  - the signed botim assertion;
  - the four fallback cases above;
  - "UAE PASS at step 9 remains the strong identity check before any decision";
  - "Noor's position — confirm with compliance (open action from 8 Oct)".
- **The event log and "Mizan calls".** Log `relyOnBotimVerification({phone, email})` →
  "phone ✓ (UAE, verified 14 days ago, device-bound) · email ✓ — no codes sent".
- **Data.** Ravi's hand-off carries `botimAssertion: { phone:{ uae:true, verifiedDaysAgo:14, deviceBound:true },
  email:{ verified:true, verifiedDaysAgo:14 } }`. Add a behind-the-scenes what-if button, "botim last verified
  this number 120 days ago", that shows the code fallback without changing the journey state.
- **Fraud & Integrity (Decision log, internal).** Add the factor "Mobile and email verified by botim (relied
  on)".

## 3. Tests

**Selftest** (if engine code changes; a pure helper `botimReliance(assertion, {ato})` is fine):
- the default → no codes;
- verifiedDaysAgo 91 → phone code;
- ATO ELEVATED → phone code;
- overseas → UAE number + code;
- a changed email → email code;
- no email → email code.

**Browser acceptance:**
- the default walk goes 2 → 3·1 with no OTP screen and no email code;
- step 3 shows "Skipped — verified by botim";
- scenario (a) still shows the OTP;
- scenario (c) the UAE number + code;
- "Use a different email" shows the code entry;
- the 120-days what-if shows the fallback;
- update every existing walk that clicked through the OTP or the email code, keep their intent, and list them;
- 390px; zero page errors; light and dark themes.

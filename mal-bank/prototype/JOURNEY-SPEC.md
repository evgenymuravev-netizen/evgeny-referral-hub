# Addendum v2.6 — Customer journey: a Botim user applies for a loan through Noor's web-view — binding spec

Source: Noor product direction + meeting notes (1 Oct 2026): Botim markets credit access ("do you want
credit? how much can you get?") to its users via NoorScore; a Tier-3 bank is the **lender of record**
(disbursement, collections, ops); Noor acquires, decides (Mizan) and sends the bank a credit memo.
This screen shows the customer's side, end to end, **driven by the real engine** — so the decision it
makes appears in the Decision log (internal) and its credit memo in the Lender view (v2.5).

## References (look at these before designing)
- Brand-book app screens (Noor's real UI patterns):
  /tmp/claude-0/-home-user-evgeny-referral-hub/321fab62-bed0-58c0-a932-66adea5bb957/scratchpad/noor-app-slide10.png
  (Budget home with electric-blue gradient header + insight card; Goal screen with outlined terracotta
  pill tags and a black pill CTA; Split screen with a huge Sora headline, Pay-in rows, selected row in
  terracotta, black pill "Split It") and noor-app-slide8.png (phone in hand, Budget). Patterns to reuse:
  very large Sora ExtraBold headlines; white cards radius 20 on a soft lavender-grey ground (#eef0f7
  light); **full-width black pill buttons**; outlined terracotta pill tags; selected rows use
  --brand-fill with white text; electric-blue gradient summary header; calm copy, no emoji.
- Noor registration flow (copy + type styles): /root/.claude/uploads/321fab62-bed0-58c0-a932-66adea5bb957/6a103ca9-noor-design-changes_3.html
  — Splash → "Create your account" ("By continuing you agree to Privacy policy and Terms of Use") →
  "Enter the code" (6-cell OTP, "Sent to number +971 …", resend timer) → Loader → "Connect your bank
  accounts" ("Connection is secure — we can't touch your money") → Main/Budget. Title/Header 1 = Sora
  SemiBold 32/40, Header 2 = Sora ExtraBold 24/32, Button = Sora Bold 18/22, Paragraph = Onest 18/24,
  Labels = Rubik 16/22, Numbers = Onest Bold tabular.
- The Figma file the team uses is not accessible from here; build from the above and keep screen
  components easy to restyle later.

## Placement
New console screen `data-screen="journey"`, nav label **"Customer journey"**, sub "Botim → Noor web-view",
placed **second** in the nav (right after Overview). Layout: left = a **phone frame** (≈390×844 CSS px,
scaled to fit; status bar 9:41; rounded device) rendering the current step; right = **"Behind the
scenes"** panel for that step + a vertical **step list** (click to jump back to any reached step) +
"Restart journey". ≤ 900px wide: phone full-width, panel stacks below. Transitions slide horizontally
(instant under prefers-reduced-motion).

## Host-app framing (important)
Botim is a real company. Do NOT reproduce Botim's logo, colours or UI. Draw a **neutral, generic host-app
frame** titled "Botim" in plain text with a small tag **"Illustrative host app"**, and a footnote in the
panel: "Host-app screens are illustrative, not Botim's actual interface." Inside it, Noor runs as a
**web-view**: show in-app-browser chrome (✕ close, title "noor finance", a lock + "noor.finance").
Bank names in pickers are text labels with neutral monograms — no real bank logos; the bank
authorisation screen is a **generic "Your bank's app (simulated)"**.

## The persona
Add to data.js `MizanData.personasJourney = [ j1 ]`: **Ravi Kumar** (رافي كومار), 31, 3 years in the
UAE, warehouse supervisor at a logistics company, salary AED 12,000 credited to his ENBD account (salary
verified via connected accounts), avg spend ≈ AED 7,400, AECB score 712, obligations AED 900/mo (credit
card), 0 cheque returns, worst delinquency NONE; 12 months connected (2 accounts: ENBD current, FAB
savings); Botim user; wants a personal loan of AED 15,000 over 12 months ("family wedding at home").
Shape = personal-loan persona so `decide({productId:'personal_loan', ...})` works unchanged. Default
request 15,000 / 12. At default policy it must APPROVE (grade B expected); confirm numbers in the report.

## Engine additions (additive only)
- `prequalify(applicant, {openFinance:true})` → pure, **no DecisionRecord, no AECB pull**: uses
  connected-account income and observed obligations only → `{ indicativeMin, indicativeMax,
  noorScoreEstimateBand, basis:['Income AED … verified from 12 months of connected accounts', …],
  note:'No credit bureau check yet — this does not affect your credit score', validForDays:7 }`.
  Max = min(DBR-headroom PV at the product's default 24-month tenor at the top of band B, 20× salary,
  product cap) rounded down to 1,000; Min = 40% of Max rounded to 1,000. Throws without openFinance.
- `MizanData.lenders = [{ id:'partner-bank', name:'Partner Bank', role:'Lender of record' }]` (use the
  same name in v2.5's memo: "Partner Bank (lender of record)").
- Selftest: prequalify for j1 returns a sensible range that contains the final approved amount; no
  record is created; throws without openFinance; decide() for j1 at 15,000/12 → APPROVE; repayment is
  DIRECT_DEBIT at 15,000 and ALTAREQ at 1,000 (if 1,000 is below the product minimum, clamp the demo
  to the minimum and say so).

## Steps (phone screen · what the customer does · "Behind the scenes")
0. **Botim home** — host chat-list mock with a Noor card: "How much credit can you get? Check in 2
   minutes — no impact on your credit score · noor finance" → tap. *Behind:* Botim markets; Botim never
   receives bank or credit data — only journey status (started / pre-qualified / funded) for attribution.
1. **Noor opens inside Botim (web-view)** — Noor splash with the wordmark; consent sheet "Botim will
   share your name and mobile number with Noor to get you started" → Continue. *Behind:* identity
   hand-off only; Noor creates the account.
2. **Create your account** — phone prefilled "+971 5• ••• ••47 (shared by Botim)", "By continuing you
   agree to Privacy policy and Terms of Use" → Continue.
3. **Enter the code** — 6-cell OTP, "Sent to number +971 5• ••• ••47", resend timer; auto-fill demo code.
4. **Connect your bank accounts** — "Connection is secure — we can't touch your money"; bank list
   (ENBD, FAB, ADCB, Mashreq, RAKBANK, Other); then the **Al Tareq consent summary**: what Noor will
   read (accounts, balances, 12 months of transactions), why (to work out what you can afford), how long
   (12 months or until you cancel), "Cancel anytime in your Al Tareq dashboard" → "Continue to your bank".
5. **Approve in your bank** — interstitial "We'll open your bank's app to approve. You'll come straight
   back to Botim." then the simulated bank app: "Noor finance wants to view your account information —
   ENBD current ••••4821, FAB savings ••••0193" → "Approve" (Face ID mock). *Behind (key insight):*
   **bank authorisation must leave the web-view** — OAuth for native apps (RFC 8252) and the FAPI 2.0
   profile behind UAE Open Finance require an external browser or the bank's app, never an embedded
   web-view; the return deep link brings the user back into Botim and the Noor web-view resumes. Noor
   never sees bank credentials. Name this as a build risk to agree with Botim (app-to-app redirect +
   return URL).
6. **Back in Noor** — Loader "Reading your accounts · 12 months · 2 accounts" → Budget-style summary
   (electric-blue gradient header: "Your budget is good", income AED 12,000/mo, spending ≈ AED 7,400).
7. **Pre-qualified** — huge Sora headline "You could borrow up to AED {max}", range "AED {min} – {max}",
   "Checking this didn't affect your credit score", NoorScore estimate band chip → "Choose your loan".
   *Behind:* prequalify() — Open Finance only, no AECB inquiry, indicative.
8. **Choose your loan** — amount slider (min…indicativeMax) + term rows (6 / 12 / 24 months) with
   indicative monthly payment and "from X% APR" (from the personal-loan bands), purpose field
   prefilled "Family wedding" → "Apply".
9. **Final checks** — AECB consent box ("Required by law before any loan — Federal Law 6/2010"); line
   "Noor arranges your loan with Partner Bank, the lender. We share your application result — never your
   bank data"; "Confirm it's you with UAE PASS" (mock) → calls **decide()** → Loader "Checking…".
10. **Your offer** — from the engine: outcome, amount, term, APR, monthly instalment, total repayable,
    "Lender: Partner Bank · arranged by Noor"; KFS link; "Accept offer" (black pill). If the engine returns
    REFER/DECLINE (e.g. the user picked something unaffordable), show the calm Noor message with the
    reason code text (EN + AR) and a way back — never the fatal banner.
11. **Partner Bank confirms** — short state "Partner Bank is confirming your loan…" → "Confirmed".
    *Behind:* Mizan sends the **credit memo** (v2.5) — button "See what the bank received" jumps to the
    Lender view with this decision's memo selected; nothing from Open Finance leaves Noor.
12. **Key Facts Statement** — EN / AR toggle (Arabic in dir="rtl"): lender, amount, APR, instalment,
    number of payments, total repayable, total interest, fees, early-settlement cap, cooling-off; "I've
    read the Key Facts" → recordEvent OFFER_ACCEPTED then KFS_ACKNOWLEDGED.
13. **Sign with UAE PASS** (mock) → AGREEMENT_SIGNED.
14. **Set up repayments** — method from the decision's `repayment`: > AED 1,000 → "Direct debit mandate in
    favour of Partner Bank — AED {instalment} on the {day} from ENBD ••••4821" → "Approve mandate";
    ≤ AED 1,000 → "Approve a recurring payment in your bank app via Al Tareq". "No salary transfer
    needed." → REPAYMENT_SET_UP.
15. **Cooling-off** — "You have 5 business days to change your mind": "Wait 5 business days" (simulated
    fast-forward) or "I need the money now — I waive my cooling-off period in writing" (checkbox) →
    COOLING_OFF_CLEARED.
16. **Done** — "AED {amount} is on its way from Partner Bank" → DISBURSED; "Back to Botim" → host home now
    shows a status card "Loan funded · managed in Noor" (no amount shown to the host app).
Step labels for the 6 execution events must come from execSteps() (lender-of-record steps 11 is UI-only).

## Acceptance additions
Walk j1 through all steps to DISBURSED with zero page errors and an empty fatal banner; the bank step
shows the "leaves the web-view" explanation; prequal range displayed and contains the final amount;
decide is not called before step 9 (assert no new Decision-log entry until then); AECB consent required
(Apply blocked inline without it); offer numbers equal the engine's record; "See what the bank received"
opens the Lender view memo for this decision and that memo contains no exact income/spend/bank names;
repayment shows Direct debit at 15,000 and switches to Al Tareq when the amount is set ≤ 1,000 (or the
product minimum note shows); the decision appears in the Decision log; host home shows the funded card;
works at 390px (phone full-width, panel below) without horizontal scroll; "Illustrative host app" tag
visible; no Botim logo assets present.

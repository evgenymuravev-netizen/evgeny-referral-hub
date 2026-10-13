# Addendum v2.11 — Clickable flow maps on every flow screen — binding spec

Source: Noor product request (5 Oct 2026), pointing at the SME screen's "The flow" stepper: "I need for other
flows same steps in a scheme like this. Each step should be clickable."

## 1. One shared component, the SME look

Build a shared `FlowMap` component and use it on every flow screen, including SME, which moves onto it.

**Look.** It keeps exactly the SME stepper's look:
- numbered circles joined by a hairline;
- a bold title and a muted detail line;
- a sky "Open Finance" chip, plus sky circles and connector, on steps that use Open Finance (Al Tareq);
- the panel header "The flow — N steps; the highlighted ones use Open Finance (Al Tareq)".

**Layout.**
- Any step count from 5 to 10 is supported (a CSS variable sets the column count).
- Tablets show five a row; phones stack the steps vertically.
- No horizontal page scroll at 390px.
- Put the CSS at the end of the "Noor additions" block. The SME-specific classes can stay as aliases or
  be migrated, but the SME screen must look the same.

**Every step is a button** (keyboard-reachable, with a visible focus ring).
- Click → the step is selected: the circle fills with `--brand-fill` and white text, and `aria-pressed`
  is true.
- A **detail panel** opens under the map and stays inside the same panel. It shows:
  - the heading "Step N · {title}";
  - three short blocks:
    - **Customer:** what they see or do;
    - **Mizan:** what the engine or data does — name the engine call or data source where there is one;
    - **Rule:** the regulation or policy that governs the step, or "Noor policy" where it is policy.
- Under the blocks, a **"Show on this screen →"** button scrolls smoothly to the step's target element and
  flashes it for about 1.5 seconds with an outline in `--brand`. Under `prefers-reduced-motion` the scroll
  is instant and there is no animation.
  - If the target isn't rendered yet (e.g. a panel that appears after deciding), the button is disabled
    and reads "Appears after you decide".
- Clicking the selected step again, or pressing Esc, closes the panel.
- Left / Right arrow keys move the selection along the map.

**Progress (status).** Each map reflects the screen's current decision record:
- steps whose work is done show a check in the circle (`--ok` tokens);
- the next step gets a ring;
- the mapping uses each step's `status` key: `form` (always done once the screen is built), `decided` (a
  record exists), `outcome` (APPROVE or REFER rendered), or an execution event (`OFFER_ACCEPTED`,
  `KFS_ACKNOWLEDGED`, `AGREEMENT_SIGNED`, `REPAYMENT_SET_UP`, `COOLING_OFF_CLEARED`, `DISBURSED`, read from
  the record's events).
- Re-render the status whenever the screen re-renders its decision or execution panel. A new decision
  resets it.

**Copy rules.**
- Every "Rule" line must be true in this codebase or the specs: Reg 29/2011, Federal Law 6/2010, CPR 8/2020,
  CBUAE Open Finance, PDPL, or the named Noor policy params. Don't invent regulations.
- Business-loan steps say "Noor policy — confirm with compliance" where SME-SPEC.md does.
- Keep each block to one or two sentences. Use plain words. No emoji.

## 2. The flows

Below, `[OF]` marks an Open Finance step. The target is a CSS selector on the same screen, unless stated
otherwise. Status keys are in braces. The agent writes the three detail blocks from the specs and the engine.

### Split a purchase (`#scr-split`) — 10 steps

1. **Purchase spotted** — "A big card purchase in the last 60 days" [OF] → `#sp-purchase` {form}
2. **Consents** — "AECB + Al Tareq" → `#sp-form` {form}
3. **Cash-flow read** — "Income, spending, free cash flow" [OF] → `#sp-orch` {decided}
4. **Credit check** — "AECB, or the cash-flow path for a thin file" → `#sp-orch` {decided}
5. **Decision** — "Mizan: rules, NoorScore, split capacity" → `#sp-decision` {outcome}
6. **Choose the plan** — "Pay in 3 · 6 · 12, fee + APR equivalent" → `#sp-plans` {OFFER_ACCEPTED}
7. **Key Facts** — "Arabic + English" → `#sp-kfs` {KFS_ACKNOWLEDGED}
8. **E-sign** — "UAE PASS" → `#sp-exec` {AGREEMENT_SIGNED}
9. **Repayment** — "Al Tareq ≤ AED 1,000 · direct debit above" → `#sp-repay` (falls back to `#sp-exec`)
   {REPAYMENT_SET_UP}
10. **Cooling-off → plan live** — "5 business days or a written waiver" → `#sp-exec` {DISBURSED}

### Personal loan (`#scr-loan`) — 10 steps

1. **Application** — "Amount, term, purpose" → `#ln-form` {form}
2. **Consents** — "AECB + Al Tareq (+ Credit Passport for newcomers)" → `#ln-form` {form}
3. **Data pulls** — "AECB report, connected accounts" [OF] → `#ln-orch` {decided}
4. **Regulatory rules** — "DBR 50% · 20× salary · 48 months" → `#ln-decision` {decided}
5. **Red-flag check** — "Own-baseline signals — refer only" [OF] → `#ln-rf-trip` (falls back to
   `#ln-decision`) {decided}
6. **NoorScore, limit, price** — "DBR headroom, free-cash-flow cap, band APR" [OF] → `#ln-decision`
   {decided}
7. **Outcome** — "Approve · refer to an analyst · decline, reasons in EN + AR" → `#ln-decision` {outcome}
8. **Offer + Key Facts** — "Arabic + English" → `#ln-exec` {KFS_ACKNOWLEDGED}
9. **E-sign + repayment** — "UAE PASS · direct debit or Al Tareq" → `#ln-exec` {REPAYMENT_SET_UP}
10. **Cooling-off → disbursement** — "5 business days or a written waiver" → `#ln-exec` {DISBURSED}

### Car loan (`#scr-car`) — 10 steps

1. **Dealer quote** — "Vehicle, price, quote validity" → `#car-vehicle` {form}
2. **Request** — "Up to 80% of the price · up to 60 months" → `#car-form` {form}
3. **Consents** — "AECB + Al Tareq" → `#car-form` {form}
4. **Income read** — "Salary + regular income (rent) verified" [OF] → `#car-found-panel` (falls back to
   `#car-orch`) {decided}
5. **Decision** — "DBR on salary + regular income · LTV · free cash flow" → `#car-decision-panel` {outcome}
6. **What Open Finance changed** — "Documents only vs Open Finance" [OF] → `#car-uplift-panel` {outcome}
7. **Offer + Key Facts** — "Vehicle, down payment, LTV (AR + EN)" → `#car-kfs-panel` {KFS_ACKNOWLEDGED}
8. **E-sign** — "UAE PASS" → `#car-exec` {AGREEMENT_SIGNED}
9. **Before release** — "Insurance · RTA mortgage · down payment · direct debit" → `#car-conditions`
   (falls back to `#car-exec`) {REPAYMENT_SET_UP}
10. **Paid to the dealer** — "Cooling-off cleared, Partner Bank pays" → `#car-exec` {DISBURSED}

### SME working capital (`#scr-sme`) — the existing 10 steps, now clickable

Keep the titles and details exactly as they are. Targets and status:

| Step | Target | Status |
|---|---|---|
| 1 | `#sme-business` | form |
| 2 | `#sme-form` | form |
| 3 | `#sme-owner-card` | form |
| 4 | `#sme-form` | form |
| 5 | `#sme-decision-panel` | outcome |
| 6 | `#sme-kfs-panel` | KFS_ACKNOWLEDGED |
| 7 | `#sme-exec` | AGREEMENT_SIGNED |
| 8 | `#sme-exec` | REPAYMENT_SET_UP |
| 9 | `#sme-exec` | DISBURSED |
| 10 | special button **"Open Monitoring →"** (shows the Monitoring screen and scrolls to `#mn-rf`) | DISBURSED |

### Credit upgrade (`#scr-upgrade`) — 10 steps

1. **Starter loan repaid** — "AED 1,000 · 1 month · 50% APR, on time" → `#up-prior` {form}
2. **Connected accounts** — "UAE accounts via Al Tareq" [OF] → `#up-form` {form}
3. **Home-country statements** — "Optional · 6 months · India, Pakistan, Egypt" → `#up-stmt` {form}
4. **Parse** — "Integrity, name match, 6 of 6, EMIs, buffer" → `#up-parse-panel` (falls back to `#up-stmt`)
   {decided}
5. **Re-decision** — "Base or enhanced tier" → `#up-decision` {outcome}
6. **Choose amount × term** — "Longer term, lower APR" → `#up-opts` {OFFER_ACCEPTED}
7. **Key Facts** — "Arabic + English" → `#up-kfs` {KFS_ACKNOWLEDGED}
8. **E-sign + repayment** — "Al Tareq ≤ AED 1,000 · direct debit above" → `#up-exec` {REPAYMENT_SET_UP}
9. **Cooling-off** — "5 business days or a written waiver" → `#up-exec` {COOLING_OFF_CLEARED}
10. **Disbursement** — "Partner Bank pays out" → `#up-exec` {DISBURSED}

### Customer journey (`#scr-journey`) — 10 phases above the phone

These steps map onto the journey's own steps. The variant's own path applies (A: Loans screen; B: see what
you can get).

1. **botim entry** — "Banner · Noor icon · Credit · Loans" → journey step 0
2. **Noor opens in botim** — "Web-view · account · email · contact consent" → steps 1–3 (incl. 3/1, 3/2)
3. **Connect banks** — "Al Tareq consent" [OF] → step 4
4. **Approve in your bank** — "Leaves the web-view" [OF] → step 5
5. **What you can borrow** — "Pre-qualified (B) or affordability check (A)" [OF] → step 7 (B) / the
   variant-A affordability sub-step
6. **Choose your loan** — "Amount, term, purpose" → step 8 (B) / the "How much do you need?" sub-step (A)
7. **Final checks** — "AECB consent · UAE PASS · decide()" → step 9
8. **Offer · Partner Bank confirms** — "Offer, credit memo to the lender" → steps 10–11
9. **Key Facts · e-sign · repayment · cooling-off** — "The execution steps" → steps 12–15
10. **Funded · back in botim** — "botim learns only “funded”" → step 16

Behaviour specific to this map:
- Status = the journey's reached / current steps.
- "Show on this screen →" becomes **"Go to this step →"**, enabled when the step has been reached (it uses
  the journey's own jump). Otherwise it is disabled and reads "Walk the journey to reach this step".
- The map sits above the phone + panel row and must not break the existing step list.

### Workbench — the refer flow (`#scr-workbench`) — 6 steps

1. **Referred** — "A rule asks for a person" → `#wb-queue` {—}
2. **Queue + SLA** — "Oldest first, SLA by product" → `#wb-queue`
3. **Case file** — "Pre-assembled: data, rules, reasons" → `#wb-case`
4. **Ask the customer** — "Explanation or 6 months of statements" → `#wb-redflags` or `#wb-stmt`, whichever
   exists, else `#wb-case`
5. **Decide** — "Re-decide on evidence, or override with a reason (4-eyes)" → `#wb-case`
6. **Customer + lender told** — "Reason in EN + AR · credit memo" → `#wb-case`

Status: steps 1–3 are done when a case is open. 4–6 follow the case: asked / re-decided / overridden.

### Monitoring — the early-warning flow (`#scr-monitoring`) — 5 steps

1. **Accounts watched** — "Consented, while a loan is open" [OF] → `#mn-rf`
2. **Signals vs own history** — "Cards, remittances, travel, salary, balances" [OF] → `#rf-table`
3. **Severity** — "Low · medium · high · patterns" → `#rf-tiles`
4. **Action** — "Watch · check-in · specialist call" → `#rf-table`
5. **Lender told** — "A status flag only" → `#rf-table`

No status here (an operational flow); all steps are neutral.

## 3. Tests (browser acceptance; extend the selftest only if engine code changes — none expected)

- Every screen listed has a flow map with the stated step count and the right Open Finance steps
  (`data-of`).
- Clicking each step:
  - opens the detail with the Customer, Mizan and Rule blocks, all non-empty;
  - `aria-pressed` is true;
  - clicking again closes it;
  - Esc closes it;
  - the arrow keys move the selection.
- "Show on this screen →" scrolls to an element that exists, after deciding with the default persona.
  Before deciding it is disabled where the target doesn't exist yet.
- Status:
  - Personal loan (r1): after Decide, steps 1–7 are done.
  - After recording the six execution events through the existing UI, steps 8–10 are done.
  - A new decision resets the status.
- Journey:
  - phase 1 is current at start;
  - walking to step 9 marks phases 1–7 as reached;
  - "Go to this step" on phase 3 jumps back to journey step 4;
  - unreached phases are disabled.
- SME: the map looks the same; step 10 opens Monitoring at the red-flags panel.
- 390px: maps stack and there is no horizontal scroll.
- Zero page errors and an empty fatal banner.
- Light and dark themes.
- All existing acceptance checks stay green. Update only checks that the SME map's markup change breaks,
  and list them.

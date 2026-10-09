# Addendum v2.12 — The botim journey starts on botim's main screen — binding spec

Source: Noor product request (8 Oct 2026): "Customer Journey for Noor in botim should start on the main screen
as well." Board, 2 Oct: Max wants Noor on the main page as a banner + an icon.

Today the journey opens on the botim money page (Pay tab, Connected accounts). botim users land on the app's
**Home** tab, the main screen. The journey must start there. Noor's banner and icon appear on the main screen
too, as well as on botim money.

## 1. New first screen: botim Home (main screen)

**Position.** It is step 0, sub 0 of the journey. The journey opens here on load and on "Restart journey".
The existing botim money page becomes step 0, sub 1 and is otherwise unchanged.

**Look.** The dark botim concept already used, drawn from neutral components:
- the plain-text wordmark "botim" with the tag "Concept — illustrative host app";
- no botim logo, artwork or real UI.

The team's Figma frames show only botim money, so the main screen is a concept. Say so in the
behind-the-scenes footnote.

**Top to bottom:**
1. Status bar 9:41. A header with the "botim" wordmark, the concept tag and an "RK" avatar.
2. The search pill "Ask me anything or search".
3. **The Noor banner.** It is a Noor embed with the "by noor" corner label, in Noor brand style. It reads:
   "How much could you borrow? Check in 2 minutes — no impact on your credit score".
4. **Services:** a grid of round icons with labels, drawn with simple neutral SVG glyphs:
   - Send money
   - Recharge
   - Bills
   - Gold
   - Cards
   - **money**, which opens botim money
   - **Noor**: the existing Noor icon mask with a "by noor" mark
   - More
5. **Recent chats:** three generic rows with initials avatars, a last-message snippet and a time, for
   example "Family group", "Office", "Building management". No real people.
6. The bottom nav Home / Calls / Chats / money / All, with **Home** active.

**Interactions:**
- The Noor banner or the Noor icon opens the **active variant's credit entry**, as the banner and icon on
  botim money already do:
  - B: "How much can you borrow?" through the Noor web-view;
  - A: the Loans screen.
  Any account, email and contact sub-steps still come first when the customer has no Noor account yet.
- **money**, in the services grid or the bottom nav, goes to botim money (0/1). From there "Connected accounts
  → Add another +" is entry 1, unchanged.
- Calls, Chats, All and the other services are inert: a small toast reads "Not part of this demo".
- After the journey is funded, "Back to botim" returns to the Credit tab as today. If the customer goes back
  to Home, the banner shows "Loan funded · managed in Noor" with no amount.

**Events (botim receives events only):**
- `impression` and `click` events gain `surface: 'home' | 'money'`.
- The Experiment counters keep working. They can show impressions by surface.

**Behind the scenes for 0/0:** "Where botim users land. Noor's banner and icon sit on the main screen (Max's
ask) and on botim money — both are Noor embeds, so botim gets events only. Tap the banner or the Noor icon to
go straight to Noor, or open money to connect a bank first."

## 2. The step list and the flow map

- **Step list:** step 0 is titled "botim — main screen", with the sub-step "botim money — Connected accounts".
- **Flow map phase 1** ("botim entry") changes its detail to "Main screen · banner · Noor icon · money" and
  covers 0/0 and 0/1. Its "Go to this step" lands on the main screen.
- **The flow map's Customer / Mizan / Rule copy for phase 1** mentions the main screen.

## 3. Tests

**Update the existing acceptance journey walk:** it starts on the main screen now. Add the one tap into
money where the walk expects botim money. Keep the intent of every existing check and list the ones you
changed.

**Add:**
- On load and after Restart, the journey is at 0/0 on the main screen, with the "botim" wordmark, the concept
  tag, the Noor banner and the Noor icon, each with a "by noor" mark.
- There are no botim logo assets.
- The banner → the variant's entry (check both A and B).
- The Noor icon → the same.
- money → 0/1, and Add another → the existing entry 1.
- Calls, Chats and All → a toast and no navigation.
- After funding, the Home banner shows "Loan funded · managed in Noor" with no amount.
- Impression events carry `surface`.
- Flow-map phase 1 covers 0/0 and 0/1.
- 390px: no horizontal scroll.
- Zero page errors.
- Light and dark themes.
- The selftest stays green; no engine change is expected.

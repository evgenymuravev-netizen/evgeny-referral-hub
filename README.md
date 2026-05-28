# Evgeny Referral Hub

A self-contained outreach dashboard for **Andrey Kazarinov** (CPO, Tabby) to send
personalised referral messages on behalf of **Evgeny Muravev**, who is exploring
new product / fintech roles.

🌐 **Live site:** see `index.html` — open in any browser (or visit the GitHub Pages URL once enabled).

## What's inside

| File | Purpose |
|---|---|
| `index.html` | The dashboard — 86 KB, no dependencies, ready to use |
| `active_outreach.json` | 23 specific asks Evgeny gave Andrey, with pre-drafted messages, custom personalizations, ask types, channels, and resolved LinkedIn URLs |
| `open_roles.json` | Verified live job postings at target companies (FAB, Wise, Airwallex, Google, RAKBank, etc.) mapped to the referrer who can introduce |
| `build_page.py` | Regenerates `index.html` from the JSON when data changes |
| `build_sheet.py` | Regenerates the Excel/Sheets version |

## What the dashboard does

- **23 outreach cards** grouped by block (recruiters / banks / companies / Telegram ecosystem)
- **Per-card "Send via X" buttons** — copy message + open LinkedIn / WhatsApp / Telegram / Email in one click
- **Guided sequence mode** — walks through visible cards one tab at a time
- **Live LinkedIn search box** at the top — Enter opens results in a new tab
- **Add LinkedIn URL inline** for the 6 unidentified contacts
- **Per-company open roles section** — shows verified live job postings under each contact card, with one-click "Send referral for this role" that auto-prepares a custom message mentioning the specific role
- **localStorage persistence** — status survives reloads
- **Progress tracker** with depth-weighted scoring (sent=1, replied=2, offer=5, accepted=7)
- **Confetti** on offer / accepted milestones

## How to update the data

1. Edit `active_outreach.json` or `open_roles.json`
2. Run `python3 build_page.py` — regenerates `index.html`
3. Commit + push — GitHub Pages auto-deploys

## Source data

- Outreach plan: Evgeny → Andrey, translated from Russian, May 2026
- Network: Andrey Kazarinov's UAE 1st + 2nd degree LinkedIn connections (~170 contacts)
- Open roles: live-verified via HTTP HEAD + WebFetch from official career pages

## Author

Built by Claude + Evgeny Muravev. Pitch line locked: *"Evgeny helped us build our merchant lending and payments product, wallets for business in UAE."*

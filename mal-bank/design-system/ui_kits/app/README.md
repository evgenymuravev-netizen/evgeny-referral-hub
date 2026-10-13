# App UI kit — Mal mobile banking

Interactive click-through of Mal's AI-native Islamic banking app, in a phone shell.

- **index.html** — mounts `PhoneApp`.
- **App.jsx** — phone shell + all screens and state.

**Flow:** launches on **Login** (mesh splash) → tap *Continue with Face ID* → **Home** (balance card, quick actions, AI nudge, recent activity). Bottom tab bar switches: **Home**, **Insights** (spend breakdown), **Ask Mal** (AI chat — type or tap a suggested prompt to get a reply with an action button), **Card** (Sharia + round-up toggles), **Profile**.

Uses: `AccountCard`, `TransactionRow`, `ChatBubble`, `Card`, `Button`, `IconButton`, `Badge`, `Tag`, `Input`, `Switch`, `Icon`. Content is illustrative (fictional user "Layla Al Mansoori"); the app is not a real product view — it's a faithful visual recreation built on the brand foundations.

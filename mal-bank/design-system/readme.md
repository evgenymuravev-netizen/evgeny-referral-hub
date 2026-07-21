# Mal Design System

Design system for **Mal** — *"AI Powered banking."* Mal is the first **AI-native Islamic digital financial platform**: a digital companion for everyday choices, from travel to transactions, that "finds value where others miss it." It is a technology company (explicitly *not* a bank), headquartered on the 21st floor of Sky Tower, Al Reem Island, **Abu Dhabi, UAE**.

Products represented here:
1. **Marketing website** — the public mal.ai landing (waitlist / early access).
2. **Mobile banking app** — the AI-native consumer app (balance, insights, the "Ask Mal" assistant, card).

### Sources used
- **Company website:** https://mal.ai/ (Framer-built) — the only source provided. Careers: https://careers.mal.ai/
- Legal & product surfaces referenced on the site: Website / SME / App (each with Terms + Privacy).
- No codebase, Figma file, brand book, font files, or logo assets were provided. Everything here is derived from the live marketing site. The signature gradient imagery was **color-sampled from the real site meshes** and recreated in CSS (see Caveats).

---

## CONTENT FUNDAMENTALS
How Mal writes.

- **Voice:** calm, confident, humane, quietly premium. Short declaratives. Big promise, low noise. Example: *"The future of finance is here."* / *"Ask. Act. Done."*
- **Person:** speaks to **"you"** about **your** money and goals; the company speaks as **"we"** in the values/culture voice (*"The way we build defines who we are."*). The product/assistant is **"Mal"** ("Ask Mal anything").
- **Sentence shape:** headlines are 3–6 words, often a fragment (*"Smarter Journeys, Powered by AI"*). Body is one or two sentences that pair a capability with a human benefit (*"…helping you do more with less effort."*).
- **Casing:** Sentence case for body; **Title Case for feature headlines** ("An Intelligent Financial Layer"). Short uppercase overlines used sparingly for labels/eyebrows.
- **Punctuation as rhythm:** staccato triads with periods — *"Ask. Act. Done."* / *"Transparent, ethical, and built around people."*
- **Values language:** ethics-forward and inclusive — *"Act with Integrity," "Empower the Many," "access, not advantage," "a fairer digital world."* Reflects the Islamic-finance foundation (halal, Sharia-aligned) without being heavy-handed.
- **Compliance line, always:** *"Mal is a technology company and not a bank."* Keep it present near CTAs and in the footer.
- **Emoji:** **none.** The brand never uses emoji. Do not add them.
- **Numbers/money:** always with currency code (AED default for UAE), tabular figures, thousands separators — `AED 12,480.50`.

---

## VISUAL FOUNDATIONS
The look and feel.

- **Overall vibe:** serene, iridescent, premium-minimal. Near-black ink on soft off-white, punctuated by dreamy pastel gradient meshes. Lots of air. Nothing shouts.
- **Color:** the "brand color" is effectively **ink (#0e0e10)** on **near-white (#f7f7f9 / #fff)**. Actions are monochrome (ink fills), not colorful. Color lives almost entirely in the **iridescent mesh range** — periwinkle `#a6a8fd`, lavender `#c7b8fa`, violet `#d7ccfd`, mauve `#ddabdf`, rose `#f2a9ac`, coral `#f9a583`, peach `#fba477`. These are high-value, low-to-mid saturation. A single **iris-blue `#4a63d8`** serves as the interactive accent when needed.
- **Signature backgrounds:** layered **radial-gradient meshes** that flow cool→warm (periwinkle → rose → peach) with a subtle soft-light **film grain**. Used full-bleed behind heroes, as feature-tile fills, on the payment card, and as app splash/header sheets. This is the single most recognizable brand asset. Not flat brand color, not photography — atmospheric gradient fields.
- **Type:** one contemporary grotesk across the board (**Onest**, substitute — see Caveats), weight-driven hierarchy. Display is tight-tracked (`-0.03 to -0.04em`), large, semibold. Body is calm at 1.5 line-height. Money/data uses **tabular numerals**; Geist Mono for code/spec labels.
- **Spacing:** 4px base grid; generous section rhythm (`clamp(4rem,10vw,8rem)`); roomy card padding (24px).
- **Corner radii:** generous and soft — controls 14px, cards 20px, panels/app sheets 28px, buttons & chips fully **pill**. Nothing sharp.
- **Cards:** white surface, **hairline border** (`--border-subtle`), **light diffuse shadow** (`--shadow-sm`). No heavy borders, no colored left-accent stripes. A "mesh" card variant fills with the iridescent gradient for feature tiles.
- **Shadows:** light, diffuse, cool-tinted, low-opacity (5–14%). Big soft ambient shadows for elevated panels; almost none for resting surfaces. A special `--shadow-glow` (periwinkle) for elements floating over a mesh.
- **Transparency & blur:** **glassmorphism over meshes** — nav bar, chips and badges sitting on gradients use `rgba(255,255,255,0.6)` fills with `blur(20px)` and a light border. Used only where content overlaps a gradient, for legibility and depth.
- **Protection:** dark bottom scrim (`--scrim-bottom`) or soft white scrim (`--scrim-soft`) behind text over busy meshes; glass capsules for floating labels.
- **Borders:** 1px hairlines in cool grays; focus is a 3px iris ring plus an ink border.
- **Motion:** calm and understated. Gentle deceleration (`--ease-out`), 120–360ms. **No bounce, no spring.** Fades and small translateY reveals. Buttons press with a subtle `scale(0.97)`; icon buttons `scale(0.94)`. Cards lift ~3px on hover. No infinite decorative loops.
- **Hover/press:** hover = slightly darker ink or a surface tint; press = brief scale-down. Links shift to the iris-blue accent.
- **Imagery mood:** the meshes are warm-cool iridescent pastels with a fine grain — soft, optimistic, non-photographic. Maps/utility imagery render in muted grayscale.
- **Iconography:** thin-line, rounded — see below.

---

## ICONOGRAPHY
- **Style:** thin **line icons**, ~1.6px stroke, rounded caps and joins, 24px grid — a Lucide/Feather idiom. This matches the outline glyphs seen on the real site (shield-check, crown, chat/message, credit-card, map-pin, sparkles/magic-wand).
- **Implementation:** the `Icon` component ships a **curated inline set** (Lucide path data, ISC-licensed) so it's self-contained with **no CDN dependency**. Names include: arrow-right, arrow-up-right, chevron-right/down, plus, check, x, search, sparkles, credit-card, shield-check, crown, message, map-pin, wallet, trending-up, arrow-down-left, bell, settings, home, user, send, eye, eye-off, info, alert-triangle. Extend from Lucide as needed to keep the stroke consistent.
- **Color:** icons are almost always **ink** (`currentColor`), occasionally muted gray. They are never multicolor and never filled.
- **No emoji, no unicode-glyph icons, no PNG/raster icons.** Feature "images" on the site are gradient meshes with a single centered line icon in a glass tile — reproduce with `GradientMesh` + `Icon`, not illustrations.
- **Logo:** **none provided.** The wordmark is set as plain type — "Mal" in the display font, ~600 weight, tight tracking. Do not fabricate a logo mark; render the wordmark and replace when official assets arrive.

---

## Components
Reusable React primitives (`window.MalDesignSystem_097b20.<Name>`). Grouped by concern.

**Core** — `Button`, `IconButton`, `Badge`, `Tag`, `Card`
**Forms** — `Input`, `Select`, `Switch`, `Checkbox`
**Feedback** — `Dialog`, `Toast`, `Tooltip`
**Brand** — `GradientMesh`, `Icon`
**Banking** — `AccountCard`, `TransactionRow`, `ChatBubble`

Each component directory holds `<Name>.jsx` + `<Name>.d.ts` + `<Name>.prompt.md`, and a `*.card.html` specimen tagged `@dsCard group="Components"`.

### Intentional additions
No source component inventory (codebase/Figma) was provided, so a standard primitive set was authored, sized to the brand, plus four product-specific pieces the site/app clearly imply:
- `GradientMesh` — the signature iridescent background, as a reusable component.
- `Icon` — thin-line glyph wrapper for the brand's icon idiom.
- `AccountCard`, `TransactionRow`, `ChatBubble` — banking-app surfaces implied by "conversations that create action" and an AI-native money app.

---

## Index / manifest (root)
- **styles.css** — global entry point (import lines only). Consumers link this.
- **tokens/** — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `gradients.css`, `base.css`.
- **components/** — `core/`, `forms/`, `feedback/`, `brand/`, `banking/` (see Components).
- **guidelines/** — foundation specimen cards: color (ink, neutrals, iridescent, tints/semantic), type (display, body, weights), spacing (scale, radii & shadows), brand (meshes, wordmark).
- **ui_kits/website/** — marketing site recreation (`index.html`, `Landing.jsx`, `README.md`).
- **ui_kits/app/** — mobile banking app recreation (`index.html`, `App.jsx`, `README.md`).
- **SKILL.md** — Agent-Skills entry point.
- Generated (do not edit): `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`.

---

## CAVEATS (needs your input)
1. **Fonts are substituted.** No Mal webfonts were provided. Display/body use **Onest**; data/mono uses **Geist Mono** (both Google Fonts). Please share the real font files so I can swap `@font-face` and re-tune the type scale.
2. **No logo.** No brand mark was in the sources — the wordmark is plain type. Send the official logo (SVG) and I'll wire it in.
3. **Gradient meshes are CSS recreations.** The real site uses raster PNG meshes on framerusercontent.com (couldn't be copied cross-origin). Colors were sampled from the live art and rebuilt as layered radial gradients — close, but if you can export the original PNGs I'll ship them as assets.
4. **Exact brand hexes / spacing unconfirmed.** Values are sampled/inferred from the marketing site, not a spec. A brand sheet or Figma would let me lock these precisely.

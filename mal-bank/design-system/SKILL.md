---
name: mal-design
description: Use this skill to generate well-branded interfaces and assets for Mal (mal.ai) — the AI-native Islamic digital financial platform — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick reference
- **Brand:** Mal — "AI Powered banking." First AI-native Islamic digital financial platform (Abu Dhabi, UAE). A technology company, **not a bank** — keep the line "Mal is a technology company and not a bank" near CTAs/footer.
- **Vibe:** serene, iridescent, premium-minimal. Near-black ink on off-white, with signature pastel gradient meshes. Calm motion, no bounce, no emoji.
- **Color:** ink `#0e0e10` on `#f7f7f9`/white; actions are ink (monochrome). Color lives in the iridescent mesh range (periwinkle→lavender→rose→peach) and one iris-blue accent `#4a63d8`.
- **Type:** Onest (substitute) across the board, weight-driven hierarchy, tight display tracking; tabular numerals for money.
- **Radii:** pill buttons/chips, 20px cards, 28px panels. **Shadows:** light & diffuse. **Icons:** thin 1.6px line (Lucide idiom).

## Files
- `styles.css` — link this; pulls all tokens + fonts.
- `tokens/` — colors, typography, spacing, effects, gradients (incl. `--mesh-hero/cool/warm/veil`).
- `components/` — React primitives, namespace `MalDesignSystem_097b20` (load `_ds_bundle.js`). See each `*.prompt.md`.
- `ui_kits/website/` and `ui_kits/app/` — full recreations to copy from.
- `readme.md` — full content + visual + iconography guidelines. Read it before designing.

## Signature move
Use `GradientMesh` (or `var(--mesh-hero)`) for hero backdrops, feature tiles, the payment card, and app splash/headers. Overlay ink text and thin-line icons; float glass capsules (`--glass-fill` + blur) over it for legibility.

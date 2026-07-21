# Website UI kit — Mal marketing site

Recreation of the mal.ai marketing landing page, composed from Mal design-system components.

- **index.html** — mounts the full page; the hero waitlist form is interactive.
- **Landing.jsx** — the page, factored into `Nav`, `Hero`, `Features`, `Values`, `Contact`, `Footer`.

Sections mirror the live site: hero ("The future of finance is here."), the three feature tiles (Smarter Journeys / Intelligent Financial Layer / Conversations That Create Action), the values block (Act with Integrity / Empower the Many), contact (Mal HQ, Abu Dhabi) and footer.

Uses: `GradientMesh`, `Card`, `Button`, `Input`, `Icon`. The signature hero/feature imagery is the CSS `GradientMesh` (real site uses raster PNG meshes — swap in official art when available).

# Boato Supper Club — website

Static production site for [boatosupperclub.com](https://boatosupperclub.com), deployed via GitHub Pages (see `CNAME`).

Plain HTML/CSS/JS, no build step and no frontend framework — this is a precompiled port of the original Claude Design prototype (which ran on React + Babel-in-browser via CDN). Bilingual (PT/EN), single page.

## Structure

- `index.html` — page shell + SEO/social meta + structured data
- `css/tokens.css` — design tokens (colors, type, spacing) and self-hosted brand font
- `css/site.css` — shared UI kit (buttons, sections, cards, forms, modal, footer…)
- `css/landing.css` — nav + hero specific styles
- `js/i18n.js` — all PT/EN copy, single source of truth
- `js/settings.js` — site-wide look settings (headline style, CTA copy, hero darkness…) — edit here instead of digging through markup
- `js/reservations.js` — seat-limit tracking, Web3Forms/EmailJS/Stripe integration
- `js/sections.js` — concept/dinners/chef/inquiry/footer rendering
- `js/modal.js` — reservation modal + calendar
- `js/app.js` — nav/hero rendering, page state, scroll behavior
- `js/submissions-store.js` — Supabase-backed form submission log, shared with `/admin`
- `assets/` — fonts, images, dinner-card videos
- `admin/` — password-gated dashboard for viewing/exporting form submissions (client-side only; see `admin/index.html` for the password)

## Local development

No build step — just serve the directory statically, e.g.:

```
python3 -m http.server 8877
```

Then open `http://localhost:8877`.

## Editing copy or dates

- Text (PT/EN): `js/i18n.js`
- Bookable dinner dates / seat cap: `SEAT_CAP` and `INITIAL_BOOKED` in `js/reservations.js`, and the `dates` array in `js/i18n.js`'s `modal` section (keep both in sync)
- Site look (headline style, CTA label, nav style, hero darkness): `js/settings.js`

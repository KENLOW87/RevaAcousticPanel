# REVA Acoustic — Website

A product catalog website for REVA Acoustic (acoustic PET fibre wall panels, by EZLIFE), built from the brand logos and product photography in this folder.

## Run it

```
npm install
npm start
```

Then open http://localhost:3000

On Windows, you can also just double-click **`start.bat`** — it installs dependencies on first run, starts the server, and opens the site in your browser.

## Admin dashboard

http://localhost:3000/admin — view and manage quote requests (mark handled / delete), edit product names/descriptions and show/hide designs from the catalog, rename the shared finish colors, and edit the site's contact info and social links — all without touching code.

It's protected by a simple password prompt (HTTP Basic Auth) — your browser will ask for a username and password the first time you visit:

- **Username**: `admin`
- **Password**: `reva-admin-2026`

**Change this password** in `server/config.js` (the `ADMIN` object) before this site is ever reachable by anyone other than you — it's a placeholder.

## What's here

- **Backend**: `server/` — Express app. Serves the frontend, a products API (built from the product images), a quote-request API, and the password-protected admin API.
- **Frontend**: `public/` — plain HTML/CSS/JS, 5 public pages: Home, Products (catalog with finish filter + search), Product detail, About, Contact (quote form).
- **Admin**: `server/admin/admin.html` — a self-contained dashboard (not part of the public static site) with four tabs: Quote Requests, Products (grouped by series), Finishes, Site Settings.
- **Product images / series**: `public/images/products/{Series}/{Design}/{FINISH}.{ext}` — e.g. `public/images/products/A Series/A1/DC.png`. **Adding a new series later is just adding a new folder here** (e.g. `B Series/B1/...`) with one subfolder per design and its finish images — no code changes needed.
- **Product data**: `server/data/products.json`, (re)generated from the folder structure above by `server/scripts/build-products.js` (`npm run build:products`). The `series` field comes straight from the folder name, so a new series folder shows up as its own group in Admin → Products automatically. Safe to re-run any time — admin edits live in separate override files (below) and are never overwritten by a regenerate.
- **Product edits**: name, description and catalog visibility (active/hidden) edited from `/admin` → Products, grouped by series, stored as overrides in `server/data/product-overrides.json`, merged on top of the generated `products.json` at request time.
- **Finish names**: one shared palette (Dark Coffee, Ochre Yellow, etc.) used across every series, edited from `/admin` → Finishes and stored in `server/data/finish-names.json`. The list is read from whatever finish codes actually exist in the product images — so a future series with entirely different colors just adds new rows here after a rebuild, ready to name. Renaming one updates it everywhere that code is used, including past quote requests' display.
- **Quote requests**: submissions from the Contact page are saved to `server/data/quotes.json`; manage them from `/admin`.
- **Site settings**: editable contact info / social links live in `server/data/site-config.json`, editable from `/admin` → Site Settings, and served publicly via `/api/config`.

## Before going live — things to fill in

The source folder had no pricing, contact details, or spec sheet, so these were left as clearly-marked placeholders:

- **Contact info** — go to `/admin` → Site Settings and replace the placeholder email, phone, WhatsApp number, address and hours with the real ones. Saves instantly, no restart needed.
- **Admin password** — change it in `server/config.js` before deploying anywhere public.
- **Pricing** — the site currently runs "Request a Quote" only (no listed prices), since no price list was provided. If you get real pricing, it can be added to each product and a price shown on the catalog/detail pages.
- **Panel specs** — material (PET fibre) and standard panel size (1200 x 2400 x 9 mm) are now pulled from the official spec sheet and shown on the product detail page. Still missing: NRC/sound-absorption rating, since it wasn't in the spec sheet. Add it to the `size`/`material` fields in `build-products.js` once you have it.
- **B Series** — the source folder had a `B SERIES` folder alongside `A Series` but it was empty, so only A Series (23 designs x 5 finishes) is in the catalog. Add `public/images/products/B Series/...` with real images whenever that's ready, then run `npm run build:products` — it'll appear as its own group in Admin → Products.

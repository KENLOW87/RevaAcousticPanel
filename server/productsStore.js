// Merges the auto-generated product catalog (server/data/products.json,
// rebuilt from the product images by build-products.js) with admin-editable
// overrides (name / category / description / active per product, shared finish names),
// so re-running build-products.js never wipes out admin edits.
const fs = require('fs');
const path = require('path');

const colorDefaults = require('./colorDefaults');

const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const OVERRIDES_FILE = path.join(__dirname, 'data', 'product-overrides.json');
const FINISHES_FILE = path.join(__dirname, 'data', 'finish-names.json');

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return fallback;
  }
}

function loadBaseProducts() {
  return readJson(PRODUCTS_FILE, []);
}

function loadProductOverrides() {
  return readJson(OVERRIDES_FILE, {});
}

function saveProductOverrides(overrides) {
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));
}

function loadFinishOverrides() {
  return readJson(FINISHES_FILE, {});
}

function saveFinishOverrides(overrides) {
  fs.writeFileSync(FINISHES_FILE, JSON.stringify(overrides, null, 2));
}

// The name/hex build-products.js assigned each code the last time it scanned
// the product images (colorDefaults.js if it knew the code, else the raw
// code + a grey placeholder). Reading it straight from the catalog — rather
// than only from colorDefaults.js — means a brand new series with its own,
// different finish codes shows up here automatically after a rebuild, with
// no code changes: just rename/recolor the new rows like any other finish.
function getCatalogColorDefaults() {
  const base = loadBaseProducts();
  const map = new Map();
  base.forEach((p) =>
    p.colors.forEach((c) => {
      if (!map.has(c.code)) map.set(c.code, { name: c.name, hex: c.hex });
    })
  );
  return map;
}

// Merged finish list: every code seen in the catalog, colorDefaults, or the
// override file, with override name/hex taking priority. Shared across every
// series — rename a finish once, it updates everywhere that code is used.
function getFinishes() {
  const overrides = loadFinishOverrides();
  const catalogDefaults = getCatalogColorDefaults();
  const codes = new Set([...catalogDefaults.keys(), ...Object.keys(colorDefaults), ...Object.keys(overrides)]);
  return Array.from(codes)
    .sort()
    .map((code) => {
      const fallback = catalogDefaults.get(code) || colorDefaults[code];
      return {
        code,
        name: overrides[code]?.name || fallback?.name || code,
        hex: overrides[code]?.hex || fallback?.hex || '#CCCCCC',
      };
    });
}

function applyFinishNames(colors) {
  const finishes = getFinishes();
  const byCode = new Map(finishes.map((f) => [f.code, f]));
  return colors.map((c) => ({
    ...c,
    name: byCode.get(c.code)?.name || c.name,
    hex: byCode.get(c.code)?.hex || c.hex,
  }));
}

function mergeProduct(base, overrides) {
  const override = overrides[base.id] || {};
  return {
    ...base,
    name: override.name || base.name,
    category: override.category || base.category || 'Other designs',
    description: override.description || base.description,
    active: override.active !== undefined ? override.active : true,
    colors: applyFinishNames(base.colors),
  };
}

// Full merged catalog. includeInactive: true returns hidden designs too
// (used by the admin panel); false (default) filters them out (public API).
function getAllProducts({ includeInactive = false } = {}) {
  const base = loadBaseProducts();
  const overrides = loadProductOverrides();
  const merged = base.map((p) => mergeProduct(p, overrides));
  return includeInactive ? merged : merged.filter((p) => p.active);
}

function getProduct(id, { includeInactive = false } = {}) {
  const products = getAllProducts({ includeInactive: true });
  const product = products.find((p) => p.id.toLowerCase() === String(id).toLowerCase());
  if (!product) return null;
  if (!includeInactive && !product.active) return null;
  return product;
}

function productExists(id) {
  const base = loadBaseProducts();
  return base.some((p) => p.id.toLowerCase() === String(id).toLowerCase());
}

function setProductOverride(id, fields) {
  const overrides = loadProductOverrides();
  const current = overrides[id] || {};
  overrides[id] = { ...current, ...fields };
  saveProductOverrides(overrides);
  return getProduct(id, { includeInactive: true });
}

module.exports = {
  getAllProducts,
  getProduct,
  productExists,
  setProductOverride,
  getFinishes,
  saveFinishOverrides,
  loadFinishOverrides,
};

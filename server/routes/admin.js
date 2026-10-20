const express = require('express');
const { loadQuotes, saveQuotes } = require('../quotesStore');
const { readConfig, writeConfig } = require('../config');
const {
  getAllProducts,
  getProduct,
  productExists,
  setProductOverride,
  getFinishes,
  saveFinishOverrides,
} = require('../productsStore');

const router = express.Router();

// ---- Quote requests ----

// GET /api/admin/quotes - list all quote requests, newest first
router.get('/quotes', (req, res) => {
  const quotes = loadQuotes();
  quotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(quotes);
});

// PATCH /api/admin/quotes/:id - toggle handled status
router.patch('/quotes/:id', (req, res) => {
  const quotes = loadQuotes();
  const quote = quotes.find((q) => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found.' });
  }
  if (typeof req.body?.handled === 'boolean') {
    quote.handled = req.body.handled;
  }
  saveQuotes(quotes);
  res.json(quote);
});

// DELETE /api/admin/quotes/:id - remove a quote request
router.delete('/quotes/:id', (req, res) => {
  const quotes = loadQuotes();
  const next = quotes.filter((q) => q.id !== req.params.id);
  if (next.length === quotes.length) {
    return res.status(404).json({ error: 'Quote not found.' });
  }
  saveQuotes(next);
  res.json({ success: true });
});

// ---- Site settings ----

function isShortString(value, maxLength) {
  return typeof value === 'string' && value.length <= maxLength;
}

// GET /api/admin/config - full editable site config
router.get('/config', (req, res) => {
  res.json(readConfig());
});

// PUT /api/admin/config - update contact info / social links
router.put('/config', (req, res) => {
  const body = req.body || {};
  const current = readConfig();

  const contact = { ...current.contact, ...(body.contact || {}) };
  const social = { ...current.social, ...(body.social || {}) };

  for (const [key, value] of Object.entries(contact)) {
    if (!isShortString(value, 200)) {
      return res.status(400).json({ error: `Contact field "${key}" is invalid.` });
    }
  }
  for (const [key, value] of Object.entries(social)) {
    if (!isShortString(value, 300)) {
      return res.status(400).json({ error: `Social field "${key}" is invalid.` });
    }
  }
  if (body.siteName !== undefined && !isShortString(body.siteName, 120)) {
    return res.status(400).json({ error: 'Site name is invalid.' });
  }
  if (body.tagline !== undefined && !isShortString(body.tagline, 160)) {
    return res.status(400).json({ error: 'Tagline is invalid.' });
  }

  const next = {
    siteName: body.siteName !== undefined ? body.siteName.trim() : current.siteName,
    tagline: body.tagline !== undefined ? body.tagline.trim() : current.tagline,
    contact,
    social,
  };

  writeConfig(next);
  res.json(next);
});

// ---- Products ----

// GET /api/admin/products - every design, including hidden ones
router.get('/products', (req, res) => {
  res.json(getAllProducts({ includeInactive: true }));
});

// GET /api/admin/products/:id
router.get('/products/:id', (req, res) => {
  const product = getProduct(req.params.id, { includeInactive: true });
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }
  res.json(product);
});

// PUT /api/admin/products/:id - edit name / description / active (show in catalog)
router.put('/products/:id', (req, res) => {
  const { id } = req.params;
  if (!productExists(id)) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const { name, description, active } = req.body || {};
  const fields = {};

  if (name !== undefined) {
    if (!isShortString(name, 150) || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is invalid.' });
    }
    fields.name = name.trim();
  }
  if (description !== undefined) {
    if (!isShortString(description, 2000)) {
      return res.status(400).json({ error: 'Description is too long.' });
    }
    fields.description = description.trim();
  }
  if (active !== undefined) {
    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Active must be true or false.' });
    }
    fields.active = active;
  }

  const updated = setProductOverride(id, fields);
  res.json(updated);
});

// ---- Finishes (shared color names, used by every design) ----

// GET /api/admin/finishes
router.get('/finishes', (req, res) => {
  res.json(getFinishes());
});

// PUT /api/admin/finishes - body: { DC: { name, hex }, LC: { ... }, ... }
router.put('/finishes', (req, res) => {
  const body = req.body || {};
  // Any code currently in the catalog (any series) or already named is
  // "known" — this grows on its own as new series/colors get added.
  const knownCodes = new Set(getFinishes().map((f) => f.code));
  const next = {};

  for (const [code, value] of Object.entries(body)) {
    if (!knownCodes.has(code)) {
      return res.status(400).json({ error: `Unknown finish code "${code}".` });
    }
    const name = value?.name;
    const hex = value?.hex;
    if (!isShortString(name, 60) || name.trim().length === 0) {
      return res.status(400).json({ error: `Finish "${code}" needs a valid name.` });
    }
    if (typeof hex !== 'string' || !/^#([0-9a-fA-F]{3}){1,2}$/.test(hex)) {
      return res.status(400).json({ error: `Finish "${code}" needs a valid hex color.` });
    }
    next[code] = { name: name.trim(), hex };
  }

  saveFinishOverrides(next);
  res.json(getFinishes());
});

module.exports = router;

const express = require('express');
const { recordClick, recordSearch } = require('../tracking');

const router = express.Router();

// ---- Click / action beacons ----
router.post('/click', (req, res) => {
  const { action, page } = req.body || {};
  if (action && typeof action === 'string') {
    try {
      recordClick({ action, page: typeof page === 'string' ? page : '' }, req);
    } catch (e) {
      // Tracking must never break the site.
    }
  }
  res.status(204).end();
});

// ---- Site search ----
router.post('/search', (req, res) => {
  const { keyword, page, resultCount } = req.body || {};
  try {
    const result = recordSearch(
      { keyword, page: typeof page === 'string' ? page : '', resultCount: Number(resultCount) },
      req
    );
    if (result && result.setCookie) res.setHeader('Set-Cookie', result.setCookie);
  } catch (e) {
    // Tracking must never break the site.
  }
  res.status(204).end();
});

module.exports = router;

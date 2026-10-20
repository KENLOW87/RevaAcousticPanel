const { recordPageView } = require('../tracking');

const PAGE_PATH_RE = /^\/$|\.html$/i;

function trackPageView(req, res, next) {
  if (req.method === 'GET' && PAGE_PATH_RE.test(req.path)) {
    try {
      recordPageView(req, res);
    } catch (e) {
      // Tracking must never break the site.
    }
  }
  next();
}

module.exports = trackPageView;

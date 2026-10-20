const { ADMIN } = require('../config');

const REALM = 'REVA Admin';

// HTTP Basic Auth gate for everything under /admin and /api/admin.
// Browsers cache the credentials per-realm after the first successful
// prompt, so subsequent fetch() calls from the admin page are authenticated
// automatically without any custom session/token code.
function adminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const separatorIndex = decoded.indexOf(':');
    const user = decoded.slice(0, separatorIndex);
    const pass = decoded.slice(separatorIndex + 1);

    if (user === ADMIN.username && pass === ADMIN.password) {
      return next();
    }
  }

  res.set('WWW-Authenticate', `Basic realm="${REALM}"`);
  res.status(401).send('Authentication required.');
}

module.exports = adminAuth;

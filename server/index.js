const express = require('express');
const path = require('path');

const { getConfig } = require('./config');
const adminAuth = require('./middleware/adminAuth');
const trackPageView = require('./middleware/trackPageView');
const productsRouter = require('./routes/products');
const quotesRouter = require('./routes/quotes');
const trackRouter = require('./routes/track');
const adminRouter = require('./routes/admin');
const reportRouter = require('./routes/report');

const app = express();
const PORT = process.env.PORT || 3000;

// Must run before express.static, which otherwise serves every page request
// (including '/') without ever reaching later middleware.
app.use(trackPageView);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', async (req, res) => {
  try {
    const { siteName, tagline, contact, social } = await getConfig();
    res.json({ siteName, tagline, contact, social });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load site configuration.' });
  }
});

app.use('/api/products', productsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/track', trackRouter);

// Everything below requires the admin password (HTTP Basic Auth).
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});
app.use('/api/admin', adminAuth, adminRouter);
app.use('/api/admin/report', adminAuth, reportRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`REVA Acoustic server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});

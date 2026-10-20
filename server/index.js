const express = require('express');
const path = require('path');

const { readConfig } = require('./config');
const adminAuth = require('./middleware/adminAuth');
const productsRouter = require('./routes/products');
const quotesRouter = require('./routes/quotes');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (req, res) => {
  const { siteName, tagline, contact, social } = readConfig();
  res.json({ siteName, tagline, contact, social });
});

app.use('/api/products', productsRouter);
app.use('/api/quotes', quotesRouter);

// Everything below requires the admin password (HTTP Basic Auth).
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});
app.use('/api/admin', adminAuth, adminRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`REVA Acoustic server running at http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});

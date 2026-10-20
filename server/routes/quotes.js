const express = require('express');
const { loadQuotes, saveQuotes } = require('../quotesStore');

const router = express.Router();

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// POST /api/quotes - submit a quote / enquiry request
router.post('/', (req, res) => {
  const { name, email, phone, message, productId, colorCode } = req.body || {};

  if (!isNonEmptyString(name, 120)) {
    return res.status(400).json({ error: 'Please provide a valid name.' });
  }
  if (!isNonEmptyString(email, 180) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (phone !== undefined && phone !== null && phone !== '' && !isNonEmptyString(String(phone), 40)) {
    return res.status(400).json({ error: 'Please provide a valid phone number.' });
  }
  if (message !== undefined && message !== null && String(message).length > 2000) {
    return res.status(400).json({ error: 'Message is too long.' });
  }

  const quote = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name: String(name).trim(),
    email: String(email).trim(),
    phone: phone ? String(phone).trim() : '',
    productId: productId ? String(productId).trim() : '',
    colorCode: colorCode ? String(colorCode).trim() : '',
    message: message ? String(message).trim() : '',
    handled: false,
    createdAt: new Date().toISOString(),
  };

  const quotes = loadQuotes();
  quotes.push(quote);
  saveQuotes(quotes);

  res.status(201).json({ success: true, id: quote.id });
});

module.exports = router;

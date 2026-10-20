const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'quotes.json');

function loadQuotes() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
  return raw ? JSON.parse(raw) : [];
}

function saveQuotes(quotes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(quotes, null, 2));
}

module.exports = { loadQuotes, saveQuotes };

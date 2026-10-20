// Site-wide business details.
// Backed by server/data/site-config.json so the Admin > Site Settings page
// can edit contact info at runtime without touching code.
//
// Admin credentials come from environment variables (ADMIN_USERNAME /
// ADMIN_PASSWORD) when set, e.g. on Render, so the real password never has
// to live in this file. Falls back to the local-dev defaults below.
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'site-config.json');

const DEFAULTS = {
  siteName: 'REVA Acoustic',
  tagline: 'Acoustic Wall Panels by EZLIFE',
  contact: {
    email: 'info@revaacoustic.com',
    phone: '+1 (555) 010-2024',
    whatsapp: '+15550102024',
    address: '123 Design District, Your City, Your Country',
    hours: 'Mon - Sat, 9:00 AM - 6:00 PM',
  },
  social: {
    instagram: '',
    facebook: '',
    pinterest: '',
  },
};

function readConfig() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULTS;
  }
}

function writeConfig(nextConfig) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextConfig, null, 2));
}

const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'reva-admin-2026', // local-dev fallback only
};

module.exports = { readConfig, writeConfig, ADMIN };

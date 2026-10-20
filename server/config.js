// Site-wide business details.
// Backed by a JSON file so the Admin > Site Settings page can edit contact
// info at runtime without touching code. On Render, set REVA_DATA_DIR to a
// mounted persistent-disk path (for example /var/data).
//
// Admin credentials come from environment variables (ADMIN_USERNAME /
// ADMIN_PASSWORD) when set, e.g. on Render, so the real password never has
// to live in this file. Falls back to the local-dev defaults below.
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.REVA_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'site-config.json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REMOTE_CONFIG_ENABLED = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

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
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(nextConfig, null, 2));
}

async function readRemoteConfig() {
  if (!REMOTE_CONFIG_ENABLED) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/site_config?id=eq.default&select=data`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!response.ok) throw new Error(`Supabase config read failed (${response.status})`);
  const rows = await response.json();
  return rows[0]?.data ? { ...DEFAULTS, ...rows[0].data } : null;
}

async function writeRemoteConfig(nextConfig) {
  if (!REMOTE_CONFIG_ENABLED) return false;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/site_config`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ id: 'default', data: nextConfig, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Supabase config write failed (${response.status})`);
  return true;
}

async function getConfig() {
  if (REMOTE_CONFIG_ENABLED) {
    const remote = await readRemoteConfig();
    if (remote) return remote;
  }
  return readConfig();
}

async function saveConfig(nextConfig) {
  if (REMOTE_CONFIG_ENABLED) {
    await writeRemoteConfig(nextConfig);
    return nextConfig;
  }
  writeConfig(nextConfig);
  return nextConfig;
}

const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'reva-admin-2026', // local-dev fallback only
};

module.exports = { readConfig, writeConfig, getConfig, saveConfig, ADMIN };

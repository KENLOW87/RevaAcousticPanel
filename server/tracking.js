const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATS_DIR = path.join(__dirname, 'data', 'stats');

/* ---- cookies -------------------------------------------------------- */

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function serializeCookie(name, value, opts = {}) {
  let str = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`;
  if (opts.maxAge) str += `; Max-Age=${opts.maxAge}`;
  return str;
}

function randomToken() {
  return crypto.randomBytes(16).toString('hex');
}

/* ---- classification -------------------------------------------------- */

function isBotRequest(ua) {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python|facebookexternalhit|lighthouse/i.test(ua);
}

function detectDevice(ua) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (xff ? xff.split(',')[0].trim() : '') ||
    req.socket.remoteAddress ||
    ''
  );
}

function getCountry(req) {
  return req.headers['cf-ipcountry'] || 'Unknown';
}

const LLM_ENGINES = [
  [/chat\.openai\.com|chatgpt\.com|openai\.com/i, 'ChatGPT'],
  [/gemini\.google\.com|bard\.google\.com/i, 'Gemini'],
  [/perplexity\.ai/i, 'Perplexity'],
  [/claude\.ai/i, 'Claude'],
  [/copilot\.microsoft\.com|copilot\.cloud\.microsoft/i, 'Copilot'],
  [/you\.com/i, 'You.com'],
  [/poe\.com/i, 'Poe'],
];

const GENERAL_ENGINES = [
  [/google/i, 'Google'],
  [/bing/i, 'Bing'],
  [/yahoo/i, 'Yahoo'],
  [/duckduckgo/i, 'DuckDuckGo'],
  [/baidu/i, 'Baidu'],
  [/facebook/i, 'Facebook'],
  [/instagram/i, 'Instagram'],
  [/tiktok/i, 'TikTok'],
  [/t\.co|twitter/i, 'X/Twitter'],
  [/linkedin/i, 'LinkedIn'],
  [/youtube/i, 'YouTube'],
  [/wa\.me|whatsapp/i, 'WhatsApp'],
];

const LLM_LABELS = new Set(LLM_ENGINES.map(([, label]) => label));
const SEO_LABELS = new Set(['Google', 'Bing', 'Yahoo', 'DuckDuckGo', 'Baidu']);
const SOCIAL_LABELS = new Set(['Facebook', 'Instagram', 'TikTok', 'X/Twitter', 'LinkedIn', 'YouTube', 'WhatsApp']);

function classifyEngine(referrer, requestHost) {
  if (!referrer) return 'Direct';
  let host = '';
  try {
    host = new URL(referrer).hostname;
  } catch (e) {
    return 'Direct';
  }
  if (!host) return 'Direct';
  if (requestHost && host.replace(/^www\./, '') === String(requestHost).replace(/^www\./, '')) {
    return 'Internal';
  }
  for (const [re, label] of LLM_ENGINES) {
    if (re.test(host)) return label;
  }
  for (const [re, label] of GENERAL_ENGINES) {
    if (re.test(host)) return label;
  }
  return host.replace(/^www\./, '');
}

function classifySourceClass(engineLabel) {
  if (!engineLabel || engineLabel === 'Direct' || engineLabel === 'Internal') return 'DIRECT';
  if (LLM_LABELS.has(engineLabel)) return 'AI';
  if (SEO_LABELS.has(engineLabel)) return 'SEO';
  if (SOCIAL_LABELS.has(engineLabel)) return 'SOCIAL';
  return 'REFERRAL';
}

function classifySearchType(keyword) {
  const kw = String(keyword || '').trim();
  if (/^[A-Za-z]{1,4}[\s-]?\d{1,5}[A-Za-z]?$/.test(kw)) return 'Product Code';
  if (/\s/.test(kw)) return 'Phrase';
  return 'Keyword';
}

/* ---- paths / dates ----------------------------------------------------- */

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toMonthKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function pageNameFromPath(reqPath) {
  if (!reqPath || reqPath === '/') return 'index.html';
  return reqPath.replace(/^\/+/, '');
}

function ensureStatsDir() {
  fs.mkdirSync(STATS_DIR, { recursive: true });
}

/* ---- monthly aggregate -------------------------------------------------- */

function aggregatePath(monthKey) {
  return path.join(STATS_DIR, `monthly-${monthKey}.json`);
}

function getMonthlyAggregate(monthKey) {
  try {
    const raw = fs.readFileSync(aggregatePath(monthKey), 'utf8');
    const data = JSON.parse(raw);
    return {
      days: data.days || {},
      pages: data.pages || {},
      landing: data.landing || {},
      actions: data.actions || {},
    };
  } catch (e) {
    return { days: {}, pages: {}, landing: {}, actions: {} };
  }
}

function saveAggregate(monthKey, data) {
  ensureStatsDir();
  fs.writeFileSync(aggregatePath(monthKey), JSON.stringify(data, null, 2));
}

/* ---- append-only logs ---------------------------------------------------- */

function logPath(kind, monthKey) {
  return path.join(STATS_DIR, `${kind}-${monthKey}.jsonl`);
}

function appendLog(kind, monthKey, row) {
  ensureStatsDir();
  fs.appendFileSync(logPath(kind, monthKey), `${JSON.stringify(row)}\n`);
}

function readLog(kind, monthKey) {
  try {
    const raw = fs.readFileSync(logPath(kind, monthKey), 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function readLandingsLog(monthKey) {
  return readLog('landings', monthKey);
}

function readSearchesLog(monthKey) {
  return readLog('searches', monthKey);
}

function readClicksLog(monthKey, action) {
  const rows = readLog('clicks', monthKey);
  return action ? rows.filter((r) => r.a === action) : rows;
}

function listAvailableMonths(kind) {
  let files = [];
  try {
    files = fs.readdirSync(STATS_DIR);
  } catch (e) {
    return [];
  }
  const prefix = `${kind}-`;
  const months = new Set();
  files.forEach((f) => {
    if (f.startsWith(prefix)) {
      const m = f.slice(prefix.length).replace(/\.(json|jsonl)$/, '');
      if (/^\d{4}-\d{2}$/.test(m)) months.add(m);
    }
  });
  return Array.from(months).sort().reverse();
}

function uniqueByIp(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = row.i || `t${row.t}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/* ---- recording ----------------------------------------------------------- */

function recordPageView(req, res) {
  const ua = req.headers['user-agent'] || '';
  if (isBotRequest(ua)) return;

  const page = pageNameFromPath(req.path);
  const cookies = parseCookies(req);
  const now = new Date();
  const monthKey = toMonthKey(now);
  const dateKey = toDateKey(now);

  const isNewUnique = !cookies.vid;
  const isNewVisit = !cookies.sid;

  const setCookies = [];
  if (isNewUnique) setCookies.push(serializeCookie('vid', randomToken(), { maxAge: 60 * 60 * 24 * 365 }));
  if (isNewVisit) setCookies.push(serializeCookie('sid', randomToken()));

  const agg = getMonthlyAggregate(monthKey);
  if (!agg.days[dateKey]) agg.days[dateKey] = { v: 0, u: 0 };
  agg.days[dateKey].v += 1;
  if (isNewUnique) agg.days[dateKey].u += 1;
  agg.pages[page] = (agg.pages[page] || 0) + 1;

  if (isNewVisit) {
    agg.landing[page] = (agg.landing[page] || 0) + 1;
    const referrer = req.headers.referer || req.headers.referrer || '';
    const engine = classifyEngine(referrer, req.hostname);
    appendLog('landings', monthKey, {
      t: now.getTime(),
      p: page,
      i: getClientIp(req),
      d: detectDevice(ua),
      e: engine,
      c: getCountry(req),
      r: referrer.slice(0, 220),
    });
  }

  saveAggregate(monthKey, agg);

  if (setCookies.length) {
    res.setHeader('Set-Cookie', setCookies);
  }
}

function recordClick({ action, page }, req) {
  const ua = req.headers['user-agent'] || '';
  if (isBotRequest(ua)) return;
  if (!action) return;

  const now = new Date();
  const monthKey = toMonthKey(now);
  const referrer = req.headers.referer || req.headers.referrer || '';
  const engine = classifyEngine(referrer, req.hostname);
  const sourceClass = classifySourceClass(engine);

  const agg = getMonthlyAggregate(monthKey);
  agg.actions[action] = (agg.actions[action] || 0) + 1;
  saveAggregate(monthKey, agg);

  appendLog('clicks', monthKey, {
    t: now.getTime(),
    a: action,
    p: page || '',
    i: getClientIp(req),
    d: detectDevice(ua),
    e: engine,
    s: sourceClass,
    c: getCountry(req),
  });
}

function recordSearch({ keyword, page, resultCount }, req) {
  const ua = req.headers['user-agent'] || '';
  if (isBotRequest(ua)) return { skipped: true, setCookie: null };

  const kw = String(keyword || '').trim();
  if (!kw) return { skipped: true, setCookie: null };

  const hash = crypto.createHash('sha1').update(kw.toLowerCase()).digest('hex').slice(0, 16);
  const cookieName = `srch_${hash}`;
  const cookies = parseCookies(req);
  if (cookies[cookieName]) return { skipped: true, setCookie: null };

  const now = new Date();
  const monthKey = toMonthKey(now);
  appendLog('searches', monthKey, {
    t: now.getTime(),
    k: kw,
    y: classifySearchType(kw),
    f: page || '',
    r: Number.isFinite(resultCount) ? resultCount : null,
    i: getClientIp(req),
    d: detectDevice(ua),
  });

  return { skipped: false, setCookie: serializeCookie(cookieName, '1', { maxAge: 60 * 30 }) };
}

module.exports = {
  isBotRequest,
  detectDevice,
  getClientIp,
  getCountry,
  classifyEngine,
  classifySourceClass,
  classifySearchType,
  toMonthKey,
  toDateKey,
  getMonthlyAggregate,
  readLandingsLog,
  readSearchesLog,
  readClicksLog,
  listAvailableMonths,
  uniqueByIp,
  recordPageView,
  recordClick,
  recordSearch,
};

const express = require('express');
const tracking = require('../tracking');
const goalStore = require('../goalStore');

const router = express.Router();

const MAX_ROWS = 2000;
const PLATFORM_EXCLUDE = new Set(['Direct', 'Internal']);

function pad2(n) {
  return String(n).padStart(2, '0');
}

function lastNMonthKeys(n, endMonthKey) {
  let year, month;
  if (endMonthKey && /^\d{4}-\d{2}$/.test(endMonthKey)) {
    [year, month] = endMonthKey.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    let y = year;
    let m = month - i;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    out.push(`${y}-${pad2(m)}`);
  }
  return out;
}

function sumValues(obj) {
  return Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

function dateRangeArray(start, end) {
  const out = [];
  const d = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  while (d <= endD) {
    out.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function buildDailySeries() {
  const out = {};
  tracking.listAvailableMonths('monthly').forEach((m) => {
    const agg = tracking.getMonthlyAggregate(m);
    Object.entries(agg.days || {}).forEach(([date, v]) => {
      out[date] = v;
    });
  });
  return out;
}

function engineGroupsForMonth(monthKey) {
  const rows = tracking.readLandingsLog(monthKey).filter((r) => !PLATFORM_EXCLUDE.has(r.e));
  const byEngine = {};
  rows.forEach((r) => {
    if (!byEngine[r.e]) byEngine[r.e] = [];
    byEngine[r.e].push(r);
  });
  return byEngine;
}

// ---- Landing Pages ----
router.get('/landing', (req, res) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : tracking.toMonthKey(new Date());
  const top = req.query.top === '1';

  const months = lastNMonthKeys(12, month);
  const chart = months.map((m) => ({
    month: m,
    total: sumValues(tracking.getMonthlyAggregate(m).landing),
  }));

  const currentMonthTotal = sumValues(tracking.getMonthlyAggregate(tracking.toMonthKey(new Date())).landing);
  const lifetimeTotal = tracking
    .listAvailableMonths('monthly')
    .reduce((sum, m) => sum + sumValues(tracking.getMonthlyAggregate(m).landing), 0);

  const rows = tracking.readLandingsLog(month).sort((a, b) => b.t - a.t);

  let deviceSplit = { desktopPct: 0, mobilePct: 0 };
  if (rows.length) {
    const desktop = rows.filter((r) => r.d === 'desktop').length;
    const mobileLike = rows.length - desktop;
    deviceSplit = {
      desktopPct: Math.round((desktop / rows.length) * 1000) / 10,
      mobilePct: Math.round((mobileLike / rows.length) * 1000) / 10,
    };
  }

  let top50 = null;
  if (top) {
    const byPage = {};
    rows.forEach((r) => {
      byPage[r.p] = (byPage[r.p] || 0) + 1;
    });
    top50 = Object.entries(byPage)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  res.json({
    month,
    availableMonths: tracking.listAvailableMonths('monthly'),
    chart,
    currentMonthTotal,
    lifetimeTotal,
    deviceSplit,
    rows: rows.slice(0, MAX_ROWS),
    top50,
  });
});

// ---- Website Search ----
router.get('/search', (req, res) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : tracking.toMonthKey(new Date());
  const top = req.query.top === '1';

  const months = lastNMonthKeys(12, month);
  const chart = months.map((m) => ({ month: m, total: tracking.readSearchesLog(m).length }));

  const currentMonthTotal = tracking.readSearchesLog(tracking.toMonthKey(new Date())).length;
  const lifetimeTotal = tracking
    .listAvailableMonths('searches')
    .reduce((sum, m) => sum + tracking.readSearchesLog(m).length, 0);

  const rows = tracking.readSearchesLog(month).sort((a, b) => b.t - a.t);

  let top50 = null;
  if (top) {
    const byKeyword = {};
    rows.forEach((r) => {
      if (!byKeyword[r.k]) byKeyword[r.k] = { keyword: r.k, type: r.y, count: 0, resultSum: 0, zeroResults: 0 };
      byKeyword[r.k].count += 1;
      byKeyword[r.k].resultSum += Number(r.r) || 0;
      if (!r.r) byKeyword[r.k].zeroResults += 1;
    });
    top50 = Object.values(byKeyword)
      .map((k) => ({ ...k, avgResults: Math.round((k.resultSum / k.count) * 10) / 10 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }

  res.json({
    month,
    availableMonths: tracking.listAvailableMonths('searches'),
    chart,
    currentMonthTotal,
    lifetimeTotal,
    rows: rows.slice(0, MAX_ROWS),
    top50,
  });
});

// ---- WhatsApp Click Report ----
router.get('/whatsapp', (req, res) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
  const month = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : tracking.toMonthKey(new Date());

  const months = lastNMonthKeys(12, month);
  const chart = months.map((m) => ({
    month: m,
    total: (tracking.getMonthlyAggregate(m).actions || {}).whatsapp || 0,
  }));

  const currentMonthTotal = (tracking.getMonthlyAggregate(tracking.toMonthKey(new Date())).actions || {}).whatsapp || 0;
  const lifetimeTotal = tracking
    .listAvailableMonths('monthly')
    .reduce((sum, m) => sum + ((tracking.getMonthlyAggregate(m).actions || {}).whatsapp || 0), 0);

  const rows = tracking.readClicksLog(month, 'whatsapp').sort((a, b) => b.t - a.t);

  res.json({
    month,
    availableMonths: tracking.listAvailableMonths('monthly'),
    chart,
    currentMonthTotal,
    lifetimeTotal,
    rows: rows.slice(0, MAX_ROWS),
  });
});

// ---- Platform Traffic ----
router.get('/platform', (req, res) => {
  const now = new Date();
  const curMonth = tracking.toMonthKey(now);
  const prevMonth = tracking.toMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const lifeByEngine = {};
  tracking.listAvailableMonths('landings').forEach((m) => {
    const groups = engineGroupsForMonth(m);
    Object.entries(groups).forEach(([engine, rows]) => {
      if (!lifeByEngine[engine]) lifeByEngine[engine] = { ips: new Set(), since: null, host: null };
      rows.forEach((r) => {
        const key = r.i || `t${r.t}`;
        lifeByEngine[engine].ips.add(key);
        if (!lifeByEngine[engine].since || r.t < lifeByEngine[engine].since) lifeByEngine[engine].since = r.t;
        if (!lifeByEngine[engine].host && r.r) {
          try {
            lifeByEngine[engine].host = new URL(r.r).hostname;
          } catch (e) {
            // malformed referrer, leave host unset
          }
        }
      });
    });
  });

  function uniqueCountsForMonth(monthKey) {
    const groups = engineGroupsForMonth(monthKey);
    const out = {};
    Object.entries(groups).forEach(([engine, rows]) => {
      out[engine] = tracking.uniqueByIp(rows).length;
    });
    return out;
  }

  const monthCounts = uniqueCountsForMonth(curMonth);
  const prevCounts = uniqueCountsForMonth(prevMonth);

  const platforms = Object.keys(lifeByEngine)
    .map((engine) => ({
      engine,
      lifetime: lifeByEngine[engine].ips.size,
      thisMonth: monthCounts[engine] || 0,
      lastMonth: prevCounts[engine] || 0,
      since: lifeByEngine[engine].since,
      host: lifeByEngine[engine].host,
    }))
    .sort((a, b) => b.lifetime - a.lifetime);

  const chart = lastNMonthKeys(6, curMonth).map((m) => {
    const rows = tracking.readLandingsLog(m).filter((r) => !PLATFORM_EXCLUDE.has(r.e));
    return { month: m, total: tracking.uniqueByIp(rows).length };
  });

  const recent = []
    .concat(tracking.readLandingsLog(curMonth))
    .concat(curMonth === prevMonth ? [] : tracking.readLandingsLog(prevMonth))
    .filter((r) => !PLATFORM_EXCLUDE.has(r.e))
    .sort((a, b) => b.t - a.t)
    .slice(0, 30);

  res.json({ platforms, chart, recent });
});

// ---- Traffic Guarantee ----
router.get('/goal', (req, res) => {
  const goal = goalStore.loadGoal();
  const daily = buildDailySeries();
  const dates = Object.keys(daily).sort();
  const today = tracking.toDateKey(new Date());

  const start = goal.start || dates[0] || today;
  const target = goal.target || 15000;
  let until = goal.until;
  if (!until) {
    const d = new Date(`${start}T00:00:00`);
    d.setFullYear(d.getFullYear() + 2);
    until = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const usingDefaults = !goal.start || !goal.target || !goal.until;

  const windowEnd = until < today ? until : today;
  const series = dateRangeArray(start, windowEnd).map((date) => {
    const w = (daily[date] && daily[date].u) || 0;
    return { date, w, p: 0, a: w };
  });

  const sumW = series.reduce((s, r) => s + r.w, 0);
  const sumA = sumW;
  const target_ = target > 0 ? target : 1;
  const progressPct = Math.min(100, Math.round((sumA / target_) * 1000) / 10);

  let achievedDate = null;
  let running = 0;
  for (const row of series) {
    running += row.a;
    if (!achievedDate && running >= target) achievedDate = row.date;
  }

  function extreme(key) {
    const withData = series.filter((r) => r.a > 0);
    if (!withData.length) return { high: null, low: null };
    let high = withData[0];
    let low = withData[0];
    withData.forEach((r) => {
      if (r[key] > high[key]) high = r;
      if (r[key] < low[key]) low = r;
    });
    return { high: { value: high[key], date: high.date }, low: { value: low[key], date: low.date } };
  }

  const days = series.length || 1;
  const websiteExtreme = extreme('w');
  const combinedExtreme = extreme('a');

  res.json({
    goal: { start, target, until, usingDefaults },
    progressPct,
    sumW,
    sumP: 0,
    sumA,
    achievedDate,
    stats: {
      website: { avg: Math.round((sumW / days) * 10) / 10, ...websiteExtreme },
      portal: { avg: 0, high: null, low: null },
      combined: { avg: Math.round((sumA / days) * 10) / 10, ...combinedExtreme },
    },
    series,
  });
});

// ---- Purge test/dummy data ----
router.get('/purge-preview', (req, res) => {
  const before = typeof req.query.before === 'string' ? req.query.before : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return res.status(400).json({ error: 'Enter a valid cutoff date (YYYY-MM-DD).' });
  }
  res.json(tracking.purgeBefore(before, { dryRun: true }));
});

router.post('/purge', (req, res) => {
  const { before } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(before)) {
    return res.status(400).json({ error: 'Enter a valid cutoff date (YYYY-MM-DD).' });
  }
  const summary = tracking.purgeBefore(before, { dryRun: false });
  res.json({ success: true, ...summary });
});

router.put('/goal', (req, res) => {
  const { start, target, until } = req.body || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    return res.status(400).json({ error: 'Enter both a start date and a deadline.' });
  }
  if (new Date(until) <= new Date(start)) {
    return res.status(400).json({ error: 'The deadline must be after the start date.' });
  }
  const t = Number(target);
  if (!Number.isFinite(t) || t < 1) {
    return res.status(400).json({ error: 'Enter a visitor goal of at least 1.' });
  }
  goalStore.saveGoal({ start, target: Math.floor(t), until });
  res.json({ success: true });
});

module.exports = router;

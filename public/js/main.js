// Shared behaviour across every page: mobile nav toggle + injecting live
// business/contact details (pulled from /api/config) into footer & header.

(function () {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  document.querySelectorAll('.nav-product-menu').forEach((menu) => {
    const trigger = menu.querySelector('.nav-product-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', (event) => {
      if (window.matchMedia('(max-width: 860px)').matches) {
        // First tap opens the mobile menu; tapping Products again follows the catalog link.
        if (menu.classList.contains('open')) return;
        event.preventDefault();
        menu.classList.add('open');
      }
    });
  });
})();

// Build the Products mega-menu from the catalog so new series appear there
// automatically. Empty planned series stay visible as Coming Soon.
(function () {
  const seriesOrder = ['A Series', 'B Series', 'C Series'];
  const categoryOrder = [
    'Geometric / Facet',
    'Linear / Ribbed',
    'Chevron / Rhythm',
    'Curves / Arch',
    'Grid / Tiles',
    'Wave / Organic',
    'Other designs',
  ];
  const menus = document.querySelectorAll('.nav-product-dropdown');
  if (!menus.length) return;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  async function buildProductMenus() {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('products fetch failed');
      const products = await response.json();
      const groups = new Map(seriesOrder.map((series) => [series, products.filter((product) => product.series === series)]));

      menus.forEach((menu) => {
        menu.querySelector('.nav-product-list').innerHTML = [...groups.entries()].map(([series, items]) => {
          if (!items.length) {
            return `<div class="nav-series-menu-block is-coming-soon"><div class="nav-series-menu-heading"><span>${escapeHtml(series)}</span><span class="nav-series-badge">Coming soon</span></div><p>Products will be available soon.</p></div>`;
          }
          const categories = new Map();
          items.forEach((product) => {
            const category = product.category || 'Other designs';
            if (!categories.has(category)) categories.set(category, []);
            categories.get(category).push(product);
          });
          const categoryMarkup = [...categories.keys()]
            .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
            .map((category) => {
              const links = categories.get(category).map((product) => {
                const shortName = String(product.name || '').replace(/^REVA\s+/, '');
                return `<a href="/product.html?id=${encodeURIComponent(product.id)}" role="menuitem"><span class="nav-product-code">${escapeHtml(product.id)}</span><span class="nav-product-name">${escapeHtml(shortName)}</span></a>`;
              }).join('');
              return `<div class="nav-series-category"><span class="nav-series-category-label">${escapeHtml(category)}</span><div class="nav-product-grid">${links}</div></div>`;
            }).join('');
          return `<div class="nav-series-menu-block"><div class="nav-series-menu-heading"><span>${escapeHtml(series)}</span><small>${items.length} designs</small></div>${categoryMarkup}</div>`;
        }).join('');
      });
    } catch (error) {
      console.error('Could not build product menu', error);
    }
  }

  buildProductMenus();
})();

// First-visit callout nudging shoppers toward "Request a Quote".
(function () {
  const callout = document.getElementById('quote-callout');
  if (!callout) return;

  const closeBtn = callout.querySelector('.quote-callout-close');
  const STORAGE_KEY = 'reva-quote-callout-dismissed';

  function dismiss() {
    callout.classList.remove('visible');
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (err) {
      /* sessionStorage unavailable, ignore */
    }
  }

  let alreadyDismissed = false;
  try {
    alreadyDismissed = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (err) {
    alreadyDismissed = false;
  }
  if (alreadyDismissed) return;

  setTimeout(() => callout.classList.add('visible'), 1200);

  if (closeBtn) closeBtn.addEventListener('click', dismiss);
  document.addEventListener('click', (e) => {
    if (!callout.contains(e.target) && !e.target.closest('.quote-cta-wrap')) dismiss();
  });
})();

// Fire-and-forget click tracking for outbound WhatsApp links. Purely
// observational — never blocks or alters the link's own navigation.
(function () {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    if (!/wa\.me|api\.whatsapp|whatsapp\.com/i.test(link.href)) return;

    const page = location.pathname.replace(/^\/+/, '') || 'index.html';
    const payload = JSON.stringify({ action: 'whatsapp', page });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/click', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  });
})();

async function loadSiteConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('config fetch failed');
    const config = await res.json();
    applySiteConfig(config);
    return config;
  } catch (err) {
    console.error('Could not load site config', err);
    return null;
  }
}

function applySiteConfig(config) {
  document.querySelectorAll('[data-contact="email"]').forEach((el) => {
    el.textContent = config.contact.email;
    if (el.tagName === 'A') el.href = `mailto:${config.contact.email}`;
  });
  document.querySelectorAll('[data-contact="phone"]').forEach((el) => {
    el.textContent = config.contact.phone;
    if (el.tagName === 'A') el.href = `tel:${config.contact.phone.replace(/[^+\d]/g, '')}`;
  });
  document.querySelectorAll('[data-contact="whatsapp-link"]').forEach((el) => {
    const digits = (config.contact.whatsapp || '').replace(/[^\d]/g, '');
    el.href = `https://wa.me/${digits}`;
  });
  document.querySelectorAll('[data-contact="address"]').forEach((el) => {
    el.textContent = config.contact.address;
  });
  document.querySelectorAll('[data-contact="hours"]').forEach((el) => {
    el.textContent = config.contact.hours;
  });
  document.querySelectorAll('[data-contact="year"]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

document.addEventListener('DOMContentLoaded', loadSiteConfig);

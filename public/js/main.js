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

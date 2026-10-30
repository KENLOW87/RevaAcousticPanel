// Server-side rendering for /product.html so each design gets a unique,
// crawlable title/meta/canonical/structured-data in the raw HTTP response
// (not just injected by product-detail.js after JS runs) — search engines
// that don't execute JS, and link unfurlers like WhatsApp/Facebook, only
// ever see this version.
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://revaacousticpanel.onrender.com';
const TEMPLATE_PATH = path.join(__dirname, '..', 'public', 'product.html');
const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function absoluteUrl(src) {
  return new URL(src, BASE_URL).href;
}

function renderHead(html, { title, description, canonicalUrl, ogType, imageUrl }) {
  return html
    .replace(
      /<title>.*?<\/title>/,
      `<title>${escapeHtml(title)}</title>`
    )
    .replace(
      /<meta name="description" content=".*?" \/>/,
      `<meta name="description" content="${escapeAttr(description)}" />`
    )
    .replace(
      /<link rel="canonical" href=".*?" \/>/,
      `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`
    )
    .replace(
      /<meta property="og:type" content=".*?" \/>/,
      `<meta property="og:type" content="${ogType}" />`
    )
    .replace(
      /<meta property="og:title" content=".*?" \/>/,
      `<meta property="og:title" content="${escapeAttr(title)}" />`
    )
    .replace(
      /<meta property="og:description" content=".*?" \/>/,
      `<meta property="og:description" content="${escapeAttr(description)}" />`
    )
    .replace(
      /<meta property="og:url" content=".*?" \/>/,
      `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`
    )
    .replace(
      /<meta property="og:image" content=".*?" \/>/,
      `<meta property="og:image" content="${escapeAttr(imageUrl)}" />`
    )
    .replace(
      /<meta name="twitter:card" content="summary_large_image" \/>/,
      `<meta name="twitter:card" content="summary_large_image" />\n` +
        `<meta name="twitter:title" content="${escapeAttr(title)}" />\n` +
        `<meta name="twitter:description" content="${escapeAttr(description)}" />\n` +
        `<meta name="twitter:image" content="${escapeAttr(imageUrl)}" />`
    );
}

function injectStructuredData(html, json) {
  const script = `<script type="application/ld+json" id="product-structured-data">${JSON.stringify(json)}</script>\n</head>`;
  return html.replace('</head>', script);
}

function buildTitle(product) {
  return `${product.name} Acoustic Wall Panel | REVA Acoustic`;
}

function buildDescription(product) {
  return `${product.name} is a ${product.category.split(' / ')[0].toLowerCase()} acoustic wall panel from REVA Acoustic, available in ${product.colors.length} finishes. Request a quote for Malaysia delivery.`;
}

function renderProductDetail(product) {
  const activeColor = product.colors[0];
  const swatches = product.colors
    .map(
      (c) =>
        `<button class="pd-swatch${c.code === activeColor.code ? ' active' : ''}" style="background:${escapeAttr(c.hex)}" title="${escapeAttr(c.name)}" aria-label="${escapeAttr(c.name)}"></button>`
    )
    .join('');

  return `
      <div class="breadcrumb">
        <a href="/">Home</a> / <a href="/products.html">Products</a> / ${escapeHtml(product.name)}
      </div>
      <div class="pd-layout">
        <div class="pd-image">
          <img id="pd-img" src="${escapeAttr(activeColor.image)}" alt="${escapeAttr(product.name)} - ${escapeAttr(activeColor.name)}" />
        </div>
        <div class="pd-info">
          <div class="pd-sku">${escapeHtml(product.sku)} &middot; ${escapeHtml(product.series)}</div>
          <h1 class="pd-title">${escapeHtml(product.name)}</h1>
          <p class="pd-desc">${escapeHtml(product.description)}</p>

          <div class="pd-colors">
            <div class="label-row">
              <span>Finish</span>
              <span id="pd-color-name">${escapeHtml(activeColor.name)}</span>
            </div>
            <div class="pd-swatch-row" id="pd-swatch-row">${swatches}</div>
            <p class="upcoming-finish-note">More colours coming soon</p>
          </div>

          <dl class="pd-specs">
            <div><dt>Collection</dt><dd>${escapeHtml(product.collection)}</dd></div>
            <div><dt>Design code</dt><dd>${escapeHtml(product.id)}</dd></div>
            <div><dt>Material</dt><dd>${escapeHtml(product.material)}</dd></div>
            <div><dt>Panel size</dt><dd>${product.size.width_mm} x ${product.size.length_mm} x ${product.size.thickness_mm} mm (W x L x T)</dd></div>
            <div><dt>Available finishes</dt><dd>${product.colors.length}</dd></div>
            <div><dt>Mounting</dt><dd>Wall-mounted panel</dd></div>
          </dl>

          <div class="pd-actions">
            <a class="btn btn-primary" href="/contact.html?product=${encodeURIComponent(product.id)}&color=${encodeURIComponent(activeColor.code)}&name=${encodeURIComponent(product.name)}">Request a Quote</a>
            <a class="btn btn-whatsapp" data-whatsapp-product data-product-id="${escapeAttr(product.id)}" data-product-code="${escapeAttr(product.sku || product.id)}" href="#" target="_blank" rel="noopener">WhatsApp</a>
            <a class="btn btn-outline" href="/products.html">&larr; Back to catalog</a>
          </div>
        </div>
      </div>
    `;
}

function renderProductPage(product) {
  const canonicalUrl = `${BASE_URL}/product.html?id=${encodeURIComponent(product.id)}`;
  const title = buildTitle(product);
  const description = buildDescription(product);
  const imageUrl = absoluteUrl(product.colors[0].image);

  let html = renderHead(template, {
    title,
    description,
    canonicalUrl,
    ogType: 'product',
    imageUrl,
  });

  html = injectStructuredData(html, {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description,
    sku: product.sku || product.id,
    image: product.colors.map((c) => absoluteUrl(c.image)),
    brand: { '@type': 'Brand', name: 'REVA Acoustic' },
    category: 'Acoustic wall panels',
    url: canonicalUrl,
    material: product.material,
    color: product.colors.map((c) => c.name).join(', '),
  });

  html = html
    .replace(
      '<div class="container" id="product-detail">\n    <p class="loading-row">Loading design...</p>\n  </div>',
      `<div class="container" id="product-detail">${renderProductDetail(product)}</div>`
    )
    .replace('See more A Series designs', `See more ${escapeHtml(product.series)} designs`);

  return html;
}

function renderNotFound() {
  const title = 'Design Not Found | REVA Acoustic';
  const description = 'That REVA Acoustic design could not be found. Browse the full wall panel catalog.';
  const canonicalUrl = `${BASE_URL}/products.html`;
  const imageUrl = `${BASE_URL}/images/brand/hero-banner.jpg`;

  let html = renderHead(template, {
    title,
    description,
    canonicalUrl,
    ogType: 'website',
    imageUrl,
  });

  html = html.replace(
    '<div class="container" id="product-detail">\n    <p class="loading-row">Loading design...</p>\n  </div>',
    `<div class="container" id="product-detail"><p class="loading-row">That design could not be found. <a href="/products.html">Back to catalog</a>.</p></div>`
  );

  return html;
}

module.exports = { renderProductPage, renderNotFound };

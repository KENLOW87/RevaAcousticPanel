// Regenerates public/sitemap.xml from the current active product catalog.
// Run after adding/removing designs so every product.html?id= URL stays listed.
const fs = require('fs');
const path = require('path');

const { getAllProducts } = require('../productsStore');

const BASE_URL = 'https://revaacousticpanel.onrender.com';
const OUT_PATH = path.join(__dirname, '..', '..', 'public', 'sitemap.xml');

const staticPaths = ['/', '/products.html', '/about.html', '/contact.html'];

function buildSitemap() {
  const products = getAllProducts();
  const urls = [
    ...staticPaths.map((p) => `${BASE_URL}${p}`),
    ...products.map((p) => `${BASE_URL}/product.html?id=${encodeURIComponent(p.id)}`),
  ];

  const body = urls.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

if (require.main === module) {
  const xml = buildSitemap();
  fs.writeFileSync(OUT_PATH, xml);
  console.log(`Wrote ${OUT_PATH}`);
}

module.exports = { buildSitemap };

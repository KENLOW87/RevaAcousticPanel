// Scans public/images/products/{Series}/{Design}/{COLOR}.{ext} and
// (re)generates server/data/products.json.
//
// To add a new series later: drop a new folder in public/images/products/
// (e.g. "B Series"), with one subfolder per design, each containing its
// finish images (same DC/LC/MG/... naming as A Series, or entirely new
// codes — unrecognized codes just get a grey placeholder color + their raw
// code as a name until renamed in Admin > Finishes). Then re-run this
// script (`npm run build:products`). Admin edits (name/description/active
// per product, and finish names) live in separate override files and are
// never touched by this script.
const fs = require('fs');
const path = require('path');

const PRODUCTS_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'products');
const OUT_FILE = path.join(__dirname, '..', 'data', 'products.json');

const COLORS = require('../colorDefaults');

function naturalSort(a, b) {
  const numA = parseInt(a.replace(/\D/g, ''), 10);
  const numB = parseInt(b.replace(/\D/g, ''), 10);
  if (Number.isNaN(numA) || Number.isNaN(numB)) return a.localeCompare(b);
  return numA - numB;
}

function listDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function imageUrl(...segments) {
  return '/' + segments.map(encodeURIComponent).join('/');
}

function build() {
  const seriesDirs = listDirs(PRODUCTS_DIR).sort();
  const products = [];

  seriesDirs.forEach((seriesId) => {
    const seriesPath = path.join(PRODUCTS_DIR, seriesId);
    const designDirs = listDirs(seriesPath).sort(naturalSort);

    designDirs.forEach((designId) => {
      const designPath = path.join(seriesPath, designId);
      const files = fs.readdirSync(designPath).filter((f) => /\.(png|jpe?g)$/i.test(f));
      if (files.length === 0) return; // empty design folder - skip

      const colors = files
        .map((file) => {
          const code = path.basename(file, path.extname(file)).toUpperCase();
          const meta = COLORS[code] || { name: code, hex: '#CCCCCC' };
          return {
            code,
            name: meta.name,
            hex: meta.hex,
            image: imageUrl('images', 'products', seriesId, designId, file),
          };
        })
        .sort((a, b) => a.code.localeCompare(b.code));

      products.push({
        id: designId,
        sku: `APF-${designId}`,
        name: `REVA Acoustic Panel ${designId}`,
        series: seriesId,
        collection: 'Acoustic PET Fibre Wall Panel',
        description:
          'Decorative acoustic PET fibre wall panel engineered to soften sound reflections while adding a tailored, geometric texture to the wall.',
        material: 'PET fibre (polyester acoustic fibre)',
        size: { width_mm: 1200, length_mm: 2400, thickness_mm: 9 },
        colors,
        defaultImage: colors[0] ? colors[0].image : null,
      });
    });
  });

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(products, null, 2));
  console.log(`Wrote ${products.length} products across ${seriesDirs.length} series to ${OUT_FILE}`);
}

build();

const express = require('express');
const { getAllProducts, getProduct, getFinishes } = require('../productsStore');

const router = express.Router();

// GET /api/products - list active products, optional ?color=OY filter
router.get('/', (req, res) => {
  const products = getAllProducts();
  const { color } = req.query;

  if (!color) {
    return res.json(products);
  }

  const filtered = products.filter((p) =>
    p.colors.some((c) => c.code.toLowerCase() === String(color).toLowerCase())
  );
  res.json(filtered);
});

// GET /api/products/colors - list all finishes available across the active catalog
router.get('/colors', (req, res) => {
  const products = getAllProducts();
  const usedCodes = new Set(products.flatMap((p) => p.colors.map((c) => c.code)));
  const finishes = getFinishes().filter((f) => usedCodes.has(f.code));
  res.json(finishes);
});

// GET /api/products/:id - single active product by design id (e.g. A1)
router.get('/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

module.exports = router;

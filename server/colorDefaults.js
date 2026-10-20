// Default name/hex for each finish code found in the product images.
// Admin > Finishes can override these at runtime (see productsStore.js) —
// this module stays the fallback, and is also used by the one-time
// build-products.js scan.
module.exports = {
  DC: { name: 'Dark Camel', hex: '#8B7765' },
  LC: { name: 'Light Camel', hex: '#E8E1D6' },
  MG: { name: 'Dark Grey', hex: '#5C6570' },
  OY: { name: 'Orange Yellow', hex: '#E8A91C' },
  WG: { name: 'Water Grey', hex: '#C9CDD3' },
};

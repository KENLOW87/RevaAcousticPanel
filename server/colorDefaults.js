// Default name/hex for each finish code found in the product images.
// Admin > Finishes can override these at runtime (see productsStore.js) —
// this module stays the fallback, and is also used by the one-time
// build-products.js scan.
module.exports = {
  BW: { name: 'Blue White', hex: '#718CA5' },
  DC: { name: 'Dark Camel', hex: '#8B7765' },
  GB: { name: 'Green Black', hex: '#475347' },
  LC: { name: 'Light Camel', hex: '#E8E1D6' },
  MG: { name: 'Moonlight Grey', hex: '#5C6570' },
  OM: { name: 'Oatmeal', hex: '#BF9F62' },
  OY: { name: 'Orange Yellow', hex: '#E8A91C' },
  WG: { name: 'Water Grey', hex: '#C9CDD3' },
};

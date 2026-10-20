// Product detail page: load one design by ?id=, render gallery + color
// swatches, and wire the "Request a Quote" button to prefill the quote form.

(function () {
  const mount = document.getElementById('product-detail');
  if (!mount) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    mount.innerHTML = '<p class="loading-row">No design selected. Go back to the <a href="/products.html">catalog</a>.</p>';
    return;
  }

  async function init() {
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('not found');
      const product = await res.json();
      render(product);
    } catch (err) {
      mount.innerHTML = `<p class="loading-row">That design could not be found. <a href="/products.html">Back to catalog</a>.</p>`;
    }
  }

  function render(product) {
    document.title = `${product.name} — REVA Acoustic`;

    let activeColor = product.colors[0];

    mount.innerHTML = `
      <div class="breadcrumb">
        <a href="/">Home</a> / <a href="/products.html">Products</a> / ${product.name}
      </div>
      <div class="pd-layout">
        <div class="pd-image">
          <img id="pd-img" src="${activeColor.image}" alt="${product.name} - ${activeColor.name}" />
        </div>
        <div class="pd-info">
          <div class="pd-sku">${product.sku} &middot; ${product.series}</div>
          <h1 class="pd-title">${product.name}</h1>
          <p class="pd-desc">${product.description}</p>

          <div class="pd-colors">
            <div class="label-row">
              <span>Finish</span>
              <span id="pd-color-name">${activeColor.name}</span>
            </div>
            <div class="pd-swatch-row" id="pd-swatch-row"></div>
          </div>

          <dl class="pd-specs">
            <div><dt>Collection</dt><dd>${product.collection}</dd></div>
            <div><dt>Design code</dt><dd>${product.id}</dd></div>
            <div><dt>Material</dt><dd>${product.material}</dd></div>
            <div><dt>Panel size</dt><dd>${product.size.width_mm} x ${product.size.length_mm} x ${product.size.thickness_mm} mm (W x L x T)</dd></div>
            <div><dt>Available finishes</dt><dd>${product.colors.length}</dd></div>
            <div><dt>Mounting</dt><dd>Wall-mounted panel</dd></div>
          </dl>

          <div class="pd-actions">
            <button class="btn btn-primary" id="pd-quote-btn">Request a Quote</button>
            <a class="btn btn-outline" href="/products.html">&larr; Back to catalog</a>
          </div>
        </div>
      </div>
    `;

    const imgEl = document.getElementById('pd-img');
    const colorNameEl = document.getElementById('pd-color-name');
    const swatchRow = document.getElementById('pd-swatch-row');
    const quoteBtn = document.getElementById('pd-quote-btn');

    product.colors.forEach((color) => {
      const btn = document.createElement('button');
      btn.className = 'pd-swatch' + (color.code === activeColor.code ? ' active' : '');
      btn.style.background = color.hex;
      btn.title = color.name;
      btn.setAttribute('aria-label', color.name);
      btn.addEventListener('click', () => {
        activeColor = color;
        imgEl.src = color.image;
        imgEl.alt = `${product.name} - ${color.name}`;
        colorNameEl.textContent = color.name;
        swatchRow.querySelectorAll('.pd-swatch').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
      });
      swatchRow.appendChild(btn);
    });

    quoteBtn.addEventListener('click', () => {
      const url = `/contact.html?product=${encodeURIComponent(product.id)}&color=${encodeURIComponent(activeColor.code)}&name=${encodeURIComponent(product.name)}`;
      window.location.href = url;
    });
  }

  init();
})();

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
    const pageUrl = `${window.location.origin}/product.html?id=${encodeURIComponent(product.id)}`;
    const description = `${product.name} acoustic wall panel by REVA Acoustic. Explore available finishes, specifications and request a quote.`;
    document.title = `${product.name} Acoustic Wall Panel — REVA Acoustic`;
    setMeta('description', description);
    setMeta('og:title', `${product.name} Acoustic Wall Panel — REVA Acoustic`, true);
    setMeta('og:description', description, true);
    setMeta('og:url', pageUrl, true);
    setMeta('og:image', new URL(product.colors[0].image, window.location.origin).href, true);
    setMeta('twitter:title', `${product.name} Acoustic Wall Panel — REVA Acoustic`, true);
    setMeta('twitter:description', description, true);
    setMeta('twitter:image', new URL(product.colors[0].image, window.location.origin).href, true);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = pageUrl;
    addProductStructuredData(product, pageUrl, description);
    window.setWhatsAppProduct?.(product);

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
            <p class="upcoming-finish-note">More colours coming soon</p>
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
            <a class="btn btn-whatsapp" data-whatsapp-product data-product-id="${product.id}" data-product-code="${product.sku || product.id}" href="#" target="_blank" rel="noopener">WhatsApp</a>
            <a class="btn btn-outline" href="/products.html">&larr; Back to catalog</a>
          </div>
        </div>
      </div>
    `;

    const imgEl = document.getElementById('pd-img');
    const colorNameEl = document.getElementById('pd-color-name');
    const swatchRow = document.getElementById('pd-swatch-row');
    const quoteBtn = document.getElementById('pd-quote-btn');
    window.applyProductWhatsappLinks?.();

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

  function setMeta(name, content, isProperty = false) {
    const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(isProperty ? 'property' : 'name', name);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function addProductStructuredData(product, pageUrl, description) {
    const existing = document.getElementById('product-structured-data');
    existing?.remove();
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      sku: product.sku || product.id,
      image: product.colors.map((color) => new URL(color.image, window.location.origin).href),
      brand: { '@type': 'Brand', name: 'REVA Acoustic' },
      category: 'Acoustic wall panels',
      url: pageUrl,
      material: product.material,
      color: product.colors.map((color) => color.name).join(', ')
    };
    const script = document.createElement('script');
    script.id = 'product-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  init();
})();

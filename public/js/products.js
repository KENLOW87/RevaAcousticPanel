// Catalog page: fetch products, render grid, handle color filter + search,
// and let a shopper swap each card's thumbnail by hovering/clicking a swatch.

(function () {
  const grid = document.getElementById('product-grid');
  const filterRow = document.getElementById('color-filters');
  const searchInput = document.getElementById('product-search');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');

  if (!grid) return;

  let allProducts = [];
  let allColors = [];
  let activeColor = null;
  let searchTerm = '';
  let lastResultCount = 0;
  let searchReportTimer = null;

  async function init() {
    try {
      const [productsRes, colorsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/colors'),
      ]);
      allProducts = await productsRes.json();
      allColors = await colorsRes.json();
      renderFilters();
      render();
    } catch (err) {
      grid.innerHTML = '<p class="loading-row">Could not load the catalog. Please refresh.</p>';
      console.error(err);
    }
  }

  function renderFilters() {
    if (!filterRow) return;
    const allPill = document.createElement('button');
    allPill.className = 'pill active';
    allPill.textContent = 'All finishes';
    allPill.addEventListener('click', () => setActiveColor(null));
    filterRow.appendChild(allPill);

    allColors.forEach((color) => {
      const pill = document.createElement('button');
      pill.className = 'pill';
      pill.innerHTML = `<span class="dot" style="background:${color.hex}"></span>${color.name}`;
      pill.addEventListener('click', () => setActiveColor(color.code, pill));
      filterRow.appendChild(pill);
    });
  }

  function setActiveColor(code, pillEl) {
    activeColor = code;
    filterRow.querySelectorAll('.pill').forEach((p) => p.classList.remove('active'));
    if (pillEl) {
      pillEl.classList.add('active');
    } else {
      filterRow.querySelector('.pill').classList.add('active');
    }
    render();
  }

  function matchesSearch(product) {
    if (!searchTerm) return true;
    const haystack = `${product.id} ${product.sku} ${product.name}`.toLowerCase();
    return haystack.includes(searchTerm);
  }

  function matchesColor(product) {
    if (!activeColor) return true;
    return product.colors.some((c) => c.code === activeColor);
  }

  function render() {
    const filtered = allProducts.filter((p) => matchesColor(p) && matchesSearch(p));
    lastResultCount = filtered.length;

    if (resultCount) {
      resultCount.textContent = `${filtered.length} design${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    filtered.forEach((product) => {
      grid.appendChild(renderCard(product));
    });
  }

  function renderCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    const displayColors = activeColor
      ? product.colors.filter((c) => c.code === activeColor)
      : product.colors;
    const initialColor = displayColors[0] || product.colors[0];

    card.innerHTML = `
      <a class="thumb" href="/product.html?id=${product.id}">
        <img src="${initialColor.image}" alt="${product.name} - ${initialColor.name}" loading="lazy" />
      </a>
      <div class="body">
        <div class="sku">${product.sku}</div>
        <h3>${product.name}</h3>
        <div class="swatches"></div>
        <a class="card-link" href="/product.html?id=${product.id}">
          View design <span class="arrow">&rarr;</span>
        </a>
      </div>
    `;

    const img = card.querySelector('img');
    const swatchRow = card.querySelector('.swatches');

    product.colors.forEach((color, idx) => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (color.code === initialColor.code ? ' active' : '');
      btn.style.background = color.hex;
      btn.title = color.name;
      btn.setAttribute('aria-label', color.name);
      btn.addEventListener('mouseenter', () => {
        img.src = color.image;
        img.alt = `${product.name} - ${color.name}`;
        swatchRow.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
        btn.classList.add('active');
      });
      swatchRow.appendChild(btn);
    });

    return card;
  }

  function reportSearch(keyword) {
    if (!keyword) return;
    fetch('/api/track/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword,
        page: location.pathname.replace(/^\/+/, '') || 'index.html',
        resultCount: lastResultCount,
      }),
    }).catch(() => {});
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      render();

      clearTimeout(searchReportTimer);
      const keyword = searchTerm;
      searchReportTimer = setTimeout(() => reportSearch(keyword), 600);
    });
  }

  init();
})();

// Catalog page: fetch products, render grid, handle color filter + search,
// and let a shopper swap each card's thumbnail by hovering/clicking a swatch.

(function () {
  const grid = document.getElementById('product-grid');
  const filterRow = document.getElementById('color-filters');
  const searchInput = document.getElementById('product-search');
  const resultCount = document.getElementById('result-count');
  const emptyState = document.getElementById('empty-state');
  const seriesFilters = document.getElementById('series-filters');
  const seriesLabel = document.getElementById('catalog-series-label');
  const catalogTitle = document.getElementById('catalog-title');
  const catalogDescription = document.getElementById('catalog-description');
  const categoryNav = document.getElementById('category-nav');

  if (!grid) return;

  let allProducts = [];
  let allColors = [];
  let activeColor = null;
  const seriesOrder = ['A Series', 'B Series', 'C Series'];
  const requestedSeries = new URLSearchParams(location.search).get('series');
  let activeSeries = requestedSeries ? `${requestedSeries.replace(/\s+Series$/i, '')} Series` : 'A Series';
  let searchTerm = '';
  let lastResultCount = 0;
  let searchReportTimer = null;
  const categoryOrder = [
    'Geometric / Facet',
    'Linear / Ribbed',
    'Chevron / Rhythm',
    'Curves / Arch',
    'Grid / Tiles',
    'Wave / Organic',
    'Other designs',
  ];

  async function init() {
    try {
      const [productsRes, colorsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/products/colors'),
      ]);
      allProducts = await productsRes.json();
      allColors = await colorsRes.json();
      if (!seriesOrder.includes(activeSeries)) activeSeries = 'A Series';
      renderSeriesFilters();
      renderFilters();
      render();
    } catch (err) {
      grid.innerHTML = '<p class="loading-row">Could not load the catalog. Please refresh.</p>';
      console.error(err);
    }
  }

  function renderSeriesFilters() {
    if (!seriesFilters) return;
    seriesFilters.innerHTML = '';
    seriesOrder.forEach((series) => {
      const count = allProducts.filter((product) => product.series === series).length;
      const button = document.createElement('button');
      button.className = `series-tab${series === activeSeries ? ' active' : ''}`;
      button.type = 'button';
      button.innerHTML = `<span>${series}</span><small>${count ? `${count} designs` : 'Coming soon'}</small>`;
      button.addEventListener('click', () => {
        activeSeries = series;
        const url = new URL(location.href);
        url.searchParams.set('series', series.replace(' Series', ''));
        history.replaceState(null, '', url);
        seriesFilters.querySelectorAll('.series-tab').forEach((tab) => tab.classList.remove('active'));
        button.classList.add('active');
        activeColor = null;
        renderFilters();
        render();
      });
      seriesFilters.appendChild(button);
    });
  }

  function renderFilters() {
    if (!filterRow) return;
    filterRow.innerHTML = '';
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
    const seriesProducts = allProducts.filter((p) => p.series === activeSeries);
    const filtered = seriesProducts.filter((p) => matchesColor(p) && matchesSearch(p));
    lastResultCount = filtered.length;

    const seriesName = activeSeries.replace(' Series', '');
    const hasProducts = seriesProducts.length > 0;
    if (seriesLabel) seriesLabel.textContent = activeSeries;
    if (catalogTitle) catalogTitle.textContent = hasProducts ? `${activeSeries} Acoustic Panel Catalog` : `${activeSeries} Coming Soon`;
    if (catalogDescription) {
      catalogDescription.textContent = hasProducts
        ? `${seriesProducts.length} designs, each available in 5 finishes. Filter by finish or search a design code to find the right panel.`
        : `We are preparing the ${seriesName} product collection. Check back soon for the latest REVA Acoustic designs.`;
    }

    if (resultCount) {
      resultCount.textContent = `${filtered.length} design${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (emptyState) emptyState.innerHTML = hasProducts
        ? '<p>No designs match your filters. Try clearing the search or finish filter.</p>'
        : '<div class="coming-soon-panel"><span class="eyebrow">REVA Acoustic</span><h2>Coming soon</h2><p>This series is being prepared and will be available here once the products are uploaded.</p></div>';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    const grouped = new Map();
    filtered.forEach((product) => {
      const category = product.category || 'Other designs';
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push(product);
    });

    const sortedCategories = [...grouped.keys()]
      .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
    if (categoryNav) {
      categoryNav.innerHTML = sortedCategories.map((category) => {
        const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `<a href="#category-${slug}"><span>${category}</span><small>${grouped.get(category).length}</small></a>`;
      }).join('');
      categoryNav.parentElement.style.display = sortedCategories.length ? '' : 'none';
    }

    sortedCategories.forEach((category) => {
        const items = grouped.get(category);
        const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const categorySection = document.createElement('section');
        categorySection.className = 'product-category';
        categorySection.id = `category-${slug}`;
        categorySection.innerHTML = `
          <div class="product-category-head">
            <div><span class="eyebrow">Collection</span><h2>${category}</h2></div>
            <span class="product-category-count">${items.length} design${items.length === 1 ? '' : 's'}</span>
          </div>
          <div class="product-grid category-grid"></div>
        `;
        const categoryGrid = categorySection.querySelector('.category-grid');
        items.forEach((product) => categoryGrid.appendChild(renderCard(product)));
        grid.appendChild(categorySection);
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

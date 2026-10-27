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
  const catalogPager = document.getElementById('catalog-pager');

  if (!grid) return;

  let allProducts = [];
  let allColors = [];
  let activeColor = null;
  let activeCategory = null;
  const seriesOrder = ['A Series', 'B Series', 'C Series'];
  const requestedSeries = new URLSearchParams(location.search).get('series');
  let activeSeries = requestedSeries ? `${requestedSeries.replace(/\s+Series$/i, '')} Series` : 'A Series';
  let searchTerm = '';
  let lastResultCount = 0;
  let searchReportTimer = null;
  let currentPage = 1;
  const pageSize = 6;
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
        activeCategory = null;
        currentPage = 1;
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

    const upcoming = document.createElement('span');
    upcoming.className = 'upcoming-finish-pill';
    upcoming.textContent = 'More colours coming soon';
    filterRow.appendChild(upcoming);
  }

  function setActiveColor(code, pillEl) {
    activeColor = code;
    currentPage = 1;
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

  function matchesCategory(product) {
    return !activeCategory || (product.category || 'Other designs') === activeCategory;
  }

  function compareProductCode(a, b) {
    const codeA = String(a.sku || a.id || '').toUpperCase();
    const codeB = String(b.sku || b.id || '').toUpperCase();
    const prefixA = codeA.replace(/\d+/g, '');
    const prefixB = codeB.replace(/\d+/g, '');
    if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
    const numberA = Number(codeA.match(/\d+/)?.[0] || 0);
    const numberB = Number(codeB.match(/\d+/)?.[0] || 0);
    return numberA - numberB || codeA.localeCompare(codeB);
  }

  function render() {
    const seriesProducts = allProducts.filter((p) => p.series === activeSeries);
    const baseFiltered = seriesProducts.filter((p) => matchesColor(p) && matchesSearch(p));
    const filtered = baseFiltered.filter(matchesCategory);
    lastResultCount = filtered.length;

    const seriesName = activeSeries.replace(' Series', '');
    const hasProducts = seriesProducts.length > 0;
    if (seriesLabel) seriesLabel.textContent = activeSeries;
    if (catalogTitle) catalogTitle.textContent = hasProducts ? `${activeSeries} PET Acoustic Wall Panel Designs` : `${activeSeries} Coming Soon`;
    if (catalogDescription) {
      catalogDescription.textContent = hasProducts
        ? `Explore ${seriesProducts.length} decorative PET acoustic wall panel designs in 5 finishes for homes, offices and studios in Malaysia. Filter by finish or search a design code to find the right panel.`
        : `We are preparing the ${seriesName} product collection. Check back soon for the latest REVA Acoustic designs.`;
    }

    if (resultCount) {
      resultCount.textContent = `${filtered.length} design${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (catalogPager) {
        catalogPager.innerHTML = '';
        catalogPager.hidden = true;
      }
      if (emptyState) emptyState.style.display = 'block';
      if (emptyState) emptyState.innerHTML = hasProducts
        ? '<p>No designs match your filters. Try clearing the search or finish filter.</p>'
        : '<div class="coming-soon-panel"><span class="eyebrow">REVA Acoustic</span><h2>Coming soon</h2><p>This series is being prepared and will be available here once the products are uploaded.</p></div>';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    window.applyProductWhatsappLinks?.();

    const navigationGrouped = new Map();
    baseFiltered.forEach((product) => {
      const category = product.category || 'Other designs';
      if (!navigationGrouped.has(category)) navigationGrouped.set(category, []);
      navigationGrouped.get(category).push(product);
    });

    const sortedCategories = [...navigationGrouped.keys()]
      .sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b))
    if (categoryNav) {
      const allLink = `<a class="category-all${activeCategory ? '' : ' is-active'}" href="#product-grid" data-category=""><span>All</span><small>${baseFiltered.length}</small></a>`;
      categoryNav.innerHTML = allLink + sortedCategories.map((category) => {
        const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const activeClass = category === activeCategory ? ' is-active' : '';
        return `<a class="${activeClass.trim()}" href="#category-${slug}" data-category="${category}"><span>${category}</span><small>${navigationGrouped.get(category).length}</small></a>`;
      }).join('');
      categoryNav.parentElement.style.display = sortedCategories.length ? '' : 'none';
      categoryNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          activeCategory = link.dataset.category || null;
          currentPage = 1;
          const slug = activeCategory
            ? activeCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            : 'product-grid';
          history.replaceState(null, '', `${location.pathname}${location.search}#${activeCategory ? `category-${slug}` : 'product-grid'}`);
          render();
          document.querySelector('.products-catalog-layout')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    const sortedProducts = [...filtered].sort(compareProductCode);
    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageStart = (currentPage - 1) * pageSize;
    const pageProducts = sortedProducts.slice(pageStart, pageStart + pageSize);
    const pageCategory = activeCategory || 'All designs';
    const categorySection = document.createElement('section');
    categorySection.className = 'product-category catalog-page';
    categorySection.innerHTML = `
      <div class="product-category-head">
        <div><span class="eyebrow">Collection</span><h2>${pageCategory}</h2></div>
        <span class="product-category-count">Showing ${pageStart + 1}-${Math.min(pageStart + pageSize, sortedProducts.length)} of ${sortedProducts.length}</span>
      </div>
      <div class="product-grid category-grid"></div>
    `;
    const categoryGrid = categorySection.querySelector('.category-grid');
    pageProducts.forEach((product) => categoryGrid.appendChild(renderCard(product)));
    grid.appendChild(categorySection);
    renderPager(totalPages);
  }

  function renderPager(totalPages) {
    if (!catalogPager) return;
    if (totalPages <= 1) {
      catalogPager.innerHTML = '';
      catalogPager.hidden = true;
      return;
    }
    catalogPager.hidden = false;
    const buttons = [];
    buttons.push(`<button type="button" class="pager-button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>`);
    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(`<button type="button" class="pager-number${page === currentPage ? ' active' : ''}" data-page="${page}" aria-label="Page ${page}" ${page === currentPage ? 'aria-current="page"' : ''}>${page}</button>`);
    }
    buttons.push(`<button type="button" class="pager-button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`);
    catalogPager.innerHTML = buttons.join('');
    catalogPager.querySelectorAll('button:not([disabled])').forEach((button) => {
      button.addEventListener('click', () => {
        currentPage = Number(button.dataset.page);
        render();
        document.querySelector('.catalog-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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
        <div class="card-actions">
          <a class="card-link" href="/product.html?id=${product.id}">
            View design <span class="arrow">&rarr;</span>
          </a>
          <a class="product-whatsapp-link" data-whatsapp-product data-product-id="${product.id}" data-product-code="${product.sku || product.id}" href="#" target="_blank" rel="noopener">WhatsApp</a>
        </div>
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
      currentPage = 1;
      render();

      clearTimeout(searchReportTimer);
      const keyword = searchTerm;
      searchReportTimer = setTimeout(() => reportSearch(keyword), 600);
    });
  }

  init();
})();

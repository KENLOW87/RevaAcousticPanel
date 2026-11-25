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
  const sidebar = categoryNav?.closest('aside');
  const sidebarTitle = sidebar?.querySelector('h2');
  const toolbar = document.querySelector('.catalog-toolbar');
  const catalogPager = document.getElementById('catalog-pager');

  if (!grid) return;

  let allProducts = [];
  let allColors = [];
  let activeColor = null;
  let activeCategory = null;
  const allProductsTab = 'All Products';
  const dualLayerTab = 'Dual Layer Series';
  const dualLayerSeries = ['AMF Series', 'BMF Series'];
  const seriesOrder = [allProductsTab, 'A Series', 'B Series', 'C Series', dualLayerTab];
  const requestedSeries = new URLSearchParams(location.search).get('series')?.replace(/\s+Series$/i, '');
  const requestedTab = ['AMF', 'BMF', 'Dual Layer'].includes(requestedSeries) ? 'Dual-Layer' : requestedSeries;
  let activeSeries = seriesOrder.find((series) => seriesQuery(series) === requestedTab) || allProductsTab;

  function seriesQuery(series) {
    if (series === allProductsTab) return 'All';
    if (series === dualLayerTab) return 'Dual-Layer';
    return series.replace(' Series', '');
  }

  function productsForSeries(series) {
    if (series === allProductsTab) return allProducts;
    const includedSeries = series === dualLayerTab ? dualLayerSeries : [series];
    return allProducts.filter((product) => includedSeries.includes(product.series));
  }
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
      const products = productsForSeries(series);
      const count = products.length;
      const comingSoon = series !== allProductsTab && products.some((product) => product.comingSoon);
      const button = document.createElement('button');
      button.className = `series-tab${series === activeSeries ? ' active' : ''}`;
      button.type = 'button';
      button.innerHTML = `<span>${series}</span><small>${count && !comingSoon ? `${count} designs` : 'Coming soon'}</small>`;
      button.addEventListener('click', () => {
        activeSeries = series;
        const url = new URL(location.href);
        url.searchParams.set('series', seriesQuery(series));
        history.replaceState(null, '', url);
        seriesFilters.querySelectorAll('.series-tab').forEach((tab) => tab.classList.remove('active'));
        button.classList.add('active');
        activeColor = null;
        activeCategory = null;
        if (series === allProductsTab) {
          searchTerm = '';
          if (searchInput) searchInput.value = '';
        }
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

    const seriesColors = new Set(productsForSeries(activeSeries)
      .flatMap((product) => product.colors.map((color) => color.code)));
    const visibleColors = allColors.filter((color) => seriesColors.has(color.code));
    visibleColors.sort((a, b) => Number(Boolean(a.comingSoon)) - Number(Boolean(b.comingSoon)));
    visibleColors.forEach((color) => {
      const pill = document.createElement('button');
      pill.className = 'pill';
      pill.innerHTML = `<span class="dot" data-finish="${color.code}" style="background-color:${color.hex}"></span>${color.name}${color.comingSoon ? ' · Coming soon' : ''}`;
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

  function browseCategory(product) {
    return activeSeries === dualLayerTab ? seriesQuery(product.series) : (product.category || 'Other designs');
  }

  function matchesCategory(product) {
    return !activeCategory || browseCategory(product) === activeCategory;
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

  function renderSeriesOverview() {
    if (catalogDescription) catalogDescription.textContent = 'Scroll through all designs or choose a series to browse its categories and finishes.';
    if (emptyState) emptyState.style.display = 'none';
    renderPager(1);

    const seriesList = seriesOrder.filter((series) => series !== allProductsTab);
    if (categoryNav) {
      categoryNav.innerHTML = `<a class="category-all is-active" href="#product-grid" aria-current="true"><span>All Products</span><small>${allProducts.length}</small></a>`
        + seriesList.map((series) => {
          const href = `?series=${encodeURIComponent(seriesQuery(series))}`;
          const products = productsForSeries(series);
          const status = !products.length || products.some((product) => product.comingSoon)
            ? 'Coming soon'
            : `${products.length} designs`;
          return `<a href="${href}"><span>${series}</span><small>${status}</small></a>`;
        }).join('');
    }

    grid.replaceChildren();
    seriesList.flatMap((series) => series === dualLayerTab ? dualLayerSeries : [series]).forEach((series) => {
      const products = productsForSeries(series).sort(compareProductCode);
      const isDualLayer = dualLayerSeries.includes(series);
      const status = !products.length || products.some((product) => product.comingSoon)
        ? 'Coming soon'
        : `${products.length} designs`;
      const section = document.createElement('section');
      section.className = 'product-category catalog-page';
      section.innerHTML = `
        <div class="product-category-head">
          <div>${isDualLayer ? `<span class="eyebrow">${dualLayerTab}</span>` : ''}<h2>${series}</h2></div>
          <span class="product-category-count">${status}</span>
        </div>
        <div class="product-grid category-grid"></div>
      `;
      const seriesGrid = section.querySelector('.category-grid');
      products.forEach((product) => seriesGrid.appendChild(renderCard(product)));
      grid.appendChild(section);
    });
    window.applyProductWhatsappLinks?.();
  }

  function render() {
    const isOverview = activeSeries === allProductsTab;
    const isDualLayer = activeSeries === dualLayerTab;
    if (toolbar) toolbar.style.display = isOverview ? 'none' : '';
    if (sidebar) {
      sidebar.style.display = '';
      sidebar.setAttribute('aria-label', isOverview || isDualLayer ? 'Product series' : 'Product categories');
    }
    if (sidebarTitle) sidebarTitle.textContent = isOverview || isDualLayer ? 'Series' : 'Category';

    const seriesProducts = productsForSeries(activeSeries);
    const baseFiltered = seriesProducts.filter((p) => matchesColor(p) && matchesSearch(p));
    const filtered = baseFiltered.filter(matchesCategory);
    lastResultCount = filtered.length;

    const seriesName = activeSeries.replace(' Series', '');
    const hasProducts = seriesProducts.length > 0;
    const finishCount = new Set(seriesProducts.flatMap((product) => product.colors.map((color) => color.code))).size;
    if (seriesLabel) seriesLabel.textContent = activeSeries;
    if (catalogTitle) {
      catalogTitle.textContent = activeSeries === allProductsTab
        ? allProductsTab
        : `${activeSeries} ${hasProducts ? 'PET Acoustic Wall Panel Designs' : 'Coming Soon'}`;
    }
    if (isOverview) {
      renderSeriesOverview();
      return;
    }
    if (catalogDescription) {
      catalogDescription.textContent = hasProducts
        ? `Explore ${seriesProducts.length} decorative PET acoustic wall panel designs in ${finishCount} finishes for homes, offices and studios in Malaysia. Filter by finish or search a design code to find the right panel.`
        : `We are preparing the ${seriesName} product collection. Check back soon for the latest REVA Acoustic designs.`;
    }

    if (resultCount) {
      resultCount.textContent = `${filtered.length} design${filtered.length === 1 ? '' : 's'}`;
    }

    grid.innerHTML = '';

    const navigationGrouped = new Map();
    baseFiltered.forEach((product) => {
      const category = browseCategory(product);
      if (!navigationGrouped.has(category)) navigationGrouped.set(category, []);
      navigationGrouped.get(category).push(product);
    });

    const sortedCategories = isDualLayer
      ? dualLayerSeries.map(seriesQuery)
      : [...navigationGrouped.keys()].sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
    if (categoryNav) {
      const allLink = `<a class="category-all${activeCategory ? '' : ' is-active'}" href="#product-grid" data-category=""><span>${isDualLayer ? 'All Products' : 'All'}</span><small>${baseFiltered.length}</small></a>`;
      const catalogLink = `<a href="?series=All"><span>All Products</span><small>${allProducts.length}</small></a>`;
      categoryNav.innerHTML = (isDualLayer ? '' : catalogLink) + allLink + sortedCategories.map((category) => {
        const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const activeClass = category === activeCategory ? ' is-active' : '';
        return `<a class="${activeClass.trim()}" href="#category-${slug}" data-category="${category}"><span>${category}</span><small>${navigationGrouped.get(category)?.length ?? 0}</small></a>`;
      }).join('');
      categoryNav.parentElement.style.display = sortedCategories.length ? '' : 'none';
      categoryNav.querySelectorAll('a[data-category]').forEach((link) => {
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

    if (filtered.length === 0) {
      if (sidebar && !isDualLayer) sidebar.style.display = 'none';
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

    const sortedProducts = [...filtered].sort(compareProductCode);
    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageStart = (currentPage - 1) * pageSize;
    const pageProducts = sortedProducts.slice(pageStart, pageStart + pageSize);
    const pageCategory = activeCategory || (isDualLayer ? 'All Products' : 'All designs');
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
        <span class="card-finish-status" ${initialColor.comingSoon ? '' : 'hidden'}>Coming soon</span>
      </a>
      <div class="body">
        <div class="card-product-meta">
          <div class="sku">${product.sku}${product.comingSoon ? ' · Coming soon' : ''}</div>
          <span class="card-finish-name" aria-live="polite"></span>
        </div>
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

    const finishName = card.querySelector('.card-finish-name');
    const finishStatus = card.querySelector('.card-finish-status');
    finishName.textContent = initialColor.name;

    product.colors.forEach((color) => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (color.code === initialColor.code ? ' active' : '');
      btn.dataset.finish = color.code;
      btn.style.backgroundColor = color.hex;
      btn.title = color.comingSoon ? `${color.name} · Coming soon` : color.name;
      btn.setAttribute('aria-label', btn.title);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(color.code === initialColor.code));

      const selectFinish = () => {
        img.src = color.image;
        img.alt = `${product.name} - ${color.name}`;
        finishName.textContent = color.name;
        finishStatus.hidden = !color.comingSoon;
        const previous = swatchRow.querySelector('.swatch.active');
        previous?.classList.remove('active');
        previous?.setAttribute('aria-pressed', 'false');
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      };
      btn.addEventListener('mouseenter', selectFinish);
      btn.addEventListener('click', selectFinish);
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

(function () {
  const catalog = window.FINNESSE_CATALOG;

  const state = {
    category: 'All',
    collection: 'All',
    chapter: 'All',
    search: '',
    sort: 'featured',
    viewMode: 'lookbook',
    visibleCount: 36,
    showcaseProduct: null,
    showcaseImgIndex: 0,
    modalProduct: null,
    modalImgIndex: 0,
    modalSize: 'One Size (Stretch)',
    modalCustomCuff: '',
    modalQty: 1,
    bagOpen: false,
    bag: [],
    priceOverrides: {},
    orbitalAngle: 0,
    toastTimer: null,
  };

  const money = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n || 0);

  function showToast(msg) {
    const el = document.getElementById('toast-banner');
    const txt = document.getElementById('toast-text');
    if (!el || !txt) return;
    txt.textContent = msg;
    el.style.display = 'flex';
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.style.display = 'none';
    }, 4200);
  }

  function loadPersistedState() {
    try {
      const savedBag = JSON.parse(localStorage.getItem('finnesse_3d_bag') || '[]');
      if (Array.isArray(savedBag)) state.bag = savedBag;
      const savedPrices = JSON.parse(localStorage.getItem('finnesse_price_overrides') || '{}');
      if (savedPrices && typeof savedPrices === 'object') {
        state.priceOverrides = savedPrices;
        for (const p of catalog.products) {
          if (savedPrices[p.id]) {
            p.price = Number(savedPrices[p.id]);
            p.wholesalePrice = Math.round(p.price * 0.52);
          }
        }
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function saveBag() {
    try {
      localStorage.setItem('finnesse_3d_bag', JSON.stringify(state.bag));
    } catch (e) {}
    renderBagUI();
  }

  function getFilteredProducts() {
    const q = state.search.trim().toLowerCase();
    const list = catalog.products.filter((p) => {
      if (state.category !== 'All' && p.category !== state.category) return false;
      if (state.collection !== 'All' && p.collection !== state.collection) return false;
      if (state.chapter !== 'All' && p.chapter !== state.chapter) return false;
      if (q) {
        const hay = `${p.name} ${p.sku} ${p.collection} ${p.category} ${p.colorway} ${p.cuffText} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (state.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (state.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (state.sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sort === 'sku') list.sort((a, b) => a.sku.localeCompare(b.sku));

    return list;
  }

  function selectShowcaseProduct(product, imgIdx = 0, scrollToShowcase = false) {
    if (!product) return;
    state.showcaseProduct = product;
    state.showcaseImgIndex = Math.min(imgIdx, product.images.length - 1);

    const activeImg = document.getElementById('hero-active-img');
    if (activeImg) activeImg.src = product.images[state.showcaseImgIndex];

    const colPill = document.getElementById('showcase-collection-pill');
    if (colPill) colPill.textContent = `FLAGSHIP SHOWCASE · ${product.collection.toUpperCase()}`;

    const badgeEl = document.getElementById('hero-badge-tag');
    if (badgeEl) badgeEl.textContent = product.badge || product.category;

    const skuEl = document.getElementById('hero-sku-tag');
    if (skuEl) skuEl.textContent = product.sku;

    const chapEl = document.getElementById('hero-chapter-label');
    if (chapEl) chapEl.textContent = product.chapter;

    const titleEl = document.getElementById('hero-product-title');
    if (titleEl) titleEl.textContent = product.name;

    const priceEl = document.getElementById('hero-product-price');
    if (priceEl) priceEl.textContent = `${money(product.price)} USD`;

    const wsEl = document.getElementById('hero-product-wholesale');
    if (wsEl) wsEl.textContent = `5+ Wholesale: ${money(product.wholesalePrice)}`;

    const descEl = document.getElementById('hero-product-desc');
    if (descEl) descEl.textContent = product.description;

    const stitchEl = document.getElementById('hero-product-stitch');
    if (stitchEl) stitchEl.textContent = `${product.stitchSpec} · Colorway: ${product.colorway}`;

    const anglePills = document.getElementById('hero-angle-pills');
    if (anglePills) {
      const labels = ['Studio View', 'On-Model Look', 'Editorial View', 'Street View'];
      anglePills.innerHTML = product.images
        .map(
          (src, idx) => `
          <button type="button" class="mode-pill ${idx === state.showcaseImgIndex ? 'active' : ''}" data-hero-angle="${idx}">
            ${labels[idx] || `View ${idx + 1}`}
          </button>
        `
        )
        .join('');
      anglePills.querySelectorAll('[data-hero-angle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          selectShowcaseProduct(product, Number(btn.getAttribute('data-hero-angle')), false);
        });
      });
    }

    const secThumbs = document.getElementById('hero-secondary-thumbs');
    if (secThumbs) {
      secThumbs.innerHTML =
        product.images.length > 1
          ? product.images
              .map(
                (src, idx) => `
                <button type="button" class="angle-dot-btn ${idx === state.showcaseImgIndex ? 'active' : ''}" data-hero-thumb="${idx}" style="width:42px;height:42px;border-radius:8px;">
                  <img src="${src}" alt="View ${idx + 1}" />
                </button>
              `
              )
              .join('')
          : '';
      secThumbs.querySelectorAll('[data-hero-thumb]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectShowcaseProduct(product, Number(btn.getAttribute('data-hero-thumb')), false);
        });
      });
    }

    document.querySelectorAll('.preset-thumb-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.id === product.id);
    });

    if (scrollToShowcase) {
      document.getElementById('atelier-showcase-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function renderPresetStrip() {
    const strip = document.getElementById('swatch-preset-strip');
    if (!strip) return;
    const featuredIds = [
      'duval-jaguar-six-piece-collector-capsule',
      'duval-jaguar-signature-beanie',
      'noir-gold-signature-beanie',
      'cherry-crush-applique-beanie',
      'jaguar-after-dark-slash-beanie',
      'beach-wave-boardwalk-beanie',
      'midnight-web-spider-beanie',
      'violet-venom-flame-beanie',
      'grace-gold-cross-the-way-beanie',
      'cosmos-nebula-galaxy-cat-ear-beanie',
      'hacker-circuit-board-neon-cat-ear-beanie',
      'cloud-daydream-sky-cat-ear-beanie',
      'sunset-haze-ombre-beanie',
      'snow-jaguar-frost-beanie',
      'duval-game-day-crop-shorts-beanie-trio',
      'rose-jaguar-crimson-3pc-swim-hat-set',
    ];
    const presets = featuredIds
      .map((id) => catalog.products.find((p) => p.id === id))
      .filter(Boolean);

    strip.innerHTML = presets
      .map(
        (p) => `
        <button class="preset-thumb-btn ${state.showcaseProduct?.id === p.id ? 'active' : ''}" data-id="${p.id}">
          <img src="${p.images[0]}" alt="${p.name}" />
          <span>${p.name.replace(/Cat-Ear Beanie|3-Piece Swim & Hat Set/g, '').trim()}</span>
        </button>
      `
      )
      .join('');

    strip.querySelectorAll('.preset-thumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = catalog.products.find((x) => x.id === btn.dataset.id);
        if (p) selectShowcaseProduct(p, p.images.length > 1 ? 1 : 0, false);
      });
    });
  }

  function renderOriginVault() {
    const grid = document.getElementById('origin-vault-grid');
    if (!grid) return;
    grid.innerHTML = catalog.originVault
      .map(
        (item, idx) => `
        <article class="origin-card" data-origin-idx="${idx}">
          <div class="origin-img-wrap">
            <img src="${item.image}" alt="${item.title}" />
            <span class="origin-badge">${item.subtitle}</span>
          </div>
          <div class="origin-meta">
            <h4>${item.title}</h4>
            <p>${item.caption}</p>
          </div>
        </article>
      `
      )
      .join('');

    grid.querySelectorAll('.origin-card').forEach((card) => {
      card.addEventListener('click', () => {
        const item = catalog.originVault[Number(card.dataset.originIdx)];
        if (item) openLightbox(item.image, item.title, item.caption);
      });
    });
  }

  function renderCampaignGallery() {
    const grid = document.getElementById('campaigns-grid');
    if (!grid) return;
    grid.innerHTML = catalog.campaigns
      .map(
        (c, idx) => `
        <article class="campaign-card" data-camp-idx="${idx}">
          <img src="${c.image}" alt="${c.title}" />
          <div class="campaign-card-footer">
            <div>
              <span class="eyebrow-tag" style="font-size:10px;">${c.subtitle}</span>
              <h4 style="font-family:var(--display);font-size:24px;font-weight:800;">${c.title}</h4>
            </div>
            <span class="btn-pill btn-outline">Inspect Full Poster ↗</span>
          </div>
        </article>
      `
      )
      .join('');

    grid.querySelectorAll('.campaign-card').forEach((card) => {
      card.addEventListener('click', () => {
        const c = catalog.campaigns[Number(card.dataset.campIdx)];
        if (c) openLightbox(c.image, c.title, c.subtitle);
      });
    });
  }

  function renderOrbitalCarousel() {
    const cyl = document.getElementById('orbital-cylinder');
    if (!cyl) return;
    const filtered = getFilteredProducts();
    const items = (filtered.length >= 6 ? filtered : catalog.products).slice(0, 12);
    const count = items.length;
    const step = 360 / count;
    const radius = Math.round(250 / Math.tan(Math.PI / count)) + 40;

    cyl.innerHTML = items
      .map((p, idx) => {
        const angle = idx * step;
        return `
          <div class="orbital-card" data-id="${p.id}" style="transform: rotateY(${angle}deg) translateZ(${radius}px);">
            <img src="${p.images[0]}" alt="${p.name}" />
            <div class="orbital-card-info">
              <span style="font-family:var(--mono);font-size:9px;color:var(--teal);">${p.collection}</span>
              <h4>${p.name}</h4>
              <div class="orb-meta">
                <strong>${money(p.price)}</strong>
                <span>Inspect →</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    cyl.style.transform = `translateZ(-${radius}px) rotateY(${state.orbitalAngle}deg)`;

    cyl.querySelectorAll('.orbital-card').forEach((card) => {
      card.addEventListener('click', () => {
        const p = catalog.products.find((x) => x.id === card.dataset.id);
        if (p) openProductModal(p);
      });
    });
  }

  function setupOrbitalControls() {
    const stage = document.getElementById('orbital-ring-stage');
    const cyl = document.getElementById('orbital-cylinder');
    if (!stage || !cyl) return;

    let dragging = false;
    let startX = 0;
    let startAngle = 0;

    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      dragging = true;
      startX = e.clientX;
      startAngle = state.orbitalAngle;
    });

    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      state.orbitalAngle = startAngle + dx * 0.35;
      renderOrbitalTransform();
    });

    window.addEventListener('pointerup', () => {
      dragging = false;
    });

    document.getElementById('orb-prev-btn')?.addEventListener('click', () => {
      state.orbitalAngle += 30;
      renderOrbitalTransform();
    });
    document.getElementById('orb-next-btn')?.addEventListener('click', () => {
      state.orbitalAngle -= 30;
      renderOrbitalTransform();
    });
  }

  function renderOrbitalTransform() {
    const cyl = document.getElementById('orbital-cylinder');
    if (!cyl) return;
    const count = Math.max(6, cyl.children.length || 12);
    const radius = Math.round(250 / Math.tan(Math.PI / count)) + 40;
    cyl.style.transform = `translateZ(-${radius}px) rotateY(${state.orbitalAngle}deg)`;
  }

  function renderHeroStats() {
    const prods = catalog.products || [];
    const prices = prods.map((p) => p.price).filter((n) => n > 0);
    const chapters = Array.from(new Set(prods.map((p) => p.chapter)));
    const imgs = catalog.counts?.totalUniqueImages || 0;
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('stat-skus', String(prods.length));
    set('stat-images', String(imgs));
    set('stat-range', prices.length ? `${money(Math.min(...prices))}–${money(Math.max(...prices))}` : '—');
    set('stat-chapters', String(chapters.length));
    const ann = document.getElementById('announce-counts');
    if (ann) {
      const couture = prods.filter((p) => p.category === 'Atelier Couture').length;
      ann.textContent = `${prods.length} PRICED DESIGNS · ${imgs} ARCHIVE PHOTOS · ${couture} ATELIER COUTURE LOOKS · WHOLESALE 5+ TIER AUTO-UNLOCKED`;
    }
  }

  function renderCategoryPills() {
    const wrap = document.getElementById('category-pills');
    if (!wrap) return;
    const cats = ['All', 'Atelier Couture', 'Apparel Sets', 'Hats', 'Swim', 'Runway Sets', 'Top & Hat Duos', 'Dresses', 'Outerwear', 'Sets'];
    wrap.innerHTML = cats
      .map((c) => {
        const cnt = c === 'All' ? catalog.products.length : catalog.products.filter((p) => p.category === c).length;
        return `
          <button class="cat-pill ${state.category === c ? 'active' : ''}" data-cat="${c}">
            ${c === 'All' ? 'All Pieces' : c}
            <span>${cnt}</span>
          </button>
        `;
      })
      .join('');

    wrap.querySelectorAll('.cat-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat;
        state.visibleCount = 24;
        renderCatalogSection();
      });
    });
  }

  /* ============================================================
     RUNWAY SLIDESHOW — fullscreen auto-advancing browse mode.
     Walks the CURRENT filtered set so it respects category/search.
     ============================================================ */
  const show = {
    open: false,
    list: [],
    idx: 0,
    playing: true,
    timer: null,
    tick: null,
    DUR: 3200,
  };

  function slideshowRender() {
    const p = show.list[show.idx];
    if (!p) return;
    const img = document.getElementById('slideshow-img');
    if (img) {
      img.src = p.images[0];
      img.alt = p.name;
      img.classList.remove('kenburns');
      void img.offsetWidth; // restart the animation
      img.classList.add('kenburns');
    }
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set('slideshow-chapter', `${p.sku} · ${p.chapter}`);
    set('slideshow-name', p.name);
    set('slideshow-spec', p.stitchSpec);
    set('slideshow-price', `${money(p.price)} USD`);
    set('slideshow-wholesale', `5+ Wholesale ${money(p.wholesalePrice)}`);
    set('slideshow-counter', `${show.idx + 1} / ${show.list.length}`);

    const ov = document.getElementById('slideshow-overlay');
    if (ov) ov.classList.toggle('is-couture', p.category === 'Atelier Couture');

    // restart the progress bar
    const fill = document.getElementById('slideshow-progress-fill');
    if (fill) {
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth;
      if (show.playing) {
        fill.style.transition = `width ${show.DUR}ms linear`;
        fill.style.width = '100%';
      }
    }
  }

  function slideshowGo(delta) {
    if (!show.list.length) return;
    show.idx = (show.idx + delta + show.list.length) % show.list.length;
    slideshowRender();
    if (show.playing) slideshowArm();
  }

  function slideshowArm() {
    clearTimeout(show.timer);
    show.timer = setTimeout(() => slideshowGo(1), show.DUR);
  }

  function slideshowSetPlaying(on) {
    show.playing = on;
    const btn = document.getElementById('slideshow-playpause');
    if (btn) btn.innerHTML = on ? '⏸ Pause <span>SPACE</span>' : '▶ Play <span>SPACE</span>';
    const fill = document.getElementById('slideshow-progress-fill');
    if (on) {
      slideshowArm();
      if (fill) {
        fill.style.transition = `width ${show.DUR}ms linear`;
        fill.style.width = '100%';
      }
    } else {
      clearTimeout(show.timer);
      if (fill) {
        const w = fill.getBoundingClientRect().width;
        const track = fill.parentElement.getBoundingClientRect().width || 1;
        fill.style.transition = 'none';
        fill.style.width = `${(w / track) * 100}%`;
      }
    }
  }

  function slideshowOpen(startId) {
    const filtered = getFilteredProducts();
    show.list = filtered.length ? filtered : catalog.products;
    show.idx = Math.max(0, show.list.findIndex((p) => p.id === startId));
    show.open = true;
    const ov = document.getElementById('slideshow-overlay');
    if (ov) ov.style.display = 'flex';
    document.body.classList.add('scroll-locked');
    slideshowRender();
    slideshowSetPlaying(true);
    showToast(`Runway mode — ${show.list.length} pieces · ← → to steer, SPACE to pause`);
  }

  function slideshowClose() {
    show.open = false;
    clearTimeout(show.timer);
    const ov = document.getElementById('slideshow-overlay');
    if (ov) ov.style.display = 'none';
    document.body.classList.remove('scroll-locked');
  }

  function wireSlideshow() {
    document.getElementById('start-slideshow-btn')?.addEventListener('click', () => slideshowOpen(null));
    document.getElementById('slideshow-close')?.addEventListener('click', slideshowClose);
    document.getElementById('slideshow-prev')?.addEventListener('click', () => slideshowGo(-1));
    document.getElementById('slideshow-next')?.addEventListener('click', () => slideshowGo(1));
    document.getElementById('slideshow-playpause')?.addEventListener('click', () => slideshowSetPlaying(!show.playing));
    document.getElementById('slideshow-bag')?.addEventListener('click', () => {
      const p = show.list[show.idx];
      if (p) addToBag(p, p.category === 'Hats' ? 'One Size (Stretch)' : 'M', p.cuffText || 'FINNESSE', 1);
    });
    document.getElementById('slideshow-img')?.addEventListener('click', () => {
      const p = show.list[show.idx];
      if (p) {
        slideshowClose();
        openProductModal(p);
      }
    });

    document.getElementById('film-fullscreen-btn')?.addEventListener('click', () => {
      const v = document.getElementById('brand-reel');
      if (!v) return;
      (v.requestFullscreen || v.webkitEnterFullscreen || v.webkitRequestFullscreen)?.call(v);
      v.play?.();
    });
  }

  function renderCatalogSection() {
    renderCategoryPills();
    const filtered = getFilteredProducts();
    const countEl = document.getElementById('catalog-result-count');
    if (countEl) {
      const shown = state.viewMode === 'ledger' ? filtered.length : Math.min(state.visibleCount, filtered.length);
      countEl.textContent = `Showing ${shown} of ${filtered.length} priced designs (${catalog.counts.totalUniqueImages} total archive photos)`;
    }

    const gridWrap = document.getElementById('catalog-grid-view');
    const orbitalWrap = document.getElementById('catalog-orbital-view');
    const ledgerWrap = document.getElementById('catalog-ledger-view');

    const isCard = state.viewMode === 'grid' || state.viewMode === 'lookbook';
    gridWrap.style.display = isCard ? 'block' : 'none';
    orbitalWrap.style.display = state.viewMode === 'orbital' ? 'block' : 'none';
    ledgerWrap.style.display = state.viewMode === 'ledger' ? 'block' : 'none';

    // Lookbook = same cards, bigger tiles (one CSS class flip)
    const grid = document.getElementById('product-grid-3d');
    if (grid) grid.classList.toggle('lookbook-mode', state.viewMode === 'lookbook');

    document.querySelectorAll('[data-view-mode]').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-view-mode') === state.viewMode);
    });

    if (state.viewMode === 'orbital') {
      renderOrbitalCarousel();
    } else if (state.viewMode === 'ledger') {
      renderPricingLedger(filtered);
    } else {
      renderProductGrid(filtered);
    }
  }

  function renderProductGrid(filtered) {
    const grid = document.getElementById('product-grid-3d');
    const loadMoreWrap = document.getElementById('load-more-wrap');
    if (!grid) return;

    const slice = filtered.slice(0, state.visibleCount);
    grid.innerHTML = slice
      .map((p) => {
        const multiThumbs =
          p.images.length > 1
            ? `<div class="card-angle-dots">
                ${p.images
                  .map(
                    (img, idx) => `
                    <button class="angle-dot-btn ${idx === 0 ? 'active' : ''}" data-angle-idx="${idx}" data-img="${img}" title="View angle ${idx + 1}">
                      <img src="${img}" alt="" />
                    </button>
                  `
                  )
                  .join('')}
              </div>`
            : '';

        const isCouture = p.category === 'Atelier Couture';
        const isNewDrop = p.chapter === 'Chapter V · The Apparel Expansion' || isCouture;
        const badgeCls = isCouture
          ? 'couture'
          : isNewDrop
          ? 'newdrop'
          : p.badge?.includes('Flagship') || p.badge?.includes('Crown') || p.badge?.includes('Icon')
          ? 'gold'
          : '';
        const newFlag = isCouture
          ? '<span class="card-new-flag couture">COUTURE</span>'
          : isNewDrop
          ? '<span class="card-new-flag">NEW DROP</span>'
          : '';

        return `
          <article class="product-card-3d" data-id="${p.id}" ${isCouture ? 'data-couture="1"' : ''}>
            <div class="card-media-wrap">
              <img class="card-main-photo" src="${p.images[0]}" alt="${p.name}" />
              ${newFlag}
              <div class="card-top-badges">
                <span class="badge-tag ${badgeCls}">${p.badge || p.category}</span>
                <span class="sku-tag">${p.sku}</span>
              </div>
              ${multiThumbs}
              <div class="card-hover-actions">
                <button class="card-action-btn quick-bag-btn" data-id="${p.id}">+ Quick Bag</button>
                <button class="card-action-btn runway-btn" data-id="${p.id}" title="Start runway slideshow here">▶</button>
                <button class="card-action-btn primary inspect-btn" data-id="${p.id}">Inspect · ${money(p.price)}</button>
              </div>
            </div>
            <div class="card-body-meta">
              <div class="card-collection-line">
                <span>${p.collection}</span>
                <span>${p.images.length} ${p.images.length > 1 ? 'views' : 'view'}</span>
              </div>
              <div class="card-title-price">
                <h3 class="inspect-trigger" data-id="${p.id}">${p.name}</h3>
                <div class="price-stack">
                  <strong>${money(p.price)}</strong>
                  <small>5+ Wholesale: ${money(p.wholesalePrice)}</small>
                </div>
              </div>
              <p class="card-desc-snippet">${p.description}</p>
            </div>
          </article>
        `;
      })
      .join('');

    grid.querySelectorAll('.product-card-3d').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${(x * 8).toFixed(2)}deg) rotateX(${(-y * 8).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateY(0)';
      });

      const mainImg = card.querySelector('.card-main-photo');
      card.querySelectorAll('.angle-dot-btn').forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (mainImg) mainImg.src = dot.dataset.img;
          card.querySelectorAll('.angle-dot-btn').forEach((d) => d.classList.remove('active'));
          dot.classList.add('active');
        });
      });
    });

    grid.querySelectorAll('.quick-bag-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = catalog.products.find((x) => x.id === btn.dataset.id);
        if (p) addToBag(p, p.category === 'Hats' ? 'One Size (Stretch)' : 'M', p.cuffText || 'FINNESSE', 1);
      });
    });

    grid.querySelectorAll('.runway-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        slideshowOpen(btn.dataset.id);
      });
    });

    grid.querySelectorAll('.inspect-btn, .inspect-trigger, .card-main-photo').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.product-card-3d');
        const id = btn.dataset.id || card?.dataset.id;
        const p = catalog.products.find((x) => x.id === id);
        if (p) openProductModal(p);
      });
    });

    if (loadMoreWrap) {
      loadMoreWrap.style.display = state.visibleCount < filtered.length ? 'flex' : 'none';
    }
  }

  function renderPricingLedger(filtered) {
    const tbody = document.getElementById('ledger-tbody');
    if (!tbody) return;
    tbody.innerHTML = filtered
      .map(
        (p) => `
        <tr>
          <td><img class="ledger-thumb" src="${p.images[0]}" alt="${p.name}" /></td>
          <td style="font-family:var(--mono);font-size:11px;color:var(--teal);">${p.sku}</td>
          <td>
            <strong style="display:block;cursor:pointer;" class="ledger-open" data-id="${p.id}">${p.name}</strong>
            <small style="color:var(--muted);">${p.colorway}</small>
          </td>
          <td><span class="badge-tag">${p.category}</span></td>
          <td style="font-family:var(--mono);font-size:11px;">${p.collection}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-family:var(--mono);color:var(--gold);">$</span>
              <input
                type="number"
                readonly
                min="10"
                max="2000"
                value="${p.price}"
                data-price-id="${p.id}"
                class="ledger-price-input"
                style="width:74px;background:var(--bg);border:1px solid var(--line-strong);border-radius:8px;padding:5px 8px;font-family:var(--mono);font-weight:700;color:var(--gold);"
              />
            </div>
          </td>
          <td style="font-family:var(--mono);color:var(--muted);" id="ws-${p.id}">${money(p.wholesalePrice)}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn-pill btn-teal ledger-open" data-id="${p.id}" style="padding:6px 10px;font-size:10px;">Inspect</button>
              <button class="btn-pill btn-gold ledger-add" data-id="${p.id}" style="padding:6px 10px;font-size:10px;">+ Bag</button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');

    tbody.querySelectorAll('.ledger-price-input').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const id = inp.dataset.priceId;
        const newVal = Math.max(10, Number(inp.value) || 48);
        const prod = catalog.products.find((x) => x.id === id);
        if (!prod) return;
        prod.price = newVal;
        prod.wholesalePrice = Math.round(newVal * 0.52);
        state.priceOverrides[id] = newVal;
        localStorage.setItem('finnesse_price_overrides', JSON.stringify(state.priceOverrides));
        const wsCell = document.getElementById(`ws-${id}`);
        if (wsCell) wsCell.textContent = money(prod.wholesalePrice);
        // public build: price overrides are local-only (no admin backend)
        showToast(`Updated ${prod.sku} retail price to ${money(newVal)}`);
        renderBagUI();
      });
    });

    tbody.querySelectorAll('.ledger-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = catalog.products.find((x) => x.id === btn.dataset.id);
        if (p) addToBag(p, p.category === 'Hats' ? 'One Size (Stretch)' : 'M', p.cuffText || 'FINNESSE', 1);
      });
    });

    tbody.querySelectorAll('.ledger-open').forEach((el) => {
      el.addEventListener('click', () => {
        const p = catalog.products.find((x) => x.id === el.dataset.id);
        if (p) openProductModal(p);
      });
    });
  }

  function openProductModal(product) {
    state.modalProduct = product;
    state.modalImgIndex = 0;
    state.modalSize = product.category === 'Hats' ? 'One Size (Stretch)' : 'M';
    state.modalCustomCuff = product.cuffText || 'FINNESSE';
    state.modalQty = 1;
    renderProductModal();
  }

  function renderProductModal() {
    const modal = document.getElementById('product-modal');
    const p = state.modalProduct;
    if (!modal) return;
    if (!p) {
      modal.style.display = 'none';
      return;
    }

    modal.style.display = 'flex';
    const sizeOptions =
      p.category === 'Hats'
        ? ['One Size (Stretch)', 'S/M Snug Crown', 'L/XL Deep Crown']
        : ['XS', 'S', 'M', 'L', 'XL', 'Custom Atelier Measure'];

    modal.innerHTML = `
      <div class="product-modal-dialog" role="dialog" aria-modal="true" aria-label="${p.name}">
        <button class="modal-close-btn" id="close-product-modal" aria-label="Close">✕</button>
        <div class="modal-gallery-col">
          <img class="modal-main-img" id="modal-main-img" src="${p.images[state.modalImgIndex]}" alt="${p.name}" />
          ${
            p.images.length > 1
              ? `<div class="modal-thumb-row">
                  ${p.images
                    .map(
                      (src, idx) => `
                      <button class="modal-thumb-btn ${idx === state.modalImgIndex ? 'active' : ''}" data-idx="${idx}">
                        <img src="${src}" alt="View ${idx + 1}" />
                      </button>
                    `
                    )
                    .join('')}
                </div>`
              : ''
          }
        </div>
        <div class="modal-info-col">
          <div class="eyebrow-tag">${p.sku} · ${p.collection} · ${p.chapter}</div>
          <h2 style="font-family:var(--display);font-size:42px;font-weight:900;line-height:0.95;text-transform:uppercase;">${p.name}</h2>
          <div style="display:flex;align-items:baseline;gap:16px;flex-wrap:wrap;">
            <span style="font-family:var(--mono);font-size:28px;font-weight:700;color:var(--gold);">${money(p.price)} USD</span>
            <span class="badge-tag gold">5+ Wholesale Tier: ${money(p.wholesalePrice)} / unit</span>
          </div>
          <p style="color:#d0d7d2;font-size:15px;">${p.description}</p>
          <div style="background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:13px;">
            <strong style="font-family:var(--mono);font-size:10px;color:var(--teal);text-transform:uppercase;display:block;margin-bottom:4px;">Atelier Stitch & Construction Spec</strong>
            <span>${p.stitchSpec}</span>
            <div style="margin-top:6px;font-family:var(--mono);font-size:11px;color:var(--muted);">Colorway: ${p.colorway}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <label style="display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:10px;text-transform:uppercase;color:var(--muted);">
              Select Fit / Size
              <select id="modal-size-select" class="filter-select">
                ${sizeOptions.map((s) => `<option value="${s}" ${s === state.modalSize ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px;font-family:var(--mono);font-size:10px;text-transform:uppercase;color:var(--muted);">
              Custom Cuff Stitch Note
              <input id="modal-cuff-note" class="filter-select" value="${state.modalCustomCuff}" maxlength="16" placeholder="FINNESSE / 904 / Custom" />
            </label>
          </div>
          <div style="display:flex;gap:12px;align-items:center;margin-top:8px;">
            <div style="display:flex;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:4px 10px;gap:14px;font-family:var(--mono);">
              <button id="modal-qty-minus" style="font-size:18px;padding:4px 8px;">−</button>
              <strong id="modal-qty-val">${state.modalQty}</strong>
              <button id="modal-qty-plus" style="font-size:18px;padding:4px 8px;">+</button>
            </div>
            <button class="btn-pill btn-gold" id="modal-add-bag-btn" style="flex:1;justify-content:center;padding:14px 20px;font-size:13px;">
              ${p.teamMark ? 'Add to Rights-Review Inquiry Bag' : `Add to FINNESSE Bag · ${money(p.price * state.modalQty)}`}
            </button>
          </div>
          <small style="font-family:var(--mono);font-size:10px;color:var(--muted);">
            Source Archive Path: ${p.sourcePaths.join(' · ')}
          </small>
        </div>
      </div>
    `;

    document.getElementById('close-product-modal')?.addEventListener('click', () => {
      state.modalProduct = null;
      renderProductModal();
    });

    modal.querySelectorAll('.modal-thumb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.modalImgIndex = Number(btn.dataset.idx);
        renderProductModal();
      });
    });

    document.getElementById('modal-size-select')?.addEventListener('change', (e) => {
      state.modalSize = e.target.value;
    });
    document.getElementById('modal-cuff-note')?.addEventListener('input', (e) => {
      state.modalCustomCuff = e.target.value;
    });
    document.getElementById('modal-qty-minus')?.addEventListener('click', () => {
      state.modalQty = Math.max(1, state.modalQty - 1);
      renderProductModal();
    });
    document.getElementById('modal-qty-plus')?.addEventListener('click', () => {
      state.modalQty = Math.min(50, state.modalQty + 1);
      renderProductModal();
    });
    document.getElementById('modal-add-bag-btn')?.addEventListener('click', () => {
      addToBag(p, state.modalSize, state.modalCustomCuff, state.modalQty);
      state.modalProduct = null;
      renderProductModal();
    });
  }

  function openLightbox(imgSrc, title, caption) {
    const lb = document.getElementById('lightbox-modal');
    if (!lb) return;
    lb.style.display = 'flex';
    lb.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--line-strong);border-radius:20px;max-width:860px;width:100%;max-height:92vh;overflow:auto;padding:24px;position:relative;">
        <button class="modal-close-btn" id="close-lightbox-btn">✕</button>
        <img src="${imgSrc}" alt="${title}" style="width:100%;max-height:70vh;object-fit:contain;border-radius:12px;background:#050706;" />
        <div style="margin-top:16px;">
          <h3 style="font-family:var(--display);font-size:32px;font-weight:800;">${title}</h3>
          <p style="color:var(--muted);margin-top:4px;">${caption || ''}</p>
        </div>
      </div>
    `;
    document.getElementById('close-lightbox-btn')?.addEventListener('click', () => {
      lb.style.display = 'none';
    });
  }

  function addToBag(product, size, cuffNote, qty) {
    const key = `${product.id}::${size}::${(cuffNote || '').toUpperCase()}`;
    const existing = state.bag.find((item) => item.key === key);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      state.bag.push({
        key,
        productId: product.id,
        size,
        cuffNote: (cuffNote || product.cuffText || 'FINNESSE').toUpperCase(),
        qty,
      });
    }
    state.bagOpen = true;
    saveBag();
    showToast(`Added ${qty}× "${product.name}" to your FINNESSE Bag`);
  }

  function renderBagUI() {
    const totalQty = state.bag.reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('header-bag-count');
    if (badge) badge.textContent = String(totalQty);

    const drawer = document.getElementById('bag-drawer-backdrop');
    if (!drawer) return;
    drawer.style.display = state.bagOpen ? 'flex' : 'none';
    if (!state.bagOpen) return;

    const isWholesale = totalQty >= 5;
    let retailSubtotal = 0;
    let activeSubtotal = 0;

    const linesHtml = state.bag
      .map((line) => {
        const p = catalog.products.find((x) => x.id === line.productId);
        if (!p) return '';
        const unitPrice = isWholesale ? p.wholesalePrice : p.price;
        retailSubtotal += p.price * line.qty;
        activeSubtotal += unitPrice * line.qty;
        return `
          <div class="bag-line-card">
            <img src="${p.images[0]}" alt="${p.name}" />
            <div style="display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="display:flex;justify-content:space-between;gap:8px;">
                  <strong style="font-family:var(--display);font-size:20px;line-height:1;">${p.name}</strong>
                  <button class="bag-remove-btn" data-key="${line.key}" style="color:var(--muted);font-size:14px;">✕</button>
                </div>
                <small style="font-family:var(--mono);font-size:10px;color:var(--teal);display:block;margin-top:3px;">
                  Size: ${line.size} · Cuff: "${line.cuffNote}"
                </small>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                <div style="display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-family:var(--mono);font-size:12px;">
                  <button class="bag-qty-btn" data-key="${line.key}" data-delta="-1">−</button>
                  <span>${line.qty}</span>
                  <button class="bag-qty-btn" data-key="${line.key}" data-delta="1">+</button>
                </div>
                <strong style="font-family:var(--mono);color:var(--gold);">${money(unitPrice * line.qty)}</strong>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const listEl = document.getElementById('bag-items-list');
    if (listEl) {
      listEl.innerHTML =
        linesHtml ||
        `<div style="text-align:center;padding:48px 16px;color:var(--muted);">
          <p style="font-family:var(--display);font-size:28px;color:var(--ink);">Your FINNESSE rotation is empty</p>
          <p style="font-size:13px;margin-top:6px;">Explore 130 priced designs below.</p>
        </div>`;
    }

    const summaryEl = document.getElementById('bag-summary-box');
    if (summaryEl) {
      summaryEl.style.display = state.bag.length ? 'block' : 'none';
      summaryEl.innerHTML = `
        <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--teal);margin-bottom:6px;">
            <span>PRICING TIER</span>
            <span>${isWholesale ? '★ WHOLESALE 5+ UNLOCKED (48% OFF)' : `RETAIL (${5 - totalQty} more for Wholesale 5+ tier)`}</span>
          </div>
          ${
            isWholesale
              ? `<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:12px;color:var(--muted);margin-bottom:4px;">
                  <span>Retail Value</span>
                  <span style="text-decoration:line-through;">${money(retailSubtotal)}</span>
                </div>`
              : ''
          }
          <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:18px;font-weight:700;color:var(--gold);">
            <span>Total Estimate (${totalQty} pcs)</span>
            <span>${money(activeSubtotal)} USD</span>
          </div>
        </div>
        <form id="bag-checkout-form" style="display:flex;flex-direction:column;gap:10px;">
          <input required name="customerName" class="filter-select" placeholder="Your Name / Boutique Name" />
          <input required type="email" name="customerEmail" class="filter-select" placeholder="Email for Order / Lookbook Sheet" />
          <input name="customerNotes" class="filter-select" placeholder="Notes (custom colors, drop date, sizes)" />
          <button type="submit" class="btn-pill btn-gold" style="justify-content:center;padding:14px;font-size:13px;">
            Submit Custom Drop / Reserve Order →
          </button>
        </form>
      `;

      document.getElementById('bag-checkout-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = {
          customerName: fd.get('customerName'),
          customerEmail: fd.get('customerEmail'),
          customerNotes: fd.get('customerNotes'),
          tier: isWholesale ? 'wholesale-5plus' : 'retail',
          totalQty,
          subtotalUSD: activeSubtotal,
          items: state.bag,
        };
        // STATIC PUBLIC BUILD: no backend. Compose an email instead.
        const lines = state.bag.map((l) => {
          const pr = catalog.products.find((x) => x.id === l.productId);
          if (!pr) return '';
          const unit = isWholesale ? pr.wholesalePrice : pr.price;
          return `- ${pr.sku}  ${pr.name}\n    size ${l.size} / cuff "${l.cuffNote}"  x${l.qty}  @ $${unit} ea = $${unit * l.qty}`;
        }).filter(Boolean).join('\n');
        const body = [
          `FINNESSE order enquiry`,
          ``,
          `Name/Boutique: ${payload.customerName}`,
          `Email: ${payload.customerEmail}`,
          `Notes: ${payload.customerNotes || '-'}`,
          ``,
          `Tier: ${isWholesale ? 'WHOLESALE 5+' : 'Retail'}`,
          `Pieces: ${totalQty}`,
          `Estimated total: $${activeSubtotal} USD`,
          ``,
          `ITEMS`,
          lines,
          ``,
          `(Sent from the FINNESSE public lookbook)`,
        ].join('\n');
        const href = `mailto:${(catalog.contactEmail || 'skyrey1234@gmail.com')}`
          + `?subject=${encodeURIComponent('FINNESSE order enquiry - ' + totalQty + ' pieces')}`
          + `&body=${encodeURIComponent(body)}`;
        window.location.href = href;
        showToast('Opening your email app with the order details…');
      });
    }

    drawer.querySelectorAll('.bag-qty-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.bag.find((x) => x.key === btn.dataset.key);
        if (!item) return;
        item.qty += Number(btn.dataset.delta);
        if (item.qty <= 0) {
          state.bag = state.bag.filter((x) => x.key !== btn.dataset.key);
        }
        saveBag();
      });
    });

    drawer.querySelectorAll('.bag-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.bag = state.bag.filter((x) => x.key !== btn.dataset.key);
        saveBag();
      });
    });
  }

  function initApp() {
    loadPersistedState();

    const initialProduct =
      catalog.products.find((p) => p.id === 'duval-jaguar-six-piece-collector-capsule') ||
      catalog.products.find((p) => p.id === catalog.heroFeaturedId) ||
      catalog.products[0];

    renderPresetStrip();
    renderHeroStats();
    selectShowcaseProduct(initialProduct, initialProduct.images.length > 1 ? 1 : 0, false);

    document.getElementById('hero-add-bag-btn')?.addEventListener('click', () => {
      if (!state.showcaseProduct) return;
      addToBag(
        state.showcaseProduct,
        state.showcaseProduct.category === 'Hats' ? 'One Size (Stretch)' : 'M',
        state.showcaseProduct.cuffText || 'FINNESSE',
        1
      );
    });

    document.getElementById('hero-inspect-btn')?.addEventListener('click', () => {
      if (state.showcaseProduct) openProductModal(state.showcaseProduct);
    });

    document.getElementById('hero-main-photo-frame')?.addEventListener('click', () => {
      if (state.showcaseProduct) openProductModal(state.showcaseProduct);
    });

    renderOriginVault();
    renderCampaignGallery();
    wireSlideshow();
    setupOrbitalControls();
    renderOrbitalCarousel();

    const colSelect = document.getElementById('collection-select');
    if (colSelect) {
      const cols = ['All', ...Object.keys(catalog.counts.collections)];
      colSelect.innerHTML = cols
        .map((c) => `<option value="${c}">${c === 'All' ? 'All 6 Collections' : `${c} (${catalog.counts.collections[c]})`}</option>`)
        .join('');
      colSelect.addEventListener('change', (e) => {
        state.collection = e.target.value;
        state.visibleCount = 24;
        renderCatalogSection();
      });
    }

    const chapSelect = document.getElementById('chapter-select');
    if (chapSelect) {
      const chaps = ['All', ...Array.from(new Set(catalog.products.map((p) => p.chapter)))];
      chapSelect.innerHTML = chaps
        .map((c) => `<option value="${c}">${c === 'All' ? 'All Story Chapters' : c}</option>`)
        .join('');
      chapSelect.addEventListener('change', (e) => {
        state.chapter = e.target.value;
        state.visibleCount = 24;
        renderCatalogSection();
      });
    }

    document.getElementById('catalog-search')?.addEventListener('input', (e) => {
      state.search = e.target.value;
      state.visibleCount = 24;
      renderCatalogSection();
    });

    document.getElementById('catalog-sort')?.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderCatalogSection();
    });

    document.querySelectorAll('[data-view-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.viewMode = btn.getAttribute('data-view-mode');
        renderCatalogSection();
      });
    });

    document.getElementById('load-more-btn')?.addEventListener('click', () => {
      state.visibleCount += 24;
      renderCatalogSection();
    });

    document.querySelectorAll('[data-filter-chapter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = btn.getAttribute('data-filter-chapter');
        state.chapter = ch;
        if (chapSelect) chapSelect.value = ch;
        state.visibleCount = 48;
        renderCatalogSection();
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('[data-quick-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = btn.getAttribute('data-quick-cat');
        state.collection = 'All';
        state.chapter = 'All';
        state.viewMode = 'grid';
        state.visibleCount = 36;
        renderCatalogSection();
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.getElementById('open-pricing-matrix-btn')?.addEventListener('click', () => {
      state.viewMode = 'ledger';
      state.visibleCount = 200;
      renderCatalogSection();
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('open-bag-btn')?.addEventListener('click', () => {
      state.bagOpen = true;
      renderBagUI();
    });

    document.getElementById('close-bag-btn')?.addEventListener('click', () => {
      state.bagOpen = false;
      renderBagUI();
    });

    window.addEventListener('keydown', (e) => {
      // Slideshow owns the keyboard while it is open
      if (show.open) {
        if (e.key === 'Escape') { slideshowClose(); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); slideshowGo(1); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); slideshowGo(-1); return; }
        if (e.key === ' ') { e.preventDefault(); slideshowSetPlaying(!show.playing); return; }
        return;
      }

      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');

      if (e.key === 'Escape') {
        state.modalProduct = null;
        state.bagOpen = false;
        renderProductModal();
        renderBagUI();
        const lb = document.getElementById('lightbox-modal');
        if (lb) lb.style.display = 'none';
        return;
      }

      if (typing) return;

      // Product modal arrow navigation through the filtered set
      if (state.modalProduct && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const list = getFilteredProducts();
        const i = list.findIndex((p) => p.id === state.modalProduct.id);
        if (i > -1) {
          const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
          openProductModal(next);
        }
        return;
      }

      // Shortcuts: / focus search, P play slideshow, L lookbook, G grid
      if (e.key === '/') {
        e.preventDefault();
        document.getElementById('catalog-search')?.focus();
      } else if (e.key.toLowerCase() === 'p') {
        slideshowOpen(null);
      } else if (e.key.toLowerCase() === 'l') {
        state.viewMode = 'lookbook';
        renderCatalogSection();
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (e.key.toLowerCase() === 'g') {
        state.viewMode = 'grid';
        renderCatalogSection();
        document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });

    document.getElementById('product-modal')?.addEventListener('mousedown', (e) => {
      if (e.target.id === 'product-modal') {
        state.modalProduct = null;
        renderProductModal();
      }
    });

    document.getElementById('bag-drawer-backdrop')?.addEventListener('mousedown', (e) => {
      if (e.target.id === 'bag-drawer-backdrop') {
        state.bagOpen = false;
        renderBagUI();
      }
    });

    document.getElementById('lightbox-modal')?.addEventListener('mousedown', (e) => {
      if (e.target.id === 'lightbox-modal') {
        e.currentTarget.style.display = 'none';
      }
    });

    renderCatalogSection();
    renderBagUI();
  }

  window.addEventListener('DOMContentLoaded', initApp);
})();

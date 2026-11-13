#!/usr/bin/env node
/* Builds the standalone index.html from src/styles.css, src/runway.js and catalog.json */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ASSETS = 'assets/';
const STORE = 'https://nike-makknzjs.myshopify.com';
const HANDLE = 'template--28035983671601__the_runway_wdM8BG';

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

const LOOK_KEYS = ['bndthK', 'XckgG6', 'rLfAhC', 'FKg67q', '8KREEE', 'N3bfm9'];

const VENDORS = {
  'tatum-5-orbit-copy': 'Nikey | Password: 1',
  tshirt: 'Nike',
  sweatshirt: 'Nike',
  'tatum-5-orbit': 'Nikey | Password: 1',
  'hoodie-black': 'Nike',
  'sweatshirt-plus': 'Nike',
  hoodie: 'Nike',
  'air-jordan-12-retro-copy': 'Nikey | Password: 1'
};

const IMAGE_SIZES = {
  'source-tatum-5-orbit-copy.webp': [175, 174],
  'source-tatum-5-orbit.webp': [175, 174],
  'source-air-jordan-12-retro-copy.webp': [175, 174],
  'source-tshirt.webp': [131, 185],
  'source-sweatshirt.webp': [142, 206],
  'source-sweatshirt-plus.webp': [135, 206],
  'source-hoodie.webp': [148, 206],
  'source-hoodie-black.webp': [139, 186]
};

const MODEL_FILES = [
  { src: 'model-1.webp' },
  { src: 'model-2.webp' },
  { src: 'model-3.webp' },
  { src: 'model-4.webp' },
  { src: 'model-5.webp' },
  { src: 'model-6.webp' }
];

const PINS = [
  [['Air Jordan 12 Retro', 47, 27], ['Tshirt', 48, 58], ['Sweatshirt', 45, 96]],
  [['Tatum 5 Orbit', 50, 28], ['Hoodie Black', 48, 58], ['Tshirt', 45, 88]],
  [['Sweatshirt Plus', 50, 28], ['Tatum 5 Orbit', 48, 58], ['Tshirt', 45, 88]],
  [['Hoodie Black', 50, 28], ['Air Jordan 12 Retro', 48, 58], ['Tshirt', 45, 88]],
  [['Sweatshirt', 50, 28], ['Tatum 5 Orbit', 48, 58], ['Tshirt', 45, 88]],
  [['Hoodie', 50, 28], ['Luka 5', 48, 58], ['Tshirt', 45, 88]]
];

const TAGS = {
  '1:hoodie-black': 'New',
  '2:tatum-5-orbit': 'New'
};

/* --------------------------------------------------------------- normalize */
const items = catalog.items.map((item) => {
  const file = item.image.replace('assets/', '');
  const [w, h] = IMAGE_SIZES[file];
  return {
    ...item,
    vendor: VENDORS[item.id],
    image: ASSETS + file,
    file,
    w,
    h
  };
});

const itemById = Object.fromEntries(items.map((item) => [item.id, item]));

const looks = catalog.looks.map((look, i) => ({
  ...look,
  image: ASSETS + look.image.replace('assets/', ''),
  model: MODEL_FILES[i],
  key: LOOK_KEYS[i],
  pins: PINS[i]
}));

const jsonCatalog = {
  source: catalog.source,
  looks: looks.map((look) => ({
    name: look.name,
    description: look.description,
    image: look.image,
    products: look.products
  })),
  items: items.map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    price: item.price,
    image: item.image,
    sizes: item.sizes,
    variants: item.variants,
    url: item.url
  }))
};

/* ------------------------------------------------------------------- parts */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function modelImage(look, { eager = true } = {}) {
  return `<img src="${ASSETS}${look.model.src}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" width="334" height="593" draggable="false" data-model-image alt="${esc(look.name)}">`;
}

function pinsMarkup(look) {
  return look.pins.map(([name, left, top], idx) => {
    const n = idx + 1;
    return `<button class="rw__pin" data-rw-pin="${n}" data-tip="${esc(name)}" style="left:${left}%;top:${top}%;--pi:${n}" aria-label="${n}: ${esc(name)}" tabindex="-1"><span class="rw__pin-dot">${n}</span></button>`;
  }).join('');
}

function bodyMarkup(look, index) {
  return `<div class="rw__model" data-rw-model data-index="${index}" aria-hidden="true">
  <span class="rw__shadow"></span>
  <div class="rw__figure" style="--rw-ar:0.5625">
    <div class="rw__art">
      ${modelImage(look)}
      <button class="rw__hit" data-rw-go="${index}" aria-label="Look ${index + 1}: ${esc(look.name)}" tabindex="-1"></button>
    </div>
  </div>
</div>`;
}

function heroMarkup(look, index) {
  return `<div class="rw__hero${index === 0 ? ' is-on' : ''}" data-rw-hero data-index="${index}" data-name="${esc(look.name)}" data-label="Look ${index + 1}: ${esc(look.name)}" data-probe="${ASSETS}${look.model.src}" aria-hidden="${index === 0 ? 'false' : 'true'}">
  <div class="rw__morph">
    <span class="rw__shadow"></span>
    <div class="rw__figure" style="--rw-ar:0.5625">
      <div class="rw__art">
        ${modelImage(look)}
        <button class="rw__zoom" data-rw-zoom aria-label="View look: ${esc(look.name)}" tabindex="${index === 0 ? '0' : '-1'}"></button>
        <div class="rw__pins">${pinsMarkup(look)}</div>
      </div>
    </div>
  </div>
</div>`;
}

function pickerMarkup(look, item, n) {
  const id = `Picker-${HANDLE}-look_${look.key}-${n}`;
  const name = `Opt-${HANDLE}-look_${look.key}-${n}-1`;
  const variants = item.variants.map((v) => ({ id: v.id, a: v.a, o: v.o }));
  const values = item.sizes.map((size, i) => `<label class="rw__pill"><input type="radio" name="${name}" value="${esc(size)}" data-rw-option="0"${i === 0 ? ' checked' : ''}><span class="rw__pill-label">${esc(size)}</span></label>`).join('');
  const mobileH = Math.round((item.h * 160) / item.w);
  return `<div class="rw__picker" data-rw-picker id="${id}" hidden>
  <div class="rw__picker-head">
    <img src="${item.image}" width="160" height="${mobileH}" loading="lazy" decoding="async" alt="">
    <div>
      <p class="rw__picker-title">${esc(item.name)}</p>
      <p class="rw__picker-price">$${item.price.toFixed(2)}</p>
    </div>
    <button class="rw__pick-close" type="button" data-rw-pick-close aria-label="Close size picker">×</button>
  </div>
  <fieldset class="rw__opt">
    <legend class="rw__opt-name">${item.id.endsWith('-copy') || item.id.startsWith('tatum') || item.id.startsWith('air') ? 'Shoe size' : 'Size'}</legend>
    <div class="rw__values">${values}</div>
  </fieldset>
  <button class="rw__confirm" type="button" data-rw-confirm><span data-rw-confirm-label data-add="Add to bag">Add to bag</span><span class="rw__sr"> — ${esc(item.name)}</span></button>
  <script type="application/json" data-rw-variants>${JSON.stringify(variants)}</script>
</div>`;
}

function rowMarkup(look, index, productId, n) {
  const item = itemById[productId];
  const tag = TAGS[`${index}:${productId}`];
  const pickerId = `Picker-${HANDLE}-look_${look.key}-${n}`;
  return `<li class="rw__item" data-rw-card="${n}" style="--i:${n}" data-title="${esc(item.name)}">
  ${tag ? `<span class="rw__tag"><span class="rw__tag-text">${tag}</span></span>` : ''}
  <a class="rw__media" href="${item.url}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true">
    <img src="${item.image}" width="${item.w}" height="${item.h}" loading="lazy" decoding="async" alt="">
    <span class="rw__num">${n}</span>
  </a>
  <div class="rw__info">
    <span class="rw__type">${esc(item.vendor)}</span>
    <a class="rw__name" href="${item.url}" target="_blank" rel="noopener noreferrer">${esc(item.name)}</a>
    <span class="rw__price"><span>$${item.price.toFixed(2)}</span></span>
  </div>
  <button class="rw__add" type="button" data-rw-add aria-expanded="false" aria-controls="${pickerId}" aria-label="Add to bag: ${esc(item.name)}" data-added-label="Added to bag: ${esc(item.name)}">
    <svg class="rw__ic-plus" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>
    <svg class="rw__ic-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 7"/></svg>
    <svg class="rw__ic-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-9 9"/></svg>
  </button>
  ${pickerMarkup(look, item, n)}
</li>`;
}

function panelMarkup(look, index) {
  const rows = look.products.map((id, i) => rowMarkup(look, index, id, i + 1)).join('\n');
  return `<div class="rw__look-panel${index === 0 ? ' is-in' : ''}" data-rw-panel="${index}"${index === 0 ? '' : ' hidden'}>
  <div class="rw__mhead"><span class="rw__mhead-title">${esc(look.name)}</span><span class="rw__label" data-rw-pieces>3 pieces</span></div>
  <ul class="rw__items" role="list">
${rows}
  </ul>
  <div class="rw__bundle has-rule">
    <p class="rw__msg" data-rw-msg role="status" aria-live="polite" hidden></p>
    <div class="rw__bundle-row">
      <div class="rw__bundle-copy">
        <span class="rw__bundle-title">Complete the look</span>
        <span class="rw__bundle-note">Bundle all 3 and save 10%</span>
      </div>
      <div class="rw__bundle-price"><s>$547.00</s><strong>$492.30</strong></div>
    </div>
    <button class="rw__cta" type="button" data-rw-all>
      <span class="rw__cta-add">Add full look to bag</span>
      <span class="rw__cta-m">Add full look — $492.30</span>
      <span class="rw__cta-done">Full look in your bag</span>
      <svg class="rw__cta-arrow" width="22" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h24M19 1l6 6-6 6"/></svg>
      <svg class="rw__cta-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-9 9"/></svg>
    </button>
  </div>
  <template data-rw-pieces-text>3 pieces</template>
</div>`;
}

const ticks = looks.map((look, i) => `<button class="rw__tick" data-rw-tick="${i}" aria-current="${i === 0 ? 'true' : 'false'}" aria-label="Look ${i + 1}: ${esc(look.name)}"><span class="rw__tick-bar"></span><span class="rw__tick-label">0${i + 1}<span class="rw__tick-name">&nbsp;&nbsp;${esc(look.name)}</span></span></button>`).join('\n      ');

/* -------------------------------------------------------------------- page */
const tokens = [
  '--rw-c-stage:#f4f1f1', '--rw-c-panel:#ffffff', '--rw-c-text:#151413', '--rw-c-muted:#66625c',
  '--rw-c-accent:#0e0e0e', '--rw-c-on-accent:#ffffff', '--rw-c-line:#c8c8c8', '--rw-card:#DFDFDF',
  '--rw-hf:var(--font-heading--family, inherit)', '--rw-hw:400',
  '--rw-h-d:46px', '--rw-h-m:24px', '--rw-sub-d:12px', '--rw-sub-m:12px',
  '--rw-eyebrow-d:11px', '--rw-eyebrow-m:10px', '--rw-label-d:10px', '--rw-label-m:9px',
  '--rw-chip-d:17px', '--rw-chip-m:18px', '--rw-ph-d:18px', '--rw-ph-m:16px',
  '--rw-pt-size-d:13px', '--rw-pt-size-m:12px', '--rw-price-d:12px', '--rw-price-m:12px',
  '--rw-opt-d:11px', '--rw-opt-m:11px', '--rw-total-d:16px', '--rw-total-m:16px',
  '--rw-thumb-d:92px', '--rw-thumb-m:62px', '--rw-tag-top:18px', '--rw-tag-left:0px',
  '--rw-thumb-radius:0px', '--rw-morph:900ms', '--rw-bar-r:20px', '--rw-panel-w:380px',
  '--rw-panel-pad-d:32px', '--rw-radius:0px', '--rw-max:none', '--rw-speed:5s', '--rw-ax:40%',
  '--rw-btn-radius:0px', '--rw-pill-radius:30px', '--rw-add-radius:20px'
].join(';');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#ffffff">
<title>Try the Look — Demo</title>
<meta name="description" content="Six looks, styled head to toe. Explore the runway, isolate a look, and tap a pin to see the piece.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23151413'/%3E%3C/svg%3E">
<link rel="preload" as="image" href="${ASSETS}model-1.webp" fetchpriority="high">
<style>
__STYLES__
</style>
</head>
<body>

<header class="site-header shopify-section-group-header-group">
  <a href="./" class="brand" aria-label="Runway demo home"><span class="brand-wordmark">RUNWAY <span>DEMO</span></span></a>
  <nav aria-label="Main navigation">
    <a href="./">Home</a>
    <a href="${STORE}/pages/nike-orbit" target="_blank" rel="noopener noreferrer">Nike Orbit</a>
    <a href="${STORE}/pages/scene-rail" target="_blank" rel="noopener noreferrer">Hand Rail Pro</a>
    <a href="./" aria-current="page">Runway</a>
  </nav>
  <button id="open-bag" type="button" aria-label="Open styling bag">
    <svg width="22" height="24" viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 8h16l1 16H3L4 8zM8 8V6a4 4 0 0 1 8 0v2"/></svg>
    <span data-cart-count>0</span>
  </button>
</header>

<main>
<runway-section id="Runway-${HANDLE}" class="rw rw--add-icon rw--popup rw--list has-dividers has-border" style="${tokens}"
  data-feel="balanced" data-blur="true" data-mblur="true" data-style="ring" data-mstyle="classic"
  data-fit="true" data-height-mode="original" data-height-vh="100" data-mheight-mode="custom"
  data-mheight-vh="109" data-reflect="false" data-autoplay="true" data-speed="5000"
  data-after-add="stay" data-bundle-code="" data-msg-choose="Pick a size for: [items]"
  data-msg-error="Couldn’t add to bag. Please try again." data-msg-soldout="Sold out">
  <div class="rw__sticky">
    <div class="rw__grid">
      <div class="rw__left">
        <div class="rw__head">
          <div class="rw__intro">
            <h2 class="rw__title">Try the Look.</h2>
            <p class="rw__sub">Six looks, styled head to toe. Tap a pin to see the piece.</p>
          </div>
          <span class="rw__sr" aria-live="polite" aria-atomic="true" data-rw-live></span>
        </div>

        <div class="rw__stage" data-rw-stage tabindex="0" role="region" aria-roledescription="carousel" aria-label="Try the Look. — use arrow keys or swipe to change look">
          <div class="rw__actors" data-rw-actors>
${looks.map((look, i) => bodyMarkup(look, i)).join('\n')}
          </div>
          <div class="rw__heroes" data-rw-heroes>
${looks.map((look, i) => heroMarkup(look, i)).join('\n')}
          </div>
          <span class="rw__sweep"></span>
          <span class="rw__cursor" data-rw-cursor><span class="rw__cursor-in"><span class="rw__cursor-label rw__cursor-drag">Drag</span><span class="rw__cursor-label rw__cursor-view">View</span></span></span>
          <span class="rw__walk"><span class="rw__walk-line"></span></span>
        </div>

        <div class="rw__controls">
          <button class="rw__icon" type="button" data-rw-prev aria-label="Previous look"><svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M25 7H1M7 1L1 7l6 6"/></svg></button>
          <div class="rw__ticks">
      ${ticks}
          </div>
          <button class="rw__icon rw__auto" type="button" data-rw-auto aria-pressed="false" aria-label="Autoplay">
            <svg class="rw__ic-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l12.5-7.5z"/></svg>
            <svg class="rw__ic-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z"/></svg>
          </button>
          <button class="rw__icon" type="button" data-rw-next aria-label="Next look"><svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h24M19 1l6 6-6 6"/></svg></button>
        </div>

        <div class="rw__lb" data-rw-lb data-word="Look" role="region" aria-label="View look" aria-hidden="true">
          <div class="rw__lb-stage" data-rw-lb-stage></div>
          <div class="rw__lb-top">
            <p class="rw__lb-cap"><span class="rw__lb-kicker" data-rw-lb-kicker></span><span class="rw__lb-name" data-rw-lb-name></span></p>
            <button class="rw__lb-close" type="button" data-rw-zoom-close aria-label="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>
          </div>
          <p class="rw__lb-hint">Tap a dot to shop the piece</p>
        </div>
      </div>

      <aside class="rw__panel has-rule">
        <div class="rw__panel-inner">
          <div class="rw__panel-head"><h3 class="rw__panel-title">In this look</h3><span class="rw__label" data-rw-pieces>3 pieces</span></div>
${looks.map((look, i) => panelMarkup(look, i)).join('\n')}
        </div>
      </aside>
    </div>
  </div>
</runway-section>
</main>

<dialog id="bag-dialog">
  <div class="bag-heading">
    <h2>Your styling bag</h2>
    <button id="close-bag" type="button" aria-label="Close styling bag">×</button>
  </div>
  <p class="bag-note">A local outfit shortlist. No payment or order is collected here. Open a piece on the original demo to continue.</p>
  <div id="bag-items"></div>
  <p id="bag-total"></p>
  <button id="export-bag" type="button">Download outfit shortlist</button>
</dialog>

<div id="bag-status" role="status" aria-live="polite"></div>

<script type="application/json" id="rw-catalog">${JSON.stringify(jsonCatalog).replace(/</g, '\\u003c')}</script>
<script>
__SCRIPT__
</script>
</body>
</html>
`;

const font = fs.readFileSync(path.join(ROOT, 'assets/inter-600.woff2')).toString('base64');
const styles = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8')
  .replace('__INTER_FONT__', `data:font/woff2;base64,${font}`);
const script = fs.readFileSync(path.join(ROOT, 'src/runway.js'), 'utf8');

const out = html
  .replace('__STYLES__', () => styles)
  .replace('__SCRIPT__', () => script);

fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('index.html written:', (out.length / 1024).toFixed(1), 'KB');

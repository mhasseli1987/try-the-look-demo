/* ==========================================================================
   Try the Look — Runway
   <runway-section> custom element + local styling bag
   Plain ES2020, no dependencies.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  /* ---------------------------------------------------------------- catalog */
  let CATALOG = { source: '', looks: [], items: [] };
  try {
    CATALOG = JSON.parse($('#rw-catalog').textContent);
  } catch (err) {
    CATALOG = { source: '', looks: [], items: [] };
  }

  const LOOKS = CATALOG.looks;

  function validateCatalog() {
    if (!CATALOG || !Array.isArray(CATALOG.items) || !CATALOG.items.length) {
      throw new Error('The product list could not load.');
    }
    CATALOG.items.forEach((item) => {
      if (typeof item.id !== 'string' || typeof item.name !== 'string' ||
          !Number.isFinite(item.price) || item.price < 0 || !Array.isArray(item.variants)) {
        throw new Error('The product list is unavailable.');
      }
      item.variants.forEach((v) => {
        if (!Number.isSafeInteger(v.id) || typeof v.a !== 'boolean' ||
            !Array.isArray(v.o) || !v.o.every((o) => typeof o === 'string')) {
          throw new Error('The product list is unavailable.');
        }
      });
    });
  }

  /* ------------------------------------------------------------------- toast */
  let toastTimer = 0;
  function toast(message) {
    const el = document.getElementById('bag-status');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 2500);
  }

  /* --------------------------------------------------------------------- bag */
  const Bag = {
    key: 'runway-styling-bag-v3',
    entries: [],
    ready: false,

    init() {
      try {
        validateCatalog();
        this.ready = true;
      } catch (err) {
        this.error = err;
      }
      this.load();
      this.render();
    },

    load() {
      try {
        const raw = window.localStorage.getItem(this.key);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return;
        this.entries = parsed
          .filter((e) => e && Number.isSafeInteger(e.id) &&
            Number.isSafeInteger(e.quantity) && e.quantity >= 1 && e.quantity <= 20)
          .slice(0, 50);
      } catch (err) {
        this.entries = [];
      }
    },

    save() {
      try {
        window.localStorage.setItem(this.key, JSON.stringify(this.entries));
      } catch (err) { /* storage can be unavailable */ }
    },

    variant(id) {
      for (const item of CATALOG.items) {
        const v = item.variants.find((x) => x.id === id);
        if (v) return { item, variant: v, option: v.o[0] };
      }
      return null;
    },

    add(list) {
      if (!this.ready) throw new Error('The product list is unavailable.');
      list.forEach((entry) => {
        const found = this.variant(entry.id);
        if (!found || !found.variant.a) throw new Error('Please choose an available size.');
      });
      list.forEach((entry) => {
        const existing = this.entries.find((e) => e.id === entry.id);
        if (existing) existing.quantity = Math.min(20, existing.quantity + entry.quantity);
        else this.entries.push({ id: entry.id, quantity: entry.quantity });
      });
      this.save();
      this.render();
      toast(list.length > 1 ? 'Look saved to your styling bag' : 'Piece saved to your styling bag');
    },

    remove(id) {
      this.entries = this.entries.filter((e) => e.id !== id);
      this.save();
      this.render();
    },

    count() {
      return this.entries.reduce((n, e) => n + e.quantity, 0);
    },

    subtotal() {
      return this.entries.reduce((sum, e) => {
        const found = this.variant(e.id);
        return sum + (found ? found.item.price * e.quantity : 0);
      }, 0);
    },

    render() {
      const wrap = document.getElementById('bag-items');
      const total = document.getElementById('bag-total');
      const exportBtn = document.getElementById('export-bag');
      if (!wrap || !total || !exportBtn) return;

      wrap.replaceChildren();
      if (!this.entries.length) {
        const p = document.createElement('p');
        p.className = 'bag-note';
        p.textContent = 'Your styling bag is empty. Choose a size beside a piece to save it.';
        wrap.append(p);
        total.textContent = '';
        exportBtn.disabled = true;
      } else {
        this.entries.forEach((entry) => {
          const found = this.variant(entry.id);
          if (!found) return;
          const { item, option } = found;
          const row = document.createElement('div');
          row.className = 'bag-row';

          const img = document.createElement('img');
          img.src = item.image;
          img.alt = item.name;
          img.width = 60;
          img.height = 80;
          img.loading = 'lazy';

          const details = document.createElement('div');
          const h3 = document.createElement('h3');
          h3.textContent = item.name;
          const p = document.createElement('p');
          p.textContent = `Size ${option} · Quantity ${entry.quantity} · ${money.format(item.price)}`;
          const link = document.createElement('a');
          let host = '';
          try { host = new URL(item.url).hostname; } catch (err) { host = ''; }
          if (host !== 'nike-makknzjs.myshopify.com') throw new Error('The product link is unavailable.');
          link.href = item.url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'View original piece ↗';
          details.append(h3, p, link);

          const remove = document.createElement('button');
          remove.type = 'button';
          remove.textContent = '×';
          remove.setAttribute('aria-label', `Remove ${item.name}`);
          remove.addEventListener('click', () => this.remove(entry.id));

          row.append(img, details, remove);
          wrap.append(row);
        });
        total.textContent = `Reference subtotal ${money.format(this.subtotal())}`;
        exportBtn.disabled = false;
      }

      $$('[data-cart-count]').forEach((el) => { el.textContent = String(this.count()); });
    },

    export() {
      const parts = [
        'RUNWAY — STYLING SHORTLIST',
        'Reference prices; no order or payment has been placed.',
        ''
      ];
      this.entries.forEach((entry) => {
        const found = this.variant(entry.id);
        if (!found) return;
        parts.push(`${found.item.name} · Size ${found.option} · Quantity ${entry.quantity}\n${found.item.url}`);
      });
      const blob = new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'runway-outfit-shortlist.txt';
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  /* --------------------------------------------------------------- element */
  class RunwaySection extends HTMLElement {
    constructor() {
      super();
      this.n = 6;
      this.N = 12;
      this.index = 0;
      this.prevIndex = 0;
      this.target = 0;
      this.cur = 0;
      this.vel = 0;
      this.still = false;
      this.visible = true;
      this.dragging = false;
      this.panelHover = false;
      this.zoomed = false;
      this.engaged = false;
      this.playing = false;
      this.mode = 'ring';
      this.phone = false;
      this.reduced = reducedQuery.matches;
      this.start = this.reduced ? 0 : 1.15;
      this.line = [];
      this.raf = 0;
      this.last = 0;
      this.timer = 0;
      this.wheelAcc = 0;
      this.wheelLock = 0;
      this.suppressClick = false;
      this.sheetCard = null;
      this.boundFrame = this.frame.bind(this);
    }

    connectedCallback() {
      if (this._wired) return;
      this._wired = true;
      this.classList.add('rw--js');

      this.speed = Number(this.dataset.speed) || 5000;
      this.msgChoose = this.dataset.msgChoose || 'Pick a size for: [items]';
      this.msgError = this.dataset.msgError || 'Couldn’t add to bag. Please try again.';
      this.msgSoldout = this.dataset.msgSoldout || 'Sold out';

      this.stage = $('[data-rw-stage]', this);
      this.actors = $('[data-rw-actors]', this);
      this.heroesEl = $('[data-rw-heroes]', this);
      this.heroes = $$('[data-rw-hero]', this);
      this.panels = $$('[data-rw-panel]', this);
      this.ticks = $$('[data-rw-tick]', this);
      this.live = $('[data-rw-live]', this);
      this.pieces = $$('[data-rw-pieces]', this);
      this.lb = $('[data-rw-lb]', this);
      this.lbStage = $('[data-rw-lb-stage]', this);
      this.lbKicker = $('[data-rw-lb-kicker]', this);
      this.lbName = $('[data-rw-lb-name]', this);
      this.closeBtn = $('[data-rw-zoom-close]', this);
      this.autoBtn = $('[data-rw-auto]', this);

      this.cloneBodies();
      this.bodies = $$('[data-rw-model]', this.actors);

      this.initCards();
      this.bind();
      this.initCursor();
      this.measure();
      this.setIndex(0, true);
      this.decorateImages();
      this.observe();
      this.detectFeet();

      if (this.reduced) {
        this.classList.add('is-revealed');
        this.cur = 0;
        this.target = 0;
      }

      if (this.dataset.autoplay === 'true' && !this.reduced) {
        this.play(true);
        this.restartBar();
        this.startTimer();
      } else {
        this.play(false);
      }

      this.kick();
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
      clearTimeout(this._resizeTimer);
      this.ro?.disconnect();
      this.io?.disconnect();
      this.revealIo?.disconnect();
      this.dockAll?.();
      window.removeEventListener('resize', this.onResize);
      window.removeEventListener('pointerup', this.onPointerUp);
      document.removeEventListener('visibilitychange', this.onVisibility);
      document.removeEventListener('keydown', this.onKeyDown);
      this.sheetHost?.remove();
    }

    /* ------------------------------------------------------------- cloning */
    cloneBodies() {
      const originals = $$('[data-rw-model]', this.actors);
      originals.forEach((body, i) => {
        const clone = body.cloneNode(true);
        clone.setAttribute('data-rw-clone', '');
        clone.setAttribute('data-index', String(i + originals.length));
        clone.querySelectorAll('img').forEach((img) => {
          img.loading = 'lazy';
          img.classList.remove('is-decoded');
        });
        this.actors.append(clone);
      });
    }

    decorateImages() {
      $$('[data-model-image]', this).forEach((img) => {
        const done = () => { if (img.naturalWidth) img.classList.add('is-decoded'); };
        if (img.complete && img.naturalWidth) done();
        else {
          if (img.decode) img.decode().then(done).catch(done);
          img.addEventListener('load', done, { once: true });
        }
      });
    }

    /* --------------------------------------------------------------- cards */
    initCards() {
      $$('.rw__item', this).forEach((card) => {
        const picker = $('[data-rw-picker]', card);
        if (!picker) return;
        card._picker = picker;
        picker._card = card;
        try {
          card._variants = JSON.parse($('[data-rw-variants]', picker).textContent);
        } catch (err) {
          card._variants = [];
        }
        const checked = $('input:checked', picker);
        if (checked) {
          const found = card._variants.find((v) => v.a && v.o[0] === checked.value);
          card.dataset.selected = found ? String(found.id) : '';
        }
        this.syncCard(card);
      });
    }

    syncCard(card) {
      if (!card || !card._picker) return;
      const picker = card._picker;
      const checked = $('input:checked', picker);
      const value = checked ? checked.value : '';
      const variant = card._variants.find((v) => v.a && v.o[0] === value);
      card.dataset.selected = variant ? String(variant.id) : '';

      const confirm = $('[data-rw-confirm]', picker);
      const label = $('[data-rw-confirm-label]', picker);
      if (confirm) confirm.disabled = !variant;
      if (label) label.textContent = variant ? (label.dataset.add || 'Add to bag') : this.msgSoldout;

      $$('.rw__pill', picker).forEach((pill) => {
        const input = $('input', pill);
        if (!input) return;
        const ok = card._variants.some((v) => v.a && v.o[0] === input.value);
        pill.classList.toggle('is-unavailable', !ok);
        input.disabled = !ok;
      });
    }

    /* --------------------------------------------------------------- events */
    bind() {
      this.onResize = () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = window.setTimeout(() => this.measure(), 120);
      };
      this.onVisibility = () => {
        if (!document.hidden) this.kick();
        else this.last = 0;
      };
      this.onKeyDown = (e) => {
        if (e.key !== 'Escape') return;
        if (this.sheetCard) {
          const card = this.sheetCard;
          this.closePicker(card);
          return;
        }
        if (this.zoomed) this.closeLook();
      };

      window.addEventListener('resize', this.onResize);
      document.addEventListener('visibilitychange', this.onVisibility);
      document.addEventListener('keydown', this.onKeyDown);

      this.stage.addEventListener('pointerdown', this.onPointerDown);
      this.stage.addEventListener('pointermove', this.onPointerMove);
      this.stage.addEventListener('pointerup', this.onPointerUp);
      this.stage.addEventListener('pointercancel', this.onPointerUp);
      this.stage.addEventListener('pointerleave', () => {
        if (!this.cursor) return;
        this.cursor.classList.remove('is-on', 'is-link', 'is-view');
        this.cursorOn = false;
      });
      this.stage.addEventListener('wheel', this.onWheel, { passive: false });
      this.stage.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      });
      this.addEventListener('change', this.onChange);
      this.addEventListener('click', this.onClick);
      this.addEventListener('click', (e) => {
        if (this.suppressClick) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);

      const panel = $('.rw__panel', this);
      if (panel) {
        panel.addEventListener('pointerenter', (e) => {
          if (e.pointerType === 'mouse') this.panelHover = true;
        });
        panel.addEventListener('pointerleave', (e) => {
          if (e.pointerType !== 'mouse') return;
          this.panelHover = false;
          this.restartBar();
          this.startTimer();
        });
      }

      this.addEventListener('pointerover', (e) => {
        const row = e.target.closest('.rw__item');
        if (row && e.pointerType !== 'touch') this.hot(Number(row.dataset.rwCard));
      });
      this.addEventListener('pointerout', (e) => {
        const row = e.target.closest('.rw__item');
        if (!row) return;
        if (row.contains(e.relatedTarget)) return;
        this.clearHot();
      });

      // header bag
      const open = document.getElementById('open-bag');
      open?.addEventListener('click', () => {
        Bag.render();
        const dialog = document.getElementById('bag-dialog');
        if (dialog && !dialog.open) dialog.showModal();
      });
      const dialog = document.getElementById('bag-dialog');
      document.getElementById('close-bag')?.addEventListener('click', () => dialog?.close());
      document.getElementById('export-bag')?.addEventListener('click', () => Bag.export());
      dialog?.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
    }

    onClick(e) {
      if (this.suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const t = e.target;

      if (t.closest('[data-rw-pick-close]')) {
        if (this.sheetCard) this.closePicker(this.sheetCard);
        return;
      }
      if (t.closest('[data-rw-zoom-close]')) { this.closeLook(); return; }
      if (this.zoomed && (t === this.lb || t === this.lbStage)) { this.closeLook(); return; }
      if (t.closest('[data-rw-zoom]')) { this.openLook(); return; }
      if (t.closest('[data-rw-next]')) { this.next(); return; }
      if (t.closest('[data-rw-prev]')) { this.prev(); return; }

      const tick = t.closest('[data-rw-tick]');
      if (tick) { this.go(Number(tick.dataset.rwTick)); return; }

      if (t.closest('[data-rw-auto]')) { this.toggleAuto(); return; }

      const pin = t.closest('[data-rw-pin]');
      if (pin) {
        this.engage();
        this.hot(Number(pin.dataset.rwPin), true);
        return;
      }

      const go = t.closest('[data-rw-go]');
      if (go) {
        const body = go.closest('[data-rw-model]');
        const a = Number(body.dataset.index);
        const N = this.N;
        let k = ((a - Math.round(this.target)) % N + N) % N;
        if (k > N / 2) k -= N;
        if (k !== 0 && Math.abs(k) < 6) this.moveTo(Math.round(this.target) + k);
        else this.openLook();
        return;
      }

      if (t.closest('[data-rw-confirm]')) {
        const picker = t.closest('[data-rw-picker]');
        this.confirmCard(picker?._card);
        return;
      }

      const add = t.closest('[data-rw-add]');
      if (add) { this.togglePicker(add.closest('.rw__item')); return; }

      if (t.closest('[data-rw-all]')) { this.addFullLook(); return; }

      if (t.closest('.rw__panel') && t.closest('button, a, input, select, label')) this.engage();
    }

    onChange(e) {
      const input = e.target;
      if (!input || !input.matches || !input.matches('input[type="radio"]')) return;
      const picker = input.closest('[data-rw-picker]');
      const card = picker?._card;
      if (!card) return;
      card.dataset.touched = '1';
      this.syncCard(card);
      this.engage();
    }

    /* -------------------------------------------------------------- pointer */
    onPointerDown = (e) => {
      if (this.zoomed) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        t: this.target,
        last: e.clientX,
        lastT: e.timeStamp,
        active: false,
        samples: [{ x: e.clientX, time: e.timeStamp }]
      };
    };

    onPointerMove = (e) => {
      const d = this.drag;
      if (!d || e.pointerId !== d.id) return;
      if (e.pointerType === 'mouse' && e.buttons === 0) { this.onPointerUp(e); return; }
      if (!d.active) {
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { this.drag = null; return; }
        if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
          d.active = true;
          this.dragging = true;
          this.classList.add('is-dragging');
          this.stage.classList.add('is-dragging');
          this.cursor?.classList.add('is-drag');
          this.cursor?.classList.remove('is-view', 'is-link');
          try { this.stage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        } else {
          return;
        }
      }
      d.last = e.clientX;
      d.lastT = e.timeStamp;
      d.samples.push({ x: e.clientX, time: e.timeStamp });
      if (d.samples.length > 6) d.samples.shift();
      this.target = d.t - (e.clientX - d.x) / this.unit;
      this.setStill(false);
      this.kick();
    };

    onPointerUp = (e) => {
      const d = this.drag;
      if (!d || (e.pointerId != null && e.pointerId !== d.id)) return;
      this.drag = null;
      if (!d.active) return;

      const dx = d.last - d.x;
      const elapsed = Math.max(1, d.lastT - d.samples[0].time);
      const vx = (d.last - d.samples[0].x) / elapsed;
      const from = Math.round(d.t);
      const dir = dx > 0 ? 1 : -1;

      if (this.phone) {
        if (Math.abs(dx) > 30 || Math.abs(vx) > 0.3) this.moveTo(from - dir);
        else this.moveTo(from);
      } else {
        let i = Math.round(this.target - (vx * 160) / this.unit);
        if (i === from && Math.abs(vx) > 0.3) i = from - dir;
        i = clamp(i, from - 2, from + 2);
        this.moveTo(i);
      }

      this.dragging = false;
      this.classList.remove('is-dragging');
      this.stage.classList.remove('is-dragging');
      this.cursor?.classList.remove('is-drag');
      this.suppressClick = true;
      window.setTimeout(() => { this.suppressClick = false; }, 60);
      try { this.stage.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
    };

    onWheel = (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < this.wheelLock) return;
      this.wheelAcc += e.deltaX;
      if (Math.abs(this.wheelAcc) > 45) {
        if (this.wheelAcc > 0) this.next();
        else this.prev();
        this.wheelAcc = 0;
        this.wheelLock = now + 520;
      }
    };

    /* --------------------------------------------------------------- cursor */
    initCursor() {
      this.cursor = $('[data-rw-cursor]', this);
      if (!this.cursor) return;
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        this.cursor.remove();
        this.cursor = null;
        return;
      }
      this.classList.add('rw--cursor');
      this.cursorOn = false;
      this.cursorX = 0;
      this.cursorY = 0;
      this.cursorTX = 0;
      this.cursorTY = 0;

      this.stage.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = this.stage.getBoundingClientRect();
        this.cursorTX = e.clientX - r.left;
        this.cursorTY = e.clientY - r.top;
        if (!this.cursorOn) {
          this.cursorOn = true;
          this.cursorX = this.cursorTX;
          this.cursorY = this.cursorTY;
          this.cursor.classList.add('is-on');
          this.cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0)`;
        }
        this.cursor.classList.toggle('is-view', !!e.target.closest('[data-rw-zoom]') && !this.dragging);
        this.cursor.classList.toggle('is-link', !!e.target.closest('[data-rw-pin], [data-rw-go]') && !this.dragging);
        this.moveCursor();
      });
    }

    moveCursor() {
      if (!this.cursor) return;
      if (this.cursorRaf) return;
      const step = () => {
        this.cursorRaf = 0;
        const k = this.reduced ? 1 : 0.18;
        this.cursorX += (this.cursorTX - this.cursorX) * k;
        this.cursorY += (this.cursorTY - this.cursorY) * k;
        this.cursor.style.transform = `translate3d(${this.cursorX.toFixed(2)}px, ${this.cursorY.toFixed(2)}px, 0)`;
        if (Math.abs(this.cursorTX - this.cursorX) > 0.2 || Math.abs(this.cursorTY - this.cursorY) > 0.2) {
          this.cursorRaf = requestAnimationFrame(step);
        }
      };
      this.cursorRaf = requestAnimationFrame(step);
    }

    /* --------------------------------------------------------------- measure */
    measure() {
      const vw = window.innerWidth;
      const phone = vw <= 749;
      const nextMode = phone ? (this.dataset.mstyle || 'classic') : (this.dataset.style || 'ring');
      const modeChanged = this.mode !== nextMode;
      this.phone = phone;
      this.mode = nextMode;
      this.classList.toggle('rw--ring', this.mode === 'ring');
      this.classList.toggle('rw--classic', this.mode === 'classic');

      let frameH;
      if (phone) {
        if (this._vh == null || this._lastW !== vw || Math.abs(window.innerHeight - this._vh) >= 160) {
          this._vh = window.innerHeight;
        }
        const pct = clamp(Number(this.dataset.mheightVh) || 100, 50, 120);
        frameH = (this._vh * pct) / 100;
      } else {
        let headerH = 0;
        $$('.shopify-section-group-header-group, #shopify-section-header, #shopify-section-announcement-bar').forEach((el) => {
          if (el.contains(this)) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          headerH += el.getBoundingClientRect().height;
        });
        frameH = Math.max(380, window.innerHeight - headerH);
      }
      this._lastW = vw;
      this.style.setProperty('--rw-frame-h', `${Math.round(frameH)}px`);

      const rect = this.stage.getBoundingClientRect();
      const W = Math.round(rect.width);
      const H = Math.round(rect.height);
      if (!W || !H) return;
      this.W = W;
      this.H = H;

      const fs = this.mode === 'ring' ? 1.08 : 1;
      this.fs = fs;
      const modelH = this.mode === 'ring'
        ? Math.max(200, Math.round((H - 34 - 18) / 1.08))
        : Math.max(200, Math.round(H - (phone ? 24 : 36) - 18));
      this.modelH = modelH;
      this.stage.style.setProperty('--rw-model-h', `${modelH}px`);
      this.stage.style.setProperty('--rw-fs', String(fs));

      let hx;
      let hy;
      if (this.mode === 'ring') { hx = W * 0.5; hy = 34; }
      else if (phone) { hx = W * 0.3; hy = 22; }
      else { hx = W * 0.4; hy = 36; }
      this.hx = hx;
      this.hy = hy;
      this.stage.style.setProperty('--rw-hx', `${hx}px`);
      this.stage.style.setProperty('--rw-hy', `${hy}px`);
      this.style.setProperty('--rw-ax', `${((hx / W) * 100).toFixed(2)}%`);

      if (this.mode === 'ring') {
        this.cx = W * 0.5;
        this.R = W * (phone ? 0.72 : 0.62);
        this.P = W * (phone ? 1.9 : 1.65);
        this.floor = H - 34;
        this.horizon = H * 0.36;
        this.unit = Math.max(phone ? 90 : 120, W * 0.3);
      } else {
        this.cfg = phone
          ? { ax: 0.3, ay: 22, sx: 0.32, sy: 22, sr: 0.76, ex: 0.55, d: 4 }
          : { ax: 0.4, ay: 36, sx: 0.125, sy: 58, sr: 0.76, ex: 0.38, d: 5 };
        this.unit = Math.max(phone ? 90 : 120, W * this.cfg.sx * 1.6);
      }

      if (this.mode === 'classic' && (!this.line.length || modeChanged)) {
        this.line = this.bodies.map((_, a) => {
          const goal = a % this.N;
          return { x: goal + this.start, g: goal + this.start, goal, v: 0, from: 0, trip: false };
        });
      }
      if (modeChanged && this.mode === 'ring') {
        this.cur = this.target;
        this.vel = 0;
      }

      this.bw = this.bodies[0] ? this.bodies[0].offsetWidth : modelH * 0.5625;

      if (!this.phone) this.dockAll();
      this.renderAll();
    }

    /* ---------------------------------------------------------------- render */
    put(el, x, bottom, scale, opacity, blur, z) {
      const w = this.bw || 200;
      if (x + (w * scale) / 2 < -4 || x - (w * scale) / 2 > this.W + 4) opacity = 0;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${(-bottom).toFixed(2)}px, 0) translateX(-50%) scale(${scale.toFixed(4)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(z);
      el.style.visibility = opacity < 0.01 ? 'hidden' : 'visible';
      el.style.pointerEvents = opacity < 0.5 ? 'none' : '';
      if (blur > 0.05) el.style.filter = `blur(${blur.toFixed(1)}px)`;
      else if (el.style.filter) el.style.filter = '';
    }

    renderAll() {
      if (!this.W || !this.H) return;
      if (this.mode === 'ring') this.renderRing();
      else this.renderLine();
    }

    renderRing() {
      const { W, H, cx, R, P, fs, floor, horizon } = this;
      const step = (Math.PI * 2) / this.N;
      for (let a = 0; a < this.bodies.length; a++) {
        let phi = ((a - this.cur) * step) % (Math.PI * 2);
        if (phi > Math.PI) phi -= Math.PI * 2;
        if (phi <= -Math.PI) phi += Math.PI * 2;
        const z = R * (1 - Math.cos(phi));
        const persp = P / (P + z);
        const sl = Math.abs(phi) / step;
        const scale = persp * (1 + (fs - 1) * clamp(1 - sl, 0, 1));
        const x = cx + R * Math.sin(phi) * persp;
        const feet = horizon + (floor - horizon) * persp;
        const bottom = H - feet;
        const blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
        let opacity = clamp((Math.cos(phi) + 0.55) / 0.3, 0, 1);
        if (this.still && sl < 0.02) opacity = 0;
        this.put(this.bodies[a], x, bottom, scale, opacity, blur, Math.round(scale * 1000));
      }
    }

    renderLine() {
      const c = this.cfg;
      if (!c) return;
      const W = this.W;
      for (let a = 0; a < this.bodies.length; a++) {
        const st = this.line[a];
        if (!st) continue;
        let k = st.x;
        let e = -1;

        if (st.trip) {
          const span = Math.abs(st.goal - st.from);
          const u = span ? clamp(Math.abs(st.x - st.from) / span, 0, 1) : 1;
          if (st.goal > st.from) {
            if (u < 0.5) e = 2 * u * 1.4;
            else k = st.goal + 2 * (1 - u);
          } else if (u < 0.5) {
            k = st.from + 2 * u;
          } else {
            e = 2 * (1 - u) * 1.4;
          }
        } else if (k < 0) {
          e = Math.min(-k, 1.4);
        }

        if (e >= 0) {
          const x = W * (c.ax - c.ex * e);
          const bottom = c.ay - 22 * e;
          const scale = 1 + 0.14 * e;
          const opacity = Math.max(0, 1 - 1.05 * e);
          this.put(this.bodies[a], x, bottom, scale, opacity, 4 * Math.min(e, 1), 1100);
        } else {
          const x = W * (c.ax + c.sx * k);
          const bottom = c.ay + c.sy * k;
          const scale = Math.pow(c.sr, k);
          let opacity = k <= c.d - 1 ? 1 - 0.13 * k : Math.max(0, 0.61 * (c.d - k));
          if (this.still && k < 0.02) opacity = 0;
          this.put(this.bodies[a], x, bottom, scale, opacity, Math.min(0.9 * k, 3.2), 1000 - Math.round(10 * k));
        }
      }
    }

    /* ------------------------------------------------------------- animation */
    kick() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(this.boundFrame);
    }

    frame(ts) {
      this.raf = 0;
      if (!this.visible || document.hidden) { this.last = 0; return; }
      const dt = this.last ? Math.min(0.034, (ts - this.last) / 1000) : 1 / 60;
      this.last = ts;

      let settled;
      if (this.mode === 'ring') {
        settled = this.stepRing(dt);
      } else {
        this.cur = this.target;
        settled = this.stepLine(dt);
      }

      if (!settled) this.setStill(false);
      this.renderAll();

      if (!settled || this.dragging) this.kick();
      else {
        this.last = 0;
        this.setStill(true);
      }
    }

    stepRing(dt) {
      if (this.reduced) { this.cur = this.target; this.vel = 0; return true; }
      const K = 95;
      const C = 19.49;
      const h = dt / 3;
      for (let i = 0; i < 3; i++) {
        const acc = -K * (this.cur - this.target) - C * this.vel;
        this.vel += acc * h;
        this.cur += this.vel * h;
      }
      if (Math.abs(this.cur - this.target) <= 0.0005 && Math.abs(this.vel) <= 0.0005) {
        this.cur = this.target;
        this.vel = 0;
        return true;
      }
      return false;
    }

    stepLine(dt) {
      const K = 95;
      const C = 19.49;
      let settled = true;
      for (let a = 0; a < this.bodies.length; a++) {
        const st = this.line[a];
        if (!st) continue;
        const goal = ((a - this.target) % this.N + this.N) % this.N;
        if (goal !== st.goal) {
          if (!st.trip && Math.abs(goal - st.goal) > this.N / 2) {
            st.trip = true;
            st.from = st.x;
          }
          st.goal = goal;
        }
        if (this.reduced) {
          st.x = st.goal;
          st.g = st.goal;
          st.v = 0;
          st.trip = false;
          continue;
        }
        const tau = this.dragging ? 0.016 : (st.trip ? 0.1 : 0.03 + 0.04 * Math.min(st.goal, 4));
        st.g += (st.goal - st.g) * (1 - Math.exp(-dt / tau));
        const h = dt / 3;
        for (let i = 0; i < 3; i++) {
          const acc = -K * (st.x - st.g) - C * st.v;
          st.v += acc * h;
          st.x += st.v * h;
        }
        if (Math.abs(st.x - st.g) < 0.0006 && Math.abs(st.v) < 0.0006) {
          st.x = st.g;
          st.v = 0;
        }
        if (st.trip && Math.abs(st.x - st.goal) < 0.02) {
          st.trip = false;
          st.x = st.goal;
          st.v = 0;
        }
        if (Math.abs(st.x - st.goal) > 0.0008 || Math.abs(st.v) > 0.0008 || st.trip) settled = false;
      }
      return settled;
    }

    setStill(value) {
      if (this.still === value) return;
      this.still = value;
      this.classList.toggle('rw--still', value);
      if (value) this.renderAll();
    }

    /* ------------------------------------------------------------ navigation */
    setIndex(i, first = false) {
      const n = this.n;
      const idx = ((i % n) + n) % n;
      const changed = idx !== this.index || first;
      if (!changed) { this.kick(); return; }

      if (!first) {
        if (this.zoomed) this.closeLook(true);
        if (this.phone && this.sheetCard) this.closePicker(this.sheetCard, true);
      }

      this.prevIndex = this.index;
      this.index = idx;
      this.kick();

      const N = this.N;
      this.bodies.forEach((body, a) => {
        let rank = ((a - Math.round(this.target)) % N + N) % N;
        if (this.mode === 'ring' && rank > N / 2) rank -= N;
        const near = this.mode === 'ring'
          ? (rank !== 0 && Math.abs(rank) <= 2)
          : (rank > 0 && rank <= 3);
        body.setAttribute('aria-hidden', near ? 'false' : 'true');
        const hit = $('[data-rw-go]', body);
        if (hit) hit.tabIndex = near ? 0 : -1;
      });

      this.style.setProperty('--rw-progress', ((idx + 1) / n).toFixed(3));

      this.heroes.forEach((hero, j) => {
        const on = j === idx;
        hero.classList.toggle('is-on', on);
        hero.classList.toggle('was', !on && j === this.prevIndex);
        hero.setAttribute('aria-hidden', on ? 'false' : 'true');
        const zoom = $('[data-rw-zoom]', hero);
        if (zoom) zoom.tabIndex = on ? 0 : -1;
      });

      if (!first && !this.reduced) this.sweep();

      if (!first && this.live) this.live.textContent = `Look ${idx + 1}: ${LOOKS[idx].name}`;

      this.ticks.forEach((tick, j) => {
        tick.setAttribute('aria-current', j === idx ? 'true' : 'false');
        tick.classList.toggle('is-past', j < idx);
      });

      this.panels.forEach((panel, j) => {
        panel.hidden = j !== idx;
        panel.classList.remove('is-in');
      });
      const panel = this.panels[idx];
      if (panel) {
        void panel.offsetWidth;
        if (!first) panel.classList.add('is-in');
      }

      this.pieces.forEach((el) => {
        el.textContent = '3 pieces';
        el.classList.remove('is-swap');
        void el.offsetWidth;
        el.classList.add('is-swap');
      });

      this.clearHot();
      this.restartBar();
      this.startTimer();
    }

    moveTo(T) {
      this.target = T;
      this.setStill(false);
      this.setIndex(Math.round(((T % this.n) + this.n) % this.n));
      this.kick();
    }

    next() { this.moveTo(Math.round(this.target) + 1); }
    prev() { this.moveTo(Math.round(this.target) - 1); }

    go(i) {
      let d = (i - this.index) % this.n;
      if (d > 3) d -= this.n;
      this.moveTo(Math.round(this.target) + d);
    }

    sweep() {
      this.stage.classList.remove('is-sweep');
      void this.stage.offsetWidth;
      this.stage.classList.add('is-sweep');
    }

    /* -------------------------------------------------------------- autoplay */
    play(on) {
      this.playing = !!on;
      this.classList.toggle('is-playing', this.playing);
      if (this.autoBtn) {
        this.autoBtn.classList.toggle('is-playing', this.playing);
        this.autoBtn.setAttribute('aria-pressed', this.playing ? 'true' : 'false');
      }
      if (!this.playing) {
        clearTimeout(this.timer);
        this.timer = 0;
      }
    }

    toggleAuto() {
      if (!this.playing) this.engaged = false;
      this.play(!this.playing);
      if (this.playing) {
        this.restartBar();
        this.startTimer();
      }
    }

    restartBar() {
      if (!this.ticks.length) return;
      this.ticks.forEach((tick) => tick.classList.remove('is-run'));
      void this.ticks[0].offsetWidth;
      if (this.playing) this.ticks[this.index]?.classList.add('is-run');
    }

    startTimer() {
      clearTimeout(this.timer);
      if (!this.playing) return;
      this.timer = window.setTimeout(() => {
        if (this.playing && this.visible && !this.dragging && !document.hidden &&
            !this.panelHover && !this.zoomed && !this.engaged) {
          this.next();
        } else {
          this.restartBar();
          this.startTimer();
        }
      }, this.speed);
    }

    engage() {
      this.engaged = true;
      this.play(false);
    }

    /* ------------------------------------------------------------------ hot */
    clearHot() {
      $$('.rw__pin.is-hot', this).forEach((p) => p.classList.remove('is-hot'));
      $$('.rw__item.is-hot', this).forEach((i) => i.classList.remove('is-hot'));
    }

    hot(n, scroll) {
      this.clearHot();
      const scope = this.zoomed ? this.lb : this.heroes[this.index];
      scope?.querySelectorAll(`[data-rw-pin="${n}"]`).forEach((p) => p.classList.add('is-hot'));
      const panel = this.panels[this.index];
      const card = panel?.querySelector(`[data-rw-card="${n}"]`);
      if (card) {
        card.classList.add('is-hot');
        if (scroll) this.revealCard(card, panel);
      }
    }

    revealCard(card, panel) {
      const list = $('.rw__items', panel);
      if (!list) return;
      const behavior = this.reduced ? 'auto' : 'smooth';
      const horizontal = list.scrollWidth > list.clientWidth + 2 && getComputedStyle(list).flexDirection === 'row';
      if (horizontal) {
        list.scrollTo({ left: card.offsetLeft - list.offsetLeft - 20, behavior });
      } else if (list.scrollHeight > list.clientHeight + 2) {
        list.scrollTo({ top: card.offsetTop - list.offsetTop - 12, behavior });
      } else {
        const r = card.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight - 140) {
          window.scrollBy({ top: r.top - window.innerHeight * 0.3, behavior });
        }
      }
    }

    /* --------------------------------------------------------------- pickers */
    togglePicker(card) {
      if (!card) return;
      if (card.classList.contains('is-picking')) this.closePicker(card);
      else this.openPicker(card);
    }

    openPicker(card) {
      if (!card || !card._picker) return;
      const picker = card._picker;
      const add = $('[data-rw-add]', card);
      card.classList.add('is-picking');
      add?.setAttribute('aria-expanded', 'true');

      if (this.phone) {
        this.openSheet(card, picker);
      } else {
        picker.hidden = false;
        picker.classList.remove('is-open');
        void picker.offsetWidth;
        picker.classList.add('is-open');
        const input = $('input:checked', picker) || $('input', picker);
        try { input?.focus({ preventScroll: true }); } catch (err) { input?.focus(); }
        this.reveal(card);
      }
    }

    reveal(card) {
      const list = card.closest('.rw__items');
      if (!list) return;
      const cr = card.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      if (cr.bottom > lr.bottom - 8 || cr.top < lr.top) {
        list.scrollTo({ top: list.scrollTop + (cr.top - lr.top) - 8, behavior: this.reduced ? 'auto' : 'smooth' });
      }
    }

    closePicker(card, silent) {
      if (!card) return;
      card.classList.remove('is-picking');
      const add = $('[data-rw-add]', card);
      add?.setAttribute('aria-expanded', 'false');
      const picker = card._picker;
      if (!picker) return;

      if (this.phone && this.sheetCard === card) {
        this.sheetCard = null;
        this.classList.remove('rw--picking');
        const host = this.sheetHost;
        if (host) {
          host.classList.remove('is-open');
          window.setTimeout(() => {
            if (this.sheetCard === card) return;
            card.append(picker);
            picker.hidden = true;
            picker.classList.remove('is-open');
            picker.style.display = '';
            picker.style.transform = '';
          }, 650);
        }
        if (!silent) { try { add?.focus({ preventScroll: true }); } catch (err) { /* noop */ } }
      } else if (!this.phone) {
        picker.hidden = true;
        picker.classList.remove('is-open');
        if (!silent) { try { add?.focus({ preventScroll: true }); } catch (err) { /* noop */ } }
      }
    }

    ensureHost() {
      if (this.sheetHost) return this.sheetHost;
      const host = document.createElement('div');
      host.className = 'rw-sheet-host';
      const scrim = document.createElement('button');
      scrim.type = 'button';
      scrim.className = 'rw__pick-scrim';
      scrim.setAttribute('data-rw-pick-close', '');
      scrim.tabIndex = -1;
      scrim.setAttribute('aria-hidden', 'true');
      host.append(scrim);
      document.body.append(host);
      host.addEventListener('click', (e) => this.onClick(e));
      host.addEventListener('change', (e) => this.onChange(e));
      this.sheetHost = host;
      return host;
    }

    openSheet(card, picker) {
      if (this.sheetCard && this.sheetCard !== card) this.closePicker(this.sheetCard, true);
      const host = this.ensureHost();
      const styles = getComputedStyle(this);
      ['--rw-panel', '--rw-text', '--rw-muted', '--rw-line', '--rw-accent', '--rw-on-accent',
        '--rw-btn-bg', '--rw-btn-fg', '--rw-btn-radius', '--rw-pill-radius', '--rw-bar-r',
        '--rw-thumb-radius', '--rw-pt-size', '--rw-price', '--rw-opt', '--rw-ease',
        '--rw-ease-sheet', '--rw-ease-spring'].forEach((token) => {
        host.style.setProperty(token, styles.getPropertyValue(token));
      });
      host.style.fontFamily = styles.fontFamily;
      host.style.color = styles.color;

      host.append(picker);
      picker.hidden = false;
      picker.style.display = 'flex';
      picker.classList.remove('is-open');
      this.sheetCard = card;
      this.classList.add('rw--picking');
      host.classList.add('is-open');
      requestAnimationFrame(() => {
        picker.classList.add('is-open');
        const input = $('input:checked', picker) || $('input', picker);
        try { input?.focus({ preventScroll: true }); } catch (err) { /* noop */ }
      });
    }

    dockAll() {
      if (!this.sheetHost) return;
      const card = this.sheetCard;
      if (card) {
        this.sheetCard = null;
        this.classList.remove('rw--picking');
        card.classList.remove('is-picking');
        const add = $('[data-rw-add]', card);
        add?.setAttribute('aria-expanded', 'false');
        const picker = card._picker;
        if (picker) {
          card.append(picker);
          picker.hidden = true;
          picker.classList.remove('is-open');
          picker.style.display = '';
        }
        this.sheetHost.classList.remove('is-open');
      }
      this.sheetHost.remove();
      this.sheetHost = null;
    }

    /* ---------------------------------------------------------------- adding */
    confirmCard(card) {
      if (!card || card.classList.contains('is-added') || card.classList.contains('is-loading')) return;
      const id = Number(card.dataset.selected);
      if (!id) { this.openPicker(card); return; }
      card.dataset.touched = '1';
      this.addPieces([{ card, id }]);
    }

    addPieces(list) {
      const cards = list.map((entry) => entry.card);
      cards.forEach((card) => card.classList.add('is-loading'));
      try {
        Bag.add(list.map((entry) => ({ id: entry.id, quantity: 1 })));
        cards.forEach((card) => {
          card.classList.remove('is-loading');
          card.classList.add('is-added');
          const button = $('[data-rw-add]', card);
          if (button) {
            button.setAttribute('aria-label', button.dataset.addedLabel || 'Added to bag');
            button.removeAttribute('aria-expanded');
            button.disabled = true;
          }
        });
        cards.forEach((card) => this.closePicker(card, true));
        if (!this.reduced && navigator.vibrate) navigator.vibrate(12);
        this.checkComplete(cards[0]?.closest('.rw__look-panel'));
      } catch (err) {
        cards.forEach((card) => card.classList.remove('is-loading'));
        const panel = cards[0]?.closest('.rw__look-panel');
        this.showMsg(panel, err.message || this.msgError);
      }
    }

    addFullLook() {
      const panel = this.panels[this.index];
      if (!panel) return;
      const cta = $('[data-rw-all]', panel);
      if (panel.classList.contains('is-complete') || cta?.classList.contains('is-loading')) return;

      this.clearMsg(panel);
      const cards = $$('.rw__item', panel).filter((card) => !card.classList.contains('is-added'));
      const ready = cards.filter((card) => card.dataset.variantId ||
        (card.dataset.touched && card.dataset.selected));
      const pending = cards.filter((card) => !ready.includes(card));

      if (ready.length) {
        cta?.classList.add('is-loading');
        ready.forEach((card) => card.classList.add('is-loading'));
        try {
          Bag.add(ready.map((card) => ({ id: Number(card.dataset.selected), quantity: 1 })));
          ready.forEach((card) => {
            card.classList.remove('is-loading');
            card.classList.add('is-added');
            const button = $('[data-rw-add]', card);
            if (button) {
              button.setAttribute('aria-label', button.dataset.addedLabel || 'Added to bag');
              button.removeAttribute('aria-expanded');
              button.disabled = true;
            }
            this.closePicker(card, true);
          });
        } catch (err) {
          ready.forEach((card) => card.classList.remove('is-loading'));
          this.showMsg(panel, err.message || this.msgError);
        }
        cta?.classList.remove('is-loading');
      }

      if (pending.length) {
        pending.forEach((card, i) => {
          if (!this.phone || i === 0) this.openPicker(card);
        });
        this.revealCard(pending[0], panel);
        this.showMsg(panel, this.msgChoose.replace('[items]', pending.map((card) => card.dataset.title).join(', ')));
      }

      this.checkComplete(panel);
    }

    checkComplete(panel) {
      if (!panel) return;
      const cards = $$('.rw__item', panel);
      if (cards.length >= 2 && cards.every((card) => card.classList.contains('is-added'))) {
        panel.classList.add('is-complete');
        this.clearMsg(panel);
      }
    }

    showMsg(panel, text) {
      const msg = panel ? $('[data-rw-msg]', panel) : null;
      if (!msg) return;
      msg.textContent = text;
      msg.hidden = !text;
    }

    clearMsg(panel) {
      const msg = panel ? $('[data-rw-msg]', panel) : null;
      if (!msg) return;
      msg.textContent = '';
      msg.hidden = true;
    }

    /* ---------------------------------------------------------------- popup */
    openLook() {
      if (this.zoomed || !this.lbStage) return;
      this.engage();
      this.clearHot();

      const hero = this.heroes[this.index];
      const figure = $('.rw__figure', hero);
      if (!figure) return;
      const from = figure.getBoundingClientRect();

      const wrap = document.createElement('div');
      wrap.className = 'rw__lb-model';
      const shadow = $('.rw__shadow', hero).cloneNode(true);
      const clone = figure.cloneNode(true);
      clone.querySelectorAll('[data-rw-zoom]').forEach((n) => n.remove());
      clone.querySelectorAll('[data-rw-pin]').forEach((p) => { p.tabIndex = 0; });
      clone.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
        img.classList.add('is-decoded');
      });
      wrap.append(shadow, clone);
      this.lbStage.replaceChildren(wrap);

      const stageRect = this.lbStage.getBoundingClientRect();
      const h = Math.max(160, Math.min(stageRect.height, stageRect.width / 0.5625));
      wrap.style.setProperty('--rw-model-h', `${h}px`);
      wrap.style.setProperty('--rw-foot', hero.style.getPropertyValue('--rw-foot') || '0');
      clone.querySelectorAll('img').forEach((img) => {
        img.sizes = `${Math.round(h * 0.5625)}px`;
      });

      const to = clone.getBoundingClientRect();
      if (!this.reduced && from.height > 0 && to.height > 0) {
        wrap.style.transition = 'none';
        wrap.style.transform = `translate3d(${from.left - to.left}px, ${from.bottom - to.bottom}px, 0) scale(${from.height / to.height})`;
        void wrap.offsetWidth;
        requestAnimationFrame(() => {
          wrap.style.transition = '';
          wrap.style.transform = '';
        });
      }

      if (this.lbKicker) this.lbKicker.textContent = `${this.lb?.dataset.word || 'Look'} ${String(this.index + 1).padStart(2, '0')}`;
      if (this.lbName) this.lbName.textContent = hero.dataset.name || '';
      this.classList.add('rw--zoom');
      this.lb?.setAttribute('aria-hidden', 'false');
      this.zoomed = true;
      try { this.closeBtn?.focus({ preventScroll: true }); } catch (err) { this.closeBtn?.focus(); }
    }

    closeLook(instant) {
      if (!this.zoomed) return;
      const wrap = this.lbStage?.querySelector('.rw__lb-model');
      const figure = wrap?.querySelector('.rw__figure');
      const heroFigure = $('.rw__figure', this.heroes[this.index]);
      if (wrap && figure && heroFigure && !instant && !this.reduced) {
        const a = figure.getBoundingClientRect();
        const b = heroFigure.getBoundingClientRect();
        if (a.height > 0 && b.height > 0) {
          wrap.style.transform = `translate3d(${b.left - a.left}px, ${b.bottom - a.bottom}px, 0) scale(${b.height / a.height})`;
        }
      }
      const hadFocus = !!this.lb?.contains(document.activeElement);
      this.classList.remove('rw--zoom');
      this.lb?.setAttribute('aria-hidden', 'true');
      this.zoomed = false;
      window.setTimeout(() => {
        if (!this.zoomed) this.lbStage?.replaceChildren();
      }, 950);
      if (hadFocus) {
        try { this.stage.focus({ preventScroll: true }); } catch (err) { this.stage.focus(); }
      }
    }

    /* ------------------------------------------------------------ observers */
    observe() {
      this.io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          this.visible = entry.isIntersecting;
          if (this.visible) this.kick();
        });
      }, { threshold: 0 });
      this.io.observe(this);

      if (this.reduced) {
        this.classList.add('is-revealed');
      } else {
        this.revealIo = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            requestAnimationFrame(() => requestAnimationFrame(() => this.classList.add('is-revealed')));
            this.revealIo.disconnect();
          });
        }, { threshold: 0, rootMargin: '0px 0px -22% 0px' });
        this.revealIo.observe(this);
      }

      this.ro = new ResizeObserver(() => {
        if (this._roRaf) return;
        this._roRaf = requestAnimationFrame(() => {
          this._roRaf = 0;
          const rect = this.stage.getBoundingClientRect();
          if (Math.abs(Math.round(rect.width) - this.W) > 1 || Math.abs(Math.round(rect.height) - this.H) > 1) {
            this.measure();
          }
        });
      });
      this.ro.observe(this.stage);
    }

    /* --------------------------------------------------------------- feet */
    detectFeet() {
      const urls = [...new Set(this.heroes.map((hero) => hero.dataset.probe).filter(Boolean))];
      urls.forEach((url) => {
        this.measureFoot(url).then((foot) => {
          const value = foot.toFixed(4);
          this.heroes.forEach((hero) => {
            if (hero.dataset.probe === url) hero.style.setProperty('--rw-foot', value);
          });
          this.bodies.forEach((body) => {
            const idx = Number(body.dataset.index) % this.n;
            if (this.heroes[idx]?.dataset.probe === url) body.style.setProperty('--rw-foot', value);
          });
        });
      });
    }

    measureFoot(url) {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const w = 48;
            const h = Math.max(1, Math.round((img.naturalHeight * w) / img.naturalWidth));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h).data;
            let last = -1;
            for (let y = h - 1; y >= 0; y--) {
              for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 40) { last = y; break; }
              }
              if (last >= 0) break;
            }
            resolve(last < 0 ? 0 : clamp((h - 1 - last) / h, 0, 0.4));
          } catch (err) {
            resolve(0);
          }
        };
        img.onerror = () => resolve(0);
        img.src = url;
      });
    }
  }

  /* ------------------------------------------------------------------ boot */
  if (!customElements.get('runway-section')) {
    customElements.define('runway-section', RunwaySection);
  }

  Bag.init();

  if (reducedQuery.addEventListener) {
    reducedQuery.addEventListener('change', (e) => {
      $$('runway-section').forEach((section) => {
        section.reduced = e.matches;
        section.start = e.matches ? 0 : 1.15;
        if (e.matches) section.classList.add('is-revealed');
      });
    });
  }
})();

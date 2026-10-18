// Spacing Inspector website: hero animation, live demo controls, live audit
// stats, keycaps, copy buttons and scroll reveals.
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const Demo = window.SpacingDemo;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  let demo = { enabled: false, mode: 'inspect' };

  // ---- toast ---------------------------------------------------------------

  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  // ---- hero mock: scale to fit, cycle scenes --------------------------------

  const view = $('#frameView');
  const mock = $('#mock');
  const fit = () => mock.style.setProperty('--s', String(view.clientWidth / 1280));
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(view);
  fit();

  const SCENES = ['inspect', 'measure', 'audit'];
  const SCENE_MS = 4500;
  const sceneTabs = $$('.scenes button');
  let sceneIndex = 0;
  let sceneTimer = 0;
  let heroVisible = true;

  function showScene(i) {
    sceneIndex = (i + SCENES.length) % SCENES.length;
    const name = SCENES[sceneIndex];
    mock.dataset.scene = name;
    sceneTabs.forEach((t) => {
      const on = t.dataset.scene === name;
      t.setAttribute('aria-selected', String(on));
      // Restart the progress bar animation.
      const bar = t.querySelector('b');
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    });
    scheduleScene();
  }

  function scheduleScene() {
    clearTimeout(sceneTimer);
    if (reduceMotion || !heroVisible) {
      $('.scenes').classList.add('paused');
      return;
    }
    $('.scenes').classList.remove('paused');
    $('.scenes').style.setProperty('--dur', `${SCENE_MS}ms`);
    sceneTimer = setTimeout(() => showScene(sceneIndex + 1), SCENE_MS);
  }

  sceneTabs.forEach((t) => t.addEventListener('click', () => showScene(SCENES.indexOf(t.dataset.scene))));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      scheduleScene();
    }).observe(view);
  }
  showScene(0);

  // The tag under "pixel," shows the element's real size.
  const pixel = $('.pixel');
  const pixelSize = $('#pixelSize');
  const sizePixel = () => {
    const r = pixel.getBoundingClientRect();
    pixelSize.textContent = `${Math.round(r.width)} × ${Math.round(r.height)}`;
  };
  addEventListener('resize', sizePixel, { passive: true });
  if (document.fonts) document.fonts.ready.then(sizePixel);
  sizePixel();

  // ---- live demo -------------------------------------------------------------

  const navToggle = $('#navToggle');
  function renderDemo() {
    navToggle.setAttribute('aria-checked', String(demo.enabled));
    document.body.classList.toggle('demo-on', demo.enabled);
    $$('.mode-card').forEach((card) => card.classList.toggle('active', demo.enabled && card.dataset.demo === demo.mode));
  }

  function setDemo(patch) {
    if (!Demo) return;
    const res = Demo.send({ type: 'setState', ...patch });
    if (res) demo = { enabled: res.enabled, mode: res.mode };
    renderDemo();
  }

  if (Demo) {
    Demo.onState((s) => {
      demo = s;
      renderDemo();
    });
  }

  navToggle.addEventListener('click', () => {
    setDemo({ enabled: !demo.enabled });
    if (demo.enabled) toast('Inspector on. Hover anything. Esc to step back.');
  });

  $$('[data-demo]').forEach((el) =>
    el.addEventListener('click', () => {
      const mode = el.dataset.demo;
      const isCard = el.classList.contains('mode-card');
      if (isCard && demo.enabled && demo.mode === mode) return setDemo({ enabled: false });
      setDemo({ enabled: true, mode });
      const hint = {
        inspect: 'Inspect is on. Hover anything, click to pin.',
        measure: 'Measure is on. Click one element, then hover another.',
        audit: 'Audit is on. This page’s report is on the right.'
      }[mode];
      toast(hint);
    })
  );

  // ---- keyboard: keycaps light up, I / M / A start the demo ---------------------

  const keyFor = (e) => {
    if (e.key === 'Alt') return 'alt';
    if (e.key === 'Escape') return 'escape';
    if (e.key.startsWith('Arrow')) return 'arrow';
    return e.key.length === 1 ? e.key.toLowerCase() : '';
  };
  const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  addEventListener(
    'keydown',
    (e) => {
      const k = keyFor(e);
      const cap = k && $(`.key[data-key="${k}"]`);
      if (cap) cap.classList.add('lit');
      if (demo.enabled || !canHover || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const mode = { i: 'inspect', m: 'measure', a: 'audit' }[k];
      if (mode) {
        e.preventDefault();
        setDemo({ enabled: true, mode });
        toast(`${mode[0].toUpperCase()}${mode.slice(1)} is on. Esc to step back.`);
      }
    },
    true
  );
  addEventListener(
    'keyup',
    (e) => {
      const k = keyFor(e);
      const cap = k && $(`.key[data-key="${k}"]`);
      if (cap) setTimeout(() => cap.classList.remove('lit'), 120);
    },
    true
  );
  addEventListener('blur', () => $$('.key.lit').forEach((c) => c.classList.remove('lit')));

  // ---- live audit of this page ------------------------------------------------------

  function runAudit() {
    if (!Demo) return;
    const s = Demo.send({ type: 'audit:summary', auditBase: 'auto' });
    if (!s) return;
    const big = 2 * Math.PI * 80;
    const small = 2 * Math.PI * 32;
    $('#bigArc').setAttribute('stroke-dasharray', `${(big * s.score) / 100} ${big}`);
    $('#bigRing').setAttribute('aria-label', `This page's spacing score: ${s.score} out of 100`);
    $('#bigScore').textContent = String(s.score);
    $('#bigLabel').textContent = s.label;
    $('#statScanned').textContent = String(s.scanned);
    $('#statGrid').textContent = `${s.onGridPct}%`;
    $('#statBase').textContent = `${s.base}px · detected`;
    $$('.live-arc').forEach((arc) => arc.setAttribute('stroke-dasharray', `${(small * s.score) / 100} ${small}`));
    $$('.live-score').forEach((el) => (el.textContent = String(s.score)));

    const bars = s.histogram.slice(0, 10);
    const max = Math.max(1, ...bars.map((b) => b.count));
    const barsEl = $('#scaleBars');
    const ticksEl = $('#scaleTicks');
    barsEl.replaceChildren();
    ticksEl.replaceChildren();
    bars.forEach((b) => {
      const bar = document.createElement('i');
      bar.className = b.kind === 'on' ? '' : b.kind;
      bar.title = `${b.value}px, used ${b.count} times`;
      barsEl.append(bar);
      const tick = document.createElement('span');
      tick.textContent = String(b.value);
      ticksEl.append(tick);
      requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.height = `${Math.max(4, (b.count / max) * 100)}%`)));
    });
  }

  const startAudit = () => setTimeout(runAudit, 400);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(startAudit);
  else addEventListener('load', startAudit);

  // ---- 01: layer list highlights the visual ---------------------------------------------

  const visual = $('#inspectVisual');
  const layerItems = $$('#layerList li');
  let layerHover = false;
  let layerIndex = -1;
  const setLayer = (name) => {
    visual.dataset.layer = name;
    layerItems.forEach((li) => li.classList.toggle('on', li.dataset.layer === name));
  };
  layerItems.forEach((li) => {
    li.addEventListener('mouseenter', () => {
      layerHover = true;
      setLayer(li.dataset.layer);
    });
    li.addEventListener('mouseleave', () => {
      layerHover = false;
      setLayer('');
    });
  });
  if (!reduceMotion) {
    setInterval(() => {
      if (layerHover || !visual.classList.contains('in')) return;
      layerIndex = (layerIndex + 1) % (layerItems.length + 1);
      setLayer(layerIndex === layerItems.length ? '' : layerItems[layerIndex].dataset.layer);
    }, 1600);
  }

  // ---- 04: copy cards -------------------------------------------------------------------

  $$('.code-card').forEach((card) =>
    card.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(card.dataset.copy);
        const label = card.querySelector('.cc-copy');
        card.classList.add('copied');
        label.textContent = 'Copied';
        toast('Copied to clipboard');
        setTimeout(() => {
          card.classList.remove('copied');
          label.textContent = 'Copy';
        }, 1400);
      } catch (e) {
        toast('Your browser blocked the clipboard');
      }
    })
  );

  // ---- mobile menu ----------------------------------------------------------------------

  const menuBtn = $('#menuBtn');
  const links = $('#navLinks');
  menuBtn.addEventListener('click', () => {
    const open = !links.classList.contains('open');
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach((a) =>
    a.addEventListener('click', () => {
      links.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    })
  );

  // ---- analytics: which "Add to Chrome" gets clicked -------------------------------------

  $$('[data-cta]').forEach((a) =>
    a.addEventListener('click', () => {
      if (typeof window.gtag === 'function') window.gtag('event', 'add_to_chrome', { placement: a.dataset.cta });
    })
  );

  // ---- scroll reveal --------------------------------------------------------------------

  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }
})();

// Spacing Inspector website: live demo controls, live audit stats, keyboard
// orbit, copy chips, mobile menu and scroll reveals.
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

  // ---- live demo -------------------------------------------------------------

  const navToggle = $('#navToggle');
  const navLabel = $('.nt-label', navToggle);
  function renderDemo() {
    navToggle.setAttribute('aria-pressed', String(demo.enabled));
    navLabel.textContent = demo.enabled ? 'Demo on' : 'Live demo';
    document.body.classList.toggle('demo-on', demo.enabled);
    $('.card-violet').classList.toggle('demo-active', demo.enabled);
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

  const HINTS = {
    inspect: 'Inspect is on. Hover anything, click to pin, Esc to step back.',
    measure: 'Measure is on. Click one element, then hover another.',
    audit: 'Audit is on. This page’s report is on the right.'
  };

  navToggle.addEventListener('click', () => {
    setDemo({ enabled: !demo.enabled });
    if (demo.enabled) toast(HINTS[demo.mode]);
  });

  $$('[data-demo]').forEach((el) =>
    el.addEventListener('click', () => {
      setDemo({ enabled: true, mode: el.dataset.demo });
      toast(HINTS[el.dataset.demo]);
    })
  );

  // ---- keyboard: orbit keys light up, I / M / A start the demo -------------------

  const keyFor = (e) => {
    if (e.key === 'Alt') return 'alt';
    if (e.key === 'Escape') return 'escape';
    if (e.key.startsWith('Arrow')) return 'arrow';
    return e.key.length === 1 ? e.key.toLowerCase() : '';
  };
  const isTyping = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const keyEl = (k) => k && $(`.orb-key[data-key="${k}"]`);

  addEventListener(
    'keydown',
    (e) => {
      const cap = keyEl(keyFor(e));
      if (cap) cap.classList.add('lit');
      if (demo.enabled || !canHover || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const mode = { i: 'inspect', m: 'measure', a: 'audit' }[keyFor(e)];
      if (mode) {
        e.preventDefault();
        setDemo({ enabled: true, mode });
        toast(HINTS[mode]);
      }
    },
    true
  );
  addEventListener(
    'keyup',
    (e) => {
      const cap = keyEl(keyFor(e));
      if (cap) setTimeout(() => cap.classList.remove('lit'), 140);
    },
    true
  );
  addEventListener('blur', () => $$('.orb-key.lit').forEach((c) => c.classList.remove('lit')));

  // ---- live audit of this page ------------------------------------------------------

  function runAudit() {
    if (!Demo) return;
    const s = Demo.send({ type: 'audit:summary', auditBase: 'auto' });
    if (!s) return;
    const big = 2 * Math.PI * 72;
    $('#bigArc').setAttribute('stroke-dasharray', `${(big * s.score) / 100} ${big}`);
    $('#bigRing').setAttribute('aria-label', `This page's spacing score: ${s.score} out of 100`);
    $('#bigScore').textContent = String(s.score);
    $('#bigLabel').textContent = s.label;
    $('#statScanned').textContent = `${s.scanned} elements`;
    $('#statGrid').textContent = `${s.onGridPct}%`;
    $('#statBase').textContent = `${s.base}px · detected`;
    $$('.live-arc').forEach((arc) => {
      const c = 2 * Math.PI * Number(arc.dataset.r);
      arc.setAttribute('stroke-dasharray', `${(c * s.score) / 100} ${c}`);
    });
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

  // ---- copy chips -----------------------------------------------------------------------

  $$('.code-chip').forEach((chip) =>
    chip.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(chip.dataset.copy);
        chip.classList.add('copied');
        toast('Copied to clipboard');
        setTimeout(() => chip.classList.remove('copied'), 1400);
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

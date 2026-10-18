// Spacing Inspector 2.0 popup.
(() => {
  'use strict';

  const Core = window.SpacingCore;
  const CONTENT_FILES = ['lib/core.js', 'content/inspector.js'];
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const params = new URLSearchParams(location.search);

  let settings = Core.normalizeSettings({});
  let tab = null;
  let supported = false;
  let state = { enabled: false, mode: 'inspect' };
  let summary = null;
  let lastInspected = null;
  let toggleShortcut = '';

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c != null && c !== false) node.append(c);
    return node;
  }

  function useIcon(id, size) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
  }

  // ---- tab plumbing --------------------------------------------------------

  async function getTab() {
    const id = Number(params.get('tabId'));
    if (id) return chrome.tabs.get(id).catch(() => null);
    const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
    return t || null;
  }

  function canRun(t) {
    const url = (t && (t.url || t.pendingUrl)) || '';
    if (!/^(https?|file):/i.test(url)) return false;
    return !/^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i.test(url);
  }

  function hostOf(t) {
    if (!t.url) return 'this page';
    try {
      const u = new URL(t.url);
      return u.protocol === 'file:' ? 'local file' : u.host;
    } catch (e) {
      return 'this page';
    }
  }

  async function send(message, { inject = true } = {}) {
    if (!tab || !supported) return null;
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (e) {
      if (!inject) return null;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: CONTENT_FILES });
        return await chrome.tabs.sendMessage(tab.id, message);
      } catch (err) {
        supported = false;
        renderHome();
        return null;
      }
    }
  }

  async function setPageState(patch) {
    const res = await send({ type: 'setState', ...patch });
    if (res) state = res;
    renderHome();
    return res;
  }

  // ---- settings ------------------------------------------------------------

  let savedTimer = 0;
  function save(patch) {
    settings = Core.normalizeSettings({ ...settings, ...patch });
    chrome.storage.sync.set(patch);
    applyTheme();
    renderSettings();
    const s = $('#saved');
    s.classList.add('show');
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => s.classList.remove('show'), 1200);
  }

  function applyTheme() {
    let theme = settings.theme;
    if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
  }

  // ---- views ---------------------------------------------------------------

  function show(view) {
    $$('.view').forEach((v) => (v.hidden = v.id !== `view-${view}`));
    if (view === 'audit') loadAudit();
  }

  // ---- home ----------------------------------------------------------------

  function renderHome() {
    const dot = $('#statusDot');
    const title = $('#statusTitle');
    const sub = $('#statusSub');
    const toggle = $('#powerToggle');
    dot.className = 'status-dot';
    if (!supported) {
      dot.classList.add('blocked');
      title.textContent = 'Can’t run on this page';
      sub.textContent = 'Chrome blocks extensions here. Try a regular website.';
      toggle.disabled = true;
      toggle.setAttribute('aria-checked', 'false');
    } else {
      toggle.disabled = false;
      toggle.setAttribute('aria-checked', String(state.enabled));
      if (state.enabled) {
        dot.classList.add('on');
        title.textContent = 'Inspector on';
        const hint = { inspect: 'hover any element', measure: 'click an element to measure', audit: 'showing spacing issues' }[state.mode];
        sub.textContent = `${hostOf(tab)} · ${hint}`;
      } else {
        title.textContent = 'Inspector off';
        sub.textContent = `Turn on to inspect ${hostOf(tab)}`;
      }
    }
    $$('#view-home .mode').forEach((b) => {
      b.disabled = !supported;
      b.setAttribute('aria-pressed', String(state.mode === b.dataset.mode));
    });
    const keys = $('#shortcutKeys');
    keys.replaceChildren(...(toggleShortcut ? toggleShortcut.split('+').map((k) => el('kbd', { text: k })) : []));
    $('#shortcutHint').hidden = !toggleShortcut;
    renderLast();
  }

  function renderLast() {
    const card = $('#lastCard');
    if (!lastInspected) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    const fmt = (sides) => sides.map((v) => Core.fmt(v)).join(' ');
    $('#lastLine').replaceChildren(
      el('span', { class: 'sel', text: lastInspected.selector }),
      el('span', { class: 'dim', text: ' · ' }),
      el('span', { class: 'm', text: `m ${fmt(lastInspected.margin)}` }),
      el('span', { class: 'dim', text: ' · ' }),
      el('span', { class: 'p', text: `p ${fmt(lastInspected.padding)}` })
    );
    $('#copyLastText').textContent = settings.units === 'tw' ? 'Copy classes' : 'Copy CSS';
  }

  function renderSettings() {
    $$('[data-setting]').forEach((b) => {
      const on = !!settings[b.dataset.setting];
      b.setAttribute(b.getAttribute('role') === 'switch' ? 'aria-checked' : 'aria-pressed', String(on));
    });
    $$('[data-seg]').forEach((seg) => {
      const value = String(settings[seg.dataset.seg]);
      seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
    });
    $$('.sw[data-color]').forEach((sw) => {
      const c = settings.colors[sw.dataset.color];
      if (sw.classList.contains('hatch')) {
        sw.style.background = `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 4px)`;
        sw.style.border = `1px solid ${c}`;
      } else sw.style.background = c;
    });
    renderPresets();
    renderColors();
    const op = Math.round(settings.opacity * 100);
    $('#opacity').value = op;
    $('#opacity').style.setProperty('--fill', `${((op - 10) / 70) * 100}%`);
    $('#opacityValue').textContent = `${op}%`;
    if (document.activeElement !== $('#remBase')) $('#remBase').value = settings.remBase;
    renderLast();
  }

  // ---- customize -----------------------------------------------------------

  const PRESET_NAMES = { classic: 'Classic', devtools: 'DevTools', neon: 'Neon', contrast: 'Contrast' };

  function renderPresets() {
    const wrap = $('#presets');
    wrap.replaceChildren(
      ...Object.entries(Core.PRESETS).map(([key, p]) => {
        const mini = el('span', { class: 'mini', style: { background: Core.hexToRgba(p.margin, 0.35), borderColor: p.margin } }, [
          el('span', { style: { background: Core.hexToRgba(p.padding, 0.45), borderColor: p.border } }, [el('span', { style: { background: p.content } })])
        ]);
        return el('button', { class: 'preset', 'aria-pressed': String(settings.preset === key), onclick: () => save({ preset: key, colors: { ...p } }) }, [mini, PRESET_NAMES[key]]);
      })
    );
  }

  const COLOR_ROWS = [
    ['margin', 'Margin'],
    ['border', 'Border'],
    ['padding', 'Padding'],
    ['content', 'Content'],
    ['gap', 'Flex/Grid gap']
  ];

  function renderColors() {
    const wrap = $('#colors');
    if (!wrap.children.length) {
      COLOR_ROWS.forEach(([key, label]) => {
        const input = el('input', { type: 'color', 'aria-label': `${label} color`, 'data-key': key });
        const hex = el('span', { class: 'hex' });
        input.addEventListener('input', () => (hex.textContent = input.value.toUpperCase()));
        input.addEventListener('change', () => save({ preset: 'custom', colors: { ...settings.colors, [key]: input.value.toUpperCase() } }));
        wrap.append(el('label', { class: 'list-row' }, [input, el('span', { class: 'grow', text: label }), hex]));
      });
    }
    wrap.querySelectorAll('input').forEach((input) => {
      const v = settings.colors[input.dataset.key];
      input.value = v.toLowerCase();
      input.nextElementSibling.nextElementSibling.textContent = v;
    });
  }

  // ---- audit ---------------------------------------------------------------

  function auditMessage(text) {
    const m = $('#auditMessage');
    m.textContent = text;
    m.hidden = !text;
    $('#auditContent').hidden = !!text;
  }

  async function loadAudit() {
    if (!supported) return auditMessage('Chrome blocks extensions on this page. Open a regular website to audit its spacing.');
    auditMessage('');
    $('#scoreLabel').textContent = 'Scanning…';
    summary = await send({ type: 'audit:summary', auditBase: settings.auditBase });
    if (!summary) return auditMessage('Couldn’t scan this page. Reload it and try again.');
    renderAudit();
  }

  function renderAudit() {
    const s = summary;
    const circ = 2 * Math.PI * 34;
    const color = s.score >= 75 ? '#34D399' : s.score >= 55 ? '#FFB020' : '#FF6B6B';
    $('#scoreArc').setAttribute('stroke', color);
    $('#scoreArc').setAttribute('stroke-dasharray', `${(circ * s.score) / 100} ${circ}`);
    $('#scoreRing').setAttribute('aria-label', `Spacing score ${s.score} out of 100`);
    $('#scoreNum').textContent = s.score;
    $('#scoreLabel').textContent = s.label;
    $('#statScanned').textContent = s.scanned;
    $('#statOnGrid').textContent = `${s.onGridPct}%`;
    $('#statOff').textContent = s.issues;

    const max = Math.max(1, ...s.histogram.map((b) => b.count));
    const fill = { on: settings.colors.margin, half: 'var(--half)', off: '#FF9F43' };
    $('#bars').replaceChildren(
      ...s.histogram.map((b) => el('div', { title: `${Core.fmt(b.value)}px · used ${b.count}×`, style: { height: `${Math.max(3, (b.count / max) * 64)}px`, background: fill[b.kind] } }))
    );
    $('#barLabels').replaceChildren(...s.histogram.map((b) => el('div', { class: b.kind === 'half' ? '' : b.kind, text: Core.fmt(b.value, 1) })));
    const legend = [
      el('span', {}, [el('i', { style: { background: settings.colors.margin } }), `On the ${s.base}px grid`]),
      s.base === 8 ? el('span', {}, [el('i', { style: { background: 'var(--half)' } }), 'Half-steps']) : null,
      el('span', {}, [el('i', { style: { background: '#FF9F43' } }), 'Off-grid'])
    ];
    $('#legend').replaceChildren(...legend.filter(Boolean));

    const list = $('#topIssues');
    if (!s.top.length) {
      list.replaceChildren(el('div', { class: 'empty-row', text: 'No off-grid spacing found. Nice work.' }));
    } else {
      list.replaceChildren(
        ...s.top.map((issue) =>
          el('div', { class: 'issue-row' }, [
            el('span', { class: 'dot' }),
            el('span', { class: 'sel', text: issue.count > 1 ? `${issue.label} ×${issue.count}` : issue.label }),
            el('span', { class: 'chg' }, [`${issue.prop} `, el('span', { class: 'from', text: Core.fmt(issue.from) }), ' → ', el('span', { class: 'to', text: Core.fmt(issue.to) })]),
            el('button', { class: 'icon-btn', 'aria-label': `Show ${issue.label} on the page`, title: 'Show on page', onclick: () => focusIssue(issue.index) }, useIcon('i-locate', 15))
          ])
        )
      );
    }
    $('#seeAll').textContent = s.issues > 3 ? `See all ${s.issues}` : 'Show on page';
    $('#copyFixes').disabled = !s.issues;
  }

  async function focusIssue(index) {
    await send({ type: 'audit:focus', index });
    window.close();
  }

  async function highlightOnPage() {
    await setPageState({ enabled: true, mode: 'audit' });
    window.close();
  }

  async function copy(text, button, label) {
    try {
      await navigator.clipboard.writeText(text);
      const old = button.lastChild.textContent;
      button.lastChild.textContent = label;
      setTimeout(() => (button.lastChild.textContent = old), 1200);
    } catch (e) {
      /* clipboard unavailable */
    }
  }

  // ---- wiring --------------------------------------------------------------

  function bind() {
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => show(b.dataset.go)));

    $('#powerToggle').addEventListener('click', () => setPageState({ enabled: !state.enabled }));

    $$('#view-home .mode').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.mode === 'audit') return show('audit');
        setPageState({ enabled: true, mode: b.dataset.mode });
      })
    );
    $$('#view-audit .seg.wide button').forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.mode === 'audit') return;
        setPageState({ enabled: true, mode: b.dataset.mode });
        show('home');
      })
    );

    $$('[data-setting]').forEach((b) => b.addEventListener('click', () => save({ [b.dataset.setting]: !settings[b.dataset.setting] })));

    $$('[data-seg]').forEach((seg) =>
      seg.querySelectorAll('button').forEach((b) =>
        b.addEventListener('click', () => {
          const key = seg.dataset.seg;
          const raw = b.dataset.value;
          const value = key === 'gridOverlay' ? Number(raw) : key === 'auditBase' && raw !== 'auto' ? Number(raw) : raw;
          save({ [key]: value });
          if (key === 'auditBase') loadAudit();
        })
      )
    );

    const opacity = $('#opacity');
    opacity.addEventListener('input', () => {
      $('#opacityValue').textContent = `${opacity.value}%`;
      opacity.style.setProperty('--fill', `${((opacity.value - 10) / 70) * 100}%`);
    });
    opacity.addEventListener('change', () => save({ opacity: Number(opacity.value) / 100 }));

    $('#remBase').addEventListener('change', (e) => save({ remBase: Number(e.target.value) || 16 }));

    $('#reset').addEventListener('click', () => {
      const d = Core.normalizeSettings({});
      save(d);
    });

    $('#copyLast').addEventListener('click', (e) => {
      if (!lastInspected) return;
      const text = settings.units === 'tw' ? lastInspected.tailwind || '' : lastInspected.css;
      copy(text, e.currentTarget, 'Copied');
    });

    $('#rescan').addEventListener('click', loadAudit);
    $('#highlight').addEventListener('click', highlightOnPage);
    $('#seeAll').addEventListener('click', highlightOnPage);
    $('#copyFixes').addEventListener('click', (e) => summary && copy(summary.fixes, e.currentTarget, 'Copied'));

    const openShortcuts = () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    $('#changeShortcut').addEventListener('click', openShortcuts);

    const dismissNew = () => chrome.storage.local.set({ showWhatsNew: false });
    $('#closeNew').addEventListener('click', () => {
      dismissNew();
      show('home');
    });
    $('#tryIt').addEventListener('click', async () => {
      dismissNew();
      if (supported) {
        await setPageState({ enabled: true, mode: 'inspect' });
        window.close();
      } else show('home');
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.lastInspected) {
        lastInspected = changes.lastInspected.newValue || null;
        renderLast();
      }
    });
  }

  async function init() {
    const raw = await chrome.storage.sync.get(null);
    settings = raw.settingsVersion === 2 ? Core.normalizeSettings(raw) : Core.migrateV1(raw);
    applyTheme();
    bind();

    tab = await getTab();
    // The URL is only visible with activeTab (popup opened from the toolbar).
    supported = !!tab && (canRun(tab) || !(tab.url || tab.pendingUrl));
    if (supported) {
      const res = await send({ type: 'getState' }, { inject: false });
      if (res) state = res;
      else if (!(tab.url || tab.pendingUrl)) supported = false;
    }

    try {
      const commands = await chrome.commands.getAll();
      const cmd = commands.find((c) => c.name === 'toggle-inspector');
      toggleShortcut = (cmd && cmd.shortcut) || '';
    } catch (e) {
      toggleShortcut = '';
    }
    const toggleKeys = $('#toggleKeys');
    toggleKeys.replaceChildren(...(toggleShortcut ? toggleShortcut.split('+').map((k) => el('kbd', { text: k })) : [el('span', { class: 'row-sub', text: 'Not set' })]));

    const local = await chrome.storage.local.get(['showWhatsNew', 'lastInspected']);
    lastInspected = local.lastInspected || null;
    renderSettings();
    renderHome();
    show(params.get('view') || (local.showWhatsNew ? 'whatsnew' : 'home'));
  }

  init();
})();

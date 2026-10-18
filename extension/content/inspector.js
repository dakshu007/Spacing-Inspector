// Spacing Inspector 2.0: in-page inspector, measure tool and spacing audit.
// Everything we draw lives in one shadow root so page CSS can't touch it.
(() => {
  'use strict';

  const Core = globalThis.SpacingCore;
  if (!Core) return;

  const VERSION = '2.0.0';
  const TAKEOVER = 'spacing-inspector:takeover';

  // A newer copy (re-injection or extension update) replaces any older one.
  document.dispatchEvent(new CustomEvent(TAKEOVER));
  // v1 drew into this element; remove it if an old copy left it behind.
  document.getElementById('spacing-inspector-overlay')?.remove();

  const MEASURE = '#FF4D8D';
  const AUDIT = '#FF9F43';
  const ANCHOR = '#7C6CF6';
  const MODES = ['inspect', 'measure', 'audit'];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MAX_SCAN = 6000;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'TITLE', 'NOSCRIPT', 'TEMPLATE', 'BR', 'WBR', 'BASE']);

  const ICONS = {
    inspect: { circles: [[12, 12, 7]], paths: ['M12 2v4M12 18v4M2 12h4M18 12h4'] },
    measure: { paths: ['M3 17 17 3l4 4L7 21z', 'M7 13l2 2M10 10l2 2M13 7l2 2'] },
    audit: { paths: ['M4 18a8 8 0 1 1 16 0', 'M12 18l4-5'] },
    pin: { paths: ['M12 17v5M9 3h6l-1 6 4 4H6l4-4z'] },
    close: { paths: ['M6 6l12 12M18 6L6 18'] },
    copy: { rects: [[9, 9, 12, 12, 2]], paths: ['M5 15V5a2 2 0 0 1 2-2h10'] },
    grid: { paths: ['M3 9h18M3 15h18M9 3v18M15 3v18'] },
    left: { paths: ['M15 18l-6-6 6-6'] },
    right: { paths: ['M9 6l6 6-6 6'] },
    rescan: { paths: ['M20 11a8 8 0 1 0-2.3 5.7', 'M20 4v7h-7'] },
    download: { paths: ['M12 4v11M7 10l5 5 5-5M5 20h14'] }
  };

  // ---- small DOM helpers ---------------------------------------------------

  function h(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of [].concat(children)) if (c != null && c !== false) el.append(c);
    return el;
  }

  function svg(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function icon(name, size = 16) {
    const def = ICONS[name];
    const s = svg('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
    });
    (def.paths || []).forEach((d) => s.append(svg('path', { d })));
    (def.circles || []).forEach(([cx, cy, r]) => s.append(svg('circle', { cx, cy, r })));
    (def.rects || []).forEach(([x, y, width, height, rx]) => s.append(svg('rect', { x, y, width, height, rx })));
    return s;
  }

  function logo(size = 20) {
    const s = svg('svg', { width: size, height: size, viewBox: '0 0 28 28', fill: 'none', 'aria-hidden': 'true' });
    s.append(
      svg('rect', { x: 1.5, y: 1.5, width: 25, height: 25, rx: 6, stroke: '#4C8DFF', 'stroke-width': 2, 'stroke-dasharray': '3 2.4' }),
      svg('rect', { x: 6, y: 6, width: 16, height: 16, rx: 4, stroke: '#34D399', 'stroke-width': 2 }),
      svg('rect', { x: 10.5, y: 10.5, width: 7, height: 7, rx: 1.6, fill: 'currentColor' })
    );
    return s;
  }

  function kbd(text) {
    return h('span', { class: 'kbd', text });
  }

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT';
  }

  function classes(el) {
    return Array.from(el.classList || []).filter(Boolean);
  }

  // Readable name: tag#id or tag.class1.class2
  function describe(el) {
    if (!el || !el.tagName) return '';
    const tag = el.tagName.toLowerCase();
    if (el.id) return `${tag}#${el.id}`;
    const cls = classes(el);
    if (!cls.length) return tag;
    return `${tag}.${cls.slice(0, 2).join('.')}${cls.length > 2 ? '…' : ''}`;
  }

  function esc(s) {
    return globalThis.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^\w-]/g, '\\$&');
  }

  // Valid CSS selector used in copied fixes and to group repeated components.
  function selectorFor(el, depth = 0) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return `#${esc(el.id)}`;
    const cls = classes(el);
    if (cls.length) return tag + cls.slice(0, 2).map((c) => `.${esc(c)}`).join('');
    const parent = el.parentElement;
    if (depth < 1 && parent && parent !== document.body && parent !== document.documentElement) {
      return `${selectorFor(parent, depth + 1)} > ${tag}`;
    }
    return tag;
  }

  function num(v) {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function readBox(el) {
    const cs = getComputedStyle(el);
    const margin = [num(cs.marginTop), num(cs.marginRight), num(cs.marginBottom), num(cs.marginLeft)];
    const padding = [num(cs.paddingTop), num(cs.paddingRight), num(cs.paddingBottom), num(cs.paddingLeft)];
    const border = [num(cs.borderTopWidth), num(cs.borderRightWidth), num(cs.borderBottomWidth), num(cs.borderLeftWidth)];
    let gap = null;
    if (/flex|grid/.test(cs.display)) {
      const row = num(cs.rowGap);
      const column = num(cs.columnGap);
      if (row > 0 || column > 0) gap = { row, column };
    }
    return { margin, padding, border, gap, display: cs.display, position: cs.position, rect: el.getBoundingClientRect() };
  }

  function isRendered(el) {
    if (!el || !el.isConnected || !el.getClientRects) return false;
    return el.getClientRects().length > 0;
  }

  function inViewport(r) {
    return r.bottom >= 0 && r.right >= 0 && r.top <= innerHeight && r.left <= innerWidth;
  }

  // ---- styles --------------------------------------------------------------

  const CSS_TEXT = `
:host { all: initial; }
.root {
  --bg: #0E1014; --surface: #161A20; --surface2: #1D222A; --raised: #2A303A;
  --line: #262C35; --line2: #2D333D; --text: #ECEFF3; --muted: #9AA3B2; --faint: #8C95A4;
  --accent: #6E5CF6; --accent-soft: rgba(124,108,246,0.18); --accent-text: #C4BCFF;
  --c-margin: #7FB0FF; --c-padding: #6EE7B7; --c-border: #F2C94C; --c-gap: #D8B4FE;
  --shadow: 0 18px 40px rgba(8,10,14,0.35);
  font-family: 'SI Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: var(--text); font-size: 13px; line-height: 1.35; -webkit-font-smoothing: antialiased;
}
.root.light {
  --bg: #FFFFFF; --surface: #F4F5F7; --surface2: #ECEEF2; --raised: #FFFFFF;
  --line: #E3E6EB; --line2: #D5D9E0; --text: #15181D; --muted: #5B6472; --faint: #646D7B;
  --accent-soft: rgba(110,92,246,0.12); --accent-text: #5443D6;
  --c-margin: #1D5FD1; --c-padding: #047857; --c-border: #9A6700; --c-gap: #7E3AF2;
  --shadow: 0 18px 40px rgba(20,24,32,0.18);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button { font: inherit; color: inherit; cursor: pointer; }
.mono { font-family: 'SI Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
.layer { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
.ov { position: absolute; pointer-events: none; box-sizing: border-box; }
.chip {
  position: absolute; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap;
  font: 600 11px/1 'SI Geist Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  padding: 3px 5px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.25);
}
.tag {
  position: absolute; pointer-events: none; white-space: nowrap; display: flex; gap: 6px; align-items: center;
  font: 500 11px/1 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace;
  background: #0E1014; color: #ECEFF3; padding: 4px 7px; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.tag b { font-weight: 500; color: #C4BCFF; }
.kbd {
  font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; font-size: 10.5px; color: var(--text);
  background: var(--surface2); border: 1px solid var(--line2); border-radius: 4px; padding: 0 4px; line-height: 16px;
  display: inline-block; min-width: 16px; text-align: center;
}
.panelish {
  background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow);
}

/* card */
.card { position: fixed; width: 272px; display: flex; flex-direction: column; pointer-events: none; max-height: calc(100vh - 16px); overflow: auto; }
.card.pinned { pointer-events: auto; }
.card-head { display: flex; align-items: center; gap: 4px; padding: 10px 8px 6px 14px; }
.card-sel { font: 600 13px/1.2 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--accent-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-btn { width: 28px; height: 28px; border-radius: 7px; border: 0; background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon-btn:hover { background: var(--surface2); color: var(--text); }
.icon-btn.on { background: var(--accent-soft); color: var(--accent-text); }
.crumbs-wrap { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid var(--line); }
.crumbs { font: 11px/1.3 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.crumbs span { color: var(--text); }
.keys { display: flex; gap: 10px; font-size: 11px; color: var(--faint); }
.keys > span { display: inline-flex; gap: 4px; align-items: center; }
.sect { padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--line); }
.bm { position: relative; height: 132px; border: 1.5px dashed var(--bm-m, #4C8DFF); border-radius: 6px; font: 11px/1 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; }
.bm .lbl { position: absolute; left: 6px; top: 4px; font-size: 8.5px; letter-spacing: 0.05em; color: var(--faint); }
.bm .v { position: absolute; color: var(--text); }
.bm .v.zero { color: var(--faint); opacity: 0.7; }
.bm > .t, .bm-pad > .t { left: 0; right: 0; top: 5px; text-align: center; }
.bm > .b, .bm-pad > .b { left: 0; right: 0; bottom: 5px; text-align: center; }
.bm > .l { left: 7px; top: 50%; transform: translateY(-50%); }
.bm > .r { right: 7px; top: 50%; transform: translateY(-50%); }
.bm-pad { position: absolute; left: 30px; right: 30px; top: 21px; bottom: 21px; border: 1.5px solid var(--bm-b, #F2C94C); border-radius: 5px; }
.bm-pad > .l { left: 6px; top: 50%; transform: translateY(-50%); }
.bm-pad > .r { right: 6px; top: 50%; transform: translateY(-50%); }
.bm-content { position: absolute; left: 34px; right: 34px; top: 22px; bottom: 22px; border: 1px dashed var(--faint); border-radius: 3px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 10.5px; }
.props { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; font-size: 11px; }
.props > div { display: flex; justify-content: space-between; gap: 6px; }
.props span:first-child { color: var(--faint); }
.props span:last-child { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seg { display: flex; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 2px; gap: 2px; }
.seg button { flex: 1; height: 26px; border: 0; border-radius: 6px; background: transparent; color: var(--muted); font-size: 12px; }
.seg button[aria-pressed="true"] { background: var(--raised); color: var(--text); font-weight: 600; box-shadow: 0 0 0 1px var(--line2) inset; }
.code { margin: 0; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; font: 12px/1.6 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; word-break: break-word; color: var(--text); }
.code .k-margin { color: var(--c-margin); } .code .k-padding { color: var(--c-padding); }
.code .k-border { color: var(--c-border); } .code .k-gap { color: var(--c-gap); } .code .k-muted { color: var(--faint); }
.actions { display: flex; gap: 6px; }
.btn { flex: 1; height: 34px; border-radius: 8px; border: 1px solid var(--line2); background: var(--surface2); color: var(--text); font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 10px; white-space: nowrap; }
.btn:hover { border-color: var(--faint); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
.btn.primary:hover { filter: brightness(1.08); }
.btn.primary .kbd { background: rgba(255,255,255,0.2); border-color: transparent; color: #fff; }
.card-hint { font-size: 11px; color: var(--faint); display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; }

/* dock */
.dock { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); height: 52px; padding: 0 8px 0 14px; display: flex; align-items: center; gap: 6px; pointer-events: auto; white-space: nowrap; border-radius: 16px; transition: opacity .15s; }
.dock.faded { opacity: 0.35; }
.dock.faded:hover { opacity: 1; }
.dock .logo { color: var(--text); display: inline-flex; margin-right: 4px; }
.modes { display: flex; background: var(--surface); border-radius: 10px; padding: 3px; gap: 2px; }
.modes button { height: 32px; padding: 0 10px; border: 0; border-radius: 7px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; }
.modes button:hover { color: var(--text); }
.modes button[aria-pressed="true"] { background: var(--raised); color: var(--text); font-weight: 600; box-shadow: 0 0 0 1px var(--line2) inset; }
.modes .k { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; font-size: 10px; color: var(--faint); }
.modes .dot { width: 6px; height: 6px; border-radius: 3px; display: none; }
.modes button[aria-pressed="true"] .dot { display: inline-block; }
.sep { width: 1px; height: 24px; background: var(--line); margin: 0 3px; }
.tools { display: flex; align-items: center; gap: 2px; }
.tools[hidden] { display: none; }
.dock-btn { min-width: 32px; height: 32px; border-radius: 8px; border: 0; background: transparent; color: var(--muted); display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 0 6px; font-size: 12px; }
.dock-btn:hover { background: var(--surface2); color: var(--text); }
.dock-btn.outlined { border: 1px solid var(--line); color: var(--text); font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; }
.dock-btn.text { color: var(--text); font-weight: 500; padding: 0 10px; }
.dock-btn.bordered { border: 1px solid var(--line2); background: var(--surface2); color: var(--text); font-weight: 500; padding: 0 10px; }
.swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.dock-btn[aria-pressed="false"] .swatch { opacity: 0.25; }
.dock-btn.on { color: var(--accent-text); }
.dock-info { font-size: 12px; color: var(--muted); padding: 0 4px; }
.dock-info b { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; font-weight: 500; color: var(--text); }

/* help, toast, hint */
.help { position: fixed; left: 50%; bottom: 80px; transform: translateX(-50%); width: 300px; padding: 12px 14px; pointer-events: auto; display: flex; flex-direction: column; gap: 7px; }
.help h3 { margin: 0 0 2px; font-size: 13px; font-weight: 600; }
.help .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 12px; color: var(--muted); }
.help .row > span:last-child { display: inline-flex; gap: 3px; }
.toast { position: fixed; left: 50%; bottom: 76px; transform: translateX(-50%); padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 500; pointer-events: none; opacity: 0; transition: opacity .15s, bottom .15s; }
.toast.show { opacity: 1; bottom: 82px; }
.toast.low { bottom: 12px; }
.toast.low.show { bottom: 18px; }
.hint { position: fixed; left: 50%; top: 16px; transform: translateX(-50%); height: 32px; padding: 0 12px; border-radius: 16px; display: flex; align-items: center; gap: 8px; font-size: 12px; pointer-events: none; white-space: nowrap; }
.hint .dot { width: 8px; height: 8px; border-radius: 4px; background: ${MEASURE}; }
.hint .sel { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--accent-text); }
.hint .sep2 { color: var(--faint); }
.tip { position: fixed; width: 220px; padding: 10px 12px; display: flex; flex-direction: column; gap: 7px; pointer-events: none; border-radius: 12px; }
.tip .pair { font: 11px/1.3 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tip .pair .a { color: var(--accent-text); } .tip .pair .b { color: #FF7AA8; }
.tip .vals { display: flex; gap: 12px; flex-wrap: wrap; font: 13px/1.2 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; }
.tip .vals i { font-style: normal; color: var(--faint); margin-right: 3px; }
.tip .foot { font-size: 11px; color: var(--faint); }

/* audit panel */
.panel { position: fixed; top: 16px; right: 16px; width: 336px; display: flex; flex-direction: column; pointer-events: auto; overflow: hidden; border-radius: 16px; }
.panel-head { display: flex; align-items: center; gap: 4px; padding: 10px 8px 10px 16px; border-bottom: 1px solid var(--line); }
.panel-head h2 { margin: 0; font-size: 14px; font-weight: 600; flex: 1; }
.score { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.ring { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
.ring b { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.score-txt { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--muted); }
.score-txt strong { font-size: 16px; font-weight: 600; color: var(--text); }
.score-txt .n { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--text); }
.score-txt .good { color: #34D399; }
.filters { display: flex; gap: 4px; padding: 0 12px 10px; flex-wrap: wrap; }
.filters button { height: 28px; padding: 0 10px; border-radius: 7px; border: 0; background: transparent; color: var(--muted); font-size: 12px; }
.filters button[aria-pressed="true"] { background: var(--raised); color: var(--text); font-weight: 600; box-shadow: 0 0 0 1px var(--line2) inset; }
.filters .n { font-family: 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--faint); margin-left: 3px; font-weight: 400; }
.list { border-top: 1px solid var(--line); overflow: auto; flex: 1; min-height: 0; }
.row { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 6px 12px 6px 16px; border: 0; border-bottom: 1px solid var(--line); background: transparent; text-align: left; }
.row:hover { background: var(--surface); }
.issue { border-bottom: 1px solid var(--line); }
.issue.active { background: var(--surface); }
.issue .row { border-bottom: 0; }
.num { width: 20px; height: 20px; border-radius: 5px; background: rgba(255,159,67,0.16); color: #FFB574; font: 700 11px/20px 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; text-align: center; flex-shrink: 0; }
.root.light .num { color: #B45309; }
.issue.active .num { background: ${AUDIT}; color: #2A1300; }
.row .sel { font: 12px/1.3 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--accent-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row .cnt { font: 11px 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--faint); }
.row .chg { font: 12px 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; color: var(--muted); white-space: nowrap; }
.from { color: #FFB574; } .to { color: #34D399; }
.root.light .from { color: #C2410C; } .root.light .to { color: #047857; }
.fix { display: flex; align-items: center; gap: 8px; margin: 0 12px 12px 46px; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 6px 6px 6px 10px; }
.fix code { flex: 1; font: 11px/1.5 'SI Geist Mono', ui-monospace, Menlo, Consolas, monospace; white-space: pre-wrap; }
.fix .btn { flex: 0 0 auto; height: 26px; font-size: 11px; padding: 0 8px; }
.empty { padding: 18px 16px; font-size: 12px; color: var(--muted); }
.panel-foot { display: flex; gap: 8px; padding: 12px 16px 14px; border-top: 1px solid var(--line); }
`;

  // ---- the inspector -------------------------------------------------------

  class Inspector {
    constructor() {
      this.settings = Core.normalizeSettings({});
      this.enabled = false;
      this.mode = 'inspect';
      this.hoverEl = null;
      this.pinnedEl = null;
      this.altDown = false;
      this.altAnchor = null;
      this.anchorEl = null; // measure mode
      this.pins = []; // pinned measurements [{a, b}]
      this.pointer = { x: -1, y: -1 };
      this.audit = null;
      this.auditIndex = 0;
      this.auditFilter = 'all';
      this.helpOpen = false;
      this.raf = 0;
      this.ui = null;
      this.cardFor = null;
      this.cardKey = '';
      this.lastSaved = null;
      this.destroyed = false;

      this.loadSettings();
      chrome.storage.onChanged.addListener(this.onStorageChanged);
      chrome.runtime.onMessage.addListener(this.onMessage);
      document.addEventListener(TAKEOVER, this.destroy, { once: true });
      this.send({ type: 'hello' }).then((state) => {
        if (state && state.enabled) this.setState({ enabled: true, mode: state.mode });
      });
    }

    // -- plumbing --

    alive() {
      try {
        return !this.destroyed && !!chrome.runtime && !!chrome.runtime.id;
      } catch (e) {
        return false;
      }
    }

    send(msg) {
      if (!this.alive()) return Promise.resolve(null);
      try {
        return chrome.runtime.sendMessage(msg).catch(() => null);
      } catch (e) {
        return Promise.resolve(null);
      }
    }

    loadSettings() {
      if (!this.alive()) return;
      chrome.storage.sync.get(null, (raw) => {
        if (chrome.runtime.lastError) return;
        const prevBase = this.settings.auditBase;
        this.settings = raw && raw.settingsVersion === 2 ? Core.normalizeSettings(raw) : Core.migrateV1(raw);
        if (this.ui) this.applyTheme();
        if (this.audit && prevBase !== this.settings.auditBase) {
          this.audit = null;
          if (this.enabled && this.mode === 'audit') this.runAudit();
        }
        this.refreshUI();
      });
    }

    saveSettings(patch) {
      this.settings = Core.normalizeSettings({ ...this.settings, ...patch });
      this.refreshUI();
      if (this.alive()) chrome.storage.sync.set(patch);
    }

    onStorageChanged = (changes, area) => {
      if (!this.alive()) return this.destroy();
      if (area === 'sync') this.loadSettings();
    };

    onMessage = (msg, sender, sendResponse) => {
      if (!msg || typeof msg !== 'object') return false;
      switch (msg.type) {
        case 'ping':
          sendResponse({ ok: true, version: VERSION });
          break;
        case 'getState':
          sendResponse(this.state());
          break;
        case 'setState':
          this.setState(msg);
          sendResponse(this.state());
          break;
        case 'toggle':
          this.setState({ enabled: !this.enabled });
          sendResponse(this.state());
          break;
        case 'audit:summary':
          if (msg.auditBase === 'auto' || msg.auditBase === 4 || msg.auditBase === 8) this.settings.auditBase = msg.auditBase;
          this.runAudit();
          this.refreshUI();
          sendResponse(this.auditSummary());
          break;
        case 'audit:focus':
          this.setState({ enabled: true, mode: 'audit' });
          this.focusIssue(msg.index || 0);
          sendResponse(this.state());
          break;
        default:
          return false;
      }
      return false;
    };

    state() {
      return { enabled: this.enabled, mode: this.mode, version: VERSION };
    }

    setState({ enabled, mode }) {
      if (MODES.includes(mode) && mode !== this.mode) this.setMode(mode, { silent: true });
      if (typeof enabled === 'boolean' && enabled !== this.enabled) {
        if (enabled) this.enable();
        else this.disable();
      }
      this.reportState();
      this.refreshUI();
    }

    reportState() {
      this.send({ type: 'tabState', enabled: this.enabled, mode: this.mode });
    }

    enable() {
      this.enabled = true;
      this.buildUI();
      this.loadFonts();
      const opts = { capture: true, passive: true };
      addEventListener('pointermove', this.onPointerMove, opts);
      addEventListener('scroll', this.schedule, opts);
      addEventListener('resize', this.schedule, opts);
      document.addEventListener('mouseout', this.onMouseOut, opts);
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick', 'auxclick'].forEach((t) =>
        addEventListener(t, this.onPress, true)
      );
      addEventListener('keydown', this.onKeyDown, true);
      addEventListener('keyup', this.onKeyUp, true);
      addEventListener('blur', this.onBlur, true);
      if (this.mode === 'audit') this.runAudit();
      this.schedule();
    }

    disable() {
      this.enabled = false;
      const opts = { capture: true };
      removeEventListener('pointermove', this.onPointerMove, opts);
      removeEventListener('scroll', this.schedule, opts);
      removeEventListener('resize', this.schedule, opts);
      document.removeEventListener('mouseout', this.onMouseOut, opts);
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick', 'auxclick'].forEach((t) =>
        removeEventListener(t, this.onPress, true)
      );
      removeEventListener('keydown', this.onKeyDown, true);
      removeEventListener('keyup', this.onKeyUp, true);
      removeEventListener('blur', this.onBlur, true);
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.hoverEl = this.pinnedEl = this.anchorEl = this.altAnchor = null;
      this.pins = [];
      this.altDown = false;
      this.helpOpen = false;
      this.audit = null;
      this.cardKey = '';
      if (this.ui) {
        this.ui.host.remove();
        this.ui = null;
      }
    }

    destroy = () => {
      if (this.destroyed) return;
      this.disable();
      this.destroyed = true;
      try {
        chrome.storage.onChanged.removeListener(this.onStorageChanged);
        chrome.runtime.onMessage.removeListener(this.onMessage);
      } catch (e) {
        /* context already gone */
      }
    };

    loadFonts() {
      if (Inspector.fontsLoaded || !this.alive() || !document.fonts || typeof FontFace === 'undefined') return;
      Inspector.fontsLoaded = true;
      [
        ['SI Geist', 'fonts/Geist-Variable.woff2'],
        ['SI Geist Mono', 'fonts/GeistMono-Variable.woff2']
      ].forEach(([family, path]) => {
        try {
          const face = new FontFace(family, `url("${chrome.runtime.getURL(path)}")`, { weight: '100 900' });
          document.fonts.add(face);
          face.load().catch(() => {});
        } catch (e) {
          /* page CSP may block it; system fonts are the fallback */
        }
      });
    }

    // -- modes & state changes --

    setMode(mode, { silent = false } = {}) {
      if (!MODES.includes(mode)) return;
      this.mode = mode;
      this.anchorEl = null;
      this.altDown = false;
      if (mode === 'measure' && this.pinnedEl) this.anchorEl = this.pinnedEl;
      if (mode === 'audit' && this.enabled) this.runAudit();
      if (!silent) this.reportState();
      this.cardKey = '';
      this.refreshUI();
    }

    togglePin(el = this.hoverEl) {
      if (this.pinnedEl && (!el || el === this.pinnedEl)) this.pinnedEl = null;
      else if (el) {
        this.pinnedEl = el;
        this.saveLast(el);
      }
      this.cardKey = '';
      this.refreshUI();
    }

    escape() {
      if (this.helpOpen) this.helpOpen = false;
      else if (this.mode === 'measure' && this.anchorEl) this.anchorEl = null;
      else if (this.mode === 'measure' && this.pins.length) this.pins = [];
      else if (this.pinnedEl) this.pinnedEl = null;
      else if (this.mode !== 'inspect') return this.setMode('inspect');
      else return this.setState({ enabled: false });
      this.cardKey = '';
      this.refreshUI();
    }

    navigate(dir) {
      const from = this.pinnedEl || this.hoverEl;
      if (!from) return;
      let next = null;
      if (dir === 'up') next = from.parentElement;
      else if (dir === 'down') next = Array.from(from.children).find(isRendered);
      else {
        next = from;
        do next = dir === 'left' ? next.previousElementSibling : next.nextElementSibling;
        while (next && !isRendered(next));
      }
      if (!next || next === document.documentElement || (this.ui && next === this.ui.host)) return;
      this.pinnedEl = next;
      this.saveLast(next);
      const r = next.getBoundingClientRect();
      if (!inViewport(r)) next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.cardKey = '';
      this.refreshUI();
    }

    cycleGrid() {
      const order = [0, 4, 8];
      this.saveSettings({ gridOverlay: order[(order.indexOf(this.settings.gridOverlay) + 1) % order.length] });
    }

    cycleUnits() {
      const order = ['px', 'rem', 'tw'];
      this.saveSettings({ units: order[(order.indexOf(this.settings.units) + 1) % order.length] });
    }

    // -- events --

    fromUI(e) {
      return !!(this.ui && e.composedPath && e.composedPath().includes(this.ui.host));
    }

    targetOf(e) {
      const path = e.composedPath ? e.composedPath() : [];
      const t = path.find((n) => n && n.nodeType === 1) || e.target;
      if (!t || t.nodeType !== 1 || t === document.documentElement) return null;
      if (this.ui && t === this.ui.host) return null;
      return t;
    }

    onPointerMove = (e) => {
      if (!this.alive()) return this.destroy();
      this.pointer = { x: e.clientX, y: e.clientY };
      if (this.fromUI(e)) return;
      const t = this.targetOf(e);
      if (t && t !== this.hoverEl) {
        this.hoverEl = t;
        if (!this.pinnedEl) this.queueSaveLast(t);
      }
      this.schedule();
    };

    onMouseOut = (e) => {
      if (!e.relatedTarget && !this.pinnedEl) {
        this.hoverEl = null;
        this.schedule();
      }
    };

    shouldIntercept(e) {
      if (e.button !== undefined && e.button !== 0 && e.type !== 'click') return false;
      if (this.mode === 'measure') return true;
      if (this.mode === 'inspect') return this.settings.pinOnClick;
      if (this.mode === 'audit') return !!this.groupIndexOf(this.targetOf(e));
      return false;
    }

    onPress = (e) => {
      if (!this.enabled || this.fromUI(e)) return;
      if (!this.shouldIntercept(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.type !== 'click') return;
      const t = this.targetOf(e);
      if (!t) return;
      if (this.mode === 'inspect') {
        this.togglePin(t);
      } else if (this.mode === 'measure') {
        if (!this.anchorEl || this.anchorEl === t) this.anchorEl = this.anchorEl === t ? null : t;
        else this.pins.push({ a: this.anchorEl, b: t });
        this.refreshUI();
      } else if (this.mode === 'audit') {
        const idx = this.groupIndexOf(t);
        if (idx) this.focusIssue(idx - 1, { scroll: false });
      }
    };

    onKeyDown = (e) => {
      if (!this.enabled) return;
      if (!this.alive()) return this.destroy();
      if (e.key === 'Alt') {
        if (!this.altDown && this.mode === 'inspect') {
          this.altDown = true;
          this.altAnchor = this.pinnedEl || this.hoverEl;
          this.schedule();
        }
        e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const path = e.composedPath ? e.composedPath() : [];
      if (!this.fromUI(e) && isEditable(path[0] || e.target)) return;

      const key = e.key;
      let handled = true;
      if (key === 'Escape') this.escape();
      else if (key === 'i' || key === 'I') this.setMode('inspect');
      else if (key === 'm' || key === 'M') this.setMode('measure');
      else if (key === 'a' || key === 'A') this.setMode('audit');
      else if (key === 'C' && this.mode === 'measure') this.copyMeasure();
      else if (key === 'c' || key === 'C') this.copyCurrent();
      else if ((key === 'p' || key === 'P') && this.mode === 'inspect') this.togglePin();
      else if (key === 'g' || key === 'G') this.cycleGrid();
      else if (key === 'u' || key === 'U') this.cycleUnits();
      else if (key === '?') {
        this.helpOpen = !this.helpOpen;
        this.refreshUI();
      } else if (key.startsWith('Arrow') && this.mode === 'inspect') this.navigate(key.slice(5).toLowerCase());
      else if ((key === 'ArrowRight' || key === 'ArrowDown') && this.mode === 'audit') this.stepIssue(1);
      else if ((key === 'ArrowLeft' || key === 'ArrowUp') && this.mode === 'audit') this.stepIssue(-1);
      else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    onKeyUp = (e) => {
      if (e.key === 'Alt' && this.altDown) {
        this.altDown = false;
        this.altAnchor = null;
        this.schedule();
      }
    };

    onBlur = () => {
      if (this.altDown) {
        this.altDown = false;
        this.schedule();
      }
    };

    // -- last inspected (shown in the popup) --

    queueSaveLast(el) {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveLast(el), 400);
    }

    saveLast(el) {
      if (!el || !el.isConnected || !this.alive() || this.lastSaved === el) return;
      this.lastSaved = el;
      const box = readBox(el);
      const s = this.settings;
      chrome.storage.local.set({
        lastInspected: {
          selector: describe(el),
          margin: box.margin,
          padding: box.padding,
          css: Core.cssFor(box, s.units === 'rem' ? 'rem' : 'px', s.remBase),
          tailwind: Core.tailwindFor(box)
        }
      });
    }

    // -- copying --

    copyText(text, label) {
      const done = () => this.toast(`Copied ${label}`);
      const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
        (document.body || document.documentElement).append(ta);
        ta.select();
        let ok = false;
        try {
          ok = document.execCommand('copy');
        } catch (e) {
          ok = false;
        }
        ta.remove();
        if (ok) done();
        else this.toast('Copy failed. Your browser blocked clipboard access.');
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    }

    formatName() {
      return this.settings.units === 'tw' ? 'Tailwind classes' : 'CSS';
    }

    copyCurrent() {
      const el = this.mode === 'inspect' ? this.pinnedEl || this.hoverEl : this.mode === 'measure' ? this.hoverEl : null;
      if (this.mode === 'audit') {
        const g = this.filteredGroups()[this.auditIndex];
        if (g) this.copyText(this.fixCss([g]), 'fix');
        return;
      }
      if (!el) return this.toast('Hover an element first');
      const s = this.settings;
      this.copyText(Core.codeFor(readBox(el), s.units, s.remBase), this.formatName());
      this.saveLast(el);
    }

    measureText(a, b) {
      const { lines } = Core.measure(a.getBoundingClientRect(), b.getBoundingClientRect());
      const unit = (v) => Core.cssLength(v, this.settings.units === 'rem' ? 'rem' : 'px', this.settings.remBase);
      const parts = lines.map((l) => `${l.axis === 'y' ? '↕' : '↔'} ${unit(l.value)}`);
      return `${describe(a)} → ${describe(b)}: ${parts.join(' · ') || 'touching'}`;
    }

    copyMeasure() {
      if (this.anchorEl && this.hoverEl && this.hoverEl !== this.anchorEl) {
        this.copyText(this.measureText(this.anchorEl, this.hoverEl), 'measurement');
      } else this.copySpec();
    }

    copySpec() {
      const pins = this.pins.filter((p) => p.a.isConnected && p.b.isConnected);
      if (!pins.length) return this.toast('Click two elements to pin a measurement');
      this.copyText(pins.map((p) => this.measureText(p.a, p.b)).join('\n'), `${pins.length} measurement${pins.length > 1 ? 's' : ''}`);
    }

    toast(text) {
      if (!this.ui) return;
      const t = this.ui.toast;
      t.textContent = text;
      t.classList.toggle('low', !this.settings.showDock);
      t.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
    }

    // -- UI construction --

    buildUI() {
      if (this.ui) return;
      const host = document.createElement('div');
      host.id = 'spacing-inspector-v2';
      host.style.setProperty('all', 'initial', 'important');
      host.style.setProperty('position', 'fixed', 'important');
      host.style.setProperty('inset', '0', 'important');
      host.style.setProperty('z-index', '2147483647', 'important');
      host.style.setProperty('pointer-events', 'none', 'important');
      const shadow = host.attachShadow({ mode: 'open' });
      try {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(CSS_TEXT);
        shadow.adoptedStyleSheets = [sheet];
      } catch (e) {
        shadow.append(h('style', { text: CSS_TEXT }));
      }

      const root = h('div', { class: 'root' });
      const ui = { host, shadow, root };
      ui.grid = h('div', { class: 'layer' });
      ui.boxes = h('div', { class: 'layer' });
      ui.overlay = h('div', { class: 'layer' });
      ui.toast = h('div', { class: 'toast panelish', role: 'status' });
      ui.hint = h('div', { class: 'hint panelish' });
      ui.tip = h('div', { class: 'tip panelish' });
      this.ui = ui;
      ui.card = this.buildCard();
      ui.dock = this.buildDock();
      ui.help = this.buildHelp();
      ui.panel = this.buildPanel();
      root.append(ui.grid, ui.boxes, ui.overlay, ui.card.root, ui.tip, ui.hint, ui.panel.root, ui.help, ui.dock.root, ui.toast);
      shadow.append(root);
      document.documentElement.append(host);
      this.applyTheme();
    }

    applyTheme() {
      if (!this.ui) return;
      let theme = this.settings.theme;
      if (theme === 'auto') theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      this.ui.root.classList.toggle('light', theme === 'light');
    }

    buildCard() {
      const c = {};
      c.sel = h('div', { class: 'card-sel' });
      c.pin = h('button', { class: 'icon-btn', 'aria-label': 'Pin element', title: 'Pin (P)', onclick: () => this.togglePin(this.pinnedEl || this.hoverEl) }, icon('pin', 14));
      c.close = h('button', { class: 'icon-btn', 'aria-label': 'Unpin', title: 'Unpin (Esc)', onclick: () => this.togglePin(this.pinnedEl) }, icon('close', 14));
      c.crumbs = h('div', { class: 'crumbs' });
      const hint = (k, t) => h('span', {}, [kbd(k), t]);
      const keys = h('div', { class: 'keys' }, [hint('↑', 'parent'), hint('↓', 'child'), hint('← →', 'siblings')]);

      const v = (cls) => h('div', { class: `v ${cls}` });
      c.m = [v('t'), v('r'), v('b'), v('l')];
      c.p = [v('t'), v('r'), v('b'), v('l')];
      c.content = h('div', { class: 'bm-content' });
      c.bm = h('div', { class: 'bm' }, [
        h('div', { class: 'lbl', text: 'MARGIN' }),
        ...c.m,
        h('div', { class: 'bm-pad' }, [h('div', { class: 'lbl', text: 'PADDING' }), ...c.p, c.content])
      ]);
      c.pad = c.bm.querySelector('.bm-pad');

      const prop = (label) => {
        const val = h('span');
        return [h('div', {}, [h('span', { text: label }), val]), val];
      };
      const [sizeRow, size] = prop('size');
      const [borderRow, border] = prop('border');
      const [displayRow, display] = prop('display');
      const [gapRow, gap] = prop('gap');
      c.size = size;
      c.border = border;
      c.display = display;
      c.gap = gap;
      c.gapLabel = gapRow.firstChild;

      const tab = (label, units) =>
        h('button', { 'aria-pressed': 'false', 'data-units': units, text: label, onclick: () => this.saveSettings({ units }) });
      c.tabs = [tab('CSS', 'px'), tab('Tailwind', 'tw'), tab('rem', 'rem')];
      c.code = h('pre', { class: 'code' });

      c.copy = h('button', { class: 'btn primary', onclick: () => this.copyCurrent() }, ['Copy', kbd('C')]);
      c.measure = h('button', {
        class: 'btn',
        onclick: () => {
          const el = this.pinnedEl;
          this.setMode('measure');
          this.anchorEl = el;
          this.refreshUI();
        }
      }, ['Measure from', kbd('M')]);
      c.actions = h('div', { class: 'actions' }, [c.copy, c.measure]);
      c.hint = h('div', { class: 'card-hint' });

      c.root = h('section', { class: 'card panelish', 'aria-label': 'Element details', hidden: true }, [
        h('div', { class: 'card-head' }, [c.sel, c.pin, c.close]),
        h('div', { class: 'crumbs-wrap' }, [c.crumbs, keys]),
        h('div', { class: 'sect' }, [c.bm, h('div', { class: 'props' }, [sizeRow, borderRow, displayRow, gapRow])]),
        h('div', { class: 'sect', style: { borderBottom: '0' } }, [h('div', { class: 'seg' }, c.tabs), c.code, c.actions, c.hint])
      ]);
      return c;
    }

    buildDock() {
      const d = {};
      const modeBtn = (mode, label, key, color) =>
        h('button', { 'aria-pressed': 'false', 'data-mode': mode, title: `${label} (${key})`, onclick: () => this.setMode(mode) }, [
          h('span', { class: 'dot', style: { background: color } }),
          label,
          h('span', { class: 'k', text: key })
        ]);
      d.modes = [modeBtn('inspect', 'Inspect', 'I', ANCHOR), modeBtn('measure', 'Measure', 'M', MEASURE), modeBtn('audit', 'Audit', 'A', AUDIT)];

      const layerBtn = (key, label) => {
        const sw = h('span', { class: 'swatch' });
        const b = h('button', { class: 'dock-btn', 'aria-label': `${label} layer`, title: `${label} layer`, 'aria-pressed': 'true', onclick: () => this.saveSettings({ [key]: !this.settings[key] }) }, sw);
        return { b, sw, key };
      };
      d.layers = [layerBtn('showMargin', 'Margin'), layerBtn('showBorder', 'Border'), layerBtn('showPadding', 'Padding'), layerBtn('showGap', 'Flex/Grid gap')];
      d.gridLabel = h('span', { class: 'mono' });
      d.grid = h('button', { class: 'dock-btn', 'aria-label': 'Grid overlay', title: 'Grid overlay (G)', onclick: () => this.cycleGrid() }, [icon('grid', 16), d.gridLabel]);
      d.units = h('button', { class: 'dock-btn outlined', 'aria-label': 'Units', title: 'Units (U)', onclick: () => this.cycleUnits() });
      d.inspectTools = h('div', { class: 'tools' }, [...d.layers.map((l) => l.b), d.grid, d.units]);

      d.pinCount = h('div', { class: 'dock-info' });
      d.measureTools = h('div', { class: 'tools' }, [
        d.pinCount,
        h('button', { class: 'dock-btn bordered', onclick: () => this.copySpec() }, [icon('copy', 13), 'Copy as spec']),
        h('button', { class: 'dock-btn text', onclick: () => { this.pins = []; this.anchorEl = null; this.refreshUI(); } }, 'Clear')
      ]);

      d.issueInfo = h('div', { class: 'dock-info' });
      d.auditTools = h('div', { class: 'tools' }, [
        h('button', { class: 'dock-btn', 'aria-label': 'Previous issue', onclick: () => this.stepIssue(-1) }, icon('left', 15)),
        d.issueInfo,
        h('button', { class: 'dock-btn', 'aria-label': 'Next issue', onclick: () => this.stepIssue(1) }, icon('right', 15))
      ]);

      d.root = h('nav', { class: 'dock panelish', 'aria-label': 'Spacing Inspector toolbar' }, [
        h('span', { class: 'logo' }, logo(20)),
        h('div', { class: 'modes' }, d.modes),
        h('div', { class: 'sep' }),
        d.inspectTools,
        d.measureTools,
        d.auditTools,
        h('div', { class: 'sep' }),
        h('button', { class: 'dock-btn mono', 'aria-label': 'Keyboard shortcuts', title: 'Shortcuts (?)', style: { fontSize: '14px' }, onclick: () => { this.helpOpen = !this.helpOpen; this.refreshUI(); } }, '?'),
        h('button', { class: 'dock-btn', 'aria-label': 'Turn inspector off', title: 'Turn off', onclick: () => this.setState({ enabled: false }) }, icon('close', 15))
      ]);
      return d;
    }

    buildHelp() {
      const row = (label, ...keys) => h('div', { class: 'row' }, [h('span', { text: label }), h('span', {}, keys.map(kbd))]);
      return h('div', { class: 'help panelish', hidden: true }, [
        h('h3', { text: 'Keyboard shortcuts' }),
        row('Inspect · Measure · Audit', 'I', 'M', 'A'),
        row('Measure while inspecting (hold)', 'Alt'),
        row('Pin / unpin element', 'P'),
        row('Parent · child', '↑', '↓'),
        row('Previous · next sibling', '←', '→'),
        row('Copy as CSS / Tailwind', 'C'),
        row('Copy measurement', 'Shift', 'C'),
        row('Grid overlay · units', 'G', 'U'),
        row('Step back · turn off', 'Esc')
      ]);
    }

    buildPanel() {
      const p = {};
      p.ring = svg('svg', { width: 64, height: 64, viewBox: '0 0 64 64', role: 'img' });
      p.ring.append(svg('circle', { cx: 32, cy: 32, r: 26, fill: 'none', stroke: 'currentColor', 'stroke-opacity': '0.14', 'stroke-width': 6 }));
      p.arc = svg('circle', { cx: 32, cy: 32, r: 26, fill: 'none', 'stroke-width': 6, 'stroke-linecap': 'round', transform: 'rotate(-90 32 32)' });
      p.ring.append(p.arc);
      p.scoreNum = h('b');
      p.label = h('strong');
      p.meta = h('div');
      p.projected = h('div');
      const filter = (key, label) => {
        const n = h('span', { class: 'n' });
        const b = h('button', { 'aria-pressed': 'false', onclick: () => { this.auditFilter = key; this.auditIndex = 0; this.refreshUI(); } }, [label, n]);
        return { key, b, n };
      };
      p.filters = [filter('all', 'All'), filter('margin', 'Margin'), filter('padding', 'Padding'), filter('gap', 'Gap')];
      p.list = h('div', { class: 'list' });
      p.root = h('aside', { class: 'panel panelish', 'aria-label': 'Spacing Audit', hidden: true }, [
        h('div', { class: 'panel-head' }, [
          h('h2', { text: 'Spacing Audit' }),
          h('button', { class: 'icon-btn', 'aria-label': 'Re-scan page', title: 'Re-scan', onclick: () => { this.runAudit(); this.refreshUI(); this.toast('Page re-scanned'); } }, icon('rescan', 15)),
          h('button', { class: 'icon-btn', 'aria-label': 'Close audit', onclick: () => this.setMode('inspect') }, icon('close', 15))
        ]),
        h('div', { class: 'score' }, [h('div', { class: 'ring' }, [p.ring, p.scoreNum]), h('div', { class: 'score-txt' }, [p.label, p.meta, p.projected])]),
        h('div', { class: 'filters' }, p.filters.map((f) => f.b)),
        p.list,
        h('div', { class: 'panel-foot' }, [
          h('button', { class: 'btn primary', onclick: () => this.copyAllFixes() }, 'Copy all fixes as CSS'),
          h('button', { class: 'btn', style: { flex: '0 0 auto' }, onclick: () => this.exportAudit() }, [icon('download', 14), 'Export'])
        ])
      ]);
      return p;
    }

    // -- UI refresh (state -> DOM) --

    refreshUI() {
      if (!this.ui) return;
      const s = this.settings;
      const d = this.ui.dock;
      d.root.hidden = !s.showDock;
      d.modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === this.mode)));
      d.inspectTools.hidden = this.mode !== 'inspect';
      d.measureTools.hidden = this.mode !== 'measure';
      d.auditTools.hidden = this.mode !== 'audit';
      d.layers.forEach((l) => {
        const color = { showMargin: s.colors.margin, showBorder: s.colors.border, showPadding: s.colors.padding, showGap: s.colors.gap }[l.key];
        l.sw.style.background = l.key === 'showGap' ? `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 4px)` : color;
        l.sw.style.border = l.key === 'showGap' ? `1px solid ${color}` : '0';
        l.b.setAttribute('aria-pressed', String(!!s[l.key]));
      });
      d.gridLabel.textContent = s.gridOverlay ? String(s.gridOverlay) : '';
      d.grid.classList.toggle('on', !!s.gridOverlay);
      d.units.textContent = s.units;
      const pins = this.pins.length;
      d.pinCount.replaceChildren(h('b', { text: String(pins) }), ' pinned');
      const groups = this.filteredGroups();
      d.issueInfo.replaceChildren(
        groups.length ? 'Issue ' : 'No issues',
        groups.length ? h('b', { text: String(this.auditIndex + 1) }) : '',
        groups.length ? ' of ' : '',
        groups.length ? h('b', { text: String(groups.length) }) : ''
      );
      this.ui.help.hidden = !this.helpOpen;
      this.ui.card.tabs.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.units === s.units)));
      this.renderPanel();
      this.cardKey = '';
      this.schedule();
    }

    schedule = () => {
      if (!this.enabled || this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.render();
      });
    };

    // -- drawing --

    render() {
      if (!this.enabled || !this.ui) return;
      if (!this.alive()) return this.destroy();
      const ui = this.ui;
      if (!ui.host.isConnected) document.documentElement.append(ui.host);
      ui.boxes.replaceChildren();
      ui.overlay.replaceChildren();
      this.renderGrid();

      let cardEl = null;
      ui.tip.hidden = true;
      ui.hint.hidden = true;

      if (this.mode === 'inspect') {
        if (this.altDown && this.altAnchor && this.altAnchor.isConnected) {
          this.drawOutline(this.altAnchor, ANCHOR, describe(this.altAnchor));
          if (this.hoverEl && this.hoverEl !== this.altAnchor) {
            this.drawOutline(this.hoverEl, MEASURE);
            this.drawMeasure(this.altAnchor, this.hoverEl, false);
            this.showTip(this.altAnchor, this.hoverEl, 'Release Alt to go back');
          }
        } else {
          const target = this.pinnedEl && this.pinnedEl.isConnected ? this.pinnedEl : this.hoverEl;
          if (this.pinnedEl && !this.pinnedEl.isConnected) this.pinnedEl = null;
          if (target && target.isConnected) {
            if (this.pinnedEl && this.hoverEl && this.hoverEl !== this.pinnedEl && this.hoverEl.isConnected) {
              this.drawOutline(this.hoverEl, 'rgba(255,255,255,0.8)', null, true);
            }
            this.drawBoxModel(target);
            cardEl = target;
          }
        }
      } else if (this.mode === 'measure') {
        this.renderMeasureMode();
      } else if (this.mode === 'audit') {
        this.renderAudit();
      }

      this.renderCard(cardEl);
      this.fadeDock(cardEl);
    }

    renderGrid() {
      const size = this.settings.gridOverlay;
      const g = this.ui.grid;
      if (!size) {
        g.style.backgroundImage = '';
        return;
      }
      const strong = size * (size === 4 ? 4 : 8);
      const line = 'rgba(124,108,246,0.16)';
      const major = 'rgba(124,108,246,0.32)';
      g.style.backgroundImage = [
        `linear-gradient(to bottom, ${major} 1px, transparent 1px)`,
        `linear-gradient(to right, ${major} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
        `linear-gradient(to right, ${line} 1px, transparent 1px)`
      ].join(',');
      g.style.backgroundSize = `${strong}px ${strong}px, ${strong}px ${strong}px, ${size}px ${size}px, ${size}px ${size}px`;
      const ox = -(scrollX % strong);
      const oy = -(scrollY % strong);
      g.style.backgroundPosition = `${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px`;
    }

    rect(layer, x, y, w, hgt, style) {
      if (!(w > 0.25 && hgt > 0.25)) return null;
      const d = document.createElement('div');
      d.className = 'ov';
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.style.width = `${w}px`;
      d.style.height = `${hgt}px`;
      if (style) Object.assign(d.style, style);
      layer.append(d);
      return d;
    }

    chip(x, y, text, bg, extra) {
      const c = document.createElement('div');
      c.className = 'chip';
      c.textContent = text;
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
      c.style.background = bg;
      c.style.color = Core.readableText(bg);
      if (extra) Object.assign(c.style, extra);
      this.ui.overlay.append(c);
      return c;
    }

    drawBoxModel(el) {
      const box = readBox(el);
      const r = box.rect;
      const s = this.settings;
      const c = s.colors;
      const a = s.opacity;
      const L = this.ui.boxes;
      const pos = (v) => Math.max(0, v);
      const [mt, mr, mb, ml] = box.margin.map(pos);
      const [bt, br, bb, bl] = box.border;
      const [pt, pr, pb, pl] = box.padding;
      const label = s.showLabels;
      const fmt = (v) => Core.formatValue(v, s.units, s.remBase);

      if (s.showMargin) {
        const fill = { background: Core.hexToRgba(c.margin, a) };
        this.rect(L, r.left - ml, r.top - mt, r.width + ml + mr, mt, fill);
        this.rect(L, r.left - ml, r.bottom, r.width + ml + mr, mb, fill);
        this.rect(L, r.left - ml, r.top, ml, r.height, fill);
        this.rect(L, r.right, r.top, mr, r.height, fill);
        if (mt || mr || mb || ml) {
          this.rect(L, r.left - ml, r.top - mt, r.width + ml + mr, r.height + mt + mb, { border: `1.5px dashed ${c.margin}`, borderRadius: '2px' });
        }
      }
      if (s.showBorder) {
        const fill = { background: Core.hexToRgba(c.border, Math.min(0.9, a + 0.35)) };
        this.rect(L, r.left, r.top, r.width, bt, fill);
        this.rect(L, r.left, r.bottom - bb, r.width, bb, fill);
        this.rect(L, r.left, r.top + bt, bl, r.height - bt - bb, fill);
        this.rect(L, r.right - br, r.top + bt, br, r.height - bt - bb, fill);
      }
      const ix = r.left + bl;
      const iy = r.top + bt;
      const iw = r.width - bl - br;
      const ih = r.height - bt - bb;
      if (s.showPadding) {
        const fill = { background: Core.hexToRgba(c.padding, Math.min(0.85, a + 0.1)) };
        this.rect(L, ix, iy, iw, pt, fill);
        this.rect(L, ix, iy + ih - pb, iw, pb, fill);
        this.rect(L, ix, iy + pt, pl, ih - pt - pb, fill);
        this.rect(L, ix + iw - pr, iy + pt, pr, ih - pt - pb, fill);
      }
      if (s.showContent) {
        this.rect(L, ix + pl, iy + pt, iw - pl - pr, ih - pt - pb, {
          background: Core.hexToRgba(c.content, a * 0.8),
          border: `1px dashed ${c.content}`
        });
      }
      this.rect(L, r.left, r.top, r.width, r.height, {
        border: `1.5px solid ${s.showBorder ? c.border : '#FFFFFF'}`,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.25)'
      });
      if (s.showGap && box.gap) this.drawGaps(el, box);

      if (label) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (s.showMargin) {
          if (box.margin[0] > 0) this.chip(cx, r.top - mt / 2, fmt(box.margin[0]), c.margin);
          if (box.margin[2] > 0) this.chip(cx, r.bottom + mb / 2, fmt(box.margin[2]), c.margin);
          if (box.margin[3] > 0) this.chip(r.left - ml / 2, cy, fmt(box.margin[3]), c.margin);
          if (box.margin[1] > 0) this.chip(r.right + mr / 2, cy, fmt(box.margin[1]), c.margin);
        }
        if (s.showPadding) {
          if (pt > 0) this.chip(cx, iy + pt / 2, fmt(pt), c.padding);
          if (pb > 0) this.chip(cx, iy + ih - pb / 2, fmt(pb), c.padding);
          if (pl > 0) this.chip(ix + pl / 2, cy, fmt(pl), c.padding);
          if (pr > 0) this.chip(ix + iw - pr / 2, cy, fmt(pr), c.padding);
        }
      }
      this.drawTag(el, r, { left: r.left - ml, top: r.top - mt, right: r.right + mr, bottom: r.bottom + mb });
    }

    drawGaps(el, box) {
      const s = this.settings;
      const color = s.colors.gap;
      const items = [];
      for (const child of el.children) {
        if (items.length >= 300) break;
        if (this.ui && child === this.ui.host) continue;
        const cs = getComputedStyle(child);
        if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
        const r = child.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const m = [num(cs.marginTop), num(cs.marginRight), num(cs.marginBottom), num(cs.marginLeft)].map((v) => Math.max(0, v));
        items.push({ left: r.left - m[3], top: r.top - m[0], right: r.right + m[1], bottom: r.bottom + m[2] });
      }
      const hatch = {
        background: `repeating-linear-gradient(135deg, ${Core.hexToRgba(color, 0.75)} 0 2px, ${Core.hexToRgba(color, 0.12)} 2px 5px)`,
        border: `1px solid ${Core.hexToRgba(color, 0.9)}`
      };
      const { row, column } = box.gap;
      let first = null;
      const seen = new Set();
      const draw = (x, y, w, hgt) => {
        const key = `${Math.round(x)}:${Math.round(y)}:${Math.round(w)}:${Math.round(hgt)}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (this.rect(this.ui.boxes, x, y, w, hgt, hatch) && !first) first = { x: x + w / 2, y: y + hgt / 2 };
      };
      for (const a of items) {
        if (column > 0) {
          let best = null;
          for (const b of items) {
            if (b === a || b.left < a.right - 1) continue;
            if (Math.max(a.top, b.top) >= Math.min(a.bottom, b.bottom)) continue;
            if (!best || b.left < best.left) best = b;
          }
          if (best) draw(a.right, Math.max(a.top, best.top), Math.min(column, best.left - a.right), Math.min(a.bottom, best.bottom) - Math.max(a.top, best.top));
        }
        if (row > 0) {
          let best = null;
          for (const b of items) {
            if (b === a || b.top < a.bottom - 1) continue;
            if (Math.max(a.left, b.left) >= Math.min(a.right, b.right)) continue;
            if (!best || b.top < best.top) best = b;
          }
          if (best) draw(Math.max(a.left, best.left), a.bottom, Math.min(a.right, best.right) - Math.max(a.left, best.left), Math.min(row, best.top - a.bottom));
        }
      }
      if (first && s.showLabels) {
        const v = row === column || !column ? row : !row ? column : null;
        const txt = v !== null ? `gap ${Core.formatValue(v, s.units, s.remBase)}` : `gap ${Core.formatValue(row, s.units, s.remBase)} / ${Core.formatValue(column, s.units, s.remBase)}`;
        this.chip(first.x, first.y, txt, color);
      }
    }

    drawTag(el, r, outer) {
      const tag = h('div', { class: 'tag' }, [h('b', { text: describe(el) }), `${Core.fmt(r.width, 1)} × ${Core.fmt(r.height, 1)}`]);
      this.ui.overlay.append(tag);
      const w = tag.offsetWidth;
      let x = Math.min(Math.max(4, outer.left), innerWidth - w - 4);
      let y = outer.bottom + 6;
      if (y + 22 > innerHeight - 4) y = outer.top - 28;
      if (y < 4) y = Math.min(innerHeight - 26, Math.max(4, r.top + 4));
      tag.style.left = `${x}px`;
      tag.style.top = `${y}px`;
    }

    drawOutline(el, color, label, dashed = false) {
      const r = el.getBoundingClientRect();
      this.rect(this.ui.boxes, r.left, r.top, r.width, r.height, {
        border: `1.5px ${dashed ? 'dashed' : 'solid'} ${color}`,
        background: dashed ? 'transparent' : Core.hexToRgba(color.startsWith('#') ? color : '#FFFFFF', 0.06)
      });
      if (label) {
        const t = h('div', { class: 'tag', style: { background: color, color: '#fff' } }, [`${label} · ${Core.fmt(r.width, 1)} × ${Core.fmt(r.height, 1)}`]);
        this.ui.overlay.append(t);
        t.style.left = `${Math.min(Math.max(4, r.left), innerWidth - t.offsetWidth - 4)}px`;
        t.style.top = `${r.top - 26 < 4 ? r.bottom + 6 : r.top - 26}px`;
      }
    }

    drawMeasure(a, b, pinned) {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const { lines, guides } = Core.measure(ra, rb);
      const L = this.ui.boxes;
      const color = pinned ? Core.hexToRgba(MEASURE, 0.75) : MEASURE;
      for (const g of guides) {
        if (g.x1 === g.x2) this.rect(L, g.x1, g.y1, 1, g.y2 - g.y1, { width: '0', borderLeft: `1px dashed ${color}` });
        else this.rect(L, g.x1, g.y1, g.x2 - g.x1, 1, { height: '0', borderTop: `1px dashed ${color}` });
      }
      const unitsLabel = (v) => Core.formatValue(v, this.settings.units, this.settings.remBase);
      for (const l of lines) {
        if (l.axis === 'x') {
          this.rect(L, l.x1, l.y1 - 1, l.x2 - l.x1, 2, { background: color });
          this.rect(L, l.x1 - 1, l.y1 - 6, 2, 12, { background: color });
          this.rect(L, l.x2 - 1, l.y1 - 6, 2, 12, { background: color });
        } else {
          this.rect(L, l.x1 - 1, l.y1, 2, l.y2 - l.y1, { background: color });
          this.rect(L, l.x1 - 6, l.y1 - 1, 12, 2, { background: color });
          this.rect(L, l.x1 - 6, l.y2 - 1, 12, 2, { background: color });
        }
        const mx = (l.x1 + l.x2) / 2;
        const my = (l.y1 + l.y2) / 2;
        const style = pinned ? { background: '#FFFFFF', color: '#B0124F', border: `1.5px solid ${MEASURE}` } : null;
        const c = this.chip(l.axis === 'x' ? mx : mx + 8, l.axis === 'x' ? my - 13 : my, unitsLabel(l.value), MEASURE, style);
        if (l.axis === 'y') c.style.transform = 'translate(0, -50%)';
      }
      return lines;
    }

    renderMeasureMode() {
      const ui = this.ui;
      this.pins = this.pins.filter((p) => p.a.isConnected && p.b.isConnected);
      for (const p of this.pins) {
        this.drawOutline(p.a, Core.hexToRgba(MEASURE, 0.6), null, true);
        this.drawOutline(p.b, Core.hexToRgba(MEASURE, 0.6), null, true);
        this.drawMeasure(p.a, p.b, true);
      }
      if (this.anchorEl && !this.anchorEl.isConnected) this.anchorEl = null;
      const hover = this.hoverEl && this.hoverEl.isConnected ? this.hoverEl : null;
      ui.hint.hidden = false;
      if (this.anchorEl) {
        this.drawOutline(this.anchorEl, ANCHOR, describe(this.anchorEl));
        if (hover && hover !== this.anchorEl) {
          this.drawOutline(hover, MEASURE);
          this.drawMeasure(this.anchorEl, hover, false);
          this.showTip(this.anchorEl, hover, 'Click to pin · Shift+C copies');
        }
        ui.hint.replaceChildren(
          h('span', { class: 'dot' }),
          'Measuring from ',
          h('span', { class: 'sel', text: describe(this.anchorEl) }),
          h('span', { class: 'sep2', text: '·' }),
          'hover another element',
          h('span', { class: 'sep2', text: '·' }),
          'click to pin',
          h('span', { class: 'sep2', text: '·' }),
          'Esc resets'
        );
      } else {
        if (hover) this.drawOutline(hover, MEASURE, null, true);
        ui.hint.replaceChildren(h('span', { class: 'dot' }), 'Click an element to measure from it');
      }
    }

    showTip(a, b, foot) {
      const tip = this.ui.tip;
      const { lines } = Core.measure(a.getBoundingClientRect(), b.getBoundingClientRect());
      const fmt = (v) => Core.formatValue(v, this.settings.units, this.settings.remBase);
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const apart = rb.left >= ra.right || rb.right <= ra.left;
      const cx = (rb.left + rb.right) / 2;
      const vals = lines.map((l) => {
        const arrow = l.axis === 'y' ? '↕' : apart ? '↔' : l.x2 <= cx ? '←' : '→';
        return h('span', {}, [h('i', { text: arrow }), fmt(l.value)]);
      });
      tip.replaceChildren(
        h('div', { class: 'pair' }, [h('span', { class: 'a', text: describe(a) }), ' → ', h('span', { class: 'b', text: describe(b) })]),
        h('div', { class: 'vals' }, vals.length ? vals : [h('span', { text: 'touching' })]),
        h('div', { class: 'foot', text: foot })
      );
      tip.hidden = false;
      const w = 220;
      const th = tip.offsetHeight || 90;
      let x = this.pointer.x + 18;
      let y = this.pointer.y + 22;
      if (x + w > innerWidth - 8) x = this.pointer.x - w - 12;
      if (y + th > innerHeight - this.bottomReserve()) y = this.pointer.y - th - 14;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${Math.max(8, y)}px`;
    }

    bottomReserve() {
      return this.settings.showDock ? 80 : 8;
    }

    fadeDock(el) {
      const dock = this.ui.dock.root;
      if (!el || dock.hidden) return dock.classList.remove('faded');
      const r = el.getBoundingClientRect();
      const d = dock.getBoundingClientRect();
      const overlaps = r.left < d.right && r.right > d.left && r.top < d.bottom && r.bottom > d.top;
      dock.classList.toggle('faded', overlaps && r.width < innerWidth * 0.9);
    }

    // -- info card --

    renderCard(el) {
      const c = this.ui.card;
      if (!el) {
        c.root.hidden = true;
        this.cardFor = null;
        return;
      }
      const s = this.settings;
      const box = readBox(el);
      const pinned = el === this.pinnedEl;
      const key = `${s.units}|${s.remBase}|${pinned}|${box.margin}|${box.padding}|${box.border}|${box.gap && [box.gap.row, box.gap.column]}|${box.rect.width}x${box.rect.height}`;
      if (el !== this.cardFor || key !== this.cardKey) {
        this.cardFor = el;
        this.cardKey = key;
        this.fillCard(el, box, pinned);
      }
      c.root.hidden = false;
      this.positionCard(box);
    }

    fillCard(el, box, pinned) {
      const c = this.ui.card;
      const s = this.settings;
      const fmt = (v) => Core.formatValue(v, s.units, s.remBase);
      c.root.classList.toggle('pinned', pinned);
      c.root.style.setProperty('--bm-m', s.colors.margin);
      c.root.style.setProperty('--bm-b', s.colors.border);
      c.bm.style.background = Core.hexToRgba(s.colors.margin, 0.1);
      c.pad.style.background = Core.hexToRgba(s.colors.padding, 0.16);
      c.sel.textContent = describe(el);
      c.sel.title = describe(el);
      c.pin.classList.toggle('on', pinned);
      c.pin.setAttribute('aria-pressed', String(pinned));
      c.close.hidden = !pinned;

      const chain = [];
      let p = el.parentElement;
      while (p && chain.length < 2 && p !== document.documentElement) {
        chain.unshift(describe(p));
        p = p.parentElement;
      }
      c.crumbs.replaceChildren(chain.length ? `${chain.join(' › ')} › ` : '', h('span', { text: el.tagName.toLowerCase() }));

      const setV = (node, v) => {
        node.textContent = Math.abs(v) < 0.005 ? '0' : fmt(v);
        node.classList.toggle('zero', Math.abs(v) < 0.005);
      };
      box.margin.forEach((v, i) => setV(c.m[i], v));
      box.padding.forEach((v, i) => setV(c.p[i], v));
      const cw = box.rect.width - box.border[1] - box.border[3] - box.padding[1] - box.padding[3];
      const ch = box.rect.height - box.border[0] - box.border[2] - box.padding[0] - box.padding[2];
      c.content.textContent = `${Core.fmt(Math.max(0, cw), 1)} × ${Core.fmt(Math.max(0, ch), 1)}`;

      c.size.textContent = `${Core.fmt(box.rect.width, 1)} × ${Core.fmt(box.rect.height, 1)}`;
      const b = box.border;
      c.border.textContent = b.every((v) => v === b[0]) ? `${Core.fmt(b[0])}px` : b.map((v) => Core.fmt(v)).join(' ');
      c.display.textContent = box.display;
      let gap = box.gap;
      let gapLabel = 'gap';
      if (!gap && el.parentElement) {
        const pb = readBox(el.parentElement);
        if (pb.gap) {
          gap = pb.gap;
          gapLabel = 'parent gap';
        }
      }
      c.gapLabel.textContent = gapLabel;
      c.gap.textContent = gap ? (gap.row === gap.column ? fmt(gap.row) : `${fmt(gap.row)} / ${fmt(gap.column)}`) : '–';
      c.gap.style.color = gap ? 'var(--c-gap)' : '';

      this.fillCode(c.code, box);
      c.actions.hidden = !pinned;
      c.hint.hidden = pinned;
      if (!pinned) {
        c.hint.replaceChildren(
          ...(s.pinOnClick ? ['Click to pin'] : [kbd('P'), 'to pin']),
          h('span', { text: '·' }),
          kbd('C'),
          'copy',
          h('span', { text: '·' }),
          kbd('Alt'),
          'measure'
        );
      }
    }

    fillCode(pre, box) {
      const s = this.settings;
      pre.replaceChildren();
      const family = (prop) => (/^-?m/.test(prop) || prop.startsWith('margin') ? 'margin' : /^p/.test(prop) || prop.startsWith('padding') ? 'padding' : prop.startsWith('border') ? 'border' : prop.startsWith('gap') ? 'gap' : 'muted');
      if (s.units === 'tw') {
        const cls = Core.tailwindFor(box);
        if (!cls) return pre.append(h('span', { class: 'k-muted', text: 'no spacing classes' }));
        cls.split(' ').forEach((name, i) => {
          if (i) pre.append(' ');
          pre.append(h('span', { class: `k-${family(name)}`, text: name }));
        });
        return;
      }
      Core.cssFor(box, s.units, s.remBase)
        .split('\n')
        .forEach((line, i) => {
          if (i) pre.append('\n');
          const m = line.match(/^([\w-]+):(.*)$/);
          if (!m) return pre.append(h('span', { class: 'k-muted', text: line }));
          pre.append(h('span', { class: `k-${family(m[1])}`, text: m[1] }), `:${m[2]}`);
        });
    }

    positionCard(box) {
      const node = this.ui.card.root;
      const r = box.rect;
      const pos = (v) => Math.max(0, v);
      const outer = { left: r.left - pos(box.margin[3]), top: r.top - pos(box.margin[0]), right: r.right + pos(box.margin[1]), bottom: r.bottom + pos(box.margin[2]) };
      const w = 272;
      const hgt = node.offsetHeight;
      const vw = innerWidth;
      const vh = innerHeight - this.bottomReserve();
      const gap = 12;
      const clampY = (y) => Math.max(8, Math.min(y, vh - hgt));
      const clampX = (x) => Math.max(8, Math.min(x, vw - w - 8));
      let x;
      let y;
      if (outer.right + gap + w <= vw - 8) {
        x = outer.right + gap;
        y = clampY(outer.top);
      } else if (outer.left - gap - w >= 8) {
        x = outer.left - gap - w;
        y = clampY(outer.top);
      } else if (outer.bottom + gap + hgt <= vh) {
        x = clampX(outer.left);
        y = outer.bottom + gap;
      } else if (outer.top - gap - hgt >= 8) {
        x = clampX(outer.left);
        y = outer.top - gap - hgt;
      } else {
        x = vw - w - 16;
        y = 16;
      }
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
    }

    // -- spacing audit --

    runAudit() {
      const t0 = performance.now();
      const records = [];
      const values = [];
      const all = document.body ? document.body.getElementsByTagName('*') : [];
      let scanned = 0;
      for (let i = 0; i < all.length && scanned < MAX_SCAN; i++) {
        const el = all[i];
        if (SKIP_TAGS.has(el.tagName)) continue;
        if (this.ui && el === this.ui.host) continue;
        if (el instanceof SVGElement && el.tagName.toLowerCase() !== 'svg') continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.display === 'contents' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        scanned++;
        const margin = [num(cs.marginTop), num(cs.marginRight), num(cs.marginBottom), num(cs.marginLeft)];
        const padding = [num(cs.paddingTop), num(cs.paddingRight), num(cs.paddingBottom), num(cs.paddingLeft)];
        let gap = null;
        if (/flex|grid/.test(cs.display)) {
          const row = num(cs.rowGap);
          const column = num(cs.columnGap);
          if (row > 0 || column > 0) gap = { row, column };
        }
        const inline = cs.display === 'inline';
        // Equal left/right margins on a block are almost always `auto` centering.
        const centered = !inline && margin[1] > 0 && Math.abs(margin[1] - margin[3]) < 0.5;
        const skipM = [inline, centered, inline, centered];
        margin.forEach((v, k) => {
          if (!skipM[k] && Math.abs(v) > 0.01) values.push(v);
        });
        padding.forEach((v) => {
          if (v > 0.01) values.push(v);
        });
        if (gap) {
          if (gap.row > 0.01) values.push(gap.row);
          if (gap.column > 0.01 && Math.abs(gap.column - gap.row) > 0.01) values.push(gap.column);
        }
        records.push({ el, margin, padding, gap, skipM });
      }

      const chosen = this.settings.auditBase;
      const base = chosen === 'auto' ? Core.detectBase(values) : chosen;
      const groups = new Map();
      for (const rec of records) {
        const found = [
          ...Core.sideIssues('margin', rec.margin, base, rec.skipM).map((i) => ({ ...i, family: 'margin' })),
          ...Core.sideIssues('padding', rec.padding, base).map((i) => ({ ...i, family: 'padding' })),
          ...Core.gapIssues(rec.gap, base).map((i) => ({ ...i, family: 'gap' }))
        ];
        if (!found.length) continue;
        const sel = selectorFor(rec.el);
        for (const issue of found) {
          const key = `${sel}|${issue.prop}|${Core.fmt(issue.from)}`;
          let g = groups.get(key);
          if (!g) {
            g = { ...issue, selector: sel, label: describe(rec.el), els: [] };
            groups.set(key, g);
          }
          g.els.push(rec.el);
        }
      }
      const list = [...groups.values()];
      const docTop = (el) => {
        const r = el.getBoundingClientRect();
        return [r.top + scrollY, r.left + scrollX];
      };
      list.forEach((g) => (g.pos = docTop(g.els[0])));
      list.sort((x, y) => x.pos[0] - y.pos[0] || x.pos[1] - y.pos[1]);
      list.forEach((g, i) => (g.index = i));

      const summary = Core.score(values, base);
      const projected = Core.score(values.map((v) => (Core.classify(v, base) === 'off' ? Core.suggest(v, base) : v)), base).score;
      this.audit = {
        time: Date.now(),
        ms: Math.round(performance.now() - t0),
        base,
        auto: chosen === 'auto',
        scanned,
        summary,
        projected,
        histogram: Core.histogram(values, base, 11),
        groups: list
      };
      this.auditIndex = Math.min(this.auditIndex, Math.max(0, this.filteredGroups().length - 1));
      return this.audit;
    }

    filteredGroups() {
      if (!this.audit) return [];
      if (this.auditFilter === 'all') return this.audit.groups;
      return this.audit.groups.filter((g) => g.family === this.auditFilter);
    }

    groupIndexOf(el) {
      if (!el || !this.audit || this.mode !== 'audit') return 0;
      const groups = this.filteredGroups();
      const i = groups.findIndex((g) => g.els.includes(el));
      return i + 1;
    }

    stepIssue(dir) {
      const n = this.filteredGroups().length;
      if (!n) return;
      this.focusIssue((this.auditIndex + dir + n) % n);
    }

    focusIssue(index, { scroll = true } = {}) {
      if (!this.audit) this.runAudit();
      const groups = this.filteredGroups();
      if (!groups.length) return this.refreshUI();
      this.auditIndex = Math.max(0, Math.min(index, groups.length - 1));
      const g = groups[this.auditIndex];
      const el = g.els.find((e) => e.isConnected);
      if (scroll && el) {
        const r = el.getBoundingClientRect();
        if (!inViewport(r) || r.top < 60 || r.bottom > innerHeight - 100) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      }
      this.refreshUI();
      const row = this.ui && this.ui.panel.list.children[this.auditIndex];
      if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }

    renderAudit() {
      const groups = this.filteredGroups();
      const active = groups[this.auditIndex];
      const L = this.ui.boxes;
      let drawn = 0;
      const showText = groups.length <= 12;
      for (const g of groups) {
        const isActive = g === active;
        for (const el of g.els) {
          if (drawn > 150) break;
          if (!el.isConnected) continue;
          const r = el.getBoundingClientRect();
          if (!inViewport(r) || (!r.width && !r.height)) continue;
          drawn++;
          this.rect(L, r.left, r.top, r.width, r.height, {
            border: `${isActive ? 2 : 1.5}px solid ${AUDIT}`,
            boxShadow: isActive ? '0 0 0 4px rgba(255,159,67,0.25)' : 'none',
            borderRadius: '2px'
          });
          if (isActive) this.hatchIssue(el, g);
          const text = isActive || showText ? `${g.index + 1}  ${Core.shortProp(g.prop)} ${Core.fmt(g.from)} → ${Core.fmt(g.to)}` : String(g.index + 1);
          const badge = this.chip(r.left, r.top, text, AUDIT, { transform: 'translate(0, -100%)', fontWeight: isActive ? '700' : '600', padding: '4px 6px', zIndex: isActive ? '2' : '1' });
          if (r.top < 22) badge.style.transform = 'translate(0, 2px)';
        }
      }
    }

    // Hatch the exact sides an issue is about.
    hatchIssue(el, g) {
      const box = readBox(el);
      const r = box.rect;
      const fill = { background: `repeating-linear-gradient(135deg, rgba(255,159,67,0.6) 0 2px, rgba(255,159,67,0.12) 2px 5px)` };
      const L = this.ui.boxes;
      if (g.family === 'margin') {
        const [t, rt, b, l] = box.margin.map((v) => Math.max(0, v));
        (g.sides || []).forEach((side) => {
          if (side === 0) this.rect(L, r.left, r.top - t, r.width, t, fill);
          if (side === 1) this.rect(L, r.right, r.top, rt, r.height, fill);
          if (side === 2) this.rect(L, r.left, r.bottom, r.width, b, fill);
          if (side === 3) this.rect(L, r.left - l, r.top, l, r.height, fill);
        });
      } else if (g.family === 'padding') {
        const [bt, br, bb, bl] = box.border;
        const [t, rt, b, l] = box.padding;
        const ix = r.left + bl;
        const iy = r.top + bt;
        const iw = r.width - bl - br;
        const ih = r.height - bt - bb;
        (g.sides || []).forEach((side) => {
          if (side === 0) this.rect(L, ix, iy, iw, t, fill);
          if (side === 1) this.rect(L, ix + iw - rt, iy, rt, ih, fill);
          if (side === 2) this.rect(L, ix, iy + ih - b, iw, b, fill);
          if (side === 3) this.rect(L, ix, iy, l, ih, fill);
        });
      }
    }

    renderPanel() {
      const p = this.ui.panel;
      const show = this.enabled && this.mode === 'audit' && !!this.audit;
      p.root.hidden = !show;
      if (!show) return;
      const a = this.audit;
      const sc = a.summary.score;
      const color = sc >= 75 ? '#34D399' : sc >= 55 ? '#FFB020' : '#FF6B6B';
      const circ = 2 * Math.PI * 26;
      p.arc.setAttribute('stroke', color);
      p.arc.setAttribute('stroke-dasharray', `${(circ * sc) / 100} ${circ}`);
      p.ring.setAttribute('aria-label', `Spacing score ${sc} out of 100`);
      p.scoreNum.textContent = String(sc);
      p.label.textContent = a.summary.label;
      p.meta.replaceChildren(h('span', { class: 'n', text: String(a.scanned) }), ' elements · ', h('span', { class: 'n', text: `${a.base}px` }), a.auto ? ' grid (detected)' : ' grid');
      const total = a.groups.length;
      if (total && a.projected > sc) p.projected.replaceChildren('Fix all to reach ', h('span', { class: 'n good', text: String(a.projected) }));
      else if (!total) p.projected.replaceChildren('Every value sits on the grid');
      else p.projected.replaceChildren(`${total} spots to tidy`);

      const counts = { all: total, margin: 0, padding: 0, gap: 0 };
      a.groups.forEach((g) => counts[g.family]++);
      p.filters.forEach((f) => {
        f.b.setAttribute('aria-pressed', String(f.key === this.auditFilter));
        f.n.textContent = String(counts[f.key]);
      });
      p.root.style.maxHeight = `${innerHeight - 32 - (this.settings.showDock ? 72 : 0)}px`;

      const groups = this.filteredGroups();
      if (!groups.length) {
        p.list.replaceChildren(h('div', { class: 'empty', text: total ? 'Nothing in this category.' : 'No off-grid spacing found. Nice work.' }));
        return;
      }
      p.list.replaceChildren(
        ...groups.slice(0, 300).map((g, i) => {
          const active = i === this.auditIndex;
          const row = h('button', { class: 'row', onclick: () => this.focusIssue(i) }, [
            h('span', { class: 'num', text: String(g.index + 1) }),
            h('span', { class: 'sel', text: g.label, title: g.selector }),
            g.els.length > 1 ? h('span', { class: 'cnt', text: `×${g.els.length}` }) : null,
            h('span', { class: 'chg' }, [`${Core.shortProp(g.prop)} `, h('span', { class: 'from', text: Core.fmt(g.from) }), ' → ', h('span', { class: 'to', text: Core.fmt(g.to) })])
          ]);
          const wrap = h('div', { class: `issue${active ? ' active' : ''}` }, row);
          if (active) {
            const decl = Core.fixDeclarations(g).join('\n');
            wrap.append(h('div', { class: 'fix' }, [h('code', { text: decl }), h('button', { class: 'btn', onclick: () => this.copyText(this.fixCss([g]), 'fix') }, 'Copy')]));
          }
          return wrap;
        })
      );
    }

    fixCss(groups) {
      const bySel = new Map();
      for (const g of groups) {
        if (!bySel.has(g.selector)) bySel.set(g.selector, []);
        Core.fixDeclarations(g).forEach((d) => bySel.get(g.selector).push(`  ${d} /* was ${Core.fmt(g.from)}px */`));
      }
      const head = `/* Spacing Inspector: suggested fixes for ${location.host || 'this page'} (${this.audit ? this.audit.base : 8}px grid) */`;
      return [head, ...[...bySel.entries()].map(([sel, decls]) => `${sel} {\n${[...new Set(decls)].join('\n')}\n}`)].join('\n\n');
    }

    copyAllFixes() {
      const groups = this.filteredGroups();
      if (!groups.length) return this.toast('Nothing to fix');
      this.copyText(this.fixCss(groups), `${groups.length} fix${groups.length > 1 ? 'es' : ''}`);
    }

    exportAudit() {
      if (!this.audit) return;
      const a = this.audit;
      const data = {
        tool: `Spacing Inspector ${VERSION}`,
        url: location.href,
        date: new Date().toISOString(),
        grid: a.base,
        score: a.summary.score,
        label: a.summary.label,
        scanned: a.scanned,
        values: { total: a.summary.total, onGrid: a.summary.on, halfStep: a.summary.half, offGrid: a.summary.off, unique: a.summary.unique },
        scale: a.histogram,
        issues: a.groups.map((g) => ({ selector: g.selector, property: g.prop, from: g.from, to: g.to, count: g.els.length }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spacing-audit-${(location.host || 'page').replace(/[^\w.-]/g, '_')}.json`;
      (document.body || document.documentElement).append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.toast('Audit exported');
    }

    auditSummary() {
      const a = this.audit;
      if (!a) return null;
      const s = a.summary;
      return {
        score: s.score,
        label: s.label,
        scanned: a.scanned,
        onGridPct: s.total ? Math.round(((s.on + s.half) / s.total) * 100) : 100,
        issues: a.groups.length,
        base: a.base,
        auto: a.auto,
        projected: a.projected,
        histogram: a.histogram,
        top: a.groups.slice(0, 3).map((g) => ({ index: g.index, label: g.label, prop: Core.shortProp(g.prop), from: g.from, to: g.to, count: g.els.length })),
        fixes: this.fixCss(a.groups)
      };
    }
  }

  new Inspector();
})();

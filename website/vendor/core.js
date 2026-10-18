// Spacing Inspector core: pure helpers shared by the content script, the popup
// and the unit tests. No DOM or chrome.* access in here.
(function (root) {
  'use strict';

  const PRESETS = {
    classic: { margin: '#4C8DFF', border: '#F2C94C', padding: '#34D399', content: '#94A3B8', gap: '#C084FC' },
    devtools: { margin: '#F6B26B', border: '#FFE599', padding: '#93C47D', content: '#6FA8DC', gap: '#C27BA0' },
    neon: { margin: '#FF4D8D', border: '#A3E635', padding: '#22D3EE', content: '#FDE047', gap: '#A78BFA' },
    contrast: { margin: '#FFFFFF', border: '#FFE600', padding: '#00D1FF', content: '#FF3EA5', gap: '#B388FF' }
  };

  const DEFAULTS = {
    settingsVersion: 2,
    showMargin: true,
    showBorder: true,
    showPadding: true,
    showContent: false,
    showGap: true,
    showLabels: true,
    pinOnClick: true,
    units: 'px', // 'px' | 'rem' | 'tw'
    gridOverlay: 0, // 0 | 4 | 8
    preset: 'classic',
    colors: { ...PRESETS.classic },
    opacity: 0.3,
    theme: 'dark', // 'auto' | 'dark' | 'light'
    remBase: 16,
    showDock: true,
    auditBase: 'auto' // 'auto' | 4 | 8
  };

  const V1_DEFAULT_MARGIN = '#3b82f6';
  const V1_DEFAULT_PADDING = '#10b981';

  function isHex(v) {
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  // Merge stored values over the defaults, dropping anything malformed.
  function normalizeSettings(raw) {
    const s = { ...DEFAULTS, colors: { ...DEFAULTS.colors } };
    if (!raw || typeof raw !== 'object') return s;
    for (const key of ['showMargin', 'showBorder', 'showPadding', 'showContent', 'showGap', 'showLabels', 'pinOnClick', 'showDock']) {
      if (typeof raw[key] === 'boolean') s[key] = raw[key];
    }
    if (['px', 'rem', 'tw'].includes(raw.units)) s.units = raw.units;
    if ([0, 4, 8].includes(raw.gridOverlay)) s.gridOverlay = raw.gridOverlay;
    if (raw.preset === 'custom' || PRESETS[raw.preset]) s.preset = raw.preset;
    if (raw.colors && typeof raw.colors === 'object') {
      for (const key of Object.keys(DEFAULTS.colors)) {
        if (isHex(raw.colors[key])) s.colors[key] = raw.colors[key].toUpperCase();
      }
    }
    if (typeof raw.opacity === 'number' && isFinite(raw.opacity)) s.opacity = clamp(raw.opacity, 0.1, 0.8);
    if (['auto', 'dark', 'light'].includes(raw.theme)) s.theme = raw.theme;
    if (typeof raw.remBase === 'number' && isFinite(raw.remBase)) s.remBase = clamp(Math.round(raw.remBase), 8, 32);
    if (raw.auditBase === 'auto' || raw.auditBase === 4 || raw.auditBase === 8) s.auditBase = raw.auditBase;
    return s;
  }

  // Turn v1.x storage (flat keys) into v2 settings. Custom v1 colors are kept;
  // untouched v1 defaults move to the new Classic palette.
  function migrateV1(raw) {
    raw = raw || {};
    const s = normalizeSettings(raw.settingsVersion === 2 ? raw : {});
    if (raw.settingsVersion === 2) return s;
    if (typeof raw.showValues === 'boolean') s.showLabels = raw.showValues;
    if (typeof raw.opacity === 'number' && isFinite(raw.opacity)) s.opacity = clamp(raw.opacity, 0.1, 0.8);
    const m = isHex(raw.marginColor) ? raw.marginColor.toLowerCase() : V1_DEFAULT_MARGIN;
    const p = isHex(raw.paddingColor) ? raw.paddingColor.toLowerCase() : V1_DEFAULT_PADDING;
    if (m !== V1_DEFAULT_MARGIN || p !== V1_DEFAULT_PADDING) {
      s.preset = 'custom';
      if (m !== V1_DEFAULT_MARGIN) s.colors.margin = m.toUpperCase();
      if (p !== V1_DEFAULT_PADDING) s.colors.padding = p.toUpperCase();
    }
    return s;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hexToRgba(hex, alpha) {
    const [r, g, b] = hexToRgb(isHex(hex) ? hex : '#888888');
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
  }

  // Dark or light text, whichever reads better on the given background.
  function readableText(hex) {
    const [r, g, b] = hexToRgb(isHex(hex) ? hex : '#888888').map((c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.25 ? '#0B0D12' : '#FFFFFF';
  }

  function fmt(n, digits = 2) {
    if (!isFinite(n)) return '0';
    const f = Math.pow(10, digits);
    const r = Math.round(n * f) / f;
    return String(Object.is(r, -0) ? 0 : r);
  }

  const TW_SCALE = {
    0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3', 14: '3.5', 16: '4',
    20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10', 44: '11', 48: '12', 56: '14', 64: '16',
    80: '20', 96: '24', 112: '28', 128: '32', 144: '36', 160: '40', 176: '44', 192: '48', 208: '52',
    224: '56', 240: '60', 256: '64', 288: '72', 320: '80', 384: '96'
  };

  // Tailwind spacing key for a pixel value (default 16px root): 16 -> "4", 13 -> "[13px]".
  function twKey(px) {
    const a = Math.abs(px);
    const r = Math.round(a * 100) / 100;
    if (Number.isInteger(r) && TW_SCALE[r] !== undefined) return TW_SCALE[r];
    return `[${fmt(r)}px]`;
  }

  // Label shown on the page for one side.
  function formatValue(px, units, remBase = 16) {
    if (units === 'rem') return `${fmt(px / remBase, 3)}rem`;
    if (units === 'tw') return (px < 0 ? '-' : '') + twKey(px);
    return fmt(px, 1);
  }

  function cssLength(px, units, remBase) {
    if (Math.abs(px) < 0.005) return '0';
    if (units === 'rem') return `${fmt(px / remBase, 4)}rem`;
    return `${fmt(px)}px`;
  }

  // [top, right, bottom, left] -> CSS shorthand value.
  function shorthand(sides, units = 'px', remBase = 16) {
    const [t, r, b, l] = sides.map((v) => cssLength(v, units, remBase));
    if (t === r && r === b && b === l) return t;
    if (t === b && r === l) return `${t} ${r}`;
    if (r === l) return `${t} ${r} ${b}`;
    return `${t} ${r} ${b} ${l}`;
  }

  function same(a, b) {
    return Math.abs(a - b) < 0.005;
  }

  function twClass(prefix, px) {
    if (Math.abs(px) < 0.005) return null;
    return `${px < 0 ? '-' : ''}${prefix}-${twKey(px)}`;
  }

  // Tailwind classes for one family ('m' or 'p') given [t, r, b, l].
  function twSides(prefix, [t, r, b, l]) {
    const out = [];
    const push = (p, v) => {
      const c = twClass(p, v);
      if (c) out.push(c);
    };
    if (same(t, r) && same(r, b) && same(b, l)) {
      push(prefix, t);
    } else if (same(t, b) && same(l, r)) {
      push(prefix + 'y', t);
      push(prefix + 'x', l);
    } else if (same(l, r)) {
      push(prefix + 't', t);
      push(prefix + 'b', b);
      push(prefix + 'x', l);
    } else if (same(t, b)) {
      push(prefix + 'y', t);
      push(prefix + 'l', l);
      push(prefix + 'r', r);
    } else {
      push(prefix + 't', t);
      push(prefix + 'r', r);
      push(prefix + 'b', b);
      push(prefix + 'l', l);
    }
    return out;
  }

  function twBorderWidth(px) {
    const r = Math.round(px * 100) / 100;
    if (r === 1) return '';
    if ([0, 2, 4, 8].includes(r)) return `-${r}`;
    return `-[${fmt(r)}px]`;
  }

  function twBorder([t, r, b, l]) {
    if (same(t, r) && same(r, b) && same(b, l)) return t > 0 ? [`border${twBorderWidth(t)}`] : [];
    const out = [];
    [['t', t], ['r', r], ['b', b], ['l', l]].forEach(([side, v]) => {
      if (v > 0) out.push(`border-${side}${twBorderWidth(v)}`);
    });
    return out;
  }

  function hasAny(sides) {
    return sides.some((v) => Math.abs(v) >= 0.005);
  }

  // box = { margin:[t,r,b,l], padding:[...], border:[...], gap:{row, column} | null }
  function tailwindFor(box) {
    const out = [...twSides('m', box.margin), ...twSides('p', box.padding), ...twBorder(box.border)];
    if (box.gap) {
      const { row, column } = box.gap;
      if (row > 0 && same(row, column)) out.push(`gap-${twKey(row)}`);
      else {
        if (column > 0) out.push(`gap-x-${twKey(column)}`);
        if (row > 0) out.push(`gap-y-${twKey(row)}`);
      }
    }
    return out.join(' ');
  }

  function cssFor(box, units = 'px', remBase = 16) {
    const lines = [];
    if (hasAny(box.margin)) lines.push(`margin: ${shorthand(box.margin, units, remBase)};`);
    if (hasAny(box.padding)) lines.push(`padding: ${shorthand(box.padding, units, remBase)};`);
    if (hasAny(box.border)) lines.push(`border-width: ${shorthand(box.border, 'px', remBase)};`);
    if (box.gap && (box.gap.row > 0 || box.gap.column > 0)) {
      const row = cssLength(box.gap.row, units, remBase);
      const col = cssLength(box.gap.column, units, remBase);
      lines.push(`gap: ${row === col ? row : `${row} ${col}`};`);
    }
    return lines.length ? lines.join('\n') : '/* no margin, padding, border or gap */';
  }

  function codeFor(box, units, remBase) {
    return units === 'tw' ? tailwindFor(box) || '/* no spacing classes */' : cssFor(box, units, remBase);
  }

  // ---- Measuring -----------------------------------------------------------

  // Distances between anchor rect a and target rect b, Figma style.
  // Returns lines ({x1,y1,x2,y2,value,axis}) and dashed guides ({x1,y1,x2,y2}).
  function measure(a, b) {
    const lines = [];
    const guides = [];
    const vOverlap = Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom);
    const hOverlap = Math.max(a.left, b.left) < Math.min(a.right, b.right);
    const y = vOverlap ? (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 : (b.top + b.bottom) / 2;
    const x = hOverlap ? (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2 : (b.left + b.right) / 2;

    // Dashed extension along the owner's edge when the line sits outside it.
    const guideV = (gx, owner) => {
      if (y < owner.top) guides.push({ x1: gx, y1: y, x2: gx, y2: owner.top });
      else if (y > owner.bottom) guides.push({ x1: gx, y1: owner.bottom, x2: gx, y2: y });
    };
    const guideH = (gy, owner) => {
      if (x < owner.left) guides.push({ x1: x, y1: gy, x2: owner.left, y2: gy });
      else if (x > owner.right) guides.push({ x1: owner.right, y1: gy, x2: x, y2: gy });
    };
    const hLine = (x1, o1, x2, o2) => {
      if (x2 - x1 < 0.5) return;
      lines.push({ x1, y1: y, x2, y2: y, value: x2 - x1, axis: 'x' });
      guideV(x1, o1);
      guideV(x2, o2);
    };
    const vLine = (y1, o1, y2, o2) => {
      if (y2 - y1 < 0.5) return;
      lines.push({ x1: x, y1, x2: x, y2, value: y2 - y1, axis: 'y' });
      guideH(y1, o1);
      guideH(y2, o2);
    };

    if (b.left >= a.right) hLine(a.right, a, b.left, b);
    else if (b.right <= a.left) hLine(b.right, b, a.left, a);
    else {
      if (a.left <= b.left) hLine(a.left, a, b.left, b);
      else hLine(b.left, b, a.left, a);
      if (b.right <= a.right) hLine(b.right, b, a.right, a);
      else hLine(a.right, a, b.right, b);
    }

    if (b.top >= a.bottom) vLine(a.bottom, a, b.top, b);
    else if (b.bottom <= a.top) vLine(b.bottom, b, a.top, a);
    else {
      if (a.top <= b.top) vLine(a.top, a, b.top, b);
      else vLine(b.top, b, a.top, a);
      if (b.bottom <= a.bottom) vLine(b.bottom, b, a.bottom, a);
      else vLine(a.bottom, a, b.bottom, b);
    }
    return { lines, guides };
  }

  // ---- Spacing audit -------------------------------------------------------

  const EPS = 0.01;

  function isMultiple(v, n) {
    const r = v % n;
    return r < EPS || n - r < EPS;
  }

  // 'on' = on the grid, 'half' = half step of an 8px grid, 'off' = off-grid.
  function classify(v, base) {
    const a = Math.abs(v);
    if (a <= 2 + EPS) return 'on'; // hairline tweaks
    if (isMultiple(a, base)) return 'on';
    if (base === 8 && isMultiple(a, 4)) return 'half';
    return 'off';
  }

  // Nearest acceptable value: a multiple of 4, ties going to the multiple of 8.
  function suggest(v, base) {
    const a = Math.abs(v);
    const step = base === 8 ? 4 : base;
    const lo = Math.floor(a / step) * step;
    const hi = lo + step;
    let pick;
    if (a - lo < hi - a - EPS) pick = lo;
    else if (hi - a < a - lo - EPS) pick = hi;
    else pick = isMultiple(hi, 8) ? hi : lo;
    if (pick === 0) pick = step;
    return v < 0 ? -pick : pick;
  }

  // Guess the grid from the values: 8 if most 4-multiples are also 8-multiples.
  function detectBase(values) {
    let m4 = 0;
    let m8 = 0;
    for (const v of values) {
      const a = Math.abs(v);
      if (a <= 2 + EPS) continue;
      if (isMultiple(a, 4)) m4++;
      if (isMultiple(a, 8)) m8++;
    }
    if (m4 === 0) return 4;
    return m8 / m4 >= 0.6 ? 8 : 4;
  }

  function scoreLabel(score) {
    if (score >= 90) return 'Great rhythm';
    if (score >= 75) return 'Good rhythm';
    if (score >= 55) return 'Needs tuning';
    return 'Inconsistent';
  }

  // values: non-zero spacing values found on the page.
  function score(values, base) {
    let on = 0;
    let half = 0;
    let off = 0;
    const unique = new Set();
    for (const v of values) {
      const c = classify(v, base);
      if (c === 'on') on++;
      else if (c === 'half') half++;
      else off++;
      unique.add(Math.round(Math.abs(v) * 10) / 10);
    }
    const total = values.length;
    if (!total) return { score: 100, label: scoreLabel(100), on, half, off, total, unique: 0 };
    const base100 = ((on + 0.9 * half) / total) * 100;
    const penalty = clamp((unique.size - 12) * 1.5, 0, 15);
    const s = Math.round(clamp(base100 - penalty, 0, 100));
    return { score: s, label: scoreLabel(s), on, half, off, total, unique: unique.size };
  }

  // Most-used values, sorted by size, each tagged with its class.
  function histogram(values, base, limit = 12) {
    const counts = new Map();
    for (const v of values) {
      const k = Math.round(Math.abs(v) * 10) / 10;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, limit)
      .sort((x, y) => x[0] - y[0])
      .map(([value, count]) => ({ value, count, kind: classify(value, base) }));
  }

  const SIDE_NAMES = ['top', 'right', 'bottom', 'left'];

  // Off-grid sides of one family ('margin' | 'padding') grouped into readable
  // properties: [{prop, sides, from, to}]
  function sideIssues(family, sides, base, skip = []) {
    const off = sides.map((v, i) => !skip[i] && Math.abs(v) > EPS && classify(v, base) === 'off');
    const issues = [];
    const add = (prop, idx) => issues.push({ prop, sides: idx, from: sides[idx[0]], to: suggest(sides[idx[0]], base) });
    const eq = (i, j) => same(sides[i], sides[j]);
    const done = [false, false, false, false];
    if (off.every(Boolean) && eq(0, 1) && eq(1, 2) && eq(2, 3)) {
      add(family, [0, 1, 2, 3]);
      return issues;
    }
    if (off[0] && off[2] && eq(0, 2)) {
      add(`${family}-y`, [0, 2]);
      done[0] = done[2] = true;
    }
    if (off[1] && off[3] && eq(1, 3)) {
      add(`${family}-x`, [1, 3]);
      done[1] = done[3] = true;
    }
    off.forEach((isOff, i) => {
      if (isOff && !done[i]) add(`${family}-${SIDE_NAMES[i]}`, [i]);
    });
    return issues;
  }

  function gapIssues(gap, base) {
    if (!gap) return [];
    const rowOff = gap.row > EPS && classify(gap.row, base) === 'off';
    const colOff = gap.column > EPS && classify(gap.column, base) === 'off';
    if (rowOff && colOff && same(gap.row, gap.column)) return [{ prop: 'gap', from: gap.row, to: suggest(gap.row, base) }];
    const out = [];
    if (rowOff) out.push({ prop: 'row-gap', from: gap.row, to: suggest(gap.row, base) });
    if (colOff) out.push({ prop: 'column-gap', from: gap.column, to: suggest(gap.column, base) });
    return out;
  }

  // CSS declarations that fix one issue.
  function fixDeclarations(issue) {
    const v = `${fmt(issue.to)}px`;
    const p = issue.prop;
    if (p.endsWith('-y')) {
      const f = p.slice(0, -2);
      return [`${f}-top: ${v};`, `${f}-bottom: ${v};`];
    }
    if (p.endsWith('-x')) {
      const f = p.slice(0, -2);
      return [`${f}-left: ${v};`, `${f}-right: ${v};`];
    }
    return [`${p}: ${v};`];
  }

  // Short label used in badges: "margin-b 22 → 24".
  function shortProp(prop) {
    return prop
      .replace(/-top$/, '-t')
      .replace(/-right$/, '-r')
      .replace(/-bottom$/, '-b')
      .replace(/-left$/, '-l');
  }

  const api = {
    PRESETS,
    DEFAULTS,
    normalizeSettings,
    migrateV1,
    hexToRgba,
    readableText,
    fmt,
    twKey,
    formatValue,
    cssLength,
    shorthand,
    twSides,
    tailwindFor,
    cssFor,
    codeFor,
    measure,
    classify,
    suggest,
    detectBase,
    score,
    scoreLabel,
    histogram,
    sideIssues,
    gapIssues,
    fixDeclarations,
    shortProp
  };

  root.SpacingCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

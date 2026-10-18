const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../extension/lib/core.js');

const box = (margin, padding, border = [0, 0, 0, 0], gap = null) => ({ margin, padding, border, gap });

test('settings: defaults and validation', () => {
  const s = Core.normalizeSettings({ units: 'em', opacity: 5, colors: { margin: 'red', padding: '#00ff00' }, gridOverlay: 8 });
  assert.equal(s.units, 'px');
  assert.equal(s.opacity, 0.8);
  assert.equal(s.colors.margin, Core.DEFAULTS.colors.margin);
  assert.equal(s.colors.padding, '#00FF00');
  assert.equal(s.gridOverlay, 8);
  assert.notEqual(Core.normalizeSettings({}).colors, Core.DEFAULTS.colors, 'colors object must be a copy');
});

test('settings: v1 migration keeps custom choices only', () => {
  const untouched = Core.migrateV1({ inspectorEnabled: true, showValues: true, marginColor: '#3b82f6', paddingColor: '#10b981', opacity: 0.3 });
  assert.equal(untouched.preset, 'classic');
  assert.equal(untouched.colors.margin, '#4C8DFF');

  const custom = Core.migrateV1({ showValues: false, marginColor: '#ff0000', paddingColor: '#10b981', opacity: 0.5 });
  assert.equal(custom.preset, 'custom');
  assert.equal(custom.colors.margin, '#FF0000');
  assert.equal(custom.colors.padding, '#34D399');
  assert.equal(custom.showLabels, false);
  assert.equal(custom.opacity, 0.5);

  const v2 = Core.migrateV1({ settingsVersion: 2, units: 'tw' });
  assert.equal(v2.units, 'tw');
});

test('css shorthand', () => {
  assert.equal(Core.shorthand([32, 0, 0, 0]), '32px 0 0');
  assert.equal(Core.shorthand([14, 28, 14, 28]), '14px 28px');
  assert.equal(Core.shorthand([8, 8, 8, 8]), '8px');
  assert.equal(Core.shorthand([1, 2, 3, 4]), '1px 2px 3px 4px');
  assert.equal(Core.shorthand([16, 8, 16, 8], 'rem', 16), '1rem 0.5rem');
});

test('tailwind classes', () => {
  assert.equal(Core.tailwindFor(box([32, 0, 0, 0], [14, 28, 14, 28], [1, 1, 1, 1])), 'mt-8 py-3.5 px-7 border');
  assert.equal(Core.tailwindFor(box([0, 0, 0, 0], [13, 13, 13, 13])), 'p-[13px]');
  assert.equal(Core.tailwindFor(box([-16, 0, 0, 0], [0, 0, 0, 0])), '-mt-4');
  assert.equal(Core.tailwindFor(box([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], { row: 24, column: 24 })), 'gap-6');
  assert.equal(Core.tailwindFor(box([0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 2, 0], { row: 8, column: 12 })), 'border-b-2 gap-x-3 gap-y-2');
  assert.equal(Core.tailwindFor(box([8, 4, 16, 4], [0, 0, 0, 0])), 'mt-2 mb-4 mx-1');
});

test('css block', () => {
  assert.equal(
    Core.cssFor(box([32, 0, 0, 0], [14, 28, 14, 28], [1, 1, 1, 1])),
    'margin: 32px 0 0;\npadding: 14px 28px;\nborder-width: 1px;'
  );
  assert.match(Core.cssFor(box([0, 0, 0, 0], [0, 0, 0, 0])), /no margin/);
});

test('labels in each unit', () => {
  assert.equal(Core.formatValue(16, 'px'), '16');
  assert.equal(Core.formatValue(13.333, 'px'), '13.3');
  assert.equal(Core.formatValue(24, 'rem', 16), '1.5rem');
  assert.equal(Core.formatValue(28, 'tw'), '7');
  assert.equal(Core.formatValue(-8, 'tw'), '-2');
});

test('measure: target below and inside the anchor horizontally', () => {
  const p = { left: 340, top: 304, right: 940, bottom: 360 };
  const btn = { left: 462, top: 392, right: 646, bottom: 444 };
  const { lines, guides } = Core.measure(p, btn);
  const values = lines.map((l) => `${l.axis}:${l.value}`).sort();
  assert.deepEqual(values, ['x:122', 'x:294', 'y:32']);
  const vertical = lines.find((l) => l.axis === 'y');
  assert.equal(vertical.x1, 554);
  assert.equal(guides.length, 2, 'dashed guides drop from both edges of the anchor');
});

test('measure: side by side', () => {
  const a = { left: 136, top: 508, right: 456, bottom: 808 };
  const b = { left: 480, top: 508, right: 800, bottom: 808 };
  const { lines, guides } = Core.measure(a, b);
  assert.deepEqual(lines.map((l) => l.value), [24]);
  assert.equal(guides.length, 0);
});

test('measure: nested element shows distance to each edge', () => {
  const outer = { left: 0, top: 0, right: 200, bottom: 100 };
  const inner = { left: 20, top: 10, right: 150, bottom: 70 };
  const values = Core.measure(outer, inner).lines.map((l) => l.value).sort((a, b) => a - b);
  assert.deepEqual(values, [10, 20, 30, 50]);
});

test('audit: classification and suggestions', () => {
  assert.equal(Core.classify(16, 8), 'on');
  assert.equal(Core.classify(12, 8), 'half');
  assert.equal(Core.classify(12, 4), 'on');
  assert.equal(Core.classify(13, 8), 'off');
  assert.equal(Core.classify(1, 8), 'on');
  assert.equal(Core.suggest(13, 8), 12);
  assert.equal(Core.suggest(18, 8), 16);
  assert.equal(Core.suggest(22, 8), 24);
  assert.equal(Core.suggest(30, 8), 32);
  assert.equal(Core.suggest(3, 4), 4);
  assert.equal(Core.suggest(-13, 8), -12);
});

test('audit: base detection', () => {
  assert.equal(Core.detectBase([8, 16, 24, 32, 12, 16, 8]), 8);
  assert.equal(Core.detectBase([4, 12, 20, 28, 8]), 4);
  assert.equal(Core.detectBase([13, 15]), 4);
});

test('audit: score', () => {
  assert.equal(Core.score([], 8).score, 100);
  const s = Core.score([8, 16, 24, 13], 8);
  assert.equal(s.off, 1);
  assert.equal(s.score, 75);
  assert.equal(s.label, 'Good rhythm');
});

test('audit: side grouping', () => {
  assert.deepEqual(Core.sideIssues('padding', [13, 13, 13, 13], 8).map((i) => i.prop), ['padding']);
  assert.deepEqual(Core.sideIssues('padding', [13, 24, 13, 24], 8).map((i) => i.prop), ['padding-y']);
  assert.deepEqual(Core.sideIssues('margin', [0, 0, 22, 0], 8).map((i) => `${i.prop} ${i.from}→${i.to}`), ['margin-bottom 22→24']);
  assert.deepEqual(Core.sideIssues('margin', [0, 340, 0, 340], 8, [false, true, false, true]), []);
  assert.deepEqual(Core.gapIssues({ row: 18, column: 18 }, 8).map((i) => i.prop), ['gap']);
  assert.deepEqual(Core.fixDeclarations({ prop: 'padding-y', to: 12 }), ['padding-top: 12px;', 'padding-bottom: 12px;']);
  assert.equal(Core.shortProp('margin-bottom'), 'margin-b');
});

test('histogram keeps the most used values in order', () => {
  const h = Core.histogram([8, 8, 8, 16, 16, 13, 4], 8);
  assert.deepEqual(h.map((x) => x.value), [4, 8, 13, 16]);
  assert.equal(h.find((x) => x.value === 13).kind, 'off');
});

test('readable text picks contrast', () => {
  assert.equal(Core.readableText('#FFFFFF'), '#0B0D12');
  assert.equal(Core.readableText('#4C8DFF'), '#0B0D12');
  assert.equal(Core.readableText('#1E1B4B'), '#FFFFFF');
});

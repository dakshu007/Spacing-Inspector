// End-to-end check: loads the unpacked extension in Chromium, drives it on a
// local page and saves screenshots. Run: node tests/e2e.js [screenshotDir]
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const EXT = path.resolve(__dirname, '../extension');
const FIXTURES = path.resolve(__dirname, 'fixtures');
const SHOTS = path.resolve(process.argv[2] || path.join(__dirname, '../dist/screenshots'));

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/favicon.ico') return res.writeHead(204).end();
      const file = path.join(FIXTURES, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'pricing.html');
      if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'si-e2e-'));
  const context = await chromium.launchPersistentContext(userDir, {
    headless: true,
    channel: 'chromium',
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`]
  });
  const errors = [];
  try {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const extId = new URL(sw.url()).host;

    const page = await context.newPage();
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    await page.goto(`${base}/pricing.html`);

    // Settings were written on install.
    const stored = await sw.evaluate(() => chrome.storage.sync.get(null));
    assert.equal(stored.settingsVersion, 2, 'defaults written on install');

    const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ active: true }))[0].id);
    const toTab = (msg) => sw.evaluate(([id, m]) => chrome.tabs.sendMessage(id, m), [tabId, msg]);
    await page.waitForFunction(() => true);
    for (let i = 0; i < 20; i++) {
      const ok = await toTab({ type: 'ping' }).catch(() => null);
      if (ok) break;
      await page.waitForTimeout(150);
    }
    const ping = await toTab({ type: 'ping' });
    assert.equal(ping.version, '2.0.0');

    const shadow = (fn, arg) => page.evaluate(([src, a]) => {
      const root = document.getElementById('spacing-inspector-v2')?.shadowRoot;
      return root ? new Function('root', 'arg', src)(root, a) : null;
    }, [fn, arg]);

    // ---- Inspect ----
    await toTab({ type: 'setState', enabled: true, mode: 'inspect' });
    // The badge updates after a message round-trip to the service worker.
    let badge = '';
    for (let i = 0; i < 20 && badge !== 'ON'; i++) {
      badge = await sw.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId);
      if (badge !== 'ON') await page.waitForTimeout(100);
    }
    assert.equal(badge, 'ON', 'badge shows ON');
    const btn = await page.locator('#start').boundingBox();
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(120);
    const sel = await shadow("return root.querySelector('.card-sel').textContent");
    assert.equal(sel, 'a#start');
    const chips = await shadow("return [...root.querySelectorAll('.chip')].map(c => c.textContent)");
    assert.ok(chips.includes('14') && chips.includes('28'), `padding labels shown: ${chips}`);
    assert.ok(chips.some((c) => c.startsWith('gap')) === false, 'button is not a flex container');
    await page.screenshot({ path: path.join(SHOTS, '1-inspect-hover.png') });

    await page.keyboard.press('c');
    await page.waitForTimeout(150);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(clip, 'padding: 14px 28px;\nborder-width: 1px;');

    // Pin, walk to parent, see the gap layer.
    await page.mouse.click(btn.x + btn.width / 2, btn.y + btn.height / 2);
    assert.equal(page.url().includes('#start'), false, 'pinning blocks the link navigation');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(120);
    assert.equal(await shadow("return root.querySelector('.card-sel').textContent"), 'div.actions');
    const gapChip = await shadow("return [...root.querySelectorAll('.chip')].map(c => c.textContent).find(t => t.startsWith('gap'))");
    assert.equal(gapChip, 'gap 12');
    await page.screenshot({ path: path.join(SHOTS, '2-inspect-pinned-parent-gap.png') });

    // Tailwind copy
    await sw.evaluate(() => chrome.storage.sync.set({ units: 'tw' }));
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('c');
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'py-3.5 px-7 border');
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(SHOTS, '3-inspect-tailwind.png') });
    await sw.evaluate(() => chrome.storage.sync.set({ units: 'px' }));

    // ---- Measure ----
    await page.keyboard.press('Escape'); // unpin
    await page.keyboard.press('m');
    const sub = await page.locator('.subtitle').boundingBox();
    await page.mouse.click(sub.x + 20, sub.y + 10);
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(150);
    const tip = await shadow("return root.querySelector('.tip').textContent");
    assert.match(tip, /p\.subtitle → a#start/);
    assert.match(tip, /↕32/, `vertical gap 32 in tip: ${tip}`);
    const cards = page.locator('.plan-card');
    const c1 = await cards.nth(0).boundingBox();
    const c2 = await cards.nth(1).boundingBox();
    await page.mouse.move(btn.x + 10, btn.y + 10);
    await page.screenshot({ path: path.join(SHOTS, '4-measure.png') });
    // pin a card-to-card measurement
    await page.keyboard.press('Escape');
    await page.mouse.click(c1.x + 40, c1.y + 5);
    await page.mouse.click(c2.x + 40, c2.y + 5);
    await page.waitForTimeout(100);
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(100);
    const pinned = await shadow("return root.querySelector('.dock-info').textContent");
    assert.equal(pinned, '1 pinned');

    // Hold Alt while inspecting
    await page.keyboard.press('i');
    await page.mouse.move(sub.x + 20, sub.y + 10);
    await page.waitForTimeout(80);
    await page.keyboard.down('Alt');
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(120);
    const altTip = await shadow("return root.querySelector('.tip').hidden ? '' : root.querySelector('.tip').textContent");
    assert.match(altTip, /↕32/);
    await page.screenshot({ path: path.join(SHOTS, '5-alt-measure.png') });
    await page.keyboard.up('Alt');

    // ---- Audit ----
    await page.keyboard.press('a');
    await page.waitForTimeout(200);
    const rows = await shadow("return [...root.querySelectorAll('.issue .row')].map(r => r.querySelector('.sel').textContent + ' ' + r.querySelector('.chg').textContent)");
    const joined = rows.join('\n');
    for (const expected of ['margin-b 22 → 24', 'padding-y 13 → 12', 'padding 13 → 12', 'gap 18 → 16', 'padding 30 → 32']) {
      assert.ok(joined.includes(expected), `audit finds "${expected}" in:\n${joined}`);
    }
    assert.ok(!/margin-[lr]|margin-x/.test(joined), 'auto-centered margins are not flagged');
    assert.ok(!/plan-cta/.test(joined), `margin-top: auto is not flagged:\n${joined}`);
    const score = await shadow("return root.querySelector('.ring b').textContent");
    assert.ok(Number(score) > 0 && Number(score) < 100, `score ${score}`);
    await page.screenshot({ path: path.join(SHOTS, '6-audit.png') });
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, '7-audit-next.png') });

    const summary = await toTab({ type: 'audit:summary', auditBase: 'auto' });
    assert.equal(summary.base, 8);
    assert.ok(/span\.eyebrow \{\n  margin-bottom: 24px; \/\* was 22px \*\//.test(summary.fixes), summary.fixes);

    // ---- Popup screens ----
    await page.evaluate(() => scrollTo(0, 0)); // the audit may have scrolled to an issue
    await page.keyboard.press('i');
    await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
    await page.waitForTimeout(500); // lets "last inspected" save
    const popup = await context.newPage();
    await popup.setViewportSize({ width: 400, height: 600 });
    popup.on('pageerror', (e) => errors.push(`popup: ${e.message}`));
    popup.on('console', (m) => m.type() === 'error' && errors.push(`popup: ${m.text()}`));
    const popupUrl = (view) => `chrome-extension://${extId}/popup/popup.html?tabId=${tabId}${view ? `&view=${view}` : ''}`;
    for (const view of ['home', 'audit', 'customize', 'shortcuts', 'whatsnew']) {
      await popup.goto(popupUrl(view));
      await popup.waitForTimeout(view === 'audit' ? 600 : 250);
      await popup.screenshot({ path: path.join(SHOTS, `popup-${view}.png`) });
    }
    await popup.goto(popupUrl('home'));
    await popup.waitForTimeout(250);
    assert.equal(await popup.locator('#statusTitle').textContent(), 'Inspector on');
    assert.ok((await popup.locator('#lastLine').textContent()).includes('a#start'));
    await popup.goto(popupUrl('audit'));
    await popup.waitForTimeout(600);
    assert.equal(await popup.locator('#scoreNum').textContent(), score);

    // Light theme + preset change round trip through storage
    await popup.goto(popupUrl('customize'));
    await popup.click('#view-customize [data-value="light"]');
    await popup.locator('.preset').nth(1).click();
    await popup.waitForTimeout(250);
    const after = await sw.evaluate(() => chrome.storage.sync.get(['theme', 'preset', 'colors']));
    assert.equal(after.theme, 'light');
    assert.equal(after.preset, 'devtools');
    await popup.screenshot({ path: path.join(SHOTS, 'popup-customize-light.png') });
    await popup.goto(popupUrl('home'));
    await popup.waitForTimeout(250);
    await popup.screenshot({ path: path.join(SHOTS, 'popup-home-light.png') });
    await page.bringToFront();
    await page.mouse.move(btn.x + btn.width / 2 + 2, btn.y + btn.height / 2);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, '8-inspect-light-devtools.png') });

    // Turning off removes everything
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => !!document.getElementById('spacing-inspector-v2')), false, 'Esc turns it off');
    await page.locator('#start').click();
    assert.ok(page.url().endsWith('#start'), 'clicks reach the page again once off');

    const real = errors.filter((e) => !/favicon/.test(e));
    assert.deepEqual(real, [], `no console errors:\n${real.join('\n')}`);
    console.log(`E2E passed. Screenshots in ${SHOTS}`);
  } finally {
    await context.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Checks the built landing page (site/out): no errors, no framework runtime,
// the motion controls and live demo work, nothing overflows on phones or
// tablets, and the page's own spacing audit scores 100.
// Run: npm run site && node tests/site.e2e.js [screenshotDir]
const path = require('path');
const fs = require('fs');
const http = require('http');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../site/out');
const SHOTS = path.resolve(process.argv[2] || path.join(__dirname, '../dist/site-screenshots'));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.xml': 'application/xml' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end();
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  assert.ok(fs.existsSync(path.join(ROOT, 'index.html')), 'build the site first: npm run site');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/<script[^>]*src="\/_next\/|self\.__next_f/.test(html), 'exported HTML ships no Next.js runtime');
  for (const f of ['llms.txt', 'llms-full.txt', 'robots.txt', 'sitemap.xml', 'og.png']) assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} is exported`);

  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, tag) => {
    page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${tag}: ${m.text()}`));
  };
  try {
    // ---- desktop ----
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/googletagmanager|clarity\.ms/, (r) => r.abort());
    const page = await ctx.newPage();
    watch(page, 'desktop');
    await page.goto(url);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-hero.png') });

    // global motion toggle
    await page.locator('.motion-toggle').click();
    assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'), 'true');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('motion-paused')));
    await page.locator('.motion-toggle').click();

    // walkthrough player: chapters are buttons, and the active one is marked
    const chap = page.locator('.p-chap').nth(1);
    await chap.scrollIntoViewIfNeeded();
    await chap.click();
    assert.equal(await chap.getAttribute('aria-current'), 'step');

    // live demo: press I, hover the lede
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(200);
    await page.keyboard.press('i');
    await page.waitForFunction(() => document.getElementById('spacing-inspector-v2'));
    const lede = await page.locator('.lede').boundingBox();
    await page.mouse.move(lede.x + 40, lede.y + 10);
    await page.waitForTimeout(250);
    const sel = await page.evaluate(() => document.getElementById('spacing-inspector-v2').shadowRoot.querySelector('.card-sel').textContent);
    assert.equal(sel, 'p.lede');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-demo-inspect.png') });

    // the page passes its own Spacing Audit
    const audit = await page.evaluate(() => SpacingDemo.send({ type: 'audit:summary', auditBase: 'auto' }));
    console.log(`Audit: ${audit.score}/100 (${audit.label}), ${audit.scanned} elements, ${audit.base}px grid, ${audit.issues} issues`);
    console.log('Scale:', audit.histogram.map((b) => `${b.value}×${b.count}${b.kind === 'on' ? '' : `(${b.kind})`}`).join(' '));
    if (audit.issues) console.log(audit.fixes);
    assert.equal(audit.score, 100, 'the landing page must score 100 on its own audit');

    await page.locator('#audit [data-demo="audit"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-demo-audit.png') });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // ---- tablet and phone ----
    for (const [name, width, height] of [['tablet', 820, 1180], ['phone', 390, 844]]) {
      const mctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: name === 'phone', deviceScaleFactor: 2 });
      await mctx.route(/googletagmanager|clarity\.ms/, (r) => r.abort());
      const m = await mctx.newPage();
      watch(m, name);
      await m.goto(url);
      await m.waitForTimeout(800);
      const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 0, `no horizontal scroll on ${name} (overflow ${overflow}px)`);
      await m.screenshot({ path: path.join(SHOTS, `${name}-hero.png`) });
      if (name === 'phone') {
        await m.locator('.menu summary').click();
        assert.ok(await m.locator('.menu-panel a').first().isVisible(), 'phone menu opens');
      }
      await mctx.close();
    }

    assert.deepEqual(errors, [], `no page errors:\n${errors.join('\n')}`);
    console.log(`Site checks passed. Screenshots in ${SHOTS}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

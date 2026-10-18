// Checks the landing page: no errors, the live demo works, and the page's own
// spacing audit scores 100. Run: node tests/site.e2e.js [screenshotDir]
const path = require('path');
const fs = require('fs');
const http = require('http');
const assert = require('assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../website');
const SHOTS = path.resolve(process.argv[2] || path.join(__dirname, '../dist/site-screenshots'));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };

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
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const errors = [];
  try {
    // ---- desktop ----
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.route(/googletagmanager|clarity\.ms/, (r) => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
    await page.goto(url);
    await page.waitForTimeout(1500);

    const audit = await page.evaluate(() => SpacingDemo.send({ type: 'audit:summary', auditBase: 'auto' }));
    console.log(`Audit: ${audit.score}/100 (${audit.label}), ${audit.scanned} elements, ${audit.base}px grid, ${audit.issues} issues`);
    if (audit.issues) console.log(audit.fixes);
    console.log('Scale:', audit.histogram.map((b) => `${b.value}×${b.count}${b.kind === 'on' ? '' : `(${b.kind})`}`).join(' '));
    assert.equal(audit.score, 100, 'the landing page must score 100 on its own audit');
    assert.equal(await page.locator('#bigScore').textContent(), '100');

    await page.screenshot({ path: path.join(SHOTS, 'desktop-hero.png') });
    // reveal everything for the full-page shot
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });

    // live demo: press I, hover the headline
    await page.evaluate(() => scrollTo(0, 0));
    await page.keyboard.press('i');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#navToggle').getAttribute('aria-checked'), 'true');
    const lede = await page.locator('.lede').boundingBox();
    await page.mouse.move(lede.x + 40, lede.y + 10);
    await page.waitForTimeout(200);
    const sel = await page.evaluate(() => document.getElementById('spacing-inspector-v2').shadowRoot.querySelector('.card-sel').textContent);
    assert.equal(sel, 'p.lede');
    await page.screenshot({ path: path.join(SHOTS, 'desktop-demo-inspect.png') });

    // nav toggle stays clickable while inspecting
    await page.locator('#navToggle').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#navToggle').getAttribute('aria-checked'), 'false');

    // audit mode via the button in the audit section
    await page.locator('#audit .audit-cta button').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOTS, 'desktop-demo-audit.png') });
    const empty = await page.evaluate(() => document.getElementById('spacing-inspector-v2').shadowRoot.querySelector('.empty')?.textContent);
    assert.match(empty || '', /No off-grid spacing/);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // ---- mobile ----
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await mctx.route(/googletagmanager|clarity\.ms/, (r) => r.abort());
    const m = await mctx.newPage();
    m.on('pageerror', (e) => errors.push(`mobile: ${e.message}`));
    await m.goto(url);
    await m.waitForTimeout(1200);
    const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `no horizontal scroll on phones (overflow ${overflow}px)`);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-hero.png') });
    await m.evaluate(() => document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in')));
    await m.waitForTimeout(900);
    await m.screenshot({ path: path.join(SHOTS, 'mobile-full.png'), fullPage: true });

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

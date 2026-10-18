// Builds the Chrome Web Store images in store/ from the real extension
// screenshots that tests/e2e.js saves to dist/screenshots.
// Run: npm run test:e2e && node scripts/store-assets.js
// Output is 24-bit PNG with no alpha channel, as the store requires.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'dist/screenshots');
const OUT = path.join(ROOT, 'store');
const FONTS = path.join(ROOT, 'site/app/fonts');

const img = (name) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, name)).toString('base64')}`;
const font = (file) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(FONTS, file)).toString('base64')})`;

const LOGO = `<svg viewBox="0 0 128 128" class="logo"><rect width="128" height="128" rx="22" fill="#E3F8FA"/><g fill="#0FC0D6" stroke="#0FC0D6" stroke-linejoin="round" stroke-width="3"><path d="M46 33 57 45.5H35Z"/><path d="M46 95 57 82.5H35Z"/></g><path d="M46 44v40" stroke="#0FC0D6" stroke-width="8"/><g stroke-linecap="round" stroke-width="4.5"><path d="M67 38h29" stroke="#80DDE9"/><path d="M65 64h31" stroke="#0FC0D6"/><path d="M67 90h29" stroke="#90E3EC"/></g></svg>`;

const BASE = `
@font-face { font-family: Lato; font-weight: 400; src: ${font('Lato-400.woff2')}; }
@font-face { font-family: Lato; font-weight: 700; src: ${font('Lato-700.woff2')}; }
@font-face { font-family: Lato; font-weight: 900; src: ${font('Lato-900.woff2')}; }
@font-face { font-family: Script; src: ${font('GrandHotel-400.woff2')}; }
@font-face { font-family: Mono; src: ${font('GeistMono.woff2')}; }
* { box-sizing: border-box; margin: 0; }
body { overflow: hidden; position: relative; background: #050b0d; color: #f1fbfc; font-family: Lato, sans-serif; }
.glow { position: absolute; inset: 0; background:
  radial-gradient(50% 60% at 50% -10%, rgba(15, 192, 214, 0.32), transparent 70%),
  radial-gradient(40% 50% at 100% 100%, rgba(76, 141, 255, 0.14), transparent 70%); }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size: 32px 32px; -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 0%, #000, transparent 80%); }
.s { font-family: Script; font-weight: 400; font-size: 1.16em; letter-spacing: 0; }
.m { color: #7fb0ff; } .p { color: #5ee0ae; } .t { color: #3fd3e5; }
.logo { display: block; }
`;

// 1280 x 800: headline on top, a real screenshot in a browser frame below.
function screenshotPage({ title, sub, shot }) {
  return `<style>${BASE}
  body { width: 1280px; height: 800px; }
  header { position: absolute; top: 48px; left: 0; right: 0; text-align: center; }
  h1 { font-weight: 900; font-size: 48px; letter-spacing: -0.03em; line-height: 1.1; }
  header p { margin-top: 12px; font-size: 21px; color: #a9c4c9; }
  .win { position: absolute; left: 120px; top: 196px; width: 1040px; border-radius: 16px 16px 0 0; overflow: hidden; background: #0b161a;
    box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 40px 100px rgba(0,0,0,.6), 0 0 120px rgba(15,192,214,.18); }
  .bar { height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 16px; background: #0f1d21; border-bottom: 1px solid rgba(255,255,255,.06); }
  .bar i { width: 12px; height: 12px; border-radius: 6px; background: #22343a; }
  .bar span { margin-left: 16px; height: 24px; flex: 1; max-width: 420px; border-radius: 12px; background: #081114; font: 12px Mono; color: #6d8b91; display: flex; align-items: center; padding: 0 12px; }
  .win img { display: block; width: 1040px; }
  </style>
  <div class="glow"></div><div class="grid"></div>
  <header><h1>${title}</h1><p>${sub}</p></header>
  <div class="win"><div class="bar"><i></i><i></i><i></i><span>yourwebsite.com</span></div><img src="${img(shot)}"></div>`;
}

function popupPage() {
  const card = (name, label) => `<figure><img src="${img(name)}"><figcaption>${label}</figcaption></figure>`;
  return `<style>${BASE}
  body { width: 1280px; height: 800px; }
  header { position: absolute; top: 48px; left: 0; right: 0; text-align: center; }
  h1 { font-weight: 900; font-size: 48px; letter-spacing: -0.03em; }
  header p { margin-top: 12px; font-size: 21px; color: #a9c4c9; }
  .row { position: absolute; top: 196px; left: 0; right: 0; display: flex; justify-content: center; gap: 40px; }
  figure { width: 340px; }
  figure img { display: block; width: 340px; border-radius: 16px; box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 32px 80px rgba(0,0,0,.55); }
  figcaption { margin-top: 16px; text-align: center; font-weight: 700; font-size: 18px; color: #cfe4e7; }
  </style>
  <div class="glow"></div><div class="grid"></div>
  <header><h1>Everything <span class="s t">one click</span> away</h1><p>Turn modes on, pick what to show, read the score and change colors from the popup.</p></header>
  <div class="row">${card('popup-home.png', 'Inspect, Measure, Audit')}${card('popup-audit.png', 'Spacing score and fixes')}${card('popup-customize.png', 'Colors and themes')}</div>`;
}

function smallTile() {
  return `<style>${BASE}
  body { width: 440px; height: 280px; }
  .glow { background: radial-gradient(70% 80% at 0% 0%, rgba(15,192,214,.35), transparent 70%), radial-gradient(60% 70% at 100% 100%, rgba(76,141,255,.18), transparent 70%); }
  .brand { position: absolute; left: 32px; top: 32px; display: flex; align-items: center; gap: 12px; font-family: Script; font-size: 30px; }
  .brand .logo { width: 44px; height: 44px; filter: drop-shadow(0 6px 16px rgba(15,192,214,.4)); }
  h1 { position: absolute; left: 32px; top: 104px; width: 230px; font-weight: 900; font-size: 34px; line-height: 1.02; letter-spacing: -0.03em; }
  .viz { position: absolute; right: 28px; top: 96px; width: 136px; height: 120px; }
  .L { position: absolute; border-radius: 10px; }
  .mg { inset: 0; background: rgba(76,141,255,.18); border: 2px dashed #4c8dff; }
  .pd { inset: 18px; background: rgba(52,211,153,.22); border: 2px solid #f2c94c; }
  .ct { inset: 36px 30px; background: #e3f8fa; border-radius: 6px; }
  </style>
  <div class="glow"></div>
  <div class="brand">${LOGO}Spacing Inspector</div>
  <h1>See every <span class="s m">margin</span> &amp; <span class="s p">padding</span></h1>
  <div class="viz"><div class="L mg"></div><div class="L pd"></div><div class="L ct"></div></div>`;
}

function marqueeTile() {
  return `<style>${BASE}
  body { width: 1400px; height: 560px; }
  .glow { background: radial-gradient(45% 80% at 0% 0%, rgba(15,192,214,.34), transparent 70%), radial-gradient(40% 70% at 100% 100%, rgba(76,141,255,.16), transparent 70%); }
  .grid { -webkit-mask-image: radial-gradient(ellipse 60% 80% at 20% 30%, #000, transparent 80%); }
  .copy { position: absolute; left: 80px; top: 72px; width: 600px; }
  .brand { display: flex; align-items: center; gap: 16px; font-family: Script; font-size: 40px; }
  .brand .logo { width: 56px; height: 56px; filter: drop-shadow(0 8px 24px rgba(15,192,214,.4)); }
  h1 { margin-top: 32px; font-weight: 900; font-size: 64px; line-height: 1.02; letter-spacing: -0.03em; }
  .copy p { margin-top: 24px; font-size: 22px; color: #a9c4c9; }
  .chips { margin-top: 32px; display: flex; gap: 12px; }
  .chips span { padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.04); font-size: 17px; color: #d2e5e8; }
  .shot { position: absolute; left: 760px; top: 72px; width: 760px; border-radius: 16px; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 40px 100px rgba(0,0,0,.6), 0 0 120px rgba(15,192,214,.2); }
  .shot img { display: block; width: 760px; }
  </style>
  <div class="glow"></div><div class="grid"></div>
  <div class="copy">
    <div class="brand">${LOGO}Spacing Inspector</div>
    <h1>See every <span class="s m">margin</span> &amp; <span class="s p">padding</span> on any website.</h1>
    <p>Inspect, measure, audit and copy as CSS or Tailwind.</p>
    <div class="chips"><span>Inspect</span><span>Measure</span><span>Spacing Audit</span><span>Tailwind</span></div>
  </div>
  <div class="shot"><img src="${img('1-inspect-hover.png')}"></div>`;
}

const PAGES = [
  ['screenshots/1-inspect-1280x800.png', 1280, 800, screenshotPage({ title: 'See every <span class="s m">margin</span> &amp; <span class="s p">padding</span>', sub: 'Hover any element on any website. Margin, border, padding and gaps, with values on every side.', shot: '1-inspect-hover.png' })],
  ['screenshots/2-measure-1280x800.png', 1280, 800, screenshotPage({ title: 'Measure like in <span class="s t">Figma</span>', sub: 'Hold Alt and hover to see the exact distance between any two elements.', shot: '4-measure.png' })],
  ['screenshots/3-audit-1280x800.png', 1280, 800, screenshotPage({ title: 'Score your <span class="s t">spacing</span>, 0 to 100', sub: 'The Spacing Audit finds every off-grid margin, padding and gap, with a fix for each one.', shot: '6-audit.png' })],
  ['screenshots/4-copy-1280x800.png', 1280, 800, screenshotPage({ title: 'Copy as CSS or <span class="s t">Tailwind</span>', sub: 'Press C to copy any element’s spacing as CSS, rem or Tailwind classes.', shot: '3-inspect-tailwind.png' })],
  ['screenshots/5-popup-1280x800.png', 1280, 800, popupPage()],
  ['promo-small-440x280.png', 440, 280, smallTile()],
  ['promo-marquee-1400x560.png', 1400, 560, marqueeTile()]
];

(async () => {
  fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
  const browser = await chromium.launch();
  for (const [file, width, height, html] of PAGES) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(`<!doctype html><meta charset="utf-8"><body>${html}</body>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(OUT, file), type: 'png' });
    await page.close();
    console.log(`store/${file}`);
  }
  await browser.close();
})();

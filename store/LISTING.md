# Chrome Web Store listing: Spacing Inspector 2.0.0

Images in this folder (all 24-bit PNG, no alpha). Regenerate with
`npm run test:e2e && node scripts/store-assets.js`.

| Field | File |
|---|---|
| Screenshots (1280 x 800) | `screenshots/1-inspect-1280x800.png` … `screenshots/5-popup-1280x800.png` |
| Small promo tile (440 x 280) | `promo-small-440x280.png` |
| Marquee promo tile (1400 x 560) | `promo-marquee-1400x560.png` |
| Store icon (128 x 128) | `../extension/icons/icon128.png` |

---

## Store listing tab

**Name** (comes from `manifest.json`, 75 characters max)

```
Spacing Inspector
```

**Summary / short description** (comes from `manifest.json`, 132 characters max; this is 111)

```
See margin, padding, border and gaps on any page. Measure distances, audit spacing and copy as CSS or Tailwind.
```

**Category:** Developer Tools
**Language:** English

**Description**

```
Spacing Inspector shows the margin, border, padding and gaps of anything you hover, on any website. No DevTools, no clicking through panels: turn it on and see the spacing, with the exact value on every side.

Version 2.0 adds a Figma-style Measure tool, a Spacing Audit that scores a page from 0 to 100, and one-key copy as CSS, rem or Tailwind.

INSPECT THE BOX MODEL
• Hover any element to see margin (blue), border (yellow), padding (green), content and flex or grid gaps (purple stripes)
• Values on all four sides, right on the page
• An info card with size, display type, parent elements, a box-model diagram and the spacing as code
• Click to pin an element; use the arrow keys to move to its parent, first child or siblings
• 4px or 8px grid overlay

MEASURE DISTANCES (NEW)
• Hold Alt, or press M, and hover: see the distance in pixels between any two elements
• Inside another element? See the distance to each edge
• Pin measurements and press Shift+C to copy them as a written spec

SPACING AUDIT (NEW)
• Press A to scan every margin, padding and gap on the page
• Detects whether the page uses a 4px or 8px grid, or pick one
• Get a score from 0 to 100 and a chart of the page's real spacing scale
• Every off-grid value is listed with a suggested fix, such as "padding 13 → 12"
• Copy all fixes as CSS or export a JSON report

COPY AS CODE (NEW)
• Press C on any element to copy its spacing as shorthand CSS, rem values or Tailwind classes (for example mt-8 py-3.5 px-7)

MADE FOR SPEED
• Alt+Shift+S turns it on or off on any page (change it in chrome://extensions/shortcuts)
• I, M and A switch between Inspect, Measure and Audit
• Toolbar on the page so you can switch modes without opening the popup
• Color presets (Classic, DevTools, Neon, High contrast), custom layer colors, dark or light panels

PRIVATE BY DESIGN
• Free, no account, no ads
• Collects no data and sends nothing to any server: everything runs in your browser
• Works on any http or https page, including localhost

Great for designers checking a build against the design, front-end developers fixing layout bugs, and anyone doing design QA.

Website: https://spacinginspector.netlify.app/
```

**Official URL / homepage:** `https://spacinginspector.netlify.app/`

---

## Privacy tab

**Single purpose description**

```
Spacing Inspector helps designers and developers check the spacing of elements on web pages. When the user turns it on, it shows the margin, border, padding and gaps of the element under the cursor, measures the distance between elements, audits the page's spacing against a 4px or 8px grid, and copies an element's spacing as CSS or Tailwind.
```

**activeTab justification**

```
When the user clicks the toolbar icon, the popup or the keyboard shortcut (Alt+Shift+S), activeTab gives temporary access to the current tab so the extension can turn the inspector on there and send it the chosen mode (Inspect, Measure or Audit). It is only used after a user action, on the tab the user is looking at.
```

**storage justification**

```
Stores the user's preferences (layer colors, units, grid overlay, panel theme and similar settings) in chrome.storage.sync, the last inspected element's selector and spacing values in chrome.storage.local so the popup can copy them again, and each tab's on/off state in chrome.storage.session. No data leaves the browser.
```

**scripting justification**

```
Used to inject the extension's own bundled content script (lib/core.js and content/inspector.js) into the active tab when the user turns the inspector on in a tab that was already open before the extension was installed or updated, where the declared content script is not yet running. No remote or dynamically built code is injected.
```

**Host permission justification**

```
The content script is declared for <all_urls> so the inspector works on any website the user wants to check, including localhost and staging sites, and can start instantly from the keyboard shortcut. It stays idle until the user turns it on, and then only reads element sizes, positions and computed CSS spacing locally to draw the overlay. It does not read form data or page text, and sends nothing anywhere. The bundled fonts are web-accessible only so the on-page panel can render them.
```

**Are you using remote code?**

```
No, I am not using remote code.
```

**Remote code justification:** leave empty (only needed when the answer is Yes).

---

## Data usage

**What user data do you plan to collect from users now or in the future?** Leave every box unchecked:

| Data type | Answer |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No |

Why "Website content" is No: the extension reads element sizes and CSS spacing to draw its overlay, but only inside the browser. Nothing is transmitted or collected. The Web Store asks about data you collect, meaning data sent off the user's device. If a reviewer ever disagrees, tick "Website content" and explain: "Element sizes and CSS spacing are read locally to draw the overlay; nothing is stored remotely or transmitted."

**Certifications.** Tick all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL**

```
https://spacinginspector.netlify.app/privacy
```

The page is `site/app/privacy/page.tsx`. Deploy the site before you submit, so the URL is live when the reviewer opens it.

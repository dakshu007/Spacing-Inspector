import type { Metadata } from 'next';
import { STORE_URL } from '../content';
import { Logo } from '../components/logo';

const UPDATED = 'October 18, 2026';

export const metadata: Metadata = {
  title: 'Privacy Policy | Spacing Inspector',
  description: 'Spacing Inspector collects no personal data. It runs entirely in your browser and sends nothing to any server.',
  alternates: { canonical: '/privacy' }
};

export default function Privacy() {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-row">
          <a className="brand" href="/" aria-label="Spacing Inspector home">
            <Logo />
            <span className="brand-word">Spacing Inspector</span>
          </a>
          <div className="nav-end">
            <a className="btn btn-primary md" href={STORE_URL}>
              Add to Chrome
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="wrap legal">
        <p className="eyebrow-text">Last updated {UPDATED}</p>
        <h1>Privacy Policy</h1>
        <p className="legal-lede">
          Spacing Inspector is a Chrome extension that shows the margin, border, padding and gaps of elements on web pages. It does not collect, sell or share any
          personal data. Everything it does happens inside your browser.
        </p>

        <h2>What the extension does not do</h2>
        <ul>
          <li>It does not send any data to the developer or to any third party. It has no servers, no accounts and no analytics or tracking.</li>
          <li>It does not read or store your browsing history, form inputs, passwords, messages or the text of the pages you visit.</li>
          <li>It does not load or run any remote code. All of its code ships inside the extension package.</li>
        </ul>

        <h2>What it stores, and where</h2>
        <p>Spacing Inspector uses Chrome’s storage API to remember a few things. This data stays in your browser:</p>
        <ul>
          <li>
            <strong>Your settings</strong> (layer colors, units, grid overlay, panel theme and similar preferences) are kept in <code>chrome.storage.sync</code>. If
            you have Chrome sync turned on, Chrome syncs them between your own devices through your Google account. The developer cannot see them.
          </li>
          <li>
            <strong>The last element you inspected</strong> (a short label such as <code>button.primary</code> and its spacing values) is kept in{' '}
            <code>chrome.storage.local</code> on your device, so the popup can offer to copy it again. The page’s address is not saved.
          </li>
          <li>
            <strong>Whether the inspector is on in each tab</strong> is kept in <code>chrome.storage.session</code>, which Chrome clears when you close the browser.
          </li>
        </ul>
        <p>Removing the extension deletes all of this data.</p>

        <h2>How it uses page content</h2>
        <p>
          When you turn the inspector on, it reads the size, position and computed CSS spacing of the elements you hover, so it can draw overlays and run the Spacing
          Audit. This happens locally, only on the tab where you turned it on, and none of it leaves your browser. Text is copied to your clipboard only when you
          press a copy button or shortcut.
        </p>

        <h2>Permissions</h2>
        <ul>
          <li>
            <strong>activeTab</strong> and <strong>scripting</strong>: to start the inspector on the current tab when you click the icon or press the shortcut,
            including tabs that were open before the extension was installed.
          </li>
          <li>
            <strong>storage</strong>: to save your settings, as described above.
          </li>
          <li>
            <strong>Access to websites</strong>: the inspector’s script is available on every page so it can start instantly with the keyboard shortcut. It stays idle
            until you turn it on.
          </li>
        </ul>

        <h2>This website</h2>
        <p>
          This website (spacinginspector.netlify.app) is a static page. If we add analytics to it, such as Google Analytics, they only measure visits to this site;
          they are not part of the extension and never see what you do with it.
        </p>

        <h2>Children</h2>
        <p>Spacing Inspector is a developer tool and is not directed at children. It collects no personal data from anyone.</p>

        <h2>Changes</h2>
        <p>If this policy changes, the new version will be posted on this page with a new date. A change that collects data would also require your consent first.</p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Use the <a href={`${STORE_URL}/support`}>Support tab on the Chrome Web Store listing</a>.
        </p>
      </main>

      <footer className="footer">
        <div className="wrap foot">
          <p className="foot-note">A free Chrome extension to inspect margin and padding. © 2026</p>
          <nav className="foot-links" aria-label="Footer">
            <a href="/">Home</a>
            <a href={STORE_URL}>Chrome Web Store</a>
            <a href="/llms.txt">llms.txt</a>
          </nav>
        </div>
      </footer>
    </>
  );
}

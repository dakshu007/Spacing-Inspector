import {
  ArrowRight,
  Check,
  ChevronDown,
  Code,
  Gauge,
  Grid3x3,
  Infinity as InfinityIcon,
  Keyboard,
  Layers,
  Lock,
  Menu,
  MonitorSmartphone,
  MousePointer2,
  Pause,
  Play,
  Plus,
  Ruler,
  ScanSearch,
  Sparkles,
  UserX,
  X
} from 'lucide-react';
import { FAQ, FEATURES, SEO, SITE_URL, STEPS, STORE_URL, USERS } from './content';
import { AuditScene, CopyScene, InspectScene, MeasureScene } from './components/scenes';
import { Player } from './components/player';
import { Logo } from './components/logo';
import { BrandMarquee } from './components/brands';

function StoreButton({ placement, size = 'lg' }: { placement: string; size?: 'md' | 'lg' }) {
  return (
    <a className={`btn btn-primary ${size}`} href={STORE_URL} data-cta={placement}>
      <Plus size={18} aria-hidden="true" />
      Add to Chrome, it’s free
    </a>
  );
}

const NAV = [
  ['#features', 'Features'],
  ['#how-it-works', 'How it works'],
  ['#audit', 'Spacing Audit'],
  ['#faq', 'FAQ']
];


const KEYS = [
  ['I', 'Inspect'],
  ['M', 'Measure'],
  ['A', 'Audit'],
  ['P', 'Pin'],
  ['C', 'Copy'],
  ['G', 'Grid'],
  ['U', 'Units'],
  ['Alt', 'Hold to measure'],
  ['↑ ↓', 'Parent · child'],
  ['Esc', 'Step back']
];

const COMPARE: [string, boolean, boolean][] = [
  ['Hover to see spacing, no clicks', true, false],
  ['Margin, padding, border and gap drawn on the page', true, false],
  ['Values labelled on all four sides', true, false],
  ['Distance between any two elements', true, false],
  ['Spacing score for a whole page', true, false],
  ['Copy spacing as Tailwind classes', true, false],
  ['Edit CSS live', false, true]
];

function jsonLd() {
  const org = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Spacing Inspector', url: SITE_URL, logo: `${SITE_URL}/icon.png` };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, url: SITE_URL, name: 'Spacing Inspector', description: SEO.description, publisher: { '@id': `${SITE_URL}/#org` }, inLanguage: 'en' },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: 'Spacing Inspector',
        applicationCategory: 'DeveloperApplication',
        applicationSubCategory: 'Browser extension',
        operatingSystem: 'Chrome, Microsoft Edge, Brave, Arc',
        softwareVersion: '2.0.0',
        description: SEO.description,
        url: SITE_URL,
        downloadUrl: STORE_URL,
        installUrl: STORE_URL,
        image: `${SITE_URL}/og.png`,
        screenshot: `${SITE_URL}/og.png`,
        featureList: FEATURES,
        keywords: [SEO.focusKeyword, SEO.primaryKeyword, ...SEO.secondaryKeywords].join(', '),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': `${SITE_URL}/#org` }
      },
      {
        '@type': 'HowTo',
        name: 'How to inspect margin and padding on any website',
        totalTime: 'PT1M',
        tool: { '@type': 'HowToTool', name: 'Spacing Inspector Chrome extension' },
        step: STEPS.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.text, url: `${SITE_URL}/#how-it-works` }))
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
      }
    ]
  };
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="aurora" aria-hidden="true" />

      <header className="nav">
        <div className="wrap nav-row">
          <a className="brand" href="#top" aria-label="Spacing Inspector, back to top">
            <Logo />
            <span className="brand-word">Spacing Inspector</span>
          </a>
          <nav className="nav-links" aria-label="Main">
            {NAV.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-end">
            <button type="button" className="icon-btn motion-toggle" aria-pressed="false" aria-label="Pause all animations">
              <Pause className="i-pause" size={18} aria-hidden="true" />
              <Play className="i-play" size={18} aria-hidden="true" />
            </button>
            <a className="btn btn-primary md nav-cta" href={STORE_URL} data-cta="nav">
              Add to Chrome
            </a>
            <details className="menu">
              <summary aria-label="Open menu">
                <Menu className="i-open" size={22} aria-hidden="true" />
                <X className="i-close" size={22} aria-hidden="true" />
              </summary>
              <nav className="menu-panel" aria-label="Mobile">
                {NAV.map(([href, label]) => (
                  <a key={href} href={href}>
                    {label}
                  </a>
                ))}
                <a className="btn btn-primary md" href={STORE_URL} data-cta="menu">
                  Add to Chrome, it’s free
                </a>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <a className="eyebrow" href="#features">
                <span className="eyebrow-tag">
                  <Sparkles size={14} aria-hidden="true" /> New 2.0
                </span>
                <span className="eb-long">Measure, Spacing Audit and Tailwind export</span>
                <span className="eb-short">Measure, Audit &amp; Tailwind</span>
                <ArrowRight size={14} aria-hidden="true" />
              </a>
              <h1 id="hero-title">
                See every <span className="script s-margin">margin</span> &amp; <span className="script s-padding">padding</span> on any website.
              </h1>
              <p className="lede">
                Spacing Inspector is a free Chrome extension that shows the CSS box model of anything you hover. Measure distances like in Figma, score a page’s spacing grid, and copy what you see as CSS or Tailwind.
              </p>
              <div className="cta-row">
                <StoreButton placement="hero" />
                <button type="button" className="btn btn-ghost lg hover-only" data-demo="inspect">
                  <MousePointer2 size={18} aria-hidden="true" />
                  Try it on this page <kbd>I</kbd>
                </button>
                <a className="btn btn-ghost lg touch-only" href="#how-it-works">
                  <Play size={18} aria-hidden="true" />
                  Watch how it works
                </a>
              </div>
              <ul className="proof" aria-label="Highlights">
                <li>
                  <InfinityIcon size={16} aria-hidden="true" /> Free forever
                </li>
                <li>
                  <UserX size={16} aria-hidden="true" /> No account
                </li>
                <li>
                  <Lock size={16} aria-hidden="true" /> Private by design
                </li>
                <li>
                  <MonitorSmartphone size={16} aria-hidden="true" /> {USERS} users
                </li>
              </ul>
            </div>

            <div className="hero-visual" data-hero3d aria-hidden="true">
              <div className="iso">
                <div className="layer l-margin">
                  <span className="lchip c-margin">margin 32</span>
                </div>
                <div className="layer l-border">
                  <span className="lchip c-border">border 1</span>
                </div>
                <div className="layer l-padding">
                  <span className="lchip c-padding">padding 24</span>
                </div>
                <div className="layer l-content">
                  <span className="l-btn">Add to cart</span>
                  <span className="lchip c-content">320 × 48</span>
                </div>
              </div>
              <div className="hero-floor" />
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <section className="marquee" aria-label="Works on every website, whatever it is built with">
          <p className="marquee-label">Works on every site, whatever it’s built with</p>
          <BrandMarquee />
        </section>

        {/* WHAT IS */}
        <section className="section what" aria-labelledby="what-title">
          <div className="wrap what-grid">
            <div>
              <p className="kicker">The short answer</p>
              <h2 id="what-title">
                What is <span className="script">Spacing Inspector?</span>
              </h2>
            </div>
            <div className="what-body">
              <p className="big">
                Spacing Inspector is a free Chrome extension for designers and front-end developers. Hover any element on any website to see its margin, border, padding and gaps with the exact pixel values, then measure, audit and copy that spacing as code.
              </p>
              <dl className="facts">
                <div>
                  <dt>Price</dt>
                  <dd>Free</dd>
                </div>
                <div>
                  <dt>Users</dt>
                  <dd>{USERS}</dd>
                </div>
                <div>
                  <dt>Data collected</dt>
                  <dd>None</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>2.0</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section" id="features" aria-labelledby="features-title">
          <div className="wrap">
            <div className="head">
              <p className="kicker">Features</p>
              <h2 id="features-title">
                Four tools. <span className="script">One extension.</span>
              </h2>
              <p className="sub">Each one plays below like a short film. Hover the frame to look closer, or pause it.</p>
            </div>

            <article className="feature">
              <div className="f-text">
                <span className="f-icon i-blue">
                  <Layers size={20} aria-hidden="true" />
                </span>
                <h3>Inspect the whole box model</h3>
                <p>Margin, border, padding, content and flex or grid gaps are drawn as separate layers, each labelled with its value on every side. An info card shows the element’s size, its parents and the code.</p>
                <ul className="ticks">
                  <li>
                    <Check size={16} aria-hidden="true" /> Arrow keys walk to the parent, child or sibling
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Click to pin, Esc to step back
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> 4px or 8px grid overlay
                  </li>
                </ul>
              </div>
              <InspectScene />
            </article>

            <article className="feature flip">
              <div className="f-text">
                <span className="f-icon i-pink">
                  <Ruler size={20} aria-hidden="true" />
                </span>
                <h3>Measure distances like in Figma</h3>
                <p>Hold Alt and hover, or press M. Pink lines show the exact distance between any two elements, including how far one sits from its container’s edges.</p>
                <ul className="ticks">
                  <li>
                    <Check size={16} aria-hidden="true" /> Click to pin as many measurements as you need
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Shift+C copies them all as a spec
                  </li>
                </ul>
              </div>
              <MeasureScene />
            </article>

            <article className="feature" id="audit">
              <div className="f-text">
                <span className="f-icon i-orange">
                  <Gauge size={20} aria-hidden="true" />
                </span>
                <h3>Audit a page’s spacing in one key</h3>
                <p>Press A. The audit reads every margin, padding and gap, detects the 4px or 8px grid you meant to use, scores the page from 0 to 100 and lists every value that drifted off it, with the fix.</p>
                <ul className="ticks">
                  <li>
                    <Check size={16} aria-hidden="true" /> Copy every fix as CSS, or export a JSON report
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> This page scores 100. Check it yourself.
                  </li>
                </ul>
                <button type="button" className="btn btn-ghost md hover-only" data-demo="audit">
                  <ScanSearch size={18} aria-hidden="true" /> Audit this page live <kbd>A</kbd>
                </button>
              </div>
              <AuditScene />
            </article>

            <article className="feature flip">
              <div className="f-text">
                <span className="f-icon i-green">
                  <Code size={20} aria-hidden="true" />
                </span>
                <h3>Copy what you see as CSS or Tailwind</h3>
                <p>Press C on any element. You get clean shorthand CSS, rem values, or the Tailwind classes that reproduce it, ready to paste into your code.</p>
                <ul className="ticks">
                  <li>
                    <Check size={16} aria-hidden="true" /> Units switch between px, rem and Tailwind
                  </li>
                  <li>
                    <Check size={16} aria-hidden="true" /> Works on any site, including localhost
                  </li>
                </ul>
              </div>
              <CopyScene />
            </article>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section how" id="how-it-works" aria-labelledby="how-title">
          <div className="wrap">
            <div className="head">
              <p className="kicker">How it works</p>
              <h2 id="how-title">
                From install to <span className="script">shipped</span> in a minute.
              </h2>
            </div>
            <Player />
            <ol className="steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="step-n">0{i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* KEYS */}
        <section className="section" id="keys" aria-labelledby="keys-title">
          <div className="wrap keys-grid">
            <div className="keys-text">
              <span className="f-icon i-brand">
                <Keyboard size={20} aria-hidden="true" />
              </span>
              <h2 id="keys-title">
                Built for your <span className="script">keyboard.</span>
              </h2>
              <p className="sub">Every action is one key away, so your hands stay where the work is. Press a key: it lights up.</p>
            </div>
            <ul className="keys" aria-label="Keyboard shortcuts">
              {KEYS.map(([k, label], i) => (
                <li key={k} className={k.length > 2 ? 'key wide' : 'key'} data-key={k === '↑ ↓' ? 'arrow' : k.toLowerCase()} style={{ '--i': i } as React.CSSProperties}>
                  <kbd>{k}</kbd>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* COMPARE */}
        <section className="section" aria-labelledby="compare-title">
          <div className="wrap compare">
            <div className="head">
              <p className="kicker">Compared</p>
              <h2 id="compare-title">Spacing Inspector vs Chrome DevTools</h2>
              <p className="sub">DevTools is a full toolbox. Spacing Inspector does one job, spacing, and does it faster.</p>
            </div>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">Feature comparison between Spacing Inspector and Chrome DevTools</caption>
                <thead>
                  <tr>
                    <th scope="col">Feature</th>
                    <th scope="col">Spacing Inspector</th>
                    <th scope="col">Chrome DevTools</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map(([f, a, b]) => (
                    <tr key={f}>
                      <th scope="row">{f}</th>
                      <td>{a ? <Check className="yes" size={18} aria-label="Yes" /> : <span className="no">No</span>}</td>
                      <td>{b ? <Check className="yes" size={18} aria-label="Yes" /> : <span className="no">No</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" aria-labelledby="faq-title">
          <div className="wrap faq">
            <div className="head left">
              <p className="kicker">FAQ</p>
              <h2 id="faq-title">Questions, answered.</h2>
              <p className="sub">Everything people ask before they add it.</p>
            </div>
            <div className="faq-list">
              {FAQ.map((f, i) => (
                <details key={f.q} className="qa" open={i === 0}>
                  <summary>
                    <h3>{f.q}</h3>
                    <ChevronDown size={20} aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section cta" aria-labelledby="cta-title">
          <div className="wrap">
            <div className="cta-card">
              <Grid3x3 className="cta-grid-icon" size={28} aria-hidden="true" />
              <h2 id="cta-title">
                Stop eyeballing. <span className="script">Start measuring.</span>
              </h2>
              <p>Join {USERS} people who see every margin, padding and gap.</p>
              <StoreButton placement="footer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap foot">
          <a className="brand" href="#top" aria-label="Spacing Inspector, back to top">
            <Logo size={28} />
            <span className="brand-word">Spacing Inspector</span>
          </a>
          <p className="foot-note">A free Chrome extension to inspect margin and padding. © 2026</p>
          <nav className="foot-links" aria-label="Footer">
            <a href={STORE_URL}>Chrome Web Store</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
            <a href="/llms.txt">llms.txt</a>
          </nav>
        </div>
      </footer>

      <div className="toast" role="status" aria-live="polite" />
    </>
  );
}

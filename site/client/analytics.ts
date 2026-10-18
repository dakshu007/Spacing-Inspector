// Google Analytics 4, Google Tag Manager and Microsoft Clarity, with the same
// IDs as the previous site. The queues are set up right away (so events are
// never lost) but the third-party scripts are only fetched on the visitor's
// first interaction, which keeps them out of page load.
const GA_ID = 'G-916SQC2VYS';
const GTM_ID = 'GTM-K977KWP4';
const CLARITY_ID = 'vk0e2c0vmi';

type Queue = { (...args: unknown[]): void; q?: unknown[][] };
declare global {
  interface Window {
    dataLayer: unknown[];
    clarity?: Queue;
  }
}

function addScript(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.append(s);
}

export function setupAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js expects the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const clarity: Queue = (...args: unknown[]) => (clarity.q = clarity.q || []).push(args);
  window.clarity = window.clarity || clarity;

  const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
  const load = () => {
    events.forEach((t) => window.removeEventListener(t, load));
    addScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);
    addScript(`https://www.clarity.ms/tag/${CLARITY_ID}`);
  };
  events.forEach((t) => window.addEventListener(t, load, { once: true, passive: true }));
}

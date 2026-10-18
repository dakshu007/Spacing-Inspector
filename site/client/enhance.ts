// Everything interactive on the page. The HTML is static (React renders it at
// build time) and this small module adds behaviour on top, so the page never
// pays for hydration. three.js, Lenis and the live demo load on demand.

import { setupAnalytics } from './analytics';

type DemoState = { enabled: boolean; mode: string };
type Demo = { send: (msg: object) => DemoState | null; onState: (fn: (s: DemoState) => void) => void };
declare global {
  interface Window {
    SpacingDemo?: Demo;
    gtag?: (...args: unknown[]) => void;
  }
}

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll<T>(sel));
const CHAPTER_MS = 5000;
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

function toast(text: string) {
  const el = document.querySelector<HTMLElement>('.toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  window.clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(window.setTimeout(() => el.classList.remove('show'), 2200));
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.append(s);
  });
}

let demoReady: Promise<Demo | undefined> | null = null;
function loadDemo() {
  if (!demoReady) {
    demoReady = (async () => {
      await loadScript('/demo/shim.js');
      await loadScript('/demo/core.js');
      await loadScript('/demo/inspector.js');
      return window.SpacingDemo;
    })().catch(() => {
      demoReady = null;
      toast('The live demo could not load. Check your connection and try again.');
      return undefined;
    });
  }
  return demoReady;
}

const HINTS: Record<string, string> = {
  inspect: 'Inspect is on. Hover anything, click to pin, Esc to step back.',
  measure: 'Measure is on. Click one element, then hover another.',
  audit: 'Audit is on. This page’s report is on the right.'
};

async function startDemo(mode: string) {
  const demo = await loadDemo();
  if (!demo) return;
  demo.send({ type: 'setState', enabled: true, mode });
  toast(HINTS[mode] || HINTS.inspect);
}

// ---- global motion toggle ----
const motionBtn = document.querySelector<HTMLButtonElement>('.motion-toggle');
const setGlobalPause = (paused: boolean) => {
  root.classList.toggle('motion-paused', paused);
  if (motionBtn) {
    motionBtn.setAttribute('aria-pressed', String(paused));
    motionBtn.setAttribute('aria-label', paused ? 'Play all animations' : 'Pause all animations');
  }
};
if (reduce) setGlobalPause(true);
motionBtn?.addEventListener('click', () => setGlobalPause(!root.classList.contains('motion-paused')));

// ---- scenes: pause off-screen, pause button ----
const scenes = $$('[data-scene]');
scenes.forEach((scene) => {
  const btn = scene.querySelector<HTMLButtonElement>('.scene-toggle');
  btn?.addEventListener('click', () => {
    const paused = !scene.classList.contains('user-paused');
    scene.classList.toggle('user-paused', paused);
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Play this animation' : 'Pause this animation');
  });
});
const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('off', !e.isIntersecting)), { rootMargin: '80px' });
scenes.forEach((s) => io.observe(s));

// ---- walkthrough player ----
const player = document.querySelector<HTMLElement>('[data-player]');
if (player) {
  const chaps = $$('.chap', player);
  const tabs = $$<HTMLButtonElement>('.p-chap', player);
  const toggle = player.querySelector<HTMLButtonElement>('.p-toggle');
  let idx = 0;
  let userPaused = reduce;
  const go = (i: number) => {
    idx = (i + chaps.length) % chaps.length;
    chaps.forEach((c) => c.classList.remove('on'));
    void player.offsetWidth; // restart the chapter's animations
    chaps[idx].classList.add('on');
    tabs.forEach((t, k) => {
      t.classList.toggle('done', k < idx);
      if (k === idx) t.setAttribute('aria-current', 'step');
      else t.removeAttribute('aria-current');
    });
  };
  const setPaused = (p: boolean) => {
    userPaused = p;
    player.classList.toggle('paused', p);
    toggle?.setAttribute('aria-pressed', String(p));
    toggle?.setAttribute('aria-label', p ? 'Play walkthrough' : 'Pause walkthrough');
  };
  setPaused(userPaused);
  tabs.forEach((t, k) => t.addEventListener('click', () => go(k)));
  toggle?.addEventListener('click', () => setPaused(!userPaused));
  player.addEventListener('animationend', (e) => {
    if ((e.target as HTMLElement).matches('.p-chap[aria-current] .p-track i')) go(idx + 1);
  });
  new IntersectionObserver(([e]) => player.classList.toggle('off', !e.isIntersecting), { rootMargin: '40px' }).observe(player);
  player.style.setProperty('--chapter', `${CHAPTER_MS}ms`);
}

// ---- close the mobile menu after picking a link ----
$$('.menu-panel a').forEach((a) => a.addEventListener('click', () => a.closest('details')?.removeAttribute('open')));

// ---- keycaps + live demo keys ----
const keyName = (e: KeyboardEvent) => (e.key === 'Escape' ? 'esc' : e.key.startsWith('Arrow') ? 'arrow' : e.key === 'Alt' ? 'alt' : e.key.length === 1 ? e.key.toLowerCase() : '');
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
window.addEventListener(
  'keydown',
  (e) => {
    const k = keyName(e);
    if (k) document.querySelector(`.key[data-key="${k}"]`)?.classList.add('lit');
    const mode = ({ i: 'inspect', m: 'measure', a: 'audit' } as Record<string, string>)[k];
    if (mode && canHover && !demoReady && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e.target)) {
      e.preventDefault();
      startDemo(mode);
    }
  },
  { capture: true }
);
window.addEventListener('keyup', (e) => {
  const k = keyName(e);
  const cap = k && document.querySelector(`.key[data-key="${k}"]`);
  if (cap) window.setTimeout(() => cap.classList.remove('lit'), 160);
});
$$('[data-demo]').forEach((b) => b.addEventListener('click', () => startDemo(b.dataset.demo || 'inspect')));

// ---- analytics (GA4, Tag Manager, Clarity), plus an event for store clicks ----
setupAnalytics();
$$<HTMLAnchorElement>('a[data-cta]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const params = { placement: a.dataset.cta };
    // New-tab clicks keep this page open, so the event has time to send.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') {
      window.gtag?.('event', 'add_to_chrome', params);
      return;
    }
    // Same-tab: wait for GA to record the click (at most 800ms), then go.
    e.preventDefault();
    let gone = false;
    const go = () => {
      if (gone) return;
      gone = true;
      location.href = a.href;
    };
    window.gtag?.('event', 'add_to_chrome', { ...params, event_callback: go, event_timeout: 800 });
    setTimeout(go, 800);
  })
);

// ---- smooth scrolling (Lenis), after the page has settled ----
// Lenis only smooths wheel scrolling; touch devices keep native momentum.
const startLenis = () => {
  if (reduce || !canHover) return;
  import('lenis').then(({ default: Lenis }) => new Lenis({ autoRaf: true, anchors: { offset: -88 }, lerp: 0.1 }));
};
const idle = (fn: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 1500);
};
if (document.readyState === 'complete') idle(startLenis);
else window.addEventListener('load', () => idle(startLenis), { once: true });

// ---- 3D hero: three.js loads on the first interaction ----
const hero = document.querySelector<HTMLElement>('[data-hero3d]');
const hasWebGL = () => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
};
if (hero && !reduce) {
  const events = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll'] as const;
  const boot = () => {
    events.forEach((t) => window.removeEventListener(t, boot));
    if (hasWebGL()) import('./hero3d').then((m) => m.mountHero3D(hero));
  };
  events.forEach((t) => window.addEventListener(t, boot, { once: true, passive: true }));
}

export {};

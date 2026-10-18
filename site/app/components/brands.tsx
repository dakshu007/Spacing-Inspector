// Framework and platform logos for the marquee (Simple Icons, CC0). Rendered
// at build time, so the icon data never reaches the browser as JS.
import type { CSSProperties } from 'react';
import { siAngular, siAstro, siBootstrap, siFramer, siNextdotjs, siReact, siShopify, siSvelte, siTailwindcss, siVuedotjs, siWebflow, siWordpress } from 'simple-icons';

// Brand colour shown on hover; near-black marks use white on the dark page.
const BRANDS = [
  [siReact, 'React'],
  [siNextdotjs, 'Next.js', '#FFFFFF'],
  [siVuedotjs, 'Vue'],
  [siSvelte, 'Svelte'],
  [siAngular, 'Angular', '#F0365A'],
  [siTailwindcss, 'Tailwind CSS'],
  [siWordpress, 'WordPress', '#3C9FD8'],
  [siShopify, 'Shopify'],
  [siWebflow, 'Webflow', '#4A8DFF'],
  [siFramer, 'Framer', '#FFFFFF'],
  [siAstro, 'Astro'],
  [siBootstrap, 'Bootstrap', '#A47BEA']
] as const;

function BrandList({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="marquee-list" aria-hidden={hidden || undefined}>
      {BRANDS.map(([icon, name, color]) => (
        <li key={name} className="brand-logo" style={{ '--brand': color ?? `#${icon.hex}` } as CSSProperties}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <use href={`#si-${icon.slug}`} />
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}

// Each logo's path is defined once as a symbol and reused by the three copies,
// which keep the strip filled on very wide screens.
export function BrandMarquee() {
  return (
    <div className="marquee-track">
      <svg width="0" height="0" className="sr-only" aria-hidden="true">
        {BRANDS.map(([icon]) => (
          <symbol key={icon.slug} id={`si-${icon.slug}`} viewBox="0 0 24 24">
            <path d={icon.path} fill="currentColor" />
          </symbol>
        ))}
      </svg>
      <BrandList />
      <BrandList hidden />
      <BrandList hidden />
    </div>
  );
}

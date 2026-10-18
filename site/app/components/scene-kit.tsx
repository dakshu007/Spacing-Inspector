import type { CSSProperties, ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';

// Scenes use a 640-unit wide coordinate system that scales with the frame
// (container query units), so they stay crisp at every screen size.
export const u = (n: number) => `calc(var(--u) * ${n})`;

export function box(x: number, y: number, w: number, h: number, extra?: CSSProperties): CSSProperties {
  return { left: u(x), top: u(y), width: u(w), height: u(h), ...extra };
}

export function at(x: number, y: number, extra?: CSSProperties): CSSProperties {
  return { left: u(x), top: u(y), ...extra };
}

export function Cursor({ className }: { className: string }) {
  return (
    <svg className={`cur ${className}`} viewBox="0 0 18 22" aria-hidden="true">
      <path d="M1 1l15 11-6.5 1.2L13 20l-2.6 1.2-3.4-6.8L1 18z" fill="#0A0A10" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function BrowserBar({ url = 'yourwebsite.com' }: { url?: string }) {
  return (
    <div className="bbar" style={box(0, 0, 640, 28)}>
      <span className="bdots">
        <i />
        <i />
        <i />
      </span>
      <span className="burl">{url}</span>
    </div>
  );
}

export function Scene({
  label,
  caption,
  seconds,
  ratio = 'wide',
  children
}: {
  label: string;
  caption: string;
  seconds: number;
  ratio?: 'wide' | 'video';
  children: ReactNode;
}) {
  return (
    <figure className="scene" data-scene style={{ '--d': `${seconds}s` } as CSSProperties}>
      <div className={`screen ${ratio}`} role="img" aria-label={label}>
        <div className="st">{children}</div>
      </div>
      <figcaption className="scene-bar">
        <span className="rec" aria-hidden="true" />
        <span className="scene-cap">{caption}</span>
        <span className="scene-progress" aria-hidden="true">
          <i />
        </span>
        <button type="button" className="icon-btn scene-toggle" aria-pressed="false" aria-label="Pause this animation">
          <Pause className="i-pause" size={16} aria-hidden="true" />
          <Play className="i-play" size={16} aria-hidden="true" />
        </button>
      </figcaption>
    </figure>
  );
}

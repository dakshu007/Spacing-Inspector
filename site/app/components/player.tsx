import type { CSSProperties } from 'react';
import { Check, Pause, Play, Puzzle } from 'lucide-react';
import { STEPS, USERS } from '../content';
import { Cursor, at, box, u } from './scene-kit';

const from = (t: string) => ({ '--from': t }) as CSSProperties;

function Chapter1() {
  return (
    <>
      <div className="vbar" style={box(0, 0, 640, 32)}>
        <span className="bdots">
          <i />
          <i />
          <i />
        </span>
        <span className="burl">Chrome Web Store</span>
      </div>
      <div className="tb-icons" style={box(536, 6, 96, 20)}>
        <Puzzle aria-hidden="true" style={{ width: u(14), height: u(14) }} />
        <span className="tb-logo a cin60" />
        <span className="tb-on a cin72">ON</span>
      </div>
      <div className="vpg" style={box(0, 32, 640, 328)} />
      <div className="store" style={box(160, 84, 320, 208)}>
        <span className="st-logo" />
        <b className="st-name">Spacing Inspector</b>
        <span className="st-meta">Free · {USERS} users · Developer tools</span>
        <span className="st-btn">Add to Chrome</span>
        <span className="st-btn done a cin46">
          <Check aria-hidden="true" style={{ width: u(14), height: u(14) }} /> Added
        </span>
      </div>
      <div className="click a cclick40" style={at(320, 244)} />
      <Cursor className="cur-c1" />
    </>
  );
}

function Chapter2() {
  return (
    <>
      <div className="vbar" style={box(0, 0, 640, 32)}>
        <span className="bdots">
          <i />
          <i />
          <i />
        </span>
        <span className="burl">yourwebsite.com</span>
      </div>
      <div className="vpg" style={box(0, 32, 640, 328)} />
      <div className="sk dark" style={box(60, 64, 300, 24)} />
      <div className="sk" style={box(60, 96, 220, 10)} />
      <div className="pimg" style={box(60, 128, 260, 168)} />
      <div className="pcard" style={box(352, 128, 228, 168)} />
      <div className="pbtn" style={box(376, 236, 180, 40)}>
        Book a demo
      </div>
      <div className="hov h1 a" style={box(60, 64, 300, 42)}>
        <span className="chip cm" style={at(150, -10)}>
          24
        </span>
      </div>
      <div className="hov h2 a" style={box(60, 128, 260, 168)}>
        <span className="chip cp" style={at(130, 84)}>
          padding 0
        </span>
      </div>
      <div className="hov h3 a" style={box(376, 236, 180, 40)}>
        <span className="chip cp" style={at(90, -10)}>
          12 · 32
        </span>
      </div>
      <Cursor className="cur-c2" />
    </>
  );
}

function Chapter3() {
  return (
    <>
      <div className="vbar" style={box(0, 0, 640, 32)}>
        <span className="bdots">
          <i />
          <i />
          <i />
        </span>
        <span className="burl">yourwebsite.com</span>
      </div>
      <div className="vpg dark" style={box(0, 32, 640, 328)} />
      <div className="m-a" style={box(48, 88, 240, 48)} />
      <div className="m-b" style={box(96, 200, 144, 44)} />
      <div className="red a cgrowy" style={box(167, 136, 2, 64, { transformOrigin: 'top' })} />
      <div className="chip cr a cin30" style={at(196, 168)}>
        <span className="count c-32" />
      </div>
      <div className="v-ring" style={box(392, 72, 192, 192)}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="42" className="ring-bg" />
          <circle cx="50" cy="50" r="42" className="ring-fg a ring-c3" pathLength={100} />
        </svg>
        <b className="count c-100" />
        <span>Spacing score</span>
      </div>
      <div className="chip cg a cin80" style={at(488, 296)}>
        Great rhythm
      </div>
    </>
  );
}

function Chapter4() {
  return (
    <>
      <div className="vbar" style={box(0, 0, 640, 32)}>
        <span className="bdots">
          <i />
          <i />
          <i />
        </span>
        <span className="burl">yourwebsite.com</span>
      </div>
      <div className="vpg" style={box(0, 32, 640, 328)} />
      <div className="pbtn" style={box(40, 96, 200, 48)}>
        Start free trial
      </div>
      <div className="ov-b a cin8" style={box(40, 96, 200, 48)} />
      <div className="code-panel v" style={box(272, 72, 328, 88)}>
        <span className="cp-label">Tailwind</span>
        <span className="typed ctype">
          <span className="km">mt-8</span> <span className="kp">py-3.5 px-7</span> <span className="kb">border</span>
        </span>
      </div>
      <div className="toast-s a cin52" style={box(40, 176, 200, 36, from(`translateY(${u(10)})`))}>
        ✓ Copied to clipboard
      </div>
      <div className="editor" style={box(272, 184, 328, 140)}>
        <div className="ed-bar">
          <i />
          <i />
          <i />
          <span>Hero.tsx</span>
        </div>
        <code className="ed-l1">{'<a href="/signup"'}</code>
        <code className="ed-l2 a cin66">
          {'  className="'}
          <span className="km">mt-8</span> <span className="kp">py-3.5 px-7</span>
          {'"'}
        </code>
        <code className="ed-l3">{'>Start free trial</a>'}</code>
      </div>
      <div className="ship a cin82" style={at(136, 264)}>
        Shipped
      </div>
    </>
  );
}

const CHAPTERS = [Chapter1, Chapter2, Chapter3, Chapter4];

export function Player() {
  return (
    <div className="player" data-player>
      <div
        className="screen video"
        role="img"
        aria-label="Animated walkthrough in four chapters: adding Spacing Inspector to Chrome, hovering elements to see their spacing, measuring a distance and reaching a spacing score of 100, and copying Tailwind classes into code."
      >
        <div className="st">
          {CHAPTERS.map((C, i) => (
            <div key={i} className={i === 0 ? 'chap on' : 'chap'} data-chap={i}>
              <C />
            </div>
          ))}
        </div>
      </div>
      <div className="p-controls">
        <button type="button" className="icon-btn p-toggle" aria-pressed="false" aria-label="Pause walkthrough">
          <Pause className="i-pause" size={18} aria-hidden="true" />
          <Play className="i-play" size={18} aria-hidden="true" />
        </button>
        <ol className="p-chapters">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button type="button" className="p-chap" data-go={i} aria-current={i === 0 ? 'step' : undefined}>
                <span className="p-track" aria-hidden="true">
                  <i />
                </span>
                <span className="p-num">0{i + 1}</span>
                <span className="p-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

import type { CSSProperties } from 'react';
import { BrowserBar, Cursor, Scene, at, box, u } from './scene-kit';

const from = (t: string) => ({ '--from': t }) as CSSProperties;
const grow = (axis: 'x' | 'y', origin: string) => ({ '--from': axis === 'x' ? 'scaleX(0)' : 'scaleY(0)', transformOrigin: origin }) as CSSProperties;

function ProductCard({ x, solid }: { x: number; solid: boolean }) {
  return (
    <>
      <div className="pcard" style={box(x, 124, 260, 252)} />
      <div className="pimg" style={box(x + 16, 140, 228, 120)} />
      <div className="sk dark" style={box(x + 16, 274, 132, 12)} />
      <div className="sk" style={box(x + 16, 294, 64, 10)} />
      <div className={solid ? 'pbtn' : 'pbtn ghost'} style={box(x + 16, 316, 228, 40)}>
        Add to cart
      </div>
    </>
  );
}

function MiniPage() {
  return (
    <>
      <BrowserBar url="shop.yourwebsite.com" />
      <div className="pg" style={box(0, 28, 640, 372)} />
      <div className="sk dark" style={box(24, 44, 64, 12)} />
      <div className="sk" style={box(420, 46, 40, 8)} />
      <div className="sk" style={box(476, 46, 40, 8)} />
      <div className="sk" style={box(532, 46, 40, 8)} />
      <div className="sk dark" style={box(24, 80, 236, 18)} />
      <div className="sk" style={box(24, 106, 300, 8)} />
      <ProductCard x={24} solid />
      <ProductCard x={304} solid={false} />
    </>
  );
}

export function InspectScene() {
  return (
    <Scene
      seconds={8}
      caption="Inspect · hover any element"
      label="Animation: the cursor hovers an Add to cart button and Spacing Inspector draws its 16px margin in blue, 12px and 24px padding in green and its border in yellow, then shows an info card with the Tailwind classes mt-4 py-3 px-6."
    >
      <MiniPage />
      <div className="ov-m a in22" style={box(40, 300, 228, 16, grow('y', 'bottom'))} />
      <div className="ov-mline a in22" style={box(40, 300, 228, 56)} />
      <div className="ov-p a in30" style={box(41, 317, 226, 12, grow('x', 'left'))} />
      <div className="ov-p a in30" style={box(41, 343, 226, 12, grow('x', 'right'))} />
      <div className="ov-p a in30" style={box(41, 329, 24, 14)} />
      <div className="ov-p a in30" style={box(243, 329, 24, 14)} />
      <div className="ov-b a in26" style={box(40, 316, 228, 40)} />
      <div className="chip cm a in34" style={at(154, 308)}>16</div>
      <div className="chip cp a in38" style={at(154, 323)}>12</div>
      <div className="chip cp a in38" style={at(53, 336)}>24</div>
      <div className="tag a in38" style={at(40, 362)}>
        <b>button.add</b> 228 × 40
      </div>
      <div className="ui a in44" style={box(400, 52, 220, 236, from(`translateX(${u(16)})`))}>
        <div className="ui-sel">button.add</div>
        <div className="ui-crumb">div.card › div.actions › button</div>
        <div className="ui-bm">
          <span className="ui-t">16</span>
          <div className="ui-pad">
            <span>24</span>
            <i>180 × 16</i>
            <span>24</span>
          </div>
        </div>
        <div className="ui-code">
          <span className="km">mt-4</span> <span className="kp">py-3 px-6</span> <span className="kb">border</span>
        </div>
        <div className="ui-copy">Copy · C</div>
      </div>
      <Cursor className="cur-inspect" />
    </Scene>
  );
}

export function MeasureScene() {
  return (
    <Scene
      seconds={8}
      caption="Measure · hold Alt and hover"
      label="Animation: the cursor clicks a heading, then hovers a button below it. Pink lines show the button sits 60px below the heading and 140px from each of its edges, and a tooltip lists the distances."
    >
      <BrowserBar url="yourwebsite.com/pricing" />
      <div className="pg" style={box(0, 28, 640, 372)} />
      <div className="mhead" style={box(80, 64, 480, 52)}>
        <i style={box(0, 8, 480, 18, { position: 'absolute' })} />
        <i style={box(96, 34, 288, 10, { position: 'absolute' })} />
      </div>
      <div className="pbtn" style={box(220, 176, 200, 44)}>
        Start free trial
      </div>
      <div className="pcard" style={box(80, 268, 220, 96)} />
      <div className="pcard" style={box(340, 268, 220, 96)} />
      <div className="out-a a in16" style={box(80, 64, 480, 52)} />
      <div className="tag violet a in16" style={at(80, 40)}>
        h2.title · 480 × 52
      </div>
      <div className="out-b a in36" style={box(220, 176, 200, 44)} />
      <div className="red a in40" style={box(319, 116, 2, 60, grow('y', 'top'))} />
      <div className="chip cr a in46" style={at(344, 146)}>
        <span className="count c-60" />
      </div>
      <div className="dash a in50" style={box(80, 116, 1, 82)} />
      <div className="dash a in50" style={box(559, 116, 1, 82)} />
      <div className="red a in52" style={box(80, 197, 140, 2, grow('x', 'right'))} />
      <div className="red a in52" style={box(420, 197, 140, 2, grow('x', 'left'))} />
      <div className="chip cr a in58" style={at(150, 214)}>140</div>
      <div className="chip cr a in58" style={at(490, 214)}>140</div>
      <div className="tip a in62" style={box(408, 236, 200, 72)}>
        <div className="tip-p">
          <b className="ta">h2.title</b> → <b className="tb">a.cta</b>
        </div>
        <div className="tip-v">
          <span>↕ 60</span>
          <span>← 140</span>
          <span>→ 140</span>
        </div>
      </div>
      <div className="pin a in74" style={at(320, 340)}>
        Pinned · Shift+C copies
      </div>
      <div className="click a click14" style={at(320, 90)} />
      <div className="click a click36" style={at(320, 198)} />
      <Cursor className="cur-measure" />
    </Scene>
  );
}

const ISSUES = [
  { y: 0, sel: 'nav .links', from: 18, to: 16, prop: 'gap' },
  { y: 1, sel: '.btn', from: 13, to: 12, prop: 'padding-y' },
  { y: 2, sel: '.card', from: 30, to: 32, prop: 'padding' },
  { y: 3, sel: 'h1.title', from: 22, to: 24, prop: 'margin-b' }
];

export function AuditScene() {
  return (
    <Scene
      seconds={10}
      caption="Spacing Audit · press A"
      label="Animation: a scan line sweeps the page and flags four off-grid values: a nav gap of 18px, button padding of 13px, card padding of 30px and a heading margin of 22px. The fixes are applied one by one and the spacing score climbs from 62 to 100."
    >
      <BrowserBar url="yourwebsite.com" />
      <div className="pg" style={box(0, 28, 640, 372)} />
      <div className="sk" style={box(20, 44, 64, 12)} />
      <div className="sk" style={box(250, 46, 140, 8)} />
      <div className="sk dark" style={box(20, 82, 240, 18)} />
      <div className="sk" style={box(20, 112, 300, 8)} />
      <div className="pbtn" style={box(20, 132, 112, 32)}>
        Get started
      </div>
      <div className="pcard" style={box(20, 188, 176, 180)} />
      <div className="pcard" style={box(212, 188, 176, 180)} />
      <div className="beam a beam-run" style={box(0, 28, 400, 40)} />
      <div className="ob a in14" style={box(246, 40, 148, 16)} />
      <div className="ob a in20" style={box(20, 132, 112, 32)} />
      <div className="ob a in26" style={box(20, 188, 176, 180)} />
      <div className="ob a in32" style={box(20, 82, 240, 18)} />
      <div className="chip co a in14" style={at(320, 70)}>18 → 16</div>
      <div className="chip co a in20" style={at(76, 178)}>13 → 12</div>
      <div className="chip co a in26" style={at(108, 278)}>30 → 32</div>
      <div className="chip co a in32" style={at(220, 92)}>22 → 24</div>
      <div className="chip cg a in56" style={at(320, 70)}>✓ 16</div>
      <div className="chip cg a in60" style={at(76, 178)}>✓ 12</div>
      <div className="chip cg a in64" style={at(108, 278)}>✓ 32</div>
      <div className="chip cg a in68" style={at(220, 92)}>✓ 24</div>

      <div className="apanel" style={box(408, 40, 216, 336)}>
        <div className="ap-h">Spacing Audit</div>
        <div className="ap-ring">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="40" className="ring-bg" />
            <circle cx="50" cy="50" r="40" className="ring-fg a ring-audit" pathLength={100} />
          </svg>
          <b className="count c-audit" />
        </div>
        <div className="ap-label">
          <span className="a lbl-a">Needs tuning</span>
          <span className="a lbl-b">Great rhythm</span>
        </div>
        {ISSUES.map((i) => (
          <div key={i.sel} className={`ap-row a in${14 + i.y * 6}`} style={{ top: u(196 + i.y * 32) }}>
            <i className={`a fix${56 + i.y * 4}`} />
            <b>{i.sel}</b>
            <span>
              {i.prop} {i.from}→{i.to}
            </span>
          </div>
        ))}
      </div>
    </Scene>
  );
}

export function CopyScene() {
  return (
    <Scene
      seconds={8}
      caption="Copy · press C"
      label="Animation: a button is selected, its spacing is typed out as the Tailwind classes mt-8 py-3.5 px-7 border, a Copied toast appears, and the classes are pasted into a code editor."
    >
      <BrowserBar url="yourwebsite.com" />
      <div className="pg" style={box(0, 28, 640, 372)} />
      <div className="pcard" style={box(32, 72, 240, 232)} />
      <div className="pimg" style={box(48, 88, 208, 104)} />
      <div className="sk dark" style={box(48, 206, 120, 12)} />
      <div className="pbtn" style={box(48, 244, 208, 44)}>
        Start free trial
      </div>
      <div className="ov-b a in10" style={box(48, 244, 208, 44)} />
      <div className="tag a in10" style={at(48, 296)}>
        <b>a.btn</b> 208 × 44
      </div>
      <div className="code-panel" style={box(304, 72, 304, 96)}>
        <span className="cp-label">Tailwind</span>
        <span className="typed type-run">
          <span className="km">mt-8</span> <span className="kp">py-3.5 px-7</span> <span className="kb">border</span>
        </span>
      </div>
      <div className="toast-s a in56" style={box(392, 184, 160, 36, from(`translateY(${u(10)})`))}>
        ✓ Copied to clipboard
      </div>
      <div className="editor" style={box(304, 236, 304, 132)}>
        <div className="ed-bar">
          <i />
          <i />
          <i />
          <span>Button.tsx</span>
        </div>
        <code className="ed-l1">{'<button'}</code>
        <code className="ed-l2 a in68">
          {'  className="'}
          <span className="km">mt-8</span> <span className="kp">py-3.5 px-7</span> <span className="kb">border</span>
          {'"'}
        </code>
        <code className="ed-l3">{'>'}</code>
      </div>
      <Cursor className="cur-copy" />
    </Scene>
  );
}

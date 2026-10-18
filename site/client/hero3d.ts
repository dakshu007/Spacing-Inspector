// three.js version of the hero's exploded box model. Loaded only after the
// visitor interacts, then cross-fades over the CSS 3D version.
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  WebGLRenderer
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type LayerDef = { w: number; h: number; color: string; opacity: number; label: string; solid?: boolean };

const LAYERS: LayerDef[] = [
  { w: 6.6, h: 4.4, color: '#4C8DFF', opacity: 0.16, label: 'margin 32' },
  { w: 5.4, h: 3.3, color: '#F2C94C', opacity: 0.1, label: 'border 1' },
  { w: 5.1, h: 3.0, color: '#34D399', opacity: 0.2, label: 'padding 24' },
  { w: 3.7, h: 1.6, color: '#E3F8FA', opacity: 0.95, label: '320 × 48', solid: true }
];

function labelTexture(text: string, color: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.beginPath();
  g.roundRect(4, 8, 248, 48, 12);
  g.fill();
  g.fillStyle = '#0A0A10';
  g.font = '600 26px "Geist Mono", ui-monospace, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 33);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function buttonTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 224;
  const g = c.getContext('2d')!;
  g.fillStyle = '#E3F8FA';
  g.fillRect(0, 0, 512, 224);
  g.fillStyle = '#061114';
  g.beginPath();
  g.roundRect(56, 56, 400, 112, 28);
  g.fill();
  g.fillStyle = '#FFFFFF';
  g.font = '700 46px Lato, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('Add to cart', 256, 114);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function mountHero3D(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'hero-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  container.append(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  scene.add(new AmbientLight(0xffffff, 0.9));
  const key = new DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 8);
  scene.add(key);
  const glow = new PointLight(new Color('#0FC0D6'), 30, 30);
  glow.position.set(-4, -3, 4);
  scene.add(glow);

  const group = new Group();
  group.rotation.set(-0.95, 0, -0.62);
  scene.add(group);

  const disposables: { dispose: () => void }[] = [];
  const slabs = LAYERS.map((def, i) => {
    const layer = new Group();
    const geo = new RoundedBoxGeometry(def.w, def.h, def.solid ? 0.12 : 0.05, 4, 0.18);
    const mat = new MeshPhysicalMaterial({
      color: def.color,
      transparent: true,
      opacity: def.opacity,
      roughness: 0.25,
      metalness: 0,
      clearcoat: 1,
      depthWrite: def.solid === true
    });
    if (def.solid) mat.map = buttonTexture();
    const mesh = new Mesh(geo, mat);
    const edges = new LineSegments(new EdgesGeometry(geo, 30), new LineBasicMaterial({ color: def.color, transparent: true, opacity: def.solid ? 0.6 : 0.95 }));
    layer.add(mesh, edges);

    const label = new Sprite(new SpriteMaterial({ map: labelTexture(def.label, def.color === '#E3F8FA' ? '#9BE9F2' : def.color), depthTest: false }));
    label.scale.set(1.6, 0.4, 1);
    label.position.set(-def.w / 2 + 0.9, def.h / 2 + 0.05, 0.1);
    label.renderOrder = 10 + i;
    layer.add(label);

    group.add(layer);
    disposables.push(geo, mat, edges.geometry, edges.material as LineBasicMaterial, label.material);
    return layer;
  });

  const target = { x: 0, y: 0 };
  const onPointer = (e: PointerEvent) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.position.z = width < 520 ? 18 : 15;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let visible = true;
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(tick);
  });
  io.observe(container);

  let raf = 0;
  const start = performance.now();
  function tick(now: number) {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = (now - start) / 1000;
    const paused = document.documentElement.classList.contains('motion-paused');
    const scroll = Math.min(1, window.scrollY / Math.max(1, container.offsetHeight));
    const spread = 0.7 + scroll * 1.1 + (paused ? 0 : Math.sin(t * 0.9) * 0.08);
    slabs.forEach((s, i) => {
      s.position.z = i * spread;
      if (!paused) s.position.y = Math.sin(t * 0.8 + i * 0.6) * 0.04;
    });
    group.rotation.x += (-0.95 + target.y * 0.18 - group.rotation.x) * 0.06;
    group.rotation.z += (-0.62 + target.x * 0.22 - group.rotation.z) * 0.06;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  requestAnimationFrame(() => container.classList.add('webgl'));

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointer);
    ro.disconnect();
    io.disconnect();
    disposables.forEach((d) => d.dispose());
    renderer.dispose();
    canvas.remove();
    container.classList.remove('webgl');
  };
}

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DETAILS, SKILLS, CAT_COLORS, ROLES } from './data.js';

/* ------------------------------------------------------------------ *
 *  Setup
 * ------------------------------------------------------------------ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const isMobile = () => innerWidth <= 820;
const lowPower = matchMedia('(pointer:coarse)').matches || innerWidth < 700;

const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x05060f);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060f, 0.016);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.55, 0.78);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const loadTex = (url) => { const t = texLoader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

const mouse = new THREE.Vector2(0, 0);      // normalised pointer
const mouseS = new THREE.Vector2(0, 0);     // smoothed
const clock = new THREE.Clock();
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const HDR = (hex, k = 2) => new THREE.Color(hex).multiplyScalar(k);

/* ------------------------------------------------------------------ *
 *  Procedural helpers
 * ------------------------------------------------------------------ */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();

function glowSprite(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.set(size, size, 1); return s;
}

function makeLabel(text, { h = 0.7, color = '#fff', font = '600 44px "Space Grotesk", sans-serif', pill = null, glow = null } = {}) {
  const c = document.createElement('canvas'); const x = c.getContext('2d');
  x.font = font; const m = x.measureText(text);
  const fs = parseInt(font.match(/(\d+)px/)[1]);
  const padX = pill ? 34 : 18, padY = pill ? 20 : 12;
  c.width = Math.ceil(m.width + padX * 2); c.height = fs + padY * 2 + 8;
  x.font = font; x.textBaseline = 'middle'; x.textAlign = 'center';
  if (pill) {
    const r = c.height / 2 - 2; x.beginPath();
    x.roundRect(3, 3, c.width - 6, c.height - 6, r);
    x.fillStyle = pill.bg; x.fill(); x.lineWidth = 3; x.strokeStyle = pill.border; x.stroke();
  }
  if (glow) { x.shadowColor = glow; x.shadowBlur = 16; }
  x.fillStyle = color; x.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set((h * c.width) / c.height, h, 1); s.userData.baseScale = s.scale.clone();
  return s;
}

function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function planetTexture(c1, c2, seed) {
  const r = mulberry(seed); const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d'); const A = new THREE.Color(c1), B = new THREE.Color(c2);
  for (let y = 0; y < 256; y += 2) {
    const k = 0.5 + 0.5 * Math.sin(y * 0.07 + seed) * Math.cos(y * 0.021 + seed * 2);
    const col = A.clone().lerp(B, k); x.fillStyle = `#${col.getHexString()}`; x.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 160; i++) {
    x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + r() * 0.1})`;
    x.beginPath(); x.ellipse(r() * 512, r() * 256, 10 + r() * 60, 2 + r() * 10, 0, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

function pageTexture(seed, hiColor) {
  const r = mulberry(seed); const c = document.createElement('canvas'); c.width = 256; c.height = 340;
  const x = c.getContext('2d'); x.fillStyle = '#0d1330'; x.fillRect(0, 0, 256, 340);
  x.strokeStyle = 'rgba(120,140,255,.5)'; x.lineWidth = 3; x.strokeRect(2, 2, 252, 336);
  x.fillStyle = 'rgba(200,210,255,.85)'; x.fillRect(22, 24, 90, 12);
  for (let y = 58; y < 316; y += 20) {
    let px = 22; while (px < 230) {
      const w = 14 + r() * 42; if (px + w > 234) break;
      const hit = r() < 0.2; x.fillStyle = hit ? hiColor : 'rgba(150,165,220,.35)';
      x.fillRect(px, y, w, 8); px += w + 7;
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const VERT_UV = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;

/* ------------------------------------------------------------------ *
 *  Audio (tiny WebAudio synth — no files needed)
 * ------------------------------------------------------------------ */
let actx = null, master = null, soundOn = true;
function startAudio() {
  if (actx) { actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(actx.destination);
    [[55, 0.03], [82.41, 0.02], [110.3, 0.012]].forEach(([f, v]) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = v;
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.07 + Math.random() * 0.1; lg.gain.value = v * 0.6;
      lfo.connect(lg).connect(g.gain); o.connect(g).connect(master); o.start(); lfo.start();
    });
  } catch (e) { actx = null; }
}
function tone(f, d = 0.15, type = 'sine', v = 0.06, f2 = null, delay = 0) {
  if (!actx || !soundOn) return; const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
}
$('#snd').addEventListener('click', () => {
  soundOn = !soundOn; $('#snd').classList.toggle('off', !soundOn);
  if (master) master.gain.value = soundOn ? 1 : 0;
});

/* ------------------------------------------------------------------ *
 *  Universe: stars, nebulae, burst particles
 * ------------------------------------------------------------------ */
const STATIONS = [
  { id: 'hero', name: 'Home', dist: 15, w: 14 },
  { id: 'about', name: 'About', dist: 17, w: 17 },
  { id: 'experience', name: 'Experience', dist: 25, w: 27 },
  { id: 'projects', name: 'Projects', dist: 27, w: 30 },
  { id: 'skills', name: 'Skills', dist: 18, w: 16 },
  { id: 'education', name: 'Education', dist: 23, w: 24 },
  { id: 'contact', name: 'Contact', dist: 15, w: 20 },
];
const stationPos = STATIONS.map((_, i) => new THREE.Vector3(Math.sin(i * 1.3) * 16, Math.cos(i * 1.7) * 6, -i * 62));

(function buildUniverse() {
  const N = lowPower ? 5000 : 11000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), ph = new Float32Array(N);
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#9fd8ff'), new THREE.Color('#c4b5fd'), new THREE.Color('#f9a8d4'), new THREE.Color('#fde68a')];
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rand(-260, 260); pos[i * 3 + 1] = rand(-150, 150); pos[i * 3 + 2] = rand(-520, 140);
    const c = palette[(Math.random() * palette.length) | 0]; col.set([c.r, c.g, c.b], i * 3);
    size[i] = Math.random() < 0.04 ? rand(3, 6) : rand(0.8, 2.4); ph[i] = rand(0, 6.28);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pr: { value: renderer.getPixelRatio() }, lens: { value: 0 }, bh: { value: new THREE.Vector3() }, aspect: { value: 1 } },
    vertexShader: `attribute float size; attribute float phase; attribute vec3 color; uniform float time; uniform float pr; uniform float lens; uniform vec3 bh; uniform float aspect; varying vec3 vC; varying float vA;
      void main(){ vC=color; vA=.55+.45*sin(time*1.4+phase); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*pr*(260./-mv.z); vec4 cp=projectionMatrix*mv;
        if(lens>0.&&cp.w>0.){ vec2 sc=vec2(aspect,1.); vec2 nd=cp.xy/cp.w; vec2 d=(nd-bh.xy)*sc; float b=length(d)+1e-4; float th=.5*(b+sqrt(b*b+4.*bh.z*bh.z)); nd+=normalize(d)/sc*(th-b)*lens; gl_PointSize*=1.+lens*1.4*smoothstep(bh.z*2.5,bh.z,b); cp.xy=nd*cp.w; }
        gl_Position=cp; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(vC*1.4,a*a*vA); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(g, m); stars.frustumCulled = false; scene.add(stars);
  scene.userData.starMat = m;

  // Nebula clouds
  const cols = ['#4c1d95', '#0e7490', '#9d174d', '#1d4ed8', '#6d28d9'];
  const mkNeb = (c, s, o) => glowSprite(c, s, o);
  for (let i = 0; i < 20; i++) {
    const s = mkNeb(cols[i % cols.length], rand(90, 190), rand(0.1, 0.22));
    const side = i % 2 ? 1 : -1;
    s.position.set(side * rand(50, 120) + stationPos[Math.min(6, i % 7)].x * 0.4, rand(-50, 50), rand(-440, 60));
    scene.add(s);
  }
  // ambient lights
  scene.add(new THREE.AmbientLight(0x8fa0ff, 0.55));
})();

// Burst particle pool
const BN = 700; const bPos = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3), bBase = new Float32Array(BN * 3), bVel = new Float32Array(BN * 3), bLife = new Float32Array(BN);
const bGeo = new THREE.BufferGeometry();
bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3)); bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
const bursts = new THREE.Points(bGeo, new THREE.PointsMaterial({ size: 0.45, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
bursts.frustumCulled = false; scene.add(bursts);
let bPtr = 0;
function burst(p, color = '#22d3ee', n = 40, speed = 7) {
  const c = new THREE.Color(color).multiplyScalar(1.6);
  for (let k = 0; k < n; k++) {
    const i = bPtr++ % BN; const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.3 + Math.random()));
    bPos.set([p.x, p.y, p.z], i * 3); bVel.set([v.x, v.y, v.z], i * 3); bBase.set([c.r, c.g, c.b], i * 3); bLife[i] = 1;
  }
}
function updateBursts(dt) {
  for (let i = 0; i < BN; i++) {
    if (bLife[i] <= 0) { bCol[i * 3] = bCol[i * 3 + 1] = bCol[i * 3 + 2] = 0; continue; }
    bLife[i] -= dt * 0.8; const l = Math.max(bLife[i], 0);
    for (let a = 0; a < 3; a++) { bPos[i * 3 + a] += bVel[i * 3 + a] * dt; bVel[i * 3 + a] *= 0.965; bCol[i * 3 + a] = bBase[i * 3 + a] * l; }
  }
  bGeo.attributes.position.needsUpdate = true; bGeo.attributes.color.needsUpdate = true;
}

/* ------------------------------------------------------------------ *
 *  Stations
 *  Each builder gets a group (positioned at the station) and returns
 *  { update(t, dt), pickables: [meshes with userData.pick] }
 * ------------------------------------------------------------------ */
const registry = {};            // id -> pick handlers (for panel list hover)
const pointerWorld = new THREE.Vector3();

function buildHero(g) {
  const pickables = [];
  // Geodesic "AI core": two nested node-link shells joined by synapse spokes; signals pulse through the links.
  const U = { time: { value: 0 }, hover: { value: 0 }, pulse: { value: 0 }, pr: { value: renderer.getPixelRatio() } };
  const shell = (radius, detail, wobble) => {
    const geo = new THREE.IcosahedronGeometry(radius, detail), pa = geo.attributes.position, map = new Map(), pts = [], edges = new Set();
    const idx = []; for (let i = 0; i < pa.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(pa, i), k = v.toArray().map((n) => n.toFixed(3)).join(','); if (!map.has(k)) { v.multiplyScalar(1 + (Math.sin(v.x * 2.1 + v.y * 1.3) * Math.cos(v.z * 2.7 - v.y) * wobble)); map.set(k, pts.length); pts.push(v); } idx.push(map.get(k)); }
    for (let i = 0; i < idx.length; i += 3) for (let e = 0; e < 3; e++) { const x = idx[i + e], y = idx[i + ((e + 1) % 3)]; edges.add(x < y ? x + '_' + y : y + '_' + x); }
    return { pts, edges: [...edges].map((k) => k.split('_').map(Number)) };
  };
  const outer = shell(3.5, 2, 0.1), inner = shell(1.9, 1, 0.12);
  const np = [...outer.pts, ...inner.pts.map((p) => p.clone())], NN = np.length, off = outer.pts.length;
  const lp = [], lcIdx = [];
  outer.edges.forEach(([i, j]) => { lp.push(np[i], np[j]); lcIdx.push(i, j); });
  inner.edges.forEach(([i, j]) => { lp.push(np[off + i], np[off + j]); lcIdx.push(off + i, off + j); });
  for (let i = off; i < NN; i++) { // synapse spokes: each inner node to its 3 nearest outer nodes
    const near = outer.pts.map((p, j) => [p.distanceToSquared(np[i]), j]).sort((x, y) => x[0] - y[0]).slice(0, 3);
    near.forEach(([, j]) => { lp.push(np[i], np[j]); lcIdx.push(i, j); });
  }
  const ncol = new Float32Array(NN * 3), nsize = new Float32Array(NN), nph = new Float32Array(NN);
  const cA = new THREE.Color('#22d3ee'), cB = new THREE.Color('#8b5cf6'), cC = new THREE.Color('#f472b6'), tmpC = new THREE.Color();
  for (let i = 0; i < NN; i++) {
    const k = clamp((np[i].x + 3.5) / 7, 0, 1);
    tmpC.copy(k < 0.5 ? cA.clone().lerp(cB, k * 2) : cB.clone().lerp(cC, (k - 0.5) * 2)); ncol.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    nsize[i] = i < off ? rand(5, 8) : rand(4, 6); nph[i] = rand(0, 6.28);
  }
  const nGeo = new THREE.BufferGeometry(); nGeo.setFromPoints(np);
  nGeo.setAttribute('color', new THREE.BufferAttribute(ncol, 3)); nGeo.setAttribute('size', new THREE.BufferAttribute(nsize, 1)); nGeo.setAttribute('phase', new THREE.BufferAttribute(nph, 1));
  const WAVE = `float wave(vec3 p){ return smoothstep(.6,1.,sin(dot(p,vec3(.85,.3,.25))*1.4-time*2.4)); }
    float ring(vec3 p){ float d=length(p)-(1.-pulse)*8.; return exp(-d*d*1.6)*pulse; }`;
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; attribute float size, phase; uniform float time,pulse,pr,hover; varying vec3 vC; varying float vB; ${WAVE}
      void main(){ float w=wave(position), r=ring(position); vC=color; vB=min(.75+w*.9+r*1.4+hover*.2,1.7);
        vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=size*pr*.15*(1.+w*.6+r*1.0)*(230./-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vB; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.1,d); gl_FragColor=vec4(vC*vB,a); }`,
  });
  const nodes = new THREE.Points(nGeo, mat); nodes.frustumCulled = false;
  const lc = []; lcIdx.forEach((i) => lc.push(ncol[i * 3], ncol[i * 3 + 1], ncol[i * 3 + 2]));
  const lGeo = new THREE.BufferGeometry().setFromPoints(lp); lGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(lc), 3));
  const lineMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 color; uniform float time,pulse,hover; varying vec3 vC; varying float vB; ${WAVE}
      void main(){ vC=color; vB=min(.7+wave(position)*1.1+ring(position)*1.2+hover*.15,1.8); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vC; varying float vB; void main(){ gl_FragColor=vec4(vC*vB,.9); }`,
  });
  const links = new THREE.LineSegments(lGeo, lineMat); links.frustumCulled = false;
  const brain = new THREE.Group(); brain.add(links, nodes); brain.position.set(0, 0.2, 0); brain.scale.setScalar(1.15);
  const coreOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), new THREE.MeshBasicMaterial({ color: HDR(0xa78bfa, 1.6), wireframe: true, transparent: true, opacity: 0.8 })); brain.add(coreOrb);
  const coreGlow = glowSprite(0x7c3aed, 4.5, 0.7); brain.add(coreGlow);
  const holder = new THREE.Group(); holder.add(brain); g.add(holder);
  const portrait = new THREE.Mesh(new THREE.SphereGeometry(4.3, 12, 12), new THREE.MeshBasicMaterial({ visible: false })); holder.add(portrait);
  const core = glowSprite(0x6d28d9, 11, 0.12); holder.add(core);
  let hoverT = 0, pulseT = 0, spinA = 0;
  const bubble = { until: 0 };
  portrait.userData.pick = {
    label: 'Wake the AI core ⚡', cursor: 'pointer',
    onHover: (on) => { hoverT = on ? 1 : 0; },
    onClick: () => {
      pulseT = 1; spinA += Math.PI * 2; burst(g.position, '#22d3ee', 90, 9); burst(g.position, '#f472b6', 60, 6);
      tone(520, 0.2, 'triangle', 0.08, 780); tone(780, 0.25, 'triangle', 0.06, 1170, 0.08);
      toast('Core online! ⚡  Hallo — mein Deutsch ist A1 und wird jede Woche besser.', 3600);
    },
  };
  pickables.push(portrait);

  const ringMats = [0x22d3ee, 0x8b5cf6, 0xf472b6].map((c) => new THREE.MeshBasicMaterial({ color: HDR(c, 1.8), transparent: true, opacity: 0.85 }));
  const rings = [4.7, 5.3, 6.0].map((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014 + i * 0.006, 8, 160), ringMats[i]); m.rotation.set(rand(0.6, 1.2), rand(-0.5, 0.5), 0); g.add(m); return m; });

  // halo of data dust
  const HN = lowPower ? 900 : 2200; const hp = new Float32Array(HN * 3), hc = new Float32Array(HN * 3);
  for (let i = 0; i < HN; i++) {
    const r = rand(5.5, 11), v = new THREE.Vector3().randomDirection().multiplyScalar(r); v.y *= 0.55; hp.set([v.x, v.y, v.z], i * 3);
    const c = new THREE.Color().setHSL(rand(0.5, 0.82), 0.9, 0.62); hc.set([c.r, c.g, c.b], i * 3);
  }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3)); hg.setAttribute('color', new THREE.BufferAttribute(hc, 3));
  const halo = new THREE.Points(hg, new THREE.PointsMaterial({ size: 0.12, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  g.add(halo);

  // orbiting skill chips
  const chipTxt = ['Python', 'SQL', 'NLP', 'LLMs', 'Pandas', 'Prompt Eng.', 'Gemini API', 'scikit-learn', 'Hugging Face'];
  const chips = chipTxt.map((t, i) => {
    const s = makeLabel(t, { h: 0.55, font: '600 38px "JetBrains Mono", monospace', color: '#e9ecff', pill: { bg: 'rgba(12,16,44,.78)', border: i % 2 ? '#f472b6' : '#22d3ee' } });
    s.userData.a = (i / chipTxt.length) * Math.PI * 2; s.userData.r = 7.4 + (i % 3) * 0.9; s.userData.s = 0.18 + (i % 3) * 0.04; g.add(s); return s;
  });

  return {
    pickables,
    update(t, dt) {
      mat.uniforms.time.value = t; mat.uniforms.hover.value = lerp(mat.uniforms.hover.value, hoverT, 0.12);
      pulseT = Math.max(0, pulseT - dt * 1.3); mat.uniforms.pulse.value = pulseT;
      holder.rotation.y = lerp(holder.rotation.y, mouseS.x * 0.5 + Math.sin(t * 0.5) * 0.18 + spinA, 0.07); holder.rotation.x = lerp(holder.rotation.x, -mouseS.y * 0.35, 0.07);
      holder.position.y = Math.sin(t * 0.9) * 0.18; brain.scale.setScalar(1.15 * (1 + Math.sin(t * 1.6) * 0.015 + hoverT * 0.04)); brain.rotation.y += dt * 0.25; coreOrb.rotation.x -= dt * 0.8; coreOrb.rotation.z += dt * 0.5;
      rings.forEach((r, i) => { r.rotation.z += dt * (0.25 + i * 0.12) * (i % 2 ? -1 : 1); r.rotation.x += dt * 0.07; });
      halo.rotation.y += dt * 0.04; halo.rotation.z = Math.sin(t * 0.1) * 0.1;
      chips.forEach((s) => { const u = s.userData, a = u.a + t * u.s; s.position.set(Math.cos(a) * u.r, Math.sin(a) * u.r * 0.5, Math.sin(a) * u.r * 0.3); });
    },
  };
}

function buildAbout(g) {
  const pickables = [];
  const W = 8.4, H = 5.6, frame = new THREE.Group(); g.add(frame);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x0a1030, transparent: true, opacity: 0.8, depthWrite: false }));
  frame.add(back);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W + 0.2, H + 0.2)), new THREE.LineBasicMaterial({ color: HDR(0x22d3ee, 2) })); edge.position.z = 0.01; frame.add(edge);
  const bm = new THREE.MeshBasicMaterial({ color: HDR(0xf472b6, 2.2) });
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), bm), b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), bm);
    a.position.set(sx * (W / 2 + 0.1 - 0.45), sy * (H / 2 + 0.1), 0.03); b.position.set(sx * (W / 2 + 0.1), sy * (H / 2 + 0.1 - 0.45), 0.03); frame.add(a, b);
  });
  const lab = (t, x, y, z, c = '#9aa3c7', h = 0.26) => { const l = makeLabel(t, { h, font: '600 30px "JetBrains Mono", monospace', color: c }); l.position.set(x, y, z); frame.add(l); return l; };
  lab('WEEKLY SALES DASHBOARD', -2.2, H / 2 - 0.35, 0.1, '#e9ecff', 0.3); lab('● live', W / 2 - 0.8, H / 2 - 0.35, 0.1, '#34d399');
  lab('heatmap', -2.1, 1.0, 0.3); lab('trend', 2.0, 1.0, 0.3); lab('revenue by week', -2.0, -0.95, 0.3); lab('growth', 2.0, -0.95, 0.3);

  // heatmap 6x4
  const hm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshBasicMaterial({ toneMapped: false }), 24); hm.position.set(-3.45, 0.2, 0.3); frame.add(hm);
  // bars
  const barGeo = new THREE.BoxGeometry(0.24, 1, 0.12); barGeo.translate(0, 0.5, 0);
  const bars = new THREE.InstancedMesh(barGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), 10); bars.position.set(-3.5, -2.35, 0.35); frame.add(bars);
  // line chart
  const LN = 26, lpos = new Float32Array(LN * 3), lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const line = new THREE.Line(lgeo, new THREE.LineBasicMaterial({ color: HDR(0x22d3ee, 2.4) })); line.position.set(0.55, 0.55, 0.5); frame.add(line);
  const dots = new THREE.Points(lgeo, new THREE.PointsMaterial({ size: 0.14, map: GLOW, color: HDR(0xf472b6, 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); dots.position.copy(line.position); frame.add(dots);
  const axis = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.1, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.5, 0)]), new THREE.LineBasicMaterial({ color: 0x4452c4 })); axis.position.copy(line.position); frame.add(axis);
  // donut
  const donut = new THREE.Group(); donut.position.set(1.4, -1.55, 0.45); frame.add(donut);
  [[0.75, 0x22d3ee, 0], [0.17, 0xf472b6, 0.75 * 6.283], [0.08, 0xfbbf24, 0.92 * 6.283]].forEach(([f, c, rot]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.14, 8, 48, f * 6.283), new THREE.MeshBasicMaterial({ color: HDR(c, 2) })); m.rotation.z = rot; donut.add(m); });
  const pct = makeLabel('75%', { h: 0.4, font: '700 44px "Space Grotesk", sans-serif', color: '#ffffff' }); donut.add(pct);
  lab('training growth', 3.0, -1.55, 0.5, '#9aa3c7', 0.24);

  // floating "50,000+" tag
  const tag = makeLabel('50,000+ records', { h: 0.5, font: '600 36px "JetBrains Mono", monospace', color: '#e9ecff', pill: { bg: 'rgba(12,16,44,.85)', border: '#22d3ee' } }); tag.position.set(0, H / 2 + 0.7, 1.4); frame.add(tag);

  let spinV = 0, yaw = 0;
  back.userData.pick = { label: 'Click the dashboard ↻', cursor: 'pointer', onHover() { }, onClick() { spinV = 1; tone(300, 0.5, 'sine', 0.06, 900); burst(g.position, '#f472b6', 50, 6); } };
  pickables.push(back);

  // data galaxy: 1 cube ≈ 30 records of the "50,000+" dataset
  const N = lowPower ? 900 : 2200;
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = 6.4 + Math.pow(Math.random(), 0.7) * 9, arm = (i % 3) * ((Math.PI * 2) / 3), a = r * 0.5 + arm + rand(-0.35, 0.35);
    const p = new THREE.Vector3(Math.cos(a) * r, rand(-0.35, 0.35) * (r / 8), Math.sin(a) * r);
    e.set(rand(0, 3), rand(0, 3), 0); q.setFromEuler(e); const s2 = rand(0.5, 1.6); sc.set(s2, s2, s2);
    m4.compose(p, q, sc); inst.setMatrixAt(i, m4);
    c.setHSL(lerp(0.52, 0.8, (r - 6.4) / 9), 0.9, 0.62).multiplyScalar(1.5); inst.setColorAt(i, c);
  }
  const galaxy = new THREE.Group(); galaxy.add(inst); galaxy.rotation.set(1.15, 0, 0.25); galaxy.position.z = -2.5; g.add(galaxy);
  const core = glowSprite(0x6d28d9, 16, 0.45); core.position.z = -3; g.add(core);
  const c1 = new THREE.Color('#22d3ee'), c2 = new THREE.Color('#f472b6'), cc = new THREE.Color();
  return {
    pickables,
    update(t, dt) {
      galaxy.rotation.y += dt * 0.12;
      for (let i = 0; i < 24; i++) { m4.makeTranslation((i % 6) * 0.5, -Math.floor(i / 6) * 0.36, 0); hm.setMatrixAt(i, m4); const v = 0.5 + 0.5 * Math.sin(i * 0.9 + t * 1.4) * Math.cos(i * 0.4 - t); hm.setColorAt(i, cc.copy(c1).lerp(c2, v).multiplyScalar(0.5 + v * 1.4)); }
      hm.instanceMatrix.needsUpdate = true; hm.instanceColor.needsUpdate = true;
      for (let i = 0; i < 10; i++) { const h = 0.35 + 1.9 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.7)) * (0.5 + 0.5 * i / 9); m4.makeScale(1, h, 1).setPosition(i * 0.32, 0, 0); bars.setMatrixAt(i, m4); bars.setColorAt(i, cc.copy(c1).lerp(c2, i / 9).multiplyScalar(1.7)); }
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
      for (let i = 0; i < LN; i++) { lpos[i * 3] = (i / (LN - 1)) * 3.1; lpos[i * 3 + 1] = 0.25 + (i / LN) * 0.5 + 0.35 * Math.sin(i * 0.7 + t * 1.2) + 0.15 * Math.sin(i * 1.9 - t * 2); lpos[i * 3 + 2] = 0; }
      lgeo.attributes.position.needsUpdate = true; donut.rotation.z = -t * 0.35;
      if (spinV > 0) spinV = Math.max(0, spinV - dt * 0.55);
      yaw = lerp(yaw, mouseS.x * 0.4, 0.06); frame.rotation.y = yaw + (spinV > 0 ? ease(1 - spinV) * Math.PI * 2 : 0);
      frame.rotation.x = lerp(frame.rotation.x, -mouseS.y * 0.25, 0.06); frame.position.y = Math.sin(t * 0.8) * 0.2;
    },
  };
}

function buildExperience(g) {
  const pickables = [];
  const sys = new THREE.Group(); sys.rotation.set(0.85, 0, -0.18); g.add(sys);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.3, 48, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.4), toneMapped: false }));
  sys.add(sun); const sg = glowSprite(0xffa040, 8, 0.55); sun.add(sg);
  const light = new THREE.PointLight(0xffe0b0, 260, 0, 2); sys.add(light);

  const defs = [
    { id: 'berojgaar', r: 4.4, s: 0.9, c: ['#fb7185', '#f59e0b'], atm: 0xff7a59, name: 'Be Rojgaar', sub: 'Co-Founder · 2021–23', seed: 3, sp: 0.24 },
    { id: 'broadway', r: 7.4, s: 1.3, c: ['#38bdf8', '#6366f1'], atm: 0x5ab4ff, name: 'Broadway Infosys', sub: 'Trainer · 2023–26', seed: 8, sp: 0.16 },
    { id: 'orson', r: 10.4, s: 1.1, c: ['#34d399', '#8b5cf6'], atm: 0x4ade80, name: 'Orson Infotech', sub: 'Data Analyst · 2025', seed: 15, sp: 0.115 },
  ];
  const planets = defs.map((d, i) => {
    const ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos((k / 128) * 6.2832) * d.r, 0, Math.sin((k / 128) * 6.2832) * d.r))), new THREE.LineBasicMaterial({ color: 0x6674ff, transparent: true, opacity: 0.25 }));
    sys.add(ring);
    const holder = new THREE.Group(); sys.add(holder);
    const body = new THREE.Mesh(new THREE.SphereGeometry(d.s, 48, 48), new THREE.MeshStandardMaterial({ map: planetTexture(d.c[0], d.c[1], d.seed), roughness: 0.75, metalness: 0.05 }));
    holder.add(body);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(d.s * 1.22, 32, 32), new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(d.atm) } }, transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 vN,vV; void main(){ vN=normalMatrix*normal; vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 color; varying vec3 vN,vV; void main(){ float f=pow(abs(dot(normalize(vN),normalize(vV))),1.6); gl_FragColor=vec4(color*2.,f*.95); }`,
    }));
    holder.add(atm);
    const l1 = makeLabel(d.name, { h: 0.62, font: '700 40px "Space Grotesk", sans-serif', color: '#ffffff', glow: '#000' });
    const l2 = makeLabel(d.sub, { h: 0.4, font: '500 28px "JetBrains Mono", monospace', color: '#9fd8ff' });
    l1.position.set(0, d.s + 1.1, 0); l2.position.set(0, d.s + 0.55, 0); l1.material.depthTest = false; l2.material.depthTest = false; l1.renderOrder = l2.renderOrder = 6; holder.add(l1, l2);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(d.s * 1.5, 12, 12), new THREE.MeshBasicMaterial({ visible: false })); holder.add(hit);
    const st = { d, holder, body, a: i * 2.1 + 0.5, hover: 0, tgt: 0 };
    const pick = { label: `${d.name} — click to land`, cursor: 'pointer', onHover: (on) => { st.tgt = on ? 1 : 0; }, onClick: () => { burst(g.position.clone().add(holder.getWorldPosition(new THREE.Vector3()).sub(g.position)), '#' + new THREE.Color(d.atm).getHexString(), 60, 5); tone(260, 0.3, 'sine', 0.07, 520); openDrawer(d.id); } };
    hit.userData.pick = pick; registry[d.id] = pick; pickables.push(hit); return st;
  });
  const stars = glowSprite(0xff9a3c, 30, 0.12); stars.position.z = -4; g.add(stars);
  return {
    pickables,
    update(t, dt) {
      sun.scale.setScalar(1 + Math.sin(t * 2) * 0.02);
      planets.forEach((p) => {
        p.hover = lerp(p.hover, p.tgt, 0.12); p.a += dt * p.d.sp * (1 - p.hover * 0.92);
        p.holder.position.set(Math.cos(p.a) * p.d.r, 0, Math.sin(p.a) * p.d.r); p.body.rotation.y += dt * 0.35;
        p.holder.scale.setScalar(1 + p.hover * 0.25);
      });
      sys.rotation.z = -0.18 + mouseS.x * 0.08; sys.rotation.x = 0.85 - mouseS.y * 0.1;
    },
  };
}

function buildProjects(g) {
  const pickables = []; const items = [];
  const mkPedestal = (grp) => {
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: HDR(0x22d3ee, 1.8) }));
    r1.rotation.x = Math.PI / 2; r1.position.y = -3.4; grp.add(r1);
    const r2 = r1.clone(); r2.scale.setScalar(0.7); r2.material = new THREE.MeshBasicMaterial({ color: HDR(0x8b5cf6, 1.8) }); grp.add(r2);
    return [r1, r2];
  };
  const mkItem = (id, x, label, sub, builder) => {
    const grp = new THREE.Group(); grp.position.x = x; g.add(grp);
    const inner = new THREE.Group(); grp.add(inner);
    const upd = builder(inner);
    const rings = mkPedestal(grp);
    const l1 = makeLabel(label, { h: 0.62, font: '700 40px "Space Grotesk", sans-serif' }); l1.position.y = -4.4; grp.add(l1);
    const l2 = makeLabel(sub, { h: 0.38, font: '500 28px "JetBrains Mono", monospace', color: '#9fd8ff' }); l2.position.y = -5.05; grp.add(l2);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), new THREE.MeshBasicMaterial({ visible: false })); grp.add(hit);
    const st = { grp, inner, rings, upd, hover: 0, tgt: 0 };
    const pick = { label: label + ' — open case file', cursor: 'pointer', onHover: (on) => { st.tgt = on ? 1 : 0; if (on) tone(440, 0.12, 'sine', 0.03, 660); }, onClick: () => { burst(grp.getWorldPosition(new THREE.Vector3()), '#22d3ee', 60, 6); tone(330, 0.25, 'triangle', 0.07, 660); openDrawer(id); } };
    hit.userData.pick = pick; registry[id] = pick; pickables.push(hit); items.push(st);
  };

  // A — resume vs job description
  mkItem('resume', -9.5, 'Resume Keyword Gap Checker', 'Flask · Gemini API', (grp) => {
    const mk = (x, seed, hi, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 3.3), new THREE.MeshBasicMaterial({ map: pageTexture(seed, hi), side: THREE.DoubleSide, toneMapped: false })); p.position.set(x, 0.3, 0); p.rotation.y = ry; grp.add(p); return p; };
    const a = mk(-1.7, 4, '#34d399', 0.4), b = mk(1.7, 9, '#34d399', -0.4);
    const pts = []; for (let i = 0; i < 7; i++) { const y = -0.9 + i * 0.45; pts.push(new THREE.Vector3(-0.65, y + 0.3, 0.1), new THREE.Vector3(0.65, y + 0.3 + rand(-0.4, 0.4), 0.1)); }
    const beams = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: HDR(0x34d399, 1.8), transparent: true, opacity: 0.7 })); grp.add(beams);
    const gap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: HDR(0xfb7185, 2.2) })); gap.position.set(1.9, -0.6, 0.1); grp.add(gap);
    const bgA = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: 0x1a2250 })); bgA.position.y = -2.35; grp.add(bgA);
    const gauge = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 8, 64, Math.PI * 1.45), new THREE.MeshBasicMaterial({ color: HDR(0x34d399, 2) })); gauge.position.y = -2.35; gauge.rotation.z = Math.PI * 0.5; grp.add(gauge);
    const v = makeLabel('FIT', { h: 0.32, font: '700 30px "JetBrains Mono", monospace', color: '#34d399' }); v.position.y = -2.35; grp.add(v);
    return (t, k) => { a.position.y = 0.3 + Math.sin(t * 1.1) * 0.12; b.position.y = 0.3 + Math.sin(t * 1.1 + 1) * 0.12; beams.material.opacity = 0.35 + 0.35 * Math.sin(t * 3 + k); gap.visible = Math.sin(t * 5) > -0.3; gauge.rotation.z = Math.PI * 0.5 - t * 0.2 * k; grp.rotation.y = Math.sin(t * 0.5) * 0.25; };
  });

  // B — neural net with the 27% worry
  mkItem('intent', 0, 'Intent Classification', 'DistilBERT · NLP', (grp) => {
    const layers = [4, 6, 6, 3]; const nodes = [], lp = [], nm = new THREE.MeshBasicMaterial({ color: HDR(0x22d3ee, 1.8) });
    layers.forEach((n, li) => { nodes[li] = []; for (let i = 0; i < n; i++) { const p = new THREE.Vector3(-3.3 + li * 2.2, (i - (n - 1) / 2) * 0.95, 0); const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 16), nm); s.position.copy(p); grp.add(s); nodes[li].push(s); } });
    for (let li = 0; li < 3; li++) nodes[li].forEach((a) => nodes[li + 1].forEach((b) => lp.push(a.position.clone(), b.position.clone())));
    const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.2 })); grp.add(lines);
    const bad = nodes[3][1]; bad.material = new THREE.MeshBasicMaterial({ color: HDR(0xfb7185, 2.4) }); bad.scale.setScalar(1.8);
    const badGlow = glowSprite(0xfb7185, 2.4, 0.9); bad.add(badGlow); badGlow.scale.setScalar(2.5);
    const lab = makeLabel('27% wrong — at high confidence', { h: 0.36, font: '600 30px "JetBrains Mono", monospace', color: '#fb7185' }); lab.position.set(2.2, 2.2, 0); grp.add(lab);
    const PN = 40, pp = new Float32Array(PN * 3), pe = Array.from({ length: PN }, () => ({ e: (Math.random() * lp.length / 2) | 0, t: Math.random() }));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pulses = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.28, map: GLOW, color: HDR(0xffffff, 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pulses.frustumCulled = false; grp.add(pulses);
    return (t, k) => {
      pe.forEach((p, i) => { p.t += 0.016 * (0.6 + k); if (p.t > 1) { p.t = 0; p.e = (Math.random() * lp.length / 2) | 0; } const a = lp[p.e * 2], b = lp[p.e * 2 + 1]; pp[i * 3] = lerp(a.x, b.x, p.t); pp[i * 3 + 1] = lerp(a.y, b.y, p.t); pp[i * 3 + 2] = 0; });
      pg.attributes.position.needsUpdate = true; bad.scale.setScalar(1.8 + Math.sin(t * 4) * 0.35); grp.rotation.y = Math.sin(t * 0.6) * 0.4; grp.rotation.x = Math.sin(t * 0.4) * 0.1;
    };
  });

  // C — 3D bar chart of the used-car market
  mkItem('cars', 9.5, 'Used Car Market EDA', 'Pandas · Matplotlib', (grp) => {
    const G = 8, N = G * G; const geo = new THREE.BoxGeometry(0.42, 1, 0.42); geo.translate(0, 0.5, 0);
    const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }), N); grp.add(inst);
    const grid = new THREE.GridHelper(G * 0.55, G, 0x6674ff, 0x2a3270); grid.material.transparent = true; grid.material.opacity = 0.5; grid.position.y = -0.02; grp.add(grid);
    const m4 = new THREE.Matrix4(), c = new THREE.Color(), A = new THREE.Color('#fbbf24'), B = new THREE.Color('#f472b6'), C = new THREE.Color('#8b5cf6');
    const hold = new THREE.Group(); grp.add(hold); grp.remove(inst); grp.remove(grid); hold.add(inst, grid); hold.position.y = -1.4; hold.rotation.x = 0.35;
    return (t, k) => {
      for (let i = 0; i < N; i++) {
        const x = (i % G) - (G - 1) / 2, z = Math.floor(i / G) - (G - 1) / 2;
        const h = 0.3 + 2.6 * (0.5 + 0.5 * Math.sin(x * 0.7 + t * (0.9 + k * 0.8))) * (0.5 + 0.5 * Math.cos(z * 0.6 - t * 0.7));
        m4.makeScale(1, h, 1).setPosition(x * 0.55, 0, z * 0.55); inst.setMatrixAt(i, m4);
        const f = h / 2.9; c.copy(f < 0.5 ? A.clone().lerp(B, f * 2) : B.clone().lerp(C, (f - 0.5) * 2)).multiplyScalar(1.7); inst.setColorAt(i, c);
      }
      inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true; hold.rotation.y = t * 0.25;
    };
  });

  return {
    pickables,
    update(t, dt) {
      items.forEach((it, i) => {
        it.hover = lerp(it.hover, it.tgt, 0.1); it.grp.scale.setScalar(1 + it.hover * 0.12);
        it.upd(t + i * 2, it.hover); it.grp.position.y = Math.sin(t * 0.8 + i) * 0.25;
        it.rings[0].rotation.z += dt * (0.4 + it.hover * 2); it.rings[1].rotation.z -= dt * 0.6;
      });
    },
  };
}

function buildSkills(g) {
  const pickables = []; const cloud = new THREE.Group(); g.add(cloud);
  const R = 6.3, n = SKILLS.length; const nodes = [];
  SKILLS.forEach(([label, cat], i) => {
    const y = 1 - (i / (n - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.399963;
    const pos = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(R);
    const s = makeLabel(label, { h: 0.62, font: '700 40px "Space Grotesk", sans-serif', color: CAT_COLORS[cat], glow: CAT_COLORS[cat] });
    s.position.copy(pos); s.userData = { ...s.userData, cat, hover: 0, tgt: 0, pos };
    s.userData.pick = { label: `${label} · ${['Languages & Data', 'Analytics', 'AI & ML', 'Tools & Practices'][cat]}`, cursor: 'default', onHover: (on) => { s.userData.tgt = on ? 1 : 0; if (on) tone(600 + cat * 120, 0.08, 'sine', 0.025); }, onClick() { burst(s.getWorldPosition(new THREE.Vector3()), CAT_COLORS[cat], 24, 4); } };
    cloud.add(s); nodes.push(s); pickables.push(s);
  });
  // constellation lines inside each category
  const lm = CAT_COLORS.map((c) => new THREE.LineBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0.28 }));
  const catLines = CAT_COLORS.map((_, ci) => {
    const same = nodes.filter((s) => s.userData.cat === ci), pts = [];
    same.forEach((a, i) => { pts.push(a.position, same[(i + 1) % same.length].position); if (same.length > 4) pts.push(a.position, same[(i + 2) % same.length].position); });
    const l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lm[ci]); cloud.add(l); return l;
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 2), new THREE.MeshBasicMaterial({ color: HDR(0x6d83ff, 1.5), wireframe: true, transparent: true, opacity: 0.55 })); cloud.add(core);
  const cg = glowSprite(0x6d28d9, 9, 0.55); cloud.add(cg);
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.02, 3), new THREE.MeshBasicMaterial({ color: 0x3340a0, wireframe: true, transparent: true, opacity: 0.07 })); cloud.add(shell);
  state.skillCloud = { cloud, vx: 0.003, vy: 0 };
  const wp = new THREE.Vector3(), cp = new THREE.Vector3();
  return {
    pickables,
    update(t, dt) {
      const sc = state.skillCloud; cloud.rotation.y += sc.vx; cloud.rotation.x = clamp(cloud.rotation.x + sc.vy, -1.1, 1.1);
      sc.vx = lerp(sc.vx, 0.0035, 0.03); sc.vy = lerp(sc.vy, 0, 0.06); core.rotation.y -= dt * 0.3;
      g.getWorldPosition(cp);
      nodes.forEach((s) => {
        const u = s.userData; u.hover = lerp(u.hover, u.tgt, 0.15); s.getWorldPosition(wp);
        const front = clamp((wp.z - cp.z) / R * 0.5 + 0.5, 0, 1);
        const hl = state.hlCat === null || state.hlCat === u.cat;
        s.material.opacity = lerp(0.25, 1, front) * (hl ? 1 : 0.12);
        s.scale.copy(u.baseScale).multiplyScalar(1 + u.hover * 0.45 + (state.hlCat === u.cat ? 0.15 : 0));
      });
      catLines.forEach((l, i) => { l.material.opacity = state.hlCat === null ? 0.22 : state.hlCat === i ? 0.7 : 0.04; });
    },
  };
}

function buildEducation(g) {
  const pickables = [];
  const l1 = new THREE.PointLight(0x7aa8ff, 280, 0, 2); l1.position.set(0, 8, 9); g.add(l1);
  const l2 = new THREE.PointLight(0xff5ec8, 160, 0, 2); l2.position.set(-9, 0, 7); g.add(l2);
  const floorY = -4;
  const grid = new THREE.GridHelper(60, 60, 0x4452c4, 0x1c2260); grid.position.y = floorY; grid.material.transparent = true; grid.material.opacity = 0.45; g.add(grid);
  const winTex = (seed) => { const r = mulberry(seed), c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128); for (let y = 6; y < 124; y += 10) for (let px = 6; px < 58; px += 12) { if (r() > 0.35) { x.fillStyle = r() > 0.8 ? '#f472b6' : '#7dd3fc'; x.globalAlpha = 0.5 + r() * 0.5; x.fillRect(px, y, 7, 5); } } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const defs = [
    { id: 'bsc', x: -6.5, h: 3.2, label: 'BSc Multimedia', sub: '2010 – 2013', seed: 2 },
    { id: 'msc', x: 0, h: 5.4, label: 'MSc IT & Applied Security', sub: '2020 – 2022', seed: 5 },
    { id: 'gisma', x: 6.5, h: 8.2, label: 'MSc Data Science, AI & Digital Business', sub: '2026 – 2027 · in progress', seed: 11 },
  ];
  const towers = defs.map((d) => {
    const wt = winTex(d.seed); wt.repeat.set(1, d.h / 3.2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, d.h, 2.6), new THREE.MeshStandardMaterial({ color: 0x0a1030, metalness: 0.7, roughness: 0.25, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 0.9 }));
    body.position.set(d.x, floorY + d.h / 2, 0); g.add(body);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineBasicMaterial({ color: HDR(0x22d3ee, 2) })); body.add(edges);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.8), new THREE.MeshBasicMaterial({ color: HDR(0xf472b6, 2) })); cap.position.y = d.h / 2; body.add(cap);
    const t1 = makeLabel(d.label, { h: 0.55, font: '700 36px "Space Grotesk", sans-serif' }), t2 = makeLabel(d.sub, { h: 0.38, font: '500 28px "JetBrains Mono", monospace', color: '#9fd8ff' });
    t1.position.set(d.x, floorY + d.h + 1.5, 0); t2.position.set(d.x, floorY + d.h + 0.9, 0); g.add(t1, t2);
    const st = { d, body, hover: 0, tgt: 0, baseY: body.position.y };
    const pick = { label: d.label + ' — details', cursor: 'pointer', onHover: (on) => { st.tgt = on ? 1 : 0; }, onClick: () => { burst(body.position.clone().add(g.position).add(new THREE.Vector3(0, d.h / 2, 0)), '#22d3ee', 70, 6); tone(300, 0.3, 'triangle', 0.07, 600); openDrawer(d.id); } };
    body.userData.pick = pick; registry[d.id] = pick; pickables.push(body); return st;
  });
  const top = towers[2];
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.3, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: HDR(0x22d3ee, 1.4), transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.set(6.5, floorY + 8.2 + 4.6, 0); beam.rotation.x = Math.PI; g.add(beam);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: HDR(0xfbbf24, 2.2) })); gem.position.set(6.5, floorY + 8.2 + 0.9 - 0.2, 0); g.add(gem);
  // certification orbs
  const certs = [['Python for Everybody · 2020', 0x34d399], ['Supervised ML · 2024', 0x22d3ee], ['Build an LLM from Scratch · in progress', 0xfbbf24]].map(([name, c], i) => {
    const o = new THREE.Group(); const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), new THREE.MeshBasicMaterial({ color: HDR(c, 2) })); o.add(m);
    const gl = glowSprite(c, 2.2, 0.6); o.add(gl);
    const lb = makeLabel(name, { h: 0.34, font: '500 28px "JetBrains Mono", monospace', color: '#cfd4f2' }); lb.position.y = 0.85; o.add(lb); g.add(o);
    return { o, a: i * 2.1, c };
  });
  return {
    pickables,
    update(t, dt) {
      towers.forEach((tw) => { tw.hover = lerp(tw.hover, tw.tgt, 0.12); tw.body.scale.set(1 + tw.hover * 0.06, 1 + tw.hover * 0.04, 1 + tw.hover * 0.06); tw.body.position.y = tw.baseY + tw.hover * 0.15; tw.body.material.emissiveIntensity = 0.9 + tw.hover * 1.1; });
      beam.material.opacity = 0.13 + 0.07 * Math.sin(t * 2.4); gem.rotation.y += dt * 1.4; gem.position.y = floorY + 8.2 + 1.1 + Math.sin(t * 2) * 0.2;
      certs.forEach((c, i) => { c.a += dt * (0.22 + i * 0.03); c.o.position.set(Math.cos(c.a) * 11, 0.5 + Math.sin(c.a * 2 + i) * 1.8, Math.sin(c.a) * 5 - 2); c.o.rotation.y += dt; });
    },
  };
}

function buildContact(g) {
  // Black hole: event horizon, tilted accretion disk, lensed halo, infalling matter.
  const pickables = [];
  // flat disc (not a sphere) so the halo ring lies on the same plane — a sphere's near surface hides one side of the ring when viewed off-axis
  const horizon = new THREE.Mesh(new THREE.CircleGeometry(1.8, 128), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, side: THREE.DoubleSide })); g.add(horizon);
  const U = { time: { value: 0 }, hover: { value: 0 } };
  const VS = `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
  const mk = (fs) => new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: fs, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  // turbulent, differentially-rotating accretion disk — brighter on the approaching (left) side
  const diskMat = mk(`uniform float time,hover; varying vec2 vP;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p,float P){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); float x0=mod(i.x,P),x1=mod(i.x+1.,P);
      return mix(mix(h(vec2(x0,i.y)),h(vec2(x1,i.y)),f.x),mix(h(vec2(x0,i.y+1.)),h(vec2(x1,i.y+1.)),f.x),f.y); }
    float fbm(vec2 p,float P){ float v=0.,a=.5; for(int i=0;i<5;i++){ v+=a*n(p,P); p*=2.; P*=2.; a*=.5; } return v; }
    void main(){ float r=length(vP); float a=atan(vP.y,vP.x); float t=(r-2.25)/6.6;
      float om=1.5/pow(r*.42,1.5);
      float ang=(a+time*om)/6.2831853;
      float f=fbm(vec2(ang*20.,r*1.7),20.);
      float st=fbm(vec2(ang*60.+7.,r*.7),60.);
      float arm=.8+.35*sin(a*2.+log(r)*5.-time*.6);
      float I=smoothstep(0.,.02,t)*pow(1.-clamp(t,0.,1.),1.45);
      I*=(.04+1.9*f*f*f+1.0*pow(st,2.6))*arm;
      vec3 col=mix(vec3(1.,.97,.86),vec3(1.,.66,.27),smoothstep(0.,.2,t)); col=mix(col,vec3(.8,.38,.13),smoothstep(.2,.95,t));
      col=mix(col,vec3(.75,.85,1.),smoothstep(.55,0.,t)*pow(st,3.)*.5);
      float dop=.85+.25*(.5-.5*cos(a));
      gl_FragColor=vec4(col*I*dop*1.25*(1.+hover*.4),1.); }`);
  const diskGroup = new THREE.Group(); g.add(diskGroup);
  const disk = new THREE.Mesh(new THREE.RingGeometry(2.2, 8.8, 192, 1), diskMat); disk.rotation.x = -Math.PI / 2; diskGroup.add(disk);
  // lensed far side of the disk bent over the top & under the bottom of the shadow, plus a razor-thin photon ring
  const haloMat = mk(`uniform float time,hover; varying vec2 vP;
    void main(){ float r=length(vP); float a=atan(vP.y,vP.x); float t=(r-1.82)/1.9;
      float vert=pow(abs(sin(a)),1.3);
      float photon=exp(-t*60.);
      float lens=exp(-t*(1.5+(1.-vert)*20.))*(.04+.96*pow(vert,1.6));
      float bands=.9+.1*sin(a*3.+time*.5);
      float I=smoothstep(0.,.006,t)*(photon*2.0+lens*2.0*bands)*(1.-smoothstep(.45,1.45,t));
      vec3 col=mix(vec3(1.,.98,.9),vec3(1.,.62,.24),clamp(t*1.6,0.,1.));
      gl_FragColor=vec4(col*I*(1.+hover*.45),1.); }`);
  const halo = new THREE.Mesh(new THREE.RingGeometry(1.8, 4.6, 192, 1), haloMat); halo.position.z = 0.02; g.add(halo);


  const hit = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24), new THREE.MeshBasicMaterial({ visible: false })); g.add(hit);
  let ht = 0, hv = 0, warp = 0;
  hit.userData.pick = { label: '⚫ Fall into the event horizon', cursor: 'pointer', onHover: (on) => { ht = on ? 1 : 0; }, onClick: () => startFall() };
  pickables.push(hit);

  // light & matter spiralling into the hole, all on the GPU: each streak accelerates, curls, flattens into the disk and is swallowed
  const TN = lowPower ? 500 : 1100, SEG = 10, dirs = [], seeds = [], segs = [];
  for (let i = 0; i < TN; i++) { const d = new THREE.Vector3().randomDirection(), sd = Math.random(); for (let k = 0; k < SEG; k++) for (let e = 0; e < 2; e++) { dirs.push(d.x, d.y, d.z); seeds.push(sd); segs.push((k + e) / SEG); } }
  const FLOW = `uniform float time; attribute vec3 dir; attribute float seed; attribute float seg; varying vec3 vC; varying float vA; varying vec2 vLoc;
    vec3 flow(){ float sp=.07+.07*fract(seed*91.7); float u=fract(time*sp+seed)-seg*.05; float al=u<0.?0.:1.; u=max(u,0.);
      float r=mix(18.,2.0,pow(u,1.7)); float th=10.*pow(u,2.1)+seed*3.; float c=cos(th),s=sin(th);
      vec3 p=vec3(c*dir.x-s*dir.z,dir.y,s*dir.x+c*dir.z)*r; p.y*=mix(1.,.1,smoothstep(.25,.95,u));
      vA=al*smoothstep(0.,.06,u)*(1.-smoothstep(.93,1.,u))*(1.-seg*.85)*.75;
      vC=mix(vec3(.55,.7,1.),vec3(1.,.8,.48),smoothstep(.15,.9,u))*(.5+2.6*u*u); vLoc=p.xy; return p; }`;
  const FADE = `varying vec2 vLoc; float inShadow(){ return smoothstep(1.8,2.5,length(vLoc)); }`;
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(dirs, 3));
  trailGeo.setAttribute('dir', new THREE.Float32BufferAttribute(dirs, 3)); trailGeo.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1)); trailGeo.setAttribute('seg', new THREE.Float32BufferAttribute(segs, 1));
  const trails = new THREE.LineSegments(trailGeo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${FLOW} void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(flow(),1.); }`, fragmentShader: `${FADE} varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC,vA*inShadow()); }` }));
  trails.frustumCulled = false; diskGroup.add(trails);
  const hd = [], hs = [], hg = []; for (let i = 0; i < TN; i++) { const d = trailGeo.attributes.dir; const o = i * SEG * 2 * 3; hd.push(d.array[o], d.array[o + 1], d.array[o + 2]); hs.push(trailGeo.attributes.seed.array[i * SEG * 2]); hg.push(0); }
  const headGeo = new THREE.BufferGeometry(); headGeo.setAttribute('position', new THREE.Float32BufferAttribute(hd, 3)); headGeo.setAttribute('dir', new THREE.Float32BufferAttribute(hd, 3)); headGeo.setAttribute('seed', new THREE.Float32BufferAttribute(hs, 1)); headGeo.setAttribute('seg', new THREE.Float32BufferAttribute(hg, 1));
  const heads = new THREE.Points(headGeo, new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `${FLOW} void main(){ vec4 mv=modelViewMatrix*vec4(flow(),1.); gl_PointSize=clamp(95./-mv.z,1.5,10.); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `${FADE} varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); gl_FragColor=vec4(vC,vA*smoothstep(.5,0.,d)*inShadow()); }` }));
  heads.frustumCulled = false; diskGroup.add(heads);
  return {
    pickables,
    update(t, dt) {
      warp += dt * (state.fall ? 9 * Math.pow(state.fall.u || 0, 2) : 0); U.time.value = t + warp; hv = lerp(hv, ht, 0.1); U.hover.value = hv;
      diskGroup.rotation.x = 0.17 - mouseS.y * 0.12 + Math.sin(t * 0.3) * 0.015; diskGroup.rotation.z = -0.1 + mouseS.x * 0.08;
      g.rotation.y = lerp(g.rotation.y, mouseS.x * 0.15, 0.05);
      g.scale.setScalar(2.9 * (1 + Math.sin(t * 0.4) * 0.03 + hv * 0.03));
    },
  };
}

/* ------------------------------------------------------------------ *
 *  State + building the world
 * ------------------------------------------------------------------ */
const state = { cur: 0, flying: false, started: false, drawer: null, hlCat: null, skillCloud: null, found: 0 };
const builders = [buildHero, buildAbout, buildExperience, buildProjects, buildSkills, buildEducation, buildContact];
const stations = [];
function buildWorld() {
  STATIONS.forEach((s, i) => {
    const g = new THREE.Group(); g.position.copy(stationPos[i]); scene.add(g);
    const built = builders[i](g); stations.push({ ...built, group: g });
  });
}

/* ---- collectible data shards ---- */
const shards = []; let shardHits = [];
function buildShards() {
  const mat = new THREE.MeshBasicMaterial({ color: HDR(0xfbbf24, 2.4) });
  const geo = new THREE.OctahedronGeometry(0.34);
  const spots = [];
  stationPos.forEach((p, i) => { for (let k = 0; k < 3; k++) { const a = rand(0, 6.28), r = rand(9, 14); spots.push(new THREE.Vector3(p.x + Math.cos(a) * r * 1.2, p.y + Math.sin(a) * r * 0.55, p.z + rand(-6, 4))); } });
  for (let i = 0; i < 6; i++) { const a = stationPos[i], b = stationPos[i + 1]; spots.push(a.clone().lerp(b, rand(0.3, 0.7)).add(new THREE.Vector3(rand(-9, 9), rand(-6, 6), 0))); }
  spots.forEach((p) => {
    const m = new THREE.Mesh(geo, mat); m.position.copy(p); m.add(glowSprite(0xfbbf24, 2.6, 0.55));
    const hit = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), new THREE.MeshBasicMaterial({ visible: false })); m.add(hit);
    hit.userData.pick = { label: '◆ Data shard', cursor: 'pointer', onHover() { }, onClick: () => collect(m) };
    m.userData = { ph: rand(0, 6), hit }; scene.add(m); shards.push(m); shardHits.push(hit);
  });
  $('#shard-t').textContent = shards.length;
}
function collect(m) {
  const i = shards.indexOf(m); if (i < 0) return;
  burst(m.position, '#fbbf24', 55, 6); scene.remove(m); shards.splice(i, 1); shardHits.splice(i, 1); state.found++;
  $('#shard-n').textContent = state.found; const el = $('#shards'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  tone(700 + state.found * 40, 0.18, 'triangle', 0.08, 1400);
  const total = state.found + shards.length;
  if (state.found === 1) toast('◆ Data shard collected! Can you find them all?', 2800);
  if (shards.length === 0) {
    toast('🎉 All data shards found — you clearly pay attention to detail. Let\'s talk!', 6000);
    [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.35, 'triangle', 0.07, null, k * 0.11));
    for (let k = 0; k < 6; k++) setTimeout(() => burst(camera.position.clone().add(new THREE.Vector3(rand(-8, 8), rand(-4, 5), -rand(14, 24)).applyQuaternion(camera.quaternion)), ['#22d3ee', '#f472b6', '#fbbf24', '#34d399'][k % 4], 90, 9), k * 220);
  }
}

/* ------------------------------------------------------------------ *
 *  Camera flight
 * ------------------------------------------------------------------ */
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), flight = { from: null, to: null, t0: 0, dur: 2, dir: 1 };
function viewFor(i) {
  const p = stationPos[i], S = STATIONS[i], asp = innerWidth / innerHeight, mob = isMobile();
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max(S.dist * (mob ? 0.9 : 1), (S.w * (mob ? 0.62 : 0.55)) / (2 * tan * asp));
  const offx = mob ? 0 : -d * (i === 3 ? 0.25 : 0.2), offy = mob ? -d * 0.2 : 0;
  return { pos: new THREE.Vector3(p.x + offx, p.y + offy, p.z + d), look: new THREE.Vector3(p.x + offx, p.y + offy, p.z) };
}
function goTo(i, instant = false) {
  if (state.fall) return;
  i = clamp(i, 0, STATIONS.length - 1);
  if (state.drawer) closeDrawer();
  if (i === state.cur && !state.flying && !instant) return;
  const to = viewFor(i);
  $$('.panel').forEach((p) => p.classList.remove('on'));
  if (instant) { camPos.copy(to.pos); camLook.copy(to.look); arrive(i); return; }
  flight.from = { pos: camPos.clone(), look: camLook.clone() }; flight.to = to; flight.t0 = clock.elapsedTime;
  flight.dur = 1.7 + Math.min(Math.abs(i - state.cur), 4) * 0.35; flight.dir = i % 2 ? 1 : -1; state.flying = true; state.target = i;
  tone(140, flight.dur * 0.9, 'sawtooth', 0.025, 520);
  $('#hint').classList.add('hide');
  $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
}
function arrive(i) {
  state.cur = i; state.flying = false; state.lock = performance.now() + 450;
  $$('.panel').forEach((p) => p.classList.toggle('on', +p.dataset.i === i));
  $$('#dots button').forEach((b, k) => b.classList.toggle('on', k === i));
  if (i === 1) countUp();
  setTimeout(() => { if (state.cur === i) updateHover(); }, 50);
}
function updateFlight(t) {
  if (!state.flying) return;
  const u = clamp((t - flight.t0) / flight.dur, 0, 1), e = ease(u), s = Math.sin(Math.PI * u);
  camPos.lerpVectors(flight.from.pos, flight.to.pos, e); camLook.lerpVectors(flight.from.look, flight.to.look, e);
  camPos.x += s * 9 * flight.dir; camPos.y += s * 3;
  camera.fov = 50 + s * 16; camera.updateProjectionMatrix();
  if (u >= 1) { camera.fov = 50; camera.updateProjectionMatrix(); arrive(state.target); }
}
function placeCamera() {
  let roll = state.flying ? Math.sin(Math.PI * clamp((clock.elapsedTime - flight.t0) / flight.dur, 0, 1)) * 0.1 * flight.dir : 0;
  camera.position.copy(camPos); camera.position.x += mouseS.x * 1.3; camera.position.y += mouseS.y * 0.9;
  if (state.cur === 6 && !state.flying) { // caught in the pull: slow drift toward the hole, gentle roll, faint tremor
    const t = clock.elapsedTime, pull = 0.5 + 0.5 * Math.sin(t * 0.22);
    camera.position.z -= pull * 1.6; camera.position.x += Math.sin(t * 0.17) * 0.8 + Math.sin(t * 31) * 0.012 * pull; camera.position.y += Math.cos(t * 0.13) * 0.5 + Math.cos(t * 27) * 0.012 * pull;
    roll = Math.sin(t * 0.19) * 0.045;
  }
  let look = camLook;
  if (state.fall) { // the fall: accelerate toward the hole, stretch the view, spin, shake — then fade to black
    const f = state.fall; f.u = clamp((clock.elapsedTime - f.t0) / f.dur, 0, 1);
    const k = Math.pow(f.u, 2.3), tgt = stationPos[6];
    camera.position.lerp(tgt, k * 0.96); look = camLook.clone().lerp(tgt, clamp(f.u * 1.6, 0, 1)); roll += k * 5;
    camera.position.x += (Math.random() - 0.5) * 0.5 * k; camera.position.y += (Math.random() - 0.5) * 0.5 * k;
    camera.fov = 50 + k * 70; camera.updateProjectionMatrix();
    fallEl.style.opacity = f.done ? 1 : THREE.MathUtils.smoothstep(f.u, 0.68, 0.97);
    if (f.u >= 1 && !f.done) { f.done = true; fallEl.classList.add('done'); tone(48, 1.8, 'sine', 0.14, 18); beginCountdown(); }
  }
  camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(look);
}

const fallEl = $('#fall');
function startFall() {
  if (state.fall || state.flying || state.cur !== 6) return;
  closeDrawer(); setHover(null); state.fall = { t0: clock.elapsedTime, dur: 5.4, u: 0, done: false };
  document.body.classList.add('falling'); burst(stationPos[6], '#ffb86b', 140, 11);
  tone(70, 5.2, 'sawtooth', 0.07, 22); tone(160, 5.2, 'sine', 0.05, 2600); tone(40, 5.4, 'triangle', 0.09, 18);
}
function endFall() {
  if (!state.fall) return; (state.fall.timers || []).forEach((t) => { clearTimeout(t); clearInterval(t); }); state.fall = null; $('#fall-bar').classList.remove('run'); camera.fov = 50; camera.updateProjectionMatrix();
  fallEl.classList.remove('done'); fallEl.style.opacity = 0; document.body.classList.remove('falling'); tone(330, 0.6, 'sine', 0.05, 660);
}

// after the text lands: count down, then open the mailbox ("the next dimension") and drift back out
function beginCountdown() {
  const f = state.fall, cnt = $('#count'), msg = $('#fall-msg'), bar = $('#fall-bar'); f.timers = [];
  let n = 10; cnt.textContent = n; msg.innerHTML = 'Entering the next dimension — my mailbox — in <b id="count">10</b>…';
  const c2 = $('#count'); bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run');
  const tick = setInterval(() => { n--; if (n > 0) { c2.textContent = n; tone(440 + (10 - n) * 45, 0.18, 'sine', 0.05); } }, 1000);
  f.timers.push(tick);
  f.timers.push(setTimeout(() => {
    clearInterval(tick); msg.textContent = 'Transmission open. Say hello across the dimensions. ✉'; tone(220, 1.2, 'sine', 0.08, 1320);
    location.href = 'mailto:kamleshshrestha.work@gmail.com';
    f.timers.push(setTimeout(endFall, 3200));
  }, 10000));
}

/* ------------------------------------------------------------------ *
 *  UI: nav, drawer, toast, tooltips, counters
 * ------------------------------------------------------------------ */
STATIONS.forEach((s, i) => { const b = document.createElement('button'); b.innerHTML = `<span>${s.name}</span><i></i>`; b.setAttribute('aria-label', s.name); b.addEventListener('click', () => goTo(i)); $('#dots').appendChild(b); });
$$('[data-go]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); goTo(+el.dataset.go); }));
$('#next').addEventListener('click', () => goTo(state.cur + 1)); $('#prev').addEventListener('click', () => goTo(state.cur - 1));
$$('[data-open]').forEach((el) => {
  el.addEventListener('click', () => { const r = registry[el.dataset.open]; if (r) r.onClick(); else openDrawer(el.dataset.open); });
  el.addEventListener('mouseenter', () => registry[el.dataset.open]?.onHover(true)); el.addEventListener('mouseleave', () => registry[el.dataset.open]?.onHover(false));
});
$$('.cat').forEach((el) => { el.addEventListener('mouseenter', () => { state.hlCat = +el.dataset.cat; }); el.addEventListener('mouseleave', () => { state.hlCat = null; }); });

function openDrawer(id) {
  const d = DETAILS[id]; if (!d) return; state.drawer = id;
  $('#d-kicker').textContent = d.kicker; $('#d-title').textContent = d.title; $('#d-meta').textContent = d.meta;
  $('#d-list').innerHTML = d.bullets.map((b) => `<li>${b}</li>`).join('');
  $('#d-tags').innerHTML = d.tags.map((t) => `<span class="chip">${t}</span>`).join('');
  $('#d-links').innerHTML = (d.links || []).map(([l, u]) => `<a class="btn primary" href="${u}" target="_blank" rel="noopener">${l}</a>`).join('');
  $('#drawer').classList.add('on'); $('#drawer').setAttribute('aria-hidden', 'false');
  if (!isMobile()) $$('.panel.on').forEach((p) => (p.style.opacity = '0.25'));
}
function closeDrawer() { state.drawer = null; $('#drawer').classList.remove('on'); $('#drawer').setAttribute('aria-hidden', 'true'); $$('.panel').forEach((p) => (p.style.opacity = '')); }
$('#close').addEventListener('click', closeDrawer);

let toastTimer; function toast(msg, ms = 3000) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }

function countUp() {
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
    const step = (n) => { const k = ease(clamp((n - t0) / 1400, 0, 1)); el.textContent = Math.round(end * k).toLocaleString('en-US') + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

(function typeRoles() {
  const el = $('#role'); let i = 0, j = 0, del = false;
  const tick = () => {
    const w = ROLES[i]; j += del ? -1 : 1; el.textContent = w.slice(0, j);
    let wait = del ? 28 : 65; if (!del && j === w.length) { del = true; wait = 1500; } else if (del && j === 0) { del = false; i = (i + 1) % ROLES.length; wait = 300; }
    setTimeout(tick, wait);
  }; tick();
})();

/* ------------------------------------------------------------------ *
 *  Interaction
 * ------------------------------------------------------------------ */
const ray = new THREE.Raycaster(); let hovered = null; const tip = $('#tip');
function pick() {
  ray.setFromCamera(mouse, camera);
  const list = [...(stations[state.cur]?.pickables || []), ...shardHits];
  const h = ray.intersectObjects(list, false)[0]; return h ? h.object : null;
}
function updateHover() {
  if (!state.started || state.flying || state.fall || !stations.length || !lastClient) return setHover(null);
  setHover(pick());
}
function setHover(o) {
  if (o === hovered) return;
  hovered?.userData.pick?.onHover?.(false); hovered = o;
  if (o) { o.userData.pick.onHover?.(true); if (lastClient) { tip.style.left = lastClient.clientX + 'px'; tip.style.top = lastClient.clientY + 'px'; } tip.textContent = o.userData.pick.label; tip.classList.add('on'); canvas.style.cursor = o.userData.pick.cursor || 'default'; }
  else { tip.classList.remove('on'); canvas.style.cursor = ''; }
}
let lastClient = null;
const setMouse = (e) => { lastClient = e; mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; };

let down = null;
canvas.addEventListener('pointerdown', (e) => { setMouse(e); down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, id: e.pointerId }; });
canvas.addEventListener('pointermove', (e) => {
  setMouse(e);
  if (down && state.cur === 4 && !state.flying && state.skillCloud) {
    const dx = e.movementX || 0, dy = e.movementY || 0; down.moved += Math.abs(dx) + Math.abs(dy);
    state.skillCloud.vx = dx * 0.006; state.skillCloud.vy = dy * 0.004;
  } else if (down) down.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
  if (e.pointerType === 'mouse') updateHover();
});
canvas.addEventListener('pointerup', (e) => {
  setMouse(e); const d = down; down = null; if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (e.pointerType !== 'mouse' && state.cur !== 4 && Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.3 && !state.drawer) { goTo(state.cur + (dy < 0 ? 1 : -1)); return; }
  if (e.pointerType !== 'mouse' && state.cur !== 4 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && !state.drawer) { goTo(state.cur + (dx < 0 ? 1 : -1)); return; }
  if (d.moved < 8 && state.started && !state.flying && !state.fall) { const o = pick(); o?.userData.pick?.onClick?.(); }
});
canvas.addEventListener('pointerleave', () => setHover(null));

let wheelAcc = 0, wheelT = 0;
addEventListener('wheel', (e) => {
  e.preventDefault(); if (!state.started || state.drawer || state.flying || state.fall || performance.now() < (state.lock || 0)) return;
  const now = performance.now(); if (now - wheelT > 220) wheelAcc = 0; wheelT = now; wheelAcc += e.deltaY;
  if (Math.abs(wheelAcc) > 50) { goTo(state.cur + Math.sign(wheelAcc)); wheelAcc = 0; }
}, { passive: false });
addEventListener('keydown', (e) => {
  if (!state.started) return;
  if (state.fall) { if (e.key === 'Escape') endFall(); return; }
  if (e.key === 'Escape') return closeDrawer();
  if (state.drawer) return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); goTo(state.cur + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(state.cur - 1); }
  else if (e.key === 'Home') goTo(0); else if (e.key === 'End') goTo(STATIONS.length - 1);
  else if (/^[1-7]$/.test(e.key)) goTo(+e.key - 1);
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  if (!state.flying && state.started) { const v = viewFor(state.cur); camPos.copy(v.pos); camLook.copy(v.look); }
});
document.addEventListener('visibilitychange', () => { if (actx) document.hidden ? actx.suspend() : actx.resume(); });

/* ------------------------------------------------------------------ *
 *  Main loop
 * ------------------------------------------------------------------ */
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  mouseS.lerp(mouse, 0.05);
  scene.userData.starMat.uniforms.time.value = t;
  const bTarget = state.fall ? 0.08 + 1.2 * Math.pow(state.fall.u, 2.5) * (1 - THREE.MathUtils.smoothstep(state.fall.u, 0.85, 1)) : state.cur === 6 && !state.flying ? 0.08 : 0.8; bloom.strength = lerp(bloom.strength, bTarget, 0.04);
  updateFlight(t); placeCamera(); camera.updateMatrixWorld();
  { const sm = scene.userData.starMat.uniforms, bp = stationPos[6], dd = camera.position.distanceTo(bp); sm.lens.value = 1 - THREE.MathUtils.smoothstep(dd, 45, 120); sm.aspect.value = camera.aspect;
    const nd = bp.clone().project(camera); sm.bh.value.set(nd.x, nd.y, ((1.8 * 2.9) / (dd * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.18); }
  stations.forEach((s, i) => { if (Math.abs(i - (state.flying ? state.target ?? state.cur : state.cur)) <= 2 || Math.abs(i - state.cur) <= 2) s.update(t, dt); });
  shards.forEach((m) => { m.rotation.y += dt * 1.6; m.rotation.x += dt * 0.7; m.position.y += Math.sin(t * 1.6 + m.userData.ph) * 0.004; m.children[0].material.opacity = 0.4 + 0.25 * Math.sin(t * 3 + m.userData.ph); });
  updateBursts(dt);
  composer.render();
}

/* ------------------------------------------------------------------ *
 *  Boot
 * ------------------------------------------------------------------ */
manager.onProgress = (_, l, n) => { $('#bar').style.width = (l / n) * 100 + '%'; };
let ready = false;
async function init() {
  try { await Promise.race([Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 28px "JetBrains Mono"')]), new Promise((r) => setTimeout(r, 1800))]); } catch (e) { /* fallback fonts are fine */ }
  buildWorld(); buildShards();
  const v0 = viewFor(0); camPos.copy(v0.pos).add(new THREE.Vector3(0, 30, 110)); camLook.copy(v0.look);
  renderer.setAnimationLoop(frame);
  const go = () => { ready = true; const b = $('#enter'); b.disabled = false; b.textContent = 'Enter the universe →'; $('#bar').style.width = '100%'; };
  manager.onLoad = go; setTimeout(() => { if (!ready) go(); }, 4000);
  // textures may already be done
  if (manager.itemEnd && !ready) setTimeout(() => { if (!ready && !manager.isLoading) go(); }, 300);
}
$('#enter').addEventListener('click', () => {
  startAudio(); state.started = true; $('#loader').classList.add('gone'); tone(180, 1.4, 'sawtooth', 0.04, 700);
  const to = viewFor(0); flight.from = { pos: camPos.clone(), look: camLook.clone() }; flight.to = to; flight.t0 = clock.elapsedTime; flight.dur = 3.2; flight.dir = 1; state.flying = true; state.target = 0;
  $$('#dots button')[0].classList.add('on');
  setTimeout(() => toast('Tip: catch the glowing ◆ shards as you fly', 3500), 3800);
});
window.__go = goTo; window.__state = state;
init();

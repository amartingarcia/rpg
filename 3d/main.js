// Plaza de Jaraíz de la Vera y Pub Calisai en 3D (Three.js).
// Aproximación de fantasía: los edificios son de bajo polígono, no una réplica exacta.
import { color, shade } from '../js/sprites.js';

// ---------------------------------------------------------------- carga de Three.js
const THREE_SOURCES = [
  './vendor/three.module.js',                                        // copia local, si la pones
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
  'https://unpkg.com/three@0.170.0/build/three.module.js',
];
async function loadThree() {
  let last;
  for (const u of THREE_SOURCES) { try { return await import(u); } catch (e) { last = e; } }
  throw new Error('No se pudo cargar Three.js (¿sin internet?): ' + (last && last.message));
}
const THREE = await loadThree();

const $ = (id) => document.getElementById(id);
const stage = $('screen');

// ---------------------------------------------------------------- utilidades
function rngFrom(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TOON_GRAD = (() => { const d = new Uint8Array([105, 165, 215, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
const toonCache = new Map();
function toon(col, extra = {}) {
  const { flatShading, ...rest } = extra; void flatShading;
  const k = col + JSON.stringify(rest);
  if (!toonCache.has(k)) toonCache.set(k, new THREE.MeshToonMaterial({ color: col, gradientMap: TOON_GRAD, ...rest }));
  return toonCache.get(k);
}
const INK = new THREE.MeshBasicMaterial({ color: 0x1b120e, side: THREE.BackSide });
function pop(col, k = 1.28) { const c = new THREE.Color(col), h = {}; c.getHSL(h); c.setHSL(h.h, clamp(h.s * k + 0.05, 0, 1), h.l); return '#' + c.getHexString(); }
function lambert(col, extra = {}) { return toon(pop(col), extra); }   // colores del entorno, algo más vivos
function addInk(m, dims) {
  const mx = Math.max(dims[0], dims[1], dims[2]), t = clamp(0.02 + 0.012 * mx, 0.025, 0.14);
  const o = new THREE.Mesh(m.geometry, INK);
  o.scale.set(1 + 2 * t / Math.max(dims[0], 0.15), 1 + 2 * t / Math.max(dims[1], 0.15), 1 + 2 * t / Math.max(dims[2], 0.15));
  m.add(o);
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function shadowed(m, cast = true, receive = true) { m.castShadow = cast; m.receiveShadow = receive; return m; }
function box(w, h, d, col, x = 0, y = 0, z = 0, parent, ink = true) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? lambert(col) : col));
  if (ink) addInk(m, [w, h, d]);
  m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
function cyl(rt, rb, h, col, x, y, z, parent, seg = 12, ink = true) {
  const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof col === 'string' ? lambert(col) : col));
  if (ink) { const dm = 2 * Math.max(rt, rb); addInk(m, [dm, h, dm]); }
  m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
function ball(r, col, x, y, z, parent, seg = 12) {
  const m = shadowed(new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg - 2), lambert(col)));
  addInk(m, [2 * r, 2 * r, 2 * r]);
  m.position.set(x, y, z); if (parent) parent.add(m); return m;
}

// ---------------------------------------------------------------- terreno: la plaza es una cuesta con dos niveles
const UP = 2.4;                                  // altura del nivel alto (norte)
const groundH = (x, z) => (z >= 0 ? 0 : z <= -6 ? UP : (UP * -z) / 6);

// ---------------------------------------------------------------- escena
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.className = 'three';
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const SKY = new THREE.Color(0x6fc3ff), FOG = new THREE.Color(0xd6efff);
scene.background = SKY;
scene.fog = new THREE.Fog(FOG, 60, 190);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xdcecff, 0x9a8a6a, 2.0);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.4);
sun.position.set(22, 40, 26);
sun.castShadow = true;
sun.shadow.mapSize.set(matchMedia('(pointer: coarse)').matches ? 1024 : 2048, matchMedia('(pointer: coarse)').matches ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 120 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0006;
scene.add(hemi, sun, sun.target);

const world = new THREE.Group(); scene.add(world);           // plaza (exterior)
const interior = new THREE.Group(); interior.visible = false; // pub
const IX = 300;                                              // el pub está lejos, en x = 300
interior.position.set(IX, 0, 0); scene.add(interior);

const colExt = [], colInt = [];                              // colisiones
const circle = (list, x, z, r) => list.push({ t: 'c', x, z, r });
const rect = (list, x0, x1, z0, z1) => list.push({ t: 'b', x0, x1, z0, z1 });
const pois = [];                                             // carteles y cosas con las que hablar

// ---------------------------------------------------------------- suelo
{
  const cobble = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, h);
    const tints = ['#fbf8f0', '#f3ede0', '#ece4d2'], r = rngFrom(4);
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 0 : 10; x < w + 20; x += 20) {
      g.fillStyle = tints[Math.floor(r() * 3)]; g.fillRect(x + 1, y + 1, 18, 14);
      g.strokeStyle = 'rgba(80,60,40,.38)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 18, 14);
    }
  }, [80, 80]);
  const geo = new THREE.PlaneGeometry(180, 180, 90, 90);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const rnd = rngFrom(9);
  const cCob = new THREE.Color('#e9dcbf'), cCobUp = new THREE.Color('#f0dfb8'), cGrass = new THREE.Color('#79cf4f'), cDirt = new THREE.Color('#d2b47a');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundH(x, z));
    const inPlaza = Math.abs(x) <= 20.5 && z >= -16.5 && z <= 17.5;
    const inStreet = Math.abs(x) <= 4 && z > 16 && z < 60;
    const base = inPlaza || inStreet ? (z < -3 ? cCobUp : cCob) : (Math.abs(x) < 34 && z > -30 && z < 45 ? cDirt : cGrass);
    const k = 0.97 + rnd() * 0.05;
    cols[i * 3] = base.r * k; cols[i * 3 + 1] = base.g * k; cols[i * 3 + 2] = base.b * k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  vertexColors: true, map: cobble }));
  ground.receiveShadow = true; world.add(ground);
}

// ---------------------------------------------------------------- horizonte: sierra, nubes
{
  const r = rngFrom(21);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.3, d = 170 + r() * 40, h = 40 + r() * 45;
    const m = new THREE.Mesh(new THREE.ConeGeometry(38 + r() * 26, h, 6), lambert(i % 3 ? '#7b93d1' : '#8ea3dc'));
    m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d); world.add(m);
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(5 + r() * 4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); s.position.set(j * 6 - 9, r() * 2, r() * 4); s.scale.y = 0.55; g.add(s); }
    g.position.set((r() - 0.5) * 260, 55 + r() * 15, (r() - 0.5) * 260); world.add(g); clouds.push(g);
  }
  world.userData.clouds = clouds;
}

// ---------------------------------------------------------------- fachadas
function drawWindow(g, xc, yc, ww, wh, o) {
  const INKC = '#2b1a10';
  g.fillStyle = INKC; g.fillRect(xc - ww / 2 - 5, yc - wh / 2 - 5, ww + 10, wh + 10);
  const grd = g.createLinearGradient(0, yc - wh / 2, 0, yc + wh / 2);
  grd.addColorStop(0, o.shop ? '#5b7a8a' : '#c9edff'); grd.addColorStop(1, o.shop ? '#2d4652' : '#63b4ee');
  g.fillStyle = grd; g.fillRect(xc - ww / 2, yc - wh / 2, ww, wh);
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(xc - ww / 2 + 4, yc - wh / 2 + 4); g.lineTo(xc - ww / 2 + ww * 0.45, yc - wh / 2 + 4); g.lineTo(xc - ww / 2 + 4, yc - wh / 2 + wh * 0.4); g.fill();
  g.fillStyle = INKC; g.fillRect(xc - 2, yc - wh / 2, 4, wh);
  if (!o.shop) g.fillRect(xc - ww / 2, yc - 2, ww, 4);
  if (o.arch) { g.fillStyle = INKC; g.beginPath(); g.arc(xc, yc - wh / 2 - 4, ww / 2 + 5, Math.PI, 0); g.fill(); g.fillStyle = grd; g.beginPath(); g.arc(xc, yc - wh / 2, ww / 2, Math.PI, 0); g.fill(); }
  if (o.shutters) { for (const sd of [-1, 1]) { const x0 = sd < 0 ? xc - ww / 2 - ww * 0.46 : xc + ww / 2 + ww * 0.04; g.fillStyle = INKC; g.fillRect(x0 - 2, yc - wh / 2 - 5, ww * 0.42 + 4, wh + 10); g.fillStyle = o.shutters; g.fillRect(x0, yc - wh / 2 - 3, ww * 0.42, wh + 6); g.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 5; k++) g.fillRect(x0 + 2, yc - wh / 2 + 6 + k * (wh / 5), ww * 0.42 - 4, 3); } }
}

function facadeTex(w, h, o = {}) {
  const PPM = 42, cw = Math.max(64, Math.round(w * PPM)), ch = Math.max(64, Math.round(h * PPM));
  return canvasTex(cw, ch, (g) => {
    const r = rngFrom(o.seed || 1);
    g.fillStyle = pop(o.base || '#f2ece0', 1.5); g.fillRect(0, 0, cw, ch);
    if (o.stone) {
      g.strokeStyle = 'rgba(55,38,24,.7)'; g.lineWidth = 2;
      const bh = PPM * 0.5, bw = PPM * 1.0;
      for (let y = 0, row = 0; y < ch; y += bh, row++) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke();
        for (let x = (row % 2) * bw / 2; x < cw; x += bw) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); }
      }
    } else {
      
    }
    const floors = o.floors || 3, fh = ch / floors, cols = o.cols || 4;
    const ww = PPM * 0.95, wh = PPM * 1.45;
    const shutterCols = ['#2fa35a', '#e0503a', '#2f7ae0'];
    for (let f = 0; f < floors; f++) {
      const y0 = f * fh, yc = y0 + fh / 2 - 2, bottom = f === floors - 1;
      if (!o.stone && o.beams !== false && f > 0) { g.fillStyle = '#2b1a10'; g.fillRect(0, y0 - 5, cw, 10); g.fillStyle = '#c47a3c'; g.fillRect(0, y0 - 3, cw, 5); }
      if (o.stone && f > 0) { g.fillStyle = 'rgba(70,58,42,.55)'; g.fillRect(0, y0 - 2, cw, 4); }
      for (let i = 0; i < cols; i++) {
        const xc = (i + 0.5) * cw / cols;
        if (bottom && o.ground === 'arches') {
          g.fillStyle = '#2b2118'; g.beginPath(); g.moveTo(xc - PPM * 1.1, y0 + fh); g.lineTo(xc - PPM * 1.1, y0 + fh * 0.4); g.arc(xc, y0 + fh * 0.4, PPM * 1.1, Math.PI, 0); g.lineTo(xc + PPM * 1.1, y0 + fh); g.fill();
          g.strokeStyle = '#8a7a5c'; g.lineWidth = 5; g.stroke();
          continue;
        }
        if (bottom && o.ground === 'door') {
          if (i === Math.floor(cols / 2)) {
            g.fillStyle = '#4a2f1b'; g.fillRect(xc - PPM * 0.6, y0 + fh - PPM * 2.2, PPM * 1.2, PPM * 2.2);
            g.fillStyle = '#6e4526'; g.fillRect(xc - PPM * 0.5, y0 + fh - PPM * 2.1, PPM * 1.0, PPM * 2.1);
            g.fillStyle = '#f0c93a'; g.fillRect(xc + PPM * 0.25, y0 + fh - PPM, 4, 4);
            continue;
          }
        }
        if (bottom && o.ground === 'shop') {
          if (i === 0) { g.fillStyle = '#3b2616'; g.fillRect(xc - PPM * 0.6, y0 + fh - PPM * 2.2, PPM * 1.2, PPM * 2.2); g.fillStyle = '#5a3a22'; g.fillRect(xc - PPM * 0.5, y0 + fh - PPM * 2.1, PPM, PPM * 2.1); continue; }
          drawWindow(g, xc, y0 + fh - PPM * 1.3, PPM * 1.6, PPM * 1.2, { shop: true }); continue;
        }
        if (bottom && o.ground === 'none') continue;
        const shut = o.shutters && !o.stone && ((i + f) % 2 === 0) ? shutterCols[(i + f) % 3] : null;
        drawWindow(g, xc, yc, ww, wh, { arch: o.stone, shutters: shut });
        // balcón de hierro en el primer piso
        if (o.balcony !== false && f === floors - 2 && i % 2 === 0) {
          g.fillStyle = '#26262a'; g.fillRect(xc - ww / 2 - 8, yc + wh / 2 - 6, ww + 16, 3);
          for (let k = -ww / 2 - 6; k <= ww / 2 + 6; k += 6) g.fillRect(xc + k, yc + wh / 2 - 22, 2, 18);
          g.fillRect(xc - ww / 2 - 8, yc + wh / 2 - 24, ww + 16, 3);
        }
      }
    }
    if (o.clock) {
      const cx = cw / 2, cy = fh * 0.45 + (floors - 3) * 0; // encima del balcón central
      g.fillStyle = '#8a7a5c'; g.beginPath(); g.arc(cx, cy, PPM * 0.95, 0, 7); g.fill();
      g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(cx, cy, PPM * 0.8, 0, 7); g.fill();
      g.strokeStyle = '#1d1520'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - PPM * 0.6); g.moveTo(cx, cy); g.lineTo(cx + PPM * 0.4, cy + PPM * 0.15); g.stroke();
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.fillStyle = '#1d1520'; g.fillRect(cx + Math.sin(a) * PPM * 0.68 - 1.5, cy - Math.cos(a) * PPM * 0.68 - 1.5, 3, 3); }
    }
  });
}

function hipRoof(w, d, h, col) {
  const geo = new THREE.ConeGeometry(1, h, 4, 1); geo.rotateY(Math.PI / 4);
  const m = shadowed(new THREE.Mesh(geo, lambert(col, { flatShading: true })));
  const ol = new THREE.Mesh(geo, INK); ol.scale.setScalar(1.045); m.add(ol);
  m.scale.set((w / 2 + 0.4) / 0.7071, 1, (d / 2 + 0.4) / 0.7071); m.position.y = h / 2; return m;
}

// Edificio con la fachada mirando a +z local. Origen en el centro de la huella, a la altura del suelo.
function house(o) {
  const { w, d, h } = o;
  const G = new THREE.Group();
  const side = lambert(o.side || o.base || '#efe8d8');
  const dark = lambert('#3a2a1c');
  box(w, UP + 1.5, d, o.stone ? '#a89b80' : '#cfc7b4', 0, -(UP + 1.5) / 2, 0, G);          // zócalo enterrado
  if (o.arcade) {
    const lh = 3.4;
    const lowMats = [side, side, side, side, new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  map: facadeTex(w, lh, { base: '#e6dcc6', floors: 1, cols: Math.max(2, Math.round(w / 3)), ground: 'shop', seed: o.seed }) }), side];
    box(w, lh, d, lowMats, 0, lh / 2, 0, G);
    const uh = h - lh, ud = d + 2.6;
    const upMats = [side, side, side, dark, new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  map: facadeTex(w, uh, { base: o.base, floors: 2, cols: Math.max(2, Math.round(w / 2.6)), shutters: true, seed: o.seed, balcony: true }) }), side];
    box(w, uh, ud, upMats, 0, lh + uh / 2, 1.3, G);
    const n = Math.max(2, Math.round(w / 3.2));
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + (i + 0.5) * (w / n);
      cyl(0.24, 0.28, lh + UP, '#d9d1bf', cx, (lh - UP) / 2, d / 2 + 2.35, G);
      box(0.6, 0.18, 0.6, '#b9ae95', cx, lh - 0.09, d / 2 + 2.35, G);
      world.userData.pending.push({ list: colExt, g: G, cx, cz: d / 2 + 2.35 });
    }
    const rf = hipRoof(w, ud, 2.4, o.roof || '#b5533a'); rf.position.set(0, h + 1.2, 1.3); G.add(rf);
  } else {
    const mats = [side, side, side, side, new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  map: facadeTex(w, h, { base: o.base, stone: o.stone, floors: o.floors || 3, cols: o.cols || Math.max(2, Math.round(w / 2.6)), ground: o.ground || 'door', shutters: !o.stone, clock: o.clock, seed: o.seed, balcony: o.balcony }) }), side];
    box(w, h, d, mats, 0, h / 2, 0, G);
    const rf = hipRoof(w, d, o.roofH || 2.6, o.roof || '#b5533a'); rf.position.set(0, h + (o.roofH || 2.6) / 2, 0); G.add(rf);
  }
  const rr = rngFrom(o.seed || 3);
  box(0.6, 1.6, 0.6, '#a89b80', (rr() - 0.5) * w * 0.5, h + 1.6, -d * 0.2, G);
  return G;
}

function placeHouse(o, x, z, rotY) {
  const G = house(o);
  const y = o.y !== undefined ? o.y : groundH(x, z);
  G.position.set(x, y, z); G.rotation.y = rotY;
  world.add(G);
  // columnas de los soportales -> colisiones en coordenadas del mundo
  G.updateMatrixWorld(true);
  for (const p of world.userData.pending) if (p.g === G) { const v = new THREE.Vector3(p.cx, 0, p.cz).applyMatrix4(G.matrixWorld); circle(p.list, v.x, v.z, 0.32); }
  world.userData.pending = world.userData.pending.filter((p) => p.g !== G);
  return G;
}
world.userData.pending = [];

// ---------------------------------------------------------------- edificios de la plaza
const W_ = -Math.PI / 2 * -1;     // mira al este (+x)
const E_ = -Math.PI / 2;          // mira al oeste (-x)
const seedOf = (n) => 100 + n * 7;
// lado oeste
[[13.5, 7, false, '#f3ede0'], [6, 8, false, '#efe3c8'], [-2, 8, false, '#f1e6cf']].forEach(([z, w, _, base], i) =>
  placeHouse({ w, d: 8, h: 9.5, base, arcade: true, seed: seedOf(i) }, -24, z, W_));
// Palacio del Obispo Manzano (hoy Museo del Pimentón)
placeHouse({ w: 9, d: 9, h: 10.5, base: '#cfc2a2', stone: true, ground: 'door', floors: 3, cols: 4, roof: '#8f4a35', seed: 55 }, -24.5, -11, W_);
// lado este
placeHouse({ w: 7, d: 8, h: 9.5, base: '#f0e9da', arcade: true, seed: 61 }, 24, 13.5, E_);
placeHouse({ w: 8, d: 8, h: 9.5, base: '#f1e6cf', arcade: true, seed: 62 }, 24, -2, E_);
placeHouse({ w: 9, d: 8, h: 9.5, base: '#efe8d8', arcade: true, seed: 63 }, 24, -11, E_);
// Ayuntamiento (nivel alto, al norte)
const ayto = placeHouse({ w: 18, d: 8, h: 11.5, base: '#e3d7bb', stone: true, ground: 'arches', floors: 3, cols: 7, clock: true, roof: '#a4553a', roofH: 3, seed: 71, balcony: true }, 0, -20, 0);
box(3.2, 4, 3.2, '#d8ccb0', 0, 11.5 + 3.4, 0, ayto);                 // torre del reloj
const towerRoof = hipRoof(3.2, 3.2, 2.6, '#8f4a35'); towerRoof.position.set(0, 11.5 + 5.4 + 1.3, 0); ayto.add(towerRoof);
placeHouse({ w: 11, d: 8, h: 9.5, base: '#f3ede0', ground: 'shop', seed: 81 }, -14.5, -20, 0);
placeHouse({ w: 11, d: 8, h: 9.5, base: '#efe3c8', ground: 'door', seed: 82 }, 14.5, -20, 0);
// calle hacia el sur
[22, 30].forEach((z, i) => {
  placeHouse({ w: 8, d: 8, h: 8.5, base: i ? '#efe3c8' : '#f3ede0', ground: 'door', seed: 90 + i }, -7.5, z, W_);
  placeHouse({ w: 8, d: 8, h: 8.5, base: i ? '#f1e6cf' : '#efe8d8', ground: 'door', seed: 95 + i }, 7.5, z, E_);
});

// ---------------------------------------------------------------- Pub Calisai
const PUB_Z = 6;
{
  const pub = placeHouse({ w: 8, d: 8, h: 7.4, base: '#ead9b8', ground: 'none', floors: 2, cols: 3, roof: '#a4553a', seed: 44 }, 24, PUB_Z, E_);
  // planta baja: cristalera y puerta
  const front = new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD, 
    map: canvasTex(340, 168, (g, w, h) => {
      g.fillStyle = '#ead9b8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1d1520'; g.fillRect(8, 26, 138, 124); g.fillRect(194, 26, 138, 124);
      const gr = g.createLinearGradient(0, 26, 0, 150); gr.addColorStop(0, '#f2b05a'); gr.addColorStop(1, '#a9612a');
      g.fillStyle = gr; g.fillRect(14, 32, 126, 112); g.fillRect(200, 32, 126, 112);
      g.fillStyle = '#1d1520'; g.fillRect(77, 32, 4, 112); g.fillRect(263, 32, 4, 112);
      g.fillStyle = '#3b2616'; g.fillRect(146, 8, 48, 142); g.fillStyle = '#6e4526'; g.fillRect(152, 14, 36, 136);
      g.fillStyle = '#f0c93a'; g.fillRect(176, 90, 5, 5);
    }),
  });
  const wall = box(8, 3.2, 0.06, front, 0, 1.6, 4.03, pub);
  wall.receiveShadow = true;
  // rótulo
  const signTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#1d1520'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f0c93a'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ff9a4a'; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff6a2a'; g.shadowBlur = 14; g.fillText('PUB CALISAI', w / 2, h / 2 + 4);
  });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.12), [lambert('#1d1520'), lambert('#1d1520'), lambert('#1d1520'), lambert('#1d1520'), new THREE.MeshBasicMaterial({ map: signTex }), lambert('#1d1520')]);
  sign.position.set(0, 4.05, 4.1); pub.add(sign);
  // toldo
  for (let i = 0; i < 8; i++) box(1, 0.06, 1.3, i % 2 ? '#f6efe2' : '#c9433a', -3.5 + i, 3.35 - 0.05 * 0, 4.65, pub).rotation.x = 0.35;
  pois.push({ x: 19.3, z: PUB_Z, r: 2.6, text: 'PUB CALISAI\nUn sitio de los de siempre. Hay que entrar.' });

  // terraza con mesas y sombrillas
  const terrace = [[16.4, PUB_Z - 3.4], [13.6, PUB_Z + 1.6]];
  terrace.forEach(([x, z], i) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); world.add(t);
    cyl(0.6, 0.6, 0.06, '#f3eee2', 0, 0.85, 0, t, 16); cyl(0.05, 0.05, 0.85, '#2f2f33', 0, 0.42, 0, t, 6); cyl(0.32, 0.32, 0.04, '#2f2f33', 0, 0.02, 0, t, 10);
    cyl(0.03, 0.03, 2.3, '#8a8a8a', 0, 1.5, 0, t, 6);
    const um = shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.55, 8), lambert(i % 2 ? '#c9433a' : '#f2b05a', { flatShading: true }))); um.position.y = 2.55; t.add(um);
    for (const [cx, cz] of [[0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95]]) { box(0.42, 0.06, 0.42, '#5a3a22', cx, 0.48, cz, t); box(0.42, 0.42, 0.06, '#5a3a22', cx * 1.12, 0.7, cz * 1.12, t); box(0.05, 0.48, 0.05, '#3b2a1c', cx, 0.24, cz, t); }
    circle(colExt, x, z, 1.2);
  });
}

// ---------------------------------------------------------------- mobiliario de la plaza
function tree(x, z) {
  const y = groundH(x, z), t = new THREE.Group(); t.position.set(x, y, z);
  cyl(0.28, 0.4, 4.6, '#6b4428', 0, 2.3, 0, t, 7);
  const r = rngFrom(Math.round(x * 13 + z * 7));
  for (let i = 0; i < 4; i++) ball(1.4 + r() * 0.5, i % 2 ? '#3f8a45' : '#4fa055', (r() - 0.5) * 1.8, 5.3 + r() * 1.1, (r() - 0.5) * 1.8, t, 8);
  world.add(t); circle(colExt, x, z, 0.5);
}
[[-16, 10.5], [15.5, -4.5], [-16, -12.5]].forEach(([x, z]) => tree(x, z));

function lamp(x, z) {
  const y = groundH(x, z), g = new THREE.Group(); g.position.set(x, y, z);
  cyl(0.08, 0.12, 4, '#2b2b30', 0, 2, 0, g, 6); box(0.5, 0.5, 0.5, '#f5de8a', 0, 4.2, 0, g).material = new THREE.MeshBasicMaterial({ color: 0xf5de8a });
  box(0.7, 0.12, 0.7, '#2b2b30', 0, 4.55, 0, g); world.add(g); circle(colExt, x, z, 0.2);
}
[[-15, 12], [15, 12], [-15, 0], [15, 0], [-16, -10], [16, -10], [-5, -14], [5, -14]].forEach(([x, z]) => lamp(x, z));

function bench(x, z, rot) {
  const y = groundH(x, z), g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  box(2, 0.1, 0.55, '#7a4f2c', 0, 0.5, 0, g); box(2, 0.5, 0.08, '#8e5f37', 0, 0.85, -0.25, g);
  box(0.1, 0.5, 0.5, '#2b2b30', -0.85, 0.25, 0, g); box(0.1, 0.5, 0.5, '#2b2b30', 0.85, 0.25, 0, g);
  world.add(g);
  const c = Math.abs(Math.cos(rot)) > 0.5; rect(colExt, x - (c ? 1.05 : 0.4), x + (c ? 1.05 : 0.4), z - (c ? 0.4 : 1.05), z + (c ? 0.4 : 1.05));
  pois.push({ x, z, r: 1.6, text: 'Un banco. Perfecto para ver pasar el pueblo.' });
}
[[-6, 13, Math.PI], [6, 13, Math.PI], [-13, 6, Math.PI / 2], [-13, -3, Math.PI / 2], [12, -8.6, 0], [-12, -13, 0]].forEach(([x, z, r]) => bench(x, z, r));

// fuente
{
  const fx = 0, fz = 5, g = new THREE.Group(); g.position.set(fx, 0, fz); world.add(g);
  cyl(2.5, 2.7, 0.7, '#b9b09c', 0, 0.35, 0, g, 20); cyl(2.2, 2.2, 0.06, '#3f9bd6', 0, 0.68, 0, g, 20);
  cyl(0.5, 0.65, 1.2, '#b9b09c', 0, 1.2, 0, g, 12); cyl(1.1, 0.9, 0.2, '#b9b09c', 0, 1.9, 0, g, 14); cyl(0.9, 0.9, 0.04, '#5fb0e4', 0, 2.02, 0, g, 14);
  cyl(0.12, 0.2, 0.7, '#b9b09c', 0, 2.3, 0, g, 8);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.75 })); jet.position.y = 3; g.add(jet);
  world.userData.water = [g.children[1], g.children[4]]; world.userData.jet = jet;
  circle(colExt, fx, fz, 2.8);
  pois.push({ x: fx, z: fz, r: 3.6, text: 'Una fuente en mitad de la plaza.\nEl agua cae fresquita, de la sierra.' });
}

// picota / rollo (1689), nivel alto
{
  const px = -6, pz = -10, y = groundH(px, pz), g = new THREE.Group(); g.position.set(px, y, pz); world.add(g);
  for (let i = 0; i < 3; i++) cyl(1.5 - i * 0.25, 1.7 - i * 0.25, 0.25, '#a89f8c', 0, 0.13 + i * 0.25, 0, g, 8);
  cyl(0.28, 0.34, 5, '#b9b09c', 0, 3.2, 0, g, 8); cyl(0.5, 0.4, 0.4, '#a89f8c', 0, 5.9, 0, g, 8);
  for (const [dx, dz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) { box(0.22, 0.32, 0.22, '#5b5550', dx, 6.3, dz, g); box(0.1, 0.16, 0.1, '#5b5550', dx * 1.6, 6.4, dz * 1.6, g); }
  circle(colExt, px, pz, 1.7);
  pois.push({ x: px, z: pz, r: 3.4, text: 'LA PICOTA O ROLLO (1689)\nSímbolo de que el pueblo podía impartir justicia. Arriba, los lobos del escudo.' });
}
pois.push({ x: 0, z: -15, r: 3.4, text: 'AYUNTAMIENTO DE JARAÍZ DE LA VERA\nEn el nivel alto de la plaza, donde estuvo el castillo.' });
pois.push({ x: -19, z: -11, r: 3.4, text: 'PALACIO DEL OBISPO MANZANO\nHoy alberga el Museo del Pimentón.' });

// ---------------------------------------------------------------- interior del pub
{
  const D = 14, H = 10;
  const wood = canvasTex(256, 256, (g, w, h) => { const r = rngFrom(5); for (let y = 0; y < h; y += 32) { g.fillStyle = `rgb(${150 + r() * 30 | 0},${100 + r() * 20 | 0},${62 + r() * 14 | 0})`; g.fillRect(0, y, w, 32); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + 30, w, 2); g.fillRect((y * 5) % w, y, 2, 32); } }, [7, 5]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(D, H), new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  map: wood })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; interior.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(D, H), lambert('#4a3526')); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.6; interior.add(ceil);
  for (let x = -5; x <= 5; x += 2.5) box(0.3, 0.3, H, '#3a2a1c', x, 3.45, 0, interior);
  const panel = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#eadcc0'; g.fillRect(0, 0, w, h); g.fillStyle = '#7a4f2c'; g.fillRect(0, h * 0.5, w, h * 0.5); g.fillStyle = '#5a3a22'; g.fillRect(0, h * 0.5, w, 5); for (let x = 0; x < w; x += 64) g.fillRect(x, h * 0.5, 3, h * 0.5); });
  const wm = new THREE.MeshToonMaterial({ gradientMap: TOON_GRAD,  map: panel });
  const wl = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.6), wm); m.position.set(x, 1.8, z); m.rotation.y = ry; m.receiveShadow = true; interior.add(m); };
  wl(D, 0, -H / 2, 0); wl(D, 0, H / 2, Math.PI); wl(H, -D / 2, 0, Math.PI / 2); wl(H, D / 2, 0, -Math.PI / 2);
  // barra
  box(13.4, 1.1, 1, '#5a3a22', 0, 0.55, -2.4, interior); box(13.6, 0.07, 1.25, '#8b5a32', 0, 1.13, -2.4, interior);
  rect(colInt, IX - 6.8, IX + 6.8, -2.95, -1.85);
  // estantes con botellas
  box(13, 0.05, 0.4, '#3b2616', 0, 1.5, -4.75, interior); box(13, 0.05, 0.4, '#3b2616', 0, 2.1, -4.75, interior);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 1.8), lambert('#8fb0c0')); mirror.position.set(0, 1.9, -4.97); interior.add(mirror);
  const bc = ['#7a4a1c', '#2f6a3a', '#c9a13a', '#d9d9d9', '#8a2432', '#3b68d2'], rb = rngFrom(11);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 34; i++) { const hgt = 0.26 + rb() * 0.1; cyl(0.045, 0.05, hgt, bc[Math.floor(rb() * bc.length)], -6.2 + i * 0.37, (row ? 2.13 : 1.53) + hgt / 2, -4.75, interior, 6, false); }
  // neón
  const neon = canvasTex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#ff5fa2'; g.font = 'bold 84px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2f86'; g.shadowBlur = 24; g.fillText('CALISAI', w / 2, h / 2); g.fillText('CALISAI', w / 2, h / 2); });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: neon, transparent: true })); nm.position.set(0, 3.0, -4.94); interior.add(nm);
  // taburetes (con hueco en el centro para hablar con quien atiende)
  for (const x of [-4.8, -3.6, -2.4, 2.4, 3.6, 4.8]) { cyl(0.24, 0.24, 0.1, '#a82c2c', x, 0.78, -1.15, interior, 12); cyl(0.04, 0.04, 0.75, '#2f2f33', x, 0.38, -1.15, interior, 6); }
  // mesas y sillas
  for (const [x, z] of [[-4.4, 1.6], [4.4, 1.6], [-4.4, 3.6], [4.4, 3.6]]) {
    cyl(0.55, 0.55, 0.06, '#6e4526', x, 0.8, z, interior, 14); cyl(0.05, 0.05, 0.8, '#2f2f33', x, 0.4, z, interior, 6);
    for (const [dx, dz] of [[0.85, 0], [-0.85, 0]]) { box(0.4, 0.05, 0.4, '#3b2616', x + dx, 0.45, z + dz, interior); box(0.05, 0.45, 0.4, '#3b2616', x + dx * 1.2, 0.7, z + dz, interior); }
    circle(colInt, IX + x, z, 0.9);
  }
  // máquina de música
  box(0.7, 1.7, 0.9, '#7a2a2a', -6.5, 0.85, 0.5, interior); box(0.02, 1.2, 0.7, '#f2b05a', -6.13, 1.0, 0.5, interior).material = new THREE.MeshBasicMaterial({ color: 0xf2b05a });
  rect(colInt, IX - 7, IX - 6.1, 0, 1); pois.push({ x: IX - 6.1, z: 0.5, r: 2, inside: true, text: 'Una máquina de música. Suena algo de siempre.' });
  // diana
  const dart = canvasTex(128, 128, (g) => { const cols = ['#1d1520', '#f6efe2']; for (let i = 5; i > 0; i--) { g.fillStyle = i % 2 ? '#c9433a' : cols[i % 2]; g.beginPath(); g.arc(64, 64, i * 12, 0, 7); g.fill(); } g.fillStyle = '#3f9a4a'; g.beginPath(); g.arc(64, 64, 8, 0, 7); g.fill(); });
  const dm = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24), new THREE.MeshBasicMaterial({ map: dart })); dm.position.set(6.95, 1.7, 2.5); dm.rotation.y = -Math.PI / 2; interior.add(dm);
  pois.push({ x: IX + 6.5, z: 2.5, r: 2, inside: true, text: 'Una diana. Hay más agujeros en la pared que en la diana.' });
  // puerta de salida
  box(1.4, 2.4, 0.08, '#3b2616', 0, 1.2, H / 2 - 0.05, interior); box(1.0, 1.9, 0.02, '#f2b05a', 0, 1.25, H / 2 - 0.1, interior).material = new THREE.MeshBasicMaterial({ color: 0xf2b05a });
  box(0.6, 0.2, 0.02, '#3f9a4a', 0, 2.6, H / 2 - 0.08, interior).material = new THREE.MeshBasicMaterial({ color: 0x3f9a4a });
  // luces
  for (const x of [-3.5, 3.5]) { const l = new THREE.PointLight(0xffc98a, 14, 14, 1.6); l.position.set(x, 3.1, 0.5); interior.add(l); box(0.4, 0.3, 0.4, '#f5de8a', x, 3.3, 0.5, interior).material = new THREE.MeshBasicMaterial({ color: 0xf5de8a }); }
  const l3 = new THREE.PointLight(0xff9ac8, 6, 9, 1.6); l3.position.set(0, 2.6, -3.6); interior.add(l3);
}

// ---------------------------------------------------------------- personas
// Estilo dibujo animado: cabeza grande, ojos enormes, contorno negro y sombreado plano.
function makePerson(a = {}) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = color(a.piel, '#e3ae80'), hairC = color(a.pelo, '#5a3a24'), shirt = color(a.camiseta, '#3b68d2'),
    pants = color(a.pantalon || a['pantalón'], '#44628f'), shoes = color(a.zapatos, '#3a2a22');
  const skinShade = shade(skin, -0.12);
  const fat = !!a.gordito || a.complexion === 'gordito', musc = !!a.musculoso || a.complexion === 'fuerte', thin = a.complexion === 'delgado';
  const sx = fat ? 1.55 : musc ? 1.35 : thin ? 0.85 : 1, sz = fat ? 1.6 : musc ? 1.15 : thin ? 0.9 : 1;
  const as = fat ? 1.3 : musc ? 1.9 : thin ? 0.85 : 1;
  const fw = fat ? 1.1 : thin ? 0.94 : 1;
  const dress = !!a.vestido;

  // pieza con contorno opcional (casco invertido)
  const P = (geo, col, x, y, z, parent, ink = 0, opts = {}) => {
    const m = new THREE.Mesh(geo, opts.basic ? new THREE.MeshBasicMaterial({ color: col }) : toon(col, opts.mat));
    m.position.set(x, y, z); m.castShadow = ink > 0; parent.add(m);
    if (ink > 0) { const o = new THREE.Mesh(geo, INK); o.scale.setScalar(1 + ink); m.add(o); }
    return m;
  };
  const S = (r, col, x, y, z, sc, parent, ink = 0.07, opts) => { const sg = r >= 0.13 ? 18 : r >= 0.06 ? 11 : 8; const m = P(new THREE.SphereGeometry(r, sg, Math.max(5, Math.round(sg * 0.7))), col, x, y, z, parent, ink, opts); if (sc) m.scale.set(sc[0], sc[1], sc[2]); return m; };
  const C = (r, len, col, x, y, z, parent, ink = 0.09) => P(new THREE.CapsuleGeometry(r, len, 3, 9), col, x, y, z, parent, ink);

  // piernas finas y zapatones
  const mkLeg = (sd) => {
    const p = new THREE.Group(); p.position.set(sd * 0.075 * sx, 0.66, 0); body.add(p);
    C(0.05 * (thin ? 0.9 : fat ? 1.3 : 1), 0.42, dress ? skin : pants, 0, -0.33, 0, p, 0.12);
    S(0.075, shoes, 0, -0.62, 0.055, [1.05, 0.62, 1.9], p, 0.1);
    return p;
  };
  const legL = mkLeg(-1), legR = mkLeg(1);

  // torso
  S(0.13, dress ? shirt : pants, 0, 0.66, 0, [1.15 * sx, 0.75, 0.85 * sz], body, 0.05);
  const torso = C(0.14, 0.26, shirt, 0, 0.9, 0, body, 0.06); torso.scale.set(1.15 * sx, 1, 0.85 * sz);
  if (fat) S(0.2, shirt, 0, 0.8, 0.05, [1.3, 1.05, 1.05], body, 0.05);
  if (dress) P(new THREE.CylinderGeometry(0.15 * sx, 0.27 * sx, 0.36, 22, 1, true), shirt, 0, 0.6, 0, body, 0, { mat: { side: THREE.DoubleSide } });
  if (musc) for (const sd of [-1, 1]) S(0.07, skin, sd * 0.22 * sx, 1.07, 0, null, body, 0.09);

  // brazos y manos grandes
  const mkArm = (sd) => {
    const p = new THREE.Group(); p.position.set(sd * (0.15 * 1.15 * sx + 0.02), 1.09, 0); p.rotation.z = sd * (fat ? 0.14 : 0.06); body.add(p);
    C(0.034 * as, 0.3, musc ? skin : skin, 0, -0.19, 0, p, 0.14);
    if (!musc) C(0.048, 0.06, shirt, 0, -0.06, 0, p, 0.1);
    S(0.05 * Math.sqrt(as), skin, 0, -0.42, 0.01, [1, 1.1, 0.85], p, 0.12);
    return p;
  };
  const armL = mkArm(-1), armR = mkArm(1);

  // cabeza
  const head = new THREE.Group(); head.position.y = 1.4; body.add(head);
  const H = S(0.22, skin, 0, 0, 0, [fw, 1.04, 0.96], head, 0.045);
  for (const sd of [-1, 1]) {
    S(0.04, skin, sd * 0.215 * fw, -0.01, 0, [0.5, 1, 0.8], head, 0.14);
    S(0.07, '#ffffff', sd * 0.085 * fw, 0.04, 0.185, [1, 1.05, 0.5], head, 0.08, { basic: true });
    S(0.015, '#120c0a', sd * 0.075 * fw, 0.04, 0.215, [1, 1, 0.4], head, 0, { basic: true });
  }
  S(0.052, skinShade, 0, -0.045, 0.205, [1, 1.15, 1.1], head, 0.09);
  const smile = P(new THREE.TorusGeometry(0.06, 0.009, 6, 16, Math.PI), '#2a1512', 0, -0.075, 0.186, head, 0, { basic: true }); smile.rotation.z = Math.PI;

  // pelo
  const style = (a.peinado || 'corto').toLowerCase();
  const cap = (theta, col = hairC, r = 0.228, tilt = -0.38, ink = 0.05) => {
    const g = new THREE.SphereGeometry(r, 18, 11, 0, Math.PI * 2, 0, theta);
    const m = P(g, col, 0, 0.004, -0.006, head, ink); m.scale.set(fw, 1.04, 0.97); m.rotation.x = tilt; return m;
  };
  if (a.gorra) {
    const gc = color(a.gorra === true ? 'rojo' : a.gorra, '#d23b3b');
    cap(1.4, gc, 0.235, -0.15, 0.06);
    P(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 22, 1, false, -Math.PI / 2, Math.PI), gc, 0, 0.09, 0.15, head, 0.25);
    S(0.2, hairC, 0, -0.04, -0.05, [0.9 * fw, 0.55, 0.8], head, 0);
  } else if (style === 'largo') {
    cap(1.8); const bk = C(0.15, 0.3, hairC, 0, -0.16, -0.1, head, 0.06); bk.scale.set(1.15 * fw, 1, 0.75);
    for (const sd of [-1, 1]) C(0.045, 0.18, hairC, sd * 0.2 * fw, -0.1, -0.02, head, 0.1);
  } else if (style === 'coleta') { cap(1.75); const t = C(0.045, 0.22, hairC, 0, -0.13, -0.23, head, 0.14); t.rotation.x = -0.5; }
  else if (style === 'moño' || style === 'mono') { cap(1.75); S(0.09, hairC, 0, 0.23, -0.1, null, head, 0.1); }
  else if (style === 'rizado') { cap(1.9); for (let i = 0; i < 10; i++) { const an = i / 10 * Math.PI * 2; S(0.075, hairC, Math.cos(an) * 0.15 * fw, 0.17 + Math.sin(i * 2.3) * 0.02, Math.sin(an) * 0.15, null, head, 0.1); } }
  else if (style === 'cresta') { cap(1.0); for (let i = -1; i <= 1; i++) { const c = P(new THREE.ConeGeometry(0.06, 0.2, 8), hairC, 0, 0.27, i * 0.1, head, 0.12); c.rotation.x = i * 0.35; } }
  else if (style === 'entradas') { const r = P(new THREE.SphereGeometry(0.226, 22, 8, Math.PI, Math.PI, 1.3, 0.65), hairC, 0, 0, 0, head, 0.05); r.scale.set(fw, 1.04, 0.97); }
  else if (style !== 'calvo') cap(1.66);

  // rasgos extra
  if (a.barba) {
    const bd = P(new THREE.SphereGeometry(0.228, 22, 10, -0.45, Math.PI + 0.9, 2.08, 0.85), hairC, 0, 0, 0, head, 0.04); bd.scale.set(fw, 1.04, 0.97);
    const mo = C(0.017, 0.08, hairC, 0, -0.045, 0.205, head, 0.1); mo.rotation.z = Math.PI / 2;
  }
  if (a.gafas) {
    for (const sd of [-1, 1]) P(new THREE.TorusGeometry(0.068, 0.009, 8, 24), '#141014', sd * 0.085 * fw, 0.04, 0.215, head, 0, { basic: true });
    P(new THREE.BoxGeometry(0.05, 0.009, 0.009), '#141014', 0, 0.05, 0.225, head, 0, { basic: true });
  }
  if (a.estatura) root.scale.setScalar(a.estatura);
  root.userData = { legL, legR, armL, armR, body, head, phase: Math.random() * 6 };
  return root;
}
function animatePerson(p, moving, dt, speedMul = 1) {
  const u = p.userData;
  u.phase += dt * (moving ? 9 * speedMul : 0);
  const s = moving ? Math.sin(u.phase) * 0.7 : Math.sin(performance.now() / 900 + u.phase) * 0.02;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * 0.8; u.armR.rotation.x = s * 0.8;
  u.body.position.y = moving ? Math.abs(Math.sin(u.phase)) * 0.05 : Math.sin(performance.now() / 1300 + u.phase) * 0.006;
  u.head.rotation.y = moving ? 0 : Math.sin(performance.now() / 2500 + u.phase) * 0.15;
}

// ---------------------------------------------------------------- datos y estado
const data = await fetch('../data/personajes.json', { cache: 'no-cache' }).then((r) => r.json());
let inside = false;
const H = (x, z) => (inside ? 0 : groundH(x, z));
const player = { x: 0, z: 10.5, yaw: Math.PI, moving: false, mesh: null };
player.mesh = makePerson(data.jugador.apariencia); scene.add(player.mesh);
player.mesh.userData.isPlayer = true;
const npcs = [];
{
  const spots = [[-4, 8], [6, 9], [-12, 12], [12, 2], [-7, 0], [4, -3], [-2, -8], [8, -10], [-14, 3], [3, 12], [-9, 5], [10, -6]];
  let si = 0;
  for (const n of data.personajes || []) {
    const mesh = makePerson(n.apariencia);
    let x, z, host;
    if (n.mapa === 'bar') { x = IX; z = -3.6; host = scene; mesh.visible = false; }
    else { [x, z] = spots[si++ % spots.length]; host = world; }
    host.add(mesh);
    npcs.push({ ...n, x, z, homeX: x, homeZ: z, yaw: n.mapa === 'bar' ? 0 : Math.random() * 6.28, mesh, inBar: n.mapa === 'bar', moving: false, wait: Math.random() * 3, phase: 0 });
  }
}

// ---------------------------------------------------------------- colisiones
function pushOut(p, r, list) {
  for (const c of list) {
    if (c.t === 'c') {
      let dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); const m = r + c.r;
      if (d < m) { if (d < 1e-4) { dx = 1; dz = 0; d = 1; } p.x = c.x + (dx / d) * m; p.z = c.z + (dz / d) * m; }
    } else {
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
        else { const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, mn = Math.min(l, rr, t, b); if (mn === l) p.x = c.x0 - r; else if (mn === rr) p.x = c.x1 + r; else if (mn === t) p.z = c.z0 - r; else p.z = c.z1 + r; }
      }
    }
  }
}
function bounds(p, isInside) {
  if (isInside) { p.x = clamp(p.x, IX - 6.5, IX + 6.5); p.z = clamp(p.z, -4.6, 4.6); return; }
  p.z = clamp(p.z, -15.6, 55);
  p.x = p.z <= 16.2 ? clamp(p.x, -19.6, 19.6) : clamp(p.x, -3.1, 3.1);
}
function collide(p, r, isInside, self) {
  const list = isInside ? colInt : colExt;
  pushOut(p, r, list);
  for (const n of npcs) if (n !== self && n.inBar === isInside) pushOut(p, r, [{ t: 'c', x: n.x, z: n.z, r: 0.42 }]);
  if (self && self !== player && player.inside === isInside) pushOut(p, r, [{ t: 'c', x: player.x, z: player.z, r: 0.42 }]);
  bounds(p, isInside);
}
player.inside = false;

// ---------------------------------------------------------------- entrada
const input = { mx: 0, mz: 0, run: false };
const keys = {};
addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { pressA = true; e.preventDefault(); }
  if (e.key === 'Shift') input.run = true;
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; if (e.key === 'Shift') input.run = false; });
let pressA = false;

const stick = $('stick'), knob = $('knob');
let stickId = null, stickV = { x: 0, y: 0 };
function stickMove(e) {
  const r = stick.getBoundingClientRect(), R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const d = Math.hypot(dx, dy), k = d > R * 0.7 ? (R * 0.7) / d : 1; dx *= k; dy *= k;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  stickV = Math.hypot(dx, dy) < R * 0.12 ? { x: 0, y: 0 } : { x: dx / (R * 0.7), y: dy / (R * 0.7) };
}
stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; try { stick.setPointerCapture(e.pointerId); } catch (_) { /* nada */ } stickMove(e); e.preventDefault(); });
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stickMove(e); });
const stickEnd = (e) => { if (e.pointerId === stickId) { stickId = null; stickV = { x: 0, y: 0 }; knob.style.transform = ''; } };
stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);
function bindBtn(el, down, up) {
  el.addEventListener('pointerdown', (e) => { el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) { /* nada */ } down(); e.preventDefault(); });
  const end = () => { el.classList.remove('on'); up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
bindBtn($('btnA'), () => { pressA = true; });
bindBtn($('btnB'), () => { input.run = true; }, () => { input.run = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// cámara: arrastrar para girar
let camYaw = 0, camPitch = 0.45, camDist = 7.2;
let dragId = null, lastX = 0, lastY = 0;
stage.addEventListener('pointerdown', (e) => { if (e.target !== renderer.domElement) return; dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY; });
addEventListener('pointermove', (e) => {
  if (e.pointerId !== dragId) return;
  camYaw -= (e.clientX - lastX) * 0.007; camPitch = clamp(camPitch + (e.clientY - lastY) * 0.005, 0.08, 1.05);
  lastX = e.clientX; lastY = e.clientY;
});
addEventListener('pointerup', (e) => { if (e.pointerId === dragId) dragId = null; });
addEventListener('pointercancel', (e) => { if (e.pointerId === dragId) dragId = null; });
stage.addEventListener('wheel', (e) => { camDist = clamp(camDist + e.deltaY * 0.005, 4, 12); }, { passive: true });

// ---------------------------------------------------------------- diálogos
const dialogEl = $('dialog'), dialogText = $('dialog-text'), dialogName = $('dialog-name'), promptEl = $('prompt'), bannerEl = $('banner'), fadeEl = $('fade');
let dialog = null;
function say(pages, name = '', onEnd) {
  dialog = { pages: [].concat(pages).flatMap((p) => String(p).split('\n\n')), i: 0, shown: 0, onEnd };
  dialogName.textContent = name; dialogName.hidden = !name; dialogEl.hidden = false; dialogEl.classList.remove('done'); dialogText.textContent = '';
}
function updateDialog(dt) {
  const page = dialog.pages[dialog.i];
  if (dialog.shown < page.length) {
    dialog.shown = Math.min(page.length, dialog.shown + dt * 45 * (input.run ? 3 : 1));
    dialogText.textContent = page.slice(0, Math.floor(dialog.shown)); dialogEl.classList.toggle('done', dialog.shown >= page.length);
  }
  if (pressA) {
    if (dialog.shown < page.length) { dialog.shown = page.length; dialogText.textContent = page; dialogEl.classList.add('done'); }
    else if (dialog.i < dialog.pages.length - 1) { dialog.i++; dialog.shown = 0; dialogText.textContent = ''; dialogEl.classList.remove('done'); }
    else { const end = dialog.onEnd; dialog = null; dialogEl.hidden = true; end && end(); }
  }
}
function banner(text) { bannerEl.textContent = text; bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show'); }

// ---------------------------------------------------------------- interactuar
function nearestTarget() {
  let best = null, bd = 2.7;
  const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
  for (const n of npcs) {
    if (n.inBar !== inside) continue;
    const dx = n.x - player.x, dz = n.z - player.z, d = Math.hypot(dx, dz);
    if (d < bd && (dx * fx + dz * fz) / (d || 1) > -0.2) { bd = d; best = { npc: n }; }
  }
  if (best) return best;
  let pd = 1e9, poi = null;
  for (const p of pois) { if (!!p.inside !== inside) continue; const d = Math.hypot(p.x - player.x, p.z - player.z); if (d < p.r && d < pd) { pd = d; poi = p; } }
  return poi ? { poi } : null;
}
function talkTo(n) {
  n.yaw = Math.atan2(player.x - n.x, player.z - n.z); n.talking = true;
  const fr = n.frases && n.frases.length ? n.frases : ['...'];
  let i; do { i = Math.floor(Math.random() * fr.length); } while (fr.length > 1 && i === n.last);
  n.last = i; say(fr[i], n.nombre, () => { n.talking = false; n.wait = 1.5; });
}

// ---------------------------------------------------------------- cambio exterior / pub
let transition = null;
function goInside(v) { transition = { phase: 'out', t: 0, v }; }
function applyLocation(v) {
  needRelease = true;
  inside = v; player.inside = v;
  world.visible = !v; interior.visible = v; sun.visible = !v;
  hemi.intensity = v ? 1.35 : 2.0; hemi.color.set(v ? 0xffe6c8 : 0xdcecff); hemi.groundColor.set(v ? 0x5a4030 : 0x9a8a6a);
  scene.fog = v ? null : new THREE.Fog(FOG, 60, 190); scene.background = v ? new THREE.Color(0x1a1218) : SKY;
  if (v) { player.x = IX; player.z = 3.7; player.yaw = Math.PI; camYaw = 0; camDist = 5; camPitch = 0.4; banner('Pub Calisai'); }
  else { player.x = 18.2; player.z = PUB_Z; player.yaw = -Math.PI / 2; camYaw = Math.PI / 2; camDist = 7.2; camPitch = 0.45; banner('Plaza de Jaraíz'); }
  for (const n of npcs) if (n.inBar) n.mesh.visible = v;
}
function updateTransition(dt) {
  transition.t += dt; const D = 0.25;
  if (transition.phase === 'out') { fadeEl.style.opacity = Math.min(1, transition.t / D); if (transition.t >= D) { applyLocation(transition.v); transition.phase = 'in'; transition.t = 0; } }
  else { fadeEl.style.opacity = Math.max(0, 1 - transition.t / D); if (transition.t >= D) { transition = null; fadeEl.style.opacity = 0; } }
}

// ---------------------------------------------------------------- actualización
let time = 0;
let needRelease = false;      // tras cruzar una puerta, no se vuelve a activar hasta soltar el mando
function update(dt) {
  time += dt;
  if (transition) updateTransition(dt);
  else if (dialog) updateDialog(dt);
  else {
    // movimiento
    let jx = stickV.x, jy = stickV.y;
    if (keys['a'] || keys['arrowleft']) jx -= 1; if (keys['d'] || keys['arrowright']) jx += 1;
    if (keys['w'] || keys['arrowup']) jy -= 1; if (keys['s'] || keys['arrowdown']) jy += 1;
    const len = Math.hypot(jx, jy); if (len > 1) { jx /= len; jy /= len; }
    if (len < 0.05) needRelease = false;
    // adelante = -(sinY, cosY) ; derecha = (cosY, -sinY) ; el joystick hacia arriba es jy < 0
    const sy = Math.sin(camYaw), cy = Math.cos(camYaw);
    const dx = -sy * -jy + cy * jx, dz = -cy * -jy + -sy * jx;
    const sp = Math.hypot(dx, dz);
    player.moving = sp > 0.05;
    if (player.moving) {
      const speed = (input.run ? 5.6 : 3.3) * Math.min(1, sp);
      player.x += (dx / sp) * speed * dt; player.z += (dz / sp) * speed * dt;
      const ty = Math.atan2(dx, dz); let dy = ty - player.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); player.yaw += dy * Math.min(1, dt * 12);
      collide(player, 0.4, inside, player);
    }
    // entrar / salir del pub
    if (!needRelease && !inside && Math.hypot(player.x - 19.5, player.z - PUB_Z) < 0.9 && player.moving) goInside(true);
    if (!needRelease && inside && player.z > 4.35 && Math.abs(player.x - IX) < 1.1 && player.moving) goInside(false);
    // interactuar
    const tgt = nearestTarget();
    promptEl.hidden = !tgt;
    if (pressA && tgt) { if (tgt.npc) talkTo(tgt.npc); else say(tgt.poi.text); }
  }
  // gente
  for (const n of npcs) {
    if (n.inBar !== inside) continue;
    n.moving = false;
    if (n.pasea !== false && n.pasea && !n.talking && !dialog) {
      n.wait -= dt;
      if (n.wait <= 0) { const a = Math.random() * 6.28, r = 1 + Math.random() * 3; n.tx = n.homeX + Math.cos(a) * r; n.tz = n.homeZ + Math.sin(a) * r; n.wait = 3 + Math.random() * 4; n.walking = true; }
      if (n.walking) {
        const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
        if (d < 0.2) n.walking = false; else { n.x += (dx / d) * 1.3 * dt; n.z += (dz / d) * 1.3 * dt; n.yaw = Math.atan2(dx, dz); n.moving = true; collide(n, 0.4, n.inBar, n); }
      }
    }
    n.mesh.position.set(n.x, H(n.x, n.z) + 0, n.z); n.mesh.rotation.y = n.yaw;
    animatePerson(n.mesh, n.moving, dt, 0.6);
  }
  player.mesh.position.set(player.x, H(player.x, player.z), player.z); player.mesh.rotation.y = player.yaw;
  animatePerson(player.mesh, player.moving && !dialog, dt, input.run ? 1.5 : 1);
  pressA = false;

  // agua y nubes
  if (world.userData.water) { const k = 1 + Math.sin(time * 3) * 0.01; world.userData.water.forEach((w) => w.scale.set(k, 1, k)); world.userData.jet.scale.y = 1 + Math.sin(time * 6) * 0.08; }
  for (const c of world.userData.clouds || []) { c.position.x += dt * 0.8; if (c.position.x > 150) c.position.x = -150; }

  // cámara
  const ty = H(player.x, player.z) + 1.5;
  const cp = Math.cos(camPitch);
  let cx = player.x + Math.sin(camYaw) * cp * camDist, cz = player.z + Math.cos(camYaw) * cp * camDist, cyy = ty + Math.sin(camPitch) * camDist;
  if (inside) { cx = clamp(cx, IX - 6.6, IX + 6.6); cz = clamp(cz, -4.7, 4.9); cyy = Math.min(cyy, 2.95); }
  else cyy = Math.max(cyy, groundH(cx, cz) + 0.5);
  camera.position.set(cx, cyy, cz); camera.lookAt(player.x, ty, player.z);
  sun.target.position.set(player.x, 0, player.z); sun.position.set(player.x + 22, 40, player.z + 26);
}

// ---------------------------------------------------------------- tamaño y bucle
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w / h < 0.85 ? 72 : 58; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

let started = false, last = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (started) update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
camera.position.set(0, 6, 22); camera.lookAt(0, 1.5, 12);
requestAnimationFrame(loop);

const title = $('title');
const start = () => {
  if (started) return; started = true; title.classList.add('hide'); setTimeout(() => title.remove(), 600);
  banner('Plaza de Jaraíz');
  if (matchMedia('(pointer: coarse)').matches) { try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) { /* nada */ } }
};
title.addEventListener('pointerdown', start); addEventListener('keydown', start, { once: true });
$('title-start').textContent = 'Toca para empezar';
window.__jaraiz3d = { renderer, makePerson, world, player, npcs, THREE, scene, camera, applyLocation, cam: (y, p, d) => { camYaw = y; if (p !== undefined) camPitch = p; if (d !== undefined) camDist = d; } };   // solo para pruebas

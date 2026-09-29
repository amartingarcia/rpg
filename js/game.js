import { T, tileImage, isSolid } from './tiles.js';
import { buildCharacter } from './sprites.js';
import { buildMaps } from './maps.js';

const VIEW_TILES = 9.5;         // casillas visibles en el lado más corto de la pantalla
const WALK_TIME = 0.22;         // segundos por casilla andando
const RUN_TIME = 0.12;          // ... corriendo (mantén B)
const NPC_TIME = 0.35;
const TEXT_SPEED = 45;          // letras por segundo
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');

let maps, data, player, npcs = [], map;
let viewW = 160, viewH = 144;
let animClock = 0;
let started = false;

// ------------------------------------------------------------ entrada
const input = { dir: null, dirSince: 0, a: false, b: false, aPressed: false, bPressed: false };
const keyDirs = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
const heldKeys = [];
function setDir(d) { if (d !== input.dir) { input.dir = d; input.dirSince = performance.now(); } }
function pressA() { input.aPressed = true; }
function pressB() { input.bPressed = true; }

addEventListener('keydown', (e) => {
  if (keyDirs[e.key]) { if (!heldKeys.includes(e.key)) heldKeys.push(e.key); setDir(keyDirs[e.key]); e.preventDefault(); }
  if ((e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') && !e.repeat) { pressA(); e.preventDefault(); }
  if (e.key === 'x' || e.key === 'X' || e.key === 'Shift') { if (!e.repeat) pressB(); input.b = true; }
});
addEventListener('keyup', (e) => {
  if (keyDirs[e.key]) { heldKeys.splice(heldKeys.indexOf(e.key), 1); setDir(heldKeys.length ? keyDirs[heldKeys[heldKeys.length - 1]] : null); }
  if (e.key === 'x' || e.key === 'X' || e.key === 'Shift') input.b = false;
});

// Cruceta táctil: una sola zona, la dirección depende de dónde está el dedo
const dpad = $('dpad');
let dpadPointer = null;
function dpadMove(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.12) { setDir(null); highlight(null); return; }
  const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  setDir(d); highlight(d);
}
function highlight(d) { dpad.dataset.dir = d || ''; }
dpad.addEventListener('pointerdown', (e) => { dpadPointer = e.pointerId; dpad.setPointerCapture(e.pointerId); dpadMove(e); e.preventDefault(); });
dpad.addEventListener('pointermove', (e) => { if (e.pointerId === dpadPointer) dpadMove(e); });
const dpadEnd = (e) => { if (e.pointerId === dpadPointer) { dpadPointer = null; setDir(null); highlight(null); } };
dpad.addEventListener('pointerup', dpadEnd); dpad.addEventListener('pointercancel', dpadEnd);

function bindButton(el, down, up) {
  el.addEventListener('pointerdown', (e) => { el.classList.add('on'); el.setPointerCapture(e.pointerId); down(); e.preventDefault(); });
  const end = () => { el.classList.remove('on'); up && up(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
bindButton($('btnA'), pressA);
bindButton($('btnB'), () => { pressB(); input.b = true; }, () => { input.b = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// ------------------------------------------------------------ entidades
function makeEntity(o) {
  return {
    x: o.x, y: o.y, dir: o.mira || o.dir || 'down', frames: buildCharacter(o.apariencia),
    moving: false, fx: o.x, fy: o.y, t: 0, dur: WALK_TIME, step: 0,
    ...o,
  };
}

function entityAt(x, y) {
  if (player && ((player.x === x && player.y === y))) return player;
  return npcs.find((n) => n.mapa === map.id && n.x === x && n.y === y);
}

function canEnter(x, y) {
  const t = map.get(x, y);
  if (t === null || isSolid(t)) return false;
  return !entityAt(x, y);
}

function startMove(e, dir, dur) {
  e.dir = dir;
  const [dx, dy] = DIRS[dir];
  const nx = e.x + dx, ny = e.y + dy;
  if (!canEnter(nx, ny)) return false;
  e.fx = e.x; e.fy = e.y; e.x = nx; e.y = ny;
  e.moving = true; e.t = 0; e.dur = dur; e.step ^= 1;
  return true;
}

function updateMove(e, dt) {
  if (!e.moving) return false;
  e.t += dt;
  if (e.t >= e.dur) { e.moving = false; e.t = 0; return true; }
  return false;
}

function drawPos(e) {
  if (!e.moving) return [e.x * T, e.y * T];
  const k = e.t / e.dur;
  return [(e.fx + (e.x - e.fx) * k) * T, (e.fy + (e.y - e.fy) * k) * T];
}

function frameOf(e) {
  if (!e.moving) return e.frames[e.dir][0];
  const half = e.t / e.dur < 0.5;
  return e.frames[e.dir][half ? 1 + e.step : 0];
}

// ------------------------------------------------------------ diálogos
const dialogEl = $('dialog'), dialogText = $('dialog-text'), dialogName = $('dialog-name');
let dialog = null; // { pages, i, shown, onEnd }

function say(pages, name = '', onEnd) {
  dialog = { pages: [].concat(pages).flatMap((p) => String(p).split('\n\n')), i: 0, shown: 0, name, onEnd };
  dialogName.textContent = name;
  dialogName.hidden = !name;
  dialogEl.hidden = false;
  dialogEl.classList.remove('done');
}

function updateDialog(dt) {
  const page = dialog.pages[dialog.i];
  if (dialog.shown < page.length) {
    dialog.shown = Math.min(page.length, dialog.shown + dt * TEXT_SPEED * (input.b ? 3 : 1));
    dialogText.textContent = page.slice(0, Math.floor(dialog.shown));
    dialogEl.classList.toggle('done', dialog.shown >= page.length);
  }
  if (input.aPressed || input.bPressed) {
    if (dialog.shown < page.length) { dialog.shown = page.length; dialogText.textContent = page; dialogEl.classList.add('done'); }
    else if (dialog.i < dialog.pages.length - 1) { dialog.i++; dialog.shown = 0; dialogText.textContent = ''; dialogEl.classList.remove('done'); }
    else { const end = dialog.onEnd; dialog = null; dialogEl.hidden = true; end && end(); }
  }
}

function talkTo(n) {
  n.dir = OPP[player.dir];
  n.talking = true;
  const frases = n.frases && n.frases.length ? n.frases : ['...'];
  let i;
  do { i = Math.floor(Math.random() * frases.length); } while (frases.length > 1 && i === n.lastFrase);
  n.lastFrase = i;
  say(frases[i], n.nombre, () => { n.talking = false; n.wait = 1.5; });
}

// ------------------------------------------------------------ cambio de mapa
const fadeEl = $('fade'), bannerEl = $('banner');
let transition = null;

function goTo(mapId, x, y, dir) {
  transition = { phase: 'out', t: 0, mapId, x, y, dir };
}

function enterMap(mapId, x, y, dir, showBanner = true) {
  map = maps[mapId];
  player.x = x; player.y = y; player.dir = dir; player.moving = false;
  if (showBanner) {
    bannerEl.textContent = map.name;
    bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
  }
  save();
}

function updateTransition(dt) {
  transition.t += dt;
  const D = 0.25;
  if (transition.phase === 'out') {
    fadeEl.style.opacity = Math.min(1, transition.t / D);
    if (transition.t >= D) { enterMap(transition.mapId, transition.x, transition.y, transition.dir); transition.phase = 'in'; transition.t = 0; }
  } else {
    fadeEl.style.opacity = Math.max(0, 1 - transition.t / D);
    if (transition.t >= D) { transition = null; fadeEl.style.opacity = 0; }
  }
}

// ------------------------------------------------------------ guardar
function save() {
  try { localStorage.setItem('jaraiz-rpg', JSON.stringify({ map: map.id, x: player.x, y: player.y, dir: player.dir })); } catch (e) { /* sin guardado */ }
}
function load() {
  try { return JSON.parse(localStorage.getItem('jaraiz-rpg')); } catch (e) { return null; }
}

// ------------------------------------------------------------ lógica
function facingTile() {
  const [dx, dy] = DIRS[player.dir];
  return [player.x + dx, player.y + dy];
}

function interact() {
  let [fx, fy] = facingTile();
  // se puede hablar por encima de un mostrador
  if (map.get(fx, fy) === 'counter') { const [dx, dy] = DIRS[player.dir]; fx += dx; fy += dy; }
  const n = npcs.find((m) => m.mapa === map.id && m.x === fx && m.y === fy && !m.moving);
  if (n) return talkTo(n);
  const s = map.signs[`${fx},${fy}`];
  if (s) return say(s);
}

function updatePlayer(dt) {
  const arrived = updateMove(player, dt);
  if (arrived) {
    const w = map.warps[`${player.x},${player.y}`];
    if (w) { goTo(w.map, w.x, w.y, w.dir); return; }
  }
  if (player.moving) return;

  if (input.aPressed) { interact(); return; }

  const d = input.dir;
  if (!d) return;
  // salir de un interior pisando el felpudo hacia abajo
  const ex = map.exits[`${player.x},${player.y}`];
  if (ex && d === 'down') { player.dir = 'down'; goTo(ex.map, ex.x, ex.y, ex.dir); return; }
  // un toque corto solo gira al personaje (como en los clásicos)
  if (d !== player.dir && performance.now() - input.dirSince < 90) { player.dir = d; return; }
  if (!startMove(player, d, input.b ? RUN_TIME : WALK_TIME)) player.dir = d;
}

function updateNpcs(dt) {
  for (const n of npcs) {
    if (n.mapa !== map.id) continue;
    updateMove(n, dt);
    if (!n.pasea || n.moving || n.talking) continue;
    n.wait = (n.wait ?? Math.random() * 3) - dt;
    if (n.wait > 0) continue;
    n.wait = 1.5 + Math.random() * 3;
    const dirs = Object.keys(DIRS);
    const d = dirs[Math.floor(Math.random() * 4)];
    const [dx, dy] = DIRS[d];
    if (Math.abs(n.x + dx - n.homeX) > 2 || Math.abs(n.y + dy - n.homeY) > 2 || map.warps[`${n.x + dx},${n.y + dy}`]) { n.dir = d; continue; }
    startMove(n, d, NPC_TIME);
  }
}

function update(dt) {
  animClock += dt;
  if (transition) updateTransition(dt);
  else if (dialog) updateDialog(dt);
  else updatePlayer(dt);
  updateNpcs(dt);
  input.aPressed = false; input.bPressed = false;
}

// ------------------------------------------------------------ dibujo
function render() {
  const [px, py] = drawPos(player);
  const mw = map.w * T, mh = map.h * T;
  let cx = Math.round(px + T / 2 - viewW / 2), cy = Math.round(py + T / 2 - viewH / 2);
  cx = mw <= viewW ? Math.round((mw - viewW) / 2) : Math.max(0, Math.min(cx, mw - viewW));
  cy = mh <= viewH ? Math.round((mh - viewH) / 2) : Math.max(0, Math.min(cy, mh - viewH));

  ctx.fillStyle = '#141018';
  ctx.fillRect(0, 0, viewW, viewH);
  const frame = Math.floor(animClock * 2);
  const x0 = Math.max(0, Math.floor(cx / T)), y0 = Math.max(0, Math.floor(cy / T));
  const x1 = Math.min(map.w - 1, Math.floor((cx + viewW) / T)), y1 = Math.min(map.h - 1, Math.floor((cy + viewH) / T));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.drawImage(tileImage(map.tiles[y][x], frame), x * T - cx, y * T - cy);

  const ents = [player, ...npcs.filter((n) => n.mapa === map.id)];
  ents.sort((a, b) => drawPos(a)[1] - drawPos(b)[1]);
  for (const e of ents) {
    const [ex, ey] = drawPos(e);
    const sx = Math.round(ex - cx), sy = Math.round(ey - cy);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(sx + 8, sy + 13, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(frameOf(e), sx, sy - 3);
  }
}

// ------------------------------------------------------------ tamaño de pantalla
function resize() {
  const scr = $('screen');
  const w = scr.clientWidth, h = scr.clientHeight;
  const scale = Math.min(w, h) / (T * VIEW_TILES);
  viewW = Math.ceil(w / scale); viewH = Math.ceil(h / scale);
  canvas.width = viewW; canvas.height = viewH;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));

// ------------------------------------------------------------ arranque
let last = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0);
  last = ts;
  if (started) update(dt);
  render();
  requestAnimationFrame(loop);
}

async function init() {
  maps = buildMaps();
  data = await fetch('data/personajes.json', { cache: 'no-cache' }).then((r) => r.json());
  const j = data.jugador;
  player = makeEntity({ ...j, x: j.inicio.x, y: j.inicio.y, dir: j.inicio.mira });
  npcs = (data.personajes || []).map((p) => makeEntity({ ...p, homeX: p.x, homeY: p.y }));
  const saved = load();
  if (saved && maps[saved.map]) enterMap(saved.map, saved.x, saved.y, saved.dir, false);
  else enterMap(j.inicio.mapa, j.inicio.x, j.inicio.y, j.inicio.mira || 'down', false);
  resize();
  window.__rpg = { player, npcs, enter: (m, x, y, d) => enterMap(m, x, y, d, false) }; // solo para pruebas
  requestAnimationFrame(loop);

  const title = $('title');
  const start = () => {
    if (started) return;
    started = true;
    title.classList.add('hide');
    setTimeout(() => title.remove(), 600);
    bannerEl.textContent = map.name; bannerEl.classList.add('show');
    if (matchMedia('(pointer: coarse)').matches) {
      try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch (e) { /* nada */ }
    }
  };
  title.addEventListener('pointerdown', start);
  addEventListener('keydown', start, { once: true });
  $('title-start').textContent = 'Toca para empezar';
}

init().catch((err) => {
  console.error(err);
  $('title-start').textContent = 'Error cargando el juego: ' + err.message;
});

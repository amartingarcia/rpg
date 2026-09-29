// Casillas del mapa (16x16) dibujadas por código: nada de imágenes externas.
// Cada casilla tiene: draw(ctx, frame) y solid (si bloquea el paso).
import { shade } from './sprites.js';

export const T = 16;

// Aleatorio con semilla, para que las texturas sean siempre iguales
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const px = (c, x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

function speckle(c, base, cols, n, seed) {
  px(c, 0, 0, base, T, T);
  const r = rng(seed);
  for (let i = 0; i < n; i++) px(c, Math.floor(r() * T), Math.floor(r() * T), cols[Math.floor(r() * cols.length)]);
}

// ---------- suelos exteriores ----------
function grass(c) {
  speckle(c, '#7cc35f', ['#6fb354', '#8ed06f', '#68a84e'], 26, 7);
  px(c, 3, 4, '#5f9d46'); px(c, 3, 3, '#5f9d46'); px(c, 11, 10, '#5f9d46'); px(c, 11, 9, '#5f9d46'); px(c, 12, 10, '#5f9d46');
}
function flowers(c) {
  grass(c);
  const f = [[3, 3, '#ffffff'], [11, 5, '#f2d64b'], [6, 11, '#ef7b9b'], [13, 13, '#ffffff'], [9, 9, '#f2d64b']];
  for (const [x, y, col] of f) { px(c, x, y, col); px(c, x - 1, y, shade(col, -0.2)); px(c, x + 1, y, shade(col, -0.2)); px(c, x, y - 1, shade(col, -0.2)); px(c, x, y + 1, '#4f8a3a'); }
}
function path(c) {
  px(c, 0, 0, '#cbb48c', T, T);
  const stones = [[1, 1, 6, 4], [8, 1, 7, 5], [1, 6, 4, 5], [6, 7, 5, 4], [12, 7, 3, 4], [1, 12, 7, 3], [9, 12, 6, 3]];
  for (const [x, y, w, h] of stones) { px(c, x, y, '#bda37a', w, h); px(c, x, y, '#d8c49d', w, 1); px(c, x, y + h - 1, '#a88f67', w, 1); }
}
function plaza(c) {
  px(c, 0, 0, '#c9c2b3', T, T);
  px(c, 0, 0, '#aea696', T, 1); px(c, 0, 8, '#aea696', T, 1);
  px(c, 0, 0, '#aea696', 1, 8); px(c, 8, 8, '#aea696', 1, 8);
  const r = rng(3); for (let i = 0; i < 10; i++) px(c, Math.floor(r() * T), Math.floor(r() * T), '#d8d2c5');
}
function sand(c) { speckle(c, '#ecdca6', ['#dfcc92', '#f6e9bd'], 22, 11); }
function soil(c) {
  px(c, 0, 0, '#8a5d3b', T, T);
  for (let y = 2; y < T; y += 5) { px(c, 0, y, '#744b2e', T, 1); px(c, 0, y + 1, '#9c6c47', T, 1); }
}
function water(c, f) {
  px(c, 0, 0, '#3f9bd6', T, T);
  const o = f % 2 ? 3 : 0;
  for (const [x, y] of [[2, 3], [9, 7], [4, 12], [12, 13]]) { px(c, (x + o) % 14, y, '#8ccbf0', 3, 1); px(c, (x + o + 1) % 14, y - 1, '#b9e1f7', 1, 1); }
}

// ---------- decorado exterior ----------
function tree(c) {
  grass(c);
  px(c, 6, 11, '#6b4428', 4, 4); px(c, 7, 11, '#825634', 1, 4);
  const canopy = [[4, 1, 8, 1], [2, 2, 12, 1], [1, 3, 14, 6], [2, 9, 12, 1], [4, 10, 8, 1]];
  for (const [x, y, w, h] of canopy) px(c, x, y, '#2f7a3a', w, h);
  px(c, 3, 3, '#3f9449', 6, 3); px(c, 4, 2, '#4ca656', 4, 2); px(c, 10, 6, '#246630', 3, 3);
  px(c, 1, 3, '#1c4f25', 1, 6); px(c, 14, 3, '#1c4f25', 1, 6);
}
function rock(c) {
  sand(c);
  px(c, 3, 6, '#7d7c7a', 10, 7); px(c, 4, 5, '#8f8e8b', 8, 1); px(c, 4, 6, '#a3a29e', 5, 2); px(c, 3, 12, '#5d5c5a', 10, 1);
}
function rockWater(c, f) {
  water(c, f);
  px(c, 3, 5, '#7d7c7a', 10, 7); px(c, 4, 4, '#8f8e8b', 8, 1); px(c, 4, 5, '#a3a29e', 5, 2); px(c, 2, 11, '#b9e1f7', 12, 1);
}
function fence(c) {
  grass(c);
  px(c, 0, 6, '#8a6038', T, 2); px(c, 0, 10, '#8a6038', T, 2);
  px(c, 2, 4, '#6e4a2a', 2, 10); px(c, 12, 4, '#6e4a2a', 2, 10);
}
function sign(c) {
  path(c);
  px(c, 7, 9, '#6e4a2a', 2, 6);
  px(c, 2, 2, '#6e4a2a', 12, 8); px(c, 3, 3, '#c79a5d', 10, 6);
  px(c, 4, 4, '#6e4a2a', 8, 1); px(c, 4, 6, '#6e4a2a', 6, 1);
}
function bench(c) {
  plaza(c);
  px(c, 1, 6, '#7a4f2c', 14, 2); px(c, 1, 9, '#8e5f37', 14, 3); px(c, 1, 9, '#a8743f', 14, 1);
  px(c, 2, 12, '#3b3b3b', 2, 3); px(c, 12, 12, '#3b3b3b', 2, 3);
}
function fountain(c, f) {
  plaza(c);
  px(c, 1, 4, '#8f8a80', 14, 10); px(c, 2, 5, '#a8a398', 12, 1);
  px(c, 3, 6, f % 2 ? '#4aa6de' : '#3f9bd6', 10, 6);
  px(c, 7, 1, '#8f8a80', 2, 7);
  px(c, 6, 1, '#b9e1f7', 1, 1); px(c, 9, 1, '#b9e1f7', 1, 1); px(c, f % 2 ? 5 : 10, 7, '#b9e1f7', 1, 1);
}
// Picota o Rollo de Jaraíz (1689), coronado con lobos
function rollo(c) {
  plaza(c);
  px(c, 3, 13, '#8f8a80', 10, 2); px(c, 4, 12, '#a8a398', 8, 1);
  px(c, 6, 3, '#b3ad9f', 4, 9); px(c, 6, 3, '#cfc9bb', 1, 9); px(c, 9, 3, '#8f8a80', 1, 9);
  px(c, 4, 2, '#8f8a80', 8, 2);
  px(c, 4, 0, '#5b5550', 2, 2); px(c, 10, 0, '#5b5550', 2, 2); px(c, 7, 0, '#5b5550', 2, 2);
}
function pepper(c) {
  soil(c);
  px(c, 3, 3, '#2f7a3a', 10, 9); px(c, 4, 2, '#3f9449', 8, 2); px(c, 2, 6, '#2f7a3a', 12, 4);
  for (const [x, y] of [[4, 6], [8, 4], [11, 8], [6, 9], [9, 10]]) { px(c, x, y, '#d8262a', 2, 3); px(c, x, y, '#f05a4f', 1, 1); }
}
function lamp(c) {
  plaza(c);
  px(c, 7, 4, '#2f2f33', 2, 11); px(c, 5, 14, '#2f2f33', 6, 1);
  px(c, 5, 0, '#2f2f33', 6, 1); px(c, 5, 1, '#f5de8a', 6, 3); px(c, 5, 4, '#2f2f33', 6, 1);
}

// ---------- edificios ----------
function roof(c, base) {
  px(c, 0, 0, base, T, T);
  for (let y = 0; y < T; y += 4) {
    px(c, 0, y + 3, shade(base, -0.3), T, 1);
    for (let x = (y / 4) % 2 ? 0 : 2; x < T; x += 4) px(c, x, y, shade(base, 0.2), 2, 1);
  }
}
function roofEdge(c, base) { roof(c, base); px(c, 0, 13, shade(base, -0.45), T, 3); px(c, 0, 13, shade(base, -0.2), T, 1); }
// Pared encalada con entramado de madera, típica de La Vera
function wallWhite(c) {
  px(c, 0, 0, '#f1ece0', T, T);
  px(c, 0, 0, '#7a5233', T, 2); px(c, 0, 0, '#7a5233', 2, T);
  px(c, 0, 15, '#cfc6b3', T, 1);
  const r = rng(5); for (let i = 0; i < 6; i++) px(c, 3 + Math.floor(r() * 12), 3 + Math.floor(r() * 11), '#e2dccd');
}
function winWhite(c) {
  wallWhite(c);
  px(c, 4, 4, '#5a3a22', 8, 9); px(c, 5, 5, '#8fc6e8', 6, 7); px(c, 7, 5, '#5a3a22', 2, 7); px(c, 5, 8, '#5a3a22', 6, 1);
  px(c, 3, 12, '#7a5233', 10, 2); // balcón de madera
  for (let x = 4; x < 12; x += 2) px(c, x, 11, '#7a5233', 1, 1);
}
function doorWood(c) {
  wallWhite(c);
  px(c, 4, 3, '#4a2f1b', 8, 13); px(c, 5, 4, '#8b5a32', 6, 12); px(c, 5, 4, '#a06a3c', 6, 1);
  px(c, 7, 4, '#6e4526', 1, 12); px(c, 9, 10, '#f0c93a', 1, 1);
}
function doorClosed(c) { doorWood(c); px(c, 5, 8, '#6e4526', 6, 1); }
function wallStone(c) {
  px(c, 0, 0, '#b8a888', T, T);
  for (let y = 0; y < T; y += 4) {
    px(c, 0, y + 3, '#8e7f63', T, 1);
    for (let x = (y / 4) % 2 ? 0 : 4; x < T; x += 8) px(c, x, y, '#8e7f63', 1, 3);
  }
}
function winStone(c) {
  wallStone(c);
  px(c, 5, 3, '#5d523f', 6, 11); px(c, 6, 2, '#5d523f', 4, 1);
  px(c, 6, 4, '#4f7fb0', 4, 9); px(c, 7, 3, '#4f7fb0', 2, 1); px(c, 7, 6, '#e6c35c', 2, 2);
}
function doorChurch(c) {
  wallStone(c);
  px(c, 2, 3, '#5d523f', 12, 13); px(c, 4, 1, '#5d523f', 8, 2);
  px(c, 3, 4, '#6e4526', 10, 12); px(c, 5, 2, '#6e4526', 6, 2); px(c, 8, 3, '#4a2f1b', 1, 13);
}
function tower(c) {
  wallStone(c);
  px(c, 4, 2, '#3d352a', 8, 11); px(c, 5, 1, '#3d352a', 6, 1);
  px(c, 6, 4, '#d9a93a', 4, 5); px(c, 5, 8, '#d9a93a', 6, 1); px(c, 7, 9, '#9c7424', 2, 1);
}
function wallBrick(c) {
  px(c, 0, 0, '#a4553a', T, T);
  for (let y = 0; y < T; y += 3) {
    px(c, 0, y + 2, '#7d3f2a', T, 1);
    for (let x = (y / 3) % 2 ? 0 : 3; x < T; x += 6) px(c, x, y, '#7d3f2a', 1, 2);
  }
  // huecos de ventilación del secadero de pimentón
  for (const [x, y] of [[2, 3], [8, 3], [5, 9], [11, 9]]) px(c, x, y, '#3a1f16', 3, 2);
}
function doorBrick(c) {
  wallBrick(c); px(c, 4, 4, '#4a2f1b', 8, 12); px(c, 5, 5, '#6e4526', 6, 11);
}
function awning(c) { // toldo del bar
  wallWhite(c);
  for (let x = 0; x < T; x += 4) { px(c, x, 0, '#d23b3b', 2, 6); px(c, x + 2, 0, '#f1ece0', 2, 6); }
  px(c, 0, 6, '#a82c2c', T, 1);
  px(c, 4, 8, '#5a3a22', 8, 7); px(c, 5, 9, '#8fc6e8', 6, 5);
}

// ---------- interiores ----------
function floorWood(c) {
  px(c, 0, 0, '#b98553', T, T);
  for (let y = 0; y < T; y += 4) { px(c, 0, y + 3, '#946338', T, 1); px(c, (y * 3) % 16, y, '#946338', 1, 3); }
}
function floorTile(c) {
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) px(c, x * 8, y * 8, (x + y) % 2 ? '#e7dfcf' : '#c9433a', 8, 8);
}
function floorStone(c) { plaza(c); }
function wallIn(c) {
  px(c, 0, 0, '#e9dcc2', T, 11); px(c, 0, 11, '#8b5a32', T, 5); px(c, 0, 11, '#a06a3c', T, 1); px(c, 0, 15, '#5a3a22', T, 1);
}
function wallInPic(c) { wallIn(c); px(c, 4, 2, '#6e4526', 8, 7); px(c, 5, 3, '#7ec1ec', 6, 3); px(c, 5, 6, '#7cc35f', 6, 2); }
function wallInShelf(c) {
  wallIn(c); px(c, 1, 3, '#6e4526', 14, 1); px(c, 1, 8, '#6e4526', 14, 1);
  for (let x = 2; x < 14; x += 3) { px(c, x, 0, ['#3f9a4a', '#8a2432', '#e6c35c', '#3b68d2'][x % 4], 2, 3); px(c, x, 5, ['#8a2432', '#3f9a4a', '#d9c29a', '#8a4fc4'][x % 4], 2, 3); }
}
function wallInStone(c) { wallStone(c); px(c, 0, 14, '#5d523f', T, 2); }
function counter(c) {
  floorWood(c); px(c, 0, 2, '#5a3a22', T, 12); px(c, 0, 2, '#8b5a32', T, 3); px(c, 0, 5, '#6e4526', T, 1);
}
function table(c) {
  floorWood(c); px(c, 2, 3, '#6e4526', 12, 9); px(c, 2, 3, '#a06a3c', 12, 7); px(c, 3, 12, '#4a2f1b', 2, 3); px(c, 11, 12, '#4a2f1b', 2, 3);
  px(c, 5, 5, '#ffffff', 3, 2); px(c, 9, 6, '#e6c35c', 2, 2);
}
function stool(c) { floorWood(c); px(c, 5, 5, '#8a2432', 6, 4); px(c, 6, 9, '#3b3b3b', 1, 5); px(c, 9, 9, '#3b3b3b', 1, 5); }
function barrel(c) {
  floorWood(c); px(c, 3, 2, '#7a4f2c', 10, 13); px(c, 2, 4, '#7a4f2c', 12, 9);
  px(c, 2, 5, '#3b3b3b', 12, 1); px(c, 2, 11, '#3b3b3b', 12, 1); px(c, 5, 2, '#9c6a3d', 2, 13);
}
function pew(c) {
  floorStone(c); px(c, 0, 4, '#5a3a22', T, 3); px(c, 0, 8, '#7a4f2c', T, 4); px(c, 0, 8, '#9c6a3d', T, 1); px(c, 1, 12, '#4a2f1b', 2, 3); px(c, 13, 12, '#4a2f1b', 2, 3);
}
function carpet(c) { px(c, 0, 0, '#9a2231', T, T); px(c, 1, 0, '#c9a13a', 1, T); px(c, 14, 0, '#c9a13a', 1, T); }
function altar(c) {
  carpet(c); px(c, 1, 4, '#f1ece0', 14, 10); px(c, 1, 4, '#c9a13a', 14, 2); px(c, 7, 0, '#c9a13a', 2, 5); px(c, 5, 1, '#c9a13a', 6, 1);
}
// retablo barroco dorado (Santa María de Altagracia)
function retablo(c) {
  px(c, 0, 0, '#8e6a1f', T, T); px(c, 1, 1, '#d9a93a', 14, 14);
  px(c, 5, 3, '#6b4d16', 6, 10); px(c, 6, 4, '#4f7fb0', 4, 7); px(c, 7, 5, '#f6d4b6', 2, 2);
  px(c, 2, 2, '#f5de8a', 1, 12); px(c, 13, 2, '#f5de8a', 1, 12);
}
function vitrina(c) {
  floorTile(c); px(c, 1, 3, '#5a3a22', 14, 12); px(c, 2, 4, '#cfe8f2', 12, 7);
  for (const [x, col] of [[3, '#d8262a'], [6, '#e6c35c'], [9, '#d8262a'], [12, '#3f9a4a']]) { px(c, x, 7, col, 2, 4); px(c, x, 6, '#9c9c9c', 2, 1); }
}
function sack(c) { floorTile(c); px(c, 3, 4, '#c9a86b', 10, 11); px(c, 4, 3, '#b28f55', 8, 2); px(c, 4, 6, '#d8262a', 8, 4); px(c, 5, 7, '#f05a4f', 3, 1); }
function bed(c) { floorWood(c); px(c, 2, 1, '#5a3a22', 12, 14); px(c, 3, 2, '#ffffff', 10, 4); px(c, 3, 6, '#3b68d2', 10, 8); px(c, 3, 6, '#7ea0e6', 10, 1); }
function desk(c) { floorWood(c); px(c, 1, 3, '#5a3a22', 14, 10); px(c, 1, 3, '#8b5a32', 14, 6); px(c, 4, 4, '#ffffff', 4, 3); px(c, 10, 4, '#2f2f33', 2, 3); }
function plant(c) { floorWood(c); px(c, 5, 10, '#a4553a', 6, 5); px(c, 3, 2, '#2f7a3a', 10, 8); px(c, 5, 1, '#3f9449', 6, 3); px(c, 4, 4, '#4ca656', 3, 3); }
function rug(c) { floorWood(c); px(c, 1, 1, '#8a2432', 14, 14); px(c, 3, 3, '#e6c35c', 10, 10); px(c, 5, 5, '#8a2432', 6, 6); }
function exitMat(c) { floorWood(c); px(c, 2, 4, '#3f9a4a', 12, 9); px(c, 3, 5, '#56b262', 10, 7); px(c, 6, 7, '#f1ece0', 4, 1); px(c, 6, 9, '#f1ece0', 4, 1); }
function wallCases(c) {
  wallIn(c);
  const cols = ['#d23b3b', '#3b68d2', '#f0c93a', '#3f9a4a', '#8a4fc4', '#ef8fb7', '#ec8a2c', '#7ec1ec'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const col = cols[(i * 3 + j * 5) % cols.length];
    px(c, 1 + i * 4, 1 + j * 5, '#2a1d1a', 3, 5); px(c, 1 + i * 4, 1 + j * 5, col, 3, 4); px(c, 2 + i * 4, 2 + j * 5, shade(col, 0.4), 1, 1);
  }
}
function rack(c) {
  floorWood(c); px(c, 2, 1, '#5a3a22', 12, 14);
  const cols = ['#d23b3b', '#3b68d2', '#f0c93a', '#3f9a4a', '#8a4fc4', '#ef8fb7'];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { px(c, 3 + i * 3, 2 + j * 4, cols[(i + j * 2) % cols.length], 2, 3); }
}
function wallDark(c) { px(c, 0, 0, '#3a2438', T, T); px(c, 0, 11, '#24162a', T, 5); px(c, 0, 0, '#4a2f47', T, 1); }
function screen(c) { px(c, 0, 0, '#3a2438', T, T); px(c, 0, 1, '#eeeeee', T, 13); px(c, 0, 1, '#cfd8e8', T, 2); px(c, 0, 13, '#bcc4d4', T, 1); }
function seat(c) { floorDark(c); px(c, 2, 5, '#a82c2c', 12, 8); px(c, 3, 2, '#8a2432', 10, 5); px(c, 2, 12, '#6a1a24', 12, 1); }
function floorDark(c) { px(c, 0, 0, '#5a2a3a', T, T); px(c, 0, 8, '#4d2331', T, 1); px(c, 8, 0, '#4d2331', 1, 8); }
function popcorn(c) { floorDark(c); px(c, 0, 4, '#8a2432', T, 11); px(c, 0, 4, '#c9433a', T, 3); px(c, 4, 1, '#ffffff', 8, 4); for (let i = 0; i < 4; i++) px(c, 5 + i * 2, 0, '#f5de8a', 2, 2); px(c, 4, 1, '#d23b3b', 1, 4); px(c, 11, 1, '#d23b3b', 1, 4); }
function black(c) { px(c, 0, 0, '#141018', T, T); }

// ---------- registro ----------
const TILES = {
  grass: { draw: grass }, flowers: { draw: flowers }, path: { draw: path }, plaza: { draw: plaza },
  sand: { draw: sand }, soil: { draw: soil },
  water: { draw: water, solid: true, anim: 2 }, tree: { draw: tree, solid: true },
  rock: { draw: rock, solid: true }, rockw: { draw: rockWater, solid: true, anim: 2 },
  fence: { draw: fence, solid: true }, sign: { draw: sign, solid: true }, bench: { draw: bench, solid: true },
  fountain: { draw: fountain, solid: true, anim: 2 }, rollo: { draw: rollo, solid: true },
  pepper: { draw: pepper, solid: true }, lamp: { draw: lamp, solid: true },
  roof_red: { draw: (c) => roof(c, '#c4553a'), solid: true }, roof_red_e: { draw: (c) => roofEdge(c, '#c4553a'), solid: true },
  roof_slate: { draw: (c) => roof(c, '#6f7280'), solid: true }, roof_slate_e: { draw: (c) => roofEdge(c, '#6f7280'), solid: true },
  wall: { draw: wallWhite, solid: true }, win: { draw: winWhite, solid: true },
  door: { draw: doorWood }, door_closed: { draw: doorClosed, solid: true },
  wall_stone: { draw: wallStone, solid: true }, win_stone: { draw: winStone, solid: true },
  door_church: { draw: doorChurch }, tower: { draw: tower, solid: true },
  wall_brick: { draw: wallBrick, solid: true }, door_brick: { draw: doorBrick, solid: true },
  awning: { draw: awning, solid: true },
  floor: { draw: floorWood }, floor_tile: { draw: floorTile }, floor_stone: { draw: floorStone },
  wall_in: { draw: wallIn, solid: true }, wall_pic: { draw: wallInPic, solid: true }, wall_shelf: { draw: wallInShelf, solid: true },
  wall_in_stone: { draw: wallInStone, solid: true },
  counter: { draw: counter, solid: true }, table: { draw: table, solid: true }, stool: { draw: stool },
  barrel: { draw: barrel, solid: true }, pew: { draw: pew, solid: true }, carpet: { draw: carpet },
  altar: { draw: altar, solid: true }, retablo: { draw: retablo, solid: true },
  vitrina: { draw: vitrina, solid: true }, sack: { draw: sack, solid: true },
  bed: { draw: bed, solid: true }, desk: { draw: desk, solid: true }, plant: { draw: plant, solid: true },
  wall_cases: { draw: wallCases, solid: true }, rack: { draw: rack, solid: true },
  wall_dark: { draw: wallDark, solid: true }, screen: { draw: screen, solid: true }, seat: { draw: seat, solid: true },
  floor_dark: { draw: floorDark }, popcorn: { draw: popcorn, solid: true },
  rug: { draw: rug }, exit: { draw: exitMat }, black: { draw: black, solid: true },
};

// Pre-renderiza cada casilla (y sus frames de animación) una sola vez
const cache = {};
export function tileImage(id, frame = 0) {
  const def = TILES[id] || TILES.black;
  const f = def.anim ? frame % def.anim : 0;
  const key = id + ':' + f;
  if (!cache[key]) {
    const cv = document.createElement('canvas');
    cv.width = T; cv.height = T;
    def.draw(cv.getContext('2d'), f);
    cache[key] = cv;
  }
  return cache[key];
}
export function isSolid(id) { return !!(TILES[id] || TILES.black).solid; }
export function tileExists(id) { return !!TILES[id]; }

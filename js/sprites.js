// Generador de sprites de personajes (pixel art 16x16) a partir de su "apariencia".
// Nada de imágenes externas: cada personaje se dibuja a partir de plantillas + colores.

const COLORES = {
  // piel
  clara: '#f6d4b6', media: '#e3ae80', morena: '#bb7d4d', oscura: '#7b4b2b',
  // pelo
  negro: '#2b2224', castano: '#6b4128', 'castaño': '#6b4128', rubio: '#e6c35c',
  pelirrojo: '#c4502a', canoso: '#a9a6a3', blanco: '#eeeeee', gris: '#8f8f93',
  // ropa
  rojo: '#d23b3b', azul: '#3b68d2', celeste: '#7ec1ec', verde: '#3f9a4a',
  amarillo: '#f0c93a', naranja: '#ec8a2c', morado: '#8a4fc4', rosa: '#ef8fb7',
  marron: '#7a5233', 'marrón': '#7a5233', beige: '#d9c29a', vaquero: '#44628f',
  granate: '#8a2432', caqui: '#8f8a55',
};

export function color(c, fallback = '#888') {
  if (!c) return fallback;
  if (c.startsWith('#')) return c;
  return COLORES[c.toLowerCase()] || fallback;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
}
export { shade };

// Leyenda: . vacío | K contorno | H pelo | h pelo sombra | S piel | s piel sombra | E ojo
//          T camiseta | t camiseta sombra | P pantalón | B zapato
const DOWN = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KHSSSSSSHK...',
  '...KSSESSESSK...',
  '...KSSSSSSSSK...',
  '....KsSSSSsK....',
  '...KKTTTTTTKK...',
  '..KSKTTTTTTKSK..',
  '..KSKtTTTTtKSK..',
  '...KKPPPPPPKK...',
  '....KPPKKPPK....',
  '....KBBKKBBK....',
  '................',
];
const UP = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KhHHHHHHhK...',
  '....KShhhhSK....',
  '...KKTTTTTTKK...',
  '..KSKTTTTTTKSK..',
  '..KSKtTTTTtKSK..',
  '...KKPPPPPPKK...',
  '....KPPKKPPK....',
  '....KBBKKBBK....',
  '................',
];
const LEFT = [
  '................',
  '.....KKKKKK.....',
  '....KHHHHHHK....',
  '...KHHHHHHHHK...',
  '...KHHHHHHHHK...',
  '...KSSSSHHHHK...',
  '...KSESSSHHHK...',
  '...KSSSSSShHK...',
  '....KsSSSSsK....',
  '....KKTTTTKK....',
  '....KTTTSTTK....',
  '....KtTTStTK....',
  '....KKPPPPKK....',
  '.....KPPPPK.....',
  '.....KBBBBK.....',
  '................',
];

// Piernas para la animación de andar (filas 13 y 14)
const LEGS = {
  down: [
    ['....KPPKKPPK....', '....KBBKKBBK....'],
    ['....KPPKKBBK....', '....KBBK.KK.....'],
    ['....KBBKKPPK....', '.....KK.KBBK....'],
  ],
  left: [
    ['.....KPPPPK.....', '.....KBBBBK.....'],
    ['....KPPK.KPK....', '...KBBK...KBK...'],
    ['.....KPKKPPK....', '....KBK..KBBK...'],
  ],
};

function grid(rows) { return rows.map((r) => r.split('')); }

function applyHair(g, dir, estilo) {
  const set = (x, y, c) => { if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = c; };
  const get = (x, y) => g[y] && g[y][x];
  switch (estilo) {
    case 'calvo':
      for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) {
        if (get(x, y) === 'H') set(x, y, 'S');
        if (get(x, y) === 'h') set(x, y, 's');
      }
      break;
    case 'largo':
      if (dir === 'down') { for (let y = 5; y <= 9; y++) { set(4, y, 'H'); set(11, y, 'H'); } for (let y = 8; y <= 10; y++) { set(3, y, 'K'); set(12, y, 'K'); } set(4, 10, 'H'); set(11, 10, 'H'); }
      if (dir === 'up') { for (let y = 8; y <= 10; y++) for (let x = 4; x <= 11; x++) set(x, y, 'H'); for (let y = 8; y <= 10; y++) { set(3, y, 'K'); set(12, y, 'K'); } set(4, 11, 'h'); set(11, 11, 'h'); for (let x = 5; x <= 10; x++) set(x, 11, 'h'); }
      if (dir === 'left') { for (let y = 5; y <= 10; y++) { set(9, y, 'H'); set(10, y, 'H'); set(11, y, 'H'); set(12, y, 'K'); } }
      break;
    case 'coleta':
      if (dir === 'up') { set(7, 8, 'H'); set(8, 8, 'H'); set(7, 9, 'H'); set(8, 9, 'H'); set(7, 10, 'h'); set(8, 10, 'h'); }
      if (dir === 'left') { set(12, 5, 'H'); set(13, 5, 'K'); set(12, 6, 'H'); set(13, 6, 'H'); set(14, 6, 'K'); set(13, 7, 'H'); set(14, 7, 'K'); set(13, 8, 'K'); }
      if (dir === 'down') { set(12, 4, 'H'); set(13, 4, 'K'); set(12, 5, 'H'); set(13, 5, 'K'); }
      break;
    case 'mono': case 'moño':
      set(6, 0, 'K'); set(7, 0, 'H'); set(8, 0, 'H'); set(9, 0, 'K');
      break;
    case 'rizado':
      for (let x = 5; x <= 10; x++) set(x, 1, x % 2 ? 'H' : 'K');
      set(4, 1, 'K'); set(11, 1, 'K'); set(5, 0, 'K'); set(7, 0, 'K'); set(9, 0, 'K');
      set(3, 2, 'K'); set(12, 2, 'K'); set(4, 2, 'H'); set(11, 2, 'H');
      break;
    case 'cresta':
      for (let x = 5; x <= 10; x++) if (x < 7 || x > 8) { set(x, 1, '.'); }
      set(4, 2, '.'); set(11, 2, '.');
      set(5, 2, 'K'); set(10, 2, 'K'); set(6, 1, 'K'); set(9, 1, 'K'); set(7, 0, 'K'); set(8, 0, 'K'); set(7, 1, 'H'); set(8, 1, 'H');
      for (let y = 3; y <= 4; y++) { set(4, y, 's'); set(11, y, 's'); }
      break;
    default: break; // corto
  }
}

function applyExtras(g, dir, a) {
  const set = (x, y, c) => { if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = c; };
  if (a.barba) {
    if (dir === 'down') { for (let x = 4; x <= 11; x++) { if (g[7][x] === 'S') g[7][x] = 'Z'; if (g[8][x] === 'S' || g[8][x] === 's') g[8][x] = 'Z'; } g[7][4] = 'Z'; g[7][11] = 'Z'; g[7][7] = 'M'; g[7][8] = 'M'; }
    if (dir === 'left') { for (let x = 4; x <= 8; x++) { if (g[7][x] === 'S') g[7][x] = 'Z'; } for (let x = 5; x <= 9; x++) if (g[8][x] !== 'K') g[8][x] = 'Z'; g[7][5] = 'M'; }
  }
  if (a.gafas) {
    if (dir === 'down') { set(4, 6, 'K'); set(5, 6, 'G'); set(6, 6, 'G'); set(7, 6, 'K'); set(8, 6, 'K'); set(9, 6, 'G'); set(10, 6, 'G'); set(11, 6, 'K'); }
    if (dir === 'left') { set(4, 6, 'G'); set(5, 6, 'G'); set(6, 6, 'K'); set(7, 6, 'K'); set(8, 6, 'K'); }
  }
  if (a.gorra) {
    for (let y = 1; y <= 4; y++) for (let x = 0; x < 16; x++) if ('Hh'.includes(g[y][x])) g[y][x] = 'C';
    if (dir === 'down') { for (let x = 3; x <= 12; x++) set(x, 4, 'c'); set(2, 4, 'K'); set(13, 4, 'K'); }
    if (dir === 'left') { set(1, 4, 'K'); set(2, 4, 'c'); set(3, 4, 'c'); set(4, 4, 'c'); set(5, 4, 'c'); }
    if (dir === 'up') { for (let x = 4; x <= 11; x++) set(x, 4, 'c'); }
  }
  if (a.vestido) {
    // falda: el pantalón se convierte en tela de la camiseta
    for (let y = 12; y <= 13; y++) for (let x = 0; x < 16; x++) if (g[y][x] === 'P') g[y][x] = y === 12 ? 'T' : 't';
  }
}

function widen(g, rows) {
  for (const y of rows) {
    const r = g[y];
    r.splice(8, 0, r[8]); r.splice(7, 0, r[7]); r.shift(); r.pop();
  }
}

function applyBody(g, dir, a) {
  if (a.gordito) widen(g, [9, 10, 11, 12]);
  if (a.musculoso) {
    if (dir === 'left') { widen(g, [9, 10, 11]); return; }
    for (const y of [10, 11]) { g[y][1] = 'K'; g[y][2] = 'S'; g[y][3] = 'S'; g[y][12] = 'S'; g[y][13] = 'S'; g[y][14] = 'K'; }
    g[9][2] = 'K'; g[9][3] = 'S'; g[9][12] = 'S'; g[9][13] = 'K';
    g[12][2] = '.'; g[12][13] = '.';
  }
}

function paint(g, a) {
  const piel = color(a.piel, COLORES.clara);
  const pelo = color(a.pelo, COLORES.castano);
  const cam = color(a.camiseta, COLORES.azul);
  const pan = color(a.pantalon || a['pantalón'], COLORES.vaquero);
  const zap = color(a.zapatos, '#3a2a22');
  const gorra = color(a.gorra === true ? 'rojo' : a.gorra, COLORES.rojo);
  const pal = {
    K: '#2a1d1a', H: pelo, h: shade(pelo, -0.25), S: piel, s: shade(piel, -0.15), E: '#1d1520',
    T: cam, t: shade(cam, -0.25), P: pan, B: zap, G: '#bfe3f2', Z: shade(pelo, -0.1), M: shade(piel, -0.3),
    C: gorra, c: shade(gorra, -0.3),
  };
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 16;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ch = g[y][x];
    if (ch === '.' || !pal[ch]) continue;
    ctx.fillStyle = pal[ch];
    ctx.fillRect(x, y, 1, 1);
  }
  return cv;
}

function mirror(src) {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 16;
  const ctx = cv.getContext('2d');
  ctx.translate(16, 0); ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return cv;
}

// Devuelve { down:[f0,f1,f2], up:[...], left:[...], right:[...] }
export function buildCharacter(apariencia = {}) {
  const a = apariencia;
  const estilo = (a.peinado || 'corto').toLowerCase();
  const frames = {};
  for (const dir of ['down', 'up', 'left']) {
    const base = dir === 'down' ? DOWN : dir === 'up' ? UP : LEFT;
    frames[dir] = [0, 1, 2].map((f) => {
      const g = grid(base);
      const legs = LEGS[dir === 'left' ? 'left' : 'down'][f];
      g[13] = legs[0].split(''); g[14] = legs[1].split('');
      applyHair(g, dir, estilo);
      applyExtras(g, dir, a);
      applyBody(g, dir, a);
      return paint(g, a);
    });
  }
  frames.right = frames.left.map(mirror);
  return frames;
}

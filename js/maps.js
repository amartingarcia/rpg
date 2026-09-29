// Mapas: el pueblo (Jaraíz de la Vera) y los interiores.
// Se construyen por código para que sea fácil mover edificios: cambia las coordenadas y listo.

function blank(w, h, fill) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => fill));
}

function makeMap(id, name, w, h, fill) {
  const m = { id, name, w, h, tiles: blank(w, h, fill), warps: {}, signs: {}, exits: {} };
  m.set = (x, y, t) => { if (x >= 0 && y >= 0 && x < w && y < h) m.tiles[y][x] = t; };
  m.get = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? m.tiles[y][x] : null);
  m.rect = (x, y, rw, rh, t) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) m.set(x + i, y + j, t); };
  m.hline = (x1, x2, y, t) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) m.set(x, y, t); };
  m.vline = (x, y1, y2, t) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) m.set(x, y, t); };
  m.sign = (x, y, text) => { m.signs[`${x},${y}`] = text; };
  return m;
}

// Edificio: 2 filas de tejado + paredes. doorX es relativo a x. Devuelve la posición de la puerta.
function building(m, x, y, w, h, o = {}) {
  const roofT = o.roof === 'slate' ? 'roof_slate' : 'roof_red';
  const wallT = o.wall === 'stone' ? 'wall_stone' : o.wall === 'brick' ? 'wall_brick' : 'wall';
  const winT = o.wall === 'stone' ? 'win_stone' : o.wall === 'brick' ? 'wall_brick' : 'win';
  m.rect(x, y, w, 1, roofT);
  m.rect(x, y + 1, w, 1, roofT + '_e');
  for (let j = 2; j < h; j++) for (let i = 0; i < w; i++) m.set(x + i, y + j, i % 2 === 1 ? winT : wallT);
  const doors = [].concat(o.doorX ?? Math.floor(w / 2));
  const dy = y + h - 1;
  for (const d of doors) {
    const dx = x + d;
    if (o.warp) {
      m.set(dx, dy, o.wall === 'stone' ? 'door_church' : 'door');
      m.warps[`${dx},${dy}`] = { map: o.warp, entry: true };
    } else {
      m.set(dx, dy, o.wall === 'brick' ? 'door_brick' : 'door_closed');
      m.sign(dx, dy, o.closed || 'Está cerrado.');
    }
  }
  return { x: x + doors[0], y: dy };
}

// ---------------------------------------------------------------- PUEBLO
function buildPueblo() {
  const W = 44, H = 34;
  const m = makeMap('pueblo', 'Jaraíz de la Vera', W, H, 'grass');

  // flores sueltas
  for (const [x, y] of [[2, 16], [12, 19], [25, 28], [31, 25], [8, 28], [28, 16], [2, 27], [33, 3], [13, 5], [26, 6]]) m.set(x, y, 'flowers');

  // calles
  m.hline(1, 34, 17, 'path');              // calle principal
  m.rect(12, 8, 17, 8, 'plaza');           // Plaza Mayor
  m.vline(20, 16, 17, 'path'); m.hline(12, 28, 16, 'plaza'); m.set(20, 16, 'path');
  m.hline(6, 11, 7, 'path'); m.vline(11, 7, 17, 'path');     // museo
  m.vline(6, 14, 17, 'path');                                 // ayuntamiento
  m.vline(32, 13, 17, 'path');                                // bar
  m.vline(29, 6, 17, 'path');                                 // casa noreste
  m.vline(10, 17, 32, 'path'); m.hline(5, 10, 25, 'path');    // casa del jugador
  m.hline(10, 29, 32, 'path');                                // calle sur
  m.vline(33, 17, 18, 'path'); m.hline(33, 34, 18, 'path');   // al lago
  m.vline(24, 18, 20, 'path');

  // El Lago (Garganta de Pedro Chate)
  m.rect(35, 2, 8, 16, 'sand');
  m.rect(37, 3, 6, 12, 'water');
  m.set(38, 6, 'rockw'); m.set(41, 11, 'rockw'); m.set(36, 4, 'rock'); m.set(35, 14, 'rock');
  m.hline(35, 42, 16, 'sand');

  // Iglesia de Santa María de Altagracia (norte de la plaza)
  building(m, 15, 2, 10, 6, { roof: 'slate', wall: 'stone', doorX: [4, 5], warp: 'iglesia' });
  m.set(19, 1, 'tower'); m.set(20, 1, 'tower');
  m.set(19, 0, 'roof_slate_e'); m.set(20, 0, 'roof_slate_e');

  // Museo del Pimentón (antiguo Palacio del Obispo Manzano)
  building(m, 3, 2, 8, 5, { doorX: 3, warp: 'museo' });
  m.set(8, 7, 'sign'); m.sign(8, 7, 'MUSEO DEL PIMENTÓN\nAntiguo Palacio del Obispo Manzano.');

  // Ayuntamiento (Plaza Mayor)
  building(m, 3, 9, 7, 5, { doorX: 3, warp: 'ayuntamiento' });
  m.set(7, 14, 'sign'); m.sign(7, 14, 'AYUNTAMIENTO DE JARAÍZ DE LA VERA');

  // Bar de la plaza
  building(m, 30, 8, 6, 5, { doorX: 2, warp: 'bar' });
  m.set(30, 11, 'awning'); m.set(31, 11, 'awning'); m.set(33, 11, 'awning'); m.set(34, 11, 'awning');
  m.set(33, 13, 'sign'); m.sign(33, 13, 'BAR DE LA PLAZA\n(ponle el nombre de vuestro bar)');

  // Casa del jugador
  building(m, 2, 20, 6, 5, { doorX: 3, warp: 'casa' });
  m.set(8, 24, 'sign'); m.sign(8, 24, 'Tu casa.');

  // Otras casas (cerradas por ahora: aquí vivirán tus amigos)
  building(m, 26, 2, 6, 4, { doorX: 3, warp: 'carcasas' });
  m.set(30, 6, 'sign'); m.sign(30, 6, 'LA CASA DE LAS CARCASAS\nFundas para el móvil, hechas en Jaraíz.');
  building(m, 11, 28, 5, 4, { doorX: 2 });
  building(m, 18, 28, 5, 4, { doorX: 2 });
  building(m, 26, 28, 6, 4, { doorX: 3, warp: 'cine' });
  m.set(30, 32, 'sign'); m.sign(30, 32, 'CINE\nHoy sesión doble. (Pon aquí la peli que queráis.)');

  // Secadero de pimentón y campo de pimientos
  building(m, 26, 20, 5, 4, { wall: 'brick', doorX: 2, closed: 'Un secadero de pimentón. Huele a humo de encina.' });
  m.rect(13, 20, 10, 6, 'soil');
  for (let y = 20; y < 26; y += 2) m.hline(13, 22, y, 'pepper');
  m.hline(12, 23, 19, 'fence'); m.hline(12, 23, 26, 'fence'); m.vline(12, 19, 26, 'fence'); m.vline(23, 19, 26, 'fence');
  m.set(24, 18, 'path'); m.set(12, 18, 'sign'); m.sign(12, 18, 'Pimientos para el pimentón de La Vera.\n¡Denominación de Origen!');

  // Plaza Mayor: rollo, fuente, bancos y farolas
  m.set(16, 12, 'rollo'); m.sign(16, 12, 'LA PICOTA O ROLLO (1689)\nSímbolo de que el pueblo podía impartir justicia. Arriba, los lobos del escudo.');
  m.set(24, 11, 'fountain'); m.sign(24, 11, 'Una fuente. El agua baja fresquita de la sierra.');
  m.set(13, 9, 'bench'); m.set(27, 9, 'bench'); m.set(13, 14, 'bench'); m.set(27, 14, 'bench');
  m.set(12, 8, 'lamp'); m.set(28, 8, 'lamp'); m.set(12, 15, 'lamp'); m.set(28, 15, 'lamp');
  m.set(21, 16, 'sign'); m.sign(21, 16, 'PLAZA MAYOR\nSiglo XVI.');
  m.set(34, 16, 'sign'); m.sign(34, 16, 'EL LAGO\nGarganta de Pedro Chate. ¡A bañarse!');

  // árboles: borde + sueltos
  m.hline(0, W - 1, 0, 'tree'); m.hline(0, W - 1, H - 1, 'tree');
  m.vline(0, 0, H - 1, 'tree'); m.vline(W - 1, 0, H - 1, 'tree');
  m.set(19, 0, 'roof_slate_e'); m.set(20, 0, 'roof_slate_e');
  for (const [x, y] of [[1, 8], [2, 8], [12, 2], [13, 3], [33, 2], [34, 6], [34, 10], [1, 18], [1, 19], [9, 21], [25, 25], [33, 21], [34, 22], [36, 20], [38, 22], [40, 19], [37, 26], [41, 28], [35, 30], [39, 31], [3, 30], [5, 31], [7, 29], [24, 30], [16, 30], [2, 13], [42, 20], [30, 18]]) {
    if (m.get(x, y) === 'grass' || m.get(x, y) === 'flowers') m.set(x, y, 'tree');
  }
  return m;
}

// ---------------------------------------------------------------- INTERIORES
function room(id, name, w, h, wall = 'wall_in', floor = 'floor') {
  const m = makeMap(id, name, w, h, floor);
  m.rect(0, 0, w, 2, wall);
  const ex = Math.floor(w / 2);
  m.set(ex, h - 1, 'exit');
  m.exits[`${ex},${h - 1}`] = { map: 'pueblo' };
  m.entry = { x: ex, y: h - 1 };
  return m;
}

function buildBar() {
  const m = room('bar', 'Bar de la Plaza', 11, 9);
  m.hline(0, 10, 0, 'wall_shelf'); m.set(5, 0, 'wall_pic');
  m.hline(1, 7, 3, 'counter');
  m.hline(1, 7, 4, 'stool'); m.set(3, 4, 'floor'); m.set(6, 4, 'floor');
  m.set(9, 2, 'barrel'); m.set(10, 2, 'barrel');
  m.set(2, 6, 'table'); m.set(8, 6, 'table'); m.set(8, 4, 'table');
  m.sign(0, 0, 'Botellas de vino de pitarra y licores de la tierra.');
  m.sign(9, 2, 'Barriles. Aquí no falta de nada.');
  return m;
}

function buildIglesia() {
  const m = room('iglesia', 'Iglesia de Santa María', 11, 12, 'wall_in_stone', 'floor_stone');
  m.set(5, 0, 'retablo'); m.set(4, 0, 'retablo'); m.set(6, 0, 'retablo');
  m.set(4, 1, 'retablo'); m.set(5, 1, 'retablo'); m.set(6, 1, 'retablo');
  m.hline(4, 6, 2, 'altar');
  m.vline(5, 3, 11, 'carpet'); m.set(5, 11, 'exit');
  for (let y = 5; y <= 9; y += 2) { m.hline(1, 4, y, 'pew'); m.hline(6, 9, y, 'pew'); }
  m.sign(5, 1, 'El retablo barroco, de estilo churrigueresco. ¡Todo dorado!');
  m.sign(5, 2, 'El altar mayor de Santa María de Altagracia.');
  return m;
}

function buildMuseo() {
  const m = room('museo', 'Museo del Pimentón', 11, 9, 'wall_in', 'floor_tile');
  m.hline(0, 10, 0, 'wall_pic');
  for (const x of [1, 3, 7, 9]) m.set(x, 3, 'vitrina');
  m.set(1, 6, 'sack'); m.set(9, 6, 'sack'); m.set(3, 6, 'vitrina'); m.set(7, 6, 'vitrina');
  for (const x of [1, 3, 7, 9]) m.sign(x, 3, 'Latas antiguas de pimentón de La Vera: dulce, agridulce y picante.');
  m.sign(3, 6, 'El pimiento llegó de América y los monjes de Yuste lo trajeron a La Vera.');
  m.sign(7, 6, 'El pimentón se seca con humo de encina en los secaderos: por eso sabe ahumado.');
  m.sign(1, 6, 'Un saco de pimentón. ¡Achís!'); m.sign(9, 6, 'Otro saco. Mejor no estornudar.');
  return m;
}

function buildAyuntamiento() {
  const m = room('ayuntamiento', 'Ayuntamiento', 9, 7);
  m.set(4, 0, 'wall_pic'); m.hline(3, 5, 2, 'desk'); m.set(1, 2, 'plant'); m.set(7, 2, 'plant');
  m.sign(4, 2, 'Papeles, sellos y más papeles.');
  return m;
}

function buildCasa() {
  const m = room('casa', 'Tu casa', 9, 7);
  m.set(2, 0, 'wall_pic'); m.set(1, 2, 'bed'); m.set(6, 3, 'table'); m.set(7, 2, 'plant'); m.set(4, 4, 'rug');
  m.sign(1, 2, 'Tu cama. Todavía está deshecha.');
  m.sign(6, 3, 'Encima de la mesa hay una lata de pimentón.');
  return m;
}

function buildCarcasas() {
  const m = room('carcasas', 'La Casa de las Carcasas', 11, 8);
  m.hline(0, 10, 0, 'wall_cases');
  m.hline(3, 7, 3, 'counter');
  m.set(1, 3, 'rack'); m.set(1, 5, 'rack'); m.set(9, 3, 'rack'); m.set(9, 5, 'rack');
  m.set(3, 5, 'table'); m.set(7, 5, 'table');
  for (const p of [[1, 3], [1, 5], [9, 3], [9, 5]]) m.sign(p[0], p[1], 'Carcasas de todos los colores. Hay para casi cualquier móvil.');
  m.sign(3, 5, 'Cargadores y protectores de pantalla.'); m.sign(7, 5, 'Carcasas nuevas recién llegadas.');
  return m;
}

function buildCine() {
  const m = room('cine', 'Cine', 11, 10, 'wall_dark', 'floor_dark');
  m.hline(2, 8, 0, 'screen'); m.hline(2, 8, 1, 'screen');
  for (const y of [5, 7]) { m.hline(1, 4, y, 'seat'); m.hline(6, 9, y, 'seat'); }
  m.set(10, 3, 'popcorn'); m.set(10, 4, 'popcorn');
  m.sign(10, 3, 'Palomitas. Con mucha mantequilla.'); m.sign(10, 4, 'Refrescos y palomitas.');
  return m;
}

export function buildMaps() {
  const maps = {};
  for (const m of [buildPueblo(), buildBar(), buildIglesia(), buildMuseo(), buildAyuntamiento(), buildCasa(), buildCarcasas(), buildCine()]) maps[m.id] = m;
  // enlazar puertas del pueblo con las salidas de cada interior
  const pueblo = maps.pueblo;
  for (const [key, w] of Object.entries(pueblo.warps)) {
    const [x, y] = key.split(',').map(Number);
    const inner = maps[w.map];
    w.x = inner.entry.x; w.y = inner.entry.y; w.dir = 'up';
    if (!inner.returnTo) inner.returnTo = { x, y: y + 1 };
  }
  for (const m of Object.values(maps)) {
    for (const e of Object.values(m.exits)) { e.x = m.returnTo.x; e.y = m.returnTo.y; e.dir = 'down'; }
  }
  return maps;
}

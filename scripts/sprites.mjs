#!/usr/bin/env node
/**
 * npm run sprites — escribe public/figures/<id>.svg.
 *
 * docs/MUSEO.md: ninguna figura se representa por su cara. Cada una tiene un
 * objeto, dibujado en una grilla de 32×32 con rectángulos de 1×1, con la
 * paleta de seis tokens y sin contorno negro, dithering, antialias ni sombra.
 *
 * El dibujo vive aquí y no en el SVG a mano porque así se corrige una figura
 * cambiando dos líneas en lugar de doscientos rectángulos. El SVG que sale es
 * el artefacto versionado: se diferencia línea a línea, como pide el museo.
 *
 * Los emblemas son los de content/figures.json y no se inventan aquí: si el
 * campo `emblem` cambia, el dibujo tiene que cambiar con él.
 */
import fs from 'node:fs';
import path from 'node:path';

const SIZE = 32;
const OUT = path.join(process.cwd(), 'public', 'figures');

/** Los seis tokens de docs/DESIGN.md. El punto es transparente. */
const PALETTE = {
  b: '#0E0D0C', // --bg
  s: '#161412', // --surface
  l: '#2A2724', // --line
  d: '#8A857D', // --dim
  t: '#EDEAE3', // --text
  a: '#B5432E', // --accent
};

const blank = () => Array.from({ length: SIZE }, () => Array(SIZE).fill('.'));

const inside = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;

function px(g, x, y, c) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (inside(rx, ry)) g[ry][rx] = c;
}

function rect(g, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) px(g, x, y, c);
}

function hline(g, y, x0, x1, c) {
  rect(g, x0, y, x1, y, c);
}

function vline(g, x, y0, y1, c) {
  rect(g, x, y0, x, y1, c);
}

/** Bresenham, con grosor opcional hacia la derecha y hacia abajo. */
function line(g, x0, y0, x1, y1, c, weight = 1) {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    for (let i = 0; i < weight; i += 1) for (let j = 0; j < weight; j += 1) px(g, x + i, y + j, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Anillo de un pixel de grosor. Sin antialias: se redondea y ya está. */
function ring(g, cx, cy, r, c) {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    px(g, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, c);
  }
}

function disc(g, cx, cy, r, c) {
  for (let y = Math.ceil(cy - r); y <= cy + r; y += 1) {
    for (let x = Math.ceil(cx - r); x <= cx + r; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(g, x, y, c);
    }
  }
}

/** Arco entre dos angulos, en grados. */
function arc(g, cx, cy, r, from, to, c) {
  for (let a = from; a <= to; a += 0.5) {
    const rad = (a * Math.PI) / 180;
    px(g, cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, c);
  }
}

const EMBLEMS = {
  // «un tigre rayado de perfil»
  borges(g) {
    // La silueta tiene que leerse antes de recibir una sola raya.
    rect(g, 9, 13, 24, 19, 'd');
    disc(g, 23, 16, 3.4, 'd');
    disc(g, 11, 16, 3.2, 'd');
    // Cabeza, hocico y oreja.
    disc(g, 8, 13, 3.6, 'd');
    rect(g, 3, 12, 7, 15, 'd');
    rect(g, 8, 8, 10, 10, 'd');
    // Patas.
    rect(g, 10, 19, 12, 26, 'd');
    rect(g, 14, 19, 15, 24, 'd');
    rect(g, 18, 19, 19, 24, 'd');
    rect(g, 21, 19, 23, 26, 'd');
    // Cola, levantada.
    line(g, 25, 15, 29, 8, 'd', 2);
    // Rayas: verticales, y ninguna sobre el hocico.
    for (const x of [13, 16, 19, 22]) vline(g, x, 12, 19, 'l');
    vline(g, 25, 14, 18, 'l');
    // El ojo es el único acento.
    px(g, 6, 12, 'a');
  },

  // «un formulario sellado»
  kafka(g) {
    // La hoja, con la esquina doblada.
    rect(g, 7, 3, 24, 28, 't');
    for (let i = 0; i < 4; i += 1) {
      rect(g, 21 + i, 3, 24, 3 + i, '.');
      hline(g, 3 + i, 21 + i, 24, 'l');
    }
    // Renglones, cada uno con su casilla.
    for (const y of [9, 13, 17]) {
      rect(g, 10, y - 1, 12, y + 1, 'l');
      hline(g, y, 14, 21, 'l');
    }
    // El sello, encima de todo, como llega siempre.
    ring(g, 18, 22, 5, 'd');
    ring(g, 18, 22, 3, 'a');
    hline(g, 22, 16, 20, 'a');
  },

  // «un puente sin orilla»
  euler(g) {
    // El tablero, cortado a ras por los dos lados: no llega a ninguna parte.
    rect(g, 2, 11, 29, 12, 't');
    // El arco.
    arc(g, 16, 12, 10, 0, 180, 't');
    arc(g, 16, 12, 9, 0, 180, 'd');
    // Tirantes entre tablero y arco.
    for (const x of [10, 16, 22]) vline(g, x, 13, 21, 'l');
    // Donde iría el agua no hay nada: el arco se queda a media altura.
  },

  // «una lente pulida»
  spinoza(g) {
    // Biconvexa: la intersección de dos círculos iguales y desplazados.
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const a = (x - 6) ** 2 + (y - 16) ** 2 <= 14 ** 2;
        const b = (x - 25) ** 2 + (y - 16) ** 2 <= 14 ** 2;
        if (a && b) px(g, x, y, 's');
      }
    }
    // El borde, un pixel de vidrio.
    for (let y = 0; y < SIZE; y += 1) {
      const first = g[y].indexOf('s');
      if (first === -1) continue;
      px(g, first, y, 't');
      px(g, g[y].lastIndexOf('s'), y, 't');
    }
    // El pulido: una sola veta, que es lo que distingue una lente de un ojo.
    line(g, 13, 9, 18, 21, 'd');
    line(g, 14, 9, 19, 21, 'd');
  },

  // «un baúl entreabierto»
  pessoa(g) {
    // Cuerpo.
    rect(g, 5, 16, 26, 27, 's');
    hline(g, 16, 5, 26, 't');
    hline(g, 27, 5, 26, 't');
    vline(g, 5, 16, 27, 't');
    vline(g, 26, 16, 27, 't');
    // La tapa, levantada por un lado: entreabierto, no abierto.
    line(g, 5, 13, 26, 9, 't');
    line(g, 5, 14, 26, 10, 't');
    vline(g, 5, 13, 16, 't');
    vline(g, 26, 9, 16, 't');
    // Correas.
    for (const x of [10, 20]) rect(g, x, 16, x + 1, 27, 'l');
    // La cerradura: lo único que se mira de un baúl cerrado.
    rect(g, 15, 18, 17, 21, 'a');
  },

  // «una pata de acero»
  bourgeois(g) {
    // Un tramo articulado de los de Maman: sube, dobla y baja hasta la punta.
    line(g, 3, 29, 13, 11, 't', 2);
    line(g, 13, 11, 22, 6, 't', 2);
    line(g, 22, 6, 27, 20, 't', 2);
    line(g, 27, 20, 29, 29, 't', 1);
    // Las articulaciones, más gruesas y en dim: es acero, no hueso.
    disc(g, 13, 12, 2.2, 'd');
    disc(g, 22, 7, 2.2, 'd');
    disc(g, 27, 20, 1.8, 'd');
    // Los dos puntos que tocan el suelo.
    px(g, 3, 29, 'a');
    px(g, 29, 29, 'a');
  },
};

/** Rectángulos de 1×1 fundidos en tiras horizontales: el SVG sigue siendo legible. */
function toSvg(grid, label) {
  const rects = [];
  for (let y = 0; y < SIZE; y += 1) {
    let x = 0;
    while (x < SIZE) {
      const c = grid[y][x];
      if (c === '.') {
        x += 1;
        continue;
      }
      let end = x;
      while (end + 1 < SIZE && grid[y][end + 1] === c) end += 1;
      rects.push(`  <rect x="${x}" y="${y}" width="${end - x + 1}" height="1" fill="${PALETTE[c]}"/>`);
      x = end + 1;
    }
  }
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="128" height="128"',
    `     shape-rendering="crispEdges" role="img" aria-label="${label}">`,
    ...rects,
    '</svg>',
    '',
  ].join('\n');
}

const figures = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'figures.json'), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

let written = 0;
for (const [id, draw] of Object.entries(EMBLEMS)) {
  const figure = figures.find((f) => f.id === id);
  if (!figure) {
    console.error(`error  ${id} no está en content/figures.json`);
    process.exit(1);
  }
  const grid = blank();
  draw(grid);
  const accent = grid.flat().filter((c) => c === 'a').length;
  if (accent > SIZE * SIZE * 0.05) {
    console.warn(`aviso  ${id}  el acento ocupa ${accent} píxeles (docs/MUSEO.md pide como mucho un 5%)`);
  }
  fs.writeFileSync(path.join(OUT, `${id}.svg`), toSvg(grid, figure.emblem), 'utf8');
  written += 1;
}

console.log(`${written} emblemas en public/figures · ${figures.length - written} figuras siguen sin el suyo`);

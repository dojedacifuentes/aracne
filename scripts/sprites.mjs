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

  // «una vela consumida»
  milton(g) {
    // Queda un cabo, no una vela: se lee por lo que falta.
    rect(g, 12, 19, 19, 27, 't');
    rect(g, 10, 27, 21, 29, 'd');
    // La cera corrida por un lado, que es lo que dice que ardió mucho rato.
    rect(g, 10, 21, 11, 26, 't');
    px(g, 9, 25, 't');
    px(g, 20, 22, 't');
    // Mecha doblada y un hilo de humo.
    vline(g, 15, 16, 19, 'l');
    px(g, 16, 15, 'l');
    px(g, 16, 13, 'l');
    px(g, 15, 11, 'l');
    px(g, 16, 9, 'l');
    // El rescoldo: el único acento.
    px(g, 15, 15, 'a');
  },

  // «un reloj de estación»
  einstein(g) {
    // El brazo que lo sujeta al muro.
    vline(g, 2, 6, 26, 'd');
    rect(g, 2, 14, 8, 16, 'd');
    // La esfera.
    disc(g, 19, 15, 10, 's');
    ring(g, 19, 15, 10, 't');
    ring(g, 19, 15, 9, 'd');
    // Las cuatro marcas.
    px(g, 19, 7, 'l');
    px(g, 19, 23, 'l');
    px(g, 11, 15, 'l');
    px(g, 27, 15, 'l');
    // Las agujas, paradas en una hora cualquiera.
    line(g, 19, 15, 19, 9, 't');
    line(g, 19, 15, 24, 17, 't');
    px(g, 19, 15, 'a');
  },

  // «una escalera de biblioteca»
  leibniz(g) {
    // Apoyada, con los largueros en diagonal.
    line(g, 5, 30, 15, 2, 't');
    line(g, 12, 30, 22, 2, 't');
    // Peldaños, perpendiculares al avance.
    for (let i = 0; i < 7; i += 1) {
      const y = 27 - i * 4;
      const x0 = 5 + Math.round((30 - y) * 0.36);
      line(g, x0, y, x0 + 7, y - 1, 'l');
    }
    // El gancho de arriba, que es lo que la hace de biblioteca.
    disc(g, 19, 3, 1.6, 'd');
    px(g, 22, 2, 'd');
  },

  // «un mirlo posado»
  stevens(g) {
    // La rama.
    line(g, 2, 26, 29, 23, 'l');
    // Cuerpo y cabeza, en una sola silueta.
    disc(g, 16, 16, 6, 'd');
    disc(g, 11, 10, 3.6, 'd');
    rect(g, 14, 12, 20, 20, 'd');
    // Cola larga, de mirlo.
    line(g, 21, 18, 30, 24, 'd', 2);
    // Patas hasta la rama.
    vline(g, 14, 21, 25, 'l');
    vline(g, 18, 21, 24, 'l');
    // Pico y ojo.
    line(g, 8, 10, 4, 11, 'd');
    px(g, 10, 9, 'a');
  },

  // «una escalera que se retira»
  wittgenstein(g) {
    // Arriba entera; abajo ya no está. Lo que se sube y se tira.
    vline(g, 10, 2, 18, 't');
    vline(g, 21, 2, 18, 't');
    for (const y of [4, 8, 12, 16]) hline(g, y, 10, 21, 'l');
    // Los largueros se deshacen antes de llegar al suelo.
    for (const y of [20, 22, 25]) {
      px(g, 10, y, 'l');
      px(g, 21, y, 'l');
    }
    hline(g, 20, 12, 19, 'l');
    px(g, 14, 24, 'l');
    px(g, 17, 24, 'l');
  },

  // «un nudo que se muerde»
  godel(g) {
    // Una cuerda de dos píxeles, no una esfera de reloj: por eso no lleva
    // agujas ni centro. Se abre arriba, el cabo cruza por encima de su propio
    // cuerpo y vuelve a entrar.
    ring(g, 15, 18, 9, 't');
    ring(g, 15, 18, 8, 'd');
    for (let a = -80; a <= 0; a += 1) {
      const r = (a * Math.PI) / 180;
      px(g, 15 + Math.cos(r) * 9, 18 + Math.sin(r) * 9, '.');
      px(g, 15 + Math.cos(r) * 8, 18 + Math.sin(r) * 8, '.');
      px(g, 15 + Math.cos(r) * 7, 18 + Math.sin(r) * 7, '.');
    }
    line(g, 22, 12, 27, 7, 't');
    line(g, 27, 7, 29, 14, 't');
    line(g, 29, 14, 20, 18, 't');
    // La cabeza, entrando en su propio cuerpo.
    disc(g, 19, 18, 2.2, 't');
    px(g, 17, 18, 'a');
    px(g, 17, 19, 'a');
  },

  // «una cinta perforada»
  turing(g) {
    // La tira, cortada a ras por los dos lados: no empieza ni acaba aquí.
    rect(g, 0, 9, 31, 22, 's');
    hline(g, 9, 0, 31, 't');
    hline(g, 22, 0, 31, 't');
    // Las perforaciones de datos, en dos filas, y la de arrastre en medio.
    for (let x = 2; x < 31; x += 4) {
      rect(g, x, 11, x + 1, 12, 'b');
      rect(g, x, 19, x + 1, 20, 'b');
      px(g, x, 15, 'l');
      px(g, x, 16, 'l');
    }
    // Un agujero marcado: el bit que importa.
    rect(g, 14, 11, 15, 12, 'a');
  },

  // «un reloj de aula parado»
  schopenhauer(g) {
    // Caja de pared, con su péndulo.
    rect(g, 8, 2, 24, 20, 's');
    rect(g, 8, 2, 24, 3, 'd');
    vline(g, 8, 2, 20, 'd');
    vline(g, 24, 2, 20, 'd');
    hline(g, 20, 8, 24, 'd');
    ring(g, 16, 11, 7, 't');
    // Las agujas, quietas donde se pararon.
    line(g, 16, 11, 16, 6, 't');
    line(g, 16, 11, 12, 13, 't');
    // La caja del péndulo, y el péndulo sin oscilar.
    rect(g, 13, 20, 19, 29, 's');
    vline(g, 13, 20, 29, 'd');
    vline(g, 19, 20, 29, 'd');
    hline(g, 29, 13, 19, 'd');
    vline(g, 16, 21, 26, 'l');
    disc(g, 16, 27, 2, 'd');
  },

  // «un búho al anochecer»
  hegel(g) {
    // La línea del horizonte, que es la hora.
    hline(g, 28, 0, 31, 'l');
    hline(g, 29, 0, 31, 'l');
    // El cuerpo, macizo y sin detalle: contra el cielo no hay detalle.
    disc(g, 16, 18, 8, 'd');
    rect(g, 9, 11, 23, 20, 'd');
    // La cabeza, con los penachos.
    rect(g, 10, 6, 22, 12, 'd');
    px(g, 10, 4, 'd');
    px(g, 11, 5, 'd');
    px(g, 21, 5, 'd');
    px(g, 22, 4, 'd');
    // Los ojos: dos anillos, que es lo único que se ve de noche.
    ring(g, 13, 10, 2.4, 't');
    ring(g, 19, 10, 2.4, 't');
    px(g, 13, 10, 'a');
    px(g, 19, 10, 'a');
    // La percha.
    hline(g, 26, 11, 21, 'l');
  },

  // «un prisma»
  newton(g) {
    // El cuerpo del prisma, macizo, para que el rayo se lea contra él.
    for (let y = 6; y <= 25; y += 1) {
      const half = Math.round(((y - 5) / 20) * 12);
      rect(g, 16 - half, y, 16 + half, y, 's');
    }
    line(g, 16, 5, 4, 25, 't');
    line(g, 16, 5, 28, 25, 't');
    hline(g, 25, 4, 28, 't');
    // Un solo rayo blanco entra por la izquierda.
    hline(g, 15, 0, 10, 't');
    hline(g, 16, 0, 10, 't');
    // Y sale abierto en cuatro. Solo una franja lleva el acento.
    line(g, 22, 18, 31, 15, 'd');
    line(g, 22, 19, 31, 19, 'd');
    line(g, 22, 20, 31, 23, 'd');
    line(g, 22, 21, 31, 27, 'a');
  },

  // «una torre sin ventanas»
  foucault(g) {
    // Un cilindro liso. Lo que la define es lo que no tiene, así que aquí no
    // hay ni una abertura: tampoco el acento, que sería una ventana.
    rect(g, 10, 6, 22, 30, 's');
    vline(g, 10, 6, 30, 't');
    vline(g, 22, 6, 30, 't');
    arc(g, 16, 6, 6, 180, 360, 't');
    arc(g, 16, 6, 6, 0, 180, 'd');
    for (const y of [12, 18, 24]) hline(g, y, 11, 21, 'l');
    // La base, más ancha: se ve desde abajo y no se ve hacia dentro.
    rect(g, 7, 30, 25, 31, 'd');
  },

  // «una nota al margen»
  derrida(g) {
    // La hoja.
    rect(g, 4, 2, 27, 29, 's');
    vline(g, 4, 2, 29, 'd');
    vline(g, 27, 2, 29, 'd');
    hline(g, 2, 4, 27, 'd');
    hline(g, 29, 4, 27, 'd');
    // El filete del margen.
    vline(g, 11, 4, 27, 'l');
    // El texto, apretado y sin importancia.
    for (const y of [7, 10, 13, 16, 19, 22, 25]) hline(g, y, 13, 25, 'l');
    // La nota, escrita al lado y en vertical: cabe donde cabe.
    vline(g, 8, 9, 20, 't');
    px(g, 7, 12, 't');
    px(g, 9, 16, 't');
    // La llamada, que es lo que la mete dentro del texto.
    px(g, 12, 13, 'a');
    px(g, 8, 8, 'a');
  },

  // «una ranura en una pared»
  searle(g) {
    // Aparejo de ladrillo: hiladas trabadas.
    rect(g, 0, 2, 31, 29, 's');
    for (let y = 2; y <= 29; y += 5) hline(g, y, 0, 31, 'l');
    for (let y = 2; y <= 29; y += 5) {
      const offset = ((y - 2) / 5) % 2 === 0 ? 0 : 5;
      for (let x = offset; x <= 31; x += 10) vline(g, x, y, y + 4, 'l');
    }
    // La ranura, a la altura de la mano. No hay puerta ni mirilla.
    rect(g, 8, 15, 24, 17, 'b');
    hline(g, 14, 8, 24, 't');
    hline(g, 18, 8, 24, 'd');
  },

  // «un ancla en tierra firme»
  ovidio(g) {
    // El suelo, con el ancla clavada donde no sirve de nada.
    hline(g, 26, 0, 31, 'd');
    hline(g, 27, 0, 31, 'l');
    ring(g, 16, 5, 3, 't');
    vline(g, 16, 8, 25, 't');
    hline(g, 11, 10, 22, 't');
    // Los brazos, ya bajo tierra.
    arc(g, 16, 18, 8, 20, 160, 't');
    px(g, 8, 19, 'd');
    px(g, 24, 19, 'd');
    // Tierra encima de las uñas.
    hline(g, 28, 6, 26, 'l');
    px(g, 16, 24, 'a');
  },

  // «una silla vacía con placa»
  bourbaki(g) {
    // Silla de perfil. Lo que se mira es el asiento sin nadie.
    rect(g, 8, 14, 24, 16, 't');
    vline(g, 9, 16, 29, 'd');
    vline(g, 23, 16, 29, 'd');
    vline(g, 22, 3, 14, 'd');
    vline(g, 24, 3, 14, 'd');
    hline(g, 3, 22, 24, 'd');
    for (const y of [6, 9, 12]) hline(g, y, 22, 24, 'l');
    // La placa con el nombre, que es lo único que dice quién es.
    rect(g, 10, 19, 20, 23, 's');
    rect(g, 10, 19, 20, 19, 't');
    rect(g, 10, 23, 20, 23, 't');
    vline(g, 10, 19, 23, 't');
    vline(g, 20, 19, 23, 't');
    hline(g, 21, 12, 18, 'l');
  },

  // «una máscara de papel»
  kierkegaard(g) {
    // Óvalo de papel, sostenido por un palo.
    disc(g, 16, 14, 9, 's');
    ring(g, 16, 14, 9, 't');
    // Ojos y boca, recortados: agujeros, no dibujos.
    rect(g, 12, 12, 14, 13, 'b');
    rect(g, 18, 12, 20, 13, 'b');
    hline(g, 19, 13, 19, 'b');
    px(g, 12, 18, 'l');
    px(g, 20, 18, 'l');
    // El mango, por debajo.
    vline(g, 16, 23, 30, 'd');
    // Las cintas, que delatan que se quita.
    line(g, 7, 14, 2, 10, 'l');
    line(g, 25, 14, 30, 10, 'l');
    px(g, 16, 14, 'a');
  },

  // «un sello numérico»
  ccru(g) {
    // El tampón, visto de frente: mango arriba y cuerpo abajo.
    rect(g, 11, 2, 21, 7, 'd');
    rect(g, 9, 7, 23, 11, 'd');
    rect(g, 6, 13, 26, 24, 's');
    vline(g, 6, 13, 24, 't');
    vline(g, 26, 13, 24, 't');
    hline(g, 13, 6, 26, 't');
    hline(g, 24, 6, 26, 't');
    // Las cifras, como bloques: se leen como número sin serlo.
    rect(g, 9, 16, 10, 21, 'l');
    rect(g, 13, 16, 15, 21, 'l');
    rect(g, 13, 18, 14, 19, 'b');
    rect(g, 18, 16, 20, 21, 'l');
    rect(g, 22, 16, 23, 21, 'a');
    // La marca que deja.
    hline(g, 27, 8, 24, 'l');
  },

  // «una camiseta con dorsal»
  'luther-blissett'(g) {
    // Cuerpo y mangas.
    rect(g, 9, 8, 23, 28, 'd');
    rect(g, 3, 8, 9, 15, 'd');
    rect(g, 23, 8, 29, 15, 'd');
    // El cuello, abierto.
    rect(g, 13, 6, 19, 9, 'b');
    arc(g, 16, 8, 3, 0, 180, 't');
    // El dorsal: dos cifras, cualquiera puede llevarlo.
    rect(g, 11, 14, 13, 23, 't');
    rect(g, 16, 14, 21, 23, 't');
    rect(g, 18, 16, 19, 21, 'd');
    // El número está, el nombre no.
    hline(g, 26, 11, 21, 'l');
  },

  // «una llave de plata»
  lovecraft(g) {
    // Anillo calado, caña larga y tres dientes.
    ring(g, 8, 16, 5, 't');
    ring(g, 8, 16, 3, 'd');
    hline(g, 16, 13, 28, 't');
    hline(g, 17, 13, 28, 'd');
    vline(g, 24, 17, 22, 't');
    vline(g, 27, 17, 21, 't');
    vline(g, 21, 17, 20, 't');
    // Plata: un brillo corto, no un color nuevo.
    px(g, 6, 13, 'a');
    px(g, 18, 15, 'l');
  },

  // «un ancla sin barco»
  salgari(g) {
    // La misma ancla de Ovidio, pero flotando: no toca nada.
    ring(g, 16, 6, 3, 't');
    vline(g, 16, 9, 24, 't');
    hline(g, 12, 10, 22, 't');
    arc(g, 16, 16, 9, 25, 155, 't');
    // Las uñas, marcadas.
    px(g, 7, 19, 't');
    px(g, 8, 20, 't');
    px(g, 25, 19, 't');
    px(g, 24, 20, 't');
    // El cabo cortado: no hay barco al otro extremo.
    line(g, 16, 3, 13, 0, 'l');
    px(g, 16, 24, 'a');
  },

  // «un plano de biblioteca»
  eco(g) {
    // Planta cuadrada con torres en las esquinas, sin puerta visible.
    rect(g, 3, 3, 28, 28, 's');
    hline(g, 3, 3, 28, 't');
    hline(g, 28, 3, 28, 't');
    vline(g, 3, 3, 28, 't');
    vline(g, 28, 3, 28, 't');
    for (const [x, y] of [[3, 3], [24, 3], [3, 24], [24, 24]]) {
      rect(g, x, y, x + 4, y + 4, 'l');
    }
    // Los muros interiores: un laberinto, no una sala.
    vline(g, 11, 3, 18, 'l');
    vline(g, 20, 10, 28, 'l');
    hline(g, 11, 11, 24, 'l');
    hline(g, 19, 7, 20, 'l');
    hline(g, 23, 11, 28, 'l');
    vline(g, 16, 19, 23, 'l');
    // El centro, que en este plano no se alcanza.
    rect(g, 15, 14, 17, 16, 'a');
  },

  // «un crisol»
  han(g) {
    // Vaso troncocónico, con sus dos asas.
    line(g, 8, 10, 11, 27, 't');
    line(g, 24, 10, 21, 27, 't');
    hline(g, 27, 11, 21, 't');
    hline(g, 10, 8, 24, 't');
    rect(g, 10, 11, 22, 26, 's');
    rect(g, 5, 12, 8, 14, 'd');
    rect(g, 24, 12, 27, 14, 'd');
    // Lo que se funde dentro, que es uno mismo.
    hline(g, 15, 11, 21, 'd');
    hline(g, 16, 11, 21, 'd');
    rect(g, 13, 17, 19, 19, 'a');
    // El fuego no se ve: solo el fondo caliente.
    hline(g, 25, 12, 20, 'l');
  },

  // «una puerta entreabierta»
  agamben(g) {
    // El marco.
    vline(g, 4, 2, 30, 'd');
    vline(g, 27, 2, 30, 'd');
    hline(g, 2, 4, 27, 'd');
    // La hoja, girada: se ve el canto y el hueco negro.
    rect(g, 5, 3, 15, 30, 'b');
    line(g, 15, 3, 21, 6, 't');
    line(g, 15, 30, 21, 27, 't');
    vline(g, 21, 6, 27, 't');
    rect(g, 16, 7, 20, 26, 's');
    // El pomo.
    px(g, 17, 17, 'l');
    px(g, 17, 18, 'l');
    // La línea de luz que entra por el hueco: lo único que pasa.
    vline(g, 5, 3, 30, 'a');
  },

  // «un pozo seco»
  murakami(g) {
    // El brocal, en perspectiva cenital: anillos de piedra.
    ring(g, 16, 20, 11, 't');
    ring(g, 16, 20, 10, 'd');
    ring(g, 16, 20, 8, 'l');
    // Dentro no hay agua: hay fondo.
    disc(g, 16, 20, 7, 'b');
    // Las piedras del brocal, marcadas por radios.
    for (let a = 0; a < 360; a += 30) {
      const r = (a * Math.PI) / 180;
      px(g, 16 + Math.cos(r) * 9.5, 20 + Math.sin(r) * 9.5, 'l');
    }
    // El palo y la cuerda, que bajan y no vuelven mojados.
    hline(g, 5, 8, 24, 'd');
    vline(g, 8, 5, 10, 'd');
    vline(g, 24, 5, 10, 'd');
    vline(g, 16, 6, 14, 'l');
    px(g, 16, 15, 'a');
  },

  // «un pliego doblado sin abrir»
  diderot(g) {
    // Un pliego cerrado: lo que hay dentro no se ve desde fuera.
    rect(g, 6, 5, 26, 27, 's');
    vline(g, 6, 5, 27, 't');
    vline(g, 26, 5, 27, 't');
    hline(g, 5, 6, 26, 't');
    hline(g, 27, 6, 26, 't');
    // El lomo doblado, a la izquierda, y el corte de páginas a la derecha.
    vline(g, 8, 5, 27, 'd');
    vline(g, 9, 5, 27, 'l');
    for (const x of [23, 24, 25]) vline(g, x, 7, 25, 'l');
    // El sello que nadie ha roto.
    disc(g, 26, 16, 2.4, 'a');
  },

  // «una silla de montar vacía»
  nietzsche(g) {
    // El asiento, de perfil: se hunde en el centro y sube por los dos extremos.
    // Sin jinete no hay nada más que esa curva.
    for (let x = 6; x <= 26; x += 1) {
      const t = (x - 16) / 10;
      const top = Math.round(12 + 6 * (1 - t * t));
      rect(g, x, top, x, 21, 'd');
      px(g, x, top, 't');
    }
    rect(g, 9, 22, 23, 25, 'd');
    hline(g, 25, 9, 23, 't');
    // El faldón y el estribo, colgando sin peso encima.
    rect(g, 11, 25, 15, 27, 'd');
    vline(g, 13, 27, 28, 'l');
    ring(g, 13, 29, 2, 't');
    px(g, 20, 15, 'a');
  },

  // «un guante que no se quita»
  deleuze(g) {
    // Palma y dorso, con el pulgar saliendo por el canto.
    rect(g, 9, 12, 22, 24, 'd');
    disc(g, 15, 22, 6, 'd');
    line(g, 9, 16, 4, 20, 'd', 3);
    disc(g, 4, 21, 2, 'd');
    // Cuatro dedos gruesos, con la punta redondeada y separados por un hueco.
    for (const x of [9, 13, 17, 20]) {
      rect(g, x, 6, x + 2, 13, 'd');
      disc(g, x + 1, 6, 1.5, 'd');
    }
    for (const x of [12, 16, 19]) vline(g, x, 5, 12, '.');
    // El puño, con su banda: es lo que impide quitárselo.
    rect(g, 8, 24, 23, 29, 's');
    hline(g, 24, 8, 23, 't');
    hline(g, 29, 8, 23, 't');
    vline(g, 8, 24, 29, 't');
    vline(g, 23, 24, 29, 't');
    hline(g, 26, 9, 22, 'l');
    px(g, 15, 27, 'a');
  },

  // «una lupa sobre un lóbulo»
  ginzburg(g) {
    // La oreja: un arco exterior, otro interior y el lóbulo abajo.
    arc(g, 14, 16, 9, 100, 320, 'd');
    arc(g, 14, 16, 6, 120, 300, 'l');
    disc(g, 12, 24, 2.6, 'd');
    // La lente, justo encima del lóbulo y no de la cara.
    ring(g, 18, 21, 7, 't');
    ring(g, 18, 21, 6, 'd');
    // El mango.
    line(g, 23, 26, 29, 31, 't', 2);
    // Lo que se está mirando.
    px(g, 13, 24, 'a');
  },

  // «una silla de montar del revés»
  carrington(g) {
    // La misma silla, volcada. Ni chiste ni sueño: puesta del revés y ya.
    for (let x = 6; x <= 26; x += 1) {
      const t = (x - 16) / 10;
      const bot = Math.round(19 - 6 * (1 - t * t));
      rect(g, x, 10, x, bot, 'd');
      px(g, x, bot, 't');
    }
    rect(g, 9, 6, 23, 9, 'd');
    hline(g, 6, 9, 23, 't');
    rect(g, 11, 4, 15, 6, 'd');
    vline(g, 13, 3, 4, 'l');
    ring(g, 13, 2, 2, 't');
    px(g, 20, 16, 'a');
  },

  // «una toga colgada»
  schreber(g) {
    // La percha.
    hline(g, 7, 6, 26, 'd');
    line(g, 16, 3, 6, 7, 'd');
    line(g, 16, 3, 26, 7, 'd');
    vline(g, 16, 1, 3, 'l');
    // La toga, ancha y hasta abajo.
    line(g, 6, 7, 4, 30, 't');
    line(g, 26, 7, 28, 30, 't');
    hline(g, 30, 4, 28, 't');
    rect(g, 6, 8, 26, 29, 's');
    // La abertura del frente y el vuelo de las mangas.
    vline(g, 16, 8, 29, 'l');
    vline(g, 15, 8, 29, 'l');
    for (const y of [14, 20, 26]) {
      px(g, 7, y, 'l');
      px(g, 25, y, 'l');
    }
    // El vivo del cuello.
    hline(g, 9, 13, 19, 'a');
  },

  // «una llave de aposentador»
  velazquez(g) {
    // Llave de palacio: anillo grande y trabajado, paletón en cruz.
    ring(g, 7, 16, 6, 't');
    ring(g, 7, 16, 4, 'd');
    px(g, 7, 9, 't');
    px(g, 7, 23, 't');
    px(g, 1, 16, 't');
    hline(g, 16, 13, 30, 't');
    hline(g, 17, 13, 30, 'd');
    // El paletón, con dos muescas y el remate.
    vline(g, 22, 12, 16, 't');
    vline(g, 26, 12, 16, 't');
    hline(g, 12, 22, 26, 't');
    vline(g, 29, 17, 21, 't');
    // La llave se llevaba al cinto: aquí solo está la llave.
    px(g, 7, 16, 'a');
  },

  // «un torno de cerrajero»
  saramago(g) {
    // Un tornillo de banco: base, mordaza fija, mordaza que corre y husillo
    // con su manivela. Una máquina de sujetar, no de cortar.
    rect(g, 1, 25, 30, 29, 'd');
    hline(g, 30, 1, 30, 'l');
    rect(g, 7, 10, 12, 25, 's');
    vline(g, 7, 10, 25, 't');
    vline(g, 12, 10, 25, 't');
    hline(g, 10, 7, 12, 't');
    rect(g, 17, 10, 22, 25, 's');
    vline(g, 17, 10, 25, 't');
    vline(g, 22, 10, 25, 't');
    hline(g, 10, 17, 22, 't');
    // Lo sujeto entre las dos mordazas.
    rect(g, 13, 13, 16, 22, 'l');
    // El husillo, que atraviesa la mordaza móvil, y la manivela.
    hline(g, 17, 22, 29, 't');
    hline(g, 18, 22, 29, 'd');
    vline(g, 29, 12, 22, 't');
    hline(g, 12, 26, 31, 'd');
    px(g, 29, 11, 'a');
  },

  // «unas tijeras sobre una columna de texto»
  burroughs(g) {
    // La columna, con su caja marcada: si no se ve la página, el corte no
    // corta nada.
    rect(g, 3, 2, 17, 30, 's');
    vline(g, 3, 2, 30, 'd');
    vline(g, 17, 2, 30, 'd');
    hline(g, 2, 3, 17, 'd');
    hline(g, 30, 3, 17, 'd');
    for (let y = 5; y <= 28; y += 3) hline(g, y, 5, 15, 'l');
    // El corte, a media altura.
    hline(g, 16, 3, 17, '.');
    hline(g, 17, 3, 17, 't');
    // Las tijeras, abiertas sobre él.
    line(g, 31, 8, 18, 16, 't');
    line(g, 31, 25, 18, 18, 't');
    ring(g, 29, 7, 2, 'd');
    ring(g, 29, 26, 2, 'd');
    px(g, 19, 17, 'a');
  },

  // «un péndulo de gravimetría»
  peirce(g) {
    // Soporte rígido: en gravimetría lo que se mide es el tiempo de ida y vuelta.
    hline(g, 3, 6, 26, 'd');
    hline(g, 4, 6, 26, 'l');
    vline(g, 6, 3, 8, 'd');
    vline(g, 26, 3, 8, 'd');
    // La varilla y la lenteja.
    vline(g, 16, 4, 22, 't');
    disc(g, 16, 25, 4, 'd');
    ring(g, 16, 25, 4, 't');
    // La escala: la medida está en los extremos, no en el centro.
    hline(g, 30, 4, 28, 'l');
    for (const x of [4, 10, 16, 22, 28]) vline(g, x, 28, 30, 'l');
    px(g, 16, 25, 'a');
  },

  // «un cuaderno de campo en un laboratorio»
  latour(g) {
    // El cuaderno, abierto por la mitad, con anillas.
    rect(g, 2, 8, 18, 29, 's');
    vline(g, 2, 8, 29, 't');
    vline(g, 18, 8, 29, 't');
    hline(g, 8, 2, 18, 't');
    hline(g, 29, 2, 18, 't');
    for (const y of [11, 15, 19, 23]) hline(g, y, 5, 16, 'l');
    for (const y of [10, 16, 22, 28]) px(g, 2, y, 'd');
    // El matraz, al lado y más alto: lo que se está observando.
    line(g, 22, 6, 22, 14, 't');
    line(g, 28, 6, 28, 14, 't');
    line(g, 22, 14, 19, 27, 't');
    line(g, 28, 14, 31, 27, 't');
    hline(g, 27, 19, 31, 't');
    hline(g, 6, 22, 28, 'd');
    // El líquido, que es lo único vivo de la escena.
    rect(g, 21, 22, 29, 26, 'a');
  },

  // «un hilo con el extremo a la vista»
  miller(g) {
    // El tejido, apretado, como fondo.
    for (let y = 4; y <= 28; y += 3) hline(g, y, 2, 29, 'l');
    for (let x = 2; x <= 29; x += 3) vline(g, x, 4, 28, 'l');
    // Un hilo que se sale de la trama y se va por su cuenta.
    line(g, 2, 16, 12, 15, 't');
    line(g, 12, 15, 18, 20, 't');
    line(g, 18, 20, 24, 11, 't');
    line(g, 24, 11, 29, 14, 't');
    // El cabo suelto: por ahí se tira.
    px(g, 29, 14, 'a');
    px(g, 30, 15, 'a');
    px(g, 31, 15, 'a');
  },

  // «un árbol de líneas y símbolos»
  wigmore(g) {
    // La conclusión, arriba.
    rect(g, 14, 2, 18, 6, 't');
    // Dos inferencias intermedias.
    rect(g, 6, 12, 10, 16, 'd');
    ring(g, 24, 14, 3, 'd');
    // Los testimonios, abajo.
    rect(g, 2, 24, 5, 27, 'l');
    ring(g, 11, 25, 2, 'l');
    rect(g, 18, 24, 21, 27, 'l');
    ring(g, 28, 25, 2, 'l');
    // Las flechas, que es lo que se revisa.
    line(g, 16, 6, 8, 12, 'd');
    line(g, 16, 6, 24, 11, 'd');
    line(g, 8, 16, 4, 24, 'l');
    line(g, 8, 16, 11, 23, 'l');
    line(g, 24, 17, 20, 24, 'l');
    line(g, 24, 17, 28, 23, 'l');
    // El eslabón que sostiene el conjunto.
    px(g, 16, 7, 'a');
  },

  // «una ranura en un abdomen»
  cronenberg(g) {
    // Un torso, sin cabeza ni extremidades: la escala la da la ranura.
    rect(g, 7, 2, 25, 30, 's');
    line(g, 7, 2, 7, 30, 'd');
    line(g, 25, 2, 25, 30, 'd');
    arc(g, 16, 8, 9, 180, 360, 'd');
    // La ranura, vertical y con labios: no es una herida, es una entrada.
    rect(g, 15, 12, 17, 24, 'b');
    vline(g, 14, 12, 24, 't');
    vline(g, 18, 12, 24, 't');
    px(g, 16, 11, 't');
    px(g, 16, 25, 't');
    // Dentro no hay sangre: hay mecanismo.
    px(g, 16, 16, 'l');
    px(g, 16, 20, 'l');
    px(g, 16, 18, 'a');
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

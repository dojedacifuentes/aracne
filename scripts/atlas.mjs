#!/usr/bin/env node
/**
 * npm run atlas — escribe content/atlas/world.json.
 *
 * La geometría del mundo no se dibuja a mano ni se aproxima: se toma de
 * **Natural Earth** (dominio público, sin atribución obligatoria pero citada
 * en THIRD_PARTY_LICENSES.md), escala 1:110m, que es la que corresponde a un
 * mapa mundial de una pantalla.
 *
 * Aquí se hacen tres cosas y ninguna más:
 *
 * 1. **Simplificar.** 235 KB de contorno crudo no caben en un paquete que ya
 *    pesa 1,8 MB. Douglas-Peucker con una tolerancia de un tercio de grado y
 *    dos decimales deja ~1 km de error, que a escala mundial no se ve.
 * 2. **Quedarse con los atributos reales que el Atlas usa para calcular.** Los
 *    scores del Atlas son ficción, pero **se calculan** a partir de datos con
 *    procedencia: población, superficie, renta, latitud, insularidad. Nada se
 *    marca a mano y nada se inventa.
 * 3. **Nada de dibujo.** Cómo se pinta esto es cosa de la interfaz.
 *
 * El archivo que sale se versiona en git, como el resto del contenido.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * La escala de la fuente. `50m` da costas de verdad —Indonesia deja de ser
 * cuatro manchas, el Caribe existe, Chile tiene fiordos— a cambio de más
 * puntos; `110m` era lo que había antes. Se cambia con
 * `npm run atlas -- --escala 110m`, y el archivo que sale dice cuál se usó.
 */
const ESCALA = leerEscala();
const FUENTE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_${ESCALA}_admin_0_countries.geojson`;
const OUT = path.join(process.cwd(), 'content', 'atlas');

/**
 * Tolerancia de simplificación, en grados, y tamaño mínimo de un anillo.
 *
 * A 1:50m hay que apretar la tolerancia —si no, la ganancia de la fuente se
 * tira por el desagüe en el mismo paso que la trajo— y bajar el mínimo de
 * isla, que es lo que de verdad se notaba: con 0,7 grados desaparecían
 * archipiélagos enteros.
 */
const AJUSTES = {
  '50m': { eps: 0.14, minSpan: 0.22, decimals: 2 },
  '110m': { eps: 0.32, minSpan: 0.7, decimals: 2 },
};
const { eps: EPS, minSpan: MIN_SPAN, decimals: DECIMALES } = AJUSTES[ESCALA];

function leerEscala() {
  const i = process.argv.indexOf('--escala');
  const valor = i >= 0 ? process.argv[i + 1] : '50m';
  if (valor !== '50m' && valor !== '110m') {
    console.error(`error  escala desconocida: ${valor}. usa 50m o 110m.`);
    process.exit(1);
  }
  return valor;
}

/** Distancia de un punto a la recta que une los otros dos. */
function distancia(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const c = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + c * dx), p[1] - (a[1] + c * dy));
}

/** Douglas-Peucker, iterativo para no reventar la pila con Groenlandia. */
function simplificar(points, eps) {
  if (points.length <= 4) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const pila = [[0, points.length - 1]];
  while (pila.length > 0) {
    const [ini, fin] = pila.pop();
    let peor = 0;
    let donde = -1;
    for (let i = ini + 1; i < fin; i += 1) {
      const d = distancia(points[i], points[ini], points[fin]);
      if (d > peor) {
        peor = d;
        donde = i;
      }
    }
    if (peor > eps && donde > 0) {
      keep[donde] = true;
      pila.push([ini, donde], [donde, fin]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const factor = 10 ** DECIMALES;
const redondear = (v) => Math.round(v * factor) / factor;

function caja(points) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, span: Math.max(x1 - x0, y1 - y0) };
}

/** Superficie aproximada en km², corrigiendo los meridianos por la latitud. */
function superficie(points) {
  let suma = 0;
  const lat = points.reduce((s, p) => s + p[1], 0) / points.length;
  const k = Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    suma += a[0] * k * b[1] - b[0] * k * a[1];
  }
  return Math.abs(suma / 2) * 111.32 * 111.32;
}

const anillos = (geometry) =>
  geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0]);

const respuesta = await fetch(FUENTE, { signal: AbortSignal.timeout(120000) });
if (!respuesta.ok) {
  console.error(`error  Natural Earth respondió ${respuesta.status}`);
  process.exit(1);
}
const crudo = await respuesta.json();

const countries = [];
for (const feature of crudo.features) {
  const p = feature.properties;
  const id = p.ISO_A3 && p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3;
  if (!id || id === '-99') continue;

  const todos = anillos(feature.geometry);
  const simplificados = todos
    .map((ring) => {
      const simple = simplificar(ring, EPS);
      // Un anillo de dos puntos no es un polígono, es un palo. A 1:50m
      // aparecen islas tan pequeñas que la simplificación se las come: para
      // ésas vale más el contorno crudo, que son cuatro coordenadas.
      return { ring: simple.length >= 3 ? simple : ring, caja: caja(ring), area: superficie(ring) };
    })
    .sort((a, b) => b.area - a.area);
  // El anillo mayor entra siempre, aunque sea diminuto: ningún país puede
  // quedarse fuera del mapa por pequeño.
  const usados = simplificados.filter((r, i) => i === 0 || (r.caja.span >= MIN_SPAN && r.ring.length >= 4));

  countries.push({
    id,
    name: p.NAME_ES || p.NAME || p.ADMIN,
    continent: p.CONTINENT,
    subregion: p.SUBREGION,
    pop: p.POP_EST ?? 0,
    popYear: p.POP_YEAR ?? null,
    gdp: p.GDP_MD ?? 0,
    economy: p.ECONOMY ?? '',
    income: p.INCOME_GRP ?? '',
    lon: redondear(p.LABEL_X ?? 0),
    lat: redondear(p.LABEL_Y ?? 0),
    // Superficie y número de piezas: de aquí salen la densidad y la
    // insularidad, que son dos de las entradas de las reglas del Atlas.
    area: Math.round(simplificados.reduce((s, r) => s + r.area, 0)),
    parts: todos.length,
    rings: usados.map(({ ring }) => ring.flatMap(([x, y]) => [redondear(x), redondear(y)])),
  });
}

countries.sort((a, b) => a.id.localeCompare(b.id));

const salida = {
  source: {
    name: `Natural Earth, admin 0 countries, 1:${ESCALA}`,
    url: FUENTE,
    license: 'dominio público',
    note: 'Geometría y atributos reales. Lo que el Atlas calcula encima es ficción declarada.',
  },
  simplified: { algorithm: 'Douglas-Peucker', epsilon: EPS, decimals: DECIMALES, minSpan: MIN_SPAN },
  countries,
};

fs.mkdirSync(OUT, { recursive: true });
const destino = path.join(OUT, 'world.json');
fs.writeFileSync(destino, `${JSON.stringify(salida)}\n`, 'utf8');

const puntos = countries.reduce((s, c) => s + c.rings.reduce((t, r) => t + r.length / 2, 0), 0);
const antes = crudo.features.reduce((s, f) => s + anillos(f.geometry).reduce((t, r) => t + r.length, 0), 0);
console.log(
  `${countries.length} países · ${puntos} puntos (de ${antes}, ${Math.round((100 * puntos) / antes)}%) · ` +
    `${(fs.statSync(destino).size / 1024).toFixed(0)} KB`,
);

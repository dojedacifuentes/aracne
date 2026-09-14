/**
 * Genera los iconos de la aplicación: una luna creciente.
 *
 *   node scripts/generate-icons.mjs
 *
 * Es la misma Luna que dibuja la app —disco insinuado, creciente de marfil,
 * halo que se funde con la noche— reducida a lo que cabe en un icono. Todo
 * se rasteriza aquí, sin dependencias gráficas, y los archivos se versionan.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writePng } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');

/** Nocturno del Pacífico, los mismos colores que theme.ts. */
const NIGHT = [0x06, 0x07, 0x0d];
const PACIFIC = [0x0a, 0x11, 0x20];
const HALO = [0x5b, 0x54, 0x80];
const GHOST = [0x14, 0x12, 0x24];
const MOON_CORE = [0xff, 0xfc, 0xf5];
const MOON = [0xf5, 0xf0, 0xe6];
const MOON_EDGE = [0xc8, 0xc3, 0xd9];

/**
 * Cuánto disco está iluminado. Es lo que decide si el icono se lee o no:
 * una creciente demasiado fina desaparece en cuanto el sistema lo reduce a
 * dieciséis píxeles, así que cuanto más pequeño se vaya a ver el icono, más
 * gruesa tiene que ser.
 */
const ILLUMINATION = 0.34;
/** Muestras por eje. Dieciséis por píxel bastan para un borde limpio. */
const SUPERSAMPLE = 4;

function mix(a, b, t) {
  const k = Math.min(1, Math.max(0, t));
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/**
 * Dibuja la Luna.
 *
 * @param size        lado del lienzo, en píxeles
 * @param radiusRatio radio del disco respecto al medio lienzo
 * @param background  'night' pinta el cielo; 'none' deja transparencia
 * @param flat        silueta blanca plana, para el icono monocromo de Android
 */
function drawMoon({
  size,
  radiusRatio,
  background = 'night',
  flat = false,
  illumination = ILLUMINATION,
}) {
  const pixels = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = center * radiusRatio;
  const terminator = 1 - 2 * illumination;
  const step = 1 / SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let lit = 0;
      let disc = 0;
      let glow = 0;
      let lightX = 0;
      let lightY = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const px = (x + (sx + 0.5) * step - center) / radius;
          const py = (y + (sy + 0.5) * step - center) / radius;
          const r = Math.hypot(px, py);

          if (r <= 1) {
            disc += 1;
            // El terminador es la elipse x = a·√(1−y²); a la derecha, luz.
            if (px >= terminator * Math.sqrt(Math.max(0, 1 - py * py))) {
              lit += 1;
              lightX += px;
              lightY += py;
            }
          } else if (r < 2.4) {
            // El halo cae hasta desaparecer, sin borde visible.
            const fade = 1 - (r - 1) / 1.4;
            glow += fade * fade;
          }
        }
      }

      const total = SUPERSAMPLE * SUPERSAMPLE;
      const litAmount = lit / total;
      const discAmount = disc / total;
      const glowAmount = glow / total;

      let color;
      let alpha;

      if (background === 'night') {
        // Cielo con un degradado diagonal muy leve, como el de la app.
        const tilt = (x / size) * 0.35 + (y / size) * 0.65;
        color = mix(PACIFIC, NIGHT, tilt);
        alpha = 1;
      } else {
        color = [0, 0, 0];
        alpha = 0;
      }

      if (!flat) {
        if (glowAmount > 0) {
          const strength = glowAmount * 0.34;
          color = mix(color, HALO, strength);
          alpha = Math.max(alpha, strength * 0.8);
        }
        if (discAmount > 0) {
          // El disco entero se insinúa, también donde no hay luz: se adivina,
          // no se impone. Por eso apenas se separa del cielo que tiene detrás.
          color = mix(color, GHOST, discAmount * 0.5);
          alpha = Math.max(alpha, discAmount * 0.5);
        }
      }

      if (litAmount > 0) {
        let face;
        if (flat) {
          face = [0xff, 0xff, 0xff];
        } else {
          // Marfil hacia el interior, plata hacia el borde.
          const nx = lightX / Math.max(1, lit);
          const ny = lightY / Math.max(1, lit);
          const toEdge = Math.min(1, Math.hypot(nx, ny));
          face = mix(mix(MOON_CORE, MOON, toEdge * 1.4), MOON_EDGE, Math.max(0, toEdge - 0.55) * 2);
        }
        color = mix(color, face, litAmount);
        alpha = Math.max(alpha, litAmount);
      }

      const offset = (y * size + x) * 4;
      pixels[offset] = Math.round(color[0]);
      pixels[offset + 1] = Math.round(color[1]);
      pixels[offset + 2] = Math.round(color[2]);
      pixels[offset + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }

  return pixels;
}

function emit(name, options) {
  const pixels = drawMoon(options);
  const bytes = writePng(join(ASSETS, name), options.size, options.size, pixels);
  console.log(`${name}  ${options.size}×${options.size}  ${(bytes / 1024).toFixed(1)} KB`);
}

mkdirSync(ASSETS, { recursive: true });

// Icono de la aplicación: se verá a unos sesenta píxeles en una pantalla de
// inicio, así que la Luna ocupa casi todo el cuadro.
emit('icon.png', { size: 1024, radiusRatio: 0.62 });

// Favicon: el caso extremo. El sistema lo reduce a dieciséis píxeles, donde
// sólo sobrevive una creciente ancha que llene el cuadro.
emit('favicon.png', { size: 256, radiusRatio: 0.9, illumination: 0.46 });

// Pantalla de arranque: aquí sí se ve grande, y puede ser más delicada.
emit('splash-icon.png', { size: 512, radiusRatio: 0.46, background: 'none', illumination: 0.3 });

// Android adaptativo: la zona segura es el 66 % central; dentro de ella, llena.
emit('android-icon-foreground.png', { size: 1024, radiusRatio: 0.44, background: 'none' });

// Monocromo: silueta plana; el sistema la tiñe.
emit('android-icon-monochrome.png', {
  size: 1024,
  radiusRatio: 0.44,
  background: 'none',
  flat: true,
  illumination: 0.4,
});

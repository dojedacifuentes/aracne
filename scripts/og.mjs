#!/usr/bin/env node
/**
 * node scripts/og.mjs — lo llama `npm run build` después de `expo export`.
 *
 * Una imagen Open Graph y una página de permalink por entrada. El export de
 * Expo es una SPA y un rastreador no ejecuta JavaScript: cada /e/<id> necesita
 * su propio index.html con sus metadatos. Vercel sirve ese archivo estático
 * antes de aplicar la reescritura a `/`, y la aplicación lee la ruta en cliente.
 *
 * La imagen sigue docs/DESIGN.md: fondo --bg, identificador en mono y título
 * en serif. Nada más.
 *
 * La fase 3 pedía @vercel/og, que no arranca fuera del runtime de Vercel: su
 * bundle hace un require dinámico que Node rechaza. Aquí se usa directamente
 * satori, que es el motor que @vercel/og lleva dentro, y sharp —ya instalado
 * para los iconos— convierte el SVG en PNG. Mismo resultado, sin el envoltorio.
 *
 * Las URLs de las imágenes tienen que ser absolutas: se toman de SITE_URL o,
 * en Vercel, de VERCEL_PROJECT_PRODUCTION_URL.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import satori from 'satori';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const ENTRIES = path.join(ROOT, 'content', 'entries');

const BG = '#0E0D0C';
const TEXT = '#EDEAE3';
const ACCENT = '#B5432E';

const site =
  process.env.SITE_URL?.replace(/\/$/, '') ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

const shellPath = path.join(DIST, 'index.html');
if (!fs.existsSync(shellPath)) {
  console.error('falta dist/index.html: ejecuta antes expo export -p web.');
  process.exit(1);
}
if (!site) console.warn('aviso: sin SITE_URL, og:image queda relativa y algunas redes no la leerán.');

const shell = fs.readFileSync(shellPath, 'utf8');
const fonts = [
  {
    name: 'Newsreader',
    data: fs.readFileSync(require.resolve('@expo-google-fonts/newsreader/400Regular/Newsreader_400Regular.ttf')),
    weight: 400,
    style: 'normal',
  },
  {
    name: 'JetBrains Mono',
    data: fs.readFileSync(require.resolve('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf')),
    weight: 400,
    style: 'normal',
  },
];

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Nodos que entiende satori sin JSX. */
const node = (style, children) => ({ type: 'div', props: { style, children } });

const files = fs
  .readdirSync(ENTRIES)
  .filter((file) => file.endsWith('.json'))
  .sort();

fs.mkdirSync(path.join(DIST, 'og'), { recursive: true });

for (const file of files) {
  const entry = JSON.parse(fs.readFileSync(path.join(ENTRIES, file), 'utf8'));
  const catalog = entry.id.replace('-', ' ').toUpperCase();

  const svg = await satori(
    node(
      {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 96px',
        backgroundColor: BG,
      },
      [
        node({ fontFamily: 'JetBrains Mono', fontSize: 28, letterSpacing: '0.06em', color: ACCENT }, catalog),
        node({ fontFamily: 'Newsreader', fontSize: 76, lineHeight: 1.15, color: TEXT, marginTop: 28 }, entry.title),
      ],
    ),
    { width: 1200, height: 630, fonts },
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(DIST, 'og', `${entry.id}.png`), png);

  const meta = [
    '<meta property="og:type" content="article" />',
    `<meta property="og:title" content="${escapeHtml(entry.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(entry.question)}" />`,
    `<meta property="og:image" content="${escapeHtml(`${site}/og/${entry.id}.png`)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');

  const page = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(`${entry.title} · aracne`)}</title>`)
    .replace('</head>', `    ${meta}\n  </head>`);
  fs.mkdirSync(path.join(DIST, 'e', entry.id), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'e', entry.id, 'index.html'), page, 'utf8');
}

console.log(`${files.length} permalinks con imagen Open Graph en dist/e/ y dist/og/`);

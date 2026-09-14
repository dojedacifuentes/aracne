#!/usr/bin/env node
/**
 * npm run spider
 *
 * Prepara para la web el modelo de la araña a partir del GLB que usa
 * code4fukui/vr-spiders (CC0, ffish.asia / floraZia.com). El original pesa
 * 10,7 MB y tiene 222 000 vértices repartidos en cuatro mallas: demasiado
 * para un teléfono.
 *
 * Qué hace, y por qué:
 *   1. quita el cubo auxiliar que exporta Sketchfab ("Cube_2") y su textura;
 *   2. aplana la jerarquía y une las mallas, partidas por el límite de 65 535
 *      vértices del exportador;
 *   3. suelda y simplifica la geometría con meshoptimizer;
 *   4. recomprime la textura a WebP;
 *   5. cuantiza y comprime con EXT_meshopt_compression. El decodificador viene
 *      dentro de three (examples/jsm/libs), así que en runtime no hace falta
 *      ninguna dependencia nueva.
 *
 * El original no se versiona. Se lee de .reference/:
 *
 *   git clone --depth 1 https://github.com/code4fukui/vr-spiders.git .reference/vr-spiders
 *   npm run spider
 */
import fs from 'node:fs';
import path from 'node:path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  center,
  dedup,
  flatten,
  join,
  meshopt,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, '.reference', 'vr-spiders', 'cc0___huntsman_spider_h._venatoria.glb');
const TARGET = process.env.SPIDER_OUT
  ? path.resolve(process.env.SPIDER_OUT)
  : path.join(ROOT, 'public', 'models', 'spider', 'huntsman-spider.glb');

/** Proporción de triángulos que se conserva. */
const RATIO = Number(process.env.SPIDER_RATIO ?? 0.2);
/** Error máximo de la simplificación, relativo al tamaño del modelo. */
const ERROR = Number(process.env.SPIDER_ERROR ?? 0.002);

if (!fs.existsSync(SOURCE)) {
  console.error('falta el modelo original. clónalo primero:');
  console.error('  git clone --depth 1 https://github.com/code4fukui/vr-spiders.git .reference/vr-spiders');
  process.exit(1);
}

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const document = await io.read(SOURCE);
const root = document.getRoot();

function report(label) {
  let vertices = 0;
  let triangles = 0;
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const count = primitive.getAttribute('POSITION')?.getCount() ?? 0;
      vertices += count;
      triangles += (primitive.getIndices()?.getCount() ?? count) / 3;
    }
  }
  console.log(
    `${label.padEnd(11)}${root.listMeshes().length} mallas · ${vertices} vértices · ${Math.round(triangles)} triángulos · ${root.listTextures().length} texturas`,
  );
}

report('original');

// 1. El cubo auxiliar de Sketchfab no forma parte de la araña.
for (const node of root.listNodes()) {
  if (node.getName() !== 'Cube_2') continue;
  for (const child of node.listChildren()) child.dispose();
  node.dispose();
}

await document.transform(
  prune(),
  dedup(),
  flatten(),
  join(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR }),
  center({ pivot: 'center' }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

// Un nombre estable para encontrarla en runtime.
for (const node of root.listNodes()) {
  if (node.getMesh()) node.setName('huntsman');
}

report('optimizado');

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
await io.write(TARGET, document);

const mb = (file) => (fs.statSync(file).size / 1048576).toFixed(2);
console.log(`${path.relative(ROOT, TARGET)}  ${mb(SOURCE)} MB → ${mb(TARGET)} MB`);

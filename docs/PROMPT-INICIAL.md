# Prompt de arranque

Pégalo entero en una sesión nueva de Claude Code, dentro de la carpeta donde
vaya a vivir Delyra, con los archivos del kit ya copiados ahí.

Antes de pegarlo, comprueba dos cosas: que `gh auth status` responde
autenticado, y que los archivos del kit están en su sitio (`CLAUDE.md` en la
raíz, `content/`, `lib/`, `docs/`, `scripts/`, `app/globals.css`,
`.github/`).

---

Vas a construir Delyra. No empieces a escribir código hasta el punto 4.

## 1. Lee lo que ya existe

Este repositorio no está vacío. Contiene el modelo de datos, el contenido
inicial y todos los motores ya escritos y probados. Tu trabajo es montar la
aplicación alrededor de ellos, no rehacerlos.

Lee, en este orden:

- `CLAUDE.md` — la constitución. Manda sobre todo lo demás, incluido este
  mensaje. Si algo aquí la contradice, gana ella y me lo dices.
- `docs/ARANA.md` — la metáfora del artefacto, que es vinculante: once patas,
  una red, un Aleph en el centro. Si una funcionalidad no cabe en el animal,
  pregúntame antes de construirla.
- `docs/DESIGN.md` — paleta, tipografía, distribución, movimiento.
- `docs/MUSEO.md` — reglas del gabinete de figuras.
- `docs/PROMPTS.md` — las diez fases. **No las ejecutes todas.** Hoy haces la
  fase 0 y paras.

Después dime en cinco líneas qué has entendido que es esto. Si tu resumen no
menciona un botón que devuelve algo inesperado, vuelve a leer.

## 2. Inventario: qué es cada archivo y qué hacer con él

Todo lo siguiente **ya está escrito, probado y funcionando**. No lo reescribas,
no lo refactorices, no lo «mejores». Cablearlo es el trabajo.

**Contenido** — datos, versionados en git, sin base de datos:

| Archivo | Qué es | Qué haces |
|---|---|---|
| `content/entries/*.json` | 17 entradas, una por archivo | las cargas; nunca las fusionas en un solo JSON |
| `content/categories.json` | las 11 patas, con `leg` (posición en el anillo) y `glyph` | lees el orden de aquí; no lo hardcodeas |
| `content/contributors.json` | diego y paola | autoría, que el motor usa |
| `content/figures.json` | 30 figuras del gabinete, con emblema | fase 6 |
| `content/rooms.json` | 7 salas con criterios no obvios | fase 6 |

**Motores** — lógica pura, sin React, testeable sin montar nada:

| Archivo | Qué resuelve |
|---|---|
| `lib/schema.ts` | esquema zod y `validateCorpus()`. Es la fuente de verdad del modelo de datos |
| `lib/content/loader.ts` | carga entradas, categorías, figuras; calcula qué categorías están visibles |
| `lib/oracle/rng.ts` | PRNG sembrado. **Toda** la aleatoriedad pasa por aquí |
| `lib/oracle/weighted.ts` | los cuatro modos como vectores de peso, y la selección ponderada |
| `lib/oracle/history.ts` | historial en localStorage para la anti-repetición |
| `lib/oracle/index.ts` | `draw()`: una entrada con modo, filtros y anti-repetición |
| `lib/oracle/invoke.ts` | **el motor de botones**. `invoke(corpus, seed, patas)` devuelve entrada, arista, constelación o deriva, con el dictamen |
| `lib/aleph/tension.ts` | física del Aleph: qué hace la esfera cuando se apoya cada pata |
| `lib/drift/graph.ts` | grafo de relaciones, `buildDrift()` y `shortestPath()` |

Dos constantes que no se tocan sin avisarme: los números de `tension.ts` están
medidos, y los pesos de los modos en `weighted.ts` están calibrados.

**Herramientas y estilo:**

- `scripts/validate.ts` → `npm run validate`. Debe correr antes de cada build.
- `scripts/capture.mjs` → `npm run capture`. Captura rápida de una anomalía.
- `app/globals.css` → tokens de color, tipografía y estados epistémicos. No
  inventes colores fuera de estos tokens.
- `.github/ISSUE_TEMPLATE/anomalia.yml` → captura desde el móvil.

## 3. Saquea el tarot

Existe un artefacto anterior mío del que conviene heredar decisiones:
`dojedacifuentes/tarot-de-la-conjetura`. Es privado, así que clónalo tú:

```
gh repo clone dojedacifuentes/tarot-de-la-conjetura ../tarot-de-la-conjetura
```

Si `gh` falla, dímelo y te lo pongo yo en esa ruta. No sigas sin él.

Léelo entero antes de copiar nada. Quiero un informe de una página con:

1. **Configuración que se reutiliza tal cual** — versiones, `next.config`,
   `tsconfig`, Tailwind, carga de fuentes, ajustes de Vercel. Esto ya funcionó
   una vez; no lo reinventes.
2. **La animación de revelado.** El tarot ya resuelve el momento «pulso y
   aparece algo». Extrae el mecanismo y adáptalo a la ficha de entrada, con
   los tiempos de `docs/DESIGN.md`, no con los suyos.
3. **Cómo carga y tipa el contenido**, y si su patrón aguanta 300 entradas.
4. **Qué NO se trae.** En concreto, señálame cada sitio donde use
   `Math.random()`, guarde el contenido en un único archivo, o meta lógica de
   selección dentro de un componente. Las tres cosas están prohibidas aquí y
   quiero saber si vienen de allí.
5. **Cualquier three.js o WebGL** que ya tenga, aunque sea mínimo: sirve de
   base para el Aleph.

Marca cada hallazgo como **reutilizar**, **adaptar** o **descartar**, con una
línea de motivo. No copies ningún archivo hasta que yo vea el informe.

## 4. Monta el andamio

Solo después de lo anterior:

- Next.js 15, App Router, TypeScript, Tailwind, sin `src/`.
- Dependencias: `zod`, `tsx`, `vitest`, `three`, `@react-three/fiber`. Ninguna
  más sin justificármela.
- Coloca en su sitio los archivos del kit sin modificarlos.
- `npm run validate` conectado a `scripts/validate.ts`, y `npm run build`
  dependiendo de él.
- Un GitHub Action que corra validate y test en cada push.
- Trae del tarot lo que hayas marcado como reutilizar.

**No crees ningún componente todavía.** Ni portada, ni esfera, ni patas.

## 5. Enséñame

Al terminar, y nada más que esto:

- el árbol de archivos;
- el informe del tarot con sus tres marcas;
- la salida de `npm run validate`, que debe decir 17 entradas válidas y 7
  categorías visibles;
- qué decisiones tomaste que no estaban especificadas;
- qué te pareció mal o dudoso de lo que ya estaba escrito.

Esa última no es retórica. Si algo del kit te parece un error, dilo ahora.

Y para. No empieces la fase 1.

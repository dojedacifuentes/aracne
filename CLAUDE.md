# DELYRA — reglas del proyecto

Lee este archivo completo antes de tocar nada. La especificación larga está en
`docs/SPEC.md`; este archivo manda sobre ella si hay conflicto.

## Qué es

Una araña de once patas sobre una red. El cuerpo es un Aleph: una esfera que se
pulsa. Las once patas son las once categorías. La red es el grafo de relaciones
entre entradas. Se apoyan las patas que se quieran, se pulsa la esfera, y sale
algo que no se estaba buscando.

La metáfora está desarrollada en `docs/ARANA.md` y es vinculante: si una
funcionalidad no cabe en el animal, probablemente no hace falta.

El archivo no lleva firma. Una entrada no dice quién la escribió, y el motor no
sabe distinguir a nadie: lo que se conserva de cada una es de dónde sale, qué
toca y con qué se cruza.

## Reglas duras

1. **Sin base de datos.** El contenido son archivos JSON en `content/entries/`,
   uno por entrada. Versionados en git. Nunca un `entries.json` único.
2. **Sin API de IA en el núcleo.** El motor debe funcionar y ser testeable sin
   red. Una capa de IA podrá leer el archivo más tarde; nunca escribirlo.
3. **Sin `Math.random()`.** Toda aleatoriedad pasa por el PRNG sembrado de
   `lib/oracle/rng.ts`. Una invocación se identifica por su semilla y es
   reproducible y compartible.
4. **Nada inventado.** Si no puedes verificar una fuente, la entrada va con
   `epistemicStatus: "unverified"` y `sources: []`. Jamás fabriques un autor,
   un año, una cita o una URL. Ante la duda, `unverified`.
5. **El estado epistémico siempre es visible** cuando no es `fact`.
6. **`validateEntry` corre en build.** Una entrada inválida falla el build, no
   rompe la app en runtime.

## Anti-patrones

- No crear archivos que no se usen. No instalar dependencias sin justificar.
- No abstraer antes de tener tres casos. No reescribir lo que funciona.
- Nada de gamificación: puntos, niveles, rachas, logros, confeti.
- Nada de texto revuelto tipo "descifrando", glow, scanlines, neón, gradientes.
- No más de un color de acento en pantalla.
- Prefiero 500 líneas buenas a 5.000 innecesarias.

## Modelo de datos (resumen; la fuente de verdad es `lib/schema.ts`)

```ts
id            "delyra-0047"
title         string
type          concept | work | case | phenomenon | experiment | paradox
              | question | place | event | object | character | portal
              | technology | theory | anomaly
categories    string[]   // ids de content/categories.json
tags          string[]   // minúsculas, sin acentos en el id, singular
content       string     // 60–140 palabras. Prosa. Sin listas.
question      string     // una sola, abierta, sin respuesta implícita
sources       [{ label, author?, work?, year?, url?, kind }]
epistemicStatus  fact | hypothesis | fiction | speculation
                 | interpretation | controversial | unverified
scores        { strangeness, darkness, fictionality }  // 1–5
sensitive     boolean    // activa el aviso de contenido educativo
related       string[]   // ids, relación explícita, bidireccional
addedAt       "YYYY-MM-DD"
```

Tres puntuaciones, no seis. Si añades una cuarta, tendrás que justificarla.

## Categorías

Son once, están en `content/categories.json` y cada una tiene su posición fija
en el anillo (`leg`) y su glifo. El orden del anillo es afinidad: patas vecinas
cruzan bien, patas lejanas cruzan mal, y eso es información que la interfaz usa.

Una categoría **se muestra en la interfaz solo cuando tiene 3 o más entradas** — eso se calcula, no se marca a mano. El
archivo se enciende solo a medida que crece. Lo que no llega a 3 entradas vive
como tag.

No hardcodees categorías, ni su orden, ni su número, en ningún componente.

## El gabinete

`content/figures.json` y `content/rooms.json`: treinta figuras históricas en
siete salas con criterios no obvios. Ninguna figura se representa por su cara:
cada una tiene un emblema, un objeto. Reglas en `docs/MUSEO.md`.

El campo `note` de una figura es un hecho verificable y poco citado, nunca una
valoración de su obra. Si el dato se puede adivinar, busca otro.

## Los dictámenes

El motor compone una línea críptica en cada invocación, sin IA, a partir de
plantillas en `lib/oracle/invoke.ts`. Regla absoluta: **un dictamen nunca
afirma nada sobre el mundo**. Señala dónde mirar, no qué concluir. Si una
plantilla produce una frase que alguien podría citar como hecho, está mal
escrita y se borra.

## Voz de la interfaz

Seca, breve, en minúsculas o sentence case. Ningún botón debe sonar a profecía.

Bien: `invocar` · `otra` · `derivar` · `sin ruta todavía` · `pendiente de verificar`
Mal: `Adéntrate en el abismo` · `El oráculo ha hablado` · `Desbloquea tu deriva`

Vacío y error son instrucciones, no atmósfera: *"todavía no hay entradas en
esta categoría. añade una."*

## Diseño

Tokens en `app/globals.css` y razones en `docs/DESIGN.md`. No inventes colores
fuera de los tokens. Dos familias tipográficas, una serif editorial para el
cuerpo y una mono para identificadores y datos. La mono es para números y
metadatos, no para párrafos ni para titulares.

Un solo momento de movimiento: la aparición de la entrada, 320 ms.
`prefers-reduced-motion` lo reduce a un fundido.

## Cómo trabajas

Una fase por sesión. Las fases están en `docs/PROMPTS.md`.

Antes de escribir código: inspecciona el repo, di qué archivos vas a tocar y
por qué, en cinco líneas. Al terminar: `npm run validate`, `npm test`,
`npm run build`, y un resumen de lo que cambió y lo que quedó pendiente.

No pases a la fase siguiente por tu cuenta. Para y espera.

## Commits

`fase(N): qué cambió` para código. `entrada: título` para contenido nuevo.
Un commit por entrada. El historial de git es parte del artefacto.

## Arquitectura (decidido en la fase 0)

El kit suponía Next.js. Por decisión expresa, Aracne usa la arquitectura de
*tarot de la conjetura*: Expo SDK 57, React Native 0.86 con react-native-web y
three.js sin React Three Fiber. Donde este archivo nombra piezas de Next,
léase:

| kit | aquí |
|---|---|
| `app/page.tsx` | `ui/screens/` |
| `app/globals.css` | `ui/theme.ts` |
| Tailwind | `StyleSheet` de React Native |
| rutas `/i/[seed]`, `/e/[id]`… | enrutado en cliente sobre una sola escena |

`lib/`, `content/`, `scripts/` y `docs/` están donde el kit dice. Los motores
que el kit daba por escritos y no venían (`lib/oracle/rng.ts`, `weighted.ts`,
`history.ts`, `index.ts`, `lib/content/`, `scripts/validate.ts`) se
reconstruyeron en la fase 0; los pesos de `weighted.ts` son provisionales.
Detalle en `docs/TAROT.md`.

Desde la fase 1 el cuerpo que se pulsa no es una esfera: es una araña 3D que
cuelga de su hilo (`ui/components/spider/`, razones en `docs/ARANA-3D.md`). La
física de `lib/aleph/tension.ts` sigue mandando sobre su movimiento, y todo lo
ajustable está en `spiderConfig.ts`.

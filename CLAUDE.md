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

## Las biografías

`content/figures.json` y `content/themes.json`: cuarenta y cuatro figuras
históricas repartidas en nueve temas. Los temas no agrupan vidas sino
**problemas**: no por siglo, ni por escuela, ni por circunstancia biográfica.
Una figura está en un tema y en uno solo. Reglas en `docs/BIOGRAFIAS.md`.

Cada figura lleva una `idea` —algo que pensó, dicho de manera que no se pueda
adivinar—, una `note` —un hecho verificable y poco citado, nunca una valoración
de su obra— y, si la hay, `works`: obras que se pueden abrir.

**Una URL no se escribe de memoria.** Se busca en el catálogo de quien la
sirve, se pide y solo entra si contesta con lo que se esperaba. Si no hay obra
abierta y estable, `works: []` y la ficha lo dice.

Ninguna figura se representa por su cara: cada una tiene un emblema, un objeto
de 32×32. Se dibujan mirándolos, no solo escribiéndolos.

## El Atlas de la extinción

`content/atlas/causes.json` y `content/atlas/world.json`: un mapa mundial con un
score de exposición por país frente a treinta y cuatro finales. Reglas en
`docs/ATLAS.md`.

Es ficción y lo dice en pantalla, pero **ninguna puntuación se escribe a mano**:
cada causa trae una regla, la regla lee datos con procedencia (Natural Earth) y
la ficha enseña la cuenta entera. El score general de un país es el **máximo**
de sus causas, nunca la suma. Las causas que le tocan igual a todo el mundo
quedan fuera del reparto, porque no distinguen a nadie.

Una causa que reparte tiene que repartir: si entre el percentil 5 y el 95 no
hay veinticinco puntos, `npm run validate` falla. Y lo que no tiene población no
se puntúa.

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

**Tres excepciones, y solo tres.**

La primera: la piel `flujo` de `/tela` está viva. Por sus
trazas corren pulsos y el nodo del centro respira, porque ahí el dibujo no
ilustra el archivo, **es** el archivo leído como circuito. Decisión expresa de
quien dirige el proyecto, tomada sabiendo lo que dice el párrafo anterior. Las
condiciones: no sale de esa piel —la de seda está quieta y hay una comprobación
de que lo está—, no usa más color que el acento de siempre, se apaga entera con
`prefers-reduced-motion`, y si el bucle no corre el diagrama se ve igual. No la
borres por doctrina: la doctrina ya la contempla aquí.

La segunda: **el Atlas de la extinción tiene rampa de calor**. Un mapa de calor
sin rampa es una mancha. También es decisión expresa, y también viene con
condiciones: no hay color nuevo, hay uno estirado —la rampa va de la ceniza a
la llama pasando por el acento de siempre—, no sale de `/atlas`, y el frío de
la máquina (retículas, escuadras, barrido) es del instrumento y nunca del
contenido. Razones en `docs/ATLAS.md`.

La tercera: **el instrumento es frío**. Desde la fase 15 la pantalla es un
archivo editorial y, además, una máquina de consultar, y una sola regla separa
las dos cosas: el contenido es editorial y cálido; el instrumento, frío y
pequeño. El frío es `machine`, el color que el Atlas ya usaba para sus
retículas, y sale del Atlas para marcar lo que se puede tocar: el foco, los
conmutadores, los cajones, las cuentas vivas. También es decisión expresa, y
también con condiciones: no es un color nuevo ni un segundo acento, nunca va en
lo que se lee —título, cuerpo, pregunta—, y lo prohibido sigue prohibido: ni
neón, ni *glow*, ni degradados. Razones en `docs/DESIGN.md`.

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

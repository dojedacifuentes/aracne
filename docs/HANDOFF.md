# Handoff

Para retomar Aracne en otra sesión, con otro modelo o con otra persona. Léelo
entero antes de tocar nada, y después `CLAUDE.md`, que manda sobre todo esto.

`docs/ESTADO.md` cuenta la historia de cada fase. Este archivo cuenta **dónde
estás parado y qué conviene hacer a continuación**.

---

## 0. Coordenadas

| | |
|---|---|
| repositorio | `https://github.com/dojedacifuentes/aracne.git` |
| rama de trabajo | `main` |
| otra rama viva | `diseno-denso` (rediseño a medias, ver §3) |
| ruta local | `C:\Users\Asus\Desktop\aracne` |
| desplegado en | `https://aracne-mu.vercel.app` |
| plataforma | Vercel, `buildCommand: npm run build`, salida `dist` |

### Mapa del repositorio

```
CLAUDE.md              reglas del proyecto. MANDA SOBRE TODO. Léelo primero.
docs/
  HANDOFF.md           este archivo
  ESTADO.md            historia de cada fase y decisiones tomadas
  ARANA.md             la metáfora del animal. Vinculante.
  ARANA-3D.md          por qué la araña es 3D y cómo se comporta
  DESIGN.md            paleta, tipografía, qué no se hace nunca
  BIOGRAFIAS.md        reglas de las biografías: temas, ideas, enlaces, emblemas
  PROMPTS.md           las fases 0 a 9, en orden
  TAROT.md             qué se heredó del proyecto anterior

content/               EL ARCHIVO. Sin base de datos: JSON versionado.
  entries/*.json       44 entradas, una por archivo
  categories.json      las once patas, con su posición en el anillo y glifo
  figures.json         44 biografías: tema, idea, hecho, obras, emblema
  themes.json          los nueve temas y su criterio
  index.generated.ts   lo escribe `npm run validate`. No editar.

lib/                   el motor. Puro, sin React, probable sin pantalla.
  schema.ts            fuente de verdad del modelo de datos (zod)
  labels.ts            los ids van en inglés; la interfaz habla español
  content/corpus.ts    parseo y validación cruzada del contenido
  content/loader.ts    carga el archivo una vez
  oracle/rng.ts        el PRNG sembrado. TODA la aleatoriedad pasa por aquí.
  oracle/invoke.ts     qué sale al pulsar: formas, puentes, fallas, dictámenes
  oracle/weighted.ts   los cuatro modos. PESOS PROVISIONALES desde la fase 0.
  oracle/index.ts      draw() y pressSeed(), con anti-repetición
  oracle/history.ts    memoria corta de lo que ya salió
  aleph/tension.ts     física del anillo: legAngle, alephState, muelles
  drift/graph.ts       el grafo: scoreLink, neighbours, buildDrift, shortestPath
  drift/layout.ts      dónde se dibuja cada entrada sobre el anillo
  drift/modes.ts       dos mundos y distancia (diámetro del grafo)
  archive/filter.ts    filtros, facetas y búsqueda local con acentos plegados
  archive/shape.ts     la forma del archivo para /adn
  museum/themes.ts     temas calculados desde las figuras

ui/
  theme.ts             los seis colores y las dos familias. No hay más.
  screens/HomeScreen.tsx   UNA sola escena; la ruta decide qué muestra el panel
  lib/route.ts         todas las rutas y su ida y vuelta a la URL
  lib/copy.ts          textos del resultado. Solo leen metadatos reales.
  lib/epistemic.ts     STATUS_BORDER y THREAD_STYLE: el trazo codifica certeza
  components/          Tela, Tejido, DriftView, EntryView, ArchiveView,
                       LivesView, FigureView, ShapeView, CommandPalette,
                       LegRing, Sigil, Emblem, Reveal…
  lib/sigil.ts         los sellos: geometría simétrica, calculada y probada
  components/spider/   la araña 3D: rig, escena, seda, config, fallback SVG

scripts/
  validate.ts          valida y genera el índice. Corre antes de todo.
  og.mjs               permalinks + imagen Open Graph por entrada, en build
  sprites.mjs          dibuja los emblemas de las biografías
  capture.mjs          alta de entrada por consola

tests/                 12 archivos, 110 pruebas
public/figures/        44 emblemas SVG de 44
public/models/spider/  el GLB de la araña (87 000 triángulos)
```

### Rutas de la aplicación

| ruta | qué |
|---|---|
| `/` | la portada: la araña, y las once patas en órbita a su alrededor |
| `/i/<semilla>?patas=…&sala=…` | una invocación, reproducible y compartible |
| `/e/<id>` | una entrada. Tiene HTML propio con Open Graph. |
| `/deriva/<semilla>?modo=…` | la red dibujada. Modos: deriva, dos-mundos, distancia. |
| `/tela` · `/tela/<id>?vista=flujo` | la red entera, o tejida en torno a una entrada |
| `/biografias` · `/biografias/<tema>` · `/figura/<id>` | las vidas (antes `/gabinete`, que sigue valiendo) |
| `/archivo?categorias=…&tipos=…&q=…` | filtros y búsqueda, todo en la URL |
| `/adn` | la forma del archivo |

Todo se enruta en cliente sobre **una sola escena**. `vercel.json` reescribe
cualquier ruta a `/`, salvo los `dist/e/<id>/index.html` que genera `og.mjs`.

---

## 1. Qué es esto, en una frase

Un archivo para encontrar lo que no estabas buscando. Once categorías son las
patas de una araña; se apoyan las que se quieran, se pulsa el animal y sale una
entrada, un par con lo que los une y lo que los separa, una constelación o una
deriva. Detrás hay un grafo real de entradas, y ese grafo se dibuja.

El archivo no lleva firma. Ninguna entrada dice quién la escribió y el motor no
distingue autores.

---

## 2. Estado medido

Cifras reales, no estimaciones. Se obtienen con `npm run validate` y el
diagnóstico de la sección 8.

| | |
|---|---|
| entradas | 44 |
| patas encendidas | 11 de 11 |
| grado medio del grafo | 18,2 vecinos |
| hilos dibujados | 139, de los que 27 cruzan el anillo |
| diámetro de la red | 3 pasos (*La habitación china* → *Un río que es alguien*) |
| biografías | 44, en 9 temas · 31 con obra enlazada |
| emblemas dibujados | 44 de 44 |
| medias | extrañeza 3,8 · oscuridad 2,8 · ficción 2,0 |
| estados epistémicos | 17 `fact` · 15 `unverified` · 6 `interpretation` · 5 `fiction` · 1 `controversial` |
| pruebas | 110, en 12 archivos |
| bundle web | ~2 MB |

**Las 15 `unverified` no son un descuido: son la cola editorial.** Cada una
lleva en `captureNote` la referencia exacta que hay que comprobar para
promoverla a `fact` con `sources` reales. Ese es el trabajo de contenido mejor
definido que hay ahora mismo.

---

## 3. Qué está construido

| fase | qué |
|---|---|
| 0 | Andamio sobre Expo 57 + React Native Web + three.js sin React Three Fiber. Motores del kit reconstruidos. |
| 1 | La araña 3D colgando de su hilo; física en `lib/aleph/tension.ts`. |
| 2 | Pulsar invoca. `/i/<semilla>?patas=…`, compartible y reproducible. |
| 3 | Ficha de entrada, permalink `/e/<id>`, Open Graph generado en build. |
| 4 | Contenido: de 17 a 44 entradas, las once patas encendidas. |
| 5 | **La red dibujada**: `/deriva/<semilla>` con tres modos, y la tela permanente. |
| 6 | El gabinete: `/gabinete`, salas, figuras, `invocar desde esta sala`. |
| 7 | `/archivo` con filtros en la URL, búsqueda local y paleta ⌘K. |
| 8 | `/adn`: la forma del archivo. Repartos por pata, tipo y estado, medias y tags. |
| 10 | Las once patas en órbita, los sellos geométricos y la tela con sitio propio en `/tela`. |
| 11 | El gabinete deja de ser salas y pasa a biografías por temas, con idea, obra enlazada y los 44 emblemas. |

**No está hecho:** fase 9 (`/hoy`, accesibilidad, repaso de microcopy).

En la rama `diseno-denso` hay un rediseño a medias, sin verificar en pantalla:
tipografía unificada en siete cuerpos —eso sí está terminado y con prueba— más
un carril permanente de patas y una columna de vínculos.

---

## 4. Lo que no se toca

Está en `CLAUDE.md` y en `docs/DESIGN.md`, pero conviene repetir lo que más
tienta romper:

- **Sin base de datos.** Un JSON por entrada en `content/entries/`.
- **Sin API de IA en el núcleo.** El motor funciona y se prueba sin red.
- **Sin `Math.random()`.** Todo pasa por el PRNG sembrado. Hay una prueba.
- **Nada inventado.** Sin fuente verificada: `unverified` y `sources: []`.
- **Un solo color de acento**, y ocupa menos del 5% de la pantalla.
- **Nada de** neón, glow, gradientes, glassmorphism, partículas, scanlines,
  sombras difusas bajo todo, bento grids ni un segundo acento.
- **Un solo momento de movimiento**: la aparición, 320 ms.

La referencia no es una terminal de ciencia ficción. Es un catálogo razonado de
museo impreso en papel oscuro.

---

## 5. La tela es la pieza central

Lo más importante que hay que conservar y ampliar.

`lib/drift/layout.ts` coloca cada entrada **en el sector de su categoría sobre
el anillo de las once patas**, reusando `legAngle` de la física de la araña. No
es un layout de fuerzas y no debe serlo: un layout de fuerzas ordena los puntos
por una física que aquí no significa nada, y convierte el dibujo en adorno.

Con este layout la posición afirma algo:

- dos puntos próximos comparten pata;
- **un hilo que atraviesa el centro une dos patas lejanas**, y como el orden del
  anillo es afinidad, un hilo largo es un cruce improbable;
- los círculos huecos con borde de acento son las entradas sin verificar, así
  que se ve de un vistazo qué parte del archivo está pendiente.

Hay una prueba que lo protege: *dos entradas de la misma pata caen, de media,
más cerca que dos de patas opuestas*. Si alguien cambia el layout y esa prueba
falla, el dibujo ha dejado de significar algo.

**La tela ya no vive al fondo de la portada.** Hasta la fase 10 se dibujaba
tenue detrás de la araña en todas las rutas; molestaba, y por decisión expresa
se mudó a `/tela`, que se abre con un botón pequeño. Ahí se dibuja con más
hilos, se reteje alrededor de la entrada que se pulse y se puede leer con dos
pieles: seda o traza de circuito.

Lo que **no** cambió y no debe cambiar: la semilla sigue fija —si cambiara en
cada visita los puntos saltarían de sitio y dejaría de ser un mapa—, la posición
la sigue mandando la pata, y la prueba del layout sigue en verde. Las dos pieles
dibujan el hilo de otra manera **entre los mismos puntos**.

---

## 6. Qué hacer a continuación

Por orden. Las tres primeras son las que más cambian la experiencia y ninguna
necesita servicios externos.

### 6.0 Lo que se hizo en las fases 10 y 11

Tres cosas que estaban aquí como pendientes y ya no lo están:

- **Las once patas en órbita** (era 6.1). Cada pata está en el ángulo que
  `legAngle` calcula para la física, apoyarla tensa un hilo hacia el animal y la
  araña se desplaza hacia las que se apoyan. En vertical no cabe un anillo de
  once, así que ahí siguen en fila.
- **La red contextual** (era 6.2, `/tejido`). Vive en `/tela`. Pulsar un nodo lo
  pone en el centro, enciende a sus vecinos directos y deja el resto en sombra
  —no borrado: se puede saltar lejos—. A dos pasos no se recortaba nada: con
  grado medio 18 sobre 44, a dos pasos está el archivo entero.
- **Los 44 emblemas** (era 6.3). Están los 44. Cuatro hubo que tirarlos después
  de verlos: el nudo de Gödel parecía un reloj de pared, el guante de Deleuze un
  peine, las sillas de montar un borrón y la torre sin ventanas tenía una
  ventana. **Se dibujan mirándolos**, en `public/figures/`, no leyendo el código.

### 6.3 Lo que le falta a las biografías

El gabinete de siete salas ya no existe: las figuras se agrupan por nueve temas
—problemas, no circunstancias— y cada una lleva idea, hecho y, si la hay, obra
enlazada. Reglas en `docs/BIOGRAFIAS.md`. Lo que queda:

- **Trece figuras sin obra que abrir**, todas de autores vivos o recientes. Si
  aparece una edición abierta y estable, entra; si no, la ficha sigue diciendo
  que no la hay. Una URL no se escribe de memoria: se comprueba pidiéndola.
- **Las entradas ligadas están mal repartidas**: *La hora del búho* tiene una
  sola. Ligar entradas a figuras es trabajo de contenido, no de código.
- Los temas son nueve y las patas once, y no se corresponden a propósito. Si
  alguien los alinea, que sea por una razón escrita.

### 6.3bis Lo que ya se aplicó de la literatura de UX

De una investigación sobre interfaces de colecciones digitales se aplicaron
tres cosas; el resto se descartó y está en la sección 7.

- **«No todos los enlaces deben mostrarse igual.»** Los hilos de la tela ya no
  se dibujan todos con el mismo trazo: la razón del vínculo decide el estilo,
  siguiendo la gramática que el proyecto ya usaba para el estado epistémico —
  **el trazo codifica la certeza, nunca el color**. Continuo lo que el archivo
  declara, discontinuo la misma pata, punteado el mismo tipo. Está en
  `THREAD_STYLE` (`ui/lib/epistemic.ts`), con leyenda y tres pruebas, una de
  ellas para que nadie meta color ahí dentro.
- **«¿Por qué aparece este enlace?»** Pulsar un hilo dice por qué existe,
  usando el mismo `linkText()` que nombra los pasos de la deriva: un vínculo no
  puede llamarse de dos maneras según dónde se lea.
- **«Interfaz generosa» (Whitelaw).** Buscar obliga a preguntar y esconde el
  resto. `/adn` enseña cuánto hay y cómo está repartido, con barras de una
  línea sin librería de gráficos: la longitud da la proporción y el número da
  el dato exacto.

### 6.4 En cada entrada: por qué llegaste aquí

Dos añadidos pequeños con mucho efecto:

- una miga de pan con la genealogía — `telarañas → borges → autorreferencia`, o
  `apareció por: telarañas + lógica` si vino del oráculo;
- una sección **hilos conectados** con 3–5 entradas vecinas y la razón de cada
  una.

Lo segundo está calculado y probado; solo hay que mostrarlo en la ficha. Es la
diferencia entre que Aracne parezca inteligente o parezca aleatoria.

### 6.5 Una sola frase de bienvenida

En la primera visita, una línea: `elige una o más patas, o pulsa la araña.`
Después desaparece para siempre, en `localStorage`. Nada de tour de tres pasos:
el problema de una interfaz misteriosa no es el misterio, es no saber qué se
puede tocar.

### 6.6 HTML previo para buscadores y para compartir

Estado real, comprobado sobre el despliegue:

- **Las entradas sí tienen metadatos.** `scripts/og.mjs` genera, en cada build,
  un `dist/e/<id>/index.html` con su propio `<title>`, su `og:description` y una
  imagen Open Graph de 1200×630 por entrada. Verificado en producción: el título
  de `/e/delyra-0020` llega como *La araña en las meninges · aracne*.
- **Lo que falta** es el *cuerpo*: el HTML de todas las rutas es la cáscara de
  la SPA, así que un rastreador sin JavaScript no lee ni una línea de texto.
- **Y falta el resto de rutas**: portada, `/gabinete`, `/figura/<id>` y
  `/archivo` no tienen título ni descripción propios.

El arreglo no necesita cambiar de framework. `og.mjs` ya escribe cáscaras por
entrada: basta con inyectar además el texto de la entrada dentro de un
`<noscript>` o del propio `<div id="root">`, y generar cáscaras equivalentes
para la portada y las figuras.

### 6.7 Estado de carga

El bundle pesa 1,72 MB. Hasta que arranca, la pantalla está en negro sin nada.
Una marca mínima en el `index.html` —el identificador en mono, sin animación—
evita el rebote. Es barato y no toca la doctrina visual.

### 6.8 Exportar la tela

Un botón que baje el SVG de la red tal y como está en pantalla. Es casi gratis,
porque ya se dibuja con `react-native-svg`, y hace el trabajo portátil.

---

## 6bis. Economía cognitiva: lo que ya se hizo y lo que falta

El área de lectura eran **254 px de una pantalla de 720**: el resto se lo comían
la tela, el encabezado y los botones, mientras media pantalla de ancho quedaba
vacía. Medido antes y después, en pantallas de scroll:

| | antes | ahora |
|---|---|---|
| alto útil de lectura | 254 px | **520 px** |
| entrada | 3,92 | **1,45** |
| figura | 2,95 | **1,38** |
| sala del gabinete | 6,40 | **1,44** |
| gabinete | 4,42 | **2,06** |
| archivo | 21,44 | **6,65** |
| portada | — | **cabe entera** |

Cómo, sin encoger ni una letra: la tela salió del flujo vertical al fondo del
escenario; el escenario cedió ancho a la columna de lectura; los metadatos de la
ficha pasaron a una banda estrecha **al lado** del texto, que es la disposición
del catálogo de museo; y las listas de figuras y de resultados van en dos
columnas.

Una lección que conviene no perder: **dos columnas no siempre ahorran**. Las
salas del gabinete empeoraron al partirlas, porque su contenido es un criterio
en prosa y estrechar la caja lo alarga. Se dejaron a una columna. La rejilla
sirve para filas cortas, no para párrafos.

Lo que queda por hacer en esta línea:

- El archivo sigue en 6,65 pantallas. Es una lista de 44 resultados, así que
  algo de scroll es legítimo, pero los filtros podrían quedarse fijos mientras
  solo scrollean los resultados.
- La entrada está en 1,45. Lo que sobra es el final del cuerpo; con la ficha
  dividida en dos columnas de altura desigual hay hueco bajo los metadatos que
  todavía no se aprovecha.

## 7. Lo que se descartó, y por qué

Para que nadie lo vuelva a proponer sin saber que ya se pensó.

| propuesta | por qué no |
|---|---|
| `@xyflow/react`, `vis-network` u otra librería de grafos | La tela son ~150 líneas con `react-native-svg`, que ya era dependencia. Y un layout de fuerzas destruiría lo único que hace informativo el dibujo: que la posición sea la categoría. `CLAUDE.md`: no instalar dependencias sin justificar. |
| Framer Motion, bento grid, glassmorphism, gradientes, fondo de puntos, segundo color | Prohibidos explícitamente en `docs/DESIGN.md`. Es lo que convertiría Aracne en otro proyecto oscuro genérico. |
| Observatorio con datos en vivo (sismos, vuelos, viento) | Depende de APIs externas, y la regla 2 dice que el motor tiene que funcionar y probarse sin red. Las entradas que hablan de esos portales ya existen como texto. |
| Plantillas de un clic | Aracne no es un lienzo donde el visitante cree cosas. No hay nada que plantillar. |
| Tour guiado de tres pasos | Demasiado para esta voz. Basta la frase de 6.5. |
| Paleta de comandos ⌘K | **Ya existe** desde la fase 7: buscar, invocar, saltar a pata, abrir sala. |
| Cuentas de usuario, colecciones personales, comentarios, rutas compartidas | Piden un backend con estado. `CLAUDE.md`: sin base de datos. |
| Google Analytics, Hotjar, mapas de calor, A/B testing | Servicios externos y datos de navegación de terceros. Las métricas que sí se pueden medir se miden aquí sobre el contenido, no sobre las personas. |
| Neo4j, Sigma.js, ReGraph, D3 | El grafo son 44 entradas en archivos JSON y el dibujo son 150 líneas. Un motor de grafos no resuelve ningún problema que exista. |
| Botón «explorar aleatoriamente» | **Ya existe, y es la araña.** Todo el oráculo es serendipia por diseño desde la fase 2. |
| Tour guiado, modales de onboarding, tooltips de ayuda | Contradice la voz: ningún botón debe sonar a instrucción. Basta la frase de 6.5. |

Dos correcciones a auditorías externas que circulan sobre el proyecto: **no es
React/Vite/Next**, es Expo + React Native Web + three.js; y **las entradas sí
tienen Open Graph** desde la fase 3.

---

## 8. Cómo trabajar

### Arranque en frío

```bash
git clone https://github.com/dojedacifuentes/aracne.git
cd aracne
npm install
npm run validate   # OBLIGATORIO: escribe content/index.generated.ts
npm run web        # servidor de desarrollo en :8081
```

`typecheck` y `test` fallan si no has corrido `validate` antes: necesitan el
índice generado.

```bash
npm install
npm run validate   # valida el contenido y escribe content/index.generated.ts
npm run web        # servidor de desarrollo
npm test           # 88 pruebas
npm run build      # validate + expo export + permalinks con Open Graph
npm run sprites    # redibuja los emblemas de las biografías
```

`validate` es obligatorio antes de `typecheck` y `test`: escribe el índice que
los dos necesitan. El CI corre `validate`, `typecheck` y `test`, **pero no
`build`**: un fallo del build de producción no lo detecta GitHub.

Para medir el archivo, un diagnóstico desechable:

```ts
// scripts/_diag.ts — bórralo al terminar
import { loadArchive } from "../lib/content/loader";
import { neighbours } from "../lib/drift/graph";
import { longestReach } from "../lib/drift/modes";
const { corpus } = loadArchive();
const E = corpus.entries;
let t = 0; for (const e of E) t += neighbours(e, E).length;
console.log("grado medio", (t / E.length).toFixed(1), "· diámetro", longestReach(E)?.steps);
```

**Commits:** `fase(N): qué cambió` para código, `entrada: título` para contenido
nuevo, un commit por entrada. El historial es parte del artefacto.

**Una fase por sesión.** Inspecciona el repo, di qué archivos vas a tocar y por
qué en cinco líneas, y al terminar pasa las tres comprobaciones y resume lo
que quedó pendiente.

---

## 9. Trampas conocidas

Cosas que ya costaron una sesión y no hace falta redescubrir.

- **`requestAnimationFrame` no siempre dispara** (pestaña de fondo, ahorro de
  energía, captura). Ha mordido **tres veces**: el contador del identificador
  mostraba un número de catálogo falso, la aparición del texto lo dejaba a
  opacidad cero, y la araña se queda fuera del encuadre porque su descenso lo
  mueve el bucle de render. Los tres se asientan ahora con un plazo. Si añades
  animación, haz lo mismo: **la animación puede faltar, lo que se mira no**.
- **El plazo de la araña está verificado.** La corrección de
  `SpiderScene.web.tsx` comprueba si el bucle se paró, no si nunca arrancó —que
  era el error de la primera versión—. Medido el 2026-09-14 montando la app con
  `requestAnimationFrame` neutralizado desde antes del arranque, que es la
  condición exacta de una pestaña de fondo: la app pidió dos fotogramas, ninguno
  se sirvió, y aun así el lienzo quedó pintado —el hilo de 2 px bajando desde el
  borde superior y el cuerpo, de 114 a 165 px de ancho, entre el 44% y el 61%
  del alto—. La araña queda en su sitio sin un solo fotograma.
  Cómo repetirlo: el panel de vista previa **no sirve**, ni repinta el lienzo a
  demanda ni marca como ocultas sus pestañas de fondo. La medida se toma
  leyendo píxeles con `readPixels` sobre un iframe del mismo origen al que se le
  mata `requestAnimationFrame` y se le fuerza `preserveDrawingBuffer`. Una
  captura de pantalla no es prueba aquí: el WebGL no sale en ella.
- **`@vercel/og` no arranca fuera del runtime de Vercel.** `og.mjs` usa `satori`
  —su motor— y `sharp` directamente.
- **Los archivos del repo están en CRLF.** Un script que busque `\n` no casa
  nada: normaliza al leer y guarda en LF.
- **`files/`, `files2/` y los tres `.zip` de la raíz** son restos del kit
  original. No los usa nadie. Conviene borrarlos.
- **Vercel no tiene `SITE_URL` definida**, así que `og:image` sale con URL
  relativa y algunas redes no la leen. Se arregla en el panel, no en el código.

---

## 10. Primer día: qué hacer y qué no

Si retomas esto sin contexto, en este orden:

1. **Lee `CLAUDE.md` entero.** Manda sobre cualquier cosa que diga este archivo.
2. **Corre `npm run validate`.** Te dice en dos segundos si el archivo está sano
   y te imprime el reparto por pata y por sala.
3. **Abre `/adn` y `/deriva/<cualquier-semilla>`.** En un minuto ves qué hay y
   cómo está conectado, sin leer una línea de código.
4. **Elige UNA fase** de la sección 6 y quédate en ella. `CLAUDE.md` pide una
   fase por sesión, decir antes qué archivos vas a tocar en cinco líneas, y
   terminar con `validate`, `test` y `build`.

Lo que más tienta y más daño hace:

- **Instalar una librería de grafos.** El dibujo son ~150 líneas y su valor está
  en que la posición es la categoría. Un layout de fuerzas lo destruye.
- **Meter color para distinguir cosas.** El proyecto distingue con el trazo.
  Hay una prueba que falla si metes color en `THREAD_STYLE`.
- **Rellenar entradas sin verificar la fuente.** Si no la compruebas:
  `unverified` y `sources: []`. Nunca un autor, un año o una URL inventados.
- **Tocar `weighted.ts` a ciegas.** Sus pesos son provisionales desde la fase 0
  y cambiarlos cambia lo que devuelve cada semilla ya compartida.
- **Añadir animación sin plazo de seguridad.** Ver §9: ya ha mordido tres veces.

Y lo que está listo para empezar sin pensar mucho: **dibujar emblemas**
(§6.3, quedan 38, son diez líneas cada uno en `scripts/sprites.mjs`) y
**verificar las 15 entradas pendientes** (§2, cada una dice en `captureNote`
exactamente qué comprobar).

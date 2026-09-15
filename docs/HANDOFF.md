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
| otra rama viva | `diseno-denso` (rediseño viejo, superado por la fase 15) |
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
  ATLAS.md             reglas del Atlas de la extinción
  PROMPTS.md           las fases 0 a 9, en orden (histórico)
  TAROT.md             qué se heredó del proyecto anterior

content/               EL ARCHIVO. Sin base de datos: JSON versionado.
  entries/*.json       44 entradas, una por archivo
  categories.json      las once patas, con su posición en el anillo y glifo
  figures.json         44 biografías: tema, idea, hecho, obras, emblema
  themes.json          los nueve temas y su criterio
  atlas/world.json     177 territorios de Natural Earth, simplificados
  atlas/causes.json    34 causas de extinción, con su regla y sus tags
  index.generated.ts   lo escribe `npm run validate`. No editar.

lib/                   el motor. Puro, sin React, probable sin pantalla.
  schema.ts            fuente de verdad del modelo de entradas (zod)
  labels.ts            los ids van en inglés; la interfaz habla español
  content/corpus.ts    parseo y validación cruzada; esquemas de figura y tema
  content/loader.ts    carga el archivo una vez
  oracle/rng.ts        el PRNG sembrado. TODA la aleatoriedad pasa por aquí.
  oracle/invoke.ts     qué sale al pulsar: formas, puentes, fallas, dictámenes
  oracle/weighted.ts   los cuatro modos. PESOS PROVISIONALES desde la fase 0.
  oracle/index.ts      draw() y pressSeed(), con anti-repetición
  aleph/tension.ts     física del anillo: legAngle, alephState, muelles
  drift/graph.ts       scoreLink, neighbours, buildDrift, shortestPath, withinSteps
  drift/layout.ts      dónde cae cada entrada, y el trazado en ángulo recto
  drift/modes.ts       dos mundos, distancia, y las dos pieles de la tela
  archive/filter.ts    filtros, facetas y búsqueda local con acentos plegados
  archive/shape.ts     la forma del archivo para /adn
  museum/themes.ts     temas calculados desde las figuras
  atlas/score.ts       el motor de scores: factores, reglas, la cuenta explicada
  atlas/world.ts       esquemas del Atlas, dominante, fondo, escala del calor
  atlas/projection.ts  Robinson, zoom, encuadre. Puro.
  atlas/bridge.ts      el cruce Atlas ↔ archivo, por tags y patas
  atlas/loader.ts      carga y valida el Atlas una vez
  export/pdf.ts        un PDF escrito a mano. Sin dependencias.
  export/sheet.ts      la hoja: de ella salen el texto crudo y el PDF

ui/
  theme.ts             seis colores, dos familias, la rampa del Atlas y el frío
  screens/HomeScreen.tsx   UNA sola escena; la ruta decide qué va en el centro
  lib/route.ts         todas las rutas y su ida y vuelta a la URL
  lib/copy.ts          textos del resultado. Solo leen metadatos reales.
  lib/epistemic.ts     STATUS_BORDER y THREAD_STYLE: el trazo codifica certeza
  lib/sigil.ts         los sellos: marco poligonal, estrella y remates
  lib/download.ts      portapapeles, .txt y .pdf. Solo web.
  components/Shell.tsx     el armazón de tres columnas
  components/LegPanel.tsx  las once patas, como conmutadores
  components/          Tela, Tejido, AtlasView, LivesView, FigureView,
                       EntryView, InvocationView, ArchiveView, ShapeView,
                       CommandPalette, ExportRow, Sigil, Emblem, Reveal…
  components/spider/   la araña 3D: rig, escena, seda, config, fallback SVG

scripts/
  validate.ts          valida TODO el contenido y genera el índice
  atlas.mjs            descarga y simplifica el mundo (npm run atlas)
  og.mjs               permalinks + imagen Open Graph por entrada, en build
  sprites.mjs          dibuja los 44 emblemas
  capture.mjs          alta de entrada por consola

tests/                 14 archivos, 160 pruebas
public/figures/        44 emblemas SVG de 44
public/models/spider/  el GLB de la araña (87 000 triángulos)
```

### Rutas de la aplicación

| ruta | qué |
|---|---|
| `/` | la portada: la araña sola en el centro |
| `/i/<semilla>?patas=…&sala=…` | una invocación, reproducible y compartible |
| `/e/<id>` | una entrada. Tiene HTML propio con Open Graph. |
| `/tela` · `/tela/<id>?vista=flujo` | la red, entera o tejida en torno a una entrada |
| `/atlas` · `/atlas/<ISO>?causa=…` | el mapa del mundo y sus finales |
| `/deriva/<semilla>?modo=…` | los tres mapas de la red |
| `/biografias` · `/biografias/<tema>` · `/figura/<id>` | las vidas (antes `/gabinete`, que sigue valiendo) |
| `/archivo?categorias=…&tipos=…&q=…` | filtros y búsqueda, todo en la URL |
| `/adn` | la forma del archivo |

Todo se enruta en cliente sobre **una sola escena**. `vercel.json` reescribe
cualquier ruta a `/`, salvo los `dist/e/<id>/index.html` que genera `og.mjs`.

---

## 1. Qué es esto, en una frase

Un archivo para encontrar lo que no estabas buscando. Once categorías son las
patas de una araña; se apoyan las que se quieran, se pulsa y sale una entrada,
un par con lo que los une y lo que los separa, una constelación o una deriva.
Detrás hay un grafo real de entradas, y ese grafo se dibuja. Alrededor hay un
gabinete de biografías y un atlas de extinciones, los dos calculados.

El archivo no lleva firma. Ninguna entrada dice quién la escribió, el motor no
distingue autores y **lo que se exporta tampoco lleva firma**.

---

## 2. Estado medido

Cifras reales, no estimaciones. Salen de `npm run validate` y `npm test`.

| | |
|---|---|
| entradas | 44 |
| patas encendidas | 11 de 11 |
| grado medio del grafo | 18,2 vecinos |
| diámetro de la red | 3 pasos |
| biografías | 44, en 9 temas · 31 con obra enlazada |
| emblemas dibujados | 44 de 44 |
| Atlas | 177 territorios · 34 causas (10 uniformes) · 11 dominantes |
| scores del Atlas | de 45 a 98 |
| estados epistémicos | 17 `fact` · 15 `unverified` · 6 `interpretation` · 5 `fiction` · 1 `controversial` |
| pruebas | 160, en 14 archivos |
| bundle web | ~2,0 MB |

**Las 15 `unverified` siguen siendo la cola editorial.** Cada una lleva en
`captureNote` la referencia exacta que hay que comprobar.

---

## 3. Qué está construido

| fase | qué |
|---|---|
| 0–9 | Andamio, araña 3D, invocación, ficha, contenido, la red dibujada, gabinete, archivo, `/adn`, economía cognitiva. Detalle en `docs/ESTADO.md`. |
| 10 | Los sellos geométricos, y la tela fuera de la portada: `/tela`, con retejido y dos pieles. |
| 11 | Las biografías por temas: nueve temas, idea y hecho por figura, 31 obras enlazadas y comprobadas, los 44 emblemas. |
| 12 | Fluidez: marca de arranque sin JavaScript, tope al escalonado, hilos fuera del camino del cursor. |
| 13 | El flujo vivo: trazas en ángulo recto sobre rejilla, pulsos con estela, el nodo del centro respirando. |
| 14 | El Atlas de la extinción: mapa Robinson, 177 territorios, 34 causas con regla, ficha por país. |
| 15 | La consola: tres columnas, las patas como conmutadores, sellos poligonales, y exportación a texto y PDF. |

---

## 4. Lo que no se toca

- **Sin base de datos.** Un JSON por entrada en `content/entries/`.
- **Sin API de IA en el núcleo.** El motor funciona y se prueba sin red.
- **Sin `Math.random()`.** Todo pasa por el PRNG sembrado. Hay una prueba.
- **Nada inventado.** Sin fuente verificada: `unverified` y `sources: []`. Una
  URL no se escribe de memoria: se pide y se comprueba. Al escribir las obras
  de las biografías, una URL de Gutenberg recordada «con seguridad» devolvió
  una obra de Shakespeare.
- **La posición manda en la tela.** No es un layout de fuerzas y no debe serlo.
- **Un mapa que dice lo mismo en todas partes no es un mapa.** De ahí las dos
  reglas del Atlas: una causa que reparte tiene que separar 25 puntos entre el
  percentil 5 y el 95, y lo que no tiene población no se puntúa.

### Las tres excepciones a la doctrina visual

`docs/DESIGN.md` prohíbe movimiento, degradados y segundos colores. Hay tres
excepciones, **todas pedidas expresamente y todas escritas en `CLAUDE.md`**:

1. **La piel `flujo` de `/tela` está viva.** Pulsos con estela por las trazas y
   el nodo del centro respirando. No sale de esa piel; la de seda está quieta y
   hay una comprobación de que lo está.
2. **El Atlas tiene rampa de calor.** De la ceniza a la llama pasando por el
   acento de siempre: no hay color nuevo, hay uno estirado.
3. **La consola de la fase 15**: superficies, retículas y un frío de máquina
   (`machine`) para lo interactivo. La regla que queda en pie: **el frío es de
   lo que se puede tocar y el cálido es del contenido**.

No las borres por doctrina: la doctrina ya las contempla.

---

## 5. Cómo está montada la pantalla

Tres columnas (`ui/components/Shell.tsx`):

- **Izquierda**: las secciones, agrupadas, con barra de activo y una línea en
  mono que dice qué hace cada una.
- **Centro**: el contenido, con todo el ancho. En la portada, la araña sola.
- **Derecha**: las once patas como conmutadores (`LegPanel`) y el estado.

En vertical se apila: cabecera, fila de secciones, contenido, panel.

**Lo que se quitó y no debe volver sin pensarlo:** el anillo de patas en órbita
alrededor de la araña. Con varias apoyadas, sus hilos cruzaban por encima del
animal y tapaban justo lo que hay que mirar. Y el reparto viejo —escenario a un
lado, sección al otro— dejaba cada sección con media pantalla.

**Medir con la columna, no con la ventana.** Todos los lienzos —araña, tela,
atlas— se dimensionan con el ancho del centro. Calcularlos con
`useWindowDimensions` hacía que la araña se saliera por encima del menú. Y un
`ScrollView` crece por defecto: la columna lateral necesita un `View` con ancho
fijo por fuera.

---

## 6. Qué hacer a continuación

### 6.1 Vercel no desplegó la fase 15 — *lo primero*

Al cerrar la sesión, `main` estaba en `78b7b59` y **producción seguía sirviendo
`f908546`** (la fase 14). No es el build: GitHub Actions da el commit en verde,
y el registro de despliegues del repositorio no llega a crear ninguno para
`78b7b59`. El gancho de GitHub → Vercel no disparó.

Se arregla en el panel de Vercel: *Deployments → Redeploy*, o revisando
*Settings → Git*. Compruébalo antes de seguir: si no, lo que se ve en línea no
es lo que hay en el repositorio.

```bash
# qué paquete sirve producción ahora mismo
curl -s "https://aracne-mu.vercel.app/?t=$(date +%s)" | grep -o 'index-[a-f0-9]*\.js'
```

### 6.2 El panel de la derecha no cambia de sección

Hoy enseña siempre las once patas, esté uno en la portada o en el Atlas. Lo
suyo es que enseñe el instrumento de lo que hay delante: en el Atlas, la lente
y la leyenda; en la tela, las pieles y los mapas; en el archivo, las facetas.
`Shell` ya recibe `aside` como propiedad, así que es cosa de decidir qué va en
cada ruta.

### 6.3 Contenido, que es lo que más falta

- **Las 15 entradas `unverified`**, cada una con su `captureNote` diciendo qué
  comprobar. El trabajo mejor definido que hay.
- **Trece biografías sin obra enlazada**, todas de autores vivos o recientes.
- **Las entradas ligadas están mal repartidas** entre temas: *La hora del búho*
  tiene una sola.
- **Vincular causas del Atlas con entradas concretas.** Hoy el cruce se calcula
  por tags y patas (`lib/atlas/bridge.ts`), que funciona y se ve en las dos
  direcciones —en la lente del Atlas y en la ficha de entrada—, pero un vínculo
  anotado a mano diría más.

### 6.4 Lo que quedó apuntado de antes

- **HTML previo para buscadores.** `og.mjs` ya escribe cáscaras por entrada con
  su Open Graph; falta meter el *cuerpo* en un `<noscript>` y generar cáscaras
  para la portada, el Atlas y las figuras.
- **`SITE_URL` sigue sin definirse en Vercel**, así que `og:image` sale con URL
  relativa y algunas redes no la leen. Se arregla en el panel.
- **El archivo sigue en unas seis pantallas de scroll.** Los filtros podrían
  quedarse fijos mientras solo scrollean los resultados.
- **Exportar la tela** como SVG: casi gratis, ya se dibuja con `react-native-svg`.

---

## 7. Lo que se descartó, y por qué

Para que nadie lo vuelva a proponer sin saber que ya se pensó.

| propuesta | por qué no |
|---|---|
| Librería de grafos (`@xyflow/react`, `vis-network`, D3, Sigma, Neo4j) | La tela son ~150 líneas con `react-native-svg`. Un layout de fuerzas destruiría lo único que hace informativo el dibujo: que la posición sea la categoría. |
| Librería de PDF | El PDF de texto cabe en 200 líneas con las fuentes base. Media dependencia de un megabyte para esto no se sostiene. |
| Matriz de scores del Atlas escrita a mano por país | Escribir a mano lo que se puede calcular es exactamente lo que el Atlas evita: la regla se declara y la ficha enseña la cuenta. |
| Incluir las causas uniformes en el reparto del Atlas | El asteroide vale 100 en todas partes: el mapa entero diría lo mismo. Van aparte, como el fondo. |
| Observatorio con datos en vivo (sismos, vuelos, viento) | Depende de APIs externas; el motor tiene que probarse sin red. |
| Cuentas, colecciones personales, comentarios | Piden un backend con estado. |
| Analytics, mapas de calor de navegación, A/B testing | Servicios externos y datos de terceros. Lo que se mide se mide sobre el contenido, no sobre las personas. |
| Tour guiado, modales de onboarding | Contradice la voz. Basta la línea de la portada. |
| El anillo de patas en órbita | Se construyó en la fase 10 y se quitó en la 15: con varias apoyadas, los hilos cruzaban por encima de la araña. |

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

```bash
npm test           # 160 pruebas
npm run typecheck
npm run lint
npm run build      # validate + expo export + permalinks con Open Graph
npm run sprites    # redibuja los 44 emblemas
npm run atlas      # vuelve a bajar y simplificar el mundo
```

`validate` es obligatorio antes de `typecheck` y `test`. El CI corre
`validate`, `typecheck` y `test`, **pero no `build`**.

**Commits:** `fase(N): qué cambió` para código, `entrada: título` para
contenido nuevo. El historial es parte del artefacto.

---

## 9. Trampas conocidas

Cosas que ya costaron una sesión.

- **`requestAnimationFrame` no siempre dispara** (pestaña de fondo, ahorro de
  energía, captura). Ha mordido cuatro veces. Todo lo que se mira tiene que
  estar dibujado aunque el bucle no corra: **la animación puede faltar, lo que
  se mira no**.
- **La caché de Metro se queda con archivos borrados.** Si al mover o borrar un
  componente la app deja de montar con un `X is not defined` o un
  `Unable to resolve module`, no es el código: para el servidor y arráncalo de
  nuevo. Pasó cuatro veces en una sola sesión.
- **Medir con la ventana en vez de con la columna.** Ver §5.
- **Un `ScrollView` crece por defecto.** Ver §5.
- **`String.replace` interpreta `$'` y `$&` en el reemplazo.** Un script de
  edición automática se comió media línea de `route.ts` por esto. Pasa una
  función como reemplazo.
- **Los archivos del repo están en CRLF.** Un script que busque `\n` no casa
  nada: normaliza al leer y guarda en LF (git lo convierte de vuelta).
- **`@vercel/og` no arranca fuera del runtime de Vercel.** `og.mjs` usa
  `satori` y `sharp` directamente.
- **El plazo de la araña está verificado** (2026-09-14): montando la app con
  `requestAnimationFrame` neutralizado, pidió dos fotogramas, no se sirvió
  ninguno y el animal quedó igualmente en su sitio. El panel de vista previa
  **no sirve** para comprobarlo: ni repinta el lienzo a demanda ni marca como
  ocultas sus pestañas de fondo. Se mide con `readPixels` sobre un iframe del
  mismo origen al que se le mata `requestAnimationFrame`.
- **El panel de vista previa escala la ventana.** Lo que se ve en una captura no
  coincide con lo que dice `getBoundingClientRect`. Ante la duda, manda el DOM.

---

## 10. Primer día: qué hacer y qué no

1. **Lee `CLAUDE.md` entero.** Manda sobre cualquier cosa que diga este archivo.
2. **`npm install && npm run validate`.** En dos segundos sabes si el contenido
   está sano, y te imprime el reparto por pata, por tema y por causa.
3. **`npm run web`** y mira la portada, `/tela`, `/atlas` y una invocación.
4. **Elige UNA cosa** de la sección 6 y quédate en ella.

Lo que más tienta y más daño hace:

- **Instalar una librería** para algo ya resuelto en doscientas líneas.
- **Meter color para distinguir cosas.** El proyecto distingue con el trazo,
  salvo en el Atlas, donde la rampa está justificada y acotada.
- **Rellenar entradas sin verificar la fuente.** Si no la compruebas:
  `unverified` y `sources: []`.
- **Tocar `weighted.ts` a ciegas.** Sus pesos son provisionales desde la fase 0
  y cambiarlos cambia lo que devuelve cada semilla ya compartida.
- **Añadir animación sin plazo de seguridad.** Ver §9.
- **Creer a la captura de pantalla.** Ver §9.

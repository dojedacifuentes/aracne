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
| otras ramas vivas | `desarrollo/entidad-aracnida` (fase 20, la entidad que sigue al cursor, pendiente de llevar a `main`) · `diseno-denso` (rediseño viejo, superado por la fase 15) |
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
  SONIDO.md            qué suena, de dónde sale cada nota y por qué nace apagado
  ENTIDAD.md           la entidad que camina detrás del cursor (rama de la fase 20)
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
  atlas/world.json     242 territorios de Natural Earth 1:50m, simplificados
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
  drift/graph.ts       scoreLink, neighbours, declaredPairs, buildDrift, shortestPath
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
  components/Shell.tsx     el armazón: secciones a la izquierda, lectura al centro
  components/Drawer.tsx    el cajón donde vive el instrumento cuando se pide
  components/InvocationComposer.tsx  las once patas, en el cajón de invocar
  components/EntryDossier.tsx        el expediente de una entrada: fuentes, atlas…
  components/          Tela, Tejido, AtlasView, AuthorsView, LivesView,
                       FigureView, EntryView, InvocationView, ArchiveView,
                       ShapeView, CommandPalette, ExportRow, Sigil, Emblem…
  components/spider/   la araña 3D: rig, escena, seda, config, gesto, fallback SVG
  components/spiderEffect/  la entidad: config, aritmética pura, lienzo web, marcas
  audio/               el sonido: cifras, partitura pura y motor Web Audio

scripts/
  validate.ts          valida TODO el contenido y genera el índice
  atlas.mjs            descarga y simplifica el mundo (npm run atlas)
  og.mjs               permalinks + imagen Open Graph por entrada, en build
  sprites.mjs          dibuja los 44 emblemas
  capture.mjs          alta de entrada por consola

tests/                 17 archivos, 227 pruebas
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
| `/autores` · `/autores/<tema>` · `/autor/<id>` | las vidas; `/biografias`, `/gabinete` y `/figura/<id>` siguen abriendo |
| `/invocaciones?categorias=…&tipos=…&q=…` | el archivo, con filtros y búsqueda en la URL; `/archivo` sigue abriendo |
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
| pares de entradas | 946 · 401 con algún vínculo (42,4 %) · 88 declarados (9,3 %) |
| biografías | 44, en 9 temas · 31 con obra enlazada |
| emblemas dibujados | 44 de 44 |
| Atlas | 242 territorios · 34 causas (10 uniformes) · 13 dominantes |
| scores del Atlas | de 25 a 98 |
| estados epistémicos | 20 `fact` · 16 `interpretation` · 7 `fiction` · 1 `controversial` · 0 `unverified` |
| pruebas | 227, en 17 archivos |
| bundle web | ~2,2 MB |

**La cola editorial está vacía.** Las quince `unverified` se comprobaron contra
fuentes pedidas —catorce el 15 de septiembre de 2026 y la última el 18— y cada
una dice en `captureNote` qué se comprobó y qué se corrigió. Ver §6.4.

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
| 16 | El panel de la derecha es el instrumento de cada sección; el mapa del Atlas cabe en la pantalla y devuelve la rueda a la página. |
| — | La cola editorial: las 15 entradas `unverified` comprobadas, con la prosa corregida allí donde decía más que la fuente. Un commit por entrada. |
| 17 | El instrumento deja de cobrar ancho: sin columna derecha fija, el instrumento se abre en cajones; navegación en tres grupos, `/invocaciones` y `/autores`, la ficha a unos setenta caracteres con su expediente aparte, y el Atlas a todo lo ancho con Natural Earth 1:50m. |
| 18 | La araña se puede coger: se posa la mano, se tira con resistencia progresiva y se suelta con retroceso. |
| 19 | El archivo suena: cinco voces sintetizadas, apagadas por defecto. La nota de cada pata es su frecuencia de hilo y el dictamen sale de la semilla (`docs/SONIDO.md`). |
| 20 | En la rama `desarrollo/entidad-aracnida`: la entidad que camina detrás del cursor. Tiende hilos hacia las entradas cercanas, se mueve sola cuando la mano se para y se retira sobre la araña del centro. Y si el archivo declara el vínculo entre dos de las entradas que tiene cogidas, el hilo va de una a la otra (`docs/ENTIDAD.md`). |

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

### Las cuatro excepciones a la doctrina visual

`docs/DESIGN.md` prohíbe movimiento, degradados y segundos colores. Hay cuatro
excepciones, **todas pedidas expresamente y todas escritas en `CLAUDE.md`**. La
tercera entró allí el 18 de septiembre: la fase 15 no la había escrito, y
durante tres días `CLAUDE.md` dijo «dos excepciones, y solo dos» mientras
`docs/DESIGN.md` razonaba la tercera.

1. **La piel `flujo` de `/tela` está viva.** Pulsos con estela por las trazas y
   el nodo del centro respirando. No sale de esa piel; la de seda está quieta y
   hay una comprobación de que lo está.
2. **El Atlas tiene rampa de calor.** De la ceniza a la llama pasando por el
   acento de siempre: no hay color nuevo, hay uno estirado.
3. **El instrumento es frío.** Desde la consola de la fase 15, `machine` —el
   frío que el Atlas usaba para sus retículas— marca todo lo que se puede
   tocar. La regla que queda en pie: **el frío es de lo que se puede tocar y el
   cálido es del contenido**.
4. **La entidad que camina detrás del cursor** (solo en la rama de la fase
   20). En `dim` y sin brillo, sin recibir eventos, sin `Math.random`; se retira
   sobre la araña del centro y no existe con `prefers-reduced-motion`, sin
   ratón o por debajo de 900 px. Ver `docs/ENTIDAD.md`.

No las borres por doctrina: la doctrina ya las contempla.

---

## 5. Cómo está montada la pantalla

> **Desde la fase 17 ya no hay columna derecha por defecto.** El instrumento
> —las patas para invocar, los filtros, la lente del Atlas, el expediente de
> una entrada— se abre en un cajón (`Drawer`) que se superpone sin cambiar la
> medida del texto; la columna solo aparece donde sobra ancho. Las razones
> están en el mensaje de `3f82c0f` y en `docs/DESIGN.md`. Lo que sigue describe
> la consola de las fases 15 y 16. Sigue valiendo lo de medir un lienzo con la
> columna y con la pantalla, y todo el apartado «Bajar»: el recorrido central,
> las teclas de página y la barra visible están en `Shell.tsx`.

Tres columnas (`ui/components/Shell.tsx`):

- **Izquierda**: las secciones, agrupadas, con barra de activo y una línea en
  mono que dice qué hace cada una.
- **Centro**: el contenido, con todo el ancho. En la portada, la araña sola.
- **Derecha**: **el instrumento de lo que hay delante**, y el estado al pie.
  La ruta lo elige (`HomeScreen`, constante `instrumento`): `AtlasAside` la
  lente y la leyenda, `TelaAside` las pieles y los mapas, `ArchiveAside` la
  búsqueda y las facetas, y `LegPanel` las once patas en todo lo demás.

En vertical se apila: cabecera, fila de secciones, contenido, panel. El archivo
es la excepción —`asideFirst`— y pone el panel antes: un filtro detrás de
cuarenta y cuatro resultados no es un filtro.

**Un lienzo se mide con la columna y con lo que queda de pantalla**, las dos
cosas. El mapa del Atlas solo se medía con la columna y salía más alto que la
ventana.

### Bajar

Tres columnas con su propio recorrido tienen un problema que no se ve hasta que
se usa: **la rueda solo mueve aquello que está debajo del cursor**. Sobre el
menú de la izquierda, sobre la cabecera o sobre el pie no pasaba nada, y la
barra estaba escondida en las tres, así que tampoco se sabía que hubiera más
abajo. Ahora:

- La barra se ve, fina y con los colores de la paleta (`public/index.html`).
- El centro recoge la rueda que **ninguna otra columna ha usado**
  (`useRecorridoCentral`, en `Shell`). El panel de la derecha conserva la suya:
  se comprueba antes de robarla.
- `AvPág`, `RePág`, `Inicio` y `Fin` mueven el centro. En un `ScrollView` no
  existen, y escribiendo en un campo siguen siendo del campo.

### Lo que mide cada sección

Medido en el DOM a 1440×900, con el centro visible en 776 px. Compactar es
trabajo de cada sección, no del armazón:

| sección | antes de la fase 16 | ahora |
|---|---|---|
| `/archivo` | 2461 · 3,3 pantallas | 1836 · **2,4** |
| `/biografias` | 1663 · 2,2 | 1451 · **1,9** |
| `/deriva/<semilla>` | — | 1199 · 1,5 |
| `/adn` | 972 · 1,3 | 914 · 1,2 |
| `/figura/<id>` | 945 · 1,3 | 917 · 1,2 |
| `/atlas` | 871 · 1,2 | 858 · 1,1 |
| `/e/<id>`, `/tela`, `/i/<semilla>`, un tema | 765 · 1,02 | **cabe entero** |

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

### 6.1 Vercel sí desplegó la fase 15 — y el hash no sirve para comprobarlo

Resuelto el 15 de septiembre de 2026. Producción sirve la fase 15: están en su
paquete las marcas que solo existen desde `78b7b59` —`archivo sin firma`,
`el animal y sus once patas`, y el `WinAnsi` y el `Helvetica` del escritor de
PDF—, el `index.html` es idéntico salvo el nombre del paquete, y medido en el
DOM la portada trae el menú de secciones, la cabecera y el panel de las once
patas. La alarma de la sesión anterior era la receta, no el despliegue.

**Comparar el hash del paquete no vale.** El build de Vercel y el de esta
máquina no salen byte a byte iguales: seis mil bytes de diferencia en el
polyfill de manejo de errores de React Native, ninguno en código del proyecto.
Se comprueba por contenido:

```bash
# ¿sirve producción una marca que solo existe desde cierta fase?
curl -s "https://aracne-mu.vercel.app/?t=$(date +%s)" \
  | grep -o 'index-[a-f0-9]*\.js' | head -1 \
  | xargs -I{} curl -s "https://aracne-mu.vercel.app/_expo/static/js/web/{}" \
  | grep -c "archivo sin firma"
```

Si la marca no está, entonces sí: *Deployments → Redeploy* en el panel. Elige
una cadena que el commit que quieres comprobar haya introducido, y confírmalo
con `git log -S "la cadena" -- ui/`.

Hay una comprobación más fuerte que una marca: partir los dos paquetes por `;`
y compararlos después de un `npm run build`. El 15 de septiembre, con
`9375015`, salió un único tramo distinto —las sentencias 42 a 97 del paquete
local, el polyfill de consola que el build de Vercel no mete— y las otras
16 051, iguales. Eso es el mismo código.

```bash
tr ';' '\n' < dist/_expo/static/js/web/index-*.js > local.txt
curl -s "https://aracne-mu.vercel.app/_expo/static/js/web/<paquete>" | tr ';' '\n' > prod.txt
diff local.txt prod.txt | grep -v '^[<>-]'   # un solo tramo: el polyfill
```

### 6.2 El panel de la derecha ya cambia de sección

Superado por la fase 17, que quitó la columna fija y pasó el instrumento a
cajones (ver §5); en `/autores` los nueve temas son ahora un filtro sobre una
cronología. Lo que sigue es la historia de la fase 16.

Hecho en la fase 16. En el Atlas, la lente y la leyenda; en la tela, las pieles,
los mapas y la clave del trazo; en el archivo, la búsqueda y las facetas; donde
se invoca —portada, invocación, ficha—, las once patas, que es lo que decide
qué sale al pulsar. El estado va al pie de cualquiera de los cuatro.

Lo que queda apuntado de aquí: **las biografías no tienen instrumento propio.**
El suyo serían los nueve temas como lista, para saltar de uno a otro sin volver
al índice. Se dejó fuera a propósito: el pendiente nombraba tres secciones y son
las tres que se hicieron.

### 6.3 La entidad: decidir si va a `main`

Está en `desarrollo/entidad-aracnida`, con dos commits de código —la entidad y
el hilo entre entradas—, probada y documentada en `docs/ENTIDAD.md`. Para
llevarla a `main` hay que **aprobar la cuarta excepción de `CLAUDE.md`**, que
en la rama ya está escrita, y mirarla con un ratón de verdad: el panel de
pruebas estaba oculto y el comportamiento se verificó moviéndola a mano con
`__aracneEntidad`.

Lo que quedó apuntado como siguiente ya está hecho: si la entidad tiene
cogidos dos nodos y el archivo declara el vínculo entre ellos —relación
explícita, un tag o una fuente compartida, las mismas razones que la tela
dibuja continuas—, el hilo va de una entrada a la otra en vez de salir de
ella. Medido: 88 de los 946 pares (9,3 %), y en un barrido de 156 posiciones
apareció en el 36 % con once pares distintos, todos declarados.

Lo siguiente de aquí, si se aprueba: hoy los únicos nodos marcados son las
filas de `/invocaciones`, así que solo ahí puede verse. La ficha y su
expediente no llevan marca.

### 6.4 Contenido, que es lo que más falta

- **La cola editorial está vacía.** Las quince `unverified` se comprobaron (los
  commits `entrada: …` del 15 y el 18 de septiembre). La última, `delyra-0034`,
  *Ocho cosas que puede decir una línea*, no tenía fuente para su lista de ocho,
  pero sí para su tesis: Borgatti, Mehra, Brass y Labianca (*Science*, 2009)
  distinguen tipos de vínculo donde las ciencias físicas ven solo una red. La
  lista queda como del archivo, en `interpretation`. Las entradas nuevas que
  entren sin fuente volverán a la cola: `tests/export.test.ts` ya no depende de
  que haya alguna.
- **Lo que eso cambió en el motor.** El modo `material` de
  `lib/oracle/weighted.ts` da peso 0 a las `unverified`: quince entradas que en
  ese modo no salían ahora pueden salir, y una semilla compartida en modo
  `material` puede devolver otra cosa. Es lo mismo que pasa al añadir entradas.
- **Trece biografías sin obra enlazada**, todas de autores vivos o recientes.
- **Las entradas ligadas están mal repartidas** entre temas: *La hora del búho*
  tiene una sola.
- **Vincular causas del Atlas con entradas concretas.** Hoy el cruce se calcula
  por tags y patas (`lib/atlas/bridge.ts`), que funciona y se ve en las dos
  direcciones —en la lente del Atlas y en la ficha de entrada—, pero un vínculo
  anotado a mano diría más.

### 6.5 Lo que quedó apuntado de antes

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
npm test           # 227 pruebas
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
  Y hay una vuelta de tuerca: con el panel oculto, el documento mide 0×0 y la
  app arranca en vertical con el lienzo al mínimo. Además `window.innerWidth`
  no es el ancho del documento, y `Dimensions` de React Native se queda con el
  de arranque: **para probar el modo compacto hay que recargar después de
  cambiar el tamaño**, no basta con cambiarlo.
- **Estrechar la caja no ahorra pantalla: la alarga.** Los resultados del
  archivo se probaron a tres columnas de 267 px y la sección salió *más alta*
  que a dos de 411: los títulos envolvían a dos líneas y devolvían lo ganado.
  Lo que compacta de verdad es quitar líneas por fila, no estrechar columnas.
  Medir antes de dar por buena una rejilla.
- **El buscador da la URL de otra cosa.** Para *Las hilanderas*, la ficha del
  Prado que devolvía la búsqueda, con el mismo título, era la de una fototipia
  de 1903 del cuadro. Se comprueba el número de catálogo, no el título.
- **Los catálogos grandes contestan 403 a `curl`.** El Prado, Cairn, Oxford
  Academic y Porto Editora ponen un desafío anti-bots. El panel del navegador
  sí entra, y el texto entero suele estar en el JSON-LD de la página aunque la
  vista lo corte. Y no te fíes del resumen de `WebFetch` para verificar: pide
  la página y busca la frase literal.
- **La nota dice qué referencia comprobar; los errores estaban en la prosa.**
  Las referencias del material eran casi todas buenas. Lo que no aguantaba eran
  las frases que decían más que la fuente: «varias veces por segundo» donde la
  FAA dice una, «casi todas las aeronaves», una cita de Cronenberg real pero
  pegada a la película equivocada. Se comprueba cada frase, no solo la ficha.
- **El que se queda con la rueda deja la sección sin scroll.** El mapa del
  Atlas llamaba a `preventDefault()` en cada `wheel` para ampliar. Como ocupa
  casi la pantalla, el cursor estaba siempre encima y no había manera de bajar.
  Ahora la rueda sola es de la página y ctrl o ⌘ amplían. Lo mismo vale para
  un `PanResponder` que se quede con los arrastres verticales en un teléfono.

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

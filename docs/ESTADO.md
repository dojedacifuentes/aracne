# Estado

Última actualización: 14 de septiembre de 2026.

Para retomar en otra sesión, lee antes **`docs/HANDOFF.md`**: dice dónde está
el proyecto y qué conviene hacer. Este archivo es la historia de cada fase.

## Hecho

| Fase | Qué | Commit |
|---|---|---|
| 0 | Andamio sobre la arquitectura del tarot; kit en su sitio; motores que faltaban reconstruidos; 17 entradas; `validate` imprime 17 entradas · 7 categorías visibles · 4 retraídas; CI | `7055e03` … `86c0d0b` |
| 1 | La araña 3D como oráculo (`docs/ARANA-3D.md`) | `28e0a1d` |
| 2 | Pulsar invoca; `/i/<semilla>?patas=…`; propósito; hilos de las patas; pruebas de la fase | `c498ba0` |
| 3 | Vista de entrada, permalink `/e/<id>`, títulos cliqueables, Open Graph en build | `143570d` |
| 6 | El gabinete: siete salas, treinta figuras, seis emblemas, invocar desde una sala | `2b0e0f0` |
| 7 | `/archivo` con filtros combinables en la URL, búsqueda local y paleta ⌘K | `b76a397` |
| — | Arreglos: llegar al gabinete en un teléfono | `fb13d7c` |
| 4 | Primeras siete entradas del material de investigación. **Las once patas encendidas** | `205447f` … `5c401dd` |
| 5 | La red dibujada: `/deriva/<semilla>`, tres modos, y la tela permanente | `777b325` |
| — | Archivo sin firma: se retira la autoría del modelo y de la interfaz | `63e3079` |
| — | Handoff | `aff0707` |
| 9 | Economía cognitiva: el área de lectura pasa de 254 a 520 px | `adeea9d` |
| 8 | `/adn`, la forma del archivo, y la gramática del hilo en la tela | `7528682` |
| 4 | Veinte entradas más y catorce figuras: 44 entradas, 44 figuras, 63 vínculos anotados | `7f53881` … `f48b892` |
| 10 | Las once patas en órbita alrededor de la araña, los sellos geométricos de patas y botones, y la tela fuera de la portada: `/tela`, con retejido y dos pieles | `b435d30` |
| 11 | Las biografías sustituyen al gabinete: nueve temas en vez de siete salas, idea y hecho por figura, 31 obras enlazadas y comprobadas, los 44 emblemas dibujados | `d07f160` |
| 12 | Fluidez: marca de arranque sin JavaScript, tope al escalonado de la aparición y los hilos de la tela fuera del camino del cursor | `0eb5c0e` |

En curso: una revisión adversarial de las fases 0–2.

### Lo que se decidió en la fase 11

Las siete salas del gabinete agrupaban por circunstancia biográfica. Se
cambiaron por nueve temas que agrupan por **el problema en el que cada figura
se metió**, por decisión expresa de quien dirige el proyecto. Con ellas se fue
el solapamiento —una figura está ahora en un tema y en uno solo— porque la
sección se lee en orden y una lista con repeticiones no se lee, se consulta.
`docs/MUSEO.md` pasó a ser `docs/BIOGRAFIAS.md`; `content/rooms.json`, a
`content/themes.json`. Las URL de `/gabinete` siguen abriendo, con prueba.

Las 31 obras enlazadas se comprobaron una a una pidiéndolas. Conviene recordar
por qué: una URL de Project Gutenberg escrita de memoria, y dada por segura,
devolvió una obra de Shakespeare en lugar de una de Diderot.

También se fue la tela del fondo de la portada, que molestaba. Vive en
`/tela`, con más hilos, retejido alrededor de la entrada que se pulse y dos
maneras de dibujar el mismo grafo. Lo que no se movió: la semilla fija, la
posición mandada por la pata y la prueba que lo protege.

Las fases 6 y 7 se adelantaron a la 4 y la 5 por decisión de quien dirige el proyecto: el contenido de la 6 ya
estaba escrito (`figures.json` y `rooms.json`) y la 7 es la estructura que hará
navegable el archivo cuando crezca. Ninguna de las dos dependía del material que
se estaba reuniendo.

## Sobre el material de investigación aportado

Se entregaron siete archivos de investigación, que son cinco documentos distintos
(dos pares son duplicados exactos). **No se importan en bloque.** Parte de las
bibliografías contiene atribuciones que no resisten una comprobación —un libro
de Carol Clover que no existe, un ensayo sobre Burroughs atribuido a Silvia
Federici, un título de 2011 firmado por Spengler, muerto en 1936—, y la regla 4
de CLAUDE.md prohíbe fabricar un autor, un año, una cita o una URL.

El procedimiento es: el informe sirve de mapa de temas, cada fuente se verifica
por separado antes de escribir la entrada, y lo que no se pueda verificar entra
como `unverified` con `sources: []`. Cada entrada declara en `captureNote` qué
se comprobó.

**Se pidió después no detenerse a verificar.** La regla 4 no se puede
saltar, pero sí tiene una salida prevista para justo este caso: lo no verificado
va sin fuentes y marcado como pendiente. Por eso las veinte entradas del segundo
lote entran como `unverified` con `sources: []` y con la referencia concreta
anotada en `captureNote`. Son quince entradas a la espera de comprobación: esa
es la cola editorial que la fase 4 quería en `/pendientes`.

`ARAÑA.FUENTE1.md` es la excepción y conviene tratarlo aparte: avisa por su
cuenta de que el fragmento de la araña atribuido a Heráclito (DK 22 B67a) solo
se conserva en una paráfrasis del siglo XII y que su autenticidad está
discutida. Queda material sin explotar en él —Aracne y Minerva, las tarántulas
de Nietzsche, la araña de Deleuze, la aracnología de Nancy K. Miller, los
diagramas de Wigmore— y también en el `.docx` de paneles de datos.

## Decisiones tomadas sin confirmación explícita

1. **Arquitectura.** Expo del tarot en lugar del Next.js que pedía el kit: el
   usuario pidió usar el tarot como arquitectura, y el tarot no es Next.js.
2. **«La sección de conjeturas cámbiala por el propósito agorias».** Leído como
   «el propósito de las categorías»: sin patas apoyadas, la sección explica qué
   es el archivo; con patas, la descripción de cada una.
3. **Nombre.** La aplicación se llama *aracne*, como el repositorio. Los
   identificadores siguen el esquema del kit: `delyra-0001`, `DELYRA 0001`.
4. **El oráculo es una araña.** Una huntsman 3D sustituye a la esfera, por
   petición expresa. La física del Aleph se conserva entera.
5. **Archivos del kit que no venían.** Reconstruidos: `rng`, `weighted` (con
   pesos provisionales), `history`, `index`, `lib/content/`,
   `scripts/validate.ts` y `content/contributors.json`.
6. **Las 17 entradas iniciales.** Las redactó Claude a partir de las
   referencias de `figures.json`, con fuentes comprobadas. Cada entrada lo
   declara en `captureNote`.
7. **Sin React Three Fiber.** three sin abstracción, como en el tarot.
8. **Los emblemas se generan, no se dibujan a mano en el SVG.**
   `docs/MUSEO.md` pide un SVG por figura con rectángulos de 1×1, versionado y
   diferenciable línea a línea: eso es lo que hay en `public/figures/`. El
   dibujo vive en `scripts/sprites.mjs` (`npm run sprites`) porque así se
   corrige una figura cambiando dos líneas en vez de doscientos rectángulos,
   y porque el repositorio ya tenía tres scripts de assets con esa forma.
9. **El filtro por tag solo ofrece los que tienen dos entradas o más.** Un tag
   con una sola entrada *es* esa entrada: como filtro no separa nada. Los demás
   se siguen encontrando con la búsqueda.
10. **«Saltar a pata» apoya la pata y vuelve a la araña, no invoca.** La fase no
   lo precisaba. Pulsar sigue siendo una decisión de quien mira.
11. **satori en lugar de `@vercel/og`.** La fase 3 pedía `@vercel/og`, que no
   arranca fuera del runtime de Vercel: su bundle hace un `require` dinámico
   que Node rechaza, y la entrada CommonJS falla también. `scripts/og.mjs` usa
   directamente satori —el motor que `@vercel/og` lleva dentro— y sharp, que ya
   estaba instalado para los iconos. Misma imagen, una dependencia menos.

## Problemas encontrados en el kit

- `CategorySchema` no declara `leg` ni `glyph` y zod los descarta: se amplía en
  `lib/content/corpus.ts` sin tocar `schema.ts`.
- `lib/drift/graph.ts` no compilaba en modo estricto: corregido.
- `validateCorpus` permite 180 palabras y CLAUDE.md pide 60–140: `validate`
  avisa.
- `invoke.ts` inserta ids de categoría y de tipo en los dictámenes, y
  `faultBetween` usa los ids ingleses de tipo: la interfaz los lee como nombres.
- El kit suponía que el tarot era Next.js y privado: es Expo y público.
- `figures.json` daba a Searle por vivo: corregido a 1932–2025.
- `InvocationView` construía la deriva sobre el corpus entero. Al invocar desde
  una sala, el recorte llegaba al motor pero no a `buildDrift`, así que la
  deriva se salía de la sala por la primera arista. Ahora la vista recibe el
  mismo corpus que vio el motor.
- La fila de botones de la portada no envolvía. Con cuatro botones ocupaba
  474 px, así que en un teléfono de 375 `archivo` quedaba fuera de la pantalla
  y `gabinete` cortado: el gabinete existía y no se podía llegar a él.
- `Reveal` dejaba el contenido a opacidad 0 cuando `requestAnimationFrame` no
  disparaba —una pestaña de fondo, el ahorro de energía, una captura—, es decir
  invisible. Se asienta con un plazo, como ya hacía el contador del
  identificador. La animación puede faltar; el contenido no.
- En vertical el panel estaba fijo a la mitad de la pantalla. En una invocación
  está bien, porque la araña es parte del resultado; leyendo el gabinete o el
  archivo, no. Las rutas de lectura se quedan con el 78 %.
- `scripts/og.mjs` estaba escrito pero huérfano: su dependencia no estaba
  declarada y `npm run build` no lo llamaba. Conectado.
- El contador del identificador de `EntryView` dependía de que
  `requestAnimationFrame` disparase. Donde no dispara —pestaña de fondo, ahorro
  de energía, una captura— la ficha mostraba `DELYRA 0000`, un número de
  catálogo falso. Ahora se asienta con un plazo aunque no llegue un fotograma.

## Pendiente

- Fases 8 y 9 de `docs/PROMPTS.md`. La 4 está empezada, no cerrada: faltan
  las vías de incorporación (`npm run capture`, el issue form, `/pendientes`).
- La rama `diseno-denso` tiene el rediseño a medias: tipografía unificada en
  siete cuerpos (eso sí está terminado y con prueba), más `Rail` y `Context`
  sin verificar en pantalla.
- Ninguna de las siete entradas nuevas tiene figura en el gabinete: Ginzburg,
  Diderot, Carrington y Schreber no están en `figures.json`.
- **24 figuras siguen sin emblema.** Muestran el hueco marcado que pide
  `docs/MUSEO.md`, que es el estado correcto, no un error. Los seis dibujados
  son los que pedía la fase: Borges, Kafka, Euler, Spinoza, Pessoa y Bourgeois.
- **21 de las 30 figuras no tienen ninguna entrada ligada**, y la sala «Los que
  firmaron con otro» no tiene ninguna: no se puede invocar desde ella todavía.

- **El archivo sigue siendo pequeño, pero ya no está por debajo de su masa
  crítica.** De 17 a 24 entradas, medido antes y después:

  | | 17 entradas | 24 entradas |
  |---|---|---|
  | patas encendidas | 7 de 11 | **11 de 11** |
  | grado medio del grafo | 4,9 | **7,4** |
  | vínculos fuertes por entrada | 1,8 | **2,4** |
  | entradas huérfanas | 2 | **0** |
  | máximo en 60 pulsaciones | 14 (*Tlön*) | **8** |
  | concentración del tag `borges` | 24 % | **17 %** |

  Y con 44 entradas: grado medio **18,2**, vínculos fuertes **4,0**, ninguna
  huérfana, la más repetida sale **7 veces de 60**, y el tag más concentrado es
  `tiempo-real` con un **14 %**. Reparto epistémico: 17 `fact`, 15 `unverified`,
  6 `interpretation`, 5 `fiction`, 1 `controversial`.

  Con 24 el archivo entero se sigue viendo en pocas decenas de pulsaciones. El
  objetivo razonable sigue siendo ~70.
- Probar el rendimiento en un teléfono real y `prefers-reduced-motion` en un
  navegador real.
- Conectar el repositorio a Vercel y definir `SITE_URL` para las imágenes Open
  Graph.
- Iconos y splash: siguen siendo la luna del tarot.
- Malla de la araña: 87 000 triángulos. Bajar más exige reproyectar la textura.


## Archivo sin firma

El campo `contributors`, `content/contributors.json`, el campo `affinity` de las
figuras, el filtro «quién» y la línea «aportada por» se retiraron. El modo
`contacto` del grafo, que era el camino más corto entre lo aportado por cada
persona, se repuso como `distancia`: las dos entradas más lejanas que el archivo
llega a unir, que es el diámetro del grafo y mide lo mismo que importaba.

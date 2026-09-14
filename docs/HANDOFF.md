# Handoff

Para retomar Aracne en otra sesión, con otro modelo o con otra persona. Léelo
entero antes de tocar nada, y después `CLAUDE.md`, que manda sobre todo esto.

`docs/ESTADO.md` cuenta la historia de cada fase. Este archivo cuenta **dónde
estás parado y qué conviene hacer a continuación**.

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
| figuras del gabinete | 44, en 7 salas |
| emblemas dibujados | 6 de 44 |
| estados epistémicos | 17 `fact` · 15 `unverified` · 6 `interpretation` · 5 `fiction` · 1 `controversial` |
| pruebas | 88 |
| bundle web | 1,72 MB |

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

**No está hecho:** fase 8 (`/adn`, estadísticas del archivo) y fase 9 (`/hoy`,
accesibilidad, repaso de microcopy).

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

**La tela pequeña se queda visible en todas las rutas** menos en la de la red,
que ya tiene la grande, y enciende lo que tengas delante. Su semilla es fija a
propósito: si cambiara en cada pulsación los puntos saltarían de sitio y dejaría
de ser un mapa. **No la quites de ahí.**

---

## 6. Qué hacer a continuación

Por orden. Las tres primeras son las que más cambian la experiencia y ninguna
necesita servicios externos.

### 6.1 Portada V2: las once patas en órbita — *lo primero*

Hoy la araña está a un lado y la lista de patas al otro. La lista es texto, y la
metáfora no se ve.

Poner **los once glifos en órbita alrededor de la araña**, en el ángulo que
`legAngle` ya calcula. Al pasar por encima, el nombre de la pata, tres o cuatro
palabras de su descripción y el número de entradas. Al pulsar, **se tensa un
hilo** hacia la araña.

Buena parte del lenguaje ya existe: `lib/aleph/tension.ts` desplaza la araña
según qué patas se apoyan, `SpiderSilk` dibuja hilos bézier con holgura y
`LegButton` ya tiende un hilo corto. Falta llevar eso al espacio.

Eso hace comprensible de un vistazo que **seleccionar ideas es tirar de las
patas del animal**, sin escribir una sola línea de instrucciones.

### 6.2 `/tejido`: la red contextual — *la novedad grande*

`/deriva` dibuja el archivo entero. Con 44 entradas todavía se lee; con 200 será
una bola de pelos.

Lo que falta es la red **contextual**: eliges un nodo y aparece él en el centro
con solo uno o dos grados de separación. Pulsas otro y la tela **se reteje** en
torno al nuevo centro. Cada navegación es literalmente un tejido nuevo.

`neighbours()` ya devuelve los vecinos ordenados por fuerza y `linkText()` ya
sabe nombrar la razón de cada hilo. El trabajo es de recorte y de transición, no
de cálculo.

### 6.3 Gabinete V2: las salas como vitrinas

La decisión editorial del gabinete es su mejor activo: **ninguna figura se
representa por su cara**, sino por un objeto. Borges es un tigre, Kafka un
formulario sellado, Euler un puente sin orilla, Spinoza una lente.

**Solo 6 de 44 emblemas están dibujados.** Los otros 38 muestran el hueco
marcado, que es correcto pero desaprovecha la idea. Con las 44 vitrinas llenas,
una sala sería una pared de objetos pequeños en la oscuridad, y esa pantalla
sería irrepetible.

`scripts/sprites.mjs` (`npm run sprites`) ya hace el trabajo: primitivas de
dibujo, paleta de seis tokens y un aviso automático si el acento se pasa del 5%.
Añadir un emblema son diez o quince líneas.

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

Dos correcciones a auditorías externas que circulan sobre el proyecto: **no es
React/Vite/Next**, es Expo + React Native Web + three.js; y **las entradas sí
tienen Open Graph** desde la fase 3.

---

## 8. Cómo trabajar

```bash
npm install
npm run validate   # valida el contenido y escribe content/index.generated.ts
npm run web        # servidor de desarrollo
npm test           # 88 pruebas
npm run build      # validate + expo export + permalinks con Open Graph
npm run sprites    # redibuja los emblemas del gabinete
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
- **El plazo de la araña está sin verificar.** La corrección está aplicada en
  `SpiderScene.web.tsx` y comprueba si el bucle se paró, no si nunca arrancó
  —que era el error de la primera versión—. No se pudo confirmar en el panel de
  vista previa porque ahí tampoco se repinta el canvas a demanda, así que no se
  distingue «no funciona» de «no se muestra». **Compruébalo en un navegador real**
  abriendo la app en una pestaña de fondo y volviendo a ella pasados diez
  segundos: la araña tiene que estar colgando en su sitio.
- **`@vercel/og` no arranca fuera del runtime de Vercel.** `og.mjs` usa `satori`
  —su motor— y `sharp` directamente.
- **Los archivos del repo están en CRLF.** Un script que busque `\n` no casa
  nada: normaliza al leer y guarda en LF.
- **`files/`, `files2/` y los tres `.zip` de la raíz** son restos del kit
  original. No los usa nadie. Conviene borrarlos.
- **Vercel no tiene `SITE_URL` definida**, así que `og:image` sale con URL
  relativa y algunas redes no la leen. Se arregla en el panel, no en el código.

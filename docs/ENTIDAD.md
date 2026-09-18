# La entidad

Lo que camina por la red detrás de quien lee. Sigue al cursor con retraso, se
mueve sola cuando la mano se para, nota lo que se puede tocar y tiende hilos
hacia las entradas que tiene cerca.

Componente: `AracneSpiderEffect`, en `ui/components/spiderEffect/`. Vive en la
rama `desarrollo/entidad-aracnida` hasta que se decida llevarla a `main`.

---

## 1. En el animal

`docs/ARANA.md` es vinculante: si algo no cabe en el animal, no hace falta.

La entidad **no es una segunda araña**. La del centro es el Aleph y es una
sola; `docs/ARANA-3D.md` ya descartó en su día «veinte arañas con
`Math.random()`». Esto es la red habitada. La tela está en toda la ventana y
no se ve: se deja ver alrededor de la entidad, como el polvo que delata una
telaraña a contraluz. Y los hilos que tiende van hacia las entradas del
archivo, que son los nodos del grafo: **la red, dibujada donde está la mano**.

De ahí salen dos conductas. Se retira al acercarse a la araña grande, porque
no hay dos animales en el mismo sitio. Y casi desaparece sobre el texto que se
está leyendo, porque la lectura manda.

## 2. Reglas

- **Se nota poco.** Tiene que verse cuando uno se para, no antes. Opacidad
  general de 0,55 sobre trazos ya tenues, y 0,14 sobre el texto que se lee.
- **Sin color nuevo.** Patas, hilos y tela en `dim`. El cuerpo en `bg`, el
  color del fondo: se nota más por lo que tapa que por lo que es. Sin acento,
  sin brillo, sin sombras, sin degradados. La configuración guarda el
  **nombre** del token, no un color, así que no se puede escribir uno de fuera.
- **Sin azar.** La tela y los gestos salen del PRNG sembrado
  (`lib/oracle/rng.ts`): con la misma semilla, la misma tela y los mismos
  gestos en cualquier máquina. Hay una prueba que vigila `Math.random` en todo
  `lib/` y `ui/`, que la regla 3 de `CLAUDE.md` daba por escrita y no lo estaba.
- **No toca nada.** El lienzo tiene `pointer-events: none` y `aria-hidden`. No
  cambia el cursor, ni el `overflow`, ni el foco, y no escucha el teclado.
  Todos sus oyentes son pasivos.
- **Solo con ratón y con ancho.** Con puntero grueso, por debajo de 900 px o
  con `prefers-reduced-motion` no se monta: ni lienzo, ni bucle, ni oyentes.
  Es movimiento y nada más, así que no hay una versión quieta que tenga sentido.
- **Un solo lienzo y un solo bucle** por documento, aunque se monte dos veces.
- **El bucle se para**: con la pestaña oculta, al dormirse —catorce segundos
  quieta— y entre dos sacudidas, que se esperan con un temporizador y no con
  fotogramas vacíos.
- **Lo inquietante es la quietud.** Llega con retraso y se pasa un poco (menos
  de un 8 %). Parada, da sacudidas cortas y secas o levanta una pata y la
  vuelve a apoyar, y entre una y otra no se mueve nada.

## 3. Arquitectura

El mismo reparto que la araña y el sonido: las cifras, la aritmética y el
dibujo, cada uno en su sitio.

| archivo | qué |
|---|---|
| `spiderEffectConfig.ts` | todas las cifras, los interruptores y los selectores. Sin React y sin DOM; del tema solo toma el tipo |
| `spiderEffectMotion.ts` | aritmética pura: el muelle, las sacudidas, la malla de apoyos, la tela, la cinemática inversa de las patas, las zonas y los hilos. Se prueba sin navegador y no reserva nada por fotograma |
| `AracneSpiderEffect.web.tsx` | el lienzo, el bucle, los oyentes, el dibujo y los eventos |
| `AracneSpiderEffect.tsx` | nativo: no hay cursor, no existe |
| `marks.ts` | las marcas `data-aracne-*` para señalarle cosas |

**Capas.** Se monta en `HomeScreen` justo después de `<Shell>`: por encima del
contenido y por debajo de cajones y paleta, sin tocar nada global. Un nodo solo
cuenta si está **antes del lienzo en el DOM** —dentro del armazón— y **nada lo
tapa en su centro**. Así un cajón abierto, su velo o la paleta apagan los hilos
sin que la entidad tenga que saber qué es un cajón.

**Coste.** La página se vuelve a mirar cada 800 ms mientras se mueve, o antes
si ha recorrido 140 px, y solo cerca de la entidad. Tras un scroll no se
vuelve a buscar: se vuelve a medir. En cada fotograma solo se borra la caja de
lo pintado en el anterior, no la ventana entera.

## 4. Configuración

Todo está en `ENTITY_DEFAULTS`. Lo más usado:

| clave | por defecto | qué |
|---|---|---|
| `enabled` | `true` | interruptor maestro |
| `interactions.follow` · `idle` · `proximity` · `threads` · `web` | `true` | cada capacidad por separado |
| `look.color` · `look.body` | `'dim'` · `'bg'` | colores, por su nombre en `theme.ts` |
| `look.intensity` · `look.quietIntensity` | 0,55 · 0,14 | opacidad general y sobre texto |
| `motion.speed` | 1 | multiplica todas las velocidades y todos los plazos |
| `motion.lag` · `motion.damping` | 0,3 s · 0,72 | retraso y cuánto se pasa |
| `web.particles` | 170 | cantidad de partículas: anclas de la tela |
| `threads.max` · `threads.radius` | 3 · 240 px | cuántos hilos y hasta dónde |
| `proximity.radius` · `release` | 60 · 84 px | cuándo nota algo y cuándo lo suelta |

El componente acepta `config` con lo que se quiera cambiar, un nivel de
profundidad: `<AracneSpiderEffect config={{ interactions: { threads: false } }} />`.

## 5. Cómo se le señala algo

Se esparce una marca en las props de un `View` o un `Pressable`. En web sale
como atributo `data-aracne-*`; en nativo no sale nada.

| marca | qué hace | dónde está hoy |
|---|---|---|
| `aracneNode(id)` | nodo: tiende hilos hacia él | cada fila de `/invocaciones` |
| `aracneQuiet()` | lectura: encima, la entidad casi desaparece | el cuerpo de la ficha |
| `aracneAvoid(nombre)` | no entra: se retira, también durante un arrastre que empiece ahí | el escenario de la araña |

Además nota por su cuenta todo lo interactivo (`role="button"`, `role="link"`,
controles de formulario…) y se inclina un poco hacia ello, con tope de 14 px.

## 6. Eventos

Al acercarse o alejarse de un nodo o de un control:

- las props `onZoneEnter` y `onZoneLeave`, y
- un `CustomEvent` en `window` llamado `aracne:entidad`,

los dos con `{ type: 'enter' | 'leave', kind: 'node' | 'interactive', id,
element }`. Entra a 60 px y no sale hasta pasar de 84, para no parpadear en el
borde. Al desmontarse emite la salida de lo que tuviera abierto: quien escucha
no se queda creyendo que sigue cerca. Es la puerta para mecánicas futuras; hoy
nadie escucha.

## 7. Lo que ya había y cómo convive

| lo que había | el choque posible | cómo queda |
|---|---|---|
| la araña 3D (`SpiderScene.web.tsx`) | su lienzo y su gesto de agarrar, con captura de puntero, en el mismo sitio | la entidad se retira sobre su escenario y mientras dure un arrastre que empiece en él |
| `window.__aracneSpider` | el enganche de depuración de la escena 3D | el de la entidad se llama `__aracneEntidad` |
| el flujo vivo de `/tela` | otro bucle de `requestAnimationFrame` | conviven; la entidad no toca el estado de React en cada fotograma |
| la rueda del Atlas y el recorrido central | quien se queda con la rueda | la entidad no escucha la rueda ni el teclado |
| cajones y paleta | taparlos o tender hilos bajo el velo | quedan encima; con uno abierto, la entidad no nota nada de debajo |
| el sonido | `pointerdown` en captura | los dos pasivos. La entidad no suena: `docs/SONIDO.md` dice que nada suena si no se toca nada |
| `body { overflow: hidden }` en `index.html` | — | no se toca |

## 8. La referencia: `4Min4m/spider-cursor`

Se inspeccionó `src/SpiderCursor.js` el 18 de septiembre de 2026. **No tiene
licencia**: la API de GitHub devuelve `license: null`, no hay archivo `LICENSE`
y el `package.json` no declara ninguna. Sin licencia, todos los derechos
quedan reservados, así que **no se reutiliza ni una línea**. La implementación
es original; de la referencia solo se tomaron ideas generales.

| en la referencia | aquí | marca |
|---|---|---|
| `Math.random()` en todo | PRNG sembrado | descartar |
| lienzo opaco, pintado de negro en cada fotograma | transparente; se borra solo lo pintado | descartar |
| trazos en blanco puro | `dim`, con poca opacidad | descartar |
| sin `devicePixelRatio` | densidad con tope de 2 | descartar |
| `body { overflow: hidden; cursor: pointer }`, lienzo con `z-index` y sin `pointer-events: none` | nada global; el lienzo no recibe eventos | descartar |
| al desmontar cancela solo el primer fotograma: el bucle sigue vivo | un único fotograma pedido cada vez, cancelado al desmontar | descartar |
| dos arañas | una | descartar |
| cuerpo que persigue al cursor con paseo sinusoidal | muelle amortiguado y sacudidas sembradas | adaptar la idea |
| patas como líneas con ruido hacia puntos dispersos | patas de dos tramos, con cinemática inversa, apoyadas en una malla sembrada | adaptar la idea |
| puntos que crecen cerca del cursor | tela que se deja ver alrededor de la entidad | adaptar la idea |

## 9. Verificación (18 de septiembre de 2026)

- `npm run validate`, `npm run typecheck`, `npm run lint` y `npm test`: 218
  pruebas en 17 archivos. Las 21 de `tests/spiderEffect.test.ts` cubren la
  configuración, el entorno, la tela, el muelle, las sacudidas, el sueño, las
  patas, las zonas, los hilos y la guarda de `Math.random`.
- **En el DOM**, servidor de desarrollo a 1280×720 con DPR 1,25: un solo lienzo
  de 1600×900 píxeles, `pointer-events: none`, `aria-hidden`, `tabIndex` −1; el
  `overflow` y el cursor del `body`, sin tocar. `elementFromPoint` bajo la
  entidad devuelve el enlace de la fila, no el lienzo.
- **Comportamiento**, con `__aracneEntidad` porque el panel de pruebas estaba
  oculto y no corría `requestAnimationFrame`. Entra desde fuera por el borde
  más cercano, a los 100 ms nota dos filtros y tiende tres hilos, y al segundo
  está sobre el cursor con los tres tendidos. Recorriendo la lista hubo 15
  entradas y 15 salidas. Opacidad 1 lejos de la araña, 0,005 encima y 0,995 al
  salir, e igual durante un arrastre que empieza en ella. Sobre el cuerpo de
  una ficha baja hacia 0,25. Con el cajón del expediente abierto, deja de notar
  el botón que tenía al lado.
- **Montar y desmontar**: por debajo de 900 px se quitan los siete oyentes y el
  lienzo; al volver se añaden los mismos siete, y un segundo `resize` no crea
  otro lienzo. Navegando entre la portada, una ficha, el Atlas, la tela y el
  archivo, siempre hay uno.
- **Coste**, en el build de desarrollo y sin minificar, diez segundos simulados
  recorriendo la lista: 0,14 ms por fotograma de media, 1,4 en el percentil 95 y
  3,2 de máximo, en los fotogramas que vuelven a mirar la página.
- **Pestaña oculta**: ni fotograma ni temporizador pendientes.

Sin verificar todavía: el ratón de verdad en una ventana visible, un cambio de
`prefers-reduced-motion` en caliente (cubierto por la prueba de `shouldRun`) y
un dispositivo táctil real (no se monta).

## 10. Pendiente

- **Mecánicas.** Las que dependen de sistemas que no existen no se hicieron. La
  más natural sería que, entre dos nodos cercanos relacionados en el grafo, el
  hilo fuera de una entrada a la otra, y no de la entidad a cada una.
- **Llevarla a `main`.** Pide aprobar la cuarta excepción de `CLAUDE.md`, que en
  esta rama ya está escrita.

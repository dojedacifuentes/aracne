# Flujo de construcción

Una fase por sesión de Claude Code, empezando en limpio con `/clear`. Claude
lee `CLAUDE.md` solo. Al terminar cada fase: commit, push, mirar el deploy.

Si una fase se alarga, pide a Claude que escriba `docs/ESTADO.md` antes de
cerrar, y abre la siguiente con "lee docs/ESTADO.md".

---

## Fase 0 — Leer el tarot y montar el andamio

**El prompt de esta fase está entero en `docs/PROMPT-INICIAL.md`.** Pégalo tal
cual; lo de abajo es el resumen de lo que hace.

El repo de tarot es privado, así que Claude Code lo clona él mismo con `gh`.
Comprueba antes que `gh auth status` responde autenticado.

> Lee el repositorio que está en `../tarot-de-la-conjetura`. No copies código
> todavía. Dime en una página: cómo organiza el contenido, cómo maneja la
> aleatoriedad y el estado, qué decisiones de estructura merece la pena repetir
> aquí y cuáles no encajan con `CLAUDE.md`. Señala en particular cualquier
> sitio donde use `Math.random()` o guarde el contenido en un único archivo,
> porque aquí las dos cosas están prohibidas.
>
> Después crea el proyecto: Next.js 15 con App Router, TypeScript, Tailwind,
> sin `src/`. Coloca en su sitio los archivos que ya existen (`content/`,
> `lib/`, `scripts/`, `app/globals.css`, `docs/`). Añade zod, tsx, vitest,
> three y @react-three/fiber. Configura `npm run validate` y haz que
> `npm run build` dependa de él. Un Action que corra validate y test en cada
> push.
>
> No crees ningún componente todavía. Muéstrame el árbol y confirma que
> `npm run validate` pasa con las 17 entradas.

**Terminado cuando:** validate imprime 17 entradas y 7 categorías visibles.

---

## Fase 1 — El Aleph

La esfera antes que nada, porque es lo que decide si el artefacto existe.

> Lee `docs/ARANA.md`, sección "El Aleph". Construye el componente `<Aleph />`
> con react-three-fiber: esfera de radio 1, material de transmisión con
> distorsión alta, un solo foco en ángulo bajo, sombra larga, fondo
> transparente. Nada de estrellas, nebulosa, bloom ni anillos.
>
> Gira a 0.06 rad/s. Acelera levemente con el cursor encima. Al pulsar se
> contrae un 8% y vuelve, en 180 ms.
>
> Tres condiciones que no son opcionales: es un `<button>` accesible con
> teclado; con `prefers-reduced-motion` se queda quieta y sigue funcionando;
> sin WebGL cae a un círculo SVG con el mismo comportamiento. La invocación
> nunca puede depender de que cargue el 3D.
>
> El movimiento no lo inventes: `lib/aleph/tension.ts` ya está escrito y
> probado. La esfera cuelga de la red y su posición de reposo sale de
> `alephState(patas)`; usa `spring()` para llegar hasta ella e `impulse()` para
> el golpe de cada pulsación. El componente no calcula física, solo la lee.
>
> Móntalo solo en una página de prueba, con once botones provisionales para
> comprobar que la esfera se descuelga. Enséñame una captura antes de seguir.

**Terminado cuando:** la esfera se ve bien en un móvil y responde igual con el
3D desactivado.

---

## Fase 2 — Las once patas y el motor

> Lee `docs/ARANA.md` entero y `lib/oracle/invoke.ts`, que ya está escrito y no
> hay que rehacer.
>
> Dibuja las once patas alrededor del Aleph, en el orden del campo `leg` de
> `content/categories.json`. Cada pata es un `<button>` con su glifo y su
> nombre, navegable por teclado en orden de anillo. Tres estados: retraída
> (menos de tres entradas, no se puede apoyar, el tooltip dice cuántas faltan),
> en reposo, apoyada.
>
> Al apoyar una pata pasan cuatro cosas, en este orden y en menos de un
> segundo: golpe hacia su ángulo, aparición del hilo vibrando a su frecuencia
> (`threadFrequency`) con amortiguación en unos 700 ms, desplazamiento del
> Aleph a su nueva posición de reposo, y subida de la distorsión del material.
> Al soltarla, el golpe contrario y más débil, y el hilo se afloja.
>
> Lee `docs/ARANA.md`, sección "Movimiento". No ajustes las constantes de
> `tension.ts` sin decírmelo: los números están medidos.
>
> Pulsar el Aleph genera una semilla nueva y navega a
> `/i/[seed]?patas=a,b,c`. Ahí se llama a `invoke()` y se renderiza el
> resultado según su forma: entrada, arista, constelación o deriva.
>
> El resultado muestra siempre, en este orden: el dictamen, las entradas, lo
> que las une y lo que las separa. El dictamen es la línea grande; no lleva
> comillas ni se atribuye a nadie.
>
> En móvil el anillo se convierte en una fila de glifos bajo la esfera.
>
> Tests: determinismo con la misma semilla y las mismas patas; que dos
> pulsaciones seguidas con la misma selección den resultados distintos; que
> ninguna pata retraída llegue al motor; y que la suma de los once vectores del
> anillo sea cero, porque de eso depende que apoyar las once centre la esfera.

**Terminado cuando:** puedes apoyar tres patas, pulsar cinco veces, obtener
cinco cosas distintas, y compartir una de las cinco por URL.

---

## Fase 3 — La entrada

> Diseña la vista de entrada siguiendo `docs/DESIGN.md`: identificador en mono,
> título en serif, cuerpo, pregunta separada por un blanco generoso, metadatos
> colgados al pie.
>
> El estado epistémico se codifica en el borde izquierdo del bloque, nunca con
> color. Si `sensitive` es true, el aviso de contenido educativo.
>
> Permalink en `/e/[id]`. Open Graph con imagen generada por `@vercel/og`:
> fondo `--bg`, identificador en mono, título en serif, nada más.

---

## Fase 4 — Incorporar información

Sin esto el archivo muere en la entrada veinte.

> Tres vías, por orden de prioridad:
>
> 1. `npm run capture`, ya escrito en `scripts/capture.mjs`. Pruébalo, arregla
>    lo que falle y añade un test.
> 2. El issue form de `.github/ISSUE_TEMPLATE/anomalia.yml` más un Action que
>    convierta un issue etiquetado `anomalia` en un PR con el JSON stub. Esta
>    es la vía del móvil y la más importante de las tres.
> 3. Ruta `/pendientes` con las entradas `unverified` como cola editorial, y lo
>    que le falta a cada una para pasar a verificada.
>
> Las `unverified` participan en las invocaciones pero nunca en modo material,
> y aparecen con su estado bien visible.

---

## Fase 5 — La red

> Vista del grafo sobre `lib/drift/graph.ts`, que ya está escrito.
> `/deriva/[seed]`: la cadena en vertical, y entre cada par la razón del
> vínculo en una línea. Al final, los tags que atravesó. Si una entrada no
> tiene vecinos, la deriva termina ahí y lo dice.
>
> Modo `dos mundos`: al pedir la antípoda de una pata, como el anillo es impar,
> devuelve las dos que la flanquean y presenta el cruce como pregunta abierta,
> sin resolverlo.
>
> Modo `contacto`: camino más corto entre una entrada de Diego y una de Paola.
> Si no hay camino, "sin ruta todavía".

---

## Fase 6 — El gabinete

> Lee `docs/MUSEO.md`. Implementa `/gabinete` sobre `content/figures.json` y
> `content/rooms.json`.
>
> Siete salas. Cada sala muestra su criterio junto al nombre, siempre, porque
> el criterio es el contenido. Una figura pertenece a varias salas.
>
> La ficha de figura muestra el emblema, el nombre, los años, la nota y las
> entradas ligadas. Navegación en los dos sentidos: desde una entrada se llega
> a la figura de su autor y al revés.
>
> `invocar desde esta sala` pasa las entradas ligadas a sus figuras al motor
> como si fueran una pata más.
>
> Los sprites: dibuja **seis**, siguiendo la especificación, empezando por
> Borges, Kafka, Euler, Spinoza, Pessoa y Bourgeois. SVG con rectángulos de 1×1
> en grilla de 32×32, paleta de seis tokens, silueta legible en negro plano.
> Las figuras sin sprite muestran un hueco marcado, nunca un icono genérico.

---

## Fase 7 — Archivo y paleta

> `/archivo` con todas las entradas. Filtros por categoría, tipo, tag, estado y
> contribuyente, combinables y reflejados en la URL. Búsqueda local sin
> dependencias. Las categorías retraídas no aparecen en los filtros.
> Paleta de comandos con ⌘K: buscar, invocar, saltar a pata, abrir sala.

---

## Fase 8 — ADN del archivo

> `/adn`: totales, patas encendidas y en reserva, distribución de tipos y
> estados, tags frecuentes, medias de extrañeza, oscuridad y ficción.
> Añade el solapamiento: tags que usan los dos, tags que usa solo uno. Dos
> columnas y una franja común. SVG plano, sin librerías, sin gamificación.

---

## Fase 9 — Anomalía del día y pulido

> `/hoy`: semilla derivada de la fecha en UTC, así que los dos ven lo mismo el
> mismo día. Enlace discreto desde la portada.
>
> Accesibilidad: teclado completo, foco visible, contraste 4.5:1, aria-labels,
> 44px táctiles, sin scroll horizontal a 360px. Lighthouse por encima de 95.
>
> Repasa el microcopy entero contra las reglas de voz de `CLAUDE.md` y quita lo
> que suene a profecía. Actualiza README y documentación.

---

## Después

La capa de IA entra como lectora: explicar una entrada, proponer vínculos que
el grafo no ve, redactar un borrador a partir de una captura cruda. Siempre
sobre el archivo, nunca escribiendo en él sin revisión de uno de los dos.

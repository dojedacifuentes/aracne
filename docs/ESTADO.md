# Estado

Última actualización: 14 de septiembre de 2026. Para retomar en otra sesión:
«lee docs/ESTADO.md».

## Hecho

| Fase | Qué | Commit |
|---|---|---|
| 0 | Andamio sobre la arquitectura del tarot; kit en su sitio; motores que faltaban reconstruidos; 17 entradas; `validate` imprime 17 entradas · 7 categorías visibles · 4 retraídas; CI | `7055e03` … `86c0d0b` |
| 1 | La araña 3D como oráculo (`docs/ARANA-3D.md`) | `28e0a1d` |
| 2 | Pulsar invoca; `/i/<semilla>?patas=…`; propósito; hilos de las patas; pruebas de la fase | `c498ba0` |
| 3 | Vista de entrada, permalink `/e/<id>`, títulos cliqueables, Open Graph en build | `143570d` |
| 6 | El gabinete: siete salas, treinta figuras, seis emblemas, invocar desde una sala | `2b0e0f0` |
| 7 | `/archivo` con filtros combinables en la URL, búsqueda local y paleta ⌘K | `b76a397` |
| — | Arreglos: llegar al gabinete en un teléfono | pendiente de commit |

En curso: una revisión adversarial de las fases 0–2.

Las fases 6 y 7 se adelantaron a la 4 y la 5 por decisión del usuario: el contenido de la 6 ya
estaba escrito (`figures.json` y `rooms.json`) y la 7 es la estructura que hará
navegable el archivo cuando crezca. Ninguna de las dos dependía del material que
el usuario estaba reuniendo.

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
6. **Las 17 entradas.** Las redactó Claude a partir de las referencias de
   `figures.json`, con fuentes comprobadas. La autoría sigue la afinidad de la
   figura correspondiente; en las cuatro sin figura es provisional. Cada
   entrada lo declara en `captureNote`.
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

- Fases 4, 5, 8 y 9 de `docs/PROMPTS.md`.
- **24 figuras siguen sin emblema.** Muestran el hueco marcado que pide
  `docs/MUSEO.md`, que es el estado correcto, no un error. Los seis dibujados
  son los que pedía la fase: Borges, Kafka, Euler, Spinoza, Pessoa y Bourgeois.
- **21 de las 30 figuras no tienen ninguna entrada ligada**, y la sala «Los que
  firmaron con otro» no tiene ninguna: no se puede invocar desde ella todavía.

- **El archivo está por debajo de su masa crítica.** Con 17 entradas, 60
  pulsaciones devuelven cada entrada 5,6 veces de media y *Tlön* sale 14; cuatro
  de las 17 llevan el tag `borges`. El grado medio del grafo es 4,9 vecinos de
  16 posibles, pero solo 1,8 vínculos fuertes, y `delyra-0013` no tiene ninguno.
  Ninguna funcionalidad arregla esto: hacen falta entradas.
- Probar el rendimiento en un teléfono real y `prefers-reduced-motion` en un
  navegador real.
- Conectar el repositorio a Vercel y definir `SITE_URL` para las imágenes Open
  Graph.
- Iconos y splash: siguen siendo la luna del tarot.
- Malla de la araña: 87 000 triángulos. Bajar más exige reproyectar la textura.

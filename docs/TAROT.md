# Qué se hereda de *tarot de la conjetura*

Leído entero en `c041e14`. El repositorio es público: se clonó con `git`, sin
`gh` (que además no está instalado en esta máquina).

Cada hallazgo lleva una marca: **reutilizar**, **adaptar** o **descartar**.

## Lo primero: el tarot no es Next.js

El kit daba por hecho un proyecto Next.js (`next.config`, Tailwind, fuentes de
Next, `@vercel/og`). El tarot es **Expo SDK 57 + React Native 0.86 +
react-native-web**, con three.js sin React Three Fiber, y se publica en Vercel
como export estático. Por indicación expresa —usar el tarot como
arquitectura— Aracne se monta sobre ese stack. Consecuencias: no hay `app/`
de Next ni Tailwind; los tokens viven en `ui/theme.ts`; las rutas
(`/i/[seed]`, `/e/[id]`…) se resuelven en cliente sobre una sola escena, como
en el tarot; las imágenes Open Graph habrá que generarlas en build.

## 1. Configuración

| Hallazgo | Marca | Motivo |
|---|---|---|
| Versiones: expo ~57.0.8, react 19.2.3, RN 0.86, three ^0.185.1, TS ~6.0.3 | reutilizar | se hereda el `package-lock.json`: son las que ya funcionaron |
| `tsconfig.json` sobre `expo/tsconfig.base`, strict y `noUnused*` | reutilizar | se añade `resolveJsonModule` y se excluye `.reference/` |
| `vercel.json`: `framework: null`, export estático, reescritura SPA, caché inmutable | reutilizar | sin él Vercel publica el código fuente; se añade caché para `/models/` |
| `public/index.html` con el fondo pintado antes de React | reutilizar | nunca hay destello blanco; cambia el color |
| `eslint.config.js` con `eslint-config-expo` | reutilizar | |
| `app.json` | adaptar | nombre, colores de DESIGN.md, sin permiso de ubicación |
| `scripts/png.mjs` y `generate-assets.mjs` (PNG y audio sin dependencias) | adaptar | el grano sirve; es azulado y hay que calentarlo |
| Fuentes del sistema (Georgia y sans) | descartar | DESIGN.md pide Newsreader y JetBrains Mono |
| Pruebas con `node:test` e imports con `.ts` explícito | descartar | los motores del kit importan sin extensión: se usa vitest |

## 2. La animación de revelado

`HomeScreen.tsx` resuelve «pulso y aparece algo» sin cambiar de pantalla: cada
escena es una capa superpuesta sobre una altura fija, que entra con
`Animated.timing` (opacidad y `translateY` de 10 a 0, 620 ms, `easeInOut`
cúbico). La portada aparece escalonada interpolando tramos de un único valor.

**Adaptar.** Se conserva el mecanismo —capas apiladas, ningún salto de layout,
un solo valor animado por escena— con los tiempos de DESIGN.md: 320 ms,
`cubic-bezier(0.2, 0.8, 0.2, 1)`, 8 px, 40 ms de escalón entre identificador,
título, cuerpo y pregunta, y un fundido de 120 ms con reducción de movimiento.

## 3. Cómo carga y tipa el contenido

Todas las frases y autores viven en un único módulo TypeScript
(`src/lib/library.ts`: 23 referencias y 51 frases), tipado a mano y elegido con
FNV-1a sobre `día | fase | signo`.

**Descartar el patrón.** Aquí un solo archivo de contenido está prohibido, y
con 300 entradas impediría el commit por entrada y los PR desde issues.
**Reutilizar la idea de fondo:** el modelo del tarot no admite citas atribuidas
(ninguna frase tiene `quote` ni `author`) y un test lo comprueba.

En Aracne cada entrada es un JSON en `content/entries/`. Metro no puede leer una
carpeta en runtime, así que `npm run validate` genera
`content/index.generated.ts` (no versionado), que solo enumera los imports.
Aguanta 300 entradas: cada una ocupa 1–2 KB del bundle. Si el archivo pasara de
mil, convendría partir el índice por categoría y cargarlo bajo demanda.

## 4. Qué NO se trae

- **`Math.random()`: ninguna aparición.** La aleatoriedad del tarot es
  determinista: FNV-1a en `library.ts` y xorshift sembrado en
  `generate-assets.mjs`. No hay que limpiar nada; se hereda el criterio y un
  test lo vigila en Aracne.
- **Contenido en un solo archivo:** `library.ts`. Descartar (ver 3).
- **Lógica de selección en componentes:** el tarot la saca a `src/lib/` y la
  compone en el hook `useMoonNow`. En `HomeScreen.tsx` solo quedan tablas de
  escena (`MOON_IN_SCENE`, `LENS_RATE`), que son presentación. Aceptable; en
  Aracne los componentes llaman a `invoke()` y nada más.
- **Todo lo astronómico:** `astronomy-engine`, efemérides, fases, signos,
  lentes, ubicación, primer cielo, susurros y sonidos lunares. Descartar.
- **Paleta por fase, degradados y halos** (`NightSky`, `Moon`). Descartar:
  CLAUDE.md prohíbe glow y gradientes.

## 5. three.js

`Moon3D.web.tsx` monta three sin React Three Fiber sobre un `canvas` propio
dentro de un `View`: un solo `WebGLRenderer`, DPR limitado a 2,
`powerPreference: 'low-power'`, un bucle que se detiene cuando no queda nada
por animar con reducción de movimiento, gestos con pointer events, recuperación
ante `webglcontextlost`, `ResizeObserver` y dispose completo al desmontar.
`MoonBoundary` y `MoonFallback` garantizan que siempre queda algo que pulsar.

**Reutilizar el patrón y adaptarlo** para el oráculo, que desde la fase 1 es
una araña 3D (ver `docs/ARANA-3D.md`). No se instala `@react-three/fiber`: la
arquitectura three del tarot ya funciona en este stack y R3F añadiría una capa
sin ganar nada.

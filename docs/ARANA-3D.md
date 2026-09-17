# La araña 3D

El oráculo dejó de ser una esfera: es una huntsman (*Heteropoda venatoria*)
que cuelga de su hilo junto a las patas del archivo. La metáfora de
`docs/ARANA.md` no cambia —el cuerpo se pulsa, las patas tiran de él—; cambia
lo que se ve.

## 1. Auditoría de la aplicación antes de tocar nada

| Pregunta | Respuesta |
|---|---|
| Framework | Expo SDK 57: React Native 0.86 con react-native-web 0.21, React 19.2 y Metro. No es Next.js ni Vite. |
| three.js | Ya instalado, 0.185, heredado del tarot. |
| React Three Fiber, Drei | No. El tarot monta three sin abstracción sobre un `canvas` propio. Se mantiene: instalar R3F solo para la araña añadiría una segunda arquitectura 3D. |
| Dónde encaja | La portada, `ui/screens/HomeScreen.tsx`: columna izquierda en escritorio, mitad superior en móvil. Es el sitio que `docs/ARANA.md` da al cuerpo. |
| Estilos | `StyleSheet` de React Native con los tokens de `ui/theme.ts`. Tres modos de layout en `ui/lib/layout.ts`: retrato, apaisado y ancho (≥ 900 px). |
| Assets | `assets/` para lo que viaja en el bundle con `require`; `public/` para lo que se sirve tal cual. No había modelos 3D. |
| Canvas o bucle global | No existía. La escena de la araña es el único `WebGLRenderer` de la aplicación. |

## 2. Qué se tomó de `code4fukui/vr-spiders`

El repositorio se clonó en `.reference/` (ignorado por git) y no es una
dependencia de nada.

| En la demo | Aquí | Marca |
|---|---|---|
| GLB de la huntsman (CC0) | copia local optimizada en `public/models/spider/huntsman-spider.glb` | reutilizar |
| `importmap` a los CDN de three y `egxr.js` | three desde npm; `GLTFLoader`, `SkeletonUtils` y `MeshoptDecoder` desde `three/examples/jsm` | descartar |
| `getModel(gltf, "QS1319-W20_5")` para esquivar el cubo auxiliar | el cubo se elimina al optimizar; en runtime se busca el nodo `huntsman` | adaptar |
| `SkeletonUtils.clone` y `AnimationMixer` | clonado con `SkeletonUtils` en `spiderModel.ts`; sin mixer, porque este GLB no trae esqueleto ni animaciones | adaptar |
| escala 0.03 y rotaciones a mano | caja envolvente (lado mayor = 1) y orientación declarada en `spiderConfig.ts` | adaptar |
| `makeSpiderSilk(start, end, { segments, slack })` | clase `SpiderSilk` | adaptar (ver 4) |
| vaivén de seno y coseno a 0,8 y 0,6 | mismas frecuencias, amplitud mucho menor y escalada por intensidad | adaptar |
| veinte arañas en dos anillos, con `Math.random()` | una sola, sin azar | descartar |
| caída `y = 3 − t⁴` | descenso con muelle crítico: acelera, frena y se detiene | descartar la curva |
| WebXR, `PCControl`, «mirar atrás» | — | descartar |
| wolf spider riggeada (CC-BY 4.0, siete animaciones) | no se usa: no es el modelo pedido y obligaría a atribuir | descartar |

## 3. El modelo

El GLB original pesa 10,67 MB: cinco mallas con 242 665 vértices y 170 434
triángulos, partidas por el límite de 65 535 vértices del exportador, un cubo
auxiliar de Sketchfab y material *unlit* con la luz horneada en la textura.

`npm run spider` (`scripts/optimize-spider.mjs`, con gltf-transform, solo en
desarrollo) lo deja en **1,50 MB**: una malla de 86 904 triángulos, textura
WebP y geometría con `EXT_meshopt_compression`. El decodificador viene dentro
de three: en runtime no hay ninguna dependencia nueva.

La simplificación se detiene en la mitad y no en el 20 % pedido. La
fotogrametría reparte la textura en muchas islas y meshoptimizer no colapsa
aristas sobre esas costuras; subir la tolerancia no cambia nada (probado con
0,002, 0,006 y 0,012). Una sola malla de 87 000 triángulos, sin sombras, es
asumible en un teléfono actual. Si hiciera falta bajar más, el camino es
reproyectar la textura sobre una malla simplificada sin costuras, no forzar la
tolerancia.

En runtime el material *unlit* se sustituye por un `MeshStandardMaterial` con
el mismo mapa: con luz real la araña se asienta en el negro del fondo en vez de
parecer recortada.

## 4. La seda

El original, en cada fotograma y por cada hilo, clonaba tres vectores, creaba
otro, pedía 65 puntos nuevos a la curva, rehacía el atributo de posición con
`setFromPoints` y recalculaba la esfera envolvente. Con veinte arañas eran más
de mil objetos por fotograma para el recolector de basura.

`SpiderSilk` reserva un `Float32Array` de 33 puntos una sola vez, evalúa la
Bézier cuadrática a mano sobre ese búfer y solo marca `needsUpdate`. El hilo no
se recorta contra el frustum, así que no necesita envolvente. La holgura se
aplica en perpendicular a la cuerda: en un hilo vertical, bajar el punto de
control —lo que hacía el original— no curva nada. `THREE.Line` dibuja a un
píxel físico: fino a propósito.

## 5. Arquitectura

```
ui/components/spider/
  Spider.tsx            API pública: elige 3D o silueta y pone el botón encima
  SpiderScene.web.tsx   renderer, cámara, luces y el único bucle
  SpiderScene.tsx       en nativo no hay 3D
  SpiderRig.ts          una araña: modelo, seda y movimiento, sin React
  SpiderSilk.ts         el hilo
  spiderModel.ts        carga perezosa, normalización, clonado y liberación
  spiderMotion.ts       física pura, probada en tests/spiderMotion.test.ts
  useSpiderGrab.web.ts  la mano: eventos de puntero, umbral y velocidad
  useSpiderGrab.ts      en nativo no hay mano que medir
  spiderConfig.ts       todas las constantes
  SpiderFallback.tsx    silueta SVG para nativo, sin WebGL o si el modelo falla
  SpiderBoundary.tsx    si la escena revienta, vuelve la silueta
```

```tsx
<Spider
  ringSize={legs.length}
  legs={[3, 7]}
  position={[0.5, 0.52]}
  scale={1}
  rotation={[0, 0, 0]}
  silk
  onPress={invocar}
/>
```

| Prop | Por defecto | Qué controla |
|---|---|---|
| `position` | `[0.5, 0.55]` | punto de reposo, normalizado al escenario |
| `scale` | `1` | tamaño; 1 = lado mayor del 46 % del lado corto del escenario |
| `rotation` | `[0, 0, 0]` | rotación añadida, en radianes |
| `visible` | `true` | muestra u oculta araña, hilo y botón |
| `motionIntensity` | `1` | micro movimiento; 0 la deja quieta |
| `speed` | `1` | frecuencias y duración de la entrada |
| `silk` | `true` | dibuja el hilo |
| `silkLength` | `'top'` | `'top'` nace sobre el borde superior; un número, alturas de escenario |
| `silkOpacity` | `0.5` | opacidad del hilo |
| `silkSlack` | `0.012` | curvatura, en fracción de su longitud |
| `entrance` | `'descend'` | `'descend'` baja desde fuera; `'none'` aparece en su sitio |
| `entranceDuration` | `4.5` | segundos aproximados del descenso |
| `legs`, `ringSize` | — | patas apoyadas y tamaño del anillo, para la física |
| `onPress`, `label` | — | el gesto de invocar y su nombre accesible |
| `reduceMotion` | `false` | ver 6 |

## 6. Comportamiento

- **Entrada.** Al montarse está fuera del escenario, por arriba, y baja por su
  hilo con un muelle crítico: acelera, frena y se detiene sin rebote.
- **Suspendida.** Péndulo de ±0,7°, elasticidad del hilo de un 0,8 % de su
  envergadura y torsión lenta de ±15° con un periodo de unos 105 s, del orden
  de los 0,06 rad/s del Aleph. El hilo oscila en un 0,6 % de su longitud.
- **Las patas tiran de ella.** El desplazamiento sale de `alephState()`, con
  `impulse()` al apoyar o soltar y las mismas constantes de muelle que
  `lib/aleph/tension.ts` (un test comprueba que el muelle sin reservas da
  exactamente lo mismo que `spring()`). La distorsión del Aleph se traduce en
  penumbra: cuantas más patas, menos luz. Las once a la vez la centran y la
  dejan en sombra.
- **Pulsar.** Gesto de pupila: se contrae un 8 % y vuelve en 180 ms. Con el
  puntero encima, además, se la puede coger y tirar de ella: ver 9.
- **Escritorio.** Paralaje de cámara de un 2 % de la altura del escenario y,
  con el cursor encima, trepa un poco por el hilo.
- **Móvil.** Sin hover ni paralaje.
- **`prefers-reduced-motion`.** Sin descenso, sin micro movimiento, sin
  paralaje ni gesto: queda en su sitio y el bucle se detiene en cuanto no hay
  nada que dibujar. La posición sigue diciendo qué patas están apoyadas.

## 7. Rendimiento y ciclo de vida

- El modelo se pide cuando la escena se monta, desde `public/`: no viaja en el
  bundle. Se carga una vez y todas las arañas lo comparten; al desmontarse la
  última se liberan geometría, material y textura.
- DPR máximo de 2 con ratón y de 1,5 en pantallas táctiles; antialias solo por
  debajo de 2.
- Un solo renderer y un solo `requestAnimationFrame`, que se detiene con la
  escena fuera de pantalla (`IntersectionObserver`), con la pestaña oculta y,
  con reducción de movimiento, cuando no queda nada que animar.
- Nada se reserva por fotograma: vectores y estados preasignados, y la seda
  reescribe su búfer.
- Si se pierde el contexto WebGL, aparece la silueta vectorial.
- El lienzo tiene `pointer-events: none` y el escenario `overflow: hidden`: no
  roba clics y no provoca scroll horizontal. Solo el botón circular sobre la
  araña recibe eventos, y se enfoca con teclado.

## 8. Verificación (14 de septiembre de 2026)

- `npm run validate`, `npm run typecheck`, `npm test` y `npm run lint` en
  verde, en local y en la CI de GitHub.
- Anchos probados con viewport emulado: 360 × 780, 390 × 844 y 768 × 1024
  (retrato: la araña arriba y la fila de glifos debajo) y 1024 × 768 (ancho: la
  araña a la izquierda y las patas a la derecha). En los cuatro,
  `scrollWidth` coincide con el ancho de la ventana: no hay scroll horizontal.
- Orientación y seda comprobadas sobre capturas del propio lienzo: cuelga
  cabeza abajo, con el dorso hacia quien mira y el hilo saliendo del abdomen.
- Tensión: con Telarañas y Psicopolítica apoyadas se desplaza hacia abajo y a
  la derecha, que es la suma de los vectores de las patas 3 y 7.
- Coste de CPU por fotograma (actualizar la araña y enviar el render): 0,14 ms
  a 1024 × 768 con DPR 1,25.
- Pérdida de contexto forzada con `WEBGL_lose_context`: el lienzo se retira y
  aparece la silueta SVG.
- Consola sin errores.

En desarrollo, `window.__aracneSpider.step(n)` avanza la escena `n` fotogramas
a mano. Sirve para revisarla en pestañas o paneles ocultos, donde
`requestAnimationFrame` no corre; en producción no existe.

**No verificado todavía:** `prefers-reduced-motion` en un navegador (el panel
de pruebas no lo emula; la rama del código es corta y la física que usa está
probada), el rendimiento en un teléfono real e iOS o Android nativos, que usan
la silueta.

---

## 9. Manipularla

Desde la fase 18 la araña no solo se pulsa: se coge, se tira de ella y se
suelta. El hilo de arriba sigue prendido donde estaba, el cuerpo se resiste
cada vez más según se lo lleva lejos y, al soltarlo, pasa de largo, oscila y se
para. Mientras nadie la toca, en pantalla no hay nada nuevo.

### Quién hace qué

| Archivo | Qué pone |
|---|---|
| `useSpiderGrab.web.ts` | mide la mano: puntero sobre el botón que ya existía, umbral, captura y velocidad. Ninguna física. |
| `useSpiderGrab.ts` | en nativo no hay mano que medir ni escena que manipular. |
| `SpiderScene.web.tsx` | traduce píxeles de cliente a unidades de mundo. Nada más. |
| `SpiderRig.ts` | `beginGrab`, `dragTo`, `release`: el gesto se convierte en desplazamiento, inclinación, tensión y seda. |
| `spiderMotion.ts` | la matemática, pura y probada: resistencia, recorte de rapidez, velocidad del puntero. |
| `spiderConfig.ts` | `GRIP`: todas las cifras, ninguna suelta por ahí. |

El reparto es el de siempre: React monta el botón, la escena traduce, el rig
decide y la matemática se prueba sin navegador. No hay un segundo lienzo, ni un
segundo bucle, ni un objetivo invisible encima del animal: el gesto entra por el
mismo `Pressable` que ya se pulsaba y viaja por una referencia, así que
**arrastrar no vuelve a renderizar nada**.

### La resistencia

No es `cuerpo.x = puntero.x`. El desplazamiento pasa por una curva que satura:

```
f(d) = d · R / (d + R)
```

En el origen vale exactamente lo que se pide —f′(0) = 1— y por mucho que se siga
tirando nunca alcanza `R`, que son 0,85 envergaduras; a media distancia ya solo
obedece la mitad. Medido en pantalla, con una araña de 212 px: un tirón de 360 px
la lleva 120 px y uno de 820 px la lleva 148 px. Casi cuatro veces el gesto para
menos del doble de recorrido. Eso es lo que se siente como una seda.

### El muelle, y los tres que hacen falta

No hay integrador nuevo: es el `springInPlace` de siempre, el mismo que
`spring()` de `lib/aleph/tension.ts`. Lo que cambia son las constantes, y solo
mientras dura cada suceso:

| Cuándo | Rigidez | Amortiguación | Por qué |
|---|---|---|---|
| la mano sujeta | 170 | 26 | crítico: sigue al dedo de cerca y no tiembla |
| acaba de soltarse | 90 | 9 | ζ = 0,47: se pasa un décimo de envergadura y se para |
| el resto del tiempo | 90 | 14 | las del anillo, sin tocar |

La fila del medio es una corrección hecha mirando la pantalla y no el papel. Con
las constantes del anillo el cuerpo se pasaba de su sitio **dos píxeles**: eso no
es un retroceso, es un redondeo. Bajando solo la amortiguación, el sobrepaso
medido es de 25,9 px —0,12 envergaduras— a los 0,28 s, y a los dos segundos no
queda nada. En cuanto el muelle se para vuelven las del anillo: que una pata tire
no es que alguien tire.

### El hilo y las patas

El extremo de arriba **no se mueve**. Lo que cambian son la dirección, la
longitud aparente y la holgura: alejarse del anclaje tensa la seda y acercarse la
afloja, porque es hilo y no varilla. La inclinación del cuerpo no se dibuja
aparte: sale sola del `atan2(cuerpo − anclaje)` que ya estaba.

Los hilos de las patas apoyadas también están prendidos en la red y no en el
animal: su extremo lejano se queda donde se echó. Llevar el cuerpo hacia una pata
afloja su hilo; alejarlo de ella lo tensa. Es toda la «respuesta de patas» que
este modelo admite sin mentir: la huntsman del GLB no tiene esqueleto —ver 2—,
así que no hay pata que doblar. Las once patas de Aracne son las categorías, y
esas sí responden.

### Pulsar, ahora

Al posar la mano el cuerpo se comprime un 3,5 % y el péndulo se apaga: lo que se
mece no está cogido. Si el contacto cae fuera del centro, el cuerpo se aparta un
poco del dedo, y de ahí sale la inclinación sin girar nada a mano; es un empujón
de 0,7 envergaduras por segundo a máxima excentricidad, que con el muelle de
sujeción son unos 4 px. Se nota, no se ve.

El gesto de pupila de **invocar** no cambia. Y tirar no es pulsar: si el gesto
tuvo recorrido, el clic que llega detrás se descarta durante 350 ms.

### Teclado, táctil, sin movimiento

- **Teclado.** Intacto. El elemento sigue siendo un botón con papel, etiqueta,
  foco visible y Enter o Espacio. Tirar es una mejora del puntero, no un
  requisito: invocar funciona sin ella, y el fallback vectorial también.
- **Táctil.** `touch-action: pan-y` reparte el gesto: a lo alto la página se
  recorre —la araña vive dentro de una columna que se desplaza— y a lo ancho el
  animal es del dedo. Capturado el puntero, el resto del gesto es suyo en
  cualquier dirección.
- **`prefers-reduced-motion`.** Se puede tirar igual y el cuerpo va donde la mano
  lo lleve; lo que desaparece es el recorrido. Sin muelle, sin retroceso y sin
  oscilación: al soltar está en su sitio en el mismo fotograma. La compresión al
  pulsar se aplica entera y de golpe.
- **Multitáctil.** El segundo dedo se ignora. El sitio donde entraría el pellizco
  está marcado en `useSpiderGrab.web.ts` y el rig no tendría que cambiar; no se
  ha escrito porque no hace falta todavía.

### Rendimiento

Ni un objeto nuevo por fotograma: la resistencia y el recorte escriben en un
vector de trabajo del rig, y la velocidad del puntero en otro del gesto. La caja
del lienzo se lee **una vez, al agarrar**, y no en cada aviso del puntero:
preguntarla sesenta veces por segundo obliga al navegador a rehacer el diseño
otras tantas. Cada aviso pide un fotograma y ninguno más, así que con reducción
de movimiento el bucle sigue durmiendo entre gesto y gesto.

### Qué se estudió de `estherliu-lab/momo-soft-play`

MOMO es un juguete blando: se pellizca, se estira y se lanza. No se parece en
nada a esto y no comparte una línea de código —ver `THIRD_PARTY_LICENSES.md`—,
pero tres ideas de su ingeniería valían:

1. **Estado, destino y velocidad separados**, con el muelle en medio. Aracne ya
   lo tenía para las patas; lo que faltaba era enchufar la mano a ese mismo
   muelle en vez de escribir la posición a pelo.
2. **Medir la velocidad del puntero**, no solo su posición, acotando el intervalo
   entre muestras para que ni dos avisos en el mismo milisegundo ni un fotograma
   perdido den una cifra absurda. Aquí, además, la medida se mezcla con la
   anterior y se apaga con el tiempo: soltar parado no lanza nada.
3. **Amortiguar más con `prefers-reduced-motion`** en lugar de apagar la
   interacción. Aquí se lleva al extremo: sin movimiento no hay muelle, pero
   tirar sigue funcionando.

Lo demás de MOMO —el personaje, la estética, el pellizco, la gravedad, el
lanzamiento, los coleccionables, el audio, la malla de 32 × 32 deformada en la
CPU cada fotograma— queda fuera por decisión, no por dificultad.

### Pendiente

- **Deformación local del abdomen.** MOMO hunde la malla alrededor del punto
  tocado con una caída gaussiana. Aquí tendría que ir en el vertex shader, por
  `onBeforeCompile`, y no en la CPU: son 87 000 triángulos. Un desplazamiento que
  dependa solo de la posición respeta las costuras de la fotogrametría, así que
  es viable; como la prioridad era el comportamiento mecánico, no se ha escrito.
  Si se escribe: 1–3 % como mucho, y nada gelatinoso.
- ~~**Sonido procedural.**~~ **Hecho en la fase 19.** Era otra decisión, y se
  tomó: el roce, la seda, el chasquido, el hilo de cada pata y el dictamen
  suenan, apagados por defecto y sin un solo sample. La nota de una pata es su
  `threadFrequency()` subida cinco octavas, y las parciales del dictamen salen
  de la semilla. Reglas y medidas en `docs/SONIDO.md`.
- **Multitáctil.** Ver arriba.

### Verificación (15 de septiembre de 2026)

`npm run validate`, `npm run typecheck`, `npm run lint`, `npm test` y
`npm run build`, en verde. Diecisiete pruebas nuevas en
`tests/spiderGrab.test.ts`, once de ellas sobre el rig entero montado en Node y
sin escena: la resistencia crece siempre y cada vez menos, la velocidad del
puntero ni se dispara ni se queda pegada, el cuerpo nunca se pasa del alcance, el
retroceso cruza el reposo y se para, sin movimiento no cruza nunca, y el vértice
de arriba de la seda es idéntico bit a bit antes y después de un tirón.

Sobre el lienzo, con la escena avanzada a mano (`window.__aracneSpider.step`, ver
8) y midiendo el animal por sus píxeles: pulsar en el centro comprime un 3,7 % de
altura sin mover el cuerpo; un tirón de 360 px lo desplaza 0,57 envergaduras y
uno de 820 px, 0,70 —la cifra que predice la curva—; la seda sale del borde
superior por el mismo sitio con el cuerpo 142 px a la derecha; al soltar, el
sobrepaso es de 0,12 envergaduras y vuelve a su sitio.

**Comprobado en producción**, en https://aracne-mu.vercel.app y con eventos
reales del navegador: el botón de la araña se monta como `button` con tabulador,
`touch-action: pan-y` y `user-select: none`, o sea que el gesto se enganchó; un
arrastre de ratón desplaza el cuerpo, deja la seda prendida arriba y en diagonal,
y lo devuelve a su sitio en un par de segundos **sin invocar**; una pulsación sin
recorrido sí invoca, y sale `/i/<semilla>`. El foco de teclado llega al botón y
activarlo desde ahí invoca.

**No verificado todavía:** que Enter y Espacio activen el botón, porque el panel
de pruebas inyecta la tecla pero no su acción por omisión —no activa tampoco
ningún otro botón de la aplicación, incluidos los que esta fase no toca, así que
no dice nada de este—; el tacto en un teléfono de verdad; y
`prefers-reduced-motion` en un navegador.

# Diseño

La referencia no es una terminal de ciencia ficción. Es un catálogo razonado
de museo impreso en papel oscuro: una ficha por objeto, mucho margen, datos
pequeños y precisos abajo, y un solo objeto en pantalla a la vez.

Eso resuelve la tensión entre "oscuro" y "sobrio". Lo oscuro viene del
soporte; la sobriedad, de que hay una sola cosa en la página.

## Dónde está esto ahora: archivo editorial + instrumento forense

El catálogo razonado sigue siendo la base y no se sustituye. Lo que se le ha
sumado es **el instrumento**: la parte de la pantalla que mide, filtra, apunta
y cuenta. Un archivo que además es una máquina de consultar.

La mezcla tiene una sola regla, y de ella cuelga todo lo demás:

> **El contenido es editorial y cálido. El instrumento es frío y pequeño.**
> Lo que se lee va en serif, con su medida y su aire. Lo que se toca va en
> mono, en versales, de un píxel de trazo y del frío de la máquina.

De ahí sale la estética que se buscaba —archivo clasificado de 1999, software
científico abandonado, terminal universitaria— sin una sola concesión al
cyberpunk de tienda: la sensación es de **sistema**, no de neón. Entra por la
interacción y por el lenguaje —corchetes de tecla, cuentas, coordenadas,
inversión al pasar por encima, barras de estado, sprites de 32 píxeles— y no
por añadir luz.

Sigue prohibido, y ahora con más motivo porque es lo que más cerca queda:
neón decorativo, *glow* gratuito, glassmorphism, degradados sin función,
tarjetas redondeadas, sombras, y cualquier componente que se reconozca como
«panel de SaaS». El frío de la máquina no es un segundo acento: es un color
ya existente (`machine`) usado **solo** en lo que se puede tocar.

## Color

Negro cálido, no azulado. El neutro frío es el tell de la interfaz cyberpunk
genérica; el cálido lee a tinta y a archivo.

```
--bg        #0E0D0C   fondo
--surface   #161412   bloques elevados, campos
--line      #2A2724   hairlines, bordes de bloque
--text      #EDEAE3   texto principal, blanco roto cálido
--dim       #8A857D   metadatos, texto secundario
--accent    #B5432E   óxido
```

El acento ocupa menos del 5% de la superficie visible: el estado de foco, el
identificador de la entrada, y nada más. No lo uses para el botón principal
ni para codificar el estado epistémico.

Grano: una textura de ruido al 3% sobre el fondo, fija, sin animar. Es lo
único decorativo que se permite.

## Tipografía

Dos familias, roles bien separados.

- **Serif editorial** — título de la entrada, cuerpo, pregunta.
  `Newsreader` o `Literata`. Cuerpo a 18px, interlineado 1.65, medida de 62–68
  caracteres. Título a 42px en escritorio, 30px en móvil, peso 400.
- **Mono** — identificador, año, tipo, categorías, nombres de modo.
  `JetBrains Mono` a 12px, `letter-spacing: 0.06em`. Solo datos. Nunca un
  párrafo, nunca un titular.

Escala 1.25. Sin mayúsculas para etiquetas salvo el identificador
(`DELYRA 0047`), que es un número de catálogo y se comporta como tal.

## Distribución

Una columna de 640px, alineada a la izquierda, no centrada. El texto centrado
convierte cualquier cosa en una tarjeta de felicitación.

```
┌───────────────────────────────────────────┐
│                                           │
│  delyra 0047                              │  ← mono, acento
│                                           │
│  La habitación china                      │  ← serif 42
│                                           │
│  ┌─ Texto de la entrada, sesenta a ciento │  ← el borde izquierdo
│  │  cuarenta palabras, en serif, con la    │     codifica el estado
│  │  medida corta.                          │     epistémico
│  └─                                        │
│                                           │
│                                           │
│  ¿Simular comprensión equivale a           │  ← serif 24, dim
│  comprender?                               │
│                                           │
│  ─────────────────────────────────────    │
│  concepto   máquinas que imaginan, lógica │  ← mono 12, dos
│  interpretación                            │     columnas colgadas
│  Searle, Minds Brains and Programs, 1980  │
│  d                                         │
│                                           │
│  invocar otra        derivar      archivo │
└───────────────────────────────────────────┘
```

En la portada solo hay tres cosas: el nombre, una pregunta, y el botón.
El botón es un rectángulo con borde de 1px en `--line`, texto en serif, sin
relleno. Al pasar por encima, el borde pasa a `--text`. No cambia de color.

## Estado epistémico

Se codifica en el borde izquierdo del bloque de contenido, nunca con color,
para que funcione en monocromo y no monte un semáforo.

```
fact            border-left: 1px solid
hypothesis      border-left: 1px dashed
speculation     border-left: 1px dashed
interpretation  border-left: 1px solid, --dim
fiction         border-left: 3px double
controversial   border-left: 1px dotted
unverified      sin borde, y la etiqueta en --accent
```

## Movimiento

Un solo momento: la entrada aparece. 320 ms,
`cubic-bezier(0.2, 0.8, 0.2, 1)`, opacidad y 8px de desplazamiento, escalonado
40 ms entre identificador, título, cuerpo y pregunta.

El identificador cuenta rápido hasta su número, 200 ms. Es el único gesto de
"procesamiento" que hay. El texto no se revuelve ni se descifra.

Con `prefers-reduced-motion`, todo queda en un fundido de 120 ms sin
desplazamiento ni contador.

Las excepciones a este apartado se pidieron expresamente y están en
`CLAUDE.md`, cada una con sus condiciones: el flujo vivo de la tela y la
entidad que sigue al cursor (`docs/ENTIDAD.md`).

## Cuándo hay tercera columna: nunca por defecto

El armazón tiene **dos columnas**: las secciones a la izquierda y el contenido
en el centro. No hay panel derecho permanente. Lo hubo —310 px con las once
patas, en todas las rutas, también leyendo una ficha— y ése es exactamente el
error que esta revisión corrige: **ancho cobrado por adelantado a un
instrumento que en esa pantalla no decide nada**.

Lo que un instrumento puede ser, en orden de preferencia:

1. **Nada.** Si la sección no necesita mando, no hay columna ni botón.
2. **Un cajón** (`ui/components/Drawer.tsx`): se superpone por la derecha,
   380 px, y en vertical sube desde abajo como una hoja. **No cambia la medida
   del contenido de debajo**, que es la diferencia entre consultar y perder el
   sitio. Cierra con `Escape`, con el fondo y con su aspa.
3. **Una barra compacta** sobre el propio contenido, cuando el mando es de tres
   botones y se usa constantemente: el Atlas la tiene.
4. **Una columna**, que el `Shell` sigue admitiendo (`aside`) pero que hoy no
   usa ninguna ruta. Si algún día se usa, tendrá que justificar el ancho.

El disparador es siempre el mismo componente y siempre se ve igual:
`[ expediente ]`, `[ filtros 3 ]`, `[ lente: guerra nuclear ]`. Va entre
corchetes porque así se nombran las teclas en un manual.

## Divulgación progresiva: qué está oculto y por qué

**Menos elementos permanentes, más información contextual.** Lo que se usa de
vez en cuando no puede ocupar sitio todo el rato.

| qué | dónde estaba | dónde está |
|---|---|---|
| las once patas | columna fija en todas las rutas | el modo de invocación (`InvocationComposer`) |
| el propósito de cada pata | una sección entera del menú | la ficha de cada pata, dentro del compositor |
| tipo, fuentes, atlas, autores, exportación | banda fija junto al cuerpo de la entrada | `[ expediente ]` |
| facetas del archivo | columna fija | `[ filtros ]` |
| las 34 causas del Atlas | columna fija | `[ lente ]` |
| pieles y mapas de la tela | columna fija | `[ instrumento ]` |

**Lo que no se esconde nunca:** el estado epistémico de una entrada. Lo exige
`CLAUDE.md` y tiene razón: dice cómo hay que leer lo que se está leyendo. Va
dos veces, en el trazo del borde del cuerpo y escrito al pie.

## Las patas

Aparecen **solo cuando se va a invocar**. Y dentro del compositor:

- Una pulsación **siempre conmuta**, la primera y la décima. Si inspeccionar
  fuera «volver a pulsar», soltar una pata sería imposible.
- La ficha de la pata se abre por **su sello** —un botón propio, alcanzable con
  el tabulador, con su `aria-expanded`—, con doble pulsación o manteniendo
  pulsado. Tres caminos, y ninguno le quita el sitio al conmutador.
- La ficha dice: qué es, cuántas entradas tiene, con qué patas cruza bien —lo
  dice el orden del anillo, no una lista escrita— y tres ejemplos.

## Los autores

Una sola cronología ascendente, de Ovidio a hoy, cortada por cabeceras de
siglo que se calculan del dato. Los nueve temas siguen existiendo y siguen
siendo el criterio bueno —agrupan problemas, no siglos ni escuelas— pero son
**un filtro**, no una puerta: la puerta es el tiempo, que cualquiera sabe leer.

Cada autor lleva su sprite. Primero, el emblema dibujado a mano de
`public/figures/<id>.svg`, 32×32 píxeles y seis tokens, que son lo mejor que
tiene este archivo. Cuando no hay dibujo —y con cientos de autores no lo
habrá— entra un **espectro**: busto de frente en una rejilla de 16×16, relleno
con ruido del PRNG sembrado con el identificador. Determinista, así que la
misma persona tiene siempre la misma cara de máquina; y con su marco de trazos,
porque es una ficha pendiente, no un avatar.

## El Atlas

El mapa es el contenido, así que se lleva el ancho entero de la columna y toda
la altura que quede de pantalla. Encima, una barra compacta —zoom, mundo, ir a,
buscar país, lente—. Dentro, en una esquina del mar, la leyenda de la rampa con
sus cortes. Debajo, **inmediatamente**, la ficha del país.

Abrir `/atlas/AUS` encuadra Australia: un mapa que enseña el mundo entero
cuando le han pedido un país no ha contestado a la pregunta.

## La barra de desplazamiento

Se ve. Está en `public/index.html`, fina y con los colores de la paleta: el
hilo es `--line` y al pasar por encima sube a `--dim`. No hay color nuevo.

Estaba escondida en las tres columnas, y **una columna que se puede recorrer
sin decirlo no se recorre**: nadie baja a lo que no sabe que está. Esconderla
no era sobriedad, era quitar la única señal de que hay más. La sobriedad es que
sea de un píxel y del color de los filetes.

## Lo que no se hace

Neón, glow, scanlines, gradientes, glassmorphism, tarjetas redondeadas
idénticas, sombras suaves bajo todo, flechas `→` pegadas al texto de los
botones, un segundo color de acento, iconos decorativos, emoji.

Y, desde esta revisión, tres más:

- **Una columna lateral que no se ha ganado el ancho.** Si el instrumento no se
  usa en esa pantalla, no está.
- **Una caja alrededor del artículo.** La ficha de entrada no es una tarjeta:
  es texto con aire.
- **Una ficha de lectura arrinconada.** Si la columna de lectura es más
  estrecha que el hueco, se centra en él. Nunca se pega al menú dejando medio
  metro de negro a la derecha.

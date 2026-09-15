# Diseño

La referencia no es una terminal de ciencia ficción. Es un catálogo razonado
de museo impreso en papel oscuro: una ficha por objeto, mucho margen, datos
pequeños y precisos abajo, y un solo objeto en pantalla a la vez.

Eso resuelve la tensión entre "oscuro" y "sobrio". Lo oscuro viene del
soporte; la sobriedad, de que hay una sola cosa en la página.

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

# Las biografías

Cuarenta y cuatro vidas, nueve temas, ningún retrato.

Sustituye al gabinete de siete salas. Las salas agrupaban por circunstancia
—quién se quedó ciego, quién tuvo un empleo administrativo, quién publicó
tarde—, y eso decía cosas de sus vidas y ninguna de sus ideas. Se leía como un
álbum de rarezas. Los temas agrupan por **el problema en el que cada uno se
metió**, que es lo que de verdad tiene que ver con el archivo.

## Qué lleva cada biografía

Cuatro cosas, y ninguna es un resumen de su obra:

| campo | qué es |
|---|---|
| `idea` | Algo que pensó, dicho de manera que no se pueda adivinar. |
| `note` | Un hecho verificable y poco citado: la anécdota. |
| `works` | Obras que se pueden abrir de verdad, con enlace comprobado. |
| `emblem` | Un objeto, dibujado en 32×32. Nunca su cara. |

`idea` no es una valoración. No «fue el padre del existencialismo», sino qué
sostuvo y por qué es raro. Si la idea se puede adivinar leyendo el nombre, no
sirve: busca otra.

`note` sigue la misma regla de antes. Si el dato es famoso, busca otro; si no
lo puedes verificar, la figura no entra.

## Los enlaces

**Una URL no se escribe de memoria.** Se busca en el catálogo de quien la
sirve, se pide, y solo entra si contesta y trae lo que se esperaba. Al escribir
estas cuarenta y cuatro, una URL de Gutenberg recordada «con seguridad»
devolvió una obra de Shakespeare: por eso se comprueban todas.

Las treinta y una que hay salen de Project Gutenberg, Internet Archive,
Wikisource, Arquivo Pessoa, el Euler Archive, Wikimedia Commons, la Tate y los
archivos de los propios colectivos. Las trece que faltan son de autores vivos o
recientes cuya obra no está disponible de forma abierta y estable: **la ficha
dice que no la hay**, que es más honesto que enlazar a una librería.

Cada obra declara `where` y `kind`, y la ficha los enseña antes de que nadie
pulse: un enlace que no dice adónde lleva es una trampa.

## Los emblemas

Un museo de filósofos en pixel art acaba siempre en treinta caras de señores
con barba, indistinguibles a 32×32. Cada figura se representa por **un objeto**:
Borges es un tigre, Kafka un formulario sellado, Euler un puente sin orilla,
Bourbaki una silla vacía con placa, Gödel un nudo que se muerde.

- 32×32, exportado a 128×128 con `image-rendering: pixelated`.
- Paleta de seis tokens. El acento, como mucho el 5% de los píxeles, y casi
  siempre uno o dos.
- Silueta primero: si no se reconoce en plano, ningún detalle lo salvará.
- Sin contorno negro, sin dithering, sin antialias, sin sombra.
- SVG de rectángulos de 1×1, uno por figura, en `public/figures/<id>.svg`.

El dibujo vive en `scripts/sprites.mjs` y no en el SVG a mano: así se corrige
una figura cambiando dos líneas. `npm run sprites` los reescribe.

**Se dibujan mirándolos.** Cuatro de los primeros cuarenta y cuatro había que
tirarlos: el nudo de Gödel parecía un reloj de pared —y había un reloj de pared
dos figuras más allá—, el guante de Deleuze parecía un peine, las dos sillas de
montar eran un borrón, y la torre sin ventanas de Foucault tenía una ventana.
Ninguno de los cuatro se ve mal en el código.

## Los temas

Las clasificaciones obvias —por siglo, por escuela, por nacionalidad— no están
y no van a estar. El criterio se muestra siempre junto al nombre, porque **el
criterio es el contenido**.

| Tema | Qué agrupa |
|---|---|
| El sistema que se mira | lo que le pasa a un sistema que se toma por objeto |
| La forma antes que la cosa | la relación como objeto, y la materia como decorado |
| El catálogo imposible | ordenar el mundo y ver crecer el índice |
| La firma prestada | escribir desde un nombre que no es el propio |
| El ojo que administra | el poder como procedimiento y como planta de edificio |
| La avería del cuerpo | el cuerpo que falla o se vuelve máquina, sin metáfora |
| El mapa de lo no pisado | exactitud sin experiencia |
| La hora del búho | el sueño, el duermevela y lo que se entiende tarde |
| La huella menor | el detalle que nadie vigila, leído como prueba |

**Una figura pertenece a un tema y a uno solo.** Con las salas, el solapamiento
era media gracia; aquí no, porque la sección se lee de arriba abajo como un
índice y una lista con repeticiones no se lee, se consulta. Si una vida cabe en
dos temas, gana aquel del que no se podría sacar.

## Cómo se conecta con el archivo

El campo `entries` de cada figura apunta a entradas, y la navegación va en los
dos sentidos. Un tema puede invocarse: `invocar desde este tema` recorta el
corpus a las entradas ligadas a sus figuras y se lo pasa al motor, que no se
entera de que las biografías existen.

Las URL viejas (`/gabinete`, `/gabinete/<sala>`) siguen entendiéndose y llevan
a `/biografias`: quien guardó un enlace no tiene por qué pagar un cambio de
idea de aquí dentro.

## Temas futuros

Sin implementar, anotados para no perderlos:

- Los que escribieron contra un libro concreto y lo mantuvieron vivo.
- Los que cambiaron de lengua y escribieron mejor en la segunda.
- Los que dejaron el método escrito y la obra sin terminar.

# El Atlas de la extinción

Un mapa mundial con un score de exposición por país frente a treinta y cuatro
maneras de que se acabe la especie. Vive en `/atlas`.

**Atlas de ficción especulativa. Las puntuaciones pertenecen al universo de la
obra y no describen el riesgo real de ningún país.** El aviso va impreso al pie
de la pantalla, no en una nota al margen, y no se quita.

## La regla que lo salva de ser un cartel

Los scores son ficción. Lo que no es ficción es de dónde salen:

1. Cada causa trae una **regla**: una base y unos factores con su peso.
2. Los factores se leen de **datos con procedencia** —Natural Earth: población,
   superficie, renta, latitud, piezas de costa— más un único dato externo, la
   lista de los nueve Estados con armas nucleares.
3. La ficha de cada país **enseña la cuenta entera**: «4 de base · por su renta
   +52 · por su industria +30 · por su densidad +4».

Ninguna puntuación está escrita a mano. Es la misma disciplina que el resto del
archivo: una pata se enciende sola al llegar a tres entradas, un vínculo existe
porque el grafo lo encuentra, y aquí un país arde porque su regla lo quema. Un
atlas que no puede explicar sus números es un cartel.

## Las tres decisiones que lo sostienen

**Robinson, no Mercator.** Este mapa habla de cuánta gente hay en cada sitio.
Mercator triplica Groenlandia y encoge África: una proyección que miente sobre
el tamaño miente sobre el argumento.

**El score general es el máximo, nunca la suma.** Las causas se excluyen entre
sí —no te extingues dos veces—, así que sumarlas daría un número sin
significado. El máximo dice lo único que se puede decir: por dónde llegaría
antes.

**Las causas uniformes quedan fuera del reparto.** El asteroide le toca igual a
todo el mundo, así que no distingue a nadie. Si entrara en el reparto, el mapa
entero diría «100» y dejaría de ser un mapa. Las diez uniformes se enseñan
aparte, como **el fondo** sobre el que ocurre el resto. Los informes de
investigación no habían visto este problema: proponían el máximo incluyendo las
uniformes, que es un mapa de un solo color.

## Dos reglas duras propias

- **Una causa que reparte tiene que repartir.** Entre el percentil 5 y el 95 de
  los países tiene que haber al menos veinticinco puntos de diferencia. Si no,
  esa causa pinta el mundo entero igual y no dice nada de nadie: `npm run
  validate` falla y el build no sigue. Dos reglas se escribieron mal y esta
  comprobación las cazó.
- **Lo que no tiene población no se puntúa.** Por debajo de diez mil habitantes
  —la Antártida, las Tierras Australes— el Atlas no mide nada, lo dice y deja el
  territorio en hueco. Pintarlo de un color cualquiera sería inventarse un dato.

## El calor

Cinco tramos, y **por cuantiles**. Con cortes redondos —35, 55, 75, 90— ciento
veinte países caían en el mismo tramo y el mapa salía de un solo color: los
scores se apilan donde se apilan, no donde uno querría. Repartiendo por
quintiles, cada tramo lleva una quinta parte del mundo. La escala se recalcula
con cada lente, así que la leyenda **enseña sus cortes**: una rampa sin sus
números es una mancha bonita.

La rampa va de la ceniza a la llama pasando por `--accent`, que es el tercer
tramo. `docs/DESIGN.md` prohíbe degradados y segundos colores, y ésta es una
excepción pedida expresamente y escrita en `CLAUDE.md`. Las condiciones: **no
hay color nuevo, hay uno estirado**, no sale de `/atlas`, y el frío de la
máquina —retículas, escuadras, barrido, cifras vivas— es del instrumento, nunca
del contenido.

## El instrumento

La lente y la leyenda viven en la columna de la derecha, que es donde la
consola pone el instrumento de lo que hay delante. Tres cosas que se decidieron
ahí y no son de adorno:

- **La lente es una lista, no una fila de fichas.** Son treinta y cuatro
  causas: en fila había que arrastrarlas de lado para llegar a las últimas, y
  una lente que esconde la mitad de sus posiciones no es una lente.
- **Va partida en dos, y la partición es el argumento del Atlas**: las que
  reparten distinguen a unos países de otros, las uniformes le tocan igual a
  todo el mundo. Ni el corte ni el orden se escriben a mano: salen de `uniform`.
- **El mapa y la leyenda sacan los cortes del mismo sitio** (`readWorld` en
  `ui/components/AtlasView.tsx`). Si cada uno calculara su escala, la leyenda
  mentiría en cuanto difirieran.

Y los gestos, que en un mapa a pantalla completa no son un detalle: **la rueda
es de la página**. Con ctrl o ⌘ —que es lo que manda también un pellizco en el
trackpad— amplía donde está el cursor, y para ampliar sin modificador están los
dos botones de la barra. Se quedaba con toda la rueda, y como el mapa ocupa
casi la pantalla el cursor estaba siempre encima: la sección no se podía bajar.
Por lo mismo, un arrastre vertical con el mapa en reposo es de la página; en
cuanto está ampliado, es suyo, porque entonces hay mundo fuera del cuadro.

El lienzo se mide con la columna **y** con lo que queda de pantalla. Antes solo
con la columna, así que en cualquier portátil el mapa salía más alto que la
ventana: un mapa que no se ve de una vez no es un mapa.

## Qué lleva cada causa

| campo | qué es |
|---|---|
| `premise` | Qué ocurre. Una frase. |
| `terminal` | Qué significa aquí extinguirse: biológica, cultural o de la conciencia. |
| `literary` | El texto del Atlas, de 60 a 140 palabras, como una entrada del archivo. |
| `rule` | Base y factores. Es pública: la pantalla la enseña. |
| `uniform` | Si le toca igual a todo el mundo, queda fuera del reparto. |
| `categories` | Patas del anillo con las que cruza. |
| `inspiration` | Obras reales, citadas como inspiración y **nunca como aval**. |

Los textos no son los de los informes de investigación. Aquellos traían fechas,
ciudades y cifras inventadas presentadas como sucesos —«en 2054», «el 11 de
noviembre»—, y este archivo no fabrica hechos ni siquiera dentro de su propia
ficción: lo que se cuenta es el mecanismo, no el parte de guerra.

## Los datos

`content/atlas/world.json` lo escribe `npm run atlas` desde Natural Earth
(admin 0, 1:110m, dominio público). Se simplifica con Douglas-Peucker a un
tercio de grado y dos decimales: de 10.642 puntos a 4.600, unos 100 KB, con un
error de alrededor de un kilómetro que a escala mundial no se ve.

De cada territorio se guardan la geometría y los atributos que las reglas leen.
La superficie y la insularidad **se calculan desde la propia geometría**, no se
copian de ninguna parte.

## Qué falta

- Las causas que nunca dominan en ningún país siguen siendo la mitad. No es un
  error —un atlas no obliga a que todo el mundo muera de algo distinto—, pero
  conviene revisar si alguna regla está de más.
- El informe de investigación proponía además una matriz de doce países piloto
  con scores escritos a mano. No se usó: escribir a mano lo que se puede
  calcular es exactamente lo que este Atlas evita.
- Falta enlazar cada causa con entradas concretas del archivo. Hoy solo declara
  con qué patas cruza.

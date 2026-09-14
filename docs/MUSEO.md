# El gabinete

Treinta figuras, siete salas, ningún retrato.

## La decisión importante: emblemas, no caras

Un museo de filósofos en pixel art acaba siempre en lo mismo: treinta caras de
señores con barba, en 32×32, indistinguibles entre sí y ninguna reconocible.
No funciona a esa resolución y además convierte el gabinete en un álbum de
cromos.

Cada figura se representa por **un objeto**, no por su cara. Borges es un tigre
rayado. Kafka es un formulario sellado. Euler es un puente sin orilla.
Wittgenstein es una escalera que se retira. Spinoza es una lente.

Tres ventajas. El objeto sí se lee a 32×32. Obliga a una decisión editorial
por figura, que es donde está el interés. Y convierte la sala en un gabinete de
curiosidades, que es lo que el artefacto dice ser.

El emblema de cada figura está en `content/figures.json`, campo `emblem`, ya
escrito como descripción visual para que se pueda dibujar sin interpretar.

## Especificación del sprite

- 32×32 px, exportado a 128×128 con `image-rendering: pixelated`.
- Paleta de seis valores tomados de los tokens: `--bg`, `--surface`, `--line`,
  `--dim`, `--text`, `--accent`. El acento aparece como mucho en un 5% de los
  píxeles, y muchos emblemas no lo usan.
- Silueta primero: el objeto tiene que reconocerse en negro plano antes de
  recibir un solo píxel de detalle.
- Sin contorno negro, sin dithering, sin antialias, sin sombra proyectada.
- Formato SVG con rectángulos de 1×1 en una grilla, no PNG: se versiona en git,
  se difierencia línea a línea y hereda los tokens de color automáticamente.
  Un archivo por figura en `public/figures/<id>.svg`.

Dibujarlos es trabajo manual y lento, y esa es la parte buena: treinta objetos
dibujados a mano valen más que trescientos generados. Empieza por seis.

## Las salas

Las clasificaciones obvias — por siglo, por escuela, por nacionalidad — no
están y no van a estar. Cada sala agrupa por una circunstancia que normalmente
no aparece en los índices, y el criterio se muestra siempre junto al nombre.

| Sala | Qué agrupa |
|---|---|
| Los que siguieron después de la vista | perdieron los ojos y no pararon |
| Los que pensaron en horario de oficina | tuvieron empleo administrativo real |
| El baúl | publicaron poco, tarde o nunca |
| El enemigo elegido | construyeron la obra contra una persona concreta |
| Los que firmaron con otro | heterónimos, seudónimos, autores inexistentes |
| Cartógrafos de lugares donde no estuvieron | exactitud sin experiencia |
| Los que empezaron en otra cosa | vinieron de un oficio técnico o manual |

Una figura pertenece a varias salas. Newton está en *el enemigo elegido* por
Leibniz y en *horario de oficina* por la Casa de la Moneda, y ese solapamiento
es la mitad de la gracia.

## Regla editorial

El campo `note` de cada figura contiene **un hecho verificable y poco citado**,
no una valoración de su obra. No "fue el padre del existencialismo", sino
"publicó bajo seudónimos que se reseñaban entre sí".

Si no puedes verificar el dato, la figura no entra. Si el dato es famoso, busca
otro: una figura cuya nota se pueda adivinar no aporta nada al gabinete.

## Cómo se conecta con el archivo

El gabinete no es una sección aislada. El campo `entries` de cada figura apunta
a entradas del archivo, y la navegación va en los dos sentidos: desde una
entrada se llega a la figura de su autor, y desde la figura se vuelve a todo lo
que haya aportado.

Una sala puede invocarse: `invocar desde esta sala` toma las entradas ligadas a
sus figuras y las pasa al motor como si fueran una pata más.

## Salas futuras

Sin implementar, anotadas para no perderlas:

- Los que destruyeron su obra a propósito.
- Los que fueron leídos primero en mala traducción y así influyeron.
- Los que murieron en el año en que empezaba lo suyo.
- Los que trabajaron de noche por obligación y no por estilo.

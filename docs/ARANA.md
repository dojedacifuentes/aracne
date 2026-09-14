# La araña de once patas

La metáfora no es decoración. Cada pieza del sistema es una pieza del animal,
y si algo no cabe en el animal, probablemente no hace falta.

```
                         ⊢   ◫
                      ∞           ⋔
                                       ◉
                   ♒        ●
                                       ⌗
                      ◐           §
                         ✕   ▣
```

| Animal | Sistema | Archivo |
|---|---|---|
| el cuerpo | el Aleph: la esfera que se pulsa | `app/page.tsx` |
| las once patas | las once categorías, botones en anillo | `content/categories.json` |
| apoyar patas | filtrar la invocación | `lib/oracle/invoke.ts` |
| la red | el grafo de relaciones entre entradas | `lib/drift/graph.ts` |
| un hilo | una deriva concreta | `buildDrift()` |
| la vibración | el hilo suena al apoyar la pata | `lib/aleph/tension.ts` |
| el peso | la esfera se descuelga hacia lo elegido | `alephState()` |
| la muda | cada versión del archivo en git | historial del repo |

## Por qué once

Las arañas tienen ocho patas. Once es un número que ningún animal tiene, y esa
es la primera anomalía del archivo: lo primero que ves ya está mal.

Además es impar, y eso tiene una consecuencia útil. En un anillo par, cada
categoría tiene su opuesta exacta y los cruces salen simétricos y previsibles.
Con once, ninguna pata tiene enfrente otra pata: tiene un hueco entre dos.
Todo cruce sale descentrado. El modo `dos mundos` aprovecha exactamente eso —
al pedir la antípoda de una pata, el sistema devuelve las dos que la flanquean
y deja que el desajuste haga el trabajo.

El orden del anillo tampoco es arbitrario: las patas vecinas son categorías
afines, así que la distancia angular entre dos patas es una medida de cuán
improbable es el cruce. Seleccionar patas contiguas produce resultados
razonables. Seleccionar patas lejanas es el punto del artefacto.

## El Aleph

En el centro hay una esfera. No es una luna, no es un planeta y no es un
cerebro digital. Es un punto que contiene todos los puntos, así que su render
tiene una regla: **no debe poder mirarse del todo**. Refracta el contenido del
archivo sin dejar leerlo.

Implementación: esfera de radio 1 con un material de transmisión y alta
distorsión, sobre un plano invisible que proyecta el número de entradas
actuales como textura ilegible. Sin estrellas, sin nebulosa, sin bloom, sin
anillo. Un solo foco en ángulo bajo, sombra larga.

Gira despacio y sin pausa, unos 0.06 rad/s. Al pasar el cursor, acelera un
poco. Al pulsar, se contrae un 8% y vuelve: el gesto de una pupila.

Fallbacks obligatorios: con `prefers-reduced-motion`, la esfera se queda
quieta y sigue siendo pulsable. Sin WebGL, se sustituye por un círculo SVG con
el mismo comportamiento. La invocación nunca puede depender de que el 3D
cargue.

## Movimiento: las patas tiran del Aleph

La esfera no está apoyada en el centro. Cuelga de la red, y cada pata que se
apoya tensa un hilo y tira de ella hacia su ángulo. La posición de reposo del
Aleph es la suma de las tensiones, así que **la esfera dice qué has
seleccionado sin que haya que leer una sola etiqueta**.

La física está en `lib/aleph/tension.ts`, separada del render, y se puede
probar sin montar una escena. El componente solo lee el resultado.

Lo que ocurre al pulsar una pata:

1. Un golpe instantáneo hacia su ángulo (`impulse`), que el muelle absorbe.
2. El hilo correspondiente aparece y vibra a su frecuencia, amortiguándose en
   unos 700 ms. Cada pata tiene su frecuencia, ordenada alrededor del anillo:
   patas vecinas suenan parecido, patas lejanas no. Es la misma información que
   da la distancia angular, por otro canal.
3. La esfera se desplaza a su nueva posición de reposo con muelle
   crítico-amortiguado. Rebasa un 2% y se queda quieta; no rebota.
4. La distorsión del material sube. Cada pata apoyada vuelve el Aleph un poco
   menos legible.

Al soltar una pata, el golpe es el contrario y más débil, el hilo se afloja y
desaparece.

### Números medidos

| Selección | Desplazamiento | Tensión | Distorsión |
|---|---|---|---|
| ninguna | centro | 0.00 | 0.30 |
| una pata | máximo, hacia ella | 1.00 | 0.34 |
| dos vecinas | casi máximo, entre las dos | 1.00 | 0.39 |
| dos casi opuestas | mínimo, pero nunca cero | 0.20 | 0.39 |
| tres dispersas | casi centrado | 0.18 | 0.43 |
| las once | centro exacto | 0.00 | 0.79 |

Las dos últimas filas son el corazón del asunto. En un anillo par, dos
categorías opuestas se cancelan y el Aleph vuelve al centro: el gesto se anula.
En once no hay opuestas, así que **ninguna selección parcial centra la
esfera** — siempre queda descolgada hacia algún lado, y ese lado es legible.

La única forma de devolver el Aleph al centro exacto es apoyar las once patas a
la vez. Y en ese momento es cuando menos se ve a través de él. Quererlo todo
deja la esfera perfectamente equilibrada y perfectamente opaca. No hay que
explicarlo en ninguna parte de la interfaz; está en la física y quien lo
encuentre, lo encuentra.

### Accesibilidad del movimiento

Con `prefers-reduced-motion`, el Aleph salta directamente a su posición de
reposo: sin muelle, sin golpe, sin giro. La posición sigue codificando la
selección, que es lo que importa; lo que desaparece es el recorrido.

Sin WebGL, el fallback SVG aplica exactamente el mismo desplazamiento con un
`transform: translate`. Un círculo que se descuelga sigue diciendo lo mismo
que una esfera que se descuelga.

## Las patas como interfaz

Las once patas rodean la esfera. Cada una es un `<button>` real, con su glifo y
su nombre, alcanzable por teclado en orden de anillo.

Estados:

- **retraída** — la categoría existe pero tiene menos de tres entradas. Se
  dibuja tenue y no se puede apoyar. El tooltip dice qué le falta.
- **en reposo** — disponible, sin apoyar.
- **apoyada** — seleccionada. La pata se alarga hacia la esfera y aparece un
  hilo entre ambas.

La forma del resultado depende de cuántas patas hay apoyadas: una entrada, una
arista o una constelación. Ninguna combinación está prohibida, y ninguna
garantiza el mismo resultado dos veces, porque la semilla cambia en cada
pulsación. Lo que sí garantiza es que la misma URL devuelva siempre lo mismo.

En móvil el anillo se convierte en una fila de once glifos bajo la esfera, con
scroll horizontal contenido y el nombre solo de la pata activa.

## El gabinete

El museo de figuras cuelga de la red, no es una sección aparte. Una figura se
alcanza desde cualquier entrada en la que aparezca su autor, y desde ella se
vuelve al archivo. Ver `docs/MUSEO.md`.

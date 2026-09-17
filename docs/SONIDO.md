# El sonido

El archivo suena desde la fase 19, y suena apagado: nace en silencio y se
enciende a mano con `[ sonido ]`, en la cabecera de la consola. Quien no lo
toque no oirá nunca nada.

## 1. Qué se oye, y de dónde sale cada cosa

Nada se eligió a oído. Las cinco voces salen de piezas que ya existían.

| Suceso | Qué es | De dónde sale su altura |
|---|---|---|
| **roce** | la mano se posa sobre el animal | ruido de banda ancha a 340 Hz y un golpe sordo a 72 Hz |
| **seda** | sostenido mientras se tira | de 52 a 98 Hz según lo lejos que se lleve el cuerpo |
| **chasquido** | la mano se levanta | 148 Hz, y sube con la prisa del gesto; sub a 43 Hz |
| **hilo** | una pata se apoya o se suelta | `threadFrequency(pata)` **subida cinco octavas** |
| **dictamen** | la invocación | tres parciales sacadas de la **semilla** con el PRNG del oráculo |

Las dos últimas son las que hacen que esto sea de Aracne y no un paquete de
efectos:

- **Cada pata tiene su nota porque ya tenía su frecuencia.**
  `lib/aleph/tension.ts` reparte de 5,5 a 12,5 Hz alrededor del anillo desde la
  fase 2, para que el hilo de cada pata vibre a la suya. Subir eso cinco
  octavas da de 176 a 400 Hz: se oye, sigue siendo grave, y **patas vecinas
  suenan parecido y lejanas no**. Es la misma información que da la distancia
  angular, por otro canal. Medido en el navegador: la pata 0 pica en 188 Hz y
  la 3 en 234 Hz, que son sus bins.
- **Cada invocación suena distinta, y siempre igual.** Las parciales del
  dictamen salen de `rngFromString('dictamen|' + semilla)`. La misma URL suena
  igual en cualquier máquina, hoy y dentro de un año; compartir una invocación
  es compartir su sonido. La regla 3 del proyecto —ni un `Math.random()`— vale
  también aquí, hasta para rellenar el búfer de ruido.

## 2. La voz

Las reglas de `CLAUDE.md` para el texto valen para el oído, y dicen lo mismo:

- **Ningún acorde de destino.** Las tres parciales del dictamen son
  *inarmónicas* a propósito, apartadas de los múltiplos enteros: metal
  golpeado, no un acorde. Un acorde sería una profecía, y aquí nada profetiza.
- **Nada de atmósfera.** No hay reverberación, ni pads, ni drones, ni un solo
  sonido que dure mientras no se toca nada. Medido: en reposo el bus da **cero
  exacto** de RMS.
- **Físico y cerca.** Lo que suena es quitina contra quitina, una seda que se
  tensa y un hilo que se suelta. Si hay miedo es el de tener algo vivo a dos
  centímetros, no el de una banda sonora.
- **Breve.** La cola más larga —el dictamen con las once patas— no llega a
  segundo y medio. El resto está por debajo del medio segundo.

Esto atiende la petición de «sonidos sombríos y de terror» por donde el
proyecto puede atenderla. Un archivo que se pone a gemir cuando lo abres no da
miedo: da vergüenza ajena, y a la tercera visita se apaga. Lo que inquieta de
verdad es que un objeto callado conteste cuando lo tocas, y conteste como
contestaría un cuerpo.

## 3. Ni un archivo de audio

Todo se fabrica en el momento con osciladores y ruido filtrado. **No hay
samples**, no hay dependencias nuevas, el bundle no crece un byte y no hay nada
que descargar, igual que no hay ni una imagen en los sellos ni un motor de
física de terceros.

El patrón viene de haber mirado `audio.js` de `estherliu-lab/momo-soft-play`
—ver `THIRD_PARTY_LICENSES.md`—, que demuestra que Web Audio basta para dar
respuesta física sin un solo archivo. De ahí no se copió nada: ni un nodo, ni
una constante, ni un sonido. Aquel proyecto suena a juguete blando; este suena
a bicho.

## 4. Arquitectura

```
ui/audio/
  audioConfig.ts      todas las cifras y los tipos. No importa Web Audio ni React
  audioScore.ts       PURO: de un suceso a sus voces. Probado en tests/sound.test.ts
  audioEngine.web.ts  los nodos: un solo AudioContext, que nace al encenderlo
  audioEngine.ts      en nativo no hay Web Audio: silencio
ui/hooks/useSound.ts  el conmutador, compartido sin proveedor, y recordado
```

El mismo reparto que la araña: las cifras en un sitio, la aritmética pura en
otro y probada sin navegador, y la plataforma aislada detrás de la resolución
`.web.ts` de Metro. Quien dispara los sucesos es quien los provoca: el gesto
sobre la araña (`useSpiderGrab.web.ts`), y la portada para el dictamen y los
hilos.

El `AudioContext` **no existe hasta que se enciende**. Un contexto creado sin
un gesto nace mudo, y uno creado sin permiso es de mala educación. Al apagar se
cierra —no se silencia: se cierra—, así que no queda nada consumiendo. Con la
pestaña oculta se suspende.

## 5. Accesibilidad y reducción de movimiento

- El conmutador es un botón de verdad, con tabulador, foco visible y
  `aria-pressed`. No dice `aria-expanded`, porque no expande nada: decirlo
  sería mentirle a quien navega con lector de pantalla.
- **Con `prefers-reduced-motion` el sonido no se apaga** —no es movimiento—,
  pero sí lo que parpadea: el temblor de amplitud se va a cero y las colas se
  cortan a menos de la mitad. Una modulación de ocho por segundo es un
  estroboscopio para el oído.
- El sonido es siempre una capa de más. Con él apagado la aplicación hace
  exactamente lo mismo; comprobado invocando en silencio.

## 6. Verificación (16 de septiembre de 2026)

`npm run validate`, `npm run typecheck`, `npm run lint`, `npm test` y
`npm run build` en verde. Trece pruebas nuevas en `tests/sound.test.ts`:
frecuencias dentro de lo que se oye, ganancias que no saturan, colas acotadas,
la nota de cada pata igual a su frecuencia de hilo, el dictamen reproducible
por semilla y distinto entre semillas, las parciales inarmónicas, la seda
monótona con el tirón, y sin movimiento ni temblor ni colas largas.

Y en el navegador, **midiendo el bus de audio de verdad** con un analizador
enchufado a la ganancia general (RMS de pico, con el maestro a 0,22):

| | RMS |
|---|---|
| en reposo | **0** |
| roce | 0,023 |
| seda, poco tirada | 0,024 |
| seda, muy tirada | 0,060 |
| chasquido | 0,059 |
| invocar | 0,038 |
| después de todo | **0** |
| invocar con el sonido apagado | **0** |

La primera versión del roce daba 0,0005 —estaba, pero no se oía—: el filtro de
banda a Q = 7 tiraba casi toda la energía del ruido y ochenta milisegundos no
daban tiempo a recuperarla. Se abrió la banda a Q = 1,8 y se le puso debajo el
golpe del cuerpo. Es la clase de cosa que solo aparece midiendo.

También comprobado: el conmutador recuerda su estado entre recargas
(`aracne.sonido` en el almacenamiento), al apagarlo el contexto pasa a
`closed`, y la pata 0 y la 3 pican en frecuencias distintas y en las suyas.

**No verificado todavía:** cómo suena en unos altavoces de portátil malos —el
sub de 43 Hz no existirá ahí, y el golpe del chasquido tendrá que sostenerlo
solo—; y el comportamiento en iOS, donde no hay escena 3D y el conmutador ni
aparece.

## 7. Pendiente

- **El roce podría depender de dónde se toca.** Hoy suena igual en el abdomen
  que en una pata. El rig ya sabe el punto de contacto: pasarlo movería el
  filtro. No se hizo porque la diferencia puede ser inaudible y hay que medirla
  antes de escribirla.
- **La tela y el atlas no suenan.** Tienen sucesos que podrían hacerlo —un hilo
  que se teje, un país que se enciende—, pero eso es otra fase y otra decisión.
- **Nada de música.** No hay ni habrá capa ambiental: ver 2.

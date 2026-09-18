# Prompt para la sesión siguiente

Cópialo entero en el chat nuevo. Está escrito para que quien lo reciba no tenga
que adivinar nada: dice dónde está el proyecto, qué se comprueba antes de
tocar, qué hay pendiente y qué no se toca.

---

```
Retomo Aracne, un archivo/oráculo con once categorías como patas de una araña,
más un gabinete de biografías y un atlas de extinciones.

Repo: https://github.com/dojedacifuentes/aracne.git, rama main.
Local: C:\Users\Asus\Desktop\aracne
Online: https://aracne-mu.vercel.app

Lee docs/HANDOFF.md entero antes de tocar nada, y después CLAUDE.md, que manda
sobre todo.

Arranque: npm install → npm run validate (obligatorio, escribe el índice que
typecheck y test necesitan) → npm run web.

LO PRIMERO, ANTES DE ESCRIBIR CÓDIGO: comprueba que Vercel sirve el último
commit de main. No compares el nombre del paquete: el build de Vercel y el de
esta máquina nunca salen byte a byte iguales. Compáralos por contenido, como
dice docs/HANDOFF.md §6.1: partidos por «;», el único tramo distinto tiene que
ser el polyfill de consola. Si no coincide, dímelo y lo arreglo yo en el panel
de Vercel (Deployments → Redeploy); no empujes commits vacíos para forzarlo.

Ojo con el HANDOFF: desde la fase 17 la pantalla ya no es la consola de tres
columnas. El instrumento vive en cajones que se abren al pedirlo (§5), las
secciones son /invocaciones y /autores, y la araña se agarra (fase 18) y suena
(fase 19, docs/SONIDO.md).

Qué hay pendiente, por orden (desarrollado en docs/HANDOFF.md §6):

0. Hay una rama, desarrollo/entidad-aracnida (fase 20), con la entidad que
   camina detrás del cursor y con el hilo que va de una entrada a otra cuando
   el archivo declara el vínculo. Está entera: dos commits de código, dos de
   documentación, 227 pruebas en verde y el build hecho. Lo único que le falta
   es que yo decida si va a main, que pide aprobar la cuarta excepción de
   CLAUDE.md, y verla con un ratón de verdad (HANDOFF §6.3, docs/ENTIDAD.md).
   No la fusiones sin preguntarme.
1. Contenido: las 13 biografías sin obra enlazada, las entradas ligadas mal
   repartidas entre temas (La hora del búho tiene una sola) y vincular causas
   del Atlas con entradas concretas. La cola editorial está vacía: toda entrada
   nueva sin fuente comprobada entra como unverified.
2. Del gesto de la fase 18: probarlo en un teléfono real, y que Enter y Espacio
   activen el botón de la araña.
3. HTML prerenderizado para buscadores, y SITE_URL sin definir en Vercel.

Cómo trabajas, que está en CLAUDE.md y lo resumo: una cosa por sesión; antes de
escribir código dime en cinco líneas qué archivos vas a tocar y por qué; al
terminar, npm run validate, npm test, npm run build y un resumen de lo que
cambió y lo que quedó pendiente. Commits: `fase(N): qué cambió` para código y
`entrada: título` para contenido, uno por entrada. No empujes a GitHub sin que
yo lo pida.

Tres cosas que este proyecto hace distinto y conviene que entiendas antes:

- Nada de lo que se puede calcular se escribe a mano. Una categoría se enciende
  sola al llegar a tres entradas; un vínculo existe porque el grafo lo
  encuentra; el score de un país sale de una regla declarada y la ficha enseña
  la cuenta entera.
- Nada inventado. Si una fuente no se puede verificar: unverified y sources: [].
  Una URL no se escribe de memoria, se pide y se comprueba: una URL de
  Gutenberg recordada «con seguridad» devolvió una obra de Shakespeare, y la
  ficha del Prado que daba el buscador para Las hilanderas era la de una
  fototipia. Y se comprueba cada frase, no solo la referencia: al revisar la
  cola editorial, las referencias eran buenas y los errores estaban en lo que
  la prosa añadía.
- La doctrina visual de docs/DESIGN.md tiene excepciones, pedidas expresamente
  y escritas en CLAUDE.md: el flujo vivo de /tela, la rampa de calor del Atlas
  y el frío del instrumento (machine en todo lo que se toca, nunca en lo que se
  lee). En la rama de la fase 20 hay una cuarta, la entidad, que solo vale allí
  hasta que yo la apruebe. No las borres por doctrina.

Y dos trampas que ya costaron una sesión cada una:

- Si al mover o borrar un componente la app deja de montar con «X is not
  defined» o «Unable to resolve module», no es el código: es la caché de Metro.
  Para el servidor de desarrollo y arráncalo de nuevo.
- El panel de vista previa escala la ventana y no repinta el canvas a demanda:
  una captura de pantalla no prueba nada. Cuando haya duda, mide el DOM.
```

---

## Cómo se usó esto la última vez

El prompt de la sesión del 15 de septiembre se escribió antes de la fase 16 y
no se regeneró al cerrarla. Mandaba a hacer el panel de la derecha, que ya
estaba hecho, y a comparar hashes de paquete, que ya se sabía que no sirven. Se
detectó leyendo el historial antes de tocar nada, pero conviene no depender de
eso: **este archivo se reescribe al cerrar cada sesión**, en el mismo commit que
el handoff.

Volvió a pasar: las fases 17, 18 y 19 no lo tocaron, y el 18 de septiembre
seguía mandando a construir un panel de la derecha que la fase 17 había
quitado. Se corrigió junto con el HANDOFF.

La sesión que cerró la fase 20 sí lo tocó, en el mismo commit que el handoff.
De paso se vio otra manera de quedarse atrás: el pendiente 0 decía que la rama
estaba a medias cuando ya estaba entera, y las excepciones seguían siendo tres
cuando en esa rama eran cuatro. **Lo que cambia de estado hay que contarlo
aquí, no solo en el HANDOFF.**

Lo que sí conviene repetir siempre son las tres reglas duras y las dos trampas,
porque son lo que un modelo nuevo rompe primero.

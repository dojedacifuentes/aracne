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

Qué hay pendiente, por orden (desarrollado en docs/HANDOFF.md §6):

1. Contenido: las 13 biografías sin obra enlazada, y las entradas ligadas mal
   repartidas entre temas (La hora del búho tiene una sola).
2. Una decisión que es mía: delyra-0034, la única unverified que queda. Su
   taxonomía no está en ninguna fuente abierta y la entrada no atribuye nada a
   nadie. Pregúntame antes de cambiarle el estado.
3. Las biografías no tienen instrumento propio en el panel de la derecha.
4. HTML prerenderizado para buscadores, y SITE_URL sin definir en Vercel.

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
- La doctrina visual de docs/DESIGN.md tiene tres excepciones pedidas
  expresamente: el flujo vivo de /tela y la rampa de calor del Atlas, escritas
  en CLAUDE.md, y la consola de tres columnas, que de momento solo está escrita
  en docs/HANDOFF.md §4. No las borres por doctrina.

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

Lo que sí conviene repetir siempre son las tres reglas duras y las dos trampas,
porque son lo que un modelo nuevo rompe primero.

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

LO PRIMERO, ANTES DE ESCRIBIR CÓDIGO: comprueba si Vercel ya desplegó el último
commit. Al cerrar la sesión anterior, main estaba en 78b7b59 y producción seguía
sirviendo f908546: el gancho de GitHub → Vercel no disparó, aunque el CI daba
verde. Míralo así:

    curl -s "https://aracne-mu.vercel.app/?t=$(date +%s)" | grep -o 'index-[a-f0-9]*\.js'

y compáralo con el paquete de dist/ tras un npm run build. Si no coincide, dímelo
y lo arreglo yo en el panel de Vercel (Deployments → Redeploy); no empujes
commits vacíos para forzarlo sin preguntarme.

Qué hay pendiente, por orden (está desarrollado en docs/HANDOFF.md §6):

1. El panel de la derecha no cambia según la sección: siempre enseña las once
   patas. Debería enseñar el instrumento de lo que hay delante — en el Atlas la
   lente y la leyenda, en la tela las pieles y los mapas, en el archivo las
   facetas. Shell ya recibe `aside` como propiedad.
2. Contenido: las 15 entradas unverified (cada una dice en captureNote qué hay
   que comprobar), las 13 biografías sin obra enlazada, y las entradas ligadas
   mal repartidas entre temas.
3. HTML prerenderizado para buscadores, y SITE_URL sin definir en Vercel.

Cómo trabajas, que está en CLAUDE.md y lo resumo: una cosa por sesión; antes de
escribir código dime en cinco líneas qué archivos vas a tocar y por qué; al
terminar, npm run validate, npm test, npm run build y un resumen de lo que
cambió y lo que quedó pendiente. Commits: `fase(N): qué cambió`. No empujes a
GitHub sin que yo lo pida.

Tres cosas que este proyecto hace distinto y conviene que entiendas antes:

- Nada de lo que se puede calcular se escribe a mano. Una categoría se enciende
  sola al llegar a tres entradas; un vínculo existe porque el grafo lo
  encuentra; el score de un país sale de una regla declarada y la ficha enseña
  la cuenta entera.
- Nada inventado. Si una fuente no se puede verificar: unverified y sources: [].
  Una URL no se escribe de memoria, se pide y se comprueba: al redactar las
  obras de las biografías, una URL de Gutenberg recordada «con seguridad»
  devolvió una obra de Shakespeare.
- La doctrina visual de docs/DESIGN.md tiene exactamente tres excepciones, todas
  pedidas expresamente y escritas en CLAUDE.md: el flujo vivo de /tela, la rampa
  de calor del Atlas y la consola de tres columnas. No las borres por doctrina.

Y dos trampas que ya costaron una sesión cada una:

- Si al mover o borrar un componente la app deja de montar con «X is not
  defined» o «Unable to resolve module», no es el código: es la caché de Metro.
  Para el servidor de desarrollo y arráncalo de nuevo.
- El panel de vista previa escala la ventana y no repinta el canvas a demanda:
  una captura de pantalla no prueba nada. Cuando haya duda, mide el DOM.
```

---

## Cómo se usó esto la última vez

El prompt de la sesión anterior traía además un resumen de qué contenía el
handoff, sección por sección. No hace falta: si el handoff está al día, basta
con mandar a leerlo. Lo que sí conviene repetir siempre son las tres reglas
duras y las dos trampas, porque son lo que un modelo nuevo rompe primero.

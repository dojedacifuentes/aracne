# Licencias de terceros

## Geometría y datos del Atlas de la extinción

`content/atlas/world.json`

- **Obra original:** Natural Earth, *admin 0 – countries*, escala 1:110m.
- **Fuente:** https://github.com/nvkelso/natural-earth-vector — archivo
  `geojson/ne_110m_admin_0_countries.geojson`, descargado por
  `scripts/atlas.mjs`.
- **Licencia:** dominio público. Natural Earth no exige atribución; se cita
  igualmente, y el propio archivo generado la lleva dentro en su campo
  `source`.
- **Cambios:** se simplificaron los contornos con Douglas-Peucker (tolerancia
  0,32°, dos decimales), se descartaron los anillos menores de 0,7° salvo el
  mayor de cada territorio, y se conservaron solo los atributos que el Atlas
  usa para calcular: nombre en español, continente, subregión, población,
  PIB, grupo económico, grupo de renta y punto de etiqueta.

Los scores que el Atlas dibuja encima son ficción declarada y no proceden de
Natural Earth: se calculan con las reglas de `content/atlas/causes.json`.

## Modelo 3D de la araña

`public/models/spider/huntsman-spider.glb`

- **Obra original:** «CC0 アシダカグモ 🕷️ Huntsman Spider, H. venatoria», de
  ffish.asia / floraZia.com — https://sketchfab.com/ffishAsia-and-floraZia
- **Fuente:** https://sketchfab.com/3d-models/cc0-huntsman-spider-h-venatoria-c92eb0f93c5c4463919c64390ee82c37,
  obtenido a través del repositorio `code4fukui/vr-spiders`. Los metadatos del
  propio GLB repiten autor, título, fuente y licencia.
- **Licencia:** CC0 1.0 Universal (dominio público) —
  http://creativecommons.org/publicdomain/zero/1.0/
- **Cambios:** se quitó el cubo auxiliar de Sketchfab, se unieron y
  simplificaron las mallas, y se comprimieron geometría (meshopt) y textura
  (WebP) con `scripts/optimize-spider.mjs`.

CC0 no exige atribución. Se mantiene por cortesía y para que el origen del
modelo se pueda rastrear.

## code4fukui/vr-spiders

https://github.com/code4fukui/vr-spiders

Referencia de implementación para la carga del modelo, su clonado y la seda
procedural (`makeSpiderSilk`). No se copió el proyecto ni se usa en runtime:
las ideas se reescribieron para esta arquitectura.

```
MIT License

Copyright (c) 2025 Taisuke Fukuno

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## estherliu-lab/momo-soft-play

https://github.com/estherliu-lab/momo-soft-play

Referencia de **ingeniería de interacción** para el gesto de coger, arrastrar y
soltar la araña (`docs/ARANA-3D.md`, 9). Lo que se estudió fueron tres patrones
generales, no su implementación: separar estado, destino y velocidad dejando un
muelle en medio; medir la velocidad del puntero acotando el intervalo entre
muestras; y amortiguar más con `prefers-reduced-motion` en vez de apagar la
interacción. Los tres se reescribieron desde cero sobre `SpiderRig`,
`spiderMotion` y `lib/aleph/tension`, que ya existían.

**El repositorio no declara licencia**, así que no se puede suponer permiso de
reutilización. En consecuencia, y a propósito, aquí no hay:

- ningún archivo, función, fragmento ni shader copiado;
- ninguna constante suya: las de `GRIP` se eligieron midiendo esta araña;
- ningún asset, imagen, sonido, texto, color ni tipografía;
- nada de su personaje, su interfaz ni su juego;
- ninguna dependencia: no está en `package.json`, no se clonó y no se sirve.

Se cita porque el origen de una idea se cuenta, aunque la idea no se pueda
poseer y el código no se haya tocado.

## tarot de la conjetura

https://github.com/dojedacifuentes/tarot-de-la-conjetura — proyecto propio del
que se hereda la arquitectura (configuración de Expo, patrón de escena 3D con
fallback, scripts de assets). Ver `docs/TAROT.md`.

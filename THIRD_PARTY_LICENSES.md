# Licencias de terceros

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

## tarot de la conjetura

https://github.com/dojedacifuentes/tarot-de-la-conjetura — proyecto propio del
que se hereda la arquitectura (configuración de Expo, patrón de escena 3D con
fallback, scripts de assets). Ver `docs/TAROT.md`.

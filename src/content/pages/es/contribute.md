---
title: Cómo contribuir
description: Añade la guía de un mapa escribiendo un archivo Markdown.
---

Archivo 115 es de código abierto y bilingüe. Cada guía es **un archivo Markdown por idioma**: `src/content/maps/es/<juego>/<mapa>.md` y su traducción en `src/content/maps/en/<juego>/<mapa>.md`. No necesitas tocar código: escribe en Markdown normal y usa unas pocas "directivas" para los bloques especiales (spoilers, expedientes de enemigos, narración…). El sitio se encarga del diseño.

## Las reglas del archivo

1. **Sin spoilers por defecto.** Lo que el juego te enseña en los primeros minutos puede ir a la vista. Jefes, giros de la historia y pasos de las misiones secretas van siempre dentro de un spoiler.
2. **Nada inventado.** Cada dato (ubicación, coste, ronda, paso de una misión, hecho de la historia) tiene que poder comprobarse en la Call of Duty Wiki. Los consejos y opiniones se escriben como consejos, nunca como datos.
3. **Contexto antes que instrucciones.** Explica qué está pasando y por qué, no solo qué botón pulsar.
4. **Imágenes reales y con fuente.** Se añaden en `scripts/images.manifest.json` y se descargan con `npm run images`, que guarda de dónde sale cada una.
5. **Nada de enlaces a vídeos.** La idea es que la página se baste sola.
6. **Los dos idiomas a la vez.** Cada archivo en español tiene su gemelo en inglés, con los mismos spoilers y los mismos identificadores. Los tests lo comprueban.

## Directivas disponibles

| Directiva | Para qué sirve |
| --- | --- |
| `:::spoiler[Título]{level="boss"}` | Bloque bloqueado con el ojo. Niveles: `lore`, `boss`, `enemy`, `quest`, `ee`, `weapon`. |
| `:::dossier[Nombre]{img="…" threat="4" kind="boss"}` | Ficha de enemigo o jefe, bloqueada por defecto. Añade `open` si no es spoiler. Usa `teaser` para una pista visible y `codename` para el nombre en clave. |
| `:::narration` | Texto que solo dice el narrador por voz (no se ve en pantalla). Úsalo para transiciones y para resumir tablas: el narrador se las salta. |
| `:::callout{type="tip"}` | Nota destacada: `tip`, `warn`, `info` o `lore`. |
| `:::steps` | Envuelve una lista numerada para mostrarla como pasos de misión. |
| `:::grid` + `:::card[Título]{img="…"}` | Rejilla de tarjetas. |
| `:::quote{by="Personaje"}` | Cita de un personaje. |
| `::figure{src="…" caption="…"}` | Imagen con pie de foto y crédito automático. Añade `wide` para que no se incline. |

Un bloque se cierra con `:::`. Si anidas bloques (un spoiler dentro de otro), el de fuera necesita más dos puntos: `::::spoiler` … `::::`.

Para que el progreso de spoilers se conserve al cambiar de idioma, pon el mismo `id` a cada spoiler en las dos versiones, por ejemplo `{id="the-ending"}`.

## Pasos para añadir un mapa

Antes de empezar necesitas Git y Node.js 24.15 o más reciente. Haz un *fork* del [repositorio en GitHub](https://github.com/ArielGS/e-115-archive), clónalo y ejecuta `npm install`: funciona igual en Windows, macOS y Linux. La preparación completa, el flujo de trabajo con pull requests y las soluciones a problemas comunes están en el archivo `CONTRIBUTING.md` del repositorio.

1. Copia `docs/map-template.md` a `src/content/maps/es/bo3/mi-mapa.md` y a `src/content/maps/en/bo3/mi-mapa.md` (o cambia el `status` de un mapa existente de `stub` a `guide` en los dos idiomas).
2. Rellena el bloque inicial (título, fecha, lugar, color…).
3. Escribe la guía con títulos `##` para cada sección. **No pongas títulos `##` dentro de un spoiler**: el índice lateral los mostraría.
4. Ejecuta `npm run test:unit`. Comprueba que las imágenes existen y tienen crédito, que los dos idiomas coinciden y que el formato es correcto.
5. Ejecuta `npm run dev`, revisa la página en los dos idiomas y abre un pull request con los enlaces a la wiki que usaste.

# Jaraíz RPG

Juego pixel art para el móvil ambientado en **Jaraíz de la Vera** (Cáceres), con los amigos del pueblo como personajes. Se juega en el navegador: solo HTML, CSS y JavaScript, sin servidor.

## Jugar
Abre la web de GitHub Pages del repo desde el móvil. Cruceta para andar, **A** para hablar/leer, **B** (mantener) para correr.
En ordenador: flechas o WASD, Espacio/Enter para hablar, Shift para correr.
El progreso se guarda solo en el navegador.

## Añadir o cambiar amigos
Todo está en [`data/personajes.json`](data/personajes.json): sitio donde están, aspecto (piel, pelo, peinado, ropa, gafas, barba…) y sus frases. No hay que tocar código. La guía de campos está al principio del propio fichero.

## Estructura
- `js/maps.js`: el pueblo y los interiores
- `js/tiles.js`: dibujo de las casillas
- `js/sprites.js`: generador de personajes
- `js/game.js`: motor (movimiento, diálogos, puertas, controles táctiles)

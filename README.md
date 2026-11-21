# 🚀 Explorador del Sistema Solar

Web 3D para estudiar el tema del Sistema Solar de **5.º de Primaria** (currículo LOMLOE, España).
Se pilota una nave espacial por un Sistema Solar realista y hay dos modos de juego:

- **🔭 Exploración**: vuelo libre. Al acercarte a un astro aparece su ficha con los datos reales, un recuadro **«📌 Para el examen»**, una curiosidad y lectura en voz alta. Cada astro visitado pone un sello en el *pasaporte espacial*.
- **🚀 Aventura**: 14 misiones más un **examen final**. Vuelas hasta el objetivo y respondes preguntas como las de los exámenes del cole: test, verdadero/falso con corrección, ordenar, unir con flechas, completar huecos, clasificar, identificar planetas o fases de la Luna, definiciones… y **preguntas de vuelo**, que se responden pilotando hasta el astro correcto. Tienes 3 escudos por misión, puntos y rangos. El examen final se puntúa sobre 10 (Insuficiente → Sobresaliente). Las preguntas falladas se repiten más a menudo.

Incluye también **lecciones interactivas** (rotación y día/noche, traslación y estaciones, años bisiestos, fases de la Luna, eclipses, capas de la Tierra, tamaños y distancias reales, el Universo) y una **chuleta de estudio imprimible**.

## Arrancar con Docker (recomendado)

```bash
docker compose up -d --build
```

Abre **http://localhost:8080** en el navegador (mejor en ordenador, con teclado y ratón).

Para pararlo:

```bash
docker compose down
```

## Modo desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # comprueba los datos del temario y el banco de preguntas
npm run build      # genera la versión final en dist/
```

## Controles

| Tecla | Acción |
|---|---|
| `W` / `S` | Acelerar / frenar |
| `A` `D` (o `←` `→`) | Girar |
| `↑` / `↓` | Subir / bajar el morro |
| `Shift` | Turbo |
| `Espacio` | Freno total |
| `M` | Destinos (hipersalto) |
| `E` | Elegir astro en las preguntas de vuelo |
| `P` / `L` / `H` | Pasaporte / Lecciones / Ayuda |
| Ratón | Arrastrar para mirar · rueda para acercar la cámara |

## Adaptar el contenido al libro de texto

Todo el temario está en `src/data/`:

- `bodies.js`: datos de cada astro (fichas, «Para el examen», curiosidades).
- `concepts.js`: conceptos del tema (Universo, movimientos de la Tierra, Luna…).
- `questions.js`: banco de preguntas (más de 170).

Después de editarlos, ejecuta `npm run validate`.

## Créditos

- Texturas: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0), basadas en imágenes de la NASA. Se descargan con `npm run textures` (requiere `curl` e ImageMagick).
- Datos: NASA Planetary Fact Sheet (redondeados para Primaria).
- 3D: [three.js](https://threejs.org).

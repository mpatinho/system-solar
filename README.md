# 🚀 Explorador del Sistema Solar

Web 3D para estudiar el tema del Sistema Solar de **5.º de Primaria** (currículo LOMLOE, España).
Se pilota una nave espacial por un Sistema Solar realista, **con teclado y ratón o con mando de Xbox**, y hay dos modos de juego:

- **🔭 Exploración**: vuelo libre. Al acercarte a un astro aparece su ficha con los datos reales, un recuadro **«📌 Para el examen»**, una curiosidad y lectura en voz alta. Cada astro visitado pone un sello en el *pasaporte espacial*.
- **🚀 Aventura**: 14 misiones más un **examen final**. Vuelas hasta el objetivo y respondes preguntas como las de los exámenes del cole: test, verdadero/falso con corrección, ordenar, unir con flechas, completar huecos, clasificar, identificar planetas o fases de la Luna, definiciones… y **preguntas de vuelo**, que se responden pilotando hasta el astro correcto. Tienes 3 escudos por misión, puntos y rangos. El examen final se puntúa sobre 10 (Insuficiente → Sobresaliente). Las preguntas falladas se repiten más a menudo.

Además tiene **🔥 reto del día** (8 preguntas centradas en lo que más falla, con racha de días y cuenta atrás hasta la fecha del examen), **🛠️ hangar** para personalizar la nave (modelos, pinturas, llamas y estelas que se desbloquean jugando) y **🕹️ minijuegos** («Lluvia de respuestas» y «Carrera de planetas»).

Incluye también **lecciones interactivas** (rotación y día/noche, traslación y estaciones, años bisiestos, fases de la Luna, eclipses, capas de la Tierra, tamaños y distancias reales, el Universo) y una **chuleta de estudio imprimible**.

## Arrancar con Docker en este ordenador

```bash
docker compose up -d --build
```

Abre **http://localhost:8080** (mejor en ordenador). Para pararlo: `docker compose down`.

**Atajos con `make`** (escribe `make` para ver la lista): `make up`, `make down`, `make dev`, `make build`, `make deploy`, `make server-status`, `make server-logs`, `make server-restart`, `make ca`…

## Desplegar en un servidor de casa (para jugar desde otro ordenador)

El navegador solo deja usar el **mando** en páginas seguras: `https://` o `localhost`. Por eso el contenedor sirve también **HTTPS** (puerto 8444) con un certificado propio, y cualquier `http://` que llegue desde otro equipo se redirige solo a `https://`.

1. Crea `.env.deploy` en la raíz del proyecto (no se sube a git):

   ```bash
   DEPLOY_HOST=servidor.local                 # o usuario@servidor
   DEPLOY_DIR=sistema-solar                   # carpeta en el servidor
   CERT_HOSTS=servidor.local,192.168.1.10     # nombres e IP con los que abrirás la web
   ```

2. Despliega (copia el proyecto por SSH y lo arranca con Docker en el servidor) con `make deploy` o:

   ```bash
   npm run deploy
   ```

3. En el ordenador del niño, abre `https://servidor.local:8444` y crea un acceso directo.

**Quitar el aviso de «conexión no privada» (una sola vez):** descarga el certificado de la CA local desde `http://servidor.local:8080/ca.crt` e instálalo:

- **Windows**: doble clic → *Instalar certificado* → *Equipo local* → *Colocar todos los certificados en el siguiente almacén* → **Entidades de certificación raíz de confianza**. Después, reinicia el navegador.
- **macOS**: doble clic (se abre *Acceso a Llaveros*) → en *Sistema*, abre el certificado → *Confiar* → **Confiar siempre**.
- **Linux (Chrome)**: `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n sistema-solar -i sistema-solar-ca.crt`

Sin instalarlo también funciona: el navegador avisa y hay que pulsar *Configuración avanzada → Continuar*.

El certificado y la CA se guardan en un volumen de Docker, así que no cambian al actualizar la web. Si el servidor cambia de IP, actualiza `CERT_HOSTS` y vuelve a desplegar. Es mejor reservarle una IP fija en el router, o usar siempre su nombre `.local`.

Puertos: `HTTP_PORT` (8080) y `HTTPS_PORT` (8444); se pueden cambiar en `.env.deploy`.

## Instalar como app

Con la web abierta por `https://` (con el certificado de la CA instalado) o en `localhost`, en ⚙️ Opciones aparece **«📲 Instalar en este ordenador»** (o el icono de instalar en la barra de direcciones de Chrome/Edge). Queda un icono en el escritorio, se abre en su propia ventana y, después de abrirla una vez, **funciona aunque el servidor esté apagado**. Cuando se despliega una versión nueva, se actualiza sola al volver a abrirla.

Sin el certificado instalado, Chrome no deja instalarla (el resto del juego funciona igual).

## Fecha del examen y reto del día

En ⚙️ Opciones → **📅 Fecha del examen**: el menú principal y el reto del día muestran cuántos días faltan. El reto del día da puntos extra la primera vez de cada día y mantiene una racha; algunas cosas del hangar se desbloquean con la racha.

## Controles

| Teclado y ratón | Mando de Xbox | Acción |
|---|---|---|
| `W` / `S` | `RT` / `LT` | Acelerar / frenar y marcha atrás |
| `A` `D` (o `←` `→`) | Stick izquierdo | Girar |
| `↑` / `↓` | Stick izquierdo | Subir / bajar el morro |
| `Shift` | `RB` | Turbo |
| `Espacio` | `LB` | Freno total |
| `M` | `Y` | Destinos (hipersalto) |
| `E` | `A` | Elegir astro en las preguntas de vuelo |
| `Esc` | `B` | Cerrar la ficha o la ventana |
| — | `X` | Usar la ficha del astro (escuchar, lecciones) |
| `P` / `L` / `H` | `☰` (pausa) / `⧉` (ayuda) | Pasaporte, lecciones, ayuda… |
| Ratón (arrastrar / rueda) | Stick derecho / cruceta ↑↓ | Mirar alrededor / acercar la cámara |

En los menús, con el mando: la cruceta mueve el foco, `A` pulsa, `B` vuelve y `LB`/`RB` cambian de pestaña. En las preguntas de «completar huecos» aparece un **banco de palabras** para no tener que escribir.

## Calidad gráfica

En ⚙️ Opciones la calidad está en **Automática**: mide las imágenes por segundo y baja la resolución interna o el nivel (Alta → Media → Baja) si el ordenador no llega. En pantallas 4K/6K la escena se dibuja como mucho a 2560×1440 y el navegador la escala. Con «Mostrar FPS» se ve la fluidez real.

Si la web avisa de que el navegador dibuja «sin la tarjeta gráfica», activa la *aceleración por hardware* en la configuración del navegador.

## Modo desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run validate   # comprueba los datos del temario y el banco de preguntas
npm run build      # genera la versión final en dist/
```

## Adaptar el contenido al libro de texto

Todo el temario está en `src/data/`:

- `bodies.js`: datos de cada astro (fichas, «Para el examen», curiosidades).
- `concepts.js`: conceptos del tema (Universo, movimientos de la Tierra, Luna…).
- `questions.js`: banco de preguntas (más de 170). Las de huecos llevan `bank` con palabras de distracción.

Después de editarlos, ejecuta `npm run validate`.

## Créditos

- Texturas: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0), basadas en imágenes de la NASA. Se descargan con `npm run textures` (requiere `curl` e ImageMagick).
- Datos: NASA Planetary Fact Sheet (redondeados para Primaria).
- 3D: [three.js](https://threejs.org).

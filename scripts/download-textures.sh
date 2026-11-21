#!/bin/sh
# Descarga las texturas de Solar System Scope (CC BY 4.0, https://www.solarsystemscope.com/textures/)
# Requiere curl e ImageMagick (para convertir los mapas TIFF de la Tierra a JPG).
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/textures"
mkdir -p "$DIR"
BASE="https://www.solarsystemscope.com/textures/download"
FILES="2k_sun.jpg 2k_mercury.jpg 2k_venus_surface.jpg 2k_venus_atmosphere.jpg 2k_earth_daymap.jpg 2k_earth_nightmap.jpg 2k_earth_clouds.jpg 2k_earth_normal_map.tif 2k_earth_specular_map.tif 2k_moon.jpg 2k_mars.jpg 2k_jupiter.jpg 2k_saturn.jpg 2k_saturn_ring_alpha.png 2k_uranus.jpg 2k_neptune.jpg 8k_stars_milky_way.jpg 2k_ceres_fictional.jpg"
for f in $FILES; do
  jpg="${f%.tif}.jpg"
  if [ -s "$DIR/$f" ] || [ -s "$DIR/$jpg" ]; then echo "ya existe $f"; continue; fi
  echo "descargando $f"
  curl -sfL -o "$DIR/$f" "$BASE/$f" || echo "AVISO: no se pudo descargar $f"
done
cd "$DIR"
for t in *.tif; do
  [ -e "$t" ] || continue
  magick "$t" -quality 90 "${t%.tif}.jpg" && rm "$t"
done
[ -s 4k_stars_milky_way.jpg ] || magick 8k_stars_milky_way.jpg -resize 50% -quality 88 4k_stars_milky_way.jpg
echo "Texturas en $DIR"

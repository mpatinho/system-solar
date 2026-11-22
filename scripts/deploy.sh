#!/usr/bin/env bash
# Despliega la web en un servidor de casa con Docker, por SSH.
# Configuración en .env.deploy (no se sube a git), por ejemplo:
#   DEPLOY_HOST=servidor.local                  # usuario@host si no es el mismo usuario
#   DEPLOY_DIR=sistema-solar                    # carpeta en el servidor (relativa a su $HOME)
#   CERT_HOSTS=servidor.local,192.168.1.10      # nombres e IP con los que se abrirá la web
#   HTTP_PORT=8080                              # opcional
#   HTTPS_PORT=8444                             # opcional
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.deploy ]; then
  echo "Falta .env.deploy con DEPLOY_HOST, DEPLOY_DIR y CERT_HOSTS (mira el principio de scripts/deploy.sh)." >&2
  exit 1
fi
set -a
. ./.env.deploy
set +a
: "${DEPLOY_HOST:?Falta DEPLOY_HOST en .env.deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-sistema-solar}"
HTTP_PORT="${HTTP_PORT:-8080}"
HTTPS_PORT="${HTTPS_PORT:-8444}"
CERT_HOSTS="${CERT_HOSTS:-}"
WEB_HOST="${CERT_HOSTS%%,*}"
WEB_HOST="${WEB_HOST:-${DEPLOY_HOST#*@}}"

echo "→ Comprobando los datos del temario"
npm run -s validate

echo "→ Copiando el proyecto a $DEPLOY_HOST:$DEPLOY_DIR"
ssh "$DEPLOY_HOST" "mkdir -p '$DEPLOY_DIR'"
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude '.env*' --exclude .claude --exclude '*.log' \
  ./ "$DEPLOY_HOST:$DEPLOY_DIR/"
printf 'HTTP_PORT=%s\nHTTPS_PORT=%s\nCERT_HOSTS=%s\n' "$HTTP_PORT" "$HTTPS_PORT" "$CERT_HOSTS" | ssh "$DEPLOY_HOST" "cat > '$DEPLOY_DIR/.env'"

echo "→ Construyendo y arrancando el contenedor en el servidor"
ssh "$DEPLOY_HOST" "cd '$DEPLOY_DIR' && docker compose up -d --build"

echo "→ Comprobando"
sleep 3
code=$(curl -sk -o /dev/null -w '%{http_code}' "https://$WEB_HOST:$HTTPS_PORT/" || true)
if [ "$code" = "200" ]; then
  echo "✓ Listo: https://$WEB_HOST:$HTTPS_PORT"
  echo "  Certificado para instalar en el ordenador del niño: http://$WEB_HOST:$HTTP_PORT/ca.crt"
else
  echo "⚠️ La web no responde por https://$WEB_HOST:$HTTPS_PORT (código $code). Revisa: ssh $DEPLOY_HOST 'docker logs sistema-solar'" >&2
  exit 1
fi

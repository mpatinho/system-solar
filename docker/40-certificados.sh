#!/bin/sh
# Crea (una sola vez) una CA local y el certificado HTTPS del servidor.
# Se guardan en el volumen /etc/nginx/certs, así que sobreviven a las reconstrucciones.
# CERT_HOSTS: nombres e IP por los que se abre la web, separados por comas (p. ej. «servidor.local,192.168.1.10»).
set -eu
DIR=/etc/nginx/certs
mkdir -p "$DIR"
cd "$DIR"

SAN=""
ALL="localhost,127.0.0.1${CERT_HOSTS:+,$CERT_HOSTS}"
OLDIFS=$IFS
IFS=','
for h in $ALL; do
  h=$(echo "$h" | tr -d ' ')
  [ -z "$h" ] && continue
  if echo "$h" | grep -Eq '^[0-9.]+$|:'; then entry="IP:$h"; else entry="DNS:$h"; fi
  case ",$SAN," in *",$entry,"*) ;; *) SAN="${SAN:+$SAN,}$entry" ;; esac
done
IFS=$OLDIFS
CN=$(echo "${CERT_HOSTS:-localhost}" | cut -d, -f1 | tr -d ' ')

if [ ! -s ca.key ] || [ ! -s ca.crt ]; then
  echo "certificados: creando la CA local"
  openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 \
    -keyout ca.key -out ca.crt -subj "/CN=Explorador del Sistema Solar (CA local)" \
    -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null
  rm -f server.crt
fi

if [ ! -s server.crt ] || [ ! -s server.key ] || [ "$(cat hosts.txt 2>/dev/null)" != "$SAN" ] \
  || ! openssl x509 -checkend 2592000 -noout -in server.crt >/dev/null 2>&1; then
  echo "certificados: creando el certificado del servidor para $SAN"
  openssl req -newkey rsa:2048 -nodes -sha256 -keyout server.key -out server.csr -subj "/CN=$CN" 2>/dev/null
  printf 'subjectAltName=%s\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n' "$SAN" > server.ext
  openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 825 -sha256 -extfile server.ext -out server.crt 2>/dev/null
  echo "$SAN" > hosts.txt
  rm -f server.csr server.ext
fi

chmod 600 ca.key server.key
chmod 644 ca.crt server.crt

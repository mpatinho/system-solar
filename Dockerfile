# Etapa 1: compilar la web con Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run validate && npm run build

# Etapa 2: servirla con nginx (HTTP en localhost y HTTPS para la red de casa)
FROM nginx:1.27-alpine
RUN apk add --no-cache openssl && rm -f /etc/nginx/conf.d/default.conf
ENV HTTPS_PORT=8444 CERT_HOSTS=""
COPY docker/web.conf /etc/nginx/web.conf
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker/40-certificados.sh /docker-entrypoint.d/40-certificados.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80 443

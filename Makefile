# Atajos para el Explorador del Sistema Solar. Escribe «make» para ver la lista.
# Los comandos del servidor usan .env.deploy (DEPLOY_HOST, DEPLOY_DIR, CERT_HOSTS…).

-include .env.deploy

DEPLOY_DIR ?= sistema-solar
HTTP_PORT ?= 8080
HTTPS_PORT ?= 8444
comma := ,
WEB_HOST := $(firstword $(subst $(comma), ,$(CERT_HOSTS)) $(lastword $(subst @, ,$(DEPLOY_HOST))))
SSH := ssh $(DEPLOY_HOST)

.DEFAULT_GOAL := help
.PHONY: help install dev validate build textures clean up down restart logs ps deploy server-status server-logs server-restart server-down ca

help: ## Muestra esta ayuda
	@awk 'BEGIN {FS = ":.*## "; print "Uso: make <objetivo>\n"} /^[a-z-]+:.*## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ---------- Desarrollo ----------
install: ## Instala las dependencias (npm ci)
	npm ci

dev: ## Servidor de desarrollo en http://localhost:5173
	npm run dev

validate: ## Comprueba los datos del temario y el banco de preguntas
	npm run validate

build: validate ## Genera la versión final en dist/
	npm run build

textures: ## Descarga las texturas (curl + ImageMagick)
	npm run textures

clean: ## Borra dist/
	rm -rf dist

# ---------- Docker en este ordenador ----------
up: ## Construye y arranca la web en Docker (http://localhost:8080)
	docker compose up -d --build
	@echo "→ http://localhost:$(HTTP_PORT)"

down: ## Para el contenedor local
	docker compose down

restart: ## Reinicia el contenedor local
	docker compose restart

logs: ## Muestra los registros del contenedor local
	docker compose logs -f

ps: ## Estado del contenedor local
	docker compose ps

# ---------- Servidor de casa ----------
deploy: ## Despliega en el servidor de .env.deploy (por SSH + Docker)
	npm run deploy

server-status: _need-host ## Estado del contenedor en el servidor
	$(SSH) "cd '$(DEPLOY_DIR)' && docker compose ps"

server-logs: _need-host ## Registros del contenedor en el servidor
	$(SSH) "cd '$(DEPLOY_DIR)' && docker compose logs -f --tail 100"

server-restart: _need-host ## Reinicia el contenedor en el servidor
	$(SSH) "cd '$(DEPLOY_DIR)' && docker compose restart"

server-down: _need-host ## Para el contenedor en el servidor
	$(SSH) "cd '$(DEPLOY_DIR)' && docker compose down"

ca: _need-host ## Descarga el certificado de la CA local (para instalarlo en el ordenador del niño)
	curl -fsS -o sistema-solar-ca.crt "http://$(WEB_HOST):$(HTTP_PORT)/ca.crt"
	@echo "→ sistema-solar-ca.crt (instrucciones en el README). La web: https://$(WEB_HOST):$(HTTPS_PORT)"

_need-host:
	@test -n "$(DEPLOY_HOST)" || { echo "Falta DEPLOY_HOST: crea .env.deploy (mira el README)." >&2; exit 1; }

SERVICES = $(shell docker compose config --services | sed 's/^/DNS:/' | paste -sd ',' -)

all: start

setup: shared/certs secrets/jwt

# Generate self-signed SSL certificate, will then be copied to all services so they can communicate using HTTPS with caddy.
# "DNS:servicename,..." ($(SERVICES)) is required for https communication between caddy and services.
shared/certs:
	@mkdir -p shared/certs
	@openssl req -x509 -newkey rsa:2048 -nodes -keyout shared/certs/key.pem -out shared/certs/cert.pem -days 365 -subj "/CN=internal" -addext "subjectAltName=DNS:localhost,$(SERVICES)" 2>/dev/null
	@echo "--> New certs has been generated"

secrets/jwt:
	@mkdir -p secrets/jwt
	@openssl genrsa -out secrets/jwt/private.pem 2048
	@openssl rsa -in secrets/jwt/private.pem -pubout -out secrets/jwt/public.pem
	@echo "--> New JWT keys has been generated"

# This will use docker-compose.dev.yml on top of docker-compose.yml, which defines the Dockerfile stage to development and mount volumes for live code reloading.
dev: setup
# Install node_modules in all services because they are all part of the workspace defined in root package.json
	if [ ! -f node_modules ]; then npm i; fi
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

start: setup
	docker compose up --build

clean:
	docker compose down
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

fclean: clean
	docker compose down -v --remove-orphans
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
	docker system prune -af --volumes
	git clean -fdX

.PHONY: setup dev start clean fclean

SERVICES = $(shell docker compose config --services | sed 's/^/DNS:/' | paste -sd ',' -)
HOSTNAME = $(shell hostname | head -c6)

all: start

setup: secrets/certs/cert.pem secrets/jwt/private.pem

# Generate self-signed SSL certificate, will then be copied to all services so they can communicate using HTTPS with caddy.
# "DNS:servicename,..." ($(SERVICES)) is required for https communication between caddy and services.
secrets/certs/cert.pem:
	@mkdir -p secrets/certs
	@if [ -f secrets/certs/.hostname ] && [ "$$(cat secrets/certs/.hostname)" != "$(HOSTNAME)" ]; then \
		echo "--> Hostname changed, regenerating certificates..."; \
		rm -f secrets/certs/key.pem secrets/certs/cert.pem; \
	fi
	@openssl req -x509 -newkey rsa:2048 -nodes -keyout secrets/certs/key.pem -out secrets/certs/cert.pem -days 365 -subj "/CN=internal" -addext "subjectAltName=DNS:localhost,DNS:$(HOSTNAME),$(SERVICES)" 2>/dev/null
	@echo "$(HOSTNAME)" > secrets/certs/.hostname
	@echo "--> New certs has been generated"

secrets/jwt/private.pem:
	@mkdir -p secrets/jwt
	@openssl genrsa -out secrets/jwt/private.pem 2048
	@openssl rsa -in secrets/jwt/private.pem -pubout -out secrets/jwt/public.pem 2>/dev/null
	@echo "--> New JWT keys has been generated"

# Install node_modules in all services because they are all part of the workspace defined in root package.json
node_modules:
	npm i

dev: node_modules setup
# Note: HOSTNAME=$(hostname | head -c6) is only for 42 computers, head -c6 is because hostname of 42 pcs are z3r4p1.42lyon.fr and we only need z3r4p1
# Use docker-compose.dev.yml on top of docker-compose.yml, which defines the Dockerfile stage to development and mount volumes for live code reloading.
	HOSTNAME=$(HOSTNAME) docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
	echo $(HOSTNAME)

start: setup
# Note: HOSTNAME=$(hostname | head -c6) is only for 42 computers, head -c6 is because hostname of 42 pcs are z3r4p1.42lyon.fr and we only need z3r4p1
	HOSTNAME=$(HOSTNAME) docker compose up --build

clean:
	docker compose down
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down

fclean: clean
	docker compose down -v --remove-orphans --rmi all
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans --rmi all
	git clean -fdX

.PHONY: all setup dev start clean fclean

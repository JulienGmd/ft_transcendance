SERVICES = $(shell docker compose config --services | sed 's/^/DNS:/' | paste -sd ',' -)
HOSTNAME = $(shell hostname | head -c6)

all: start

setup: secrets/jwt/private.pem

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

.PHONY: all setup dev start clean fclean node_modules conf

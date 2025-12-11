all: start

setup:
# Install node_modules in all services because they are all part of the workspace defined in root package.json
	if [ ! -f node_modules ]; then \
		npm i --workspaces; \
	fi
# Generate self-signed SSL certificate, will then be copied to all services so they can communicate using HTTPS with caddy.
# "DNS:servicename,..." ($${SERVICES}) is required for https communication between caddy and services.
	if [ ! -d certs ]; then \
		mkdir -p certs; \
		SERVICES=$$(docker compose config --services | sed 's/^/DNS:/' | paste -sd ',' -); \
		openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=internal" -addext "subjectAltName=DNS:localhost,$${SERVICES}"; \
	fi

# This will use docker-compose.dev.yml on top of docker-compose.yml, which defines the Dockerfile stage to development and mount volumes for live code reloading.
dev: setup
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

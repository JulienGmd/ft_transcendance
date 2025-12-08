all: start

setup:
	if [ ! -f node_modules ]; then \
		npm ci; \
	fi
# Generate self-signed SSL certificate, will then be copied to all services so they can communicate with HTTPS with caddy.
	if [ ! -f certs/cert.pem ]; then \
		mkdir -p certs; \
		SERVICES=$$(docker compose config --services | sed 's/^/DNS:/' | paste -sd ',' -); \
		openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=internal" -addext "subjectAltName=DNS:localhost,$${SERVICES}"; \
	fi

# This will use docker-compose.dev.yml on top of docker-compose.yml, which defines the Dockerfile stage to development and mount volumes for live code reloading.
dev: setup
	@echo "Cleaning auth database..."
	@docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d user-management 2>/dev/null || true
	@docker compose exec -T user-management rm -f /app/auth.db 2>/dev/null || true
	@docker compose down 2>/dev/null || true
	@echo "Starting services..."
	clear && docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --remove-orphans

start: setup
	docker compose up --build

# Stop and remove containers, networks, volumes, and orphaned containers
# Remove build artifacts and dependencies
clean:
	docker compose down --volumes --remove-orphans
# TODO checker sur les pc 42 si ca fonctionne sans sudo, run `id` et voir si uid=1000 et gid=1000 (requis avec la config actuelle pour que ca corresponde a l'user node dans les Dockerfiles)
	rm -rf */*/dist
	rm -rf node_modules
	rm -rf */*/node_modules
	rm -rf ./certs

# Remove all unused Docker objects (containers, networks, images, build cache) and volumes
fclean: clean
	docker system prune -af --volumes

.PHONY: setup dev start clean fclean

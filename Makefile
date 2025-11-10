setup:
	npm ci

# This will use docker-compose.dev.yml on top of docker-compose.yml, which defines the Dockerfile stage to development and mount volumes for live code reloading.
dev:
	clear && docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

start:
	docker compose up --build

# Stop and remove containers, networks, volumes, and orphaned containers
# Remove build artifacts and dependencies
clean:
	docker compose down --volumes --remove-orphans
# TODO when docker create a dir, the local user doesn't have permissions to delete it.
# 	-> In each Dockerfile, create a user with the same UID/GID as the host user and run as that user.
	rm -rf */*/dist
	rm -rf */*/node_modules

# Remove all unused Docker objects (containers, networks, images, build cache) and volumes
fclean: clean
	docker system prune -af --volumes

.PHONY: setup dev start clean fclean

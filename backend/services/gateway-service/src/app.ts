import Fastify, { type FastifyInstance } from "fastify";
import { env } from "@config/environment.js";

export const createApp = async (): Promise<FastifyInstance> => {
	const app = Fastify({
		logger:
			env.NODE_ENV === "development"
				? {
					level: env.LOG_LEVEL,
					transport: {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "HH:MM:ss Z",
							ignore: "pid,hostname",
						},
					},
				}
				: { level: env.LOG_LEVEL },
	});

	// Plugins de sécurité
	await app.register(import("@fastify/helmet"));
	await app.register(import("@fastify/cors"), {
		origin: env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
		credentials: true,
	});
	await app.register(import("@fastify/rate-limit"), {
		max: env.RATE_LIMIT_MAX,
		timeWindow: env.RATE_LIMIT_WINDOW,
	});

	// Plugin HTTP Proxy
	await app.register(import("@fastify/http-proxy"));

	// Routes de proxy vers les services
	app.register(async function (fastify) {
		// Auth Service
		await fastify.register(import("@fastify/http-proxy"), {
			upstream: env.SERVICES.AUTH_SERVICE_URL,
			prefix: "/api/auth",
			rewritePrefix: "/api/auth",
		});

		// User Service
		await fastify.register(import("@fastify/http-proxy"), {
			upstream: env.SERVICES.USER_SERVICE_URL,
			prefix: "/api/users",
			rewritePrefix: "/api/users",
		});

		// Game Service
		await fastify.register(import("@fastify/http-proxy"), {
			upstream: env.SERVICES.GAME_SERVICE_URL,
			prefix: "/api/games",
			rewritePrefix: "/api/games",
		});

		// Chat Service
		await fastify.register(import("@fastify/http-proxy"), {
			upstream: env.SERVICES.CHAT_SERVICE_URL,
			prefix: "/api/chat",
			rewritePrefix: "/api/chat",
		});
	});

	// Health check
	app.get("/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		message: "API Gateway en pleine forme ! 🔥",
		service: "api-gateway",
		version: "1.0.0",
		environment: env.NODE_ENV,
		services: {
			auth: env.SERVICES.AUTH_SERVICE_URL,
			users: env.SERVICES.USER_SERVICE_URL,
			games: env.SERVICES.GAME_SERVICE_URL,
			chat: env.SERVICES.CHAT_SERVICE_URL,
		},
		modules: {
			fastify: "✅ Module Framework Backend",
			httpProxy: "✅ Module HTTP Proxy",
		},
	}));

	return app;
};

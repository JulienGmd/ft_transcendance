import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { env } from "@config/environment.js";
import { connect } from "nats";

export const createApp = async (): Promise<FastifyInstance> => {

	const nc = await connect({ servers: env.NATS_URL, name: "gateway-service" })
		.then((nc) => {
			console.log(`🔔 Connecté à NATS à ${env.NATS_URL}`);
			return nc;
		})
		.catch((err) => {
			console.error("❌ Erreur de connexion à NATS:", err);
			process.exit(1);
		});

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

	// Plugins de sécurité (requis par le sujet ft_transcendence)
	await app.register(import("@fastify/helmet"));

	await app.register(import("@fastify/cors"), {
		origin: env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
		credentials: true,
	});

	await app.register(import("@fastify/rate-limit"), {
		max: 100,
		timeWindow: "1 minute",
	});

	// await app.register(import("@fastify/websocket"));
	// await app.register(import("@routes/auth.js"), { prefix: "/api/auth" });
	// await app.register(import("@routes/users.js"), { prefix: "/api/users" });
	// await app.register(import("@routes/games.js"), { prefix: "/api/games" });
	// await app.register(import("@routes/tournaments.js"), { prefix: "/api/tournaments" });

	// Health check
	app.get("/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		message: "API Gateway en pleine forme ! 🔥",
		service: "api-gateway",
		version: "1.0.0",
		environment: env.NODE_ENV,
		modules: {
			fastify: "✅ Module Framework Backend",
			microservices: "✅ Module Microservices Architecture",
		},
	}));

	return app;
};

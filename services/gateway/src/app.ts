import Fastify, { type FastifyInstance } from "fastify";
import { env } from "@config/environment";
import { connect, type NatsConnection, StringCodec } from "nats";

declare module "fastify" {
	interface FastifyInstance {
		nats: {
			nc: NatsConnection;
			publish: (subject: string, data: object) => void;
			request: <T = any>(
				subject: string,
				data: object,
				timeout?: number
			) => Promise<T>;
		};
	}
}

export const createApp = async (): Promise<FastifyInstance> => {

	const nc = await connect({ servers: env.NATS_URL, name: "gateway-service" })
		.then((nc) => {
			console.log(`🔔 Connected to NATS at ${env.NATS_URL} test`);
			return nc;
		})
		.catch((err) => {
			console.log(`❌ error trying connect ${env.NATS_URL}: `, err);
			process.exit(1);
		});

	const codec = StringCodec();

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

	// Security plugins
	await app.register(import("@fastify/helmet"));
	await app.register(import("@fastify/cors"), {
		origin: env.NODE_ENV === "development" ? true : env.FRONTEND_URL,
		credentials: true,
	});
	await app.register(import("@fastify/rate-limit"), {
		max: 100,
		timeWindow: "1 minute",
	});

	// Expose NATS utils
	app.decorate("nats", {
		nc,
		publish: (subject: string, data: object) => {
			nc.publish(subject, codec.encode(JSON.stringify(data)));
		},
		request: async <T = any>(subject: string, data: object, timeout = 2000) => {
			const msg = await nc.request(
				subject,
				codec.encode(JSON.stringify(data)),
				{ timeout }
			);
			return JSON.parse(codec.decode(msg.data)) as T;
		},
	});

	// Routes
	await app.register(import("./routes/auth.routes"), { prefix: "/api" });

	// Health check
	app.get("/health", async () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		message: "API Gateway is running perfectly! 🔥",
		service: "api-gateway",
		version: "1.0.0",
		environment: env.NODE_ENV,
		modules: {
			fastify: "✅ Backend Framework Module",
			microservices: "✅ Microservices Architecture Module",
		},
	}));

	app.addHook("onClose", async () => {
		await nc.close();
		console.log("🔔 NATS connection closed");
	});

	return app;
};

import { createApp } from "./app.js";
import { env } from "@config/environment";

const start = async (): Promise<void> => {
	try {
		const app = await createApp();

		await app.listen({
			port: env.PORT,
			host: env.HOST,
		});

		app.log.info(`🚀 API Gateway started on http://${env.HOST}:${env.PORT}`);
		app.log.info("🎯 Ready to receive traffic!");
	} catch (err) {
		console.error("❌ Startup error:", err);
		process.exit(1);
	}
};

const gracefulShutdown = (signal: string) => {
	console.log(`🔔 Signal ${signal} received, shutting down...`);
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start().catch((err) => {
	console.error("💥 Critical error:", err);
	process.exit(1);
});

import { createApp } from "./app.js";
import { env } from "@config/environment";

const start = async (): Promise<void> => {
	try {
		const app = await createApp();

		await app.listen({
			port: env.PORT,
			host: env.HOST,
		});

		app.log.info(`🚀 API Gateway démarré sur http://${env.HOST}:${env.PORT}`);
		app.log.info("🎯 Prêt à recevoir du trafic !");
	} catch (err) {
		console.error("❌ Erreur au démarrage:", err);
		process.exit(1);
	}
};

const gracefulShutdown = (signal: string) => {
	console.log(`🔔 Signal ${signal} reçu, arrêt en cours...`);
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

start().catch((err) => {
	console.error("💥 Erreur critique:", err);
	process.exit(1);
});

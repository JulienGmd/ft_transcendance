import type { FastifyInstance } from "fastify";
// TODO ERROR TS2307: Cannot find module '../shared/auth.types' or its corresponding type declarations.
import type { AuthLoginRequest, AuthResponse, AuthRegisterRequest } from '../shared/auth.types';

export default async function authRoutes(app: FastifyInstance) {
	app.post("/auth/login", async (req, reply) => {
		const { email, password } = req.body as AuthLoginRequest;


		const result = await app.nats.request<AuthResponse>("auth.login", { email, password });

		if (result.error) return reply.code(401).send(result);
		return reply.send(result);
	});

	app.post("/auth/register", async (req, reply) => {
		const { email, password, username } = req.body as AuthRegisterRequest;

		// Fire & Forget (publish un événement)
		app.nats.publish("auth.user.registered", { email, password, username });

		return reply.code(202).send({
			status: "accepted",
			message: "Inscription en cours...",
		});
	});
}

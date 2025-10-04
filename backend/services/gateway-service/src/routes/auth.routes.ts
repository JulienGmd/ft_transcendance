import type { FastifyInstance } from "fastify";
import { topics } from "@messaging/topics"
import type {
	AuthLoginRequest,
	AuthRegisterRequest,
	AuthResponse,
} from "@shared-types/auth.types";

export default async function authRoutes(app: FastifyInstance) {
	app.post("/auth/login", async (req, reply) => {
		const { email, password } = req.body as AuthLoginRequest;

		const result = await app.nats.request<AuthResponse>(topics.AUTH.LOGIN, {
			email,
			password,
		});

		if (result.error) return reply.code(401).send(result);
		return reply.send(result);
	});

	app.post("/auth/register", async (req, reply) => {
		const { email, password, username } = req.body as AuthRegisterRequest;

		// Fire & Forget (publish un événement)
		app.nats.publish(topics.AUTH.REGISTER, { email, password, username });

		return reply.code(202).send({
			status: "accepted",
			message: "Inscription en cours...",
		});
	});
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { topics } from "@messaging/topics"
import type {
	AuthLoginRequest,
	AuthRegisterRequest,
	AuthGoogleRequest,
	AuthGoogleCallbackRequest,
	Auth2FASetupRequest,
	Auth2FAEnableRequest,
	Auth2FAVerifyRequest,
	Auth2FASMSSendRequest,
	Auth2FASMSVerifyRequest,
	Auth2FAEmailSendRequest,
	Auth2FAEmailVerifyRequest,
	AuthTokenRefreshRequest,
	AuthLogoutRequest,
	AuthResponse,
	Auth2FASetupResponse,
	Auth2FAEnableResponse,
	Auth2FAVerifyResponse,
	Auth2FASMSSendResponse,
	Auth2FASMSVerifyResponse,
	Auth2FAEmailSendResponse,
	Auth2FAEmailVerifyResponse,
	AuthTokenRefreshResponse,
	AuthLogoutResponse,
	AuthGoogleCallbackResponse,
} from "@shared-types/auth.types";

export default async function authRoutes(app: FastifyInstance) {
	app.post("/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
		const { email, password } = req.body as AuthLoginRequest;

		const result = await app.nats.request<AuthResponse>(topics.AUTH.LOGIN, {
			email,
			password,
		});

		if (result.error) return reply.code(401).send(result);
		return reply.send(result);
	});

	app.post("/auth/register", async (req: FastifyRequest, reply: FastifyReply) => {
		const { email, password, username } = req.body as AuthRegisterRequest;

		const result = await app.nats.request<AuthResponse>(topics.AUTH.REGISTER, {
			email,
			password,
			username,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/google", async (req: FastifyRequest, reply: FastifyReply) => {
		const { id, email } = req.body as AuthGoogleRequest;

		const result = await app.nats.request<AuthResponse>(topics.AUTH.GOOGLE_AUTH, {
			id,
			email,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.get("/auth/google/callback", async (req: FastifyRequest, reply: FastifyReply) => {
		const { code } = req.query as AuthGoogleCallbackRequest;

		const result = await app.nats.request<AuthGoogleCallbackResponse>(topics.AUTH.GOOGLE_CALLBACK, {
			code,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/setup", async (req: FastifyRequest, reply: FastifyReply) => {
		const { email } = req.body as Auth2FASetupRequest;

		const result = await app.nats.request<Auth2FASetupResponse>(topics.AUTH._2FA_SETUP, {
			email,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/enable", async (req: FastifyRequest, reply: FastifyReply) => {
		const { userId, secret, token } = req.body as Auth2FAEnableRequest;

		const result = await app.nats.request<Auth2FAEnableResponse>(topics.AUTH._2FA_ENABLE, {
			userId,
			secret,
			token,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/verify", async (req: FastifyRequest, reply: FastifyReply) => {
		const { userId, token } = req.body as Auth2FAVerifyRequest;

		const result = await app.nats.request<Auth2FAVerifyResponse>(topics.AUTH._2FA_VERIFY, {
			userId,
			token,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/sms/send", async (req: FastifyRequest, reply: FastifyReply) => {
		const { phone } = req.body as Auth2FASMSSendRequest;

		const result = await app.nats.request<Auth2FASMSSendResponse>(topics.AUTH._2FA_SMS_SEND, {
			phone,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/sms/verify", async (req: FastifyRequest, reply: FastifyReply) => {
		const { phone, code } = req.body as Auth2FASMSVerifyRequest;

		const result = await app.nats.request<Auth2FASMSVerifyResponse>(topics.AUTH._2FA_SMS_VERIFY, {
			phone,
			code,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/email/send", async (req: FastifyRequest, reply: FastifyReply) => {
		const { email } = req.body as Auth2FAEmailSendRequest;

		const result = await app.nats.request<Auth2FAEmailSendResponse>(topics.AUTH._2FA_EMAIL_SEND, {
			email,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/2fa/email/verify", async (req: FastifyRequest, reply: FastifyReply) => {
		const { email, code } = req.body as Auth2FAEmailVerifyRequest;

		const result = await app.nats.request<Auth2FAEmailVerifyResponse>(topics.AUTH._2FA_EMAIL_VERIFY, {
			email,
			code,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});

	app.post("/auth/token/refresh", async (req: FastifyRequest, reply: FastifyReply) => {
		const { refreshToken } = req.body as AuthTokenRefreshRequest;

		const result = await app.nats.request<AuthTokenRefreshResponse>(topics.AUTH.REFRESH_TOKEN, {
			refreshToken,
		});

		if (result.error) return reply.code(401).send(result);
		return reply.send(result);
	});

	app.post("/auth/logout", async (req: FastifyRequest, reply: FastifyReply) => {
		const { refreshToken } = req.body as AuthLogoutRequest;

		const result = await app.nats.request<AuthLogoutResponse>(topics.AUTH.LOGOUT, {
			refreshToken,
		});

		if (result.error) return reply.code(400).send(result);
		return reply.send(result);
	});
}

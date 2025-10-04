export interface Environment {
	PORT: number;
	HOST: string;
	NODE_ENV: "development" | "production" | "test";
	JWT_SECRET: string;
	JWT_EXPIRES_IN: string;
	RATE_LIMIT_MAX: number;
	RATE_LIMIT_WINDOW: number;
	LOG_LEVEL: string;
	CORS_ORIGINS: string[];
	FRONTEND_URL: string;
	NATS_CLUSTER_ID: string;
	NATS_URL: string;
}

export const env: Environment = {
	PORT: parseInt(process.env.PORT || "3000"),
	HOST: process.env.HOST || "0.0.0.0",
	NODE_ENV: (process.env.NODE_ENV as Environment["NODE_ENV"]) || "development",
	JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_in_prod",
	JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "24h",
	RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "100"),
	RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || "60000"),
	LOG_LEVEL: process.env.LOG_LEVEL || "info",
	CORS_ORIGINS: process.env.CORS_ORIGINS?.split(",") || [
		"http://localhost:3000",
	],
	FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
	NATS_URL: process.env.NATS_URL || "nats://localhost:4222",
	NATS_CLUSTER_ID: process.env.NATS_CLUSTER_ID || 'transcendence-cluster'
};

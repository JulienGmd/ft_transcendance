import { connect, type NatsConnection } from "nats";

let nc: NatsConnection | null = null;

export async function initNats() {
	nc = await connect({ servers: ["nats://localhost:4222"] });
	console.log("✅ Connected to NATS");
}

export function getNatsClient() {
	if (!nc) throw new Error("NATS client not initialized");
	return nc;
}

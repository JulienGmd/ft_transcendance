import { connect, type NatsConnection, StringCodec } from "nats";

let nc: NatsConnection | null = null;
const codec = StringCodec();

export async function initNats(): Promise<void> {
  try {
    // Connect to NATS server (adjust URL based on docker-compose setup)
    // In Docker, use "nats" as the hostname (service name in docker-compose)
    const natsUrl = process.env.NATS_URL || "nats://nats:4222";
    console.log(`Connecting to NATS at ${natsUrl}...`);
    
    nc = await connect({ 
      servers: natsUrl,
      maxReconnectAttempts: -1, // Reconnect indefinitely
      reconnectTimeWait: 2000, // Wait 2s between reconnection attempts
    });
    
    console.log("✅ Connected to NATS server");
    
    // Handle connection events
    (async () => {
      for await (const status of nc!.status()) {
        console.log(`NATS status: ${status.type}`);
      }
    })();
    
  } catch (error) {
    console.error("❌ Failed to connect to NATS:", error);
    throw error;
  }
}

export function getNatsClient(): NatsConnection {
  if (!nc) {
    throw new Error("NATS client not initialized. Call initNats() first.");
  }
  return nc;
}

export function getCodec() {
  return codec;
}

export async function closeNats(): Promise<void> {
  if (nc) {
    await nc.drain();
    console.log("🔌 NATS connection closed");
  }
}

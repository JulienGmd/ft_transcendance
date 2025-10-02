import { getNatsClient } from "./index";

export async function publish(topic: string, payload: object) {
	const nc = getNatsClient();
	nc.publish(topic, new TextEncoder().encode(JSON.stringify(payload)));
}

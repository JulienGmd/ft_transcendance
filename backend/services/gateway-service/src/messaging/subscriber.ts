import { getNatsClient } from "./index";

export async function subscribe(topic: string, handler: (msg: any) => void) {
	const nc = getNatsClient();
	const sub = nc.subscribe(topic);
	(async () => {
		for await (const m of sub) {
			const data = JSON.parse(new TextDecoder().decode(m.data));
			handler(data);
		}
	})();
}

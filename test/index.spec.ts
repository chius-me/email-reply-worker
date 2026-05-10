import {
	env,
	createExecutionContext,
	waitOnExecutionContext,
	SELF,
} from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index";

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe("Email reply worker", () => {
	it("responds to HTTP health checks", async () => {
		const request = new IncomingRequest("http://example.com");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it("responds to HTTP health checks (integration style)", async () => {
		const response = await SELF.fetch("https://example.com");
		expect(await response.text()).toMatchInlineSnapshot(`"Hello World!"`);
	});

	it("replies to incoming email from test@chius.cc", async () => {
		const ctx = createExecutionContext();
		const reply = vi.fn(async () => ({ messageId: "reply-id" }));
		const message = {
			from: "sender@example.com",
			to: "test@chius.cc",
			headers: new Headers({
				"Message-ID": "<incoming@example.com>",
				Subject: "Question",
			}),
			raw: new ReadableStream<Uint8Array>(),
			rawSize: 0,
			setReject: vi.fn(),
			forward: vi.fn(),
			reply,
		} satisfies ForwardableEmailMessage;

		await worker.email(message, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(reply).toHaveBeenCalledTimes(1);
		const [replyMessage] = reply.mock.calls[0];
		expect(replyMessage.from).toBe("test@chius.cc");
		expect(replyMessage.to).toBe("sender@example.com");
	});
});

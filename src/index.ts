import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const SENDER = "test@chius.cc";
const AUTO_REPLY_BODY = "I received your email and will get back to you soon.";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return new Response("Hello World!");
	},

	async email(message, env, ctx): Promise<void> {
		const originalSubject = message.headers.get("Subject");
		const originalMessageId = message.headers.get("Message-ID");
		const msg = createMimeMessage();

		if (originalMessageId) {
			msg.setHeader("In-Reply-To", originalMessageId);
		}

		msg.setSender({ name: "Email Reply Worker", addr: SENDER });
		msg.setRecipient(message.from);
		msg.setSubject(originalSubject ? `Re: ${originalSubject}` : "Email received");
		msg.addMessage({
			contentType: "text/plain",
			data: AUTO_REPLY_BODY,
		});

		const replyMessage = new EmailMessage(SENDER, message.from, msg.asRaw());

		await message.reply(replyMessage);
	},
} satisfies ExportedHandler<Env>;

import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const SENDER = "contact@chius.cc";
const FORWARD_TO = "chius.me@proton.me";
const AUTO_REPLY_BODY = "✉️ Thank you for your email! I received your message and will get back to you soon.";

export function createReplySubject(subject: string | null): string {
	const decodedSubject = subject ? decodeMimeWords(subject) : "Email received";

	return `Re: ${decodedSubject}`;
}

function decodeMimeWords(value: string): string {
	return value.replace(
		/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi,
		(_, charset: string, encoding: string, encodedText: string) => {
			try {
				const bytes =
					encoding.toLowerCase() === "b"
						? base64ToBytes(encodedText)
						: quotedPrintableToBytes(encodedText);

				return new TextDecoder(charset).decode(bytes);
			} catch {
				return `=?${charset}?${encoding}?${encodedText}?=`;
			}
		},
	);
}

function base64ToBytes(value: string): Uint8Array {
	return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function quotedPrintableToBytes(value: string): Uint8Array {
	const bytes: number[] = [];
	const normalized = value.replace(/_/g, " ");

	for (let index = 0; index < normalized.length; index += 1) {
		if (normalized[index] === "=" && index + 2 < normalized.length) {
			const byte = Number.parseInt(normalized.slice(index + 1, index + 3), 16);

			if (!Number.isNaN(byte)) {
				bytes.push(byte);
				index += 2;
				continue;
			}
		}

		bytes.push(normalized.charCodeAt(index));
	}

	return new Uint8Array(bytes);
}

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

		msg.setSender({ name: "Chius's Auto-Reply", addr: SENDER });
		msg.setRecipient(message.from);
		msg.setSubject(createReplySubject(originalSubject));
		msg.addMessage({
			contentType: "text/plain",
			data: AUTO_REPLY_BODY,
		});

		const replyMessage = new EmailMessage(SENDER, message.from, msg.asRaw());

		await message.forward(FORWARD_TO);

		try {
			await message.reply(replyMessage);
		} catch (error) {
			console.error("Failed to send auto-reply", error);
		}
	},
} satisfies ExportedHandler<Env>;

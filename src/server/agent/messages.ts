import type { UIMessage } from "ai";
import { z } from "zod";

/**
 * Validation and sanitising of the chat history the browser sends.
 *
 * The history is untrusted: only user and assistant *text* reaches the model. Tool calls,
 * tool results, reasoning and any client-side `system`/`tools` fields are dropped, so a
 * forged "tool result" in the history cannot smuggle a doctor or an instruction in.
 */

export const LIMITS = {
  messages: 40,
  userMessageChars: 2_000,
  historyChars: 40_000,
} as const;

const PartSchema = z.looseObject({ type: z.string().max(64) });

export const ChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string().max(200),
        role: z.enum(["user", "assistant"]),
        parts: z.array(PartSchema).max(100),
      }),
    )
    .min(1)
    .max(LIMITS.messages),
});

export type ChatBody = z.infer<typeof ChatBodySchema>;

export type SanitizeResult =
  | { ok: true; messages: UIMessage[]; lastUserText: string; recentUserText: string }
  | { ok: false; code: "last_message_not_user" | "message_too_long" | "history_too_long" | "empty_message" };

function textOf(parts: ChatBody["messages"][number]["parts"]): string {
  return parts
    .flatMap((p) => (p.type === "text" && typeof p.text === "string" ? [p.text] : []))
    .join("\n")
    .trim();
}

export function sanitizeHistory(body: ChatBody): SanitizeResult {
  const last = body.messages.at(-1)!;
  if (last.role !== "user") return { ok: false, code: "last_message_not_user" };

  const lastUserText = textOf(last.parts);
  if (!lastUserText) return { ok: false, code: "empty_message" };
  if (lastUserText.length > LIMITS.userMessageChars) return { ok: false, code: "message_too_long" };

  const messages: UIMessage[] = body.messages.flatMap((m) => {
    const text = textOf(m.parts);
    return text ? [{ id: m.id, role: m.role, parts: [{ type: "text" as const, text }] }] : [];
  });
  const total = messages.reduce((n, m) => n + (m.parts[0] as { text: string }).text.length, 0);
  if (total > LIMITS.historyChars) return { ok: false, code: "history_too_long" };

  // The last three patient messages, so "chest pain" then "and I'm sweating" is still caught.
  const recentUserText = body.messages
    .filter((m) => m.role === "user")
    .slice(-3)
    .map((m) => textOf(m.parts))
    .join(". ");

  return { ok: true, messages, lastUserText, recentUserText };
}

export function detectLanguage(text: string): "ar" | "en" {
  return /[؀-ۿ]/.test(text) ? "ar" : "en";
}

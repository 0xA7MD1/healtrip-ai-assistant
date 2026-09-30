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
  | { ok: true; messages: UIMessage[]; lastUserText: string; recentUserText: string; language: "ar" | "en" }
  | { ok: false; code: "last_message_not_user" | "message_too_long" | "history_too_long" | "empty_message" };

function textOf(parts: ChatBody["messages"][number]["parts"]): string {
  return parts
    .flatMap((p) => (p.type === "text" && typeof p.text === "string" ? [p.text] : []))
    .join("\n")
    .trim();
}

/** `uiLocale` decides the reply language when the patient's words cannot ("40", "Riyadh"). */
export function sanitizeHistory(body: ChatBody, uiLocale?: "ar" | "en"): SanitizeResult {
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

  const userTexts = body.messages.filter((m) => m.role === "user").map((m) => textOf(m.parts));
  // The last three patient messages, so "chest pain" then "and I'm sweating" is still caught.
  const recentUserText = userTexts.slice(-3).join(". ");

  return { ok: true, messages, lastUserText, recentUserText, language: detectLanguage(userTexts, uiLocale) };
}

const ARABIC_LETTER = /[؀-ۿ]/;
const LATIN_WORD = /[a-z]{2,}/gi;

/**
 * The reply language, from the patient's latest message that shows one. A short answer such as
 * "40", "Riyadh" or "Al Khobar" does not, so an Arabic conversation stays Arabic. When no message
 * shows a language, the UI language decides.
 */
export function detectLanguage(userTexts: readonly string[], uiLocale: "ar" | "en" = "en"): "ar" | "en" {
  for (const text of [...userTexts].reverse()) {
    if (ARABIC_LETTER.test(text)) return "ar";
    if ((text.match(LATIN_WORD)?.length ?? 0) >= 3) return "en";
  }
  return uiLocale;
}

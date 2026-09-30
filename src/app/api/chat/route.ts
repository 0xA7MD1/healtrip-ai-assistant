import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { TOOL_NAMES } from "@/lib/agent-contracts";
import { emergencyStream } from "@/server/agent/emergency";
import { newTurnState } from "@/server/agent/guard";
import { ChatBodySchema, detectLanguage, sanitizeHistory } from "@/server/agent/messages";
import { getChatModel } from "@/server/agent/models";
import { buildInstructions } from "@/server/agent/prompt";
import { createAgentTools } from "@/server/agent/tools";
import { errorResponse, logEvent, newRequestId } from "@/server/http";
import { clientKey, createRateLimiter } from "@/server/rate-limit";
import { screenMessage } from "@/server/triage/signals";

/**
 * POST /api/chat — one patient turn.
 *
 *   rate limit → validate → sanitise history → pre-LLM emergency gate
 *     ├─ emergency: fixed reply + emergency numbers, no model call
 *     └─ otherwise: agent loop (assess → search → present) with the recommendation guard
 *
 * Stateless: nothing is stored. Logs carry ids, counts and tool names, never message text.
 */

export const maxDuration = 60;

const MAX_BODY_BYTES = 256 * 1024;
const limiter = createRateLimiter({ limit: 12, windowMs: 60_000 });

export async function POST(request: Request) {
  const requestId = newRequestId();

  const rate = limiter(clientKey(request.headers));
  if (!rate.allowed) {
    logEvent("chat_rate_limited", { requestId });
    const response = errorResponse(429, "rate_limited", "Too many messages. Please wait a moment.", requestId);
    response.headers.set("retry-after", String(rate.retryAfterSeconds));
    return response;
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "The conversation is too long.", requestId);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "The request body must be JSON.", requestId);
  }
  const parsed = ChatBodySchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(400, "invalid_request", "Invalid chat request.", requestId, parsed.error.issues);
  }
  const history = sanitizeHistory(parsed.data);
  if (!history.ok) {
    return errorResponse(400, history.code, "Invalid chat request.", requestId);
  }

  const language = detectLanguage(history.lastUserText);
  // The last three patient messages, not just the last one: red flags usually arrive as the
  // answer to a clarifying question ("chest pain", then "yes, I'm sweating").
  const gate = screenMessage(history.recentUserText);
  logEvent("chat_request", { requestId, messages: history.messages.length, language, gate: gate.level });

  if (gate.level === "emergency") {
    logEvent("chat_emergency_gate", { requestId, reason: gate.reason, signals: gate.signals });
    return createUIMessageStreamResponse({
      stream: emergencyStream({ text: history.recentUserText, language, requestId }),
      headers: { "x-request-id": requestId },
    });
  }

  const state = newTurnState();
  let step = 0;
  const result = streamText({
    model: getChatModel(),
    instructions: buildInstructions({ language, conversationSignals: gate }),
    messages: await convertToModelMessages(history.messages),
    tools: createAgentTools(state),
    stopWhen: isStepCount(6),
    // Once the assessment says emergency, the next step must surface the emergency numbers.
    prepareStep: () =>
      state.assessment?.urgency === "emergency" && !state.emergencyShown
        ? { toolChoice: { type: "tool", toolName: TOOL_NAMES.findEmergencyFacilities } }
        : {},
    temperature: 0.2,
    // Free tiers answer 429 with a sub-second "try again"; one backoff retry absorbs most of them.
    maxRetries: 2,
    timeout: { totalMs: 55_000 },
    abortSignal: request.signal,
    onStepEnd: (stepResult) => {
      step += 1;
      logEvent("chat_step", {
        requestId,
        step,
        finishReason: stepResult.finishReason,
        tools: stepResult.toolCalls.map((c) => c.toolName),
        model: stepResult.response.modelId,
      });
    },
    onError: ({ error }) => {
      logEvent("chat_model_error", { requestId, error: String(error) });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      // Raw model reasoning is not bound by the prompt's rules and can speculate about a
      // diagnosis. The patient sees the tool steps instead.
      sendReasoning: false,
      // The UI maps this code to a localized message; details stay in the server log.
      onError: () => "model_unavailable",
    }),
    headers: { "x-request-id": requestId },
  });
}

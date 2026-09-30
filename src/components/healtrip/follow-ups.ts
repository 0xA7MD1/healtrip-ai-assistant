import type { ThreadMessage } from "@assistant-ui/react";
import { TOOL_NAMES, type RecommendationResult, type UrgencyAssessment } from "@/lib/agent-contracts";
import type { Dictionary } from "@/lib/i18n";

/**
 * Follow-up chips derived from the last assistant turn's tool results. Deterministic and
 * free: no extra model call, and never offered after an emergency.
 */
export function followUpsFor(messages: readonly ThreadMessage[], t: Dictionary): { prompt: string }[] {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return [];

  const results = new Map<string, unknown>();
  for (const part of last.content) {
    if (part.type === "tool-call" && part.result !== undefined) results.set(part.toolName, part.result);
  }
  if (results.has(TOOL_NAMES.findEmergencyFacilities)) return [];

  const recommendation = results.get(TOOL_NAMES.presentRecommendation) as RecommendationResult | undefined;
  const assessment = results.get(TOOL_NAMES.assessUrgency) as UrgencyAssessment | undefined;
  const f = t.followUps;

  let prompts: string[] = [];
  if (recommendation?.status === "ok") {
    prompts =
      recommendation.nextStep === "seek_second_opinion"
        ? [f.telemedicine, f.otherCity]
        : [f.telemedicine, f.secondOpinion, f.otherCity];
  } else if (recommendation?.status === "no_match") {
    prompts = [f.telemedicine, f.otherCity];
  } else if (assessment?.urgency === "needs_screening") {
    prompts = [f.noRedFlags, f.breathless];
  }
  return prompts.map((prompt) => ({ prompt }));
}

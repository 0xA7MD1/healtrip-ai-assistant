import { z } from "zod";
import type { SpecialtyCode } from "@/lib/catalog";
import { classifySignals, SIGNAL_IDS } from "./signals";

/**
 * Urgency assessment used by the `assess_urgency` tool.
 *
 * Division of labour: the LLM turns the conversation into this structured input
 * (it is good at understanding language); this function decides urgency and specialty
 * (safety-critical decisions stay in reviewable, tested code).
 */

export const BODY_SYSTEMS = [
  "heart",
  "lungs",
  "digestive",
  "brain_nerves",
  "bones_joints",
  "skin",
  "cancer",
  "child_health",
  "general",
] as const;

const SPECIALTY_BY_BODY_SYSTEM: Record<(typeof BODY_SYSTEMS)[number], SpecialtyCode> = {
  heart: "cardiology",
  lungs: "pulmonology",
  digestive: "gastroenterology",
  brain_nerves: "neurology",
  bones_joints: "orthopedics",
  skin: "dermatology",
  cancer: "oncology",
  child_health: "pediatrics",
  general: "internal_medicine",
};

export const UrgencyInputSchema = z.object({
  body_system: z.enum(BODY_SYSTEMS).describe("Which body system the main complaint concerns."),
  signals_present: z
    .array(z.enum(SIGNAL_IDS))
    .describe("Symptom signals the patient CONFIRMED having. Never include ones they denied or were not asked about."),
  red_flags_screened: z
    .boolean()
    .describe("True only if the patient has answered the red-flag screening questions for their complaint."),
  onset: z.enum(["sudden", "hours", "days", "weeks", "months", "unknown"]),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]),
  age_years: z.number().int().min(0).max(120).nullable(),
  has_existing_diagnosis: z
    .boolean()
    .describe("True when the patient already has a diagnosis or treatment plan and wants it reviewed."),
});

export type UrgencyInput = z.infer<typeof UrgencyInputSchema>;

export type Urgency = "emergency" | "needs_screening" | "urgent" | "routine";

export type NextStep =
  | "go_to_er"
  | "ask_red_flag_questions"
  | "see_doctor_within_24h"
  | "book_specialist"
  | "seek_second_opinion";

export interface UrgencyAssessment {
  urgency: Urgency;
  next_step: NextStep;
  suggested_specialty: SpecialtyCode;
  reasons: string[];
}

export function assessUrgency(input: UrgencyInput): UrgencyAssessment {
  const suggested_specialty = SPECIALTY_BY_BODY_SYSTEM[input.body_system];
  const classification = classifySignals(input.signals_present);

  if (classification.level === "emergency") {
    return {
      urgency: "emergency",
      next_step: "go_to_er",
      suggested_specialty,
      reasons: [classification.reason, ...classification.signals],
    };
  }

  if (classification.level === "screen" && !input.red_flags_screened) {
    return {
      urgency: "needs_screening",
      next_step: "ask_red_flag_questions",
      suggested_specialty,
      reasons: ["needs_red_flag_screening", ...classification.signals],
    };
  }

  const recentOnset = input.onset === "sudden" || input.onset === "hours";
  if (input.severity === "severe" || (recentOnset && input.severity !== "mild")) {
    return {
      urgency: "urgent",
      next_step: "see_doctor_within_24h",
      suggested_specialty,
      reasons: [input.severity === "severe" ? "severe_symptoms" : "recent_onset"],
    };
  }

  if (input.has_existing_diagnosis) {
    return {
      urgency: "routine",
      next_step: "seek_second_opinion",
      suggested_specialty,
      reasons: ["existing_diagnosis_review"],
    };
  }

  return {
    urgency: "routine",
    next_step: "book_specialist",
    suggested_specialty,
    reasons: ["no_red_flags"],
  };
}

import type {
  DoctorCard,
  DoctorSearchResult,
  NextStep,
  Urgency,
  UrgencyAssessment,
} from "@/lib/agent-contracts";
import type { SpecialtyCode } from "@/lib/catalog";

/**
 * The recommendation guard. The model may only *point at* doctors (by id); this module
 * decides whether a recommendation can be shown at all and builds it from records the
 * server itself fetched during this request. Pure, so every rule is unit-tested.
 *
 * State lives for one HTTP request only. Tool results in the chat history come from the
 * client and are never trusted, so a recommendation always needs a fresh assessment and a
 * fresh search in the same turn.
 */

export interface SearchRecord {
  specialty: SpecialtyCode;
  result: DoctorSearchResult;
}

export interface TurnState {
  assessment?: UrgencyAssessment;
  searches: SearchRecord[];
  emergencyShown: boolean;
}

export function newTurnState(): TurnState {
  return { searches: [], emergencyShown: false };
}

/** Rejections are sent back to the model as tool errors, phrased as the fix to apply. */
export class GuardError extends Error {
  override name = "GuardError";
}

type RoutineUrgency = Exclude<Urgency, "emergency" | "needs_screening">;
type RoutineStep = Exclude<NextStep, "go_to_er" | "ask_red_flag_questions">;

export type RecommendationPlan =
  | {
      status: "ok";
      urgency: RoutineUrgency;
      nextStep: RoutineStep;
      doctors: DoctorCard[];
      search: SearchRecord;
    }
  | { status: "no_match"; urgency: RoutineUrgency; nextStep: RoutineStep; search: SearchRecord };

export function planRecommendation(state: TurnState, requestedIds: readonly string[]): RecommendationPlan {
  // Once this turn has shown emergency numbers, a later, milder re-assessment cannot unlock doctors.
  if (state.emergencyShown) {
    throw new GuardError(
      "Emergency numbers were shown in this turn. Tell the patient to call emergency services now. Do not recommend doctors.",
    );
  }
  const assessment = state.assessment;
  if (!assessment) {
    throw new GuardError("Call assess_urgency in this turn before presenting a recommendation.");
  }
  const { urgency, next_step: nextStep } = assessment;
  if (urgency === "emergency" || nextStep === "go_to_er") {
    throw new GuardError(
      "This is an emergency. Call find_emergency_facilities and tell the patient to call emergency services now. Do not recommend doctors.",
    );
  }
  if (urgency === "needs_screening" || nextStep === "ask_red_flag_questions") {
    throw new GuardError(
      "Ask the patient the red-flag screening questions, then call assess_urgency again before recommending doctors.",
    );
  }

  const last = state.searches.at(-1);
  if (!last) {
    throw new GuardError("Call search_providers in this turn before presenting a recommendation.");
  }

  const ids = [...new Set(requestedIds)];
  if (ids.length === 0) {
    if (last.result.doctors.length > 0) {
      throw new GuardError("The last search found doctors. Pass 1-3 of their ids, best match first.");
    }
    return { status: "no_match", urgency, nextStep, search: last };
  }

  const found = (search: SearchRecord, id: string) => search.result.doctors.find((d) => d.id === id);
  const unknown = ids.filter((id) => !state.searches.some((s) => found(s, id)));
  if (unknown.length > 0) {
    throw new GuardError(
      `Unknown doctor id(s): ${unknown.join(", ")}. Only use ids returned by search_providers in this turn.`,
    );
  }

  const search = state.searches.findLast((s) => ids.every((id) => found(s, id)));
  if (!search) {
    throw new GuardError("All recommended doctors must come from the same search_providers call.");
  }

  return {
    status: "ok",
    urgency,
    nextStep,
    doctors: ids.map((id) => found(search, id)!),
    search,
  };
}

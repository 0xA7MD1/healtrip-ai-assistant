import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { TOOL_NAMES, type RecommendationResult } from "@/lib/agent-contracts";
import { DoctorSearchSchema, EmergencySearchSchema } from "@/server/providers/schemas";
import { findEmergencyFacilities, getSpecialty, searchDoctors } from "@/server/providers/service";
import { assessUrgency, UrgencyInputSchema } from "@/server/triage/assess";
import { planRecommendation, type TurnState } from "./guard";

/**
 * The agent's four tools. Each call records what the server learned in `state`, so
 * `present_recommendation` can only show doctors this request actually found, with the
 * urgency this request actually assessed.
 */
export function createAgentTools(state: TurnState) {
  return {
    [TOOL_NAMES.assessUrgency]: tool({
      description:
        "Decide how urgent the patient's situation is and which specialty fits. Call it once you understand the main complaint, and again after the patient answers red-flag questions. Only include symptoms the patient confirmed.",
      inputSchema: UrgencyInputSchema,
      execute: async (input) => {
        state.assessment = assessUrgency(input);
        return state.assessment;
      },
    }),

    [TOOL_NAMES.searchProviders]: tool({
      description:
        "Search the verified HealTrip+ catalog for doctors. Use the specialty from assess_urgency unless the patient asked for a different one. Pass the city exactly as the patient wrote it. These results are the only doctors you may ever mention.",
      inputSchema: DoctorSearchSchema,
      execute: async (input) => {
        const result = await searchDoctors(input);
        state.searches.push({ specialty: input.specialty, result });
        return result;
      },
    }),

    [TOOL_NAMES.findEmergencyFacilities]: tool({
      description:
        "Get emergency phone numbers and hospitals with a verified 24/7 emergency department. Call it whenever the situation is an emergency.",
      inputSchema: EmergencySearchSchema,
      execute: async (input) => {
        const result = await findEmergencyFacilities(input);
        state.emergencyShown = true;
        return result;
      },
    }),

    [TOOL_NAMES.presentRecommendation]: tool({
      description:
        "Show the patient the recommendation card. Pass 1-3 doctor ids from this turn's search_providers results, best match first, or an empty list when the search found no match. The card shows every doctor detail, so do not repeat them in your text.",
      inputSchema: z.object({
        doctor_ids: z.array(z.string().max(40)).max(3),
      }),
      execute: async ({ doctor_ids }): Promise<RecommendationResult> => {
        const plan = planRecommendation(state, doctor_ids);
        const { searchedCities, note } = plan.search.result;
        if (plan.status === "no_match") {
          return {
            status: "no_match",
            urgency: plan.urgency,
            nextStep: plan.nextStep,
            specialty: await getSpecialty(plan.search.specialty),
            searchedCities,
          };
        }
        return {
          status: "ok",
          urgency: plan.urgency,
          nextStep: plan.nextStep,
          specialty: plan.doctors[0].specialty,
          doctors: plan.doctors,
          searchedCities,
          expandedToNearby: note === "expanded_to_nearby_cities",
        };
      },
    }),
  };
}

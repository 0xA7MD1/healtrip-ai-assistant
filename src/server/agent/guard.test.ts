import { describe, expect, it } from "vitest";
import type { UrgencyAssessment } from "@/lib/agent-contracts";
import { assessRoutine, searchRiyadhCardiology } from "@/fixtures/agent-results";
import { GuardError, newTurnState, planRecommendation, type TurnState } from "./guard";

const [first, second, third] = searchRiyadhCardiology.doctors.map((d) => d.id);

function stateWith(overrides: Partial<TurnState> = {}): TurnState {
  return {
    ...newTurnState(),
    assessment: assessRoutine,
    searches: [{ specialty: "cardiology", result: searchRiyadhCardiology }],
    ...overrides,
  };
}

function assessment(urgency: UrgencyAssessment["urgency"], next_step: UrgencyAssessment["next_step"]) {
  return { ...assessRoutine, urgency, next_step };
}

describe("planRecommendation", () => {
  it("requires an assessment in this turn", () => {
    expect(() => planRecommendation(stateWith({ assessment: undefined }), [first])).toThrow(/assess_urgency/);
  });

  it("refuses to recommend doctors in an emergency", () => {
    const state = stateWith({ assessment: assessment("emergency", "go_to_er") });
    expect(() => planRecommendation(state, [first])).toThrow(/find_emergency_facilities/);
  });

  it("stays an emergency after the numbers were shown, even if a re-assessment is milder", () => {
    // assess_urgency → emergency, find_emergency_facilities, then assess_urgency again without the red flags.
    const state = stateWith({ emergencyShown: true });
    expect(state.assessment?.urgency).toBe("routine");
    expect(() => planRecommendation(state, [first])).toThrow(/emergency services/);
  });

  it("refuses until red flags are screened", () => {
    const state = stateWith({ assessment: assessment("needs_screening", "ask_red_flag_questions") });
    expect(() => planRecommendation(state, [first])).toThrow(/red-flag/);
  });

  it("requires a search in this turn", () => {
    expect(() => planRecommendation(stateWith({ searches: [] }), [first])).toThrow(/search_providers/);
  });

  it("rejects ids the search did not return (fabricated doctors)", () => {
    expect(() => planRecommendation(stateWith(), ["dr_house"])).toThrow(GuardError);
    expect(() => planRecommendation(stateWith(), [first, "dr_house"])).toThrow(/dr_house/);
  });

  it("returns the server's own records in the requested order, without duplicates", () => {
    const plan = planRecommendation(stateWith(), [third, first, third]);
    expect(plan.status).toBe("ok");
    if (plan.status !== "ok") return;
    expect(plan.doctors.map((d) => d.id)).toEqual([third, first]);
    expect(plan.doctors[0]).toBe(searchRiyadhCardiology.doctors[2]);
    expect(plan.urgency).toBe(assessRoutine.urgency);
    expect(plan.nextStep).toBe(assessRoutine.next_step);
  });

  it("takes urgency and next step from the assessment, not the model", () => {
    const state = stateWith({ assessment: assessment("urgent", "see_doctor_within_24h") });
    const plan = planRecommendation(state, [second]);
    expect(plan.urgency).toBe("urgent");
    expect(plan.nextStep).toBe("see_doctor_within_24h");
  });

  it("reports no_match only when the last search really found nobody", () => {
    const empty = { ...searchRiyadhCardiology, doctors: [], note: "no_match" as const };
    const noMatch = stateWith({ searches: [{ specialty: "dermatology", result: empty }] });
    expect(planRecommendation(noMatch, []).status).toBe("no_match");
    expect(() => planRecommendation(stateWith(), [])).toThrow(/found doctors/);
  });

  it("rejects mixing doctors from different searches", () => {
    const a = { ...searchRiyadhCardiology, doctors: [searchRiyadhCardiology.doctors[0]] };
    const b = { ...searchRiyadhCardiology, doctors: [searchRiyadhCardiology.doctors[1]] };
    const state = stateWith({
      searches: [
        { specialty: "cardiology", result: a },
        { specialty: "cardiology", result: b },
      ],
    });
    expect(() => planRecommendation(state, [first, second])).toThrow(/same search/);
  });
});

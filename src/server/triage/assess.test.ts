import { describe, expect, it } from "vitest";
import { assessUrgency, type UrgencyInput } from "./assess";

const base: UrgencyInput = {
  body_system: "heart",
  signals_present: [],
  red_flags_screened: true,
  onset: "weeks",
  severity: "mild",
  age_years: 45,
  has_existing_diagnosis: false,
};

describe("assessUrgency", () => {
  it("sends chest pain with a cardiac companion to the ER, whatever else the model says", () => {
    const result = assessUrgency({
      ...base,
      signals_present: ["chest_pain", "sweating"],
      severity: "mild",
    });
    expect(result).toMatchObject({ urgency: "emergency", next_step: "go_to_er" });
  });

  it("refuses to recommend a doctor for chest pain before red-flag screening", () => {
    const result = assessUrgency({
      ...base,
      signals_present: ["chest_pain"],
      red_flags_screened: false,
    });
    expect(result).toMatchObject({ urgency: "needs_screening", next_step: "ask_red_flag_questions" });
  });

  it("routes screened, mild, long-standing chest pain to cardiology", () => {
    const result = assessUrgency({ ...base, signals_present: ["chest_pain"] });
    expect(result).toMatchObject({
      urgency: "routine",
      next_step: "book_specialist",
      suggested_specialty: "cardiology",
    });
  });

  it("marks severe or sudden symptoms as urgent (within 24h)", () => {
    expect(assessUrgency({ ...base, severity: "severe" }).urgency).toBe("urgent");
    expect(assessUrgency({ ...base, onset: "hours", severity: "moderate" }).urgency).toBe("urgent");
  });

  it("routes an existing diagnosis to a second opinion", () => {
    const result = assessUrgency({ ...base, body_system: "cancer", has_existing_diagnosis: true });
    expect(result).toMatchObject({ next_step: "seek_second_opinion", suggested_specialty: "oncology" });
  });

  it("maps body systems to specialties deterministically", () => {
    expect(assessUrgency({ ...base, body_system: "skin" }).suggested_specialty).toBe("dermatology");
    expect(assessUrgency({ ...base, body_system: "general" }).suggested_specialty).toBe(
      "internal_medicine",
    );
  });
});

import { describe, expect, it } from "vitest";
import { detectSignals, screenMessage } from "./signals";

describe("screenMessage — the pre-LLM safety gate", () => {
  it("asks for screening on the reviewer's example instead of guessing", () => {
    const result = screenMessage(
      "I have chest pain and I'm not sure whether I should see a cardiologist, go to the ER, or seek a second opinion.",
    );
    expect(result.level).toBe("screen");
    expect(result.signals).toEqual(["chest_pain"]);
  });

  it.each([
    "I have chest pain and I'm short of breath",
    "Chest pressure that spreads to my left arm",
    "chest pain with cold sweats",
    "I had chest pain and then I fainted",
    "عندي ألم في الصدر وضيق في التنفس",
    "كتمة في الصدر وعرق بارد",
    "ألم بالصدر ينتشر إلى الذراع",
  ])("flags a possible cardiac event: %s", (text) => {
    const result = screenMessage(text);
    expect(result.level).toBe("emergency");
    expect(result.reason).toBe("possible_cardiac_event");
  });

  it.each([
    ["my father's face is drooping and his speech is slurred", "stroke_signs"],
    ["I can't breathe", "severe_breathing"],
    ["my throat is swelling after eating peanuts", "anaphylaxis"],
    ["I want to die", "suicidal_thoughts"],
    ["she is unconscious", "unconscious"],
    ["ما أقدر أتنفس", "severe_breathing"],
    ["نزيف شديد ما يوقف", "severe_bleeding"],
    ["عنده تشنجات", "seizure"],
    ["أفكر في الانتحار", "suicidal_thoughts"],
    ["خدر في جهة واحدة من الجسم", "stroke_signs"],
  ])("treats %s as an emergency on its own", (text, signal) => {
    const result = screenMessage(text);
    expect(result.level).toBe("emergency");
    expect(result.signals).toContain(signal);
  });

  it.each([
    "I need a dermatologist for acne in Riyadh",
    "I was diagnosed with a thyroid nodule and want a second opinion",
    "أبغى دكتور عظام في جدة",
  ])("lets ordinary requests through: %s", (text) => {
    expect(screenMessage(text).level).toBe("none");
  });
});

describe("negation handling", () => {
  it.each([
    "chest pain but no shortness of breath and no sweating",
    "I have chest pain, I don't have shortness of breath",
    "عندي ألم في الصدر بس ما عندي ضيق تنفس",
    "ألم في الصدر وما في تعرق",
  ])("does not escalate on denied companions: %s", (text) => {
    const result = screenMessage(text);
    expect(result.level).toBe("screen");
    expect(result.signals).toEqual(["chest_pain"]);
  });

  it("ignores a denied symptom entirely", () => {
    expect(detectSignals("no chest pain, just a skin rash")).toEqual([]);
  });

  it("keeps a symptom that appears in a later, non-negated clause", () => {
    expect(detectSignals("no fever, but chest pain since morning")).toEqual(["chest_pain"]);
  });
});

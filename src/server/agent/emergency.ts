import "server-only";
import { createUIMessageStream, generateId, type UIMessageStreamWriter } from "ai";
import { TOOL_NAMES, type EmergencyInfo } from "@/lib/agent-contracts";
import { findCityMention, findEmergencyFacilities } from "@/server/providers/service";
import { logEvent } from "@/server/http";

/**
 * The emergency path of the pre-LLM gate. No model runs: the reply is fixed text plus the
 * same `find_emergency_facilities` result the agent would produce, so the UI shows the same
 * SOS banner. If the catalog is down, the national numbers are hard-coded as a last resort.
 */

const OFFLINE_FALLBACK: EmergencyInfo = {
  country: "SA",
  numbers: [
    { number: "997", service: "ambulance", name: { en: "Saudi Red Crescent Ambulance", ar: "الهلال الأحمر السعودي - الإسعاف" } },
    { number: "911", service: "unified_emergency", name: { en: "Unified Emergency Number", ar: "الطوارئ الموحد" } },
  ],
  facilities: [],
};

function emergencyText(language: "ar" | "en", number: string): string {
  return language === "ar"
    ? `**قد تكون هذه حالة طارئة.** اتصل بالإسعاف على **${number}** الآن، أو توجّه لأقرب قسم طوارئ.\n\nلا تقُد السيارة بنفسك، وابقَ مع شخص قريب منك حتى تصل المساعدة.`
    : `**This may be a medical emergency.** Call **${number}** now, or go to the nearest emergency department.\n\nDo not drive yourself, and stay with someone until help arrives.`;
}

export function emergencyStream(options: { text: string; language: "ar" | "en"; requestId: string }) {
  return createUIMessageStream({
    execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
      let info = OFFLINE_FALLBACK;
      let city: string | undefined;
      try {
        city = (await findCityMention(options.text))?.en;
        info = await findEmergencyFacilities({ city });
      } catch (error) {
        logEvent("emergency_catalog_unavailable", { requestId: options.requestId, error: String(error) });
      }

      const toolCallId = `emergency_${generateId()}`;
      const textId = generateId();
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({
        type: "tool-input-available",
        toolCallId,
        toolName: TOOL_NAMES.findEmergencyFacilities,
        input: { city, country: info.country },
      });
      writer.write({ type: "tool-output-available", toolCallId, output: info });
      writer.write({ type: "finish-step" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textId });
      writer.write({
        type: "text-delta",
        id: textId,
        delta: emergencyText(options.language, info.numbers[0]?.number ?? "997"),
      });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });
    },
  });
}

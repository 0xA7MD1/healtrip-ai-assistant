import type { CountryCode, SpecialtyCode } from "./catalog";

/**
 * The contract between the agent (server) and the chat UI (client).
 *
 * The agent's tools return these shapes; the UI renders them through assistant-ui toolkit
 * entries keyed by the tool names below. Types only, so both sides can import it.
 * Every doctor, hospital and number in these payloads comes from the catalog, never from
 * model text.
 */

export const TOOL_NAMES = {
  assessUrgency: "assess_urgency",
  searchProviders: "search_providers",
  findEmergencyFacilities: "find_emergency_facilities",
  presentRecommendation: "present_recommendation",
} as const;

export type Bilingual = { en: string; ar: string };

export type Urgency = "emergency" | "needs_screening" | "urgent" | "routine";

export type NextStep =
  | "go_to_er"
  | "ask_red_flag_questions"
  | "see_doctor_within_24h"
  | "book_specialist"
  | "seek_second_opinion";

export interface SpecialtyRef extends Bilingual {
  code: SpecialtyCode;
}

export interface CityRef extends Bilingual {
  code: string;
  countryCode: string;
}

export interface DoctorCard {
  id: string;
  /** Always true in this prototype: doctors are generated, hospitals are real. */
  isSynthetic: boolean;
  name: Bilingual;
  gender: "male" | "female";
  title: "consultant" | "specialist";
  specialty: SpecialtyRef;
  hospital: {
    id: string;
    name: Bilingual;
    city: CityRef;
    /** null means the catalog does not know. */
    hasEmergency24x7: boolean | null;
    accreditations: string[];
  };
  yearsExperience: number;
  /** ISO 639-1 codes, e.g. ["ar", "en"]. */
  languages: string[];
  fee: { amount: number; currency: string };
  offersSecondOpinion: boolean;
  offersTelemedicine: boolean;
  nextAvailableInDays: number;
}

/** `assess_urgency` result. */
export interface UrgencyAssessment {
  urgency: Urgency;
  next_step: NextStep;
  suggested_specialty: SpecialtyCode;
  reasons: string[];
}

/** `search_providers` result. The UI shows at most a one-line status for it. */
export interface DoctorSearchResult {
  doctors: DoctorCard[];
  /** Cities actually searched (the requested one, plus nearby ones if it had no match). */
  searchedCities: CityRef[];
  note: "ok" | "expanded_to_nearby_cities" | "no_match" | "unknown_city";
  /** Only set when the city was not recognised, so the caller can ask the patient. */
  knownCities?: CityRef[];
}

export interface EmergencyFacility {
  id: string;
  name: Bilingual;
  city: CityRef;
  website: string | null;
}

/**
 * `find_emergency_facilities` result, rendered as the SOS banner. The same payload is
 * emitted by the pre-LLM emergency gate, so the banner shows even when no model runs.
 */
export interface EmergencyInfo {
  country: CountryCode;
  numbers: { number: string; service: string; name: Bilingual }[];
  facilities: EmergencyFacility[];
}

/**
 * `present_recommendation` result, rendered as the recommendation card. The model only
 * passes doctor ids; the server checks them against this request's searches and the
 * catalog, then returns the full records below.
 */
export type RecommendationResult =
  | {
      status: "ok";
      urgency: Exclude<Urgency, "emergency" | "needs_screening">;
      nextStep: Exclude<NextStep, "go_to_er" | "ask_red_flag_questions">;
      specialty: SpecialtyRef;
      doctors: DoctorCard[];
      searchedCities: CityRef[];
      /** True when the patient's city had no match and nearby cities were used. */
      expandedToNearby: boolean;
    }
  | {
      status: "no_match";
      urgency: Exclude<Urgency, "emergency" | "needs_screening">;
      nextStep: Exclude<NextStep, "go_to_er" | "ask_red_flag_questions">;
      specialty: SpecialtyRef;
      searchedCities: CityRef[];
    };

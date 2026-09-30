import { normalizeArabic } from "@/lib/catalog";

/**
 * Deterministic symptom-signal detection (English + Arabic).
 *
 * This runs BEFORE the LLM on every patient message. It is intentionally simple, auditable
 * and biased toward over-triage: a false alarm costs a patient a trip to the ER, a miss can
 * cost a life. The rules are illustrative for this prototype and are NOT clinically validated.
 */

export const SIGNAL_IDS = [
  "chest_pain",
  "breathing_difficulty",
  "severe_breathing",
  "sweating",
  "radiating_pain",
  "fainting",
  "unconscious",
  "stroke_signs",
  "severe_bleeding",
  "suicidal_thoughts",
  "seizure",
  "anaphylaxis",
] as const;

export type SignalId = (typeof SIGNAL_IDS)[number];

/** Signals that mean "call an ambulance" on their own. */
const EMERGENCY_SIGNALS: ReadonlySet<SignalId> = new Set([
  "severe_breathing",
  "unconscious",
  "stroke_signs",
  "severe_bleeding",
  "suicidal_thoughts",
  "seizure",
  "anaphylaxis",
]);

/** Signals that turn chest pain into a possible cardiac emergency. */
const CARDIAC_COMPANIONS: ReadonlySet<SignalId> = new Set([
  "breathing_difficulty",
  "sweating",
  "radiating_pain",
  "fainting",
]);

/** Signals that are not an emergency yet, but require red-flag screening questions first. */
const SCREEN_SIGNALS: ReadonlySet<SignalId> = new Set([
  "chest_pain",
  "breathing_difficulty",
  "fainting",
]);

export type SignalLevel = "emergency" | "screen" | "none";

export interface SignalClassification {
  level: SignalLevel;
  signals: SignalId[];
  /** Why the level was chosen, for the audit log and the UI banner. */
  reason: "emergency_signal" | "possible_cardiac_event" | "needs_red_flag_screening" | "no_signal";
}

export function classifySignals(signals: readonly SignalId[]): SignalClassification {
  const unique = [...new Set(signals)];
  if (unique.some((s) => EMERGENCY_SIGNALS.has(s))) {
    return { level: "emergency", signals: unique, reason: "emergency_signal" };
  }
  if (unique.includes("chest_pain") && unique.some((s) => CARDIAC_COMPANIONS.has(s))) {
    return { level: "emergency", signals: unique, reason: "possible_cardiac_event" };
  }
  if (unique.some((s) => SCREEN_SIGNALS.has(s))) {
    return { level: "screen", signals: unique, reason: "needs_red_flag_screening" };
  }
  return { level: "none", signals: unique, reason: "no_signal" };
}

// Patterns run on normalized text: lowercase English, Arabic letter variants unified
// (أ/إ/آ -> ا, ة -> ه, ى -> ي), diacritics removed. Write Arabic patterns in that form.
const PATTERNS: Record<SignalId, RegExp[]> = {
  chest_pain: [
    /\bchest (pain|pains|tightness|pressure|discomfort|heaviness)\b/,
    /\b(pain|pressure|tightness) in (my|the) chest\b/,
    /(الم|وجع|كتمه|ضغط|ثقل|ضيق)\s+(في\s+)?(بال|ال|ب)?صدر/,
    /(يوجعني|يعورني|يالمني)\s+صدري|صدري\s+(يوجعني|يعورني|يالمني)/,
  ],
  breathing_difficulty: [
    /\bshort(ness)? of breath\b/,
    /\b(difficulty|trouble|hard time|problems?) breathing\b/,
    /\bbreathless(ness)?\b/,
    /\bcan'?t catch my breath\b/,
    /ضيق\s+(في\s+)?(ال)?(تنفس|نفس)/,
    /صعوبه\s+(في\s+)?(ال)?تنفس/,
    /نهجان|انقطاع\s+(ال)?نفس/,
  ],
  severe_breathing: [
    /\b(can ?not|can'?t|unable to) breathe\b/,
    /\bchoking\b/,
    /\blips? (are |is )?(turning )?blue\b/,
    /(ما|مو|مب|لا)\s+(اقدر|قادر|استطيع)\s+(اتنفس|التنفس)/,
    /اختناق|اختنق/,
  ],
  sweating: [/\b(cold )?sweat(ing|y|s)?\b/, /تعرق|اعرق|عرقان|عرق\s+بارد/],
  radiating_pain: [
    /\b(spread(s|ing)?|radiat\w*|goes|going|moving) (down |up |in)?(to )?(my |the )?(left )?(arm|jaw|neck|shoulder|back)\b/,
    /\b(left )?(arm|jaw) (pain|ache|hurts)\b/,
    /(ينتشر|يمتد|يروح|ينزل|واصل)\s+(الي|الى|على|ل|لل)?\s*(ال)?(ذراع|يد|كتف|فك|رقبه|ظهر)/,
    /(الم|وجع)\s+(في\s+)?(ال)?(ذراع|فك|كتف)\s*(الايسر|اليسار|اليسري)?/,
  ],
  fainting: [
    /\b(faint(ed|ing)?|passed out|pass out|blacked out|collapsed)\b/,
    /اغمي|اغماء|غبت\s+عن\s+الوعي|فقدت\s+الوعي|دوخه\s+شديده/,
  ],
  unconscious: [
    /\b(unconscious|unresponsive|not breathing)\b/,
    /فاقد\s+(ال)?وعي|لا\s+يستجيب|ما\s+يستجيب|(ما|لا)\s+يتنفس/,
  ],
  stroke_signs: [
    /\b(face|facial|mouth)\b[^.]{0,15}\b(droop\w*|numb\w*)/,
    /\bslurr?ed speech\b|\bspeech (is |was )?slurr?ed\b|\bslurring\b/,
    /\b(weakness|numbness) (on|in) (one|the (left|right)) side\b/,
    /\bone side of (my|his|her|the) (body|face)\b/,
    /(ارتخاء|ميلان|تنميل|خدر)\s+(في\s+)?(ال)?(وجه|وجهي)/,
    /(ثقل|صعوبه)\s+(في\s+)?(ال)?(كلام|لسان|نطق)/,
    /(ضعف|شلل|تنميل|خدر)\s+(في\s+)?(جهه|جانب|نص|نصف)/,
  ],
  severe_bleeding: [
    /\b(heavy|severe|uncontrolled|nonstop) bleeding\b/,
    /\bbleeding (heavily|a lot|won'?t stop|that won'?t stop)\b/,
    /\b(vomiting|coughing( up)?) blood\b/,
    /نزيف\s+(شديد|قوي|كثير|مستمر|ما\s+يوقف|لا\s+يتوقف)/,
    /(استفراغ|تقيؤ|ترجيع|كحه|سعال)\s+(مع\s+|فيه\s+)?دم/,
  ],
  suicidal_thoughts: [
    /\b(suicid\w*|kill (myself|me)|end (my life|it all)|want to die|self[- ]harm|hurt myself)\b/,
    /انتحار|انتحر|اقتل\s+نفسي|(ابي|ابغي|ابغى|اريد|ودي)\s+(ان\s+)?اموت|(اذي|اؤذي)\s+نفسي|انهي\s+حياتي/,
  ],
  seizure: [/\b(seizure|seizing|convulsion\w*)\b/, /تشنج|صرع/],
  anaphylaxis: [
    /\b(throat|tongue|lips?) (is |are )?(swelling|swollen|closing)\b/,
    /\banaphyla\w*\b/,
    /(تورم|انتفاخ)\s+(في\s+)?(ال)?(حلق|لسان|شفايف|شفاه)/,
  ],
};

const NEGATION_CUES = new Set([
  "no", "not", "without", "denies", "deny", "don't", "dont", "doesn't", "doesnt", "never", "none",
  "لا", "ما", "مو", "مب", "بدون", "بلا", "مافي", "ماعندي", "ليس", "ليست", "مافيه",
]);

// A negation only applies inside its own clause: "chest pain but no sweating".
const CLAUSE_BREAK = /[.,;!?،؛]|\bbut\b|\bhowever\b|لكن|بس\s/g;

function isNegated(text: string, matchIndex: number): boolean {
  const before = text.slice(Math.max(0, matchIndex - 40), matchIndex);
  const clause = before.split(CLAUSE_BREAK).pop() ?? "";
  const words = clause.trim().split(/\s+/).slice(-3);
  // Arabic attaches "and" to the next word: "وما عندي" -> "ما".
  return words.some((w) => NEGATION_CUES.has(w) || NEGATION_CUES.has(w.replace(/^و/, "")));
}

export function normalizeForMatching(text: string): string {
  return normalizeArabic(text.toLowerCase())
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");
}

/** Finds non-negated symptom signals in free text. */
export function detectSignals(text: string): SignalId[] {
  const normalized = normalizeForMatching(text);
  const found: SignalId[] = [];
  for (const id of SIGNAL_IDS) {
    for (const pattern of PATTERNS[id]) {
      const global = new RegExp(pattern.source, "g");
      let match: RegExpExecArray | null;
      let hit = false;
      while ((match = global.exec(normalized)) !== null) {
        if (!isNegated(normalized, match.index)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        found.push(id);
        break;
      }
    }
  }
  return found;
}

/** The pre-LLM safety gate: classify a raw patient message. */
export function screenMessage(text: string): SignalClassification {
  return classifySignals(detectSignals(text));
}

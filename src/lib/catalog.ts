/**
 * Shared catalog vocabulary. Pure module: safe to import from the client, the server,
 * scripts and tests.
 */

export const SPECIALTY_CODES = [
  "cardiology",
  "internal_medicine",
  "family_medicine",
  "pulmonology",
  "gastroenterology",
  "neurology",
  "orthopedics",
  "oncology",
  "pediatrics",
  "dermatology",
] as const;

export type SpecialtyCode = (typeof SPECIALTY_CODES)[number];

export const COUNTRY_CODES = ["SA", "AE", "DE", "TR"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export const COUNTRY_NAMES: Record<CountryCode, { en: string; ar: string }> = {
  SA: { en: "Saudi Arabia", ar: "السعودية" },
  AE: { en: "United Arab Emirates", ar: "الإمارات" },
  DE: { en: "Germany", ar: "ألمانيا" },
  TR: { en: "Turkey", ar: "تركيا" },
};

/** Removes Arabic diacritics/tatweel and unifies letter variants so user text and data compare equal. */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

const CITY_ALIASES: Record<string, string> = {
  khobar: "al-khobar",
  alkhobar: "al-khobar",
  "al-khubar": "al-khobar",
  jiddah: "jeddah",
  "ar-riyadh": "riyadh",
};

/**
 * Cities close enough that a patient would reasonably travel between them
 * (Dammam and Al Khobar are ~20 km apart). Used when a city has no match.
 */
export const NEARBY_CITIES: Record<string, string[]> = {
  dammam: ["al-khobar"],
  "al-khobar": ["dammam"],
};

/** Normalizes an English city name to a stable slug: "Al Khobar" -> "al-khobar". */
export function toCityCode(cityEn: string): string {
  const slug = cityEn
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return CITY_ALIASES[slug] ?? slug;
}

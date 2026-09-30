import { z } from "zod";
import { COUNTRY_CODES, SPECIALTY_CODES } from "@/lib/catalog";

/**
 * Contract for the raw dataset in data/raw/*.json (produced by the Perplexity prompt in
 * data/PERPLEXITY_PROMPT.txt). Nothing reaches the database without passing this schema
 * and the integrity checks below.
 */

const sourceUrls = z.array(z.url()).min(1, "every real-world record needs at least one source URL");

export const SpecialtySchema = z.object({
  code: z.enum(SPECIALTY_CODES),
  name_en: z.string().min(1),
  name_ar: z.string().min(1),
});

export const HospitalSchema = z.object({
  id: z.string().regex(/^hosp_[a-z0-9_]+$/),
  name_en: z.string().min(1),
  name_ar: z.string().min(1),
  country_code: z.enum(COUNTRY_CODES),
  city_en: z.string().min(1),
  city_ar: z.string().min(1),
  ownership: z.enum(["government", "private", "university", "military", "nonprofit"]).nullable(),
  has_24_7_emergency: z.boolean().nullable(),
  accreditations: z.array(z.string()).default([]),
  serves_international_patients: z.boolean().nullable(),
  specialty_codes: z.array(z.enum(SPECIALTY_CODES)).min(1),
  website: z.url().nullable(),
  source_urls: sourceUrls,
});

export const DoctorSchema = z.object({
  id: z.string().regex(/^doc_[a-z0-9_]+$/),
  // Doctors are always fictional. The literal type makes that a hard rule, not a convention.
  is_synthetic: z.literal(true),
  name_en: z.string().min(1),
  name_ar: z.string().min(1),
  gender: z.enum(["male", "female"]),
  title: z.enum(["consultant", "specialist"]),
  specialty_code: z.enum(SPECIALTY_CODES),
  hospital_id: z.string(),
  years_experience: z.number().int().min(0).max(60),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)).min(1),
  consultation_fee: z.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  offers_second_opinion: z.boolean(),
  offers_telemedicine: z.boolean(),
  next_available_in_days: z.number().int().min(0).max(365),
});

export const FeeBenchmarkSchema = z.object({
  country_code: z.enum(COUNTRY_CODES),
  currency: z.string().regex(/^[A-Z]{3}$/),
  min_fee: z.number().positive(),
  max_fee: z.number().positive(),
  notes: z.string().nullable().default(null),
  source_urls: sourceUrls,
});

export const EmergencyNumberSchema = z.object({
  country_code: z.enum(COUNTRY_CODES),
  service: z.enum(["ambulance", "unified_emergency"]),
  number: z.string().regex(/^[0-9]{2,4}$/),
  name_en: z.string().min(1),
  name_ar: z.string().min(1),
  source_urls: sourceUrls,
});

export const SeedDataSchema = z.object({
  meta: z.object({
    generated_at: z.string(),
    disclaimer: z.string(),
  }),
  specialties: z.array(SpecialtySchema).min(1),
  hospitals: z.array(HospitalSchema).min(1),
  doctors: z.array(DoctorSchema).min(1),
  fee_benchmarks: z.array(FeeBenchmarkSchema),
  emergency_numbers: z.array(EmergencyNumberSchema).min(1),
});

export type SeedData = z.infer<typeof SeedDataSchema>;

export interface IntegrityReport {
  /** Broken references or duplicates: the seed must not proceed. */
  errors: string[];
  /** Data-quality issues worth fixing, but the catalog is still consistent. */
  warnings: string[];
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
}

export function checkIntegrity(data: SeedData): IntegrityReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [label, ids] of [
    ["specialty code", data.specialties.map((s) => s.code)],
    ["hospital id", data.hospitals.map((h) => h.id)],
    ["doctor id", data.doctors.map((d) => d.id)],
  ] as const) {
    for (const dup of findDuplicates([...ids])) errors.push(`duplicate ${label}: ${dup}`);
  }

  const specialtyCodes = new Set(data.specialties.map((s) => s.code));
  const hospitalsById = new Map(data.hospitals.map((h) => [h.id, h]));
  const benchmarks = new Map(data.fee_benchmarks.map((b) => [b.country_code, b]));

  for (const h of data.hospitals) {
    for (const code of h.specialty_codes) {
      if (!specialtyCodes.has(code)) errors.push(`${h.id}: unknown specialty "${code}"`);
    }
  }

  for (const d of data.doctors) {
    const hospital = hospitalsById.get(d.hospital_id);
    if (!hospital) {
      errors.push(`${d.id}: hospital "${d.hospital_id}" does not exist`);
      continue;
    }
    if (!specialtyCodes.has(d.specialty_code)) {
      errors.push(`${d.id}: unknown specialty "${d.specialty_code}"`);
    }
    if (!hospital.specialty_codes.includes(d.specialty_code)) {
      warnings.push(`${d.id}: ${d.specialty_code} is not listed as a department of ${hospital.id}`);
    }
    const benchmark = benchmarks.get(hospital.country_code);
    if (!benchmark) {
      warnings.push(`${d.id}: no fee benchmark for ${hospital.country_code}`);
    } else if (benchmark.currency !== d.currency) {
      warnings.push(`${d.id}: fee currency ${d.currency} differs from benchmark ${benchmark.currency}`);
    } else if (d.consultation_fee < benchmark.min_fee || d.consultation_fee > benchmark.max_fee) {
      warnings.push(
        `${d.id}: fee ${d.consultation_fee} ${d.currency} is outside ${benchmark.min_fee}-${benchmark.max_fee}`,
      );
    }
  }

  for (const b of data.fee_benchmarks) {
    if (b.min_fee > b.max_fee) errors.push(`fee benchmark ${b.country_code}: min_fee > max_fee`);
  }

  const cardiologists = data.doctors.filter((d) => d.specialty_code === "cardiology").length;
  if (cardiologists < 8) warnings.push(`coverage: only ${cardiologists} cardiologists (want >= 8)`);
  for (const code of specialtyCodes) {
    if (!data.doctors.some((d) => d.specialty_code === code)) {
      warnings.push(`coverage: no doctor for ${code}`);
    }
  }

  return { errors, warnings };
}

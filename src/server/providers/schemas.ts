import { z } from "zod";
import { COUNTRY_CODES, SPECIALTY_CODES } from "@/lib/catalog";

/**
 * Input contracts shared by the REST API and the agent's tools, so both entry points
 * are validated by exactly the same rules.
 */

export const DoctorSearchSchema = z.object({
  specialty: z.enum(SPECIALTY_CODES),
  city: z
    .string()
    .min(2)
    .max(60)
    .optional()
    .describe('City name in English or Arabic, e.g. "Riyadh" or "الرياض". Omit to search everywhere.'),
  country: z.enum(COUNTRY_CODES).optional(),
  language: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional()
    .describe('ISO 639-1 language the doctor must speak, e.g. "ar" or "en".'),
  second_opinion: z.boolean().optional().describe("Only doctors who offer second opinions."),
  telemedicine: z.boolean().optional().describe("Only doctors who offer video consultations."),
  max_fee: z
    .number()
    .positive()
    .optional()
    .describe("Maximum consultation fee in the local currency. Only meaningful with city or country."),
  limit: z.number().int().min(1).max(10).default(5),
});

export type DoctorSearchInput = z.input<typeof DoctorSearchSchema>;

export const EmergencySearchSchema = z.object({
  city: z.string().min(2).max(60).optional(),
  country: z.enum(COUNTRY_CODES).default("SA"),
});

export type EmergencySearchInput = z.input<typeof EmergencySearchSchema>;

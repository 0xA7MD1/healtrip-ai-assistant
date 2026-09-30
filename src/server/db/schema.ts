import { index, integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Read-only provider catalog. Built by `pnpm db:seed` from validated JSON and shipped
 * with the deployment. The app never writes to it at runtime.
 *
 * Nullable booleans mean "not verified" — the UI and the agent must not present them as facts.
 */

export const specialties = sqliteTable("specialties", {
  code: text("code").primaryKey(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

export const hospitals = sqliteTable(
  "hospitals",
  {
    id: text("id").primaryKey(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    countryCode: text("country_code").notNull(),
    // Normalized slug used for filtering ("Al Khobar" and "Khobar" both become "al-khobar").
    cityCode: text("city_code").notNull(),
    cityEn: text("city_en").notNull(),
    cityAr: text("city_ar").notNull(),
    ownership: text("ownership", {
      enum: ["government", "private", "university", "military", "nonprofit"],
    }),
    hasEmergency24x7: integer("has_24_7_emergency", { mode: "boolean" }),
    servesInternationalPatients: integer("serves_international_patients", { mode: "boolean" }),
    accreditations: text("accreditations", { mode: "json" }).$type<string[]>().notNull(),
    website: text("website"),
    sourceUrls: text("source_urls", { mode: "json" }).$type<string[]>().notNull(),
  },
  (t) => [index("hospitals_city_idx").on(t.cityCode)],
);

export const hospitalSpecialties = sqliteTable(
  "hospital_specialties",
  {
    hospitalId: text("hospital_id")
      .notNull()
      .references(() => hospitals.id),
    specialtyCode: text("specialty_code")
      .notNull()
      .references(() => specialties.code),
  },
  (t) => [primaryKey({ columns: [t.hospitalId, t.specialtyCode] })],
);

export const doctors = sqliteTable(
  "doctors",
  {
    id: text("id").primaryKey(),
    isSynthetic: integer("is_synthetic", { mode: "boolean" }).notNull(),
    nameEn: text("name_en").notNull(),
    nameAr: text("name_ar").notNull(),
    gender: text("gender", { enum: ["male", "female"] }).notNull(),
    title: text("title", { enum: ["consultant", "specialist"] }).notNull(),
    specialtyCode: text("specialty_code")
      .notNull()
      .references(() => specialties.code),
    hospitalId: text("hospital_id")
      .notNull()
      .references(() => hospitals.id),
    yearsExperience: integer("years_experience").notNull(),
    // ISO 639-1 codes, e.g. ["ar", "en"]
    languages: text("languages", { mode: "json" }).$type<string[]>().notNull(),
    consultationFee: real("consultation_fee").notNull(),
    currency: text("currency").notNull(),
    offersSecondOpinion: integer("offers_second_opinion", { mode: "boolean" }).notNull(),
    offersTelemedicine: integer("offers_telemedicine", { mode: "boolean" }).notNull(),
    nextAvailableInDays: integer("next_available_in_days").notNull(),
  },
  (t) => [
    index("doctors_specialty_idx").on(t.specialtyCode),
    index("doctors_hospital_idx").on(t.hospitalId),
  ],
);

export const feeBenchmarks = sqliteTable("fee_benchmarks", {
  countryCode: text("country_code").primaryKey(),
  currency: text("currency").notNull(),
  minFee: real("min_fee").notNull(),
  maxFee: real("max_fee").notNull(),
  notes: text("notes"),
  sourceUrls: text("source_urls", { mode: "json" }).$type<string[]>().notNull(),
});

export const emergencyNumbers = sqliteTable("emergency_numbers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryCode: text("country_code").notNull(),
  service: text("service", { enum: ["ambulance", "unified_emergency"] }).notNull(),
  number: text("number").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  sourceUrls: text("source_urls", { mode: "json" }).$type<string[]>().notNull(),
});

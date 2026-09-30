/**
 * Builds the read-only catalog (data/healtrip.db) from a raw JSON dataset.
 *
 *   pnpm db:seed                    # data/raw/seed-data.json, or the sample if it is missing
 *   pnpm db:seed path/to/file.json  # any file that follows data/PERPLEXITY_PROMPT.txt
 *
 * Invalid data fails the seed (and therefore the build): the schema and the integrity
 * checks are the gate between researched data and what the assistant is allowed to cite.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { z } from "zod";
import { toCityCode } from "../src/lib/catalog";
import * as schema from "../src/server/db/schema";
import { checkIntegrity, SeedDataSchema } from "../src/server/db/seed-data";

const DB_PATH = "data/healtrip.db";
const RESEARCHED_DATA = "data/raw/seed-data.json";
const SAMPLE_DATA = "data/raw/sample-data.json";

function readJson(file: string): unknown {
  // Research tools often wrap JSON in a markdown fence; accept that instead of failing on it.
  const raw = readFileSync(file, "utf8")
    .replace(/^﻿/, "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "");
  return JSON.parse(raw);
}

async function main() {
  const input = process.argv[2] ?? (existsSync(RESEARCHED_DATA) ? RESEARCHED_DATA : SAMPLE_DATA);
  console.log(`Seeding ${DB_PATH} from ${input}`);

  const parsed = SeedDataSchema.safeParse(readJson(input));
  if (!parsed.success) {
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
  }
  const data = parsed.data;

  const { errors, warnings } = checkIntegrity(data);
  for (const warning of warnings) console.warn(`  warn  ${warning}`);
  if (errors.length > 0) {
    for (const error of errors) console.error(`  error ${error}`);
    process.exit(1);
  }

  rmSync(DB_PATH, { force: true });
  const client = createClient({ url: `file:${DB_PATH}` });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });

  await db.transaction(async (tx) => {
    await tx.insert(schema.specialties).values(
      data.specialties.map((s) => ({ code: s.code, nameEn: s.name_en, nameAr: s.name_ar })),
    );

    await tx.insert(schema.hospitals).values(
      data.hospitals.map((h) => ({
        id: h.id,
        nameEn: h.name_en,
        nameAr: h.name_ar,
        countryCode: h.country_code,
        cityCode: toCityCode(h.city_en),
        cityEn: h.city_en,
        cityAr: h.city_ar,
        ownership: h.ownership,
        hasEmergency24x7: h.has_24_7_emergency,
        servesInternationalPatients: h.serves_international_patients,
        accreditations: h.accreditations,
        website: h.website,
        sourceUrls: h.source_urls,
      })),
    );

    await tx.insert(schema.hospitalSpecialties).values(
      data.hospitals.flatMap((h) =>
        h.specialty_codes.map((code) => ({ hospitalId: h.id, specialtyCode: code })),
      ),
    );

    await tx.insert(schema.doctors).values(
      data.doctors.map((d) => ({
        id: d.id,
        isSynthetic: d.is_synthetic,
        nameEn: d.name_en,
        nameAr: d.name_ar,
        gender: d.gender,
        title: d.title,
        specialtyCode: d.specialty_code,
        hospitalId: d.hospital_id,
        yearsExperience: d.years_experience,
        languages: d.languages,
        consultationFee: d.consultation_fee,
        currency: d.currency,
        offersSecondOpinion: d.offers_second_opinion,
        offersTelemedicine: d.offers_telemedicine,
        nextAvailableInDays: d.next_available_in_days,
      })),
    );

    if (data.fee_benchmarks.length > 0) {
      await tx.insert(schema.feeBenchmarks).values(
        data.fee_benchmarks.map((b) => ({
          countryCode: b.country_code,
          currency: b.currency,
          minFee: b.min_fee,
          maxFee: b.max_fee,
          notes: b.notes,
          sourceUrls: b.source_urls,
        })),
      );
    }

    await tx.insert(schema.emergencyNumbers).values(
      data.emergency_numbers.map((e) => ({
        countryCode: e.country_code,
        service: e.service,
        number: e.number,
        nameEn: e.name_en,
        nameAr: e.name_ar,
        sourceUrls: e.source_urls,
      })),
    );
  });

  client.close();
  console.log(
    `Done: ${data.specialties.length} specialties, ${data.hospitals.length} hospitals, ` +
      `${data.doctors.length} doctors, ${data.emergency_numbers.length} emergency numbers` +
      (warnings.length > 0 ? ` (${warnings.length} warnings)` : ""),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

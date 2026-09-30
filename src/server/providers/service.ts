import "server-only";
import { and, asc, desc, eq, inArray, lte, sql, type SQL } from "drizzle-orm";
import { NEARBY_CITIES, normalizeArabic, toCityCode, type CountryCode } from "@/lib/catalog";
import { db } from "@/server/db/client";
import { doctors, emergencyNumbers, hospitals, specialties } from "@/server/db/schema";
import {
  DoctorSearchSchema,
  EmergencySearchSchema,
  type DoctorSearchInput,
  type EmergencySearchInput,
} from "./schemas";

/**
 * The only way the app reads provider data. The REST API and the agent's tools are thin
 * adapters over these functions. Every value shown to a patient comes from here.
 */

export interface CityRef {
  code: string;
  en: string;
  ar: string;
  countryCode: string;
}

export interface DoctorCard {
  id: string;
  isSynthetic: boolean;
  name: { en: string; ar: string };
  gender: "male" | "female";
  title: "consultant" | "specialist";
  specialty: { code: string; en: string; ar: string };
  hospital: {
    id: string;
    name: { en: string; ar: string };
    city: CityRef;
    hasEmergency24x7: boolean | null;
    accreditations: string[];
  };
  yearsExperience: number;
  languages: string[];
  fee: { amount: number; currency: string };
  offersSecondOpinion: boolean;
  offersTelemedicine: boolean;
  nextAvailableInDays: number;
}

export interface DoctorSearchResult {
  doctors: DoctorCard[];
  /** Cities actually searched (the requested one, plus nearby ones if it had no match). */
  searchedCities: CityRef[];
  note: "ok" | "expanded_to_nearby_cities" | "no_match" | "unknown_city";
  /** Only set when the city was not recognised, so the caller can ask the patient. */
  knownCities?: CityRef[];
}

let cityCache: CityRef[] | undefined;

export async function listCities(): Promise<CityRef[]> {
  // The catalog is read-only for the lifetime of a deployment, so this is safe to memoize.
  cityCache ??= await db
    .selectDistinct({
      code: hospitals.cityCode,
      en: hospitals.cityEn,
      ar: hospitals.cityAr,
      countryCode: hospitals.countryCode,
    })
    .from(hospitals)
    .orderBy(asc(hospitals.countryCode), asc(hospitals.cityEn));
  return cityCache;
}

function stripArabicArticle(text: string): string {
  return text.replace(/^ال/, "");
}

export async function resolveCity(input: string): Promise<CityRef | undefined> {
  const cities = await listCities();
  const code = toCityCode(input);
  const arabic = stripArabicArticle(normalizeArabic(input.trim()));
  return cities.find(
    (c) => c.code === code || stripArabicArticle(normalizeArabic(c.ar)) === arabic,
  );
}

const doctorCardColumns = {
  doctor: doctors,
  hospital: hospitals,
  specialty: specialties,
};

type DoctorRow = {
  doctor: typeof doctors.$inferSelect;
  hospital: typeof hospitals.$inferSelect;
  specialty: typeof specialties.$inferSelect;
};

function toDoctorCard({ doctor, hospital, specialty }: DoctorRow): DoctorCard {
  return {
    id: doctor.id,
    isSynthetic: doctor.isSynthetic,
    name: { en: doctor.nameEn, ar: doctor.nameAr },
    gender: doctor.gender,
    title: doctor.title,
    specialty: { code: specialty.code, en: specialty.nameEn, ar: specialty.nameAr },
    hospital: {
      id: hospital.id,
      name: { en: hospital.nameEn, ar: hospital.nameAr },
      city: {
        code: hospital.cityCode,
        en: hospital.cityEn,
        ar: hospital.cityAr,
        countryCode: hospital.countryCode,
      },
      hasEmergency24x7: hospital.hasEmergency24x7,
      accreditations: hospital.accreditations,
    },
    yearsExperience: doctor.yearsExperience,
    languages: doctor.languages,
    fee: { amount: doctor.consultationFee, currency: doctor.currency },
    offersSecondOpinion: doctor.offersSecondOpinion,
    offersTelemedicine: doctor.offersTelemedicine,
    nextAvailableInDays: doctor.nextAvailableInDays,
  };
}

async function queryDoctors(conditions: SQL[], limit: number): Promise<DoctorCard[]> {
  const rows = await db
    .select(doctorCardColumns)
    .from(doctors)
    .innerJoin(hospitals, eq(doctors.hospitalId, hospitals.id))
    .innerJoin(specialties, eq(doctors.specialtyCode, specialties.code))
    .where(and(...conditions))
    // Deterministic ranking: soonest availability, then most experience.
    .orderBy(asc(doctors.nextAvailableInDays), desc(doctors.yearsExperience), asc(doctors.id))
    .limit(limit);
  return rows.map(toDoctorCard);
}

export async function searchDoctors(input: DoctorSearchInput): Promise<DoctorSearchResult> {
  const filters = DoctorSearchSchema.parse(input);

  const conditions: SQL[] = [eq(doctors.specialtyCode, filters.specialty)];
  if (filters.country) conditions.push(eq(hospitals.countryCode, filters.country));
  if (filters.language) {
    conditions.push(
      sql`exists (select 1 from json_each(${doctors.languages}) where json_each.value = ${filters.language})`,
    );
  }
  if (filters.second_opinion) conditions.push(eq(doctors.offersSecondOpinion, true));
  if (filters.telemedicine) conditions.push(eq(doctors.offersTelemedicine, true));
  if (filters.max_fee !== undefined) conditions.push(lte(doctors.consultationFee, filters.max_fee));

  if (!filters.city) {
    return {
      doctors: await queryDoctors(conditions, filters.limit),
      searchedCities: [],
      note: "ok",
    };
  }

  const city = await resolveCity(filters.city);
  if (!city) {
    return { doctors: [], searchedCities: [], note: "unknown_city", knownCities: await listCities() };
  }

  const inCity = await queryDoctors(
    [...conditions, eq(hospitals.cityCode, city.code)],
    filters.limit,
  );
  if (inCity.length > 0) return { doctors: inCity, searchedCities: [city], note: "ok" };

  const nearbyCodes = NEARBY_CITIES[city.code] ?? [];
  if (nearbyCodes.length > 0) {
    const nearby = await queryDoctors(
      [...conditions, inArray(hospitals.cityCode, nearbyCodes)],
      filters.limit,
    );
    if (nearby.length > 0) {
      const cities = await listCities();
      return {
        doctors: nearby,
        searchedCities: [city, ...cities.filter((c) => nearbyCodes.includes(c.code))],
        note: "expanded_to_nearby_cities",
      };
    }
  }

  return { doctors: [], searchedCities: [city], note: "no_match" };
}

/** Hydrates recommendation cards by id. Unknown ids are simply absent from the result. */
export async function getDoctorsByIds(ids: string[]): Promise<DoctorCard[]> {
  if (ids.length === 0) return [];
  const cards = await queryDoctors([inArray(doctors.id, ids)], ids.length);
  // Preserve the order the caller asked for.
  return ids.flatMap((id) => cards.find((c) => c.id === id) ?? []);
}

export interface EmergencyFacility {
  id: string;
  name: { en: string; ar: string };
  city: CityRef;
  website: string | null;
}

export interface EmergencyInfo {
  country: CountryCode;
  numbers: { number: string; service: string; name: { en: string; ar: string } }[];
  facilities: EmergencyFacility[];
}

export async function findEmergencyFacilities(input: EmergencySearchInput): Promise<EmergencyInfo> {
  const filters = EmergencySearchSchema.parse(input);
  const city = filters.city ? await resolveCity(filters.city) : undefined;
  const country = (city?.countryCode as CountryCode | undefined) ?? filters.country;

  const [numberRows, facilityRows] = await Promise.all([
    db.select().from(emergencyNumbers).where(eq(emergencyNumbers.countryCode, country)),
    db
      .select()
      .from(hospitals)
      .where(
        and(
          // Only hospitals whose 24/7 emergency department is verified; null means unknown.
          eq(hospitals.hasEmergency24x7, true),
          city ? eq(hospitals.cityCode, city.code) : eq(hospitals.countryCode, country),
        ),
      )
      .orderBy(asc(hospitals.cityEn), asc(hospitals.nameEn)),
  ]);

  return {
    country,
    numbers: numberRows.map((n) => ({
      number: n.number,
      service: n.service,
      name: { en: n.nameEn, ar: n.nameAr },
    })),
    facilities: facilityRows.map((h) => ({
      id: h.id,
      name: { en: h.nameEn, ar: h.nameAr },
      city: { code: h.cityCode, en: h.cityEn, ar: h.cityAr, countryCode: h.countryCode },
      website: h.website,
    })),
  };
}

export async function countDoctors(): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(doctors);
  return row?.n ?? 0;
}

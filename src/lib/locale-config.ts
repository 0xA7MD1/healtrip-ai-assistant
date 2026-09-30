/**
 * Locale constants shared by the server layout and client components. Kept out of the
 * "use client" module so the server can call them instead of receiving client references.
 */

export type Locale = "ar" | "en";

/** Arabic is the default. English is one toggle away. */
export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_COOKIE = "locale";

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function parseLocale(value: string | undefined): Locale {
  return value === "en" || value === "ar" ? value : DEFAULT_LOCALE;
}

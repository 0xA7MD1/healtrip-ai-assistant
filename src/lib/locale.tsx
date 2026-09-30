"use client";

import { createContext, useContext } from "react";
import type { Bilingual } from "./agent-contracts";

/**
 * UI language. Arabic is the default (HealTrip+ is a Saudi product); English is one toggle
 * away. The provider that sets the value, the toggle and the `dir` attribute live in the
 * app shell; components only read the value through `useLocale()`.
 */

export type Locale = "ar" | "en";

export const DEFAULT_LOCALE: Locale = "ar";

export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Picks the right side of a bilingual catalog value, e.g. `localized(doctor.name, locale)`. */
export function localized(value: Bilingual, locale: Locale): string {
  return value[locale];
}

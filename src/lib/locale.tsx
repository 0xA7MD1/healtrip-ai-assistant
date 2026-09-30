"use client";

import { createContext, useContext } from "react";
import type { Bilingual } from "./agent-contracts";
import { DEFAULT_LOCALE, type Locale } from "./locale-config";

/**
 * UI language context. The provider that sets the value, the toggle and the `dir` attribute
 * live in the app shell; components only read the value through `useLocale()`.
 */

export { DEFAULT_LOCALE, dirFor, type Locale } from "./locale-config";

export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Picks the right side of a bilingual catalog value, e.g. `localized(doctor.name, locale)`. */
export function localized(value: Bilingual, locale: Locale): string {
  return value[locale];
}

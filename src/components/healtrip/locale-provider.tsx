"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LocaleContext } from "@/lib/locale";
import { dirFor, LOCALE_COOKIE, type Locale } from "@/lib/locale-config";

const SetLocaleContext = createContext<(locale: Locale) => void>(() => {});

export function useSetLocale() {
  return useContext(SetLocaleContext);
}

/**
 * Holds the UI language. The server reads the same cookie to render the right `lang`/`dir`
 * on first paint; switching updates the document immediately and persists for next time.
 */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    document.documentElement.dir = dirFor(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return (
    <LocaleContext.Provider value={locale}>
      <SetLocaleContext.Provider value={setLocale}>
        <DirectionProvider direction={dirFor(locale)}>{children}</DirectionProvider>
      </SetLocaleContext.Provider>
    </LocaleContext.Provider>
  );
}

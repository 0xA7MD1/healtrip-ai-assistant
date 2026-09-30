"use client";

import { AuiIf, useAui } from "@assistant-ui/react";
import { LanguagesIcon, SquarePenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale";
import { useSetLocale } from "./locale-provider";

/** Minimal top bar: no branding, just a new-chat action and the language switch. */
export function ChatHeader() {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const aui = useAui();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-2 px-4">
      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <Button variant="ghost" size="sm" onClick={() => aui.thread().reset()}>
          <SquarePenIcon data-icon="inline-start" />
          {t.newChat}
        </Button>
      </AuiIf>
      <Button
        variant="outline"
        size="sm"
        className="bg-card rounded-full"
        aria-label={t.languageToggleLabel}
        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
      >
        <LanguagesIcon data-icon="inline-start" />
        <span lang={locale === "ar" ? "en" : "ar"}>{t.languageToggle}</span>
      </Button>
    </header>
  );
}

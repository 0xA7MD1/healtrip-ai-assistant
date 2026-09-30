"use client";

import { ExternalLinkIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EmergencyInfo } from "@/lib/agent-contracts";
import { useT } from "@/lib/i18n";
import { localized, useLocale } from "@/lib/locale";

export function EmergencyBanner({ info }: { info: EmergencyInfo }) {
  const t = useT();
  const locale = useLocale();

  return (
    <Alert
      variant="destructive"
      role="alert"
      className="my-3 border-red-200 bg-red-50 px-4 py-4 dark:border-red-500/30 dark:bg-red-500/10"
    >
      <TriangleAlertIcon />
      <AlertTitle className="text-base font-bold text-red-800 dark:text-red-200">{t.emergencyTitle}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-red-900/90 dark:text-red-100/90">
        <p>{t.emergencyBody}</p>

        <div className="flex flex-wrap gap-2">
          {info.numbers.map((n, i) => (
            <Button
              key={n.number}
              nativeButton={false}
              render={<a href={`tel:${n.number}`} />}
              size="lg"
              variant={i === 0 ? "destructive" : "outline"}
              className={
                i === 0
                  ? "h-11 rounded-full bg-red-600 px-5 text-base font-bold text-white shadow-md shadow-red-600/20 hover:bg-red-700"
                  : "h-11 rounded-full border-red-200 bg-white px-4 text-red-700 hover:bg-red-100 dark:bg-transparent"
              }
            >
              <PhoneIcon data-icon="inline-start" />
              <span dir="ltr">{t.call(n.number)}</span>
              <span className="text-xs font-normal opacity-80">· {localized(n.name, locale)}</span>
            </Button>
          ))}
        </div>

        {info.facilities.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-red-800 dark:text-red-200">{t.emergencyFacilities}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {info.facilities.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{localized(f.name, locale)}</span>
                  <span className="text-xs opacity-75">{localized(f.city, locale)}</span>
                  {f.website && (
                    <a
                      href={f.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-xs underline underline-offset-2"
                    >
                      {t.website}
                      <ExternalLinkIcon className="size-3" aria-hidden />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

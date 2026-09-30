"use client";

import { ExternalLinkIcon, PhoneIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmergencyInfo } from "@/lib/agent-contracts";
import { useT } from "@/lib/i18n";
import { localized } from "@/lib/locale";
import { useLocale } from "@/lib/locale";

export function EmergencyBanner({ info }: { info: EmergencyInfo }) {
  const t = useT();
  const locale = useLocale();
  const [primary, ...rest] = info.numbers;

  return (
    <section
      role="alert"
      className="my-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm dark:border-red-500/30 dark:bg-red-500/10"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
          <TriangleAlertIcon className="size-5 text-red-600 dark:text-red-300" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h3 className="text-base font-bold text-red-800 dark:text-red-200">{t.emergencyTitle}</h3>
          <p className="mt-1 text-sm leading-relaxed text-red-900/90 dark:text-red-100/90">
            {t.emergencyBody}
          </p>
        </div>
      </div>

      {primary && (
        <div className="mt-4 flex justify-center">
          <span className="rounded-full bg-gradient-to-l from-red-100 to-red-200 p-1.5 dark:from-red-500/20 dark:to-red-500/30">
            <Button
              nativeButton={false}
              render={<a href={`tel:${primary.number}`} />}
              size="lg"
              variant="destructive"
              className="h-auto min-h-11 rounded-full bg-red-600 px-7 py-3 text-[15px] font-bold whitespace-normal text-white no-underline! shadow-lg shadow-red-600/20 hover:bg-red-700"
            >
              <PhoneIcon data-icon="inline-start" />
              <span dir="ltr">{t.call(primary.number)}</span>
              <span className="text-xs font-normal opacity-80">· {localized(primary.name, locale)}</span>
            </Button>
          </span>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {rest.map((n) => (
            <Button
              key={n.number}
              nativeButton={false}
              render={<a href={`tel:${n.number}`} />}
              size="sm"
              variant="outline"
              className="h-auto min-h-9 rounded-full border-red-200 bg-white px-4 py-1.5 whitespace-normal text-red-700 no-underline! hover:bg-red-100 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/20"
            >
              <PhoneIcon data-icon="inline-start" />
              <span dir="ltr">{t.call(n.number)}</span>
              <span className="text-xs font-normal opacity-80">· {localized(n.name, locale)}</span>
            </Button>
          ))}
        </div>
      )}

      {info.facilities.length > 0 && (
        <div className="mt-4 text-start">
          <p className="mb-1.5 text-xs font-semibold text-red-800 dark:text-red-200">
            {t.emergencyFacilities}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-red-900/90 dark:text-red-100/90">
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
    </section>
  );
}

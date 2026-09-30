"use client";

import { ArrowRightLeftIcon, SearchXIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { CityRef, RecommendationResult } from "@/lib/agent-contracts";
import { useT } from "@/lib/i18n";
import { localized, useLocale, type Locale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { DoctorCard } from "./doctor-card";

function cityList(cities: CityRef[], locale: Locale): string {
  return cities.map((c) => localized(c, locale)).join(locale === "ar" ? " و" : ", ");
}

export function RecommendationCard({ result }: { result: RecommendationResult }) {
  const t = useT();
  const locale = useLocale();
  const specialty = localized(result.specialty, locale);

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        className={cn(
          result.urgency === "urgent"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
        )}
      >
        {t.urgency[result.urgency]}
      </Badge>
      <span className="text-foreground text-sm font-semibold">{t.nextStep[result.nextStep]}</span>
    </div>
  );

  if (result.status === "no_match") {
    return (
      <section className="my-3 flex flex-col gap-3">
        {header}
        <Empty className="bg-card border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>
              {t.noMatchTitle(specialty, cityList(result.searchedCities, locale) || t.everywhere)}
            </EmptyTitle>
            <EmptyDescription>{t.noMatchDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  const [requested, ...nearby] = result.searchedCities;

  return (
    <section className="my-3 flex flex-col gap-3">
      {header}
      <div>
        <h3 className="text-foreground text-base font-semibold">{t.recommendedDoctors(specialty)}</h3>
        <p className="text-muted-foreground text-xs">{t.fromCatalog}</p>
      </div>
      {result.expandedToNearby && requested && nearby.length > 0 && (
        <Alert>
          <ArrowRightLeftIcon />
          <AlertDescription>
            {t.expandedNote(localized(requested, locale), cityList(nearby, locale))}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 @md:grid-cols-2 @3xl:grid-cols-3">
        {result.doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </section>
  );
}

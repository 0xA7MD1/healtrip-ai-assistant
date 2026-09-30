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

  const badges = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge
        className={cn(
          "rounded-full px-4 py-1.5 text-[13px] font-semibold",
          result.urgency === "urgent"
            ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
        )}
      >
        {t.urgency[result.urgency]}
      </Badge>
      <Badge variant="outline" className="rounded-full px-4 py-1.5 text-[13px] font-medium">
        {t.nextStep[result.nextStep]}
      </Badge>
    </div>
  );

  if (result.status === "no_match") {
    return (
      <section className="my-4 flex flex-col gap-4">
        <div className="text-center">
          <h2 className="text-foreground text-xl font-bold">{t.recommendedDoctors(specialty)}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t.fromCatalog}</p>
        </div>
        {badges}
        <Empty className="bg-card rounded-2xl border shadow-sm">
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
    <section className="my-4 flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-foreground text-xl font-bold">{t.recommendedDoctors(specialty)}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{t.fromCatalog}</p>
      </div>
      {badges}
      {result.expandedToNearby && requested && nearby.length > 0 && (
        <Alert className="rounded-xl">
          <ArrowRightLeftIcon />
          <AlertDescription>
            {t.expandedNote(localized(requested, locale), cityList(nearby, locale))}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 @md:grid-cols-2 @3xl:grid-cols-3">
        {result.doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
    </section>
  );
}

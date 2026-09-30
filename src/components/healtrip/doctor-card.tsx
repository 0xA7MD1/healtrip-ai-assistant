"use client";

import { BadgeCheckIcon, Building2Icon, CalendarClockIcon, LanguagesIcon, MapPinIcon, SirenIcon, VideoIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DoctorCard as Doctor } from "@/lib/agent-contracts";
import { intlLocale, useT } from "@/lib/i18n";
import { localized, useLocale } from "@/lib/locale";

function initials(name: string): string {
  return name
    .replace(/^(Dr\.?|د\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/^(Al-|ال)/, "")[0])
    .join("");
}

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const t = useT();
  const locale = useLocale();
  const name = localized(doctor.name, locale);

  const fee = new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: doctor.fee.currency,
    maximumFractionDigits: 0,
  }).format(doctor.fee.amount);
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });
  const languages = doctor.languages.map((code) => languageNames.of(code) ?? code).join("، ");
  const availability =
    doctor.nextAvailableInDays === 0
      ? t.availableToday
      : doctor.nextAvailableInDays === 1
        ? t.availableTomorrow
        : t.availableIn(doctor.nextAvailableInDays);

  return (
    <Card size="sm" className="h-full gap-3 transition-shadow hover:shadow-md">
      <CardHeader className="flex items-start gap-3">
        <Avatar size="lg" className="rounded-xl after:rounded-xl">
          <AvatarFallback className="bg-primary/10 text-primary rounded-xl font-semibold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[15px] leading-tight font-semibold">{name}</p>
          <p className="text-primary mt-1 flex items-center gap-1 text-xs font-medium">
            {doctor.title === "consultant" ? t.consultant : t.specialist} · {localized(doctor.specialty, locale)}
            <BadgeCheckIcon className="size-3.5 shrink-0" aria-hidden />
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{t.yearsExperience(doctor.yearsExperience)}</p>
        </div>
      </CardHeader>

      <CardContent className="text-muted-foreground flex flex-col gap-1.5 text-xs">
        <p className="flex items-center gap-1.5">
          <Building2Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="text-foreground truncate">{localized(doctor.hospital.name, locale)}</span>
        </p>
        <p className="flex items-center gap-1.5">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
          {localized(doctor.hospital.city, locale)}
          {doctor.hospital.accreditations.length > 0 && (
            <span className="truncate">· {doctor.hospital.accreditations.join(", ")}</span>
          )}
        </p>
        <p className="flex items-center gap-1.5">
          <LanguagesIcon className="size-3.5 shrink-0" aria-hidden />
          {t.speaks}: {languages}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {doctor.offersSecondOpinion && <Badge variant="secondary">{t.secondOpinion}</Badge>}
          {doctor.offersTelemedicine && (
            <Badge variant="secondary">
              <VideoIcon aria-hidden />
              {t.telemedicine}
            </Badge>
          )}
          {doctor.hospital.hasEmergency24x7 && (
            <Badge variant="secondary">
              <SirenIcon aria-hidden />
              {t.er24}
            </Badge>
          )}
          {doctor.isSynthetic && (
            <Tooltip>
              <TooltipTrigger render={<Badge variant="outline" className="cursor-help" />}>
                {t.sampleProfile}
              </TooltipTrigger>
              <TooltipContent>{t.sampleProfileHint}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2 border-t pt-3 pb-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <CalendarClockIcon className="size-3.5" aria-hidden />
          {availability}
        </span>
        <span className="text-muted-foreground">
          {t.consultationFee} <span className="text-foreground font-semibold tabular-nums">{fee}</span>
        </span>
      </CardFooter>
    </Card>
  );
}

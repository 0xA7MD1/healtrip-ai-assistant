"use client";

import { AwardIcon, BadgeCheckIcon, LanguagesIcon, MapPinIcon, SirenIcon, VideoIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DoctorCard as Doctor } from "@/lib/agent-contracts";
import { intlLocale, useT } from "@/lib/i18n";
import { localized, useLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .replace(/^(Dr\.?|د\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/^(Al-|ال)/, "")[0])
    .join("");
}

/** Stable avatar color per doctor, like the design mockup (teal / indigo / rose). */
const AVATAR_COLORS = [
  "bg-teal-600",
  "bg-indigo-500",
  "bg-rose-500",
  "bg-emerald-600",
  "bg-sky-600",
  "bg-violet-500",
];

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
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
  const languages = doctor.languages.map((code) => languageNames.of(code) ?? code).join(locale === "ar" ? "، " : ", ");
  const availability =
    doctor.nextAvailableInDays === 0
      ? t.availableToday
      : doctor.nextAvailableInDays === 1
        ? t.availableTomorrow
        : t.availableIn(doctor.nextAvailableInDays);

  return (
    <Card
      size="sm"
      className="h-full gap-0 rounded-2xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <CardHeader className="flex-row items-start gap-4 p-0">
        <Avatar size="lg" className="size-14 shrink-0 rounded-2xl after:rounded-2xl">
          <AvatarFallback
            className={cn("rounded-2xl text-xl font-bold text-white shadow-sm", avatarColor(doctor.id))}
          >
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-foreground truncate text-base leading-snug font-bold">{name}</p>
          <p className="text-primary mt-1 flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">
              {doctor.title === "consultant" ? t.consultant : t.specialist} ·{" "}
              {localized(doctor.specialty, locale)}
            </span>
            <BadgeCheckIcon className="size-4 shrink-0" aria-hidden />
          </p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[13px]">
            <span className="truncate">{localized(doctor.hospital.name, locale)}</span>
            <BadgeCheckIcon className="size-4 shrink-0 opacity-60" aria-hidden />
          </p>
        </div>
      </CardHeader>

      <CardContent className="mt-4 flex flex-col gap-3 p-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            {availability}
          </span>
          <span className="flex-1" aria-hidden />
          <span className="text-muted-foreground text-sm tabular-nums">
            {t.consultationFee}{" "}
            <span className="text-foreground font-bold">{fee}</span>
          </span>
        </div>

        <div className="text-muted-foreground flex flex-col gap-2 text-[13px] leading-relaxed">
          <p className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {localized(doctor.hospital.city, locale)}
              {doctor.hospital.accreditations.length > 0 && (
                <> · {doctor.hospital.accreditations.join(", ")}</>
              )}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <AwardIcon className="size-4 shrink-0" aria-hidden />
            {t.yearsExperience(doctor.yearsExperience)}
          </p>
          <p className="flex items-center gap-2">
            <LanguagesIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">
              {t.speaks}: {languages}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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
    </Card>
  );
}

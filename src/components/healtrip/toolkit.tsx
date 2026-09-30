"use client";

import { defineToolkit } from "@assistant-ui/react";
import { ActivityIcon, SearchIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DoctorSearchResult,
  EmergencyInfo,
  RecommendationResult,
  UrgencyAssessment,
} from "@/lib/agent-contracts";
import { TOOL_NAMES } from "@/lib/agent-contracts";
import { useT } from "@/lib/i18n";
import { localized, useLocale } from "@/lib/locale";
import { EmergencyBanner } from "./emergency-banner";
import { RecommendationCard } from "./recommendation-card";
import { ToolStep, type StepState } from "./tool-step";

/**
 * How the chat renders the agent's tool calls. The tools run on the server; the UI only
 * renders their results. Assessment and search are one-line steps inside the collapsible
 * "analysis steps" group; the recommendation and the SOS banner stand on their own.
 */

type Status = { type: string; reason?: string };

function stepState(status: Status): StepState {
  if (status.type === "running") return "running";
  if (status.type === "incomplete") return "error";
  return "done";
}

function AssessStep({ result, status }: { result?: UrgencyAssessment; status: Status }) {
  const t = useT();
  const state = stepState(status);
  return (
    <ToolStep icon={ActivityIcon} state={state} detail={result && t.urgency[result.urgency]}>
      {state === "running" ? t.assessing : state === "error" ? t.toolFailed : t.assessed}
    </ToolStep>
  );
}

function SearchStep({
  args,
  result,
  status,
}: {
  args?: { specialty?: string };
  result?: DoctorSearchResult;
  status: Status;
}) {
  const t = useT();
  const locale = useLocale();
  const state = stepState(status);
  let label: string = state === "error" ? t.toolFailed : t.searching;
  if (state === "done" && result) {
    const specialty = result.doctors[0] ? localized(result.doctors[0].specialty, locale) : (args?.specialty ?? "");
    const cities = result.searchedCities.map((c) => localized(c, locale)).join(locale === "ar" ? "، " : ", ");
    label = result.note === "unknown_city" ? t.unknownCity : t.searched(specialty, cities, result.doctors.length);
  }
  return (
    <ToolStep icon={SearchIcon} state={state}>
      {label}
    </ToolStep>
  );
}

function PendingCard() {
  return (
    <div className="my-3 grid gap-3 @md:grid-cols-2">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export const toolkit = defineToolkit({
  [TOOL_NAMES.assessUrgency]: {
    type: "backend",
    render: ({ result, status }) => <AssessStep result={result as UrgencyAssessment | undefined} status={status} />,
  },
  [TOOL_NAMES.searchProviders]: {
    type: "backend",
    render: ({ args, result, status }) => (
      <SearchStep
        args={args as { specialty?: string }}
        result={result as DoctorSearchResult | undefined}
        status={status}
      />
    ),
  },
  [TOOL_NAMES.findEmergencyFacilities]: {
    type: "backend",
    display: "standalone",
    render: ({ result, status }) =>
      status.type === "running" || !result ? <PendingCard /> : <EmergencyBanner info={result as EmergencyInfo} />,
  },
  [TOOL_NAMES.presentRecommendation]: {
    type: "backend",
    display: "standalone",
    // A rejected recommendation is fixed by the agent in the next step; nothing to show.
    render: ({ result, status }) =>
      status.type === "running" ? (
        <PendingCard />
      ) : status.type === "incomplete" || !result ? null : (
        <RecommendationCard result={result as RecommendationResult} />
      ),
  },
});

"use client";

import { CircleAlertIcon, CircleCheckIcon, LoaderCircleIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StepState = "running" | "done" | "error";

/** One line in the collapsible "analysis steps" group, styled like the design mockup. */
export function ToolStep({
  icon: Icon,
  state,
  children,
  detail,
}: {
  icon: LucideIcon;
  state: StepState;
  children: ReactNode;
  detail?: ReactNode;
}) {
  const StatusIcon = state === "running" ? LoaderCircleIcon : state === "error" ? CircleAlertIcon : CircleCheckIcon;
  return (
    <div className="flex items-center gap-2.5 py-1 text-[13px]">
      <StatusIcon
        className={cn(
          "size-4 shrink-0",
          state === "running" && "text-muted-foreground animate-spin",
          state === "done" && "text-primary",
          state === "error" && "text-destructive",
        )}
        aria-hidden
      />
      <span className="bg-accent border-primary/15 flex size-6 shrink-0 items-center justify-center rounded-md border">
        <Icon className="text-primary size-3.5" aria-hidden />
      </span>
      <span className={cn("min-w-0 flex-1", state === "running" ? "text-muted-foreground" : "text-foreground")}>
        {children}
      </span>
      {detail && <span className="text-muted-foreground shrink-0 text-xs">{detail}</span>}
    </div>
  );
}

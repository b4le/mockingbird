"use client";

import { useMemo } from "react";
import Link from "next/link";
import { parseDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { TIMELINE_TYPE_ICONS } from "@/lib/constants";
import { buildStakeholderMap } from "@/lib/stakeholders";
import type { TimelineEvent, Stakeholder } from "@/types";

interface RecentActivityProps {
  events: TimelineEvent[];
  stakeholders: Stakeholder[];
}

export function RecentActivity({ events, stakeholders }: RecentActivityProps) {
  const stakeholderMap = useMemo(() => buildStakeholderMap(stakeholders), [stakeholders]);
  const recent = [...events]
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Link
            href="/timeline"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all &rarr;
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recent.map((event) => (
          <div key={event.id} className="flex items-start gap-3">
            <span className="mt-0.5 text-base" role="img" aria-label={event.type}>
              {TIMELINE_TYPE_ICONS[event.type] ?? "📌"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{event.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <DateDisplay date={event.date} />
                <div className="flex -space-x-1">
                  {event.stakeholderIds.slice(0, 3).map((id) => {
                    const s = stakeholderMap.get(id);
                    return s ? (
                      <StakeholderAvatar key={id} stakeholder={s} size="sm" />
                    ) : null;
                  })}
                  {event.stakeholderIds.length > 3 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                      +{event.stakeholderIds.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

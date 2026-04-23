"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsClient } from "@/hooks/useIsClient";
import { parseDate } from "@/lib/dates";

function formatRelative(dateStr: string): string {
  const date = parseDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return "tomorrow";
    if (absDays < 7) return `in ${absDays} days`;
    if (absDays < 30) return `in ${Math.floor(absDays / 7)} weeks`;
    return `in ${Math.floor(absDays / 30)} months`;
  }
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function formatAbsolute(dateStr: string): string {
  return parseDate(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DateDisplay({ date }: { date: string | null }) {
  // Server renders absolute date; client swaps to relative on mount — the
  // hydration mismatch is intentional, so `suppressHydrationWarning` below
  // is load-bearing.
  const mounted = useIsClient();

  if (date === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (!mounted) {
    return <span className="text-sm text-muted-foreground" suppressHydrationWarning>{formatAbsolute(date)}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="text-sm text-muted-foreground">
        {formatRelative(date)}
      </TooltipTrigger>
      <TooltipContent>{formatAbsolute(date)}</TooltipContent>
    </Tooltip>
  );
}

"use client";

import { forwardRef } from "react";
import { HelpCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptToolbarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  matchIndex?: number;
  matchCount?: number;
  /** Free-form counter text. When provided, replaces the default `N of M` rendering. */
  matchCounterText?: string;
  onPrevMatch?: () => void;
  onNextMatch?: () => void;
  onClearSearch?: () => void;
  followAudio?: boolean;
  onFollowAudioChange?: (next: boolean) => void;
  onOpenHelp?: () => void;
  className?: string;
}

export const TranscriptToolbar = forwardRef<
  HTMLInputElement,
  TranscriptToolbarProps
>(function TranscriptToolbar(
  {
    searchQuery = "",
    onSearchChange,
    matchIndex = 0,
    matchCount = 0,
    matchCounterText,
    onPrevMatch,
    onNextMatch,
    onClearSearch,
    followAudio,
    onFollowAudioChange,
    onOpenHelp,
    className,
  },
  searchInputRef,
) {
  const hasMatchNav = Boolean(onPrevMatch || onNextMatch);
  const counterText =
    matchCounterText !== undefined
      ? matchCounterText
      : matchCount > 0
        ? `${matchIndex + 1} of ${matchCount}`
        : "0 of 0";

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        onPrevMatch?.();
      } else {
        onNextMatch?.();
      }
      return;
    }
    if (event.key === "Escape") {
      if (onClearSearch) {
        event.preventDefault();
        onClearSearch();
        event.currentTarget.blur();
      }
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b bg-background/80 px-2 py-1.5",
        className,
      )}
    >
      <div className="relative flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search transcript"
          aria-label="Search transcript"
          className="h-8 w-full rounded-md border bg-background pl-7 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {hasMatchNav ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Previous match"
            onClick={onPrevMatch}
            disabled={!onPrevMatch || matchCount === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">&uarr;</span>
          </button>
          <button
            type="button"
            aria-label="Next match"
            onClick={onNextMatch}
            disabled={!onNextMatch || matchCount === 0}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span aria-hidden="true">&darr;</span>
          </button>
        </div>
      ) : null}
      {onFollowAudioChange ? (
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={followAudio ?? false}
            onChange={(e) => onFollowAudioChange(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          Follow audio
        </label>
      ) : null}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
      >
        {counterText}
      </div>
      {onOpenHelp ? (
        <button
          type="button"
          aria-label="Show keyboard shortcuts"
          onClick={onOpenHelp}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
});

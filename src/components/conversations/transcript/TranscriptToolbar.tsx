"use client";

import { forwardRef, useCallback, useRef, useState } from "react";
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

  // Mobile-only collapse state. On <md the search input is hidden behind a
  // search-icon trigger; tapping the icon expands the input inline. On
  // blurring with an empty query we collapse back to the icon. md+ ignores
  // this state entirely (CSS forces the input visible).
  const [searchExpandedMobile, setSearchExpandedMobile] = useState(false);

  // Hold a local ref to the input so we can focus it when the mobile
  // trigger is tapped. We also forward the same node to the parent ref via
  // a callback ref, supporting both object-refs and callback-refs.
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      localInputRef.current = node;
      if (typeof searchInputRef === "function") {
        searchInputRef(node);
      } else if (searchInputRef) {
        searchInputRef.current = node;
      }
    },
    [searchInputRef],
  );

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

  const handleSearchBlur = () => {
    // Collapse back to the icon on mobile only when the query is empty.
    // (md+ doesn't render the trigger, so this state is a no-op there.)
    if (!searchQuery) {
      setSearchExpandedMobile(false);
    }
  };

  const handleExpandSearchMobile = () => {
    setSearchExpandedMobile(true);
    // Defer focus to next tick so the input has been revealed by React
    // before we try to focus it (otherwise focus would fail on a hidden
    // input on slower devices).
    queueMicrotask(() => {
      localInputRef.current?.focus();
    });
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b bg-background/80 px-2 py-1.5",
        className,
      )}
    >
      {/* Mobile-only search trigger: visible <md when search is collapsed. */}
      {!searchExpandedMobile ? (
        <button
          type="button"
          aria-label="Open search"
          aria-expanded={false}
          onClick={handleExpandSearchMobile}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <Search aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {/* Search input wrapper: always visible md+; on <md only visible when expanded. */}
      <div
        className={cn(
          "relative min-w-0 flex-1 md:flex",
          searchExpandedMobile ? "flex" : "hidden",
        )}
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={setInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
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
        className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
      >
        {counterText}
      </div>
      {onOpenHelp ? (
        <button
          type="button"
          aria-label="Show keyboard shortcuts"
          onClick={onOpenHelp}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
        >
          <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
});

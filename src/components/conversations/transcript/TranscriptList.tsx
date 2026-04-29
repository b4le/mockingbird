"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {
  observeElementRect,
  observeElementOffset,
  type Virtualizer,
} from "@tanstack/virtual-core";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Stakeholder, TranscriptCue as TranscriptCueModel } from "@/types";
import { cn } from "@/lib/utils";
import { TranscriptTurn } from "./TranscriptTurn";
import { buildTurns, findTurnIndexForCue } from "./turns";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

const FALLBACK_VIEWPORT = { width: 800, height: 600 } as const;

function observeRectWithFallback<TScroll extends Element, TItem extends Element>(
  instance: Virtualizer<TScroll, TItem>,
  cb: (rect: { width: number; height: number }) => void,
) {
  return observeElementRect(instance, (rect) => {
    if (rect.height === 0 && rect.width === 0) {
      cb(FALLBACK_VIEWPORT);
      return;
    }
    cb(rect);
  });
}

export interface TranscriptListHandle {
  scrollToCueIndex: (index: number) => void;
}

interface TranscriptListProps {
  cues: TranscriptCueModel[];
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
  activeCueIndex?: number | null;
  searchRangesByCue?: ReadonlyMap<number, [number, number][]>;
  currentMatchCueIndex?: number | null;
  onSeek?: (ms: number) => void;
  onUserScroll?: () => void;
  className?: string;
}

export const TranscriptList = forwardRef<
  TranscriptListHandle,
  TranscriptListProps
>(function TranscriptList(
  {
    cues,
    speakerStakeholderMap,
    activeCueIndex,
    searchRangesByCue,
    currentMatchCueIndex,
    onSeek,
    onUserScroll,
    className,
  },
  ref,
) {
  const turns = useMemo(() => buildTurns(cues), [cues]);
  const parentRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 6,
    // Non-zero default rect for SSR / test environments where the scroll
    // element reports 0x0 — without this the window is empty and nothing
    // renders, including in the test DOM (happy-dom's ResizeObserver is a
    // no-op stub).
    initialRect: FALLBACK_VIEWPORT,
    observeElementRect: observeRectWithFallback,
    observeElementOffset,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToCueIndex: (cueIndex: number) => {
        const turnIdx = findTurnIndexForCue(turns, cueIndex);
        if (turnIdx == null) return;
        virtualizer.scrollToIndex(turnIdx, {
          align: "center",
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      },
    }),
    [turns, virtualizer, prefersReducedMotion],
  );

  // Wheel and touchstart are the simplest reliable proxies for
  // user-driven scroll: they only fire from real input devices, never
  // from `scrollToIndex`/`scrollTo` programmatic calls. Using the
  // scroll event itself would require distinguishing programmatic vs
  // user scrolls, which the browser doesn't expose.
  useEffect(() => {
    const el = parentRef.current;
    if (!el || !onUserScroll) return;
    const handler = () => onUserScroll();
    el.addEventListener("wheel", handler, { passive: true });
    el.addEventListener("touchstart", handler, { passive: true });
    return () => {
      el.removeEventListener("wheel", handler);
      el.removeEventListener("touchstart", handler);
    };
  }, [onUserScroll]);

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("relative h-full overflow-auto", className)}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualItem) => {
          const turn = turns[virtualItem.index];
          const stakeholder = speakerStakeholderMap.get(turn.speakerLabel);
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="px-3"
            >
              <TranscriptTurn
                turn={turn}
                cues={cues}
                stakeholder={stakeholder}
                activeCueIndex={activeCueIndex}
                searchRangesByCue={searchRangesByCue}
                currentMatchCueIndex={currentMatchCueIndex}
                onSeek={onSeek}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

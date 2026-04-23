"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Stakeholder } from "@/types";

interface StakeholderAvatarProps {
  stakeholder: Stakeholder;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const sizes = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

/**
 * Renders a tooltip-wrapped avatar for a stakeholder.
 *
 * - With `onClick`: the trigger is a `<button>` (interactive, focusable).
 * - Without `onClick`: the trigger is a `<span>` (non-interactive, no focus stop).
 *
 * **Contract:** do NOT pass `onClick` when this avatar is nested inside a caller's
 * `<button>` — that reintroduces the nested-button hydration error fixed in
 * `fix(communications): avoid nested <button> hydration in StakeholderAvatar`.
 */
export function StakeholderAvatar({
  stakeholder,
  size = "md",
  onClick,
}: StakeholderAvatarProps) {
  // When there's no onClick, render the trigger as a <span>. This both
  //   (1) avoids a useless focus stop on a button with no action, and
  //   (2) prevents nested-button hydration errors when callers wrap the
  //       avatar in their own <button> (e.g. the participant pill in
  //       CommunicationDetail).
  // Base UI's `render` prop swaps the underlying element while preserving
  // tooltip wiring (pointer/focus handlers still work on any element).
  // NOTE: This relies on TooltipTrigger in Base UI 1.3 having no `nativeButton`
  // prop (unlike Popover/Dialog trigger + close, which do). If a future Base UI
  // release adds one, swapping render={<span />} here may start leaking a
  // `nativeButton` attribute to the DOM — revisit then.
  const interactive = typeof onClick === "function";
  return (
    <Tooltip>
      <TooltipTrigger
        {...(interactive ? { onClick } : { render: <span /> })}
        className={`${sizes[size]} relative inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] ${interactive ? "cursor-pointer" : ""}`}
        style={{ backgroundColor: stakeholder.colour }}
      >
        {stakeholder.initials}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{stakeholder.name}</p>
        <p className="text-xs text-muted-foreground">{stakeholder.role}</p>
      </TooltipContent>
    </Tooltip>
  );
}

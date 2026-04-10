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

export function StakeholderAvatar({
  stakeholder,
  size = "md",
  onClick,
}: StakeholderAvatarProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ${onClick ? "cursor-pointer" : ""}`}
        style={{ backgroundColor: stakeholder.colour }}
        onClick={onClick}
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

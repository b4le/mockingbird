import { Badge } from "@/components/ui/badge";
import type { ActionStatus, RiskStatus } from "@/types";

const actionVariants: Record<ActionStatus, string> = {
  done: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  todo: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  blocked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const riskVariants: Record<RiskStatus, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  mitigated: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  accepted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const claimVariants: Record<string, string> = {
  supported: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contested: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  unverified: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const strengthVariants: Record<string, string> = {
  strong: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  moderate: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  weak: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  circumstantial: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const projectVariants: Record<string, string> = {
  "on-track": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "at-risk": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "off-track": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  paused: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
};

type StatusBadgeProps =
  | { type: "action"; status: ActionStatus }
  | { type: "risk"; status: RiskStatus }
  | { type: "claim"; status: string }
  | { type: "strength"; status: string }
  | { type: "project"; status: string };

export function StatusBadge(props: StatusBadgeProps) {
  let className = "";
  switch (props.type) {
    case "action":
      className = actionVariants[props.status] ?? "";
      break;
    case "risk":
      className = riskVariants[props.status as RiskStatus] ?? "";
      break;
    case "claim":
      className = claimVariants[props.status] ?? "";
      break;
    case "strength":
      className = strengthVariants[props.status] ?? "";
      break;
    case "project":
      className = projectVariants[props.status] ?? "";
      break;
  }

  return (
    <Badge variant="outline" className={`border-0 ${className}`}>
      {props.status}
    </Badge>
  );
}

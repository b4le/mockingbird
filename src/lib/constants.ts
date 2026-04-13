import type { Priority } from "@/types";

export const TIMELINE_TYPE_ICONS: Record<string, string> = {
  conversation: "💬",
  decision: "⚖️",
  milestone: "🎯",
  document: "📄",
  action: "✅",
  "risk-change": "⚠️",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

import type { Priority } from "@/types";

export const TIMELINE_TYPE_ICONS: Record<string, string> = {
  conversation: "💬",
  decision: "⚖️",
  milestone: "🎯",
  document: "📄",
  action: "✅",
  "risk-change": "⚠️",
};

export const TIMELINE_TYPE_LABELS: Record<string, string> = {
  conversation: "Conversation",
  decision: "Decision",
  milestone: "Milestone",
  document: "Document",
  action: "Action",
  "risk-change": "Risk change",
};

export const CONTACT_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  call: "Phone call",
  meeting: "Meeting",
  chat: "Chat message",
  other: "Other contact",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

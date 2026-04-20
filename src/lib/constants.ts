import type {
  CommunicationChannel,
  Conversation,
  Priority,
  TimelineEventType,
} from "@/types";

export const TIMELINE_TYPE_ICONS: Record<TimelineEventType, string> = {
  conversation: "💬",
  decision: "⚖️",
  milestone: "🎯",
  document: "📄",
  action: "✅",
  "risk-change": "⚠️",
  communication: "✉️",
};

export const TIMELINE_TYPE_LABELS: Record<TimelineEventType, string> = {
  conversation: "Conversation",
  decision: "Decision",
  milestone: "Milestone",
  document: "Document",
  action: "Action",
  "risk-change": "Risk change",
  communication: "Communication",
};

export const COMMUNICATION_CHANNEL_ICONS: Record<CommunicationChannel, string> = {
  email: "✉️",
  slack: "📣",
  whatsapp: "📲",
  sms: "📱",
  other: "📌",
};

export const COMMUNICATION_CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  slack: "Slack",
  whatsapp: "WhatsApp",
  sms: "SMS",
  other: "Other",
};

export const CONVERSATION_MEDIUM_ICONS: Record<
  NonNullable<Conversation["medium"]>,
  string
> = {
  "in-person": "👥",
  "video-call": "🎥",
  "phone-call": "📞",
};

export const CONVERSATION_MEDIUM_LABELS: Record<
  NonNullable<Conversation["medium"]>,
  string
> = {
  "in-person": "In-person meeting",
  "video-call": "Video call",
  "phone-call": "Phone call",
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

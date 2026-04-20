export type ActionStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';
export type ClaimStatus = 'supported' | 'contested' | 'unverified';
export type ProjectStatus = 'on-track' | 'at-risk' | 'off-track' | 'paused' | 'completed';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'circumstantial';
export type TimelineEventType =
  | 'conversation'
  | 'decision'
  | 'milestone'
  | 'document'
  | 'action'
  | 'risk-change'
  | 'communication';
export type CommunicationChannel = 'email' | 'slack' | 'whatsapp' | 'sms' | 'other';

export interface ExternalParticipant {
  name: string;
  email?: string;
  organisation?: string;
}

export type CommMessage =
  | { id: string; date: string; senderId: string; externalSender?: never; bodyPreview: string }
  | { id: string; date: string; senderId?: never; externalSender: ExternalParticipant; bodyPreview: string };

export interface CommAttachment {
  evidenceId?: string;
  name?: string;
  url?: string;
}

export interface Communication {
  id: string;
  channel: CommunicationChannel;
  date: string;
  subject: string;
  participantIds: string[];
  externalParticipants?: ExternalParticipant[];
  summary: string;
  messages: CommMessage[];
  attachments?: CommAttachment[];
  actionItemIds?: string[];
  claimIds?: string[];
  evidenceIds?: string[];
  riskIds?: string[];
  conversationIds?: string[];
  tags?: string[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organisation: string;
  initials: string;
  colour: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface Conversation {
  id: string;
  date: string;
  title: string;
  participantIds: string[];
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItemIds: string[];
  medium?: 'in-person' | 'video-call' | 'phone-call';
  transcript?: string;
  transcriptUrl?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: ActionStatus;
  priority: Priority;
  ownerId: string;
  createdDate: string;
  dueDate: string | null;
  completedDate: string | null;
  tags: string[];
  /** Conversation where this was first raised. May also be referenced by Communications — see Communication.actionItemIds for those backrefs. */
  conversationId: string | null;
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  status: RiskStatus;
  severity: Priority;
  likelihood: Priority;
  mitigationPlan: string;
  actionIds: string[];
  createdDate: string;
  updatedDate: string;
}

export interface Claim {
  id: string;
  assertion: string;
  category: string;
  status: ClaimStatus;
  evidenceIds: string[];
  raisedById: string;
  date: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  source: string;
  sourceType: 'document' | 'conversation' | 'metric' | 'external';
  strength: EvidenceStrength;
  date: string;
  url: string | null;
  claimIds: string[];
  /** Conversation where this was first raised. May also be referenced by Communications — see Communication.evidenceIds for those backrefs. */
  conversationId: string | null;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  stakeholderIds: string[];
  linkedEntityId: string | null;
  linkedEntityType:
    | 'conversation'
    | 'action'
    | 'claim'
    | 'risk'
    | 'communication'
    | null;
}

export interface ProjectState {
  projectName: string;
  status: ProjectStatus;
  statusMessage: string;
  lastUpdated: string;
  metrics: { label: string; value: number; total: number | null; unit: string }[];
  phase: string;
  phaseProgress: number;
}

export interface SessionMeta {
  lastUpdated: string;
  dataVersion: string;
  generatedBy: string;
  notes: string;
}

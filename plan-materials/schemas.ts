// Status/Priority unions
export type ActionStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'mitigated' | 'accepted' | 'closed';
export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'circumstantial';
export type TimelineEventType = 'conversation' | 'decision' | 'milestone' | 'document' | 'action' | 'risk-change';
export type ContactType = 'email' | 'call' | 'meeting' | 'chat' | 'other';

export interface ContactLogEntry {
  date: string;
  type: ContactType;
  summary: string;
  relatedConversationId?: string;
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
  contactLog: ContactLogEntry[];
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
  status: 'supported' | 'contested' | 'unverified';
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
  linkedEntityType: 'conversation' | 'action' | 'claim' | 'risk' | null;
}

export interface ProjectState {
  projectName: string;
  status: 'on-track' | 'at-risk' | 'off-track' | 'paused' | 'completed';
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

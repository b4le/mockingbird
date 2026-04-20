import fs from "fs/promises";
import path from "path";
import { z, ZodError } from "zod";

import type {
  ActionItem,
  Claim,
  Communication,
  Conversation,
  EvidenceItem,
  ProjectState,
  Risk,
  SessionMeta,
  Stakeholder,
  TimelineEvent,
} from "@/types";
import {
  ActionItemSchema,
  ClaimSchema,
  CommunicationSchema,
  ConversationSchema,
  EvidenceItemSchema,
  ProjectStateSchema,
  RiskSchema,
  SessionMetaSchema,
  StakeholderSchema,
  TimelineEventSchema,
} from "@/lib/schemas";

/**
 * Reads a project JSON file and validates its shape with a zod schema before
 * returning. Malformed data fails the build loudly at the point of ingestion
 * rather than surfacing later as a mystery runtime render bug.
 *
 * The thrown error message includes the full `filePath` so CI logs point
 * straight at the offending file, followed by the zod issue list formatted
 * as human-readable lines (path + expected + received).
 */
async function loadValidated<T extends z.ZodTypeAny>(
  project: string,
  file: string,
  schema: T,
): Promise<z.infer<T>> {
  const filePath = path.join(process.cwd(), "data", project, file);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return schema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => {
          const location = issue.path.length
            ? issue.path.join(".")
            : "<root>";
          return `  - ${location}: ${issue.message} (code: ${issue.code})`;
        })
        .join("\n");
      const message =
        `Failed to load ${filePath}: schema validation failed\n${issues}`;
      console.error(message);
      throw new Error(message);
    }
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to load ${filePath}: ${message}`);
    throw new Error(`Failed to load data from ${filePath}: ${message}`);
  }
}

export async function getStakeholders(
  project: string,
): Promise<Stakeholder[]> {
  return loadValidated(project, "stakeholders.json", z.array(StakeholderSchema));
}

export async function getConversations(
  project: string,
): Promise<Conversation[]> {
  return loadValidated(
    project,
    "conversations.json",
    z.array(ConversationSchema),
  );
}

export async function getCommunications(
  project: string,
): Promise<Communication[]> {
  return loadValidated(
    project,
    "communications.json",
    z.array(CommunicationSchema),
  );
}

export async function getActions(project: string): Promise<ActionItem[]> {
  return loadValidated(project, "actions.json", z.array(ActionItemSchema));
}

export async function getRisks(project: string): Promise<Risk[]> {
  return loadValidated(project, "risks.json", z.array(RiskSchema));
}

export async function getClaims(project: string): Promise<Claim[]> {
  return loadValidated(project, "claims.json", z.array(ClaimSchema));
}

export async function getEvidence(project: string): Promise<EvidenceItem[]> {
  return loadValidated(project, "evidence.json", z.array(EvidenceItemSchema));
}

export async function getTimeline(project: string): Promise<TimelineEvent[]> {
  return loadValidated(project, "timeline.json", z.array(TimelineEventSchema));
}

export async function getProjectState(
  project: string,
): Promise<ProjectState> {
  return loadValidated(project, "state.json", ProjectStateSchema);
}

export async function getSession(project: string): Promise<SessionMeta> {
  return loadValidated(project, "session.json", SessionMetaSchema);
}

export interface ProjectBundle {
  state: ProjectState;
  session: SessionMeta;
  stakeholders: Stakeholder[];
  conversations: Conversation[];
  communications: Communication[];
  actions: ActionItem[];
  risks: Risk[];
  claims: Claim[];
  evidence: EvidenceItem[];
  timeline: TimelineEvent[];
}

/**
 * Loads all ten project JSON files in parallel and returns them as a
 * typed bundle. Convenience loader for pages that need most/all project
 * entities — prefer the individual `getX` loaders when only one or two
 * entities are required (e.g. layout reading just `session`).
 */
export async function getProjectBundle(
  project: string,
): Promise<ProjectBundle> {
  const [
    state,
    session,
    stakeholders,
    conversations,
    communications,
    actions,
    risks,
    claims,
    evidence,
    timeline,
  ] = await Promise.all([
    getProjectState(project),
    getSession(project),
    getStakeholders(project),
    getConversations(project),
    getCommunications(project),
    getActions(project),
    getRisks(project),
    getClaims(project),
    getEvidence(project),
    getTimeline(project),
  ]);
  return {
    state,
    session,
    stakeholders,
    conversations,
    communications,
    actions,
    risks,
    claims,
    evidence,
    timeline,
  };
}

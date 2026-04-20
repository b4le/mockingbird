import fs from "fs/promises";
import path from "path";

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

async function loadJson<T>(project: string, file: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", project, file);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`Failed to load ${filePath}: ${message}`);
    throw new Error(`Failed to load data from ${filePath}: ${message}`);
  }
}

export async function getStakeholders(
  project: string,
): Promise<Stakeholder[]> {
  return loadJson<Stakeholder[]>(project, "stakeholders.json");
}

export async function getConversations(
  project: string,
): Promise<Conversation[]> {
  return loadJson<Conversation[]>(project, "conversations.json");
}

export async function getCommunications(
  project: string,
): Promise<Communication[]> {
  return loadJson<Communication[]>(project, "communications.json");
}

export async function getActions(project: string): Promise<ActionItem[]> {
  return loadJson<ActionItem[]>(project, "actions.json");
}

export async function getRisks(project: string): Promise<Risk[]> {
  return loadJson<Risk[]>(project, "risks.json");
}

export async function getClaims(project: string): Promise<Claim[]> {
  return loadJson<Claim[]>(project, "claims.json");
}

export async function getEvidence(project: string): Promise<EvidenceItem[]> {
  return loadJson<EvidenceItem[]>(project, "evidence.json");
}

export async function getTimeline(project: string): Promise<TimelineEvent[]> {
  return loadJson<TimelineEvent[]>(project, "timeline.json");
}

export async function getProjectState(
  project: string,
): Promise<ProjectState> {
  return loadJson<ProjectState>(project, "state.json");
}

export async function getSession(project: string): Promise<SessionMeta> {
  return loadJson<SessionMeta>(project, "session.json");
}

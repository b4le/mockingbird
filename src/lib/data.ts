import fs from "fs/promises";
import path from "path";

import type {
  ActionItem,
  Claim,
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

export async function getAllData(project: string) {
  const results = await Promise.allSettled([
    getStakeholders(project),
    getConversations(project),
    getActions(project),
    getRisks(project),
    getClaims(project),
    getEvidence(project),
    getTimeline(project),
    getProjectState(project),
    getSession(project),
  ]);

  function valueOrDefault<T>(
    result: PromiseSettledResult<T>,
    label: string,
    fallback: T,
  ): T {
    if (result.status === "fulfilled") return result.value;
    console.error(`Failed to load ${label}:`, result.reason);
    return fallback;
  }

  function valueOrThrow<T>(
    result: PromiseSettledResult<T>,
    label: string,
  ): T {
    if (result.status === "fulfilled") return result.value;
    throw new Error(
      `Required data "${label}" failed to load: ${result.reason}`,
    );
  }

  return {
    stakeholders: valueOrDefault(results[0], "stakeholders", []),
    conversations: valueOrDefault(results[1], "conversations", []),
    actions: valueOrDefault(results[2], "actions", []),
    risks: valueOrDefault(results[3], "risks", []),
    claims: valueOrDefault(results[4], "claims", []),
    evidence: valueOrDefault(results[5], "evidence", []),
    timeline: valueOrDefault(results[6], "timeline", []),
    projectState: valueOrThrow(results[7], "projectState"),
    session: valueOrThrow(results[8], "session"),
  };
}

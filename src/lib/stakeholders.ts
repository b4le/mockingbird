import type { Stakeholder } from "@/types";

export function buildStakeholderMap(
  stakeholders: Stakeholder[],
): Map<string, Stakeholder> {
  return new Map(stakeholders.map((s) => [s.id, s]));
}

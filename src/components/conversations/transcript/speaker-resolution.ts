import type { Stakeholder, Transcript, TranscriptCue } from "@/types";

export function buildSpeakerStakeholderMap(
  transcript: Transcript,
  stakeholders: Stakeholder[],
): Map<string, Stakeholder> {
  const byId = new Map<string, Stakeholder>();
  const byNameLower = new Map<string, Stakeholder>();
  for (const s of stakeholders) {
    byId.set(s.id, s);
    byNameLower.set(s.name.toLowerCase(), s);
  }

  const result = new Map<string, Stakeholder>();

  if (transcript.speakerMap) {
    for (const [rawLabel, stakeholderId] of Object.entries(
      transcript.speakerMap,
    )) {
      const s = byId.get(stakeholderId);
      if (s) result.set(rawLabel, s);
    }
  }

  for (const cue of transcript.cues as TranscriptCue[]) {
    if (result.has(cue.speaker)) continue;
    if (cue.speakerId) {
      const s = byId.get(cue.speakerId);
      if (s) {
        result.set(cue.speaker, s);
        continue;
      }
    }
    const fallback = byNameLower.get(cue.speaker.toLowerCase());
    if (fallback) result.set(cue.speaker, fallback);
  }

  return result;
}

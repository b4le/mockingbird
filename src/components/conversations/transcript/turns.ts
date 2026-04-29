import type { TranscriptCue as TranscriptCueModel } from "@/types";
import type { Turn } from "./TranscriptTurn";

/**
 * Group consecutive cues from the same speaker into turns. A speaker
 * boundary is any change in either `speaker` (raw label) or `speakerId`
 * (resolved Stakeholder.id) — both must match to extend the current
 * turn.
 */
export function buildTurns(cues: TranscriptCueModel[]): Turn[] {
  if (cues.length === 0) return [];
  const turns: Turn[] = [];
  let current: Turn = {
    speakerLabel: cues[0].speaker,
    speakerId: cues[0].speakerId,
    startCueIndex: 0,
    endCueIndex: 0,
  };
  for (let i = 1; i < cues.length; i++) {
    const cue = cues[i];
    const sameSpeaker =
      cue.speaker === current.speakerLabel &&
      cue.speakerId === current.speakerId;
    if (sameSpeaker) {
      current.endCueIndex = i;
    } else {
      turns.push(current);
      current = {
        speakerLabel: cue.speaker,
        speakerId: cue.speakerId,
        startCueIndex: i,
        endCueIndex: i,
      };
    }
  }
  turns.push(current);
  return turns;
}

/**
 * Translate a cue index into the index of the turn that contains it.
 * Returns `null` when `cueIndex` is out of range. Linear scan is fine
 * here — this is called from a `scrollToCueIndex` invocation, not from
 * a render hot path.
 */
export function findTurnIndexForCue(
  turns: ReadonlyArray<Turn>,
  cueIndex: number,
): number | null {
  if (cueIndex < 0) return null;
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    if (cueIndex >= turn.startCueIndex && cueIndex <= turn.endCueIndex) {
      return i;
    }
  }
  return null;
}

import type { AudioReference, Conversation, Transcript } from "@/types";

/**
 * Single source of truth for resolving the `AudioReference` to render for a
 * given Conversation. When a Transcript exists for the conversation it owns
 * the recording; otherwise the Conversation's own field is the fallback for
 * audio-only or legacy rows. See `Conversation.audioReference` and
 * `Transcript.audioReference` JSDoc for the policy this encodes.
 *
 * Pure: no I/O, no logging, no allocation. Consumers should call this
 * instead of reaching into either field directly so the policy can change
 * (e.g. when atticus-finch#70 stops dual-emitting) without UI churn.
 */
export function resolveAudioReference(
  conversation: Conversation,
  transcript: Transcript | null,
): AudioReference | undefined {
  return transcript?.audioReference ?? conversation.audioReference;
}

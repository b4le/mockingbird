import type { AudioReference, Conversation, Transcript } from "@/types";

/**
 * Single source of truth for resolving the `AudioReference` to render for a
 * given Conversation. When a Transcript exists for the conversation it owns
 * the recording; otherwise the Conversation's own field is the fallback for
 * audio-only sessions. See `Conversation.audioReference` and
 * `Transcript.audioReference` JSDoc for the policy this encodes.
 *
 * The `transcript` argument accepts both `null` (explicit "no transcript
 * for this conversation") and `undefined` (the natural return of
 * `Map.get`) so call sites don't need a `?? null` coercion.
 *
 * Pure: relies only on its arguments and returns a reference; no I/O.
 * Consumers should call this instead of reaching into either field
 * directly so the policy stays centralised. atticus-finch#70 has shipped
 * (the exporter no longer dual-emits onto Conversation when a Transcript
 * exists), so the `conversation.audioReference` fallback below is now
 * only reached for audio-only sessions — currently exactly one row
 * (`conversation-d738b9e8-…`). The fallback remains load-bearing until
 * that last audio-only case is paired with a Transcript or migrated;
 * do not simplify to `transcript?.audioReference` alone.
 */
export function resolveAudioReference(
  conversation: Conversation,
  transcript: Transcript | null | undefined,
): AudioReference | undefined {
  // Fallback to `conversation.audioReference` is the audio-only branch
  // (no paired Transcript). See JSDoc above.
  return transcript?.audioReference ?? conversation.audioReference;
}

/**
 * Build a lookup of `conversationId -> Transcript` from a flat
 * `Transcript[]`. Skips rows whose `conversationId` is null (a
 * Transcript without a parent conversation cannot resolve audio for
 * any consumer). Use the result alongside `resolveAudioReference` —
 * `transcriptByConversationId.get(conv.id)` returns `undefined` for
 * missing rows, which the selector accepts directly.
 */
export function buildTranscriptByConversationId(
  transcripts: readonly Transcript[],
): ReadonlyMap<string, Transcript> {
  const map = new Map<string, Transcript>();
  for (const t of transcripts) {
    if (t.conversationId) map.set(t.conversationId, t);
  }
  return map;
}

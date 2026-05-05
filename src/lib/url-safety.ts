/**
 * Returns true iff `url` parses cleanly and uses an `http:` or `https:`
 * scheme. Defends against `javascript:`, `data:`, `vbscript:`, `file:`,
 * `mailto:` and other schemes that the underlying URL parser accepts but
 * are not safe (or sensible) destinations for an attachment link.
 *
 * This is the runtime trust boundary for renderer code that turns producer-
 * supplied URLs into clickable `<a href>` elements. It composes with the
 * stricter `HttpsUrlSchema` in `src/lib/schemas.ts` (which additionally
 * requires `https://`) — schema validation runs at ingestion, this guard
 * runs at render as defence in depth.
 */
export function isSafeAttachmentUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

import { resolveSourceLabel } from "@/lib/stakeholder-activity";
import type { ActionItem, Communication, Conversation } from "@/types";

/**
 * Renders the "source" provenance chip for an ActionItem row in ActionTable.
 * Two variants: `desktop` (inline span in the Source column, em-dash fallback
 * when the source is missing) and `mobile` (flex row with "Source:" prefix,
 * renders nothing when the source is missing). Consumed only by
 * `ActionTable.tsx` (desktop table body + mobile card list).
 */
interface SourceCellProps {
  item: Pick<ActionItem, "sourceEntityId" | "sourceEntityType">;
  conversations: Conversation[];
  communications: Communication[];
  variant: "desktop" | "mobile";
}

export function SourceCell({
  item,
  conversations,
  communications,
  variant,
}: SourceCellProps) {
  const src = resolveSourceLabel(
    item.sourceEntityId,
    item.sourceEntityType,
    conversations,
    communications,
  );

  if (variant === "desktop") {
    if (!src) {
      return <span className="text-muted-foreground">—</span>;
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <span role="img" aria-label={src.ariaLabel}>
          {src.icon}
        </span>
        <span className="truncate max-w-[14ch]" title={src.title}>
          {src.title}
        </span>
      </span>
    );
  }

  // variant === "mobile"
  if (!src) return null;
  return (
    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
      <span>Source:</span>
      <span role="img" aria-label={src.ariaLabel}>
        {src.icon}
      </span>
      <span className="truncate" title={src.title}>
        {src.title}
      </span>
    </div>
  );
}

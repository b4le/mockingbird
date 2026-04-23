import { resolveSourceLabel } from "@/lib/stakeholder-activity";
import type { ActionItem, Communication, Conversation } from "@/types";

/**
 * Renders the "source" provenance chip for an ActionItem or EvidenceItem.
 * Three variants:
 *  - `desktop` (ActionTable desktop column): inline span with em-dash fallback.
 *  - `mobile`  (ActionTable mobile card):    flex row prefixed "Source:",
 *                                            renders nothing when no source.
 *  - `evidence` (EvidencePageClient expanded body): flex row prefixed "From:",
 *                                            no top margin, `gap-1.5`,
 *                                            renders nothing when no source.
 *
 * The `item` prop is duck-typed on the polymorphic (sourceEntityId,
 * sourceEntityType) pair, so both ActionItem and EvidenceItem satisfy it
 * without widening the component's concrete dependency.
 */
interface SourceCellProps {
  item: Pick<ActionItem, "sourceEntityId" | "sourceEntityType">;
  conversations: Conversation[];
  communications: Communication[];
  variant: "desktop" | "mobile" | "evidence";
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

  if (variant === "evidence") {
    if (!src) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>From:</span>
        <span role="img" aria-label={src.ariaLabel}>
          {src.icon}
        </span>
        <span className="truncate" title={src.title}>
          {src.title}
        </span>
      </div>
    );
  }

  // Exhaustiveness check: if a new variant is added to the union, this
  // assignment will fail at compile time, forcing the author to handle it
  // above rather than silently falling through to the mobile branch.
  const _exhaustive: "mobile" = variant;
  void _exhaustive;

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

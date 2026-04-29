"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONVERSATION_MEDIUM_LABELS } from "@/lib/constants";
import type { Conversation, Stakeholder } from "@/types";

type Medium = NonNullable<Conversation["medium"]>;

const MEDIUMS: Medium[] = ["in-person", "video-call", "phone-call"];

interface ConversationsFiltersProps {
  stakeholders: Stakeholder[];
  selectedMedium: Medium | null;
  selectedParticipant: string | null;
  onMediumChange: (medium: Medium | null) => void;
  onParticipantChange: (id: string | null) => void;
}

export function ConversationsFilters({
  stakeholders,
  selectedMedium,
  selectedParticipant,
  onMediumChange,
  onParticipantChange,
}: ConversationsFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="conversations-filters"
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div
        id="conversations-filters"
        className={`space-y-3 ${open ? "block" : "hidden md:block"}`}
      >
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Medium
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by medium"
          >
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedMedium === null}
              onClick={() => onMediumChange(null)}
            >
              <Badge
                variant={selectedMedium === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {MEDIUMS.map((medium) => (
              <button
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                key={medium}
                type="button"
                aria-pressed={selectedMedium === medium}
                onClick={() =>
                  onMediumChange(selectedMedium === medium ? null : medium)
                }
              >
                <Badge
                  variant={selectedMedium === medium ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {CONVERSATION_MEDIUM_LABELS[medium]}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Participant
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by participant"
          >
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedParticipant === null}
              onClick={() => onParticipantChange(null)}
            >
              <Badge
                variant={selectedParticipant === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {stakeholders.map((s) => (
              <button
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                key={s.id}
                type="button"
                aria-pressed={selectedParticipant === s.id}
                onClick={() =>
                  onParticipantChange(
                    selectedParticipant === s.id ? null : s.id,
                  )
                }
              >
                <Badge
                  variant={selectedParticipant === s.id ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {s.name.split(" ")[0]}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

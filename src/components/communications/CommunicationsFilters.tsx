"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMMUNICATION_CHANNEL_LABELS } from "@/lib/constants";
import type { CommunicationChannel, Stakeholder } from "@/types";

const CHANNELS: CommunicationChannel[] = [
  "email",
  "slack",
  "whatsapp",
  "sms",
  "other",
];

interface CommunicationsFiltersProps {
  stakeholders: Stakeholder[];
  selectedChannel: CommunicationChannel | null;
  selectedParticipant: string | null;
  onChannelChange: (channel: CommunicationChannel | null) => void;
  onParticipantChange: (id: string | null) => void;
}

export function CommunicationsFilters({
  stakeholders,
  selectedChannel,
  selectedParticipant,
  onChannelChange,
  onParticipantChange,
}: CommunicationsFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="communications-filters"
        className="md:hidden"
      >
        {open ? "Hide Filters" : "Filters"}
      </Button>
      <div
        id="communications-filters"
        className={`space-y-3 ${open ? "block" : "hidden md:block"}`}
      >
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Channel
          </p>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by channel"
          >
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              type="button"
              aria-pressed={selectedChannel === null}
              onClick={() => onChannelChange(null)}
            >
              <Badge
                variant={selectedChannel === null ? "default" : "outline"}
                className="pointer-events-none"
              >
                All
              </Badge>
            </button>
            {CHANNELS.map((channel) => (
              <button
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                key={channel}
                type="button"
                aria-pressed={selectedChannel === channel}
                onClick={() =>
                  onChannelChange(selectedChannel === channel ? null : channel)
                }
              >
                <Badge
                  variant={selectedChannel === channel ? "default" : "outline"}
                  className="pointer-events-none"
                >
                  {COMMUNICATION_CHANNEL_LABELS[channel]}
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

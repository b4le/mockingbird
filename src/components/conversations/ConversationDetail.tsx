"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { AudioReferencePlayer } from "@/components/shared/AudioReferencePlayer";
import { LinkedEntityList } from "@/components/communications/LinkedEntityList";
import { resolveIds } from "@/lib/collections";
import {
  CONVERSATION_FALLBACK_ICON,
  CONVERSATION_FALLBACK_LABEL,
  CONVERSATION_MEDIUM_ICONS,
  CONVERSATION_MEDIUM_LABELS,
} from "@/lib/constants";
import type { ActionItem, Conversation, Stakeholder } from "@/types";

interface ConversationDetailProps {
  conversation: Conversation;
  stakeholderMap: ReadonlyMap<string, Stakeholder>;
  actionMap: ReadonlyMap<string, ActionItem>;
  onStakeholderClick: (s: Stakeholder) => void;
}

export function ConversationDetail({
  conversation,
  stakeholderMap,
  actionMap,
  onStakeholderClick,
}: ConversationDetailProps) {
  const participants = resolveIds(conversation.participantIds, stakeholderMap);
  const linkedActions = resolveIds(conversation.actionItemIds, actionMap);

  const mediumIcon = conversation.medium
    ? CONVERSATION_MEDIUM_ICONS[conversation.medium]
    : CONVERSATION_FALLBACK_ICON;
  const mediumLabel = conversation.medium
    ? CONVERSATION_MEDIUM_LABELS[conversation.medium]
    : CONVERSATION_FALLBACK_LABEL;

  const hasTranscript =
    typeof conversation.transcript === "string" &&
    conversation.transcript.trim() !== "";

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="flex items-start gap-2">
            <span
              className="text-xl leading-none"
              role="img"
              aria-label={mediumLabel}
            >
              {mediumIcon}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold leading-tight">
                {conversation.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {mediumLabel}
                </Badge>
                <span>&middot;</span>
                <DateDisplay date={conversation.date} />
              </div>
            </div>
          </div>
        </div>

        {conversation.audioReference && (
          <AudioReferencePlayer
            audioReference={conversation.audioReference}
            variant="full"
          />
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Participants
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {participants.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => onStakeholderClick(s)}
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors hover:bg-accent/50"
              >
                <StakeholderAvatar stakeholder={s} size="sm" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            Summary
          </p>
          <p className="text-sm text-muted-foreground">
            {conversation.summary}
          </p>
        </div>

        {conversation.keyPoints.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Key points
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {conversation.keyPoints.map((point, i) => (
                  <li key={`kp-${i}`}>{point}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {conversation.decisions.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Decisions
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {conversation.decisions.map((decision, i) => (
                  <li key={`d-${i}`}>{decision}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {linkedActions.length > 0 && (
          <>
            <Separator />
            <LinkedEntityList
              label="Action items"
              items={linkedActions.map((a) => ({
                key: a.id,
                text: a.title,
              }))}
            />
          </>
        )}

        {hasTranscript && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Transcript
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                {conversation.transcript}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

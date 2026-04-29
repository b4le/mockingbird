"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StakeholderAvatar } from "@/components/shared/StakeholderAvatar";
import { DateDisplay } from "@/components/shared/DateDisplay";
import { AudioReferencePlayer } from "@/components/shared/AudioReferencePlayer";
import { LinkedEntityList } from "@/components/communications/LinkedEntityList";
import {
  AudioPlayerProvider,
  useAudioPlayerControls,
} from "./AudioPlayerContext";
import { TranscriptPanel } from "./transcript";
import { buildSpeakerStakeholderMap } from "./transcript/speaker-resolution";
import { resolveIds } from "@/lib/collections";
import {
  CONVERSATION_FALLBACK_ICON,
  CONVERSATION_FALLBACK_LABEL,
  CONVERSATION_MEDIUM_ICONS,
  CONVERSATION_MEDIUM_LABELS,
} from "@/lib/constants";
import type {
  ActionItem,
  Conversation,
  Stakeholder,
  Transcript,
} from "@/types";

interface ConversationDetailProps {
  conversation: Conversation;
  stakeholderMap: ReadonlyMap<string, Stakeholder>;
  actionMap: ReadonlyMap<string, ActionItem>;
  stakeholders: Stakeholder[];
  transcript: Transcript | null;
  onStakeholderClick: (s: Stakeholder) => void;
}

type TabValue = "overview" | "transcript" | "linked";

export function ConversationDetail({
  conversation,
  stakeholderMap,
  actionMap,
  stakeholders,
  transcript,
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

  const hasFlatTranscript =
    typeof conversation.transcript === "string" &&
    conversation.transcript.trim() !== "";
  const transcriptDisabled = !transcript && !hasFlatTranscript;

  const speakerStakeholderMap = useMemo(
    () =>
      transcript
        ? buildSpeakerStakeholderMap(transcript, stakeholders)
        : new Map<string, Stakeholder>(),
    [transcript, stakeholders],
  );

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <AudioPlayerProvider>
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

          <ConversationTabs
            // Re-mounting on conversation id resets the active-tab state
            // to its conversation-appropriate default without an effect.
            key={conversation.id}
            transcript={transcript}
            transcriptDisabled={transcriptDisabled}
            conversation={conversation}
            participants={participants}
            onStakeholderClick={onStakeholderClick}
            flatTranscript={
              hasFlatTranscript ? conversation.transcript : undefined
            }
            speakerStakeholderMap={speakerStakeholderMap}
            linkedActions={linkedActions}
          />
        </AudioPlayerProvider>
      </CardContent>
    </Card>
  );
}

interface ConversationTabsProps {
  transcript: Transcript | null;
  transcriptDisabled: boolean;
  conversation: Conversation;
  participants: Stakeholder[];
  onStakeholderClick: (s: Stakeholder) => void;
  flatTranscript: string | undefined;
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
  linkedActions: ActionItem[];
}

function ConversationTabs({
  transcript,
  transcriptDisabled,
  conversation,
  participants,
  onStakeholderClick,
  flatTranscript,
  speakerStakeholderMap,
  linkedActions,
}: ConversationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>(
    transcript ? "transcript" : "overview",
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabValue)}
    >
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger
          value="transcript"
          disabled={transcriptDisabled}
          aria-disabled={transcriptDisabled || undefined}
        >
          Transcript
        </TabsTrigger>
        <TabsTrigger value="linked">Linked</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <OverviewTab
          conversation={conversation}
          participants={participants}
          onStakeholderClick={onStakeholderClick}
        />
      </TabsContent>

      <TabsContent value="transcript" className="space-y-4">
        <TranscriptTab
          transcript={transcript}
          flatTranscript={flatTranscript}
          speakerStakeholderMap={speakerStakeholderMap}
        />
      </TabsContent>

      <TabsContent value="linked" className="space-y-4">
        <LinkedTab linkedActions={linkedActions} />
      </TabsContent>
    </Tabs>
  );
}

interface OverviewTabProps {
  conversation: Conversation;
  participants: Stakeholder[];
  onStakeholderClick: (s: Stakeholder) => void;
}

function OverviewTab({
  conversation,
  participants,
  onStakeholderClick,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
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
        <p className="text-sm text-muted-foreground">{conversation.summary}</p>
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
    </div>
  );
}

interface TranscriptTabProps {
  transcript: Transcript | null;
  flatTranscript: string | undefined;
  speakerStakeholderMap: ReadonlyMap<string, Stakeholder>;
}

function TranscriptTab({
  transcript,
  flatTranscript,
  speakerStakeholderMap,
}: TranscriptTabProps) {
  const controls = useAudioPlayerControls();

  const handleSeek = useCallback(
    (ms: number) => {
      controls.seek(ms);
      controls.play();
    },
    [controls],
  );

  return (
    <div className="h-[28rem]">
      <TranscriptPanel
        transcript={transcript}
        flatTranscript={flatTranscript}
        speakerStakeholderMap={speakerStakeholderMap}
        onSeek={handleSeek}
        activeCueIndex={null}
      />
    </div>
  );
}

interface LinkedTabProps {
  linkedActions: ActionItem[];
}

function LinkedTab({ linkedActions }: LinkedTabProps) {
  if (linkedActions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No linked items for this conversation.
      </p>
    );
  }
  return (
    <LinkedEntityList
      label="Action items"
      items={linkedActions.map((a) => ({
        key: a.id,
        text: a.title,
      }))}
    />
  );
}

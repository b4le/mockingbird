"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CONTACT_TYPE_LABELS } from "@/lib/constants";
import { StatusBadge } from "./StatusBadge";
import { DateDisplay } from "./DateDisplay";
import type {
  Stakeholder,
  Conversation,
  ActionItem,
  Claim,
} from "@/types";

interface StakeholderDetailDialogProps {
  stakeholder: Stakeholder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
  actions: ActionItem[];
  claims: Claim[];
}

const contactTypeIcons: Record<string, string> = {
  email: "✉",
  call: "📞",
  meeting: "👥",
  chat: "💬",
  other: "📌",
};

export function StakeholderDetailDialog({
  stakeholder,
  open,
  onOpenChange,
  conversations,
  actions,
  claims,
}: StakeholderDetailDialogProps) {
  if (!stakeholder) return null;

  const linkedConversations = conversations.filter((c) =>
    c.participantIds.includes(stakeholder.id)
  );
  const assignedActions = actions.filter(
    (a) => a.ownerId === stakeholder.id
  );
  const raisedClaims = claims.filter(
    (c) => c.raisedById === stakeholder.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-medium text-white"
              style={{ backgroundColor: stakeholder.colour }}
            >
              {stakeholder.initials}
            </div>
            <div>
              <DialogTitle>{stakeholder.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {stakeholder.role} &middot; {stakeholder.organisation}
              </p>
            </div>
          </div>
        </DialogHeader>

        {(stakeholder.email || stakeholder.phone) && (
          <div className="space-y-1 text-sm">
            {stakeholder.email && (
              <p className="text-muted-foreground">{stakeholder.email}</p>
            )}
            {stakeholder.phone && (
              <p className="text-muted-foreground">{stakeholder.phone}</p>
            )}
          </div>
        )}

        {stakeholder.notes && (
          <p className="text-sm text-muted-foreground">{stakeholder.notes}</p>
        )}

        <Separator />

        {stakeholder.contactLog.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Contact Log</h4>
            <div className="space-y-2">
              {[...stakeholder.contactLog]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span role="img" aria-label={CONTACT_TYPE_LABELS[entry.type] ?? entry.type}>{contactTypeIcons[entry.type] ?? "📌"}</span>
                    <div className="min-w-0 flex-1">
                      <p>{entry.summary}</p>
                      <DateDisplay date={entry.date} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {linkedConversations.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">
                Conversations ({linkedConversations.length})
              </h4>
              <div className="space-y-1.5">
                {linkedConversations.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.title}</span>
                    <span className="ml-2 text-muted-foreground">
                      <DateDisplay date={c.date} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {assignedActions.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">
                Assigned Actions ({assignedActions.length})
              </h4>
              <div className="space-y-1.5">
                {assignedActions.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <StatusBadge type="action" status={a.status} />
                    <span>{a.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {raisedClaims.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2 text-sm font-medium">
                Claims Made ({raisedClaims.length})
              </h4>
              <div className="space-y-1.5">
                {raisedClaims.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span>{c.assertion}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

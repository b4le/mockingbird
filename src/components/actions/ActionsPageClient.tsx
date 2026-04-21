"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActionFilters } from "./ActionFilters";
import { ActionTable } from "./ActionTable";
import { RiskRegister } from "./RiskRegister";
import { StakeholderDetailDialog } from "@/components/shared/StakeholderDetailDialog";
import type {
  ActionItem,
  ActionStatus,
  Priority,
  Risk,
  Stakeholder,
  Conversation,
  Communication,
  Claim,
} from "@/types";

interface ActionsPageClientProps {
  actions: ActionItem[];
  risks: Risk[];
  stakeholders: Stakeholder[];
  conversations: Conversation[];
  communications: Communication[];
  claims: Claim[];
}

export function ActionsPageClient({
  actions,
  risks,
  stakeholders,
  conversations,
  communications,
  claims,
}: ActionsPageClientProps) {
  const [statusFilter, setStatusFilter] = useState<ActionStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [dialogStakeholder, setDialogStakeholder] =
    useState<Stakeholder | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Action Tracker</h1>
      <ActionFilters
        stakeholders={stakeholders}
        selectedStatus={statusFilter}
        selectedPriority={priorityFilter}
        selectedOwner={ownerFilter}
        onStatusChange={setStatusFilter}
        onPriorityChange={setPriorityFilter}
        onOwnerChange={setOwnerFilter}
      />
      <Tabs defaultValue="actions">
        <TabsList>
          <TabsTrigger value="actions">
            Actions ({actions.length})
          </TabsTrigger>
          <TabsTrigger value="risks">
            Risks ({risks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="actions">
          <ActionTable
            actions={actions}
            stakeholders={stakeholders}
            conversations={conversations}
            communications={communications}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            ownerFilter={ownerFilter}
            onStakeholderClick={setDialogStakeholder}
          />
        </TabsContent>
        <TabsContent value="risks">
          <RiskRegister risks={risks} actions={actions} />
        </TabsContent>
      </Tabs>
      <StakeholderDetailDialog
        stakeholder={dialogStakeholder}
        open={!!dialogStakeholder}
        onOpenChange={(open) => !open && setDialogStakeholder(null)}
        conversations={conversations}
        communications={communications}
        actions={actions}
        claims={claims}
      />
    </div>
  );
}

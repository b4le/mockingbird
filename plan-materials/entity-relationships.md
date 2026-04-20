# Entity Relationships

## Hub Entity: Stakeholder
Stakeholders are the central entity. Most other entities reference stakeholders.

## Cross-References

- `Conversation.participantIds` → Stakeholder IDs
- `ActionItem.ownerId` → Stakeholder ID
- `Claim.raisedById` → Stakeholder ID
- `ActionItem.conversationId` → Conversation ID (source)
- `Risk.actionIds` → ActionItem IDs (mitigations)
- `Claim.evidenceIds` → EvidenceItem IDs
- `EvidenceItem.claimIds` → Claim IDs (back-references)
- `EvidenceItem.conversationId` → Conversation ID (source)
- `Communication.participantIds` → Stakeholder IDs
- `Communication.conversationIds` → Conversation IDs
- `Communication.actionItemIds` → ActionItem IDs
- `Communication.claimIds` → Claim IDs
- `Communication.evidenceIds` → EvidenceItem IDs
- `Communication.riskIds` → Risk IDs
- `TimelineEvent.stakeholderIds` → Stakeholder IDs
- `TimelineEvent.linkedEntityId` + `linkedEntityType` → any entity (including `'communication'`)

## Common Traversals

1. **All conversations for a stakeholder**: Filter `conversations` where `participantIds` includes the stakeholder ID
2. **All actions for a stakeholder**: Filter `actions` where `ownerId` matches
3. **Evidence for a claim**: Use `claim.evidenceIds` to look up evidence items
4. **Claims for evidence**: Use `evidence.claimIds` for back-references
5. **Mitigation actions for a risk**: Use `risk.actionIds` to look up action items
6. **Timeline for a stakeholder**: Filter `timeline` where `stakeholderIds` includes the stakeholder ID
7. **Source conversation for an action/evidence**: Use `conversationId` field
8. **All communications for a stakeholder**: Filter `communications` where `participantIds` includes the stakeholder ID
9. **All communications linked to a conversation**: Filter `communications` where `conversationIds` includes the conversation ID (or traverse from `Conversation` via any `Communication` back-reference)

## Derived

- **`getStakeholderActivity(stakeholderId)`** (in `src/lib/stakeholder-activity.ts`) replaces the retired stored `Stakeholder.contactLog` field. It unions `conversations` and `communications` where the stakeholder appears in `participantIds`, returning a single activity stream sorted descending by `date`. Prefer this helper over ad-hoc merges when rendering a stakeholder's history.

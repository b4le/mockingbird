# Entity Relationships

## Hub Entity: Stakeholder
Stakeholders are the central entity. Most other entities reference stakeholders.

## Cross-References

- `Conversation.participantIds` → Stakeholder IDs
- `ActionItem.ownerId` → Stakeholder ID
- `Claim.raisedById` → Stakeholder ID
- `ContactLogEntry.relatedConversationId` → Conversation ID
- `ActionItem.conversationId` → Conversation ID (source)
- `Risk.actionIds` → ActionItem IDs (mitigations)
- `Claim.evidenceIds` → EvidenceItem IDs
- `EvidenceItem.claimIds` → Claim IDs (back-references)
- `EvidenceItem.conversationId` → Conversation ID (source)
- `TimelineEvent.stakeholderIds` → Stakeholder IDs
- `TimelineEvent.linkedEntityId` + `linkedEntityType` → any entity

## Common Traversals

1. **All conversations for a stakeholder**: Filter `conversations` where `participantIds` includes the stakeholder ID
2. **All actions for a stakeholder**: Filter `actions` where `ownerId` matches
3. **Evidence for a claim**: Use `claim.evidenceIds` to look up evidence items
4. **Claims for evidence**: Use `evidence.claimIds` for back-references
5. **Mitigation actions for a risk**: Use `risk.actionIds` to look up action items
6. **Timeline for a stakeholder**: Filter `timeline` where `stakeholderIds` includes the stakeholder ID
7. **Source conversation for an action/evidence**: Use `conversationId` field

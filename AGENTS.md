<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cross-collection invariants

Per-collection shape is enforced by zod schemas in `src/lib/schemas.ts`. Some consistency rules span two or more collections (e.g. an action's `sourceEntityId` must appear in its parent's `actionItemIds`) and cannot be expressed at the schema layer, because each JSON file is loaded independently by `loadValidated`. Those cross-collection checks live in `src/lib/invariants.ts`:

- `checkActionBackref(report, actions, communications, conversations)` — mirrors every action's origin into its parent's linked-items list.
- `checkEvidenceBackref(report, evidence, communications)` — same, for evidence → communication only (Conversation has no `evidenceIds` field, so the signature intentionally omits it).

Both checks run inside `getProjectBundle` (in `src/lib/data.ts`) after all collections are loaded. They share a batched reporter created by `createReporter(strict)`: each check records violations via `report(msg)`, and `getProjectBundle` calls `reporter.flush()` exactly once after every check has run.

Strict mode is gated on `process.env.CI === "true"` at the single `getProjectBundle` call site — the check functions themselves are pure, so they're trivial to test. In CI, `flush()` throws one error containing every accumulated violation; in dev it emits one `console.warn` containing the same joined message. Because accumulation is shared, a single CI run surfaces all drift across all checks at once — developers fix everything in one push rather than discovering the next kind on the next run.

### Handling drift output

When a `[backref-drift] ...` message appears, it means a consumer-side invariant detected upstream inconsistency. The mechanism is intentional, not a bug:

- **In dev**: one `console.warn` per `getProjectBundle` call, containing every violation joined into a single message. Noisy on purpose — visibility before silence.
- **In CI**: same accumulated message, but thrown as a hard error (gated on `process.env.CI === "true"`). One push surfaces every kind of drift at once.
- **Correct response**: fix the upstream producer. The atticus-finch exporter writes these JSON files; mockingbird only reads them. Drift means the export is wrong, not the consumer.
- **Do NOT**: wrap `console.warn` in try/catch, relax a required array to `.optional()` to dodge the check, comment out `reporter.flush()`, or add a "skip drift in dev" toggle. All four mask the real bug and break the CI gate the next time real drift appears.

### Schema coupling (load-bearing)

The backref checks dereference `comm.actionItemIds.includes(...)` and `comm.evidenceIds.includes(...)` without a presence guard. That's only safe because `Communication.actionItemIds` and `Communication.evidenceIds` are declared REQUIRED (not `.optional()`) in `CommunicationSchema`. If a future change relaxes those fields back to optional, the checks will crash with `Cannot read properties of undefined (reading 'includes')` instead of cleanly reporting drift — strictly worse than before. Keep the fields required, or reintroduce explicit `if (!comm.actionItemIds) continue;` guards in `checkActionBackref` / `checkEvidenceBackref`. The same rule applies to any new backref check that consumes a "required array" field.

The same coupling applies to the three checks added for Finding 5:

- `checkCommunicationClaimIds` iterates `comm.claimIds` without a presence guard — safe only while `Communication.claimIds` is REQUIRED in `CommunicationSchema`. If relaxed to optional, reintroduce `if (!comm.claimIds) continue;`.
- `checkCommunicationRiskIds` iterates `comm.riskIds` without a presence guard — same constraint on `Communication.riskIds`.
- `checkCommunicationConversationIds` iterates `comm.conversationIds` without a presence guard — same constraint on `Communication.conversationIds`.

The same coupling applies to the post-normaliser-retirement checks:

- `checkRiskActionIds` iterates `risk.actionIds` without a presence guard — safe only while `Risk.actionIds` is REQUIRED in `RiskSchema`. If relaxed to optional, reintroduce `if (!risk.actionIds) continue;`.
- `checkClaimEvidenceIds` iterates `claim.evidenceIds` without a presence guard — same constraint on `Claim.evidenceIds` in `ClaimSchema`.

**Optional-array exceptions.** Two checks intentionally diverge from the required-array pattern because their target field is `.optional()` in the schema, and absence is a legal "not opted in" state rather than drift:

- `checkSnippetBackref` guards on `snippet.evidenceIds` with an explicit `if (!snippet.evidenceIds) continue;` — `Snippet.evidenceIds` is `.optional()` in `SnippetSchema`. The check still iterates `conversationId` / `communicationId` (both `.nullable()`, always present, with the null branch as the skip case).
- `checkConversationSnippetIds` guards on `conv.snippetIds` with an explicit `if (!conv.snippetIds) continue;` — `Conversation.snippetIds` is `.optional()` in `ConversationSchema`. The complementary inbound check to `checkSnippetBackref`.

If a new check targets an optional-array field, follow the same explicit-guard pattern and document it alongside these two. If a new check targets a required-array field, follow the no-guard pattern of the others above and add the schema-coupling comment.

### Adding a new cross-collection check

Follow the same pattern:

1. Declare a pure function in `src/lib/invariants.ts` that takes `report: (msg: string) => void` as its first parameter, followed by the collections it needs.
2. For each violation, call `report` with a `[backref-drift] ...`-prefixed message.
3. Wire it into `getProjectBundle` alongside the existing two, passing `reporter.report`. Keep `reporter.flush()` as the last call before the bundle is returned.
4. If the check dereferences any "required array" field on a zod schema, add a schema-coupling comment pointing at the top-of-file note in `invariants.ts`.

Use the two existing checks as templates.

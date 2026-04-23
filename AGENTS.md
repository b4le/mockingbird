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

### Schema coupling (load-bearing)

The backref checks dereference `comm.actionItemIds.includes(...)` and `comm.evidenceIds.includes(...)` without a presence guard. That's only safe because `Communication.actionItemIds` and `Communication.evidenceIds` are declared REQUIRED (not `.optional()`) in `CommunicationSchema`. If a future change relaxes those fields back to optional, the checks will crash with `Cannot read properties of undefined (reading 'includes')` instead of cleanly reporting drift — strictly worse than before. Keep the fields required, or reintroduce explicit `if (!comm.actionItemIds) continue;` guards in `checkActionBackref` / `checkEvidenceBackref`. The same rule applies to any new backref check that consumes a "required array" field.

### Adding a new cross-collection check

Follow the same pattern:

1. Declare a pure function in `src/lib/invariants.ts` that takes `report: (msg: string) => void` as its first parameter, followed by the collections it needs.
2. For each violation, call `report` with a `[backref-drift] ...`-prefixed message.
3. Wire it into `getProjectBundle` alongside the existing two, passing `reporter.report`. Keep `reporter.flush()` as the last call before the bundle is returned.
4. If the check dereferences any "required array" field on a zod schema, add a schema-coupling comment pointing at the top-of-file note in `invariants.ts`.

Use the two existing checks as templates.

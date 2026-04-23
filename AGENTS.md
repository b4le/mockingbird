<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cross-collection invariants

Per-collection shape is enforced by zod schemas in `src/lib/schemas.ts`. Some consistency rules span two or more collections (e.g. an action's `sourceEntityId` must appear in its parent's `actionItemIds`) and cannot be expressed at the schema layer, because each JSON file is loaded independently by `loadValidated`. Those cross-collection checks live in `src/lib/data.ts`:

- `checkActionBackref(actions, communications, conversations)` — mirrors every action's origin into its parent's linked-items list.
- `checkEvidenceBackref(evidence, communications)` — same, for evidence → communication only (Conversation has no `evidenceIds` field, so the signature intentionally omits it).

Both checks run inside `getProjectBundle` after all collections are loaded, and they share a reporter helper: `createReporter` in `src/lib/invariants.ts`. Policy is `strict = process.env.CI === "true"` — violations throw and break the build in CI, warn and remain visible in dev so hand-edits surface without blocking local iteration.

When adding a new cross-collection check, follow the same pattern: declare a function that takes the involved collections as parameters, call `createReporter(process.env.CI === "true")` at the top, and `report(msg)` for each violation. Wire it into `getProjectBundle` alongside the existing two. Use the two existing checks as templates.

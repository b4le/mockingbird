#!/usr/bin/env node
/**
 * Normalise data/severance/ into shapes the Mockingbird zod schemas accept
 * and the cross-collection invariant checks tolerate.
 *
 * The atticus-finch exporter and the Mockingbird schemas drift periodically
 * — both at the per-record level (e.g. ActionItem.status = "open" vs
 * canonical "todo") and at the cross-collection level (e.g. conversations
 * referencing action IDs that were never exported). Rather than weaken the
 * schemas / invariants to swallow this drift, we normalise here, after the
 * raw copy lands in `data/severance/`. Each transform is documented with
 * the underlying issue so we can retire it once the upstream fix lands.
 *
 * Run via `scripts/sync-severance.sh`. Direct invocation also works to
 * re-normalise an existing severance copy.
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dir = resolve(root, "data/severance");

async function readJson(name) {
  return JSON.parse(await readFile(resolve(dir, name), "utf-8"));
}

async function writeJson(name, value) {
  await writeFile(resolve(dir, name), JSON.stringify(value, null, 2) + "\n");
}

function idSet(records) {
  return new Set(records.map((r) => r.id));
}

const reports = [];
function record(file, kind, count) {
  if (count > 0) reports.push({ file, kind, count });
}

// ---------------------------------------------------------------------------
// Per-record value mappings
// ---------------------------------------------------------------------------

// atticus-finch issue: exporter emits ActionItem.status = "open" / "complete"
// but Mockingbird's ActionStatusSchema accepts only
// todo|in-progress|blocked|done. Map until the exporter is updated.
const ACTION_STATUS_MAP = new Map([
  ["open", "todo"],
  ["complete", "done"],
]);

// ---------------------------------------------------------------------------
// Pass 1: load every collection
// ---------------------------------------------------------------------------

const actions = await readJson("actions.json");
const stakeholders = await readJson("stakeholders.json");
const conversations = await readJson("conversations.json");
const communications = await readJson("communications.json");
const evidence = await readJson("evidence.json");
const claims = await readJson("claims.json");
const risks = await readJson("risks.json");
const timeline = await readJson("timeline.json");
let transcripts = [];
try {
  transcripts = await readJson("transcripts.json");
} catch {
  // transcripts.json is optional — Mockingbird handles its absence.
}

// ---------------------------------------------------------------------------
// Pass 2: normalise per-record values
// ---------------------------------------------------------------------------

{
  let changed = 0;
  for (const a of actions) {
    const replacement = ACTION_STATUS_MAP.get(a.status);
    if (replacement) {
      a.status = replacement;
      changed += 1;
    }
  }
  record("actions.json", "status remapped", changed);
}

// ---------------------------------------------------------------------------
// Pass 3: drop dangling cross-collection references
//
// Each filter mirrors a check in src/lib/invariants.ts. The goal is to
// produce a bundle that passes `checkX` in CI strict mode without changing
// the meaning of the data — only references with no matching target are
// removed. If the exporter later fixes the missing record, syncing will
// repopulate the reference automatically because the source ID was kept on
// disk in data/local/.
// ---------------------------------------------------------------------------

const actionIds = idSet(actions);
const stakeholderIds = idSet(stakeholders);
const conversationIds = idSet(conversations);
const communicationIds = idSet(communications);
const evidenceIds = idSet(evidence);
const claimIds = idSet(claims);
const riskIds = idSet(risks);
const transcriptIds = idSet(transcripts);

function pruneArray(arr, allowed, file, label) {
  if (!Array.isArray(arr)) return arr;
  const original = arr.length;
  const next = arr.filter((id) => allowed.has(id));
  const dropped = original - next.length;
  if (dropped > 0) record(file, label, dropped);
  return next;
}

// Conversation → action / stakeholder / transcript
for (const c of conversations) {
  c.actionItemIds = pruneArray(
    c.actionItemIds,
    actionIds,
    "conversations.json",
    "actionItemIds dropped",
  );
  c.participantIds = pruneArray(
    c.participantIds,
    stakeholderIds,
    "conversations.json",
    "participantIds dropped",
  );
  if (c.transcriptId && !transcriptIds.has(c.transcriptId)) {
    c.transcriptId = undefined;
    record("conversations.json", "transcriptId nulled", 1);
  }
}

// Communication → action / evidence / claim / risk / conversation
for (const m of communications) {
  m.actionItemIds = pruneArray(
    m.actionItemIds,
    actionIds,
    "communications.json",
    "actionItemIds dropped",
  );
  m.evidenceIds = pruneArray(
    m.evidenceIds,
    evidenceIds,
    "communications.json",
    "evidenceIds dropped",
  );
  m.claimIds = pruneArray(
    m.claimIds,
    claimIds,
    "communications.json",
    "claimIds dropped",
  );
  m.riskIds = pruneArray(
    m.riskIds,
    riskIds,
    "communications.json",
    "riskIds dropped",
  );
  m.conversationIds = pruneArray(
    m.conversationIds,
    conversationIds,
    "communications.json",
    "conversationIds dropped",
  );
}

// Action.sourceEntity{Id,Type}: must point at a real comm or conversation,
// or both be null. If the target is missing, null both fields.
for (const a of actions) {
  if (!a.sourceEntityId || !a.sourceEntityType) continue;
  const exists =
    (a.sourceEntityType === "communication" && communicationIds.has(a.sourceEntityId)) ||
    (a.sourceEntityType === "conversation" && conversationIds.has(a.sourceEntityId));
  if (!exists) {
    a.sourceEntityId = null;
    a.sourceEntityType = null;
    record("actions.json", "sourceEntity nulled", 1);
  }
}

// Evidence.sourceEntityId: only "communication" type is checked by invariants.
for (const e of evidence) {
  if (e.sourceEntityType === "communication" && e.sourceEntityId &&
      !communicationIds.has(e.sourceEntityId)) {
    e.sourceEntityId = null;
    e.sourceEntityType = null;
    record("evidence.json", "sourceEntity nulled", 1);
  }
}

// Risk.actionIds: must point at real actions.
for (const r of risks) {
  r.actionIds = pruneArray(
    r.actionIds,
    actionIds,
    "risks.json",
    "actionIds dropped",
  );
}

// Claim.evidenceIds: must point at real evidence.
for (const c of claims) {
  c.evidenceIds = pruneArray(
    c.evidenceIds,
    evidenceIds,
    "claims.json",
    "evidenceIds dropped",
  );
}

// Transcript → conversation / stakeholder.
for (const t of transcripts) {
  if (t.conversationId && !conversationIds.has(t.conversationId)) {
    t.conversationId = null;
    record("transcripts.json", "conversationId nulled", 1);
  }
  if (Array.isArray(t.participantIds)) {
    t.participantIds = pruneArray(
      t.participantIds,
      stakeholderIds,
      "transcripts.json",
      "participantIds dropped",
    );
  }
  if (t.speakerMap && typeof t.speakerMap === "object") {
    let dropped = 0;
    for (const [label, sid] of Object.entries(t.speakerMap)) {
      if (!stakeholderIds.has(sid)) {
        delete t.speakerMap[label];
        dropped += 1;
      }
    }
    record("transcripts.json", "speakerMap entries dropped", dropped);
  }
  if (Array.isArray(t.cues)) {
    let cleared = 0;
    for (const cue of t.cues) {
      if (cue.speakerId && !stakeholderIds.has(cue.speakerId)) {
        cue.speakerId = undefined;
        cleared += 1;
      }
    }
    record("transcripts.json", "cue speakerId cleared", cleared);
  }
}

// Timeline.linkedEntity: Mockingbird's loader doesn't currently invariant-
// check this, but if a linked entity is gone the UI may render a broken
// link. Null the link rather than the whole event.
for (const t of timeline) {
  if (!t.linkedEntityId || !t.linkedEntityType) continue;
  const target = {
    action: actionIds,
    conversation: conversationIds,
    communication: communicationIds,
    evidence: evidenceIds,
    claim: claimIds,
    risk: riskIds,
    stakeholder: stakeholderIds,
  }[t.linkedEntityType];
  if (target && !target.has(t.linkedEntityId)) {
    t.linkedEntityId = null;
    t.linkedEntityType = null;
    record("timeline.json", "linkedEntity nulled", 1);
  }
}

// ---------------------------------------------------------------------------
// Pass 4: write every modified collection back. We always rewrite to keep
// formatting consistent (2-space indent, trailing newline), even if a file
// happened not to be touched in this run.
// ---------------------------------------------------------------------------

await writeJson("actions.json", actions);
await writeJson("conversations.json", conversations);
await writeJson("communications.json", communications);
await writeJson("evidence.json", evidence);
await writeJson("claims.json", claims);
await writeJson("risks.json", risks);
await writeJson("timeline.json", timeline);
if (transcripts.length > 0) {
  await writeJson("transcripts.json", transcripts);
}

if (reports.length === 0) {
  console.log("  (no changes)");
} else {
  for (const r of reports) {
    console.log(`  ${r.file}: ${r.count} × ${r.kind}`);
  }
}

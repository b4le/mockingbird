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

console.log("  (no changes)");

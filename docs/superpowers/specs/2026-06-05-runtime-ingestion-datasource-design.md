# Sub-Project #1 — Runtime Ingestion behind a `DataSource` Interface

**Status:** APPROVED design (2026-06-05). Ready for implementation planning (`superpowers:writing-plans`). No code written yet.

**Parent direction:** [`2026-06-04-local-first-migration-direction.md`](./2026-06-04-local-first-migration-direction.md) — read it first for the strategic context, role split (atticus-finch authors → Mockingbird ingests/presents), locked decisions, and the two-sub-project decomposition.

**Scope:** Decouple data loading from the build so the same UI renders from a data source supplied **at runtime**, behind a clean `DataSource` interface — **without breaking** the existing GitHub Pages static-export deployment (the `severance` showcase). This is sub-project #1 of a non-destructive (strangler-fig) migration toward a local-first Tauri desktop app. Tauri packaging is sub-project #2 and is out of scope here except where it constrains this interface.

**Verified against:** this codebase (firsthand) + Next 16.2.3 bundled docs (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`, `generate-static-params.md`, `assetPrefix.md`) + current (2025–2026) Tauri v2 sources (see [Appendix](#appendix--tauri-v2-risk-research)).

---

## 1. Recommendation (the shape we're building)

> **Single codebase. Preserve the Pages SSG path byte-for-byte** (a `StaticFsDataSource` runs at build, exactly as today). **Add the local/Tauri client-rendered path *alongside* it**, sharing the same prop-driven presentation components and a new fs-free shared validation layer.

- **Phase 0** — pure refactor: extract a `DataSource` interface, make today's `fs` reader one implementation, lift zod-validation + invariants into a source-agnostic step. Zero behaviour change; all tests stay green; Pages untouched.
- **Phase 1** — add a **client shell route** + a runtime (HTTP) `DataSource`, in parallel, **without editing any existing Pages page**.
- **Phase 1.5** — Tauri-feasibility spike (tracked gate before sub-project #2).
- **Phase 2** — Tauri shell (sub-project #2): swap HTTP→Rust IPC, reuse everything.

**Chosen approach: (c) separate-but-parallel client shell.** Rejected (b) "migrate Pages pages to client-fetch" as primary — it changes the working system's render model for no Tauri benefit. (a) build-flag unification is deferred *optional cleanup*, not a competing architecture.

**Why this is the lowest-risk shape:** under `output: "export"` there is no runtime server, so "runtime ingestion" can **only** mean client-side loading. A single route file cannot be both build-time SSG (Pages) and runtime client-rendered (local). Therefore the Pages per-project pages and the local client shell are *necessarily* different entry files that share the same components — a structural fact, not a preference. Building the client path now is not throwaway: **Tauri needs exactly this client path**, validated early over HTTP.

---

## 2. The `DataSource` interface

### 2.1 The seam

Data enters the system via exactly three functions, all reading `process.cwd()/data/<project>` through Node `fs` at build time:

- `getProjectBundle(project)` — `src/lib/data.ts`
- `getProjects()` / `getDefaultProject()` — `src/lib/projects.ts`

No component under `src/components` imports a loader; pages fetch a bundle and pass props down. The presentation layer is already source-agnostic. The interface returns **raw** per-collection data; validation does **not** live in the source (see §2.3).

```ts
// src/lib/data-source/types.ts

/** Raw, unvalidated project collections as loaded from a source.
 *  Keys mirror the JSON files. Optional collections (transcripts, snippets)
 *  resolve to `[]` when absent — each implementation maps its own
 *  "not found" signal (fs ENOENT / HTTP 404 / Tauri error) to absence. */
export interface RawProjectData {
  state: unknown;
  session: unknown;
  stakeholders: unknown;
  conversations: unknown;
  communications: unknown;
  actions: unknown;
  risks: unknown;
  claims: unknown;
  evidence: unknown;
  timeline: unknown;
  transcripts: unknown;   // [] if the source has no transcripts.json
  snippets: unknown;      // [] if the source has no snippets.json
}

export interface DataSource {
  /** Project folder names, sorted, with scratch folders (`local`) excluded. */
  listProjects(): Promise<string[]>;
  /** Landing project: preference order severance → demo → first → "demo". */
  getDefaultProject(): Promise<string>;
  /** Raw collections for one project. Throws on transport/IO failure;
   *  does NOT validate — that is the shared layer's job (§2.3). */
  loadRawProject(project: string): Promise<RawProjectData>;
}
```

### 2.2 How today's three functions refactor

- `loadValidated` (`src/lib/data.ts:62`) is **split**: transport (read bytes, `JSON.parse`, ENOENT→`[]` for opt-in collections) moves into each `DataSource` implementation; validation (zod `.parse`, `uniqueIdArray`, error-formatting) lifts above the interface into the shared layer.
- `getProjectBundle(project)` becomes a thin orchestrator over an injected source:

```ts
// src/lib/data.ts (after refactor)
export async function getProjectBundle(
  project: string,
  source: DataSource = defaultSource,   // StaticFsDataSource at build
): Promise<ProjectBundle> {
  const raw = await source.loadRawProject(project);
  return validateAndCheck(raw, { strict: process.env.CI === "true" });
}
```

`getProjects()` / `getDefaultProject()` delegate to `source.listProjects()` / `source.getDefaultProject()`. **`ProjectBundle` (the exported type at `src/lib/data.ts:226`) is unchanged** — it remains the contract the whole UI consumes.

### 2.3 Shared, source-agnostic validation — where it sits

The zod schemas + cross-collection invariants (`src/lib/invariants.ts`) are **pure except for the single `fs.readFile`** we just removed. They become one fs-free function validating whatever any `DataSource` returns:

```ts
// src/lib/validate-bundle.ts  — NO fs import (hard bundler constraint)
export function validateAndCheck(
  raw: RawProjectData,
  opts: { strict: boolean; report?: (msg: string) => void },
): ProjectBundle {
  // 1. per-collection: schema.parse(...) with the existing error formatting
  // 2. createReporter(opts.strict) + the 15 existing checkX(...) calls
  // 3. reporter.flush()  (unchanged — never removed; see AGENTS.md)
}
```

```
   +-----------------------------------------------------+
   |           validateAndCheck (PURE, fs-free)          |  <- runs on EVERY path
   |     zod schemas  +  invariants.ts  +  reporter      |
   +-----------------------------------------------------+
                          ^   ^   ^
        +-----------------+   |   +--------------------+
   StaticFsDataSource     HttpDataSource          TauriDataSource
   (fs/promises,          (fetch over local       (Rust IPC,
    server-only,           server, Phase 1)        sub-project #2)
    build-time, today)
```

Validation is **above** the interface, so no source can skip it and every source gets identical guarantees.

> **Hard bundler constraint:** `StaticFsDataSource` imports `fs/promises` → must be a **server-only module** (`import "server-only"` guard). `validate-bundle.ts` must stay fs-free so it imports cleanly into the **client** bundle. Client sources (`HttpDataSource`, `TauriDataSource`) never touch `fs`. A CI assertion should verify the client bundle contains no `fs` reference.

### 2.4 Optional-collection contract

The interface contract: *"an absent optional collection resolves to `[]`."* Each implementation maps its own not-found signal — fs `ENOENT`, HTTP `404`, Tauri file-not-found — to `[]`, and re-throws everything else (EACCES, network error) as a real loader failure. This preserves the existing narrow-swallow discipline (`src/lib/data.ts:191,216`).

---

## 3. Runtime loading inside Next static export (the crux)

### 3.1 The constraint that forces the shape (verified, Next 16.2.3)

- **Server Components run at *build* time** under `output: "export"` — they cannot fetch at runtime.
- **Client Components with client-side `fetch` are explicitly supported** under export — the SPA escape hatch.
- **`dynamicParams: true` is unsupported** under export — routes that don't enumerate params at build cannot exist.

**Consequence:** the local app cannot generate per-project routes from the user's folder at runtime. The Pages per-project pages and the local client shell are *necessarily different entry files that share the same prop-driven components.*

### 3.2 The three approaches

| | (a) Build-flag dual-mode | (b) Unify Pages on client-fetch | (c) Separate runtime client shell [chosen] |
|---|---|---|---|
| **Idea** | One route tree; a flag swaps each page between build-SSG and client-load | Pages serves baked `data/` as static JSON assets fetched client-side; local app supplies same via runtime source | Leave Pages SSG **untouched**; add a *separate* client-shell route reusing components + validation |
| **Risk to green path** | **High** — touches every working page | **High** — changes Pages' render model + new asset plumbing (`data/` not under `public/` today) | **Lowest** — Pages pages literally not edited |
| **Tauri fit** | OK | Buys nothing for Tauri | **Tauri needs exactly this client path** |

**Recommend (c).** Non-destructive by construction (existing pages unedited → cannot regress); the client path is mandatory Tauri work anyway; clean module boundary enforces the fs/client-bundle split. **(b)** noted only as *optional eventual convergence*, never a precondition.

### 3.3 Two build-time couplings the shell must re-home (client-side)

1. **Root `redirect()`** (`src/app/page.tsx:5`) resolves the default project at build time. In the shell, default-project resolution moves client-side (`source.getDefaultProject()` → client navigation).
2. **`generateStaticParams` + `dynamicParams = false`** (`src/app/[project]/layout.tsx`) bakes the project list at build. The shell reads `source.listProjects()` client-side and renders the selected project into one static route. The nav project list (today from `getProjects()` at `src/app/layout.tsx:43`) becomes a client-fed prop in the shell.

### 3.4 basePath

`next.config.ts` sets `basePath: "/mockingbird"` only when `GITHUB_PAGES === "true"`. The Pages build keeps `/mockingbird`; the local/Tauri build runs at **root** (`basePath: ""`). The `DataSource` fetch root is **config, not hard-coded** (§5), so client fetches resolve under each target's basePath / asset protocol.

---

## 4. Runtime validation placement

The same pure `validateAndCheck` (§2.3) runs on **every** path. Only the **sink** (reporter behaviour on accumulated violations) changes per environment:

| Environment | Behaviour |
|---|---|
| **Build / CI** (`process.env.CI === "true"`) | **Throw** — one error, every drift. Developer fixes the *producer* (atticus-finch). **Unchanged.** |
| **Build dev** | `console.warn`. **Unchanged.** |
| **Runtime (user's real data, local app)** | **Typed in-app error boundary** — a friendly panel naming the bad collection/field (the existing formatter already produces `path: message (code)` lines). **Not** `console.warn` (user never opens devtools), **not** an uncaught throw (white screen). |

The runtime sink is a **new reporter sink for the same accumulated violations** — it reuses `createReporter`'s accumulation and `flush`'s joined message, surfaced through a React error boundary.

> **AGENTS.md compliance (by design):** this is none of the four forbidden moves — it does **not** wrap `console.warn` in try/catch, **not** relax a required array to `.optional()`, **not** comment out `reporter.flush()`, **not** add a "skip drift in dev" toggle. The checks still run, accumulate, and flush; we add a *third rendering of the same result* for a runtime context the doc never contemplated. Schema-coupling rules (required arrays dereferenced without guards) are untouched — the check functions are reused verbatim.

**Stance:** for a non-developer whose own data fails validation, fail **visibly but recoverably** — show, don't crash, don't go silent. Drift still means "the export is wrong"; the difference is the audience can't push a fix, so we show rather than throw.

---

## 5. How the app points at the data folder (interface-level only)

The runtime `DataSource` is **constructed with a root** — a fetch base (HTTP) or an IPC handle (Tauri). The selection UX (file picker, Tauri dialog, recent folders) is **sub-project #2**; this design only needs the interface to *accept* a root so its shape is validated.

```ts
// Phase 1 — interim validation over a local server
new HttpDataSource({ baseUrl: "http://127.0.0.1:4317/data" });
// Per-collection: GET `${baseUrl}/${project}/communications.json`
// 404 on an optional collection -> []

// Sub-project #2 — Tauri, same interface, Rust backend
new TauriDataSource({ invoke });   // invoke("read_collection", { project, file })
```

Both satisfy the identical contract, feed the identical `validateAndCheck`, and render through the identical components. The local-server impl is a *throwaway harness*; the Tauri impl is the *product*; they differ only in transport. That symmetry validates the interface shape.

---

## 6. Phased, non-destructive plan

Every phase leaves **Pages green** and the app working.

### Phase 0 — Extract the seam (pure refactor)
- **Changes:** `DataSource` interface + `RawProjectData`; `StaticFsDataSource` (moves existing `fs`/`ENOENT` transport, `import "server-only"`); fs-free `validateAndCheck`; rewire the three entry functions to delegate to a default `StaticFsDataSource`.
- **Stays:** every page file; `ProjectBundle`; `next.config.ts`; the `CI`-strict gate; all 15 invariant checks + their schema-coupling comments; the `severance`/`demo` preference and `local` exclusion.
- **Pages stays green:** build still runs Server Components → `StaticFsDataSource` at build → identical `out/`. Behaviour-preserving by construction.
- **Tested:** existing `src/lib/__tests__/invariants*.test.ts` now exercise `validateAndCheck` directly (no `fs` mock). `tsc --noEmit`, `eslint`, full `vitest run` pass. **Diff the `out/` tree before/after to prove byte-stability** of the Pages export.

### Phase 1 — Add the runtime client path (parallel, Pages untouched)
- **Changes:** `HttpDataSource`; a **client shell route** (e.g. `app/(local)/` segment or separate client entry) resolving default project + project list + bundle client-side and rendering the existing components; the runtime validation **error boundary** (§4); an interim local-server launcher serving `data/` over HTTP; local build runs `basePath: ""`.
- **Stays:** all `src/app/[project]/**` Pages pages — **not edited**. `StaticFsDataSource` and the build path. `ProjectBundle`, components, `validateAndCheck`.
- **Pages stays green:** the GitHub Pages workflow keeps building the SSG tree exactly as in Phase 0; the client shell is additive code on a separate route/build target.
- **Tested:** `HttpDataSource` (404→`[]`, error re-throw); the error boundary (drift → friendly panel, not crash); manual: launch local server, load `severance` and a deliberately-broken project, confirm friendly error. CI keeps gating the Pages build on `CI=true` strict validation.

### Phase 1.5 — Tauri feasibility spike (GATE before sub-project #2)
- **Tracked, time-boxed (~1–2 hrs).** Build the export (`basePath: ""`, consider `trailingSlash`), point a **minimal Tauri v2 app**'s `frontendDist` at `out/`, run it, and confirm: (1) the app loads (assets resolve under Tauri's protocol), (2) client navigation works, (3) the runtime `DataSource` can fetch data (via the local-server harness or an early Rust command).
- **Why a gate:** research rates Next-static-export-on-Tauri-v2 **LOW** risk *given our single-route client shell* (it removes the only real gotcha — sub-route hard-refresh 404s), but the exact macOS/Linux protocol behaviour and Next-16-specific details are not verifiable from docs alone. This spike converts the last unknown into an observed fact **before** committing sub-project #2.
- **Fallback if the spike disappoints:** embed a localhost static server in the desktop shell (the Phase-1 harness, productionised), or fall back to Electron. Either way the product ships; only the "tiny tidy binary" aesthetic is at stake.

### Phase 2 — Tauri shell (sub-project #2, out of scope here)
Swap `HttpDataSource` for `TauriDataSource` over Rust IPC; shell, components, and validation reused unchanged. Listed only to show the interface hook lands cleanly.

---

## 7. Risks & open-question disposition

### Prototype gate
- **Next static export under Tauri's asset protocol** — now de-risked to **LOW** by the single-route client-shell design (research-confirmed: Tauri v2 serves over an http-like origin, so Next's absolute asset paths resolve; the one gotcha — sub-route hard-refresh 404 — is eliminated by the single-route SPA). Resolved by the **Phase 1.5 spike**; does not gate sub-project #1.

### Lower risks
- **Client-bundle fs leakage** — `validate-bundle.ts` accidentally pulling in `fs` breaks the client build. Mitigation: `import "server-only"` on `StaticFsDataSource`; keep the validator import graph fs-free; CI assertion that the client bundle has no `fs` reference.
- **Drift surfaced to a non-developer** — real user data may fail invariants the showcase never does. Mitigation: the friendly error boundary (§4); needs UX-tone review.
- **Two render models to maintain** — Pages-SSG and local-client coexist until/unless (b) convergence. Acceptable: components and validator are shared; only the thin entry/data-boundary differs.

### Open questions (direction doc §7)
| # | Question | Disposition |
|---|---|---|
| 1 | Runtime mechanism within static export | **Resolved:** client-side loading via separate client shell + runtime `DataSource` (option c). |
| 2 | Where validation runs at runtime | **Resolved:** same pure `validateAndCheck` everywhere; per-environment sink (§4). |
| 3 | How the user points at the data folder | **Partially:** interface accepts a root (§5); picker UX deferred to sub-project #2. |
| 4 | Support/guidance feature | **Deferred** — untouched. |
| 5 | Editing / write path | **Deferred** — viewer-only (locked); the runtime seam is the prerequisite it will need. No write methods added now. |
| 6 | Code-signing / distribution | **Deferred** to sub-project #2. |

No locked decision is reopened. Local-first, viewer-not-authoring, runtime loading, Tauri end-state, and non-destructive strangler-fig are all honoured.

---

## 8. Files this design touches

- **New:** `src/lib/data-source/types.ts`, `src/lib/data-source/static-fs.ts`, `src/lib/data-source/http.ts` (Phase 1), `src/lib/validate-bundle.ts`, a client shell route under `src/app/`, a runtime error-boundary component.
- **Refactored (behaviour-preserving):** `src/lib/data.ts`, `src/lib/projects.ts`.
- **Unchanged on the green path:** `src/app/[project]/**/page.tsx`, `src/app/[project]/layout.tsx`, all `src/components/**`, `next.config.ts` (Pages build), `src/lib/invariants.ts` (checks reused verbatim), `src/lib/schemas.ts`.

---

## Appendix — Tauri v2 risk research

Decision-grade research (2025–2026 sources) saved at `tmp/next-export-tauri-v2-risk.md` (job-local). Summary:

- **Tauri v2 serves the frontend over an http-like custom protocol** (`http://tauri.localhost` on Windows; `tauri://`-style on mac/Linux), **not `file://`** — so Next's root-absolute `/_next/static/...` paths resolve. This is the key reason Next exports load cleanly, and the main way Tauri beats Electron's default `file://` (which 404s absolute-path SPAs).
- **One real gotcha:** sub-route hard-refresh / deep-link 404s (asset server maps URL→file, no SPA index fallback). `trailingSlash: true` fixes known routes; a **single-route SPA removes the bug class entirely** — which is our design.
- **Embedded-localhost-server fallback** exists (`tauri-plugin-localhost`) but carries a security/port caveat; rarely needed for a single-route SPA.
- **Net risk:** LOW–MEDIUM → **LOW with the single-route shell. Tauri v2 is easier than Electron for a Next static export.**
- **Unverified:** exact macOS/Linux protocol string; Next-16-specific reports (treated version-stable). Settled by the Phase 1.5 spike.

# Mockingbird Local-First Migration — Direction & Decision Record

> **Status: Brainstorming in progress — decisions locked to date; NOT yet an approved implementation spec.**
>
> This is a DIRECTION / DECISION RECORD captured mid-way through the `superpowers:brainstorming`
> flow. The decisions below are LOCKED, but the full design for sub-project #1 has **not yet been
> approved**, and no implementation has started. Do not treat this file as a finalized spec. Open
> questions (§9) are explicitly unresolved and must not be silently decided. A fresh session on any
> machine should be able to read **only this file** and resume with full situational awareness.

- **Project:** `mockingbird` — Next.js 16 / React 19 / TypeScript static-export dashboard
- **Repo:** `git@github.com:b4le/mockingbird.git` at `/home/benpurslow_gmail_com/mockingbird`
- **Phase:** Brainstorming / design (no code written for this initiative)
- **Date captured:** 2026-06-04

---

## 1. Vision — the strategic pivot (local-first)

Mockingbird becomes a **LOCAL-FIRST application that runs on the affected person's own machine.**

This replaces the earlier "host it somewhere with access control" idea.

**Rationale — trust & security:**
- Sensitive case data **never leaves the user's machine.**
- The app **works offline.**
- The code is **auditable** by the user (and others), because it runs locally.

Everything downstream in this record serves that pivot.

---

## 2. Roles — atticus-finch ↔ Mockingbird (boundary unchanged)

The division of labour between the two projects is **unchanged** by this pivot:

| Project | Role |
|---------|------|
| **atticus-finch** (separate project) | Where the case is **authored, gathered, and structured.** It outputs a **STANDARD SCHEMA** — the existing collection of JSON files. |
| **Mockingbird** | **INGESTS** that standard schema and **PRESENTS** it. Plus "support/guidance" (future) and editing (future). |

**The standard schema = the existing JSON collections:** stakeholders, conversations, communications,
actions, risks, claims, evidence, timeline, state, session, transcripts, snippets.

**Mockingbird's presentation surface:** dashboard, timeline, evidence board, conversations/transcript
viewer, action & risk trackers.

> **Mockingbird REMAINS A VIEWER for now.** It is **NOT** becoming an authoring / CRUD tool in this
> phase. (Editing is a future direction — see §4 and the open questions in §9.)

---

## 3. Primary user & priorities

- **Primary user:** the **affected person in a negative situation** (e.g. an employee being fired),
  who uses the tooling to build and see their case and get support.
- **Secondary, deferred:** exporting / sharing a package to counsel. Recognised as valuable but **not
  a priority for this phase.**

---

## 4. Locked decisions

All decisions in this section are **LOCKED**. Their rationale is recorded so future sessions don't
re-litigate them.

### 4.1 — Strategic pivot: local-first
Mockingbird runs **locally on the affected person's own machine.** Replaces the earlier hosted +
access-control idea. **Why:** trust & security — data never leaves the machine, works offline, code
is auditable. (Full statement in §1.)

### 4.2 — Roles / division of labour (boundary unchanged)
atticus-finch authors & structures the case and emits the standard JSON schema; Mockingbird ingests
and presents it. Mockingbird stays a **viewer** for now. (Full statement in §2.)

### 4.3 — Primary user
The affected person. Export-to-counsel is secondary and deferred. (Full statement in §3.)

### 4.4 — Ingestion model: RUNTIME loading
The local Mockingbird reads the user's local data folder **AT RUNTIME** (on startup / watch), **NOT
baked in at build time.**

- **Why:** chosen partly to enable **FUTURE EDITING.** A runtime data layer is a prerequisite for an
  eventual write path.
- **Contrast with today:** the current app **bakes data at build time** via `generateStaticParams`.
  Moving to runtime loading is the core change of sub-project #1.

### 4.5 — Packaging end-state: TAURI desktop app
The end-state package is a **Tauri desktop app** — native double-click app; **Rust** backend reads
(and later writes) local files; tiny binary; offline; strongest security posture.

- **Fallback:** **Electron**, if Rust proves unacceptable.
- **Acceptable interim:** a **local-server + browser launcher** is an acceptable **interim
  validation step**, not the end state.

### 4.6 — CRITICAL CONSTRAINT: non-destructive migration (strangler-fig)
The existing working system — the **Next.js static-export viewer deployed to GitHub Pages (the
`severance` showcase)** — **MUST keep working at every step.**

- We **iterate ALONGSIDE it**; we do **NOT rip-and-replace.**
- The goal is an **existing working system that can be iterated upon**, never a flag-day rewrite.
- This is the single most binding constraint on how sub-project #1 is designed.

### 4.7 — Decomposition into two sub-projects (build in order)

1. **Sub-project #1 — Runtime ingestion** behind a clean `DataSource` interface. The load-bearing,
   **packaging-agnostic** core. **Built FIRST.**
2. **Sub-project #2 — Local packaging.** Validate runtime loading via a **local-server launcher
   first**, then ship the **Tauri desktop app.**

See §6 for the full decomposition narrative.

---

## 5. Architecture finding (verified this session)

The codebase was read this session and found to have a **clean SINGLE data seam**, making this
migration **favourable and low-coupling.** Exact file/function names are recorded here so the finding
is self-contained.

- **No component under `src/components` imports a data loader.** The entire presentation layer is
  **prop-driven and data-source-agnostic.**
- **Data enters the system via exactly three functions:**
  - `getProjectBundle(project)` — in `src/lib/data.ts`
  - `getProjects()` — in `src/lib/projects.ts`
  - `getDefaultProject()` — in `src/lib/projects.ts`
  - All three read `process.cwd()/data/<project>` via Node `fs` **at build time.**
- **The only callers** are the page components in `src/app/[project]/**/page.tsx`, which fetch a
  bundle and pass props down.
- **`getProjectBundle`'s validation is reusable unchanged at runtime.** Its zod-schema validation
  and cross-collection invariant checks (`src/lib/invariants.ts`) are **PURE except for the single
  `fs.readFile`** — so that logic runs unchanged at runtime / client-side.

**Implication:** introduce a **`DataSource` abstraction at those three functions.** The existing
build-time `fs` reader becomes **one implementation**; a **runtime implementation** is added for the
local app. Because the seam is single and the presentation layer is already agnostic, the migration
is low-coupling.

---

## 6. Two-sub-project decomposition (build in order)

### Sub-project #1 — Runtime ingestion (build FIRST)
- Introduce a clean **`DataSource` interface** at the three-function seam (§5).
- The existing build-time `fs` reader becomes **one implementation** of that interface.
- Add a **runtime implementation** that reads the user's local data folder at runtime.
- This is the **load-bearing, packaging-agnostic core** — it must not depend on how the app is
  ultimately packaged.
- **Strangler-fig constraint (§4.6) applies in full:** the build-time / GitHub Pages `severance`
  viewer must keep working at every step of this sub-project.

### Sub-project #2 — Local packaging (build SECOND)
- **First**, validate runtime loading via a **local-server + browser launcher** (interim, §4.5).
- **Then**, ship the **Tauri desktop app** (Rust backend reads — and later writes — local files).
- Electron is the fallback if Rust proves unacceptable.

---

## 7. Open questions (NOT yet decided)

These are explicitly **unresolved.** Recording them so they are not lost or silently decided.

1. **Exact runtime-loading mechanism within Next static export** — e.g. a client data layer fetching
   static JSON vs a build-flag dual-mode. Not chosen.
2. **Where/how the zod + invariant validation layer runs at runtime** — the logic is reusable (§5),
   but its runtime execution site (client-side, Rust side, server launcher) is undecided.
3. **How the user selects / points at their data folder.**
4. **The "support/guidance" feature scope** — named as a future Mockingbird capability, scope TBD.
5. **The editing / write-path design** — runtime loading is chosen partly to enable it (§4.4), but
   the write path itself is unspecified.
6. **Code-signing & distribution for the desktop app.**

---

## 8. Next step in the flow

1. **Present the proposed design for sub-project #1 (runtime ingestion) to the user for approval.**
   (A separate design subagent is drafting that proposal in parallel / after this capture.)
2. Once approved, **proceed to the `superpowers:writing-plans` skill.**

> Until sub-project #1's design is approved, this record remains a direction log, not a spec.

---

## 9. Provenance

- Captured mid-way through the `superpowers:brainstorming` flow on 2026-06-04.
- Architecture finding (§5) verified by reading the code this session; the three seam-function names
  were confirmed to resolve in `src/lib/data.ts` and `src/lib/projects.ts`.
- Decisions §1–§7 are faithful to the locked direction as of capture; anything beyond them is flagged
  as an open question (§7) rather than resolved here.

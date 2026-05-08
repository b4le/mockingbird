# Mockingbird

A self-hosted project dashboard for tracking complex multi-stakeholder projects. Visualises project state, conversations, evidence, actions, and risks in a clean, mobile-first UI.

## Features

- **Dashboard** — Project status, progress, summary metrics, recent activity, top risks
- **Timeline** — Chronological event stream with filters by type and stakeholder
- **Evidence Board** — Claims linked to supporting evidence with strength ratings
- **Action Tracker** — Action items table with filters + risk register with mitigation plans
- **Stakeholder Detail** — Click any avatar to see contact log, linked conversations, and assigned actions
- **Multi-project** — Switch between projects via dropdown (each project is a folder of JSON files)
- **Dark mode** — Theme toggle with light mode default

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Contract

Each project lives in `data/{project-name}/` and contains 9 JSON files:

| File | Shape | Description |
|------|-------|-------------|
| `stakeholders.json` | `Stakeholder[]` | People involved, with contact logs |
| `conversations.json` | `Conversation[]` | Meetings/discussions with key points and decisions |
| `actions.json` | `ActionItem[]` | Tasks with status, priority, owner, due date |
| `risks.json` | `Risk[]` | Risk register with severity, likelihood, mitigation |
| `claims.json` | `Claim[]` | Assertions with evidence links and verification status |
| `evidence.json` | `EvidenceItem[]` | Documents, metrics, and conversations supporting claims |
| `timeline.json` | `TimelineEvent[]` | Chronological events across all entity types |
| `state.json` | `ProjectState` | Project name, status, phase, progress, metrics |
| `session.json` | `SessionMeta` | Last updated timestamp and metadata |

Full TypeScript interfaces are in `src/types/index.ts`.

### Adding Your Own Project

1. Create a new folder under `data/` (e.g., `data/my-project/`)
2. Add all 9 JSON files following the schemas in `src/types/index.ts`
3. Rebuild — the project selector will pick it up automatically

### Entity Cross-References

Entities link to each other via string IDs:

- `Conversation.participantIds` -> Stakeholder IDs
- `ActionItem.ownerId` -> Stakeholder ID
- `Claim.evidenceIds` -> EvidenceItem IDs
- `Risk.actionIds` -> ActionItem IDs (mitigation actions)
- `TimelineEvent.linkedEntityId` + `linkedEntityType` -> any entity

See `plan-materials/entity-relationships.md` for full reference.

## Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui (zinc palette)
- Static export — no server required
- Deployed to GitHub Pages via GitHub Actions

## Deployment

Push to `main` triggers automatic deployment to GitHub Pages. Manual deploy via `workflow_dispatch`.

For local preview of the static build:

```bash
npm run build
npx serve out
```

### Real-world example: `severance`

`data/severance/` is the publishable copy of a real workplace dispute project, included to give visitors a meaningful example. It contains real names and is **published as a private-by-obscurity showcase** — not as open data:

- `public/robots.txt` blocks all crawlers.
- The root layout emits `<meta name="robots" content="noindex,nofollow,nocache">` so even cooperating bots that ignore robots.txt drop the page.
- `getDefaultProject()` in `src/lib/projects.ts` prefers `severance` over `demo` so the URL root lands on the real example.

These controls deter casual discovery; they do not provide access control. Anyone with the URL can still read everything. If you need real access control (auth, allowlist, expiring links), GitHub Pages is the wrong host — see follow-ups below.

### Syncing severance from atticus-finch exports

`data/severance/` is the **tracked** copy. The atticus-finch exporter writes to `data/local/` (gitignored) on every run; we deliberately do **not** auto-sync, so each publish is an explicit act:

```bash
scripts/sync-severance.sh           # diff first, prompt before applying
scripts/sync-severance.sh --apply   # apply without prompting
```

The script rsyncs `data/local/` → `data/severance/` and stops there. Drift between the exporter and the Mockingbird schemas is now caught at validation time: zod schemas in `src/lib/schemas.ts` enforce per-record shape, and the cross-collection invariants in `src/lib/invariants.ts` (gated by `CI=true npm run build`) flag dangling references. The historical `normalise-severance.mjs` shim has been retired — atticus-finch's incremental reconciler keeps cross-refs clean upstream. Review the resulting `git diff data/severance` before committing.

`getProjects()` in `src/lib/projects.ts` filters out `data/local/` via `EXCLUDED_PROJECT_FOLDERS` so the staging copy never appears in the project selector or gets rendered into static pages, even when present locally.

### Future hardening

- **Per-stakeholder anonymisation flag.** Add `Stakeholder.anonymised: boolean` so individuals only marginally involved (e.g. mentioned once in a transcript) can be hidden behind a pseudonym while main actors stay named. Requires changes in both Mockingbird (schema + render-time substitution) and the atticus-finch exporter (source of truth).
- **Real access control.** GitHub Pages serves everything publicly. To gate access, options include: (a) Cloudflare Pages + Cloudflare Access (free, email-based allowlist), (b) Vercel + Vercel Authentication (paid), (c) a thin auth-gated proxy in front of the static bundle, (d) a client-side password gate (security theatre, but raises the bar against URL leakage).

## License

MIT

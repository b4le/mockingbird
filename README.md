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

## License

MIT

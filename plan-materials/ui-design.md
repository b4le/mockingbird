# UI Design: Progressive Disclosure

## General Principles
- **Collapsed**: Title/name + primary badge + key metric
- **Expanded**: Full description, linked entities, dates, owner
- **Detail panel**: Everything + contact log + all cross-references

## Timeline Entries
- **Collapsed**: Type icon | Title | Date | Participant avatars (max 3 + overflow count)
- **Expanded** (conversation type): + keyPoints list + decisions list + action items count
- Other types don't expand further in the list view

## Evidence Cards
### Claim Card (left panel on desktop)
- **Collapsed**: Assertion text (truncated 2 lines) | Category badge | Status badge | Evidence count
- **Selected/Active**: Full assertion text + raised-by avatar + date

### Evidence Item (right panel on desktop)
- **Default**: Title | Source | Strength badge | Date
- **Expanded**: + Full description + source conversation link + URL link

## Action Rows
### Desktop Table
- Status icon | Title | Priority badge | Owner avatar | Due date | Tags
- Overdue items: highlighted row background
- Sortable columns: priority, due date, status

### Mobile Card
- Title (bold) | Status badge + Priority badge (inline)
- Owner avatar + name | Due date (relative, red if overdue)
- Tags as small badges below

## Risk Cards
- **Collapsed**: Title | Severity badge | Status badge
- **Expanded**: + Full description + Likelihood info + Mitigation plan + Linked actions list + Last updated date

## Stakeholder Detail Dialog
- Header: Large avatar (initials) + Name + Role + Organisation
- Contact: Email + Phone (if available)
- Sections:
  - Contact Log: Reverse-chronological list of entries
  - Linked Conversations: Filtered from conversations.json
  - Assigned Actions: Filtered from actions.json
  - Claims Made: Filtered from claims.json

## Badge Colour Mapping
### Priority
- critical: red (destructive variant)
- high: orange
- medium: yellow
- low: grey (secondary variant)

### Action Status
- done: green
- in-progress: blue
- todo: grey
- blocked: red

### Risk Status
- open: red
- mitigated: green
- accepted: yellow
- closed: grey

### Claim Status
- supported: green
- contested: orange/amber
- unverified: grey

### Evidence Strength
- strong: green
- moderate: blue
- weak: yellow
- circumstantial: grey

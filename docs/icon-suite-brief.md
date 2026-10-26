# RBM icon suite: brief for Claude Code

Prepared 23 Oct 2026. This brief covers one piece of work: the **icon suite** and the state and action rules that depend on it. It builds on `docs/handoff-brief.md`, `docs/rbm-parked-decisions.md`, `docs/app-shell-brief.md` and `docs/list-page-brief.md`. Read those first. If they disagree with this brief, this brief wins for icons and states, and you should say so.

**Status: every icon here is Proposed.** The drawings are first-pass and need Andy Smith's sign-off. Build them, mark them Proposed in Storybook, and do not treat them as final.

## 1. Goal
Deliver the **one typed icon registry** and the components that use it (`RbmIcon`, `RbmIconButton`, and the state pill), exactly as drawn on the design board. After this, no other component may import an icon from anywhere else.

## 2. Design source
The "RBM Design System" canvas, **Icon suite** board (version 88): https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv (open it with the same claude.ai account as its owner). Build what is drawn. The paths in section 5 are copied from the board; if they disagree with the board, the board wins, so tell me.

The old Jira library (RBM-345, Material icon names) is **not** a source. The design says RBM icons are drawn from scratch, and `@mui/icons-material` must not be imported outside the icon package.

## 3. Rules (from the board, enforce by types, lint and tests)
- 24 px grid, 2 px stroke, round caps and joins, no fills except the half ring, the play triangle and the dots of the drag handle, colour from `currentColor`.
- Sizes follow density: D0 32 px, D1 24 px, D2 20 px, D3 16 px (`--rbm-icon-size`, set by the density scope).
- One typed registry. Lint bans `@mui/icons-material` outside the icon package.
- `RbmIconButton` requires a `label` (aria-label and tooltip). TypeScript rejects it without one.
- Icons are decorative by default (`aria-hidden`). An icon that carries meaning alone needs a `title`.
- **One meaning per shape.** CI checks that each SVG uses the 24 px viewBox, 2 px stroke, round caps and `currentColor`, and that no two icons are identical.
- **Colour is never the only signal.** Every state has a text label. Brand Green means Complete only.
- Icons never replace words unless a button is icon-only with a tooltip and an accessible name.

## 4. The registry
Groups and keys (all names are camelCase and exact):
```ts
export const rbmIcons = {
  object: { runbook, event, stage, task, dependency, assignment, team, globalTeam,
            localTeam, workstream, globalWorkstream, localWorkstream, document,
            issue, checklist, environment, schedule, cutover, decision, comment,
            history, template, contentPack, eventGroup },
  role: { owner, executor, reviewer, approver, observer, stakeholder, manager, author },
  state: { initial, approved, pending, available, active, paused, suspended,
           complete, skipped, backingOut, backedOut, abandoned, scheduled, closed },
  construct: { add, edit, delete, save, discard, copy, clone, reassign, export, lock,
              moveUp, moveDown, dragHandle, dropTarget },
  control: { approve, start, pause, resume, complete, skip, fastForward, abandon, backOut },
  display: { search, filter, sort, expandAll, collapseAll, previous, next, widen,
            openFullPage, close, more, signOut },
  nav: { list, folder, setup, integrations, license, training, support, versions },
  taskType: { standard, scripted, automated, businessVerification, technicalVerification,
              checkpoint, notification, collaboration, approval, milestone },
  centre: { base, commandControl, migration, executiveBriefing, verification, audit, admin },
  admin: { systemProperties, diagnostics, scenarios },
} as const;
```
That is 109 icons. `construct.duplicate` is **retired**: replace each use with `construct.copy` (copy content or the whole object) or `construct.clone` (a wizard-like process that makes a new, independent record). The old single `action` group is **replaced** by `construct`, `control` and `display`. `markComplete` becomes `control.complete`, and the old Close is `display.close`. The shell reuses `object.template`, `object.team` and `object.workstream` for Templates, Teams and Workstreams.

## 5. Icon data (copy these exactly)
Every icon is drawn in a `viewBox="0 0 24 24"` with `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`. The tables give the elements inside the `<svg>`.

### 5.1 Objects (20 drawn directly)
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `object.runbook` | Runbook | `<path d="M6 3h13v15H6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"/><path d="M4 20a2 2 0 0 0 2 2h13v-4"/><path d="M9 8h6M9 12h4"/>` |
| `object.stage` | Stage | `<path d="M3 6h12l6 6-6 6H3l5-6-5-6z"/>` |
| `object.task` | Task | `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>` |
| `object.dependency` | Dependency | `<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9v6a3 3 0 0 0 3 3h6"/>` |
| `object.assignment` | Assignment | `<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><circle cx="12" cy="11" r="2.2"/><path d="M8 18a4 4 0 0 1 8 0"/>` |
| `object.team` | Team | `<circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 4 5"/>` |
| `object.document` | Document | `<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>` |
| `object.issue` | Issue | `<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>` |
| `object.checklist` | Checklist | `<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3 6.5l1.5 1.5 2.5-3M3 12.5l1.5 1.5 2.5-3M3 18.5l1.5 1.5 2.5-3"/>` |
| `object.environment` | Environment | `<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>` |
| `object.schedule` | Schedule | `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>` |
| `object.cutover` | Cutover | `<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>` |
| `object.decision` | Decision | `<path d="M12 2l10 10-10 10L2 12 12 2z"/><path d="M10 9.5a2 2 0 1 1 3 1.7c-.7.4-1 .8-1 1.5"/><path d="M12 16.2h.01"/>` |
| `object.comment` | Comment | `<path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4H6a2 2 0 0 1-2-2V5z"/>` |
| `object.history` | History | `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>` |
| `object.template` | Template | `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>` |
| `object.event` | Event | `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M12.5 12l-2.5 3.5h4l-2 3.5"/>` |
| `object.workstream` | Workstream | `<path d="M3 7q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 12q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 17q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0"/>` |
| `object.contentPack` | Content Pack | `<path d="M10 4a2 2 0 1 1 4 0v1h4a1 1 0 0 1 1 1v4h-1a2 2 0 1 0 0 4h1v4a1 1 0 0 1-1 1h-4v-1a2 2 0 1 0-4 0v1H6a1 1 0 0 1-1-1v-4h1a2 2 0 1 0 0-4H5V6a1 1 0 0 1 1-1h4V4z"/>` |
| `object.eventGroup` | Event Group | `<rect x="3" y="8" width="14" height="13" rx="2"/><path d="M3 12.5h14M7 6v4M13 6v4"/><path d="M10.8 14.5l-2 3h2.6l-1.6 2.5"/><path d="M7 4.5V4a1 1 0 0 1 1-1h11a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1h-.5"/>` |

### 5.2 Global and local objects (4, plus the two badges)
The base object is drawn small (`translate(0 7) scale(0.7)`, stroke-width 2.86) with a badge at top right. A globe means Global and a pin means Local.

| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `object.globalTeam` | Global team | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 4 5"/></g><g stroke-width="1.5"><circle cx="18.5" cy="6.5" r="4.5"/><path d="M14 6.5h9"/><ellipse cx="18.5" cy="6.5" rx="2" ry="4.5"/></g>` |
| `object.localTeam` | Local team | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><circle cx="9" cy="8" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14a5 5 0 0 1 4 5"/></g><path d="M19 11.5c-3-3-4-4.6-4-6.3a4 4 0 0 1 8 0c0 1.7-1 3.3-4 6.3z"/><circle cx="19" cy="5.2" r="1.2"/>` |
| `object.globalWorkstream` | Global workstream | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><path d="M3 7q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 12q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 17q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0"/></g><g stroke-width="1.5"><circle cx="18.5" cy="6.5" r="4.5"/><path d="M14 6.5h9"/><ellipse cx="18.5" cy="6.5" rx="2" ry="4.5"/></g>` |
| `object.localWorkstream` | Local workstream | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><path d="M3 7q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 12q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0M3 17q2.25-3 4.5 0t4.5 0 4.5 0 4.5 0"/></g><path d="M19 11.5c-3-3-4-4.6-4-6.3a4 4 0 0 1 8 0c0 1.7-1 3.3-4 6.3z"/><circle cx="19" cy="5.2" r="1.2"/>` |

Badges on their own:

| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `badge.globalBadge` | Global badge | `<g stroke-width="1.5"><circle cx="18.5" cy="6.5" r="4.5"/><path d="M14 6.5h9"/><ellipse cx="18.5" cy="6.5" rx="2" ry="4.5"/></g>` |
| `badge.localBadge` | Local badge | `<path d="M19 11.5c-3-3-4-4.6-4-6.3a4 4 0 0 1 8 0c0 1.7-1 3.3-4 6.3z"/><circle cx="19" cy="5.2" r="1.2"/>` |

### 5.3 User roles (8)
All roles share a person figure with a badge at top right: diamond (Stakeholder), bolt (Manager), pencil (Author).

| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `role.owner` | Owner | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M18 5.5l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"/>` |
| `role.executor` | Executor | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M16 6.5v7l5-3.5z"/>` |
| `role.reviewer` | Reviewer | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><circle cx="17.5" cy="8.5" r="2.8"/><path d="M19.6 10.6L22 13"/>` |
| `role.approver` | Approver | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M15.5 9.5l2 2 3.5-4"/>` |
| `role.observer` | Observer | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M14 10c1.8-3.2 6.2-3.2 8 0-1.8 3.2-6.2 3.2-8 0z"/><circle cx="18" cy="10" r="1" fill="currentColor"/>` |
| `role.stakeholder` | Stakeholder | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M18 3.5l4 4.5-4 4.5-4-4.5z"/>` |
| `role.manager` | Manager | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M19 3l-5 7h4l-3 6 7-8h-4z"/>` |
| `role.author` | Author | `<circle cx="8" cy="8" r="3.2"/><path d="M2 20a6 6 0 0 1 12 0"/><path d="M14 15l1-3.5 5.5-5.5a1.5 1.5 0 0 1 2.1 2.1L17 13.6z"/>` |

### 5.4 States (14)
A state is what an object is now. States are never clickable. Every state is shown with its text label, and the dot uses the signal colour while the icon and label use the text-safe tint.

| Key | Label | Used by | Dot colour | Icon and label colour | SVG inside the 24 x 24 viewBox |
|---|---|---|---|---|---|
| `state.initial` | Initial | Task, Event | #C3C8D2 | #5B6472 | `<circle cx="12" cy="12" r="9"/><path d="M12 12h.01"/>` |
| `state.approved` | Approved | Task, Event | #354BA8 | #354BA8 | `<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>` |
| `state.pending` | Pending | Task | #C3C8D2 | #5B6472 | `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>` |
| `state.available` | Available | Task | #C3C8D2 | #5B6472 | `<circle cx="12" cy="12" r="9" stroke-dasharray="3 3.2"/>` |
| `state.active` | Active | Task, Event | #354BA8 | #354BA8 | `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18V3z" fill="currentColor"/>` |
| `state.paused` | Paused | Task, Event | #FF9F1C | #A45200 | `<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>` |
| `state.suspended` | Suspended | Task | #F00034 | #C61E3A | `<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/>` |
| `state.complete` | Complete | Task, Event | #84CC16 | #3F6B06 | `<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>` |
| `state.skipped` | Skipped | Task | #5B6472 | #5B6472 | `<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>` |
| `state.backingOut` | Backing out | Task, Event | #FF9F1C | #A45200 | `<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4h4"/>` |
| `state.backedOut` | Backed out | Task, Event | #5B6472 | #5B6472 | `<circle cx="12" cy="12" r="9"/><path d="M13.5 8.5L10 12l3.5 3.5"/>` |
| `state.abandoned` | Abandoned | Task, Event | #5B6472 | #5B6472 | `<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>` |
| `state.scheduled` | Scheduled | Event | #354BA8 | #354BA8 | `<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M9 15l2 2 4-4"/>` |
| `state.closed` | Closed | Event | #5B6472 | #5B6472 | `<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>` |

Active and Backing out may animate, but only on the state icon, never on a button, and never when `prefers-reduced-motion` is set.

### 5.5 Actions: Construction (14), changes content or position, never changes state
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `construct.add` | Add | `<path d="M12 5v14M5 12h14"/>` |
| `construct.edit` | Edit | `<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>` |
| `construct.delete` | Delete | `<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>` |
| `construct.save` | Save | `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M7 3v5h8M7 21v-7h10v7"/>` |
| `construct.discard` | Discard | `<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>` |
| `construct.copy` | Copy | `<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"/>` |
| `construct.clone` | Clone | `<rect x="3" y="3" width="9" height="9" rx="2"/><rect x="12" y="12" width="9" height="9" rx="2"/><path d="M12 7.5h2.5a3 3 0 0 1 3 3V12"/>` |
| `construct.reassign` | Reassign | `<path d="M4 8h14l-4-4M20 16H6l4 4"/>` |
| `construct.export` | Export | `<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>` |
| `construct.lock` | Lock | `<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>` |
| `construct.moveUp` | Move up | `<path d="M12 19V5M5 12l7-7 7 7"/>` |
| `construct.moveDown` | Move down | `<path d="M12 5v14M5 12l7 7 7-7"/>` |
| `construct.dragHandle` | Drag handle | `<circle cx="9" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="9" cy="19" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="19" r="1.5" fill="currentColor" stroke="none"/>` |
| `construct.dropTarget` | Drop target | `<rect x="4" y="13" width="16" height="7" rx="2" stroke-dasharray="3 3"/><path d="M12 3v7M8.5 6.5L12 10l3.5-3.5"/>` |

### 5.6 Actions: Control / Player (9), every one is a state change
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `control.approve` | Approve | `<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12.5l3 3 5-6"/>` |
| `control.start` | Start | `<path d="M7 4l13 8-13 8V4z"/>` |
| `control.pause` | Pause | `<path d="M8 5v14M16 5v14"/>` |
| `control.resume` | Resume | `<path d="M6 5v14"/><path d="M10 5l10 7-10 7V5z"/>` |
| `control.complete` | Complete | `<circle cx="12" cy="12" r="9"/><rect x="9" y="9" width="6" height="6" rx="1"/>` |
| `control.skip` | Skip | `<path d="M5 5l10 7-10 7V5z"/><path d="M19 5v14"/>` |
| `control.fastForward` | Fast-forward | `<path d="M3 6l9 6-9 6V6z"/><path d="M12 6l9 6-9 6V6z"/>` |
| `control.abandon` | Abandon | `<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>` |
| `control.backOut` | Back out | `<path d="M11 6L4 12l7 6V6z"/><path d="M20 6l-7 6 7 6V6z"/>` |

### 5.7 Actions: Display / UI (12), changes how things are shown
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `display.search` | Search | `<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>` |
| `display.filter` | Filter | `<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>` |
| `display.sort` | Sort | `<path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/>` |
| `display.expandAll` | Expand all | `<path d="M7 9l5-5 5 5M7 15l5 5 5-5"/>` |
| `display.collapseAll` | Collapse all | `<path d="M7 4l5 5 5-5M7 20l5-5 5 5"/>` |
| `display.previous` | Previous | `<path d="M6 15l6-6 6 6"/>` |
| `display.next` | Next | `<path d="M6 9l6 6 6-6"/>` |
| `display.widen` | Widen | `<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>` |
| `display.openFullPage` | Open full page | `<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>` |
| `display.close` | Close | `<path d="M6 6l12 12M18 6L6 18"/>` |
| `display.more` | More | `<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>` |
| `display.signOut` | Sign out | `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>` |

### 5.8 Navigation (8)
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `nav.list` | List | `<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>` |
| `nav.folder` | Folder | `<path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>` |
| `nav.setup` | Setup | `<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>` |
| `nav.integrations` | Integrations | `<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0V7z"/><path d="M12 17v5"/>` |
| `nav.license` | License | `<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M17 6l3 3M14 9l2.5 2.5"/>` |
| `nav.training` | Training | `<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>` |
| `nav.support` | Support | `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/>` |
| `nav.versions` | Versions | `<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.3"/>` |

### 5.9 Task types (10)
| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `taskType.standard` | Standard | `<circle cx="12" cy="12" r="7"/>` |
| `taskType.scripted` | Scripted | `<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>` |
| `taskType.automated` | Automated | `<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/><circle cx="12" cy="12" r="6.5"/>` |
| `taskType.businessVerification` | Business verification | `<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M8.5 14l2.5 2.5 4.5-5"/>` |
| `taskType.technicalVerification` | Technical verification | `<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M9.5 12l2 2 3-4"/>` |
| `taskType.checkpoint` | Checkpoint | `<circle cx="12" cy="12" r="4"/><circle cx="12" cy="3.8" r="1.6"/><circle cx="12" cy="20.2" r="1.6"/><circle cx="3.8" cy="12" r="1.6"/><circle cx="20.2" cy="12" r="1.6"/>` |
| `taskType.notification` | Notification | `<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>` |
| `taskType.collaboration` | Collaboration | `<rect x="2" y="6" width="13" height="12" rx="2"/><path d="M15 10l7-4v12l-7-4"/>` |
| `taskType.approval` | Approval | `<path d="M12 3a2.5 2.5 0 0 1 2.5 2.5c0 1.6-1 2.2-1 3.5H15a4 4 0 0 1 4 4v3H5v-3a4 4 0 0 1 4-4h1.5c0-1.3-1-1.9-1-3.5A2.5 2.5 0 0 1 12 3z"/><path d="M4 20.5h16"/>` |
| `taskType.milestone` | Milestone | `<path d="M12 4l5 5-5 5-5-5 5-5z"/><path d="M3 19h18"/>` |

### 5.10 Centres (7, Proposed)
A Centre is a dashboard-like place used by one persona in one role. All Centres share one base, four tiles. The badge says which Centre it is. The base is drawn smaller at bottom left and the badge at top right, the same way as the Global and Local objects and the user roles (base `translate(0 7) scale(0.7)`, stroke-width 2.86; badge stroke-width 1.5). `centre.base` is for places that do not name a Centre.

| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `centre.base` | Centre | `<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>` |
| `centre.commandControl` | Command & Control Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><circle cx="18.5" cy="6.5" r="3"/><path d="M18.5 1.5v2M18.5 9.5v2M13.5 6.5h2M21.5 6.5h2"/></g>` |
| `centre.migration` | Migration Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><path d="M14 6.5h8.5M19 3l3.5 3.5L19 10"/></g>` |
| `centre.executiveBriefing` | Executive Briefing Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><path d="M18.5 1.8l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"/></g>` |
| `centre.verification` | Verification Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><circle cx="18.5" cy="6.5" r="4.5"/><path d="M16.3 6.6l1.6 1.6 2.9-3.2"/></g>` |
| `centre.audit` | Audit Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><circle cx="17.3" cy="5.3" r="3.3"/><path d="M19.7 7.7l3 3"/></g>` |
| `centre.admin` | Admin Centre | `<g transform="translate(0 7) scale(0.7)" stroke-width="2.86"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></g><g stroke-width="1.5"><path d="M18.5 1.8l4 1.6v3.2c0 2.4-1.7 4.2-4 5-2.3-.8-4-2.6-4-5V3.4l4-1.6z"/></g>` |

### 5.11 Admin pages (2 new icons, Proposed)
RBM Admin has two menu items, **Admin Centre** and **Setup & Config**. Each opens a page whose content is an array of cards, one per admin domain. This repeats, so each domain gets one icon, used in its card and anywhere else the domain is named. Reuse an existing icon when one fits.

| Item or domain | Page | Icon key | Source |
|---|---|---|---|
| Admin Centre (menu item) | | `centre.admin` | New (5.10) |
| Setup & Config (menu item) | | `nav.setup` | Reused |
| Teams | Admin Centre | `object.team` | Reused |
| Workstreams | Admin Centre | `object.workstream` | Reused |
| License Management | Admin Centre | `nav.license` | Reused |
| Folders | Admin Centre | `nav.folder` | Reused |
| System Properties | Setup & Config | `admin.systemProperties` | New |
| Integrations | Setup & Config | `nav.integrations` | Reused |
| Diagnostics | Setup & Config | `admin.diagnostics` | New |
| `admin.scenarios` | Scenarios | `<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><path d="M14 16.5h6M14 19.5h4"/>` |

| Key | Label | SVG inside the 24 x 24 viewBox |
|---|---|---|
| `admin.systemProperties` | System Properties | `<path d="M9 3c-2 0-3 1-3 3v3c0 1.5-1 2.5-2.5 3 1.5.5 2.5 1.5 2.5 3v3c0 2 1 3 3 3"/><path d="M15 3c2 0 3 1 3 3v3c0 1.5 1 2.5 2.5 3-1.5.5-2.5 1.5-2.5 3v3c0 2-1 3-3 3"/>` |
| `admin.diagnostics` | Diagnostics | `<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>` |

The Admin Centre uses the Centre base with a plain shield badge. The shield has no tick, so it is not the Approved state, but check it at 16 px. Curly braces and the pulse line are not used anywhere else in the suite. More domains are expected: each new one needs one icon, by the same rule.

## 6. State versus action (the rule that shapes the code)
- A **state** is what an object is now. An **action** is what a person does. They are separate groups, and a drawing is never reused between them.
- Which actions are offered depends on the current state and the person's **platform role**. The UI never decides permission; it asks the platform.
- **Suspend and Close event are not buttons.** An Issue definition suspends a task, and closing the Issue resumes it. An event closes itself when its post-implementation tasks are complete.
- The Complete **action** is the stop symbol (circle with a square). The Complete **state** is a check in a ring and is the only thing Brand Green marks.

## 7. Transition tables (DRAFT until Andy Smith signs off)
Hold these as typed data, not in components. A transition component reads them, so the UI can only offer valid actions.

**Task** (12 states: initial, approved, pending, available, active, paused, suspended, complete, skipped, backingOut, backedOut, abandoned)

| From | Action | To | Notes |
|---|---|---|---|
| initial | approve | approved | |
| approved | (automatic) | pending or available | |
| pending | (automatic) | available | Waiting resolved |
| available | start | active | |
| active | complete | complete | |
| active | pause | paused | |
| paused | resume | active | |
| active | (Issue logged) | suspended | Not a button. The Issue definition decides |
| suspended | (Issue closed) | active | Automatic |
| suspended | backOut | backingOut | |
| backingOut | (automatic) | backedOut | |
| active | abandon | abandoned | |
| any state before complete | skip | skipped | Includes initial, approved and pending |

**Event** (10 states: initial, approved, scheduled, active, paused, complete, closed, abandoned, backingOut, backedOut)

| From | Action | To | Notes |
|---|---|---|---|
| initial | approve | approved | |
| approved | (automatic) | scheduled | |
| scheduled | start | active | The Manager starts the event |
| active | pause | paused | |
| paused | resume | active | |
| active | complete | complete | Only when every task is Complete, Skipped or Abandoned |
| complete | (automatic) | closed | When all post-implementation tasks are complete |
| active or paused | abandon | abandoned | Paused is assumed, to be confirmed |
| active or paused | backOut | backingOut | Never from a Complete event |
| backingOut | (automatic) | backedOut | |

## 8. What to build, in order
One piece per pull request, each with stories, tests and a check against the board.
1. **Registry and types:** the `rbmIcons` object, the key types, `RbmIcon` and `RbmIconButton`. Add the lint rule and the CI script (viewBox, stroke, caps, `currentColor`, no duplicates).
2. **Migrate existing code:** replace the old `action.*` keys and every `@mui/icons-material` import outside the icon package. Keep a deprecated alias for the old `action` group for one release only if something breaks. Report what you changed.
3. **State pill:** add the new states from section 5.4 to `RbmStatusPill`. Each state keeps its dot and label. **Do not remove Blocked or At risk from the pill, `RbmNode`, the focus rule or the engine flags.** They are parked in the icon suite only, but the Semantic and Command boards and the built Task Timeline still use them. Flag every place the old seven and the new 14 disagree, and ask Andy Smith before renaming anything (for example `pending`, labelled "Not started", against the new Available and Pending).
4. **Transition data and types:** typed task and event tables, and a function that returns the valid actions for a state and a role. Test every row in section 7.
5. **Storybook:** a story for every icon, every state (dot and icon), every action group, and the Proposed marker. Show all four density sizes.
6. **Visual check** against the Icon suite board, and a keyboard and screen-reader pass.

## 9. Not drawn, parked, or undecided (flag, do not guess)
- **Blocked** and **At risk** are parked in the icon suite. RBM does not define them, and it is not decided whether they are states or something else (for example health). Do not add them to the new icon registry. Do not remove them from existing code either (section 8, step 3). The old drawings are in `docs/rbm-parked-decisions.md`.
- **Fast-forward** is drawn, but its meaning is not defined and it is in no transition table. Do not wire it to anything.
- The **transition tables** in section 7 are drafts. Ask before building behaviour on them, and flag anything that differs.
- Candidate icons from the old library, **not drawn and not approved**: Import, Publish, Unpublish, Archive, First page, Last page, Expand, Collapse, Help, Info, Cancel, Refresh, Drag handle, Login, Logout, Upload, Download, Auto start, Auto complete, Card view, List view. The shell chrome icons (bell, menu, collapse, account menu, programme switcher, footer sync) are also still outside the suite.
- Event states are a separate lifecycle from task states. Do not assume they share a model.
- Whether the task type icon appears on task rows, in filters or in the record panel is undecided, and `RbmTask` has no `taskType` field yet.
- Whether other objects (Template, Runbook, Stage) come in global and local forms is undecided.
- **Checkpoint** (task type) is a ring with four small circles around it, like people round a table, chosen by Andy Smith on 23 Oct 2026 to suggest a multi-party activity. It replaces the location pin. Check it at 16 px against the Local badge and the Automated icon, and report if any are hard to tell apart.
- **Standard** (task type, formerly Manual) is a plain ring, chosen by Andy Smith on 23 Oct 2026. A standard task can be assigned to a person or a team, so a person figure was rejected (it is already the base of the user role icons). The key `taskType.manual` is gone; rename any use of it. **A plain ring is the least distinctive icon in the suite.** It is close to the state rings (Initial, Available, Skipped) and, on the proposed Timeline node, it sits inside a state ring and can read as a bullseye. Check it at 16 px against those, and report if it is hard to tell apart.
- **Copy and Clone** are two verbs, defined here as: **Copy** copies content or the entire object. **Clone** is a process that makes a new, independent record from an existing one, with a wizard-like set of options the user supplies (Andy Smith, 23 Oct 2026). Clone therefore opens a guided flow, not a one-click action. The wizard template is separate work and is not drawn: do not build the Clone flow, only the icon and the action name. Move up and Move down are one-step, plain arrows, so they are close to Previous and Next (chevrons) and to Sort: check them side by side at 16 px. The drag handle is drawn with filled dots and is the only icon with fills besides the half ring and the play triangle.
- **Milestone** (task type, a diamond on a baseline) and **Decision** (object, a diamond with a question mark) were chosen by Andy Smith on 23 Oct 2026 because the diamond is the convention in project management and in process modelling. They are distinct drawings, but both are diamonds: check them side by side at 16 px and report if they are hard to tell apart. The meaning of Milestone as a task type (what a person does with it) is not defined.
- **Centres** are Proposed by Andy Smith (23 Oct 2026, base B chosen). Only the Command & Control Centre exists as a page (the Command board). Migration, Executive Briefing, Verification and Audit Centres are not drawn. The one-line meanings on the board are my reading and need confirming. Check the Executive Briefing star and the Command & Control crosshair at 16 px, where the badges are small. The plain base was added by me, not requested: confirm or drop it.
- **Content Pack** (object) is a puzzle piece, chosen by Andy Smith on 23 Oct 2026 from five candidates (cube, puzzle piece, layers, sealed document, cube with badge) and a set of building-block and brick candidates. A Content Pack is a reusable, version-controlled, approved standard procedure, built from stages and tasks, that can be inserted into runbooks. The puzzle piece says "insertable" and "modular" but not "approved" or "versioned": those come from the label, the state and the version. A puzzle piece is a common icon for plug-ins and extensions in other tools, so check it at 16 px against `nav.integrations` (the plug) in the rail. Not drawn: a Content Pack card, its states, and how it appears inside a runbook.
- **Versions** (nav) is a tag, proposed by me on 23 Oct 2026 when Andy Smith split "Support & Versions" into Support and Versions. It is not approved: confirm or replace. A tag is a common icon for labels as well as versions: check it at 16 px against `nav.support` in the rail, and say if it reads as a label.
- **Sign out** (Display / UI) is an open doorway with an arrow leaving it, chosen by Andy Smith on 23 Oct 2026 from five candidates (door and arrow, open door, mirrored bracket, power symbol and the old right chevron). It replaces the right chevron used in the Profile menu. The arrow-leaving-a-frame idea is also behind `display.openFullPage`: check them side by side at 16 px. Sign out is a session action, not a change to the object, so it sits in Display / UI by Andy's decision, not by the rule that Display / UI never changes the object. Flag that if it matters.
- **Admin pages:** Admin Centre, System Properties and Diagnostics were drawn by me on 23 Oct 2026 and are Proposed. The card text and meanings on the board are my reading. The domain list for Setup & Config says "will include", so it is open. The page itself (the card array) is not drawn.
- **Event Group** (object) is the Event icon with two more behind it, chosen by Andy Smith on 24 Oct 2026 (G1) from six candidates (stacked events, calendar with bars, two linked events, event with a stack badge, timeline, brackets). An Event Group is a logical container for related events, so the KPIs of each event in it can be measured and compared over time (continuous improvement, and objective evidence of readiness for a Go/No-Go checkpoint). Check it at 16 px against `object.event` and `object.schedule`: the extra edge is the only difference. Not drawn: the Event Group's states, its record page and its KPI comparison view. Event Group is not yet in any menu.
- Where Dashboard, Plan, Readiness, Run, Improve, Reports and Tasks live in the navigation is undecided.

## 10. Changes this brief makes to other briefs
- **App shell brief:** section 6 (icons) now defers to this brief. The navigation keys are `nav.list`, `nav.folder`, `nav.setup`, `nav.integrations`, `nav.license`, `nav.training`, `nav.support` and `nav.versions`, plus `object.template`, `object.team` and `object.workstream`. Teams and Workstreams are separate menu items, and Workstreams uses the plain `object.workstream` icon. The brief predates the task type icons and the three new roles, so build those from this brief.
- **List page brief:** the status cell uses the 14 states here, not the old seven. Any old reference to `action.*` keys becomes `construct`, `control` or `display`.
- **Decisions:** record this work in `docs/rbm-parked-decisions.md` and flag every place the build differs from the board.

## 11. Acceptance
- All 109 icons render at the four density sizes and pass the CI script.
- No `@mui/icons-material` import outside the icon package, enforced by lint.
- Every state shows a text label. Colour is never the only signal.
- `RbmIconButton` will not compile without a label.
- A story exists for every icon, state and group, each marked Proposed.
- Tests cover every transition row, and the valid-actions function returns only what the table allows for the person's role.
- Anything that differs from the board is flagged in `docs/rbm-parked-decisions.md`.

## 12. Order of work
1. Read this brief, `docs/handoff-brief.md` and `docs/rbm-parked-decisions.md`, then the Icon suite board. Run `npm run check` and tell me what breaks.
2. Build in the order in section 8.
3. Run the acceptance checks. Report what you could not verify.

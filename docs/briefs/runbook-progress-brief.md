# RBM Runbook Progress: brief for Claude Code

Prepared 26 Oct 2026, asked for by Andy Smith. This brief covers one component, **`RbmRunbookProgress`**, a card for the **Executive Briefing Centre** (not drawn yet) that shows the progress of each runbook of the selected Event. It is built as its **own, independent component** as a first pass. Once it and `RbmWorkstreamProgress` are both built, they will be compared, and Andy Smith will consider one generic Exec Progress component. It builds on `docs/briefs/handoff-brief.md`, `docs/rbm-parked-decisions.md` and **`docs/briefs/workstream-progress-brief.md`**. Read those first. Everything there still applies, and **this brief only says where Runbook progress differs**.

**Status:** drawn on the Progress board (`Progress.dc.html`, section "Runbook progress", design version 128, tagged Proposed). Decisions by Andy Smith on 26 Oct 2026 are marked **(decided)**.

## 1. What is the same as Workstream progress
Copy these from the Workstream progress brief, sections 8 to 12. Do not redesign them.
- The card, title row and caption ("Ordered by start time · 10 of 12 shown").
- **Progress** is the share of the runbook's tasks that are Complete. The bar is **Blue Dark** while under way and **Brand Green only when the whole runbook is Complete**.
- **Status** is the **Icon suite state** (icon and word) with **Late** beside it as an amber clock and word. **The Planning engine decides Late** (decided).
- **Owner, start and end** (decided): D1 owner under the name and start over end in one column; D2 owner initials, then Start and End; D3 owner initials and End.
- **Tiers:** Essential (Runbook, Progress, Status); Useful (Tasks: Done, To do, Total; Open issues: High, Medium, Low); Detail (Owner, Start, End). Density comes from the scope: D0 Essential only; D1 and D2 all; D3 one line. Issue dots as on the Event vitals.
- **Order by earliest start time, ten rows at most,** then "+n more runbooks". **No click-through.**
- Loading (three grey rows, announced as loading) and empty ("No runbooks yet.").
- Keyboard and screen reader: a progress bar for each runbook, named like "Core network cutover, 31% complete, 5 of 16 tasks, Active, Late, 1 high, 2 medium issues, owner R. Patel, 24 Oct 22:30 to 25 Oct 03:00". Colour is never the only signal.

## 2. What is different
- **Scope (decided):** runbooks for the **selected Event only**. The Event's name comes from the context of the Executive Briefing Centre, so the card does not repeat it and has no Event column.
- **Names:** component `RbmRunbookProgress`; title "Runbook progress"; column "Runbook"; "+n more runbooks"; empty text "No runbooks yet."; loading label "Loading runbooks".
- **The name column is wider** (230 px at D1, 190 px at D2 and D3) because runbook names are longer.
- **Data shape:**
```ts
type RbmRunbookProgressItem = {
  id: string;
  name: string;
  owner: { name: string; initials: string };
  start: Date;
  end: Date;                       // planned, forecast or actual: to confirm
  state: string;                   // an Icon suite state key
  complete: number;
  total: number;
  issues: { high: number; medium: number; low: number };
  late: boolean;                   // from the Planning engine
};
```
The percentage is derived as in the Workstream progress brief, section 9.

## 3. Independence, and the comparison to come
- Build it as its own file with its own stories and tests. **Do not import from `RbmWorkstreamProgress`** yet, and do not make a shared base. The point is to see how much really is the same.
- When both exist, produce a short comparison: which code and styles are identical, what differs, and what a generic `RbmExecProgress` (a placeholder name) would need as props. The Progress board lists the likely differences.
- Keep the two sets of stories and tests the same shape.

## 4. What to build, in order
1. `RbmRunbookProgress` with the data shape above, theme tokens only (no hex values), computed percentage, state shown with the Icon suite icon and label, Late from the data.
2. Storybook stories for every state: Complete, Active, Active and Late, Paused, Scheduled, zero issues, a long name, more than ten rows, loading, empty, and each density D0 to D3.
3. Unit tests: percentage and rounding, `total` 0, order by start, the ten-row limit and "+n more runbooks", green only at Complete, Late beside the state, issue counts, accessible names, no hex values.
4. Keyboard and screen-reader checks, then a visual check against the Progress board.
5. One pull request. Not in the build order in the brief: ask Andy Smith where it goes.

## 5. Open points (flag, do not guess)
1. **Which states does a runbook have?** The Icon suite defines states for Tasks and Events only. I used the Event states that fit (Scheduled, Active, Paused, Complete).
2. **Start and end:** planned, forecast or actual? Should a Late row also show its planned end?
3. **Anything else a runbook needs?** The current stage is not drawn. Not decided.
4. **Same open points as Workstream progress:** the tier rule with three Detail values, D0 and D3 contents, Late on Paused or Scheduled, ties in the order, the Simple ring and Row variant, and the build order. **No decision at this stage** (Andy Smith will come back to these).

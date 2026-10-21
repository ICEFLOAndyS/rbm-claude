# RBM React component library: handoff brief for Claude Code

Copy of the project note `claude/rbm-claude-code-handoff.md` (Feature Factory v3.0 project), taken 21 Oct 2026, design version 63. The project note is the master. RBM = Runbook Management, the ICEFLO Limited product on ServiceNow.

## 1. Goal
Start a library of working, tested React components for RBM, built on MUI, with ICEFLO brand tokens in the theme. The design is the source of truth. Build what is drawn, name things as named here, and ask when the design is silent.

## 2. Sources (read these first)
- **Design file:** the "RBM Design System" canvas artifact: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv. It is private to its owner, so Claude Code must be signed in to the same claude.ai account to open it. If it cannot, ask the owner to copy the board source files into the project. Boards are `.dc.html` files listed in `project/canvas.json`.
- **Boards:** Main (Foundations), Semantic (semantic colour), Components, Runbook (Pattern: Live cutover), Density, DensityInUse, DashProgramme / DashReadiness / DashCommand (dashboards), RecordPattern / RecordPatternInUse (list to record), Icons (icon suite), Cards, CardsInUse, Progress, Shell (app shell), Templates (page templates), **Command (Command & Control Centre, the most developed board)**.
- **Brand:** ICEFLO Brand Guidelines v1.0. Anything on a board tagged "Proposed" is an extension for software use and still needs sign-off.
- **Project notes:** `claude/rbm-parked-decisions.md` (agreed rules and open questions). Read it before building, and update it when decisions change.

## 3. Tokens (put in the MUI theme)
- Colour: Deep Blue #23326F, Blue Dark #354BA8, Blue Base #5274FF, Blue Mid #7891FF, Blue Light #A6B5FF, Red #F00034, Red Inner #C61E3A, Amber #FF9F1C, Amber Deep #A45200, Green #84CC16, Green Deep #3F6B06, Mist #F4F6F9, Rule #E3E6EC, Silver #C3C8D2, Slate #5B6472, Ink #1F2430. (Already in `src/theme/tokens.ts`.)
- Type: Inter. Radius: 12 px (controls), 14 px (cards).
- Semantic state colours: Complete = Green. Active = Blue Dark. At risk = Amber ringed dot. Paused = Amber ring with Slate centre. Blocked = Red. Pending = Silver. A text label is always shown; colour is never the only signal. Brand Green means Complete only, never "Active".
- Task node shapes: circle = task, diamond = milestone, rounded square = checkpoint.
- Density levels: D0 (command wall), D1 Comfortable (default), D2 and below as on the Density boards.

## 4. Naming (use these exactly)
- **Event** (a cutover event; the user is the Event Manager, also called the Implementation or Runbook Manager), **Runbook** (IDs like RBK0000001), **Stage**, **Task**. Tasks are identified by WBS: runbook 1, stage 1.3, task 1.3.5. Do not use "#45" task numbers.
- Regions of the Command & Control Centre: **Page header**, **Event vitals** (Progress, Issues, Start, Forecast end time, left to right), **Event ribbon**, **Task Timeline**, **Hot-topics strip** (Blockers, Next checkpoint, Milestones, Collaboration, Watchers).
- Never use "War room". It is **Collaboration**.
- Component prefix `Rbm`. Examples: `RbmCommandCentre`, `RbmEventVitals`, `RbmEventRibbon`, `RbmTaskTimeline`, `RbmTaskRow`, `RbmHotTopicsStrip`, `RbmEventBar`, `RbmAlertCounter`, `RbmNode`, `RbmStatusPill`.

## 5. Recommended build order
1. Theme and tokens, with a small token test and a Storybook page.
2. Base parts: `RbmNode` (3 shapes by 7 states), `RbmStatusPill`, avatar, buttons (CTA green, secondary, ghost), tags, `RbmAlertCounter`.
3. `RbmEventVitals` (the four cards, with the ring and the Forecast end time RAG disc).
4. **`RbmEventRibbon`** (see section 7).
5. `RbmTaskRow` and `RbmTaskTimeline` (grouping, focus rule, actions, bulk bar, undo toast).
6. `RbmHotTopicsStrip` and its cards.
7. `RbmCommandCentre` page template, `RbmEventBar` (sticky compact bar), Layout panel.
Each component needs: Storybook stories for every state, unit tests, keyboard and screen-reader behaviour, and visual checks at D1 and D0.

## 6. Command & Control Centre: agreed rules
- **Data comes from the RBM planning engine:** RAG state, forecast end, ready, late and alert flags. ServiceNow attribute names are not identified yet. Define a typed data contract and a mock adapter now, bind to ServiceNow later.
- **Permissions:** platform roles, checked by the relevant API. The UI shows or hides actions to match, and never decides.
- **Planning engine decides what is ready.** There is no "Start early". A user changes dependencies or constraints and the engine re-plans.
- **Task Timeline focus rule:** show only tasks that need attention: Active, Ready to start, Up next (cap 5 released tasks, then "+n more"), Blocked, Has an issue, Late to start, Late to finish, At risk or paused, Failed check. Hide Complete (after a 60-second linger), Skipped, and Not started and not ready. Runbooks and stages with nothing in focus are not shown.
- **Sorting:** always by start time (actual if started, otherwise forecast, marked FC), grouped by runbook then stage.
- **Linger time:** 60 seconds by default. It will become an Event Setting later, so make it a prop.
- **Runbook filter:** multi-select. It scopes the Task Timeline and the Hot-topics strip, not the Event vitals or the ribbon.
- **Task actions:** Start, Complete (split button: Complete at…, with note, Pause, Skip), checkpoint Result (Pass, Fail, Pass with comment), Resume, View (the blocker), Undo (during the linger). Bulk Start and Complete are in the first release. Undo and conflict toasts. Every action is written to the event log.
- **Row action buttons are all one size: 120 by 32 px, whatever the label.** Icon and label are centred, and the actions form one clean column at the right of the row. Labels are one word (Start, Complete, Result, Resume, View, Undo). Weight comes from colour, not width: Start is a Blue Dark outline; Complete and Result are Green split buttons, with a 28 px caret segment inside the 120 px (the caret holds the menu); Resume, View and Undo are neutral outlines. Rows with no action (Up next) leave the column empty. Do not let the button grow with its label. Test with long translations and truncate the label instead.
- **Alert counter** (page header, beside the state pill): Red for a blocker, failed check or Red forecast; Amber when only the forecast is late; hidden when healthy. A click opens a popover of alerts, most serious first. There is no alert strip.
- **Event actions menu** (burger, right of the page header): Raise issue, Raise blocker, Add event note, Notify stakeholders, Pause event, Export event log, **Layout**, Event settings.
- **Layout:** the user drags the Event ribbon, Task Timeline and Hot-topics strip into their preferred order. Page header and Event vitals are fixed. Saved as a personal preference, with Reset to default. Keyboard dragging (Space, arrows, Space) is required. Suggested drag layer: dnd-kit.
- **Vertical budget:** the Task Timeline is full width, with a minimum of 8 rows. The ribbon collapses to one 56 px summary line (open by default; choice remembered). A sticky 48 px `RbmEventBar` appears when the Event vitals scroll off screen (name, state, alert counter, progress, open issues, Forecast end time). The Task Timeline toolbar sticks beneath it. Both the compact bar and the collapsed ribbon are drawn on the Command board ("Compact event bar and collapsed ribbon").
- **Next checkpoint card** has a **Join call** button, in the same style as Collaboration. It joins the call linked to the checkpoint; hidden if none; disabled with the opening time if not yet open.
- Forecast end time is the most important number on the page. It is the rightmost vital card, and it keeps the large figure, the RAG disc and the words ("+12 min Behind Schedule").

## 7. `RbmEventRibbon` requirement (includes overlapping stages)
Build as plain SVG (or absolutely positioned elements) inside React, not a chart library. It is a schedule, not a data chart.
- **One lane per runbook** on a shared clock, with the hour grid, a "now" line, planned end, forecast end (hatched overrun), stage bars, milestone diamonds and checkpoint squares. Time maps to width with one scale function.
- **Overlapping stages must be supported.** Within a runbook, sort stages by forecast start and place each in the first sub-row where it does not overlap, opening a new sub-row only when none is free (interval packing, fewest rows).
  - Overlap is judged on forecast times.
  - A lane's height grows with its busiest moment: one row of 28 px per sub-row (about 28 px for each extra row). A lane with no overlap stays one row.
  - Milestones and checkpoints sit on a thin line at the top of the lane, never on a stage bar.
  - **Cap at 3 sub-rows** per lane, then show "+n more stages overlapping". Expanding the lane shows the rest.
  - A stage keeps its sub-row as the forecast moves, so bars do not jump.
  - Labels (WBS and name) go inside a bar when it fits, otherwise into the tooltip.
  - The collapsed ribbon is unaffected: one chip per runbook with its forecast end.
- **Accessibility:** a text alternative per lane ("Interfaces, forecast end 05:27, 27 minutes behind"), tooltips on stages, keyboard focus on stages and milestones. Never colour alone.
- **Tests:** overlapping stages (2, 3 and 5 at once), a stage that starts before the window and one that ends after it, milestones close together, a forecast overrun, a runbook with no stages, and a long runbook (dozens of stages).
- **Design to update:** the Command board's vertical-budget table assumes a fixed 252 px ribbon. It should become "252 px plus about 28 px per extra sub-row". An overlapping example is not yet drawn on the board.

## 8. Not yet decided or not yet drawn
- Whether the Hot-topics cards can also be reordered in the Layout panel, or only the three regions.
- Whether the Blockers card "+ Raise" needs a different pattern.
- ServiceNow attribute names for RAG, forecast end and alerts.
- Spikes needed: real-time updates from ServiceNow; a task-level Gantt view (a separate view from the ribbon).
- Choice of MUI X pieces (grid, charts, drag and drop). Evaluate before committing.
- Event Settings board (linger time and other settings) is not yet drawn.
- Overlapping-stages example on the ribbon is not yet drawn.

## 9. Working agreement
- Do not invent visual design. If the board does not show it, ask or propose it and flag it.
- Keep the density low. Keep text short and plain.
- Record decisions in `claude/rbm-parked-decisions.md`, and flag any place where the build had to differ from the design.

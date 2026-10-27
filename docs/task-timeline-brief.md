# RBM Task Timeline brief: the revised Task Timeline

Prepared 26 Oct 2026. Part 1 of this brief defines **the Task Timeline as it is today**, so the revision starts from a shared, written baseline. Part 2, the revision itself, is a placeholder (section 17) until Andy Smith says what should change.

Related notes: `claude/rbm-timeline-node-briefing.md` (task type icons as nodes, Proposed and not drawn), `claude/rbm-parked-decisions.md` (the decisions log), `claude/rbm-claude-code-handoff.md` (the build brief) and `docs/prototype.md` and `docs/data-model.md` (in the repository; not read for this brief).

## 1. How this definition was made, and what to trust

- **Design:** the Command board (`Command.dc.html`) of the RBM Design System: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv. Sections used: "Full-width Task Timeline", "Task Timeline scope", "Runbooks in the Task Timeline", "Task nodes", "Task row", "Acting on tasks", "Behaviour", "Density and responsive behaviour" and "React and MUI".
- **Build:** the decisions log, entries for 21 and 22 Oct 2026 (`RbmNode`, `RbmTaskRow` and `RbmTaskAction`, `RbmTaskTimeline`, the browser prototype, the Task Timeline additions of 22 Oct, `RbmBusy`, and the collapsing regions).
- **Not read: the code.** The copy of the repository that this session can reach (`ICEFLOAndyS/rbm-claude` on GitHub) holds only the first scaffold commit. The built components are in Andy's own repository, which was not available. So **this is the build as it was logged, not as the code now stands.** Before the revision is built, someone with the code should check each statement marked **Build** against it and correct this brief.
- **Checked against the code, 27 Oct 2026 (Claude Code).** The statements marked **Build** were checked on branch `rbm-app-shell` (commit 81ae2d0). Wrong statements are corrected in place and marked **(corrected 27 Oct)**; section 18 lists every result.
- **Labels used below:** **Board** (drawn), **Build** (built and logged), **Proposed** (built or suggested but not drawn), **Not drawn** (the design is silent), **Open** (undecided).

## 2. What the Task Timeline is for

The Task Timeline is the region of the Command & Control Centre that shows **what needs attention now**: current status, progress, issues and blockers. It is not a history of what has been done. It is the working area of the Event Manager, who starts and completes tasks from it. (Board, "Task Timeline scope".)

It is one of three movable regions, with the Event ribbon and the Hot-topics strip. The Page header and Event vitals are fixed.

## 3. Where it sits on the page

- **Full width.** The Task Timeline takes the whole page width. Title, tag, assignee, duration and action sit on one line with no truncation. The Hot-topics strip sits directly beneath it. (Board.)
- **Vertical budget at D1** (Board): top bar 64, page header 120, Event vitals 146, Event ribbon 252 (56 collapsed), Task Timeline toolbar and summary 104, rows 52 each, Hot-topics strip 206, footer, padding and gaps 136. The Task Timeline is the only region that grows.
- **Minimum of 8 rows** while it is open: **456 px in the build** (toolbar 64 + summary line 40 + 8 rows at the D2 row height of 44; `TIMELINE_MIN_HEIGHT`). **(corrected 27 Oct; was 520 px)** The page scrolls; the compact event bar (48 px) pins to the top once the Event vitals scroll away, and the Task Timeline toolbar sticks beneath it (`stickyTop`). (Board, Build.)
- **Collapse.** Like the ribbon, the Task Timeline can collapse to one 56 px line: the eyebrow "TASK TIMELINE", summary chips ("12 in focus · 3 late · 2 blocked") and "Expand". Collapsed, its toolbar and summary line go with it, so nothing sticks under the compact event bar. The 8-row minimum does not apply while it is collapsed. (Build, decided by Andy Smith, 22 Oct 2026. **Not drawn:** the collapsed line.)
- **Order.** The user can reorder the three regions in the Layout panel. Saved per user (`LayoutPreference`, with `collapsed: { ribbon, timeline, hotTopics }`).

## 4. The focus rule: what is shown

A task is shown if **any** of these is true. It appears once even if several apply. (Board, Build `focusRule.ts`.)

| # | Rule | A task is in focus when | How the row shows it |
|---|---|---|---|
| 1 | Active | It has started and has not finished | Active row (tint and bar) |
| 2 | Ready to start | Every predecessor is complete and it has not started | Tag: Ready to start |
| 3 | Up next | It is not ready, but becomes ready the moment one task in focus completes. If one completion releases several, all show | Dashed tag: Up next · after 1.3.5 |
| 4 | Blocked | It has an open blocker | Red node, tag: Blocked by BLK-n |
| 5 | Has an issue | It has an open issue | Tag: Issue INC-n |
| 6 | Late to start | It is ready (or planned to be) and its planned start has passed | Tag: Late to start, amber delta |
| 7 | Late to finish | It is active and past its planned end, or forecast to finish late | Tag: Late to finish, amber delta |
| 8 | At risk or paused | It is At risk or Paused | Amber node, tag with the reason |
| 9 | Failed check | A checkpoint has a failed or rejected result | Tag: Test result: Fail |

- **Not shown:** Complete (hidden after the linger, below; still counted in stage headers and Progress), Skipped, and Not started and not ready. A hidden task appears the moment it matches a rule.
- **Up next** looks exactly one step ahead and never further. It shows at most **5 released tasks** per completion, then a row "+n more up next after 1.3.5" that shows the rest. (Board, Build.)
- **Complete linger.** A task that completes stays for `lingerSeconds` (**60 by default**) with "Complete · leaves in 0:42", then leaves. It will become an Event Setting. (Board, Build.)
- **Scope switch.** **Focus** (the rule above) or **All**. "Show all" switches the scope to All and clears Mine, Late and Blocked; it does not clear the runbook filter. (Build; whether it should clear the runbook filter is **Not drawn**.)
- **The engine decides.** Active, ready, late, at risk and blocked flags come from the RBM planning engine. The UI never works them out. (Handoff brief.)

## 5. Structure and order

- **Hierarchy:** runbook, then stage, then task, identified by **WBS** (runbook 1, stage 1.3, task 1.3.5). The WBS is the task's identity and never changes when the list is sorted. Runbooks also have a record number, such as RBK0000001.
- **Order:** within a stage, tasks always sort by **start time**: the actual start once started, the forecast until then (shown in italic Slate, marked FC). Severity never reorders the list; it is carried by the node, tag, alert counter and Hot-topics strip. So WBS numbers appear out of order, and that is expected. (Board.)
- **Nothing empty is drawn.** A runbook or stage with no task in focus has no band, row or placeholder. (Board.)
- **Runbook band:** Deep Blue, 60 px, white text. WBS in Blue Light, the name, the record number in an outlined pill, counts, the runbook's own forecast end, RAG mark and gap (from the engine). Each runbook is its own panel with a 12 px gap above and below. (Board.)
- **Runbook progress on the band** (Build, 22 Oct): a PROGRESS eyebrow, a 160 × 8 px bar, the percentage and "69 of 113". It counts every task in the runbook, not only those in focus, and the percentage rounds down. Green on a translucent white track, with the figures written beside it. **Not drawn.**
- **Stage band:** Board: Mist, 44 px, Navy text, state dot, WBS, name, times, progress bar and "4 of 8". **Build: the density's row height (44 px at D2, the Task Timeline's level) with two lines** **(corrected 27 Oct; the 22 Oct log said 52 px, before the density rule)**, the name and "02:12 – 04:42 · 6 in focus", then PROGRESS (a 160 px bar, percentage and complete of total) and FORECAST END (time, RAG mark and gap). Fixed block widths line stage bars up under runbook bars. `StageView` gains `plannedEnd`, `gapMinutes` and `rag`. **Not drawn.**
- Bands collapse and expand. A **Collapse all / Expand all** link sits in the summary line (Build, 22 Oct. **Not drawn**); inside a runbook, Collapse all stages / Expand all stages.
- **Large events.** The board's example is 15,000 tasks across 4 runbooks and 22 stages. **The build's large fixture is 15,000 tasks across 30 runbooks and 300 stages** (corrected 27 Oct). Above 200 tasks in view (`LARGE_TIMELINE`), runbooks with nothing blocked or late to start are collapsed. (Board, Build.)

## 6. The task row

52 px high at D1 (Board). Eight parts, in a fixed grid (Board, Build `RbmTaskRow`):

| Part | Rule |
|---|---|
| Time | 13 px, tabular. Actual in Ink. Forecast in italic Slate marked FC |
| Node | Shape and state, with the spine through its centre (section 7) |
| WBS | Slate (Blue Dark on an active row) |
| Title | 15 px, semibold, extra bold on an active row. Complete and skipped rows are Slate |
| Tag | **At most one**: why the task is in focus. It always has a label |
| Assignee | 28 px avatar with initials. Empty if unassigned |
| Duration and delta | Planned minutes, with the delta below: late Amber Deep, early Green Deep, a forecast Amber Deep with "fc" |
| Action | One button, 120 × 32 px whatever the label |

- **Only active rows have a tint** (Blue Dark tint and a 4 px bar on the left). Several tasks can be active at once. An active row also shows "Started 03:35 · 5m elapsed of 25m planned" (Build, **Proposed**).
- **Tag choice.** The board shows one tag per row. The build chooses by priority (**Proposed**, mine): blocked, failed check, issue, paused, at risk (the reason a person gave), late to finish, late to start, needs a result, ready, up next. The tags are `RbmTag` kinds: Late to start, Late to finish, Ready to start, Needs a result, Up next, Blocked, Issue, Complete (the linger), At risk and Paused.
- **Selection.** A checkbox appears to the left of the time on hover, focus or selection, in MUI's default style (**Proposed, not drawn**). A selected row uses MUI's selection tint.
- **D2 Compact** rows are 40 px on the board ("about a quarter more tasks on screen"). **The build uses the density token: 44 px at D2**, the Task Timeline's level in the Command & Control Centre (density rule, 22 Oct 2026). The row's height, padding, gaps and text all come from the region's density. **(corrected 27 Oct)** **D0 and D3 are not drawn.**

## 7. The node and the spine

`RbmNode` (Board "Task nodes", Build):
- **Three kinds by seven states.** Shape says what it is: circle for a task, diamond for a milestone, rounded square for a checkpoint. A mark says the state: tick (Complete), play triangle (In progress, code name `active`), ringed dot (At risk and Paused), cross (Blocked), empty ring (Not started, code name `pending`), dashed slash (Skipped). Colour comes from `theme.palette.status`; every state has its own mark, so colour is never the only signal. Brand Green means Complete only.
- **Sizes:** 28 px at D1, 24 px at D2; the ribbon uses 18 px. **Not drawn:** D0 and D3.
- **Spine:** `spine={{ above, below }}`, each `done` (Green) or `todo` (Rule grey), 2 px through the node centre. The line is Green where work is done and grey after the current task.
- **Accessible name:** "<Kind>, <state>", for example "Milestone, At risk". `decorative` hides it when the row already says the state. The node takes no focus.
- The same node set is used in the Task Timeline, the Event ribbon and the Hot-topics strip.
- **In flight, not part of today's definition:** replacing the node with the Task Type icon (`claude/rbm-timeline-node-briefing.md`). It is Proposed and **not drawn**. The task type is not yet a field on `RbmTask`.

## 8. Toolbar, filters and the summary line

- **Runbook filter** (`RbmRunbookFilter`, Board): a multi-select. Each row has a checkbox, WBS, name, record number, RAG mark and the number of tasks in focus. "Only" (on hover) selects one runbook and clears the rest. Select all and Clear at the foot. A search field appears above six runbooks. Nothing selected means all. The Task Timeline and the Hot-topics strip follow it; the Event vitals and ribbon never do. The choice is remembered per user and event. The Board also draws a "Filtered" mark; the build has **not** built it (**Not drawn**).
- **Mine, Late and Blocked** chips, each with a count. They combine and only narrow. (Board, Build.)
- **Focus / All** scope switch (section 4).
- **Search** (Build, 22 Oct. **Not drawn**): "Search tasks", 220 px, after the chips. Every word must appear, in any order, ignoring case, in the **task title** only (`searchFields` can take more fields later). The first 8 matches show as suggestions (WBS, title with matches in bold, runbook). Arrow keys and Enter pick one; Escape closes the list, then clears; `/` jumps to the field. While searching, every match is shown (the Up next cap is lifted) and quiet runbooks with a match open. With Focus on, matches outside Focus are counted ("6 more outside Focus") with one click to switch to All.
- **Filters inside a runbook** (Build, 22 Oct. **Not drawn**): under each open runbook band, a 48 px row with "Search this runbook", Mine, Late and Blocked chips counted for that runbook, "Showing 1 of 8 in this runbook" with Clear, and Collapse all stages / Expand all stages. They narrow only that runbook, on top of the toolbar's filters, and are not saved. A runbook whose filters match nothing stays visible ("No tasks in this runbook match.") so the filters can always be cleared.
- **Agreed rule: filters only ever narrow, and nothing is hidden silently.** The **summary line** says what is hidden, for example "Showing 10 of 122 tasks in 2 of 3 runbooks · 83 complete and 29 not ready hidden", from counts the server sends, with Collapse all, Show all and, while searching, the matching text. Its background (#FBFCFE, token `surfaceTint`) is drawn but is not a brand colour.
- **Vitals links** (Board): "Forecast end time filters the Task Timeline to late tasks" and "Progress clears the filter". **Not wired in the build** (the log says so for the Forecast end link; the Progress link is not logged).

## 9. Acting on tasks

(Board "Acting on tasks", Build `RbmTaskAction`.)
- **Action button**, 120 × 32 px, one word with an icon: **Start** (Blue Dark outline), **Complete** and **Result** (Green split buttons with a 28 px caret), **Resume**, **View** and **Undo** (neutral outlines). Up next rows have none. The API decides which action a row offers (`action` and `completeOptions`), from platform roles. The UI never decides.
- **Complete menu:** Complete now (with "Actual end 03:41"), Complete at…, Complete with note…, Pause, Skip task…. Both halves of the Result button open the **Result dialog**: Pass, Fail, Pass with comment, Cancel, Confirm (Confirm disabled until a result is chosen; **not drawn**).
- **Start or Complete** is one click. The row changes at once (optimistic, reconciled with the server), an **Undo message appears for 60 seconds**, and the planning engine releases the next tasks and updates the forecast.
- **Bulk bar** (Board): appears with a selection. Start and Complete are enabled only when valid for every selected row. A bulk Complete shows one Undo. It sticks to the bottom of the Task Timeline (**Proposed**); disabled buttons fade to 45% (**Proposed**).
- **Messages:** Undo and conflict or refusal messages show at the bottom centre (**Proposed**) in the drawn message style, and still show while the region is collapsed.
- **Inputs that need more** (Complete at…, with note…, Skip task…, Pass with comment) are reported to the page. **Not drawn:** those inputs. The prototype uses the browser's prompt.
- **Click a task** opens the slide-in from the right; the timeline keeps its scroll position. **Click a blocker or issue** opens its record in the same slide-in. (Board.) In the prototype the slide-in links show a short message instead.
- **Every action is written to the event log.** (Handoff brief.)

## 10. Live behaviour and feedback

- **Live updates** (Board): a changed task flashes a Blue Dark tint for two seconds and is announced politely (`aria-live="polite"`). **The page never reorders under the user's cursor.** The build has **not** built the flash and announcement (Build: "Not built yet").
- **Jump to now:** N scrolls the first active task into view (Board: and keeps it there until the user scrolls away).
- **Large requests, `RbmBusy`** (Build, 22 Oct. **Not drawn**): Show all, the All scope, "more outside Focus" and Expand all run a query that may be large. A light scrim covers the region (marked `aria-busy` and inert), and a centred card shows a spinner and "Loading all tasks…", with Cancel. It appears only after 250 ms, stays at least 400 ms, and shows at once when the result is heavy (over 200 rows). A failure says "Could not load all tasks. Try again." and leaves the region as it was.
- **Real-time updates from ServiceNow** are the largest unknown and need a spike. (Board, Open.)

## 11. Keyboard and screen reader

- **Keys** (Build): J and K move between tasks (one tab stop for the rows), N jumps to the first active task, Enter opens the slide-in, S starts and C completes the focused row, `/` focuses search. The Complete menu and Result dialog use arrows, Enter and Escape. On a virtualised list J and K move between rows on the page; far-off rows are reached by scrolling.
- **Names:** each action has a full name for screen readers ("Complete task 1.3.5 Startup application UI"). The runbook band's name carries its progress ("61% complete, 69 of 113 tasks"). Controls inside a runbook name that runbook ("Late in Payroll cutover"). Collapse buttons are named after their region ("Collapse Task Timeline").
- **Colour is never the only signal:** every state has a mark and a text label; tags always have a label.

## 12. Data and engine

- **`RbmTask`** (Build): the engine supplies state, times, delta and tag; the API supplies `action` and `completeOptions`. `Task.completedAt` (the linger and Undo run from the click, since the actual end can be back-dated) and `Task.resumedAt` with `workedMinutes` were added after review. `StageView` carries `plannedEnd`, `gapMinutes`, `rag` and `critical`.
- **Fake engine** (`src/engine`, Build): a stand-in for the RBM planning engine with its rules written in `docs/data-model.md`. Milestones finish by themselves; Amber means up to 15 minutes late; the critical path follows all tied predecessors.
- **Fixtures:** the board's example runbooks, and a large event of about 15,000 tasks generated by a seeded script. Real ServiceNow attribute names are not identified; a typed contract and mock adapter stand in.
- **Persistence:** layout order and collapsed flags are kept by a preference store (localStorage in the prototype). The board says the runbook filter is remembered per user and event. **The build does not save it:** the page holds it in memory only, so it resets on reload. **(checked 27 Oct)**
- **Task type:** not a field yet (see section 7).

## 13. Performance

(Build.) Rows are **virtualised above 200 tasks in view** (`LARGE_TIMELINE`): only rows near the screen are drawn, each at the density's row height (44 px at D2). Below 200 every row is drawn. **(corrected 27 Oct; was "52 px each")** Stages measure before their first paint, which removed a 27 s Show all on the large event; **Show all now takes about 3.5 to 3.9 s in the development build** (it was 3.2 s before the stage summaries and runbook filter rows). Search filters the whole set before anything is drawn. Stage summaries and nodes use inline styles, not MUI `sx`, because there can be hundreds of stages. Collapsing quiet runbooks above about 200 tasks is built. Clock ticks on the large event cost about 200 to 250 ms in a production build; moving the engine to a Web Worker is the fallback. The Vitest limit is 15 s because whole-page tests are slow.

## 14. Components and files

Components (prefix `Rbm`): `RbmTaskTimeline`, `RbmTaskRow`, `RbmTaskAction`, `RbmNode`, `RbmTag`, `RbmAvatar`, `RbmRunbookFilter`, `RbmBusy` (`useRbmBusy`, `RbmBusyOverlay`), the shared region frame (`RbmRegion`, `RbmRegionCollapsed`, `RbmRegionToggle`, `RbmSummaryChip`, `RbmEyebrow`), and the page `RbmCommandCentre` with `RbmLayoutPanel`. The focus rule is `focusRule.ts`. The design's sketch uses `<RbmTaskTimeline tasks groupBy="stage" onTaskOpen />` and `RbmTaskNode`; the build calls it `RbmNode`. MUI is the base (`List`, `ButtonGroup`, `Menu`, `Snackbar`, `Popover`); MUI Lab's Timeline was rejected because it cannot do shapes or virtualisation.

## 15. Where the build differs from the design

- **WBS colour:** Slate, as the board's rule says. The drawing shows Silver, which fails contrast on white (1.6:1).
- **Stage band:** 52 px with a summary, against the board's 44 px.
- **Tags:** the board shows a "Filtered" mark and a "Test result: Fail" tag style; the build has the tag (styled like Blocked) and not the mark.
- **Red on Deep Blue:** Red and Green forecast marks on the runbook band use their signal colours; only Amber is drawn there, and Red is hard to read. **Open, needs a design decision.**
- **Not built:** the two-second flash and live announcement; the "Filtered" mark; the Forecast-end filter from the vitals card; D0 and D3 sizes; the slide-in.
- **Not drawn (built on MUI defaults):** the search field and suggestions, the in-runbook filter row, the stage summary, runbook progress, Collapse all, the busy card, the selection checkbox, the collapsed region, the bulk bar's sticking, disabled bulk buttons, hover and pressed states.
- **Design to update:** the Command board still shows the earlier stage band, no search, no in-runbook filters, no collapsed Task Timeline, and plain diamond milestones (Milestone is now a task type).

## 16. Related decisions that touch the Task Timeline

- **Task types** (10): Standard (formerly Manual), Scripted, Automated, Business verification, Technical verification, Checkpoint, Notification, Collaboration, Approval, Milestone. Proposed to replace the node (separate briefing). The "(\*)" note on the two verification types never came through.
- **States:** the node uses its seven drawn states. The icon suite has a different set (Initial, Approved, Pending, Available, Active, Paused, Suspended, Complete, Skipped, Backing out, Backed out, Abandoned, Scheduled, Closed), and parks Blocked and At risk. **Do not rename the node's states** until that is decided; the focus rule, status pill and engine flags still use Blocked and At risk.
- **Scenarios:** an Event has one scenario, fixed at creation. Nothing in the Task Timeline depends on it today.

## 17. Part 2: the revision (to be defined)

**First revision decided in principle (26 Oct 2026, Proposed; drawn on the Command board, "Task row, revised"):**
- The row columns become: Time, Type (node), State (icon and word), Action, WBS, Title, Tag, Assignee, Plan.
- The node shows the task type (Icon suite types) with a neutral ring. The state column shows the Icon suite state, icon and word.
- **Update 26 Oct 2026:** Andy Smith accepted the Type and State columns, and put the Action back on the far right (columns: Time, Type, State, WBS, Title, Tag, Assignee, Plan, Action). An Active task has Complete (default), Pause and Skip; Pause and Skip need a reason (one reason for all in a bulk action). Restart is left out until defined. There is no Result button: a Task Outcome is entered as part of Complete for any task type that needs one (first built for Business and Technical Verification: Pass, Fail or Pass with issues, then a general comment; the comment is required for Pass with issues only, not for Pass or Fail), and the tag reads "Needs an outcome". Drawn as a split button with a menu behind the caret, an outcome panel and a reason panel (Proposed). The button form (A, label, advised at D1; B, icon with label on hover, advised at D2 and D3) is still not chosen.
- Open: other task types that need an outcome; where the outcome shows after Complete; actions for other states; reason details; Undo for Skip and Pause.
- Open: state vocabulary (Timeline vs Icon suite), Tag and state overlap, glyphs for Result, View and Undo, D0 and D3 sizes.
- Effect on sections 6, 7 and 9 above: they describe the current build and stay until the revision is chosen.

Not started. Andy Smith to say what should change. Questions to settle when it starts:
1. What is wrong with the Task Timeline today, for which user, and what should the revised one do better?
2. Is the focus rule (section 4) staying, or does the revision change what is shown?
3. Does the revision change the row, the node (task type icons), the toolbar, or the grouping?
4. Does the Event ribbon relate to it (for example a task-level Gantt, which the board marks as needing a spike)?
5. Which densities must it cover, including D0 and D3, which are not drawn?
6. What stays fixed: WBS identity, sorting by start time, actions from the API, filters that only narrow?

## 18. Checked against the code (27 Oct 2026)

Checked by Claude Code on `rbm-app-shell` (commit 81ae2d0). The decisions log is a summary; the code is the truth.

**Corrected in this brief:**
| Statement | Code |
|---|---|
| Minimum height 520 px (section 3) | 456 px: 64 + 40 + 8 × 44 (`TIMELINE_MIN_HEIGHT`) |
| Stage band 52 px (section 5) | The density row height: 44 px at D2 |
| D2 rows 40 px "not logged" (section 6) | 44 px, the D2 density token |
| Virtual rows 52 px each (section 13) | Density row height; virtualised only above 200 tasks in view |
| Board's 4 runbooks and 22 stages (section 5) | Large fixture: 15,000 tasks, 30 runbooks, 300 stages |
| Runbook filter remembered (section 12) | Not saved; held in memory by the page |

**Confirmed as written:** the focus rule's reasons, Up next cap of 5 (`UP_NEXT_CAP`), 60 s linger by default, Skipped never shown; Show all sets All and clears Mine, Late and Blocked but not the runbook filter; the runbook band at 60 px; runbook and stage progress (160 px bar, 8 px on the runbook band, 6 px on the stage band, percentage rounded down); the summary line ("Showing … · n complete and n not ready hidden", Collapse all or Expand all, Show all, "n more outside Focus"); search at 220 px (200 px small) with 8 suggestions; `RbmBusy` at 250 ms and 400 ms; the active row tint and "Started 03:35 · 5m elapsed of 25m planned"; keys J, K, N and `/` in the timeline, S, C and Enter on a row; the action set `start`, `complete`, `result`, `resume`, `view`, `undo` with the Complete options `completeAt`, `completeWithNote`, `pause`, `skip` and results `pass`, `fail`, `passWithComment`.

**Nuance:** the Undo message lasts `lingerSeconds` (60 by default), not a fixed 60 s.

**Part 2 (section 17) is not built.** The row still has the node and no Type or State columns, the Result action is still there, and there is no outcome or reason panel. The button form (A or B) is still to be chosen before it can be built.

**Not checked:**
1. The current Show all timing on the 15,000-task event (last logged at 3.5 to 3.9 s in the development build). It needs a timed browser run.
2. Whether `docs/prototype.md` and `docs/data-model.md` agree with this brief.

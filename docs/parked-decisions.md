# RBM design: parked decisions and backlog

Copy of the project note `claude/rbm-parked-decisions.md` (Feature Factory v3.0 project), taken 21 Oct 2026. Claude Code records decisions here; copy new entries back to the project note, which stays the master.

Source: RBM Design System canvas, Command & Control Centre board. Updated 20 Oct 2026.

## Event Settings (to design on the Settings board)
- **Completed task linger time.** A completed task stays in the Task Timeline for a short time before it leaves. Default 60 seconds. To become an Event Setting.

## Agreed rules (Command & Control Centre)
- **Terms:** Task Timeline (the task region), Hot-topics strip (the cards under it; it began as a right-hand rail), Collaboration (never "War room"), Event Vitals (Progress, Issues, Start, Forecast End Time, left to right).
- Event state, a red alert counter and owner are in the page header. The alert strip is gone. Event-level actions are in a menu at the right of the page header.
- **Alert counter:** Red for a blocker, failed check or Red forecast; Amber when only the forecast is late; not shown when healthy. A click opens a popover listing each alert, most serious first. The planning engine raises the alerts. The counter also shows in the compact event bar.
- **Full-width layout accepted:** collapsible Event ribbon (open by default, choice remembered), sticky 48 px compact event bar on scroll, Task Timeline minimum of 8 rows with the Hot-topics strip directly beneath by default. Compact bar and collapsed ribbon are drawn on the board.
- **Layout option** in the event actions menu: the user drags the Event ribbon, Task Timeline and Hot-topics strip into their preferred order. Page header (with alert counter) and Event vitals are fixed. Saved as a personal preference; Reset to default.
- The **Next checkpoint card** has a Join call button (same style as Collaboration). It joins the call linked to the checkpoint; hidden if none, disabled with the opening time if not yet open.
- **Task Timeline shows only tasks that need attention (Focus scope):** Active, Ready to start, Up next (max 5 released tasks, then "+n more"), Blocked, Has an issue, Late to start, Late to finish, At risk or paused, Failed check. Runbooks and stages with nothing in focus are not shown.
- Tasks **sort by start time:** actual if started, forecast otherwise. Identifier is WBS (runbook 1, stage 1.3, task 1.3.5). Runbooks have IDs such as RBK0000001.
- **Task actions** (Start, Complete with split menu, Resume, checkpoint Result, Undo for 60 s, bulk Start and Complete in the first release). Permissions come from platform roles and are checked by the API. The planning engine always decides what is ready; no "Start early". A user can edit dependencies or constraints and the engine re-plans.
- RAG state, forecast end, alerts, late and ready flags come from the RBM planning engine. ServiceNow attribute names to be identified at integration time.
- **Event ribbon:** one lane per runbook on a shared clock; always shows every runbook. Runbook filter (multi-select) scopes the Task Timeline and the Hot-topics strip, not the Event Vitals or ribbon.

## Agreed rules (component library)

### 21 Oct 2026: `RbmStatusPill` (decided by Andy Smith)
- **Ringed dot as drawn.** At risk and Paused use the Semantic board mark: a 16 px Amber disc, a 2 px white gap and a 10 px centre. The At risk centre is #F36C00 (token `amberInner`, the board's name "Amber Inner", Proposed on the Foundations and Semantic boards).
- **Pills for every state.** At risk, Paused, Blocked and Skipped have a pill too. Each is the drawn pill (Command board page header) with the Semantic board dot. **Differs from design: not drawn. Needs sign-off and a drawing.**
- **Compact size.** `size="compact"` is 24 px tall with 12 px text, as drawn in the Command board compact event bar. A ringed dot keeps its 16 px size in the compact pill (not drawn).
- **Status colours live in the theme.** `theme.palette.status` is the single source, as on the Semantic board ("React and MUI"). Skipped is added (Slate dot and text). Stock MUI colours follow the board: success = Green Deep, info = Blue Dark, warning = Amber Deep, error = Red Inner.
- **Names.** The state stays `active` (the brief and the Command board say Active). The Semantic board calls it `inProgress`. `pending` is labelled "Not started".

### 21 Oct 2026: setup
- MUI 9.5 (upgraded from 7.3). MUI X 9.16 is compatible but not added until each piece is evaluated.
- Inter is loaded in Storybook with `@fontsource-variable/inter`. The library does not bundle the font; apps load it.

### 21 Oct 2026: theme and tokens
The theme now follows the Foundations board ("MUI theme mapping"). Changes from the scaffold:
- `palette.primary` is Deep Blue with Blue Dark as `light` (was Blue Dark with Deep Blue as `dark`).
- `palette.secondary` is the green CTA with Deep Blue text (was Deep Blue). Green buttons use `color="secondary"`.
- `palette.background.default` is White (was Mist). Mist is `palette.grey[100]`.
- `spacing` is the 4 px base unit (was MUI's 8 px). `RbmStatusPill` spacing values are doubled to keep its drawn size.
- New colour tokens from the board: Yellow #F0E800 (green ring centre) and Green Text #5E9A0E (large text only). `amberCore` is renamed `amberInner`, the board's name.
- Type scale from the board, with the line heights drawn on its samples. Mapping to MUI variants is ours, as the board names only the font: Display = `display`, h1–h3 = `h1`–`h3`, Intro = `lead`, Body = `body1`, Compact body = `body2`, Eyebrow = `overline`, Caption = `caption`, Figures = `figures`.
- Elevation tokens (Proposed): card none, menu and dialog shadows as drawn. Not yet wired to MUI menus and dialogs.
- Not built yet, Proposed on the board: the 2 px Blue Dark focus ring and Slate form-field borders. They come with the first controls.

### 21 Oct 2026: `RbmNode`
Built as drawn on the Command board ("Task nodes"): three kinds by seven states, the board's SVG geometry, colours from `theme.palette.status`.
- **Name.** `RbmNode`, as in the brief. The board's code sketch calls it `RbmTaskNode` with `shape="circle"`; the build uses `kind="task" | "milestone" | "checkpoint"`, so the accessible name can say what the item is.
- **Sizes.** 28 px at D1 (default) and 24 px at D2, as drawn; `size` takes any number for the ribbon and cards. **Not drawn: the node size at D0 (Command) and D3 (Dense).**
- **Spine.** Optional `spine={{ above, below }}`, each `done` (Green) or `todo` (Rule), 2 px wide through the node centre, as in the Task Timeline drawing.
- **Accessibility.** A node is an image named "<Kind>, <state>", for example "Milestone, At risk". `decorative` hides it when the row already says the state. The node takes no focus; the ribbon and the timeline own keyboard focus.

### 21 Oct 2026: `RbmAvatar`
Built as drawn on the Command board: initials in Deep Blue, weight 800, on a Blue Light circle. Sizes 28 (task row, 10 px initials), 32 (12 px) and 36 (13 px). Built on MUI `Avatar`.
- Initials are the first letters of the first and last words of the name; `initials` overrides them. Screen readers hear the full name.
- Unassigned tasks show no avatar, as drawn ("Empty if unassigned").
- **Not drawn:** photo avatars and a tooltip with the name. **Left for the Collaboration card:** the overlapping group with a "+3" chip, whose grey #EEF0F4 is not a token.

### 21 Oct 2026: buttons
Buttons are MUI `Button`, styled in the theme as drawn on the Components board ("Buttons and pills") at D1: 48 px minimum height, 24 px side padding, 12 px radius, 16 px bold text. No wrapper component, so every MUI button follows the board.
- CTA = `variant="contained" color="secondary"` (Green, Deep Blue text). Secondary = `contained primary` (Deep Blue). Outlined = `outlined primary` (2 px Deep Blue). Ghost = `text primary` (underlined Blue Dark, 16 px padding). Destructive = `contained error` (Red Inner). Disabled = Rule fill, Slate text. The brief's "secondary" is the board's Deep Blue fill.
- `RbmIconButton`: the 48 px square with a 2 px Deep Blue outline ("More actions"). Its `label` is required, because it has no visible text.
- The Proposed 2 px Blue Dark focus ring is set once for everything that takes focus, with a 2 px offset (**the offset is not drawn**).
- **Not drawn:** hover and pressed states (MUI's defaults for now), disabled outlined and ghost buttons, and button sizes at D0, D2 and D3 (they come with the density provider). The 120 by 32 px row action button comes with `RbmTaskRow`.

### 21 Oct 2026: `RbmTag`
Built as drawn in the Command board's task rows: a 22 px pill, Rule border, 12 px semibold text, with a 7 px dot or a 13 px icon in the label's colour. One `kind` per reason a task is in focus: Late to start, Late to finish (clock, Amber Deep), Ready to start and Needs a result (Silver dot, Slate), Up next (chevron, dashed Silver border), Blocked (Red dot, Red Inner), Issue (warning, Amber Deep), Complete (tick, Green Deep, shown during the linger). `label` names the record, for example "Blocked by BLK-102".
- **At risk and Paused (decided by Andy Smith):** tags are enabled for every task state, even where a row may not use them. The reason a task is at risk or paused is drawn in the Command board's rows ("Test data refresh slow", "Paused by A. Smith"): an 11 px ringed dot (Amber, with an Amber Inner or a Slate centre) and Amber Deep text. An earlier version used the Semantic board's icons before these drawings were found.
- Any kind of item (task, milestone, checkpoint) can carry any tag.
- The 13 px tag icons are copied from the board. They move to the icon suite (`rbmIcons`) when it is built.

### 21 Oct 2026: `RbmAlertCounter`
Built as drawn on the Command board ("Alert counter"): hidden when healthy; Red Inner with white text when any alert is Red, Amber with Ink text when the only alerts are Amber; a bell and the count in words and digits ("1 alert", "3 alerts"). 30 px in the page header, 24 px (`size="compact"`) in the compact event bar. A click opens a popover: "Alerts" and "Most serious first", then each alert with its mark, title, detail and a link.
- **Data contract:** `alerts: { id, severity: 'red' | 'amber', title, detail?, action?: { label, onSelect } }[]`. The planning engine sets the severity; the component only sorts and counts.
- **Order (decided by Andy Smith: follow the rule).** Red before Amber, keeping the engine's order within a severity. The board's sample, which lists a late forecast between two Red alerts, should be redrawn to match.
- **Shadow (decided by Andy Smith).** The popover uses the Foundations board menu elevation (`elevation.menu`), not the shadow drawn with the alert popover. The Command board drawing should be updated to match.
- **Accessibility.** The counter is a button with `aria-haspopup="dialog"` and `aria-expanded`. **Decided by Andy Smith:** its name also says the most serious alert, because Red and Amber differ only in colour, for example "3 alerts, most serious: 2 blockers are holding 3 tasks". The name starts with the visible count. The popover is a dialog named "Alerts"; Escape closes it and returns focus. Each link is a button that runs its action and closes the popover.

### 21 Oct 2026: fallback styles (decided by Andy Smith)
Where the design gives no RBM style or token (for example hover and pressed states), MUI's defaults are the fallback. Flag the gap, but do not hold the build for it.

### 21 Oct 2026: `RbmEventVitals`
Built as drawn on the Command board ("Event vitals" and the page): four cards in a 1.55 : 1.3 : 1 : 1.65 grid, left to right Progress, Issues, Start of event, Forecast end time.
- **Data contract** (`RbmEventVitalsData`): progress counts (complete, active, blocked, total), open issues by severity (high, medium, low), start (time, elapsed and planned minutes), forecast (end, planned end, RAG, gap in minutes). The RAG and the gap come from the planning engine; the page never works them out. `mockEventVitals()` holds the board's values until the ServiceNow adapter is built. Times are `Date`s, shown as 24-hour times in the given time zone.
- **Rings.** `RbmRing` draws the board's ring: Rule track, one-unit gaps between segments, the figure in the centre. A non-zero segment too small to show keeps half a unit (**not drawn**). Progress: Complete Green, In progress Blue Dark, Blocked Red; the centre is the share complete. Issues: High Red, Medium Amber, Low Silver; the centre is the number open. The Progress legend says "In progress", as drawn.
- **Forecast end time.** The clock in a tinted disc in the RAG colour, the 36 px time, the gap in words with an icon, and the planned end. **Not drawn:** the arrow for ahead of schedule (built as the behind arrow mirrored, in the RAG colour) and the colour of an ahead gap (it follows the engine's RAG). The gap always shows two digits ("+12", "−08"), following the board's examples.
- **Links.** Each card opens something when given a handler: Progress the task list, Issues the issue list, Forecast the late tasks and critical path. **Not drawn:** what the Start of event card opens; it is a link only if a handler is given. A button stretched over the card makes the card the link, so "Raise issue" stays its own button. "Raise issue" shows only when the user may raise issues.
- **Accessibility.** Each card is a region named by its heading. Rings, the disc and the calendar chip are hidden from screen readers; the legend (a definition list), the time and the gap in words carry the meaning. The start date is read as "24 May, 22:00".
- **Not built yet:** the D0 (Command) sizes, which come with the density provider.

### 21 Oct 2026: `RbmEventRibbon`
Built from the Command board ("Event ribbon" and "Compact event bar and collapsed ribbon") and section 7 of the brief, as absolutely positioned boxes with one time scale, not a chart library.
- **As drawn:** one lane per runbook on a shared clock (names left of 188 px, forecasts in the right column), hour grid, the black now marker with its time, stage bars by WBS (Green complete, Blue Dark current, Silver to come), the planned-end tick, the forecast overrun hatched in the lane's RAG colour, and the forecast, RAG mark and short gap ("+12m") at the right. The legend as drawn. The collapsed ribbon: one 56 px line, one chip per runbook with its RAG mark, "ends", forecast end and gap, and "Expand".
- **Data contract** (`RbmRibbonRunbook`): planned end, forecast end, RAG and gap from the planning engine; stages and markers with forecast times and a state. `mockRibbon()` holds the board's three runbooks; `mockOverlappingRunbook()` holds an overlapping example.
- **Overlapping stages (brief section 7).** Interval packing on forecast times, fewest rows. A lane is 54 px for one sub-row, as drawn, and 28 px more for each extra one. At most 3 sub-rows, then "+n more stages overlapping", which expands the lane ("Show fewer stages" closes it). A stage keeps its sub-row while it is still free as the forecast moves.
- **Differs from the board, following the brief:** milestones and checkpoints sit on a thin Rule line above the stage rows, never on a bar (the board draws them on the bar). They are 18 px nodes (22 px on the board).
- **Proposed, not drawn:**
  - Each sub-row is the WBS label over the bar, as drawn for one row; the stage name is in the tooltip. (The brief allows the name inside the bar when it fits; it is not shown there yet.)
  - "+n more stages overlapping" sits under the runbook name, in 11 px Deep Blue.
  - "Collapse" with an up chevron at the top right of the expanded ribbon, mirroring the drawn "Expand". The parent can pass `collapsed` and `onCollapsedChange` to remember the choice per user.
  - A stage cut by the window edge has a flat end on that side.
  - Hour labels thin to every 2, 3, 4, 6, 12 or 24 hours on long events, so they stay 60 px apart.
  - The default window runs from the hour before the first start to the half hour after the last end.
  - When the latest stage is hidden behind "+n more", its overrun hatch sits on the last row shown.
  - Stages in other states (At risk, Blocked, Paused, Skipped) use their status colour.
- **Hairline grey.** The hour grid and lane rules use #EEF0F4, drawn on the Command board but not in the brand palette. It is the token `hairline`, which needs sign-off.
- **Accessibility.** The ribbon is a region named "Event ribbon". Each lane is a group with a text alternative, for example "Interfaces, forecast end 05:27, 27 minutes behind". Every stage and marker takes focus, with a tooltip and a name ("Stage 1.3 Migrate and start up, 02:00 to 04:30, Active"). Focus moves by Tab, one stop per stage; arrow-key movement within a lane may be better for long runbooks.
- **Design to update:** the Command board's vertical budget (252 px plus about 28 px per extra sub-row), an overlapping example, the markers' new place above the bars, and the Collapse control.

### 21 Oct 2026: `RbmTaskRow` and `RbmTaskAction`
Built as drawn on the Command board ("Task row", "Acting on tasks"): the eight parts in the drawn grid (time, node with spine, WBS, title, tag, assignee, duration and delta, action), 52 px high. Active rows alone have the Blue Dark tint and 4 px bar. Actual starts in Ink; forecasts in italic Slate marked FC. Late deltas in Amber Deep, early in Green Deep.
- **Action button** (`RbmTaskAction`), 120 by 32 px whatever the label; long labels are cut. Start: Blue Dark outline. Complete and Result: Green split buttons, 28 px caret. Resume, View, Undo: neutral outlines. One word each, with the drawn icons. Up next has none. Full names for screen readers ("Complete task 1.3.5 Startup application UI").
- **Complete menu** as drawn: Complete now (with "Actual end 03:41"), Complete at…, Complete with note…, Pause, Skip task…. `completeOptions` limits it to what the user may use. It uses the Foundations menu elevation (as decided for popovers).
- **Result dialog** as drawn: Pass, Fail, Pass with comment, Cancel, Confirm. Both halves of the Result button open it. **Not drawn:** Confirm stays disabled until a result is chosen (the drawing shows Pass already picked).
- **Data contract** (`RbmTask`): the engine supplies state, times, delta and tag; the API decides `action` and `completeOptions`, so the row shows only what the user may do. Choices that need more input (Complete at…, with note…, Skip task…, Pass with comment) are reported to the page, which collects the input. **Not drawn:** those inputs.
- **Keyboard:** S starts and C completes the focused row, Enter opens the slide-in (J and K come with the Task Timeline). The menu and dialog work with arrows, Enter and Escape.
- **Differs from the drawing:** WBS numbers are Slate, as the board's written rule says. The drawing shows Silver, which is too faint for text on white (1.6:1).
- **Proposed, not drawn:** the selection checkbox appears to the left of the time on hover, focus or selection, in MUI's default style; the selected row uses MUI's selection tint. An active row shows "Started 03:35 · 5m elapsed of 25m planned"; the line is left out if the start is still ahead. Hover and focus states in the menu use MUI's defaults. Durations are always in minutes.

### 21 Oct 2026: `RbmTaskTimeline`
Built from the Command board ("Task Timeline scope", "Runbooks in the Task Timeline", "Acting on tasks", "Behaviour" and the page).
- **Focus rule** (`focusRule.ts`), applied to the planning engine's flags: Active, Ready to start, Up next, Blocked, Has an issue, Late to start, Late to finish, At risk or paused, Failed check. Complete tasks linger for `lingerSeconds` (60 by default) with "Complete · leaves in 0:42", then leave; skipped and not-ready tasks are hidden. Up next shows at most 5 tasks per completion, then "+n more up next after 1.3.5", which shows the rest.
- **Grouping and order:** runbook panels (Deep Blue 60 px band: WBS, name, record number pill, counts, forecast end, RAG and gap), then stage bands (Mist 44 px: state dot, WBS, name, times, progress bar and "4 of 8"), then rows sorted by start time. Runbooks and stages with nothing in focus are not shown. Bands collapse and expand.
- **Toolbar:** the drawn runbook filter (`RbmRunbookFilter`: checkbox, WBS, name, record number, RAG mark and focus count per runbook; Only on hover; Select all and Clear; search above six; nothing selected means all), Mine, Late and Blocked (they combine and only narrow, with counts), and Focus or All.
- **Summary line:** "Showing 10 of 122 tasks in 2 of 3 runbooks · 83 complete and 29 not ready hidden", from the counts the server sends. "Show all" switches to All and clears Mine, Late and Blocked (**not drawn**: whether it also clears the runbook filter; it does not).
- **Actions:** each row's action goes to the page. Complete shows "1.3.5 completed at 03:41" with Undo for the linger; Undo calls the undo action. The bulk bar (as drawn) appears with a selection; Start and Complete are enabled only when valid for every selected row; bulk Complete shows one Undo message. A conflict or refusal from the API is shown with `notice` in the drawn message style.
- **Keyboard:** J and K move between tasks (one tab stop for the rows), N jumps to the first active task, Enter, S and C on the row.
- **Proposed, not drawn:**
  - Undo and conflict messages at the bottom centre; the bulk bar sticks to the bottom of the Task Timeline.
  - Disabled bulk buttons are faded to 45%.
  - "+n more up next" row, indented to the title column.
  - Red and Green on the Deep Blue runbook band use their signal colours; only Amber is drawn there. **Red on Deep Blue is hard to read; needs a design decision.**
  - "No tasks match." when nothing is in focus.
  - The summary line background #FBFCFE is drawn but not in the brand palette (token `surfaceTint`, needs sign-off).
- **Not built yet:** virtualising long lists (the MUI X evaluation is open), collapsing quiet runbooks above about 200 tasks, the two-second Blue Dark flash and polite announcement for live updates, and the "Filtered" mark (not drawn).

### 21 Oct 2026: `RbmHotTopicsStrip` and its cards
Built as drawn on the Command board ("Hot-topics strip"): five cards in the drawn 1.3 : 1 : 1.25 : 1.05 : 0.95 grid, ordered by urgency. As the board's code sketch shows, the cards are passed into the strip: `RbmBlockers`, `RbmNextCheckpoint`, `RbmMilestones`, `RbmCollaboration`, `RbmWatchers`, on a shared `RbmHotTopicCard` (icon, title, count, header action).
- **As drawn:** Blockers (record number, title, severity as a dot and a word, "Holds 1.4.2 · 3 tasks", "+ Raise"); Next checkpoint (node, title, "in 02:05" countdown, forecast and gap, "Call open · 4 joined", Join call); Milestones (node, title, time, late in Amber Deep); Collaboration ("Live · 7 people", Join call, four faces then "+3"); Watchers (title, "Watching since 01:00"). Join call is a secondary button, never green. Three items per card, then "n more". Every row opens its record through `onOpen`.
- **Data:** typed contracts for each card and mocks with the board's values. The page passes data already filtered by the runbook filter.
- **Rules from the board:** a list card with nothing in it collapses to its header with a zero count. The checkpoint's Join call is hidden with no call, and disabled with its opening time before the call opens. "+ Raise" shows only when the user may raise a blocker. Below 1200 px wide the strip becomes two rows (three cards, then two); below 900 px the cards stack.
- **Proposed, not drawn:**
  - The collapse control: a chevron at the right of each card header (cards can be collapsed and the choice remembered, via `collapsed` and `onCollapsedChange`).
  - "n more" as a Blue Dark link row under the third item.
  - The disabled Join call reads "Opens 05:30" on a Mist fill, with "Call opens 05:30" beside it in Slate; "Not open yet" when no time is known.
  - A Collaboration card with no live call says "No live call" and has no Join call.
  - Countdown reads "now" once the planned time has passed.
- **Still open (from the parked list):** whether the Blockers card "+ Raise" needs a different pattern, and whether the Hot-topics cards can be reordered in the Layout panel.

### 21 Oct 2026: `RbmEventBar`
Built as drawn on the Command board ("Compact event bar and collapsed ribbon"): 48 px, white, Rule border and the drawn shadow. Event number and name, the compact state pill, the compact alert counter, a divider, the progress bar (Complete, In progress, Blocked) with "68% complete", open issues, and at the right the Forecast end time with the RAG disc and the gap ("+12 min"), then the chevron back to the top. It takes the same `RbmEventVitalsData` as the Event vitals.
- Each part is a link (progress, issues, forecast; the counter opens its own popover). `visible` shows it only while the Event vitals are off screen; it slides in and out. The page decides when (it watches the vitals).
- **Proposed, not drawn:** the open-issues dot follows the worst open issue (Red, the Amber ringed dot, or Silver) and is left out when there are none; the gap reads "On Schedule" when there is none and "−08 min" when ahead.

## Open questions
- Should the Hot-topics cards (Blockers, Next checkpoint and so on) also be reorderable in the Layout panel, or only the three regions?
- Does the Blockers card "+ Raise" need a different pattern?
- Task-level Gantt view: needs a spike.
- ServiceNow real-time updates: needs a spike.
- Status on-dark values: only Active has one drawn (Blue Mid). The Semantic board says a test should check every state has one.
- The Semantic board's lint rule that bans hex values outside the theme package is not set up yet.

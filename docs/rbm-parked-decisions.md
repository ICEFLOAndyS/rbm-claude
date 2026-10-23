# RBM design: parked decisions and backlog

Source: RBM Design System canvas, Command & Control Centre board, and the component library (rbm-claude). Updated 22 Oct 2026. This project note is the master. Claude Code records decisions in its repository copy (`docs/`); copy new entries here. `prototype.md` and `data-model.md` are in the repository's `docs/` folder.

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
- MUI 9.5 (upgraded from 7.3). MUI X 9.16 is compatible. The Data Grid (Pro) is chosen for the List of records page (22 Oct 2026, below); other MUI X pieces are still evaluated one at a time.
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

### 21 Oct 2026: `RbmLayoutPanel`
Built as drawn on the Command board ("Layout"): a 380 px panel with "Layout", the close button and the line about the profile; the Page header and Event vitals locked at the top (lock icon, FIXED); "Drag to reorder" with the Event ribbon, Task Timeline and Hot-topics strip, each with a grip; Reset to default and Done.
- **Dragging** with dnd-kit (as the board suggests; `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` added). Drag from the grip; the row lifts (2 px Blue Dark border, the drawn tint, shadow and slight tilt) and a 4 px Blue Dark line shows where it will land. From the keyboard, Space picks a row up, the arrow keys move it, Space drops it and Escape cancels; a screen reader hears where it is at each step. The new order goes to the page on drop, and the page re-orders at once.
- The order is the page's preference (`order`, `onChange`), saved to the user's profile by the page. Reset to default puts back Event ribbon, Task Timeline, Hot-topics strip.
- **Differs from the drawing:** the drop line sits where the row will land (above the Task Timeline when moving up past it); the drawing shows it between the two rows. In a keyboard move the lifted row stays in place; with the pointer it follows the pointer.
- The lifted-row tint #EEF1FF is drawn but not in the brand palette (token `liftTint`, needs sign-off).
- **Still open:** whether the Hot-topics cards can also be reordered here.

### 21 Oct 2026: `RbmCommandCentre`
The page template, as drawn on the Command board ("The page", "Layout", "Acting on tasks", "React and MUI"): a Mist content area with 32 px padding and 24 px gaps; the Page header and Event vitals fixed at the top, then the Event ribbon, Task Timeline and Hot-topics strip in the user's order. Typed slots keyed by region name (`vitals`, `ribbon`, `timeline`, `hotTopics`), as the board's sketch shows.
- **Page header** as drawn: "Run / event name" breadcrumb, the 28 px title "E12345 · Weekend Payroll Cutover" with the state pill and the alert counter, "Owner … · Window Sat 24 May 22:00 – Sun 25 May 06:00", and the 40 px event actions button at the right.
- **Event actions menu** as drawn, in order: Raise issue, Raise blocker, Add event note, Notify stakeholders, Pause event ("Holds every active task"), Export event log, Layout ("Order the page regions"), Event settings. Only the actions the page passes (the user's permissions) are shown; Layout is always there.
- **Layout** opens `RbmLayoutPanel` in a small panel beside the menu, not a new page, so the page re-orders in view. `layout` and `onLayoutChange` let the page keep the order in the user's profile.
- **Compact event bar:** `RbmEventBar` pins to the top without taking space, and shows only while the Event vitals are off screen (watched with IntersectionObserver). Its chevron scrolls back to the top.
- **8-row minimum:** the Task Timeline region keeps room for its toolbar, summary line and 8 rows (520 px) while it is open. Collapsed, it is one line (changed 22 Oct 2026, below).
- **Left to the app shell:** the top bar, the sidebar and the programme selector above the breadcrumb (Shell board).
- **Built in the prototype:** the Task Timeline toolbar sticking beneath the compact event bar (`stickyTop`).
- **Differs from the text:** the vertical budget says 16 px gaps between regions; the page drawing has 24 px, and the drawing is followed.

### 21 Oct 2026: browser prototype (JSON fixtures, fake engine)
See [prototype.md](prototype.md) and [data-model.md](data-model.md). The data contract was reviewed and agreed by Andy Smith (decisions in data-model.md, section 8).
- **Contract additions after review:** `Task.completedAt` (the linger and Undo run from the click, because the actual end can be back-dated) and `Task.resumedAt` (with `workedMinutes`, the forecast keeps a pause).
- **Fake engine** (`src/engine`), clearly a stand-in for the RBM planning engine, with every rule in data-model.md. Milestones finish by themselves; the next checkpoint is the earliest without a result; Amber is up to 15 minutes late.
- **Real components, not stand-ins** (decision 6), fed by adapters. The connected page shares one runbook filter between the Task Timeline and the Hot-topics strip, and keeps the layout and the ribbon's collapsed state in `LayoutPreferenceStore` (localStorage).
- **Task tag priority** (ours; the board shows one tag per row): blocked, failed check, issue, paused, at risk (a person's reason), late to finish, late to start, needs a result, ready, up next.
- **Large event:** Task Timeline rows are virtualised (only rows near the screen are drawn, 52 px each). Above 200 tasks in view, runbooks with nothing blocked or late start collapsed, as the board's scope section says. The Event ribbon now keeps one shared tooltip and uses inline positions, so clock ticks stay fast.
- **Differs from or extends the design (flagged):**
  - **Not drawn:** a "Test result: Fail" tag (`failedCheck`), styled like Blocked.
  - **Prototype stand-ins, not design:**
    - The inputs behind Complete at…, Complete with note…, Skip task… and Pass with comment use the browser's prompt.
    - Links that open the slide-in (tasks, blockers, issue list, task list, critical path, calls, event actions) show a short message instead.
    - The demo's control bar is not part of the design.
  - **The ribbon's tooltip** uses MUI's default look (the fallback rule).
  - **Not wired yet:** "Forecast end time filters the Task Timeline to late tasks" (Behaviour section).
  - **Keyboard on a virtualised timeline:** J and K move between the rows on the page. Rows far off screen are reached by scrolling, not by J and K.
- **Not verified:**
  - **Wall display:** the page fits at 3840 by 2160, but at D1 sizes; the D0 (Command) sizes are not built.
  - **Real ServiceNow data and attribute names.**
  - **Clock ticks on the large event** cost about 200–250 ms (production build) once a real second. Moving the engine to a Web Worker would free the page if that becomes a problem.

### 22 Oct 2026: Event ribbon filters, starting with Critical path (asked by Andy Smith)
- **Planning engine:** every stage carries `critical`, true when any of its tasks is on the critical path. The fake engine sets it from the event-wide critical path. In the Weekend fixture that is all five Payroll cutover stages; in the large event, the ten stages of the runbook with the latest forecast end.
- **Ribbon:** a Critical path filter, off by default. When on, the ribbon shows only critical stages, and milestones and checkpoints on the critical path. Critical stages are packed again, so lanes need fewer sub-rows.
  - Every lane stays, because the ribbon always shows every runbook.
  - A lane with no critical stages says "No stages on the critical path" and keeps its forecast, without a floating overrun or planned-end tick.
  - The setting is saved per user, in `LayoutPreference` beside the region order and the collapsed ribbon.
- **Not drawn:** the ribbon's filters. The control is a chip in the Task Timeline toolbar's style at 24 px, at the top left of the ribbon, with a tick when on. It is not shown on the collapsed ribbon.
- **Answers (Andy Smith, 22 Oct 2026):**
  - The planning engine computes the critical path event-wide. There is no runbook critical path.
  - Save the filter at user level. Done: `ribbonCriticalOnly` in `LayoutPreference`.
  - Mark the stages on the critical path, whether the filter is on or off.
- **Not drawn (flagged): the critical-stage mark.** A critical stage bar has a 2 px Ink outline with a 1 px gap, so it shows on every state colour and is not a colour signal. The legend adds "On the critical path". Screen readers hear "…, on the critical path" at the end of the stage's name, and the tooltip says the same. Markers are not outlined; their nodes are drawn and the filter covers them.

### 22 Oct 2026: every movable region collapses like the Event ribbon (asked by Andy Smith)
The Event ribbon's collapse becomes the model for the Event ribbon, Task Timeline and Hot-topics strip. The Page header and Event vitals stay fixed and never collapse.
- **Shared frame, `RbmRegion`:** `RbmRegionCollapsed` (the drawn 56 px line: eyebrow title, summary chips, "Expand ⌄"), `RbmRegionToggle` ("Collapse ⌃" / "Expand ⌄"), `RbmSummaryChip` and `RbmEyebrow`. The ribbon now uses them, with no visual change.
- **Toggle names:** each button is named after its region ("Collapse Task Timeline"), since three are on one page. The visible text stays "Collapse" or "Expand".
- **Expanded:** each region keeps its drawn header, with Collapse at the top right. The ribbon is unchanged; the Task Timeline has Collapse at the right end of its toolbar, after Focus and All.
- **Decisions (Andy Smith, 22 Oct 2026):**
  - The Task Timeline can collapse. This overrides the brief's 8-row minimum while it is collapsed; open, the minimum holds. Collapsed, its toolbar and summary line go with it, so nothing sticks under the compact event bar.
  - Summaries as proposed: Task Timeline "12 in focus · 3 late · 2 blocked"; Hot-topics strip one chip per card.
  - The per-card chevrons in the Hot-topics strip are removed; the strip collapses as a whole. A card with nothing in it still shows only its header with a zero count, as drawn.
  - Collapse is set from each region's header and from the Layout panel.
- **Saved per user:** `LayoutPreference.collapsed` holds one flag per region (`{ ribbon, timeline, hotTopics }`), replacing `ribbonCollapsed`. A preference saved earlier with `ribbonCollapsed` is carried over. Reset to default puts back the order and opens every region; it keeps the Critical path filter, which is not part of the layout.
- **Not drawn (flagged):**
  - The collapsed Task Timeline and Hot-topics strip. Both follow the ribbon's drawn line.
  - Task Timeline summary: the focus set within the runbook filter, whatever the scope and chips; late and blocked match the Late and Blocked chip counts in Focus. When the runbook filter is on, a chip adds "1 of 3 runbooks", so nothing is hidden silently. Undo and refusal messages still show while it is collapsed.
  - Hot-topics strip summary: "Blockers 2 · Next checkpoint in 02:05 · Milestones 3 · Collaboration Live · Watchers 1", each the number the card's header shows ("none" with no checkpoint, "Not live" with no call).
  - The Hot-topics strip's expanded header: it had none, so it gains a 24 px row with the "HOT-TOPICS STRIP" eyebrow and Collapse, above the cards.
  - The Layout panel's Open switch on each movable row: MUI's default small switch (no RBM style exists), with "Open" or "Collapsed" in words beside it. Its intro now reads "…and choose which are open."

### 22 Oct 2026: Event ribbon, Critical runbooks filter (asked by Andy Smith)
- **What it does:** a second ribbon filter, "Critical runbooks", off by default. When on, it hides every runbook with no stage on the critical path. Every stage of the runbooks that stay is still shown; this filter hides runbooks, not stages.
- **With Critical path:** the two combine, so both on shows only the critical stages of the critical runbooks.
- **Nothing hidden silently:** a line under the lanes says "2 runbooks hidden: no stages on the critical path", with "Show all runbooks" to turn the filter off.
- **The clock stays on every runbook,** so hiding lanes never rescales the hours.
- **Saved per user:** `ribbonCriticalRunbooksOnly` in `LayoutPreference`, beside `ribbonCriticalOnly`. Reset to default keeps both filters.
- **Runbook status:** a runbook is on the critical path when any of its stages is. `RbmRibbonRunbook.critical` is optional: if given, the ribbon uses it; if not, the ribbon works it out from the stages. The adapter does not set it today, so the fake engine is unchanged.
- **Collapsed ribbon:** the summary still shows every runbook, and the filters are not on the collapsed line.
- **Not drawn (flagged):** the second chip and its wording, and the hidden-runbooks line. The two chips are stacked in the left column above the runbook names (at 6 px and 34 px), where the hour labels and the NOW pill never reach.
- **Open question (Dave):** should the planning engine write critical-path status on stages and runbooks, or should clients work it out from the tasks? Today the engine sets `StageView.critical` and the ribbon works out the runbook.

### 22 Oct 2026: fixtures put more than one runbook on the critical path (asked by Andy Smith)
Every fixture now has stages from more than one runbook on the event's critical path.
- **Hand-offs between runbooks:** the fixture plans can make a stage wait for a stage in another runbook. `StageSpec.waitsFor` plans the hand-off; `waitForStage` adds one to an existing plan, and refuses if the plan would have the stage start first.
- **Fake engine:** when predecessors tie for the latest end, the critical path now follows all of them, because none has float. Before, it followed only the first.
- **Payroll scenarios (Weekend, healthy, badly late):** Hand over (1.5) waits for Reporting (3.1) as well as Verify (1.4). Reporting is planned 03:50–05:30, so it ends with Verify and Payroll's plan is unchanged.
  - **Healthy:** on plan, Verify and Reporting tie at 05:30, so Payroll cutover and Reporting are both critical.
  - **Weekend:** the reporting server is released 12 minutes late ("not before" 04:02), so Reporting ends 05:42 with Verify. Both are critical, and the event stays at 06:12 +12.
  - **Badly late:** Reporting cannot start until 04:35, so it ends 06:15 and drives Hand over. The critical path runs through Reporting and Payroll's Hand over, and the forecast is 06:45 +45 Red.
- **Large event:** stage 6 of each runbook also waits for stage 5 of the runbook before it. With the default seed, two runbooks are on the critical path.
- **Differs from the board:** in the Weekend fixture, Reporting is planned to end at 05:30 (the board says 05:40), and it is forecast 05:42 +12 Amber (the board says On Schedule). The event figures, Payroll cutover and Interfaces still match the board. The Storybook mocks are unchanged and still match the board.

### 22 Oct 2026: Event ribbon, one view control instead of two stacked chips (asked by Andy Smith)
The two stacked filter chips looked untidy (screenshot in `docs/Event Ribbon.png`). They are replaced by one control.
- **The control:** one 32 px pill naming the current view, with a chevron, in the drawn style of the Task Timeline's runbook filter ("All runbooks ⌄"). It sits centred in the header's left column, above the runbook names, where the hour labels and the NOW pill never reach. When a filtered view is chosen, it takes the "on" style (Deep Blue border and tint), as the Task Timeline chips do.
- **The menu:** three choices, as radio items with a tick and a one-line description, styled like the Event actions menu:
  - **All stages:** every runbook and stage (the default).
  - **Critical runbooks:** hides runbooks off the critical path.
  - **Critical path:** only stages on the critical path.
- **Dropped combination:** critical stages with every lane kept. That combination drew empty lanes reading "No stages on the critical path". The Critical path view now also hides runbooks with no critical stage.
- **Nothing hidden silently:** the line under the lanes counts what is hidden, for example "2 runbooks and 4 stages hidden: not on the critical path", with "Show all stages".
- **Saved per user:** `LayoutPreference.ribbonView` replaces `ribbonCriticalOnly` and `ribbonCriticalRunbooksOnly`. Older saved choices map onto it (both on, or Critical path on, gives Critical path).
- **Props:** `view` and `onViewChange` replace `criticalOnly` and `criticalRunbooksOnly` on `RbmEventRibbon`.
- **Not drawn (flagged):** the ribbon's view control and its menu. Both reuse drawn patterns: the runbook filter pill, and the Event actions menu.

### 22 Oct 2026: Task Timeline search, and Collapse all / Expand all (asked by Andy Smith)
- **Search:** a typeahead field in the toolbar, after the Mine, Late and Blocked chips ("Search tasks", 220 px, in the toolbar's 32 px pill style).
  - **Matching:** typing narrows the timeline at once. A task matches when every word appears, in any order, ignoring case, so "data refresh" finds "Refresh test data".
  - **Suggestions:** the first 8 matches show under the field, with WBS, title (matching words in bold) and runbook, plus "n more in the timeline".
  - **Keyboard:** Arrow keys and Enter pick a suggestion. Picking narrows to that task, opens its runbook and stage, and focuses its row. Escape closes the list, then clears the search. A clear button sits in the field, and / jumps to the field from the timeline.
- **Fields:** the task title (the ServiceNow short description) only, as asked. `searchFields` takes a list of fields, so description, record number or assignee can be added when the data carries them. Tasks have no separate description today.
- **Search narrows like every other filter** (agreed rule: filters only ever narrow). It works within the runbook filter, the scope and the chips. With Focus on, matches outside Focus are counted in the summary line ("6 more outside Focus"), and one click switches to All. Nothing is hidden silently, and the scope never changes by itself.
- **While searching:** every match is shown (the "+n more up next" cap is lifted), and quiet runbooks on a large event start open if they hold a match. The summary reads "Showing 2 tasks matching “refresh” in 2 runbooks · Focus".
- **"Show all" is not lazy loading:** it switches the scope to All and clears the chips. The page already holds every task. Above 200 rows, the timeline draws only the rows near the screen. Search filters the whole set before anything is drawn, so the two work together. On the real platform, Focus comes from the server, so searching outside Focus will need a server query (with the planning engine and ServiceNow spike).
- **Collapse all / Expand all:** a link in the summary line, before Show all. It reads "Collapse all" while any runbook is open, and "Expand all" otherwise. It folds or opens every runbook band, and leaves each stage as the user set it. Its accessible names are "Collapse all runbooks" and "Expand all runbooks".
- **Not drawn (flagged):** the search field, its suggestion list (Event actions menu style), the outside-Focus count and Collapse all.

### 22 Oct 2026: Task Timeline, progress on each runbook band (asked by Andy Smith)
- **What it shows:** each dark blue runbook band shows the runbook's progress just left of FORECAST END: a PROGRESS eyebrow (10 px Blue Light, like FORECAST END), a 160 × 8 px bar, the percentage in bold, and the count of tasks complete of the total (for example "61%  69 of 113").
- **Purpose:** it is most useful with Collapse all, when the bands alone give a read of progress across every runbook.
- **Data:** worked out from the runbook's stage counts (`complete` and `total`), so no data change was needed. It counts every task in the runbook, not only those in focus. The percentage rounds down, so a runbook never looks further on than it is.
- **Colour:** a translucent white track, with the completed share in Green, because Green means Complete (as in the Event vitals Progress donut). The percentage and count are written beside the bar, so it never relies on colour alone.
- **Screen readers:** the band's name gains "61% complete, 69 of 113 tasks".
- **Alignment:** the forecast block and the count have fixed widths, so the bars line up down the list of bands.
- **Not drawn (flagged):** the band progress.

### 22 Oct 2026: feedback while a large request runs, a generic pattern (asked by Andy Smith)
- **The pattern, `RbmBusy`:** the `useRbmBusy` hook and `RbmBusyOverlay`, for any action that may run a large query. Show all, the All scope, "more outside Focus" and Expand all in the Task Timeline use it first.
- **What the user sees:** a light scrim over the affected region, and a card held in the middle of the screen with a spinner, "Loading all tasks…" and "This can take a moment on a large event". The card offers Cancel while a query runs. It is not a full-page modal: the rest of the page stays readable. The region underneath is marked `aria-busy` and made inert, so no one acts on stale rows. The card is announced as a status.
- **Timing:**
  - The card shows only if the request takes longer than 250 ms, so quick actions never flash.
  - Once shown, it stays at least 400 ms, so it never flickers.
  - When the caller knows the result is large to draw (`heavy`, more than 200 rows), it shows at once.
- **Order of steps:** run the query, make sure the card has painted, apply the result, then hide the card once React has drawn it. A cancelled or replaced request stops being waited for at once, even if the query ignores the cancel signal.
- **Errors:** a failed query shows "Could not load all tasks. Try again." with Close, and leaves the region as it was.
- **Why not a React transition:** a large render in a transition restarts whenever anything else updates. On the 15,000-task event, it was starved and never finished.
- **Performance fix found along the way:** with virtual rows, each stage drew its first 20 rows before measuring where it was. With 300 stages, that was about 6,000 rows, and Show all on the large event took about 27 s in the development build. Stages now measure before the first paint and draw only the rows on screen. Show all now takes about 1.9 s.
- **Prototype:** `CommandCentrePage` takes `loadAllDelayMs`, a pretend server query behind those actions. The demo sets it from `?latency=` (1,500 ms by default; `?latency=0` turns it off). On ServiceNow, `onLoadAll` will run the real query.
- **Not drawn (flagged):** the busy card and scrim. MUI's spinner is used because there is no RBM style for one.

### 22 Oct 2026: Task Timeline, filters inside a runbook and a summary on each stage (asked by Andy Smith)
- **Filters inside a runbook:** an open runbook has a compact filter row under its band (48 px, surface tint). It holds:
  - its own search ("Search this runbook", 28 px, with suggestions from that runbook);
  - Mine, Late and Blocked chips (28 px), counted for that runbook only;
  - "Showing 1 of 8 in this runbook" with Clear, while any of them is on;
  - Collapse all stages / Expand all stages at the right.
- **How they combine:** they narrow only that runbook, on top of the main toolbar's filters (agreed rule: filters only ever narrow). They are not saved.
- **Never stuck:** a runbook whose own filters match nothing stays visible, saying "No tasks in this runbook match.", so its filters can always be cleared.
- **Accessible names:** each control names its runbook, for example "Late in Payroll cutover" and "Collapse all stages in Interfaces", because several are on the page.
- **Stage summary:** each stage row matches the runbook band, in its light style, and is now 52 px with two lines:
  - name, then "02:12 – 04:42 · 6 in focus";
  - PROGRESS (a 160 px bar, the percentage and complete of total);
  - FORECAST END (time, RAG mark and gap, the gap in the darker status text colours on white).
  - The blocks use the same fixed widths as the band, so stage bars line up under runbook bars.
- **Data (planning engine output):** `StageView` gains `plannedEnd` (the latest planned end of its tasks), `gapMinutes` and `rag`, worked out as for runbooks. `RbmTimelineStage` takes them as optional fields; without them, the row shows the forecast time with no gap.
- **Performance:** the stage summaries use inline styles rather than MUI `sx`, as the Event ribbon does, because there can be hundreds of stages. Show all on the 15,000-task event takes about 3.5–3.9 s in the development build, against 3.2 s before these changes. Most of the difference is the 30 runbook filter rows.
- **Tests:** whole-page tests in jsdom are slower with the extra rows, so the Vitest time limit is now 15 s, and search tests paste their text rather than typing it letter by letter.
- **Not drawn (flagged):** the runbook filter row and the stage summary.

### 22 Oct 2026: line thickness tokens, and the critical-path outline (asked by Andy Smith)
- **Critical-path outline:** the Ink outline on critical stages in the Event ribbon, and its legend sample, use `stroke.thick` (2 px), decided by Andy Smith. It was briefly `regular` (1.5 px) after 2 px was felt too heavy. The 1 px offset is unchanged.
- **New tokens (Proposed):** `stroke` in `src/theme/tokens.ts`. The boards draw 1 and 2 px lines but name no scale.
  - `thin` 1 px: rules, dividers, and card, chip and field borders.
  - `regular` 1.5 px: a mark that should be seen but not shout (the Start action's ring).
  - `thick` 2 px: focus rings, a lifted or selected item, outlined buttons, the white ring round a dot, the critical-path outline.
  - `heavy` 3 px: kept for a stronger mark; nothing uses it yet.
- **Scope:** every border, outline and ring in the components and the theme now uses these tokens. No other line changed thickness. Icon strokes are not on the scale, because they are set in each icon's own viewBox.
- **Foundations story:** "Shape and spacing" shows the scale.
- **Design board:** drafted on the Foundations board ("04 · Layout and theme", under Radius and Elevation), tagged Proposed, with a line in the MUI theme mapping and in "Where the guide stops". Needs sign-off.

### 22 Oct 2026: List of records page, early decisions (decided by Andy Smith)
Brief: `claude/rbm-list-page-brief.md` (repository copy `docs/list-page-brief.md`).
- **D1, grid:** MUI X Data Grid v9 is the grid for `RbmDataGrid`. There is no comparison with AG Grid. A strategic choice to keep the tech stack small: no second grid library.
- **D2, Peek:** the Peek (a row expanding in place) is not in this release. A row click opens the 480 px slide-in directly. The record pattern board still shows the Peek as an option; the board is unchanged.
- **D3, density:** D2 Compact is the default density for the page. It settles the board's "For your decision" question.
- **D4, licence:** the MUI X Pro licence is assumed, so the page uses `@mui/x-data-grid-pro` and may use Pro features where the design needs them (column pinning, column reordering, saved column state). Premium features (row grouping, aggregation, Excel export) are not assumed; ask first.
  - The licence key comes from configuration (an environment variable such as `VITE_MUI_X_LICENSE_KEY`) and is set once with `LicenseInfo.setLicenseKey` in the app and Storybook set-up. It is never committed. There is no key yet (proof of concept): the grid runs without one, with a development watermark and a console warning, and the tests and Storybook build must not fail on it. A real licence is needed before release.
  - Only `RbmDataGrid` imports the grid, so no other component depends on MUI X directly.
- **Design to update:** the Templates board still asks "AG Grid or MUI X" and "D2 or D1" under "For your decision". Both are now answered.

### 22 Oct 2026: MUI X Data Grid Pro installed (D1, D4)
- **Packages:** `@mui/x-data-grid-pro` 9.16.0 and `@mui/x-license` 9.16.0, on `@mui/material` 9.5.0 (peer range `^7.3.0 || ^9.0.0`). No Premium package.
- **Licence key:** `applyMuiXLicence()` (`src/components/RbmDataGrid/licence.ts`) reads `VITE_MUI_X_LICENSE_KEY` and calls `LicenseInfo.setLicenseKey` once. It is called in `.storybook/preview.tsx` and `demo/main.tsx`, never in a component. `.env.example` and the README name the variable, and `.env` is git-ignored. The demo reads `.env` from the repository root.
- **Without a key** (now): the grid draws with a "MUI X Missing license key" watermark and logs one `console.error`. It does not throw. A test proves the grid still draws, and the Storybook build passes. The watermark is expected in visual checks until a licence is bought.
- **Telemetry:** npm did not run `@mui/x-telemetry`'s install script (it is not in `allowScripts`). The grid does not need it. Left off.

### 22 Oct 2026: List of records data contract (proposed, for review)
See [list-data-model.md](list-data-model.md). Types, record spec, `ListData`, `ListPreferenceStore`, the mock server and the fixtures are in `src/data/list/` and `src/fixtures/events/`. No component is built on them until the contract is agreed.
- **Faithful to the board (Andy Smith, 22 Oct 2026):** the list is the Page templates board's "1 · List of records" with Runbooks replaced by Events. Keep it simple; the only changes are:
  - an **Event ID** column (REVnnnnnn) is added, first;
  - **Progress** is removed;
  - **Phase** is called **State**, and shows the Command Centre's event state (`EventState`: Not started, Active, Paused, Complete), decided by Andy Smith, 22 Oct 2026. State follows Status: Pending is Not started; In progress, At risk and Blocked are Active; Paused and Complete match. In the record, State is read-only, because the Command Centre changes it (Start run, Pause event); the fixture check rejects a state that does not fit the status.
  - **Environments** (Andy Smith, 22 Oct 2026): Production, Pre-production, Test, Development.
  Columns: Event ID, Event, Status, Owner, State, Window. Status labels as drawn: "In progress" and "Pending", not the library's "Active" and "Not started".
- **Removed, because they are not drawn:** row flags, the hidden columns (Window end, Environment, Updated), column pinning, the Mine view and a default sort. With no sort, rows keep the server's order. The environment stays on the row only for the drawn Environment filter.
- **The record is an RBM Event** (Andy Smith, 22 Oct 2026). The record's fields are as proposed, with Phase called State, and with no runbook or stage information (an Event holds Runbooks, a Runbook Stages, a Stage Tasks; the Command Centre shows one Event). Tasks in Needs attention are named by WBS. The record keeps its own progress in the summary strip (68%, 84 of 124 tasks for Q4, as on the Single record board).
- **Record spec limits are compile errors:** at most four groups (and at least one), five sections per group, four summary facts, one level of nesting, and only the record's own field keys. `checkRecordSpec` tests the 14-character tab labels and unique ids.
- **Not drawn (flagged):**
  - The Event record spec: Overview (Details, Schedule, People and roles, Linked changes), Tasks (Needs attention), Dependencies (Waits for, Needed by) and History (Changes), with its summary facts, footer actions, validation messages and locks.
  - The All events view, and page sizes 50 and 100 (MUI's defaults).
- **Differs from the board:** Runbooks become Events; Event ID added; Progress removed; Phase becomes State. The 128 fixture spans every environment, so "filtered to Production" shows fewer than 128.
- **Additions to the brief:** `deleteView`, and `AbortSignal` on every request (for the `RbmBusy` Cancel). Panel width is stored as `slideIn` or `wide`.
- **Prototype limit:** live conflicts are found when the user saves; a push while editing waits for the ServiceNow real-time spike.

### 22 Oct 2026: Event IDs are REVnnnnnn everywhere, and the two prototypes agree (decided by Andy Smith)
- **One numbering:** the Command Centre's E12345 becomes a REVnnnnnn Event ID, and the numbers match the Events list ("match the numbers up"; the number was left to Claude Code).
- **Numbers:** REV000001 to REV000008 stay the eight events drawn on the Page templates board. The Command Centre's events follow:
  - REV000009 Weekend Payroll Cutover;
  - REV000010 Weekend Payroll Cutover (healthy);
  - REV000011 Weekend Payroll Cutover (late);
  - REV000012 Data Centre Migration (large).
  Each is a row in the 128 and large Events lists with the same name and window. Their list status follows the scenario: At risk (+12 Amber), In progress (on time), At risk (+45 Red), In progress. The board fixture keeps only the eight drawn events.
- **One source:** `src/fixtures/commandCentreEvents.ts` gives the number, name and window to both fixture builders. A test checks the Command Centre fixtures and the Events lists against it, so they cannot drift apart.
- **Changed:** the Command Centre fixtures, their builder, the Storybook mocks and the tests now read "REV000009 · Weekend Payroll Cutover". The fixture check rejects an event number that is not REVnnnnnn.
- **Differs from the board:** the Command board draws "E12345" in the page header and the compact event bar. It should read REV000009.
- **Note:** the 21 Oct entries above still say E12345; they record what was drawn and built then.

### 22 Oct 2026: `RbmDataGrid`
Built from the Page templates board ("1 · List of records") at D2 Compact, on MUI X Data Grid Pro (D1, D4), with the columns agreed for the Events list. It is the only component that imports MUI X; a test fails if another file does.
- **Density wins (decided by Andy Smith, 22 Oct 2026):** a component at a density takes its sizes from the Density board's tokens, even where a board draws something else. The tokens are now in `src/theme/tokens.ts` (`density`, exactly as the board's "In code" table). At D2 Compact the grid has:
  - 44 px rows (the list drawing has 36);
  - 14 px cell text (drawn 13), with 12 px header labels (the D2 caption size);
  - 12 px cell padding on each side (drawn 6 px, with 16 px at the edges);
  - a 10 px status dot (drawn 8), or the Semantic board's 16 px ringed dot with a 10 px centre, as `RbmStatusPill` draws it (drawn 12 and 8);
  - a 20 px "more" icon (drawn 18).
  The header stays 40 px, as drawn, because header height is not on the density scale.
- **As drawn:** a 14 px rounded card with a Rule border; the Mist header with bold uppercase Slate labels; Rule lines between rows; the title in 600 Deep Blue; the ID in 600 with tabular figures; status as the semantic dot and label; the "more" button (three dots, Slate) at the end of each row.
- **Open row:** the record open in the panel keeps the approved highlight from "List to record in use": Rule fill, a 4 px Blue Dark bar on the left, and the title in 700.
- **Server-driven:** the grid shows one page as the server returned it. A header click asks for a new sort (`onSortChange`); the grid never sorts or pages rows itself. Pagination is a separate component (build step 5). Until then, the Storybook proof uses a stand-in pager.
- **Columns:** `columnState` (visible columns in order, and widths) in and out. Drag to reorder (Pro) and resize both report the new state, so a saved view or the user's preference can keep it. `openColumnChooser()` opens MUI X's column panel for the toolbar's Columns button (build step 3). The Event column cannot be hidden.
- **Selection:** checkboxes when `selectable`, reported as ids. Selections on other pages are kept, and the header checkbox selects the page. A row click opens the row; it does not select it.
- **Keyboard and screen readers:**
  - The grid is named for its list ("Events") and uses MUI X's grid keyboard model.
  - Enter on a row opens it.
  - Focus shows the Proposed 2 px Blue Dark ring.
  - The status dot is hidden from screen readers, because the label says it.
  - The "more" column's header is blank, as drawn, but is named "Actions" for screen readers. Each button is named "More actions".
- **MUI's defaults (decided by Andy Smith, 22 Oct 2026):** the checkbox column, hover on rows and headers, the sort arrow, the column chooser panel, the loading skeleton, and the items in the "more" menu. The Storybook story's menu items ("Open", "Open in full") are examples; each list passes its own.
- **Not drawn (MUI's default for now):** the no-rows line, which the list page's empty state replaces later.
- **Expected:** the stories show MUI X's licence watermark until a key is set (D4).
- **Removed from the header:** MUI X's column menu and column filters. Filters live in the toolbar (board rule), and the column chooser is a toolbar button.
- **Visual check:** the stories were screenshotted against the board (as drawn, row open, selectable, row actions, and the proof on 128 and 15,000 events), first as drawn, then again at the D2 tokens. Dates use three-letter months ("10 Sep"; en-GB writes "Sept").
- **Shared formats:** `src/data/list/format.ts` holds `shortName`, `formatDay`, `formatWhen` and `formatWindow`, so the grid does not depend on the Events list.

### 22 Oct 2026: density is mandatory, set by region (`RbmDensity`) (decided by Andy Smith)
- **The rule:** density choices are asserted, not optional. Where a level applies, its tokens (`density` in `src/theme/tokens.ts`, the Density board's table) win over sizes drawn on any board: row, control, minimum target, body and secondary text, line height, KPI figure, cell padding, gap, icon, status dot and control radius. Sizes the scale does not name (column widths, header height, side padding of buttons) keep the drawing's values.
- **`RbmDensity`** (`src/theme/RbmDensity.tsx`), as on the board's "In code" section: `<RbmDensity level="compact">` sets the level for a region, everything inside follows, and regions nest. Outside any region the level is D1 Comfortable, the board's default.
  - `useDensity()` gives components the region's level and tokens.
  - A nested MUI theme sizes MUI's own controls at the level: buttons, inputs and tabs at the control height; menu items, icon buttons and checkboxes at the minimum target; body text; icons; and the control radius.
  - CSS variables (`--rbm-row`, `--rbm-control` and so on) for anything outside React.
  - The base theme's D1 button sizes now come from the tokens (no visual change).
- **`RbmDataGrid`** reads the region's density instead of a fixed D2. A list page wraps it at D2 Compact (D3). Tests check rows, text and dots at D1, D2 and D3.
- **Event ID column:** 140 px (was 120), so "REV000001" fits at D1 as well as D2. Column widths are not on the density scale.
- **Stories:** Foundations / Density shows all four levels and a nested region; the grid has a story at D1 and D3. Screenshot-checked.
- **Command Centre levels (Andy Smith, 22 Oct 2026): mixed by region.** Page header and Event vitals at D1 Comfortable; Event ribbon, Task Timeline and Hot-topics panel at D2 Compact. Converting the Command Centre's components to these tokens is the next pull request.

### 22 Oct 2026: the Command & Control Centre at its density regions (decided by Andy Smith)
- **Regions:** the Page header (with its menu) and the Event vitals are D1 Comfortable. The Event ribbon, Task Timeline and Hot-topics panel are D2 Compact. `RbmCommandCentre` sets them (`COMMAND_CENTRE_DENSITY`). The compact event bar and the Layout panel are D2 too (proposed: the bar is the compact view, and the panel is a slide-in).
- **The rules** for which drawn size each token covers are in [density.md](density.md). Every component now reads its region's tokens with `useDensity()`. Widths, group bands, region chrome, the ribbon's schedule geometry, nodes, avatars, rings and tag pills keep their drawn sizes.
- **What changed from the drawings at D2** (Task Timeline, ribbon, Hot-topics panel, event bar, Layout panel):
  - Rows: task row 52 to 44 px; stage summary row 52 to 44; "+n more up next" 40 to 44; card item rows (blockers 52, milestones 40) to 44; Layout panel rows 56 to 44; runbook filter and search suggestion rows to 44.
  - Controls: row action buttons 120 by 32 to 120 by 36; chips and filter pills 32 (28 small) to 36; search fields 32 (28) to 36; Focus / All 32 to 36; Join call, Done and the bulk Start and Complete 36 / 32 to 36.
  - Text: task titles 15 to 14; times, WBS, durations and deltas 13 to 12; card titles 13 to 14.
  - Status dots 8 or 9 to 10; ringed dots 11 to 14 to 16 with a 10 px centre.
  - Side padding and gaps: 12 px each.
  - Standalone icons: 20 px.
  - The Next checkpoint countdown is a KPI figure: 28 to 32 px.
- **At D1** (Page header and Event vitals):
  - The event actions button goes from 40 to 48 px, with a 24 px icon.
  - Its menu items are 48 px high, with 16 px text.
  - Event vitals figures go from 32 and 36 px to 40 px, and their dots from 8 to 10 px.
  - The state pill and alert counter text goes from 15 to 16 px. The pill heights stay as drawn.
- **The 12 px floor** (Density board, "Floors protect people"): text drawn smaller now takes the secondary size. This covers the "FC" marker (9 px), eyebrows (10), the runbook record pill and chip counts (11), ribbon hour and WBS labels (10 and 11), the event bar's event number and FORECAST END (11 and 10), FIXED in the Layout panel (11), and the calendar chip's month (10).
- **Minimum target:** small pill-shaped buttons and text links keep their drawn shape, and an invisible layer extends their hit area to the target (`hitTarget`). This covers the alert counter, "Collapse" and "Expand", "Show all", "Only", "n more", "+ Raise", Undo, Back to top, the drag grip and the hover checkbox.
- **Icons beside a button's text** are glyphs sized with the text and keep their drawn sizes. Otherwise "Complete" no longer fits the fixed 120 px action button. The label's inner gap is 4 px (was 6) for the same reason.
- **Compact event bar (decided by Andy Smith, 22 Oct 2026: grow to D2, then assess the visual impact):** the forecast end time is a KPI figure at the D2 figure size (32 px; drawn 20). The bar grows to fit it: 56 px (drawn 48), the eyebrow over the time with 4 px above and below. The Task Timeline toolbar now sticks 56 px down (was 48), and the Hot-topics panel 72 px (was 64). `EVENT_BAR_HEIGHT` holds the number. **To assess:** the visual impact on the board.
- **Command board to redraw:** the Task Timeline, Event ribbon, Hot-topics panel and compact event bar at the D2 sizes above; the Page header and Event vitals at D1.
- **Tests:** each converted component is tested in its region, and new tests pin the D2 sizes of the task row, the Task Timeline, the tags and the countdown, and the D1 figure. Visual check: the Weekend Payroll Cutover story, screenshotted at 1600 px.

### 22 Oct 2026: `RbmListToolbar`
Built from the Page templates board ("1 · List of records", zone 2) at D2 Compact, with Runbooks replaced by Events.
- **As drawn, in one row:**
  - the search field (260 px, "Search events");
  - the Status, Owner and Environment pills;
  - the view pill on the right ("View: Active", Deep Blue border on white);
  - two square tool buttons: Columns, with the drawn columns icon, and Export, with the download icon.
  The row never wraps; on a narrow screen it scrolls sideways. Filters stay above the grid, never in a drawer.
- **Sizes from the D2 tokens:** controls 36 px (drawn: pills 32, field 36), body text 14 px (drawn 13), gaps 12 px (drawn 10). Glyphs in the field and pills keep their drawn sizes; the tool buttons' icons are standalone, at 20 px.
- **Filters (decided by Andy Smith): in the style of the Task Timeline's runbook filter.**
  - A checkbox list with Select all and Clear, and a search field when there are more than six options (Owner).
  - A filter that is on takes the Deep Blue border and tint, and counts its choices: "Status · 2".
  - Nothing chosen means any value.
- **Saved views (decided: choose and save), with MUI's default menu and dialogs:**
  - The menu lists the system views, then "Your views", with the current one checked.
  - "Save as new view…" asks for a name. It must not be empty or a name already taken, and the message says why.
  - "Save changes to <view>" appears only for the user's own view, once it has changed.
  - "Delete <view>…" asks first.
  - The pill adds "(changed)" when the filters, columns or sort differ from the view.
  - A view keeps the filters, columns and sort.
- **Export (decided: CSV of every matching row):** `ListData.exportCsv` is added to the data contract. The server builds the file from the filters, sort and visible columns, so it is not limited to the page on screen (no Premium features). The mock writes the grid's text (status and state labels, the owner's full name, "24 Oct 22:00") and quotes cells holding commas or quotes. `downloadCsv` saves it. Export is disabled, named "Exporting…", while the file is built.
- **Columns** opens the grid's column chooser (`RbmDataGrid.openColumnChooser`, MUI's default panel).
- **Keyboard and screen readers:**
  - The toolbar is a group named "Find events".
  - The search field is a search box: Escape clears it, and so does the clear button.
  - The pills say whether they open a dialog or a menu, and whether it is open.
  - The tool buttons have names and tooltips.
- **Not drawn (flagged):**
  - The filter lists, the views menu and its dialogs (above).
  - The search field's clear button.
  - The "(changed)" mark on the view pill.
  - The focus ring around the search field (the Proposed 2 px Blue Dark).
- **Tests:** the toolbar's parts and sizes, search, filters, views, columns and export. The proof story is also run as a test: the toolbar driving the grid through the mock server.

### 22 Oct 2026: `RbmListBulkAction` (decided by Andy Smith)
- **Why not the Task Timeline's bulk bar:** Andy Smith was not convinced it is a helpful bulk action interface. The list uses a new component instead: MUI's selection toolbar (the "n selected" toolbar of MUI's table examples) for function and layout, styled with the RBM tokens.
- **What it is:** an MUI `Toolbar` that replaces the list toolbar while rows are selected (board rule). It shows:
  - "3 events selected" (singular for one), announced politely to screen readers;
  - the list's actions, as MUI outlined buttons, with an action that removes things in the error colour (Red Inner);
  - a Clear selection button (× with a tooltip).
  A disabled action carries its reason in a tooltip. The toolbar is named for its count ("Actions for 3 events selected").
- **Styled with the tokens:** D2 control height (36 px) for the actions and Clear, body text, padding, gap and radius. The tint and border are the Deep Blue "on" style of the toolbar's filters.
- **One row tall:** the bar, and now the list toolbar too, are the D2 row height (44 px). The bar swaps in without moving the grid, and its 36 px actions meet the minimum target.
- **Generic:** each list passes its own actions, and the page runs them on the selected rows. Selection across pages is kept by `RbmDataGrid`.
- **Open: which bulk actions the Events list offers.** The stories use examples (Export, Change owner…, Delete…). Change owner, Change environment and Delete would need additions to the data contract (a bulk save with a result per event, a delete with a permission check). Export of the selection would need `exportCsv` to take ids.
- **Tests:** the count and its wording, actions, danger tone, disabled reason, Clear, the D2 sizes of the bar and the toolbar, and the swap with the toolbar (the story, run as a test).

### 22 Oct 2026: tests run four files at a time (decided by Andy Smith: slower but steadier)
- With one Vitest worker per core (19 on a 20-core machine), heavy jsdom pages ran past the 15 s limit when the machine was busy, including older tests that take under 2 s alone. `vite.config.ts` now sets `maxWorkers: 4`. Two full runs passed (56 s and 69 s, against about 77 s before), so it is steadier and, on this machine, not slower. The 15 s limit is unchanged.

### 22 Oct 2026: `RbmPagination`
Built as drawn on the Page templates board ("1 · List of records", zone 4): the range on the left ("1 to 25 of 128"), "Rows per page" with the size, and the previous and next chevrons on the right. Server-side with a page size; no infinite scroll (board rule).
- **Inside the grid's card:** `RbmDataGrid` gains a `footer` slot, drawn under the rows with a Rule line, as on the board.
- **Arrows as drawn:** Deep Blue when usable, Slate when not (first or last page). Both wait while a page loads (`disabled`).
- **Sizes from the D2 tokens:** the footer is one row tall (44 px, as drawn), with secondary text (12 px; drawn 13) and the 12 px padding (drawn 16). The arrows are icon buttons at the minimum target (36 px) with 20 px chevrons (drawn 18).
- **The range:** "0 of 0" when nothing matches; thousands separators ("1,026 to 1,050 of 15,000"). It is announced politely as it changes.
- **Keyboard and screen readers:** a navigation landmark named "Pages". "Previous page" and "Next page" have names and tooltips, and the size picker is named "Rows per page". A new size goes back to the first page (the page does this).
- **Not drawn (MUI's default, the agreed fallback):** the page size picker (MUI's standard select, without an underline) and its choices (25, 50, 100).
- **Grid proof story:** the stand-in pager is replaced by `RbmPagination` in the grid's footer, paging the 128 and 15,000-event lists through the mock server.

### 22 Oct 2026: the Events list's bulk actions, Export and Delete (decided by Andy Smith: "Export, Delete only at this stage")
- **Data contract:**
  - `exportCsv` takes the selected ids and exports exactly those rows, whatever the filters (rows stay selected across pages).
  - `deleteRows(ids)` is new. It returns the rows deleted, and for each row refused, its number and the reason.
- **Which events may be deleted (confirmed by Andy Smith, 22 Oct 2026):** only events that have not started. Any event that has started (active, paused or complete) is refused: "It has started, so it is part of the audit trail." The server applies the rule; the mock follows it.
- **Bulk bar:** an action can ask first (`confirm`), in MUI's default dialog, with Cancel focused. Delete asks: "Delete 2 events?", "They are removed for everyone. Events that have started stay, as part of the audit trail.", then Delete in the error colour.
- **Feedback:** `src/app/eventBulkActions.ts` builds the two actions for a list page. After an action it says what happened, in a short message for the page. Examples: "2 events exported." or "1 event deleted. 1 not deleted. REV000001: It has started, so it is part of the audit trail." Deleted rows leave the selection. The story shows the message in MUI's default snackbar; the list page will do the same.
- **Not drawn (flagged):** the confirmation dialog, the messages and the snackbar.

### 22 Oct 2026: `RbmRecord` and `RbmRecordDrawer`
- **Built as drawn** (Pattern: List to record, and the board in use): the slide-in (480 px) and the wide panel (800 px), the header (number, name, status with its label, previous, next, widen, open full, close), the summary block, tabs with counts and an alert dot, the section cards with Edit, "Editing" and the blue border, "Locked while editing" on the other sections, a lock with its reason on a locked section, Expand all and Collapse all, the wide panel's vertical tabs with "On this tab", and the footer (the primary action, or Discard and Save while editing, and "Saved …").
- **Density:** the panel is D2 (Compact), as the list page.
- **Date fields (decided by Andy Smith):** MUI X Date Pickers 9 with date-fns 4. Times show and are edited in the event's time zone; the field converts to and from UTC.
- **Escape and leaving:** Escape closes the panel, but asks first ("Discard unsaved changes?") if a section has unsaved changes. Previous, next, close and the drawer's backdrop ask the same way.
- **Deep link:** the panel reports its tab and section so the page can keep them in the address (`?record=…&tab=…&section=…`).
- **Not drawn (MUI defaults, flagged):** the conflict alert ("Someone else saved this section", the list of what changed, Reload), the History list, the discard dialog, and the date and time picker.
- **Proposed (not drawn), needs sign-off:** the panel sits beside the list when there is room for a 640 px list (from 1,120 px for the slide-in, 1,440 px for the wide panel), overlays the list below that, and fills the screen under 640 px (the 640 px is drawn).
- **Proposed (not drawn):** while a section is open for edit but unchanged, the footer says "Editing Details" with Save disabled.

### 22 Oct 2026: the list states (`RbmListLoading`, `RbmListEmpty`, `RbmListError`, `RbmListNoAccess`)
Built unattended (Andy Smith asked for work to continue overnight without questions), so every choice below is a recommendation to review.
- **Not drawn (flagged).** The Page templates board gives the four rules ("States every page covers") but draws none of the states. They are built from the rules, MUI's Skeleton and Button, and the RBM tokens at D2.
- **Loading:** after 300 ms, a skeleton of the toolbar row and the grid card (header and one row per page row, at the column widths). There is no spinner. A screen reader hears "Loading events" from the start; the skeleton is hidden from it. When only the grid reloads, the toolbar is left out.
- **Empty:** the object's icon (the Icons board says object icons are used on empty states), a title that says why, one line, and one action. "No events yet" offers New event as the green CTA; "No events match these filters" offers Clear filters, outlined.
- **Error:** an alert with the Issue icon, "Could not load events.", "Try again. If it keeps happening, give support this reference.", the reference, and Retry. When the server never answered (a network failure), the page makes its own reference, `REF-C-…`, from the time. **Proposed:** that format needs agreeing with support.
- **No access:** the Lock icon, what the user cannot see, and who to ask (from the server). It has no action, and shows the reference if there is one.
- **Proposed (not drawn):** the icon at the Icons board's 32 px, the message centred in a card the size of the grid's card, at 48 px top and bottom padding.

### 23 Oct 2026: `RbmListPage` and the connected Events list (`src/app/EventsListPage.tsx`)
Built unattended, so every choice below is a recommendation to review.
- **As drawn:**
  - The page sits on Mist, with 24 px padding and 18 px between zones.
  - The header has the breadcrumb (13 px), the title (24 px, 800) and the count line (13 px). The actions sit on the right, aligned to the bottom: Import outlined, then New event as the green CTA with the Add icon.
  - Below the header: the toolbar, then the one grid with pagination in its card.
  - The page header keeps its drawn sizes (page chrome is not on the density scale); the rest of the page is D2.
- **Slots (brief §3):** `title`, `count`, `actions`, `toolbar`, `grid`, `record`, `emptyState` and `errorState` are all required; a missing one is a compile error (tested). `record`, `emptyState` and `errorState` take `null` explicitly.
  - **Added:** `bulkBar`, so the template, not the developer, swaps the toolbar for the bulk bar while rows are selected.
  - **Added:** `breadcrumb` and `message` (MUI's snackbar, not drawn).
- **Where each state shows (proposed):**
  - The empty state replaces the grid; the toolbar stays, so the filters can be changed.
  - The error and no-access states replace the toolbar and the grid; the header stays, so the page is never blank.
  - On the first load, the grid's place shows the skeleton. Later loads use the grid's own loading overlay (MUI default).
- **The panel beside the list:** the list makes room for the drawer (its right padding grows by the panel's width) rather than being covered. `useDrawerMode` is shared with `RbmRecordDrawer`, so the two always agree.
- **Count line:** "7 events", then "· filtered to Production" for filters the user added beyond the view's own, then "· matching “payroll”" for a search. **Proposed:** the board shows only the "filtered to" form.
- **The Active view's Status filter shows as on** ("Status · 5"), because the view sets it. The board draws "View: Active" with Status off. **Open:** should a view's own filters show as on in the pills?
- **Empty, two cases (proposed):**
  - With no filters at all: "No events yet", with New event.
  - Otherwise: "No events match these filters", with Clear filters, which goes to All events with nothing filtered.
  - An empty event list on the Active view first shows the filtered case, because the page cannot tell "none at all" without another query.
- **Focus:** closing the panel returns focus to the row's first cell (board: "focus returns to the row").
- **Deep link:** the page takes and reports an address (`record`, `tab`, `section`); the demo route will keep it in the URL.
- **Preferences:** the panel width, column state, last view and page size go to `ListPreferenceStore`, as the data contract says.
- **Open:** in Edge's headless capture, the grid's header background stops about 30 px short of the card's right edge (the scrollbar filler). Check it in a normal window.

### 22 Oct 2026: App shell, four-group navigation and new navigation icons (decided by Andy Smith)
Brief: `claude/rbm-app-shell-brief.md` (repository copy `docs/app-shell/app-shell-brief.md`). Design version 74.
- **Navigation:** four groups, in this order. **Events** (List, Folders), **Library** (Templates, Folders, Teams, Workstreams), **Admin** (Setup, Integrations, License Management), **Help** (Training, Support & Versions). It replaces the board's Dashboard, Runbook lifecycle and Library spine. The Shell board is redrawn (anatomy, expanded sidebar, rail, mobile drawer, item states, rules, `rbmNav` sample, decision 6).
- **Six zones:** sidebar, top bar, page header, content, footer, slide-in region, as drawn. All six are built.
- **Icons: conform with the design.** Andy first asked for MUI icons, then chose to follow the Icon suite board: icons are drawn from scratch in the RBM style, and nothing outside the icon package imports `@mui/icons-material`.
  - **Seven new icons** added to the Icon suite board (new "Navigation" section): List, Folder, Setup, Integrations, License, Training, Support, in a registry group `nav`. Templates, Teams and Workstreams reuse `object.template`, `object.team` and `object.workstream`; the two Folders items share `nav.folder`.
  - Drawn as first-pass icons like the rest of the suite: a designer should refine the optical balance. **Proposed; needs sign-off.**
- **Differs from the old board (flagged):**
  - The rule "seven destinations or fewer in the main area" becomes "four items or fewer in a group" (eleven destinations in four groups).
  - Help is the last group; Collapse is the only item pinned to the bottom. Settings is gone from the sidebar (Setup, under Admin, configures the application; the account menu's Settings stays personal).
  - Admin items show only to users whose platform roles allow them (UI follows the API).
  - The sample count on List (12) is an example; no item has a count yet.
- **Update, same day (Andy Smith):** Teams & Workstreams is split into two menu items, **Teams** (`object.team`) and **Workstreams** (`object.workstream`, the plain Workstream icon from the Global and local section). Library now has four items (Templates, Folders, Teams, Workstreams), so the rule reads "four items or fewer in a group" and there are eleven destinations. Shell board redrawn (version 78); the new Workstreams route is `/library/workstreams`. The plain icons are used in the menu, not the badged global or local ones.
- **Shell density default:** Andy gave no preference. The brief builds **D2 Compact** (matching the list page), where the board said D1. Flagged.


### 22 Oct 2026: task type icons (asked by Andy Smith)
A new icon group `taskType` on the Icon suite board (new "Task types" section; the suite was 67 icons at design version 75). A task type says how the task is done, not its state.
- **The nine types:** Manual (done by a person), Scripted (runs a script defined in the task), Automated (run by automation through an integration), Business verification, Technical verification, Checkpoint, Notification, Collaboration (a call or meeting: Teams, Zoom and so on), Approval.
- **Registry:** `taskType: { manual, scripted, automated, businessVerification, technicalVerification, checkpoint, notification, collaboration, approval }`. Drawn from scratch in the suite's style, like every other icon. Proposed, first-pass drawings; need sign-off.
- **Checkpoint abilities add no icons.** Notify attendees (Notification icon), start a Teams call with Event Management and ICG or ECG members (Collaboration icon), create a status report (Document icon), invoke a decision (Decision icon).
- **Not the same as node shape:** the Task Timeline's node shapes (circle task, diamond milestone, rounded square checkpoint) stay as drawn. The type icon is separate from both the node shape and the state.
- **Not drawn:** where the types appear (task row, filter, record panel). Type name goes beside the icon where there is room; icon-only use takes the name from a tooltip.
- **Not in the data contract yet:** the task type is not a field on `RbmTask` today. It needs adding, with the nine values, when the icons are used.


### 22 Oct 2026: new objects and the global/local pattern (asked by Andy Smith; global and local design approved by Andy Smith)
Icon suite board, design version 76; the suite is now 73 icons. Objects go from sixteen to eighteen.
- **Added:** Event (a calendar with a bolt, "a cutover event, run by the Event Manager") and Workstream (three wave lines, "a strand of related work"). Both are Proposed first-pass drawings.
- **Stage replaces Phase.** The board already had an icon called Phase, described as "a stage that groups tasks". RBM's name is Stage (runbook, stage, task), so the same drawing is renamed `object.stage` rather than adding a second icon for one meaning. **Code impact:** if the registry has `object.phase`, rename it to `object.stage`.
- **Global and local pattern: APPROVED (Andy Smith, 22 Oct 2026).** The Proposed tag is removed from that section of the Icon suite board. Four badged icons: Global team, Local team, Global workstream, Local workstream. The base object is drawn smaller at bottom left with a badge at top right, as the user roles do with the person figure. **Global badge:** a globe. **Local badge:** a pin. Plain Team and Workstream stay for when scope does not matter (for example the Teams and Workstreams menu items).
- **Registry:** `object: { runbook, event, stage, task, dependency, assignment, team, globalTeam, localTeam, workstream, globalWorkstream, localWorkstream, document, issue, checklist, environment, schedule, cutover, decision, comment, history, template }`.
- **Rule:** the word Global or Local is always shown beside the badge, so scope never relies on the badge alone. Any other object that comes in both forms takes the same two badges.
- **Meanings used:** Global is defined once and shared across events; Local belongs to one event. The pin is also the Checkpoint task type's drawing, at a very different size; flagged.
- **Event and Cutover overlap.** Cutover is still on the board as "the go-live event" (a bolt). Event is the whole event the Event Manager runs. Kept as two icons; the bolt links them. Flagged.


### 22 Oct 2026: three new user roles and their icons (asked by Andy Smith)
- **Stakeholder:** gives approvals and decisions, attends checkpoints. Badge: diamond.
- **Manager:** starts, manages and completes events. This is the Event Manager. Badge: bolt.
- **Author:** creates runbooks, stages and tasks. Badge: pencil. The name is "Author", not "Creator".
- All three use the shared person figure with the badge at top right, like the other roles. The set is now eight roles (`stakeholder`, `manager`, `author` added to the `role` group). Icon total: 76. Status: **Proposed**.
- These roles do **not** need to match ServiceNow platform roles. Permissions still come from the platform; the UI never decides.
- Board: Icon suite, User roles (version 81).

### 22 Oct 2026: state versus action, and the icon categories (PARKED by Andy Smith, to resume; must be settled before more code is built)
- **Principle (agreed in discussion, not yet on the board):** a state is what an object is now (a status label with dot and icon, never clickable). An action is a verb that moves the object to a new state (a button or menu item). Which actions are offered depends on the current state and platform permissions. Example: a task that is Available offers Start, which moves it to Active; an Active task offers Complete, Pause or Suspend.
- **Proposed action categories:** Construction (edits content), Control / Player (state transitions only), Display / UI (changes how things are shown). Not yet applied to the Icon suite board. The 23 existing action icons would split as proposed in the chat.
- **State becomes its own group,** probably per object (task states, event states), kept apart from actions.
- **Needs a transition table per object** (from state, action, to state, required platform role) as typed data. A transition component reads it. The icon registry only draws what the table names.
- **Design risks to avoid:** the same word as state and action (Complete); the same picture as state and action (Pause versus Paused); Brand Green on the Complete button; animation only on state icons and only with reduced motion respected.
- **Reference:** the old RBM-345 icon library (2021, Material names) was assessed as a checklist of names only. It must not override the icons already in the design. Candidate gaps it exposed: Import, Publish, Unpublish, Archive, Skip, Abandon, Back out, Approve, Schedule, Auto start, Auto complete, First page, Last page, Expand, Collapse, Help, Info, Cancel, Refresh, Drag handle, Login, Logout, Upload, Download, Card view, List view, and Event states (Scheduled, Committed, Backing out, Backed out, Abandoned, Closed, and others).
- **Questions to answer:** (1) State names: Available and Active, or Not started and In progress, for tasks and for events? (2) What is the difference between Pause and Suspend, and is there a Resume action? (3) Do events and tasks share a lifecycle? (4) From which states can Skip, Abandon, Back out and Approve be applied?
- **Answers from Andy Smith, 23 Oct 2026:** (1) Use **Available** and **Active** as state names. (2) A Paused task can be **Resumed**. A Suspended task was suspended through an **Issue** and resumes once that Issue is **Closed**. (3) Tasks and events have **different states**. (4) **Skip:** from any state before Complete. **Abandon:** from Active. **Back out:** from Suspended. **Approve:** from Initial.
- **Draft task transitions (my reading, to be confirmed):** Available, Start, Active. Active, Complete, Complete. Active, Pause, Paused. Paused, Resume, Active. Active, Suspend (raised by logging an Issue), Suspended. Suspended, Issue closed (automatic, no action icon), Active. Suspended, Back out, Backed out. Active, Abandon, Abandoned. Available, Active, Paused or Suspended, Skip, Skipped. Initial, Approve, Approved. Still to confirm: whether Approve applies to tasks or events; what follows Approved; whether Back out passes through Backing out; whether Suspend is a button or only the result of logging an Issue; the full event lifecycle.
- **Further answers, 23 Oct 2026:** Approve applies to tasks and events. An approved task moves to Pending or Available; an approved event moves to Scheduled. Pending is the waiting state, Available is ready to start, and Pending to Available is automatic. Back out goes to Backing out, then Backed out. Suspend is not a button: it is applied as a result of an Issue definition (the Issue definition decides whether it suspends the task; closing the Issue resumes the task). Skip is available from any state before Complete, including Initial, Approved and Pending. Event states given: Approved, Active, Paused, Abandon, Complete, Close (with Initial and Scheduled from the earlier answers).
- **Task states (12):** Initial, Approved, Pending, Available, Active, Paused, Suspended, Complete, Backing out, Backed out, Abandoned, Skipped. **Task actions (8):** Approve, Start, Pause, Resume, Complete, Skip, Abandon, Back out. No Suspend action icon.
- **Event answers, 23 Oct 2026:** The Manager starts an event (Start is a button). An event can be Completed only when all its tasks are Complete, Skipped or Abandoned. An event can be backed out. **Close is automatic:** it happens as a state change when all post-implementation tasks are marked complete, so there is **no Close event icon** and no Close button for events (the Close X icon stays for panels only).
- **Event states (draft):** Initial, Approved, Scheduled, Active, Paused, Complete, Closed, Abandoned, Backing out, Backed out (10). **Event actions (draft, 7):** Approve, Start, Pause, Resume, Complete, Abandon, Back out. **Back out (events):** from Active or Paused only, never from a Complete event. Still to confirm: whether Abandon is also allowed from Paused.
- **Icon suite rebuilt (board version 85), all Proposed:** Actions now in three groups, **Construction** (9: Add, Edit, Delete, Save, Discard, Duplicate, Reassign, Export, Lock), **Control / Player** (8: Approve, Start, Pause, Resume, Complete, Skip, Abandon, Back out) and **Display / UI** (11: Search, Filter, Sort, Expand all, Collapse all, Previous, Next, Widen, Open full page, Close, More). "Mark complete" is renamed **Complete**. New icons: Approve, Resume, Skip, Abandon, Back out. **States** are now 14: Initial, Approved, Pending, Available, Active, Paused, Suspended, Complete, Skipped, Backing out, Backed out, Abandoned, Scheduled, Closed. Total icons 88. Registry groups: `state`, `construct`, `control`, `display` (the old single `action` group is replaced; Close is now `display.close`). Not built: Suspend and Close event buttons (neither is a button).
- **Complete action icon changed (23 Oct 2026, Andy Smith):** the traditional Stop symbol, a circle with a square inside, replaces the tick for the Complete action. The Closed state, which used that shape, is replaced by an archive box. The Complete state keeps the check in a ring.
- **Fast-forward icon added (23 Oct 2026, Andy Smith):** double right-pointing triangles, the cassette-player symbol, in Control / Player (now 9 icons; Actions 29; total 89). Back out uses the matching rewind symbol. **Meaning not yet defined:** what Fast-forward does in RBM and which state transition it belongs to (candidates from the old library: auto start, auto complete, or skip ahead to the next task). It is drawn only; it is not in any transition table yet.
- **Task Timeline nodes become Task Type icons (asked by Andy Smith, 23 Oct 2026). Proposed, not drawn.** This **reverses** the earlier line "Not the same as node shape: the node shapes stay as drawn", which applied to the Timeline only. Briefing: `claude/rbm-timeline-node-briefing.md` (repository copy `docs/timeline-node-briefing.md`). A task with a type shows the icon as its node; a milestone keeps the diamond; a task with no type keeps the circle. The state is shown by the node ring and a small state mark. Open: the Event ribbon and Hot-topics strip, type-less tasks, where the type name appears, D0 and D3 sizes, and the Command board drawing.
- **Correction to the icon suite brief (23 Oct 2026):** Blocked and At risk are parked in the icon suite only. They must not be removed from `RbmStatusPill`, `RbmNode`, the focus rule or the engine flags, which still use them. The brief's build step 3 is corrected.
- **Milestone becomes a task type; Decision is redrawn (decided by Andy Smith, 23 Oct 2026). Icon suite board version 89.** Milestone is the **tenth task type**, drawn as a small diamond on a baseline (`taskType.milestone`). The **Decision** object is now a diamond with a question mark (`object.decision`), replacing the plain diamond, and the GO / NO-GO sample and the Checkpoint decision card use it. Andy's reasoning: the diamond is the convention for milestones in project management and for decisions in process modelling, and the two drawings are distinct enough. Icon total: 90. **Supersedes** the earlier "Decision is a plain diamond" entry and the line that a milestone keeps the diamond node. **Flag:** the Event ribbon's milestone markers and the Command board nodes still draw plain diamonds, and the Command board has not been updated. The meaning of Milestone as a task type is not defined. Both icons are Proposed.
- **Checkpoint icon changed (decided by Andy Smith, 23 Oct 2026). Icon suite board version 90.** The task type Checkpoint is now a central ring with four small circles around it (a meeting round a table, `taskType.checkpoint`), replacing the location pin, which did not suggest a collaborative, multi-party activity. Candidates considered: round table (chosen), people at a gate, overlap, group with a check, convergence. The Local badge is still a pin. Proposed.
- **Manual task type renamed Standard, icon is a plain ring (decided by Andy Smith, 23 Oct 2026). Icon suite board version 91.** A standard task can be assigned to a person or a team, so the open hand and the person figure were both set aside (the person figure is the base of the role icons). Candidates considered for the rename: pointer, person, wrench, next step, plain ring, stair step, ruler, plain card, empty box. The key is `taskType.standard`; `taskType.manual` is removed. Description on the board: "Assigned to a person or a team". **Supersedes** the earlier line listing the nine types with Manual. **Risk flagged:** a plain ring is close to the state rings and can read as a bullseye inside the proposed Timeline node. Proposed.
- **Construction set extended (accepted by Andy Smith, 23 Oct 2026). Icon suite board version 92.** **Duplicate is retired.** Its drawing (two overlapping squares) becomes **Copy**. **Clone** is new (a square with an arrow into a second square). Also new: **Move up** and **Move down** (plain arrows), **Drag handle** (six filled dots) and **Drop target** (a dashed slot with an arrow dropping in). Construction is now 14 icons, Actions 34, the suite 95. Registry: `construct: { add, edit, delete, save, discard, copy, clone, reassign, export, lock, moveUp, moveDown, dragHandle, dropTarget }`. **Code impact:** replace `construct.duplicate` with `copy` or `clone`. Candidates not chosen: two sheets (Copy), twins and copy with plus (Clone), arrow over or under a bar (Move), four-way arrows (Move anywhere). **Definitions (Andy Smith, 23 Oct 2026):** Copy copies content or the entire object. Clone is a process that makes a new, independent record from an existing one, with a wizard-like set of user-supplied options, so it opens a guided flow. The wizard template is separate work and not drawn. Proposed.
- **Event card added to the Cards board (asked by Andy Smith, 23 Oct 2026). Design version 95, Proposed.** Sixth prototype, at all four densities, in the same form as the Phase card. **Essential:** Title, Status (Active, with dot and label), Progress (the key figure, a percentage with a bar). **Useful:** Forecast end, Event Manager. **Detail:** Open issues (red when above zero). The title icon is `object.event`; at D3 the fields use the Manager role icon and the Issue icon. Values are placeholders and the 64% is illustrative. **Not decided:** whether the key figure should be Forecast end, the most important number on the Command page, rather than Progress. It is in Useful for now. **Flag:** the Phase card on the same board still says Phase, although RBM's name is Stage. The tiers are my choice from the Event vitals, not from usage.
- **Team and Workstream cards added to the Cards board (asked by Andy Smith, 23 Oct 2026). Design version 96, Proposed.** Seventh and eighth prototypes, at all four densities. **Team:** Essential Title, Scope, Members (the key figure); Useful Lead, Tasks; Detail Active now. **Workstream:** Essential Title, Scope, Progress (with a bar); Useful Lead, Tasks; Detail Open issues (red when above zero). **Scope** (Global or Local) takes the place of the status slot, shown as a globe or pin with the word, because teams and workstreams have no lifecycle state defined; the title icon is the badged object icon (`object.globalTeam`, `object.localWorkstream`). The samples show one Global team and one Local workstream, and a card of the other scope looks the same with the other badge. Values are placeholders and the 58% is illustrative. **Flags:** the tiers are my choice, not from usage; the rule that status keeps its dot and label does not apply, because there is no status; the key figures and the Detail fields are not yet confirmed.
- **Parked, not in the state set:** **Blocked** (ring with a slash, Red Inner, `<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>`) and **At risk** (triangle with a mark, Amber Deep, `<path d="M12 3.5l9.5 16.5h-19L12 3.5z"/><path d="M12 10v4M12 17h.01"/>`). Neither concept exists in RBM today, and it is undecided whether they are states or something else (for example health). Not Blocked = Suspended: Suspended is a separate state held by an Issue.
- **Old library (RBM-345) candidate gaps, not yet drawn or approved:** Import, Publish, Unpublish, Archive, First page, Last page, Expand, Collapse, Help, Info, Cancel, Refresh, Drag handle, Login, Logout, Upload, Download, Auto start, Auto complete, Card view, List view. The old Material names must not override the drawn icons.
- **Still to confirm:** Abandon from Paused for events; the Event and task transition tables are drafts in this note until you sign them off.
- **Data-model point for the Issue work (not an icon decision):** an Issue definition needs a setting for suspending the task, and closing the Issue must resume it.
- **Suggestion:** At risk is a forecast (health), not a lifecycle state, so it may belong in a separate Health group beside the state set. Blocked may be the same as Suspended.
- Nothing on the board was changed for this entry.

### 23 Oct 2026: Centre icons (asked by Andy Smith; base B chosen by Andy Smith, badges Proposed)
- Centres are dashboard-like places used by one persona in one role: Command & Control, Migration, Executive Briefing, Verification, Audit.
- All share one base (four tiles, base B). Base A (a dashboard panel) was rejected because it is almost the same as the Template icon.
- A badge at top right says which Centre it is, using the same small-base pattern as Global/Local and the user roles.
- Added to the Icon suite board as a new Centres section, and to the registry as `centre` (6 icons, including a plain `centre.base` that I added without being asked). Suite is now 101 icons.
- Only the Command & Control Centre is drawn as a page. The other four are not.
- To check: Executive Briefing star and Command & Control crosshair at 16 px.

### 23 Oct 2026: App shell build plan (decided by Andy Smith)
- **Branch:** the shell is built on `rbm-app-shell`, from `rbm-list-page`, so the demo can show the Events list inside the shell.
- **Page headers stay with the pages.** The Command Centre and `RbmListPage` keep their own headers in the content zone. `RbmPageHeader` is built as drawn on the Shell board, but no page uses it yet. **Differs from the board:** the board puts the header in a fixed zone above the scrolling content, so on these two pages the header scrolls away.
- **Slide-in follows the Shell board.** The record panel always overlays the content (480 px; full width from 600 to 899 px; a full-screen page under 600 px). It replaces the record drawer's own rule (beside the list from 1,120 px, full screen under 640 px).
- **The Command Centre opens from the Events list:** a clickable icon on each event row opens that event's Command Centre, at `/events/:eventId`, with Events › List marked active in the sidebar. **Not drawn:** the icon and where it sits in the row.
- **Icon registry:** superseded the same day by the icon suite brief: the full 89-icon registry is built first (see below).
- **No icons from `@mui/icons-material`:** enforced by a test that scans the source (like the MUI X import test), because the repository has no ESLint.

### 23 Oct 2026: Icon registry and `RbmIcon` (icon suite brief, step 1)
Brief: `docs/icon-suite-brief.md` (Icon suite board, version 88). Andy Smith asked for the full registry first, then the app shell; the state pill and the transition tables (brief steps 3 and 4) wait for the questions below.
- **Registry:** `src/icons/registry.ts`. `rbmIconKeys` lists the groups and keys exactly as the brief's section 4: `object` (22), `role` (8), `state` (14), `construct` (9), `control` (9), `display` (11), `nav` (7), `taskType` (9), 89 icons. Each icon is a file, `src/icons/svg/<group>/<name>.svg`. `RbmIconName` is the typed key (`'nav.list'`), so an unknown key does not compile.
- **Checked against the board:** all 91 drawings in the brief (89 plus the two badges) match the Icon suite board exactly.
- **The old `action` group is gone:** the app shell's keys are now `display.previous`, `next`, `widen`, `openFullPage` and `close`.
- **A `shell` group (7) outside the suite**, copied from the App shell board: `notifications` (bell), `menu`, `sidebar` (Collapse), `profile`, `signOut`, `environment`, and `synced`, the footer's "Updated" tick. The tick was `action.markComplete`. The brief maps that key to `control.complete`, but that is a different drawing (the stop symbol), so the tick needs its own file.
- **`RbmIcon`:** its size comes from the density's icon token and its colour from the text (currentColor). It is decorative (`aria-hidden`) unless it has a `title`. At 16 px and below the stroke is 2.25 in the grid (1.5 px drawn), as on the board's "Sizes".
- **`RbmIconButton`** takes `name` (a registry key) or, for earlier components, the icon as children.
- **Checked by tests (the board's CI check):**
  - every file has the 24 px viewBox, `fill="none"`, `stroke="currentColor"`, a 2 px stroke and round caps and joins;
  - inside a drawing, only the drawn exceptions set their own fill or stroke (listed below);
  - no two files are identical;
  - every file is registered and every key has a file;
  - every key draws;
  - nothing outside `src/icons` imports `@mui/icons-material`.
- **Storybook:** Foundations / Icons has every group, all icons at the four density sizes, and a marker on each group ("Proposed", or "Not in the Icon suite" for `shell`).
- **Differs from the brief (flagged):**
  - **Badges:** `badge.globalBadge` and `badge.localBadge` have keys in section 5.2, but section 4's registry has no `badge` group and the count of 89 leaves them out. They are not registered.
  - **Fill rule:** the brief allows fills only on "the half ring and the play triangle". As drawn, `state.active` (half ring), `display.more` and `role.observer` have fills, and `control.start` (play) has none. More drawings set their own strokes: the global and local objects (2.86 and 1.5) and the dashed `state.available`. The test lists these exceptions by file.
  - **Lint:** "lint bans `@mui/icons-material`" is a test, because the repository has no ESLint.
  - **CSS variable:** the brief names `--rbm-icon-size`; the density scope sets `--rbm-icon`.
  - **Not SVGR:** the files are loaded as text (Vite `import.meta.glob` with `?raw`), not generated by SVGR into `createSvgIcon` components, so no build tool is added.
  - **Global and local at D3:** the stroke widths set inside these drawings do not get the heavier D3 stroke.
- **Flagged for the board:**
  - **Near duplicates:** `object.task` and `control.approve` differ by half a unit (`M8 12` and `M8 12.5`). The test passes them, but they break "one meaning per shape".
  - **Shell icons:** the seven `shell` icons are not in the suite. The App shell board draws them with a 1.75 px stroke; they are registered at the suite's 2 px.
  - **Two bells:** the shell bell is not `taskType.notification`.
  - **Settings:** account menu Settings is drawn with the Setup icon, so it uses `nav.setup` (one shape, two meanings).
  - **Chevron:** the account and programme switcher chevron is the `display.next` drawing.
  - **Sign out:** drawn as a plain right chevron.
  - **Environment:** the footer's environment mark is a small circle, not `object.environment`.
- **Not done:**
  - **Tooltip on `RbmIconButton`:** the brief says its label is also a tooltip. The outlined button has no tooltip yet, because adding one changes the earlier components that use it.
  - **Migration:** the hand-drawn icons in about 25 earlier components are not migrated (brief step 2). Many of them are not in the suite (tag glyphs, clock, warning).
- **Questions before steps 3 and 4:**
  - **Removing Blocked and At risk:** it breaks the Events list (`EVENT_STATUSES`, the drawn "At risk"), the engine, the focus rule, the Blockers card and `RbmNode`.
  - **New event states:** they replace the Events list's State column (decided 22 Oct) and the labels "In progress" and "Pending".
  - **Suspended and Blocked:** is Suspended the replacement for Blocked, and how do Blocker records fit?
  - **Roles:** the transition tables have no role column, although the valid-actions function must filter by role.
  - **Task and event rules:** a task is abandoned only from Active and backed out only from Suspended, while an event can do both from Active or Paused. "Any state before complete" (skip) needs defining. Event Complete does not mention backed-out tasks.

### 23 Oct 2026: `rbmNav` types and data (app shell, step 2)
- **Types:** `src/data/nav/nav.ts`. `RbmNavConfig` is a list of groups (`group`, `items`). Each item has `id`, `label`, `icon`, `to` and an optional `permission`, and may have `children`. Children cannot have children, so the types enforce "two levels at most". `icon` is a registry key (`RbmIconName`), so a key that is not registered does not compile.
- **Data:** `rbmNav` is the App shell board's sample exactly: four groups and eleven items, with the board's ids, labels, icons and routes. "License Management" is kept as Andy Smith wrote it (US spelling); flag it if a UK spelling is wanted.
- **Rules checked by `checkNavConfig`** (the ones the types cannot hold): four items or fewer in a group, no empty group, unique ids and routes, and routes that are plain paths from the root.
- **Permissions (proposed in the brief):** the three Admin items carry `permission: 'admin'`. `visibleNav` removes the items a user lacks the permission for, and a group left empty (Admin) disappears with its heading. The platform's API answers through `NavData`; the UI never decides. Until it answers, nothing is granted, so Admin never flashes up and then disappears.
- **Counts:** live, by item id, through `NavData`, not in the fixed menu. This differs from the brief, which puts an optional count on the item. The mock has none, as the board says ("no menu item has a count yet").
- **Active item from the route:** the item whose route is the longest match for the path, at a segment boundary. `/events/folders` marks Events › Folders. An event's Command Centre (`/events/REV000009`) marks Events › List, as decided today. `navLocation` gives the group as well, so its heading can be shown.
- **`NavData`** follows the Command Centre's pattern (`getSnapshot`, `subscribe`). `useNavPermissions` and `useNavCounts` read it. `createMockNavData` is the stub user: an admin, with no counts.
- **Not drawn:** what a route with no matching item shows in the sidebar. It marks nothing.

### 23 Oct 2026: `RbmSidebar` (app shell, step 3)
Built from the App shell board ("Navigation", "Item states", "Responsive behaviour").
- **Three forms:**
  - **Expanded:** Deep Blue, with group headings (11 px uppercase Blue Light, as drawn) and items with icon and label.
  - **Rail:** icons only, with a 1 px divider between groups (18 % white) instead of headings, and a tooltip with the name on hover and focus.
  - **Drawer:** the expanded sidebar in a temporary drawer under the top bar, with a dimmed backdrop below the bar.
- **Item states as drawn:**
  - **Hover:** 7 % white.
  - **Active:** 14 % white with the 3 px Blue Light bar and the label at 800, not Blue Dark.
  - **Disabled:** 40 % opacity, not a link.
  - **With count:** a white pill with Deep Blue text. In the rail the count is an 8 px white dot.
  - **Collapse:** pinned to the bottom under a divider, in Blue Light.
- **Sizes:** the board's own table, now `shellSize` in `src/theme/tokens.ts`:
  - width: 248, 224, 200 px;
  - rail: 72, 64, 56 px;
  - item height: 44, 36, 32 px.

  The density tokens give the label (`body`), icon (`icon`), side padding (`padX`), gap (`gap`) and count text (`caption`). Group headings, the 10 px item corners and the 2 px by 8 px item margins keep their drawn sizes. D0 Command draws no sidebar.
- **Form by width (`useSidebarMode`):** the drawer under 900 px. From 900 px the user's remembered choice wins; without one, the sidebar is expanded from 1,200 px and the rail below. The choice is stored per user through `SidebarPreferenceStore` (localStorage in the prototype). The drawer is the expanded width from 600 to 899 px and 280 px under 600.
- **Links:** real links (`hrefFor`, so a new tab works). `onNavigate` takes a plain click; a click with a modifier key is left to the browser. Choosing an item in the drawer closes it.
- **Accessibility:**
  - a `nav` landmark ("Main");
  - each group is a `group` named by its heading (by `aria-label` in the rail);
  - `aria-current="page"` on the active item;
  - every link's name is its label, plus the count when there is one ("List (12)");
  - icons are hidden from screen readers;
  - Collapse is a button named "Collapse sidebar" or "Expand sidebar", with `aria-expanded`;
  - Escape and the backdrop close the drawer, and focus returns to the button that opened it.
- **Differs from the board or the brief (flagged):**
  - **Focus ring:** white, 2 px with a 2 px offset, as drawn on the board's Focus state. The brief says Blue Dark, which cannot be seen on Deep Blue.
  - **Label size at D1:** 16 px and the 16 px side padding and gap come from the density tokens, where the board draws 14 px and 12 px. At D1 "License Management" no longer fits in 248 px and is cut with an ellipsis. It fits at D2 (the shell default), where the tokens match the drawing.
  - **Mobile drawer:** the drawing puts a 248 px sidebar inside a 280 px drawer. The build fills the drawer.
  - **Collapse in the drawer:** the mobile drawer drawing shows a Collapse item, which has nothing to do in a temporary drawer, so the build leaves it out.
- **Not drawn (proposed, flagged):**
  - the Expand tooltip in the rail;
  - pressed states (MUI's ripple);
  - the width animation's timing (MUI's "shorter", off with reduced motion);
  - children indented to the label's start, without an icon;
  - a parent marked active in the rail when its child is the page;
  - the label cut with an ellipsis;
  - the count in the link's name for screen readers;
  - when an item is disabled (`disabled` was added to the nav types for the drawn state).

### 23 Oct 2026: `RbmTopBar` and `RbmAccountMenu` (app shell, step 4)
Built from the App shell board ("Top bar": D1, D2, D3, rail collapsed, account menu open, D0 Command; and the mobile drawer).
- **The bar:**
  - Deep Blue, full width, with a 1 px divider (14 % white) under it.
  - Session information only: the logo, the bell and the user. No page context, no page actions and no search.
  - Height from `shellSize`: 64, 56 and 48 px (72 px at D0).
- **Logo block:** as wide as the sidebar below it, with the divider on its right.
  - Over the expanded sidebar: the ICEFLO wordmark (104, 96, 88 px wide, as drawn).
  - Over the rail: the ICEFLO mark at 36 px.
  - The two PNGs are copied from the board into `src/components/RbmTopBar/assets/`.
- **Under 900 px (drawer):** the menu button first (`aria-expanded`, `aria-controls`), then the 88 px wordmark, then the bell and the avatar alone, as on the mobile drawing.
- **Notifications:** the bell with a white pill and the count in Deep Blue (10 px, 800, drawn), a count with no status colour. No pill at 0. The name says the count ("Notifications (4 new)"). The popover closes on Escape and returns focus to the bell.
- **Account:** avatar, name (13 px, 700, white), role (11 px, Blue Light) and the chevron, named "Account: Andy Smith". The open state is drawn (12 % white, 12 px corners). The menu, as drawn:
  - 280 px wide, 14 px corners, a Rule border and the drawn shadow;
  - a header with the 40 px avatar, name, role and email (not a menu item);
  - then Profile, Settings and Notification preferences, a divider, and Sign out, each with its icon in Deep Blue.

  MUI's menu gives arrow keys, Escape and the return of focus. `onAction` reports the item.
- **D0 Command:** the ICEFLO mark (40 px), the programme name (24 px, 800) and the clock (32 px, 800, tabular figures), with 32 px side padding and no controls.
- **`RbmAvatar`:** gains the shell's 20 px (D3 bar) and 40 px (account menu) sizes, and `decorative` for an avatar beside the name in text, so screen readers do not hear the name twice.
- **Density:** the bell is an icon button at the `target` size (48, 36, 24 px; drawn 44, 36, 28). Its icon is the `icon` token (24, 20, 16 px; drawn 20 throughout). Menu items take the `target` height and `body` text (48 px and 16 px at D1; drawn 40 px and 14 px), as the event actions menu does. The name, role, avatar and the bar's paddings keep their drawn sizes, which the board draws the same at every level.
- **Differs from the board (flagged):**
  - **Focus ring:** white on the bar (as in the sidebar's drawn Focus state).
  - **Icon strokes:** the shell icons are at the suite's 2 px; the board draws 1.75.
  - **Menu button inset:** the mobile drawing puts the menu button against the left edge, with no padding. Built as drawn; it looks tight, so check it.
- **Not drawn (MUI defaults or proposed, flagged):**
  - hover on the bell, the menu button and the user (the sidebar's 7 % white hover);
  - tooltips on the bell and the menu button;
  - the notifications popover and its content (a heading and "No new notifications.");
  - "99+" for counts over 99;
  - the logo is not a link home.
- **Not built:** the search command palette on the / key. It is described on the board but not drawn, and is not part of this step.
- **Visual check:** D1, D2, the rail, the narrow bar at 600 px and D0 were captured in headless Edge and match the board. Headless Edge cannot go below about 500 px wide, so 390 px is checked in the shell (step 8).

### 23 Oct 2026: `RbmPageHeader` (app shell, step 5)
Built from the App shell board ("Page header"). As decided today, the Command Centre and the Events list keep their own headers for now, so no page uses this one yet.
- **Context row:**
  - The programme, with a switcher when there is more than one: "PROGRAMME" in the eyebrow type, the name in Deep Blue and the chevron.
  - A 1 px Silver divider.
  - On event pages, "EVENT" with the event's name and its status pill.
  - Without a programme or an event, there is no context row.
- **Breadcrumb:** the parents as Deep Blue links with Silver "/" separators, then the page in Slate, not a link, with `aria-current="page"`. The types allow at most three parents, so at most four levels. The page's crumb is the title, as drawn.
- **Title:** the only `h1`, at the shell table's size (28, 24, 20 px), 800, Ink, with the status pill beside it when the page has a status.
- **Metadata:** one line in Slate, cut with an ellipsis (the full text in a tooltip).
- **Actions:** typed as data, so the board's rule holds: `actions` (secondary, first) and one `primaryAction`, the green CTA, last. Buttons take the density's control height.
- **Sizes:** the context row, breadcrumb and metadata keep the drawn sizes (13 px; labels 11 px), because page headers are region chrome (density.md). Both pills are `RbmStatusPill` compact, 24 px as drawn.
- **Differs from the board (flagged):**
  - **Secondary button:** "Edit" is drawn white with a 1 px Silver border and 700 text. The build uses the library's outlined button (Deep Blue 2 px outline), as the list page's Import does. One of the two drawings should change.
  - **Button height:** 48 px at D1 and 36 px at D2 (density), drawn 40.
- **Not drawn (MUI defaults or proposed, flagged):**
  - the programme switcher's menu (MUI's menu, with the current programme selected);
  - the switcher's focus ring (Blue Dark, as elsewhere on light backgrounds);
  - narrow widths: the actions move under the title, and the divider in the context row can be left at the end of a line when the row wraps;
  - long titles wrap;
  - the event has no switcher (none is drawn).
- **Visual check:** the D1 event page was captured in headless Edge and matches the board, except for the Edit button above.

### 23 Oct 2026: `RbmFooter` (app shell, step 6)
Built from the App shell board ("Footer": D1, D2, D3, D0, and the rules).
- **The footer:**
  - White, with a 1 px Rule line above, 12 px Slate text, at the shell table's height (36, 32, 28 px). The side padding is as drawn (24, 20, 16 px; page chrome).
  - Left to right: "© 2026 ICEFLO Limited · RBM 4.2.0", then the sync time (the `shell.synced` tick and "Updated 10:42:18"), the environment (the `shell.environment` mark and its name), and the links.
  - Privacy, Support and Knowledge: 600, Deep Blue, in a `nav` named "Help and legal". Each opens in a new tab (`rel="noopener noreferrer"`) and says so to screen readers. A link without an address is left out.
  - No buttons and no colour.
- **Reconnecting:** the At risk ringed dot (`RbmStatusDot`, now exported from `RbmStatusPill`) and "Reconnecting" in Amber Deep, in place of the sync time, announced as a `status`.
- **Environment:** Production is plain text, as drawn. Any other environment (UAT, Test, Pre-production, Development) is a chip.
- **Widths:** from 900 px, everything. From 600 to 899 px, no links. Under 600 px, the version ("RBM 4.2.0") and the sync time only.
- **D0 Command:** 40 px, Deep Blue, 14 px white text, with 32 px side padding: "Live", the sync time, and on the right the version.
- **Differs from the board (flagged):**
  - **D0 "Live" dot:** drawn Brand Green. Brand Green means Complete only, so the build draws it white. Decide: keep white, or use another colour.
  - **Phone widths:** under 600 px a non-production environment's chip is hidden too, as the board says ("version and sync time only"). That works against "nobody runs a cutover rehearsal in the wrong place". Should the chip stay on phones?
- **Not drawn (proposed, flagged):**
  - the non-production chip (MUI's small outlined chip, 20 px, with the environment mark);
  - the reconnecting footer (described, not drawn);
  - "(opens in a new tab)" for screen readers;
  - the links' hover underline (MUI's default).
- **Open question (brief):** the footer's Support link and Help › Support & Versions overlap. Both are addresses passed in, so they can point to the same place.
- **Visual check:** D1, Reconnecting, UAT and D0 were captured in headless Edge and match the board, apart from the white Live dot.

### 23 Oct 2026: Icon registry updated to the icon suite brief, rev 2 (asked by Andy Smith)
Sources: the icon suite brief, rev 2 (now `docs/icon-suite-brief.md`), and the project note's new answers under "state versus action" (merged above from `docs/rbm-parked-decisions-rev2.md`). Icon suite board version 92: all 97 drawings in the brief (95 icons and the two badges) match the board exactly.
- **Registry, now 95 suite icons (plus 7 shell):**
  - **Construction (14):** `duplicate` is retired. Its drawing is now `copy`. New: `clone`, `moveUp`, `moveDown`, `dragHandle` (six filled dots) and `dropTarget` (a dashed slot).
  - **Task types (10):** `manual` is renamed `standard` and redrawn as a plain ring. `checkpoint` is redrawn as a ring with four small circles, replacing the pin. `milestone` is new (a diamond on a baseline).
  - **Objects:** `decision` is redrawn as a diamond with a question mark.
- **Tests:** the drawn exceptions now include the drag handle's filled dots (`fill="currentColor"`, `stroke="none"`) and the drop target's dashed slot.
- **Earlier components not changed** (Andy Smith: their icons are refreshed in a separate cycle). Nothing in the code used `construct.duplicate` or `taskType.manual`.
- **Look-alikes:** checked side by side at 16, 20 and 24 px, as the brief asks. A new Storybook story, Foundations / Icons / Look Alikes, shows them.
  - **`object.task` and `control.approve`:** the same picture at every size (a tick in a rounded square, half a unit apart). The worst pair: one should change.
  - **`taskType.standard` and `state.initial`:** at 16 px they differ only by Initial's tiny centre dot and a slightly smaller ring. Hard to tell apart. Standard is clear of Available (dashed) and Skipped (dash).
  - **`taskType.checkpoint` and `taskType.automated`:** both read as a ring with marks around it at 16 px. Close. Checkpoint is clearly unlike the Local badges.
  - **`taskType.milestone` and `object.decision`:** distinct at every size.
  - **`construct.moveUp` and `moveDown` against `display.previous` and `next`:** arrows against chevrons. They can be told apart, but they are close. Sort (two arrows) is distinct.
- **Answered by the new note** (questions raised this morning under "Icon registry and `RbmIcon`"):
  - **Blocked and At risk** stay in `RbmStatusPill`, `RbmNode`, the focus rule and the engine. They are parked in the icon suite only.
  - **Suspended** is a separate state held by an Issue, not Blocked. (The note's last line still suggests "Blocked may be the same as Suspended": the two lines disagree.)
  - **The task rules are as intended:** Abandon from Active, Back out from Suspended, Skip from any state before Complete.
- **Still open:**
  - **Roles:** the transition tables have no role column, although the valid-actions function must filter by role.
  - **Abandon from Paused:** for events, still to confirm.
  - **Event Complete and backed-out tasks:** Event Complete does not say what happens to backed-out tasks.
  - **Copy and Clone:** confirm the definitions (Copy copies content; Clone makes a new, independent record).
  - **Fast-forward:** its meaning is not defined.
  - **Milestone:** its meaning as a task type is not defined.

### 23 Oct 2026: `RbmSlideInRegion` (app shell, step 7)
Built from the App shell board ("Anatomy" 6, "Responsive behaviour", "React and MUI").
- **What it is:** a MUI Drawer anchored right, with the shell's content area as its container, so it overlays the content only. The top bar and footer stay visible, and the content does not move.
  - **900 px and above:** a 480 px panel (`SLIDE_IN_WIDTH`); the record pattern's wide panel passes 800.
  - **600 to 899 px:** the full width of the content.
  - **Under 600 px:** a full-screen page, over the header and footer too.
- **Accessibility:** a modal `dialog` named by `label` (for example the record's title). Focus moves into it and stays there, and closing returns focus to whatever opened it.
  - **Escape** closes it, unless the panel handles Escape itself (`closeOnEscape={false}`, for the record panel, which asks about unsaved work first).
  - **A click on the content behind** is reported as `'backdrop'`.
- **Styling:** the record panel's drawn edge (1 px Rule border, `-8px 0 24px` shadow). None at full screen.
- **Hosting rule (found in the visual check):** the container must be the content area's frame (`position: relative`, `overflow: hidden`), with the scrolling content inside it. Hosted in the scroller itself, the panel moves with the scroll, and while it slides in it can push the page sideways. The shell (step 8) is built this way.
- **Bug fixed in `RbmFooter` (step 6):** the screen-reader text "(opens in a new tab)" was 100 % wide, not 1 px, because `width: 1` in MUI's `sx` means 100 %. It made every page with the footer 2,524 px wide at 1,280, and opening the panel scrolled it sideways. Fixed, with a test. **The same mistake is in `RbmDataGrid`** (the hidden "Actions" header text). Not fixed here, because it is an earlier component: fix it in its own change.
- **Differs from the board (flagged):**
  - **The page header is covered:** the board puts the panel below the page header. Because the pages keep their own headers inside the content (decided today), the panel covers the page header too, and sits below the top bar.
  - **The record list no longer sits beside the panel:** as decided today, the Shell board's rule replaces the record drawer's own (beside the list from 1,120 px, full screen under 640 px). The list page moves to this region in step 8 or 9.
- **Not drawn (MUI defaults, flagged):**
  - the dimmed backdrop over the content (MUI's 50 % black);
  - the slide animation;
  - whether a click on the content behind should close the panel (it reports it, and the page decides).
- **Visual check:** at 1280, 800 and 390 px in headless Edge, driven over the DevTools protocol, which also gets below Edge's usual 500 px minimum. The page no longer scrolls sideways at any width.

### 23 Oct 2026: `RbmAppShell` and the demo in the shell (app shell, step 8)
- **`RbmAppShell`:** the whole screen on a CSS grid (rows: top bar, content, footer; columns: sidebar, content). The grid keeps the bars in place without `position: fixed`.
  - It wires `RbmTopBar`, `RbmSidebar` (with `useSidebarMode` and the remembered Collapse) and `RbmFooter`.
  - The content area is a frame (`position: relative`, `overflow: hidden`) with the scroller inside it, so the page scrolls on its own and the shell never moves.
  - Density: D2 Compact by default (flagged: the board's default is D1); pages set their own.
  - Props as the brief's sketch (`nav`, `user`, `footer`, `density`), plus the route (`path`, `hrefFor`, `onNavigate`), the menu's data, notifications, the account menu and the sidebar store.
- **What a page gets (`ShellFrameContext`):** the content frame, the scroller and the content width.
  - `RbmSlideInRegion` finds the frame itself, so a page renders it without a container.
  - The content's visible height is the CSS variable `--rbm-view-height`.
  - Outside a shell all three are null, and pages behave as before (the window scrolls).
- **Skip link** ("Skip to content"): the first thing to focus. It is shown only when focused (not drawn: white, Deep Blue text, top left, proposed) and moves focus to the content, rather than following a `#` link, which would change the route in a hash-routed app.
  - **Keyboard order:** skip link, top bar, sidebar, content, footer (tested).
  - The sidebar's `id` names the drawer the menu button controls.
- **Changes to earlier components, so they work inside the shell:**
  - **Task Timeline:** the virtual rows listen to the shell's scroller, and measure against its visible band, instead of the window. Checked on the 15,000-task event: about 26 rows drawn and 11 in view after scrolling 8,000 px.
  - **Hot-topics panel:** its height cap reads `--rbm-view-height` (100vh outside the shell).
  - **The 1,200 px rule (side panel or strip):** inside the shell it now applies to the content area's width, not the window's, because the sidebar takes part of the window (`useHotTopicsNarrow`, used by the panel and `RbmCommandCentre`). At 1,280 px with the sidebar expanded the content is 1,056 px, so Hot topics become the strip under the main column; with the rail (1,216 px) they sit beside it. Before this, the main column was squeezed to about 600 px, and the runbook bands and the timeline toolbar overlapped.
  - **Sidebar:**
    - A deep link brings the active item's group, heading included, into view (the brief's acceptance).
    - A menu taller than the screen scrolls with a thin, quiet scrollbar (not drawn).
- **Demo app (`npm run demo`):**
  - **The shell:** the demo runs inside it, with the stub user and mock menu data. See `docs/prototype.md`.
  - **Routes:** `#/events/REV000009` to `#/events/REV000012` open each event's Command Centre, and Events › List is marked active. `#/command-centre` still works and opens REV000009. `#/events` is a stand-in list until the Events list joins the demo (next step). Other menu items show a "not built in the prototype" page, using `RbmPageHeader`.
  - **The demo bar:** an event switcher, the clock, Reset, and the **density** and **viewport** switchers the brief asks for. A set viewport (1280, 1024, 800, 390 px) runs the app in an iframe of that width, so the media queries really apply.
  - **Footer:** the package version (0.0.1), the sim clock as the sync time, and "Development" as the environment chip.
  - **Notifications:** two sample notifications (not drawn).
- **Acceptance check** (headless Edge over the DevTools protocol, the Command Centre route, D1 and D2):

  | Width | Sidebar | Footer |
  | --- | --- | --- |
  | 1280 | expanded (248 / 224 px) | links shown |
  | 1024 | rail (72 / 64 px) | links shown |
  | 800 | drawer, behind the menu button | links hidden |
  | 390 | drawer | version and sync time only |

  The bar and footer heights follow the density, and the page never scrolls sideways.
- **Found, not fixed (earlier components, flagged):**
  - **Command Centre below about 1,000 px:** it does not fit its content. At 1,024 px with the D1 rail, the Start of event time is cut ("22:0"). At 800 px its content is 822 px wide, and at 390 px the Event vitals overlap. It scrolls inside the content area, but the Command board draws only desktop and wall widths. Needs a decision on narrow widths.
  - **Active label:** at D2 with the sidebar's scrollbar showing, the active label (800 weight) can be cut with an ellipsis ("License Managem…").
- **Not built yet:**
  - the search command palette (/ key);
  - the account menu's actions (they are reported, and the demo does nothing with them);
  - D0 and D3 beyond the sizes in the shell table;
  - the Events list in the demo, the row icon that opens the Command Centre, and the record panel in the slide-in region (next step).

### 23 Oct 2026: Centre icons in the registry (icon suite brief, v2)
Source: the icon suite brief, v2 (now `docs/icon-suite-brief.md`), and the project note's new lines (merged above from `docs/rbm-parked-decisions-v2.md`). All 103 drawings in the brief (101 icons and the two badges) match the Icon suite board.
- **Registry:** a new group `centre` (6): `base`, `commandControl`, `migration`, `executiveBriefing`, `verification`, `audit`. The suite is 101 icons, plus the 7 shell icons. Proposed.
- **Tests:** the five badged Centres are drawn exceptions, like the Global and Local objects (the small base at 2.86, the badge at 1.5).
- **Storybook:** a Centres group story. The Look Alikes story adds the Centre badges side by side and the base against Template.
- **16 px check (as the brief asks):**
  - **The base:** four tiles, clearly unlike Template (one panel) and List.
  - **The badges:** very small at 16 px. The check, magnifier and arrow can be told apart. The Command & Control crosshair and the Executive Briefing star both read as small spiky marks, so they are close at 16 px. They are clear at 20 and 24.
- **Earlier components not changed** (their icons are refreshed in a separate cycle).
- **Next use:** `centre.commandControl` is the icon on the Events list row that opens the event's Command Centre (app shell, step 9).

### 23 Oct 2026: the Events list in the demo, and the Command Centre from a row (app shell, step 9)
- **The Events list in the shell:** `#/events` is `EventsListPage` on the mock server, inside `RbmAppShell`.
  - The 128-event fixture by default; `?events=large` for 15,000 rows and `?events=board` for the eight drawn events.
  - The open record, tab and section are kept in the address (`#/events?record=ev-00009`), so a deep link opens the panel.
- **The record panel is in the slide-in region** (decided by Andy Smith today: the Shell board's rule wins). `RbmListPage` hosts `RbmRecord` in `RbmSlideInRegion`:
  - 480 px, or 800 px for the wide panel, over the list, between the top bar and the footer;
  - full width from 600 to 899 px, and a full-screen page under 600.
  - The list no longer makes room beside the panel. Escape stays the panel's own (it asks about unsaved work), and a click on the list behind is a guarded close.
  - **Removed:** `RbmRecordDrawer` (`drawerMode`, `useDrawerMode`), whose rule this replaces. `PANEL_WIDTH` moves to `RbmRecord`.
- **The Command Centre from a row (asked by Andy Smith):** a `centre.commandControl` icon button at the end of each running event's row (State Active or Paused). The Command Centre opens at `#/events/REVnnnnnn`, with Events › List still marked active.
  - Its tooltip is "Open Command Centre", its name for screen readers "Open Command Centre, REV000009", and its column's hidden name "Command Centre".
  - A click or Enter on its cell goes to the Command Centre and does not also open the record.
  - The record panel's **Open Command Centre** goes to the same place.
- **`RbmDataGrid`** gains `rowLink`, an icon button on the rows that have one, before the "more" menu. Its hidden header text is now 1 px, the `width: 1` bug found in the footer (step 7).
- **Not drawn (proposed, flagged):**
  - the row icon itself, its column and its place in the row;
  - which events show it: the row does not carry the server's allowed actions as the record does (`actions: ['openCommandCentre']`), so the State column decides. Better: the row carries the same actions, so the platform decides, as for everything else.
- **In the prototype only:** REV000009 to REV000012 have Command Centre data. Opening another running event's Command Centre says it has none.
- **Checked in headless Edge** (the demo, D2):
  - **The list:** the icons show on running rows only.
  - **REV000009's icon** opens its Command Centre.
  - **The record panel:** at 1280 px a 480 px panel between the bar and the footer (800, 56 to 1280, 768); at 800 px the full content width; at 390 px a full-screen page.
  - **The panel's Open Command Centre** opens the same Command Centre. The page never scrolls sideways.

## Open questions
- Planning engine (Dave): does it write critical-path status on stages and runbooks, or do clients derive it from the tasks? See 22 Oct 2026, Critical runbooks filter.
- Should the collapsed Event ribbon's summary follow the Critical runbooks filter?
- Should the Hot-topics cards (Blockers, Next checkpoint and so on) also be reorderable in the Layout panel, or only the three regions?
- Does the Blockers card "+ Raise" need a different pattern?
- Task-level Gantt view: needs a spike.
- ServiceNow real-time updates: needs a spike.
- Status on-dark values: only Active has one drawn (Blue Mid). The Semantic board says a test should check every state has one.
- The Semantic board's lint rule that bans hex values outside the theme package is not set up yet.
- **Needs a drawing and sign-off:** the pills for At risk, Paused, Blocked and Skipped, and the ringed dot at 16 px inside the compact pill. Both are built but not on any board.
- **Proposed token:** `amberInner` (#F36C00) needs sign-off on the Foundations and Semantic boards.
- **Hairline grey.** The Command board uses #EEF0F4 for the hour grid, lane rules, card dividers and the "+3" avatar chip, but it is not in the brand palette. Should it become a token (`hairline`), and what should it be called?
- **Summary line and lifted-row tints.** The Task Timeline summary line (#FBFCFE, `surfaceTint`) and the lifted row in the Layout panel (#EEF1FF, `liftTint`) are drawn but are not brand colours. Should they be tokens, or should they use existing ones?
- **Red on the Deep Blue runbook band.** Red is hard to read on Deep Blue, and only Amber is drawn there. What should the Red (and Green) forecast marks look like on that band?
- **Event ribbon on the board.** The build puts milestones and checkpoints on a thin line above the bars, as 18 px nodes, and adds a Collapse control and "+n more stages overlapping". Should the Command board be redrawn to match, along with the vertical budget (252 px plus 28 px per extra sub-row) and an overlapping example?
- **Alert popover.** The build orders alerts Red before Amber and uses the Foundations menu shadow. Should the board's sample (a late forecast between two Red alerts) be redrawn to match?
- **WBS numbers.** The build uses Slate, as the board's written rule says, because the drawn Silver is too faint on white (1.6:1). Should the drawing be corrected?
- **Layout drop line.** The build puts the drop line where the row will land. The drawing shows it between the two rows. Which should it be?
- **Gaps between regions.** The vertical budget says 16 px and the page drawing has 24 px. Which is right?
- **Densities not drawn.** What sizes should nodes, buttons and the Event vitals use at D0 (Command) and D3 (Dense)?
- **Boards to redraw at D2:** the Page templates list drawing shows 36 px rows, 13 px text and 8 px dots. The density rule (22 Oct 2026) makes them 44 px, 14 px and 10 px.
- **List of records data contract** (22 Oct 2026, [list-data-model.md](list-data-model.md) section 8). The count line "128 events · filtered to Production" shows fewer than 128 with the fixtures, which span every environment. Live conflicts are found only on save until the ServiceNow real-time spike.
- **Command board:** redraw the page header and the compact event bar with REV000009 instead of E12345, and every region at its density (D1 header and vitals, D2 elsewhere).
- **Compact event bar at 56 px** (22 Oct 2026): assess the visual impact of the larger forecast time.
- **MUI X licence.** A real Pro key is needed before release (D4).
- **Where do Dashboard, Plan, Readiness, Run, Improve, Reports and Tasks go?** They are not in the new four-group navigation. Inside Events, or out of scope for the shell?
- **Shell chrome icons** (bell, menu, collapse, account menu, programme switcher, footer sync) are drawn on the Shell board but are not in the Icon suite. Add them to the suite?
- **Footer Support link and Help: Support & Versions** overlap. Same destination?
- **Shell default density:** D2 Compact (as built in the brief) or D1 Comfortable (the board)?
- **Task types:** the Business and Technical verification types had a "(*)" note that did not come through. What does it say? Also, where should the type icon appear (task row, filter, record panel)?
- **Global and local (design approved):** which other objects come in both forms (Template, Runbook, Stage)? Should Cutover be kept now that Event exists? Event, Workstream and the Stage rename are still Proposed.
- **Centres:** is the plain base icon wanted? Are the one-line meanings right? Do the other four Centres need pages?

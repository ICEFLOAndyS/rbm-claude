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
- **Ringed dot as drawn.** At risk and Paused use the Semantic board mark: a 16 px Amber disc, a 2 px white gap and a 10 px centre. The At risk centre is #F36C00 (new token `amberCore`, Proposed on the Foundations and Semantic boards).
- **Pills for every state.** At risk, Paused, Blocked and Skipped have a pill too. Each is the drawn pill (Command board page header) with the Semantic board dot. **Differs from design: not drawn. Needs sign-off and a drawing.**
- **Compact size.** `size="compact"` is 24 px tall with 12 px text, as drawn in the Command board compact event bar. A ringed dot keeps its 16 px size in the compact pill (not drawn).
- **Status colours live in the theme.** `theme.palette.status` is the single source, as on the Semantic board ("React and MUI"). Skipped is added (Slate dot and text). Stock MUI colours follow the board: success = Green Deep, info = Blue Dark, warning = Amber Deep, error = Red Inner.
- **Names.** The state stays `active` (the brief and the Command board say Active). The Semantic board calls it `inProgress`. `pending` is labelled "Not started".

### 21 Oct 2026: setup
- MUI 9.5 (upgraded from 7.3). MUI X 9.16 is compatible but not added until each piece is evaluated.
- Inter is loaded in Storybook with `@fontsource-variable/inter`. The library does not bundle the font; apps load it.

## Open questions
- Should the Hot-topics cards (Blockers, Next checkpoint and so on) also be reorderable in the Layout panel, or only the three regions?
- Does the Blockers card "+ Raise" need a different pattern?
- Task-level Gantt view: needs a spike.
- ServiceNow real-time updates: needs a spike.
- Status on-dark values: only Active has one drawn (Blue Mid). The Semantic board says a test should check every state has one.
- The Semantic board's lint rule that bans hex values outside the theme package is not set up yet.

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
- **At risk and Paused (decided by Andy Smith):** tags are enabled for every task state, even where a row may not use them. The reason a task is at risk or paused is a tag with the Semantic board's At risk (warning) or Paused (pause) icon, in Amber Deep. **Differs from design: not drawn as tags. Needs a drawing.** The At risk warning icon is nearly the same as the Issue tag's; the label tells them apart.
- Any kind of item (task, milestone, checkpoint) can carry any tag.
- The 13 px tag icons are copied from the board. They move to the icon suite (`rbmIcons`) when it is built.

### 21 Oct 2026: `RbmAlertCounter`
Built as drawn on the Command board ("Alert counter"): hidden when healthy; Red Inner with white text when any alert is Red, Amber with Ink text when the only alerts are Amber; a bell and the count in words and digits ("1 alert", "3 alerts"). 30 px in the page header, 24 px (`size="compact"`) in the compact event bar. A click opens a popover: "Alerts" and "Most serious first", then each alert with its mark, title, detail and a link.
- **Data contract:** `alerts: { id, severity: 'red' | 'amber', title, detail?, action?: { label, onSelect } }[]`. The planning engine sets the severity; the component only sorts and counts.
- **Order.** Red before Amber, keeping the engine's order within a severity. **Differs from the drawing:** the board's sample lists a late forecast between two Red alerts, which its own "most serious first" rule does not allow.
- **Shadow.** The popover uses the shadow drawn with it (`0 8px 24px rgba(35,50,111,0.16)`). **It differs from the Proposed menu elevation on the Foundations board**; one of the two should be chosen.
- **Accessibility.** The counter is a button named by its count, with `aria-haspopup="dialog"` and `aria-expanded`. The popover is a dialog named "Alerts"; Escape closes it and returns focus. Each link is a button that runs its action and closes the popover. **Open question:** Red and Amber counters differ only in colour; the count does not say which. Should the counter's name include the worst alert (for example "3 alerts, 2 blockers")?

## Open questions
- Should the Hot-topics cards (Blockers, Next checkpoint and so on) also be reorderable in the Layout panel, or only the three regions?
- Does the Blockers card "+ Raise" need a different pattern?
- Task-level Gantt view: needs a spike.
- ServiceNow real-time updates: needs a spike.
- Status on-dark values: only Active has one drawn (Blue Mid). The Semantic board says a test should check every state has one.
- The Semantic board's lint rule that bans hex values outside the theme package is not set up yet.

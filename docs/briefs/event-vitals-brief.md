# RBM Event vitals: brief for Claude Code

Prepared 28 Oct 2026, asked for by Andy Smith. This brief covers one component, **`RbmEventVitals`**: the **Event vitals** region, now **five equal cards** with a new first card, **Work Progress**. Read `docs/briefs/handoff-brief.md` and `docs/rbm-parked-decisions.md` first (the decisions note has the entries "28 Oct 2026: Work, a new concept" and "21 Oct 2026: `RbmEventVitals`"). Everything there still applies. **This brief says what is drawn now and what changed.**

**Status:** drawn on the Command board (`Command.dc.html`): the section **"Event vitals: Work Progress and five equal cards"** and the row on **"The page"**, design **version 136**, tagged Proposed. Andy Smith has confirmed the equal-width row, the rename, and Work Progress on the Executive Briefing Centre. Decided items are marked **(decided)**.

## 1. What this is
- **Event vitals is a universal region.** It is common to several Centres (the Command & Control Centre and the Executive Briefing Centre so far) and is built once **(decided)**. It must not assume the Command & Control Centre. It takes the Event's data as props.
- The repo has only `RbmStatusPill` built so far. In the handoff brief's build order this is **step 3**. It needs the theme and tokens (step 1) and the base parts (step 2). The four-card version of `RbmEventVitals` described in the decisions note (21 Oct) was never built here: **build the five-card version directly.**

## 2. Layout (decided: equal widths)
- **Five cards, left to right:** Work Progress, Task progress, Issues, Start of event, Forecast end time. Forecast end time stays on the right.
- **All cards are the same width at every density.** A CSS grid sets it: `repeat(5, minmax(0, 1fr))`, 16 px gap at D1. Density changes height and content, never width.
- **Minimum card width about 185 px** (five cards need about 925 px). Below that the row **wraps in equal widths** (3 + 2, then 2 + 2 + 1). Cards never shrink below the minimum. Drawn at 214 px (the board's row), 187 px (on "The page") and wrapped 3 + 2.
- The cards stretch to one height. The row is fixed at the top of the page, as before.
- Each card is a region named by its heading, and a link when given a handler (a button stretched over the card, so "Raise issue" stays its own button).

## 3. The five cards
**1. Work Progress (new, decided).**
- Title "Work Progress". The percentage large (32 px at D1), a bar, then two rows: **Done** and **To do**, in hours and minutes ("18 h 30 min", "11 h", "0 min"). **No Late indicator** (decided).
- **Bar:** Blue Dark until the Event is Complete, then Brand Green. A Complete Event also shows a tick and the word **Complete** beside the percentage. Colour is never the only signal.
- **Work** is the effective duration of a task (planned before it starts, forecast once started, actual once Complete), supplied by the **Planning engine** (decided). Paused time is not worked. Skipped tasks and Milestones add zero. An overrun grows the forecast. Work progress = Work done ÷ (Work done + Work to do).
- **States:** Not started (0%), In progress, Complete (100%, green, tick and word), No work planned (an en dash and "No work planned yet."), Loading (grey blocks, announced as loading).
- **Densities:** D0 percentage and bar (44 px figure); **D1** percentage, bar, Done and To do; **D2** the same, smaller (28 px figure, 12 px padding); **D3** one 40 px line, the title and the percentage, no bar. D0 and D3 show the percentage alone in the tier sense (Essential only).

**2. Task progress (renamed from Progress; decided).** The ring is the share of **tasks** Complete (Green), In progress (Blue Dark), Blocked (Red). The legend is Complete, In progress, Blocked, Total. It measures task counts, not Work. The ring is **60 px** (was 84), the legend 12 px.

**3. Issues.** As before: ring by severity (High Red, Medium Amber with the ringed dot, Low Silver), centre the open count, "Raise issue" in the header (only when the user may raise issues). Ring 60 px.

**4. Start of event.** As before: the date chip and the 32 px time, "Elapsed 05:40 of 08:00".

**5. Forecast end time.** The clock in a tinted disc in the RAG colour, the time (34 px), the gap in words with an icon, and "Planned end". **Changed to fit the narrower card:** the disc is 48 px (was 60), and the status line ("+12 min Behind Schedule", "On Schedule") sits **under** the time instead of beside it. The Planning engine decides the RAG and the gap. The page never works them out.

## 3a. Differences from the earlier design (flag these in the pull request)
- Progress is renamed Task progress. The donuts are 60 px, the legend is 12 px, the side padding is 14 px. On Forecast end time the status line moved under the time and the disc is 48 px. These were needed to fit five cards at 187 px and were confirmed by Andy Smith's yes to the row. The old 1.55 : 1.3 : 1.325 : 1.325 grid is gone.

## 4. Data contract
Extend `RbmEventVitalsData` (the 21 Oct contract) with Work. Keep the rest.
```ts
type RbmEventVitalsData = {
  work: { doneMinutes: number; todoMinutes: number };   // from the Planning engine
  eventComplete: boolean;                                // bar turns Brand Green
  tasks: { complete: number; active: number; blocked: number; total: number };
  issues: { high: number; medium: number; low: number };
  start: { time: Date; elapsedMinutes: number; plannedMinutes: number };
  forecast: { end: Date; plannedEnd: Date; rag: 'green' | 'amber' | 'red'; gapMinutes: number };
};
```
- The percentage is **derived**, not supplied: `done / (done + todo)`. Rounding: nearest whole percent, but **never show 100% unless To do is 0 and never show 0% once any work is done** (to confirm). If `done + todo` is 0, show the empty state.
- Minutes are shown as hours and minutes: "18 h 30 min", "11 h", "45 min", "0 min".
- `mockEventVitals()` holds the board's values until the ServiceNow adapter exists. Times are `Date`s, shown as 24-hour times in the given time zone.
- **An Event is not always the context.** The component takes the data for one Event. The Centre supplies the Event.

## 5. Keyboard and screen reader
- Each card is a region named by its heading. A card that is a link is one tab stop.
- The Work Progress bar is a progress bar named like "Work Progress, 62%, 18 h 30 min done, 11 h 15 min to do" (and ", Complete" when complete). Loading is announced as loading.
- Rings, the disc and the calendar chip are hidden from screen readers. The legend (a definition list), the time and the gap in words carry the meaning.
- Colour is never the only signal: every state has text.

## 6. What to build, in order
1. `RbmEventVitals` with the data contract above, theme tokens only (no hex values), the derived percentage, and the grid with the 185 px minimum and equal wrap.
2. `RbmRing` (Rule track, one-unit gaps between segments, the figure in the centre) if it is not built yet.
3. Storybook stories for every state: Work Progress (not started, in progress, Complete, no work planned, loading); Forecast on schedule, behind (Amber), behind (Red) and ahead; zero issues; Raise issue hidden; the row at 1136 px, 998 px and 660 px (wrapped); each density D0 to D3.
4. Unit tests: percentage and rounding, `done + todo` 0, hours and minutes text, green only when the Event is Complete, equal card widths, the wrap, accessible names, no hex values.
5. Keyboard and screen-reader checks, then a **visual check against the Command board** (section and "The page").
6. One pull request. Flag the differences in 3a.

## 7. Open points (flag, do not guess)
1. **Which Centres** show Event vitals, and does each Centre choose its cards? Where does the Event come from on a Centre that is not about one Event?
2. **Rounding** at the ends (to confirm), and how an overrun that lowers the percentage should read.
3. **What Start of event opens** when clicked (not drawn).
4. **D0 sizes** beyond the Work Progress card (the other four cards at D0, D2 and D3 are not drawn).
5. **The Executive Briefing Centre** is not drawn. Dashboard samples are not Event vitals.
6. A separate **dashboard metrics engine** may be needed later. Assume the Planning engine for now.

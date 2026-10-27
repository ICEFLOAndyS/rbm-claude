# RBM Workstream Progress: brief for Claude Code

Prepared 26 Oct 2026, asked for by Andy Smith. This brief covers one piece of work: a reusable component, **`RbmWorkstreamProgress`**, based on the "Readiness by workstream" panel on the Page templates board. It is intended for the **Executive Control Centre**, which is not defined yet. It builds on `docs/handoff-brief.md` and `docs/rbm-parked-decisions.md`. Read those first. Everything there still applies (tokens, naming, working agreements, "the design is the source of truth", one component per pull request).

**Status of this brief:** Part 1 describes what the design drew **before** 26 Oct 2026. Andy Smith then answered the first questions (and on 26 Oct added owner, start and end and the Icon suite states) (section 5 notes the answers), and the component is now drawn on the **Progress board** (`Progress.dc.html`, section "Workstream progress", design version 124, tagged Proposed). Part 2 is the component as drawn. Decisions by Andy Smith are marked **(decided)**; everything else is **Proposed**. Anything the design does not draw is flagged, not guessed.

---

## Part 1. What the design draws today

### 1. Where it is
Page templates board (`Templates.dc.html`), template **3 · Dashboard** (`RbmDashboardPage`). The page has a KPI strip (`RbmProgress` row variant) and a grid of two panels: **Readiness by workstream** (this one) and **Needs attention**. The page is read, not filled in, and has no call to action. In the code sample the panel is passed in as `readinessPanel`, in `panels={[readinessPanel, attentionPanel]}`. The board's React and MUI note says the dashboard uses a CSS grid or `Grid`, `Card`, and MUI X Charts for panels, and that the Charts part is untested.

### 2. What the panel looks like
- A white card with a 1 px border (#E3E6EC), 14 px radius, 20 px padding.
- A title, "Readiness by workstream", 18 px, weight 800, then a 16 px gap.
- Five rows, 14 px apart. Each row is a three-column grid, 12 px gap, columns **110 px | flexible | 40 px**:
  1. The workstream name, 13 px, weight 600.
  2. A bar: 10 px tall, fully rounded, track #E3E6EC, fill #84CC16 (Brand Green), the fill width equal to the percentage.
  3. The percentage, 13 px, weight 700, Slate (#5B6472).
- Sample data (placeholders): Infrastructure 82%, Applications 64%, Data 47%, Network 31%, Security 90%. They are not sorted.
- The page filters are "Programme: Q4 Data Centre Migration", "Dashboards: Programme overview", "All workstreams" and "Last 7 days".

### 3. What it is not
It shows one measure per workstream and nothing else. It has no status, no counts, no target, no trend, no link through, no empty, loading or error state, and no densities. It is drawn once, at the Dashboard template's density (D1 Comfortable).

### 4. Related design that already exists
- **`RbmProgress`** (Progress board): the same data language as rings (Simple, Row, Column). The ring fills with the **Complete green**, and its label says Complete. So green on a progress measure is already a "percent complete" signal.
- **Workstream card** (Cards board): Essential **Title, Scope (Global or Local), Progress**; Useful **Lead, Tasks**; Detail **Open issues**. A workstream is global or local (approved, 22 Oct 2026).
- **Workstream** object icon `object.workstream` (and global and local badged versions) in the Icon suite.
- **Centres** (Icon suite): Command & Control, Migration, Executive Briefing, Verification, Audit. Only Command & Control is drawn as a page.

### 5. Gaps and conflicts in the earlier drawing (flag, do not guess)

**Answered by Andy Smith, 26 Oct 2026:** (1) the number is **progress**, assumed computable as percent complete per workstream; (2) the home is the **Executive Briefing Centre**; (3) the bar is not green until the workstream is Complete, and **Late** is shown; (4) the card shows task counts and issue counts by severity; (5) no click-through, ordered by earliest start time, ten rows at most. The list below is the original list; items 1, 2, 3, 4, 8 are now settled by those answers, see Part 2.
1. **Readiness or progress?** The panel is called "Readiness", but Readiness is **not defined yet** (Andy Smith, 23 Oct 2026: it will be defined later from Event KPIs and other attributes). The new component is called "Workstream Progress". Until Readiness is defined, I treat the number as **progress: the share of a workstream's tasks that are Complete**. This must be confirmed.
2. **Green rule.** Brand Green means Complete only. If the number is progress (percent Complete), green is right and matches `RbmProgress`. If it ever becomes Readiness, green would break the rule and the fill needs another colour.
3. **No signal for trouble.** All bars are the same green, so 31% and 90% look alike apart from length. An executive cannot see which workstream is late, at risk or blocked. The design is silent. Do not invent marks; propose and ask (Part 2, question 4).
4. **Order.** The sample is unsorted. Should it follow the workstream order, or sort by value?
5. **Long names.** The name column is 110 px with no rule for names that do not fit.
6. **Edge values.** 0% and 100% are not drawn. At 100% the state is Complete and needs the word, not just a full bar.
7. **Meaning of the bar.** Nothing says what the 100% is (tasks, hours, or a weighted plan) or which Event, Programme or scenario it is for.
8. **Executive Control Centre** is not defined. The Centres list has an **Executive Briefing** Centre. Is that the same place?
9. **Densities.** Only D1 is drawn. D0 (wall display) is likely for an executive screen, but it is not drawn.

---

## Part 2. The component as drawn (design version 128)

Updated 26 Oct 2026 after Andy Smith added owner, start and end, and chose the Icon suite states. **(decided)** marks his decisions.

### 6. Goal
Deliver `RbmWorkstreamProgress`: a typed, tested, accessible card that shows, for each workstream, how far it has got, its task counts, its open issues by severity, its owner, its start and end, its state, and whether it is late. It is built for the **Executive Briefing Centre** (not drawn yet) and is reusable on any dashboard. It replaces the one-off "Readiness by workstream" panel on the Dashboard template.

### 7. Naming
`RbmWorkstreamProgress` (Rbm prefix). Default title **"Workstream progress"**. Use "Workstream", never "War room". The measure is **progress**, not readiness.

### 8. What is drawn (Progress board, "Workstream progress")
Card: white, 1 px border, 14 px radius, 20 px padding. Title left; caption right ("Ordered by start time · 10 of 12 shown").

**Fields, by tier** (tiers follow the Cards board: Essential at most three, Useful at most two, Detail at most one):
- **Essential:** Workstream (name), Progress (bar and percentage), Status.
- **Useful:** Tasks (Done, To do, Total) and Open issues (High, Medium, Low).
- **Detail:** Owner, Start and End (decided). These are three values, drawn as **one Detail group**. This stretches the "one Detail field" rule: to confirm.

**Bar (decided):** Blue Dark (#354BA8) while under way. **Brand Green only when the whole workstream is Complete.** Track #E3E6EC, 10 px at D1.

**Status (decided):** the **Icon suite state**, icon and word, in the suite's colours. Drawn: Active (#354BA8), Paused (#A45200), Scheduled (#354BA8), Complete (#3F6B06). **Late is separate from the state** and is decided by the **Planning engine** (decided): an amber clock (#A45200) and the word "Late" beside the state. A Late workstream is still Active. The component only displays Late and never works it out. The words "In progress" and "Not started" from the first drawing are gone.

**Issue counts (decided):** High, Medium and Low as numbers, with the Event vitals dots (High #F00034, Medium #FF9F1C, Low #C3C8D2) and text colours #C61E3A, #A45200, #5B6472. A zero is plain grey with no dot.

**Owner, start and end (decided):** an owner is a person, shown as initials in the round avatar the task row uses (#A6B5FF, Deep Blue text) with the name ("M. Okafor"). Dates and times read like the Event window, for example "24 Oct 22:00", 24-hour.

**Order and limit (decided):** earliest start time first, ten rows at most, then plain text "+2 more workstreams". No click-through.

**By density (Proposed, not signed off):**
| Density | Rows | Shows |
|---|---|---|
| D0 Command | 64 px, 20 px text, 16 px bar | Essential only |
| D1 Comfortable | 52 px, 14 px text, 10 px bar | All. The owner sits under the name; start over end in one "Start / end" column; two-level header (Tasks, Open issues) |
| D2 Compact | 40 px, 13 px text, 8 px bar | All. Owner as initials in their own column; Start and End in two columns |
| D3 Dense | 28 px, 12 px text, 6 px bar | One line: Done / total, three issue counts, owner initials, End, status. **No start** |

**States drawn:** Complete (100%), Active, Active with Late, Paused, Scheduled (0%), zero issues, more than ten rows, loading, empty ("No workstreams yet.").

### 9. Proposed data shape (for sign-off)
```ts
type RbmWorkstreamProgressItem = {
  id: string;
  name: string;
  owner: { name: string; initials: string };
  start: Date;                      // the order depends on it
  end: Date;                        // planned, forecast or actual: to confirm
  state: 'scheduled' | 'active' | 'paused' | 'complete' | /* other Icon suite states, to confirm */ string;
  complete: number;                 // tasks Complete
  total: number;                    // tasks in the workstream
  issues: { high: number; medium: number; low: number };
  late: boolean;                    // set by the Planning engine
};
type RbmWorkstreamProgressProps = {
  items: RbmWorkstreamProgressItem[];
  title?: string;                   // default "Workstream progress"
  loading?: boolean;
};
```
- The percentage is **computed** from `complete / total`, rounded. A `total` of 0 shows 0%.
- The **state** comes from the data, as an Icon suite state key, and is shown with `RbmIcon` and its label. The component does not derive it.
- **Late** comes from the Planning engine (decided), as the RAG and gap do for Event vitals. The page never works it out.
- The component sorts by `start` (earliest first) and shows ten, with "+n more workstreams" for the rest. Whether the caller or the component sorts is to be confirmed.
- **No density prop.** Density comes from the scope. No hex values: colours come from theme tokens. The issue dots are the tokens `RbmEventVitals` uses.

### 10. Keyboard and screen reader
- A region named by the title. The workstreams are a list.
- Each bar is a progress bar (`role="progressbar"` with now, min and max) named, for example, "Network, 31% complete, 5 of 16 tasks, Active, Late, 1 high, 2 medium issues, owner R. Patel, 24 Oct 22:30 to 25 Oct 03:00".
- Nothing is interactive for now (decided), so there is nothing to focus.
- Colour is never the only signal: every state and Late have an icon and a word, and the percentage is text.

### 11. What to build, in order
1. Confirm the open points in section 13 with Andy Smith.
2. `RbmWorkstreamProgress` with the data shape above, tokens, computed percentage, state shown with the Icon suite icon and label, and Late from the data.
3. Storybook stories for every state: Complete, Active, Active and Late, Paused, Scheduled, zero issues, mixed, more than ten rows, a long name, loading, empty, and each density D0 to D3.
4. Unit tests: percentage and rounding, `total` 0, order by start, the ten-row limit and "+n more", green only at Complete, Late shown beside the state, issue counts, accessible names, no hex values.
5. Keyboard and screen-reader checks, then a visual check against the Progress board.
6. Replace the one-off panel on `RbmDashboardPage` with the component (after the Dashboard template drawing is updated).

One component per pull request. This component is **not in the build order in the brief**. Ask Andy Smith where it goes.

### 12. Acceptance
- It looks like the Progress board at D1, and at D0, D2 and D3 once signed off.
- Every state has a story and a test. Percentages always agree with the counts.
- Colour is never the only signal. Brand Green appears only on a Complete workstream.
- Any difference from the design is flagged in `docs/rbm-parked-decisions.md`.

### 13. Open points (flag, do not guess)
1. **Which states does a workstream have?** The Icon suite defines states for Tasks and Events only. I used the Event states that fit (Scheduled, Active, Paused, Complete). Initial, Approved, Closed, Abandoned, Backing out and Backed out are not drawn.
2. **Start and end:** planned, forecast or actual? Should a Late row also show its planned end?
3. **Tier rule:** Detail allows one field, but Owner, Start and End are three values.
4. **D0 and D3:** D0 shows no owner or times. D3 shows the owner and the end only.
5. **Late** is drawn on Active only. Can Paused or Scheduled be Late?
6. **Ties in the order:** what breaks a tie between two workstreams that start together?
7. **Dashboard template:** the old "Readiness by workstream" panel (green bars, no status) is to be replaced once this is signed off.
8. **Executive Briefing Centre** is not drawn. **Scenario filter** and **build order** are open.
9. **The Simple ring and Row variant** on the Progress board still fill Brand Green at 68%. No decision at this stage: Andy Smith will come back to it.
10. **Percentage basis:** complete tasks over total tasks for now (decided).

# RBM Compact event bar: brief for Claude Code

Prepared 28 Oct 2026, asked for by Andy Smith. This brief covers one component, **`RbmEventBar`**: the sticky **Compact event bar**, with the rule **one key fact for each Event vital**. Read `docs/briefs/handoff-brief.md`, `docs/rbm-parked-decisions.md` (entries "28 Oct 2026: Work, a new concept" and "21 Oct 2026: `RbmEventBar`") and **`docs/briefs/event-vitals-brief.md`** first. This brief says what is drawn now and what changed.

**Status:** drawn on the Command board (`Command.dc.html`), section **"Event vitals: Work Progress and five equal cards"**, subsection "Compact event bar, one key fact for each vital", design **version 136**, tagged Proposed. The earlier bar is on the board section "Compact event bar and collapsed ribbon".

## 1. What this is
- **A universal region (decided).** Like Event vitals, the Compact event bar is common to several Centres and is built once. It must not assume the Command & Control Centre.
- It is **step 7** of the build order with `RbmCommandCentre`, and it depends on `RbmEventVitals`: it takes the **same `RbmEventVitalsData`** (see the Event vitals brief, section 4), plus the Event number, name and state, and the alert counter's data.
- Nothing of it is built in the repo yet.

## 2. What is drawn
A 48 px bar: white, Rule border, 14 px radius and the drawn shadow, pinned to the top. Left to right:
1. **Event number and name** ("E12345", "Weekend Payroll Cutover").
2. **State pill** (the compact `RbmStatusPill`, for example Active).
3. **Alert counter** (the compact `RbmAlertCounter`, for example "3 alerts"; it opens its own popover).
4. A divider.
5. **Work 62%** with a 56 px **Blue Dark** bar (Brand Green when the Event is Complete).
6. **Tasks 68%** with the 56 px **segmented** bar of the earlier design: Complete Green, In progress Blue Dark, Blocked Red.
7. **Open issues** ("5 issues") with a dot.
8. **Started 22:00** (the Event's start time).
9. A flexible space, then **Forecast end**: the clock in a tinted disc in the RAG colour, the label FORECAST END, the 20 px time and the gap ("+12 min").
10. The chevron that scrolls back to the top.

## 3. The rule: one key fact per vital (decided)
| Vital card | Key fact in the bar |
|---|---|
| Work Progress | "Work" and the percentage, with a bar |
| Task progress | "Tasks" and the percentage, with the segmented bar |
| Issues | the open count, "issues", with a dot |
| Start of event | "Started" and the start time |
| Forecast end time | the time and the gap, with the RAG disc |

- **Short visible labels** ("Work", "Tasks") keep the bar on one line. The accessible names are the full ones: "Work Progress, 62%", "Task progress, 68%".
- Each fact is a **link** to its card or list (Work Progress and Task progress to the task list, Issues to the issue list, Forecast to the late tasks and critical path). Started opens nothing unless given a handler (as on the Start of event card).
- The Executive Briefing Centre will show the same facts.

## 4. Behaviour (from the earlier build, still true)
- `visible` shows the bar only while the Event vitals are off screen. It slides in and out. **The page decides when** (it watches the vitals with an `IntersectionObserver`).
- It takes no space in the page (pinned). The Task Timeline toolbar sticks beneath it.
- **Proposed, not drawn (21 Oct):** the issues dot follows the worst open issue (Red, the Amber ringed dot, or Silver) and is left out when there are none; the gap reads "On Schedule" when there is none and "−08 min" when ahead.

## 5. Keyboard and screen reader
- A landmark named "Event summary". Each fact is one tab stop, in the order above, with the accessible name carrying the whole fact ("Open issues, 5, 1 high").
- The bars are progress bars with names as above. Colour is never the only signal: every fact has text.
- The bar slides in without stealing focus. The chevron is a button named "Back to the top of the page".

## 6. What to build, in order
1. `RbmEventBar` taking `RbmEventVitalsData`, the Event's number, name and state, and the alert data. Theme tokens only (no hex values). Reuse `RbmStatusPill`, `RbmAlertCounter` and the Event vitals formatting (percentage, hours and minutes).
2. Stories for every state: Work and Complete (green bar); no issues; Forecast on schedule, behind and ahead; a long Event name (truncated with an ellipsis); hidden and visible; at 1136 px.
3. Unit tests: the five facts, the percentage and the bar fills, the segmented Tasks bar, the dot rule, the visible state, accessible names, no hex values.
4. Keyboard and screen-reader checks, then a **visual check against the Command board**.
5. One pull request, after `RbmEventVitals`.

## 7. Open points (flag, do not guess)
1. **Which Centres** use the bar, and whether each Centre chooses its facts.
2. **At a narrow width** (below about 1136 px) the bar has no drawn behaviour: which facts drop first? I suggest Started, then Tasks, but it is not decided.
3. **Started** shows the start time. Should it show the elapsed time instead? Not decided.
4. **D0 to D3:** the bar is drawn at D1 only.

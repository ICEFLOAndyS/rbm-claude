# Density: how drawn sizes map to the tokens

Density is mandatory (Andy Smith, 22 Oct 2026). A region sets its level with `RbmDensity`, and components read the tokens with `useDensity()`. Where a token covers a size, the token wins over the drawing. These rules say which drawn sizes a token covers. They apply to every component.

| Token | Covers | Examples |
| --- | --- | --- |
| `row` | The height of one row in a list | Task row, stage summary row, a card's item rows, Layout panel rows, grid rows |
| `control` | The height of a control with a visible box | Buttons (including the 120 px row action), split buttons, chips and filter pills, search fields, Focus / All toggle, Join call |
| `target` | The smallest box a pointer can hit, for controls without a visible box | Icon buttons, menu items, the collapse chevron, Undo in a message |
| `body` | The main text of a row, card item or menu | Task title, blocker title, runbook name in the filter |
| `caption` | Secondary text beside it | Times, WBS, deltas, durations, counts, "Holds 1.4.2 · 3 tasks", legends |
| `figure` | The big number of a KPI | Event vitals figures and the Forecast end time |
| `icon` | Icons that stand alone | Icon-only buttons, toolbar, card header and menu icons. An icon beside a button's text is a glyph sized with the text and keeps its drawn size, so a fixed-width button (the 120 px row action) still fits its label |
| `dot` | Status dots | Pills, bands, legends and card rows. A ringed dot is `dot + 6` with a `dot` centre (as `RbmStatusPill`) |
| `padX` | Side padding inside rows, cells and cards | Task row, card content |
| `gap` | Space between items in a row or toolbar | Toolbar chips, row parts |
| `radius` | Control corners | Buttons, chips, fields |

Not on the scale, so they keep the drawing's values:
- **Widths and column templates.** Exception: the row action button keeps its drawn 120 px width but takes the `control` height.
- **Group bands and region chrome.** The runbook band (60 px), the collapsed region line (56 px), the summary line, page and card headers.
- **The Event ribbon's schedule geometry:** lane and sub-row heights, the label column, and the time scale. The ribbon is a schedule, not a list.
- **Marks with their own drawn sizes:**
  - Task nodes: `RbmNode`, 28 px at D1 and 24 px at D2, as drawn.
  - Avatars: 28, 32 and 36 px.
  - Rings and progress bars.
  - Tag pills (22 px, with an inline mark sized to their text).
- **The type scale for headings and eyebrows** (Foundations board), card radius, shadows and stroke widths.

Levels in the Command & Control Centre (Andy Smith, 22 Oct 2026):
- **D1 Comfortable:** Page header and Event vitals.
- **D2 Compact:**
  - Event ribbon, Task Timeline and Hot-topics panel.
  - The compact event bar and the Layout panel (proposed).

The list page is D2 Compact (decision D3).

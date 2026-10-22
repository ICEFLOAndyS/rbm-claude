# RBM List of records page: brief for Claude Code

Prepared 22 Oct 2026. This brief covers one piece of work: the **List of records page template** (`RbmListPage`) and the record panel it opens (`RbmRecord`). It builds on `docs/handoff-brief.md` and `docs/rbm-parked-decisions.md`. Read those first. Everything there still applies (tokens, naming, working agreement, fallback styles, accessibility). This brief only adds what is specific to the list page. If the two disagree, ask.

## 1. Goal
Deliver working, tested React code for the List of records page template, as designed, running in a browser against JSON fixtures and a fake server, with no back end. The page is the workhorse of RBM: a toolbar above one grid, and a slide-in for a quick look at a record. Use the Runbooks list as the worked example.

## 2. Design sources (read these first)
Open the design: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv (same claude.ai account as its owner).
- **Page templates board** (`Templates.dc.html`): "1 · List of records" (the drawing, the numbered zones, Slots, Rules), "States every page covers", "React and MUI", "For your decision".
- **Pattern: List to record** (`RecordPattern.dc.html`): the record panel. Options assessed, the four containers, anatomy of a record, viewing and editing, navigation and state, discipline rules, building it with MUI.
- **Pattern: List to record in use** (`RecordPatternInUse.dc.html`): the slide-in in view mode, the slide-in editing a section, and the wide panel with vertical tabs.
- Also: **Components**, **Cards**, **Foundations**, **Semantic colour** (status dot and label), **Icons**, **Shell** (the page sits in the app shell with the rail collapsed) and **Density** (default here is D2 Compact).
- Both List to record boards are tagged **Proposed**.

## 3. What to build
Build in this order, one piece at a time, each with stories, tests and a check against the board.
1. **Data contract and fixtures** (stop for review, see section 8).
2. **`RbmDataGrid`**: the one grid on the page, built on MUI X Data Grid Pro v9 (decisions D1 and D4, section 6).
3. **List toolbar**: search, filters, saved views, column chooser, export. Always one row. Filters live above the grid and are never hidden in a drawer.
4. **Bulk action bar**: selecting rows swaps the toolbar for it.
5. **Pagination**: server-side, with a page size. No infinite scroll.
6. **`RbmRecord`**: the record panel, declared by a record spec (section 5).
7. **States**: loading, empty, error, no access (section 7).
8. **`RbmListPage`**: the template that fills typed slots: `title`, `count`, `actions`, `toolbar`, `grid`, `record`, `emptyState`, `errorState`. A missing slot is a compile error.
9. **Demo route** for the whole page, with a fixture switcher.

## 4. The list page rules (from the Templates board)
- **Page header:** title, count ("128 runbooks · filtered to Production"), and page actions. **Import** is secondary. **New runbook** is the green CTA.
- **Data grid:** one per page. Status uses the semantic dot and label (never colour alone). Example columns: Runbook, Status, Owner, Phase, Progress, Window. Clicking a row opens the slide-in.
- **Pagination:** server-side with a page size ("1 to 8 of 128", "Rows per page 25").
- **Selection:** selecting rows swaps the toolbar for a bulk action bar.
- **Saved views** keep a user's filters and columns.
- **A row click opens the slide-in** (480 px). "Open in full" goes to the record page (`RbmRecordPage` is a separate template; link only, do not build it here).
- **Empty state** explains why and offers New.
- **Default density: D2 Compact (decision D3, settled).** Wall displays use the Dashboard template instead.
- The grid is a typed slot, and the template is one component. Developers fill slots; they do not write layout.

## 5. The record panel (`RbmRecord`) rules (from List to record)
**One hierarchy, four containers.** The content is defined once as groups and sections. The container changes with the job:
- **Peek (XS):** the row expands in place. **Not in this release (decision D2). Do not build it.** A row click opens the slide-in directly.
- **Slide-in (S, default, 480 px):** the list stays visible. Up to four horizontal group tabs with collapsible sections. Quick view and edit.
- **Wide panel (M, 800 px and up):** the same groups become vertical tabs with counts and alerts, chosen with one Widen button.
- **Record page (L):** out of scope here (`RbmRecordPage`).

**Anatomy:** sticky header (ID, title, status label, previous and next, widen, open full page, close); summary strip (three or four facts, never hidden in a tab); group tabs (maximum four, short labels with a count, alert dot where something needs attention); collapsible sections (each with its own Edit, plus Expand all and Collapse all); sticky footer (the record's primary action, and Save and Discard when editing).

**Viewing and editing:**
- Records open in view mode. Each section has its own Edit, with Save and Discard. One section is edited at a time (2 px Blue Dark border and an "Editing" label; the others read-only).
- Unsaved work is visible: a dot on the tab. Leaving, closing or moving to the next record asks first with a dialog ("Discard unsaved changes?", Keep editing, Discard).
- Validation explains itself (what is wrong and why). Save stays disabled until the section is valid.
- Every save writes who, when and what changed to History (the audit trail).
- Live conflicts: if someone else changes the record while editing, an alert offers Reload and shows what changed.
- Permissions show: read-only sections display a lock and no Edit action.
- Create uses the same shell: new records start on Overview with required fields only; other tabs unlock after the first save.

**Navigation and state:** previous and next move through the list without closing the panel, and the selected row keeps the approved highlight. Deep link: the address holds the record, tab and section. Escape and Back close the panel, and focus returns to the row. Width is remembered per user. Under 640 px the panel fills the screen.

**Discipline rules (enforce by types and tests):** at most four group tabs and five sections per group; tab labels about 14 characters with a count; summary strip at most four facts; sections nest one level at most. Developers declare a **record spec** and never hand-build tabs.

**MUI building blocks (from the board):** Drawer anchored right (persistent beside the list on wide screens, temporary on narrow ones); `Tabs`, horizontal below the width threshold and vertical above it, with `Badge` for counts and alert dots; the approved collapsible panel on `Accordion` or `details`; Data Grid row click and a selected-row class. Verify current MUI package names (the board says so).

## 6. Grid: MUI X Data Grid v9 (decided)
**Decision D1 (22 Oct 2026):** the grid is MUI X Data Grid v9. There is no comparison with AG Grid. This is a strategic choice to keep the tech stack small. Do not add AG Grid or any other grid library.
- **Licence: MUI X Pro (decision D4).** Use `@mui/x-data-grid-pro`, not the Community package. Pro features may be used where the design needs them (for example column pinning, column reordering, and saved column state). Do not use Premium features (for example row grouping, aggregation or Excel export); if one seems needed, flag it and ask.
- Install the v9 packages that match the MUI core version in the repo. Verify the current package names against the MUI X docs.
- **Licence key:** Pro needs a licence key at run time. Read it from configuration (an environment variable, for example `VITE_MUI_X_LICENSE_KEY`) and call `LicenseInfo.setLicenseKey` once, in the app and Storybook set-up. Never commit the key. Add the variable name to the README and an `.env.example`. **There is no key yet (proof of concept). Do not wait for one or ask for one.** Read the key from `VITE_MUI_X_LICENSE_KEY` if it is set, and run without it if not. The grid then shows a development watermark and the console warns; make sure that warning does not fail the tests or the Storybook build. Treat the watermark as expected in visual checks.
- Keep all imports of the grid behind `RbmDataGrid`, so no other component imports MUI X directly.
- Check, with a short proof inside the Data Grid story and not a separate spike: server-side paging with a page size, a status cell (dot and label), row click with a selected-row highlight, row selection feeding the bulk bar, column chooser and saved state, keyboard and screen-reader behaviour, performance with the 15,000-row list, and theming to the RBM tokens at D2.
- If something the design needs is not possible in v9, flag it in `docs/rbm-parked-decisions.md` and ask. Do not switch libraries.
- Record decisions D1 to D4 in `docs/rbm-parked-decisions.md`.

## 7. States every page covers
- **Loading:** a skeleton that matches the layout. No full-page spinner. Under 300 ms, show nothing.
- **Empty:** say why it is empty and offer the one action that fixes it.
- **Error:** a short message, a Retry button and a reference number for support.
- **No access:** say what the user cannot see and who to ask. Never a blank page.
(The Command page's busy overlay, `RbmBusy`, is for large requests. Reuse it for the grid's long loads if it fits, and flag it.)

## 8. Data contract and fixtures (stop and show me before building on it)
- Types for: a runbook row (id such as RBK0000001, name, status, owner, phase, progress %, window start, flags), the filters (search text, status, owner, environment), saved views (name, filters, columns, sort), the column definitions, a page of results (rows, total, page, page size), and a record for the panel (summary facts, groups, sections, fields, permissions, version for conflicts, history).
- A **record spec** type that makes the discipline rules a compile error (max four groups, five sections per group, four summary facts).
- A `ListData` interface (query a page, read a record, save a section, list and save views) with a mock server that behaves like the real one: paging, search, filter, sort, saved views, optimistic or conflicting saves, and a delay setting for latency. A `PreferenceStore` for width, columns and the last view (localStorage in the prototype).
- Fixtures validated against the types: the board's eight example runbooks; a 128-row list; a very large list (about 15,000 rows, generated by a seeded script, not committed as JSON); an empty list; and an error case.
- **The board's record example is a task** (Overview, Plan, Evidence, Activity). It gives no spec for a **runbook**. Propose a runbook record spec in the same shape, mark it **Not drawn**, and ask me to confirm it before building the fixtures around it.

## 9. Acceptance
- Stories for each component and the whole page; a demo route with a fixture switcher.
- Tests for: paging, search, filter and saved views; selection and the bulk bar; the panel's view, edit, unsaved dot, discard dialog, conflict, locked section and previous or next; the record spec limits; deep link and focus return; the four states; keyboard operation of the grid and the panel.
- Colour is never the only signal. The page works at the widths the board shows (slide-in 480 px, wide panel 800 px and up, full-screen under 640 px) in the shell with the rail collapsed.
- Anything that differs from the design is flagged in `docs/rbm-parked-decisions.md`, with "Not drawn" where the design is silent. Where it is silent, use MUI's defaults (the agreed fallback), flag it, and do not hold the build.

## 10. Decided
- **D1:** MUI X Data Grid v9 is the grid. No alternative is assessed.
- **D4:** The MUI X Pro licence is assumed (`@mui/x-data-grid-pro`). Premium is not.
- **D2:** Peek (inline row expansion) is not in this release.
- **D3:** Default density is D2 Compact.

## 10a. Not drawn or undecided (flag, do not guess)
- The runbook record spec (section 8).
- The toolbar's saved views menu, column chooser and export, and the bulk bar's actions. The board names them as slots and rules but does not draw them.
- Import and "New runbook" flows (the wizard and form templates are separate work).
- Wall display use of this page: the board says to use the Dashboard template instead.

## 11. Order of work
1. Read this brief, `docs/handoff-brief.md` and `docs/rbm-parked-decisions.md`, then the boards in section 2. Run `npm run check` and tell me what breaks.
2. Install MUI X Data Grid Pro v9, set up the licence key from configuration, and record decisions D1 to D4.
3. Write the types, fixtures and mock server, then stop for my review.
4. Build in the order in section 3.
5. Run the acceptance checks. Report what you could not verify.

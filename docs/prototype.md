# Command & Control Centre: browser prototype

A working Command & Control Centre in the browser, fed by JSON fixtures through the same data model the ServiceNow data will use. There are no network calls and no back end. Stored records come from a fixture; a **fake engine** stands in for the RBM planning engine.

## Run it

| Command | What it does |
| --- | --- |
| `npm run demo` | Regenerates the fixtures, then serves the demo at http://localhost:5173 (the RBM app shell, opening on Events) |
| `npm run demo:build` then `npm run demo:preview` | A production build at http://localhost:4173 (use this to judge speed) |
| `npm run fixtures` | Writes the four event fixtures to `src/fixtures/` and the four Events list fixtures to `src/fixtures/events/` (the two large ones are git-ignored) |
| `npm run check` | Type check and all tests |

The demo runs inside the RBM app shell (`RbmAppShell`): top bar, sidebar, content, footer and slide-in region. The routes are hash routes:

| Route | Page |
| --- | --- |
| `#/events` | The Events list, on the mock server (128 events; `?events=large` for 15,000, `?events=board` for the eight drawn). The open record is in the address: `#/events?record=ev-00009` |
| `#/events/REV000009` to `#/events/REV000012` | That event's Command & Control Centre: Weekend Payroll Cutover, healthy, badly late, large (15,000 tasks). Opened from the Command Centre icon on a running event's row, or from the record panel's Open Command Centre. Other running events have no Command Centre data in the prototype, and say so |
| `#/command-centre` | The old address: opens REV000009 |
| any other menu route | A "not built in the prototype" page |

The demo bar has an **event switcher**, a **clock** (paused, ×1, ×10, ×60, ×300) and **Reset**, which rebuilds the event from its fixture, a **density switcher** (D1, D2, D3, D0) and a **viewport switcher** (full window, 1280, 1024, 800, 390 px). A set viewport runs the app in a frame of that width, so the shell's widths really apply; navigating inside the frame does not update the bar. URL settings: `?speed=60`, `&density=comfortable`, `&viewport=390`, `&latency=0`, `&events=large`, `&listLatency=0` (the list's pretend server wait, 400 ms by default), and `&scroll=900` to open with the content scrolled down. Layout changes and the sidebar's Collapse are saved in the browser and survive a reload.

The same page is in Storybook under **Prototype / Command & Control Centre** (small fixtures only).

## How it fits together

```
JSON fixture ──► fixture source ──► CommandCentreSnapshot ──► adapters ──► components
 (records)      (fake engine + clock)   (records + engine output)            (RbmCommandCentre and its slots)
                     ▲
       commands ─────┘  (Start, Complete, Undo, Pause, Resume, Skip, Result; bulk)
```

| Part | File | Replaced later by |
| --- | --- | --- |
| Types and interfaces | `src/data/types.ts`, `src/data/interfaces.ts` | Kept |
| Fixture schema and checks | `src/data/schema.ts` | Kept for tests |
| Fixtures and generator | `src/fixtures/build.ts`, `scripts/fixtures.ts` | Kept for tests and demos |
| **Fake engine** | `src/engine/engine.ts` | The RBM planning engine (delete this) |
| Simulated clock | `src/engine/clock.ts` | The real time |
| Fixture source | `src/data/fixtureSource.ts` | A ServiceNow source implementing `CommandCentreData` and `CommandCentreActions` |
| Layout store | `src/data/layoutStore.ts` (localStorage) | A ServiceNow user preference implementing `LayoutPreferenceStore` |
| Adapters | `src/data/adapters.ts` | Kept |
| Connected page | `src/app/CommandCentrePage.tsx` | Kept |
| Demo app | `demo/` | Not shipped |

The page never knows where its data came from: swapping the fixture source for a ServiceNow source changes nothing in the components, the adapters or the page.

The data model and every fake-engine rule are in [data-model.md](data-model.md).

## What it checks

- **Engine:** every rule (ready, up next, forecast, RAG, critical path, flags, alerts, every command, the linger and Undo) and the board's numbers from the Weekend fixture (+12 Amber; 06:12, 05:27 Red; three alerts; Go / No-Go 05:45 forecast 05:57). Reporting differs from the board on purpose: it is planned to end 05:30 and forecast 05:42 +12, so it shares the critical path with Payroll cutover.
- **Fixtures:** each file matches the types and its builder; broken files and dependency loops are rejected; the large event is the same for the same seed.
- **Layout:** default, change, reset and reload through `LayoutPreferenceStore`, including the collapsed ribbon.
- **Compact event bar:** appears when the Event vitals leave the screen, disappears when they return, whatever the layout order.
- **Keyboard dragging** in the Layout panel: Space, arrows, Space, and Escape.
- **Large event:** only rows near the screen are drawn; quiet runbooks start collapsed.

Measured in Edge on the production build (1920 by 1080):
- **Large event (15,000 tasks, about 1,100 in focus):** ready in about 1.1 s. About 30 task rows are on the page at a time. Scrolling holds the frame rate. A clock tick takes about 200–250 ms with the ribbon open and 140 ms with it collapsed, once a real second.
- **Sticky behaviour:** the compact event bar sits at the top and the Task Timeline toolbar 48 px below it.

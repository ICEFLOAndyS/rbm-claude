RBM app shell: brief for Claude Code

Prepared 22 Oct 2026. This brief covers one piece of work: the app shell (RbmAppShell) with its six zones and the new four-group navigation. It builds on docs/handoff-brief.md and docs/rbm-parked-decisions.md. Read those first. Everything there still applies (tokens, naming, working agreement, fallback styles, accessibility). If this brief and the design disagree, the differences are listed in section 9: do not guess, ask.

Status of this brief: the navigation structure and the icon rule come from Andy Smith (22 Oct 2026). The design is already updated to match (design version 74): the App shell board has the four-group sidebar, and the Icon suite board has the seven new navigation icons. Build what is drawn.

1. Goal

Deliver a working, tested RbmAppShell that draws the whole RBM screen as designed, with typed navigation data, so every page template renders inside it and no page builds its own frame. Run it in Storybook and in the browser prototype.

2. Design sources (read these first)

Open the design: https://claude.ai/artifact/GfR1Zo8xXaj9PuLXRWWaCv (same claude.ai account as its owner).

App shell board (Shell.dc.html, "11 · App shell", tagged Proposed): Anatomy (the six zones), Sizes by density, Navigation (expanded, rail, mobile drawer, item states, rules), Top bar, Page header, Footer, Responsive behaviour, React and MUI, Decisions you have made.
Icon suite board (Icons.dc.html, "08 · Icons"): the registry, RbmIcon, RbmIconButton, the rules, and the new Navigation section (seven icons and the menu-item mapping). See section 6.
Also: Foundations (tokens), Semantic colour (status pill and counts), Density (sizes by level), Components (buttons, pills), Page templates (what goes in the content zone).
3. The six zones

Everything an RBM page needs sits in one of six zones. Build all six.

Sidebar. Primary navigation. Deep Blue, under the top bar, full height. Expanded at wide widths, a rail below that, a temporary drawer on small screens.
Top bar. Dark Deep Blue (
#23326F, palette.primary.dark), full width. Session only: the logo, notifications with a count, the signed-in user with the account menu. A thin divider separates the logo block from the rest of the bar, and the sidebar from the bar. No page context, no page actions, no search button (search opens from the / key as a command palette).
Page header. The context of the page: programme (with a switcher) and, on event pages, the event with its status pill; breadcrumb (last crumb is the page, not a link, at most four levels); title and status pill; one metadata line; page actions on the right, secondary first and one green CTA at most.
Content. Where a page template goes. It scrolls on its own, so the shell never moves.
Footer. Fixed to the bottom. Copyright and version, then sync time and environment, then three links: Privacy, Support, Knowledge (all open in a new tab). No actions and no colour. A lost connection shows the At risk ringed dot and the words "Reconnecting". UAT and Test environments show as a chip.
Slide-in region. Hosts the record panel (RbmRecord, 480 px) and overlays the content only. It sits below the header and above the footer, so both stay visible. Becomes full width at 600 to 899 px and a full-screen page under 600 px.
Sizes by density (from the board)
Part	D0 Command	D1 Comfortable	D2 Compact	D3 Dense
Sidebar, expanded	Hidden	248 px	224 px	200 px
Sidebar, rail	Hidden	72 px	64 px	56 px
Navigation item	Hidden	44 px	36 px	32 px
Top bar	72 px, clock	64 px	56 px	48 px
Footer	40 px, status only	36 px	32 px	28 px
Page padding	32 px	32 px	24 px	16 px
Page title	40 px	28 px	24 px	20 px
Icon size	32 px	24 px	20 px	16 px
The shell reads the density scope like every other component. D0 removes the sidebar and the controls and shows the programme name, a large clock and status only. Build D1 and D2 first; D0 and D3 follow the density provider (see section 9).	
Responsive behaviour
1200 px and above: sidebar expanded; slide-in 480 px overlays the content.
900 to 1199 px: rail (tooltips on hover and focus); slide-in 480 px.
600 to 899 px: sidebar hidden, a menu button opens a temporary drawer; footer links hidden; slide-in full width.
Under 600 px: same drawer, 280 px wide; footer shows version and sync time only; slide-in is a full-screen page.
The first visit uses the width (expanded at 1200 px and above, rail below). A user-facing collapse button remembers the choice per user (the board asks whether to include it, see section 9).
4. Navigation: four groups (decided by Andy Smith, 22 Oct 2026)

Navigation is data, not JSX. Each item has a label, an icon from the registry, a route, and optional count and permission.

Group	Item	Route (proposed)
Events	List	/events
	Folders	/events/folders
Library	Templates	/library/templates
	Folders	/library/folders
	Teams	/library/teams
	Workstreams	/library/workstreams
Admin	Setup	/admin/setup
	Integrations	/admin/integrations
	License Management	/admin/licences
Help	Training	/help/training
	Support & Versions	/help/support
Use the labels exactly as written, including "License Management" (US spelling is Andy's wording; keep it and flag any UK-spelling preference).
Group order is Events, Library, Admin, Help. Help is the last group; Collapse is the only item pinned to the bottom.
Group names are small headings, not links. Two levels at most; children appear indented under an active parent; there are no fly-out menus.
Item states as drawn: default, hover, active (white on a tint with a Blue Light bar, deliberately not Blue Dark, because Blue Dark means In progress), focus (the 2 px Blue Dark ring), disabled, and with a count (a white pill, Deep Blue text, neutral).
The rail keeps the icons, with a tooltip of the name on hover and focus; a count becomes a small white dot.
Accessibility: a nav landmark with a label; aria-current="page" on the active item; a skip link as the first focusable element; the full keyboard order top bar, sidebar, content; Escape closes the drawer and returns focus to the menu button.
Permissions (proposed): show or hide Admin items from the user's platform roles, checked by the relevant API. The UI never decides. This follows the agreed rule for actions.
The deep link to a route marks the right item active, and its group heading is visible.
5. Typed navigation and the component
tsx
<RbmAppShell
  nav={rbmNav}            // typed config (RbmNavConfig)
  user={currentUser}      // avatar, name, role, account menu
  footer={{ version: APP_VERSION, links: ['privacy', 'support', 'knowledge'] }}
  density="comfortable"   // default scope; pages may set their own
>
  <Outlet />
</RbmAppShell>
The icon in each nav entry is a registry key, not a component (for example icon: 'nav.list'), so the lint rule can reject hand-built sidebars and direct icon imports. The App shell board's rbmNav sample has the full eleven-item data.
MUI building blocks from the board: CSS grid on a Box for the frame (the grid, not position: fixed, keeps the bars in place); Drawer variant="permanent" (rail is the mini variant), temporary under md with useMediaQuery; List, ListItemButton with selected, ListItemIcon, ListItemText, Collapse for children, Tooltip on the rail; AppBar position="static" with elevation=0 and a Toolbar; Avatar, ButtonBase and Menu for the account menu; Badge and Popover for notifications; Breadcrumbs, Typography, Chip and Select or Menu for the page header; Box component="footer"; Drawer anchor="right" with a custom container for the slide-in; a visually hidden Link for the skip link.
The MUI CRUD dashboard template is a reference to copy and own, not a dependency. Check its licence before copying anything (the board could not confirm it). Prefer building from the MUI components above.
6. Icons (decided: drawn RBM icons, as the design says)

Rule (Andy Smith, 22 Oct 2026): every shell icon comes from the RBM icon suite, which is drawn from scratch in one style. New icons are added to the suite by following its rules. They are not taken from @mui/icons-material, and nothing outside the icon package may import it (the Icon suite board's lint rule). Andy first asked for MUI icons, then withdrew that and chose to conform with the design.

Style: 24 px grid with a 2 px live-area margin, 2 px strokes, round caps and joins, no fills, currentColor. Size comes from the density token (--rbm-icon-size: 32, 24, 20, 16).
Registry: packages/rbm-icons (or src/icons, wherever the repo keeps it), one typed registry, used through RbmIcon and RbmIconButton. A new group nav holds the seven new icons: list, folder, setup, integrations, license, training, support.
Decorative by default: an icon beside a text label is aria-hidden. In the rail the icon is the only visible content, so the item takes its accessible name from its label and a tooltip.
CI check: every SVG uses the 24 px viewBox, 2 px stroke, round caps and currentColor, and no two icons are identical. The two Folders items intentionally share one icon (nav.folder); the check is on files, not on uses.
6a. Menu item to icon (confirmed by the design)
Group	Item	Registry key	Source
Events	List	nav.list	New
Events	Folders	nav.folder	New
Library	Templates	object.template	Existing object icon
Library	Folders	nav.folder	Same icon as Events: Folders
Library	Teams	object.team	Existing object icon
Library	Workstreams	object.workstream	Existing object icon (Workstream, from the Global and local section of the Icon suite board)
Admin	Setup	nav.setup	New
Admin	Integrations	nav.integrations	New
Admin	License Management	nav.license	New
Help	Training	nav.training	New
Help	Support & Versions	nav.support	New
6b. The seven new icons (as drawn on the Icon suite board)

Each is a 24 px viewBox, stroke 2, no fill. Use these shapes exactly; copy from the board's source if in doubt. A designer should refine the optical balance before release (as for the whole suite).

list: <path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>
folder: <path d="M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>
setup: <path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>
integrations: <path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0V7z"/><path d="M12 17v5"/>
license: <circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M17 6l3 3M14 9l2.5 2.5"/>
training: <path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/><path d="M22 9v6"/>
support: <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9"/> (The existing object.template, object.team and object.workstream drawings are already on the board. Use the plain Team and Workstream icons in the menu, not the global or local badged ones.)
6c. Other shell icons: not yet in the suite

The bell, the menu button, the collapse and expand icon, the account menu icons (Profile, Settings, Notification preferences, Sign out), the programme switcher chevron, and the footer sync and environment icons are drawn inline on the App shell board but are not registered in the Icon suite. Close, previous, next, widen and open full page already exist as action.*; the Environment icon exists as object.environment. For the missing ones, register them in a shell group, copied from the App shell board drawings, and flag them so Andy can add them to the Icon suite board. Do not take them from @mui/icons-material.

7. What to build, in order

One piece per pull request, each with Storybook stories for every state, unit tests, keyboard and screen-reader behaviour, and a visual check against the board.

Icon registry: RbmIcon, RbmIconButton (check what already exists in the repo first), the nav group from section 6b and the shell group from 6c, the lint rule that bans @mui/icons-material outside the icon package, the CI check on the SVGs, and a test that every key used in rbmNav resolves to an icon.
rbmNav types and data: RbmNavConfig, the table in section 4, the permission and count hooks.
RbmSidebar: expanded, rail, mobile drawer, item states, tooltips, remembered collapse.
RbmTopBar with the notifications Badge and popover, and RbmAccountMenu.
RbmPageHeader: context row with the programme switcher, breadcrumb, title, status pill, metadata line, actions.
RbmFooter, including the reconnecting and environment-chip states.
RbmSlideInRegion: hosts a child panel between the header and footer; responsive widths; focus returns to the opener on close.
RbmAppShell: the grid frame, skip link, density scope, and the wiring of all zones. Demo route with a viewport and density switcher.
8. Acceptance
All six zones visible and correct at 1280, 1024, 800 and 390 px, and at D1 and D2.
Tests: active item from the route; group headings; permission hiding of Admin; count pill and rail dot; collapse remembered per user; drawer open, Escape and focus return; skip link first in the tab order; aria-current; the account menu; the notification count; the footer states; the slide-in sits between header and footer and does not move the content; every icon key resolves; no import of @mui/icons-material outside the icon package.
Colour is never the only signal. Brand Green means Complete only. The active nav item is not Blue Dark.
Anything that differs from the design is flagged in docs/rbm-parked-decisions.md, marked "Not drawn" where the design is silent. Where silent, use MUI's defaults (the agreed fallback), flag it, and do not hold the build.
9. Differences from the design and open questions (flag, do not guess)

The design was updated on 22 Oct 2026 (version 74) so the sidebar and icons match this brief. These remain:

Where do Dashboard, Plan, Readiness, Run, Improve, Reports and Tasks go now? They are not in the new navigation. Confirm they are out of scope for the shell, or say where they live (for example inside Events). The board lists this under "For your decision".
Rule changed: the board's "seven destinations or fewer in the main area" is now "four items or fewer in a group; eleven destinations in four groups". Needs Andy's sign-off.
Default density for the shell. The board's default is D1 Comfortable. The list page is D2 Compact. Andy gave no preference, so build D2 Compact as the default and flag it; it is one prop. Ask if it matters.
Counts: no menu item has a count. The board shows a count on List (12) as an example only. Build the count pill and the rail dot, and wire them to nothing.
Shell chrome icons are not in the Icon suite (section 6c). Andy to decide whether to add them to the board.
Collapse button: user-facing, or width follows the screen only? (The board asks.) Build it with the width default and the remembered choice.
Footer Support link and the Help group's Support & Versions overlap. Should they point to the same place?
Collaboration and Bridge: the board suggests page actions on the live Run page while an event is running. Not part of this build.
ServiceNow hosting, sign-in and deep links: the board says the shell takes over the whole screen and needs a spike first. Build with a stub user and the mock adapter; do not bind to ServiceNow yet.
Logo: use the ICEFLO wordmark, as drawn.
D0 Command and D3 Dense sizes follow the density provider; not part of the first pull request.
Not drawn: hover and pressed states beyond the item states, the notifications popover content, the programme switcher menu, the command palette, and the reconnecting footer. Use MUI defaults and flag each.
10. Order of work
Read this brief, docs/handoff-brief.md and docs/rbm-parked-decisions.md, then the boards in section 2. Run npm run check and tell me what breaks.
Check what already exists in the repo (density provider, theme, RbmStatusPill, avatar, any icon code) and reuse it.
Stop and show me the plan: the RbmNavConfig types, the icon registry design (how the nav and shell groups fit what already exists), and the questions in section 9 that block you. Wait for my go-ahead.
Build in the order in section 7.
Run the acceptance checks. Report what you could not verify.
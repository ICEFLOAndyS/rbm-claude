import '@fontsource-variable/inter';
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CssBaseline, Link, ThemeProvider } from '@mui/material';
import { rbmTheme } from '../src/theme/theme';
import { applyMuiXLicence } from '../src/components/RbmDataGrid/licence';
import { colour, radius, type DensityLevel } from '../src/theme/tokens';
import type { EventFixture } from '../src/data/types';
import { createSimClock } from '../src/engine/clock';
import { createFixtureSource } from '../src/data/fixtureSource';
import { createLocalLayoutStore } from '../src/data/layoutStore';
import { validateFixture } from '../src/data/schema';
import { CommandCentrePage } from '../src/app/CommandCentrePage';
import { RbmAppShell } from '../src/components/RbmAppShell/RbmAppShell';
import { useScrollContainer } from '../src/components/RbmAppShell/shellContext';
import { RbmPageHeader } from '../src/components/RbmPageHeader/RbmPageHeader';
import { EventsListPage, type EventsListAddress } from '../src/app/EventsListPage';
import { createMockEventServer, type EventListData } from '../src/data/list/mockServer';
import { createLocalListPreferenceStore } from '../src/data/list/preferenceStore';
import { validateEventFixture } from '../src/data/list/schema';
import { EVENT_COLUMNS } from '../src/data/list/events';
import type { EventColumnField, EventListFixture } from '../src/data/list/types';
import type { RbmUser } from '../src/components/RbmTopBar/RbmAccountMenu';
import { navLocation, rbmNav } from '../src/data/nav/nav';
import { createMockNavData, useNavPermissions } from '../src/data/nav/navData';
import { RbmAdminPage } from '../src/components/RbmAdminPage/RbmAdminPage';
import { adminDomainAt, adminPageAt, pageOfDomain, parentPageOf } from '../src/data/admin/adminPages';
import { createLocalSidebarStore } from '../src/data/nav/sidebarPreference';
import { createLocalScenarioStore, profileScenarios, SCENARIOS, SHIPPED_SCENARIO_SETTINGS, type RbmScenario, type RbmScenarioSettings } from '../src/data/scenarios/scenarios';
import type { RbmScenarioFilterProps } from '../src/components/RbmScenarioFilter/RbmScenarioFilter';
import { RbmScenarioSettings as RbmScenarioSettingsPage } from '../src/components/RbmScenarioSettings/RbmScenarioSettings';
import { RbmMyScenarios } from '../src/components/RbmMyScenarios/RbmMyScenarios';
import { RbmSlideInRegion } from '../src/components/RbmSlideInRegion/RbmSlideInRegion';
import { COMMAND_CENTRE_EVENTS, type CommandCentreEventRef } from '../src/fixtures/commandCentreEvents';
import pkg from '../package.json';
import weekend from '../src/fixtures/weekend-payroll-cutover.json';
import healthy from '../src/fixtures/healthy-event.json';
import late from '../src/fixtures/badly-late-event.json';
import events128 from '../src/fixtures/events/events-128.json';
import eventsBoard from '../src/fixtures/events/events-board.json';

/** Fixtures the Command Centre can open, by fixture name. The large event is loaded only when chosen. */
const fixtures: Record<CommandCentreEventRef['fixture'], { label: string; load: () => Promise<unknown> }> = {
  'weekend-payroll-cutover': { label: 'Weekend Payroll Cutover (+12 min)', load: async () => weekend },
  'healthy-event': { label: 'Healthy event (on schedule)', load: async () => healthy },
  'badly-late-event': { label: 'Badly late event (Red)', load: async () => late },
  'large-event': { label: 'Large event (15,000 tasks)', load: async () => (await import('../src/fixtures/large-event.json')).default },
};

const speeds = [
  { value: 0, label: 'Paused' },
  { value: 1, label: '×1' },
  { value: 10, label: '×10' },
  { value: 60, label: '×60 (a minute a second)' },
  { value: 300, label: '×300' },
];

const densities: { value: DensityLevel; label: string }[] = [
  { value: 'comfortable', label: 'D1 Comfortable' },
  { value: 'compact', label: 'D2 Compact' },
  { value: 'dense', label: 'D3 Dense' },
  { value: 'command', label: 'D0 Command' },
];

/** Widths from the brief's acceptance list. "Full" is the browser window. */
const viewports = ['full', '1280', '1024', '800', '390'] as const;
type Viewport = (typeof viewports)[number];

applyMuiXLicence();

const params = new URLSearchParams(window.location.search);
const embedded = params.has('embedded');
const layoutStore = createLocalLayoutStore();
/** The stub user: the shell is not bound to ServiceNow sign-in yet (app shell brief, section 9). */
const user: RbmUser = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };
const navData = createMockNavData();
const sidebarStore = createLocalSidebarStore(user.id);
const scenarioStore = createLocalScenarioStore(user.id);
const SCENARIOS_PATH = '/rbm-admin/centre/scenarios';
/** Pages the scenario filter narrows (App shell board: Event Groups, List, Folders, Templates and dashboards). */
const SCENARIO_PAGES = ['/events', '/events/groups', '/events/folders', '/library/templates'];
const DEFAULT_PATH = '/events';

/** The Events list's fixtures: ?events=128 (the default), board or large (15,000 rows, loaded only when chosen). */
const eventLists: Record<string, () => Promise<unknown>> = {
  '128': async () => events128,
  board: async () => eventsBoard,
  large: async () => (await import('../src/fixtures/events/events-large.json')).default,
};
const eventListName = params.get('events') ?? '128';
const listPreferences = createLocalListPreferenceStore<EventColumnField>('rbm.demo.events', EVENT_COLUMNS.map((c) => c.field));
/** One mock server for the session, so changes made in the list (saved views, deletes) survive leaving the page. */
let listServer: Promise<{ data: EventListData; fixture: EventListFixture }> | null = null;
function eventListServer() {
  listServer ??= (eventLists[eventListName] ?? eventLists['128']!)().then((raw) => {
    const { fixture, errors } = validateEventFixture(raw);
    if (!fixture) throw new Error(errors.join('; '));
    // ?listLatency=0 turns off the pretend server wait (400 ms by default).
    return { data: createMockEventServer(fixture, { latencyMs: Number(params.get('listLatency') ?? 400) }), fixture };
  });
  return listServer;
}

/** The open record in the address: #/events?record=ev-00001&tab=…&section=… */
const readAddress = (path: string): EventsListAddress => {
  const q = new URLSearchParams(path.split('?')[1] ?? '');
  return { record: q.get('record') ?? undefined, tab: q.get('tab') ?? undefined, section: q.get('section') ?? undefined };
};
const writeAddress = (a: EventsListAddress) => {
  const q = new URLSearchParams(Object.entries(a).filter((e): e is [string, string] => !!e[1]));
  return q.size ? `/events?${q}` : '/events';
};

/** The route from the hash, for example '/events/REV000009'. The old '#/command-centre' opens REV000009. */
function readPath() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash || hash === '/') return DEFAULT_PATH;
  if (hash.startsWith('/command-centre')) return '/events/REV000009';
  return hash;
}

function useHashPath() {
  const [path, setPath] = useState(readPath);
  useEffect(() => {
    const on = () => setPath(readPath());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [path, (to: string) => (window.location.hash = to)] as const;
}

/**
 * Scenarios: the organisation's settings and the user's own choice from the store, and the scenarios on show,
 * which start from the user's profile and go back to it whenever the profile changes. The filter never saves.
 */
function useScenarios() {
  const [settings, setSettings] = useState<RbmScenarioSettings>(SHIPPED_SCENARIO_SETTINGS);
  const [own, setOwn] = useState<RbmScenario[] | undefined>(undefined);
  const profile = useMemo(() => profileScenarios(settings, own), [settings, own]);
  const [shown, setShown] = useState<RbmScenario[]>(profile);
  useEffect(() => {
    void Promise.all([scenarioStore.getSettings(), scenarioStore.getOwn()]).then(([s, o]) => {
      setSettings(s);
      setOwn(o);
    });
  }, []);
  useEffect(() => setShown(profile), [profile]);
  const filter: RbmScenarioFilterProps = { available: settings.available, profile, value: shown, onChange: setShown };
  return {
    settings,
    own,
    filter,
    saveSettings: async (s: RbmScenarioSettings) => {
      await scenarioStore.setSettings(s);
      setSettings(s);
    },
    saveOwn: async (o: RbmScenario[] | undefined) => {
      await scenarioStore.setOwn(o);
      setOwn(o);
    },
  };
}

const eventOf = (path: string) => {
  const m = /^\/events\/(REV\d{6})(?:[/?]|$)/.exec(path);
  return m ? m[1] : null;
};

function Demo() {
  const [path, navigate] = useHashPath();
  const scenarios = useScenarios();
  const [myScenariosOpen, setMyScenariosOpen] = useState(false);
  const route = path.split('?')[0]!;
  const [speed, setSpeed] = useState(() => Number(params.get('speed') ?? 1));
  const [density, setDensity] = useState<DensityLevel>(() => (params.get('density') as DensityLevel | null) ?? 'compact');
  const [viewport, setViewport] = useState<Viewport>(() => (params.get('viewport') as Viewport | null) ?? 'full');
  // ?latency=0 turns off the pretend server wait behind Show all and Expand all (1.5 s by default).
  const latency = Number(params.get('latency') ?? 1500);

  const number = eventOf(path);
  const ref = COMMAND_CENTRE_EVENTS.find((e) => e.number === number) ?? null;
  const [fixture, setFixture] = useState<EventFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let live = true;
    setFixture(null);
    setError(null);
    if (!ref || embedded === false && viewport !== 'full') return;
    void fixtures[ref.fixture].load().then(
      (data) => {
        if (!live) return;
        const { fixture: f, errors } = validateFixture(data);
        if (f) setFixture(f);
        else setError(errors.join('\n'));
      },
      (e: unknown) => live && setError(`Could not load ${ref.fixture}: ${String(e)}. Run npm run fixtures.`),
    );
    return () => {
      live = false;
    };
  }, [ref?.fixture, viewport]);

  // A fresh clock and source for each event and each reset.
  const live = useMemo(() => {
    if (!fixture) return null;
    const clock = createSimClock(new Date(fixture.startsAt), { speed });
    return { clock, source: createFixtureSource(fixture, clock) };
  }, [fixture, run]);
  useEffect(
    () => () => {
      live?.source.dispose();
      live?.clock.dispose();
    },
    [live],
  );
  useEffect(() => live?.clock.setSpeed(speed), [live, speed]);
  const [clockText, setClockText] = useState('');
  useEffect(() => {
    if (!live) return setClockText('');
    const show = (d: Date) => setClockText(d.toISOString().slice(11, 19));
    show(live.clock.now());
    return live.clock.subscribe(show);
  }, [live]);

  const frameSrc = () => {
    const p = new URLSearchParams({ embedded: '1', density, speed: String(speed), latency: String(latency) });
    const scroll = params.get('scroll');
    if (scroll) p.set('scroll', scroll);
    return `${window.location.pathname}?${p}#${path}`;
  };

  const bar = embedded ? null : (
    <Box component="header" aria-label="Prototype controls" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3, px: 4, py: 1.5, bgcolor: colour.ink, color: colour.white, fontSize: 13, flex: 'none' }}>
      <strong>Prototype</strong>
      <Box component="span" sx={{ color: colour.blueLight }}>Fake engine and JSON fixtures; no back end.</Box>
      <Box sx={{ flex: 1 }} />
      <label>
        Event{' '}
        <select value={ref?.number ?? ''} onChange={(e) => navigate(e.target.value ? `/events/${e.target.value}` : DEFAULT_PATH)} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
          <option value="">Events list</option>
          {COMMAND_CENTRE_EVENTS.map((e) => (
            <option key={e.number} value={e.number}>
              {e.number} · {fixtures[e.fixture].label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Clock{' '}
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} disabled={!ref} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
          {speeds.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {clockText && <Box component="span" aria-live="off" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 72 }}>{clockText} UTC</Box>}
      <button type="button" onClick={() => setRun((n) => n + 1)} disabled={!ref} style={{ borderRadius: radius.control, padding: '4px 12px', fontWeight: 700 }}>
        Reset
      </button>
      <label>
        Density{' '}
        <select value={density} onChange={(e) => setDensity(e.target.value as DensityLevel)} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
          {densities.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Viewport{' '}
        <select value={viewport} onChange={(e) => setViewport(e.target.value as Viewport)} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
          {viewports.map((v) => (
            <option key={v} value={v}>
              {v === 'full' ? 'Full window' : `${v} px`}
            </option>
          ))}
        </select>
      </label>
    </Box>
  );

  // A set width runs the app in a frame of that width, so the shell's media queries change with it.
  if (!embedded && viewport !== 'full') {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: colour.silver }}>
        {bar}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', p: 2, overflow: 'auto' }}>
          <Box component="iframe" key={`${viewport}-${density}-${path}`} title={`RBM at ${viewport} px`} src={frameSrc()} sx={{ width: Number(viewport), height: '100%', border: 0, bgcolor: colour.white, flex: 'none', boxShadow: '0 4px 16px rgba(31,36,48,0.2)' }} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {bar}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <RbmAppShell
          nav={rbmNav}
          navData={navData}
          user={user}
          path={path}
          hrefFor={(to) => `#${to}`}
          onNavigate={navigate}
          onAccountAction={(a) => a === 'myScenarios' && setMyScenariosOpen(true)}
          density={density}
          sidebarStore={sidebarStore}
          notificationCount={2}
          notifications={
            <Box component="ul" sx={{ m: 0, pl: 4, color: colour.slate }}>
              <li>Sample notifications (not drawn): REV000009, task 1.3.5 is late to start.</li>
              <li>REV000011 is forecast 45 minutes late.</li>
            </Box>
          }
          pageTitle={pageTitleFor(path, ref)}
          programme="Q4 Data Centre Migration"
          clock={clockText || undefined}
          footer={{ version: pkg.version, updatedAt: clockText || undefined, environment: { name: 'Development', production: false } }}
        >
          <ScrollOnLoad ready={!!live} />
          {number ? (
            !ref ? (
              <NotBuilt title={number} text={`${number} has no Command Centre data in the prototype. Events REV000009 to REV000012 do.`} />
            ) : error ? (
              <Box component="pre" sx={{ p: 8, color: colour.redInner, whiteSpace: 'pre-wrap' }}>{error}</Box>
            ) : !live ? (
              <Box sx={{ p: 8, color: 'text.secondary' }}>Loading {ref.number} · {fixtures[ref.fixture].label}…</Box>
            ) : (
              <CommandCentrePage key={`${ref.fixture}-${run}`} data={live.source} layoutStore={layoutStore} timeZone="UTC" loadAllDelayMs={latency} />
            )
          ) : route === '/events' ? (
            <EventsRoute path={path} navigate={navigate} scenarios={scenarios.filter} />
          ) : route === SCENARIOS_PATH ? (
            <RbmScenarioSettingsPage settings={scenarios.settings} onSave={scenarios.saveSettings} breadcrumb={[{ label: 'Admin Centre', href: '#/rbm-admin/centre' }]} />
          ) : adminPageAt(path) ? (
            <AdminRoute path={path} navigate={navigate} settings={scenarios.settings} />
          ) : (
            <NotBuilt path={path} scenarios={SCENARIO_PAGES.includes(route) ? scenarios.filter : undefined} />
          )}
          {/* Profile › My scenarios. Not drawn where it opens: the shell's slide-in region (proposed). */}
          <RbmSlideInRegion open={myScenariosOpen} onClose={() => setMyScenariosOpen(false)} label="My scenarios" width={420}>
            <RbmMyScenarios
              settings={scenarios.settings}
              own={scenarios.own}
              onSave={async (o) => {
                await scenarios.saveOwn(o);
                setMyScenariosOpen(false);
              }}
            />
          </RbmSlideInRegion>
        </RbmAppShell>
      </Box>
    </Box>
  );
}

/** The page's name for the browser tab. */
function pageTitleFor(path: string, ref: CommandCentreEventRef | null): string {
  const number = eventOf(path);
  if (number) return ref ? `${ref.number} ${ref.name}` : number;
  if (path.split('?')[0] === '/events') return 'Events';
  return adminPageAt(path)?.title ?? adminDomainAt(path)?.label ?? navLocation(rbmNav, path)?.item.label ?? 'Page not found';
}

/**
 * An admin page (Admin Centre, Setup & Config, Integrations): the domain cards, shown by the platform's
 * permissions. A child page's breadcrumb links back to the page it sits on.
 */
function AdminRoute({ path, navigate, settings }: { path: string; navigate: (to: string) => void; settings: RbmScenarioSettings }) {
  const can = useNavPermissions(navData);
  const at = adminPageAt(path)!;
  // The Scenarios card's count comes from the settings: "2 of 4 available".
  const page = { ...at, domains: at.domains.map((d) => (d.id === 'scenarios' ? { ...d, count: `${settings.available.length} of ${SCENARIOS.length} available` } : d)) };
  const parent = parentPageOf(page);
  return (
    <RbmAdminPage
      page={page}
      can={can}
      breadcrumb={parent ? [{ label: parent.title, href: `#${parent.route}` }] : []}
      hrefFor={(to) => `#${to}`}
      onNavigate={navigate}
    />
  );
}

/** ?scroll=1800 scrolls the content once the page is drawn, for checking the sticky bar and the virtual rows. */
function ScrollOnLoad({ ready }: { ready: boolean }) {
  const scroller = useScrollContainer();
  useEffect(() => {
    const y = Number(params.get('scroll'));
    if (!ready || !y || !scroller) return;
    const id = setTimeout(() => scroller.scrollTo(0, y), 300);
    return () => clearTimeout(id);
  }, [ready, scroller]);
  return null;
}

/**
 * The Events list, on the mock server. The open record is kept in the address, and the Command Centre icon on
 * a running event (and the record panel's Open Command Centre) opens #/events/REVnnnnnn.
 */
function EventsRoute({ path, navigate, scenarios }: { path: string; navigate: (to: string) => void; scenarios: RbmScenarioFilterProps }) {
  const [server, setServer] = useState<{ data: EventListData; fixture: EventListFixture } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    eventListServer().then(
      (s) => live && setServer(s),
      (e: unknown) => live && setError(`Could not load the Events list (${eventListName}): ${String(e)}. Run npm run fixtures.`),
    );
    return () => {
      live = false;
    };
  }, []);
  if (error) return <Box component="pre" sx={{ p: 8, color: colour.redInner, whiteSpace: 'pre-wrap' }}>{error}</Box>;
  if (!server) return <Box sx={{ p: 8, color: 'text.secondary' }}>Loading events…</Box>;
  return (
    <EventsListPage
      data={server.data}
      preferences={listPreferences}
      people={server.fixture.people}
      address={readAddress(path)}
      onAddressChange={(a) => navigate(writeAddress(a))}
      onOpenCommandCentre={(e) => navigate(`/events/${e.number}`)}
      scenarios={scenarios}
      onNew={() => {}}
      onImport={() => {}}
      onOpenFull={() => {}}
      onPrimaryAction={() => {}}
    />
  );
}

/** A menu destination the prototype does not build yet. */
function NotBuilt({ path, title, text, scenarios }: { path?: string; title?: string; text?: string; scenarios?: RbmScenarioFilterProps }) {
  const at = path ? navLocation(rbmNav, path) : undefined;
  // A domain's own page names the domain, and links back to the admin page it sits on.
  const domain = path ? adminDomainAt(path) : undefined;
  const page = domain ? pageOfDomain(domain) : undefined;
  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <RbmPageHeader
        title={title ?? domain?.label ?? at?.item.label ?? 'Page not found'}
        scenarios={scenarios}
        breadcrumb={page ? [{ label: page.title, href: `#${page.route}` }] : []}
        metadata={at ? `${at.group.group} · not built in the prototype` : undefined}
      />
      <Box sx={{ color: 'text.secondary' }}>
        {text ?? (at ? 'This page is not part of the prototype yet.' : 'There is no page at this address.')}{' '}
        <Link href={`#${DEFAULT_PATH}`}>Go to Events</Link>.
      </Box>
    </Box>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={rbmTheme}>
      <CssBaseline />
      <Demo />
    </ThemeProvider>
  </StrictMode>,
);

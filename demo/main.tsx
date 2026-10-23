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
import type { RbmUser } from '../src/components/RbmTopBar/RbmAccountMenu';
import { navLocation, rbmNav } from '../src/data/nav/nav';
import { createMockNavData } from '../src/data/nav/navData';
import { createLocalSidebarStore } from '../src/data/nav/sidebarPreference';
import { COMMAND_CENTRE_EVENTS, type CommandCentreEventRef } from '../src/fixtures/commandCentreEvents';
import pkg from '../package.json';
import weekend from '../src/fixtures/weekend-payroll-cutover.json';
import healthy from '../src/fixtures/healthy-event.json';
import late from '../src/fixtures/badly-late-event.json';

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
const DEFAULT_PATH = '/events';

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

const eventOf = (path: string) => {
  const m = /^\/events\/(REV\d{6})(?:[/?]|$)/.exec(path);
  return m ? m[1] : null;
};

function Demo() {
  const [path, navigate] = useHashPath();
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
          density={density}
          sidebarStore={sidebarStore}
          notificationCount={2}
          notifications={
            <Box component="ul" sx={{ m: 0, pl: 4, color: colour.slate }}>
              <li>Sample notifications (not drawn): REV000009, task 1.3.5 is late to start.</li>
              <li>REV000011 is forecast 45 minutes late.</li>
            </Box>
          }
          programme="Q4 Data Centre Migration"
          clock={clockText || undefined}
          footer={{ version: pkg.version, updatedAt: clockText || undefined, environment: { name: 'Development', production: false }, links: { privacy: 'https://iceflo.com', support: 'https://iceflo.com', knowledge: 'https://iceflo.com' } }}
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
          ) : path === '/events' ? (
            <EventsStandIn />
          ) : (
            <NotBuilt path={path} />
          )}
        </RbmAppShell>
      </Box>
    </Box>
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

/** Until the Events list comes into the demo (next step): the events the Command Centre can open. */
function EventsStandIn() {
  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <RbmPageHeader title="Events" metadata="The Events list moves into the prototype in the next step." />
      <Box component="ul" sx={{ m: 0, pl: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COMMAND_CENTRE_EVENTS.map((e) => (
          <li key={e.number}>
            <Link href={`#/events/${e.number}`} sx={{ fontWeight: 600 }}>
              {e.number} · {e.name}
            </Link>
          </li>
        ))}
      </Box>
    </Box>
  );
}

/** A menu destination the prototype does not build yet. */
function NotBuilt({ path, title, text }: { path?: string; title?: string; text?: string }) {
  const at = path ? navLocation(rbmNav, path) : undefined;
  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <RbmPageHeader title={title ?? at?.item.label ?? 'Page not found'} metadata={at ? `${at.group.group} · not built in the prototype` : undefined} />
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

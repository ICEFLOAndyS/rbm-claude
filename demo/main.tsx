import '@fontsource-variable/inter';
import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { rbmTheme } from '../src/theme/theme';
import { colour, radius } from '../src/theme/tokens';
import type { EventFixture } from '../src/data/types';
import { createSimClock } from '../src/engine/clock';
import { createFixtureSource } from '../src/data/fixtureSource';
import { createLocalLayoutStore } from '../src/data/layoutStore';
import { validateFixture } from '../src/data/schema';
import { CommandCentrePage } from '../src/app/CommandCentrePage';
import weekend from '../src/fixtures/weekend-payroll-cutover.json';
import healthy from '../src/fixtures/healthy-event.json';
import late from '../src/fixtures/badly-late-event.json';

/** Fixtures for the switcher. The large event is loaded only when chosen. */
const fixtures: Record<string, { label: string; load: () => Promise<unknown> }> = {
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

const layoutStore = createLocalLayoutStore();

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/command-centre');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/command-centre');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function Demo() {
  const route = useHashRoute();
  const [name, setName] = useState(() => new URLSearchParams(window.location.search).get('fixture') ?? 'weekend-payroll-cutover');
  const [speed, setSpeed] = useState(() => Number(new URLSearchParams(window.location.search).get('speed') ?? 1));
  // ?latency=0 turns off the pretend server wait behind Show all and Expand all (1.5 s by default).
  const latency = Number(new URLSearchParams(window.location.search).get('latency') ?? 1500);
  const [fixture, setFixture] = useState<EventFixture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let live = true;
    setFixture(null);
    void fixtures[name]!.load().then((data) => {
      if (!live) return;
      const { fixture: f, errors } = validateFixture(data);
      if (f) setFixture(f);
      else setError(errors.join('\n'));
    }, (e: unknown) => live && setError(`Could not load ${name}: ${String(e)}. Run npm run fixtures.`));
    return () => {
      live = false;
    };
  }, [name]);

  // A fresh clock and source for each fixture and each reset.
  const live = useMemo(() => {
    if (!fixture) return null;
    const clock = createSimClock(new Date(fixture.startsAt), { speed });
    return { clock, source: createFixtureSource(fixture, clock) };
  }, [fixture, run]);
  useEffect(() => () => {
    live?.source.dispose();
    live?.clock.dispose();
  }, [live]);
  useEffect(() => live?.clock.setSpeed(speed), [live, speed]);
  const [clockText, setClockText] = useState('');
  useEffect(() => {
    if (!live) return;
    const show = (d: Date) => setClockText(d.toISOString().slice(11, 19));
    show(live.clock.now());
    return live.clock.subscribe(show);
  }, [live]);
  // ?scroll=1800 scrolls once the page is drawn, for checking the sticky bar and the virtual rows.
  useEffect(() => {
    const y = Number(new URLSearchParams(window.location.search).get('scroll'));
    if (!live || !y) return;
    const id = setTimeout(() => window.scrollTo(0, y), 300);
    return () => clearTimeout(id);
  }, [live]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Box component="header" aria-label="Prototype controls" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3, px: 8, py: 2, bgcolor: colour.deepBlue, color: colour.white, fontSize: 13 }}>
        <strong>Prototype</strong>
        <Box component="span" sx={{ color: colour.blueLight }}>Fake engine and JSON fixtures; no back end.</Box>
        <Box sx={{ flex: 1 }} />
        <label>
          Fixture{' '}
          <select value={name} onChange={(e) => setName(e.target.value)} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
            {Object.entries(fixtures).map(([k, f]) => (
              <option key={k} value={k}>{f.label}</option>
            ))}
          </select>
        </label>
        <label>
          Clock{' '}
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ borderRadius: radius.control, padding: '4px 8px' }}>
            {speeds.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <Box component="span" aria-live="off" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 72 }}>{clockText} UTC</Box>
        <button type="button" onClick={() => setRun((n) => n + 1)} style={{ borderRadius: radius.control, padding: '4px 12px', fontWeight: 700 }}>
          Reset
        </button>
      </Box>
      {route !== '#/command-centre' ? (
        <Box sx={{ p: 8 }}>
          Unknown page. <a href="#/command-centre">Open the Command & Control Centre</a>.
        </Box>
      ) : error ? (
        <Box component="pre" sx={{ p: 8, color: colour.redInner, whiteSpace: 'pre-wrap' }}>{error}</Box>
      ) : !live ? (
        <Box sx={{ p: 8, color: 'text.secondary' }}>Loading {fixtures[name]!.label}…</Box>
      ) : (
        <CommandCentrePage key={`${name}-${run}`} data={live.source} layoutStore={layoutStore} timeZone="UTC" loadAllDelayMs={latency} />
      )}
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

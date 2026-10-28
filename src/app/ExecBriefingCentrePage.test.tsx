import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { ExecBriefingCentrePage } from './ExecBriefingCentrePage';
import { CommandCentrePage } from './CommandCentrePage';
import { createFixtureSource } from '../data/fixtureSource';
import { createLocalLayoutStore } from '../data/layoutStore';
import { createSimClock } from '../engine/clock';
import { weekendPayrollCutover } from '../fixtures/build';
import { EXEC_BRIEFING_LAYOUT } from '../components/RbmLayoutPanel/RbmLayoutPanel';
import { mockWorkstreamProgressFrom } from '../mocks/workstreamProgress';
import { rbmTheme } from '../theme/theme';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

const KEY = 'rbm.execBriefingCentre.layout.v1';

function setup(storage = memoryStorage()) {
  const fixture = weekendPayrollCutover();
  const clock = createSimClock(new Date(fixture.startsAt), { speed: 0 });
  const source = createFixtureSource(fixture, clock);
  const workstreams = mockWorkstreamProgressFrom(new Date(fixture.event.window.start));
  return render(
    <ThemeProvider theme={rbmTheme}>
      <ExecBriefingCentrePage data={source} layoutStore={createLocalLayoutStore(KEY, storage, EXEC_BRIEFING_LAYOUT)} workstreams={workstreams} timeZone="UTC" />
    </ThemeProvider>,
  );
}

const regionOrder = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="rbm-main-column"] > [data-region]')).map((r) => r.dataset.region);

describe('ExecBriefingCentrePage', () => {
  it('shows the same event, named Exec Briefing Centre in the breadcrumb', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('REV000009 · Weekend Payroll Cutover');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Run / Exec Briefing Centre / Weekend Payroll Cutover');
    expect(screen.getByRole('region', { name: 'Forecast end time' })).toHaveTextContent('06:12');
  });

  it('has no Task Timeline: the Event ribbon, then Progress where the timeline was', async () => {
    setup();
    await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'progress']));
    expect(screen.queryByRole('region', { name: /Task Timeline/ })).toBeNull();
  });

  it('shows Runbook progress, from the event, beside Workstream progress', () => {
    setup();
    const progress = screen.getByRole('region', { name: 'Progress, runbooks and workstreams' });
    const cards = within(progress).getByTestId('rbm-progress-cards');
    expect(within(cards).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Runbook progress', 'Workstream progress']);
    // The fixture's three runbooks, by start time.
    const runbooks = within(progress).getByRole('region', { name: 'Runbook progress' });
    expect(within(runbooks).getAllByRole('progressbar').map((b) => b.getAttribute('aria-label')!.split(',')[0])).toEqual(['Payroll cutover', 'Interfaces', 'Reporting']);
    expect(within(progress).getByRole('region', { name: 'Workstream progress' })).toHaveTextContent('+2 more workstreams');
  });

  it('lists its own regions in the Layout panel: Event ribbon and Progress, no Task Timeline', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
    const panel = screen.getByRole('dialog', { name: 'Layout' });
    expect(panel).toHaveTextContent('Event ribbon');
    expect(panel).toHaveTextContent('Progress');
    expect(panel).not.toHaveTextContent('Task Timeline');
  });

  it('moves and collapses Progress, and keeps it across a reload', async () => {
    const storage = memoryStorage();
    await createLocalLayoutStore(KEY, storage, EXEC_BRIEFING_LAYOUT).set({ order: ['progress', 'ribbon'], collapsed: { ribbon: false, progress: true, hotTopics: false }, ribbonView: 'all' });
    setup(storage);
    await waitFor(() => expect(regionOrder()).toEqual(['progress', 'ribbon']));
    const progress = screen.getByRole('region', { name: 'Progress, runbooks and workstreams' });
    expect(progress).toHaveAttribute('data-collapsed', 'true');
    expect(within(progress).getByRole('list', { name: 'Progress summary' })).toHaveTextContent('3 runbooks');
    await userEvent.click(within(progress).getByRole('button', { name: 'Expand Progress' }));
    expect(JSON.parse(storage.getItem(KEY)!).collapsed.progress).toBe(false);
  });

  it('ignores a Command Centre layout: Progress always has a place', async () => {
    const storage = memoryStorage();
    storage.setItem(KEY, JSON.stringify({ order: ['timeline', 'ribbon'], collapsed: {}, ribbonView: 'all' }));
    setup(storage);
    await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'progress']));
  });

  it('leaves the Command Centre as it was: Task Timeline and no Progress', async () => {
    const fixture = weekendPayrollCutover();
    const clock = createSimClock(new Date(fixture.startsAt), { speed: 0 });
    render(
      <ThemeProvider theme={rbmTheme}>
        <CommandCentrePage data={createFixtureSource(fixture, clock)} layoutStore={createLocalLayoutStore('cc', memoryStorage())} timeZone="UTC" ask={() => null} />
      </ThemeProvider>,
    );
    await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'timeline']));
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(/^Run \/ Weekend Payroll Cutover$/);
    expect(screen.queryByRole('region', { name: 'Progress, runbooks and workstreams' })).toBeNull();
  });
});

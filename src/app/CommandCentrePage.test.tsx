import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { CommandCentrePage } from './CommandCentrePage';
import { createFixtureSource } from '../data/fixtureSource';
import { createLocalLayoutStore } from '../data/layoutStore';
import { createSimClock } from '../engine/clock';
import { healthyEvent, weekendPayrollCutover } from '../fixtures/build';
import type { EventFixture } from '../data/types';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

function setup(fixture: EventFixture = weekendPayrollCutover(), storage = memoryStorage(), loadAllDelayMs = 0) {
  const clock = createSimClock(new Date(fixture.startsAt), { speed: 0 });
  const source = createFixtureSource(fixture, clock);
  const store = createLocalLayoutStore('test', storage);
  const ask = vi.fn<(q: string, initial?: string) => string | null>(() => null);
  const utils = render(
    <ThemeProvider theme={rbmTheme}>
      <CommandCentrePage data={source} layoutStore={store} timeZone="UTC" ask={ask} loadAllDelayMs={loadAllDelayMs} />
    </ThemeProvider>,
  );
  return { ...utils, clock, source, store, storage, ask };
}
import { rbmTheme } from '../theme/theme';

const regionOrder = () => Array.from(document.querySelectorAll<HTMLElement>('section > [data-region]')).map((r) => r.dataset.region);

describe('CommandCentrePage (connected to the fixture source and the fake engine)', () => {
  afterEach(() => vi.useRealTimers());

  it('shows the Weekend Payroll Cutover as on the Command board', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('E12345 · Weekend Payroll Cutover');
    expect(screen.getByRole('button', { name: /^3 alerts, most serious: 2 blockers are holding/ })).toBeInTheDocument();
    const forecast = screen.getByRole('region', { name: 'Forecast end time' });
    expect(forecast).toHaveTextContent('06:12');
    expect(forecast).toHaveTextContent('+12 min Behind Schedule');
    expect(screen.getByRole('group', { name: 'Interfaces, forecast end 05:27, 27 minutes behind' })).toBeInTheDocument();
  });

  it('hides the alert counter when the event is healthy', () => {
    setup(healthyEvent());
    expect(screen.queryByRole('button', { name: /alert/ })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Forecast end time' })).toHaveTextContent('On Schedule');
  });

  describe('layout order through LayoutPreferenceStore', () => {
    it('uses the default order when nothing is saved', async () => {
      setup();
      await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']));
    });

    it('loads a saved order, and keeps a change across a reload', async () => {
      const storage = memoryStorage();
      await createLocalLayoutStore('test', storage).set({ order: ['hotTopics', 'timeline', 'ribbon'], collapsed: { ribbon: false, timeline: false, hotTopics: false }, ribbonView: 'all' });
      const first = setup(weekendPayrollCutover(), storage);
      await waitFor(() => expect(regionOrder()).toEqual(['hotTopics', 'timeline', 'ribbon']));
      // Reset to default from the Layout panel saves the default.
      await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
      await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
      await userEvent.click(within(screen.getByRole('dialog', { name: 'Layout' })).getByRole('button', { name: 'Reset to default' }));
      expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']);
      first.unmount();
      first.clock.dispose();
      // Reload: a new page on the same storage.
      setup(weekendPayrollCutover(), storage);
      await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']));
      expect((await createLocalLayoutStore('test', storage).get()).order).toEqual(['ribbon', 'timeline', 'hotTopics']);
    });

    it('remembers the collapsed ribbon', async () => {
      const storage = memoryStorage();
      const first = setup(weekendPayrollCutover(), storage);
      await userEvent.click(screen.getByRole('button', { name: 'Collapse Event ribbon' }));
      await waitFor(async () => expect((await createLocalLayoutStore('test', storage).get()).collapsed.ribbon).toBe(true));
      first.unmount();
      first.clock.dispose();
      setup(weekendPayrollCutover(), storage);
      expect(await screen.findByRole('button', { name: 'Expand Event ribbon' })).toBeInTheDocument();
    });
  });

  it('collapses the Task Timeline and the Hot-topics strip, and remembers them across a reload', async () => {
    const storage = memoryStorage();
    const first = setup(weekendPayrollCutover(), storage);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Task Timeline' }));
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Hot-topics strip' }));
    expect(within(screen.getByRole('list', { name: 'Hot-topics strip summary' })).getByRole('listitem', { name: 'Blockers 2' })).toBeInTheDocument();
    await waitFor(async () => expect((await createLocalLayoutStore('test', storage).get()).collapsed).toEqual({ ribbon: false, timeline: true, hotTopics: true }));
    first.unmount();
    first.clock.dispose();
    setup(weekendPayrollCutover(), storage);
    expect(await screen.findByRole('button', { name: 'Expand Task Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand Hot-topics strip' })).toBeInTheDocument();
  });

  it('Reset to default opens every region and keeps the ribbon view', async () => {
    const storage = memoryStorage();
    await createLocalLayoutStore('test', storage).set({ order: ['hotTopics', 'timeline', 'ribbon'], collapsed: { ribbon: true, timeline: true, hotTopics: false }, ribbonView: 'criticalPath' });
    setup(weekendPayrollCutover(), storage);
    expect(await screen.findByRole('button', { name: 'Expand Event ribbon' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Event actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Layout/ }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Layout' })).getByRole('button', { name: 'Reset to default' }));
    expect(regionOrder()).toEqual(['ribbon', 'timeline', 'hotTopics']);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('button', { name: 'Collapse Task Timeline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show: Critical path' })).toBeInTheDocument();
    await waitFor(async () => expect((await createLocalLayoutStore('test', storage).get()).ribbonView).toBe('criticalPath'));
  });

  it('shows "Loading all tasks" while the pretend server query behind Show all runs', async () => {
    setup(weekendPayrollCutover(), memoryStorage(), 600);
    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(await screen.findByText('Loading all tasks…')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading all tasks…')).not.toBeInTheDocument(), { timeout: 10_000 });
    expect(screen.getAllByRole('status').find((s) => s.textContent?.startsWith('Showing'))).toHaveTextContent('Showing 124 of 124 tasks');
  });

  describe('acting on tasks through the fake engine', () => {
    it('starts a ready task: the row becomes active and the engine releases nothing else wrongly', async () => {
      const { source } = setup();
      await userEvent.click(screen.getByRole('button', { name: 'Start task 1.3.18 Refresh test data' }));
      await waitFor(() => expect(source.getSnapshot().tasks.find((t) => t.wbs === '1.3.18')!.state).toBe('active'));
      expect(screen.getByRole('button', { name: 'Complete task 1.3.18 Refresh test data' })).toBeInTheDocument();
      expect(source.getSnapshot().log.at(-1)).toMatchObject({ action: 'start' });
    });

    it('completes a task with an Undo message, and Undo puts it back', async () => {
      const { source } = setup();
      await userEvent.click(screen.getByRole('button', { name: 'Complete task 1.3.16 Run smoke tests' }));
      await waitFor(() => expect(source.getSnapshot().tasks.find((t) => t.wbs === '1.3.16')!.state).toBe('complete'));
      expect(screen.getByText('1.3.16 completed at 03:40')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      await waitFor(() => expect(source.getSnapshot().tasks.find((t) => t.wbs === '1.3.16')!.state).toBe('active'));
    });

    it('skips a task only with a reason, asked for in the prototype', async () => {
      const { source, ask } = setup();
      ask.mockReturnValueOnce('No longer needed');
      await userEvent.click(screen.getByRole('button', { name: 'More ways to complete task 1.3.16 Run smoke tests' }));
      await userEvent.click(screen.getByRole('menuitem', { name: /Skip task/ }));
      expect(ask).toHaveBeenCalledWith('Why skip 1.3.16? A reason is required.');
      await waitFor(() => expect(source.getSnapshot().tasks.find((t) => t.wbs === '1.3.16')!.state).toBe('skipped'));
    });

    it('shows a refusal from the engine in the Task Timeline message: Undo after the linger has closed', async () => {
      const { clock } = setup();
      await userEvent.click(screen.getByRole('button', { name: 'Complete task 1.3.16 Run smoke tests' }));
      expect(screen.getByText('1.3.16 completed at 03:40')).toBeInTheDocument();
      // Two simulated minutes later the 60-second linger is over, but the message is still on screen.
      act(() => clock.set(new Date('2026-05-25T03:42:00Z')));
      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(await screen.findByText('Undo for 1.3.16 has closed; reopen it from the task')).toBeInTheDocument();
    });
  });

  it('filters the Hot-topics strip with the runbook filter, like the Task Timeline', async () => {
    setup();
    const blockers = () => within(screen.getByRole('region', { name: 'Blockers' }));
    expect(blockers().getByText('BLK-102')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All runbooks' }));
    await userEvent.click(screen.getByRole('button', { name: 'Only Interfaces' }));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(blockers().queryByText('BLK-102')).not.toBeInTheDocument());
    expect(blockers().getByText('BLK-202')).toBeInTheDocument();
  });

  const chooseView = async (name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /^Show: / }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: new RegExp(`^${name}`) }));
  };

  it('shows the critical path set by the engine, across runbooks', async () => {
    setup();
    await chooseView('Critical path');
    const shown = Array.from(document.querySelectorAll<HTMLElement>('[data-stage]')).map((s) => s.dataset.stage);
    expect(shown).toEqual(['st-1.1', 'st-1.2', 'st-1.3', 'st-1.4', 'st-1.5', 'st-3.1']);
  });

  it('hides runbooks off the critical path, and remembers the view for the user across a reload', async () => {
    const storage = memoryStorage();
    const first = setup(weekendPayrollCutover(), storage);
    await chooseView('Critical runbooks');
    expect(Array.from(document.querySelectorAll<HTMLElement>('[data-lane]')).map((l) => l.dataset.lane)).toEqual(['rb-1', 'rb-3']);
    await waitFor(async () => expect((await createLocalLayoutStore('test', storage).get()).ribbonView).toBe('criticalRunbooks'));
    first.unmount();
    first.clock.dispose();
    setup(weekendPayrollCutover(), storage);
    expect(await screen.findByRole('button', { name: 'Show: Critical runbooks' }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('follows the clock: the now marker moves as simulated time passes', () => {
    vi.useFakeTimers();
    const f = weekendPayrollCutover();
    const clock = createSimClock(new Date(f.startsAt), { speed: 60 });
    const source = createFixtureSource(f, clock);
    render(
      <ThemeProvider theme={rbmTheme}>
        <CommandCentrePage data={source} layoutStore={createLocalLayoutStore('t', memoryStorage())} timeZone="UTC" />
      </ThemeProvider>,
    );
    expect(screen.getByText('NOW 03:40')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('NOW 03:45')).toBeInTheDocument();
    clock.dispose();
  });
});

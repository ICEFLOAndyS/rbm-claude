import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { ExecCentrePage } from './ExecCentrePage';
import { CommandCentrePage } from './CommandCentrePage';
import { createFixtureSource } from '../data/fixtureSource';
import { createLocalLayoutStore } from '../data/layoutStore';
import { createSimClock } from '../engine/clock';
import { weekendPayrollCutover } from '../fixtures/build';
import { rbmTheme } from '../theme/theme';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

function setup(Page: typeof ExecCentrePage | typeof CommandCentrePage, storage = memoryStorage(), key = 'test') {
  const fixture = weekendPayrollCutover();
  const clock = createSimClock(new Date(fixture.startsAt), { speed: 0 });
  const source = createFixtureSource(fixture, clock);
  return render(
    <ThemeProvider theme={rbmTheme}>
      <Page data={source} layoutStore={createLocalLayoutStore(key, storage)} timeZone="UTC" ask={() => null} />
    </ThemeProvider>,
  );
}

const regionOrder = () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="rbm-main-column"] > [data-region]')).map((r) => r.dataset.region);

describe('ExecCentrePage (a copy of the Command Centre page)', () => {
  it('shows the same event as the Command Centre', () => {
    setup(ExecCentrePage);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('REV000009 · Weekend Payroll Cutover');
    expect(screen.getByRole('region', { name: 'Forecast end time' })).toHaveTextContent('06:12');
    expect(screen.getByRole('region', { name: /Task Timeline/ })).toBeInTheDocument();
  });

  it('names itself in the breadcrumb; the Command Centre breadcrumb is unchanged', () => {
    const { unmount } = setup(ExecCentrePage);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Run / Exec Centre / Weekend Payroll Cutover');
    unmount();
    setup(CommandCentrePage);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(/^Run \/ Weekend Payroll Cutover$/);
  });

  it('keeps its own layout, apart from the Command Centre one', async () => {
    const storage = memoryStorage();
    await createLocalLayoutStore('rbm.commandCentre.layout.v1', storage).set({ order: ['timeline', 'ribbon'], collapsed: { ribbon: false, timeline: false, hotTopics: false }, ribbonView: 'all' });
    setup(ExecCentrePage, storage, 'rbm.execCentre.layout.v1');
    await waitFor(() => expect(regionOrder()).toEqual(['ribbon', 'timeline']));
  });
});

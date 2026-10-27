import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmRunbookProgress.tsx?raw';
import {
  RbmRunbookProgress,
  RUNBOOK_ROW_LIMIT,
  byStart,
  formatWhen,
  issuesText,
  percentComplete,
  runbookSummary,
  type RbmRunbookProgressItem,
} from './RbmRunbookProgress';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import type { DensityLevel } from '../../theme/tokens';

const renderCard = (ui: ReactElement, level?: DensityLevel) =>
  render(<ThemeProvider theme={rbmTheme}>{level ? <RbmDensity level={level}>{ui}</RbmDensity> : ui}</ThemeProvider>);
const all = mockRunbookProgress();
const item = (name: string) => all.find((w) => w.name === name)!;
const bars = () => screen.queryAllByRole('progressbar');

describe('percentComplete', () => {
  it.each([
    [5, 16, 31],
    [24, 24, 100],
    [0, 18, 0],
    [2, 3, 67],
    [28, 60, 47],
    [199, 200, 99],
  ])('%i of %i is %i%%, rounded, and 100%% only when all tasks are Complete', (complete, total, percent) => {
    expect(percentComplete(complete, total)).toBe(percent);
  });

  it('is 0% for a runbook with no tasks', () => {
    expect(percentComplete(0, 0)).toBe(0);
  });
});

describe('issuesText', () => {
  it.each([
    [{ high: 1, medium: 2, low: 0 }, '1 high, 2 medium issues'],
    [{ high: 0, medium: 0, low: 1 }, '1 low issue'],
    [{ high: 0, medium: 0, low: 0 }, 'no open issues'],
    [{ high: 2, medium: 1, low: 1 }, '2 high, 1 medium, 1 low issues'],
  ])('%o reads "%s"', (issues, words) => {
    expect(issuesText(issues)).toBe(words);
  });
});

describe('formatWhen', () => {
  it('reads like the Event window, 24-hour', () => {
    expect(formatWhen(new Date('2026-10-24T22:30:00Z'), 'UTC')).toBe('24 Oct 22:30');
    expect(formatWhen(new Date('2026-10-25T03:05:00Z'), 'UTC')).toBe('25 Oct 03:05');
  });
});

describe('runbookSummary', () => {
  it('names the row as the brief does', () => {
    expect(runbookSummary(item('Core network cutover'), 'UTC')).toBe(
      'Core network cutover, 31% complete, 5 of 16 tasks, Active, Late, 1 high, 2 medium issues, owner R. Patel, 24 Oct 22:30 to 25 Oct 03:00',
    );
  });

  it('leaves out Late when the Planning engine has not set it', () => {
    expect(runbookSummary(item('Application tier startup'), 'UTC')).not.toContain('Late');
  });
});

describe('RbmRunbookProgress', () => {
  it('is a region named by its title, with the runbooks as a list', () => {
    renderCard(<RbmRunbookProgress items={all} timeZone="UTC" />);
    const region = screen.getByRole('region', { name: 'Runbook progress' });
    expect(within(region).getByRole('list', { name: 'Runbook progress' })).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem')).toHaveLength(RUNBOOK_ROW_LIMIT);
  });

  it('takes another title', () => {
    renderCard(<RbmRunbookProgress items={all} title="Runbooks" />);
    expect(screen.getByRole('region', { name: 'Runbooks' })).toBeInTheDocument();
  });

  it('orders by start time, earliest first, whatever order the data comes in', () => {
    renderCard(<RbmRunbookProgress items={[...all].reverse()} timeZone="UTC" />);
    const names = bars().map((b) => b.getAttribute('aria-label')!.split(',')[0]);
    expect(names).toEqual([...all].sort(byStart).slice(0, 10).map((w) => w.name));
    expect(names.slice(0, 3)).toEqual(['Application tier startup', 'Payments database failover', 'Core network cutover']);
  });

  it('breaks a tie in start time by name', () => {
    const [a, b] = [item('Payments database failover'), item('Application tier startup')];
    expect([a, b].sort(byStart).map((w) => w.name)).toEqual(['Application tier startup', 'Payments database failover']);
  });

  it('shows ten rows at most, then "+n more runbooks", and says so in the caption', () => {
    renderCard(<RbmRunbookProgress items={all} />);
    expect(bars()).toHaveLength(10);
    expect(screen.getByText('+2 more runbooks')).toBeInTheDocument();
    expect(screen.getByText('Ordered by start time · 10 of 12 shown')).toBeInTheDocument();
  });

  it('says "+1 more runbook" for one', () => {
    renderCard(<RbmRunbookProgress items={mockRunbookProgress(11)} />);
    expect(screen.getByText('+1 more runbook')).toBeInTheDocument();
  });

  it('shows no "more" line when every runbook fits', () => {
    renderCard(<RbmRunbookProgress items={mockRunbookProgress(4)} />);
    expect(screen.queryByText(/more runbook/)).not.toBeInTheDocument();
    expect(screen.getByText('Ordered by start time · 4 of 4 shown')).toBeInTheDocument();
  });

  it('gives each bar its value, from 0 to 100', () => {
    renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '31');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('fills Brand Green only for a Complete runbook, and Blue Dark otherwise', () => {
    const almost: RbmRunbookProgressItem = { ...item('Application tier startup'), complete: 50, total: 50 };
    renderCard(<RbmRunbookProgress items={[item('Payments database failover'), almost, item('Core network cutover')]} />);
    const fills = screen.getAllByTestId('rbm-progress-fill');
    expect(fills.map((f) => f.dataset.fill)).toEqual(['active', 'complete', 'active']);
    expect(fills[1]).toHaveStyle({ backgroundColor: 'rgb(132, 204, 22)' });
    expect(fills[0]).toHaveStyle({ backgroundColor: 'rgb(53, 75, 168)' });
  });

  it('shows the state as a word, and Late beside it only when the engine sets it', () => {
    renderCard(<RbmRunbookProgress items={[item('Core network cutover'), item('Application tier startup')]} />);
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getAllByText('Late')).toHaveLength(1);
  });

  it.each([
    ['Backup restore test', 'Paused'],
    ['Customer communications', 'Scheduled'],
    ['Payments database failover', 'Complete'],
  ])('shows %s as %s, with the Icon suite icon', (name, label) => {
    const { container } = renderCard(<RbmRunbookProgress items={[item(name)]} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-icon="state.${label.toLowerCase()}"]`)).not.toBeNull();
  });

  it('shows the issue counts, with a severity dot only on a count above zero', () => {
    renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} />);
    expect(screen.getByTestId('rbm-issue-dot-high')).toBeInTheDocument();
    expect(screen.getByTestId('rbm-issue-dot-medium')).toBeInTheDocument();
    expect(screen.queryByTestId('rbm-issue-dot-low')).not.toBeInTheDocument();
  });

  it('shows the task counts: done, to do and total', () => {
    renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} />);
    for (const n of ['5', '11', '16']) expect(screen.getByText(n)).toBeInTheDocument();
  });

  it('shows the owner and start over end at D1', () => {
    renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} timeZone="UTC" />);
    expect(screen.getByText('R. Patel')).toBeInTheDocument();
    expect(screen.getByText('24 Oct 22:30')).toBeInTheDocument();
    expect(screen.getByText('25 Oct 03:00')).toBeInTheDocument();
    expect(screen.getByText('Start / end')).toBeInTheDocument();
  });

  it('is announced as loading, with three grey rows', () => {
    renderCard(<RbmRunbookProgress items={[]} loading />);
    const region = screen.getByRole('region', { name: 'Runbook progress' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).getByText('Loading runbooks')).toBeInTheDocument();
    expect(bars()).toHaveLength(0);
    expect(screen.queryByText('No runbooks yet.')).not.toBeInTheDocument();
  });

  it('says "No runbooks yet." when there are none', () => {
    renderCard(<RbmRunbookProgress items={[]} />);
    expect(screen.getByText('No runbooks yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Ordered by start time/)).not.toBeInTheDocument();
  });

  it('has nothing to focus: there is no click-through', () => {
    const { container } = renderCard(<RbmRunbookProgress items={all} />);
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(0);
  });

  describe('by density', () => {
    it('D0 shows Essential only: runbook, progress and status', () => {
      renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} timeZone="UTC" />, 'command');
      expect(screen.getByText('Late')).toBeInTheDocument();
      expect(screen.queryByText('R. Patel')).not.toBeInTheDocument();
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
      expect(screen.queryByText('25 Oct 03:00')).not.toBeInTheDocument();
      // The accessible name still carries every field.
      expect(screen.getByRole('progressbar', { name: /owner R\. Patel/ })).toBeInTheDocument();
    });

    it('D2 shows owner initials, and Start and End in their own columns', () => {
      renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} timeZone="UTC" />, 'compact');
      expect(screen.getByText('RP')).toBeInTheDocument();
      expect(screen.queryByText('R. Patel')).not.toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });

    it('D3 is one line: done of total and the end, with no start', () => {
      renderCard(<RbmRunbookProgress items={[item('Core network cutover')]} timeZone="UTC" />, 'dense');
      expect(screen.getByText('5 / 16')).toBeInTheDocument();
      expect(screen.getByText('25 Oct 03:00')).toBeInTheDocument();
      expect(screen.queryByText('24 Oct 22:30')).not.toBeInTheDocument();
    });
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

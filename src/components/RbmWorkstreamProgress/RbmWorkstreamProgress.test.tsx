import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmWorkstreamProgress.tsx?raw';
import {
  RbmWorkstreamProgress,
  WORKSTREAM_ROW_LIMIT,
  byStart,
  formatWhen,
  issuesText,
  percentComplete,
  workstreamSummary,
  type RbmWorkstreamProgressItem,
} from './RbmWorkstreamProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import type { DensityLevel } from '../../theme/tokens';

const renderCard = (ui: ReactElement, level?: DensityLevel) =>
  render(<ThemeProvider theme={rbmTheme}>{level ? <RbmDensity level={level}>{ui}</RbmDensity> : ui}</ThemeProvider>);
const all = mockWorkstreamProgress();
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

  it('is 0% for a workstream with no tasks', () => {
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

describe('workstreamSummary', () => {
  it('names the row as the brief does', () => {
    expect(workstreamSummary(item('Network'), 'UTC')).toBe(
      'Network, 31% complete, 5 of 16 tasks, Active, Late, 1 high, 2 medium issues, owner R. Patel, 24 Oct 22:30 to 25 Oct 03:00',
    );
  });

  it('leaves out Late when the Planning engine has not set it', () => {
    expect(workstreamSummary(item('Infrastructure'), 'UTC')).not.toContain('Late');
  });
});

describe('RbmWorkstreamProgress', () => {
  it('is a region named by its title, with the workstreams as a list', () => {
    renderCard(<RbmWorkstreamProgress items={all} timeZone="UTC" />);
    const region = screen.getByRole('region', { name: 'Workstream progress' });
    expect(within(region).getByRole('list', { name: 'Workstream progress' })).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem')).toHaveLength(WORKSTREAM_ROW_LIMIT);
  });

  it('takes another title', () => {
    renderCard(<RbmWorkstreamProgress items={all} title="Readiness by workstream" />);
    expect(screen.getByRole('region', { name: 'Readiness by workstream' })).toBeInTheDocument();
  });

  it('orders by start time, earliest first, whatever order the data comes in', () => {
    renderCard(<RbmWorkstreamProgress items={[...all].reverse()} timeZone="UTC" />);
    const names = bars().map((b) => b.getAttribute('aria-label')!.split(',')[0]);
    expect(names).toEqual([...all].sort(byStart).slice(0, 10).map((w) => w.name));
    expect(names.slice(0, 3)).toEqual(['Infrastructure', 'Platform engineering', 'Network']);
  });

  it('breaks a tie in start time by name', () => {
    const [a, b] = [item('Platform engineering'), item('Infrastructure')];
    expect([a, b].sort(byStart).map((w) => w.name)).toEqual(['Infrastructure', 'Platform engineering']);
  });

  it('shows ten rows at most, then "+n more workstreams", and says so in the caption', () => {
    renderCard(<RbmWorkstreamProgress items={all} />);
    expect(bars()).toHaveLength(10);
    expect(screen.getByText('+2 more workstreams')).toBeInTheDocument();
    expect(screen.getByText('Ordered by start time · 10 of 12 shown')).toBeInTheDocument();
  });

  it('says "+1 more workstream" for one', () => {
    renderCard(<RbmWorkstreamProgress items={mockWorkstreamProgress(11)} />);
    expect(screen.getByText('+1 more workstream')).toBeInTheDocument();
  });

  it('shows no "more" line when every workstream fits', () => {
    renderCard(<RbmWorkstreamProgress items={mockWorkstreamProgress(4)} />);
    expect(screen.queryByText(/more workstream/)).not.toBeInTheDocument();
    expect(screen.getByText('Ordered by start time · 4 of 4 shown')).toBeInTheDocument();
  });

  it('gives each bar its value, from 0 to 100', () => {
    renderCard(<RbmWorkstreamProgress items={[item('Network')]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '31');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('fills Brand Green only for a Complete workstream, and Blue Dark otherwise', () => {
    const almost: RbmWorkstreamProgressItem = { ...item('Infrastructure'), complete: 50, total: 50 };
    renderCard(<RbmWorkstreamProgress items={[item('Platform engineering'), almost, item('Network')]} />);
    const fills = screen.getAllByTestId('rbm-progress-fill');
    expect(fills.map((f) => f.dataset.fill)).toEqual(['active', 'complete', 'active']);
    expect(fills[1]).toHaveStyle({ backgroundColor: 'rgb(132, 204, 22)' });
    expect(fills[0]).toHaveStyle({ backgroundColor: 'rgb(53, 75, 168)' });
  });

  it('shows the state as a word, and Late beside it only when the engine sets it', () => {
    renderCard(<RbmWorkstreamProgress items={[item('Network'), item('Infrastructure')]} />);
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getAllByText('Late')).toHaveLength(1);
  });

  it.each([
    ['Backup and recovery', 'Paused'],
    ['Database', 'Scheduled'],
    ['Platform engineering', 'Complete'],
  ])('shows %s as %s, with the Icon suite icon', (name, label) => {
    const { container } = renderCard(<RbmWorkstreamProgress items={[item(name)]} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.querySelector(`[data-icon="state.${label.toLowerCase()}"]`)).not.toBeNull();
  });

  it('shows the issue counts, with a severity dot only on a count above zero', () => {
    renderCard(<RbmWorkstreamProgress items={[item('Network')]} />);
    expect(screen.getByTestId('rbm-issue-dot-high')).toBeInTheDocument();
    expect(screen.getByTestId('rbm-issue-dot-medium')).toBeInTheDocument();
    expect(screen.queryByTestId('rbm-issue-dot-low')).not.toBeInTheDocument();
  });

  it('shows the task counts: done, to do and total', () => {
    renderCard(<RbmWorkstreamProgress items={[item('Network')]} />);
    for (const n of ['5', '11', '16']) expect(screen.getByText(n)).toBeInTheDocument();
  });

  it('shows the owner and start over end at D1', () => {
    renderCard(<RbmWorkstreamProgress items={[item('Network')]} timeZone="UTC" />);
    expect(screen.getByText('R. Patel')).toBeInTheDocument();
    expect(screen.getByText('24 Oct 22:30')).toBeInTheDocument();
    expect(screen.getByText('25 Oct 03:00')).toBeInTheDocument();
    expect(screen.getByText('Start / end')).toBeInTheDocument();
  });

  it('is announced as loading, with three grey rows', () => {
    renderCard(<RbmWorkstreamProgress items={[]} loading />);
    const region = screen.getByRole('region', { name: 'Workstream progress' });
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(within(region).getByText('Loading workstreams')).toBeInTheDocument();
    expect(bars()).toHaveLength(0);
    expect(screen.queryByText('No workstreams yet.')).not.toBeInTheDocument();
  });

  it('says "No workstreams yet." when there are none', () => {
    renderCard(<RbmWorkstreamProgress items={[]} />);
    expect(screen.getByText('No workstreams yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Ordered by start time/)).not.toBeInTheDocument();
  });

  it('has no click-through: the only control is the stats button', () => {
    const { container } = renderCard(<RbmWorkstreamProgress items={all} />);
    expect(container.querySelectorAll('button, a, [tabindex]')).toHaveLength(1);
    expect(container.querySelector('button')).toHaveAccessibleName('Hide task and issue stats');
  });

  describe('by density', () => {
    it('D0 shows Essential only: workstream, progress and status', () => {
      renderCard(<RbmWorkstreamProgress items={[item('Network')]} timeZone="UTC" />, 'command');
      expect(screen.getByText('Late')).toBeInTheDocument();
      expect(screen.queryByText('R. Patel')).not.toBeInTheDocument();
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
      expect(screen.queryByText('25 Oct 03:00')).not.toBeInTheDocument();
      // The accessible name still carries every field.
      expect(screen.getByRole('progressbar', { name: /owner R\. Patel/ })).toBeInTheDocument();
    });

    it('D2 shows owner initials, and Start and End in their own columns', () => {
      renderCard(<RbmWorkstreamProgress items={[item('Network')]} timeZone="UTC" />, 'compact');
      expect(screen.getByText('RP')).toBeInTheDocument();
      expect(screen.queryByText('R. Patel')).not.toBeInTheDocument();
      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });

    it('D3 is one line: done of total and the end, with no start', () => {
      renderCard(<RbmWorkstreamProgress items={[item('Network')]} timeZone="UTC" />, 'dense');
      expect(screen.getByText('5 / 16')).toBeInTheDocument();
      expect(screen.getByText('25 Oct 03:00')).toBeInTheDocument();
      expect(screen.queryByText('24 Oct 22:30')).not.toBeInTheDocument();
    });
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

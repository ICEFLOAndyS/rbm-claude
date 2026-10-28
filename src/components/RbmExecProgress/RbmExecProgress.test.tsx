import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmExecProgress.tsx?raw';
import userEvent from '@testing-library/user-event';
import { DEFAULT_NAME_WIDTH, RbmExecProgress, execProgressMinWidth, type RbmExecProgressNoun } from './RbmExecProgress';
import { RbmRunbookProgress } from '../RbmRunbookProgress/RbmRunbookProgress';
import { RbmWorkstreamProgress } from '../RbmWorkstreamProgress/RbmWorkstreamProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import type { DensityLevel } from '../../theme/tokens';

const renderCard = (ui: ReactElement, level?: DensityLevel) =>
  render(<ThemeProvider theme={rbmTheme}>{level ? <RbmDensity level={level}>{ui}</RbmDensity> : ui}</ThemeProvider>);
const team: RbmExecProgressNoun = { one: 'team', many: 'teams' };
const items = mockWorkstreamProgress();

/** The first column of the header row's grid template, in px. */
const nameColumn = () => {
  const header = screen.getByText('Progress', { selector: 'span' }).parentElement!;
  return parseInt(getComputedStyle(header).gridTemplateColumns, 10);
};

describe('RbmExecProgress', () => {
  it('takes its title and noun from the caller', () => {
    renderCard(<RbmExecProgress items={items} title="Team progress" noun={team} />);
    expect(screen.getByRole('region', { name: 'Team progress' })).toBeInTheDocument();
    expect(screen.getByText('Team and owner')).toBeInTheDocument();
    expect(screen.getByText('+2 more teams')).toBeInTheDocument();
  });

  it('uses the singular for one more', () => {
    renderCard(<RbmExecProgress items={items.slice(0, 11)} title="Team progress" noun={team} />);
    expect(screen.getByText('+1 more team')).toBeInTheDocument();
  });

  it('uses the noun in the empty text and the loading label', () => {
    const { rerender } = renderCard(<RbmExecProgress items={[]} title="Team progress" noun={team} />);
    expect(screen.getByText('No teams yet.')).toBeInTheDocument();
    rerender(<ThemeProvider theme={rbmTheme}><RbmExecProgress items={[]} title="Team progress" noun={team} loading /></ThemeProvider>);
    expect(screen.getByText('Loading teams')).toBeInTheDocument();
  });

  it.each(['command', 'dense'] as const)('capitalises the noun for the name heading at %s', (level) => {
    renderCard(<RbmExecProgress items={items} title="Team progress" noun={team} />, level);
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  describe('name column', () => {
    it.each([
      ['comfortable', 180],
      ['compact', 170],
      ['dense', 150],
    ] as const)('defaults to Workstream progress at %s: %i px', (level, px) => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} />, level);
      expect(nameColumn()).toBe(px);
      expect(DEFAULT_NAME_WIDTH[level]).toBe(px);
    });

    it('takes the widths it is given', () => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} nameWidth={{ comfortable: 230, compact: 190, dense: 190 }} />);
      expect(nameColumn()).toBe(230);
    });

    it('is 280 px at D0 whatever it is given', () => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} nameWidth={{ comfortable: 230, compact: 190, dense: 190 }} />, 'command');
      expect(nameColumn()).toBe(280);
    });
  });

  describe('the two cards built on it', () => {
    it.each([
      ['comfortable', 180, 230],
      ['compact', 170, 190],
      ['dense', 150, 190],
    ] as const)('at %s: Workstream progress %i px, Runbook progress %i px, as drawn', (level, workstream, runbook) => {
      const { unmount } = renderCard(<RbmWorkstreamProgress items={items} />, level);
      expect(nameColumn()).toBe(workstream);
      unmount();
      renderCard(<RbmRunbookProgress items={mockRunbookProgress()} />, level);
      expect(nameColumn()).toBe(runbook);
    });
  });

  describe('task and issue stats, shown or hidden', () => {
    const headings = () => Array.from(screen.getByText('Progress', { selector: 'span' }).parentElement!.children).map((c) => c.textContent);
    const columnCount = () => getComputedStyle(screen.getByText('Progress', { selector: 'span' }).parentElement!).gridTemplateColumns.split(' ').length;

    it('shows them by default, with the two-level header at D2', () => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} />, 'compact');
      expect(headings()).toEqual(['Team', 'Progress', 'Owner', 'Done', 'To do', 'Total', 'High', 'Medium', 'Low', 'Start', 'End', 'Status']);
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Open issues')).toBeInTheDocument();
    });

    it.each([
      ['comfortable', ['Team and owner', 'Progress', 'Start / end', 'Status']],
      ['compact', ['Team', 'Progress', 'Owner', 'Start', 'End', 'Status']],
      ['dense', ['Team', 'Progress', 'Owner', 'End', 'Status']],
    ] as const)('hidden at %s: the stat columns go and the bar takes their width', (level, expected) => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} showStats={false} />, level);
      expect(headings()).toEqual(expected);
      expect(columnCount()).toBe(expected.length);
      expect(screen.queryByText('Tasks')).toBeNull();
      expect(screen.queryByTestId('rbm-issue-dot-high')).toBeNull();
      // The bar is the one flexible column.
      expect(getComputedStyle(screen.getByText('Progress', { selector: 'span' }).parentElement!).gridTemplateColumns).toContain('minmax(0,1fr)');
    });

    it('keeps every figure for a screen reader when hidden', () => {
      renderCard(<RbmExecProgress items={items} title="T" noun={team} showStats={false} />, 'compact');
      expect(screen.getAllByRole('progressbar')[0]).toHaveAccessibleName(/of \d+ tasks, .*(issue|no open issues)/);
    });

    it('toggles from the header, and keeps the choice itself without showStats', async () => {
      const onShowStatsChange = vi.fn();
      renderCard(<RbmExecProgress items={items} title="T" noun={team} onShowStatsChange={onShowStatsChange} />, 'compact');
      await userEvent.click(screen.getByRole('button', { name: 'Hide task and issue stats' }));
      expect(onShowStatsChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByText('Done')).toBeNull();
      expect(screen.getByRole('button', { name: 'Show task and issue stats' })).toHaveTextContent('Show stats');
      await userEvent.click(screen.getByRole('button', { name: 'Show task and issue stats' }));
      expect(onShowStatsChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('has no stats and no button at D0, or when there are no rows', () => {
      const { unmount } = renderCard(<RbmExecProgress items={items} title="T" noun={team} />, 'command');
      expect(screen.queryByRole('button')).toBeNull();
      unmount();
      renderCard(<RbmExecProgress items={[]} title="T" noun={team} />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('needs less width hidden, by the stat columns and their gaps', () => {
      // D2: Done, To do, Total (40 each), High 40, Medium 54, Low 38, and six 12 px gaps.
      expect(execProgressMinWidth('compact') - execProgressMinWidth('compact', { showStats: false })).toBe(40 * 4 + 54 + 38 + 6 * 12);
      expect(execProgressMinWidth('command', { showStats: false })).toBe(execProgressMinWidth('command'));
    });
  });

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

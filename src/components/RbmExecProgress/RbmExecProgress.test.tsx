import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import source from './RbmExecProgress.tsx?raw';
import { DEFAULT_NAME_WIDTH, RbmExecProgress, type RbmExecProgressNoun } from './RbmExecProgress';
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

  it('has no hex colours: they come from the theme tokens', () => {
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

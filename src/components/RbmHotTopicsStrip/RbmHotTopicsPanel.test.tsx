import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { HOT_TOPICS_PANEL_WIDTH, HOT_TOPICS_RAIL_WIDTH, RbmHotTopicsPanel } from './RbmHotTopicsPanel';
import { hotTopicsSummary } from './RbmHotTopicsStrip';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers } from './cards';
import { hotTopicsNow, mockBlockers, mockMilestones, mockNextCheckpoint, mockPeople, mockWatchers } from '../../mocks/hotTopics';
import { rbmTheme } from '../../theme/theme';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const data = { blockers: mockBlockers(), nextCheckpoint: mockNextCheckpoint(), milestones: mockMilestones(), collaboration: { live: true }, watchers: mockWatchers() };

function Panel(props: { collapsed?: boolean; onCollapsedChange?: (c: boolean) => void }) {
  return (
    <RbmHotTopicsPanel {...props} summary={hotTopicsSummary(data, hotTopicsNow)}>
      <RbmBlockers blockers={mockBlockers()} />
      <RbmNextCheckpoint checkpoint={mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" />
      <RbmMilestones milestones={mockMilestones()} timeZone="UTC" />
      <RbmCollaboration live people={mockPeople()} />
      <RbmWatchers watchers={mockWatchers()} timeZone="UTC" />
    </RbmHotTopicsPanel>
  );
}

/** Makes every media query match, as on a screen narrower than 1200 px. */
function narrowScreen() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ matches: true, media: query, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('RbmHotTopicsPanel', () => {
  it('stacks the five cards in one column, in urgency order, and stays in view as the page scrolls', () => {
    renderUi(<Panel />);
    const panel = screen.getByRole('region', { name: 'Hot-topics panel' });
    const cards = within(screen.getByTestId('rbm-hot-topics-cards')).getAllByRole('region').filter((r) => r.parentElement?.parentElement === screen.getByTestId('rbm-hot-topics-cards'));
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(['Blockers', 'Next checkpoint', 'Milestones', 'Collaboration', 'Watchers']);
    expect(panel).toHaveStyle({ position: 'sticky', width: `${HOT_TOPICS_PANEL_WIDTH}px` });
    expect(screen.getByTestId('rbm-hot-topics-cards')).toHaveStyle({ overflowY: 'auto' });
  });

  it('collapses to a rail with one count per card, and expands again', async () => {
    const onCollapsedChange = vi.fn();
    const { rerender } = renderUi(<Panel onCollapsedChange={onCollapsedChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Hot-topics panel' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);

    rerender(<ThemeProvider theme={rbmTheme}><Panel collapsed onCollapsedChange={onCollapsedChange} /></ThemeProvider>);
    const rail = screen.getByRole('region', { name: 'Hot-topics panel' });
    expect(rail).toHaveAttribute('data-collapsed', 'true');
    expect(rail).toHaveStyle({ width: `${HOT_TOPICS_RAIL_WIDTH}px`, position: 'sticky' });
    expect(within(rail).queryByRole('region', { name: 'Blockers' })).not.toBeInTheDocument();
    const summary = within(rail).getByRole('list', { name: 'Hot-topics panel summary' });
    expect(within(summary).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(hotTopicsSummary(data, hotTopicsNow).map((i) => `${i.label} ${i.value}`));
    // Words, not only a number: each count carries its card's name.
    expect(within(summary).getByRole('listitem', { name: 'Blockers 2' })).toHaveTextContent('Blockers2');

    await userEvent.click(within(rail).getByRole('button', { name: 'Expand Hot-topics panel' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps its own open state when the page does not hold it', async () => {
    renderUi(<Panel />);
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Hot-topics panel' }));
    expect(screen.getByRole('region', { name: 'Hot-topics panel' })).toHaveAttribute('data-collapsed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Expand Hot-topics panel' }));
    expect(screen.getByRole('region', { name: 'Blockers' })).toBeInTheDocument();
  });

  it('becomes the strip under the main column on a screen narrower than 1200 px, with the same name and state', async () => {
    const restore = narrowScreen();
    try {
      const onCollapsedChange = vi.fn();
      renderUi(<Panel onCollapsedChange={onCollapsedChange} />);
      const strip = screen.getByRole('region', { name: 'Hot-topics panel' });
      expect(strip).not.toHaveStyle({ position: 'sticky' });
      expect(screen.queryByTestId('rbm-hot-topics-cards')).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Collapse Hot-topics panel' }));
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
      expect(screen.getByRole('list', { name: 'Hot-topics panel summary' })).toBeInTheDocument();
    } finally {
      restore();
    }
  });
});

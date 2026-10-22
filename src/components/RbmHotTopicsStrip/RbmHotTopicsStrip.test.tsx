import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmHotTopicsStrip, hotTopicsSummary } from './RbmHotTopicsStrip';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers, countdown } from './cards';
import { hotTopicsNow, mockBlockers, mockMilestones, mockNextCheckpoint, mockPeople, mockWatchers } from '../../mocks/hotTopics';
import { at } from '../../mocks/eventRibbon';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderUi = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);
const card = (name: string) => screen.getByRole('region', { name });

describe('countdown', () => {
  it('counts down to the planned time as "in hh:mm", then reads "now"', () => {
    expect(countdown(at('05:45'), hotTopicsNow)).toBe('in 02:05');
    expect(countdown(at('03:40'), hotTopicsNow)).toBe('now');
  });
});

describe('RbmHotTopicsStrip', () => {
  const data = { blockers: mockBlockers(), nextCheckpoint: mockNextCheckpoint(), milestones: mockMilestones(), collaboration: { live: true }, watchers: mockWatchers() };

  it('summarises each card with the number its header shows', () => {
    expect(hotTopicsSummary(data, hotTopicsNow)).toEqual([
      { label: 'Blockers', value: String(data.blockers.length) },
      { label: 'Next checkpoint', value: countdown(data.nextCheckpoint.at, hotTopicsNow) },
      { label: 'Milestones', value: String(data.milestones.length) },
      { label: 'Collaboration', value: 'Live' },
      { label: 'Watchers', value: String(data.watchers.length) },
    ]);
    expect(hotTopicsSummary({ ...data, nextCheckpoint: undefined, collaboration: { live: false } }, hotTopicsNow).map((i) => i.value)).toContain('none');
  });

  it('collapses as a whole to one line of chips, and expands again', async () => {
    const onCollapsedChange = vi.fn();
    renderUi(
      <RbmHotTopicsStrip onCollapsedChange={onCollapsedChange} summary={hotTopicsSummary(data, hotTopicsNow)}>
        <RbmBlockers blockers={mockBlockers()} />
        <RbmWatchers watchers={mockWatchers()} timeZone="UTC" />
      </RbmHotTopicsStrip>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Hot-topics strip' }));
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    expect(screen.queryByRole('region', { name: 'Blockers' })).not.toBeInTheDocument();
    const chips = within(screen.getByRole('list', { name: 'Hot-topics strip summary' })).getAllByRole('listitem');
    expect(chips).toHaveLength(5);
    expect(chips[1]).toHaveAccessibleName('Next checkpoint in 02:05');
    await userEvent.click(screen.getByRole('button', { name: 'Expand Hot-topics strip' }));
    expect(screen.getByRole('region', { name: 'Blockers' })).toBeInTheDocument();
  });

  it('has no collapse on the cards themselves: the strip collapses as a whole', () => {
    renderUi(<RbmWatchers watchers={mockWatchers()} timeZone="UTC" />);
    expect(screen.queryByRole('button', { name: /Collapse/ })).not.toBeInTheDocument();
  });

  it('shows the five cards in order of urgency', () => {
    renderUi(
      <RbmHotTopicsStrip>
        <RbmBlockers blockers={mockBlockers()} />
        <RbmNextCheckpoint checkpoint={mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" />
        <RbmMilestones milestones={mockMilestones()} timeZone="UTC" />
        <RbmCollaboration live people={mockPeople()} />
        <RbmWatchers watchers={mockWatchers()} timeZone="UTC" />
      </RbmHotTopicsStrip>,
    );
    const strip = screen.getByRole('region', { name: 'Hot-topics strip' });
    expect(within(strip).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Blockers', 'Next checkpoint', 'Milestones', 'Collaboration', 'Watchers']);
  });
});

describe('RbmBlockers', () => {
  it('lists each blocker with its record, severity in words and the tasks it holds', () => {
    renderUi(<RbmBlockers blockers={mockBlockers()} />);
    expect(within(card('Blockers')).getByLabelText('2 items')).toBeInTheDocument();
    const first = screen.getByRole('button', { name: 'BLK-102 Waiting on vendor, high, Holds 1.4.2 · 3 tasks' });
    expect(within(first).getByText('High')).toHaveStyle({ color: colour.redInner });
    expect(screen.getByText('Holds 2.1.7')).toBeInTheDocument();
  });

  it('shows three items, then "n more"', async () => {
    const onShowMore = vi.fn();
    const many = [...mockBlockers(), ...mockBlockers().map((b) => ({ ...b, id: `${b.id}x`, recordId: `${b.recordId}X` }))];
    renderUi(<RbmBlockers blockers={many} onShowMore={onShowMore} />);
    expect(within(card('Blockers')).getAllByRole('button', { name: /^BLK/ })).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: '1 more' }));
    expect(onShowMore).toHaveBeenCalledOnce();
  });

  it('opens a blocker in the slide-in, and offers Raise only when allowed', async () => {
    const onOpen = vi.fn();
    const { unmount } = renderUi(<RbmBlockers blockers={mockBlockers()} onOpen={onOpen} />);
    expect(screen.queryByRole('button', { name: 'Raise a blocker' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^BLK-202/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ recordId: 'BLK-202' }));
    unmount();
    renderUi(<RbmBlockers blockers={mockBlockers()} onRaise={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Raise a blocker' })).toBeInTheDocument();
  });

  it('collapses to its header with a zero count when there are none', () => {
    renderUi(<RbmBlockers blockers={[]} />);
    expect(within(card('Blockers')).getByLabelText('0 items')).toHaveTextContent('0');
    expect(within(card('Blockers')).queryByRole('button', { name: /Collapse/ })).not.toBeInTheDocument();
  });
});

describe('severity', () => {
  it.each([
    ['high', 'High', colour.redInner],
    ['medium', 'Medium', colour.amberDeep],
    ['low', 'Low', colour.slate],
  ] as const)('shows %s as a dot and the word %s', (severity, word, text) => {
    renderUi(<RbmBlockers blockers={[{ ...mockBlockers()[0]!, severity }]} />);
    expect(screen.getByText(word)).toHaveStyle({ color: text });
  });
});

describe('RbmNextCheckpoint', () => {
  it('shows the checkpoint, its countdown, and its forecast beside the plan', () => {
    renderUi(<RbmNextCheckpoint checkpoint={mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" />);
    expect(screen.getByText('Go / No-Go')).toBeInTheDocument();
    expect(screen.getByText('in 02:05')).toHaveStyle({ fontSize: '28px' });
    expect(screen.getByText('+12m')).toHaveStyle({ color: colour.amberDeep });
  });

  it('joins the call linked to the checkpoint', async () => {
    const onJoinCall = vi.fn();
    renderUi(<RbmNextCheckpoint checkpoint={mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" onJoinCall={onJoinCall} />);
    expect(screen.getByText('Call open · 4 joined')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Join the Go / No-Go call' }));
    expect(onJoinCall).toHaveBeenCalledOnce();
  });

  it('disables Join call and says when the call opens', () => {
    renderUi(<RbmNextCheckpoint checkpoint={{ ...mockNextCheckpoint(), call: { open: false, opensAt: at('05:30') } }} now={hotTopicsNow} timeZone="UTC" onJoinCall={vi.fn()} />);
    const join = screen.getByRole('button', { name: 'Join the Go / No-Go call, opens 05:30' });
    expect(join).toBeDisabled();
    expect(join).toHaveTextContent('Opens 05:30');
  });

  it('shows no Join call when the checkpoint has no call', () => {
    renderUi(<RbmNextCheckpoint checkpoint={{ ...mockNextCheckpoint(), call: undefined }} now={hotTopicsNow} timeZone="UTC" />);
    expect(screen.queryByRole('button', { name: /Join/ })).not.toBeInTheDocument();
  });

  it('collapses to its header when there is no checkpoint left', () => {
    renderUi(<RbmNextCheckpoint now={hotTopicsNow} />);
    expect(within(card('Next checkpoint')).getByLabelText('0 items')).toBeInTheDocument();
  });
});

describe('RbmMilestones', () => {
  it('greys a reached milestone and shows a late one in Amber Deep', () => {
    renderUi(<RbmMilestones milestones={mockMilestones()} timeZone="UTC" />);
    expect(screen.getByText('Infra failover complete')).toHaveStyle({ color: colour.slate });
    expect(screen.getByText('04:42')).toHaveStyle({ color: colour.amberDeep });
    expect(screen.getByRole('button', { name: 'Milestone 1.3.9 Application failover, Not started, 04:42, late' })).toBeInTheDocument();
  });
});

describe('RbmCollaboration', () => {
  it('shows who is on the call: four faces, then "+3"', () => {
    renderUi(<RbmCollaboration live people={mockPeople()} onJoinCall={vi.fn()} />);
    expect(screen.getByText('Live · 7 people')).toBeInTheDocument();
    const faces = screen.getByRole('list', { name: 'On the call' });
    expect(within(faces).getAllByRole('img')).toHaveLength(4);
    expect(within(faces).getByText('+3')).toHaveAccessibleName('and 3 more');
  });

  it('makes Join call a secondary button, never green', () => {
    renderUi(<RbmCollaboration live people={mockPeople()} onJoinCall={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Join the Collaboration call' })).toHaveStyle({ backgroundColor: colour.white, color: colour.deepBlue });
  });

  it('says so when there is no live call', () => {
    renderUi(<RbmCollaboration live={false} people={[]} />);
    expect(screen.getByText('No live call')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Join/ })).not.toBeInTheDocument();
  });
});

describe('RbmWatchers', () => {
  it('shows each watcher and since when', () => {
    renderUi(<RbmWatchers watchers={mockWatchers()} timeZone="UTC" />);
    expect(screen.getByRole('button', { name: 'Payroll Interface Monitoring, watching since 01:00' })).toBeInTheDocument();
  });

});

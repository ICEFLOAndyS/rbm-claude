import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { RbmCommandCentre, type RbmCommandCentreProps } from './RbmCommandCentre';
import { RbmEventVitals } from '../RbmEventVitals/RbmEventVitals';
import { RbmEventRibbon } from '../RbmEventRibbon/RbmEventRibbon';
import { RbmTaskTimeline } from '../RbmTaskTimeline/RbmTaskTimeline';
import { RbmHotTopicsStrip, hotTopicsSummary } from '../RbmHotTopicsStrip/RbmHotTopicsStrip';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers } from '../RbmHotTopicsStrip/cards';
import { DEFAULT_LAYOUT, type RbmRegion } from '../RbmLayoutPanel/RbmLayoutPanel';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockRibbon, ribbonNow, at } from '../../mocks/eventRibbon';
import { mockTimelineRunbooks, mockTimelineTasks } from '../../mocks/timeline';
import { tasksNow } from '../../mocks/tasks';
import { hotTopicsNow, mockBlockers, mockMilestones, mockNextCheckpoint, mockPeople, mockWatchers } from '../../mocks/hotTopics';
import { mockAlerts, mockEvent } from '../../mocks/event';

const meta: Meta<typeof RbmCommandCentre> = {
  title: 'Command/RbmCommandCentre',
  component: RbmCommandCentre,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof RbmCommandCentre>;

/** The whole page with mock data from the Command board. Scroll down to see the compact event bar. */
function Page({ layout: initial = DEFAULT_LAYOUT, collapsed: initialCollapsed = {}, ...over }: Partial<RbmCommandCentreProps> & { layout?: RbmRegion[]; collapsed?: Partial<Record<RbmRegion, boolean>> }) {
  const [layout, setLayout] = useState<RbmRegion[]>(initial);
  const [collapsed, setCollapsedState] = useState(initialCollapsed);
  const setCollapsed = (r: RbmRegion, c: boolean) => setCollapsedState((prev) => ({ ...prev, [r]: c }));
  return (
    <RbmCommandCentre
      event={{ ...mockEvent(), owner: 'Cutover Manager Team', window: { start: at('22:00'), end: at('06:00') } }}
      alerts={mockAlerts()}
      vitalsData={mockEventVitals()}
      timeZone="UTC"
      layout={layout}
      onLayoutChange={setLayout}
      collapsed={collapsed}
      onCollapsedChange={setCollapsed}
      eventActions={{ raiseIssue: fn(), raiseBlocker: fn(), addNote: fn(), notifyStakeholders: fn(), pauseEvent: fn(), exportLog: fn(), settings: fn() }}
      vitals={<RbmEventVitals data={mockEventVitals()} timeZone="UTC" onRaiseIssue={fn()} onOpenForecast={fn()} onOpenIssues={fn()} onOpenProgress={fn()} />}
      ribbon={<RbmEventRibbon runbooks={mockRibbon()} now={ribbonNow} timeZone="UTC" collapsed={!!collapsed.ribbon} onCollapsedChange={(c) => setCollapsed('ribbon', c)} />}
      timeline={<RbmTaskTimeline runbooks={mockTimelineRunbooks()} tasks={mockTimelineTasks()} now={tasksNow} timeZone="UTC" onAction={fn()} collapsed={!!collapsed.timeline} onCollapsedChange={(c) => setCollapsed('timeline', c)} />}
      hotTopics={
        <RbmHotTopicsStrip
          collapsed={!!collapsed.hotTopics}
          onCollapsedChange={(c) => setCollapsed('hotTopics', c)}
          summary={hotTopicsSummary({ blockers: mockBlockers(), nextCheckpoint: mockNextCheckpoint(), milestones: mockMilestones(), collaboration: { live: true }, watchers: mockWatchers() }, hotTopicsNow)}
        >
          <RbmBlockers blockers={mockBlockers()} onRaise={fn()} onOpen={fn()} />
          <RbmNextCheckpoint checkpoint={mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" onJoinCall={fn()} />
          <RbmMilestones milestones={mockMilestones()} timeZone="UTC" />
          <RbmCollaboration live people={mockPeople()} onJoinCall={fn()} />
          <RbmWatchers watchers={mockWatchers()} timeZone="UTC" />
        </RbmHotTopicsStrip>
      }
      {...over}
    />
  );
}

/** As on the Command board, in the default order. */
export const Default: Story = { render: () => <Page /> };

/** Every movable region collapsed to its one line: the page fits on one screen. */
export const AllCollapsed: Story = { render: () => <Page collapsed={{ ribbon: true, timeline: true, hotTopics: true }} /> };

/** A user who put the Task Timeline first. */
export const TimelineFirst: Story = { render: () => <Page layout={['timeline', 'ribbon', 'hotTopics']} /> };

/** A user with few permissions: only Layout in the event actions menu. */
export const ReadOnly: Story = { render: () => <Page eventActions={{}} /> };

/** The event actions menu, open. */
export const ActionsMenuOpen: Story = {
  render: () => <Page />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Event actions' }));
  },
};

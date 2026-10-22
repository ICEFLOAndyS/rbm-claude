import type { Meta, StoryObj } from '@storybook/react-vite';
import { RbmDensity } from '../../theme/RbmDensity';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmHotTopicsStrip, hotTopicsSummary } from './RbmHotTopicsStrip';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers } from './cards';
import { hotTopicsNow, mockBlockers, mockMilestones, mockNextCheckpoint, mockPeople, mockWatchers } from '../../mocks/hotTopics';
import { at } from '../../mocks/eventRibbon';

const meta: Meta<typeof RbmHotTopicsStrip> = {
  title: 'Command/RbmHotTopicsStrip',
  // A D2 Compact region of the Command Centre (mixed by region, 22 Oct 2026).
  decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>],
  component: RbmHotTopicsStrip,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<typeof RbmHotTopicsStrip>;

type Overrides = Partial<{
  blockers: ReturnType<typeof mockBlockers>;
  checkpoint: ReturnType<typeof mockNextCheckpoint> | undefined;
  milestones: ReturnType<typeof mockMilestones>;
  live: boolean;
  watchers: ReturnType<typeof mockWatchers>;
}>;

function Strip({ width = 1136, o = {}, collapsed }: { width?: number; o?: Overrides; collapsed?: boolean }) {
  const summary = hotTopicsSummary(
    { blockers: o.blockers ?? mockBlockers(), nextCheckpoint: 'checkpoint' in o ? o.checkpoint : mockNextCheckpoint(), milestones: o.milestones ?? mockMilestones(), collaboration: { live: o.live ?? true }, watchers: o.watchers ?? mockWatchers() },
    hotTopicsNow,
  );
  return (
    <Box sx={{ maxWidth: width }}>
      <RbmHotTopicsStrip collapsed={collapsed} onCollapsedChange={collapsed === undefined ? undefined : fn()} summary={summary}>
        <RbmBlockers blockers={o.blockers ?? mockBlockers()} onOpen={fn()} onRaise={fn()} onShowMore={fn()} />
        <RbmNextCheckpoint checkpoint={'checkpoint' in o ? o.checkpoint : mockNextCheckpoint()} now={hotTopicsNow} timeZone="UTC" onOpen={fn()} onJoinCall={fn()} />
        <RbmMilestones milestones={o.milestones ?? mockMilestones()} timeZone="UTC" onOpen={fn()} onShowMore={fn()} />
        <RbmCollaboration live={o.live ?? true} people={mockPeople()} onJoinCall={fn()} />
        <RbmWatchers watchers={o.watchers ?? mockWatchers()} timeZone="UTC" onOpen={fn()} />
      </RbmHotTopicsStrip>
    </Box>
  );
}

/** As on the Command board. */
export const Drawn: Story = { render: () => <Strip /> };

/** Collapsed as a whole to one line: one chip per card with the number its header shows. Not drawn; follows the ribbon's collapsed line. */
export const Collapsed: Story = { render: () => <Strip collapsed /> };

/** More than three items: "n more". A card with nothing in it collapses to its header with a zero count. */
export const MoreAndEmpty: Story = {
  render: () => (
    <Strip
      o={{
        blockers: [...mockBlockers(), { id: 'b3', recordId: 'BLK-305', title: 'Firewall change pending', severity: 'medium', holds: { wbs: '2.1.9', tasks: 2 } }, { id: 'b4', recordId: 'BLK-311', title: 'Licence key expired', severity: 'low', holds: { wbs: '3.1.2', tasks: 1 } }],
        watchers: [],
      }}
    />
  ),
};

/** The checkpoint call is not open yet: Join call is disabled and says when it opens. */
export const CallNotOpenYet: Story = {
  render: () => <Strip o={{ checkpoint: { ...mockNextCheckpoint(), call: { open: false, opensAt: at('05:30') } } }} />,
};

/** The checkpoint has no call: no button. Collaboration has no live call. */
export const NoCalls: Story = { render: () => <Strip o={{ checkpoint: { ...mockNextCheckpoint(), call: undefined }, live: false }} /> };

/** No checkpoint left. */
export const NoCheckpoint: Story = { render: () => <Strip o={{ checkpoint: undefined }} /> };

/** Narrow the browser window below 1200 px for two rows of cards, and below 900 px to stack them. */
export const Responsive: Story = { render: () => <Strip width={2000} /> };

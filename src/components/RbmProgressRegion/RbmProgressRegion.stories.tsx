import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { RbmProgressRegion } from './RbmProgressRegion';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { RbmDensity } from '../../theme/RbmDensity';

/**
 * The Exec Briefing Centre's Progress region: Runbook progress and Workstream progress side by side while there is
 * room for both at their drawn sizes, stacked when there is not. Not drawn (Proposed).
 */
const meta: Meta<typeof RbmProgressRegion> = {
  title: 'Exec Briefing Centre/RbmProgressRegion',
  component: RbmProgressRegion,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>],
  args: { runbooks: mockRunbookProgress(5), workstreams: mockWorkstreamProgress(), timeZone: 'UTC' },
};
export default meta;

type Story = StoryObj<typeof RbmProgressRegion>;

function Toggling(args: Parameters<typeof RbmProgressRegion>[0]) {
  const [collapsed, setCollapsed] = useState(args.collapsed ?? false);
  return <RbmProgressRegion {...args} collapsed={collapsed} onCollapsedChange={setCollapsed} />;
}

/** The default, stats hidden: at 1,500 px the two cards fit side by side. "Show stats" on either widens it. */
export const SideBySide: Story = { decorators: [(Story) => <Box sx={{ width: 1500 }}><Story /></Box>], render: (args) => <Toggling {...args} /> };

/** Narrower than two cards: Runbook progress, then Workstream progress. */
export const Stacked: Story = { decorators: [(Story) => <Box sx={{ width: 1200 }}><Story /></Box>], render: (args) => <Toggling {...args} /> };

/** Collapsed: the 56 px line with the counts. */
export const Collapsed: Story = { args: { collapsed: true }, render: (args) => <Toggling {...args} /> };

export const Loading: Story = { args: { loading: true }, render: (args) => <Toggling {...args} /> };

/** Both cards' stats shown: each needs its full width, so they sit side by side only at 2,100 px or more. */
export const StatsShown: Story = {
  args: { stats: { runbooks: true, workstreams: true } },
  decorators: [(Story) => <Box sx={{ width: 2200 }}><Story /></Box>],
};

/** One card's stats shown: it widens, the other stays narrow. */
export const OneShown: Story = {
  args: { stats: { runbooks: false, workstreams: true } },
  decorators: [(Story) => <Box sx={{ width: 2000 }}><Story /></Box>],
};

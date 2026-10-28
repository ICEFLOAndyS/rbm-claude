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

/** Wide enough for both cards (2,200 px): side by side. */
export const SideBySide: Story = { decorators: [(Story) => <Box sx={{ width: 2200 }}><Story /></Box>], render: (args) => <Toggling {...args} /> };

/** Narrower than two cards: Runbook progress, then Workstream progress. */
export const Stacked: Story = { decorators: [(Story) => <Box sx={{ width: 1200 }}><Story /></Box>], render: (args) => <Toggling {...args} /> };

/** Collapsed: the 56 px line with the counts. */
export const Collapsed: Story = { args: { collapsed: true }, render: (args) => <Toggling {...args} /> };

export const Loading: Story = { args: { loading: true }, render: (args) => <Toggling {...args} /> };

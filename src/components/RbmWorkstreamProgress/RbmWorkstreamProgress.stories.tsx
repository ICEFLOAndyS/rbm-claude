import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmWorkstreamProgress } from './RbmWorkstreamProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { RbmDensity } from '../../theme/RbmDensity';

const all = mockWorkstreamProgress();
const pick = (...names: string[]) => all.filter((w) => names.includes(w.name));

const meta: Meta<typeof RbmWorkstreamProgress> = {
  title: 'Executive Briefing/RbmWorkstreamProgress',
  component: RbmWorkstreamProgress,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: { items: all, timeZone: 'UTC' },
};
export default meta;

type Story = StoryObj<typeof RbmWorkstreamProgress>;

/** As on the Progress board at D1: ten rows, then "+2 more workstreams". */
export const MoreThanTen: Story = {};

export const Complete: Story = { args: { items: pick('Platform engineering') } };
export const Active: Story = { args: { items: pick('Infrastructure') } };
export const ActiveAndLate: Story = { args: { items: pick('Network') } };
export const Paused: Story = { args: { items: pick('Backup and recovery') } };
export const Scheduled: Story = { args: { items: pick('Database') } };
export const ZeroIssues: Story = { args: { items: pick('Platform engineering', 'Database') } };
export const Mixed: Story = { args: { items: mockWorkstreamProgress(6) } };

/** A name too long for the column is cut with an ellipsis; the full name is in the tooltip and the accessible name. */
export const LongName: Story = {
  args: { items: [{ ...all[2]!, name: 'Network core and edge routing, including the second data centre' }] },
};

export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { items: [] } };

/** Essential only, for a wall display. */
export const D0Command: Story = { decorators: [(Story) => <RbmDensity level="command"><Story /></RbmDensity>] };
export const D1Comfortable: Story = { decorators: [(Story) => <RbmDensity level="comfortable"><Story /></RbmDensity>] };
export const D2Compact: Story = { decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>] };
/** One line per workstream: no start time. */
export const D3Dense: Story = { decorators: [(Story) => <RbmDensity level="dense"><Story /></RbmDensity>] };

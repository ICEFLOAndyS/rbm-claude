import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmRunbookProgress } from './RbmRunbookProgress';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { RbmDensity } from '../../theme/RbmDensity';

const all = mockRunbookProgress();
const pick = (...names: string[]) => all.filter((w) => names.includes(w.name));

const meta: Meta<typeof RbmRunbookProgress> = {
  title: 'Executive Briefing/RbmRunbookProgress',
  component: RbmRunbookProgress,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: { items: all, timeZone: 'UTC' },
};
export default meta;

type Story = StoryObj<typeof RbmRunbookProgress>;

/** As on the Progress board at D1: ten rows, then "+2 more runbooks". */
export const MoreThanTen: Story = {};

export const Complete: Story = { args: { items: pick('Payments database failover') } };
export const Active: Story = { args: { items: pick('Application tier startup') } };
export const ActiveAndLate: Story = { args: { items: pick('Core network cutover') } };
export const Paused: Story = { args: { items: pick('Backup restore test') } };
export const Scheduled: Story = { args: { items: pick('Customer communications') } };
export const ZeroIssues: Story = { args: { items: pick('Payments database failover', 'Customer communications') } };
export const Mixed: Story = { args: { items: mockRunbookProgress(6) } };

/** A name too long for the column is cut with an ellipsis; the full name is in the tooltip and the accessible name. */
export const LongName: Story = {
  args: { items: [{ ...all[2]!, name: 'Core network cutover for the second data centre, including edge routing and firewall rules' }] },
};

export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: { items: [] } };

/** Essential only, for a wall display. */
export const D0Command: Story = { decorators: [(Story) => <RbmDensity level="command"><Story /></RbmDensity>] };
export const D1Comfortable: Story = { decorators: [(Story) => <RbmDensity level="comfortable"><Story /></RbmDensity>] };
export const D2Compact: Story = { decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>] };
/** One line per runbook: no start time. */
export const D3Dense: Story = { decorators: [(Story) => <RbmDensity level="dense"><Story /></RbmDensity>] };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmExecProgress } from './RbmExecProgress';
import { mockWorkstreamProgress } from '../../mocks/workstreamProgress';
import { mockRunbookProgress } from '../../mocks/runbookProgress';
import { RbmDensity } from '../../theme/RbmDensity';

/**
 * The shared card behind RbmWorkstreamProgress and RbmRunbookProgress. Every state is shown in their stories; these
 * show what the caller passes in: the title, the noun and the name column's widths.
 */
const meta: Meta<typeof RbmExecProgress> = {
  title: 'Executive Briefing/RbmExecProgress',
  component: RbmExecProgress,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: { items: mockWorkstreamProgress(), title: 'Workstream progress', noun: { one: 'workstream', many: 'workstreams' }, timeZone: 'UTC' },
};
export default meta;

type Story = StoryObj<typeof RbmExecProgress>;

/** The defaults: Workstream progress's name column (180, 170 and 150 px). */
export const Workstreams: Story = {};

/** The runbook words and the wider name column (230, 190 and 190 px). */
export const Runbooks: Story = {
  args: { items: mockRunbookProgress(), title: 'Runbook progress', noun: { one: 'runbook', many: 'runbooks' }, nameWidth: { comfortable: 230, compact: 190, dense: 190 } },
};

export const RunbooksD2: Story = { ...Runbooks, decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>] };
export const Empty: Story = { args: { items: [], title: 'Team progress', noun: { one: 'team', many: 'teams' } } };

/** The task and issue stats shown (hidden is the default): Tasks and Open issues come back and the bar narrows. */
export const StatsShown: Story = { args: { showStats: true }, decorators: [(Story) => <RbmDensity level="compact"><Story /></RbmDensity>] };

/** The longest states with Late: the Status column is one width for every state, and every Late lines up at its right. */
export const LongStates: Story = {
  args: {
    items: mockRunbookProgress(5).map((r, i) => ({ ...r, state: (['backingOut', 'suspended', 'scheduled', 'active', 'abandoned'] as const)[i]!, late: i !== 3 })),
    title: 'Runbook progress',
    noun: { one: 'runbook', many: 'runbooks' },
    nameWidth: { comfortable: 230, compact: 190, dense: 190 },
  },
  decorators: [(Story) => <RbmDensity level="compact"><Box sx={{ maxWidth: 700 }}><Story /></Box></RbmDensity>],
};

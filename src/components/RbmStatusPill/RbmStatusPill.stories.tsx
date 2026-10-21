import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmStatusPill } from './RbmStatusPill';
import type { RbmState } from '../../theme/tokens';

const meta: Meta<typeof RbmStatusPill> = {
  title: 'Base/RbmStatusPill',
  component: RbmStatusPill,
  argTypes: {
    size: { control: 'inline-radio', options: ['normal', 'compact'] },
  },
};
export default meta;

type Story = StoryObj<typeof RbmStatusPill>;

const notDrawn = {
  docs: {
    description: {
      story: 'Not drawn as a pill on the board. Built from the drawn pill and the Semantic board dot. Flagged for sign-off.',
    },
  },
};

// Drawn on the Command board.
export const Active: Story = { args: { state: 'active' } };
export const Complete: Story = { args: { state: 'complete' } };
export const NotStarted: Story = { args: { state: 'pending' } };

// Not drawn as a pill.
export const AtRisk: Story = { args: { state: 'atRisk' }, parameters: notDrawn };
export const Paused: Story = { args: { state: 'paused' }, parameters: notDrawn };
export const Blocked: Story = { args: { state: 'blocked' }, parameters: notDrawn };
export const Skipped: Story = { args: { state: 'skipped' }, parameters: notDrawn };

/** The compact event bar size (24 px), drawn on the Command board for Active. */
export const Compact: Story = { args: { state: 'active', size: 'compact' } };

export const CustomLabel: Story = { args: { state: 'active', label: 'Event live' } };

const allStates: RbmState[] = ['active', 'complete', 'pending', 'atRisk', 'paused', 'blocked', 'skipped'];

/** Every state at both sizes, for review against the board. */
export const AllStates: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: 2, alignItems: 'center', justifyItems: 'start' }}>
      {allStates.map((state) => (
        <Box key={state} sx={{ display: 'contents' }}>
          <RbmStatusPill state={state} />
          <RbmStatusPill state={state} size="compact" />
        </Box>
      ))}
    </Box>
  ),
};

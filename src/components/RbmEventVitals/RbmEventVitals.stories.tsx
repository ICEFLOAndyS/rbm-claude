import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmEventVitals } from './RbmEventVitals';
import { mockEventVitals } from '../../mocks/eventVitals';

const meta: Meta<typeof RbmEventVitals> = {
  title: 'Command/RbmEventVitals',
  component: RbmEventVitals,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: {
    data: mockEventVitals(),
    timeZone: 'UTC',
    onOpenProgress: fn(),
    onOpenIssues: fn(),
    onOpenStart: fn(),
    onOpenForecast: fn(),
    onRaiseIssue: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof RbmEventVitals>;

/** As in the page on the Command board: 12 minutes behind. */
export const Amber: Story = {};
export const Green: Story = { args: { data: mockEventVitals({ rag: 'green', gapMinutes: 0 }) } };
export const Red: Story = { args: { data: mockEventVitals({ rag: 'red', gapMinutes: 27 }) } };

/** Not drawn: the arrow for ahead of schedule. The words follow the rule ("−08 min Ahead of Schedule"). */
export const AheadOfSchedule: Story = {
  args: { data: mockEventVitals({ rag: 'green', gapMinutes: -8 }) },
  parameters: { docs: { description: { story: 'The ahead arrow is not drawn. Flagged for sign-off.' } } },
};

export const NoOpenIssues: Story = { args: { data: { ...mockEventVitals(), issues: { high: 0, medium: 0, low: 0 } } } };

/** A user who may not raise issues sees no "Raise issue". */
export const WithoutRaiseIssue: Story = { args: { onRaiseIssue: undefined } };

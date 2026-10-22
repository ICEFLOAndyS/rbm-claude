import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmTaskTimeline } from './RbmTaskTimeline';
import { mockManyUpNext, mockTimelineRunbooks, mockTimelineTasks } from '../../mocks/timeline';
import { tasksNow } from '../../mocks/tasks';

const meta: Meta<typeof RbmTaskTimeline> = {
  title: 'Command/RbmTaskTimeline',
  component: RbmTaskTimeline,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: { runbooks: mockTimelineRunbooks(), tasks: mockTimelineTasks(), now: tasksNow, timeZone: 'UTC', onAction: fn(), onOpen: fn(), onRunbookFilterChange: fn() },
};
export default meta;

type Story = StoryObj<typeof RbmTaskTimeline>;

/** Focus scope: only what needs attention, grouped by runbook then stage. Reporting has nothing in focus, so it has no panel. */
export const Focus: Story = {};

/** Filtered to one runbook: the summary says so. */
export const FilteredToOneRunbook: Story = { args: { runbookFilter: ['rb2'] } };

/** One completion releases seven tasks: five show, then "+2 more". */
export const ManyUpNext: Story = { args: { tasks: [...mockTimelineTasks(), ...mockManyUpNext()] } };

/** A conflict from the API: the second person sees what happened. */
export const Conflict: Story = { args: { notice: { message: '1.3.5 was already completed by L. Chen at 03:41', actionLabel: 'View', onAction: fn() } } };

/** Nothing in focus. */
export const Empty: Story = { args: { tasks: [] } };

/** Two rows selected: the bulk bar offers only what is valid for both. */
export const BulkSelection: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select 1.3.9 Refresh test data' }));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select 1.3.8 Apply configuration patch' }));
  },
};

/** After Complete: the Undo message for the 60-second linger. */
export const UndoMessage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Complete task 1.3.5 Startup application UI' }));
  },
};

/** Collapsed to one line, like the Event ribbon: the focus, late and blocked counts. Not drawn; follows the ribbon's collapsed line. */
export const Collapsed: Story = { args: { collapsed: true, onCollapsedChange: fn() } };

/** Collapsed while filtered: the line says how many runbooks the counts cover. */
export const CollapsedFiltered: Story = { args: { collapsed: true, runbookFilter: ['rb2'], onCollapsedChange: fn() } };

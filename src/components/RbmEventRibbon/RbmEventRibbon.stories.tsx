import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmEventRibbon, type RbmRibbonRunbook } from './RbmEventRibbon';
import { at, mockOverlappingRunbook, mockRibbon, ribbonNow } from '../../mocks/eventRibbon';

const meta: Meta<typeof RbmEventRibbon> = {
  title: 'Command/RbmEventRibbon',
  component: RbmEventRibbon,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: { runbooks: mockRibbon(), now: ribbonNow, timeZone: 'UTC', onSelectStage: fn(), onSelectMarker: fn(), onCollapsedChange: fn() },
};
export default meta;

type Story = StoryObj<typeof RbmEventRibbon>;

/** As on the Command board: three runbooks, one late (Amber), one late (Red), one on schedule. */
export const Expanded: Story = {};

/** One 56 px line, one chip per runbook. */
export const Collapsed: Story = { args: { collapsed: true } };

const notDrawn = { docs: { description: { story: 'Overlapping stages are not drawn on the board yet. Layout follows the brief: 28 px per extra sub-row, 3 rows, then "+n more".' } } };

/** Overlapping stages: 2, 3 and then 5 at once. The lane caps at 3 sub-rows; "+n more" expands it. */
export const OverlappingStages: Story = { args: { runbooks: [...mockRibbon(), mockOverlappingRunbook()] }, parameters: notDrawn };

/** A stage that starts before the window and one that ends after it: the clipped edge is flat. */
export const ClippedAtTheWindow: Story = { args: { windowStart: at('23:00'), windowEnd: at('05:30') } };

const long: RbmRibbonRunbook = {
  id: 'long',
  wbs: '5',
  name: 'Long runbook',
  plannedEnd: at('06:00'),
  forecastEnd: at('06:00'),
  rag: 'green',
  gapMinutes: 0,
  stages: Array.from({ length: 48 }, (_, i) => ({
    id: `5.${i + 1}`,
    wbs: `5.${i + 1}`,
    name: `Step ${i + 1}`,
    start: new Date(at('22:00').getTime() + i * 600_000),
    end: new Date(at('22:00').getTime() + (i + 1) * 600_000),
    state: i < 34 ? ('complete' as const) : i === 34 ? ('active' as const) : ('pending' as const),
  })),
};

/** Dozens of short stages in sequence stay on one row. */
export const LongRunbook: Story = { args: { runbooks: [mockRibbon()[0]!, long] } };

/** A runbook with no stages still has its lane and forecast. */
export const RunbookWithNoStages: Story = {
  args: {
    runbooks: [...mockRibbon(), { id: 'empty', wbs: '6', name: 'Comms', plannedEnd: at('05:00'), forecastEnd: at('05:00'), rag: 'green', gapMinutes: 0, stages: [] }],
  },
};

/** Milestones close together stay separate, each with its own focus and tooltip. */
export const MilestonesCloseTogether: Story = {
  args: {
    runbooks: [
      {
        ...mockRibbon()[2]!,
        markers: [
          { id: 'a', kind: 'milestone', wbs: '3.1.4', name: 'Reports built', at: at('05:00'), state: 'pending' },
          { id: 'b', kind: 'checkpoint', wbs: '3.1.5', name: 'Reports checked', at: at('05:05'), state: 'pending' },
          { id: 'c', kind: 'milestone', wbs: '3.1.6', name: 'Reports released', at: at('05:10'), state: 'pending' },
        ],
      },
    ],
  },
};

/** Critical runbooks: runbooks with no stage on the critical path are hidden, and a line says how many. */
export const CriticalRunbooks: Story = {
  args: { view: 'criticalRunbooks' },
  parameters: { docs: { description: { story: 'The ribbon view control is not drawn. It follows the Task Timeline runbook filter pill.' } } },
};

/** Critical path: only critical stages, milestones and checkpoints, in critical runbooks, repacked. */
export const CriticalPath: Story = { args: { view: 'criticalPath', runbooks: [...mockRibbon(), mockOverlappingRunbook()] } };

/** The view menu, open. */
export const ViewMenuOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^Show: / }));
  },
};

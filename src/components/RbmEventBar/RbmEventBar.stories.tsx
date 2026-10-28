import type { Meta, StoryObj } from '@storybook/react-vite';
import { RbmDensity } from '../../theme/RbmDensity';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmEventBar } from './RbmEventBar';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockAlerts, mockEvent } from '../../mocks/event';

/**
 * The Compact event bar: one key fact for each Event vital (Command board, "Compact event bar, one key fact for each
 * vital", version 136). A universal region, on any Centre.
 */
const meta: Meta<typeof RbmEventBar> = {
  title: 'Command/RbmEventBar',
  component: RbmEventBar,
  parameters: { layout: 'padded' },
  // At 1136 px, as drawn; a D2 Compact region of the Command Centre (mixed by region, 22 Oct 2026).
  decorators: [(Story) => <Box sx={{ width: 1136, border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}><Story /></Box>, (Story) => <RbmDensity level="compact"><Story /></RbmDensity>],
  args: {
    event: mockEvent(),
    vitals: mockEventVitals(),
    alerts: mockAlerts(),
    visible: true,
    timeZone: 'UTC',
    onOpenWork: fn(),
    onOpenProgress: fn(),
    onOpenIssues: fn(),
    onOpenForecast: fn(),
    onBackToTop: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof RbmEventBar>;

/** As drawn: Work 62%, Tasks 68%, five issues, started 22:00, Amber, 12 minutes behind, 3 alerts. */
export const Amber: Story = {};
/** The Event is Complete: the Work bar turns Brand Green. */
export const WorkComplete: Story = { args: { event: { ...mockEvent(), state: 'complete' }, alerts: [], vitals: mockEventVitals({ rag: 'green', gapMinutes: 0 }, { eventComplete: true, work: { doneMinutes: 1785, todoMinutes: 0 } }) } };
export const NoIssues: Story = { args: { vitals: mockEventVitals(undefined, { issues: { high: 0, medium: 0, low: 0 } }) } };
export const OnSchedule: Story = { args: { vitals: mockEventVitals({ rag: 'green', gapMinutes: 0 }), alerts: [] } };
export const BehindRed: Story = { args: { vitals: mockEventVitals({ rag: 'red', gapMinutes: 27 }) } };
/** Not drawn: ahead of schedule reads "−08 min". */
export const Ahead: Story = { args: { vitals: mockEventVitals({ rag: 'green', gapMinutes: -8 }), alerts: [] } };
/** A long Event name is cut with an ellipsis; the facts stay on one line. */
export const LongName: Story = { args: { event: { ...mockEvent(), name: 'Weekend Payroll Cutover and Finance Ledger Migration for the Northern Region' } } };
export const Paused: Story = { args: { event: { ...mockEvent(), state: 'paused' } } };
/** While the Event vitals are on screen, the bar is not shown. */
export const Hidden: Story = { args: { visible: false } };

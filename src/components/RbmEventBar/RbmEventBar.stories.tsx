import type { Meta, StoryObj } from '@storybook/react-vite';
import { RbmDensity } from '../../theme/RbmDensity';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmEventBar } from './RbmEventBar';
import { mockEventVitals } from '../../mocks/eventVitals';
import { mockAlerts, mockEvent } from '../../mocks/event';

const meta: Meta<typeof RbmEventBar> = {
  title: 'Command/RbmEventBar',
  component: RbmEventBar,
  parameters: { layout: 'padded' },
  // A D2 Compact region of the Command Centre (mixed by region, 22 Oct 2026).
  decorators: [(Story) => <Box sx={{ maxWidth: 1136, border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}><Story /></Box>, (Story) => <RbmDensity level="compact"><Story /></RbmDensity>],
  args: { event: mockEvent(), vitals: mockEventVitals(), alerts: mockAlerts(), visible: true, timeZone: 'UTC', onOpenProgress: fn(), onOpenIssues: fn(), onOpenForecast: fn(), onBackToTop: fn() },
};
export default meta;

type Story = StoryObj<typeof RbmEventBar>;

/** As on the Command board: Amber, 12 minutes behind, 3 alerts. */
export const Amber: Story = {};
export const OnSchedule: Story = { args: { vitals: mockEventVitals({ rag: 'green', gapMinutes: 0 }), alerts: [] } };
export const Red: Story = { args: { vitals: mockEventVitals({ rag: 'red', gapMinutes: 27 }) } };
export const Paused: Story = { args: { event: { ...mockEvent(), state: 'paused' } } };
/** While the Event vitals are on screen, the bar is not shown. */
export const Hidden: Story = { args: { visible: false } };

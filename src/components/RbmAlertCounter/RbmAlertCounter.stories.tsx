import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RbmAlertCounter, type RbmAlert } from './RbmAlertCounter';
import { RbmDensity } from '../../theme/RbmDensity';

const meta: Meta<typeof RbmAlertCounter> = {
  title: 'Base/RbmAlertCounter',
  component: RbmAlertCounter,
  argTypes: { size: { control: 'inline-radio', options: ['normal', 'compact'] } },
};
export default meta;

type Story = StoryObj<typeof RbmAlertCounter>;

// The alerts drawn on the Command board ("Alert counter").
const drawn: RbmAlert[] = [
  {
    id: 'blockers',
    severity: 'red',
    title: '2 blockers are holding 3 tasks',
    detail: 'The forecast end has moved 12 minutes late.',
    action: { label: 'View blockers', onSelect: fn() },
  },
  {
    id: 'forecast',
    severity: 'amber',
    title: 'Forecast end is 12 minutes late',
    detail: 'The critical path runs through 1.3.7 Run smoke tests.',
    action: { label: 'View critical path', onSelect: fn() },
  },
  {
    id: 'check',
    severity: 'red',
    title: '1 task failed its check',
    detail: '1.4.2 Payroll totals check needs a decision.',
    action: { label: 'Open result', onSelect: fn() },
  },
];

/** Red: a blocker, a failed check or a Red forecast. Click it to see the alerts. */
export const Red: Story = { args: { alerts: drawn } };
/** Amber: the forecast is late and nothing is blocked. */
export const Amber: Story = { args: { alerts: [drawn[1]!] } };
/** Healthy: no counter at all. */
export const Healthy: Story = { args: { alerts: [] } };
/** In the compact event bar. */
/** In the compact event bar, a D2 Compact region. */
export const Compact: Story = { args: { alerts: drawn, size: 'compact' }, decorators: [(Story) => <RbmDensity level="compact">{Story()}</RbmDensity>] };

/** After a click: the alerts, most serious first, each with a link. */
export const Open: Story = {
  args: { alerts: drawn },
  parameters: { layout: 'padded' },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: /^3 alerts,/ }));
  },
};

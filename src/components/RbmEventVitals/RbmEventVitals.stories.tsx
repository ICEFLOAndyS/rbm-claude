import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { fn } from 'storybook/test';
import { RbmEventVitals } from './RbmEventVitals';
import { mockEventVitals } from '../../mocks/eventVitals';
import { RbmDensity } from '../../theme/RbmDensity';
import type { DensityLevel } from '../../theme/tokens';

/**
 * Event vitals: five equal cards (Command board, "Event vitals: Work Progress and five equal cards", version 136).
 * A universal region: it shows one Event's data, on any Centre.
 */
const meta: Meta<typeof RbmEventVitals> = {
  title: 'Command/RbmEventVitals',
  component: RbmEventVitals,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ maxWidth: 1136 }}><Story /></Box>],
  args: {
    data: mockEventVitals(),
    timeZone: 'UTC',
    onOpenWork: fn(),
    onOpenProgress: fn(),
    onOpenIssues: fn(),
    onOpenStart: fn(),
    onOpenForecast: fn(),
    onRaiseIssue: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof RbmEventVitals>;
const at = (width: number) => [(Story: () => React.JSX.Element) => <Box sx={{ width }}><Story /></Box>];
const level = (l: DensityLevel) => [(Story: () => React.JSX.Element) => <RbmDensity level={l}><Story /></RbmDensity>];

/** As drawn: Work 62%, 12 minutes behind (Amber), at 1136 px. */
export const Amber: Story = {};

// Work Progress, every state.
export const WorkNotStarted: Story = { args: { data: mockEventVitals(undefined, { work: { doneMinutes: 0, todoMinutes: 1785 } }) } };
export const WorkInProgress: Story = {};
/** The Event is Complete: the bar turns Brand Green, with a tick and the word. */
export const WorkComplete: Story = { args: { data: mockEventVitals({ rag: 'green', gapMinutes: 0 }, { eventComplete: true, work: { doneMinutes: 1785, todoMinutes: 0 } }) } };
export const NoWorkPlanned: Story = { args: { data: mockEventVitals(undefined, { work: { doneMinutes: 0, todoMinutes: 0 } }) } };
export const Loading: Story = { args: { loading: true } };

// Forecast end time.
export const OnSchedule: Story = { args: { data: mockEventVitals({ rag: 'green', gapMinutes: 0 }) } };
export const BehindRed: Story = { args: { data: mockEventVitals({ rag: 'red', gapMinutes: 27 }) } };
/** Not drawn: the arrow for ahead of schedule. The words follow the rule ("−08 min Ahead of Schedule"). */
export const AheadOfSchedule: Story = { args: { data: mockEventVitals({ rag: 'green', gapMinutes: -8 }) } };

export const NoOpenIssues: Story = { args: { data: mockEventVitals(undefined, { issues: { high: 0, medium: 0, low: 0 } }) } };
/** A user who may not raise issues sees no "Raise issue". */
export const WithoutRaiseIssue: Story = { args: { onRaiseIssue: undefined } };

// The row at the drawn widths: 1136 px (about 214 px a card), 998 px (187 px, "The page") and 660 px (wrapped 3 + 2).
export const Row1136: Story = { decorators: at(1136) };
export const Row998: Story = { decorators: at(998) };
export const Row660Wrapped: Story = { decorators: at(660) };

// Each density. Work Progress is drawn at all four; the other cards only at D1 (not drawn elsewhere, flagged).
export const D0Command: Story = { decorators: level('command') };
export const D1Comfortable: Story = { decorators: level('comfortable') };
export const D2Compact: Story = { decorators: level('compact') };
export const D3Dense: Story = { decorators: level('dense') };

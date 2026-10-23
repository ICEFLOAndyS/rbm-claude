import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmPageHeader, type RbmPageHeaderProps } from './RbmPageHeader';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, shellSize, type DensityLevel } from '../../theme/tokens';

type Args = RbmPageHeaderProps & { level: DensityLevel };

const programmes = [
  { id: 'q4', name: 'Q4 Data Centre Migration' },
  { id: 'erp', name: 'ERP Upgrade' },
  { id: 'payroll', name: 'Payroll Platform' },
];

const meta: Meta<Args> = {
  title: 'Shell/RbmPageHeader',
  render: ({ level, ...args }) => (
    <RbmDensity level={level}>
      <Box sx={{ p: `${shellSize[level].pagePadding}px`, bgcolor: colour.mist, minHeight: 260 }}>
        <RbmPageHeader {...args} />
      </Box>
    </RbmDensity>
  ),
  // The board's example.
  args: {
    level: 'compact',
    title: 'Q4 Data Centre Cutover',
    status: { state: 'active', label: 'In progress' },
    breadcrumb: [{ label: 'Runbooks', href: '#/runbooks' }],
    metadata: 'Owner A. Smith · Window 24 Oct 22:00 – 25 Oct 06:00',
    programme: programmes[0],
    programmes,
    onProgrammeChange: () => {},
    event: { name: 'Q4 Data Centre Cutover', state: 'active', stateLabel: 'In progress' },
    actions: [{ label: 'Edit', onClick: () => {} }],
    primaryAction: { label: 'Start run', onClick: () => {} },
  },
  argTypes: { level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense'] } },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/** The board's event page header at D2 Compact (24 px title). */
export const EventPage: Story = {};

/** The same at D1 Comfortable (28 px title, 48 px buttons), as drawn. */
export const EventPageD1: Story = { name: 'Event page, D1', args: { level: 'comfortable' } };

/** D3 Dense (20 px title). */
export const EventPageD3: Story = { name: 'Event page, D3', args: { level: 'dense' } };

/** A page that is not about an event: the programme only, and no status. */
export const ListPage: Story = {
  args: {
    title: 'Events',
    status: undefined,
    event: undefined,
    breadcrumb: [],
    metadata: '128 events · filtered to Production',
    actions: [{ label: 'Import', onClick: () => {} }],
    primaryAction: { label: 'New event', icon: 'construct.add', onClick: () => {} },
  },
};

/** No context row: no programme and no event. */
export const NoContext: Story = { args: { programme: undefined, event: undefined } };

/** One programme: shown without a switcher. */
export const SingleProgramme: Story = { args: { programmes: [programmes[0]!] } };

/** The deepest breadcrumb: three parents and the page (four levels). */
export const DeepBreadcrumb: Story = {
  args: {
    title: 'Startup application UI',
    breadcrumb: [
      { label: 'Events', href: '#/events' },
      { label: 'REV000009', href: '#/events/REV000009' },
      { label: 'Runbook 1', href: '#/events/REV000009/runbooks/1' },
    ],
  },
};

/** No actions. */
export const NoActions: Story = { args: { actions: [], primaryAction: undefined } };

/** A long title and metadata: the title wraps, the metadata stays one line (not drawn). */
export const LongText: Story = {
  args: {
    title: 'Q4 Data Centre Cutover and Network Re-addressing for the Northern Region',
    metadata: 'Owner A. Smith · Window 24 Oct 22:00 – 25 Oct 06:00 · Environment Production · Change CHG0041235 · Approved by the CAB on 20 Oct',
  },
};

/** A narrow page: the actions move under the title (not drawn). */
export const Narrow: Story = { decorators: [(S) => <Box sx={{ maxWidth: 420 }}>{S()}</Box>] };

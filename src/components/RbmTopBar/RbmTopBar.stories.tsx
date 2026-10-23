import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmTopBar, type RbmTopBarProps } from './RbmTopBar';
import { RbmAccountMenu, type RbmUser } from './RbmAccountMenu';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, type DensityLevel } from '../../theme/tokens';

const user: RbmUser = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };

type Args = RbmTopBarProps & { level: DensityLevel };

const meta: Meta<Args> = {
  title: 'Shell/RbmTopBar',
  render: ({ level, ...args }) => (
    <RbmDensity level={level}>
      <Box sx={{ minHeight: 320, bgcolor: colour.mist }}>
        <RbmTopBar {...args} />
      </Box>
    </RbmDensity>
  ),
  args: { user, sidebar: 'expanded', notificationCount: 4, level: 'compact', onAccountAction: () => {}, onMenu: () => {} },
  argTypes: {
    sidebar: { control: 'inline-radio', options: ['expanded', 'rail', 'drawer'] },
    level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense', 'command'] },
    user: { table: { disable: true } },
  },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/** D2 Compact, 56 px, over the expanded sidebar: the shell's default (flagged: the board's default is D1). */
export const Compact: Story = { name: 'D2 Compact' };

/** D1 Comfortable, 64 px, as drawn first on the board. */
export const Comfortable: Story = { name: 'D1 Comfortable', args: { level: 'comfortable' } };

/** D3 Dense, 48 px. */
export const Dense: Story = { name: 'D3 Dense', args: { level: 'dense' } };

/** Over the rail: the ICEFLO mark in a 72 px block (D1). */
export const Rail: Story = { name: 'Rail collapsed', args: { level: 'comfortable', sidebar: 'rail' } };

/** Under 900 px: the menu button, the wordmark, the bell and the avatar. */
export const Narrow: Story = { name: 'Narrow (drawer)', args: { sidebar: 'drawer' } };

/** No unread notifications: no pill. */
export const NoNotifications: Story = { args: { notificationCount: 0 } };

/** Over 99: "99+" (not drawn). */
export const ManyNotifications: Story = { args: { notificationCount: 240 } };

/** The notifications popover (its content is not drawn). Click the bell. */
export const NotificationsPopover: Story = {
  args: {
    notificationCount: 2,
    notifications: (
      <Box component="ul" sx={{ m: 0, pl: 4 }}>
        <li>REV000009: task 1.3.5 is late to start.</li>
        <li>REV000009: blocker BLK-102 raised.</li>
      </Box>
    ),
  },
};

/** The account menu, open (click the user). */
export const AccountMenuOpen: Story = {
  name: 'Account menu',
  render: ({ level }) => (
    <RbmDensity level={level}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 4, bgcolor: colour.deepBlue, minHeight: 300, alignItems: 'flex-start' }}>
        <RbmAccountMenu user={user} />
      </Box>
    </RbmDensity>
  ),
  args: { level: 'comfortable' },
};

/** D0 Command: the programme name and a large clock; no sidebar, no controls. */
export const Command: Story = { name: 'D0 Command', args: { level: 'command', programme: 'Q4 Data Centre Migration', clock: '10:42:18' } };

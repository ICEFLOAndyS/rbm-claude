import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button } from '@mui/material';
import { RbmAppShell } from './RbmAppShell';
import { RbmPageHeader } from '../RbmPageHeader/RbmPageHeader';
import { RbmSlideInRegion } from '../RbmSlideInRegion/RbmSlideInRegion';
import { colour, type DensityLevel } from '../../theme/tokens';
import { rbmNav } from '../../data/nav/nav';
import { createMockNavData } from '../../data/nav/navData';
import { createMemorySidebarStore } from '../../data/nav/sidebarPreference';

type Args = { density: DensityLevel; admin: boolean; reconnecting: boolean; environment: string; path: string };

const user = { id: 'a.smith', name: 'Andy Smith', role: 'Cutover Manager', email: 'andy.smith@iceflo.com' };

/** A page in the content zone, with a record panel in the slide-in region. */
function Page() {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <RbmPageHeader title="Events" metadata="128 events · filtered to Production" primaryAction={{ label: 'New event', icon: 'construct.add', onClick: () => {} }} />
      <Box>
        <Button variant="outlined" onClick={() => setOpen(true)}>
          Open REV000009
        </Button>
      </Box>
      {Array.from({ length: 24 }, (_, i) => (
        <Box key={i} sx={{ height: 44, borderRadius: '14px', bgcolor: colour.white, border: `1px solid ${colour.rule}` }} />
      ))}
      <RbmSlideInRegion open={open} onClose={() => setOpen(false)} label="REV000009 Weekend Payroll Cutover">
        <Box sx={{ p: 6 }}>
          <Box component="h2" sx={{ m: 0, fontSize: 20, fontWeight: 800 }}>
            Weekend Payroll Cutover
          </Box>
          <Button sx={{ mt: 4 }} variant="outlined" onClick={() => setOpen(false)}>
            Close
          </Button>
        </Box>
      </RbmSlideInRegion>
    </Box>
  );
}

function Shell({ density, admin, reconnecting, environment, path: start }: Args) {
  const [path, setPath] = useState(start);
  const navData = useMemo(() => createMockNavData({ permissions: admin ? ['rbmAdmin', 'techAdmin'] : [] }), [admin]);
  const store = useMemo(() => createMemorySidebarStore(), []);
  return (
    <Box sx={{ height: '100vh' }}>
      <RbmAppShell
        nav={rbmNav}
        navData={navData}
        user={user}
        path={path}
        hrefFor={(to) => `#${to}`}
        onNavigate={setPath}
        density={density}
        sidebarStore={store}
        notificationCount={4}
        programme="Q4 Data Centre Migration"
        clock="10:42:18"
        footer={{
          version: '4.2.0',
          updatedAt: '10:42:18',
          connection: reconnecting ? 'reconnecting' : 'live',
          environment: { name: environment, production: environment === 'Production' },
          links: { privacy: '#', support: '#', knowledge: '#' },
        }}
      >
        <Page />
      </RbmAppShell>
    </Box>
  );
}

const meta: Meta<Args> = {
  title: 'Shell/RbmAppShell',
  render: (args) => <Shell key={JSON.stringify(args)} {...args} />,
  args: { density: 'compact', admin: true, reconnecting: false, environment: 'Production', path: '/events' },
  argTypes: {
    density: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense', 'command'] },
    environment: { control: 'inline-radio', options: ['Production', 'UAT', 'Test'] },
    path: { control: 'select', options: ['/events', '/events/REV000009', '/library/content-packs', '/rbm-admin/licences', '/tech-admin/setup', '/help/versions'] },
  },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/**
 * The whole screen at D2 Compact, the shell's default. Resize the window: the sidebar is expanded from
 * 1200 px, a rail from 900 px, and a drawer below. Tab once for the skip link.
 */
export const Compact: Story = { name: 'D2 Compact' };
/** D1 Comfortable, the board's default level. */
export const Comfortable: Story = { name: 'D1 Comfortable', args: { density: 'comfortable' } };
/** D3 Dense. */
export const Dense: Story = { name: 'D3 Dense', args: { density: 'dense' } };
/** D0 Command: no sidebar, the programme and a large clock, and a status-only footer. */
export const Command: Story = { name: 'D0 Command', args: { density: 'command' } };
/** A user without the admin permission. */
export const WithoutAdmin: Story = { args: { admin: false } };
/** A deep link: the item and its group heading are brought into view. */
export const DeepLink: Story = { args: { path: '/tech-admin/setup' } };
/** A lost connection and a UAT environment, in the footer. */
export const ReconnectingInUat: Story = { name: 'Reconnecting, UAT', args: { reconnecting: true, environment: 'UAT' } };

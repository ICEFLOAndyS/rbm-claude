import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmSidebar, useSidebarMode, type RbmSidebarProps } from './RbmSidebar';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, type DensityLevel } from '../../theme/tokens';
import { rbmNav, type RbmNavConfig } from '../../data/nav/nav';
import { createMockNavData } from '../../data/nav/navData';
import { createMemorySidebarStore } from '../../data/nav/sidebarPreference';

type Args = Omit<RbmSidebarProps, 'data'> & { level: DensityLevel; admin: boolean; count?: number };

/** The board draws the sidebar 820 px tall. */
function Frame({ level, admin, count, ...props }: Args) {
  const data = useMemo(() => createMockNavData({ permissions: admin ? ['admin'] : [], counts: count ? { events: count } : {} }), [admin, count]);
  return (
    <RbmDensity level={level}>
      <Box sx={{ height: 820, display: 'flex' }}>
        <RbmSidebar {...props} data={data} />
      </Box>
    </RbmDensity>
  );
}

const meta: Meta<Args> = {
  title: 'Shell/RbmSidebar',
  render: (args) => <Frame {...args} />,
  args: { nav: rbmNav, path: '/library/templates', variant: 'expanded', level: 'compact', admin: true, hrefFor: (to) => `#${to}`, onNavigate: () => {}, onToggleCollapse: () => {} },
  argTypes: {
    variant: { control: 'inline-radio', options: ['expanded', 'rail'] },
    level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense', 'command'] },
    path: { control: 'select', options: ['/events', '/events/REV000009', '/events/folders', '/library/templates', '/library/folders', '/admin/licences', '/help/support', '/unknown'] },
    nav: { table: { disable: true } },
  },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/** Expanded at D2 Compact (224 px), the shell's default level (flagged: the board's default is D1). */
export const Expanded: Story = {};

/** Expanded at D1 Comfortable (248 px), as drawn on the board. */
export const ExpandedD1: Story = { name: 'Expanded, D1', args: { level: 'comfortable' } };

/** D3 Dense (200 px). */
export const ExpandedD3: Story = { name: 'Expanded, D3', args: { level: 'dense' } };

/** The rail: icons only, a tooltip with the name on hover and focus, and Expand at the bottom. */
export const Rail: Story = { args: { variant: 'rail' } };

/** The rail at D1 (72 px), as drawn. */
export const RailD1: Story = { name: 'Rail, D1', args: { variant: 'rail', level: 'comfortable' } };

/** With a count on List: a white pill (the board's example; no item has a count yet). */
export const WithCount: Story = { args: { count: 12, path: '/library/templates' } };

/** The rail with a count: a small white dot. */
export const RailWithCount: Story = { name: 'Rail with count', args: { variant: 'rail', count: 12 } };

/** A user without the admin permission: the Admin group is not shown. */
export const WithoutAdmin: Story = { args: { admin: false } };

/** A deep link to an event's Command Centre marks Events › List. */
export const DeepLink: Story = { args: { path: '/events/REV000009' } };

/** A route with no item: nothing is marked (not drawn). */
export const NoActiveItem: Story = { args: { path: '/unknown' } };

/** A long label is cut with an ellipsis rather than wrapping (not drawn). */
export const LongLabel: Story = {
  args: {
    level: 'comfortable',
    nav: [{ group: 'Admin', items: [{ id: 'licences', label: 'License Management and Entitlements', icon: 'nav.license', to: '/admin/licences' }] }] satisfies RbmNavConfig,
  },
};

const statesNav: RbmNavConfig = [
  {
    group: 'Item states',
    items: [
      { id: 'default', label: 'Default', icon: 'nav.list', to: '/default' },
      { id: 'active', label: 'Active', icon: 'nav.list', to: '/active' },
      { id: 'disabled', label: 'Disabled', icon: 'nav.list', to: '/disabled', disabled: true },
      { id: 'events', label: 'With count', icon: 'nav.list', to: '/count' },
    ],
  },
];

/** The board's item states. Hover and focus show on the pointer and the keyboard (Tab to an item). */
export const ItemStates: Story = { args: { nav: statesNav, path: '/active', count: 3, onToggleCollapse: undefined } };

/** A child, indented under its active parent (not drawn: proposed). */
export const WithChildren: Story = {
  args: {
    path: '/library/templates/drafts',
    nav: [
      {
        group: 'Library',
        items: [
          { id: 'templates', label: 'Templates', icon: 'object.template', to: '/library/templates', children: [{ id: 'drafts', label: 'Drafts', icon: 'object.template', to: '/library/templates/drafts' }] },
          { id: 'teams', label: 'Teams', icon: 'object.team', to: '/library/teams' },
        ],
      },
    ] satisfies RbmNavConfig,
  },
};

/** D0 Command: the sidebar is not drawn. */
export const Command: Story = { name: 'D0 Command (none)', args: { level: 'command' } };

/**
 * The working sidebar: the form follows the window (resize it) and the remembered choice. Below 900 px the
 * menu button opens the drawer under a 56 px bar; Escape closes it and returns focus to the button.
 */
export const Responsive: Story = {
  render: function Render({ level }) {
    const store = useMemo(() => createMemorySidebarStore(), []);
    const mode = useSidebarMode(store);
    const [path, setPath] = useState('/events');
    const data = useMemo(() => createMockNavData(), []);
    return (
      <RbmDensity level={level}>
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 2, px: 4, bgcolor: colour.deepBlue, color: colour.white, fontSize: 13 }}>
            {mode.variant === 'drawer' && (
              <button type="button" onClick={mode.openDrawer}>
                Menu
              </button>
            )}
            Stand-in top bar · {mode.variant} · {path}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <RbmSidebar nav={rbmNav} data={data} path={path} variant={mode.variant} hrefFor={(to) => `#${to}`} onNavigate={setPath} onToggleCollapse={mode.toggle} open={mode.drawerOpen} onClose={mode.closeDrawer} drawerTop={56} />
            <Box sx={{ flex: 1, p: 6, bgcolor: colour.mist }}>Content</Box>
          </Box>
        </Box>
      </RbmDensity>
    );
  },
};

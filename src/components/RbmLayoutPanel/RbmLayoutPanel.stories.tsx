import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { DEFAULT_LAYOUT, RbmLayoutPanel, regionInfo, type RbmRegion } from './RbmLayoutPanel';

const meta: Meta<typeof RbmLayoutPanel> = {
  title: 'Command/RbmLayoutPanel',
  component: RbmLayoutPanel,
  args: { order: DEFAULT_LAYOUT, onChange: fn(), onClose: fn() },
};
export default meta;

type Story = StoryObj<typeof RbmLayoutPanel>;

/** The default order: Event ribbon, Task Timeline, Hot-topics strip. */
export const Default: Story = {};

/** A user's own order. */
export const Reordered: Story = { args: { order: ['timeline', 'ribbon', 'hotTopics'] } };

/** Mid-drag, as drawn: the Event ribbon lifted and moving up above the Task Timeline. */
export const MidDrag: Story = {
  args: { order: ['timeline', 'ribbon', 'hotTopics'] },
  play: async ({ canvas, userEvent }) => {
    canvas.getByRole('button', { name: /^Move Event ribbon/ }).focus();
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{ArrowUp}');
  },
};

/** Drag from the grip, or press Space on a grip, move with the arrow keys and press Space to drop. The page order on the right follows at once. */
export const TryIt: Story = {
  render: function TryIt() {
    const [order, setOrder] = useState<RbmRegion[]>(DEFAULT_LAYOUT);
    return (
      <Box sx={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <RbmLayoutPanel order={order} onChange={setOrder} onClose={() => {}} />
        <Box component="ol" sx={{ m: 0, pl: 5, fontSize: 14, lineHeight: 2 }}>
          <li>Page header</li>
          <li>Event vitals</li>
          {order.map((r) => (
            <li key={r}><strong>{regionInfo[r].name}</strong></li>
          ))}
        </Box>
      </Box>
    );
  },
};

/** With the page holding which regions are open: an Open switch on each movable row. Not drawn; MUI's switch, with the state in words. */
export const OpenAndCollapse: Story = {
  render: function OpenAndCollapse() {
    const [collapsed, setCollapsed] = useState<Partial<Record<RbmRegion, boolean>>>({ timeline: true });
    return <RbmLayoutPanel order={DEFAULT_LAYOUT} onChange={() => {}} onClose={() => {}} collapsed={collapsed} onCollapsedChange={(r, c) => setCollapsed({ ...collapsed, [r]: c })} />;
  },
};

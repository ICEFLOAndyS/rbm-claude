import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmAvatar } from './RbmAvatar';

const meta: Meta<typeof RbmAvatar> = {
  title: 'Base/RbmAvatar',
  component: RbmAvatar,
  args: { name: 'Tom Baker', size: 28 },
  argTypes: { size: { control: 'inline-radio', options: [28, 32, 36] } },
};
export default meta;

type Story = StoryObj<typeof RbmAvatar>;

/** 28 px: the assignee in a task row. */
export const TaskRow: Story = {};
/** 32 px, in cards. */
export const Card: Story = { args: { size: 32 } };
/** 36 px, in cards. */
export const Large: Story = { args: { size: 36 } };
export const SingleName: Story = { args: { name: 'Kai' } };
export const CustomInitials: Story = { args: { name: 'Karen de Witt', initials: 'KdW' } };

export const AllSizes: Story = {
  render: ({ name }) => (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <RbmAvatar name={name} size={28} />
      <RbmAvatar name={name} size={32} />
      <RbmAvatar name={name} size={36} />
    </Box>
  ),
};

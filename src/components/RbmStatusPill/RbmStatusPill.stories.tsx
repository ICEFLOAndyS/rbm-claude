import type { Meta, StoryObj } from '@storybook/react-vite';
import { RbmStatusPill } from './RbmStatusPill';

const meta: Meta<typeof RbmStatusPill> = {
  title: 'Base/RbmStatusPill',
  component: RbmStatusPill,
};
export default meta;

type Story = StoryObj<typeof RbmStatusPill>;

export const Active: Story = { args: { state: 'active' } };
export const Complete: Story = { args: { state: 'complete' } };
export const AtRisk: Story = { args: { state: 'atRisk' } };
export const Paused: Story = { args: { state: 'paused' } };
export const Blocked: Story = { args: { state: 'blocked' } };
export const NotStarted: Story = { args: { state: 'pending' } };

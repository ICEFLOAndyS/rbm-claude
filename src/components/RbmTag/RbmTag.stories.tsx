import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmTag, type RbmTagKind } from './RbmTag';

const kinds: RbmTagKind[] = ['lateToStart', 'lateToFinish', 'readyToStart', 'upNext', 'blocked', 'issue', 'needsResult', 'complete'];

const meta: Meta<typeof RbmTag> = {
  title: 'Base/RbmTag',
  component: RbmTag,
  argTypes: { kind: { control: 'select', options: kinds } },
};
export default meta;

type Story = StoryObj<typeof RbmTag>;

export const LateToStart: Story = { args: { kind: 'lateToStart' } };
export const LateToFinish: Story = { args: { kind: 'lateToFinish' } };
export const ReadyToStart: Story = { args: { kind: 'readyToStart' } };
export const UpNext: Story = { args: { kind: 'upNext', label: 'Up next · after 1.3.5' } };
export const Blocked: Story = { args: { kind: 'blocked', label: 'Blocked by BLK-102' } };
export const Issue: Story = { args: { kind: 'issue', label: 'Issue INC-102' } };
export const NeedsResult: Story = { args: { kind: 'needsResult' } };
/** During the 60-second linger before a completed task leaves the Task Timeline. */
export const Complete: Story = { args: { kind: 'complete', label: 'Complete · leaves in 0:42' } };

/** Every tag with the labels drawn on the Command board. */
export const AllTags: Story = {
  render: () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      <RbmTag kind="lateToStart" />
      <RbmTag kind="lateToFinish" />
      <RbmTag kind="readyToStart" />
      <RbmTag kind="upNext" label="Up next · after 1.3.5" />
      <RbmTag kind="blocked" label="Blocked by BLK-102" />
      <RbmTag kind="issue" label="Issue INC-102" />
      <RbmTag kind="needsResult" />
      <RbmTag kind="complete" label="Complete · leaves in 0:42" />
    </Box>
  ),
};

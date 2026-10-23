import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmActionButton, type RbmActionButtonProps } from './RbmActionButton';
import { RbmDensity } from '../../theme/RbmDensity';
import type { DensityLevel } from '../../theme/tokens';

type Args = RbmActionButtonProps & { level: DensityLevel };

const meta: Meta<Args> = {
  title: 'Base/RbmActionButton',
  render: ({ level, ...args }) => (
    <RbmDensity level={level}>
      <RbmActionButton {...args} />
    </RbmDensity>
  ),
  args: { icon: 'construct.edit', label: 'Edit', level: 'compact', iconOnly: false, disabled: false, onClick: () => {} },
  argTypes: { level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense'] } },
};
export default meta;

type Story = StoryObj<Args>;

/** Icon and text: the pencil and "Edit". Every Edit uses it where there is room (page header, record sections). */
export const IconAndText: Story = { name: 'Icon and text' };

/** Icon only, as drawn on the Icon suite board ("In use"): the name in a tooltip. For rows and toolbars. */
export const IconOnly: Story = { name: 'Icon only', args: { iconOnly: true } };

/** Disabled: Rule fill, Slate text (Components board). */
export const Disabled: Story = { args: { disabled: true } };

/** Any action from the suite: the board's panel header and toolbar buttons, at D2. */
export const Actions: Story = {
  render: ({ level }) => (
    <RbmDensity level={level}>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'flex', gap: '6px' }}>
          <RbmActionButton icon="display.previous" label="Previous" iconOnly />
          <RbmActionButton icon="display.next" label="Next" iconOnly />
          <RbmActionButton icon="display.widen" label="Widen" iconOnly />
          <RbmActionButton icon="display.openFullPage" label="Open full page" iconOnly />
          <RbmActionButton icon="display.close" label="Close" iconOnly />
        </Box>
        <Box sx={{ display: 'flex', gap: '6px' }}>
          <RbmActionButton icon="construct.edit" label="Edit" />
          <RbmActionButton icon="construct.copy" label="Copy" />
          <RbmActionButton icon="construct.export" label="Export" />
          <RbmActionButton icon="construct.delete" label="Delete" />
        </Box>
      </Box>
    </RbmDensity>
  ),
};

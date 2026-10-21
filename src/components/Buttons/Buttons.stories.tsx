import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button } from '@mui/material';
import { RbmIconButton } from '../RbmIconButton/RbmIconButton';

/**
 * Buttons are MUI `Button`, styled by the theme as drawn on the Components board
 * ("Buttons and pills"). The brand CTA is `color="secondary"`.
 */
const meta: Meta<typeof Button> = {
  title: 'Base/Buttons',
  component: Button,
  args: { disabled: false },
};
export default meta;

type Story = StoryObj<typeof Button>;

function More() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** The brand CTA: Green fill, Deep Blue bold text. One per view. */
export const Cta: Story = { name: 'CTA', args: { variant: 'contained', color: 'secondary', children: 'Start cutover' } };
/** Proposed: Deep Blue fill. */
export const Secondary: Story = { args: { variant: 'contained', color: 'primary', children: 'Run rehearsal' } };
/** Proposed: Deep Blue 2 px outline. */
export const Outlined: Story = { args: { variant: 'outlined', color: 'primary', children: 'View plan' } };
/** Ghost: Blue Dark underlined text. */
export const Ghost: Story = { args: { variant: 'text', color: 'primary', children: 'Learn more' } };
/** Proposed: Red Inner fill, for No-Go and other irreversible actions. */
export const Destructive: Story = { args: { variant: 'contained', color: 'error', children: 'Declare No-Go' } };
/** Proposed: Rule fill, Slate text. */
export const Disabled: Story = { args: { variant: 'contained', color: 'secondary', disabled: true, children: 'Disabled' } };

export const IconButton: Story = {
  render: ({ disabled }) => (
    <RbmIconButton label="More actions" disabled={disabled}>
      <More />
    </RbmIconButton>
  ),
};

/** The row as drawn on the board. */
export const AllButtons: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', border: 1, borderColor: 'divider', borderRadius: '14px', p: 7, maxWidth: 1136 }}>
      <Button variant="contained" color="secondary">Start cutover</Button>
      <Button variant="contained" color="primary">Run rehearsal</Button>
      <Button variant="outlined" color="primary">View plan</Button>
      <Button variant="text" color="primary">Learn more</Button>
      <Button variant="contained" color="error">Declare No-Go</Button>
      <Button variant="contained" disabled>Disabled</Button>
      <RbmIconButton label="More actions">
        <More />
      </RbmIconButton>
    </Box>
  ),
};

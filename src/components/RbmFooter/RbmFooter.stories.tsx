import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmFooter, type RbmFooterProps } from './RbmFooter';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, type DensityLevel } from '../../theme/tokens';

type Args = RbmFooterProps & { level: DensityLevel };

const meta: Meta<Args> = {
  title: 'Shell/RbmFooter',
  render: ({ level, ...args }) => (
    <RbmDensity level={level}>
      <Box sx={{ bgcolor: colour.mist, pt: 6 }}>
        <RbmFooter {...args} />
      </Box>
    </RbmDensity>
  ),
  args: {
    level: 'compact',
    version: '4.2.0',
    year: 2026,
    updatedAt: '10:42:18',
    connection: 'live',
    environment: { name: 'Production', production: true },
    links: { privacy: 'https://example.com/privacy', support: 'https://example.com/support', knowledge: 'https://example.com/knowledge' },
  },
  argTypes: {
    level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense', 'command'] },
    connection: { control: 'inline-radio', options: ['live', 'reconnecting'] },
  },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/** D2 Compact, 32 px: the shell's default. */
export const Compact: Story = { name: 'D2 Compact' };
/** D1 Comfortable, 36 px, as drawn first on the board. */
export const Comfortable: Story = { name: 'D1 Comfortable', args: { level: 'comfortable' } };
/** D3 Dense, 28 px. */
export const Dense: Story = { name: 'D3 Dense', args: { level: 'dense' } };
/** A lost connection: the At risk ringed dot and "Reconnecting". */
export const Reconnecting: Story = { args: { connection: 'reconnecting' } };
/** UAT: a non-production environment is a chip (the chip is not drawn). */
export const Uat: Story = { name: 'UAT environment', args: { environment: { name: 'UAT', production: false } } };
/** Test: a chip too. */
export const TestEnvironment: Story = { name: 'Test environment', args: { environment: { name: 'Test', production: false } } };
/** D0 Command, 40 px: status only, on Deep Blue. */
export const Command: Story = { name: 'D0 Command', args: { level: 'command' } };
/** D0 Command, reconnecting. */
export const CommandReconnecting: Story = { name: 'D0 Command, reconnecting', args: { level: 'command', connection: 'reconnecting' } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { RbmMyScenarios } from './RbmMyScenarios';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour } from '../../theme/tokens';
import type { RbmScenario, RbmScenarioSettings } from '../../data/scenarios/scenarios';

/** Profile › My scenarios (App shell board, "Who sets what"). Proposed: not approved by Andy Smith yet. */
type Args = { settings: RbmScenarioSettings; own?: RbmScenario[] };

const meta: Meta<Args> = {
  title: 'Shell/RbmMyScenarios',
  render: (args) => {
    const [own, setOwn] = useState(args.own);
    return (
      <RbmDensity level="compact">
        {/* The board draws it as a 380 px panel. */}
        <Box sx={{ width: 380, m: 4, border: `1px solid ${colour.silver}`, borderRadius: '14px', bgcolor: colour.white }}>
          <RbmMyScenarios settings={args.settings} own={own} onSave={setOwn} />
        </Box>
      </RbmDensity>
    );
  },
  args: { settings: { available: ['planned-change', 'disaster-recovery'], defaults: ['planned-change'] } },
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<Args>;

/** As drawn: the organisation's default in use. */
export const OrganisationDefault: Story = {};

/** The user has chosen their own. */
export const OwnChoice: Story = { args: { own: ['planned-change', 'disaster-recovery'] } };

/** All four available. */
export const FourAvailable: Story = { args: { settings: { available: ['planned-change', 'disaster-recovery', 'cyber-recovery', 'service-recovery'], defaults: ['planned-change'] } } };

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { RbmScenarioFilter } from './RbmScenarioFilter';
import { RbmPageHeader } from '../RbmPageHeader/RbmPageHeader';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour } from '../../theme/tokens';
import type { RbmScenario } from '../../data/scenarios/scenarios';

/** App shell board, "Scenario" (version 110 to 112). Proposed: not approved by Andy Smith yet. */
type Args = { available: RbmScenario[]; profile: RbmScenario[]; start: RbmScenario[] };

function Live({ available, profile, start }: Args) {
  const [shown, setShown] = useState(start);
  return <RbmScenarioFilter available={available} profile={profile} value={shown} onChange={setShown} />;
}

const meta: Meta<Args> = {
  title: 'Shell/RbmScenarioFilter',
  render: (args) => (
    <RbmDensity level="compact">
      {/* The board draws each state on Mist in a framed box. */}
      <Box sx={{ display: 'inline-flex', p: '14px 18px', bgcolor: colour.mist, border: `1px solid ${colour.silver}`, borderRadius: '12px', m: 4 }}>
        <Live {...args} />
      </Box>
    </RbmDensity>
  ),
  args: { available: ['planned-change', 'disaster-recovery'], profile: ['planned-change'], start: ['planned-change'] },
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<Args>;

/** One scenario (the default): the name is shown. Open it for "1 of 2 shown". */
export const OneScenario: Story = {};

/** More than one: a count, never colour. */
export const MoreThanOne: Story = { args: { available: ['planned-change', 'disaster-recovery', 'cyber-recovery'], start: ['planned-change', 'disaster-recovery'] } };

/** All shown. */
export const AllShown: Story = { args: { start: ['planned-change', 'disaster-recovery'] } };

/** Two scenarios in the profile: both are marked "In your profile" in the menu. */
export const ProfileOfTwo: Story = { args: { profile: ['planned-change', 'disaster-recovery'], start: ['planned-change', 'disaster-recovery'] } };

/** First in the page header's context row, before Programme. */
export const InThePageHeader: Story = {
  render: (args) => {
    const [shown, setShown] = useState(args.start);
    return (
      <RbmDensity level="compact">
        <Box sx={{ p: 6, bgcolor: colour.mist }}>
          <RbmPageHeader
            title="Events"
            scenarios={{ available: args.available, profile: args.profile, value: shown, onChange: setShown }}
            programme={{ id: 'q4', name: 'Q4 Data Centre Migration' }}
          />
        </Box>
      </RbmDensity>
    );
  },
};

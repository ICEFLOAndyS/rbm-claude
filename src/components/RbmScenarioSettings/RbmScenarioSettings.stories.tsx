import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RbmScenarioSettings } from './RbmScenarioSettings';
import { RbmDensity } from '../../theme/RbmDensity';
import { SHIPPED_SCENARIO_SETTINGS, type RbmScenarioSettings as Settings } from '../../data/scenarios/scenarios';

/** Admin Centre › Scenarios (App shell board, "Who sets what"). Proposed: not approved by Andy Smith yet. */
type Args = { settings: Settings };

const meta: Meta<Args> = {
  title: 'Shell/RbmScenarioSettings',
  render: (args) => {
    const [saved, setSaved] = useState(args.settings);
    return (
      <RbmDensity level="compact">
        <RbmScenarioSettings settings={saved} onSave={setSaved} breadcrumb={[{ label: 'Admin Centre', href: '#/rbm-admin/centre' }]} />
      </RbmDensity>
    );
  },
  // The board's example: two available, Planned Change on by default.
  args: { settings: { available: ['planned-change', 'disaster-recovery'], defaults: ['planned-change'] } },
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<Args>;

/** As drawn. */
export const AsDrawn: Story = {};

/** The shipped default: every scenario available, Planned Change the only one on. */
export const ShippedDefault: Story = { args: { settings: SHIPPED_SCENARIO_SETTINGS } };

/** One available: locking it, or turning its default off, shows why Save changes is refused. */
export const OneAvailable: Story = { args: { settings: { available: ['planned-change'], defaults: ['planned-change'] } } };

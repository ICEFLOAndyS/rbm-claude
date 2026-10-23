import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmDomainCard, type RbmDomainCardSpec } from './RbmDomainCard';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, type DensityLevel } from '../../theme/tokens';
// No vendor logos are supplied (and none may be redrawn): ICEFLO's own mark stands in to show the logo tile.
import iceflo from '../RbmTopBar/assets/iceflo-mark.png';

type Args = { spec: RbmDomainCardSpec; level: DensityLevel };

const teams: RbmDomainCardSpec = { title: 'Teams', description: 'Groups that own tasks', icon: 'object.team', count: '12 teams', to: '#/rbm-admin/centre/teams' };
const withLogo: RbmDomainCardSpec = { title: 'ICEFLO', description: 'A stand-in for a vendor logo', icon: 'nav.integrations', logo: { src: iceflo }, status: { label: 'Connected', tone: 'on' }, to: '#' };

const levels: DensityLevel[] = ['command', 'comfortable', 'compact', 'dense'];

const meta: Meta<Args> = {
  title: 'Cards/RbmDomainCard',
  render: ({ spec, level }) => (
    <RbmDensity level={level}>
      <Box sx={{ width: 320, p: 4, bgcolor: colour.mist }}>
        <RbmDomainCard spec={spec} />
      </Box>
    </RbmDensity>
  ),
  args: { spec: teams, level: 'comfortable' },
  argTypes: { level: { control: 'inline-radio', options: levels } },
};
export default meta;

type Story = StoryObj<Args>;

/** Without a logo: the RBM icon on the pale fill, with a count (Cards board, D1). */
export const WithIcon: Story = {};

/** With a logo: white tile, hairline border, the mark fitted. ICEFLO stands in for a vendor. */
export const WithLogo: Story = { args: { spec: withLogo } };

/** A logo that fails to load falls back to the RBM icon. */
export const LogoFails: Story = { args: { spec: { ...withLogo, title: 'Broken logo', logo: { src: '/no-such-logo.svg' } } } };

/** Not connected: Slate, with a ring. */
export const NotConnected: Story = { args: { spec: { ...withLogo, title: 'Jira', description: 'Issues and change requests', logo: undefined, status: { label: 'Not connected', tone: 'off' } } } };

/** The four densities side by side, as on the board (D0 a column; D3 one row, no line). */
export const Densities: Story = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 5, alignItems: 'flex-start', p: 4, bgcolor: colour.mist }}>
      {levels.map((level) => (
        <RbmDensity key={level} level={level}>
          <Box sx={{ width: { command: 300, comfortable: 260, compact: 220, dense: 240 }[level] }}>
            <RbmDomainCard spec={teams} />
          </Box>
        </RbmDensity>
      ))}
    </Box>
  ),
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { RbmAdminPage, type RbmAdminPageProps } from './RbmAdminPage';
import { RbmDensity } from '../../theme/RbmDensity';
import type { DensityLevel } from '../../theme/tokens';
import { ADMIN_CENTRE, INTEGRATIONS, SETUP_CONFIG } from '../../data/admin/adminPages';

type Args = RbmAdminPageProps & { level: DensityLevel };

const meta: Meta<Args> = {
  title: 'Shell/RbmAdminPage',
  render: ({ level, ...args }) => (
    <RbmDensity level={level}>
      <RbmAdminPage {...args} />
    </RbmDensity>
  ),
  args: { page: ADMIN_CENTRE, level: 'compact', can: () => true, hrefFor: (to) => `#${to}`, onNavigate: () => {} },
  argTypes: { level: { control: 'inline-radio', options: ['comfortable', 'compact', 'dense', 'command'] }, page: { table: { disable: true } } },
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Args>;

/** Admin Centre at D2: Teams, Workstreams, License Management and Folders. */
export const AdminCentre: Story = {};

/** Admin Centre at D1. */
export const AdminCentreD1: Story = { name: 'Admin Centre, D1', args: { level: 'comfortable' } };

/** Setup & Config: System Properties, Integrations and Diagnostics. */
export const SetupConfig: Story = { name: 'Setup & Config', args: { page: SETUP_CONFIG } };

/** Integrations, as on the Cards board: one card per product with its status (no logos supplied yet). */
export const Integrations: Story = { args: { page: INTEGRATIONS, level: 'comfortable', breadcrumb: [{ label: 'Setup & Config', href: '#/rbm-admin/setup-config' }] } };

/** A user allowed none of the domains: a plain message, not an empty page. */
export const NoAccess: Story = {
  name: 'No access',
  args: { page: { ...ADMIN_CENTRE, domains: ADMIN_CENTRE.domains.map((d) => ({ ...d, permission: 'rbmAdmin' as const })) }, can: () => false },
};

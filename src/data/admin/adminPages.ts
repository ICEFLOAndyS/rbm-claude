import type { RbmIconName } from '../../icons/registry';
import type { RbmNavPermission } from '../nav/nav';

/**
 * The admin pages (app shell brief v5, section 4a; Andy Smith, 23 Oct 2026). Admin Centre and Setup & Config each
 * open a page that is mainly an array of cards, one per admin domain. The pattern repeats, so the pages are typed
 * data and one template (RbmAdminPage) draws them all. The domain lists can grow.
 */

export interface RbmAdminDomain {
  id: string;
  label: string;
  /** One short line. */
  description: string;
  /** A registry key, never a component: the card's fallback when there is no logo. */
  icon: RbmIconName;
  /** The domain's own page. */
  to: string;
  /** Shown only to users the platform grants this permission. */
  permission?: RbmNavPermission;
  /** The vendor's square mark, for a product (ServiceNow, AWS…). No logo files are supplied yet. */
  logo?: { src: string };
  status?: { label: string; tone: 'on' | 'off' };
  count?: string;
}

export interface RbmAdminPage {
  id: 'admin-centre' | 'setup-config' | 'integrations';
  title: string;
  /** The page's route. */
  route: string;
  /** One line under the title. */
  summary: string;
  domains: readonly RbmAdminDomain[];
}

/** Admin Centre: Teams, Workstreams, License Management and Folders (Andy Smith). */
export const ADMIN_CENTRE: RbmAdminPage = {
  id: 'admin-centre',
  title: 'Admin Centre',
  route: '/rbm-admin/centre',
  summary: 'The people, work and folders RBM is organised by.',
  domains: [
    // "Groups that own tasks" is the board's line; the other three lines are proposed.
    { id: 'teams', label: 'Teams', description: 'Groups that own tasks', icon: 'object.team', to: '/rbm-admin/centre/teams' },
    { id: 'workstreams', label: 'Workstreams', description: 'Strands of related work', icon: 'object.workstream', to: '/rbm-admin/centre/workstreams' },
    { id: 'licences', label: 'License Management', description: 'Licences and who holds them', icon: 'nav.license', to: '/rbm-admin/centre/licences' },
    { id: 'folders', label: 'Folders', description: 'How events and templates are filed', icon: 'nav.folder', to: '/rbm-admin/centre/folders' },
  ],
};

/** Setup & Config: System Properties, Integrations and Diagnostics ("will include": the list may grow). */
export const SETUP_CONFIG: RbmAdminPage = {
  id: 'setup-config',
  title: 'Setup & Config',
  route: '/rbm-admin/setup-config',
  summary: 'How RBM is set up, and what it connects to.',
  domains: [
    // "Check the health of the system" is the board's line; the other two are proposed.
    { id: 'system-properties', label: 'System Properties', description: 'Settings that apply across RBM', icon: 'admin.systemProperties', to: '/rbm-admin/setup-config/system-properties' },
    { id: 'integrations', label: 'Integrations', description: 'Connections to other products', icon: 'nav.integrations', to: '/rbm-admin/setup-config/integrations' },
    { id: 'diagnostics', label: 'Diagnostics', description: 'Check the health of the system', icon: 'admin.diagnostics', to: '/rbm-admin/setup-config/diagnostics' },
  ],
};

/**
 * The Integrations domain page, as the Cards board's example draws it: one card per product, with the vendor's
 * logo when supplied (none are yet, so each shows the Integrations icon). The products, lines and statuses are
 * the board's examples, which it says are invented.
 */
export const INTEGRATIONS: RbmAdminPage = {
  id: 'integrations',
  title: 'Integrations',
  route: '/rbm-admin/setup-config/integrations',
  summary: 'The products RBM connects to.',
  domains: [
    { id: 'servicenow', label: 'ServiceNow', description: 'Runbook and event records', icon: 'nav.integrations', to: '/rbm-admin/setup-config/integrations/servicenow', status: { label: 'Connected', tone: 'on' } },
    { id: 'aws', label: 'AWS', description: 'Cloud environments', icon: 'nav.integrations', to: '/rbm-admin/setup-config/integrations/aws', status: { label: 'Connected', tone: 'on' } },
    { id: 'jira', label: 'Jira', description: 'Issues and change requests', icon: 'nav.integrations', to: '/rbm-admin/setup-config/integrations/jira', status: { label: 'Not connected', tone: 'off' } },
    { id: 'microsoft-teams', label: 'Microsoft Teams', description: 'Messages and bridge calls', icon: 'nav.integrations', to: '/rbm-admin/setup-config/integrations/microsoft-teams', status: { label: 'Connected', tone: 'on' } },
  ],
};

export const ADMIN_PAGES: readonly RbmAdminPage[] = [ADMIN_CENTRE, SETUP_CONFIG, INTEGRATIONS];

const clean = (path: string) => (path.split(/[?#]/)[0] ?? '').replace(/\/+$/, '');

/** The admin page at a route, if any. */
export const adminPageAt = (path: string) => ADMIN_PAGES.find((p) => p.route === clean(path));

/** The admin domain whose own page is at a route, if any. */
export const adminDomainAt = (path: string) => ADMIN_PAGES.flatMap((p) => p.domains).find((d) => d.to === clean(path));

/** The admin page a domain's card is on. */
export const pageOfDomain = (domain: RbmAdminDomain) => ADMIN_PAGES.find((p) => p.domains.includes(domain));

/** The page a domain sits on: Integrations sits on Setup & Config, a product on Integrations. */
export const parentPageOf = (page: RbmAdminPage) => ADMIN_PAGES.find((p) => p.domains.some((d) => d.to === page.route));

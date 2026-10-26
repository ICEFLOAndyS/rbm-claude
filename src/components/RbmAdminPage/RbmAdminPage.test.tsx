import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { RbmAdminPage, type RbmAdminPageProps } from './RbmAdminPage';
import { RbmDensity } from '../../theme/RbmDensity';
import { rbmTheme } from '../../theme/theme';
import { ADMIN_CENTRE, ADMIN_PAGES, INTEGRATIONS, SETUP_CONFIG, adminDomainAt, adminPageAt, parentPageOf, type RbmAdminPage as Page } from '../../data/admin/adminPages';
import { rbmIconNames } from '../../icons/registry';

const renderPage = (props: Partial<RbmAdminPageProps> & { page: Page }) =>
  render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <RbmAdminPage can={() => true} {...props} />
      </RbmDensity>
    </ThemeProvider>,
  );

describe('admin pages data (brief 4a)', () => {
  it('Admin Centre has Teams, Workstreams, License Management, Folders and Scenarios', () => {
    expect(ADMIN_CENTRE.domains.map((d) => d.label)).toEqual(['Teams', 'Workstreams', 'License Management', 'Folders', 'Scenarios']);
    expect(ADMIN_CENTRE.route).toBe('/rbm-admin/centre');
  });

  it('Setup & Config has System Properties, Integrations and Diagnostics', () => {
    expect(SETUP_CONFIG.domains.map((d) => d.label)).toEqual(['System Properties', 'Integrations', 'Diagnostics']);
    expect(SETUP_CONFIG.route).toBe('/rbm-admin/setup-config');
  });

  it('uses the icons the brief names, and every one is registered', () => {
    expect([...ADMIN_CENTRE.domains, ...SETUP_CONFIG.domains].map((d) => d.icon)).toEqual([
      'object.team', 'object.workstream', 'nav.license', 'nav.folder', 'admin.scenarios',
      'admin.systemProperties', 'nav.integrations', 'admin.diagnostics',
    ]);
    for (const d of ADMIN_PAGES.flatMap((p) => p.domains)) expect(rbmIconNames).toContain(d.icon);
  });

  it('puts every domain page under its admin page, with unique routes', () => {
    for (const p of ADMIN_PAGES) for (const d of p.domains) expect(d.to.startsWith(`${p.route}/`)).toBe(true);
    const domains = ADMIN_PAGES.flatMap((p) => p.domains.map((d) => d.to));
    expect(new Set(domains).size).toBe(domains.length);
    // A domain page can itself be an admin page: Integrations is a card on Setup & Config and a page of cards.
    expect(SETUP_CONFIG.domains.find((d) => d.id === 'integrations')!.to).toBe(INTEGRATIONS.route);
  });

  it('finds a page and a domain by route, and a page’s parent', () => {
    expect(adminPageAt('/rbm-admin/centre')).toBe(ADMIN_CENTRE);
    expect(adminPageAt('/rbm-admin/setup-config/integrations/')).toBe(INTEGRATIONS);
    expect(adminDomainAt('/rbm-admin/centre/teams')?.label).toBe('Teams');
    expect(parentPageOf(INTEGRATIONS)).toBe(SETUP_CONFIG);
    expect(parentPageOf(ADMIN_CENTRE)).toBeUndefined();
  });
});

describe('RbmAdminPage', () => {
  it('has the page header and one card link per domain, in order', () => {
    renderPage({ page: ADMIN_CENTRE });
    expect(screen.getByRole('heading', { level: 1, name: 'Admin Centre' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Admin Centre' });
    expect(within(list).getAllByRole('link').map((l) => l.getAttribute('aria-labelledby') && document.getElementById(l.getAttribute('aria-labelledby')!)!.textContent)).toEqual([
      'Teams', 'Workstreams', 'License Management', 'Folders', 'Scenarios',
    ]);
  });

  it('links each card through hrefFor', () => {
    renderPage({ page: SETUP_CONFIG, hrefFor: (to) => `#${to}` });
    expect(screen.getByRole('link', { name: 'Diagnostics' })).toHaveAttribute('href', '#/rbm-admin/setup-config/diagnostics');
  });

  it('hides a card whose domain needs a permission the user lacks', () => {
    const page: Page = { ...ADMIN_CENTRE, domains: [ADMIN_CENTRE.domains[0]!, { ...ADMIN_CENTRE.domains[1]!, permission: 'rbmAdmin' }] };
    renderPage({ page, can: () => false });
    expect(screen.getByRole('link', { name: 'Teams' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Workstreams' })).toBeNull();
  });

  it('says so plainly when no domain is allowed, rather than an empty page', () => {
    const page: Page = { ...ADMIN_CENTRE, domains: ADMIN_CENTRE.domains.map((d) => ({ ...d, permission: 'rbmAdmin' as const })) };
    renderPage({ page, can: () => false });
    expect(screen.getByRole('status')).toHaveTextContent('You do not have access to anything on Admin Centre.');
  });

  it('shows the Integrations page with each product’s status', () => {
    renderPage({ page: INTEGRATIONS, breadcrumb: [{ label: 'Setup & Config', href: '#/rbm-admin/setup-config' }] });
    expect(screen.getByRole('link', { name: 'Jira' })).toHaveAccessibleDescription('Issues and change requests Not connected');
    expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: 'Setup & Config' })).toBeInTheDocument();
  });
});

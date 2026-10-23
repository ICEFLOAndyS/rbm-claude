import { Box } from '@mui/material';
import { RbmPageHeader, type RbmCrumbs } from '../RbmPageHeader/RbmPageHeader';
import { RbmDomainCard, domainCardMinWidth } from '../RbmDomainCard/RbmDomainCard';
import { useDensity } from '../../theme/RbmDensity';
import { colour, shellSize } from '../../theme/tokens';
import type { RbmAdminPage as RbmAdminPageData } from '../../data/admin/adminPages';
import type { RbmNavPermission } from '../../data/nav/nav';

/**
 * An admin page (app shell brief v5, section 4a): the page header, then a grid of admin domain cards. Admin
 * Centre, Setup & Config and Integrations are all this one template, fed from typed data.
 *
 * Not drawn (proposed, flagged): the grid. Cards fill columns of at least the card's minimum width for the
 * density (the Cards board's sizes table), with the density's gap, so every card on a row is the same size.
 */

export interface RbmAdminPageProps {
  page: RbmAdminPageData;
  /** Whether the platform grants a permission. A card whose domain needs one the user lacks is not shown. */
  can?: (permission: RbmNavPermission) => boolean;
  /** The parents, as links (for example Setup & Config above Integrations). */
  breadcrumb?: RbmCrumbs;
  /** A domain's link; the prototype uses hash routes. */
  hrefFor?: (to: string) => string;
  onNavigate?: (to: string) => void;
}

export function RbmAdminPage({ page, can = () => false, breadcrumb = [], hrefFor = (to) => to, onNavigate }: RbmAdminPageProps) {
  const d = useDensity();
  const domains = page.domains.filter((x) => !x.permission || can(x.permission));
  return (
    <Box component="main" sx={{ p: `${shellSize[d.level].pagePadding}px`, display: 'flex', flexDirection: 'column', gap: `${d.gap + 8}px`, minHeight: '100%', boxSizing: 'border-box', bgcolor: colour.mist }}>
      <RbmPageHeader title={page.title} breadcrumb={breadcrumb} metadata={page.summary} />
      {domains.length === 0 ? (
        // Not drawn: a plain message rather than an empty page (brief 4a).
        <Box role="status" sx={{ p: 6, border: `1px solid ${colour.rule}`, borderRadius: '14px', bgcolor: colour.white, color: colour.slate, fontSize: d.body }}>
          You do not have access to anything on {page.title}. Ask your RBM administrator.
        </Box>
      ) : (
        <Box
          component="ul"
          aria-label={page.title}
          sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${domainCardMinWidth(d.level)}px, 1fr))`, gap: `${d.gap}px` }}
        >
          {domains.map((x) => (
            <li key={x.id}>
              <RbmDomainCard spec={{ title: x.label, description: x.description, icon: x.icon, logo: x.logo, status: x.status, count: x.count, to: x.to }} href={hrefFor(x.to)} onNavigate={onNavigate} />
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
}

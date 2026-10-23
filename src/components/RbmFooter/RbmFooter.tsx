import { Box, Chip, Link, useMediaQuery } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import { RbmStatusDot } from '../RbmStatusPill/RbmStatusPill';
import { useDensity } from '../../theme/RbmDensity';
import { colour, shellSize, stroke, type DensityLevel } from '../../theme/tokens';

/**
 * The footer (App shell board, "Footer"): fixed to the bottom, always visible, always quiet. Left to right:
 * copyright and version, then sync time and environment, then Privacy, Support and Knowledge (each in a new
 * tab). No actions and no colour, except a lost connection ("Reconnecting", with the At risk ringed dot).
 * A non-production environment is a chip, so nobody rehearses in the wrong place.
 *
 *   900 px and above  everything
 *   600 to 899 px     no links
 *   under 600 px      version and sync time only
 *   D0 Command        Deep Blue: connection, sync time and version
 */

export type RbmFooterLink = 'privacy' | 'support' | 'knowledge';

const linkLabels: Record<RbmFooterLink, string> = { privacy: 'Privacy', support: 'Support', knowledge: 'Knowledge' };
/** Read by screen readers, not shown. */
const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' } as const;

const linkOrder: readonly RbmFooterLink[] = ['privacy', 'support', 'knowledge'];

/** Side padding as drawn at each level (page chrome, not on the density scale). */
const padX: Record<DensityLevel, number> = { command: 32, comfortable: 24, compact: 20, dense: 16 };

export interface RbmFooterProps {
  /** The RBM version, for example "4.2.0". */
  version: string;
  /** The copyright year. Defaults to this year. */
  year?: number;
  /** When the data was last brought up to date, as shown: "10:42:18". */
  updatedAt?: string;
  /** A lost connection shows "Reconnecting" in place of the sync time. */
  connection?: 'live' | 'reconnecting';
  environment?: { name: string; production: boolean };
  /** Where each link goes. A link without an address is not shown. */
  links?: Partial<Record<RbmFooterLink, string>>;
}

function NewTab() {
  return <Box component="span" sx={visuallyHidden}> (opens in a new tab)</Box>;
}

function Reconnecting({ onDark = false }: { onDark?: boolean }) {
  return (
    <Box component="span" role="status" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: onDark ? colour.white : colour.amberDeep, fontWeight: 600 }}>
      <RbmStatusDot state="atRisk" />
      Reconnecting
    </Box>
  );
}

export function RbmFooter({ version, year = new Date().getFullYear(), updatedAt, connection = 'live', environment, links = {} }: RbmFooterProps) {
  const d = useDensity();
  const height = shellSize[d.level].footer;
  const phone = useMediaQuery('(max-width: 599.98px)', { noSsr: true });
  const showLinks = useMediaQuery('(min-width: 900px)', { noSsr: true });
  const reconnecting = connection === 'reconnecting';

  if (d.level === 'command') {
    return (
      <Box
        component="footer"
        sx={{ height, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 5, px: `${padX.command}px`, bgcolor: colour.deepBlue, color: colour.white, fontSize: 14, whiteSpace: 'nowrap' }}
      >
        {reconnecting ? (
          <Reconnecting onDark />
        ) : (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            {/* Drawn Green; white here, because Brand Green means Complete only (flagged). */}
            <Box component="span" aria-hidden sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: colour.white, flex: 'none' }} />
            Live
          </Box>
        )}
        {updatedAt && !reconnecting && <span>Updated {updatedAt}</span>}
        <Box sx={{ flex: 1 }} />
        <span>RBM {version}</span>
      </Box>
    );
  }

  const shownLinks = linkOrder.filter((k) => links[k]);
  return (
    <Box
      component="footer"
      sx={{
        height,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        px: `${padX[d.level]}px`,
        bgcolor: colour.white,
        borderTop: `${stroke.thin}px solid ${colour.rule}`,
        fontSize: 12,
        color: colour.slate,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span>{phone ? `RBM ${version}` : `© ${year} ICEFLO Limited · RBM ${version}`}</span>
      <Box sx={{ flex: 1 }} />
      {reconnecting ? (
        <Reconnecting />
      ) : (
        updatedAt && (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <RbmIcon name="shell.synced" size={14} />
            Updated {updatedAt}
          </Box>
        )
      )}
      {environment && !phone &&
        (environment.production ? (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <RbmIcon name="shell.environment" size={14} />
            {environment.name}
          </Box>
        ) : (
          // Not drawn: the chip for a non-production environment.
          <Chip
            size="small"
            variant="outlined"
            label={environment.name}
            icon={<RbmIcon name="shell.environment" size={14} />}
            sx={{ height: 20, fontSize: 12, fontWeight: 700, color: colour.ink, borderColor: colour.silver, '& .MuiChip-icon': { color: colour.slate, ml: '6px' } }}
          />
        ))}
      {showLinks && shownLinks.length > 0 && (
        <Box component="nav" aria-label="Help and legal" sx={{ display: 'inline-flex', gap: 4 }}>
          {shownLinks.map((k) => (
            <Link key={k} href={links[k]} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ fontWeight: 600, color: colour.deepBlue }}>
              {linkLabels[k]}
              <NewTab />
            </Link>
          ))}
        </Box>
      )}
    </Box>
  );
}

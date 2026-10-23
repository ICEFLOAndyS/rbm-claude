import { useId, useState } from 'react';
import { Box, Card, CardActionArea } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import type { RbmIconName } from '../../icons/registry';
import { useDensity } from '../../theme/RbmDensity';
import { colour, stroke, type DensityLevel } from '../../theme/tokens';

/**
 * The Admin domain card (Cards board, "Admin domain card", design version 106, Proposed): one per admin domain
 * on the Admin Centre and Setup & Config pages. A media tile, the name, one short line, and at most one status
 * or count. The whole card is one link, with no buttons inside.
 *
 * The tile holds the vendor's own logo where there is one (white, with a hairline border, the logo fitted and
 * never recoloured) and otherwise the RBM icon for the domain (pale fill, Deep Blue, no border). A logo that is
 * missing or fails to load falls back to the icon. The logo is decorative: the title is the accessible name.
 */

export interface RbmDomainCardSpec {
  title: string;
  /** One short line. Not shown at D3. */
  description: string;
  /** Always set: the fallback when there is no logo, for example 'object.team'. */
  icon: RbmIconName;
  /** The vendor's square mark, SVG preferred. Decorative. */
  logo?: { src: string };
  /** A status: a dot and text, never colour alone. "on" is Blue Dark (not green: Brand Green means Complete only). */
  status?: { label: string; tone: 'on' | 'off' };
  /** A count, for example "12 teams". At most one of status and count. */
  count?: string;
  /** The domain's own page. */
  to: string;
}

/** The board's "Sizes by density" for this card. */
const sizes: Record<DensityLevel, { minWidth: number; tile: number; logo: number; icon: number; pad: number; gap: number; title: number; titleWeight: number; text: number; radius: number; tileRadius: number }> = {
  command: { minWidth: 300, tile: 88, logo: 64, icon: 44, pad: 24, gap: 20, title: 24, titleWeight: 800, text: 15, radius: 14, tileRadius: 12 },
  comfortable: { minWidth: 260, tile: 56, logo: 40, icon: 32, pad: 16, gap: 14, title: 16, titleWeight: 700, text: 13, radius: 14, tileRadius: 12 },
  compact: { minWidth: 220, tile: 40, logo: 28, icon: 24, pad: 12, gap: 12, title: 14, titleWeight: 700, text: 12, radius: 14, tileRadius: 12 },
  dense: { minWidth: 240, tile: 28, logo: 20, icon: 16, pad: 8, gap: 8, title: 12, titleWeight: 700, text: 12, radius: 10, tileRadius: 8 },
};

/** The smallest width a card takes at a level: the page grid uses it. */
export const domainCardMinWidth = (level: DensityLevel) => sizes[level].minWidth;

export interface RbmDomainCardProps {
  spec: RbmDomainCardSpec;
  /** The link's address; by default the spec's route. The prototype passes a hash route. */
  href?: string;
  /** A plain click, instead of following the link (a click with a modifier key follows it). */
  onNavigate?: (to: string) => void;
}

function Tile({ spec }: { spec: RbmDomainCardSpec }) {
  const d = useDensity();
  const s = sizes[d.level];
  const [failed, setFailed] = useState(false);
  const logo = spec.logo && !failed;
  return (
    <Box
      component="span"
      data-testid="rbm-domain-tile"
      data-media={logo ? 'logo' : 'icon'}
      sx={{
        width: s.tile,
        height: s.tile,
        flex: 'none',
        boxSizing: 'border-box',
        borderRadius: `${s.tileRadius}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(logo ? { bgcolor: colour.white, border: `${stroke.thin}px solid ${colour.rule}` } : { bgcolor: colour.mist, color: colour.deepBlue }),
      }}
    >
      {logo ? (
        // Fit, do not fill: the vendor's mark is never cropped, stretched or recoloured.
        <Box component="img" src={spec.logo!.src} alt="" onError={() => setFailed(true)} sx={{ width: s.logo, height: s.logo, objectFit: 'contain', display: 'block' }} />
      ) : (
        <RbmIcon name={spec.icon} size={s.icon} />
      )}
    </Box>
  );
}

function Value({ spec, size, id }: { spec: RbmDomainCardSpec; size: number; id: string }) {
  if (spec.status) {
    const on = spec.status.tone === 'on';
    return (
      <Box component="span" id={id} sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: size, fontWeight: 600, color: on ? colour.blueDark : colour.slate, whiteSpace: 'nowrap' }}>
        <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', boxSizing: 'border-box', ...(on ? { bgcolor: colour.blueDark } : { border: `1.5px solid ${colour.slate}` }) }} />
        {spec.status.label}
      </Box>
    );
  }
  if (spec.count)
    return (
      <Box component="span" id={id} sx={{ fontSize: size, fontWeight: 600, color: colour.ink, whiteSpace: 'nowrap' }}>
        {spec.count}
      </Box>
    );
  return null;
}

export function RbmDomainCard({ spec, href, onNavigate }: RbmDomainCardProps) {
  const d = useDensity();
  const s = sizes[d.level];
  const dense = d.level === 'dense';
  const column = d.level === 'command';
  const id = useId();
  const hasValue = !!(spec.status || spec.count);
  // The title is the link's name; the line and the value describe it (rule 5: never the name twice).
  const describedBy = [dense ? '' : `${id}-desc`, hasValue ? `${id}-value` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <Card variant="outlined" sx={{ borderRadius: `${s.radius}px`, borderColor: colour.rule, bgcolor: colour.white, color: colour.ink, minWidth: 0, height: '100%' }}>
      <CardActionArea
        href={href ?? spec.to}
        aria-labelledby={`${id}-title`}
        aria-describedby={describedBy}
        onClick={(e) => {
          if (onNavigate && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            onNavigate(spec.to);
          }
        }}
        sx={{
          height: '100%',
          boxSizing: 'border-box',
          p: `${s.pad}px`,
          display: 'flex',
          flexDirection: column ? 'column' : 'row',
          alignItems: column ? 'flex-start' : dense ? 'center' : 'flex-start',
          justifyContent: 'flex-start',
          gap: `${s.gap}px`,
          // The Clickable card's focus: the 2 px Blue Dark ring.
          '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: -stroke.thick },
        }}
      >
        <Tile spec={spec} />
        {dense ? (
          // D3: one row, the name and the value; no description.
          <>
            <Box component="span" id={`${id}-title`} sx={{ flex: 1, minWidth: 0, fontSize: s.title, fontWeight: s.titleWeight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {spec.title}
            </Box>
            <Value spec={spec} size={s.text} id={`${id}-value`} />
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: column ? '6px' : '2px', minWidth: 0 }}>
            <Box component="span" id={`${id}-title`} sx={{ fontSize: s.title, fontWeight: s.titleWeight, letterSpacing: column ? '-0.02em' : undefined }}>
              {spec.title}
            </Box>
            <Box component="span" id={`${id}-desc`} sx={{ fontSize: s.text, color: colour.slate, lineHeight: 1.4 }}>
              {spec.description}
            </Box>
            {hasValue && (
              <Box sx={{ mt: '2px' }}>
                <Value spec={spec} size={s.text} id={`${id}-value`} />
              </Box>
            )}
          </Box>
        )}
      </CardActionArea>
    </Card>
  );
}

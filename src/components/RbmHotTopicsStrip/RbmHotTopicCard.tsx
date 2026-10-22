import { Box, ButtonBase } from '@mui/material';
import type { ReactNode } from 'react';
import { colour, hairline, radius, stroke } from '../../theme/tokens';
import { hitTarget, useDensity } from '../../theme/RbmDensity';

export interface RbmHotTopicCardProps {
  title: string;
  /** The header icon, at the density's icon size. */
  icon: ReactNode;
  /** The count badge, for list cards. A list card with nothing in it collapses to its header with a zero count. */
  count?: number;
  /** A header action, for example "+ Raise". */
  action?: ReactNode;
  children?: ReactNode;
}

export function Icon({ size: sizeProp, stroke = 'currentColor', width = 1.75, children }: { size?: number; stroke?: string; width?: number; children: ReactNode }) {
  const { icon } = useDensity();
  const size = sizeProp ?? icon;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

/** A card in the Hot-topics strip: the drawn header (icon, title, count, action) over its rows. */
export function RbmHotTopicCard({ title, icon, count, action, children }: RbmHotTopicCardProps) {
  const d = useDensity();
  const empty = count === 0;
  return (
    <Box component="section" aria-label={title} sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', overflow: 'hidden', width: '100%', minWidth: 0, lineHeight: 'normal' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: 44, px: `${d.padX}px`, whiteSpace: 'nowrap' }}>
        {icon}
        <Box component="h3" sx={{ m: 0, fontSize: d.caption, fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'primary.main' }}>
          {title}
        </Box>
        {count !== undefined && (
          <Box component="span" aria-label={`${count} ${count === 1 ? 'item' : 'items'}`} sx={{ minWidth: 20, height: 20, px: 1.5, borderRadius: `${radius.pill}px`, bgcolor: 'primary.main', color: colour.white, fontSize: d.caption, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
            {count}
          </Box>
        )}
        <Box sx={{ flex: 1 }} />
        {action}
      </Box>
      {!empty && children}
    </Box>
  );
}

/** A row that opens its record in the slide-in. */
export function CardRow({ onOpen, label, children, sx }: { onOpen?: () => void; label: string; children: ReactNode; sx?: object }) {
  return (
    <ButtonBase
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={label}
      sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', textAlign: 'left', fontFamily: 'inherit', color: 'text.primary', borderTop: `${stroke.thin}px solid ${hairline}`, '&.Mui-disabled': { color: 'text.primary' }, '&.Mui-focusVisible': { outlineOffset: -2 }, ...sx }}
    >
      {children}
    </ButtonBase>
  );
}

/** "n more", after the first three items. */
export function MoreRow({ n, onClick }: { n: number; onClick?: () => void }) {
  const d = useDensity();
  if (n <= 0) return null;
  return (
    <Box sx={{ borderTop: `${stroke.thin}px solid ${hairline}`, px: `${d.padX}px`, py: 2 }}>
      <ButtonBase onClick={onClick} sx={{ fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.light', borderRadius: 1, px: 0.5, ...hitTarget(d.target) }}>
        {n} more
      </ButtonBase>
    </Box>
  );
}

/** "Join call": a secondary button, never green. Disabled with its opening time until the call opens. */
export function JoinCall({ onJoin, disabledText, label }: { onJoin?: () => void; disabledText?: string; label: string }) {
  const d = useDensity();
  return (
    <ButtonBase
      onClick={onJoin}
      disabled={!!disabledText}
      aria-label={disabledText ? `${label}, ${disabledText.toLowerCase()}` : label}
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: d.control, px: 4.5, borderRadius: `${d.radius}px`, fontFamily: 'inherit', fontSize: d.body, fontWeight: 700, whiteSpace: 'nowrap', bgcolor: colour.white, color: colour.deepBlue, border: `${stroke.thin}px solid ${colour.silver}`, '&.Mui-disabled': { color: colour.slate, bgcolor: colour.mist } }}
    >
      <Icon size={18}><path d="M6 4h3l1.5 4-2 1.5a11 11 0 005 5L15 12.5l4 1.5v3a2 2 0 01-2 2A13 13 0 014 6a2 2 0 012-2z" /></Icon>
      {disabledText ?? 'Join call'}
    </ButtonBase>
  );
}

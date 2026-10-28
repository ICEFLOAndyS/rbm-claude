import { Box, ButtonBase } from '@mui/material';
import type { CSSProperties, ReactNode } from 'react';
import { radius } from '../../theme/tokens';
import { hitTarget, useDensity } from '../../theme/RbmDensity';

/**
 * The shared frame for the movable regions (Event ribbon, Task Timeline, Hot-topics strip).
 * Expanded, a region shows a "Collapse" link at its top right. Collapsed, it is one 56 px line:
 * the eyebrow title, a summary of chips, and "Expand". The line is drawn for the Event ribbon
 * only; the other regions follow it (agreed 22 Oct 2026, flagged as not drawn).
 */

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  );
}

/** A text link with a chevron, as drawn on the ribbon: "Collapse ⌃" or "Expand ⌄". */
export function RbmToggleLink({ onClick, children, label, sx, style }: { onClick: () => void; children: ReactNode; label?: string; sx?: object; style?: CSSProperties }) {
  const d = useDensity();
  return (
    <ButtonBase onClick={onClick} aria-label={label} style={style} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', borderRadius: 1, ...hitTarget(d.target), ...sx }}>
      {children}
    </ButtonBase>
  );
}

export interface RbmRegionToggleProps {
  /** The region's name, for example "Task Timeline": the button is named "Collapse Task Timeline". */
  region: string;
  collapsed: boolean;
  onChange: (collapsed: boolean) => void;
  sx?: object;
}

/** "Collapse ⌃" on an expanded region, "Expand ⌄" on a collapsed one. */
export function RbmRegionToggle({ region, collapsed, onChange, sx }: RbmRegionToggleProps) {
  return (
    <RbmToggleLink onClick={() => onChange(!collapsed)} label={`${collapsed ? 'Expand' : 'Collapse'} ${region}`} sx={sx}>
      {collapsed ? 'Expand' : 'Collapse'}
      <Chevron up={!collapsed} />
    </RbmToggleLink>
  );
}

/** The small uppercase title on a region, for example "EVENT RIBBON". */
export function RbmEyebrow({ children }: { children: ReactNode }) {
  return (
    <Box component="span" aria-hidden="true" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', whiteSpace: 'nowrap' }}>
      {children}
    </Box>
  );
}

/** One chip in a collapsed region's summary. `label` is what a screen reader hears. */
export function RbmSummaryChip({ label, children }: { label: string; children: ReactNode }) {
  // A label, not a control: the drawn 32 px height stays; the text is the density's body text.
  const d = useDensity();
  return (
    <Box
      component="li"
      aria-label={label}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 32, px: 3, border: 1, borderColor: 'divider', borderRadius: `${radius.pill}px`, fontSize: d.body, whiteSpace: 'nowrap', flex: 'none' }}
    >
      {children}
    </Box>
  );
}

export interface RbmRegionCollapsedProps {
  /** The region's name: the eyebrow, and the section's accessible name unless `label` is given. */
  title: string;
  /** The section's accessible name, where the title alone would repeat another region's. */
  label?: string;
  /** The summary chips (RbmSummaryChip). */
  children: ReactNode;
  onExpand: () => void;
}

/** A collapsed region: one 56 px line with the eyebrow title, the summary and "Expand". */
export function RbmRegionCollapsed({ title, label = title, children, onExpand }: RbmRegionCollapsedProps) {
  return (
    <Box
      component="section"
      aria-label={label}
      data-collapsed="true"
      sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 3.5, height: 56, px: 4, lineHeight: 'normal', boxSizing: 'border-box', minWidth: 0 }}
    >
      <RbmEyebrow>{title}</RbmEyebrow>
      <Box component="ul" aria-label={`${title} summary`} sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 2.5, flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {children}
      </Box>
      <RbmRegionToggle region={title} collapsed onChange={() => onExpand()} />
    </Box>
  );
}

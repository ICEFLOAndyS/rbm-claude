import type { ReactNode } from 'react';
import { Button, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import { colour, stroke } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';

/**
 * The bulk action bar of a list page: selecting rows swaps the list toolbar for it (Page templates
 * board, "1 · List of records", Rules). Not drawn. Decided by Andy Smith (22 Oct 2026): MUI's
 * selection toolbar for function and layout (the "n selected" toolbar of MUI's table examples), styled
 * with the RBM tokens. It is one row tall, like the list toolbar, so the grid does not move when it swaps in.
 *
 * Each list passes its own actions; the page runs them on the selected rows.
 */

export interface RbmBulkAction {
  id: string;
  /** Short and plain: "Export", "Change owner…". */
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  /** With the reason, shown in a tooltip, so the user learns why. */
  disabled?: boolean;
  disabledReason?: string;
  /** "danger" for an action that removes or cannot be undone. */
  tone?: 'default' | 'danger';
}

export interface RbmListBulkActionProps {
  /** How many rows are selected, across every page. */
  count: number;
  /** "event" and "events", for "3 events selected". */
  noun: { one: string; many: string };
  actions: RbmBulkAction[];
  onClear: () => void;
}

export function RbmListBulkAction({ count, noun, actions, onClear }: RbmListBulkActionProps) {
  const d = useDensity();
  const text = `${count} ${count === 1 ? noun.one : noun.many} selected`;
  return (
    <Toolbar
      role="toolbar"
      aria-label={`Actions for ${text}`}
      disableGutters
      sx={{
        // One row tall, like the list toolbar, so the grid stays where it is.
        minHeight: `${d.row}px !important`,
        height: d.row,
        gap: `${d.gap}px`,
        px: `${d.padX}px`,
        borderRadius: `${d.radius}px`,
        // MUI's selected tint, in Deep Blue, as the toolbar's "on" filters use.
        bgcolor: 'rgba(35,50,111,0.08)',
        border: `${stroke.thin}px solid ${colour.deepBlue}`,
        boxSizing: 'border-box',
        flexWrap: 'nowrap',
        overflowX: 'auto',
      }}
    >
      <Typography component="span" aria-live="polite" sx={{ fontSize: d.body, fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', flex: '1 1 auto' }}>
        {text}
      </Typography>
      {actions.map((a) => {
        const button = (
          <Button
            key={a.id}
            variant="outlined"
            color={a.tone === 'danger' ? 'error' : 'primary'}
            startIcon={a.icon}
            disabled={a.disabled}
            onClick={a.onSelect}
            sx={{ height: d.control, px: 3, fontSize: d.body, borderWidth: stroke.thin, whiteSpace: 'nowrap', flex: 'none', bgcolor: colour.white, '&:hover': { borderWidth: stroke.thin } }}
          >
            {a.label}
          </Button>
        );
        return a.disabled && a.disabledReason ? (
          <Tooltip key={a.id} title={a.disabledReason}>
            {/* A disabled button takes no pointer events; the span carries the tooltip. */}
            <span style={{ display: 'inline-flex' }}>{button}</span>
          </Tooltip>
        ) : (
          button
        );
      })}
      <Tooltip title="Clear selection">
        <IconButton onClick={onClear} aria-label="Clear selection" sx={{ color: 'primary.main', flex: 'none', width: d.control, height: d.control }}>
          <svg width={d.icon} height={d.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </IconButton>
      </Tooltip>
    </Toolbar>
  );
}

import type { ReactNode } from 'react';
import { Box, Snackbar } from '@mui/material';
import { colour } from '../../theme/tokens';
import { RbmDensity } from '../../theme/RbmDensity';
import { RbmRecordDrawer, PANEL_WIDTH, useDrawerMode } from '../RbmRecord/RbmRecordDrawer';
import type { RbmRecordContainer } from '../RbmRecord/RbmRecord';

/**
 * The List of records template (Page templates board, "1 · List of records"). One component that
 * fills typed slots, so developers fill slots and do not write layout. Every slot is required: a
 * missing slot is a compile error. A slot that can be absent at run time takes `null` explicitly.
 *
 * As drawn: the page on Mist with 24 px padding and 18 px between zones; the page header (the
 * breadcrumb, the 24 px title, the count line, and the actions on the right, aligned to the bottom);
 * the toolbar, one row; then the one grid. The page is a D2 Compact region (decision D3).
 *
 * The page swaps the toolbar for the bulk bar while rows are selected (board rule), shows the empty
 * state in place of the grid, and the error (or no access) state in place of the toolbar and grid.
 * The record panel opens in its drawer; beside the list, the list makes room for it.
 *
 * The app shell (top bar and rail) is not part of this template.
 */

export interface RbmListPageRecord {
  container: RbmRecordContainer;
  /** The backdrop of the overlay closes the panel. Pass a guarded close (RbmRecord.confirmLeave). */
  onClose: () => void;
  /** The RbmRecord panel. */
  panel: ReactNode;
}

export interface RbmListPageProps {
  /** The page title, plural: "Events". */
  title: string;
  /** The count line: "128 events · filtered to Production". Announced when it changes. */
  count: string;
  /** Page actions: Import (secondary) and New … (the green CTA). */
  actions: ReactNode;
  /** RbmListToolbar. */
  toolbar: ReactNode;
  /** RbmListBulkAction while rows are selected; `null` otherwise. Replaces the toolbar. */
  bulkBar: ReactNode | null;
  /** The one RbmDataGrid, with RbmPagination in its footer. While it first loads, RbmListLoading. */
  grid: ReactNode;
  /** The open record; `null` when no row is open. */
  record: RbmListPageRecord | null;
  /** RbmListEmpty when nothing is listed; `null` otherwise. Replaces the grid; the toolbar stays. */
  emptyState: ReactNode | null;
  /** RbmListError or RbmListNoAccess (RbmListFailure); `null` otherwise. Replaces the toolbar and grid. */
  errorState: ReactNode | null;
  /** The trail above the title. Drawn as the list's name: ["Events"]. */
  breadcrumb?: readonly string[];
  /** A short message after an action ("2 events exported."), in MUI's snackbar (not drawn). */
  message?: { text: string; onClose: () => void } | null;
}

const PAGE_PADDING = 24;
const ZONE_GAP = 18;

export function RbmListPage({ title, count, actions, toolbar, bulkBar, grid, record, emptyState, errorState, breadcrumb = [title], message }: RbmListPageProps) {
  const mode = useDrawerMode(record?.container ?? 'slideIn');
  const beside = !!record && mode === 'beside';
  return (
    <RbmDensity level="compact">
      <Box
        component="main"
        sx={{
          minHeight: '100%',
          boxSizing: 'border-box',
          bgcolor: colour.mist,
          p: `${PAGE_PADDING}px`,
          // Beside the list, the panel takes its width from the page rather than covering the grid.
          pr: beside ? `${PAGE_PADDING + PANEL_WIDTH[record.container]}px` : `${PAGE_PADDING}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: `${ZONE_GAP}px`,
        }}
      >
        <Box component="header" sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            {breadcrumb.length > 0 && (
              <Box component="nav" aria-label="Breadcrumb" sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                {breadcrumb.join(' / ')}
              </Box>
            )}
            <Box component="h1" sx={{ m: 0, fontSize: 24, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.025em', color: 'text.primary' }}>
              {title}
            </Box>
            <Box aria-live="polite" sx={{ fontSize: 13, color: 'text.secondary' }}>
              {count}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>{actions}</Box>
        </Box>

        {errorState ?? (
          <>
            {bulkBar ?? toolbar}
            {emptyState ?? grid}
          </>
        )}
      </Box>

      <RbmRecordDrawer open={!!record} container={record?.container ?? 'slideIn'} onClose={() => record?.onClose()}>
        {record?.panel}
      </RbmRecordDrawer>

      <Snackbar open={!!message} message={message?.text} autoHideDuration={8000} onClose={() => message?.onClose()} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </RbmDensity>
  );
}

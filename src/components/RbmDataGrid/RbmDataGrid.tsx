import { useImperativeHandle, useMemo, type Ref } from 'react';
import { Box, useTheme } from '@mui/material';
import {
  DataGridPro,
  GridActionsCellItem,
  GridPreferencePanelsValue,
  useGridApiRef,
  type GridColDef,
  type GridColumnVisibilityModel,
  type GridRenderCellParams,
  type GridRowSelectionModel,
  type GridSortModel,
} from '@mui/x-data-grid-pro';
import type { ColumnDef, ColumnState, PersonRef, SortItem } from '../../data/list/types';
import { formatDay, shortName } from '../../data/list/format';
import type { RbmState } from '../../theme/tokens';
import { colour, radius, stroke } from '../../theme/tokens';

/**
 * The one grid on a list page (Page templates board, "1 · List of records"), on MUI X Data Grid Pro
 * (decisions D1 and D4). It is the only component that imports MUI X.
 *
 * The grid shows one page that the server has already searched, filtered, sorted and paged. It never
 * sorts or pages rows itself: a header click asks for a new sort with `onSortChange`.
 */

/** As drawn at D2 Compact on the board: 40 px header, 36 px rows, 13 px text. */
export const GRID_HEADER_HEIGHT = 40;
export const GRID_ROW_HEIGHT = 36;

export interface RbmGridRowAction {
  id: string;
  label: string;
  onSelect: () => void;
}

export interface RbmDataGridHandle {
  /** Opens the column chooser. The list toolbar's Columns button calls it. */
  openColumnChooser(): void;
}

export interface RbmDataGridProps<Row extends { id: string }, F extends string> {
  /** The grid's accessible name, such as "Events". */
  label: string;
  columns: readonly ColumnDef<F>[];
  /** The current page, as the server returned it. */
  rows: readonly Row[];
  sort: SortItem<F>[];
  onSortChange: (sort: SortItem<F>[]) => void;
  /** Which columns show, in what order and width. A saved view or the user's preference sets it. */
  columnState: ColumnState<F>;
  onColumnStateChange: (state: ColumnState<F>) => void;
  /** The row open in the record panel: it keeps the approved highlight. */
  openRowId?: string | null;
  /** A row click, or Enter on a row, opens it. */
  onOpenRow?: (row: Row) => void;
  /** Shows a checkbox per row. Selected rows feed the bulk action bar. */
  selectable?: boolean;
  selectedIds?: readonly string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  /** The drawn "more" button at the end of each row. Leave out for no button. */
  rowActions?: (row: Row) => RbmGridRowAction[];
  loading?: boolean;
  /** Shown when the page has no rows. The list page's empty state replaces it. */
  noRowsLabel?: string;
  timeZone?: string;
  /** For tests in jsdom, which has no layout. */
  disableVirtualization?: boolean;
  ref?: Ref<RbmDataGridHandle>;
}

const ACTIONS = '__actions';

/** The semantic dot and label, as drawn in the board's grid: 8 px dot, or a 12 px ringed dot. */
function StatusCell({ state, label }: { state: RbmState; label: string }) {
  const { palette } = useTheme();
  const token = palette.status[state];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 600, color: token.text, whiteSpace: 'nowrap', overflow: 'hidden' }}>
      {token.core ? (
        <Box component="span" aria-hidden="true" data-testid="rbm-grid-status-dot" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: token.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: token.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
        </Box>
      ) : (
        <Box component="span" aria-hidden="true" data-testid="rbm-grid-status-dot" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: token.signal, flex: 'none' }} />
      )}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </Box>
  );
}

/** The drawn "more" icon: three dots, 18 px, Slate. */
function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colour.slate} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 6h.01M12 12h.01M12 18h.01" />
    </svg>
  );
}

/** Read by screen readers, not shown. */
const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' } as const;

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

function renderCell<F extends string>(c: ColumnDef<F>, timeZone: string) {
  return function Cell(params: GridRenderCellParams) {
    const value: unknown = params.value;
    if (value === null || value === undefined || value === '') return null;
    switch (c.kind) {
      case 'title':
        return (
          <Box component="span" className="rbm-grid-title" sx={{ ...ellipsis, fontWeight: 600, color: colour.deepBlue }}>
            {String(value)}
          </Box>
        );
      case 'recordNumber':
        return (
          <Box component="span" sx={{ ...ellipsis, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {String(value)}
          </Box>
        );
      case 'status':
        return <StatusCell state={value as RbmState} label={c.labels?.[value as string] ?? String(value)} />;
      case 'person':
        return <Box component="span" sx={ellipsis}>{shortName(value as PersonRef)}</Box>;
      case 'enum':
        return <Box component="span" sx={ellipsis}>{c.labels?.[value as string] ?? String(value)}</Box>;
      case 'date':
        return <Box component="span" sx={ellipsis}>{formatDay(value as string, timeZone)}</Box>;
    }
  };
}

/** Every column, visible ones first in their order, then the hidden ones in the list's order. */
function columnOrder<F extends string>(columns: readonly ColumnDef<F>[], state: ColumnState<F>): ColumnDef<F>[] {
  const byField = new Map(columns.map((c) => [c.field, c]));
  const shown = state.visible.map((f) => byField.get(f)).filter((c): c is ColumnDef<F> => !!c);
  return [...shown, ...columns.filter((c) => !state.visible.includes(c.field))];
}

export function RbmDataGrid<Row extends { id: string }, F extends string>({
  label,
  columns,
  rows,
  sort,
  onSortChange,
  columnState,
  onColumnStateChange,
  openRowId,
  onOpenRow,
  selectable = false,
  selectedIds = [],
  onSelectedIdsChange,
  rowActions,
  loading = false,
  noRowsLabel = 'Nothing to show.',
  timeZone = 'UTC',
  disableVirtualization,
  ref,
}: RbmDataGridProps<Row, F>) {
  const apiRef = useGridApiRef();
  useImperativeHandle(ref, () => ({ openColumnChooser: () => apiRef.current?.showPreferences(GridPreferencePanelsValue.columns) }), [apiRef]);

  const fields = useMemo(() => new Set<string>(columns.map((c) => c.field)), [columns]);
  const ordered = useMemo(() => columnOrder(columns, columnState), [columns, columnState]);

  const gridColumns = useMemo<GridColDef[]>(() => {
    const defs: GridColDef[] = ordered.map((c) => {
      const width = columnState.widths?.[c.field];
      const flexible = c.kind === 'title' && width === undefined;
      return {
        field: c.field,
        headerName: c.header,
        sortable: c.sortable,
        hideable: c.hideable,
        ...(flexible ? { flex: 1, minWidth: 200 } : { width: width ?? c.width ?? 120 }),
        renderCell: renderCell(c, timeZone),
      };
    });
    if (rowActions) {
      defs.push({
        field: ACTIONS,
        type: 'actions',
        headerName: 'Actions',
        // The drawn header is blank; screen readers still hear the column's name.
        renderHeader: () => <Box component="span" sx={visuallyHidden}>Actions</Box>,
        width: 48,
        hideable: false,
        getActions: (params) =>
          rowActions(params.row as Row).map((a) => <GridActionsCellItem key={a.id} label={a.label} onClick={a.onSelect} showInMenu />),
      });
    }
    return defs;
  }, [ordered, columnState.widths, rowActions, timeZone]);

  const visibility = useMemo<GridColumnVisibilityModel>(() => Object.fromEntries(columns.map((c) => [c.field, columnState.visible.includes(c.field)])), [columns, columnState.visible]);
  const sortModel = useMemo<GridSortModel>(() => sort.map((s) => ({ field: s.field, sort: s.direction })), [sort]);
  const selection = useMemo<GridRowSelectionModel>(() => ({ type: 'include', ids: new Set(selectedIds) }), [selectedIds]);

  /** The grid's current column order, limited to the list's own columns. */
  const currentOrder = (): F[] => (apiRef.current?.getAllColumns() ?? []).map((c) => c.field).filter((f): f is F => fields.has(f));

  return (
    <Box sx={{ border: `${stroke.thin}px solid ${colour.rule}`, borderRadius: `${radius.card}px`, bgcolor: colour.white, overflow: 'hidden' }}>
      <DataGridPro
        apiRef={apiRef}
        label={label}
        rows={rows as Row[]}
        columns={gridColumns}
        loading={loading}
        // The server sorts and pages; the grid shows what it is given.
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(model) => onSortChange(model.filter((m) => m.sort && fields.has(m.field)).map((m) => ({ field: m.field as F, direction: m.sort! })))}
        hideFooter
        autoHeight
        rowHeight={GRID_ROW_HEIGHT}
        columnHeaderHeight={GRID_HEADER_HEIGHT}
        // Filters live in the list toolbar, above the grid (board rule), and the column chooser is a toolbar button.
        disableColumnMenu
        disableColumnFilter
        columnVisibilityModel={visibility}
        onColumnVisibilityModelChange={(model) => onColumnStateChange({ ...columnState, visible: currentOrder().filter((f) => model[f] !== false) })}
        onColumnOrderChange={() => onColumnStateChange({ ...columnState, visible: currentOrder().filter((f) => columnState.visible.includes(f)) })}
        onColumnWidthChange={(params) => fields.has(params.colDef.field) && onColumnStateChange({ ...columnState, widths: { ...columnState.widths, [params.colDef.field as F]: params.width } as ColumnState<F>['widths'] })}
        checkboxSelection={selectable}
        checkboxSelectionVisibleOnly
        disableRowSelectionOnClick
        keepNonExistentRowsSelected
        rowSelectionModel={selection}
        onRowSelectionModelChange={(model) => {
          const pageIds = new Set(rows.map((r) => r.id));
          const onPage = model.type === 'include' ? rows.filter((r) => model.ids.has(r.id)) : rows.filter((r) => !model.ids.has(r.id));
          onSelectedIdsChange?.([...selectedIds.filter((id) => !pageIds.has(id)), ...onPage.map((r) => r.id)]);
        }}
        onRowClick={(params) => onOpenRow?.(params.row as Row)}
        onCellKeyDown={(params, event) => {
          if (event.key !== 'Enter' || !onOpenRow || params.field === ACTIONS || params.field === '__check__') return;
          event.preventDefault();
          onOpenRow(params.row as Row);
        }}
        getRowClassName={(params) => (params.id === openRowId ? 'rbm-open' : '')}
        disableVirtualization={disableVirtualization}
        localeText={{ noRowsLabel, actionsCellMore: 'More actions' }}
        slots={{ moreActionsIcon: MoreIcon }}
        slotProps={{
          loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' },
          baseIconButton: { size: 'small' },
        }}
        getRowId={(r) => r.id}
        sx={{
          border: 'none',
          fontFamily: 'inherit',
          fontSize: 13,
          color: colour.ink,
          '--DataGrid-rowBorderColor': colour.rule,
          '--DataGrid-t-header-background-base': colour.mist,
          '--DataGrid-containerBackground': colour.mist,
          '& .MuiDataGrid-columnHeader, & .MuiDataGrid-filler, & .MuiDataGrid-scrollbarFiller': { bgcolor: colour.mist },
          '& .MuiDataGrid-columnHeaderTitle': { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.slate },
          // 12 px between columns and 16 px at the edges, as drawn.
          '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': { px: '6px' },
          '& .MuiDataGrid-columnHeader[aria-colindex="1"], & .MuiDataGrid-cell[aria-colindex="1"]': { pl: '16px' },
          '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center' },
          // The record open in the panel: the approved highlight (List to record in use).
          '& .MuiDataGrid-row.rbm-open': { bgcolor: colour.rule, boxShadow: `inset 4px 0 0 ${colour.blueDark}` },
          '& .MuiDataGrid-row.rbm-open .rbm-grid-title': { fontWeight: 700 },
          // The Proposed focus ring: 2 px Blue Dark.
          '& .MuiDataGrid-cell:focus-visible, & .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-visible': {
            outline: `${stroke.thick}px solid ${colour.blueDark}`,
            outlineOffset: -stroke.thick,
          },
          '& .MuiDataGrid-row': { cursor: onOpenRow ? 'pointer' : 'default' },
        }}
      />
    </Box>
  );
}

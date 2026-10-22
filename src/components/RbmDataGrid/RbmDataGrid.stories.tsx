import { useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { RbmDataGrid, type RbmDataGridHandle, type RbmDataGridProps } from './RbmDataGrid';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import { createMockEventServer } from '../../data/list/mockServer';
import { createLocalListPreferenceStore } from '../../data/list/preferenceStore';
import { EMPTY_EVENT_FILTERS, PAGE_SIZES, type EventColumnField, type EventColumnState, type EventRow, type PageSize, type SortItem } from '../../data/list/types';
import { events128, eventsBoard, eventsLarge } from '../../fixtures/events/build';
import { colour } from '../../theme/tokens';
import { RbmDensity } from '../../theme/RbmDensity';

type Props = RbmDataGridProps<EventRow, EventColumnField>;
const boardRows = eventsBoard().rows;

/** Holds sort and column state the way a list page will, so the stories can be clicked through. */
function Stateful(props: Omit<Props, 'sort' | 'onSortChange' | 'columnState' | 'onColumnStateChange'> & Partial<Props>) {
  const [sort, setSort] = useState<SortItem<EventColumnField>[]>(props.sort ?? []);
  const [columnState, setColumnState] = useState<EventColumnState>(props.columnState ?? DEFAULT_EVENT_COLUMNS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openRowId, setOpenRowId] = useState<string | null>(props.openRowId ?? null);
  return (
    <RbmDataGrid
      {...props}
      sort={sort}
      onSortChange={setSort}
      columnState={columnState}
      onColumnStateChange={setColumnState}
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      openRowId={openRowId}
      onOpenRow={(row) => setOpenRowId(row.id)}
    />
  );
}

const meta: Meta<typeof Stateful> = {
  title: 'List/RbmDataGrid',
  component: Stateful,
  parameters: { layout: 'padded' },
  // A list page is a D2 Compact region (decision D3); the grid takes its sizes from it.
  decorators: [(Story) => <RbmDensity level="compact"><Box sx={{ maxWidth: 1100 }}>{Story()}</Box></RbmDensity>],
  args: { label: 'Events', columns: EVENT_COLUMNS, rows: boardRows },
};
export default meta;

type Story = StoryObj<typeof Stateful>;

/** The board's eight events with Runbooks replaced by Events: Event ID added, Progress removed, Phase called State. Click a row to open it. */
export const AsDrawn: Story = {};

/** The record open in the slide-in keeps the approved highlight (List to record in use). */
export const RowOpen: Story = { args: { openRowId: 'ev-00001' } };

/** Checkboxes for the bulk action bar. Not drawn: MUI's checkbox column (the fallback). */
export const Selectable: Story = { args: { selectable: true } };

/** The drawn "more" button at the end of each row. Not drawn: its menu items. */
export const RowActions: Story = {
  args: { rowActions: () => [{ id: 'open', label: 'Open', onSelect: () => {} }, { id: 'full', label: 'Open in full', onSelect: () => {} }] },
};

/** A user's own columns, as a saved view or preference sets them. */
export const ChosenColumns: Story = { args: { columnState: { visible: ['name', 'status', 'windowStart'] } } };

/** While a page loads: MUI's skeleton overlay. The list page decides when to show it (States, later). */
export const Loading: Story = { args: { loading: true } };

/** With rows, but the server is fetching another page. */
export const LoadingWithRows: Story = { args: { loading: true, rows: boardRows } };

/** The same grid in a D1 Comfortable region and a D3 Dense one: rows, text, padding, dots and icons follow the tokens. */
export const InOtherDensities: Story = {
  render: (args) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <RbmDensity level="comfortable"><Stateful {...args} /></RbmDensity>
      <RbmDensity level="dense"><Stateful {...args} /></RbmDensity>
    </Box>
  ),
  args: { rowActions: () => [{ id: 'open', label: 'Open', onSelect: () => {} }] },
};

/** No rows on the page. The list page's empty state (later) replaces this line. */
export const Empty: Story = { args: { rows: [], noRowsLabel: 'No events match these filters.' } };

// ---------------------------------------------------------------------------
// The proof: the grid against the mock server (brief, section 6)
// ---------------------------------------------------------------------------

const fixtures = {
  board: { label: "The board's 8 events", build: eventsBoard },
  list128: { label: '128 events', build: events128 },
  large: { label: '15,000 events', build: eventsLarge },
} as const;
type FixtureName = keyof typeof fixtures;

function ServerProof({ initial = 'list128' }: { initial?: FixtureName }) {
  const [fixtureName, setFixtureName] = useState<FixtureName>(initial);
  const [latency, setLatency] = useState(400);
  const server = useMemo(() => createMockEventServer(fixtures[fixtureName].build(), { latencyMs: latency }), [fixtureName, latency]);
  const store = useMemo(() => createLocalListPreferenceStore('rbm.storybook.events.v1', EVENT_COLUMNS.map((c) => c.field)), []);
  const grid = useRef<RbmDataGridHandle>(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [sort, setSort] = useState<SortItem<EventColumnField>[]>([]);
  const [columnState, setColumnState] = useState<EventColumnState>(DEFAULT_EVENT_COLUMNS);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [took, setTook] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<EventRow | null>(null);

  // The saved column state comes back on reload.
  useEffect(() => {
    void store.get().then((p) => {
      if (p.columns) setColumnState(p.columns);
      setPageSize(p.pageSize);
    });
  }, [store]);

  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    setLoading(true);
    server
      .query({ filters: EMPTY_EVENT_FILTERS, sort, page, pageSize }, { signal: controller.signal })
      .then((result) => {
        setRows(result.rows);
        setTotal(result.total);
        setPage(result.page);
        setTook(Math.round(performance.now() - started - latency));
        setLoading(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [server, sort, page, pageSize, latency]);

  const changeColumns = (next: EventColumnState) => {
    setColumnState(next);
    void store.get().then((p) => store.set({ ...p, columns: next }));
  };

  const from = total ? page * pageSize + 1 : 0;
  const to = Math.min(total, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', p: 3, bgcolor: colour.mist, borderRadius: '12px', fontSize: 13 }}>
        <Typography variant="overline" sx={{ width: '100%' }}>
          Story controls (not part of the design)
        </Typography>
        <TextField select size="small" label="Fixture" value={fixtureName} onChange={(e) => { setFixtureName(e.target.value as FixtureName); setPage(0); setSelectedIds([]); }} sx={{ minWidth: 200 }}>
          {Object.entries(fixtures).map(([k, f]) => (
            <MenuItem key={k} value={k}>{f.label}</MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="Server latency" value={latency} onChange={(e) => setLatency(Number(e.target.value))} sx={{ minWidth: 140 }}>
          {[0, 400, 1500].map((ms) => (
            <MenuItem key={ms} value={ms}>{ms} ms</MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={() => grid.current?.openColumnChooser()}>Columns</Button>
        <Button variant="text" onClick={() => { void store.reset(); setColumnState(DEFAULT_EVENT_COLUMNS); }}>Reset columns</Button>
        <span>{selectedIds.length} selected</span>
        <span>Open: {openRow ? `${openRow.number} ${openRow.name}` : 'none'}</span>
        {took !== null && <span>Query: {took} ms (plus latency)</span>}
      </Box>

      <RbmDataGrid
        ref={grid}
        label="Events"
        columns={EVENT_COLUMNS}
        rows={rows}
        loading={loading}
        sort={sort}
        onSortChange={(s) => { setSort(s); setPage(0); }}
        columnState={columnState}
        onColumnStateChange={changeColumns}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        openRowId={openRow?.id}
        onOpenRow={setOpenRow}
        rowActions={(row) => [{ id: 'open', label: 'Open', onSelect: () => setOpenRow(row) }]}
        noRowsLabel="No events."
      />

      {/* A stand-in pager, to prove server paging. The drawn pagination is its own component (later). */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', fontSize: 13, color: colour.slate }}>
        <span>
          {from.toLocaleString('en-GB')} to {to.toLocaleString('en-GB')} of {total.toLocaleString('en-GB')}
        </span>
        <TextField select size="small" label="Rows per page" value={pageSize} onChange={(e) => { const size = Number(e.target.value) as PageSize; setPageSize(size); setPage(0); void store.get().then((p) => store.set({ ...p, pageSize: size })); }} sx={{ minWidth: 120 }}>
          {PAGE_SIZES.map((n) => (
            <MenuItem key={n} value={n}>{n}</MenuItem>
          ))}
        </TextField>
        <Button disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</Button>
      </Box>
    </Box>
  );
}

/**
 * The checks the brief asks for, in one place: server paging and sorting, the status cell, row click
 * with the highlight, selection, the column chooser with saved state (reload the story), keyboard,
 * and the 15,000-event list. The controls above the grid are for the story only.
 */
export const ServerProofStory: StoryObj = { name: 'Proof: against the mock server', render: () => <ServerProof /> };

/** The same proof on the 15,000-event list: the server pages it, so the grid only ever holds one page. */
export const ServerProofLarge: StoryObj = { name: 'Proof: 15,000 events', render: () => <ServerProof initial="large" /> };

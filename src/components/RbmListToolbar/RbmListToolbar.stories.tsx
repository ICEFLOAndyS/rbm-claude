import { useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmListToolbar, downloadCsv, type RbmListToolbarProps, type RbmToolbarView } from './RbmListToolbar';
import { RbmDataGrid, type RbmDataGridHandle } from '../RbmDataGrid/RbmDataGrid';
import { RbmDensity } from '../../theme/RbmDensity';
import { DEFAULT_EVENT_COLUMNS, ENVIRONMENT_LABELS, EVENT_COLUMNS, STATUS_LABELS } from '../../data/list/events';
import { createMockEventServer } from '../../data/list/mockServer';
import type { EventColumnField, EventColumnState, EventFilters, EventRow, EventView, SortItem } from '../../data/list/types';
import { events128, PEOPLE } from '../../fixtures/events/build';

const views: RbmToolbarView[] = [
  { id: 'active', name: 'Active', kind: 'system' },
  { id: 'all', name: 'All events', kind: 'system' },
  { id: 'view-1', name: 'Production at risk', kind: 'user' },
];
const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const ownerOptions = PEOPLE.map((p) => ({ value: p.id, label: p.name }));
const environmentOptions = Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => ({ value, label }));

/** The toolbar with its filters held in state, so a story can be clicked through. */
function Stateful(props: Partial<RbmListToolbarProps> & { initial?: Partial<Record<'status' | 'owner' | 'environment', string[]>> }) {
  const [search, setSearch] = useState(props.search ?? '');
  const [status, setStatus] = useState<string[]>(props.initial?.status ?? []);
  const [owner, setOwner] = useState<string[]>(props.initial?.owner ?? []);
  const [environment, setEnvironment] = useState<string[]>(props.initial?.environment ?? []);
  const [current, setCurrent] = useState(props.currentViewId ?? 'active');
  return (
    <RbmListToolbar
      noun="events"
      views={views}
      onOpenColumns={() => {}}
      onExport={() => {}}
      onSaveView={() => {}}
      onUpdateView={() => {}}
      onDeleteView={() => {}}
      {...props}
      search={search}
      onSearchChange={setSearch}
      currentViewId={current}
      onSelectView={setCurrent}
      filters={[
        { id: 'status', label: 'Status', options: statusOptions, selected: status, onChange: setStatus },
        { id: 'owner', label: 'Owner', options: ownerOptions, selected: owner, onChange: setOwner },
        { id: 'environment', label: 'Environment', options: environmentOptions, selected: environment, onChange: setEnvironment },
      ]}
    />
  );
}

const meta: Meta<typeof Stateful> = {
  title: 'List/RbmListToolbar',
  component: Stateful,
  parameters: { layout: 'padded' },
  // A list page is a D2 Compact region (decision D3).
  decorators: [(Story) => <RbmDensity level="compact"><Box sx={{ maxWidth: 1100 }}>{Story()}</Box></RbmDensity>],
};
export default meta;

type Story = StoryObj<typeof Stateful>;

/** As drawn, with Runbooks replaced by Events. */
export const AsDrawn: Story = {};

/** Filters narrowing the list: each pill says how many values are chosen. */
export const FiltersOn: Story = { args: { search: 'payroll', initial: { status: ['atRisk', 'blocked'], environment: ['production'] } } };

/** One of the user's own views, changed since it was saved: the menu offers Save changes and Delete. */
export const UserViewChanged: Story = { args: { currentViewId: 'view-1', viewChanged: true } };

/** While the server builds the export. */
export const Exporting: Story = { args: { exporting: true } };

// ---------------------------------------------------------------------------
// The proof: the toolbar driving the grid through the mock server
// ---------------------------------------------------------------------------

const sameFilters = (a: EventFilters, b: EventFilters) => JSON.stringify(a) === JSON.stringify(b);

function ToolbarProof() {
  const server = useMemo(() => createMockEventServer(events128(), { latencyMs: 300 }), []);
  const grid = useRef<RbmDataGridHandle>(null);
  const [allViews, setAllViews] = useState<EventView[]>([]);
  const [viewId, setViewId] = useState('active');
  const [filters, setFilters] = useState<EventFilters>({ search: '', status: [], owner: [], environment: [] });
  const [sort, setSort] = useState<SortItem<EventColumnField>[]>([]);
  const [columns, setColumns] = useState<EventColumnState>(DEFAULT_EVENT_COLUMNS);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const view = allViews.find((v) => v.id === viewId);
  const applyView = (v: EventView) => {
    setViewId(v.id);
    setFilters(v.filters);
    setColumns(v.columns);
    setSort(v.sort);
  };
  const reloadViews = () =>
    server.listViews().then((vs) => {
      setAllViews(vs);
      return vs;
    });
  // Open on the drawn default view, Active.
  useEffect(() => {
    void reloadViews().then((vs) => {
      const active = vs.find((v) => v.id === 'active');
      if (active) applyView(active);
    });
  }, [server]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    server
      .query({ filters, sort, page: 0, pageSize: 25 }, { signal: controller.signal })
      .then((p) => {
        setRows(p.rows);
        setTotal(p.total);
        setLoading(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [server, filters, sort]);

  const viewChanged = !!view && (!sameFilters(view.filters, filters) || JSON.stringify(view.columns) !== JSON.stringify(columns) || JSON.stringify(view.sort) !== JSON.stringify(sort));
  const set = (key: 'status' | 'owner' | 'environment') => (selected: string[]) => setFilters((f) => ({ ...f, [key]: selected }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <RbmListToolbar
        noun="events"
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        filters={[
          { id: 'status', label: 'Status', options: statusOptions, selected: filters.status, onChange: set('status') },
          { id: 'owner', label: 'Owner', options: ownerOptions, selected: filters.owner, onChange: set('owner') },
          { id: 'environment', label: 'Environment', options: environmentOptions, selected: filters.environment, onChange: set('environment') },
        ]}
        views={allViews}
        currentViewId={viewId}
        viewChanged={viewChanged}
        onSelectView={(id) => {
          const v = allViews.find((x) => x.id === id);
          if (v) applyView(v);
        }}
        onSaveView={(name) => void server.saveView({ id: '', name, filters, columns, sort }).then((v) => reloadViews().then(() => setViewId(v.id)))}
        onUpdateView={() => view && void server.saveView({ id: view.id, name: view.name, filters, columns, sort }).then(reloadViews)}
        onDeleteView={(id) => void server.deleteView(id).then(reloadViews).then(() => setViewId('active'))}
        onOpenColumns={() => grid.current?.openColumnChooser()}
        exporting={exporting}
        onExport={() => {
          setExporting(true);
          void server
            .exportCsv({ filters, sort, columns: columns.visible })
            .then(downloadCsv)
            .finally(() => setExporting(false));
        }}
      />
      <Box sx={{ fontSize: 13, color: 'text.secondary' }}>{total} events (story readout, not part of the design)</Box>
      <RbmDataGrid ref={grid} label="Events" columns={EVENT_COLUMNS} rows={rows} loading={loading} sort={sort} onSortChange={setSort} columnState={columns} onColumnStateChange={setColumns} noRowsLabel="No events match these filters." />
    </Box>
  );
}

/** Search, filters, views (choose, save, delete), the column chooser and export, against 128 events. */
export const ProofWithGrid: StoryObj = { name: 'Proof: with the grid and the mock server', render: () => <ToolbarProof /> };

import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Snackbar } from '@mui/material';
import { RbmListBulkAction, type RbmBulkAction } from './RbmListBulkAction';
import { RbmListToolbar } from '../RbmListToolbar/RbmListToolbar';
import { RbmDataGrid } from '../RbmDataGrid/RbmDataGrid';
import { RbmDensity } from '../../theme/RbmDensity';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import { EMPTY_EVENT_FILTERS, type EventColumnState } from '../../data/list/types';
import { createMockEventServer } from '../../data/list/mockServer';
import { eventBulkActions } from '../../app/eventBulkActions';
import { eventsBoard } from '../../fixtures/events/build';

const noun = { one: 'event', many: 'events' };
// Examples of what any list may pass. The Events list's own actions (Export, Delete) are in the last story.
const examples: RbmBulkAction[] = [
  { id: 'export', label: 'Export', onSelect: () => {} },
  { id: 'owner', label: 'Change owner…', onSelect: () => {} },
];

const meta: Meta<typeof RbmListBulkAction> = {
  title: 'List/RbmListBulkAction',
  component: RbmListBulkAction,
  parameters: { layout: 'padded' },
  // A list page is a D2 Compact region (decision D3).
  decorators: [(Story) => <RbmDensity level="compact"><Box sx={{ maxWidth: 1100 }}>{Story()}</Box></RbmDensity>],
  args: { count: 3, noun, actions: examples, onClear: () => {} },
};
export default meta;

type Story = StoryObj<typeof RbmListBulkAction>;

/** Three rows selected, with example actions. */
export const Selected: Story = {};

export const OneSelected: Story = { args: { count: 1 } };

/** An action that removes things uses the error colour. */
export const WithDangerAction: Story = {
  args: { actions: [...examples, { id: 'delete', label: 'Delete…', onSelect: () => {}, tone: 'danger', confirm: { title: 'Delete 3 events?', body: 'They are removed for everyone.', confirmLabel: 'Delete' } }] },
};

/** A disabled action says why in a tooltip. */
export const DisabledAction: Story = { args: { actions: [examples[0]!, { ...examples[1]!, disabled: true, disabledReason: 'Complete events are read-only.' }] } };

const rows = eventsBoard().rows;

/** Selecting rows swaps the toolbar for the bar, in the same row; clearing brings the toolbar back. */
function Swap() {
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState<EventColumnState>(DEFAULT_EVENT_COLUMNS);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {selected.length > 0 ? (
        <RbmListBulkAction count={selected.length} noun={noun} actions={examples} onClear={() => setSelected([])} />
      ) : (
        <RbmListToolbar noun="events" search="" onSearchChange={() => {}} filters={[]} views={[{ id: 'active', name: 'Active', kind: 'system' }]} currentViewId="active" onSelectView={() => {}} onOpenColumns={() => {}} onExport={() => {}} />
      )}
      <RbmDataGrid label="Events" columns={EVENT_COLUMNS} rows={rows} sort={[]} onSortChange={() => {}} columnState={columns} onColumnStateChange={setColumns} selectable selectedIds={selected} onSelectedIdsChange={setSelected} />
    </Box>
  );
}

export const SwapsWithTheToolbar: StoryObj = { name: 'Swaps with the toolbar', render: () => <Swap /> };

/** The Events list's actions, Export and Delete (decided), against the mock server. The result shows in MUI's snackbar. */
function EventsActions() {
  const server = useMemo(() => createMockEventServer(eventsBoard()), []);
  const [rowsNow, setRowsNow] = useState(rows);
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState<EventColumnState>(DEFAULT_EVENT_COLUMNS);
  const [message, setMessage] = useState('');
  const reload = () => void server.query({ filters: EMPTY_EVENT_FILTERS, sort: [], page: 0, pageSize: 25 }).then((p) => setRowsNow(p.rows));
  const actions = eventBulkActions({
    data: server,
    ids: selected,
    filters: EMPTY_EVENT_FILTERS,
    sort: [],
    columns: columns.visible,
    onMessage: setMessage,
    onDeleted: ({ deleted }) => {
      setSelected((s) => s.filter((id) => !deleted.includes(id)));
      reload();
    },
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {selected.length > 0 ? (
        <RbmListBulkAction count={selected.length} noun={noun} actions={actions} onClear={() => setSelected([])} />
      ) : (
        <RbmListToolbar noun="events" search="" onSearchChange={() => {}} filters={[]} views={[{ id: 'all', name: 'All events', kind: 'system' }]} currentViewId="all" onSelectView={() => {}} onOpenColumns={() => {}} onExport={() => {}} />
      )}
      <RbmDataGrid label="Events" columns={EVENT_COLUMNS} rows={rowsNow} sort={[]} onSortChange={() => {}} columnState={columns} onColumnStateChange={setColumns} selectable selectedIds={selected} onSelectedIdsChange={setSelected} />
      <Snackbar open={!!message} message={message} autoHideDuration={8000} onClose={() => setMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

/** Select Warehouse Mgmt Cutover (not started) and a running event, then Delete: one goes, one stays and the message says why. */
export const EventsExportAndDelete: StoryObj = { name: 'Events: Export and Delete', render: () => <EventsActions /> };

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmListBulkAction, type RbmBulkAction } from './RbmListBulkAction';
import { RbmListToolbar } from '../RbmListToolbar/RbmListToolbar';
import { RbmDataGrid } from '../RbmDataGrid/RbmDataGrid';
import { RbmDensity } from '../../theme/RbmDensity';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS } from '../../data/list/events';
import type { EventColumnState } from '../../data/list/types';
import { eventsBoard } from '../../fixtures/events/build';

const noun = { one: 'event', many: 'events' };
// Examples only: which bulk actions the Events list offers is not decided yet.
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
export const WithDangerAction: Story = { args: { actions: [...examples, { id: 'delete', label: 'Delete…', onSelect: () => {}, tone: 'danger' }] } };

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

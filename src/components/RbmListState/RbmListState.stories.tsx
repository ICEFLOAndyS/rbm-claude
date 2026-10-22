import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button } from '@mui/material';
import { RbmListEmpty, RbmListError, RbmListFailure, RbmListLoading, RbmListNoAccess } from './RbmListState';
import { RbmDensity } from '../../theme/RbmDensity';
import { EVENT_COLUMNS } from '../../data/list/events';
import { createMockEventServer } from '../../data/list/mockServer';
import { eventsBoard } from '../../fixtures/events/build';
import { EMPTY_EVENT_FILTERS } from '../../data/list/types';

const widths = EVENT_COLUMNS.map((c) => c.width ?? 140);

const meta: Meta = {
  title: 'List/States',
  parameters: { layout: 'padded' },
  // The list page is a D2 Compact region.
  decorators: [(Story) => <RbmDensity level="compact"><Box sx={{ maxWidth: 1100 }}>{Story()}</Box></RbmDensity>],
};
export default meta;

type Story = StoryObj;

/** The skeleton of the toolbar and grid. It appears after 300 ms; a quicker load shows nothing. */
export const Loading: Story = { render: () => <RbmListLoading label="Loading events" columns={widths} /> };

/** Loading a new page of the grid: the toolbar stays, so only the grid is drawn. */
export const LoadingGridOnly: Story = { name: 'Loading, grid only', render: () => <RbmListLoading label="Loading events" columns={widths} toolbar={false} rows={5} /> };

/** There are no events at all: say so and offer New event, the page's green CTA. */
export const EmptyNoEvents: Story = {
  name: 'Empty, no events yet',
  render: () => <RbmListEmpty title="No events yet" reason="Create the first event to plan a cutover." action={{ label: 'New event', onClick: () => {} }} actionKind="cta" />,
};

/** The search or filters match nothing: say why and offer Clear filters. */
export const EmptyFiltered: Story = {
  name: 'Empty, filtered',
  render: () => <RbmListEmpty title="No events match these filters" reason="Production · In progress · Search “payroll”. Clear the filters to see every event." action={{ label: 'Clear filters', onClick: () => {} }} />,
};

/** The load failed: a short message, Retry, and the reference for support. */
export const Error: Story = { render: () => <RbmListError message="Could not load events." reference="REF-20261025-0001" onRetry={() => {}} /> };

/** The user may not see events: say what and who to ask. */
export const NoAccess: Story = {
  name: 'No access',
  render: () => <RbmListNoAccess message="You do not have access to events." contact="Ask your RBM administrator for the Event reader role." reference="REF-20261025-0002" />,
};

function FromTheServer() {
  const [mode, setMode] = useState<'failed' | 'noAccess'>('failed');
  const server = useMemo(() => createMockEventServer(eventsBoard(), { latencyMs: 0, fail: { query: mode } }), [mode]);
  const [error, setError] = useState<unknown>(null);
  const load = () => void server.query({ page: 0, pageSize: 25, sort: [], filters: EMPTY_EVENT_FILTERS }).catch(setError);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button onClick={() => setMode('failed')}>Server fails</Button>
        <Button onClick={() => setMode('noAccess')}>No access</Button>
        <Button onClick={load}>Load</Button>
      </Box>
      {error ? <RbmListFailure error={error} onRetry={load} noun="events" /> : null}
    </Box>
  );
}

/** The mock server's failures, mapped to the right state by RbmListFailure. */
export const FromServer: Story = { name: 'From the mock server', render: () => <FromTheServer /> };

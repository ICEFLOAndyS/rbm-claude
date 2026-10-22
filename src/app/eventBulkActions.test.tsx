import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { RbmListBulkAction } from '../components/RbmListBulkAction/RbmListBulkAction';
import { deleteMessage, eventBulkActions, type EventBulkContext } from './eventBulkActions';
import { createMockEventServer } from '../data/list/mockServer';
import { DEFAULT_EVENT_COLUMNS } from '../data/list/events';
import { EMPTY_EVENT_FILTERS } from '../data/list/types';
import { eventsBoard } from '../fixtures/events/build';
import { rbmTheme } from '../theme/theme';
import { RbmDensity } from '../theme/RbmDensity';

function setup(ids: string[], over: Partial<EventBulkContext> = {}) {
  const data = createMockEventServer(eventsBoard(), { now: () => new Date('2026-10-25T02:30:00Z') });
  const onMessage = vi.fn();
  const onDeleted = vi.fn();
  const actions = eventBulkActions({ data, ids, filters: EMPTY_EVENT_FILTERS, sort: [], columns: DEFAULT_EVENT_COLUMNS.visible, onMessage, onDeleted, ...over });
  render(
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <RbmListBulkAction count={ids.length} noun={{ one: 'event', many: 'events' }} actions={actions} onClear={() => {}} />
      </RbmDensity>
    </ThemeProvider>,
  );
  return { data, onMessage, onDeleted };
}

describe('the Events list bulk actions: Export and Delete', () => {
  it('offers Export and Delete only, Delete in the danger colour', () => {
    setup(['ev-00001']);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['Export', 'Delete…', 'Clear selection']);
    expect(screen.getByRole('button', { name: 'Delete…' })).toHaveClass('MuiButton-colorError');
  });

  it('exports the selected events and saves the file', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { onMessage } = setup(['ev-00001', 'ev-00005']);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith('2 events exported.'));
    expect(click).toHaveBeenCalled();
    const blob = (createObjectURL.mock.calls[0] as unknown as [Blob])[0];
    // The CSV's content is tested with the mock server; here, that a CSV file was saved.
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(blob.size).toBeGreaterThan(0);
    click.mockRestore();
  });

  it('asks before deleting; Cancel deletes nothing', async () => {
    const { onDeleted } = setup(['ev-00005']);
    await userEvent.click(screen.getByRole('button', { name: 'Delete…' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete 1 event?' });
    expect(dialog).toHaveTextContent('Events that have started stay, as part of the audit trail.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes what it may, and says what it did not delete and why', async () => {
    const { onMessage, onDeleted } = setup(['ev-00005', 'ev-00001']);
    await userEvent.click(screen.getByRole('button', { name: 'Delete…' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete 2 events?' })).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(onDeleted.mock.calls[0]![0]).toMatchObject({ deleted: ['ev-00005'] });
    expect(onMessage).toHaveBeenCalledWith('1 event deleted. 1 not deleted. REV000001: It has started, so it is part of the audit trail.');
  });

  it('words the result plainly', () => {
    expect(deleteMessage({ deleted: ['a', 'b'], refused: [] })).toBe('2 events deleted.');
    expect(deleteMessage({ deleted: [], refused: [{ id: 'x', number: 'REV000001', reason: 'It has started, so it is part of the audit trail.' }] })).toBe(
      'No events deleted. 1 not deleted. REV000001: It has started, so it is part of the audit trail.',
    );
  });
});

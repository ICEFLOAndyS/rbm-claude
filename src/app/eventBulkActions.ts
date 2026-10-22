import type { RbmBulkAction } from '../components/RbmListBulkAction/RbmListBulkAction';
import { downloadCsv } from '../components/RbmListToolbar/RbmListToolbar';
import type { DeleteResult } from '../data/list/interfaces';
import type { EventListData } from '../data/list/mockServer';
import type { EventColumnField, EventFilters, SortItem } from '../data/list/types';

/**
 * The Events list's bulk actions: Export and Delete only, at this stage (Andy Smith, 22 Oct 2026).
 * Export downloads the selected events as CSV. Delete asks first; the server deletes those it may and
 * says why it refused the rest, which the page shows with `onMessage`.
 */
export interface EventBulkContext {
  data: Pick<EventListData, 'exportCsv' | 'deleteRows'>;
  ids: string[];
  filters: EventFilters;
  sort: SortItem<EventColumnField>[];
  /** The visible columns, in order. */
  columns: EventColumnField[];
  /** Short feedback for the page: what was done, and what was not and why. */
  onMessage: (message: string) => void;
  /** After a delete, so the page can drop the deleted rows from the selection and reload. */
  onDeleted: (result: DeleteResult) => void;
}

const events = (n: number) => `${n} ${n === 1 ? 'event' : 'events'}`;

/** "2 events deleted. 1 not deleted: REV000001 has started, so it is part of the audit trail." */
export function deleteMessage({ deleted, refused }: DeleteResult) {
  const done = deleted.length ? `${events(deleted.length)} deleted.` : 'No events deleted.';
  if (!refused.length) return done;
  const why = refused.map((r) => `${r.number}: ${r.reason}`).join(' ');
  return `${done} ${refused.length} not deleted. ${why}`;
}

export function eventBulkActions(ctx: EventBulkContext): RbmBulkAction[] {
  const { data, ids, filters, sort, columns, onMessage, onDeleted } = ctx;
  return [
    {
      id: 'export',
      label: 'Export',
      onSelect: () => {
        void data
          .exportCsv({ filters, sort, columns, ids })
          .then(downloadCsv)
          .then(() => onMessage(`${events(ids.length)} exported.`))
          .catch(() => onMessage('Could not export. Try again.'));
      },
    },
    {
      id: 'delete',
      label: 'Delete…',
      tone: 'danger',
      confirm: {
        title: `Delete ${events(ids.length)}?`,
        body: 'They are removed for everyone. Events that have started stay, as part of the audit trail.',
        confirmLabel: 'Delete',
      },
      onSelect: () => {
        void data
          .deleteRows(ids)
          .then((result) => {
            onDeleted(result);
            onMessage(deleteMessage(result));
          })
          .catch(() => onMessage('Could not delete. Try again.'));
      },
    },
  ];
}

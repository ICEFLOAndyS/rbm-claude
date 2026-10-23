import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@mui/material';
import { RbmListPage } from '../components/RbmListPage/RbmListPage';
import { RbmListToolbar, downloadCsv, type RbmToolbarFilter } from '../components/RbmListToolbar/RbmListToolbar';
import { RbmListBulkAction } from '../components/RbmListBulkAction/RbmListBulkAction';
import { RbmDataGrid, type RbmDataGridHandle, type RbmGridRowLink } from '../components/RbmDataGrid/RbmDataGrid';
import { RbmPagination } from '../components/RbmPagination/RbmPagination';
import { RbmRecord, type RbmRecordContainer, type RbmRecordHandle, type RbmRecordLocation } from '../components/RbmRecord/RbmRecord';
import { RbmListEmpty, RbmListFailure, RbmListLoading } from '../components/RbmListState/RbmListState';
import { eventBulkActions } from './eventBulkActions';
import { DEFAULT_EVENT_COLUMNS, DEFAULT_EVENT_VIEW_ID, ENVIRONMENT_LABELS, EVENT_COLUMNS, STATUS_LABELS, eventRecordSpec, eventSystemViews } from '../data/list/events';
import { shortName } from '../data/list/format';
import { EMPTY_EVENT_FILTERS, PAGE_SIZES, type ColumnState, type EventColumnField, type EventFilters, type EventRecord, type EventRow, type EventView, type ListPage, type PageSize, type SortItem } from '../data/list/types';
import type { ListPreference, ListPreferenceStore } from '../data/list/interfaces';
import type { EventListData } from '../data/list/mockServer';
import type { PersonRef } from '../data/list/types';

/**
 * The Events list, connected: RbmListPage with the toolbar, grid, pagination, bulk bar, record panel
 * and the four states, fed by `EventListData` (the mock server now, ServiceNow later) and the user's
 * list preference. The page never knows where its data came from.
 */

/** Where the page is: the open record, its tab and section. The demo keeps it in the address. */
export interface EventsListAddress {
  record?: string;
  tab?: string;
  section?: string;
}

export interface EventsListPageProps {
  data: EventListData;
  preferences: ListPreferenceStore<EventColumnField>;
  /** People for the Owner filter and the record's person fields. */
  people: PersonRef[];
  timeZone?: string;
  address?: EventsListAddress;
  onAddressChange?: (address: EventsListAddress) => void;
  /** New event, the green CTA. The record page is out of scope, so the demo shows a message. */
  onNew?: () => void;
  onImport?: () => void;
  /** "Open in full": the record page (RbmRecordPage), a link only. */
  onOpenFull?: (id: string) => void;
  /** The panel's primary action other than Open Command Centre: Start run. */
  onPrimaryAction?: (id: string) => void;
  /**
   * Opens an event's Command & Control Centre: from the row's icon (`centre.commandControl`) on a running
   * event, and from the record panel's "Open Command Centre". Without it there is no row icon.
   */
  onOpenCommandCentre?: (event: { id: string; number: string }) => void;
  /** For tests in jsdom, which has no layout. */
  disableVirtualization?: boolean;
}

const events = (n: number) => `${n.toLocaleString('en-GB')} ${n === 1 ? 'event' : 'events'}`;
const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const sameFilters = (a: EventFilters, b: EventFilters) =>
  a.search === b.search && sameList([...a.status].sort(), [...b.status].sort()) && sameList([...a.owner].sort(), [...b.owner].sort()) && sameList([...a.environment].sort(), [...b.environment].sort());
const sameSort = (a: SortItem<EventColumnField>[], b: SortItem<EventColumnField>[]) => a.length === b.length && a.every((s, i) => s.field === b[i]!.field && s.direction === b[i]!.direction);

/**
 * The count line, as drawn: "128 events · filtered to Production". It names what the user added to
 * the view: filters beyond the view's own, and the search.
 */
export function countLine(total: number, filters: EventFilters, view: EventFilters, people: PersonRef[]): string {
  const added: string[] = [];
  const extra = <T extends string>(now: T[], base: T[], label: (v: T) => string) => {
    if (!sameList([...now].sort(), [...base].sort())) added.push(...now.map(label));
  };
  extra(filters.environment, view.environment, (e) => ENVIRONMENT_LABELS[e]);
  extra(filters.status, view.status, (s) => STATUS_LABELS[s]);
  extra(filters.owner, view.owner, (id) => {
    const p = people.find((x) => x.id === id);
    return p ? shortName(p) : id;
  });
  const parts = [events(total)];
  if (added.length) parts.push(`filtered to ${added.join(', ')}`);
  if (filters.search.trim()) parts.push(`matching “${filters.search.trim()}”`);
  return parts.join(' · ');
}

/**
 * The events with a Command Centre to open: those running (Active or Paused). Proposed (not drawn): the row
 * does not carry the server's allowed actions as the record does, so the State column decides here.
 */
const hasCommandCentre = (row: EventRow) => row.state === 'active' || row.state === 'paused';

export function EventsListPage({ data, preferences, people, timeZone = 'UTC', address = {}, onAddressChange, onNew, onImport, onOpenFull, onPrimaryAction, onOpenCommandCentre, disableVirtualization }: EventsListPageProps) {
  const spec = useMemo(() => eventRecordSpec(timeZone), [timeZone]);
  const grid = useRef<RbmDataGridHandle>(null);
  const panel = useRef<RbmRecordHandle>(null);
  const gridArea = useRef<HTMLDivElement>(null);

  // The user's preference and the views, read once.
  const [pref, setPref] = useState<ListPreference<EventColumnField> | null>(null);
  const [views, setViews] = useState<EventView[]>(eventSystemViews);
  const [viewId, setViewId] = useState(DEFAULT_EVENT_VIEW_ID);
  const view = views.find((v) => v.id === viewId) ?? views[0]!;

  const [filters, setFilters] = useState<EventFilters>(view.filters);
  const [sort, setSort] = useState<SortItem<EventColumnField>[]>(view.sort);
  const [columns, setColumns] = useState<ColumnState<EventColumnField>>(DEFAULT_EVENT_COLUMNS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const [result, setResult] = useState<ListPage<EventRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selected, setSelected] = useState<string[]>([]);
  const [record, setRecord] = useState<EventRecord | null>(null);
  const [container, setContainer] = useState<RbmRecordContainer>('slideIn');
  const [message, setMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const openId = address.record ?? null;

  // Start: the preference, then the views, then the last view the user had.
  useEffect(() => {
    let live = true;
    void (async () => {
      const p = await preferences.get();
      if (!live) return;
      setPref(p);
      setPageSize(p.pageSize);
      setContainer(p.panel);
      let all = eventSystemViews();
      try {
        all = await data.listViews();
      } catch {
        // The views could not load: the system views still work; the list itself reports any failure.
      }
      if (!live) return;
      setViews(all);
      const start = all.find((v) => v.id === p.lastViewId) ?? all.find((v) => v.id === DEFAULT_EVENT_VIEW_ID) ?? all[0]!;
      setViewId(start.id);
      setFilters(start.filters);
      setSort(start.sort);
      setColumns(p.columns ?? start.columns);
    })();
    return () => {
      live = false;
    };
  }, [data, preferences]);

  const savePref = useCallback(
    (change: Partial<ListPreference<EventColumnField>>) => {
      setPref((p) => {
        const next = { ...(p ?? { panel: 'slideIn', columns: null, lastViewId: null, pageSize: 25 }), ...change } as ListPreference<EventColumnField>;
        void preferences.set(next);
        return next;
      });
    },
    [preferences],
  );

  // The page of rows. A newer query cancels the one before.
  useEffect(() => {
    if (!pref) return;
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    data
      .query({ filters, sort, page, pageSize }, { signal: ac.signal })
      .then((r) => {
        setResult(r);
        if (r.page !== page) setPage(r.page);
        setLoading(false);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e);
        setLoading(false);
      });
    return () => ac.abort();
  }, [data, pref, filters, sort, page, pageSize, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  // The open record follows the address, so a deep link opens it.
  useEffect(() => {
    if (!openId) {
      setRecord(null);
      return;
    }
    const ac = new AbortController();
    data
      .readRecord(openId, { signal: ac.signal })
      .then(setRecord)
      .catch(() => {
        if (ac.signal.aborted) return;
        setMessage('Could not open the event. Try again.');
        onAddressChange?.({});
      });
    return () => ac.abort();
  }, [data, openId, onAddressChange]);

  const rows = result?.rows ?? [];
  const total = result?.total ?? 0;
  const visibleColumns = columns.visible;

  // Filters, search and sort start again from the first page.
  const changeFilters = (next: EventFilters) => {
    setFilters(next);
    setPage(0);
  };

  const selectView = (id: string) => {
    const v = views.find((x) => x.id === id);
    if (!v) return;
    setViewId(id);
    setFilters(v.filters);
    setSort(v.sort);
    setColumns(v.columns);
    setPage(0);
    savePref({ lastViewId: id, columns: null });
  };

  const viewChanged = !sameFilters(filters, view.filters) || !sameSort(sort, view.sort) || !sameList(columns.visible, view.columns.visible);

  const saveView = async (name: string, id?: string) => {
    try {
      const saved = await data.saveView({ id: id ?? `view-${Date.now().toString(36)}`, name, filters, columns, sort });
      setViews(await data.listViews());
      setViewId(saved.id);
      savePref({ lastViewId: saved.id, columns: null });
      setMessage(`View “${saved.name}” saved.`);
    } catch {
      setMessage('Could not save the view. Try again.');
    }
  };

  const deleteView = async (id: string) => {
    try {
      await data.deleteView(id);
      setViews(await data.listViews());
      if (id === viewId) selectView(DEFAULT_EVENT_VIEW_ID);
      setMessage('View deleted.');
    } catch {
      setMessage('Could not delete the view. Try again.');
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      downloadCsv(await data.exportCsv({ filters, sort, columns: visibleColumns }));
      setMessage(`${events(total)} exported.`);
    } catch {
      setMessage('Could not export. Try again.');
    } finally {
      setExporting(false);
    }
  };

  // Opening, moving and closing the record. Leaving asks first if a section has unsaved changes.
  const open = async (id: string) => {
    if (openId && openId !== id && !(await panel.current?.confirmLeave())) return;
    onAddressChange?.({ record: id });
  };
  const index = openId ? rows.findIndex((r) => r.id === openId) : -1;

  /** Focus goes back to the row that was open (board: "focus returns to the row"). */
  const focusRow = (id: string) => {
    requestAnimationFrame(() => {
      const cell = gridArea.current?.querySelector<HTMLElement>(`.MuiDataGrid-row[data-id="${CSS.escape(id)}"] [role="gridcell"]:not([data-field="__check__"])`);
      cell?.focus();
    });
  };
  const closeRecord = () => {
    const id = openId;
    onAddressChange?.({});
    if (id) focusRow(id);
  };
  const guardedClose = async () => {
    if (await (panel.current?.confirmLeave() ?? Promise.resolve(true))) closeRecord();
  };

  const filterBar: RbmToolbarFilter[] = [
    { id: 'status', label: 'Status', options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })), selected: filters.status, onChange: (s) => changeFilters({ ...filters, status: s as EventFilters['status'] }) },
    { id: 'owner', label: 'Owner', options: people.map((p) => ({ value: p.id, label: shortName(p) })), selected: filters.owner, onChange: (s) => changeFilters({ ...filters, owner: s }) },
    {
      id: 'environment',
      label: 'Environment',
      options: Object.entries(ENVIRONMENT_LABELS).map(([value, label]) => ({ value, label })),
      selected: filters.environment,
      onChange: (s) => changeFilters({ ...filters, environment: s as EventFilters['environment'] }),
    },
  ];

  const toolbar = (
    <RbmListToolbar
      noun="events"
      search={filters.search}
      onSearchChange={(search) => changeFilters({ ...filters, search })}
      filters={filterBar}
      views={views.map(({ id, name, kind }) => ({ id, name, kind }))}
      currentViewId={viewId}
      viewChanged={viewChanged}
      onSelectView={selectView}
      onSaveView={(name) => void saveView(name)}
      onUpdateView={view.kind === 'user' ? () => void saveView(view.name, view.id) : undefined}
      onDeleteView={(id) => void deleteView(id)}
      onOpenColumns={() => grid.current?.openColumnChooser()}
      onExport={() => void exportAll()}
      exporting={exporting}
    />
  );

  const bulkBar =
    selected.length > 0 ? (
      <RbmListBulkAction
        count={selected.length}
        noun={{ one: 'event', many: 'events' }}
        onClear={() => setSelected([])}
        actions={eventBulkActions({
          data,
          ids: selected,
          filters,
          sort,
          columns: visibleColumns,
          onMessage: setMessage,
          onDeleted: (r) => {
            setSelected((s) => s.filter((id) => !r.deleted.includes(id)));
            if (openId && r.deleted.includes(openId)) onAddressChange?.({});
            reload();
          },
        })}
      />
    ) : null;

  const firstLoad = !result && !error;
  const gridNode = firstLoad ? (
    <RbmListLoading label="Loading events" columns={EVENT_COLUMNS.filter((c) => visibleColumns.includes(c.field)).map((c) => columns.widths?.[c.field] ?? c.width ?? 140)} toolbar={false} />
  ) : (
    <div ref={gridArea}>
      <RbmDataGrid
        ref={grid}
        label="Events"
        columns={EVENT_COLUMNS}
        rows={rows}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(0);
        }}
        columnState={columns}
        onColumnStateChange={(c) => {
          setColumns(c);
          savePref({ columns: c });
        }}
        openRowId={openId}
        onOpenRow={(r) => void open(r.id)}
        rowLink={
          onOpenCommandCentre
            ? (r): RbmGridRowLink | null =>
                hasCommandCentre(r) ? { label: 'Open Command Centre', name: `Open Command Centre, ${r.number}`, icon: 'centre.commandControl', onSelect: () => onOpenCommandCentre(r) } : null
            : undefined
        }
        rowLinkHeader="Command Centre"
        selectable
        selectedIds={selected}
        onSelectedIdsChange={setSelected}
        loading={loading}
        timeZone={timeZone}
        disableVirtualization={disableVirtualization}
        footer={
          <RbmPagination
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizes={PAGE_SIZES}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size as PageSize);
              setPage(0);
              savePref({ pageSize: size as PageSize });
            }}
            disabled={loading}
          />
        }
      />
    </div>
  );

  const nothingAtAll = sameFilters(filters, EMPTY_EVENT_FILTERS);
  const emptyState =
    result && !loading && total === 0 ? (
      nothingAtAll ? (
        <RbmListEmpty title="No events yet" reason="Create the first event to plan a cutover." action={onNew ? { label: 'New event', onClick: onNew } : undefined} actionKind="cta" />
      ) : (
        <RbmListEmpty
          title="No events match these filters"
          reason={viewId === 'all' ? 'Clear the search and filters to see every event.' : `Nothing in the ${view.name} view matches. Clear the filters to see every event.`}
          action={{
            label: 'Clear filters',
            onClick: () => {
              setViewId('all');
              changeFilters(EMPTY_EVENT_FILTERS);
            },
          }}
        />
      )
    ) : null;

  const location: RbmRecordLocation = { groupId: address.tab, sectionId: address.section };

  return (
    <RbmListPage
      title="Events"
      count={error ? '' : result ? countLine(total, filters, view.filters, people) : 'Loading events…'}
      actions={
        <>
          <Button variant="outlined" color="primary" onClick={onImport} disabled={!onImport}>
            Import
          </Button>
          <Button variant="contained" color="secondary" onClick={onNew} disabled={!onNew} startIcon={<PlusGlyph />}>
            New event
          </Button>
        </>
      }
      toolbar={toolbar}
      bulkBar={bulkBar}
      grid={gridNode}
      emptyState={emptyState}
      errorState={error ? <RbmListFailure error={error} onRetry={reload} noun="events" /> : null}
      record={
        record && openId
          ? {
              container,
              label: `${record.number} ${record.name}`,
              onClose: () => void guardedClose(),
              panel: (
                <RbmRecord
                  ref={panel}
                  spec={spec}
                  record={record}
                  container={container}
                  onContainerChange={(c) => {
                    setContainer(c);
                    savePref({ panel: c });
                  }}
                  location={location}
                  onLocationChange={(l) => onAddressChange?.({ record: openId, tab: l.groupId, section: l.sectionId })}
                  onClose={closeRecord}
                  onPrevious={index > 0 ? () => void open(rows[index - 1]!.id) : undefined}
                  onNext={index >= 0 && index < rows.length - 1 ? () => void open(rows[index + 1]!.id) : undefined}
                  onOpenFull={onOpenFull ? () => onOpenFull(record.id) : undefined}
                  onSave={async (sectionId, values, base) => {
                    const r = await data.saveSection(record.id, sectionId, values, base);
                    if (r.kind === 'saved') {
                      setRecord(r.record);
                      reload();
                    }
                    return r;
                  }}
                  onReload={() => void data.readRecord(record.id).then(setRecord)}
                  onPrimaryAction={(id) => (id === 'openCommandCentre' && onOpenCommandCentre ? onOpenCommandCentre(record) : onPrimaryAction?.(id))}
                  people={people}
                  listName="Events"
                  timeZone={timeZone}
                />
              ),
            }
          : null
      }
      message={message ? { text: message, onClose: () => setMessage('') } : null}
    />
  );
}

/** The Add icon (Icons board), at the drawn 18 px beside the CTA's text. */
function PlusGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

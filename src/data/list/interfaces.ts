import type { ColumnState, ListPage, ListQuery, PageSize, SaveResult, SavedView } from './types';

/** Options every request takes. Aborting stops the page waiting (the RbmBusy Cancel). */
export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * What a list page needs from the server. The mock server implements it now; a ServiceNow source
 * implements it later, and no component changes. Failures reject with `ListDataError`.
 */
export interface ListData<Row, Filters, F extends string, R, Editable> {
  /** One page of rows: search, filter and sort run on the server. */
  query(query: ListQuery<Filters, F>, options?: RequestOptions): Promise<ListPage<Row>>;
  /** The full record for the panel. */
  readRecord(id: string, options?: RequestOptions): Promise<R>;
  /**
   * Saves one section. `baseVersion` is the version the edit started from: if the record has moved
   * on, nothing is written and the result is a conflict. Every save adds a History entry.
   */
  saveSection(id: string, sectionId: string, values: Partial<Editable>, baseVersion: number, options?: RequestOptions): Promise<SaveResult<R>>;
  /** System views first, then the user's own. */
  listViews(options?: RequestOptions): Promise<SavedView<Filters, F>[]>;
  /** Creates (no id match) or replaces one of the user's views. System views cannot be saved over. */
  saveView(view: Omit<SavedView<Filters, F>, 'kind'>, options?: RequestOptions): Promise<SavedView<Filters, F>>;
  /** Deletes one of the user's views. */
  deleteView(id: string, options?: RequestOptions): Promise<void>;
}

/** Which container the record opens in. Width is remembered per user. */
export type PanelSize = 'slideIn' | 'wide';

/** The user's own state for one list, kept between visits. */
export interface ListPreference<F extends string> {
  panel: PanelSize;
  /** The column chooser's last state, if the user changed it from the view's. */
  columns: ColumnState<F> | null;
  lastViewId: string | null;
  pageSize: PageSize;
}

/** Async, so a ServiceNow user preference can replace localStorage without changes (as `LayoutPreferenceStore`). */
export interface ListPreferenceStore<F extends string> {
  get(): Promise<ListPreference<F>>;
  set(preference: ListPreference<F>): Promise<void>;
  reset(): Promise<ListPreference<F>>;
}

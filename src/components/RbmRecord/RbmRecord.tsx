import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Tab, Tabs, Tooltip, useTheme } from '@mui/material';
import { editableKeys, validateSection, type GroupSpec, type RecordSpec, type SectionSpec, type SubsectionSpec, type TableColumnSpec } from '../../data/list/recordSpec';
import type { FieldChange, PersonRef, RecordEnvelope, SaveResult } from '../../data/list/types';
import { formatWhen } from '../../data/list/format';
import type { RbmState } from '../../theme/tokens';
import { colour, radius, stroke } from '../../theme/tokens';
import { ringSize, useDensity } from '../../theme/RbmDensity';
import { FieldEditor, FieldView } from './fields';

/**
 * The record panel (Pattern: List to record; List to record in use). One record spec, two containers:
 * the 480 px slide-in with horizontal group tabs, and the wide panel (800 px and up) with vertical tabs,
 * counts, alerts and an "On this tab" index. As drawn: the sticky header (ID, title, status, previous
 * and next, widen, open full page, close), the summary strip, the group tabs, collapsible sections with
 * their own Edit, and the sticky footer.
 *
 * Editing as drawn: one section at a time (2 px Blue Dark border, "Editing"); the others are "Locked
 * while editing"; a dot on the tab marks unsaved work; Save stays disabled until the section is valid;
 * closing or moving to another record asks first ("Discard unsaved changes?").
 *
 * Not drawn, MUI's defaults (the agreed fallback): the live-conflict alert (Reload, and what changed) and
 * the History list. The Peek is not in this release (D2). Creating a record is separate work.
 */

export type RbmRecordContainer = 'slideIn' | 'wide';

/** The panel's width in each container (List to record board): the slide-in and the wide panel. */
export const PANEL_WIDTH: Record<RbmRecordContainer, number> = { slideIn: 480, wide: 800 };

/** Where the panel is, for the address: the record (the page's), the tab and the section. */
export interface RbmRecordLocation {
  groupId?: string;
  sectionId?: string;
}

export interface RbmRecordHandle {
  /** For the page, before it opens another record: asks first if there is unsaved work. True to go on. */
  confirmLeave(): Promise<boolean>;
}

export interface RbmRecordProps<R extends RecordEnvelope<S>, S extends string> {
  spec: RecordSpec<R, S>;
  record: R;
  container: RbmRecordContainer;
  /** Widen or narrow. The page remembers the choice per user. */
  onContainerChange: (container: RbmRecordContainer) => void;
  location?: RbmRecordLocation;
  onLocationChange?: (location: RbmRecordLocation) => void;
  onClose: () => void;
  /** Previous and next in the list: shown only when given. */
  onPrevious?: () => void;
  onNext?: () => void;
  /** Goes to the record page (RbmRecordPage, separate work): shown only when given. */
  onOpenFull?: () => void;
  /**
   * Saves one section. The page calls the server, puts \`saved.record\` into \`record\`, and returns the
   * result; the panel shows a conflict or the server's messages.
   */
  onSave: (sectionId: S, values: Partial<R>, baseVersion: number) => Promise<SaveResult<R>>;
  /** After a conflict: the page reads the record again. */
  onReload: () => void;
  onPrimaryAction?: (id: string) => void;
  /** For person fields. */
  people?: PersonRef[];
  /** "Events": the start of the wide panel's breadcrumb. */
  listName?: string;
  timeZone?: string;
  ref?: Ref<RbmRecordHandle>;
}

type AnySection<R, S extends string> = SectionSpec<R, S> | SubsectionSpec<R, S>;

const allSections = <R, S extends string>(g: GroupSpec<R, S>): AnySection<R, S>[] => g.sections.flatMap((s) => [s, ...(s.subsections ?? [])]);

// ---- Small drawn parts ------------------------------------------------------

function Glyph({ d: path, size }: { d: ReactNode; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {path}
    </svg>
  );
}
const lockPath = (
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 018 0v3" />
  </>
);

/** The semantic dot and label, as drawn in the panel's header and summary. */
function StatusLabel({ state, label, size }: { state: RbmState; label: string; size: number }) {
  const { palette } = useTheme();
  const { dot } = useDensity();
  const t = palette.status[state];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: size, fontWeight: 600, color: t.text, whiteSpace: 'nowrap' }}>
      {t.core ? (
        <Box component="span" aria-hidden="true" sx={{ width: ringSize(dot), height: ringSize(dot), borderRadius: '50%', bgcolor: t.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Box component="span" sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: t.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
        </Box>
      ) : (
        <Box component="span" aria-hidden="true" sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: t.signal, flex: 'none' }} />
      )}
      {label}
    </Box>
  );
}

/** A 36 px square header button with a Slate outline, as drawn. */
function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  const d = useDensity();
  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={onClick} sx={{ width: d.control, height: d.control, border: `${stroke.thin}px solid ${colour.slate}`, borderRadius: `${d.radius}px`, bgcolor: colour.white, color: 'primary.main', flex: 'none' }}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

/** The count on a tab: a 20 px Rule pill, as drawn. */
function Count({ n }: { n: number }) {
  return (
    <Box component="span" sx={{ ml: '6px', minWidth: 20, height: 20, px: '6px', borderRadius: '10px', bgcolor: colour.rule, color: colour.ink, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
      {n}
    </Box>
  );
}

/** An 8 px dot on a tab: Red for an alert, Blue Dark for unsaved work. Its name says which. */
function TabDot({ colourOf, label }: { colourOf: string; label: string }) {
  return <Box component="span" role="img" aria-label={label} sx={{ ml: '6px', width: 8, height: 8, borderRadius: '50%', bgcolor: colourOf, flex: 'none', display: 'inline-block' }} />;
}

// ---- Values in tables and history -------------------------------------------

function cellText(value: unknown, column: TableColumnSpec, timeZone: string): string {
  if (value === null || value === undefined || value === '') return 'None';
  if (typeof value === 'object') {
    const v = value as { name?: string; number?: string };
    return v.number && v.name ? `${v.number} ${v.name}` : (v.name ?? v.number ?? '');
  }
  if (column.kind === 'dateTime') return formatWhen(String(value), timeZone);
  return column.labels?.[String(value)] ?? String(value);
}

function Table({ rows, columns, empty, timeZone }: { rows: unknown[]; columns: readonly TableColumnSpec[]; empty: string; timeZone: string }) {
  const d = useDensity();
  if (!rows.length) return <Box sx={{ fontSize: d.body, color: 'text.secondary' }}>{empty}</Box>;
  const cell = { px: `${d.padX / 2}px`, textAlign: 'left' as const, verticalAlign: 'middle' as const, borderBottom: `${stroke.thin}px solid ${colour.rule}` };
  return (
    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: d.body }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <Box component="th" key={c.key} scope="col" sx={{ ...cell, height: d.row, fontSize: d.caption, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary', bgcolor: colour.mist }}>
              {c.label}
            </Box>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => {
              const value = (r as Record<string, unknown>)[c.key];
              return (
                <Box component="td" key={c.key} sx={{ ...cell, height: d.row, fontVariantNumeric: c.kind === 'recordNumber' || c.kind === 'dateTime' ? 'tabular-nums' : undefined, fontWeight: c.kind === 'recordNumber' ? 600 : 400 }}>
                  {c.kind === 'status' && c.states?.[String(value)] ? <StatusLabel state={c.states[String(value)]!} label={cellText(value, c, timeZone)} size={d.body} /> : cellText(value, c, timeZone)}
                </Box>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

function History({ entries, sectionLabel, timeZone }: { entries: RecordEnvelope<string>['history']; sectionLabel: (id: string) => string; timeZone: string }) {
  const d = useDensity();
  if (!entries.length) return <Box sx={{ fontSize: d.body, color: 'text.secondary' }}>No changes yet.</Box>;
  return (
    <Box component="ol" aria-label="History" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
      {entries.map((h) => (
        <Box component="li" key={h.id} sx={{ py: 2, borderBottom: `${stroke.thin}px solid ${colour.rule}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
            {formatWhen(h.at, timeZone)} · {h.by.name} · {sectionLabel(h.sectionId)}
          </Box>
          {h.changes.map((c, i) => (
            <Box component="span" key={i} sx={{ fontSize: d.body }}>
              <strong>{c.label}</strong>: {c.from} → {c.to}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

// ---- The panel --------------------------------------------------------------

interface Editing<R, S> {
  sectionId: S;
  draft: R;
  /** The server's messages, from an invalid save. */
  serverErrors: Record<string, string>;
}

export function RbmRecord<R extends RecordEnvelope<S>, S extends string>(props: RbmRecordProps<R, S>) {
  const { spec, record, container, onContainerChange, location, onLocationChange, onClose, onPrevious, onNext, onOpenFull, onSave, onReload, onPrimaryAction, people = [], listName, timeZone = 'UTC', ref } = props;
  const d = useDensity();
  const theme = useTheme();
  const wide = container === 'wide';
  const ids = useId();
  const noun = spec.noun;
  const sectionById = useMemo(() => new Map(spec.groups.flatMap((g) => allSections(g).map((s) => [s.id as string, { section: s, group: g }]))), [spec]);
  const firstOpen = () => new Set<string>(spec.groups.map((g) => g.sections[0].id));

  const [groupId, setGroupId] = useState<string>(location?.groupId ?? spec.groups[0].id);
  const [open, setOpen] = useState<Set<string>>(firstOpen);
  const [editing, setEditing] = useState<Editing<R, S> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [conflict, setConflict] = useState<{ by: PersonRef; at: string; changes: FieldChange[] } | null>(null);
  const [asking, setAsking] = useState<null | { go: () => void; resolve?: (ok: boolean) => void }>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement | null>());
  const sectionEls = useRef(new Map<string, HTMLElement | null>());

  // Another record: start again, on the same tab.
  useEffect(() => {
    setEditing(null);
    setConflict(null);
    setSaveError('');
    setOpen(firstOpen());
    // Only the record's identity matters here.
  }, [record.id]);

  // A deep link to a section: its tab, opened, in view.
  useEffect(() => {
    if (location?.groupId) setGroupId(location.groupId);
    if (location?.sectionId && sectionById.has(location.sectionId)) {
      const { group } = sectionById.get(location.sectionId)!;
      setGroupId(group.id);
      setOpen((o) => new Set(o).add(location.sectionId!));
      requestAnimationFrame(() => sectionEls.current.get(location.sectionId!)?.scrollIntoView?.({ block: 'start' }));
    }
  }, [location?.groupId, location?.sectionId, sectionById]);

  const editingSection = editing ? sectionById.get(editing.sectionId)?.section : undefined;
  const keys = editing ? editableKeys(spec, editing.sectionId) : [];
  const dirty = !!editing && keys.some((k) => JSON.stringify(editing.draft[k]) !== JSON.stringify(record[k]));
  const errors = editing ? { ...validateSection(spec, editing.sectionId, editing.draft), ...editing.serverErrors } : {};
  const valid = Object.keys(errors).length === 0;

  /** Runs \`go\`, asking first when there is unsaved work. */
  const guard = (go: () => void) => (dirty ? setAsking({ go }) : go());
  useImperativeHandle(ref, () => ({ confirmLeave: () => (dirty ? new Promise<boolean>((resolve) => setAsking({ go: () => {}, resolve })) : Promise.resolve(true)) }), [dirty]);

  const chooseGroup = (id: string) => {
    setGroupId(id);
    onLocationChange?.({ groupId: id });
  };
  const toggle = (id: string) => setOpen((o) => {
    const n = new Set(o);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const startEdit = (s: AnySection<R, S>) => {
    setSaveError('');
    setConflict(null);
    setEditing({ sectionId: s.id, draft: structuredClone(record), serverErrors: {} });
    setOpen((o) => new Set(o).add(s.id));
    onLocationChange?.({ groupId, sectionId: s.id });
  };
  const stopEdit = () => {
    const id = editing?.sectionId;
    setEditing(null);
    setSaveError('');
    if (id) requestAnimationFrame(() => editButtons.current.get(id)?.focus());
  };
  const save = async () => {
    if (!editing || !valid || !dirty || saving) return;
    const values = Object.fromEntries(keys.map((k) => [k, editing.draft[k]])) as Partial<R>;
    setSaving(true);
    setSaveError('');
    try {
      const result = await onSave(editing.sectionId, values, record.version);
      if (result.kind === 'saved') stopEdit();
      else if (result.kind === 'invalid') setEditing({ ...editing, serverErrors: result.errors });
      else setConflict({ by: result.by, at: result.at, changes: result.changes });
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const status = spec.status(record);
  const statusLabel = status.label ?? theme.palette.status[status.state].label;
  const group = spec.groups.find((g) => g.id === groupId) ?? spec.groups[0];
  const primary = spec.primaryAction?.(record) ?? null;
  const sectionLabel = (id: string) => sectionById.get(id)?.section.label ?? id;

  // ---- Header -------------------------------------------------------------
  const buttons = (
    <Box sx={{ display: 'flex', gap: '4px', flex: 'none' }}>
      {onPrevious && <HeaderButton label={`Previous ${noun}`} onClick={() => guard(onPrevious)}><Glyph size={d.icon} d={<path d="M15 6l-6 6 6 6" />} /></HeaderButton>}
      {onNext && <HeaderButton label={`Next ${noun}`} onClick={() => guard(onNext)}><Glyph size={d.icon} d={<path d="M9 6l6 6-6 6" />} /></HeaderButton>}
      <HeaderButton label={wide ? 'Narrow panel' : 'Widen panel'} onClick={() => onContainerChange(wide ? 'slideIn' : 'wide')}>
        <Glyph size={d.icon} d={wide ? <path d="M14 10l6-6M20 4h-5M20 4v5M10 14l-6 6M4 20h5M4 20v-5" /> : <path d="M4 10l6-6M4 4h5M4 4v5M20 14l-6 6M20 20h-5M20 20v-5" />} />
      </HeaderButton>
      {onOpenFull && <HeaderButton label="Open full page" onClick={() => guard(onOpenFull)}><Glyph size={d.icon} d={<><path d="M14 4h6v6M20 4l-8 8" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>} /></HeaderButton>}
      <HeaderButton label="Close panel" onClick={() => guard(onClose)}><Glyph size={d.icon} d={<path d="M6 6l12 12M18 6L6 18" />} /></HeaderButton>
    </Box>
  );
  const primaryButton = primary && onPrimaryAction && !editing && (
    <Button variant="contained" color="secondary" onClick={() => onPrimaryAction(primary.id)} sx={{ height: d.control, px: 4 }}>
      {primary.label}
    </Button>
  );

  const header = wide ? (
    <Box sx={{ px: 6, py: 4.5, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px 24px', borderBottom: `${stroke.thin}px solid ${colour.rule}` }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
        <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {listName ? `${listName} / ` : ''}
          {spec.number(record)}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <Box component="h2" id={`${ids}-title`} sx={{ m: 0, fontSize: 28, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.025em' }}>{spec.title(record)}</Box>
          <StatusLabel state={status.state} label={statusLabel} size={d.body} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {buttons}
        {primaryButton}
      </Box>
    </Box>
  ) : (
    <>
      <Box sx={{ px: 4, pt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{spec.number(record)}</Box>
        {buttons}
      </Box>
      <Box sx={{ px: 4, pt: 2.5, pb: 3, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Box component="h2" id={`${ids}-title`} sx={{ m: 0, fontSize: 22, lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.025em' }}>{spec.title(record)}</Box>
        <StatusLabel state={status.state} label={statusLabel} size={d.body} />
      </Box>
    </>
  );

  // ---- Summary strip --------------------------------------------------------
  const summary = (
    <Box
      component="dl"
      aria-label="Summary"
      sx={wide ? { m: 0, px: 6, py: 3.5, bgcolor: colour.mist, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 4, borderBottom: `${stroke.thin}px solid ${colour.rule}` } : { m: 0, mx: 4, bgcolor: colour.mist, borderRadius: `${radius.control}px`, px: 3.5, py: 3, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 16px' }}
    >
      {spec.summary.map((f) => (
        <Box key={f.label} sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <Box component="dt" sx={{ fontSize: d.caption, color: 'text.secondary' }}>{f.label}</Box>
          <Box component="dd" sx={{ m: 0, fontSize: d.body, fontWeight: 600, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{f.value(record)}</Box>
        </Box>
      ))}
    </Box>
  );

  // ---- Tabs -------------------------------------------------------------------
  const tabLabel = (g: GroupSpec<R, S>) => {
    const count = g.count?.(record);
    const alert = g.alert?.(record) ?? null;
    const unsaved = dirty && !!editing && allSections(g).some((s) => s.id === editing.sectionId);
    const text = (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {g.label}
        {alert && <TabDot colourOf={colour.red} label={alert} />}
        {unsaved && <TabDot colourOf={colour.blueDark} label="Unsaved changes" />}
      </Box>
    );
    return wide ? (
      <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {text}
        {count !== undefined && <Count n={count} />}
      </Box>
    ) : (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        {text}
        {count !== undefined && <Count n={count} />}
      </Box>
    );
  };
  const tabs = (
    <Tabs
      value={group.id}
      onChange={(_, v: string) => chooseGroup(v)}
      orientation={wide ? 'vertical' : 'horizontal'}
      aria-label={`${noun[0]!.toUpperCase()}${noun.slice(1)} groups`}
      slotProps={{ indicator: { sx: { bgcolor: colour.blueDark, ...(wide ? { left: 0, width: 4 } : { height: 3 }) } } }}
      sx={wide ? { borderRight: 0 } : { mx: 4, mt: 3, borderBottom: `${stroke.thin}px solid ${colour.rule}`, minHeight: d.control }}
    >
      {spec.groups.map((g) => (
        <Tab
          key={g.id}
          value={g.id}
          id={`${ids}-tab-${g.id}`}
          aria-controls={`${ids}-panel-${g.id}`}
          label={tabLabel(g)}
          sx={{
            textTransform: 'none',
            fontSize: wide ? 15 : d.body,
            fontWeight: 600,
            color: colour.slate,
            '&.Mui-selected': { color: colour.deepBlue, fontWeight: 700, ...(wide ? { bgcolor: colour.mist } : {}) },
            ...(wide ? { alignItems: 'stretch', minHeight: d.row, px: 5, maxWidth: 'none' } : { minHeight: d.control, minWidth: 0, px: 2.5 }),
          }}
        />
      ))}
    </Tabs>
  );

  // ---- Sections ---------------------------------------------------------------
  const renderSection = (s: AnySection<R, S>, nested = false): ReactNode => {
    const isOpen = open.has(s.id);
    const isEditing = editing?.sectionId === s.id;
    const lock = record.permissions.locked[s.id];
    const otherEditing = !!editing && !isEditing;
    const headId = `${ids}-head-${s.id}`;
    const bodyId = `${ids}-body-${s.id}`;
    const note = s.note?.(record);
    const sectionFields = s.fields ?? [];
    const firstEditable = sectionFields.find((f) => !f.readOnly);

    const right = isEditing ? (
      <Box component="span" sx={{ fontSize: d.caption, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.blueDark }}>Editing</Box>
    ) : lock ? (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: d.caption, color: 'text.secondary', textAlign: 'right' }}>
        <Glyph size={16} d={lockPath} />
        {lock.reason}
      </Box>
    ) : otherEditing && s.editable ? (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: d.caption, color: 'text.secondary' }}>
        <Glyph size={16} d={lockPath} />
        Locked while editing
      </Box>
    ) : note ? (
      <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{note}</Box>
    ) : null;

    return (
      <Box
        key={s.id}
        ref={(el: HTMLElement | null) => {
          sectionEls.current.set(s.id, el);
        }}
        component="section"
        aria-labelledby={headId}
        data-section={s.id}
        sx={{ border: isEditing ? `${stroke.thick}px solid ${colour.blueDark}` : `${stroke.thin}px solid ${colour.rule}`, borderRadius: `${radius.card}px`, overflow: 'hidden', ml: nested ? 4 : 0, scrollMarginTop: 8 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, minHeight: 48, px: 3.5, bgcolor: colour.mist }}>
          <ButtonBase
            id={headId}
            onClick={() => toggle(s.id)}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            sx={{ display: 'flex', alignItems: 'center', gap: 2.5, minHeight: 48, flex: 1, justifyContent: 'flex-start', fontFamily: 'inherit', borderRadius: 1 }}
          >
            <Box component="span" sx={{ color: colour.slate, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}>
              <Glyph size={d.icon} d={<path d="M9 6l6 6-6 6" />} />
            </Box>
            <Box component="span" sx={{ fontSize: 15, fontWeight: 700, color: 'primary.main' }}>{s.label}</Box>
          </ButtonBase>
          {right}
        </Box>
        {isOpen && (
          <Box id={bodyId} sx={{ px: 3.5, py: 3, borderTop: `${stroke.thin}px solid ${colour.rule}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {s.editable && !lock && !editing && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  ref={(el: HTMLButtonElement | null) => {
                    editButtons.current.set(s.id, el);
                  }}
                  variant="outlined"
                  onClick={() => startEdit(s)}
                  aria-label={`Edit ${s.label}`}
                  sx={{ height: d.control, px: 3.5, borderWidth: stroke.thin, '&:hover': { borderWidth: stroke.thin } }}
                >
                  Edit
                </Button>
              </Box>
            )}
            {isEditing && conflict && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setConflict(null);
                      setEditing(null);
                      onReload();
                    }}
                  >
                    Reload
                  </Button>
                }
              >
                {conflict.by.name} changed this {noun} at {formatWhen(conflict.at, timeZone)} while you were editing. Your changes are not saved.
                {conflict.changes.length > 0 && (
                  <Box component="ul" aria-label="What changed" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                    {conflict.changes.map((c, i) => (
                      <li key={i}>
                        {c.label}: {c.from} → {c.to}
                      </li>
                    ))}
                  </Box>
                )}
              </Alert>
            )}
            {sectionFields.length > 0 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px' }}>
                {sectionFields.map((f) =>
                  isEditing && !f.readOnly ? (
                    <FieldEditor
                      key={f.key}
                      field={f}
                      draft={editing.draft}
                      onChange={(k, v) => {
                        const { [k]: _gone, ...rest } = editing.serverErrors;
                        void _gone;
                        setEditing({ ...editing, draft: { ...editing.draft, [k]: v }, serverErrors: rest });
                      }}
                      error={errors[f.key]}
                      people={people}
                      timeZone={timeZone}
                      autoFocus={f === firstEditable}
                    />
                  ) : (
                    <FieldView key={f.key} field={f} record={isEditing ? editing.draft : record} timeZone={timeZone} />
                  ),
                )}
              </Box>
            )}
            {s.table && <Table rows={(record[s.table.key] as unknown[]) ?? []} columns={s.table.columns} empty={s.table.empty} timeZone={timeZone} />}
            {s.history && <History entries={record.history} sectionLabel={sectionLabel} timeZone={timeZone} />}
          </Box>
        )}
        {isOpen && 'subsections' in s && s.subsections && <Box sx={{ px: 3.5, pb: 3, display: 'flex', flexDirection: 'column', gap: '10px' }}>{s.subsections.map((x) => renderSection(x, true))}</Box>}
      </Box>
    );
  };

  const sectionsOf = (g: GroupSpec<R, S>) => (
    <Box role="tabpanel" id={`${ids}-panel-${g.id}`} aria-labelledby={`${ids}-tab-${g.id}`} sx={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
        <Button variant="text" onClick={() => setOpen((o) => new Set([...o, ...allSections(g).map((s) => s.id)]))} sx={{ minHeight: d.control, height: d.control, px: 2.5, fontSize: d.body }}>
          Expand all
        </Button>
        <Button variant="text" onClick={() => setOpen((o) => new Set([...o].filter((id) => !allSections(g).some((s) => s.id === id) || id === editing?.sectionId)))} sx={{ minHeight: d.control, height: d.control, px: 2.5, fontSize: d.body }}>
          Collapse all
        </Button>
      </Box>
      {g.sections.map((s) => renderSection(s))}
    </Box>
  );

  // ---- Footer -------------------------------------------------------------------
  const footer = editing ? (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, px: 4, py: 3, borderTop: `${stroke.thin}px solid ${colour.rule}`, bgcolor: colour.mist }}>
      <Box component="span" role="status" sx={{ fontSize: d.caption, fontWeight: 600, color: saveError ? colour.redInner : 'primary.main' }}>
        {saveError || (dirty ? `Unsaved changes in ${editingSection?.label}` : `Editing ${editingSection?.label}`)}
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={stopEdit} sx={{ height: d.control, px: 3.5 }}>
          Discard
        </Button>
        <Button variant="contained" onClick={() => void save()} disabled={!valid || !dirty || saving} sx={{ height: d.control, px: 3.5 }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Box>
  ) : wide ? null : (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 3, px: 4, py: 3, borderTop: `${stroke.thin}px solid ${colour.rule}`, bgcolor: colour.white }}>
      <Box sx={{ display: 'flex', gap: 2 }}>{primaryButton}</Box>
      <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
        Saved {formatWhen(record.updatedAt, timeZone)}
      </Box>
    </Box>
  );

  const editingLabel = editingSection?.label ?? '';
  return (
    <Box
      role="region"
      aria-labelledby={`${ids}-title`}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented && !asking) {
          e.preventDefault();
          guard(onClose);
        }
      }}
      sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, bgcolor: colour.white, lineHeight: 'normal' }}
    >
      {header}
      {summary}
      {wide ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', flex: 1, minHeight: 0 }}>
          <Box sx={{ borderRight: `${stroke.thin}px solid ${colour.rule}`, py: 3, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
            {tabs}
            <Box component="nav" aria-label="On this tab" sx={{ mx: 5, mt: 3, pt: 3, borderTop: `${stroke.thin}px solid ${colour.rule}`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <Box component="span" sx={{ fontSize: d.caption, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>On this tab</Box>
              {group.sections.map((s) => (
                <ButtonBase
                  key={s.id}
                  onClick={() => {
                    setOpen((o) => new Set(o).add(s.id));
                    onLocationChange?.({ groupId: group.id, sectionId: s.id });
                    requestAnimationFrame(() => sectionEls.current.get(s.id)?.scrollIntoView?.({ block: 'start' }));
                  }}
                  sx={{ justifyContent: 'flex-start', minHeight: d.control, fontFamily: 'inherit', fontSize: d.body, fontWeight: 600, color: 'primary.main', borderRadius: 1 }}
                >
                  {s.label}
                </ButtonBase>
              ))}
            </Box>
          </Box>
          <Box sx={{ px: 6, pt: 4, pb: 6, overflowY: 'auto', minWidth: 0 }}>{sectionsOf(group)}</Box>
        </Box>
      ) : (
        <>
          {tabs}
          <Box sx={{ px: 4, py: 3, flex: 1, minHeight: 0, overflowY: 'auto' }}>{sectionsOf(group)}</Box>
        </>
      )}
      {footer}

      <Dialog open={!!asking} onClose={() => { asking?.resolve?.(false); setAsking(null); }} aria-labelledby={`${ids}-discard`} aria-describedby={`${ids}-discard-body`} maxWidth="xs" fullWidth>
        <DialogTitle id={`${ids}-discard`}>Discard unsaved changes?</DialogTitle>
        <DialogContent>
          <DialogContentText id={`${ids}-discard-body`}>Your changes to {editingLabel} will be lost.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" autoFocus onClick={() => { asking?.resolve?.(false); setAsking(null); }}>
            Keep editing
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              const a = asking;
              setAsking(null);
              setEditing(null);
              a?.resolve?.(true);
              a?.go();
            }}
          >
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

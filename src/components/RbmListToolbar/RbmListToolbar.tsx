import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, InputBase, ListSubheader, Menu, MenuItem, Popover, TextField, Tooltip } from '@mui/material';
import { colour, elevation, pillColours, radius, stroke } from '../../theme/tokens';
import { hitTarget, useDensity } from '../../theme/RbmDensity';

/**
 * The list toolbar, as drawn on the Page templates board ("1 · List of records", zone 2): search,
 * filters, the saved view, the column chooser and export, always in one row. Filters live here, above
 * the grid, and are never hidden in a drawer (board rule).
 *
 * Not drawn, decided by Andy Smith (22 Oct 2026):
 * - each filter opens a checkbox list in the style of the Task Timeline's runbook filter;
 * - the view pill opens MUI's menu to choose a view, save a new one, save changes or delete;
 * - Export downloads a CSV of every matching row, built by the server.
 * Sizes come from the region's density (a list page is D2 Compact).
 */

export interface RbmToolbarFilter {
  id: string;
  /** "Status". */
  label: string;
  options: { value: string; label: string }[];
  /** Nothing selected means any value. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

export interface RbmToolbarView {
  id: string;
  name: string;
  kind: 'system' | 'user';
}

export interface RbmListToolbarProps {
  /** "events": used in "Search events", "Filter events" and the export button's name. */
  noun: string;
  search: string;
  onSearchChange: (search: string) => void;
  filters: RbmToolbarFilter[];
  views: RbmToolbarView[];
  currentViewId: string;
  /** True when the filters, columns or sort differ from the current view: a user view can then be saved. */
  viewChanged?: boolean;
  onSelectView: (id: string) => void;
  /** Saves the current filters, columns and sort as a new view of the user's own. */
  onSaveView?: (name: string) => void;
  /** Saves the changes into the current view (the user's own views only). */
  onUpdateView?: () => void;
  onDeleteView?: (id: string) => void;
  /** Opens the column chooser (RbmDataGrid's openColumnChooser). */
  onOpenColumns: () => void;
  onExport: () => void;
  /** While the export is being built. */
  exporting?: boolean;
}

function Glyph({ size, children, colourOf = colour.slate }: { size: number; children: ReactNode; colourOf?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colourOf} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}
const chevron = <path d="M6 9l6 6 6-6" />;
const magnifier = (
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </>
);

/**
 * A pill, as drawn: the control height and a Silver border; a Deep Blue border when on. A filter that is
 * narrowing the list is also tinted; the view pill is drawn on white.
 */
function Pill({ on, tinted = on, label, onClick, buttonRef, expanded, popupId, popup }: { on: boolean; tinted?: boolean; label: string; onClick: () => void; buttonRef: Ref<HTMLButtonElement>; expanded: boolean; popupId: string; popup: 'dialog' | 'menu' }) {
  const d = useDensity();
  return (
    <ButtonBase
      ref={buttonRef}
      onClick={onClick}
      aria-haspopup={popup}
      aria-expanded={expanded}
      aria-controls={expanded ? popupId : undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        height: d.control,
        px: 3,
        borderRadius: `${radius.pill}px`,
        border: pillColours(on).border,
        bgcolor: pillColours(tinted).bgcolor,
        fontFamily: 'inherit',
        fontSize: d.body,
        fontWeight: 600,
        color: 'primary.main',
        whiteSpace: 'nowrap',
        flex: 'none',
      }}
    >
      {label}
      <Glyph size={16}>{chevron}</Glyph>
    </ButtonBase>
  );
}

/** A filter: the pill and its checkbox list, in the Task Timeline runbook filter's drawn style. */
function FilterPill({ filter }: { filter: RbmToolbarFilter }) {
  const d = useDensity();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const popupId = useId();
  const { label, options, selected, onChange } = filter;
  const on = selected.length > 0;
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <>
      <Pill on={on} label={on ? `${label} · ${selected.length}` : label} onClick={() => setOpen(true)} buttonRef={anchor} expanded={open} popupId={popupId} popup="dialog" />
      <Popover
        open={open}
        anchorEl={anchor.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { id: popupId, role: 'dialog', 'aria-label': `Filter by ${label.toLowerCase()}`, sx: { mt: 1.5, width: 280, maxWidth: 'calc(100vw - 32px)', border: 1, borderColor: 'divider', borderRadius: `${radius.control}px`, boxShadow: elevation.menu } } }}
      >
        {options.length > 6 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: d.row, px: `${d.padX}px`, borderBottom: 1, borderColor: 'divider' }}>
            <Glyph size={d.icon}>{magnifier}</Glyph>
            <InputBase autoFocus placeholder={`Search ${label.toLowerCase()}`} value={query} onChange={(e) => setQuery(e.target.value)} inputProps={{ 'aria-label': `Search ${label.toLowerCase()}` }} sx={{ flex: 1, fontSize: d.body }} />
          </Box>
        )}
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', maxHeight: 8 * d.row, overflowY: 'auto' }}>
          {shown.map((o) => {
            const checked = selected.includes(o.value);
            return (
              <Box component="li" key={o.value} sx={{ position: 'relative', display: 'flex', alignItems: 'center', height: d.row, px: `${d.padX}px`, '&:hover, &:focus-within': { bgcolor: 'grey.100' } }}>
                <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, flex: 1, minWidth: 0, cursor: 'pointer', fontSize: d.body, fontWeight: 600 }}>
                  <Box
                    component="input"
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    aria-label={o.label}
                    sx={{ position: 'absolute', opacity: 0, width: 18, height: 18, m: 0, '&:focus-visible + span': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } }}
                  />
                  <Box component="span" aria-hidden="true" sx={{ width: 18, height: 18, borderRadius: '5px', boxSizing: 'border-box', flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...(checked ? { bgcolor: 'primary.main' } : { border: `${stroke.thick}px solid ${colour.silver}` }) }}>
                    {checked && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colour.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7" />
                      </svg>
                    )}
                  </Box>
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</Box>
                </Box>
              </Box>
            );
          })}
          {shown.length === 0 && <Box component="li" sx={{ px: `${d.padX}px`, py: 3, fontSize: d.caption, color: 'text.secondary' }}>No {label.toLowerCase()} matches.</Box>}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: d.row, px: `${d.padX}px`, borderTop: 1, borderColor: 'divider' }}>
          {(
            [
              ['Select all', () => onChange(options.map((o) => o.value))],
              ['Clear', () => onChange([])],
            ] as const
          ).map(([text, fn]) => (
            <ButtonBase key={text} onClick={fn} aria-label={`${text}: ${label.toLowerCase()}`} sx={{ fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, ...hitTarget(d.target) }}>
              {text}
            </ButtonBase>
          ))}
        </Box>
      </Popover>
    </>
  );
}

/** "View: Active" and its menu. MUI's default menu and dialogs (decided: not drawn). */
function ViewsMenu({ views, currentViewId, viewChanged, onSelectView, onSaveView, onUpdateView, onDeleteView }: Pick<RbmListToolbarProps, 'views' | 'currentViewId' | 'viewChanged' | 'onSelectView' | 'onSaveView' | 'onUpdateView' | 'onDeleteView'>) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const menuId = useId();
  const current = views.find((v) => v.id === currentViewId);
  const mine = current?.kind === 'user';
  const system = views.filter((v) => v.kind === 'system');
  const user = views.filter((v) => v.kind === 'user');
  const taken = views.some((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameError = !name.trim() ? 'A view needs a name.' : taken ? 'You already have a view with this name.' : '';
  const choose = (id: string) => {
    setOpen(false);
    onSelectView(id);
  };
  const item = (v: RbmToolbarView) => (
    <MenuItem key={v.id} selected={v.id === currentViewId} role="menuitemradio" aria-checked={v.id === currentViewId} onClick={() => choose(v.id)}>
      {v.name}
    </MenuItem>
  );

  return (
    <>
      <Pill on tinted={false} label={`View: ${current?.name ?? 'None'}${viewChanged ? ' (changed)' : ''}`} onClick={() => setOpen(true)} buttonRef={anchor} expanded={open} popupId={menuId} popup="menu" />
      <Menu id={menuId} open={open} anchorEl={anchor.current} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ list: { 'aria-label': 'Views' } }}>
        <ListSubheader>Views</ListSubheader>
        {system.map(item)}
        {user.length > 0 && <ListSubheader>Your views</ListSubheader>}
        {user.map(item)}
        {onSaveView && (
          <MenuItem
            onClick={() => {
              setOpen(false);
              setName('');
              setSaving(true);
            }}
          >
            Save as new view…
          </MenuItem>
        )}
        {mine && viewChanged && onUpdateView && (
          <MenuItem
            onClick={() => {
              setOpen(false);
              onUpdateView();
            }}
          >
            Save changes to {current!.name}
          </MenuItem>
        )}
        {mine && onDeleteView && (
          <MenuItem
            onClick={() => {
              setOpen(false);
              setDeleting(true);
            }}
          >
            Delete {current!.name}…
          </MenuItem>
        )}
      </Menu>

      <Dialog open={saving} onClose={() => setSaving(false)} aria-labelledby={`${menuId}-save`} fullWidth maxWidth="xs">
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameError || !onSaveView) return;
            onSaveView(name.trim());
            setSaving(false);
          }}
        >
          <DialogTitle id={`${menuId}-save`}>Save as new view</DialogTitle>
          <DialogContent>
            <TextField autoFocus fullWidth label="Name" value={name} onChange={(e) => setName(e.target.value)} error={!!name && !!nameError} helperText={name ? nameError || 'Keeps the filters, columns and sort.' : 'Keeps the filters, columns and sort.'} sx={{ mt: 1 }} />
          </DialogContent>
          <DialogActions>
            <Button variant="text" onClick={() => setSaving(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="secondary" disabled={!!nameError}>
              Save view
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={deleting} onClose={() => setDeleting(false)} aria-labelledby={`${menuId}-delete`} fullWidth maxWidth="xs">
        <DialogTitle id={`${menuId}-delete`}>Delete {current?.name}?</DialogTitle>
        <DialogContent>The view is removed for you. The events themselves are not changed.</DialogContent>
        <DialogActions>
          <Button variant="text" onClick={() => setDeleting(false)}>
            Keep it
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setDeleting(false);
              if (current) onDeleteView?.(current.id);
            }}
          >
            Delete view
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

/** A square tool button, as drawn: the control size, Silver border, a Deep Blue icon. */
function ToolButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  const d = useDensity();
  return (
    <Tooltip title={label}>
      <span style={{ display: 'inline-flex' }}>
        <ButtonBase
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          sx={{ width: d.control, height: d.control, flex: 'none', borderRadius: `${d.radius}px`, border: `${stroke.thin}px solid ${colour.silver}`, bgcolor: colour.white, color: 'primary.main', '&.Mui-disabled': { color: colour.slate, bgcolor: colour.mist } }}
        >
          <Glyph size={d.icon} colourOf="currentColor">
            {children}
          </Glyph>
        </ButtonBase>
      </span>
    </Tooltip>
  );
}

export function RbmListToolbar(props: RbmListToolbarProps) {
  const { noun, search, onSearchChange, filters, onOpenColumns, onExport, exporting = false } = props;
  const d = useDensity();
  // One row tall, so the bulk action bar can swap in without moving the grid.
  return (
    <Box role="group" aria-label={`Find ${noun}`} sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, flexWrap: 'nowrap', height: d.row, minWidth: 0, overflowX: 'auto' }}>
      {/* Search: 260 px, as drawn, at the control height. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, height: d.control, width: 260, flex: 'none', px: 3, border: `${stroke.thin}px solid ${colour.silver}`, borderRadius: `${d.radius}px`, bgcolor: colour.white, boxSizing: 'border-box', '&:focus-within': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } }}>
        <Glyph size={18}>{magnifier}</Glyph>
        <InputBase
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && search) {
              e.preventDefault();
              onSearchChange('');
            }
          }}
          placeholder={`Search ${noun}`}
          inputProps={{ 'aria-label': `Search ${noun}`, type: 'search' }}
          sx={{ flex: 1, minHeight: 0, fontSize: d.body, '& input': { p: 0 }, '& input::placeholder': { color: colour.slate, opacity: 1 }, '& input::-webkit-search-cancel-button': { display: 'none' } }}
        />
        {search && (
          <ButtonBase onClick={() => onSearchChange('')} aria-label="Clear search" sx={{ borderRadius: 1, color: colour.slate, ...hitTarget(d.target) }}>
            <Glyph size={16} colourOf="currentColor">
              <path d="M6 6l12 12M18 6L6 18" />
            </Glyph>
          </ButtonBase>
        )}
      </Box>

      {filters.map((f) => (
        <FilterPill key={f.id} filter={f} />
      ))}

      <Box sx={{ flex: 1 }} />

      <ViewsMenu {...props} />
      <ToolButton label="Columns" onClick={onOpenColumns}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M9.5 4v16M14.5 4v16" />
      </ToolButton>
      <ToolButton label={exporting ? 'Exporting…' : `Export ${noun} as CSV`} onClick={onExport} disabled={exporting}>
        <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
      </ToolButton>
    </Box>
  );
}

/** Saves an export to the user's computer. The page calls it with what ListData.exportCsv returned. */
export function downloadCsv({ filename, csv }: { filename: string; csv: string }) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

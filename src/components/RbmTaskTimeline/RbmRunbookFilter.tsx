import { Box, ButtonBase, InputBase, Popover, useTheme } from '@mui/material';
import { useId, useRef, useState } from 'react';
import { colour, elevation, pillColours, radius, stroke } from '../../theme/tokens';
import { hitTarget, ringSize, useDensity } from '../../theme/RbmDensity';
import type { RbmRag } from '../RbmEventVitals/RbmEventVitals';

export interface RbmRunbookOption {
  id: string;
  wbs: string;
  name: string;
  /** The record number, for example "RBK0000001". */
  recordId: string;
  rag: RbmRag;
  /** Tasks in focus. A runbook with nothing to show is still listed, with a zero. */
  inFocus: number;
}

export interface RbmRunbookFilterProps {
  runbooks: RbmRunbookOption[];
  /** Selected runbook ids. Empty means all runbooks. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

function Chevron() {
  const { icon } = useDensity();
  return (
    <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={colour.slate} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function RagMark({ rag }: { rag: RbmRag }) {
  const { status } = useTheme().palette;
  const { dot } = useDensity();
  if (rag === 'amber') {
    return (
      <Box component="span" aria-hidden="true" sx={{ width: ringSize(dot), height: ringSize(dot), borderRadius: '50%', bgcolor: status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
        <Box component="span" sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: status.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
      </Box>
    );
  }
  return <Box component="span" aria-hidden="true" sx={{ width: dot, height: dot, borderRadius: '50%', bgcolor: rag === 'red' ? status.blocked.signal : status.complete.signal, flex: 'none' }} />;
}

const ragWord: Record<RbmRag, string> = { green: 'Green', amber: 'Amber', red: 'Red' };

/**
 * The runbook filter in the Task Timeline toolbar, as drawn on the Command board ("Filtering by
 * runbook"). Nothing selected means all runbooks. Hovering a row shows Only. Above six runbooks a
 * search field appears. It filters the Task Timeline and the Hot-topics strip, never the vitals or ribbon.
 */
export function RbmRunbookFilter({ runbooks, selected, onChange }: RbmRunbookFilterProps) {
  const d = useDensity();
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const listId = useId();
  const all = selected.length === 0 || selected.length === runbooks.length;
  const label = all ? 'All runbooks' : `${selected.length} of ${runbooks.length} runbooks`;
  // The ticks show exactly what is chosen; choosing nothing still shows every runbook.
  const isOn = (id: string) => selected.includes(id);
  const shown = runbooks.filter((r) => `${r.wbs} ${r.name} ${r.recordId}`.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <>
      <ButtonBase
        ref={anchor}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1.5,
          height: d.control,
          px: 3,
          borderRadius: `${radius.pill}px`,
          ...pillColours(!all),
          fontFamily: 'inherit',
          fontSize: d.body,
          fontWeight: 700,
          color: 'primary.main',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
        <Chevron />
      </ButtonBase>
      <Popover
        open={open}
        anchorEl={anchor.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { id: listId, role: 'dialog', 'aria-label': 'Filter by runbook', sx: { mt: 1.5, width: 320, maxWidth: 'calc(100vw - 32px)', border: 1, borderColor: 'divider', borderRadius: `${radius.control}px`, boxShadow: elevation.menu } } }}
      >
        {runbooks.length > 6 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: d.row, px: `${d.padX}px`, borderBottom: 1, borderColor: 'divider', fontSize: d.body, color: 'text.secondary' }}>
            <svg width={d.icon} height={d.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <InputBase autoFocus placeholder="Search runbooks" value={query} onChange={(e) => setQuery(e.target.value)} inputProps={{ 'aria-label': 'Search runbooks' }} sx={{ flex: 1, fontSize: d.body }} />
          </Box>
        )}
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {shown.map((r) => (
            <Box
              component="li"
              key={r.id}
              sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: `${d.gap}px`, height: d.row, px: `${d.padX}px`, '&:hover, &:focus-within': { bgcolor: 'grey.100' }, '& .rbm-only': { opacity: 0 }, '&:hover .rbm-only, &:focus-within .rbm-only': { opacity: 1 } }}
            >
              <Box component="label" sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <Box
                  component="input"
                  type="checkbox"
                  checked={isOn(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`${r.wbs} ${r.name}, ${r.recordId}, ${ragWord[r.rag]}, ${r.inFocus} in focus`}
                  sx={{ position: 'absolute', opacity: 0, width: 18, height: 18, m: 0, '&:focus-visible + span': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } }}
                />
                <Box component="span" aria-hidden="true" sx={{ width: 18, height: 18, borderRadius: '5px', boxSizing: 'border-box', flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...(isOn(r.id) ? { bgcolor: 'primary.main' } : { border: `${stroke.thick}px solid ${colour.silver}` }) }}>
                  {isOn(r.id) && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colour.white} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </Box>
                <Box component="span" aria-hidden="true" sx={{ fontSize: d.caption, fontWeight: 700, color: 'text.secondary', minWidth: 18, fontVariantNumeric: 'tabular-nums' }}>
                  {r.wbs}
                </Box>
                <Box component="span" aria-hidden="true" sx={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25, minWidth: 0 }}>
                  <Box component="span" sx={{ fontSize: d.body, fontWeight: 600, color: 'text.primary' }}>{r.name}</Box>
                  <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>{r.recordId}</Box>
                </Box>
              </Box>
              <RagMark rag={r.rag} />
              <ButtonBase className="rbm-only" onClick={() => onChange([r.id])} aria-label={`Only ${r.name}`} sx={{ fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, ...hitTarget(d.target) }}>
                Only
              </ButtonBase>
              <Box component="span" aria-hidden="true" sx={{ fontSize: d.caption, fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'right' }}>
                {r.inFocus}
              </Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: d.row, px: `${d.padX}px`, borderTop: 1, borderColor: 'divider' }}>
          {(
            [
              ['Select all', () => onChange(runbooks.map((r) => r.id))],
              ['Clear', () => onChange([])],
            ] as const
          ).map(([text, fn]) => (
            <ButtonBase key={text} onClick={fn} sx={{ fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5, ...hitTarget(d.target) }}>
              {text}
            </ButtonBase>
          ))}
        </Box>
      </Popover>
    </>
  );
}

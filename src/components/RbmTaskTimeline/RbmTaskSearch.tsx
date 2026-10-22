import { Box, ButtonBase, InputBase, Paper, Popper } from '@mui/material';
import { forwardRef, useId, useRef, useState, type KeyboardEvent } from 'react';
import { colour, elevation, radius } from '../../theme/tokens';
import type { RbmTimelineTask } from './focusRule';
import { highlight, matchedField, searchWords, type RbmSearchField } from './taskSearch';

export interface RbmTaskSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Tasks that match, in timeline order. The first few are offered as suggestions. */
  suggestions: RbmTimelineTask[];
  fields: RbmSearchField[];
  /** Runbook names by id, shown under each suggestion. */
  runbookNames: Map<string, string>;
  /** A suggestion was chosen: the timeline narrows to it and focuses its row. */
  onPick: (task: RbmTimelineTask) => void;
}

/** Suggestions shown under the field. */
export const SUGGESTION_LIMIT = 8;

/**
 * The Task Timeline search: a typeahead in the toolbar. Typing narrows the timeline at once and
 * offers the first matching tasks; Arrow keys move through them, Enter picks one, Escape closes
 * the list and then clears the search. Not drawn on the Command board (flagged).
 */
export const RbmTaskSearch = forwardRef<HTMLInputElement, RbmTaskSearchProps>(function RbmTaskSearch({ value, onChange, suggestions, fields, runbookNames, onPick }, inputRef) {
  const anchor = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const words = searchWords(value);
  const shown = words.length ? suggestions.slice(0, SUGGESTION_LIMIT) : [];
  const listOpen = open && shown.length > 0;
  const optionId = (i: number) => `${listId}-${i}`;

  const pick = (t: RbmTimelineTask) => {
    setOpen(false);
    setActive(-1);
    onPick(t);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && shown.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % shown.length);
    } else if (e.key === 'ArrowUp' && shown.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a <= 0 ? shown.length - 1 : a - 1));
    } else if (e.key === 'Enter' && listOpen && active >= 0) {
      e.preventDefault();
      pick(shown[active]!);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      if (listOpen) setOpen(false);
      else onChange('');
      setActive(-1);
    }
  };

  return (
    <Box
      ref={anchor}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, height: 32, width: 220, minWidth: 140, flexShrink: 1, px: 3, boxSizing: 'border-box', borderRadius: `${radius.pill}px`, border: `1px solid ${words.length ? colour.deepBlue : colour.silver}`, bgcolor: words.length ? 'rgba(35,50,111,0.08)' : colour.white, '&:focus-within': { outline: `2px solid ${colour.blueDark}`, outlineOffset: 1 } }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colour.slate} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
      <InputBase
        inputRef={inputRef}
        value={value}
        placeholder="Search tasks"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        inputProps={{
          role: 'combobox',
          'aria-label': 'Search tasks',
          'aria-autocomplete': 'list',
          'aria-expanded': listOpen,
          'aria-controls': listOpen ? listId : undefined,
          'aria-activedescendant': listOpen && active >= 0 ? optionId(active) : undefined,
          spellCheck: false,
        }}
        sx={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'primary.main', '& input': { p: 0 }, '& input::placeholder': { color: colour.slate, opacity: 1, fontWeight: 400 } }}
      />
      {value && (
        <ButtonBase onClick={() => onChange('')} aria-label="Clear search" sx={{ borderRadius: '50%', color: colour.slate, flex: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </ButtonBase>
      )}
      <Popper open={listOpen} anchorEl={anchor.current} placement="bottom-start" style={{ zIndex: 1300 }}>
        <Paper sx={{ mt: 1.5, width: 360, maxWidth: 'calc(100vw - 32px)', border: 1, borderColor: 'divider', borderRadius: `${radius.control}px`, boxShadow: elevation.menu, overflow: 'hidden' }}>
          <Box component="ul" id={listId} role="listbox" aria-label="Matching tasks" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {shown.map((t, i) => {
              const field = matchedField(t, words, fields);
              return (
                <Box
                  component="li"
                  key={t.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  // Keep focus in the field, so typing carries on.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(t)}
                  onMouseEnter={() => setActive(i)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 3, minHeight: 44, px: 4, py: 1.5, cursor: 'pointer', borderTop: i > 0 ? 1 : 0, borderColor: 'divider', bgcolor: i === active ? 'grey.100' : 'transparent' }}
                >
                  <Box component="span" sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', minWidth: 44, fontVariantNumeric: 'tabular-nums' }}>{t.wbs}</Box>
                  <Box component="span" sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.3 }}>
                    <Box component="span" sx={{ fontSize: 13, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {highlight(t.title, words).map((p, n) => (p.match ? <Box component="strong" key={n} sx={{ fontWeight: 800 }}>{p.text}</Box> : <span key={n}>{p.text}</span>))}
                    </Box>
                    <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {runbookNames.get(t.runbookId)}
                      {field && field.key !== 'title' && ` · matched ${field.label.toLowerCase()}`}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
          {suggestions.length > shown.length && (
            <Box sx={{ px: 4, py: 2, borderTop: 1, borderColor: 'divider', fontSize: 12, color: 'text.secondary' }}>
              {suggestions.length - shown.length} more in the timeline
            </Box>
          )}
        </Paper>
      </Popper>
    </Box>
  );
});

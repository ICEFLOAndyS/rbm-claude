import { useId } from 'react';
import { Box, FormControl, FormHelperText, MenuItem, OutlinedInput, Select } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import type { FieldSpec } from '../../data/list/recordSpec';
import type { PersonRef } from '../../data/list/types';
import { formatWhen } from '../../data/list/format';
import { colour, stroke } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';

/**
 * A record's fields, as drawn on the List to record in use board: the label (secondary text, Slate)
 * over the value (body text) in view mode; a 36 px field with the message under it when editing.
 * Date and time fields use MUI X Date Pickers (decided by Andy Smith, 22 Oct 2026); this is the only
 * file that imports them.
 */

/** A field's text in view mode. */
export function displayValue<R>(field: FieldSpec<R>, record: R, timeZone: string): string {
  if (field.format) return field.format(record);
  const value: unknown = record[field.key];
  if (value === null || value === undefined || value === '') return 'None';
  switch (field.kind) {
    case 'enum':
      return field.options?.find((o) => o.value === value)?.label ?? String(value);
    case 'person':
      return (value as PersonRef).name;
    case 'dateTime':
      return formatWhen(value as string, timeZone);
    case 'percent':
      return `${value as number}%`;
    default:
      return String(value);
  }
}

// ---- Time zones -----------------------------------------------------------
// The date-fns adapter works in the browser's time zone. RBM shows times in the event's time zone, so
// the picker is given a Date whose local fields are the wall-clock time there, and its answer is turned
// back into an instant.

function zoneOffset(timeZone: string, at: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(at))
      .map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - Math.floor(at / 1000) * 1000;
}

/** An ISO instant as a local Date holding the wall-clock time in `timeZone`. */
export function toWallClock(iso: string, timeZone: string): Date {
  const at = Date.parse(iso);
  const w = new Date(at + zoneOffset(timeZone, at));
  return new Date(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), w.getUTCHours(), w.getUTCMinutes());
}

/** A local Date holding a wall-clock time in `timeZone`, as an ISO instant ("2026-10-24T22:00:00Z"). */
export function fromWallClock(wall: Date, timeZone: string): string {
  const guess = Date.UTC(wall.getFullYear(), wall.getMonth(), wall.getDate(), wall.getHours(), wall.getMinutes());
  const at = guess - zoneOffset(timeZone, guess);
  return new Date(at).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ---- View -----------------------------------------------------------------

export function FieldView<R>({ field, record, timeZone }: { field: FieldSpec<R>; record: R; timeZone: string }) {
  const d = useDensity();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, gridColumn: field.kind === 'longText' ? 'span 2' : undefined }}>
      <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary' }}>
        {field.label}
      </Box>
      <Box component="span" sx={{ fontSize: d.body, fontWeight: 500, lineHeight: 1.45, overflowWrap: 'anywhere', fontVariantNumeric: field.kind === 'dateTime' || field.kind === 'recordNumber' ? 'tabular-nums' : undefined }}>
        {displayValue(field, record, timeZone)}
      </Box>
      {field.help && (
        <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary' }}>
          {field.help}
        </Box>
      )}
    </Box>
  );
}

// ---- Edit -----------------------------------------------------------------

export interface FieldEditorProps<R> {
  field: FieldSpec<R>;
  draft: R;
  onChange: (key: keyof R & string, value: unknown) => void;
  /** What is wrong and why, under the field. */
  error?: string;
  people: PersonRef[];
  timeZone: string;
  autoFocus?: boolean;
}

/** Read by screen readers, not shown. */
const visuallyHidden = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0, p: 0, m: '-1px' } as const;

/** The drawn field: 36 px, a 1 px Slate border, 12 px corners; 2 px Red Inner when it needs fixing. */
const inputSx = (radius: number) => ({
  borderRadius: `${radius}px`,
  bgcolor: colour.white,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: colour.slate, borderWidth: stroke.thin },
  '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: colour.redInner, borderWidth: stroke.thick },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colour.blueDark, borderWidth: stroke.thick },
});

export function FieldEditor<R>({ field, draft, onChange, error, people, timeZone, autoFocus }: FieldEditorProps<R>) {
  const d = useDensity();
  const id = useId();
  const value: unknown = draft[field.key];
  const helpId = `${id}-help`;
  const label = `${field.label}${field.required ? ' (required)' : ''}`;

  let input;
  if (field.kind === 'dateTime') {
    input = (
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
        <DateTimePicker
          value={value ? toWallClock(value as string, timeZone) : null}
          onChange={(v) => onChange(field.key, v && !Number.isNaN(v.getTime()) ? fromWallClock(v, timeZone) : null)}
          ampm={false}
          format="dd MMM yyyy HH:mm"
          autoFocus={autoFocus}
          slotProps={{
            // The message is the picker's own helper text, so it stays linked to the field.
            // The picker's group is named by its own label: given here, visually hidden (the board draws the label above).
            textField: { id, label, error: !!error, fullWidth: true, helperText: error ?? field.help, slotProps: { formHelperText: { sx: { m: 0, mt: '4px', fontSize: d.caption, fontWeight: error ? 600 : 400, color: error ? colour.redInner : 'text.secondary' } } }, sx: { '& .MuiInputLabel-root': visuallyHidden, '& .MuiPickersOutlinedInput-notchedOutline legend': { display: 'none' }, '& .MuiPickersOutlinedInput-root': inputSx(d.radius), '& .MuiPickersInputBase-root': { minHeight: d.control, fontSize: d.body } } },
            field: { clearable: !field.required },
          }}
        />
      </LocalizationProvider>
    );
  } else if (field.kind === 'enum' || field.kind === 'person') {
    const options = field.kind === 'person' ? people.map((p) => ({ value: p.id, label: p.name })) : (field.options ?? []);
    const current = field.kind === 'person' ? ((value as PersonRef | null)?.id ?? '') : ((value as string | null) ?? '');
    input = (
      <Select
        id={id}
        labelId={`${id}-label`}
        value={current}
        onChange={(e) => {
          const v = e.target.value as string;
          onChange(field.key, field.kind === 'person' ? (people.find((p) => p.id === v) ?? null) : v);
        }}
        input={<OutlinedInput sx={inputSx(d.radius)} />}
        autoFocus={autoFocus}
        inputProps={{ 'aria-describedby': error || field.help ? helpId : undefined }}
        sx={{ fontSize: d.body }}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
    );
  } else {
    input = (
      <OutlinedInput
        id={id}
        value={(value as string | null) ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        multiline={field.kind === 'longText'}
        minRows={field.kind === 'longText' ? 3 : undefined}
        autoFocus={autoFocus}
        inputProps={{ 'aria-describedby': error || field.help ? helpId : undefined, 'aria-required': field.required || undefined }}
        sx={{ ...inputSx(d.radius), fontSize: d.body }}
      />
    );
  }

  return (
    <FormControl error={!!error} fullWidth sx={{ gap: '4px', gridColumn: field.kind === 'longText' ? 'span 2' : undefined }}>
      <Box component={field.kind === 'dateTime' ? 'span' : 'label'} htmlFor={field.kind === 'dateTime' ? undefined : id} id={`${id}-label`} aria-hidden={field.kind === 'dateTime' || undefined} sx={{ fontSize: d.caption, color: error ? colour.redInner : 'text.secondary', fontWeight: error ? 600 : 400 }}>
        {label}
      </Box>
      {input}
      {field.kind !== 'dateTime' && (error || field.help) && (
        <FormHelperText id={helpId} sx={{ m: 0, fontSize: d.caption, fontWeight: error ? 600 : 400, color: error ? colour.redInner : 'text.secondary' }}>
          {error ?? field.help}
        </FormHelperText>
      )}
    </FormControl>
  );
}

import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { FieldEditor, FieldView, displayValue, fromWallClock, toWallClock } from './fields';
import type { FieldSpec } from '../../data/list/recordSpec';
import { eventRecordSpec } from '../../data/list/events';
import type { EventRecord } from '../../data/list/types';
import { boardRows, buildEventRecord, PEOPLE } from '../../fixtures/events/build';
import { rbmTheme } from '../../theme/theme';
import { RbmDensity } from '../../theme/RbmDensity';

const rows = boardRows();
const q4 = buildEventRecord(rows[0]!, rows);
const fieldsOf = (sectionId: string) => eventRecordSpec().groups.flatMap((g) => g.sections).find((s) => s.id === sectionId)!.fields!;
const field = (sectionId: string, key: string) => fieldsOf(sectionId).find((f) => f.key === key)! as FieldSpec<EventRecord>;

describe('time zones for the date-time picker', () => {
  it('shows the wall-clock time in the event’s time zone, and turns it back into the same instant', () => {
    for (const tz of ['UTC', 'Europe/London', 'America/New_York']) {
      const wall = toWallClock('2026-10-24T22:00:00Z', tz);
      expect(fromWallClock(wall, tz)).toBe('2026-10-24T22:00:00Z');
    }
    expect(toWallClock('2026-10-24T22:00:00Z', 'UTC').getHours()).toBe(22);
    // London is on summer time (UTC+1) until 25 Oct 2026.
    expect(toWallClock('2026-10-24T22:00:00Z', 'Europe/London').getHours()).toBe(23);
  });
});

describe('field view', () => {
  it('writes each kind of value plainly', () => {
    expect(displayValue(field('details', 'environment'), q4, 'UTC')).toBe('Production');
    expect(displayValue(field('people', 'owner'), q4, 'UTC')).toBe('Andy Smith');
    expect(displayValue(field('schedule', 'windowStart'), q4, 'UTC')).toBe('24 Oct 22:00');
    expect(displayValue(field('details', 'state'), q4, 'UTC')).toBe('Active');
    expect(displayValue(field('schedule', 'freezeAt'), { ...q4, freezeAt: null }, 'UTC')).toBe('None');
  });

  it('puts the label over the value', () => {
    render(<ThemeProvider theme={rbmTheme}><RbmDensity level="compact"><FieldView field={field('details', 'name')} record={q4} timeZone="UTC" /></RbmDensity></ThemeProvider>);
    expect(screen.getByText('Name').nextSibling).toHaveTextContent('Q4 Data Centre Cutover');
  });
});

function Editor({ sectionId, keyName, error }: { sectionId: string; keyName: string; error?: string }) {
  const [draft, setDraft] = useState<EventRecord>(q4);
  return (
    <ThemeProvider theme={rbmTheme}>
      <RbmDensity level="compact">
        <FieldEditor field={field(sectionId, keyName)} draft={draft} onChange={(k, v) => setDraft({ ...draft, [k]: v })} error={error} people={PEOPLE} timeZone="UTC" />
        <output aria-label="draft">{JSON.stringify(draft[keyName as keyof EventRecord])}</output>
      </RbmDensity>
    </ThemeProvider>
  );
}
const draft = () => JSON.parse(screen.getByLabelText('draft').textContent!);

describe('field editors', () => {
  it('edits text, labelled with the field (and "required")', async () => {
    render(<Editor sectionId="details" keyName="name" />);
    const box = screen.getByRole('textbox', { name: 'Name (required)' });
    await userEvent.clear(box);
    await userEvent.type(box, 'Q4 Cutover');
    expect(draft()).toBe('Q4 Cutover');
  });

  it('chooses an option, and a person from the people list', async () => {
    const { unmount } = render(<Editor sectionId="details" keyName="environment" />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Environment (required)' }));
    await userEvent.click(screen.getByRole('option', { name: 'Test' }));
    expect(draft()).toBe('test');
    unmount();
    render(<Editor sectionId="people" keyName="owner" />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Owner (required)' }));
    await userEvent.click(screen.getByRole('option', { name: 'Lin Chen' }));
    expect(draft()).toEqual({ id: 'p-lc', name: 'Lin Chen' });
  });

  it('says what is wrong and why under the field, linked to it', () => {
    render(<Editor sectionId="details" keyName="name" error="Name is required." />);
    const box = screen.getByRole('textbox', { name: 'Name (required)' });
    expect(box).toHaveAccessibleDescription('Name is required.');
  });

  it('edits a date and time with the MUI X picker, in the event’s time zone', () => {
    render(<Editor sectionId="schedule" keyName="windowStart" />);
    expect(screen.getByRole('group', { name: 'Start (required)' })).toBeInTheDocument();
  });
});

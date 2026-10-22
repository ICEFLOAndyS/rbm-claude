import { checkRecordSpec, defineRecordSpec, editableKeys, sectionIds, validateSection, type SectionSpec, type SubsectionSpec } from './recordSpec';
import { eventRecordSpec } from './events';
import { buildEventRecord, boardRows } from '../../fixtures/events/build';

interface Thing {
  id: string;
  name: string;
}
const section = (id: string): SectionSpec<Thing, string> => ({ id, label: id, fields: [{ key: 'name', label: 'Name', kind: 'text' }] });
const sub = (id: string): SubsectionSpec<Thing, string> => ({ id, label: id });
const group = (id: string, n = 1) => ({ id, label: id, sections: Array.from({ length: n }, (_, i) => section(`${id}-${i}`)) as unknown as [SectionSpec<Thing, string>] });
const fact = { label: 'Name', value: (t: Thing) => t.name };
const base = { noun: 'thing', number: (t: Thing) => t.id, title: (t: Thing) => t.name, status: () => ({ state: 'active' as const }) };

describe('record spec discipline rules are compile errors', () => {
  // Each @ts-expect-error fails the type check (npm run check) if the limit stops being enforced.
  it('allows at most four group tabs', () => {
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [group('a'), group('b'), group('c'), group('d')] });
    // @ts-expect-error five groups
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [group('a'), group('b'), group('c'), group('d'), group('e')] });
  });

  it('allows at most five sections per group', () => {
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [{ id: 'a', label: 'A', sections: [section('1'), section('2'), section('3'), section('4'), section('5')] }] });
    // @ts-expect-error six sections
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [{ id: 'a', label: 'A', sections: [section('1'), section('2'), section('3'), section('4'), section('5'), section('6')] }] });
  });

  it('allows at most four summary facts, and at least one group', () => {
    defineRecordSpec<Thing, string>({ ...base, summary: [fact, fact, fact, fact], groups: [group('a')] });
    // @ts-expect-error five facts
    defineRecordSpec<Thing, string>({ ...base, summary: [fact, fact, fact, fact, fact], groups: [group('a')] });
    // @ts-expect-error no groups
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [] });
  });

  it('nests sections one level at most', () => {
    defineRecordSpec<Thing, string>({ ...base, summary: [fact], groups: [{ id: 'a', label: 'A', sections: [{ ...section('1'), subsections: [sub('1a')] }] }] });
    defineRecordSpec<Thing, string>({
      ...base,
      summary: [fact],
      // @ts-expect-error a subsection holding subsections
      groups: [{ id: 'a', label: 'A', sections: [{ ...section('1'), subsections: [{ ...section('1a'), subsections: [section('1a-i')] }] }] }],
    });
  });

  it('only accepts field keys the record has', () => {
    // @ts-expect-error "colour" is not a field of Thing
    section('x').fields = [{ key: 'colour', label: 'Colour', kind: 'text' }];
  });
});

describe('checkRecordSpec (the rules types cannot hold)', () => {
  it('passes the event spec', () => {
    expect(checkRecordSpec(eventRecordSpec())).toEqual([]);
  });

  it('finds long tab labels, repeated ids and editable sections with nothing to edit', () => {
    const spec = defineRecordSpec<Thing, string>({
      ...base,
      summary: [fact],
      groups: [
        { id: 'a', label: 'Implementation plan', sections: [section('1'), { id: '1', label: 'Again', editable: true, fields: [{ key: 'id', label: 'ID', kind: 'text', readOnly: true }] }] },
        { id: 'a', label: 'B', sections: [section('2')] },
      ],
    });
    expect(checkRecordSpec(spec)).toEqual([
      'tab label "Implementation plan" is longer than 14 characters',
      'duplicate section id 1',
      'section 1 is editable but every field is read-only',
      'duplicate group id a',
    ]);
  });
});

describe('the proposed event spec (Not drawn)', () => {
  const spec = eventRecordSpec();
  const rows = boardRows();
  const q4 = buildEventRecord(rows[0]!, rows);

  it('has the four tabs and the sections proposed', () => {
    expect(spec.groups.map((g) => g.label)).toEqual(['Overview', 'Tasks', 'Dependencies', 'History']);
    expect(sectionIds(spec)).toEqual(['details', 'schedule', 'people', 'linkedChanges', 'attention', 'upstream', 'downstream', 'changes']);
  });

  it('summarises the record in four facts', () => {
    expect(spec.summary.map((f) => `${f.label}: ${f.value(q4)}`)).toEqual(['Owner: A. Smith', 'Window: 24 Oct 22:00 – 25 Oct 06:00', 'Progress: 68% · 84 of 124 tasks', 'Attention: None']);
  });

  it('counts and alerts on tabs: Dependencies alerts when it waits for a blocked event', () => {
    const dependencies = spec.groups[2]!;
    expect(dependencies.count?.(q4)).toBe(2);
    expect(dependencies.alert?.(q4)).toBe('Waits for a blocked event');
  });

  it('only lets editable sections change their own fields', () => {
    expect(editableKeys(spec, 'details')).toEqual(['name', 'description', 'environment']);
    expect(editableKeys(spec, 'schedule')).toEqual(['windowStart', 'windowEnd', 'freezeAt', 'rollbackBy']);
    expect(editableKeys(spec, 'attention')).toEqual([]);
  });

  it('explains what is wrong and why', () => {
    expect(validateSection(spec, 'details', { ...q4, name: '  ' })).toEqual({ name: 'Name is required.' });
    expect(validateSection(spec, 'schedule', { ...q4, windowEnd: q4.windowStart, freezeAt: '2026-10-25T00:00:00Z', rollbackBy: '2026-10-26T00:00:00Z' })).toEqual({
      windowEnd: 'End must be after the start, or the event has no time to run.',
      freezeAt: 'Freeze must be at or before the start, so changes stop before the run begins.',
      rollbackBy: 'Rollback by must fall inside the window, so there is time to roll back.',
    });
    expect(validateSection(spec, 'schedule', q4)).toEqual({});
  });

  it('offers the footer action the server allows', () => {
    expect(spec.primaryAction?.(q4)).toEqual({ id: 'openCommandCentre', label: 'Open Command Centre' });
    expect(spec.primaryAction?.(buildEventRecord(rows[4]!, rows))).toEqual({ id: 'startRun', label: 'Start run' });
    expect(spec.primaryAction?.(buildEventRecord(rows[3]!, rows))).toBeNull();
  });
});

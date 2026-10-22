/**
 * The record spec (Pattern: List to record, "Discipline rules"). Developers declare one; `RbmRecord`
 * draws it in the slide-in or the wide panel. The limits are in the types, so breaking one is a
 * compile error:
 * - at most four group tabs;
 * - at most five sections per group;
 * - at most four summary facts;
 * - sections nest one level at most.
 * Rules the type system cannot hold (tab labels about 14 characters, unique ids) are checked by
 * `checkRecordSpec`, which the tests run on every spec.
 */
import type { RbmState } from '../../theme/tokens';

type One<T> = readonly [T];
export type AtMost4<T> = One<T> | readonly [T, T] | readonly [T, T, T] | readonly [T, T, T, T];
export type AtMost5<T> = AtMost4<T> | readonly [T, T, T, T, T];

/** How a value is shown, and edited when its section is. */
export type FieldKind = 'text' | 'longText' | 'enum' | 'person' | 'dateTime' | 'number' | 'percent' | 'status' | 'recordNumber';

export interface FieldSpec<R> {
  key: keyof R & string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  /** Shown in view and edit, never changed here (for example the record's number). */
  readOnly?: boolean;
  /** The text shown in view mode, when the raw value is not plain text (for example a person or a date). */
  format?: (record: R) => string;
  /** For `enum`. */
  options?: readonly { value: string; label: string }[];
  /** One line under the field, in view and edit. */
  help?: string;
}

/** A read-only table inside a section (the wide panel's Dependencies and Assignments). */
/** A table column. Objects show their name (a person) or number and name (a record). */
export interface TableColumnSpec {
  key: string;
  label: string;
  kind: FieldKind;
  /** Words for `enum` and `status` values. */
  labels?: Record<string, string>;
  /** For `status`: the semantic state each value is drawn as (dot and label). */
  states?: Record<string, RbmState>;
}

export interface TableSpec<R> {
  key: keyof R & string;
  columns: readonly TableColumnSpec[];
  /** Shown when the table has no rows. */
  empty: string;
}

interface SectionBase<R, S extends string> {
  id: S;
  label: string;
  fields?: readonly FieldSpec<R>[];
  table?: TableSpec<R>;
  /** Draws the record's History (the audit trail) instead of fields. */
  history?: boolean;
  /** Gives the section its own Edit. Leave out for derived sections (no Edit and no lock). */
  editable?: boolean;
  /**
   * Checks the draft as the user types: field key to a message saying what is wrong and why.
   * Save stays disabled while any message is present.
   */
  validate?: (draft: R) => Partial<Record<keyof R & string, string>>;
  /** The note beside the section title, such as "1 blocked" or "3 people". */
  note?: (record: R) => string | null;
}

/** A section inside a section. It cannot hold sections itself. */
export interface SubsectionSpec<R, S extends string> extends SectionBase<R, S> {
  subsections?: never;
}

export interface SectionSpec<R, S extends string> extends SectionBase<R, S> {
  subsections?: AtMost5<SubsectionSpec<R, S>>;
}

export interface GroupSpec<R, S extends string> {
  id: string;
  /** About 14 characters at most. */
  label: string;
  /** The number on the tab. */
  count?: (record: R) => number;
  /** Why the tab has an alert dot, or null. The text is the dot's accessible name. */
  alert?: (record: R) => string | null;
  sections: AtMost5<SectionSpec<R, S>>;
}

export interface SummaryFact<R> {
  label: string;
  value: (record: R) => string;
}

export interface RecordSpec<R, S extends string> {
  /** "event": used in messages such as "Discard unsaved changes to this event?". */
  noun: string;
  number: (record: R) => string;
  title: (record: R) => string;
  status: (record: R) => { state: RbmState; label?: string };
  summary: AtMost4<SummaryFact<R>>;
  groups: AtMost4<GroupSpec<R, S>>;
  /** The footer's primary action, when the server allows one. */
  primaryAction?: (record: R) => { id: string; label: string } | null;
}

/** Declares a spec. An identity function, so the limits apply where the spec is written. */
export function defineRecordSpec<R, S extends string>(spec: RecordSpec<R, S>): RecordSpec<R, S> {
  return spec;
}

export const TAB_LABEL_MAX = 14;

/** The rules the types cannot hold. Returns the problems found; an empty list means the spec is sound. */
export function checkRecordSpec<R, S extends string>(spec: RecordSpec<R, S>): string[] {
  const problems: string[] = [];
  const groupIds = new Set<string>();
  const sectionIds = new Set<string>();
  for (const g of spec.groups) {
    if (groupIds.has(g.id)) problems.push(`duplicate group id ${g.id}`);
    groupIds.add(g.id);
    if (g.label.length > TAB_LABEL_MAX) problems.push(`tab label "${g.label}" is longer than ${TAB_LABEL_MAX} characters`);
    const sections = g.sections.flatMap((s) => [s, ...(s.subsections ?? [])]);
    for (const s of sections) {
      if (sectionIds.has(s.id)) problems.push(`duplicate section id ${s.id}`);
      sectionIds.add(s.id);
      if (s.editable && !s.fields?.some((f) => !f.readOnly)) problems.push(`section ${s.id} is editable but every field is read-only`);
    }
  }
  return problems;
}

/** Every section id in the spec, in order, including subsections. */
export function sectionIds<R, S extends string>(spec: RecordSpec<R, S>): S[] {
  return spec.groups.flatMap((g) => g.sections.flatMap((s) => [s.id, ...(s.subsections ?? []).map((x) => x.id)]));
}

/** Finds a section by id, at either level. */
export function findSection<R, S extends string>(spec: RecordSpec<R, S>, id: string): SectionSpec<R, S> | SubsectionSpec<R, S> | undefined {
  for (const g of spec.groups) for (const s of g.sections) for (const x of [s, ...(s.subsections ?? [])]) if (x.id === id) return x;
  return undefined;
}

/**
 * Checks a section's draft: required fields, then the section's own rules. The panel runs it as the
 * user types (Save stays disabled until it is empty); the server runs it again on save.
 */
export function validateSection<R, S extends string>(spec: RecordSpec<R, S>, sectionId: string, draft: R): Record<string, string> {
  const section = findSection(spec, sectionId);
  if (!section) return {};
  const errors: Record<string, string> = {};
  for (const f of section.fields ?? []) {
    const v = draft[f.key];
    if (f.required && !f.readOnly && (v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) errors[f.key] = `${f.label} is required.`;
  }
  for (const [k, message] of Object.entries(section.validate?.(draft) ?? {})) if (message && !errors[k]) errors[k] = message as string;
  return errors;
}

/** The keys a section may change. */
export function editableKeys<R, S extends string>(spec: RecordSpec<R, S>, sectionId: string): (keyof R & string)[] {
  const section = findSection(spec, sectionId);
  return section?.editable ? (section.fields ?? []).filter((f) => !f.readOnly).map((f) => f.key) : [];
}

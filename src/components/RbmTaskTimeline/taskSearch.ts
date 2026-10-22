import type { RbmTimelineTask } from './focusRule';

/** A field the Task Timeline search looks in. Add more (description, record number, assignee) here. */
export interface RbmSearchField {
  key: string;
  /** Shown beside a suggestion that matched on this field, when it is not the title. */
  label: string;
  get: (task: RbmTimelineTask) => string | undefined;
}

/** The fields searched today: the task title (the ServiceNow short description) only. */
export const DEFAULT_SEARCH_FIELDS: RbmSearchField[] = [{ key: 'title', label: 'Title', get: (t) => t.title }];

/** The words of a search, lower case. Empty when there is nothing to search for. */
export const searchWords = (query: string) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);

/**
 * True when every word appears in at least one field, in any order and ignoring case:
 * "test refresh" finds "Refresh test data".
 */
export function matchesSearch(task: RbmTimelineTask, words: string[], fields: RbmSearchField[] = DEFAULT_SEARCH_FIELDS) {
  if (words.length === 0) return true;
  const values = fields.map((f) => f.get(task)?.toLowerCase() ?? '');
  return words.every((w) => values.some((v) => v.includes(w)));
}

/** The field a match was found in first, for the suggestion list. */
export function matchedField(task: RbmTimelineTask, words: string[], fields: RbmSearchField[] = DEFAULT_SEARCH_FIELDS) {
  return fields.find((f) => words.some((w) => f.get(task)?.toLowerCase().includes(w)));
}

/** Splits text into plain and matching parts, so the matching words can be shown in bold. */
export function highlight(text: string, words: string[]): { text: string; match: boolean }[] {
  if (words.length === 0) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);
  for (const w of words) {
    for (let i = lower.indexOf(w); i >= 0; i = lower.indexOf(w, i + 1)) marks.fill(true, i, i + w.length);
  }
  const parts: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marks[i]) last.text += text[i];
    else parts.push({ text: text[i]!, match: marks[i]! });
  }
  return parts;
}

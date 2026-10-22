import { highlight, matchedField, matchesSearch, searchWords, type RbmSearchField } from './taskSearch';
import type { RbmTimelineTask } from './focusRule';

const task = (title: string, over: Partial<RbmTimelineTask> = {}) => ({ id: 't', wbs: '1.3.9', title, kind: 'task', state: 'pending', start: new Date(), startIsActual: false, plannedMinutes: 10, runbookId: 'rb', stageId: 'st', ...over }) as RbmTimelineTask;

describe('task search', () => {
  it('splits the search into lower-case words', () => {
    expect(searchWords('  Refresh   TEST ')).toEqual(['refresh', 'test']);
    expect(searchWords('   ')).toEqual([]);
  });

  it('matches every word, in any order, ignoring case', () => {
    const t = task('Refresh test data');
    expect(matchesSearch(t, searchWords('data refresh'))).toBe(true);
    expect(matchesSearch(t, searchWords('REFR'))).toBe(true);
    expect(matchesSearch(t, searchWords('refresh reports'))).toBe(false);
    expect(matchesSearch(t, [])).toBe(true);
  });

  it('searches the title only by default, and any fields it is given', () => {
    const t = task('Refresh test data');
    expect(matchesSearch(t, searchWords('1.3.9'))).toBe(false);
    const fields: RbmSearchField[] = [{ key: 'title', label: 'Title', get: (x) => x.title }, { key: 'wbs', label: 'WBS', get: (x) => x.wbs }];
    expect(matchesSearch(t, searchWords('1.3.9'), fields)).toBe(true);
    // Words can be found in different fields.
    expect(matchesSearch(t, searchWords('refresh 1.3'), fields)).toBe(true);
    expect(matchedField(t, searchWords('1.3.9'), fields)?.key).toBe('wbs');
  });

  it('marks the matching parts of the text', () => {
    expect(highlight('Refresh test data', ['test', 'ref'])).toEqual([
      { text: 'Ref', match: true },
      { text: 'resh ', match: false },
      { text: 'test', match: true },
      { text: ' data', match: false },
    ]);
    expect(highlight('Plain', [])).toEqual([{ text: 'Plain', match: false }]);
  });
});

/** Text formats shared by every list: the grid's cells and the record panel. */
import type { PersonRef } from './types';

/** "A. Smith", as the grid shows people. */
export function shortName(person: PersonRef): string {
  const words = person.name.trim().split(/\s+/);
  return words.length < 2 ? person.name : `${words[0]![0]}. ${words.slice(1).join(' ')}`;
}

const dateFormat = (timeZone: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone });
const timeFormat = (timeZone: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
/** "24 Oct", as the grid's Window column shows a date. Months are always three letters (en-GB writes "Sept"). */
export const formatDay = (iso: string, timeZone = 'UTC') => dateFormat(timeZone).format(new Date(iso)).replace('Sept', 'Sep');
/** "24 Oct 22:00". */
export const formatWhen = (iso: string, timeZone = 'UTC') => `${formatDay(iso, timeZone)} ${timeFormat(timeZone).format(new Date(iso))}`;
/** "24 Oct 22:00 – 25 Oct 06:00". */
export const formatWindow = (start: string, end: string, timeZone = 'UTC') => `${formatWhen(start, timeZone)} – ${formatWhen(end, timeZone)}`;

# Workstream progress and Runbook progress: the comparison

Prepared 27 Oct 2026 by Claude Code, as asked in `docs/briefs/runbook-progress-brief.md` section 3. Both cards were built as independent components (`RbmWorkstreamProgress` and `RbmRunbookProgress`) so this comparison measures what really is the same. Andy Smith decides whether a generic component follows.

## The numbers

| File | Lines | Lines that differ | What differs |
|---|---|---|---|
| Component | 410 | 30 | Names, words, and three column widths |
| Tests | 219 | 58 | Names and sample runbook names only. The 37 tests are the same tests |
| Stories | 45 | 17 | Names and sample runbook names only. The 15 stories are the same stories |

## Identical
- **The data shape.** `RbmWorkstreamProgressItem` and `RbmRunbookProgressItem` have the same fields and types: id, name, owner, start, end, state, complete, total, issues and late.
- **Every rule:** the percentage and its rounding, the order by start (ties by name), the ten-row limit, Blue Dark until Complete, Brand Green on Complete only, the Icon suite state with Late beside it, issue dots, zero counts in grey, the accessible name, loading and empty.
- **Every style:** the card, the two-level header, the bar, the status, the counts, the density tiers (D0 Essential only, D1 and D2 all, D3 one line), and all the drawn sizes except the name column.
- **Shared code already used by both:** `suiteStates` (the Icon suite states' labels and colours), `RbmIcon`, `RbmAvatar` and the density tokens.

## Different
| | Workstream progress | Runbook progress |
|---|---|---|
| Title | Workstream progress | Runbook progress |
| Name column heading | Workstream (D1: Workstream and owner) | Runbook (D1: Runbook and owner) |
| Name column width, D1 / D2 / D3 | 180 / 170 / 150 px | 230 / 190 / 190 px |
| D0 name column | 280 px | 280 px (the same) |
| "More" line | +n more workstreams | +n more runbooks |
| Empty | No workstreams yet. | No runbooks yet. |
| Loading | Loading workstreams | Loading runbooks |
| Scope | All workstreams (scope not decided) | The selected Event's runbooks only (decided) |

The scope difference is in the caller's data, not in the card.

## What a generic `RbmExecProgress` would need (placeholder name)
```ts
type RbmExecProgressItem = {
  id: string; name: string; owner: { name: string; initials: string };
  start: Date; end: Date; state: RbmSuiteState;
  complete: number; total: number;
  issues: { high: number; medium: number; low: number };
  late: boolean;
};
type RbmExecProgressProps = {
  items: RbmExecProgressItem[];
  title: string;                       // "Workstream progress"
  noun: { one: string; many: string }; // { one: 'workstream', many: 'workstreams' }: heading, "+n more", empty, loading
  nameWidth?: Partial<Record<'comfortable' | 'compact' | 'dense', number>>; // 180/170/150 or 230/190/190
  loading?: boolean;
  timeZone?: string;
};
```
`RbmWorkstreamProgress` and `RbmRunbookProgress` would become thin versions that pass in the title, noun and name widths. The capitalised heading ("Workstream", "Runbook") comes from the noun.

## Recommendation
Make the generic component. Nothing differs except words and one width. Keeping two copies means each rule change (for example the open points on Late, ties, or D0 and D3) has to be made twice and could drift apart. If a runbook later gains a field the workstream lacks (the current stage is the likely one, brief open point 3), it can be an optional extra column on the generic component.

**Decided and built (Andy Smith, 27 Oct 2026):** `RbmExecProgress` is the shared card, with `title`, `noun` and `nameWidth` passed in (the D0 name column is always 280 px). `RbmWorkstreamProgress` and `RbmRunbookProgress` are now thin versions of it, with the same props and exports as before, and their tests and stories are unchanged.

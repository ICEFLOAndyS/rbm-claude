import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { RbmPageHeader, type RbmCrumbs } from '../RbmPageHeader/RbmPageHeader';
import { RbmCheckbox } from '../RbmCheckbox/RbmCheckbox';
import { useDensity } from '../../theme/RbmDensity';
import { colour, radius, shellSize, stroke } from '../../theme/tokens';
import { SCENARIOS, SCENARIO_LABELS, inOrder, scenarioSettingsErrors, type RbmScenario, type RbmScenarioSettings } from '../../data/scenarios/scenarios';

/**
 * Admin Centre › Scenarios (App shell board, "Who sets what"; app shell brief 4b). Proposed by design, not
 * approved yet. RBM Admins choose which scenarios people can use (Available or Locked) and which are on by
 * default (On or Off). Every state is a word beside its box: no colour carries meaning.
 *
 * A locked row's "On by default" is a faded, disabled box saying Off. Locking a scenario turns its default off.
 * Save changes is refused while a limit is broken, and the reason is shown.
 *
 * Not drawn (proposed, flagged): the error and saved messages, and that Save changes and Cancel are disabled when
 * nothing has changed.
 */

export interface RbmScenarioSettingsProps {
  /** The saved settings. */
  settings: RbmScenarioSettings;
  onSave: (settings: RbmScenarioSettings) => void | Promise<void>;
  breadcrumb?: RbmCrumbs;
}

const same = (a: RbmScenarioSettings, b: RbmScenarioSettings) => a.available.join() === b.available.join() && a.defaults.join() === b.defaults.join();
const cols = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 150px 150px', gap: 4, alignItems: 'center', px: 5 } as const;

export function RbmScenarioSettings({ settings, onSave, breadcrumb = [] }: RbmScenarioSettingsProps) {
  const d = useDensity();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  const errors = scenarioSettingsErrors(draft);
  const changed = !same(draft, settings);

  const change = (next: RbmScenarioSettings) => {
    setSaved(false);
    setDraft({ available: inOrder(next.available), defaults: inOrder(next.defaults) });
  };
  const toggleAvailable = (s: RbmScenario) =>
    draft.available.includes(s)
      ? change({ available: draft.available.filter((x) => x !== s), defaults: draft.defaults.filter((x) => x !== s) })
      : change({ ...draft, available: [...draft.available, s] });
  const toggleDefault = (s: RbmScenario) => change({ ...draft, defaults: draft.defaults.includes(s) ? draft.defaults.filter((x) => x !== s) : [...draft.defaults, s] });

  return (
    <Box component="main" sx={{ p: `${shellSize[d.level].pagePadding}px`, display: 'flex', flexDirection: 'column', gap: 4, minHeight: '100%', boxSizing: 'border-box', bgcolor: colour.mist }}>
      <RbmPageHeader title="Scenarios" breadcrumb={breadcrumb} />
      <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: 1.5, color: colour.slate, maxWidth: 620 }}>
        Choose which scenarios people in your organisation can use, and which are on by default. Locked scenarios do not appear in anyone's profile.
      </Box>
      <Box sx={{ maxWidth: 760, overflowX: 'auto' }}>
        <Box role="table" aria-label="Scenarios" sx={{ minWidth: 480, border: `${stroke.thin}px solid ${colour.rule}`, borderRadius: `${radius.card}px`, bgcolor: colour.white, overflow: 'hidden' }}>
          <Box role="row" sx={{ ...cols, height: 40, bgcolor: colour.mist, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.slate }}>
            <span role="columnheader">Scenario</span>
            <span role="columnheader">Available</span>
            <span role="columnheader">On by default</span>
          </Box>
          {SCENARIOS.map((s) => {
            const available = draft.available.includes(s);
            const on = available && draft.defaults.includes(s);
            const name = SCENARIO_LABELS[s];
            return (
              <Box role="row" key={s} sx={{ ...cols, height: 52, borderTop: `${stroke.thin}px solid ${colour.rule}`, fontSize: 14 }}>
                <Box role="rowheader" component="span" sx={{ fontWeight: 700 }}>
                  {name}
                </Box>
                <Box role="cell" component="label" sx={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <RbmCheckbox checked={available} onChange={() => toggleAvailable(s)} slotProps={{ input: { 'aria-label': `${name}: available` } }} />
                  {available ? 'Available' : 'Locked'}
                </Box>
                <Box role="cell" component="label" sx={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: available ? 'pointer' : 'default' }}>
                  <RbmCheckbox checked={on} disabled={!available} onChange={() => toggleDefault(s)} slotProps={{ input: { 'aria-label': `${name}: on by default` } }} />
                  <Box component="span" sx={{ color: available ? colour.ink : colour.slate }}>
                    {on ? 'On' : 'Off'}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box sx={{ fontSize: 13, color: colour.slate, maxWidth: 760 }}>At least one scenario must be available, and at least one on by default. A scenario that is on by default must be available.</Box>
      {errors.length > 0 && (
        <Box role="alert" sx={{ fontSize: 13, fontWeight: 600, color: colour.redInner, maxWidth: 760 }}>
          {errors.join(' ')}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center', maxWidth: 760 }}>
        <Box role="status" sx={{ mr: 'auto', fontSize: 13, color: colour.slate }}>
          {saved ? 'Saved.' : ''}
        </Box>
        <Button variant="outlined" color="primary" disabled={!changed} onClick={() => change(settings)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={!changed || errors.length > 0}
          onClick={async () => {
            await onSave(draft);
            setSaved(true);
          }}
        >
          Save changes
        </Button>
      </Box>
    </Box>
  );
}

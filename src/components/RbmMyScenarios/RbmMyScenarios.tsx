import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { RbmCheckbox } from '../RbmCheckbox/RbmCheckbox';
import { SCENARIO_LABELS, inOrder, profileScenarios, type RbmScenario, type RbmScenarioSettings } from '../../data/scenarios/scenarios';
import { colour, stroke } from '../../theme/tokens';

/**
 * Profile › My scenarios (App shell board, "Who sets what"; app shell brief 4b). Proposed by design, not approved
 * yet. The user chooses the scenarios they work in, from the ones the organisation makes available. Until they
 * do, they use the organisation's default, and the panel says so.
 *
 *   Save                            keeps the boxes as the user's own choice
 *   Reset to organisation default   forgets the user's choice
 *
 * Not drawn (proposed, flagged): where the panel opens (the shell's slide-in region), the line once the user has
 * chosen ("Using your own choice."), and that the last box ticked cannot be cleared.
 */

export interface RbmMyScenariosProps {
  settings: RbmScenarioSettings;
  /** The user's saved choice; undefined until they choose. */
  own: readonly RbmScenario[] | undefined;
  /** Undefined resets to the organisation's default. */
  onSave: (own: RbmScenario[] | undefined) => void | Promise<void>;
  /** The heading's id, so the panel around it can be named by it. */
  headingId?: string;
}

export function RbmMyScenarios({ settings, own, onSave, headingId }: RbmMyScenariosProps) {
  const current = profileScenarios(settings, own);
  const [draft, setDraft] = useState(current);
  const key = current.join();
  // A new saved choice (or new settings) replaces the boxes.
  useEffect(() => setDraft(profileScenarios(settings, own)), [settings, own]);
  const options = inOrder(settings.available);
  const usingDefault = own === undefined || inOrder(own.filter((s) => options.includes(s))).length === 0;
  const changed = draft.join() !== key;
  const toggle = (s: RbmScenario) => setDraft(inOrder(draft.includes(s) ? draft.filter((x) => x !== s) : [...draft, s]));
  const n = options.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 6 }}>
      <Box component="h2" id={headingId} sx={{ m: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: colour.ink }}>
        My scenarios
      </Box>
      <Box component="p" sx={{ m: 0, fontSize: 14, lineHeight: 1.5, color: colour.slate }}>
        Choose the scenarios you work in. Your administrator has made {n === 1 ? 'one' : n} available.
      </Box>
      <Box role="group" aria-label="My scenarios" sx={{ display: 'flex', flexDirection: 'column' }}>
        {options.map((s) => {
          const on = draft.includes(s);
          const last = on && draft.length === 1;
          return (
            <Box key={s} component="label" sx={{ display: 'flex', alignItems: 'center', gap: 3, height: 48, borderTop: `${stroke.thin}px solid ${colour.rule}`, fontSize: 14, fontWeight: on ? 600 : 500, color: colour.ink, cursor: last ? 'default' : 'pointer' }}>
              <RbmCheckbox checked={on} disabled={last} onChange={() => toggle(s)} sx={{ '&.Mui-disabled': { opacity: 1 } }} />
              <span>{SCENARIO_LABELS[s]}</span>
            </Box>
          );
        })}
      </Box>
      <Box role="status" sx={{ fontSize: 13, color: colour.slate }}>
        {usingDefault ? "Using your organisation's default." : 'Using your own choice.'}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outlined" color="primary" disabled={usingDefault} onClick={() => void onSave(undefined)}>
          Reset to organisation default
        </Button>
        <Button variant="contained" color="secondary" disabled={!changed} onClick={() => void onSave(draft)}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

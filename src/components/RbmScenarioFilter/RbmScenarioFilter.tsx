import { useId, useState } from 'react';
import { Box, ButtonBase, Popover } from '@mui/material';
import { RbmCheckbox } from '../RbmCheckbox/RbmCheckbox';
import { SCENARIO_LABELS, inOrder, scenarioSummary, type RbmScenario } from '../../data/scenarios/scenarios';
import { colour, radius, stroke } from '../../theme/tokens';

/**
 * The scenario control (App shell board, "Scenario"; app shell brief 4b). Proposed by design, not approved yet.
 *
 * First in the page header's context row: "SCENARIO Planned Change ⌄". A quick filter over the scenarios the
 * organisation makes available. It starts from the user's profile and never changes it.
 *
 *   one shown      the name
 *   several        "2 scenarios" (a count, never colour; the names are in the menu)
 *   all            "All available"
 *
 * The button (`aria-expanded`) opens a group of checkboxes labelled "Scenarios": the available scenarios, the
 * ones in the user's profile marked "In your profile", then "1 of 2 shown" (announced), Show all and My profile.
 * Space toggles a box; Escape closes and returns focus to the button.
 *
 * Not drawn (proposed, flagged): the last box shown cannot be cleared, so something is always shown; "My profile"
 * puts the filter back to the profile's scenarios.
 */

export interface RbmScenarioFilterProps {
  /** Unlocked by an RBM Admin. */
  available: readonly RbmScenario[];
  /** The user's own scenarios (their choice, or the organisation's default). */
  profile: readonly RbmScenario[];
  /** The scenarios on show now. */
  value: readonly RbmScenario[];
  onChange: (shown: RbmScenario[]) => void;
}

const eyebrow = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.slate } as const;
const textButton = {
  fontSize: 13,
  fontWeight: 700,
  color: colour.deepBlue,
  borderRadius: '6px',
  px: 1,
  mx: -1,
  minHeight: 32,
  '&:hover': { textDecoration: 'underline' },
  '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 },
} as const;

export function RbmScenarioFilter({ available, profile, value, onChange }: RbmScenarioFilterProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = anchor !== null;
  const popId = useId();
  const options = inOrder(available);
  const shown = inOrder(value.filter((s) => options.includes(s)));
  const summary = scenarioSummary(shown, options);
  const set = (next: RbmScenario[]) => onChange(inOrder(next));
  const toggle = (s: RbmScenario) => set(shown.includes(s) ? shown.filter((x) => x !== s) : [...shown, s]);
  const mine = inOrder(profile.filter((s) => options.includes(s)));

  return (
    <>
      <ButtonBase
        aria-label={`Scenario: ${summary}. Change scenarios shown`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          fontSize: 13,
          borderRadius: '8px',
          p: '6px 8px',
          m: '-6px -8px',
          bgcolor: open ? colour.rule : 'transparent',
          '&:hover': { bgcolor: colour.rule },
          '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 0 },
        }}
      >
        <Box component="span" sx={eyebrow}>
          Scenario
        </Box>
        <Box component="strong" sx={{ color: colour.deepBlue }}>
          {summary}
        </Box>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colour.slate} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </ButtonBase>
      <Popover
        id={popId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: { mt: '6px', width: 280, border: `${stroke.thin}px solid ${colour.silver}`, borderRadius: `${radius.card}px`, boxShadow: '0 8px 24px rgba(31,36,48,0.18)', overflow: 'hidden' },
          },
        }}
      >
        <Box role="group" aria-label="Scenarios">
          <Box aria-hidden sx={{ ...eyebrow, p: '14px 16px 6px' }}>
            Show scenarios
          </Box>
          {options.map((s, i) => {
            const on = shown.includes(s);
            const last = on && shown.length === 1;
            return (
              <Box
                key={s}
                component="label"
                sx={{ display: 'flex', alignItems: 'center', gap: 3, height: 44, px: 4, fontSize: 14, fontWeight: on ? 600 : 500, color: colour.ink, cursor: last ? 'default' : 'pointer' }}
              >
                <RbmCheckbox
                  checked={on}
                  disabled={last}
                  // The board draws the box solid: the rule keeps it ticked without fading it.
                  sx={{ '&.Mui-disabled': { opacity: 1 } }}
                  onChange={() => toggle(s)}
                  autoFocus={i === 0}
                  slotProps={{ input: { 'aria-describedby': mine.includes(s) ? `${popId}-mine` : undefined } }}
                />
                <span>{SCENARIO_LABELS[s]}</span>
                {mine.includes(s) && (
                  <Box component="span" sx={{ ml: 'auto', fontSize: 12, fontWeight: 400, color: colour.slate }}>
                    In your profile
                  </Box>
                )}
              </Box>
            );
          })}
          <Box component="span" id={`${popId}-mine`} hidden>
            In your profile
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, height: 44, px: 4, borderTop: `${stroke.thin}px solid ${colour.rule}`, fontSize: 13 }}>
            <Box component="span" role="status" sx={{ color: colour.slate }}>
              {shown.length} of {options.length} shown
            </Box>
            <ButtonBase onClick={() => set(options)} sx={{ ...textButton, ml: 'auto' }}>
              Show all
            </ButtonBase>
            <ButtonBase onClick={() => set(mine)} sx={textButton}>
              My profile
            </ButtonBase>
          </Box>
        </Box>
      </Popover>
    </>
  );
}

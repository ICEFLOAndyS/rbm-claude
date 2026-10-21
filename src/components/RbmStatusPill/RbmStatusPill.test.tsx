import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { RbmStatusPill } from './RbmStatusPill';
import { rbmTheme } from '../../theme/theme';
import type { RbmState } from '../../theme/tokens';

const states: RbmState[] = ['complete', 'active', 'atRisk', 'paused', 'blocked', 'pending'];

describe('RbmStatusPill', () => {
  it.each(states)('always shows a text label for %s', (state) => {
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmStatusPill state={state} />
      </ThemeProvider>,
    );
    // Colour is never the only signal: every state has visible text.
    expect(screen.getByText(/\S/)).toBeInTheDocument();
  });

  it('uses the given label instead of the default', () => {
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmStatusPill state="active" label="Event live" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Event live')).toBeInTheDocument();
  });
});

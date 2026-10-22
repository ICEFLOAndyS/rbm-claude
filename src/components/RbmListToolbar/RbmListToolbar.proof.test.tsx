import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material';
import { composeStories } from '@storybook/react-vite';
import * as stories from './RbmListToolbar.stories';
import { rbmTheme } from '../../theme/theme';

const { ProofWithGrid } = composeStories(stories);
const count = () => Number(screen.getByText(/events \(story readout/).textContent!.split(' ')[0]);

describe('RbmListToolbar driving the grid through the mock server (the proof story)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('opens on the Active view, and search and filters narrow the list on the server', async () => {
    render(<ThemeProvider theme={rbmTheme}><ProofWithGrid /></ThemeProvider>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'View: Active' })).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(count()).toBeGreaterThan(0));
    const active = count();

    // Pasted, not typed: each key would be its own server query (as the Task Timeline's search tests do).
    await userEvent.click(screen.getByRole('searchbox', { name: 'Search events' }));
    await userEvent.paste('payroll');
    await waitFor(() => expect(count()).toBeLessThan(active));
    expect(screen.getByRole('button', { name: 'View: Active (changed)' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(count()).toBe(active));
    await userEvent.click(screen.getByRole('button', { name: 'Environment' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Filter by environment' })).getByRole('checkbox', { name: 'Production' }));
    await waitFor(() => expect(count()).toBeLessThan(active));
  });
});

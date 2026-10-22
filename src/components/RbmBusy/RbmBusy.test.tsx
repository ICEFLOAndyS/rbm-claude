import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Box, ThemeProvider } from '@mui/material';
import { useState } from 'react';
import { RbmBusyOverlay, useRbmBusy, type RbmBusyOptions, type RbmBusyRequest } from './RbmBusy';
import { rbmTheme } from '../../theme/theme';

/** A region with a button that starts a request, and the result it shows. */
function Harness({ request, options = { delayMs: 0, minVisibleMs: 0 } }: { request: (setDone: (v: string) => void) => Omit<RbmBusyRequest, 'apply'> & { apply?: () => void }; options?: RbmBusyOptions }) {
  const busy = useRbmBusy(options);
  const [done, setDone] = useState('not yet');
  return (
    <Box sx={{ position: 'relative' }}>
      <RbmBusyOverlay busy={busy} />
      <button onClick={() => { const r = request(setDone); busy.run({ apply: () => setDone('applied'), ...r }); }}>Go</button>
      <div data-testid="content" {...busy.contentProps}>{done}</div>
    </Box>
  );
}
const renderHarness = (props: Parameters<typeof Harness>[0]) => render(<ThemeProvider theme={rbmTheme}><Harness {...props} /></ThemeProvider>);

function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useRbmBusy and RbmBusyOverlay', () => {
  it('says what is happening while the request runs, marks the content busy, then applies the result', async () => {
    const d = deferred();
    renderHarness({ request: () => ({ label: 'Loading all tasks', detail: 'This can take a moment on a large event.', load: () => d.promise }) });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Loading all tasks…This can take a moment on a large event.Cancel');
    expect(screen.getByTestId('content')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('content')).toHaveAttribute('inert');
    expect(screen.getByTestId('content')).toHaveTextContent('not yet');
    await act(async () => d.resolve());
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('applied'));
    await waitFor(() => expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument());
    expect(screen.getByTestId('content')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByTestId('content')).not.toHaveAttribute('inert');
  });

  it('shows nothing for a request that finishes before the delay', async () => {
    renderHarness({ request: () => ({ label: 'Loading all tasks' }), options: { delayMs: 200, minVisibleMs: 400 } });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('applied'));
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument();
  });

  it('stays on screen for the minimum time once shown, so it never flickers', async () => {
    const d = deferred();
    renderHarness({ request: () => ({ label: 'Loading all tasks', load: () => d.promise }), options: { delayMs: 0, minVisibleMs: 300 } });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await screen.findByRole('status');
    await act(async () => d.resolve());
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('applied'));
    expect(screen.getByTestId('rbm-busy')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument());
  });

  it('can be cancelled: the query is told to stop, and nothing changes', async () => {
    let signal: AbortSignal | undefined;
    const d = deferred();
    renderHarness({ request: () => ({ label: 'Loading all tasks', load: (s) => ((signal = s), d.promise) }) });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(signal!.aborted).toBe(true);
    await waitFor(() => expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument());
    await act(async () => d.resolve());
    expect(screen.getByTestId('content')).toHaveTextContent('not yet');
  });

  it('shows at once for a heavy redraw, with no Cancel when there is no query to stop', async () => {
    renderHarness({ request: () => ({ label: 'Expanding all runbooks', heavy: true }), options: { delayMs: 1000, minVisibleMs: 300 } });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await screen.findByRole('status');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('says when the query fails, until closed, and leaves the content as it was', async () => {
    const d = deferred();
    renderHarness({ request: () => ({ label: 'Loading all tasks', load: () => d.promise, errorText: 'Could not load all tasks. Try again.' }) });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await screen.findByRole('status');
    await act(async () => d.reject(new Error('timeout')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load all tasks. Try again.Close');
    expect(screen.getByTestId('content')).toHaveTextContent('not yet');
    expect(screen.getByTestId('content')).not.toHaveAttribute('inert');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('rbm-busy')).not.toBeInTheDocument();
  });

  it('lets a new request replace one still running', async () => {
    const signals: AbortSignal[] = [];
    const first = deferred();
    const second = deferred();
    const queue = [first, second];
    renderHarness({ request: () => ({ label: 'Loading all tasks', load: (s) => (signals.push(s), queue.shift()!.promise) }) });
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    await screen.findByRole('status');
    await userEvent.click(screen.getByRole('button', { name: 'Go', hidden: true }));
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
    await act(async () => second.resolve());
    await waitFor(() => expect(screen.getByTestId('content')).toHaveTextContent('applied'));
  });
});

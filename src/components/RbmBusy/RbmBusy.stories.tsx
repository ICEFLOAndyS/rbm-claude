import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Button } from '@mui/material';
import { useState } from 'react';
import { RbmBusyOverlay, useRbmBusy } from './RbmBusy';
import { radius } from '../../theme/tokens';

const meta: Meta = { title: 'Patterns/RbmBusy', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const wait = (ms: number, signal: AbortSignal, fail = false) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => (fail ? reject(new Error('failed')) : resolve()), ms);
    signal.addEventListener('abort', () => clearTimeout(t));
  });

/** Any region: a button starts a slow request; the feedback covers only that region. */
function Region({ ms = 2500, fail = false }: { ms?: number; fail?: boolean }) {
  const busy = useRbmBusy();
  const [loaded, setLoaded] = useState(0);
  return (
    <Box sx={{ position: 'relative', maxWidth: 720, minHeight: 320, border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', p: 5 }}>
      <RbmBusyOverlay busy={busy} />
      <Box {...busy.contentProps} sx={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
        <Button variant="outlined" onClick={() => busy.run({ label: 'Loading all tasks', detail: 'This can take a moment on a large event.', load: (s) => wait(ms, s, fail), apply: () => setLoaded((n) => n + 1), errorText: 'Could not load all tasks. Try again.' })}>
          Show all
        </Button>
        <span>Loaded {loaded} {loaded === 1 ? 'time' : 'times'}.</span>
      </Box>
    </Box>
  );
}

/** Click Show all: after 250 ms the card says what is happening, with Cancel; the region underneath cannot be used meanwhile. */
export const SlowQuery: Story = { render: () => <Region /> };

/** A quick request (under 250 ms) shows nothing, so the screen never flashes. */
export const QuickQuery: Story = { render: () => <Region ms={100} /> };

/** A failed query says so until closed, and leaves the region as it was. */
export const FailedQuery: Story = { render: () => <Region ms={1200} fail /> };

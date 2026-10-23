import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EventsListPage, type EventsListAddress } from './EventsListPage';
import { createMockEventServer, type MockServerOptions } from '../data/list/mockServer';
import { createLocalListPreferenceStore } from '../data/list/preferenceStore';
import { EVENT_COLUMNS } from '../data/list/events';
import type { EventColumnField } from '../data/list/types';
import { events128, eventsBoard, eventsEmpty, PEOPLE } from '../fixtures/events/build';

const fixtures = { board: eventsBoard, '128': events128, empty: eventsEmpty } as const;

/** Preferences for the story only, kept in memory so stories do not share them. */
function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

function Page({ fixture = 'board', server = {}, start = {} }: { fixture?: keyof typeof fixtures; server?: MockServerOptions; start?: EventsListAddress }) {
  const [data] = useState(() => createMockEventServer(fixtures[fixture](), { latencyMs: 400, ...server }));
  const [preferences] = useState(() => createLocalListPreferenceStore<EventColumnField>('story', EVENT_COLUMNS.map((c) => c.field), memoryStorage()));
  const [address, setAddress] = useState<EventsListAddress>(start);
  return <EventsListPage data={data} preferences={preferences} people={PEOPLE} address={address} onAddressChange={setAddress} onNew={() => {}} onImport={() => {}} onOpenFull={() => {}} onPrimaryAction={() => {}} />;
}

const meta: Meta<typeof Page> = {
  title: 'List/RbmListPage',
  component: Page,
  parameters: { layout: 'fullscreen' },
  // The page fills the content area of the app shell; here, the window.
  decorators: [(Story) => <div style={{ height: '100vh' }}>{Story()}</div>],
};
export default meta;

type Story = StoryObj<typeof Page>;

/** The board's eight events, on the Active view. Click a row to open the slide-in. */
export const Events: Story = { args: { fixture: 'board' } };

/** 128 events, server-side pages of 25. */
export const Events128: Story = { name: 'Events, 128', args: { fixture: '128' } };

/** A record opened from the address (deep link). */
export const RecordOpen: Story = { name: 'Record open', args: { fixture: 'board', start: { record: 'ev-00001' } } };

/** The first load: the skeleton after 300 ms. */
export const Loading: Story = { args: { fixture: 'board', server: { latencyMs: 60_000 } } };

/** No events at all (after Clear filters), or none in the view. */
export const Empty: Story = { args: { fixture: 'empty' } };

/** The load failed: Retry and the reference. */
export const Error: Story = { args: { fixture: 'board', server: { fail: { query: 'failed' } } } };

/** The user may not see events. */
export const NoAccess: Story = { name: 'No access', args: { fixture: 'board', server: { fail: { query: 'noAccess' } } } };

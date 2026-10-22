import { useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { Box } from '@mui/material';
import { RbmRecord, type RbmRecordContainer, type RbmRecordHandle, type RbmRecordLocation } from './RbmRecord';
import { RbmRecordDrawer } from './RbmRecordDrawer';
import { RbmDataGrid } from '../RbmDataGrid/RbmDataGrid';
import { RbmDensity } from '../../theme/RbmDensity';
import { createMockEventServer } from '../../data/list/mockServer';
import { DEFAULT_EVENT_COLUMNS, EVENT_COLUMNS, eventRecordSpec } from '../../data/list/events';
import type { EventColumnState, EventRecord } from '../../data/list/types';
import { eventsBoard, PEOPLE } from '../../fixtures/events/build';
import { colour } from '../../theme/tokens';

const spec = eventRecordSpec();

/** The panel with the mock server behind it, as a list page wires it. */
function Panel({ id, initial = 'slideIn', conflict = false }: { id: string; initial?: RbmRecordContainer; conflict?: boolean }) {
  const server = useMemo(() => createMockEventServer(eventsBoard()), []);
  const [record, setRecord] = useState<EventRecord>(() => structuredClone(eventsBoard().records.find((r) => r.id === id)!));
  const [container, setContainer] = useState<RbmRecordContainer>(initial);
  const [location, setLocation] = useState<RbmRecordLocation>({});
  return (
    <Box sx={{ width: container === 'wide' ? 960 : 480, height: 860, border: `1px solid ${colour.rule}`, boxShadow: '-8px 0 24px rgba(31,36,48,0.12)' }}>
      <RbmRecord
        spec={spec}
        record={record}
        container={container}
        onContainerChange={setContainer}
        location={location}
        onLocationChange={setLocation}
        onClose={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onOpenFull={() => {}}
        onSave={async (sectionId, values, base) => {
          // For the conflict story: someone else saves first.
          if (conflict) server.externalEdit(record.id, { description: 'Updated by Jo during the edit' }, { id: 'p-jn', name: 'Jo Novak' });
          const result = await server.saveSection(record.id, sectionId, values, base);
          if (result.kind === 'saved') setRecord(result.record);
          return result;
        }}
        onReload={() => void server.readRecord(record.id).then(setRecord)}
        onPrimaryAction={() => {}}
        people={PEOPLE}
        listName="Events"
      />
    </Box>
  );
}

const meta: Meta<typeof Panel> = {
  title: 'List/RbmRecord',
  component: Panel,
  parameters: { layout: 'padded' },
  // The task slide-in is Compact by default (Density board, "Defaults by surface"); the list page is D2 too.
  decorators: [(Story) => <RbmDensity level="compact">{Story()}</RbmDensity>],
};
export default meta;

type Story = StoryObj<typeof Panel>;

/** An event that has not started: everything editable, and Start run in the footer. */
export const SlideIn: Story = { args: { id: 'ev-00005' } };

/** A running event: its Schedule is locked with the reason, and Dependencies has an alert dot. */
export const SlideInRunning: Story = { args: { id: 'ev-00001' } };

/** Editing Details: the section's border and "Editing", the message under the empty name, Save disabled. */
export const Editing: Story = {
  args: { id: 'ev-00005' },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Edit Details' }));
    await userEvent.clear(c.getByRole('textbox', { name: 'Name (required)' }));
  },
};

/** Someone else saved first: the alert says what changed and offers Reload. */
export const Conflict: Story = {
  args: { id: 'ev-00005', conflict: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole('button', { name: 'Edit Details' }));
    await userEvent.type(c.getByRole('textbox', { name: 'Name (required)' }), ' 2');
    await userEvent.click(c.getByRole('button', { name: 'Save' }));
  },
};

/** The wide panel: vertical tabs with counts and alerts, and an index of the sections on the tab. */
export const Wide: Story = { args: { id: 'ev-00001', initial: 'wide' } };

// ---------------------------------------------------------------------------
// In its drawer, beside the list
// ---------------------------------------------------------------------------

function BesideTheList() {
  const server = useMemo(() => createMockEventServer(eventsBoard()), []);
  const rows = useMemo(() => eventsBoard().rows, []);
  const panel = useRef<RbmRecordHandle>(null);
  const [columns, setColumns] = useState<EventColumnState>(DEFAULT_EVENT_COLUMNS);
  const [openId, setOpenId] = useState<string | null>(null);
  const [record, setRecord] = useState<EventRecord | null>(null);
  const [container, setContainer] = useState<RbmRecordContainer>('slideIn');
  const [location, setLocation] = useState<RbmRecordLocation>({});

  const open = async (id: string) => {
    if (openId && !(await panel.current?.confirmLeave())) return;
    setOpenId(id);
    setRecord(await server.readRecord(id));
  };
  const index = openId ? rows.findIndex((r) => r.id === openId) : -1;
  const close = async () => {
    if (await (panel.current?.confirmLeave() ?? Promise.resolve(true))) {
      setOpenId(null);
      setRecord(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ fontSize: 13, color: 'text.secondary' }}>Address (story readout): {openId ? `?record=${openId}${location.groupId ? `&tab=${location.groupId}` : ''}${location.sectionId ? `&section=${location.sectionId}` : ''}` : 'none'}</Box>
      <Box sx={{ maxWidth: 1100 }}>
        <RbmDataGrid label="Events" columns={EVENT_COLUMNS} rows={rows} sort={[]} onSortChange={() => {}} columnState={columns} onColumnStateChange={setColumns} openRowId={openId} onOpenRow={(r) => void open(r.id)} />
      </Box>
      <RbmRecordDrawer open={!!record} container={container} onClose={() => void close()}>
        {record && (
          <RbmRecord
            ref={panel}
            spec={spec}
            record={record}
            container={container}
            onContainerChange={setContainer}
            location={location}
            onLocationChange={setLocation}
            onClose={() => {
              setOpenId(null);
              setRecord(null);
            }}
            onPrevious={index > 0 ? () => void open(rows[index - 1]!.id) : undefined}
            onNext={index >= 0 && index < rows.length - 1 ? () => void open(rows[index + 1]!.id) : undefined}
            onSave={async (sectionId, values, base) => {
              const result = await server.saveSection(record.id, sectionId, values, base);
              if (result.kind === 'saved') setRecord(result.record);
              return result;
            }}
            onReload={() => void server.readRecord(record.id).then(setRecord)}
            people={PEOPLE}
            listName="Events"
          />
        )}
      </RbmRecordDrawer>
    </Box>
  );
}

/** Click a row: the slide-in opens beside the list and the row keeps the highlight; previous and next move through the list. */
export const BesideTheListStory: StoryObj = { name: 'In its drawer, beside the list', render: () => <BesideTheList /> };

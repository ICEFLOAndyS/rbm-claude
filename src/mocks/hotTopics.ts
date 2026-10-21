import type { RbmBlocker, RbmMilestoneItem, RbmNextCheckpointData, RbmWatcher } from '../components/RbmHotTopicsStrip/cards';
import { at } from './eventRibbon';

/** "Now" on the Command board's page. */
export const hotTopicsNow = at('03:40');

/** The Hot-topics strip content drawn on the Command board. */
export const mockBlockers = (): RbmBlocker[] => [
  { id: 'b1', recordId: 'BLK-102', title: 'Waiting on vendor', severity: 'high', holds: { wbs: '1.4.2', tasks: 3 } },
  { id: 'b2', recordId: 'BLK-202', title: 'Network connectivity', severity: 'high', holds: { wbs: '2.1.7', tasks: 1 } },
];

export const mockNextCheckpoint = (): RbmNextCheckpointData => ({
  wbs: '1.5.2', title: 'Go / No-Go', state: 'pending', at: at('05:45'), forecast: at('05:57'), gapMinutes: 12,
  call: { open: true, joined: 4 },
});

export const mockMilestones = (): RbmMilestoneItem[] => [
  { id: 'm1', wbs: '1.2.9', title: 'Infra failover complete', state: 'complete', at: at('02:00') },
  { id: 'm2', wbs: '1.3.9', title: 'Application failover', state: 'pending', at: at('04:42'), late: true },
  { id: 'm3', wbs: '1.4.9', title: 'Validation complete', state: 'pending', at: at('05:30') },
];

export const mockPeople = () => [
  { name: 'Mary O’Neill' }, { name: 'Lin Chen' }, { name: 'Raj Patel' }, { name: 'Sam Dee' },
  { name: 'Tom Baker' }, { name: 'Karen Wells' }, { name: 'Jo Nash' },
];

export const mockWatchers = (): RbmWatcher[] => [{ id: 'w1', title: 'Payroll Interface Monitoring', since: at('01:00') }];

import type { RbmEventSummary } from '../components/RbmEventBar/RbmEventBar';
import type { RbmAlert } from '../components/RbmAlertCounter/RbmAlertCounter';

/** The event on the Command board. */
export const mockEvent = (): RbmEventSummary => ({ number: 'E12345', name: 'Weekend Payroll Cutover', state: 'active' });

/** The alerts drawn on the Command board ("Alert counter"). */
export const mockAlerts = (): RbmAlert[] => [
  { id: 'blockers', severity: 'red', title: '2 blockers are holding 3 tasks', detail: 'The forecast end has moved 12 minutes late.' },
  { id: 'forecast', severity: 'amber', title: 'Forecast end is 12 minutes late', detail: 'The critical path runs through 1.3.7 Run smoke tests.' },
  { id: 'check', severity: 'red', title: '1 task failed its check', detail: '1.4.2 Payroll totals check needs a decision.' },
];

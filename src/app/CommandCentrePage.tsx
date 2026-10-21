import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { CommandCentreActions, CommandCentreData, LayoutPreference, LayoutPreferenceStore } from '../data/interfaces';
import type { TaskCommand } from '../data/types';
import { toAlerts, toEvent, toHotTopics, toRibbon, toTimeline, toVitals } from '../data/adapters';
import { DEFAULT_PREFERENCE } from '../data/layoutStore';
import { RbmCommandCentre } from '../components/RbmCommandCentre/RbmCommandCentre';
import { RbmEventVitals } from '../components/RbmEventVitals/RbmEventVitals';
import { RbmEventRibbon } from '../components/RbmEventRibbon/RbmEventRibbon';
import { RbmTaskTimeline } from '../components/RbmTaskTimeline/RbmTaskTimeline';
import { RbmHotTopicsStrip } from '../components/RbmHotTopicsStrip/RbmHotTopicsStrip';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers } from '../components/RbmHotTopicsStrip/cards';
import type { RbmTask } from '../components/RbmTaskRow/RbmTaskRow';
import type { RbmTaskActionEvent } from '../components/RbmTaskRow/RbmTaskAction';

export interface CommandCentrePageProps {
  data: CommandCentreData & CommandCentreActions;
  layoutStore: LayoutPreferenceStore;
  timeZone?: string;
  lingerSeconds?: number;
  /**
   * Asks the user for the extra input some actions need (time, note, reason, comment). The real
   * page will use the slide-in; the prototype defaults to the browser's prompt.
   */
  ask?: (question: string, initial?: string) => string | null;
}

const browserPrompt = (q: string, initial?: string) => (typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt(q, initial) : null);

/**
 * The Command & Control Centre, connected: it reads a CommandCentreSnapshot, sends commands, and
 * keeps the user's layout. It does not know whether the data comes from a fixture or ServiceNow.
 */
export function CommandCentrePage({ data, layoutStore, timeZone, lingerSeconds = 60, ask = browserPrompt }: CommandCentrePageProps) {
  const snapshot = useSyncExternalStore(data.subscribe, data.getSnapshot);
  const [pref, setPref] = useState<LayoutPreference>(DEFAULT_PREFERENCE);
  const [runbookFilter, setRunbookFilter] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ message: string } | undefined>();

  useEffect(() => {
    let live = true;
    void layoutStore.get().then((p) => live && setPref(p));
    return () => {
      live = false;
    };
  }, [layoutStore]);
  const savePref = (next: LayoutPreference) => {
    setPref(next);
    void layoutStore.set(next);
  };

  const now = new Date(snapshot.now);
  const event = useMemo(() => toEvent(snapshot), [snapshot]);
  const vitals = useMemo(() => toVitals(snapshot), [snapshot]);
  const ribbon = useMemo(() => toRibbon(snapshot), [snapshot]);
  const timeline = useMemo(() => toTimeline(snapshot), [snapshot]);
  const hot = useMemo(() => toHotTopics(snapshot, runbookFilter), [snapshot, runbookFilter]);
  const notBuilt = (what: string) => () => setNotice({ message: `${what} opens in the slide-in, which is not part of this prototype.` });
  const alerts = useMemo(() => toAlerts(snapshot, (id) => notBuilt(id === 'alert-blockers' ? 'The blocker list' : id === 'alert-failed-check' ? 'The check result' : 'The critical path')()), [snapshot]);

  const send = async (command: TaskCommand) => {
    const result = await data.dispatch(command);
    if (result.conflicts.length) setNotice({ message: result.conflicts.map((c) => c.message).join(' · ') });
  };

  const onAction = (task: RbmTask, e: RbmTaskActionEvent) => {
    const ids = [task.id];
    switch (e.type) {
      case 'start':
      case 'resume':
      case 'pause':
        return void send({ type: e.type, taskIds: ids });
      case 'complete':
        return void send({ type: 'complete', taskIds: ids });
      case 'undo':
        return void send({ type: 'undo_complete', taskIds: ids });
      case 'completeAt': {
        const hhmm = ask(`Actual end for ${task.wbs} (hh:mm)`, snapshot.now.slice(11, 16));
        if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return;
        const at = new Date(snapshot.now);
        at.setUTCHours(Number(hhmm.slice(0, 2)), Number(hhmm.slice(3)), 0, 0);
        if (at > now) at.setUTCDate(at.getUTCDate() - 1);
        return void send({ type: 'complete', taskIds: ids, at: at.toISOString().replace('.000Z', 'Z') });
      }
      case 'completeWithNote': {
        const note = ask(`Note for ${task.wbs}`);
        if (note === null) return;
        return void send({ type: 'complete', taskIds: ids, ...(note.trim() ? { note } : {}) });
      }
      case 'skip': {
        const reason = ask(`Why skip ${task.wbs}? A reason is required.`);
        if (!reason?.trim()) return;
        return void send({ type: 'skip', taskIds: ids, reason });
      }
      case 'result': {
        if (e.result === 'passWithComment') {
          const comment = ask(`Comment for ${task.wbs}`);
          if (comment === null) return;
          return void send({ type: 'record_result', taskIds: [task.id], result: 'pass_with_comment', comment });
        }
        return void send({ type: 'record_result', taskIds: [task.id], result: e.result === 'pass' ? 'pass' : 'fail' });
      }
      case 'view':
        return notBuilt(`The blocker on ${task.wbs}`)();
    }
  };

  return (
    <RbmCommandCentre
      event={event}
      alerts={alerts}
      vitalsData={vitals}
      timeZone={timeZone}
      layout={pref.order}
      onLayoutChange={(order) => savePref({ ...pref, order })}
      eventActions={{
        raiseIssue: notBuilt('Raise issue'),
        raiseBlocker: notBuilt('Raise blocker'),
        addNote: notBuilt('Add event note'),
        notifyStakeholders: notBuilt('Notify stakeholders'),
        exportLog: notBuilt('Export event log'),
        settings: notBuilt('Event settings'),
      }}
      onOpenProgress={notBuilt('The task list')}
      onOpenIssues={notBuilt('The issue list')}
      onOpenForecast={notBuilt('The late tasks and critical path')}
      vitals={
        <RbmEventVitals
          data={vitals}
          timeZone={timeZone}
          onOpenProgress={notBuilt('The task list')}
          onOpenIssues={notBuilt('The issue list')}
          onOpenForecast={notBuilt('The late tasks and critical path')}
          onRaiseIssue={notBuilt('Raise issue')}
        />
      }
      ribbon={<RbmEventRibbon runbooks={ribbon} now={now} timeZone={timeZone} collapsed={pref.ribbonCollapsed} onCollapsedChange={(c) => savePref({ ...pref, ribbonCollapsed: c })} />}
      timeline={
        <RbmTaskTimeline
          runbooks={timeline.runbooks}
          tasks={timeline.tasks}
          now={now}
          timeZone={timeZone}
          lingerSeconds={lingerSeconds}
          runbookFilter={runbookFilter}
          onRunbookFilterChange={setRunbookFilter}
          onAction={onAction}
          onOpen={(t) => notBuilt(`Task ${t.wbs}`)()}
          notice={notice}
          onNoticeClose={() => setNotice(undefined)}
          stickyTop={48}
        />
      }
      hotTopics={
        <RbmHotTopicsStrip>
          <RbmBlockers blockers={hot.blockers} onOpen={(b) => notBuilt(b.recordId)()} onRaise={notBuilt('Raise blocker')} />
          <RbmNextCheckpoint checkpoint={hot.nextCheckpoint} now={now} timeZone={timeZone} onJoinCall={notBuilt('The call')} />
          <RbmMilestones milestones={hot.milestones} timeZone={timeZone} />
          <RbmCollaboration live={hot.collaboration.live} people={hot.collaboration.people} onJoinCall={notBuilt('The Collaboration call')} />
          <RbmWatchers watchers={hot.watchers} timeZone={timeZone} />
        </RbmHotTopicsStrip>
      }
    />
  );
}

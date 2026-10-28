import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Snackbar } from '@mui/material';
import type { CommandCentreData, LayoutPreference, LayoutPreferenceStore } from '../data/interfaces';
import { toAlerts, toEvent, toHotTopics, toRibbon, toRunbookProgress, toVitals, toWorkstreamProgress } from '../data/adapters';
import { defaultPreference } from '../data/layoutStore';
import { RbmCommandCentre } from '../components/RbmCommandCentre/RbmCommandCentre';
import { RbmEventVitals } from '../components/RbmEventVitals/RbmEventVitals';
import { RbmEventRibbon } from '../components/RbmEventRibbon/RbmEventRibbon';
import { hotTopicsSummary } from '../components/RbmHotTopicsStrip/RbmHotTopicsStrip';
import { RbmHotTopicsPanel } from '../components/RbmHotTopicsStrip/RbmHotTopicsPanel';
import { EXEC_BRIEFING_LAYOUT, type RbmRegion } from '../components/RbmLayoutPanel/RbmLayoutPanel';
import { RbmBlockers, RbmCollaboration, RbmMilestones, RbmNextCheckpoint, RbmWatchers } from '../components/RbmHotTopicsStrip/cards';
import { RbmProgressRegion } from '../components/RbmProgressRegion/RbmProgressRegion';

export interface ExecBriefingCentrePageProps {
  /** Read only: the Exec Briefing Centre shows the event and sends no task commands. */
  data: CommandCentreData;
  /** The page's own layout, made with EXEC_BRIEFING_LAYOUT (createLocalLayoutStore(key, storage, EXEC_BRIEFING_LAYOUT)). */
  layoutStore: LayoutPreferenceStore;
  timeZone?: string;
}

/**
 * The Exec Briefing Centre, connected (Andy Smith, 28 Oct 2026). It began as a copy of CommandCentrePage on the same
 * template and differs from it in its main column: the Event ribbon and Progress (Runbook progress and Workstream
 * progress side by side) where the Command Centre has the Event ribbon and Task Timeline. With no Task Timeline it
 * has no task actions. It keeps its own layout, and does not know whether the data comes from a fixture or ServiceNow.
 */
export function ExecBriefingCentrePage({ data, layoutStore, timeZone }: ExecBriefingCentrePageProps) {
  const snapshot = useSyncExternalStore(data.subscribe, data.getSnapshot);
  const [pref, setPref] = useState<LayoutPreference>(() => defaultPreference(EXEC_BRIEFING_LAYOUT));
  const [notice, setNotice] = useState<string | undefined>();

  useEffect(() => {
    let live = true;
    void layoutStore.get().then((p) => live && setPref(p));
    return () => {
      live = false;
    };
  }, [layoutStore]);
  // Changes build on the latest preference, so two in a row (for example from Reset) never undo each other.
  const latest = useRef(pref);
  latest.current = pref;
  const savePref = (change: (p: LayoutPreference) => LayoutPreference) => {
    const next = change(latest.current);
    latest.current = next;
    setPref(next);
    void layoutStore.set(next);
  };
  const setCollapsed = (region: RbmRegion, collapsed: boolean) => savePref((p) => ({ ...p, collapsed: { ...p.collapsed, [region]: collapsed } }));

  const now = new Date(snapshot.now);
  const event = useMemo(() => toEvent(snapshot), [snapshot]);
  const vitals = useMemo(() => toVitals(snapshot), [snapshot]);
  const ribbon = useMemo(() => toRibbon(snapshot), [snapshot]);
  // Every task is in one runbook and one workstream, so both cards add up to the Event vitals.
  const runbooks = useMemo(() => toRunbookProgress(snapshot), [snapshot]);
  const workstreams = useMemo(() => toWorkstreamProgress(snapshot), [snapshot]);
  const hot = useMemo(() => toHotTopics(snapshot), [snapshot]);
  const notBuilt = (what: string) => () => setNotice(`${what} opens in the slide-in, which is not part of this prototype.`);
  const alerts = useMemo(() => toAlerts(snapshot, (id) => notBuilt(id === 'alert-blockers' ? 'The blocker list' : id === 'alert-failed-check' ? 'The check result' : 'The critical path')()), [snapshot]);

  return (
    <>
      <RbmCommandCentre
        centreName="Exec Briefing Centre"
        event={event}
        alerts={alerts}
        vitalsData={vitals}
        timeZone={timeZone}
        defaultLayout={EXEC_BRIEFING_LAYOUT}
        layout={pref.order}
        onLayoutChange={(order) => savePref((p) => ({ ...p, order }))}
        collapsed={pref.collapsed}
        onCollapsedChange={setCollapsed}
        onLayoutReset={() => savePref((p) => ({ ...defaultPreference(EXEC_BRIEFING_LAYOUT), ribbonView: p.ribbonView }))}
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
            onOpenWork={notBuilt('The task list')}
            onOpenProgress={notBuilt('The task list')}
            onOpenIssues={notBuilt('The issue list')}
            onOpenForecast={notBuilt('The late tasks and critical path')}
            onRaiseIssue={notBuilt('Raise issue')}
          />
        }
        ribbon={<RbmEventRibbon runbooks={ribbon} now={now} timeZone={timeZone} collapsed={pref.collapsed.ribbon} onCollapsedChange={(c) => setCollapsed('ribbon', c)} view={pref.ribbonView} onViewChange={(v) => savePref((p) => ({ ...p, ribbonView: v }))} />}
        progress={<RbmProgressRegion runbooks={runbooks} workstreams={workstreams} timeZone={timeZone} collapsed={pref.collapsed.progress} onCollapsedChange={(c) => setCollapsed('progress', c)} />}
        hotTopics={
          <RbmHotTopicsPanel collapsed={pref.collapsed.hotTopics} onCollapsedChange={(c) => setCollapsed('hotTopics', c)} summary={hotTopicsSummary(hot, now)}>
            <RbmBlockers blockers={hot.blockers} onOpen={(b) => notBuilt(b.recordId)()} onRaise={notBuilt('Raise blocker')} />
            <RbmNextCheckpoint checkpoint={hot.nextCheckpoint} now={now} timeZone={timeZone} onJoinCall={notBuilt('The call')} />
            <RbmMilestones milestones={hot.milestones} timeZone={timeZone} />
            <RbmCollaboration live={hot.collaboration.live} people={hot.collaboration.people} onJoinCall={notBuilt('The Collaboration call')} />
            <RbmWatchers watchers={hot.watchers} timeZone={timeZone} />
          </RbmHotTopicsPanel>
        }
      />
      {/* The Command Centre shows these in its Task Timeline; with none here, MUI's snackbar (no RBM style is drawn). */}
      <Snackbar open={!!notice} message={notice} onClose={() => setNotice(undefined)} autoHideDuration={6000} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
}

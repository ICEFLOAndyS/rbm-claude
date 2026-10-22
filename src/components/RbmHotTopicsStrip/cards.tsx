import { Box, ButtonBase, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { RbmAvatar } from '../RbmAvatar/RbmAvatar';
import { RbmNode } from '../RbmNode/RbmNode';
import { colour, hairline, type RbmState, stroke } from '../../theme/tokens';
import { hitTarget, ringSize, useDensity } from '../../theme/RbmDensity';
import { CardRow, Icon, JoinCall, MoreRow, RbmHotTopicCard } from './RbmHotTopicCard';

/** Three items per card, then "n more". */
export const CARD_LIMIT = 3;

export type RbmSeverity = 'high' | 'medium' | 'low';

interface CardBase {
  timeZone?: string;
}

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

const pad = (n: number) => String(n).padStart(2, '0');
const gapWords = (m: number) => (m === 0 ? 'On Schedule' : m > 0 ? `+${m}m` : `−${-m}m`);

/** Severity is a dot and a word: High Red, Medium the Amber ringed dot, Low Silver. */
export function Severity({ level }: { level: RbmSeverity }) {
  const { status } = useTheme().palette;
  const d = useDensity();
  const word = { high: 'High', medium: 'Medium', low: 'Low' }[level];
  const text = { high: status.blocked.text, medium: status.atRisk.text, low: status.pending.text }[level];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontSize: d.caption, fontWeight: 700, color: text, whiteSpace: 'nowrap' }}>
      {level === 'medium' ? (
        <Box component="span" aria-hidden="true" sx={{ width: ringSize(d.dot), height: ringSize(d.dot), borderRadius: '50%', bgcolor: status.atRisk.signal, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
          <Box component="span" sx={{ width: d.dot, height: d.dot, borderRadius: '50%', bgcolor: status.atRisk.core, border: `${stroke.thick}px solid ${colour.white}`, boxSizing: 'border-box' }} />
        </Box>
      ) : (
        <Box component="span" aria-hidden="true" sx={{ width: d.dot, height: d.dot, borderRadius: '50%', bgcolor: level === 'high' ? status.blocked.signal : status.pending.signal, flex: 'none' }} />
      )}
      {word}
    </Box>
  );
}

function StatusLine({ live, children }: { live: boolean; children: ReactNode }) {
  const { status } = useTheme().palette;
  const d = useDensity();
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: d.caption, fontWeight: 700, color: live ? status.complete.text : 'text.secondary' }}>
      <Box component="span" aria-hidden="true" sx={{ width: d.dot, height: d.dot, borderRadius: '50%', bgcolor: live ? status.complete.signal : status.pending.signal, flex: 'none' }} />
      {children}
    </Box>
  );
}

// ---- Blockers --------------------------------------------------------------

export interface RbmBlocker {
  id: string;
  /** The record number, for example "BLK-102". */
  recordId: string;
  title: string;
  severity: RbmSeverity;
  /** The task it holds and how many tasks wait on it. */
  holds: { wbs: string; tasks: number };
}

export interface RbmBlockersProps extends CardBase {
  blockers: RbmBlocker[];
  onOpen?: (blocker: RbmBlocker) => void;
  onShowMore?: () => void;
  /** Shown only when the user may raise a blocker. */
  onRaise?: () => void;
}

export function RbmBlockers({ blockers, onOpen, onShowMore, onRaise, ...card }: RbmBlockersProps) {
  const d = useDensity();
  return (
    <RbmHotTopicCard
      title="Blockers"
      icon={<Icon stroke={colour.redInner}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></Icon>}
      count={blockers.length}
      action={
        onRaise && (
          <ButtonBase onClick={onRaise} aria-label="Raise a blocker" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'inherit', fontSize: d.caption, fontWeight: 700, color: 'primary.light', borderRadius: 1, px: 0.5, ...hitTarget(d.target) }}>
            <Icon size={14} width={2.5}><path d="M12 5v14M5 12h14" /></Icon> Raise
          </ButtonBase>
        )
      }
      {...card}
    >
      {blockers.slice(0, CARD_LIMIT).map((b) => {
        const holds = `Holds ${b.holds.wbs}${b.holds.tasks > 1 ? ` · ${b.holds.tasks} tasks` : ''}`;
        return (
          <CardRow key={b.id} onOpen={onOpen && (() => onOpen(b))} label={`${b.recordId} ${b.title}, ${b.severity}, ${holds}`} sx={{ px: `${d.padX}px`, py: 2, minHeight: d.row, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: '2px' }}>
            <Box component="span" sx={{ display: 'flex', gap: 2, fontSize: d.body, minWidth: 0 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'primary.main', fontVariantNumeric: 'tabular-nums', flex: 'none' }}>{b.recordId}</Box>
              <Box component="span" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</Box>
            </Box>
            <Box component="span" sx={{ display: 'flex', gap: 2, alignItems: 'center', fontSize: d.caption, color: 'text.secondary' }}>
              <Severity level={b.severity} />
              <span>{holds}</span>
            </Box>
          </CardRow>
        );
      })}
      <MoreRow n={blockers.length - CARD_LIMIT} onClick={onShowMore} />
    </RbmHotTopicCard>
  );
}

// ---- Next checkpoint -------------------------------------------------------

export interface RbmNextCheckpointData {
  wbs: string;
  title: string;
  state: RbmState;
  /** Planned time; the countdown runs to it. */
  at: Date;
  forecast: Date;
  gapMinutes: number;
  /** The call linked to the checkpoint. No call, no button. */
  call?: { open: boolean; joined?: number; opensAt?: Date };
}

export interface RbmNextCheckpointProps extends CardBase {
  checkpoint?: RbmNextCheckpointData;
  now: Date;
  onOpen?: () => void;
  onJoinCall?: () => void;
}

/** The countdown, as "in 02:05", or "now" once the planned time has passed. */
export function countdown(to: Date, now: Date) {
  const mins = Math.round((to.getTime() - now.getTime()) / 60_000);
  return mins <= 0 ? 'now' : `in ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

export function RbmNextCheckpoint({ checkpoint: c, now, onOpen, onJoinCall, timeZone, ...card }: RbmNextCheckpointProps) {
  const { status } = useTheme().palette;
  const d = useDensity();
  return (
    <RbmHotTopicCard title="Next checkpoint" icon={<Icon stroke={colour.deepBlue}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></Icon>} count={c ? undefined : 0} {...card}>
      {c && (
        <Box sx={{ borderTop: `${stroke.thin}px solid ${hairline}`, px: `${d.padX}px`, py: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <CardRow onOpen={onOpen} label={`Checkpoint ${c.wbs} ${c.title}, ${countdown(c.at, now)}, forecast ${timeOf(c.forecast, timeZone)}, ${gapWords(c.gapMinutes)}`} sx={{ borderTop: 0, flexDirection: 'column', alignItems: 'stretch', gap: 2, borderRadius: 1 }}>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <RbmNode kind="checkpoint" state={c.state} size={22} decorative />
              <Box component="span" sx={{ fontSize: d.body, fontWeight: 800 }}>{c.title}</Box>
            </Box>
            <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 2.5 }}>
              {/* The countdown is a KPI figure: the density's figure size (drawn 28 px). */}
              <Box component="span" sx={{ fontSize: d.figure, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{countdown(c.at, now)}</Box>
              <Box component="span" sx={{ fontSize: d.caption, color: 'text.secondary' }}>
                Forecast {timeOf(c.forecast, timeZone)} ·{' '}
                <Box component="strong" sx={{ color: c.gapMinutes > 0 ? status.atRisk.text : status.complete.text }}>{gapWords(c.gapMinutes)}</Box>
              </Box>
            </Box>
          </CardRow>
          {c.call && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              {c.call.open ? (
                <StatusLine live>Call open · {c.call.joined ?? 0} joined</StatusLine>
              ) : (
                <StatusLine live={false}>Call opens {c.call.opensAt ? timeOf(c.call.opensAt, timeZone) : 'later'}</StatusLine>
              )}
              <JoinCall onJoin={onJoinCall} label={`Join the ${c.title} call`} disabledText={c.call.open ? undefined : c.call.opensAt ? `Opens ${timeOf(c.call.opensAt, timeZone)}` : 'Not open yet'} />
            </Box>
          )}
        </Box>
      )}
    </RbmHotTopicCard>
  );
}

// ---- Milestones ------------------------------------------------------------

export interface RbmMilestoneItem {
  id: string;
  wbs: string;
  title: string;
  state: RbmState;
  /** Actual time once reached, forecast until then. */
  at: Date;
  late?: boolean;
}

export interface RbmMilestonesProps extends CardBase {
  milestones: RbmMilestoneItem[];
  onOpen?: (m: RbmMilestoneItem) => void;
  onShowMore?: () => void;
}

export function RbmMilestones({ milestones, onOpen, onShowMore, timeZone, ...card }: RbmMilestonesProps) {
  const { palette } = useTheme();
  const d = useDensity();
  return (
    <RbmHotTopicCard title="Milestones" icon={<Icon stroke={colour.deepBlue}><path d="M12 3l9 9-9 9-9-9z" /></Icon>} count={milestones.length} {...card}>
      {milestones.slice(0, CARD_LIMIT).map((m) => {
        const done = m.state === 'complete';
        return (
          <CardRow key={m.id} onOpen={onOpen && (() => onOpen(m))} label={`Milestone ${m.wbs} ${m.title}, ${palette.status[m.state].label}, ${timeOf(m.at, timeZone)}${m.late ? ', late' : ''}`} sx={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) auto', gap: `${d.gap}px`, alignItems: 'center', minHeight: d.row, px: `${d.padX}px`, py: 1.5, fontSize: d.body }}>
            <RbmNode kind="milestone" state={m.state} size={22} decorative />
            <Box component="span" sx={{ fontWeight: 600, color: done ? 'text.secondary' : 'text.primary', minWidth: 0 }}>{m.title}</Box>
            <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, textAlign: 'right', color: m.late && !done ? palette.status.atRisk.text : 'text.secondary' }}>{timeOf(m.at, timeZone)}</Box>
          </CardRow>
        );
      })}
      <MoreRow n={milestones.length - CARD_LIMIT} onClick={onShowMore} />
    </RbmHotTopicCard>
  );
}

// ---- Collaboration -----------------------------------------------------------

export interface RbmCollaborationProps extends CardBase {
  live: boolean;
  people: { name: string; initials?: string }[];
  onJoinCall?: () => void;
  /** Avatars shown before the "+n" chip. */
  maxAvatars?: number;
}

export function RbmCollaboration({ live, people, onJoinCall, maxAvatars = 4, ...card }: RbmCollaborationProps) {
  const d = useDensity();
  const shown = people.slice(0, maxAvatars);
  const extra = people.length - shown.length;
  return (
    <RbmHotTopicCard
      title="Collaboration"
      icon={<Icon stroke={colour.deepBlue}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 19c.5-3 3-4.5 6-4.5s5.5 1.5 6 4.5M15 15c2.5-.3 4.7.9 5.5 3.5" /></Icon>}
      {...card}
    >
      <Box sx={{ borderTop: `${stroke.thin}px solid ${hairline}`, px: `${d.padX}px`, py: 3, display: 'flex', flexDirection: 'column', gap: `${d.gap}px` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <StatusLine live={live}>{live ? `Live · ${people.length} ${people.length === 1 ? 'person' : 'people'}` : 'No live call'}</StatusLine>
          {live && <JoinCall onJoin={onJoinCall} label="Join the Collaboration call" />}
        </Box>
        {live && people.length > 0 && (
          <Box role="list" aria-label="On the call" sx={{ display: 'flex', pl: 2 }}>
            {shown.map((p) => (
              <Box key={p.name} role="listitem" sx={{ ml: -2, border: `${stroke.thick}px solid ${colour.white}`, borderRadius: '50%', display: 'inline-flex' }}>
                <RbmAvatar name={p.name} initials={p.initials} size={32} />
              </Box>
            ))}
            {extra > 0 && (
              <Box role="listitem" aria-label={`and ${extra} more`} sx={{ ml: -2, width: 36, height: 36, borderRadius: '50%', bgcolor: hairline, border: `${stroke.thick}px solid ${colour.white}`, color: 'text.secondary', fontSize: d.caption, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                +{extra}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </RbmHotTopicCard>
  );
}

// ---- Watchers ----------------------------------------------------------------

export interface RbmWatcher {
  id: string;
  title: string;
  since: Date;
}

export interface RbmWatchersProps extends CardBase {
  watchers: RbmWatcher[];
  onOpen?: (w: RbmWatcher) => void;
  onShowMore?: () => void;
}

export function RbmWatchers({ watchers, onOpen, onShowMore, timeZone, ...card }: RbmWatchersProps) {
  const d = useDensity();
  return (
    <RbmHotTopicCard title="Watchers" icon={<Icon stroke={colour.deepBlue}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>} count={watchers.length} {...card}>
      {watchers.slice(0, CARD_LIMIT).map((w) => (
        <CardRow key={w.id} onOpen={onOpen && (() => onOpen(w))} label={`${w.title}, watching since ${timeOf(w.since, timeZone)}`} sx={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', minHeight: d.row, px: `${d.padX}px`, py: 2.5, fontSize: d.body }}>
          <Box component="strong">{w.title}</Box>
          <Box component="span" sx={{ color: 'text.secondary', fontSize: d.caption }}>Watching since {timeOf(w.since, timeZone)}</Box>
        </CardRow>
      ))}
      <MoreRow n={watchers.length - CARD_LIMIT} onClick={onShowMore} />
    </RbmHotTopicCard>
  );
}


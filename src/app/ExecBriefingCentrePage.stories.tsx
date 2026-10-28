import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo } from 'react';
import { ExecBriefingCentrePage } from './ExecBriefingCentrePage';
import { createFixtureSource } from '../data/fixtureSource';
import { createLocalLayoutStore } from '../data/layoutStore';
import { createSimClock } from '../engine/clock';
import { badlyLateEvent, healthyEvent, weekendPayrollCutover } from '../fixtures/build';
import type { EventFixture } from '../data/types';
import { EXEC_BRIEFING_LAYOUT } from '../components/RbmLayoutPanel/RbmLayoutPanel';

/**
 * The Exec Briefing Centre: the Command Centre's template with the Event ribbon and Progress (Runbook progress and
 * Workstream progress side by side) where the Command Centre has its Task Timeline. A JSON fixture run by the fake
 * engine; both cards come from the event's tasks and issues, so they add up to the Event vitals.
 */
const meta: Meta = {
  title: 'Prototype/Exec Briefing Centre',
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<{ speed: number }>;

function Connected({ fixture, speed }: { fixture: () => EventFixture; speed: number }) {
  const live = useMemo(() => {
    const f = fixture();
    const clock = createSimClock(new Date(f.startsAt), { speed });
    return { clock, source: createFixtureSource(f, clock) };
    // A new source only when the story changes; speed is set below.
  }, [fixture]);
  useEffect(() => live.clock.setSpeed(speed), [live, speed]);
  useEffect(() => () => {
    live.source.dispose();
    live.clock.dispose();
  }, [live]);
  return <ExecBriefingCentrePage data={live.source} layoutStore={createLocalLayoutStore('rbm.storybook.execLayout', globalThis.localStorage, EXEC_BRIEFING_LAYOUT)} timeZone="UTC" />;
}

const speedArg = { argTypes: { speed: { control: { type: 'select' as const }, options: [0, 1, 10, 60, 300] } }, args: { speed: 0 } };

/** The Command board example: +12 min, three alerts, two blockers, a failed check. */
export const WeekendPayrollCutover: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={weekendPayrollCutover} speed={speed} /> };

/** On schedule, no alerts: the alert counter is hidden. */
export const HealthyEvent: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={healthyEvent} speed={speed} /> };

/** A Red forecast, several blockers, a failed check and a paused task. */
export const BadlyLateEvent: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={badlyLateEvent} speed={speed} /> };

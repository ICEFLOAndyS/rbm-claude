import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo } from 'react';
import { CommandCentrePage } from './CommandCentrePage';
import { createFixtureSource } from '../data/fixtureSource';
import { createLocalLayoutStore } from '../data/layoutStore';
import { createSimClock } from '../engine/clock';
import { badlyLateEvent, healthyEvent, weekendPayrollCutover } from '../fixtures/build';
import type { EventFixture } from '../data/types';

/**
 * The whole page, connected: a JSON fixture run by the fake engine (a stand-in for the RBM
 * planning engine). Actions work; the clock runs at the chosen speed. The large event is in the
 * demo app (npm run demo).
 */
const meta: Meta = {
  title: 'Prototype/Command & Control Centre',
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
  return <CommandCentrePage data={live.source} layoutStore={createLocalLayoutStore('rbm.storybook.layout')} timeZone="UTC" />;
}

const speedArg = { argTypes: { speed: { control: { type: 'select' as const }, options: [0, 1, 10, 60, 300] } }, args: { speed: 0 } };

/** The Command board example: +12 min, three alerts, two blockers, a failed check. */
export const WeekendPayrollCutover: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={weekendPayrollCutover} speed={speed} /> };

/** On schedule, no alerts: the alert counter is hidden. */
export const HealthyEvent: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={healthyEvent} speed={speed} /> };

/** A Red forecast, several blockers, a failed check and a paused task. */
export const BadlyLateEvent: Story = { ...speedArg, render: ({ speed }) => <Connected fixture={badlyLateEvent} speed={speed} /> };

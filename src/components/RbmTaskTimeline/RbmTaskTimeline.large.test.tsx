import { render, screen } from '@testing-library/react';
import { onTestFinished } from 'vitest';
import { ThemeProvider } from '@mui/material';
import { RbmTaskTimeline, LARGE_TIMELINE } from './RbmTaskTimeline';
import { computeSnapshot } from '../../engine/engine';
import { toTimeline } from '../../data/adapters';
import { largeEvent } from '../../fixtures/build';
import { rbmTheme } from '../../theme/theme';

// The large event: about 1,100 of 15,000 tasks in focus.
const f = largeEvent();
const s = computeSnapshot(f, new Date(f.startsAt), f.currentUserId);
const { runbooks, tasks } = toTimeline(s);

// Rendering a large event in jsdom is slow, so these tests get more time than the default.
describe('RbmTaskTimeline with the large event', { timeout: 20_000 }, () => {
  it('draws only rows near the screen, while counting every task in focus', () => {
    // jsdom has no layout: place each stage 2,000 px below the one before, so only the first is on screen.
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const list = this.closest?.('[role="list"]');
      const lists = Array.from(document.querySelectorAll('[aria-label="Task Timeline"] [role="list"]'));
      const i = list ? lists.indexOf(list) : -1;
      return i < 0 ? original.call(this) : ({ top: 300 + i * 2000, bottom: 300 + i * 2000 + 500, left: 0, right: 1000, width: 1000, height: 500, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
    };
    onTestFinished(() => {
      Element.prototype.getBoundingClientRect = original;
    });
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmTaskTimeline runbooks={runbooks} tasks={tasks} now={new Date(s.now)} timeZone="UTC" />
      </ThemeProvider>,
    );
    const summary = screen.getAllByRole('status').find((x) => x.textContent?.startsWith('Showing'))!;
    const inFocus = Number(summary.textContent!.match(/Showing (\d+) of/)![1]);
    expect(inFocus).toBeGreaterThan(LARGE_TIMELINE);
    // Only the first stage is near the screen (window 768 px high): at most a screenful of rows plus overscan.
    const drawn = document.querySelectorAll('[data-task]').length;
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThanOrEqual(Math.ceil(window.innerHeight / 52) + 8);
  });

  it('starts quiet runbooks collapsed and troubled ones open', () => {
    const calm = runbooks.map((r) => r.id).slice(0, 2);
    // Remove every late and blocked flag from two runbooks, so they are quiet.
    const quietTasks = tasks.map((t) => (calm.includes(t.runbookId) ? { ...t, flags: { ...t.flags, lateToStart: false, lateToFinish: false, blocked: false }, state: t.state === 'blocked' ? ('pending' as const) : t.state } : t));
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmTaskTimeline runbooks={runbooks} tasks={quietTasks} now={new Date(s.now)} timeZone="UTC" />
      </ThemeProvider>,
    );
    const band = (id: string) => document.querySelector<HTMLElement>(`[data-runbook="${id}"] > button`);
    for (const id of calm) if (band(id)) expect(band(id)).toHaveAttribute('aria-expanded', 'false');
    expect(band(runbooks[5]!.id)).toHaveAttribute('aria-expanded', 'true');
  });

  it('sticks the toolbar under the compact event bar when asked', () => {
    render(
      <ThemeProvider theme={rbmTheme}>
        <RbmTaskTimeline runbooks={runbooks.slice(0, 1)} tasks={tasks.filter((t) => t.runbookId === runbooks[0]!.id)} now={new Date(s.now)} timeZone="UTC" stickyTop={48} />
      </ThemeProvider>,
    );
    const section = screen.getByRole('region', { name: 'Task Timeline' });
    expect(section.firstElementChild).toHaveStyle({ position: 'sticky', top: '48px' });
  });
});

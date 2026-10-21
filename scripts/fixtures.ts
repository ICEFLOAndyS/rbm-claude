/**
 * npm run fixtures: writes the prototype's JSON fixtures to src/fixtures/.
 * The three small fixtures are committed; large-event.json (about 15,000 tasks) is generated from a
 * fixed seed and git-ignored. Every fixture is validated before it is written.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureBuilders } from '../src/fixtures/build';
import { validateFixture } from '../src/data/schema';

const dir = fileURLToPath(new URL('../src/fixtures/', import.meta.url));

for (const [name, build] of Object.entries(fixtureBuilders)) {
  const fixture = build();
  const { errors } = validateFixture(fixture);
  if (errors.length) {
    console.error(`${name}: ${errors.length} problems\n  ${errors.join('\n  ')}`);
    process.exit(1);
  }
  const json = name === 'large-event' ? JSON.stringify(fixture) : `${JSON.stringify(fixture, null, 2)}\n`;
  writeFileSync(`${dir}${name}.json`, json);
  console.log(`${name}.json: ${fixture.runbooks.length} runbooks, ${fixture.stages.length} stages, ${fixture.tasks.length} tasks`);
}

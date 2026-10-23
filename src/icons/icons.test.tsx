import { render, screen } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RbmIcon } from './RbmIcon';
import { iconDrawing, rbmIconNames, type RbmIconName } from './registry';
import { RbmDensity } from '../theme/RbmDensity';
import { density, type DensityLevel } from '../theme/tokens';
import { RbmIconButton } from '../components/RbmIconButton/RbmIconButton';

/**
 * Drawings that set their own fill or stroke, as on the board. The brief's rule names only "the half ring
 * and the play triangle"; the play triangle has no fill, and More and Observer do (flagged).
 */
const smallBase = ['transform="translate(0 7) scale(0.7)"', 'stroke-width="2.86"'];
const exceptions: Record<string, readonly string[]> = {
  'state/active.svg': ['fill="currentColor"'],
  'state/available.svg': ['stroke-dasharray="3 3.2"'],
  'display/more.svg': ['fill="currentColor"'],
  'role/observer.svg': ['fill="currentColor"'],
  'object/globalTeam.svg': [...smallBase, 'stroke-width="1.5"'],
  'object/globalWorkstream.svg': [...smallBase, 'stroke-width="1.5"'],
  'object/localTeam.svg': smallBase,
  'object/localWorkstream.svg': smallBase,
};

const svgRoot = join(__dirname, 'svg');
const files = readdirSync(svgRoot).flatMap((group) => readdirSync(join(svgRoot, group)).map((file) => `${group}/${file}`));

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|mts)$/.test(name)) out.push(path);
  }
  return out;
}

describe('icon files (Icon suite rule 5, the CI check)', () => {
  it.each(files)('%s is drawn to the suite rules', (file) => {
    const svg = readFileSync(join(svgRoot, file), 'utf8');
    const root = svg.match(/<svg[^>]*>/)![0];
    expect(root).toContain('viewBox="0 0 24 24"');
    expect(root).toContain('fill="none"');
    expect(root).toContain('stroke="currentColor"');
    expect(root).toContain('stroke-width="2"');
    expect(root).toContain('stroke-linecap="round"');
    expect(root).toContain('stroke-linejoin="round"');
    // The drawing itself sets no colour, fill or stroke of its own, except the drawn exceptions below.
    const drawing = svg.slice(root.length);
    const own = drawing.match(/\b(fill|stroke|stroke-width|stroke-dasharray|transform|style|class)="[^"]*"/g) ?? [];
    expect([...new Set(own)].sort()).toEqual([...(exceptions[file] ?? [])].sort());
  });

  it('has no two identical drawings', () => {
    const seen = new Map<string, string>();
    for (const file of files) {
      const drawing = readFileSync(join(svgRoot, file), 'utf8').replace(/\s+/g, ' ');
      expect(seen.get(drawing), `${file} repeats ${seen.get(drawing)}`).toBeUndefined();
      seen.set(drawing, file);
    }
  });

  it('registers every file, and every key has a file', () => {
    expect(rbmIconNames.map((n) => n.replace('.', '/') + '.svg').sort()).toEqual([...files].sort());
  });
});

describe('the ban on @mui/icons-material (Icon suite rule 1)', () => {
  it('is not imported anywhere outside src/icons', () => {
    const src = join(__dirname, '..');
    const demo = join(src, '..', 'demo');
    const importers = [...walk(src), ...walk(demo)]
      .filter((f) => !f.startsWith(__dirname))
      .filter((f) => /['"]@mui\/icons-material/.test(readFileSync(f, 'utf8')));
    expect(importers).toEqual([]);
  });
});

describe('RbmIcon', () => {
  it('is decorative by default: hidden from screen readers', () => {
    const { container } = render(<RbmIcon name="nav.list" />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
  });

  it('has a name when it carries meaning alone', () => {
    render(<RbmIcon name="shell.notifications" title="Notifications" />);
    expect(screen.getByRole('img', { name: 'Notifications' })).not.toHaveAttribute('aria-hidden');
  });

  it('draws the registered drawing in currentColor', () => {
    const { container } = render(<RbmIcon name="nav.folder" />);
    const svg = container.querySelector('svg')!;
    expect(iconDrawing('nav.folder')).toContain(svg.querySelector('path')!.getAttribute('d'));
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('is 24 px outside a density region (D1 Comfortable)', () => {
    const { container } = render(<RbmIcon name="nav.list" />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '24');
  });

  it.each(Object.keys(density) as DensityLevel[])('takes its size from the density at %s', (level) => {
    const { container } = render(
      <RbmDensity level={level}>
        <RbmIcon name="nav.list" />
      </RbmDensity>,
    );
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('width', String(density[level].icon));
    // 2.25 in the grid at 16 px (1.5 px drawn), as on the board; 2 at the other sizes.
    expect(svg).toHaveAttribute('stroke-width', density[level].icon <= 16 ? '2.25' : '2');
  });

  it('takes a size when one is given', () => {
    const { container } = render(<RbmIcon name="nav.list" size={14} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '14');
  });

  it.each(rbmIconNames)('draws %s', (name: RbmIconName) => {
    const { container } = render(<RbmIcon name={name} />);
    expect(container.querySelector('svg')!.childElementCount).toBeGreaterThan(0);
  });
});

describe('RbmIconButton with a registry icon', () => {
  it('draws the icon, hidden, and takes its name from the label', () => {
    render(<RbmIconButton name="display.close" label="Close panel" />);
    const button = screen.getByRole('button', { name: 'Close panel' });
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'display.close');
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

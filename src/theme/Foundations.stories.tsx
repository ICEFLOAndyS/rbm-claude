import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { Box, Typography, useTheme, type TypographyProps } from '@mui/material';
import { RbmStatusPill } from '../components/RbmStatusPill/RbmStatusPill';
import { colour, elevation, radius, status, type ColourName, type RbmState } from './tokens';

/** Token pages laid out as on the Foundations board. Every value is read from the tokens or the theme. */
const meta: Meta = {
  title: 'Foundations/Tokens',
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

function Section({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 1280, mb: 12 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>
          {eyebrow}
        </Typography>
        <Typography variant="h2" component="h2" sx={{ color: 'primary.main' }}>
          {title}
        </Typography>
        {intro && (
          <Typography sx={{ color: 'text.secondary', maxWidth: 820 }}>{intro}</Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

function Group({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h3" component="h3">
        {title}
      </Typography>
      {intro && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{intro}</Typography>}
      {children}
    </Box>
  );
}

function Grid({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 4 }}>{children}</Box>
  );
}

// ---- Colour -------------------------------------------------------------

const colourGroups: { title: string; intro?: string; columns: number; swatches: [ColourName, string, string][] }[] = [
  {
    title: 'Brand blues',
    columns: 5,
    swatches: [
      ['deepBlue', 'Deep Blue', 'Primary. Headings, app bar'],
      ['blueDark', 'Blue Dark', 'Links, focus, selection, In progress'],
      ['blueBase', 'Blue Base', 'Panels, accents. Not for small text'],
      ['blueMid', 'Blue Mid', 'Supporting accent (reserve)'],
      ['blueLight', 'Blue Light', 'Labels on Deep Blue'],
    ],
  },
  {
    title: 'Signal colours (from the logo mark)',
    columns: 6,
    swatches: [
      ['red', 'Red', 'Dots, Blocked'],
      ['redInner', 'Red Inner', 'Ring centre, Blocked text'],
      ['amber', 'Amber', 'Dots, At risk'],
      ['amberInner', 'Amber Inner', 'Ring centre'],
      ['green', 'Green', 'CTA, pills, Complete'],
      ['yellow', 'Yellow', 'Green ring centre'],
    ],
  },
  {
    title: 'Neutrals',
    columns: 6,
    swatches: [
      ['white', 'White', 'Page background'],
      ['mist', 'Mist', 'Cards, table stripes'],
      ['rule', 'Rule', 'Dividers, borders'],
      ['silver', 'Silver', 'Not started status'],
      ['slate', 'Slate', 'Secondary text, captions'],
      ['ink', 'Ink', 'Body text, headings'],
    ],
  },
  {
    title: 'Text-safe tints',
    intro: 'Signal colours are too light for small text on white. Use these darker tints for labels and status text.',
    columns: 4,
    swatches: [
      ['greenText', 'Green Text', 'Large text and quote marks only'],
      ['greenDeep', 'Green Deep', 'Complete status text'],
      ['amberDeep', 'Amber Deep', 'At risk status text'],
      ['redInner', 'Red Inner', 'Blocked status text'],
    ],
  },
];

function Swatch({ token, name, use }: { token: ColourName; name: string; use: string }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.control}px`, overflow: 'hidden', bgcolor: 'background.paper' }}>
      <Box sx={{ height: 64, bgcolor: colour[token], borderBottom: 1, borderColor: 'divider' }} />
      <Box sx={{ px: 3, py: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{name}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 12, color: 'primary.light' }}>
          {colour[token]} · <code>{token}</code>
        </Typography>
        <Typography variant="caption" sx={{ lineHeight: 1.35 }}>
          {use}
        </Typography>
      </Box>
    </Box>
  );
}

const combinations: { fg: ColourName; alt?: ColourName; bg: ColourName }[] = [
  { fg: 'ink', bg: 'white' },
  { fg: 'deepBlue', bg: 'mist' },
  { fg: 'white', alt: 'blueLight', bg: 'deepBlue' },
  { fg: 'deepBlue', bg: 'green' },
];

export const Colour: Story = {
  render: () => (
    <Section
      eyebrow="02 · Colour"
      title="Colour palette"
      intro="Deep Blue and white do most of the work. Signal colours come from the logo mark and are used sparingly: dots, status and highlights."
    >
      {colourGroups.map((g) => (
        <Group key={g.title} title={g.title} intro={g.intro}>
          <Grid columns={g.columns}>
            {g.swatches.map(([token, name, use]) => (
              <Swatch key={token} token={token} name={name} use={use} />
            ))}
          </Grid>
        </Group>
      ))}
      <Group title="Approved combinations">
        <Grid columns={4}>
          {combinations.map(({ fg, alt, bg }) => (
            <Box
              key={`${fg}-${bg}`}
              sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, p: 5, bgcolor: colour[bg], display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              <Typography sx={{ fontSize: 24, fontWeight: 700, color: colour[fg] }}>
                Aa{alt && <Box component="span" sx={{ color: colour[alt], ml: 2 }}>Aa</Box>}
              </Typography>
              <Typography sx={{ fontSize: 12, color: colour[alt ?? fg] }}>
                {colour[fg]}
                {alt && ` / ${colour[alt]}`} on {colour[bg]}
              </Typography>
            </Box>
          ))}
        </Grid>
      </Group>
    </Section>
  ),
};

// ---- Status -------------------------------------------------------------

const states: RbmState[] = ['complete', 'active', 'atRisk', 'paused', 'blocked', 'pending', 'skipped'];

function Row({ cells, header = false }: { cells: ReactNode[]; header?: boolean }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '160px 120px 120px 120px 120px minmax(0, 1fr)',
        gap: 4,
        alignItems: 'center',
        minHeight: 52,
        px: 4,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        fontSize: 14,
        fontWeight: header ? 700 : 400,
        color: header ? 'text.secondary' : 'text.primary',
      }}
    >
      {cells.map((c, i) => (
        <Box key={i}>{c}</Box>
      ))}
    </Box>
  );
}

export const Status: Story = {
  render: function StatusStory() {
    const { palette } = useTheme();
    return (
      <Section
        eyebrow="Semantic colour"
        title="Status"
        intro="One token set, read by every component from theme.palette.status. A text label is always shown: colour is never the only signal. Brand Green means Complete only."
      >
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, overflow: 'hidden', bgcolor: 'background.paper' }}>
          <Row header cells={['State', 'Signal', 'Text', 'Core', 'On dark', 'Pill']} />
          {states.map((s) => {
            const t = palette.status[s];
            return (
              <Row
                key={s}
                cells={[
                  <><b>{t.label}</b> <code>{s}</code></>,
                  t.signal,
                  t.text,
                  t.core ?? '–',
                  t.onDark ?? '–',
                  <RbmStatusPill state={s} />,
                ]}
              />
            );
          })}
        </Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Stock MUI colours follow the same meanings: success {palette.success.main} (Complete), info {palette.info.main} (In progress),
          warning {palette.warning.main} (At risk, Paused), error {palette.error.main} (Blocked). On-dark values are drawn for Active only.
        </Typography>
      </Section>
    );
  },
};

// ---- Typography ---------------------------------------------------------

const typeRows: { name: string; spec: string; variant: TypographyProps['variant']; sample: string; proposed?: boolean }[] = [
  { name: 'Display', spec: '58 px · 800 · −3.5%', variant: 'display', sample: 'Cutover readiness' },
  { name: 'Page heading · h1', spec: '37 px · 800 · −3%', variant: 'h1', sample: 'Plan, prepare, run' },
  { name: 'Pull quote · h2', spec: '28 px · 700 · −2.5%', variant: 'h2', sample: 'Phase 2: Migrate data' },
  { name: 'Intro / lead', spec: '20 px · 400 · Slate', variant: 'lead', sample: 'Introductory paragraph that sets up the page.' },
  { name: 'Subheading · h3', spec: '17 px · 700 · Deep Blue', variant: 'h3', sample: 'Run sheet' },
  { name: 'Body', spec: '16 px · 400 · 1.6 leading', variant: 'body1', sample: 'Body copy for reading: task notes, guidance and descriptions.' },
  { name: 'Compact body', spec: '14 px · 400 · 1.4 leading. See Density.', variant: 'body2', sample: 'Table and form text for the working surface of the application.', proposed: true },
  { name: 'Eyebrow label', spec: '12 px · 700 · +8% · caps', variant: 'overline', sample: '03 · Run sheet' },
  { name: 'Caption', spec: '12 px · 400 · Slate', variant: 'caption', sample: 'Figure 1. Caption or helper text' },
  { name: 'Figures', spec: 'Inter tabular numerals · 500', variant: 'figures', sample: 'T-02:15 · RB-0147 · 00:45:00', proposed: true },
];

function Proposed() {
  return (
    <Box
      component="span"
      sx={{ ml: 2, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: 1, borderColor: 'primary.main', color: 'primary.main', borderRadius: `${radius.pill}px`, px: 2, py: 0.25 }}
    >
      Proposed
    </Box>
  );
}

export const TypographyScale: Story = {
  name: 'Typography',
  render: () => (
    <Section
      eyebrow="03 · Typography"
      title="Inter"
      intro="Inter throughout. Headings are set tight with negative letter-spacing; labels are uppercase with open tracking. IDs and times use Inter's tabular figures."
    >
      <Box>
        {typeRows.map((r) => (
          <Box key={r.name} sx={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 6, alignItems: 'baseline', py: 4, borderBottom: 1, borderColor: 'divider' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                {r.name}
                {r.proposed && <Proposed />}
              </Typography>
              <Typography variant="caption" component="div">
                {r.spec} · <code>{r.variant}</code>
              </Typography>
            </Box>
            <Typography variant={r.variant} component="div">
              {r.sample}
            </Typography>
          </Box>
        ))}
      </Box>
    </Section>
  ),
};

// ---- Shape and spacing --------------------------------------------------

const spacingSteps = [1, 2, 3, 4, 6, 8, 12];

function Sample({ label, sx }: { label: string; sx: object }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}>
      <Box sx={{ width: 72, height: 56, ...sx }} />
      {label}
    </Box>
  );
}

export const ShapeAndSpacing: Story = {
  name: 'Shape and spacing',
  render: function ShapeStory() {
    const theme = useTheme();
    return (
      <Section eyebrow="04 · Layout and theme" title="Shape and spacing">
        <Grid columns={3}>
          <Group title="Spacing" intro="4 px base unit, theme.spacing(n).">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {spacingSteps.map((n) => (
                <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 14 }}>
                  <Box sx={{ width: theme.spacing(n), height: 16, bgcolor: 'primary.light' }} />
                  {n} · {parseInt(theme.spacing(n), 10)}
                </Box>
              ))}
            </Box>
          </Group>
          <Group title="Radius" intro="CTA 12 px and figure card 14 px come from the guide. Pills are fully rounded.">
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Sample label={`${radius.control} · CTA, inputs`} sx={{ bgcolor: 'grey.100', border: `1px solid ${colour.silver}`, borderRadius: `${radius.control}px` }} />
              <Sample label={`${radius.card} · cards`} sx={{ bgcolor: 'grey.100', border: `1px solid ${colour.silver}`, borderRadius: `${radius.card}px` }} />
              <Sample label="Pill" sx={{ bgcolor: 'secondary.main', borderRadius: `${radius.pill}px` }} />
            </Box>
          </Group>
          <Group title="Elevation (Proposed)" intro="Rule borders first. Shadow only for overlays.">
            <Box sx={{ display: 'flex', gap: 4 }}>
              <Sample label="0 · card" sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: `${radius.card}px` }} />
              <Sample label="1 · menu" sx={{ bgcolor: 'background.paper', borderRadius: `${radius.card}px`, boxShadow: elevation.menu }} />
              <Sample label="2 · dialog" sx={{ bgcolor: 'background.paper', borderRadius: `${radius.card}px`, boxShadow: elevation.dialog }} />
            </Box>
          </Group>
        </Grid>
      </Section>
    );
  },
};

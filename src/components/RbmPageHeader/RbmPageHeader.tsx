import { useId, useState } from 'react';
import { Box, Breadcrumbs, Button, ButtonBase, Link, Menu, MenuItem } from '@mui/material';
import { RbmIcon } from '../../icons/RbmIcon';
import type { RbmIconName } from '../../icons/registry';
import { RbmStatusPill } from '../RbmStatusPill/RbmStatusPill';
import { RbmActionButton } from '../RbmActionButton/RbmActionButton';
import { useDensity } from '../../theme/RbmDensity';
import { colour, shellSize, stroke, type RbmState } from '../../theme/tokens';

/**
 * The page header (App shell board, "Page header"). Every page starts the same way:
 *
 *   context row   programme (with a switcher) and, on event pages, the event with its status pill
 *   breadcrumb    the parents as links, then the page (not a link); at most four levels
 *   title         with its status pill beside it, when the page has a status
 *   metadata      one line
 *   actions       on the right: secondary first, then at most one green call to action
 *
 * Its sizes are the board's (page chrome keeps its drawn sizes); the title follows the shell's table
 * (28, 24, 20 px) and buttons the density's control height.
 */

export interface RbmCrumb {
  label: string;
  href: string;
}

/** The parents of the page, at most three, so the breadcrumb (with the page) is at most four levels. */
export type RbmCrumbs = readonly [] | readonly [RbmCrumb] | readonly [RbmCrumb, RbmCrumb] | readonly [RbmCrumb, RbmCrumb, RbmCrumb];

export interface RbmPageAction {
  label: string;
  onClick: () => void;
  icon?: RbmIconName;
  disabled?: boolean;
}

export interface RbmProgramme {
  id: string;
  name: string;
}

export interface RbmPageHeaderProps {
  title: string;
  /** The page's status, beside the title. Pages without a status leave it out. */
  status?: { state: RbmState; label?: string };
  /** The parents, as links. The page itself is added as the last crumb. */
  breadcrumb?: RbmCrumbs;
  /** One line under the title. Anything longer belongs in the page body. */
  metadata?: string;
  /** The programme, and the others to switch to. Without `programmes` there is no switcher. */
  programme?: RbmProgramme;
  programmes?: readonly RbmProgramme[];
  onProgrammeChange?: (id: string) => void;
  /** On event pages: the event and its status. */
  event?: { name: string; state: RbmState; stateLabel?: string };
  /** Secondary actions, shown first. */
  actions?: readonly RbmPageAction[];
  /** The green call to action, shown last. One per page. */
  primaryAction?: RbmPageAction;
}

/** The context row's label: the eyebrow type, as drawn. */
function Eyebrow({ children }: { children: string }) {
  return (
    <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: colour.slate }}>
      {children}
    </Box>
  );
}

function ProgrammeSwitcher({ programme, programmes, onChange }: { programme: RbmProgramme; programmes?: readonly RbmProgramme[]; onChange?: (id: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const name = (
    <Box component="strong" sx={{ color: colour.deepBlue }}>
      {programme.name}
    </Box>
  );
  if (!programmes || programmes.length < 2) {
    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13 }}>
        <Eyebrow>Programme</Eyebrow>
        {name}
      </Box>
    );
  }
  return (
    <>
      <ButtonBase
        aria-label={`Programme: ${programme.name}. Change programme`}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? menuId : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, borderRadius: '6px', '&.Mui-focusVisible': { outline: `${stroke.thick}px solid ${colour.blueDark}`, outlineOffset: 2 } }}
      >
        <Eyebrow>Programme</Eyebrow>
        {name}
        <Box component="span" sx={{ display: 'inline-flex', color: colour.slate }}>
          <RbmIcon name="display.next" size={16} />
        </Box>
      </ButtonBase>
      {/* The switcher's menu is not drawn: MUI's menu. */}
      <Menu id={menuId} anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} slotProps={{ list: { 'aria-label': 'Programmes' } }}>
        {programmes.map((p) => (
          <MenuItem
            key={p.id}
            selected={p.id === programme.id}
            onClick={() => {
              setAnchor(null);
              if (p.id !== programme.id) onChange?.(p.id);
            }}
          >
            {p.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function ActionButton({ action, primary }: { action: RbmPageAction; primary?: boolean }) {
  // Secondary actions are the Icon suite's action button, with the icon and the word (Andy Smith, 23 Oct 2026:
  // every Edit uses it). The one call to action stays the green CTA.
  if (!primary) return <RbmActionButton icon={action.icon} label={action.label} onClick={action.onClick} disabled={action.disabled} />;
  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={action.onClick}
      disabled={action.disabled}
      startIcon={action.icon ? <RbmIcon name={action.icon} size={16} /> : undefined}
      sx={{ whiteSpace: 'nowrap' }}
    >
      {action.label}
    </Button>
  );
}

export function RbmPageHeader({ title, status, breadcrumb = [], metadata, programme, programmes, onProgrammeChange, event, actions = [], primaryAction }: RbmPageHeaderProps) {
  const d = useDensity();
  const hasContext = !!programme || !!event;
  const hasActions = actions.length > 0 || !!primaryAction;
  return (
    <Box component="header" sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 320px' }}>
        {hasContext && (
          <Box role="group" aria-label="Context" sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {programme && <ProgrammeSwitcher programme={programme} programmes={programmes} onChange={onProgrammeChange} />}
            {programme && event && <Box aria-hidden sx={{ width: '1px', height: 16, bgcolor: colour.silver }} />}
            {event && (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13 }}>
                <Eyebrow>Event</Eyebrow>
                <Box component="strong" sx={{ color: colour.deepBlue }}>
                  {event.name}
                </Box>
                <RbmStatusPill state={event.state} label={event.stateLabel} size="compact" />
              </Box>
            )}
          </Box>
        )}
        <Breadcrumbs
          aria-label="Breadcrumb"
          separator={<Box component="span" sx={{ color: colour.silver }}>/</Box>}
          sx={{ fontSize: 13, fontWeight: 600, '& .MuiBreadcrumbs-separator': { mx: 1 } }}
        >
          {breadcrumb.map((c) => (
            <Link key={c.href} href={c.href} underline="hover" sx={{ color: colour.deepBlue, fontWeight: 600 }}>
              {c.label}
            </Link>
          ))}
          <Box component="span" aria-current="page" sx={{ color: colour.slate }}>
            {title}
          </Box>
        </Breadcrumbs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
          <Box component="h1" sx={{ m: 0, fontSize: shellSize[d.level].pageTitle, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.025em', color: colour.ink, minWidth: 0, overflowWrap: 'anywhere' }}>
            {title}
          </Box>
          {status && <RbmStatusPill state={status.state} label={status.label} size="compact" />}
        </Box>
        {metadata && (
          <Box title={metadata} sx={{ fontSize: 13, color: colour.slate, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metadata}
          </Box>
        )}
      </Box>
      {hasActions && (
        <Box role="group" aria-label="Page actions" sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>
          {actions.map((a) => (
            <ActionButton key={a.label} action={a} />
          ))}
          {primaryAction && <ActionButton action={primaryAction} primary />}
        </Box>
      )}
    </Box>
  );
}

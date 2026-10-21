import { Box, ButtonBase, FormControlLabel, Menu, MenuItem, Popover, Radio, RadioGroup, useTheme } from '@mui/material';
import { useId, useRef, useState, type ReactNode } from 'react';
import { colour, elevation, hairline, radius } from '../../theme/tokens';

/** The one next step a row offers. The page shows it only when the API says the user may use it. */
export type RbmTaskActionKind = 'start' | 'complete' | 'result' | 'resume' | 'view' | 'undo';

/** The exceptions behind the caret on Complete. */
export type RbmCompleteOption = 'completeAt' | 'completeWithNote' | 'pause' | 'skip';

export type RbmCheckpointResult = 'pass' | 'fail' | 'passWithComment';

/**
 * What the user chose. Items ending in "…" (complete at, with note, skip, pass with comment)
 * need more input, which the page collects before it calls the API.
 */
export type RbmTaskActionEvent =
  | { type: 'start' | 'complete' | 'resume' | 'view' | 'undo' }
  | { type: RbmCompleteOption }
  | { type: 'result'; result: RbmCheckpointResult };

export interface RbmTaskActionProps {
  action: RbmTaskActionKind;
  /** WBS and title, for the buttons' full names, for example "Complete task 1.3.5 Startup application UI". */
  wbs: string;
  title: string;
  kind?: 'task' | 'milestone' | 'checkpoint';
  /** Allowed exceptions in the Complete menu. Complete now is always there. */
  completeOptions?: RbmCompleteOption[];
  /** Shown in the menu as "Actual end 03:41". */
  now?: Date;
  timeZone?: string;
  onAction: (event: RbmTaskActionEvent) => void;
}

const allOptions: RbmCompleteOption[] = ['completeAt', 'completeWithNote', 'pause', 'skip'];

function Icon({ size, width, children }: { size: number; width: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

const tick = <path d="M5 12.5l4.5 4.5L19 7" />;
const play = <path d="M8 5l11 7-11 7z" />;
const note = (
  <>
    <path d="M5 4h14v12l-5 5H5z" />
    <path d="M14 21v-5h5M8 9h8M8 13h4" />
  </>
);

// Every action button is 120 by 32 px whatever the label; a long label is cut, never widened.
const shell = {
  width: 120,
  height: 32,
  borderRadius: `${radius.control}px`,
  fontFamily: 'inherit',
  fontSize: 13,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  overflow: 'hidden',
  flex: 'none',
} as const;

function Label({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, minWidth: 0, maxWidth: '100%', px: 0.5 }}>
      {icon}
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {text}
      </Box>
    </Box>
  );
}

const menuPaper = {
  width: 270,
  maxWidth: 'calc(100vw - 32px)',
  border: 1,
  borderColor: 'divider',
  borderRadius: `${radius.control}px`,
  boxShadow: elevation.menu,
};

function timeOf(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date);
}

/** The row's action button, as drawn on the Command board ("Acting on tasks"). */
export function RbmTaskAction({ action, wbs, title, kind = 'task', completeOptions = allOptions, now, timeZone, onAction }: RbmTaskActionProps) {
  const { palette } = useTheme();
  const anchor = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<RbmCheckpointResult | null>(null);
  const titleId = useId();
  const taskName = `${wbs} ${title}`;
  const noun = kind === 'checkpoint' ? 'checkpoint' : kind === 'milestone' ? 'milestone' : 'task';

  const neutral = { ...shell, border: `1px solid ${colour.silver}`, bgcolor: colour.white, color: colour.deepBlue, fontWeight: 700 };

  if (action === 'start') {
    return (
      <ButtonBase aria-label={`Start ${noun} ${taskName}`} onClick={() => onAction({ type: 'start' })} sx={{ ...shell, border: `1.5px solid ${palette.status.active.signal}`, bgcolor: colour.white, color: palette.status.active.signal, fontWeight: 700 }}>
        <Label icon={<Icon size={14} width={2.5}>{play}</Icon>} text="Start" />
      </ButtonBase>
    );
  }
  if (action === 'resume') {
    return (
      <ButtonBase aria-label={`Resume ${noun} ${taskName}`} onClick={() => onAction({ type: 'resume' })} sx={neutral}>
        <Label icon={<Icon size={14} width={2.5}>{play}</Icon>} text="Resume" />
      </ButtonBase>
    );
  }
  if (action === 'view') {
    return (
      <ButtonBase aria-label={`View the blocker on ${noun} ${taskName}`} onClick={() => onAction({ type: 'view' })} sx={{ ...neutral, gap: '2px' }}>
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>View</Box>
        <Icon size={14} width={2.5}><path d="M9 6l6 6-6 6" /></Icon>
      </ButtonBase>
    );
  }
  if (action === 'undo') {
    return (
      <ButtonBase aria-label={`Undo complete on ${noun} ${taskName}`} onClick={() => onAction({ type: 'undo' })} sx={{ ...neutral, color: palette.status.active.signal }}>
        <Label
          icon={
            <Icon size={15} width={2.5}>
              <path d="M9 8L4 13l5 5" />
              <path d="M4 13h10a6 6 0 000-12" transform="translate(0 6)" />
            </Icon>
          }
          text="Undo"
        />
      </ButtonBase>
    );
  }

  // Complete and Result: Green split buttons. The caret is 28 px inside the 120.
  const isResult = action === 'result';
  const mainLabel = isResult ? `Record a result for ${noun} ${taskName}` : `Complete ${noun} ${taskName}`;
  const openResult = () => {
    setResult(null);
    setResultOpen(true);
  };
  const options = completeOptions.filter((o) => allOptions.includes(o));
  type MenuItemDef = { type: 'complete' | RbmCompleteOption; icon: ReactNode; text: string; sub?: string; quiet?: boolean };
  const allItems: MenuItemDef[] = [
    { type: 'complete', icon: tick, text: 'Complete now', sub: now ? `Actual end ${timeOf(now, timeZone)}` : undefined },
    { type: 'completeAt', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, text: 'Complete at…', sub: 'Back-date the actual end' },
    { type: 'completeWithNote', icon: note, text: 'Complete with note…' },
    { type: 'pause', icon: <path d="M9 6v12M15 6v12" />, text: 'Pause' },
    { type: 'skip', icon: <path d="M5 5l9 7-9 7zM18 5v14" />, text: 'Skip task…', sub: 'A reason is required', quiet: true },
  ];
  const menuItems = allItems.filter((i) => i.type === 'complete' || options.includes(i.type));

  return (
    <>
      <Box ref={anchor} sx={{ ...shell, display: 'inline-flex', alignItems: 'stretch', bgcolor: colour.green, border: `1px solid ${colour.green}`, color: colour.deepBlue, fontWeight: 800 }}>
        <ButtonBase aria-label={mainLabel} onClick={() => (isResult ? openResult() : onAction({ type: 'complete' }))} sx={{ flex: 1, minWidth: 0, height: '100%', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: 'inherit' }}>
          <Label icon={<Icon size={15} width={3}>{tick}</Icon>} text={isResult ? 'Result' : 'Complete'} />
        </ButtonBase>
        <ButtonBase
          aria-label={isResult ? `Result options for ${noun} ${taskName}` : `More ways to complete ${noun} ${taskName}`}
          aria-haspopup={isResult ? 'dialog' : 'menu'}
          aria-expanded={isResult ? resultOpen : menuOpen}
          onClick={() => (isResult ? openResult() : setMenuOpen(true))}
          sx={{ width: 28, flex: 'none', height: '100%', borderLeft: `1px solid rgba(35,50,111,0.3)`, color: 'inherit' }}
        >
          <Icon size={14} width={3}><path d="M6 9l6 6 6-6" /></Icon>
        </ButtonBase>
      </Box>

      {!isResult && (
        <Menu
          open={menuOpen}
          anchorEl={anchor.current}
          onClose={() => setMenuOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { ...menuPaper, mt: 1.5 } }, list: { 'aria-label': `Complete ${taskName}`, sx: { py: 0 } } }}
        >
          {menuItems.map((i, n) => (
            <MenuItem
              key={i.type}
              onClick={() => {
                setMenuOpen(false);
                onAction({ type: i.type });
              }}
              sx={{ gap: 3, minHeight: 40, px: 4, py: 1.5, fontSize: 13, fontWeight: 600, color: i.quiet ? 'text.secondary' : 'text.primary', borderTop: n > 0 ? `1px solid ${hairline}` : 0, '&.Mui-focusVisible': { outlineOffset: -2 } }}
            >
              <Icon size={18} width={1.75}>{i.icon}</Icon>
              <Box component="span" sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span>{i.text}</span>
                {i.sub && <Box component="span" sx={{ fontSize: 12, fontWeight: 400, color: 'text.secondary' }}>{i.sub}</Box>}
              </Box>
            </MenuItem>
          ))}
        </Menu>
      )}

      {isResult && (
        <Popover
          open={resultOpen}
          anchorEl={anchor.current}
          onClose={() => setResultOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId, sx: { ...menuPaper, mt: 1.5 } } }}
        >
          <Box id={titleId} sx={{ px: 4, py: 3.5, fontSize: 13, fontWeight: 800, color: 'primary.main' }}>
            Result for {wbs} · {title}
          </Box>
          <RadioGroup aria-labelledby={titleId} value={result ?? ''} onChange={(e) => setResult(e.target.value as RbmCheckpointResult)}>
            {(
              [
                ['pass', 'Pass', <Icon key="p" size={18} width={3}>{tick}</Icon>, palette.status.complete.text],
                ['fail', 'Fail', <Icon key="f" size={18} width={3}><path d="M6 6l12 12M18 6L6 18" /></Icon>, palette.status.blocked.text],
                ['passWithComment', 'Pass with comment', <Icon key="c" size={18} width={3}>{note}</Icon>, palette.text.secondary],
              ] as const
            ).map(([value, text, icon, iconColour]) => (
              <FormControlLabel
                key={value}
                value={value}
                control={
                  <Radio
                    disableRipple
                    icon={<Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${colour.silver}`, boxSizing: 'border-box' }} />}
                    checkedIcon={
                      <Box component="span" sx={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${palette.status.active.signal}`, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: palette.status.active.signal }} />
                      </Box>
                    }
                    sx={{ p: 0 }}
                  />
                }
                label={
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 14, fontWeight: 600 }}>
                    <Box component="span" sx={{ color: iconColour, display: 'inline-flex' }}>{icon}</Box>
                    {text}
                  </Box>
                }
                sx={{ m: 0, gap: 3, height: 40, px: 4, borderTop: `1px solid ${hairline}` }}
              />
            ))}
          </RadioGroup>
          <Box sx={{ px: 4, py: 3, borderTop: `1px solid ${hairline}`, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <ButtonBase onClick={() => setResultOpen(false)} sx={{ height: 36, px: 4.5, borderRadius: `${radius.control}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: colour.deepBlue, bgcolor: colour.white, border: `1px solid ${colour.silver}` }}>
              Cancel
            </ButtonBase>
            <ButtonBase
              disabled={result === null}
              onClick={() => {
                setResultOpen(false);
                if (result) onAction({ type: 'result', result });
              }}
              sx={{ height: 36, px: 4.5, borderRadius: `${radius.control}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: colour.deepBlue, bgcolor: colour.green, border: `1px solid ${colour.green}`, '&.Mui-disabled': { bgcolor: colour.rule, borderColor: colour.rule, color: colour.slate } }}
            >
              Confirm
            </ButtonBase>
          </Box>
        </Popover>
      )}
    </>
  );
}

import { Box, ButtonBase } from '@mui/material';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import { colour, elevation, liftTint, radius } from '../../theme/tokens';

/** The three regions that move. The Page header and the Event vitals are fixed. */
export type RbmRegion = 'ribbon' | 'timeline' | 'hotTopics';

/** Reset to default puts the order back to Event ribbon, Task Timeline, Hot-topics strip. */
export const DEFAULT_LAYOUT: RbmRegion[] = ['ribbon', 'timeline', 'hotTopics'];

export const regionInfo: Record<RbmRegion, { name: string; detail: string }> = {
  ribbon: { name: 'Event ribbon', detail: 'One lane per runbook' },
  timeline: { name: 'Task Timeline', detail: 'The tasks that need attention' },
  hotTopics: { name: 'Hot-topics strip', detail: 'Blockers, checkpoint, milestones and more' },
};

const fixed = [
  { name: 'Page header', detail: 'Event, state, alerts and actions' },
  { name: 'Event vitals', detail: 'Progress, Issues, Start, Forecast end' },
];

export interface RbmLayoutPanelProps {
  order: RbmRegion[];
  /** Called with the new order when a row is dropped, and on Reset to default. The page re-orders at once. */
  onChange: (order: RbmRegion[]) => void;
  /** Done and the close button. */
  onClose?: () => void;
}

function Icon({ size = 16, stroke = colour.slate, children }: { size?: number; stroke?: string; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      {children}
    </svg>
  );
}

const rowSx = { display: 'flex', alignItems: 'center', gap: 3, height: 56, px: 3.5, borderRadius: `${radius.control}px`, boxSizing: 'border-box' } as const;

function Text({ name, detail, quiet }: { name: string; detail: string; quiet?: boolean }) {
  return (
    <Box component="span" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
      <Box component="span" sx={{ fontSize: 14, fontWeight: 800, color: quiet ? 'text.secondary' : 'text.primary' }}>{name}</Box>
      <Box component="span" sx={{ fontSize: 12, color: 'text.secondary' }}>{detail}</Box>
    </Box>
  );
}

function Grip() {
  return (
    <Box component="span" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 4px)', gap: '3px', flex: 'none' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: colour.silver }} />
      ))}
    </Box>
  );
}

const DropLine = () => <Box aria-hidden="true" data-testid="rbm-drop-line" sx={{ height: 4, borderRadius: `${radius.pill}px`, bgcolor: colour.blueDark, my: '-4px' }} />;

function SortableRow({ id, position, total, line, follow }: { id: RbmRegion; position: number; total: number; line?: 'before' | 'after'; follow: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({ id });
  const info = regionInfo[id];
  return (
    <>
      {line === 'before' && <DropLine />}
      <Box
        ref={setNodeRef}
        data-region={id}
        sx={{
          ...rowSx,
          bgcolor: isDragging ? liftTint : colour.white,
          border: isDragging ? `2px solid ${colour.blueDark}` : `1px solid ${colour.rule}`,
          boxShadow: isDragging ? '0 10px 24px rgba(35,50,111,0.22)' : 'none',
          // Only the lifted row moves, and only with the pointer; the others stay put and a blue line shows where it will land.
          transform: isDragging ? `${follow ? (CSS.Translate.toString(transform) ?? '') : ''} rotate(-0.6deg)` : undefined,
          position: 'relative',
          zIndex: isDragging ? 1 : 0,
        }}
      >
        <ButtonBase
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${info.name}, position ${position} of ${total}`}
          aria-roledescription="sortable"
          sx={{ width: 14, height: 32, display: 'inline-flex', justifyContent: 'center', borderRadius: 1, cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <Grip />
        </ButtonBase>
        <Text name={info.name} detail={info.detail} />
      </Box>
      {line === 'after' && <DropLine />}
    </>
  );
}

/**
 * The Layout panel, as drawn on the Command board: the Page header and Event vitals fixed at the
 * top, then the Event ribbon, Task Timeline and Hot-topics strip, dragged from the grip into any
 * order. From the keyboard, Space picks a row up, the arrow keys move it and Space drops it.
 */
export function RbmLayoutPanel({ order, onChange, onClose }: RbmLayoutPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const [active, setActive] = useState<RbmRegion | null>(null);
  const [over, setOver] = useState<RbmRegion | null>(null);
  const [byPointer, setByPointer] = useState(false);
  const name = (id: unknown) => regionInfo[id as RbmRegion]?.name ?? '';
  const pos = (id: unknown) => order.indexOf(id as RbmRegion) + 1;

  // What a screen reader hears while a row moves.
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Picked up ${name(a.id)}. It is in position ${pos(a.id)} of ${order.length}.`,
    onDragOver: ({ active: a, over: o }) => (o ? `${name(a.id)} moves to position ${pos(o.id)} of ${order.length}.` : `${name(a.id)} is not over a position.`),
    onDragEnd: ({ active: a, over: o }) => (o ? `${name(a.id)} dropped in position ${pos(o.id)} of ${order.length}.` : `${name(a.id)} dropped.`),
    onDragCancel: ({ active: a }) => `Moving ${name(a.id)} was cancelled. It is back in position ${pos(a.id)}.`,
  };

  const end = ({ active: a, over: o }: DragEndEvent) => {
    setActive(null);
    setOver(null);
    if (!o || a.id === o.id) return;
    onChange(arrayMove(order, order.indexOf(a.id as RbmRegion), order.indexOf(o.id as RbmRegion)));
  };
  const from = active ? order.indexOf(active) : -1;
  const to = over ? order.indexOf(over) : -1;
  const lineFor = (id: RbmRegion): 'before' | 'after' | undefined => (active && over && id === over && from !== to ? (to < from ? 'before' : 'after') : undefined);

  return (
    <Box role="dialog" aria-label="Layout" sx={{ border: 1, borderColor: 'divider', borderRadius: `${radius.card}px`, bgcolor: 'background.paper', boxShadow: elevation.menu, overflow: 'hidden', width: 380, maxWidth: '100%', lineHeight: 'normal' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 4, pt: 4, pb: 1 }}>
        <Box component="h2" sx={{ m: 0, fontSize: 16, fontWeight: 800, color: 'text.primary' }}>Layout</Box>
        {onClose && (
          <ButtonBase onClick={onClose} aria-label="Close" sx={{ borderRadius: 1 }}>
            <Icon size={18}><path d="M6 6l12 12M18 6L6 18" /></Icon>
          </ButtonBase>
        )}
      </Box>
      <Box sx={{ px: 4, pb: 3, fontSize: 13, lineHeight: 1.45, color: 'text.secondary' }}>Drag the regions into the order you prefer. Your layout is saved to your profile.</Box>

      <Box component="ul" aria-label="Fixed regions" sx={{ m: 0, p: 0, px: 4, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fixed.map((f) => (
          <Box component="li" key={f.name} sx={{ ...rowSx, bgcolor: 'grey.100', border: 1, borderColor: 'divider' }}>
            <Box component="span" sx={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>
              <Icon><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></Icon>
            </Box>
            <Text name={f.name} detail={f.detail} quiet />
            <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}>FIXED</Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 4, pt: 1, mt: 2, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>Drag to reorder</Box>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements, screenReaderInstructions: { draggable: 'Press Space to pick up the region. Use the arrow keys to move it, Space to drop it, or Escape to cancel.' } }}
        onDragStart={({ active: a, activatorEvent }: DragStartEvent) => {
          setActive(a.id as RbmRegion);
          setByPointer(!(activatorEvent instanceof KeyboardEvent));
        }}
        onDragOver={({ over: o }: DragOverEvent) => setOver((o?.id as RbmRegion) ?? null)}
        onDragEnd={end}
        onDragCancel={() => {
          setActive(null);
          setOver(null);
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <Box aria-label="Movable regions" role="list" sx={{ px: 4, pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {order.map((id, i) => (
              <Box key={id} role="listitem" sx={{ display: 'contents' }}>
                <SortableRow id={id} position={i + 1} total={order.length} line={lineFor(id)} follow={byPointer} />
              </Box>
            ))}
          </Box>
        </SortableContext>
      </DndContext>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4, mt: 1, borderTop: 1, borderColor: 'divider' }}>
        <ButtonBase onClick={() => onChange([...DEFAULT_LAYOUT])} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'primary.main', borderRadius: 1, px: 0.5 }}>
          <Icon stroke={colour.deepBlue}><path d="M9 8L4 13l5 5" /><path d="M4 13h10a6 6 0 000-12" transform="translate(0 6)" /></Icon>
          Reset to default
        </ButtonBase>
        {onClose && (
          <ButtonBase onClick={onClose} sx={{ height: 36, px: 4.5, borderRadius: `${radius.control}px`, fontFamily: 'inherit', fontSize: 13, fontWeight: 800, color: colour.deepBlue, bgcolor: colour.green, border: `1px solid ${colour.green}` }}>
            Done
          </ButtonBase>
        )}
      </Box>
    </Box>
  );
}

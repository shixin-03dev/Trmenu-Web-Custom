import { useState, useEffect, useRef } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent, pointerWithin, type Modifier } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { type TrMenuIcon } from '@/lib/types';
import { ItemRenderer } from './ItemRenderer';
import { MinecraftTooltip } from '@/components/ui/MinecraftTooltip';
import { parseMinecraftColors } from '@/lib/color-utils';
import { GripHorizontal } from 'lucide-react';

interface MenuGridProps {
  rows?: number;
  onSlotClick?: (index: number, e: React.MouseEvent) => void;
  selectedSlots?: Set<number>;
  slotContent: Record<number, { id: string, icon: TrMenuIcon }>;
  onMoveItem: (fromSlot: number, toSlot: number) => void;
  highlightedId?: string | null;
  title?: string | string[];
  titleUpdateInterval?: number;
  onRowsChange?: (rows: number) => void;
  zoom?: number;
}

export const MenuGrid = ({ 
  rows = 6, 
  onSlotClick,
  selectedSlots,
  slotContent,
  onMoveItem,
  highlightedId,
  title,
  titleUpdateInterval,
  onRowsChange,
  zoom = 1
}: MenuGridProps) => {
  const [localRows, setLocalRows] = useState(rows);
  const [isResizing, setIsResizing] = useState(false);
  const [currentTitleIndex, setCurrentTitleIndex] = useState(0);

  // Reset title index when title changes
  useEffect(() => {
    setCurrentTitleIndex(0);
  }, [title]);

  // Handle dynamic title updates
  useEffect(() => {
    if (!Array.isArray(title) || !titleUpdateInterval || titleUpdateInterval <= 0) {
      return;
    }

    const intervalMs = titleUpdateInterval * 50; // 1 tick = 0.05s = 50ms
    const interval = setInterval(() => {
      setCurrentTitleIndex(prev => (prev + 1) % title.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [title, titleUpdateInterval]);

  const displayTitle = Array.isArray(title) ? title[currentTitleIndex] : title;

  const startResizeY = useRef<number>(0);
  const startResizeRows = useRef<number>(rows);

  useEffect(() => {
    if (!isResizing) {
        setLocalRows(rows);
    }
  }, [rows, isResizing]);

  const totalSlots = localRows * 9;
  const slots = Array.from({ length: totalSlots }, (_, i) => i);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Tooltip State
  const [hoveredInfo, setHoveredInfo] = useState<{ name: string, lore: string[], x: number, y: number } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  const currentLocalRows = useRef(rows);
  useEffect(() => { currentLocalRows.current = localRows; }, [localRows]);

  // Reset tooltip when slot content changes (e.g. deletion)
  useEffect(() => {
    setHoveredInfo(null);
  }, [slotContent]);

  const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      startResizeY.current = e.clientY;
      startResizeRows.current = localRows;
      
      const handleMouseMove = (ev: MouseEvent) => {
          const deltaY = ev.clientY - startResizeY.current;
          const deltaRows = Math.round(deltaY / 52);
          const newRows = Math.max(1, Math.min(6, startResizeRows.current + deltaRows));
          setLocalRows(newRows);
      };
      
      const handleMouseUp = () => {
          setIsResizing(false);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          onRowsChange?.(currentLocalRows.current);
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setHoveredInfo(null); // Hide tooltip on drag
    // Select the slot when starting drag
    const slotIndex = parseInt((event.active.id as string).replace('item-', ''));
    if (!isNaN(slotIndex) && onSlotClick) {
        onSlotClick(slotIndex, {} as React.MouseEvent);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
       const fromSlot = parseInt((active.id as string).replace('item-', ''));
       const toSlot = parseInt((over.id as string).replace('slot-', ''));
       
       if (!isNaN(fromSlot) && !isNaN(toSlot) && fromSlot !== toSlot) {
         onMoveItem(fromSlot, toSlot);
       }
    }
  };

  const getActiveIcon = () => {
      if (!activeId) return null;
      const slotIndex = parseInt(activeId.replace('item-', ''));
      return slotContent[slotIndex]?.icon;
  };

  const activeIcon = getActiveIcon();

  const handleItemMouseEnter = (icon: TrMenuIcon, e: React.MouseEvent) => {
      if (activeId) return; // Don't show if dragging
      
      // Determine display material/name for tooltip logic (same as rendering logic)
      let name = icon.display?.name || '';
      const lore = icon.display?.lore || [];
      
      // Conditional fallback
      let mat = icon.display?.mats;
      const isAir = !mat || (typeof mat === 'string' && mat.toLowerCase() === 'air');
      if (isAir && icon.icons && icon.icons.length > 0) {
          const firstCond = icon.icons[0];
          if (firstCond.display) {
              name = firstCond.display.name || name;
          }
      }

      setHoveredInfo({
          name: typeof name === 'string' ? name : '',
          lore: Array.isArray(lore) ? lore : (typeof lore === 'string' ? [lore] : []),
          x: e.clientX,
          y: e.clientY
      });
  };

  const handleItemMouseMove = (e: React.MouseEvent) => {
      if (hoveredInfo) {
          setHoveredInfo(prev => prev ? ({ ...prev, x: e.clientX, y: e.clientY }) : null);
      }
  };

  const handleItemMouseLeave = () => {
      setHoveredInfo(null);
  };

  const scaleModifier: Modifier = ({ transform }) => ({
    ...transform,
    x: transform.x / zoom,
    y: transform.y / zoom,
  });

  return (
    <div className="flex flex-col items-center bg-secondary/50 p-4 rounded-lg border border-border/50 w-fit mx-auto select-none transition-all duration-200">
        {displayTitle && (
            <div className="mb-3 px-3 py-1.5 bg-black/40 rounded border border-white/10 shadow-sm min-w-[200px] text-center">
                {parseMinecraftColors(displayTitle).map((part, i) => (
                    <span key={i} style={part.style}>{part.text}</span>
                ))}
            </div>
        )}
        
        <DndContext 
            sensors={sensors} 
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd} 
            modifiers={[snapCenterToCursor, scaleModifier]}
            collisionDetection={pointerWithin}
        >
        <div className="grid grid-cols-9 gap-1">
            {slots.map((index) => {
            const content = slotContent[index];
            const isHighlighted = !!(highlightedId && content?.id === highlightedId);
            const isSelected = selectedSlots?.has(index);
            
            return (
                <MenuSlot 
                key={index} 
                index={index} 
                isSelected={isSelected}
                onClick={(e) => onSlotClick?.(index, e)}
                className={isHighlighted && !isSelected ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background z-10" : ""}
                >
                {content && (
                    <MenuItem 
                    id={`item-${index}`} 
                    icon={content.icon} 
                    isHighlighted={isHighlighted}
                    onMouseEnter={(e) => handleItemMouseEnter(content.icon, e)}
                    onMouseMove={handleItemMouseMove}
                    onMouseLeave={handleItemMouseLeave}
                    />
                )}
                </MenuSlot>
            );
            })}
        </div>
        <DragOverlay>
            {activeId && activeIcon ? (
            <div 
                className="w-10 h-10 bg-background/80 rounded-sm flex items-center justify-center shadow-xl cursor-grabbing border border-primary/50 z-50"
            >
                <ItemRenderer material={activeIcon.display.mats} className="w-8 h-8" shiny={activeIcon.display.shiny} />
            </div>
            ) : null}
        </DragOverlay>
        </DndContext>
        
        {onRowsChange && (
            <div 
                className="w-full h-4 mt-2 flex items-center justify-center cursor-ns-resize text-muted-foreground/50 hover:text-foreground hover:bg-white/5 rounded transition-colors active:text-primary group"
                onMouseDown={handleResizeStart}
                title="拖动调整行数"
            >
                <GripHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
        )}

        {hoveredInfo && (
            <MinecraftTooltip 
                visible={!!hoveredInfo}
                name={hoveredInfo.name}
                lore={hoveredInfo.lore}
                x={hoveredInfo.x}
                y={hoveredInfo.y}
            />
        )}
    </div>
  );
};

const MenuSlot = ({ children, index, isSelected, onClick, className }: { children: React.ReactNode, index: number, isSelected?: boolean, onClick?: (e: React.MouseEvent) => void, className?: string }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${index}`,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "w-12 h-12 bg-background border border-border rounded-md flex items-center justify-center relative transition-colors cursor-pointer hover:bg-accent/50",
        isSelected && "ring-2 ring-primary border-primary bg-accent z-20",
        isOver && "bg-primary/20 border-primary/50 ring-2 ring-primary/50",
        className
      )}
    >
      <span className="text-[10px] text-muted-foreground/50 absolute top-0.5 right-1 pointer-events-none">{index}</span>
      {children}
    </div>
  );
};

const MenuItem = ({ 
    id, 
    icon, 
    isHighlighted,
    onMouseEnter,
    onMouseMove,
    onMouseLeave
}: { 
    id: string, 
    icon: TrMenuIcon, 
    isHighlighted?: boolean | null,
    onMouseEnter?: (e: React.MouseEvent) => void,
    onMouseMove?: (e: React.MouseEvent) => void,
    onMouseLeave?: () => void
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
  });

  // Determine display material: use root display if not air, otherwise try first conditional icon
  let mat = icon.display?.mats;
  let shiny = icon.display?.shiny;
  // let name = icon.display?.name; // Removed usage of name for title attribute
  
  const isAir = !mat || (typeof mat === 'string' && mat.toLowerCase() === 'air');

  if (isAir && icon.icons && icon.icons.length > 0) {
      const firstCond = icon.icons[0];
      if (firstCond.display?.mats) {
          mat = firstCond.display.mats;
          shiny = firstCond.display.shiny;
          // name = firstCond.display.name;
      }
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        "w-10 h-10 rounded-sm flex items-center justify-center text-xs font-bold shadow-sm cursor-grab hover:scale-105 transition-transform z-10 overflow-hidden",
        isDragging ? "opacity-0" : "opacity-100",
        "bg-secondary border border-border/50 hover:bg-secondary/80 group",
        isHighlighted && "ring-2 ring-yellow-400 ring-offset-0 z-30 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]"
      )}
      // title={typeof name === 'string' ? name : mat} // Removed native tooltip
    >
       <ItemRenderer material={mat || 'barrier'} className="w-8 h-8 transition-transform group-hover:scale-110" shiny={shiny} />
       {icon.display?.amount && icon.display.amount > 1 && (
           <span className="absolute bottom-0 right-0 text-[10px] font-bold bg-black/50 text-white px-0.5 rounded-tl-sm leading-none">
               {icon.display.amount}
           </span>
       )}
    </div>
  );
};
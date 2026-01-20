import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Command, CornerDownLeft, Copy, Clipboard, MousePointer2 } from 'lucide-react';

interface ShortcutKeyProps {
  keys: string[];
  description: string;
  active?: boolean;
  icon?: React.ReactNode;
}

const ShortcutItem = ({ keys, description, active, icon }: ShortcutKeyProps) => {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 whitespace-nowrap",
      active ? "bg-primary text-primary-foreground shadow-md scale-105" : "bg-background/80 text-muted-foreground"
    )}>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <span className="text-xs mx-0.5 opacity-50">+</span>}
            <kbd className={cn(
              "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium transition-colors",
              active ? "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground" : "bg-muted border-border text-muted-foreground"
            )}>
              {key}
            </kbd>
          </span>
        ))}
      </div>
      {icon && <span className={cn("w-3 h-3", active ? "opacity-100" : "opacity-70")}>{icon}</span>}
      <span className="text-xs font-medium">{description}</span>
    </div>
  );
};

export const ShortcutHints = () => {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        if (e.key) {
            newSet.add(e.key.toLowerCase());
        }
        if (e.ctrlKey) newSet.add('control');
        if (e.metaKey) newSet.add('meta'); // Mac Command
        if (e.shiftKey) newSet.add('shift');
        if (e.altKey) newSet.add('alt');
        return newSet;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        if (e.key) {
            newSet.delete(e.key.toLowerCase());
        }
        // We don't remove modifiers immediately if they are still held? 
        // Actually keyup event for modifier fires when released.
        if (e.key === 'Control') newSet.delete('control');
        if (e.key === 'Meta') newSet.delete('meta');
        if (e.key === 'Shift') newSet.delete('shift');
        if (e.key === 'Alt') newSet.delete('alt');
        return newSet;
      });
    };
    
    // Mouse buttons are tricky to detect globally without blocking, 
    // but we can listen to mousedown/up for visualization if needed.
    const handleMouseDown = (e: MouseEvent) => {
         setPressedKeys(prev => {
            const newSet = new Set(prev);
            if (e.button === 0) newSet.add('click_left');
            return newSet;
         });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
         setPressedKeys(prev => {
            const newSet = new Set(prev);
            if (e.button === 0) newSet.delete('click_left');
            return newSet;
         });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const isCtrl = pressedKeys.has('control') || pressedKeys.has('meta');
  const isShift = pressedKeys.has('shift');
  const isZ = pressedKeys.has('z');
  const isC = pressedKeys.has('c');
  const isV = pressedKeys.has('v');
  const isClick = pressedKeys.has('click_left');

  return (
    <div className="absolute bottom-4 left-4 z-50 flex flex-col gap-2 select-none pointer-events-none">
      <div className="flex flex-col gap-1.5 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ShortcutItem 
            keys={['Ctrl', 'Z']} 
            description="撤销" 
            active={isCtrl && isZ}
            icon={<CornerDownLeft className="h-3 w-3" />}
        />
        <ShortcutItem 
            keys={['Ctrl', 'C']} 
            description="复制选中" 
            active={isCtrl && isC}
            icon={<Copy className="h-3 w-3" />}
        />
        <ShortcutItem 
            keys={['Ctrl', 'V']} 
            description="粘贴图标" 
            active={isCtrl && isV}
            icon={<Clipboard className="h-3 w-3" />}
        />
        <ShortcutItem 
            keys={['Shift', 'Click']} 
            description="区域选择" 
            active={isShift && isClick}
            icon={<MousePointer2 className="h-3 w-3" />}
        />
         <ShortcutItem 
            keys={['Ctrl', 'Click']} 
            description="多选/反选" 
            active={isCtrl && isClick}
            icon={<Command className="h-3 w-3" />}
        />
      </div>
    </div>
  );
};

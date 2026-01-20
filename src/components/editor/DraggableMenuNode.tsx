import { useDraggable } from '@dnd-kit/core';
import { SingleMenuEditor, type SingleMenuEditorHandle } from './SingleMenuEditor';
import { cn } from '@/lib/utils';
import { GripVertical, Settings } from 'lucide-react';
import { forwardRef, type ForwardedRef, memo, useRef, useEffect } from 'react';
import { type TrMenuConfiguration } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface DraggableMenuNodeProps {
    id: string;
    name: string;
    x: number;
    y: number;
    isActive: boolean;
    onActivate: () => void;
    readOnly?: boolean;
    // SingleMenuEditor props
    initialConfig?: TrMenuConfiguration;
    onConfigChange?: (config: TrMenuConfiguration) => void;
    onDirtyChange?: (dirty: boolean) => void;
    openMenus?: string[];
    isConnected?: boolean;
    userName?: string;
    zoom?: number;
}

export const DraggableMenuNode = memo(forwardRef(({
    id,
    name,
    x,
    y,
    isActive,
    onActivate,
    zoom = 1,
    readOnly = false,
    ...editorProps
}: DraggableMenuNodeProps, ref: ForwardedRef<SingleMenuEditorHandle>) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: id,
        data: { x, y },
        disabled: readOnly
    });

    // Use a ref to apply transform directly to DOM to avoid React render cycle overhead
    const nodeRef = useRef<HTMLDivElement | null>(null);

    // Sync dnd-kit ref with our local ref
    const setRefs = (element: HTMLDivElement | null) => {
        nodeRef.current = element;
        setNodeRef(element);
    };

    useEffect(() => {
        if (nodeRef.current && transform) {
            // Apply transform directly
            const xPos = transform.x / zoom;
            const yPos = transform.y / zoom;
            nodeRef.current.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        } else if (nodeRef.current) {
            nodeRef.current.style.transform = '';
        }
    }, [transform, zoom]);

    // Use a local ref to access SingleMenuEditor methods even if ref is forwarded
    const editorRef = useRef<SingleMenuEditorHandle>(null);

    // Sync local ref with forwarded ref
    useEffect(() => {
        if (!ref) return;
        if (typeof ref === 'function') {
            ref(editorRef.current);
        } else {
            ref.current = editorRef.current;
        }
    }, [ref]);

    const style = {
        // transform is handled by useEffect for performance
        left: x,
        top: y,
        position: 'absolute' as const,
        zIndex: isActive ? 50 : 10,
    };

    return (
        <div
            ref={setRefs}
            style={style}
            className={cn(
                "draggable-node flex flex-col bg-card border-2 rounded-lg shadow-sm transition-none group w-max", // Disable transition during drag
                isActive && !isDragging ? "border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] ring-2 ring-primary/20 animate-pulse-border" : "border-border hover:border-primary/50",
                isDragging && "opacity-80 cursor-grabbing z-[100] border-primary shadow-none ring-0",
                readOnly && "pointer-events-none"
            )}
            onMouseDown={(e) => !readOnly && e.stopPropagation()} // Stop canvas pan when clicking on node body
            onClick={(e) => {
                if (readOnly) return;
                if (e.defaultPrevented) return;
                e.stopPropagation();
                onActivate();
            }}
            onMouseEnter={() => {
                // Prevent drag events from parent DndContext when interacting with internal grid
                // This is a heuristic: if we are over a menu node, we might be dragging internal items
            }}
        >
            {/* Header / Drag Handle */}
            <div
                {...listeners}
                {...attributes}
                className={cn(
                    "flex items-center px-3 py-2 border-b bg-muted/50 rounded-t-lg cursor-grab active:cursor-grabbing",
                    isActive ? "bg-primary/5" : ""
                )}
            >
                <GripVertical className="w-4 h-4 text-muted-foreground mr-2" />
                <span className="text-sm font-medium select-none truncate max-w-[200px]" title={name}>
                    {name}
                </span>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-background/50 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        editorRef.current?.openSettings?.();
                        onActivate();
                    }}
                    title="菜单设置"
                >
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
            </div>

            {/* Editor Content */}
            <div className="p-1 cursor-default" onPointerDown={(e) => e.stopPropagation()}>
                <SingleMenuEditor
                    ref={editorRef}
                    mode="canvas-node"
                    menuId={id}
                    isActive={isActive}
                    zoom={zoom}
                    // IMPORTANT: Pass initialConfig as externalConfig to trigger remote updates
                    externalConfig={editorProps.initialConfig}
                    {...editorProps}
                />
            </div>
        </div>
    );
}));

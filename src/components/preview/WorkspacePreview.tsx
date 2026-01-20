import { useState, useRef, useEffect } from 'react';
import { DraggableMenuNode } from '@/components/editor/DraggableMenuNode';
import { type TrMenuConfiguration } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

interface WorkspacePreviewProps {
    data: any; // The workspace JSON data
}

interface PreviewTab {
    id: string;
    name: string;
    x: number;
    y: number;
    initialConfig?: TrMenuConfiguration;
}

export const WorkspacePreview = ({ data }: WorkspacePreviewProps) => {
    const [tabs, setTabs] = useState<PreviewTab[]>([]);
    const [allConfigs, setAllConfigs] = useState<Record<string, TrMenuConfiguration>>({});
    
    // Canvas State
    const [zoom, setZoom] = useState(0.8);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastMousePos = useRef({ x: 0, y: 0 });
    
    useEffect(() => {
        if (!data) return;
        
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (parsed.tabs) {
                setTabs(parsed.tabs);
            }
            if (parsed.configs) {
                setAllConfigs(parsed.configs);
            }
        } catch (e) {
            console.error("Failed to parse workspace data for preview", e);
        }
    }, [data]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click
            setIsPanning(true);
            lastMousePos.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    return (
        <WorkspaceProvider>
            <div className="w-full h-full relative overflow-hidden bg-muted/10 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Grid Background */}
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                        backgroundImage: 'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)'
                    }}
                />

                {/* Content */}
                <div 
                    className="absolute inset-0"
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {tabs.map(tab => (
                        <DraggableMenuNode
                            key={tab.id}
                            id={tab.id}
                            name={tab.name}
                            x={tab.x || 100}
                            y={tab.y || 100}
                            isActive={false}
                            onActivate={() => {}}
                            initialConfig={allConfigs[tab.id] || tab.initialConfig}
                            readOnly={true}
                            zoom={zoom}
                        />
                    ))}
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2 bg-background/80 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>缩小</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setZoom(1); setPan({x:0, y:0}); }}>
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>重置视图</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>放大</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </WorkspaceProvider>
    );
};

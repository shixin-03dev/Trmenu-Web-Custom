import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { TrMenuIcon } from '@/lib/types';

// Define locally to avoid HMR circular dependency or cache issues
export interface MenuClipboardData {
    // Clipboard content type and data
    type: 'single' | 'batch';
    data: { id: string; icon: TrMenuIcon } | { relativeSlot: number; id: string; icon: TrMenuIcon }[];
}

export interface WorkspaceData {
    name: string;
    description: string;
}

interface PanelContent {
    idList?: ReactNode;
    propertyPanel?: ReactNode;
}

interface WorkspaceContextType {
    workspace: WorkspaceData | null;
    setWorkspace: (data: WorkspaceData) => void;
    showGrid: boolean;
    setShowGrid: (show: boolean) => void;
    
    // Active Menu Panel Content
    activeMenuId: string | null;
    setActiveMenuId: Dispatch<SetStateAction<string | null>>;
    
    // Panel Contents for the active menu
    panelContent: PanelContent;
    setPanelContent: (content: PanelContent) => void;

    // Shared Clipboard
    clipboard: MenuClipboardData | null;
    setClipboard: (data: MenuClipboardData | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [showGrid, setShowGrid] = useState(true);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [panelContent, setPanelContent] = useState<PanelContent>({});
    const [clipboard, setClipboard] = useState<MenuClipboardData | null>(null);

    return (
        <WorkspaceContext.Provider value={{
            workspace,
            setWorkspace,
            showGrid,
            setShowGrid,
            activeMenuId,
            setActiveMenuId,
            panelContent,
            setPanelContent,
            clipboard,
            setClipboard
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
    return context;
};

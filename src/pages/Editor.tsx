import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X, Copy, Edit2, Loader2, Users, Grid3X3, MousePointer2, ZoomIn, ZoomOut, RotateCcw, Palette, PanelRightClose, PanelRightOpen, Upload, Save, MessageSquare, LogOut, Ban } from 'lucide-react';
import { type SingleMenuEditorHandle } from '@/components/editor/SingleMenuEditor';
import { DraggableMenuNode } from '@/components/editor/DraggableMenuNode';
import { type TrMenuConfiguration } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CollaborationPanel } from '@/components/editor/CollaborationPanel';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { themes, applyTheme } from '@/lib/themes';
import {
  DndContext, 
  useSensor, 
  useSensors, 
  PointerSensor,
  type DragEndEvent
} from '@dnd-kit/core';
import { v4 as uuidv4 } from 'uuid';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { createRoom, getRoom, joinRoom, deleteRoom, sendHeartbeat } from '@/api/collaboration';
import { createWorkspace, updateWorkspace, getWorkspace } from '@/api/workspace';
import { getCurrentUser } from '@/lib/user';
import { SIGNALING_SERVERS } from '@/config/api';
import { safeStorage } from '@/lib/storage';

import { ShortcutHints } from '@/components/editor/ShortcutHints';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { convertToLayoutConfig } from '@/lib/layout-utils';
import { dumpYaml } from '@/lib/yaml-utils';
import { ExportDialog } from '@/components/editor/ExportDialog';

interface EditorTab {
    id: string;
    name: string;
    key: string; // Unique key for React component mounting
    isDirty: boolean;
    initialConfig?: TrMenuConfiguration;
    x: number;
    y: number;
}

const EditorContent = ({ isInvite = false }: { isInvite?: boolean }) => {
  const { roomId, inviteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, isAuthenticated, loading: authLoading } = useAuth();
  const { 
      workspace, 
      setWorkspace, 
      showGrid, 
      setShowGrid, 
      activeMenuId, 
      setActiveMenuId, 
      panelContent,
      setPanelContent
  } = useWorkspace();
  
  const currentUser = authUser ? {
    id: authUser.userId.toString(),
    name: authUser.nickName || authUser.userName
  } : getCurrentUser();

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
        toast.error('请先登录后使用编辑器');
        navigate('/');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Yjs State
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<WebrtcProvider | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'synced'>('disconnected');
  
  // Local Mirrors of Yjs State
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [allConfigs, setAllConfigs] = useState<Record<string, TrMenuConfiguration>>({});
  
  // UI State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, tabId: string } | null>(null);
  const [renameState, setRenameState] = useState<{ isOpen: boolean, tabId: string, currentName: string, newBaseName: string }>({
      isOpen: false,
      tabId: '',
      currentName: '',
      newBaseName: ''
  });
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [invitePassword, setInvitePassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  
  const [isVerifying, setIsVerifying] = useState(false);
  const isVerifyingRef = useRef(false); // Ref for immediate double-click prevention
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  
  // User Awareness State
  const [onlineUsers, setOnlineUsers] = useState<{ id: string, name: string, color: string }[]>([]);
  const prevUsersRef = useRef<Set<string>>(new Set());
  const [roomHostId, setRoomHostId] = useState<string | null>(null);

  // Public Lobby State
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [published, setPublished] = useState(false);

  // Workspace Persistence State
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Track if workspace data is loaded
  const lastSavedTime = useRef<number>(Date.now());

  // Workspace Dialog State
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');

  // Prevent creation dialog if we are loading an existing workspace or joining as guest
  useEffect(() => {
    if (workspaceId || isInvite || (location.state as any)?.loadFromDb) {
        setShowWorkspaceDialog(false);
    }
  }, [workspaceId, isInvite, location.state]);

  // Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const startMousePos = useRef<{ x: number, y: number } | null>(null);
  const isDraggingTabRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // UI State - Sidebar & Tools
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(400);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Only expand if there's active content and we have a selection
    if (activeMenuId && (panelContent.propertyPanel || panelContent.idList)) {
        setIsRightPanelOpen(true);
    } else {
        // Auto collapse if no active menu
        setIsRightPanelOpen(false);
    }
  }, [activeMenuId, panelContent]);

  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return safeStorage.getItem('theme') || 'light';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);

  const editorRefs = useRef<Record<string, SingleMenuEditorHandle>>({});
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Connect Helper
  const connectToRoom = useCallback(async (id: string, pwd: string, shouldInit: boolean = true, skipCheck: boolean = false) => {
    
    let isRoomNew = false;
    
    // Verify with backend first
    if (!skipCheck) {
        try {
            await joinRoom(id, pwd);
            // Success: Save password
            safeStorage.setItem(`room_pwd_${id}`, pwd);
        } catch (error: any) {
            console.error("Join Room Check Failed:", error);
            if (error.response?.status === 401) {
                toast.error("密码错误");
                throw error;
            }
            if (error.response?.status === 404) {
                 // 404 means room doesn't exist on backend.
                 // This is normal for a new local session that hasn't been published yet.
                 // We should proceed to initialize the provider for local editing.
                 console.log("Room not found on backend, initializing local session.");
                 isRoomNew = true;
            } else {
                // Other errors might be connectivity, ignore for now to allow local work if possible
                // But generally joinRoom should succeed if network is fine.
            }
        }
    }

    try {
        setConnectionStatus('connecting');
        
        // Cleanup existing provider if any to prevent "Already exists" error
        if (providerRef.current) {
            providerRef.current.destroy();
            providerRef.current = null;
        }

        // Initialize Persistence
        if (!persistenceRef.current) {
            const persistence = new IndexeddbPersistence(id, ydoc);
            persistenceRef.current = persistence;
            
            persistence.on('synced', () => {
                console.log('Local persistence loaded');
                // Force workspace update from local data if available
                const yWorkspace = ydoc.getMap<string>('workspace');
                const name = yWorkspace.get('name');
                const desc = yWorkspace.get('description');
                if (name) {
                    setWorkspace({ name, description: desc || '' });
                    setIsLoaded(true); // Mark as loaded since we have data from persistence
                }
            });
        }

        // Use configured signaling servers
        // If you want local development with local signaling, configure it in SIGNALING_SERVERS
        const signaling = SIGNALING_SERVERS;

        const newProvider = new WebrtcProvider(id, ydoc, { 
            signaling,
            password: pwd || undefined, // Y-WebRTC password
            maxConns: 20 + Math.floor(Math.random() * 15),
            filterBcConns: true,
            peerOpts: {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun.ekiga.net' },
                        { urls: 'stun:stun.ideasip.com' }
                    ]
                }
            }
        });

        providerRef.current = newProvider;
        setProvider(newProvider);

        newProvider.on('status', (event: { connected: boolean }) => {
            if (event.connected) {
                 setConnectionStatus(prev => prev === 'synced' ? 'synced' : 'connected');
            } else {
                 setConnectionStatus('disconnected');
            }
        });

        newProvider.on('synced', (event: { synced: boolean }) => {
            if (event.synced) {
                setConnectionStatus('synced');
            } else {
                setConnectionStatus('connected');
            }
        });

        const awareness = newProvider.awareness;
        awareness.setLocalStateField('user', {
            id: currentUser.id,
            name: currentUser.name,
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
        });

        awareness.on('change', () => {
            const states = Array.from(awareness.getStates().values()) as any[];
            const users = states.map(s => s.user).filter(Boolean);
            setOnlineUsers(users);
            
            // Notification for new users
            const currentIds = new Set(users.map((u: any) => u.id));
            // Find new user that was not in prevUsersRef
            for (const user of users) {
                if (!prevUsersRef.current.has(user.id) && user.id !== currentUser.id) {
                    toast.success(`${user.name} 加入了房间共同协作！`);
                }
            }
            prevUsersRef.current = currentIds;
        });
        
        // Shared Types
        const yTabs = ydoc.getArray<EditorTab>('tabs');
        const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
        const yWorkspace = ydoc.getMap<string>('workspace'); // Sync workspace info

        // Sync Workspace Info
        yWorkspace.observe(() => {
             const name = yWorkspace.get('name');
             const desc = yWorkspace.get('description');
             const id = yWorkspace.get('id');
             if (name) {
                 setWorkspace({ name, description: desc || '' });
                 setShowWorkspaceDialog(false);
             }
             if (id && id !== workspaceId) {
                 setWorkspaceId(id);
             }
        });
        // Initial check
        const wsName = yWorkspace.get('name');
        const wsId = yWorkspace.get('id');
        
        if (wsId && wsId !== workspaceId) {
            setWorkspaceId(wsId);
        }

        if (wsName) {
            setWorkspace({ name: wsName, description: yWorkspace.get('description') || '' });
        } else if ((shouldInit || isRoomNew) && (!workspace || !workspace.name) && !(location.state as any)?.loadFromDb) {
            // If I am initializing (host), and no workspace set, show dialog
            // OR if room is new (404 on backend), assume I am host
            // BUT NOT if we are loading from DB (name will come soon)
            setShowWorkspaceDialog(true);
        }

        // Sync Tabs
        const syncTabs = () => {
            const arr = yTabs.toArray();
            // Dedup to prevent React Key errors if multiple clients init same default tab
            const seen = new Set();
            const uniqueArr = arr.filter(t => {
                const key = t.id || t.key;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            setTabs(uniqueArr);
            
            // If activeMenuId is missing or invalid, set it to first available
            setActiveMenuId((current: string | null) => {
                if (!current) return null; // Don't auto-select if nothing selected
                if (uniqueArr.some(t => t.id === current)) return current;
                
                // If dragging, keep current even if momentarily missing
                if (isDraggingTabRef.current) return current;

                return uniqueArr.length > 0 ? uniqueArr[0].id : null;
            });
        };
        yTabs.observe(syncTabs);
        syncTabs();

        // Sync Configs
        const syncConfigs = () => setAllConfigs(yConfigs.toJSON() as Record<string, TrMenuConfiguration>);
        yConfigs.observe(syncConfigs);
        syncConfigs();
        
        // Set active tab if null (Initial check)
        if (shouldInit) {
             setActiveMenuId((prev: string | null) => {
                if (prev) return prev;
                return yTabs.length > 0 ? yTabs.get(0).id : null;
            });
        }
    } catch (e) {
        console.error("Failed to connect to room:", e);
        toast.error("连接协作房间失败，请刷新重试");
    }

  }, [ydoc, currentUser.name, workspace, setWorkspace, setActiveMenuId]);

  // Initialize Room & User
  useEffect(() => {
    // Wait for auth to be ready to avoid connecting as Guest prematurely
    if (authLoading) return;

    // 1. Redirect if no ID
    if (!roomId && !inviteId) {
      const newId = uuidv4();
      // Pass shouldInit: true to indicate this user is the creator
      navigate(`/editor/${newId}`, { replace: true, state: { ...location.state, shouldInit: true } });
      return;
    }

    // 2. Handle Invite Link
    if (isInvite && inviteId) {
      // Only show dialog if NOT connected. If we already have a provider (e.g. from previous nav), don't show.
      if (!providerRef.current) {
          setShowPasswordDialog(true);
      }
      return;
    }

    // 3. Connect to Room (Default no password, or password handled via connect logic)
    if (roomId && !providerRef.current) {
       // Check if we have a password passed from navigation state or session storage
       const storedPwd = safeStorage.getItem(`room_pwd_${roomId}`);
       const state = location.state as any;
       const statePassword = state?.password || storedPwd || '';
       const shouldInit = state?.shouldInit || false;
       
       // Try to connect (will fallback to password dialog if backend 401s, 
       // but here we just try to join. If it fails, we might need to prompt.)
       // Actually connectToRoom handles the joinRoom API call.
       
       // Wrap in a function to handle async error properly in useEffect
       const initRoom = async () => {
           try {
               await connectToRoom(roomId, statePassword, shouldInit);
           } catch (err: any) {
               if (err.response?.status === 401) {
                   // Need password
                   setShowPasswordDialog(true);
               }
           }
       };
       initRoom();
       
       // Fetch Room Info to know who is host (for dissolution logic)
       getRoom(roomId).then(res => {
           setRoomHostId(res.hostId.toString());
           setRoomName(res.roomName);
           if (res.status === 'published') {
               setPublished(true);
           }
       }).catch(() => {
           // If room not found on backend, we might be creating it?
           // If I am the creator, I should have called createRoom?
           // The flow is: /editor/:id -> try join. If 404, assumes new local session (P2P).
           // But our new strict logic says we trust backend.
           // For now, let's assume if getRoom fails, it's a private P2P session or I am host preparing to publish.
           
           // We do NOT set host ID here if we are not sure.
           // If backend says 404, it means it's a local/P2P room that hasn't been published to the backend registry yet.
           // In this case, whoever is here is potentially the host of their own local session.
           setRoomHostId(currentUser.id); 
       });
    }
  }, [roomId, inviteId, isInvite, authLoading, provider, navigate, location.state, connectToRoom, currentUser.id]);

  // Cleanup Provider on Unmount
  useEffect(() => {
      return () => {
          if (providerRef.current) {
              providerRef.current.destroy();
              providerRef.current = null;
          }
          if (persistenceRef.current) {
              persistenceRef.current.destroy();
              persistenceRef.current = null;
          }
          // Optional: ydoc.destroy() if we want to be super clean, 
          // but ydoc is state managed, so let garbage collection handle it 
          // unless it has global listeners.
      };
  }, []);

  const getUniqueName = useCallback((base: string, ext: string) => {
      let name = `${base}.${ext}`;
      let counter = 1;
      const currentTabs = tabs; // Use local state which is synced
      while (currentTabs.some(t => t.name === name)) {
          name = `${base}_${counter}.${ext}`;
          counter++;
      }
      return name;
  }, [tabs]);

  const addTab = useCallback((name?: string, config?: TrMenuConfiguration) => {
      if (!provider) return;
      
      const yTabs = ydoc.getArray<EditorTab>('tabs');
      const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
      
      const newId = uuidv4();
      let finalName = name;
      
      const currentTabs = yTabs.toArray();

      if (!finalName) {
          finalName = getUniqueName(`menu_${currentTabs.length + 1}`, 'yml');
      } else {
          // Ensure unique even if provided
          const parts = finalName.split('.');
          const ext = parts.length > 1 ? parts.pop() : 'yml';
          const base = parts.join('.');
          if (currentTabs.some(t => t.name === finalName)) {
              finalName = getUniqueName(base, ext!);
          }
      }

      // Calculate position: Cascade
      const lastTab = currentTabs[currentTabs.length - 1];
      const newX = lastTab ? (lastTab.x || 0) + 40 : 100;
      const newY = lastTab ? (lastTab.y || 0) + 40 : 100;

      const newTab: EditorTab = {
          id: newId,
          name: finalName,
          key: newId,
          isDirty: false,
          initialConfig: config,
          x: newX,
          y: newY
      };
      
      // If config provided, set it in yConfigs
      if (config) {
          yConfigs.set(newId, config);
      }

      yTabs.push([newTab]);
      setActiveMenuId(newId);
  }, [ydoc, provider, getUniqueName, setActiveMenuId]);

  const handleCloseTab = (id: string) => {
      const yTabs = ydoc.getArray<EditorTab>('tabs');
      const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
      
      const currentTabs = yTabs.toArray();
      if (currentTabs.length <= 1) return;
      
      const tab = currentTabs.find(t => t.id === id);
      // "Dirty" check is local only for now, or based on some logic.
      // In collab, "dirty" is ambiguous. Let's skip dirty check for now or assume always safe to close (it's in Yjs).
      // Or checking if user wants to export.
      // Let's implement simple check:
      if (tab?.isDirty) {
          if (!confirm(`"${tab.name}" 有未保存的更改，确定要关闭吗？`)) {
              return;
          }
      }

      const index = currentTabs.findIndex(t => t.id === id);
      if (index !== -1) {
          yTabs.delete(index, 1);
          yConfigs.delete(id);
          delete editorRefs.current[id];
          
          if (id === activeMenuId) {
              const newTabs = yTabs.toArray();
              if (newTabs.length > 0) {
                  setActiveMenuId(newTabs[Math.max(0, index - 1)].id);
              } else {
                  setActiveMenuId(null);
                  setPanelContent({});
              }
          }
      }
  };

  const updateTabName = useCallback((id: string, name: string) => {
      const yTabs = ydoc.getArray<EditorTab>('tabs');
      const currentTabs = yTabs.toArray();
      const index = currentTabs.findIndex(t => t.id === id);
      if (index !== -1) {
          const updatedTab = { ...currentTabs[index], name };
          yTabs.delete(index, 1);
          yTabs.insert(index, [updatedTab]);
      }
  }, [ydoc]);

  const updateTabDirty = useCallback((id: string, isDirty: boolean) => {
      const yTabs = ydoc.getArray<EditorTab>('tabs');
      const currentTabs = yTabs.toArray();
      const index = currentTabs.findIndex(t => t.id === id);
      if (index !== -1 && currentTabs[index].isDirty !== isDirty) {
          const updatedTab = { ...currentTabs[index], isDirty };
          yTabs.delete(index, 1);
          yTabs.insert(index, [updatedTab]);
      }
  }, [ydoc]);

  const handleConfigChange = useCallback((id: string, config: TrMenuConfiguration) => {
      const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
      yConfigs.set(id, config);
  }, [ydoc]);

  // Canvas Interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
        // Zoom
        if (e.ctrlKey || e.metaKey || true) { // Always zoom on wheel for now
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(z => Math.max(0.1, Math.min(5, z * delta)));
        }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
        canvas.removeEventListener('wheel', onWheel);
    };
  }, [authLoading, isAuthenticated]); // Add dependencies to ensure ref is ready

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      // Only pan if clicking on background (not if event default prevented by child)
      if (e.defaultPrevented) return;
      if (e.button === 0) { // Left click
          setIsPanning(true);
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          startMousePos.current = { x: e.clientX, y: e.clientY };
      }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
      setIsPanning(false);
      
      // Click detection (if moved less than 5px)
      if (startMousePos.current) {
          const dx = Math.abs(e.clientX - startMousePos.current.x);
          const dy = Math.abs(e.clientY - startMousePos.current.y);
          
          if (dx < 5 && dy < 5 && !e.defaultPrevented) {
              // It's a click on background -> Deselect
              setActiveMenuId(null);
              // Also clear panel content
              setPanelContent({});
          }
      }
      // Reset startMousePos
      startMousePos.current = null;
  };

  const handleDragStart = () => {
      isDraggingTabRef.current = true;
  };

  // Adjust drag delta for zoom
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    const yTabs = ydoc.getArray<EditorTab>('tabs');
    const currentTabs = yTabs.toArray();
    const index = currentTabs.findIndex(t => t.id === id);
    
    if (index !== -1) {
        const tab = currentTabs[index];
        const newTab = { 
            ...tab, 
            x: (tab.x || 0) + delta.x / zoom, // Adjust for zoom
            y: (tab.y || 0) + delta.y / zoom  // Adjust for zoom
        };
        
        ydoc.transact(() => {
            yTabs.delete(index, 1);
            yTabs.insert(index, [newTab]);
        });
    }
    
    // Reset drag state
    setTimeout(() => {
        isDraggingTabRef.current = false;
    }, 50);
  };

  const handleThemeChange = (themeId: string) => {
    applyTheme(themeId);
    setCurrentTheme(themeId);
    safeStorage.setItem('theme', themeId);
    setShowThemePicker(false);
  };

  useEffect(() => {
    applyTheme(currentTheme);
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Check for loadFromDb flag
  useEffect(() => {
      if (location.state && (location.state as any).workspaceId) {
          const wsId = (location.state as any).workspaceId;
          const loadFromDb = (location.state as any).loadFromDb;
          setWorkspaceId(wsId);
          
          if (loadFromDb) {
              // Load data from DB
              getWorkspace(wsId).then(ws => {
                  if (ws && ws.data) {
                      try {
                          const data = typeof ws.data === 'string' ? JSON.parse(ws.data) : ws.data;
                          
                          // Apply to Yjs
                          ydoc.transact(() => {
                              // Restore Tabs
                              if (data.tabs && Array.isArray(data.tabs)) {
                                  const yTabs = ydoc.getArray<EditorTab>('tabs');
                                  yTabs.delete(0, yTabs.length);
                                  yTabs.insert(0, data.tabs);
                              }
                              
                              // Restore Configs
                              if (data.configs) {
                                  const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
                                  Object.entries(data.configs).forEach(([k, v]) => {
                                      yConfigs.set(k, v as TrMenuConfiguration);
                                  });
                              }
                              
                              // Restore Workspace Info
                              // Priority: DB Record > JSON Data
                              // This ensures that even if JSON data is corrupted (missing name), we restore from DB column
                              const yWorkspace = ydoc.getMap<string>('workspace');
                              
                              const dbName = ws.name;
                              const dbDesc = ws.description;
                              const jsonName = data.workspace?.name;
                              const jsonDesc = data.workspace?.description;
                              
                              // If DB name is missing (e.g. Untitled), try to recover from JSON if available and better
                              const finalName = (dbName && dbName !== 'Untitled') ? dbName : (jsonName || dbName || 'Untitled');
                              const finalDesc = dbDesc || jsonDesc || '';
                              
                              if (finalName) {
                                  yWorkspace.set('name', finalName);
                                  // Explicitly update local state
                                  setWorkspace({ 
                                      name: finalName, 
                                      description: finalDesc 
                                  });
                              }
                              
                              if (finalDesc) yWorkspace.set('description', finalDesc);
                              yWorkspace.set('id', wsId); // Sync ID to Yjs
                          });
                          
                          setIsLoaded(true);
                          setWorkspaceId(wsId); // Ensure workspaceId is set
                          toast.success("工作空间加载成功");
                      } catch (e) {
                          console.error("Failed to parse workspace data", e);
                          toast.error("加载数据失败");
                      }
                  }
              });
          }
      }
  }, [location.state, ydoc]);

  // Auto Save Logic
    const saveWorkspaceData = useCallback(async (manual = false) => {
        if (!workspaceId || !isLoaded) return; // Don't save if not loaded
        
        // Prevent guests from overwriting DB
        // If roomHostId is set, and it's not me, I shouldn't save.
        if (roomHostId && roomHostId !== currentUser.id) {
             if (manual) toast.error("您是访客，无法保存到云端");
             return;
        }

        setIsAutoSaving(true);
        try {
            const tabs = ydoc.getArray<EditorTab>('tabs').toArray();
            const configs = ydoc.getMap<TrMenuConfiguration>('configs').toJSON();
            const wsInfo = ydoc.getMap<string>('workspace').toJSON();
            
            // Safety check: Don't overwrite with Untitled if we have a valid name in state
            const nameToSave = wsInfo.name || workspace?.name || 'Untitled';
            const descToSave = wsInfo.description || workspace?.description || '';
            
            // Ensure JSON data contains the correct name/desc, even if Yjs was missing it
            const workspaceDataToSave = {
                ...wsInfo,
                name: nameToSave,
                description: descToSave
            };
            
            const data = JSON.stringify({
                tabs,
                configs,
                workspace: workspaceDataToSave
            });
            
            await updateWorkspace(workspaceId, {
                name: nameToSave,
                description: descToSave,
                data,
                menuCount: tabs.length
            });
            
            lastSavedTime.current = Date.now();
            if (manual) toast.success("保存成功");
        } catch (e) {
            console.error("Save failed", e);
            if (manual) toast.error("保存失败");
        } finally {
            setIsAutoSaving(false);
        }
    }, [workspaceId, ydoc, isLoaded, workspace?.name, roomHostId, currentUser.id]);

  // 10s Interval Auto Save
  useEffect(() => {
      if (!workspaceId) return;
      const interval = setInterval(() => {
          saveWorkspaceData();
      }, 10000);
      return () => clearInterval(interval);
  }, [workspaceId, saveWorkspaceData]);

  const handleWorkspaceSubmit = async () => {
      if (!workspaceName.trim()) {
          toast.error("请输入工作空间名称");
          return;
      }
      setWorkspace({ name: workspaceName, description: workspaceDesc });
      setShowWorkspaceDialog(false);
      
      const yWorkspace = ydoc.getMap<string>('workspace');
      yWorkspace.set('name', workspaceName);
      yWorkspace.set('description', workspaceDesc);

      // Create Workspace in DB immediately
      try {
          const newWs = await createWorkspace({
              name: workspaceName,
              description: workspaceDesc,
              userName: currentUser.name,
              menuCount: 0,
              data: JSON.stringify({ tabs: [], configs: {}, workspace: { name: workspaceName, description: workspaceDesc } })
          });
          
          // Important: Sync ID to Yjs so persistence works
          yWorkspace.set('id', newWs.id);
          
          setWorkspaceId(newWs.id);
          setIsLoaded(true); // Mark as loaded so save works
          
          // Update state to include workspaceId so refresh works
          navigate('.', { replace: true, state: { workspaceId: newWs.id } });
          toast.success("工作空间已创建并保存");
      } catch (e) {
          console.error("Failed to create workspace DB record", e);
          toast.error("工作空间创建失败，但您可以继续编辑（仅本地保存）");
      }
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  };

  const handleRenameClick = () => {
      if (!contextMenu) return;
      const tab = tabs.find(t => t.id === contextMenu.tabId);
      if (tab) {
          const baseName = tab.name.replace(/\.(yml|yaml)$/, '');
          setRenameState({
              isOpen: true,
              tabId: tab.id,
              currentName: tab.name,
              newBaseName: baseName
          });
      }
      setContextMenu(null);
  };

  const handleRenameConfirm = () => {
      const { tabId, newBaseName } = renameState;
      if (!newBaseName.trim()) return;
      
      const finalName = getUniqueName(newBaseName, 'yml');
      updateTabName(tabId, finalName);
      setRenameState(prev => ({ ...prev, isOpen: false }));
      toast.success("重命名成功");
  };

  const handleCopyTab = () => {
      if (!contextMenu) return;
      const tab = tabs.find(t => t.id === contextMenu.tabId);
      if (tab) {
          const yConfigs = ydoc.getMap<TrMenuConfiguration>('configs');
          const configToCopy = yConfigs.get(tab.id) || tab.initialConfig;
          
          const baseName = tab.name.replace(/\.(yml|yaml)$/, '') + '_copy';
          addTab(baseName, configToCopy ? JSON.parse(JSON.stringify(configToCopy)) : undefined);
          toast.success("创建副本成功");
      }
      setContextMenu(null);
  };

  const handlePublishRoom = async () => {
      if (!roomName.trim()) {
          toast.error("请输入房间名称");
          return;
      }
      
      try {
          const res = await createRoom({
              roomId: roomId || uuidv4(),
              roomName,
              password: invitePassword || undefined,
              capacity,
              currentUsers: 1,
              hostId: authUser?.userId || 0,
              hostName: authUser?.nickName || authUser?.userName || 'Unknown'
          });
           if (res && res.roomId) {
               if (res.roomId !== roomId) {
                   navigate(`/editor/${res.roomId}`, { state: { password: invitePassword } });
                   toast.success("房间创建成功，已跳转");
               } else {
                       // IMPORTANT: Re-connect with the new password so the Host uses the same encryption key as guests
                       if (invitePassword) {
                           await connectToRoom(roomId, invitePassword, false, true);
                           safeStorage.setItem(`room_pwd_${roomId}`, invitePassword);
                       }
                       
                       setPublished(true);
                       setRoomHostId(authUser?.userId.toString() || null);
                       toast.success("房间已发布");
                       setShowInviteDialog(false);
                   }
           }
      } catch (e) {
          console.error(e);
          toast.error("发布失败");
      }
  };

  const handleJoinRoom = async () => {
      // Logic for joining via dialog (invite link usually)
      // If we are here, likely we have inviteId from URL or we are just entering a password
      const targetId = inviteId || roomId;
      if (!targetId) return;
      if (isVerifyingRef.current) return;

      setIsVerifying(true);
      isVerifyingRef.current = true;
      try {
          // If we are navigating to a new page (Invite mode), ONLY verify password, DO NOT connect here.
          // Connecting here and then unmounting causes race conditions and ghost connections.
          if (targetId !== roomId) {
              await joinRoom(targetId, inputPassword);
          } else {
              // If we are staying on same page, we must connect.
              await connectToRoom(targetId, inputPassword, false, false);
          }
          
          setIsVerifying(false);
          isVerifyingRef.current = false;
          setShowPasswordDialog(false);
          
          // Update URL state with password so reload works
          if (targetId !== roomId) {
              navigate(`/editor/${targetId}`, { replace: true, state: { password: inputPassword } });
          } else {
              // Just update state in history without full navigation
              navigate('.', { replace: true, state: { password: inputPassword } });
          }
          toast.success("成功加入协作！");
      } catch (error: any) {
          console.error("Join Failed:", error);
          setIsVerifying(false);
          isVerifyingRef.current = false;
          if (error.response?.status === 401) {
             toast.error("密码错误");
          } else {
             toast.error("加入失败，请重试");
          }
      }
  };

  const handleExitRoom = useCallback(async () => {
      if (confirm("确定要退出当前协作房间吗？")) {
          // Clean up provider
          if (providerRef.current) {
              providerRef.current.destroy();
              providerRef.current = null;
          }
          if (persistenceRef.current) {
              // Optionally clear local data on explicit exit
              // await persistenceRef.current.clearData(); 
              // Actually, better to keep it for cache unless disbanding?
              // User B says "re-join and nothing synced". 
              // If we clear, they get nothing. If we keep, they get local cache.
              // Let's destroy the instance but KEEP data.
              persistenceRef.current.destroy();
              persistenceRef.current = null;
          }

          setProvider(null);
          setConnectionStatus('disconnected');
          setOnlineUsers([]);
          
          // Clear password
          if (roomId) safeStorage.removeItem(`room_pwd_${roomId}`);
          
          toast.success("已退出房间");
          // Use window.location.href to force a full page reload and clear all memory states
          window.location.href = '/';
      }
  }, [roomId, navigate]);

  const handleDisbandRoom = useCallback(async () => {
      if (!roomId) return;
      
      if (confirm("确定要解散当前房间吗？所有成员将被断开连接。")) {
          try {
              // Clean up provider first to stop broadcasting
              if (providerRef.current) {
                  providerRef.current.destroy();
                  providerRef.current = null;
              }
              if (persistenceRef.current) {
                   // Host disbanding -> Clear local data too?
                   // Yes, disband implies deletion.
                   await persistenceRef.current.clearData();
                   persistenceRef.current.destroy();
                   persistenceRef.current = null;
              }

              setProvider(null);
              setConnectionStatus('disconnected');

              await deleteRoom(roomId);
              toast.success("房间已解散");
              // Force reload to clear state
              window.location.href = '/';
          } catch (e) {
              console.error(e);
              toast.error("解散房间失败");
              // Even if API fails, we should probably leave
              window.location.href = '/';
          }
      }
  }, [roomId, navigate]);

  // Heartbeat Logic
  useEffect(() => {
    // Only run if we are in a room and connected (or at least joined)
    if (!roomId || connectionStatus === 'disconnected') return;
    
    const interval = setInterval(async () => {
        // Host: Send Heartbeat
        if (roomHostId && currentUser.id === roomHostId) {
            try {
                await sendHeartbeat(roomId);
            } catch (e) {
                console.error("Heartbeat failed", e);
            }
        } else {
            // Guest: Check Room Status
            try {
                // We use getRoom to check if it still exists
                const room = await getRoom(roomId);
                
                // If room is null/undefined (backend returned 200 with null data), it's disbanded
                if (!room || !room.roomId) {
                    throw { response: { status: 404 } };
                }
            } catch (e: any) {
                // 404 means room is gone (deleted by host or timeout)
                if ((e.response && e.response.status === 404) || !e || (e.response && e.response.status === 200)) {
                    clearInterval(interval);
                    toast.error("房主已解散该房间！");
                    
                    // Cleanup
                    if (providerRef.current) {
                        providerRef.current.destroy();
                        providerRef.current = null;
                    }
                    if (persistenceRef.current) {
                         persistenceRef.current.destroy();
                         persistenceRef.current = null;
                    }
                    
                    navigate('/');
                }
            }
        }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [roomId, roomHostId, currentUser.id, connectionStatus, navigate]);

  // Resize Effect
  useEffect(() => {
    if (isResizingRight) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 200 && newWidth <= 800) {
          setRightPanelWidth(newWidth);
        }
      };

      const handleMouseUp = () => {
        setIsResizingRight(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizingRight]);

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">正在验证身份...</span>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Render Canvas Node View
  // Note: SingleMenuEditor already handles its own drag logic if used directly, 
  // but here we use DraggableMenuNode which wraps it.
  
  // Expose methods for parent
  const handleImport = () => {
      if (!activeMenuId) {
          toast.error("请先选中一个菜单");
          return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.yml,.yaml';
      input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (event) => {
              const content = event.target?.result as string;
              const editor = editorRefs.current[activeMenuId];
              if (editor && editor.importConfig) {
                  editor.importConfig(content);
              }
          };
          reader.readAsText(file);
      };
      input.click();
  };

  const handleBatchExport = async (selectedIds: string[]) => {
      setIsExporting(true);
      try {
          const zip = new JSZip();
          
          let exportedCount = 0;
          
          for (const id of selectedIds) {
              const tab = tabs.find(t => t.id === id);
              if (!tab) continue;
              
              const config = allConfigs[id] || tab.initialConfig;
              
              if (!config) continue;
              
              const rows = config._rows || 6;
              const exportConfig = convertToLayoutConfig(config, rows);
              const yamlStr = dumpYaml(exportConfig);
              
              let filename = tab.name;
              if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
                  filename += '.yml';
              }
              
              zip.file(filename, yamlStr);
              exportedCount++;
          }
          
          if (exportedCount === 0) {
              toast.error("没有可导出的内容");
              return;
          }

          const content = await zip.generateAsync({ type: 'blob' });
          const zipName = `trmenu_export_${workspace?.name || 'workspace'}_${new Date().toISOString().slice(0, 10)}.zip`;
          saveAs(content, zipName);
          
          toast.success(`成功导出 ${exportedCount} 个菜单`);
          setShowExportDialog(false);
      } catch (e) {
          console.error('Export failed:', e);
          toast.error('导出失败');
      } finally {
          setIsExporting(false);
      }
  };

  const handleExport = () => {
      if (tabs.length === 0) {
          toast.error("没有可导出的菜单");
          return;
      }
      setShowExportDialog(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card z-20 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                     <span className="font-semibold text-sm text-muted-foreground">工作空间:</span>
                     <h1 className="font-bold text-lg leading-tight">{workspace?.name || '未命名工作空间'}</h1>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                     <span>备注:</span>
                     <p className="max-w-[300px] truncate" title={workspace?.description}>{workspace?.description || '无描述'}</p>
                 </div>
             </div>
             <div className="h-6 w-px bg-border mx-2" />
             <Button variant="outline" size="sm" onClick={() => addTab()}>
                 <Plus className="w-4 h-4 mr-2" />
                 新建菜单
             </Button>
             
             {/* Save Button - Always visible for Host (unless Invite), creates workspace if needed */}
             {!isInvite && (
                 <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => {
                         if (workspaceId) {
                             saveWorkspaceData(true);
                         } else {
                             setShowWorkspaceDialog(true);
                         }
                     }} 
                     disabled={isAutoSaving}
                     className="ml-2"
                 >
                     {isAutoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                     保存
                 </Button>
             )}
          </div>
          
          <div className="flex items-center gap-2">
             {/* Import/Export Buttons - Restored */}
             <div className="flex items-center gap-1 mr-2">
                 <Button variant="ghost" size="sm" onClick={handleImport}>
                     导入
                 </Button>
                 <Button variant="ghost" size="sm" onClick={handleExport}>
                     导出
                 </Button>
             </div>

             <div className="flex items-center gap-2 mr-4 bg-muted/50 rounded-full px-3 py-1 cursor-pointer hover:bg-muted transition-colors" onClick={() => setShowCollabPanel(true)}>
                 {connectionStatus === 'synced' ? (
                     <span className="flex h-2 w-2 rounded-full bg-green-500" />
                 ) : (
                     <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                 )}
                 <span className="text-xs text-muted-foreground">
                    {onlineUsers.length} 人在线
                 </span>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setShowCollabPanel(true)} title="协作聊天">
                 <MessageSquare className="w-5 h-5" />
             </Button>
             <Button variant="ghost" size="icon" onClick={() => setShowInviteDialog(true)} title="邀请成员">
                 <Users className="w-5 h-5" />
             </Button>

             {/* Exit/Disband Buttons */}
             {connectionStatus !== 'disconnected' && roomId && (
                 <>
                     {roomHostId && currentUser.id === roomHostId ? (
                         <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={handleDisbandRoom} 
                             title="解散房间"
                             className="text-destructive hover:text-destructive hover:bg-destructive/10"
                         >
                             <Ban className="w-5 h-5" />
                         </Button>
                     ) : (
                         <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={handleExitRoom} 
                             title="退出房间"
                             className="text-destructive hover:text-destructive hover:bg-destructive/10"
                         >
                             <LogOut className="w-5 h-5" />
                         </Button>
                     )}
                 </>
             )}
          </div>
      </div>
      
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: ID List */}
          <div className="w-64 border-r bg-card flex flex-col shrink-0 z-10">
              <div className="p-3 border-b font-medium text-sm text-muted-foreground">
                  组件列表
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                  {panelContent.idList || (
                      <div className="text-center text-sm text-muted-foreground py-10">
                          请选中一个菜单以查看组件
                      </div>
                  )}
              </div>
          </div>

          {/* Center Column: TabBar + Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              
              {/* Tab Bar */}
              <div className="h-9 border-b bg-muted/30 flex items-center justify-between px-2 shrink-0 z-10">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {tabs.map(tab => (
                      <div 
                          key={tab.id}
                          onClick={() => setActiveMenuId(tab.id)}
                          onContextMenu={(e) => handleContextMenu(e, tab.id)}
                          className={cn(
                              "h-7 px-3 flex items-center gap-2 text-xs rounded-t-md cursor-pointer border-t border-x border-transparent transition-all min-w-[100px] max-w-[200px] group relative",
                              activeMenuId === tab.id 
                                  ? "bg-background border-border font-medium text-primary border-b-background translate-y-[1px]" 
                                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                      >
                          <span className="truncate flex-1">{tab.name}</span>
                          <div 
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseTab(tab.id);
                            }}
                          >
                              <X className="w-3 h-3" />
                          </div>
                      </div>
                  ))}
                  <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-sm hover:bg-muted ml-1 shrink-0"
                      onClick={() => addTab()}
                      title="新建菜单"
                  >
                      <Plus className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  </div>

                  <div className="flex items-center gap-1 pl-2 border-l border-border/50 ml-2">
                       <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleImport} title="导入 YAML 配置到当前菜单">
                           <Upload className="w-3 h-3" />
                           <span className="hidden sm:inline">导入</span>
                       </Button>
                       <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={handleExport} title="导出当前菜单">
                           <Save className="w-3 h-3" />
                           <span className="hidden sm:inline">导出</span>
                       </Button>
                  </div>
              </div>

              {/* Canvas + Right Sidebar Row */}
              <div className="flex-1 flex overflow-hidden relative">
                  
                  {/* Canvas Container */}
                  <div 
                    className="flex-1 relative overflow-hidden bg-muted/10 cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    ref={canvasRef}
                    style={{
                        backgroundPosition: `${pan.x}px ${pan.y}px`,
                        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                        backgroundImage: showGrid ? 'linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px)' : 'none'
                }}
              >
                <DndContext 
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                <div 
                    style={{ 
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: '0 0',
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                >
                        <div 
                            className="min-w-[3000px] min-h-[2000px] relative transition-colors"
                            // Remove onClick here, rely on handleCanvasMouseUp
                        >
                            {tabs.length === 0 && (
                                <div className="absolute top-[200px] left-[400px] flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                                    <MousePointer2 className="w-12 h-12 mb-4 opacity-20" />
                                    <p>点击上方 "新建菜单" 开始工作</p>
                                </div>
                            )}
                            
                            {tabs.map(tab => (
                                <DraggableMenuNode
                                    key={tab.key}
                                    id={tab.id}
                                    name={tab.name}
                                    x={tab.x || 100}
                                    y={tab.y || 100}
                                    isActive={tab.id === activeMenuId}
                                    onActivate={() => setActiveMenuId(tab.id)}
                                    // Use allConfigs (synced from Yjs) if available, otherwise fallback to initial
                                    initialConfig={allConfigs[tab.id] || tab.initialConfig}
                                    onConfigChange={(c) => handleConfigChange(tab.id, c)}
                                    onDirtyChange={(dirty) => updateTabDirty(tab.id, dirty)}
                                    openMenus={tabs.map(t => t.name)}
                                    isConnected={connectionStatus === 'synced' || connectionStatus === 'connected'}
                                    userName={currentUser.name}
                                    zoom={zoom}
                                    ref={el => {
                                        if (el) editorRefs.current[tab.id] = el;
                                        else delete editorRefs.current[tab.id];
                                    }}
                                />
                            ))}
                        </div>
                </div>
                </DndContext>
                
                {/* Floating Toolbar (Bottom) */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-background/80 backdrop-blur-md border rounded-full shadow-lg z-50">
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}>
                                        <ZoomOut className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>缩小</TooltipContent>
                            </Tooltip>
                            
                            <div className="text-xs font-mono w-12 text-center text-muted-foreground select-none">
                                {Math.round(zoom * 100)}%
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setZoom(z => Math.min(5, z + 0.1))}>
                                        <ZoomIn className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>放大</TooltipContent>
                            </Tooltip>

                            <div className="w-px h-4 bg-border mx-1" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setPan({ x: 0, y: 0 })}>
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>重置视图</TooltipContent>
                            </Tooltip>

                            <div className="w-px h-4 bg-border mx-1" />
                            
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full"
                                        onClick={() => setShowThemePicker(!showThemePicker)}
                                    >
                                        <Palette className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>切换主题</TooltipContent>
                            </Tooltip>
                            
                            {/* Theme Picker Popup */}
                            {showThemePicker && (
                                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-popover border rounded-lg shadow-xl p-2 w-48 grid gap-1 z-50 animate-in fade-in slide-in-from-bottom-2">
                                     {themes.map(t => (
                                        <button
                                            key={t.id}
                                            className={cn(
                                                "flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent text-left w-full",
                                                currentTheme === t.id && "bg-accent"
                                            )}
                                            onClick={() => handleThemeChange(t.id)}
                                        >
                                            <div className={cn("w-3 h-3 rounded-full border shrink-0", t.color)} />
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                             )}
                         </TooltipProvider>
                    </div>
                     
                     {/* Global Shortcut Hints - Moved to Bottom Left */}
                     <div className="absolute bottom-4 left-4 z-40">
                         <ShortcutHints />
                     </div>
                  </div>

                  {/* Resizable Right Sidebar */}
                  {/* Drag Handle */}
                  <div 
                      className="w-1 bg-border hover:bg-primary/50 cursor-col-resize z-20 transition-colors shrink-0"
                      onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizingRight(true);
                      }}
                  />

                  {/* Right Sidebar */}
                  <div 
                    style={{ width: isRightPanelOpen ? rightPanelWidth : 0 }}
                    className={cn(
                        "bg-card flex flex-col shrink-0 z-10 shadow-sm transition-all duration-300 relative border-l",
                        !isRightPanelOpen && "w-0 overflow-hidden border-l-0"
                    )}
                  >
                     <div className="p-3 border-b flex items-center justify-between overflow-hidden">
                         <span className="font-medium text-sm whitespace-nowrap opacity-100 transition-opacity">属性设置</span>
                         <div className="flex items-center gap-2">
                             <TooltipProvider>
                                 <Tooltip>
                                     <TooltipTrigger asChild>
                                         <Button 
                                            variant={showGrid ? "secondary" : "ghost"} 
                                            size="icon" 
                                            className="h-6 w-6"
                                            onClick={() => setShowGrid(!showGrid)}
                                         >
                                             <Grid3X3 className="h-3 w-3" />
                                         </Button>
                                     </TooltipTrigger>
                                     <TooltipContent>切换网格</TooltipContent>
                                 </Tooltip>
                             </TooltipProvider>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsRightPanelOpen(false)}
                             >
                                 <PanelRightClose className="w-4 h-4" />
                             </Button>
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
                         {panelContent.propertyPanel || (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center whitespace-nowrap">
                                  <p>选中菜单或组件以编辑属性</p>
                              </div>
                         )}
                     </div>
                  </div>

                  {/* Floating Toggle Button (When Collapsed) */}
                  {!isRightPanelOpen && (
                      <div className="absolute top-4 right-4 z-50">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="shadow-md border"
                            onClick={() => setIsRightPanelOpen(true)}
                          >
                             <PanelRightOpen className="w-4 h-4" />
                          </Button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <CollaborationPanel
        provider={provider}
        ydoc={ydoc}
        currentUser={currentUser}
        isOpen={showCollabPanel}
        onClose={() => setShowCollabPanel(false)}
      />

      {/* Workspace Dialog */}
      <Dialog open={showWorkspaceDialog} onOpenChange={setShowWorkspaceDialog}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>创建工作空间</DialogTitle>
                  <DialogDescription>
                      请输入工作空间的名称和描述以开始。
                  </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label>名称</Label>
                      <Input value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} placeholder="我的菜单项目" />
                  </div>
                  <div className="grid gap-2">
                      <Label>描述</Label>
                      <Textarea value={workspaceDesc} onChange={e => setWorkspaceDesc(e.target.value)} placeholder="这是一个关于...的项目" />
                  </div>
              </div>
              <DialogFooter>
                  <Button onClick={handleWorkspaceSubmit}>创建</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Other Dialogs (Rename, Invite, Password) - Kept mostly same */}
      <Dialog open={renameState.isOpen} onOpenChange={(open) => setRenameState(prev => ({ ...prev, isOpen: open }))}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>重命名文件</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="filename">文件名</Label>
                      <div className="flex items-center gap-2">
                          <Input
                              id="filename"
                              value={renameState.newBaseName}
                              onChange={(e) => setRenameState(prev => ({ ...prev, newBaseName: e.target.value }))}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameConfirm();
                              }}
                          />
                          <span className="text-sm text-muted-foreground">.yml</span>
                      </div>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setRenameState(prev => ({ ...prev, isOpen: false }))}>
                      取消
                  </Button>
                  <Button onClick={handleRenameConfirm}>
                      确定
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>发布房间</DialogTitle>
                  <DialogDescription>
                      将房间发布到公共大厅，以便他人加入协作。
                  </DialogDescription>
              </DialogHeader>
              
              {roomHostId && currentUser.id !== roomHostId ? (
                  <div className="py-6 text-center space-y-4">
                      <div className="text-muted-foreground">
                          您已加入协作房间。
                      </div>
                  </div>
              ) : (
                  <>
                      <div className="py-4 space-y-4">
                          <div className="grid gap-2">
                              <Label>协作密码 (可选)</Label>
                              <Input
                                  type="text"
                                  value={invitePassword}
                                  onChange={(e) => setInvitePassword(e.target.value)}
                                  placeholder="留空则无需密码"
                                  disabled={published}
                              />
                          </div>

                          <div className="space-y-4">
                                  <div className="space-y-2">
                                      <Label>房间名称 <span className="text-red-500">*</span></Label>
                                      <Input 
                                          placeholder="给你的房间起个名字" 
                                          value={roomName}
                                          onChange={(e) => setRoomName(e.target.value)}
                                          disabled={published}
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <Label>最大人数</Label>
                                      <Input 
                                          type="number" 
                                          min={2}
                                          max={50}
                                          value={capacity}
                                          onChange={(e) => setCapacity(parseInt(e.target.value) || 10)}
                                          disabled={published}
                                      />
                                  </div>
                          </div>
                      </div>
                      <DialogFooter>
                          <Button onClick={handlePublishRoom} disabled={published}>
                              <Users className="w-4 h-4 mr-2" />
                              {published ? '房间已发布' : '发布到大厅'}
                          </Button>
                      </DialogFooter>
                  </>
              )}
          </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
          if (!isVerifying && !open) navigate('/');
      }}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>加入协作</DialogTitle>
                  <DialogDescription>
                      请输入邀请密码以加入此协作会话。
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <div className="grid gap-2">
                      <Label>邀请密码</Label>
                      <Input
                          type="password"
                          value={inputPassword}
                          onChange={(e) => setInputPassword(e.target.value)}
                          placeholder="输入密码..."
                          disabled={isVerifying}
                          onKeyDown={(e) => e.key === 'Enter' && !isVerifying && handleJoinRoom()}
                      />
                  </div>
              </div>
              <DialogFooter>
                  <Button onClick={handleJoinRoom} disabled={isVerifying}>
                      {isVerifying ? (
                          <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              正在连接信令服务器... (最多15秒)
                          </>
                      ) : "加入"}
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <ExportDialog 
          open={showExportDialog} 
          onOpenChange={setShowExportDialog} 
          tabs={tabs.map(t => ({ id: t.id, name: t.name }))} 
          onConfirm={handleBatchExport}
          isExporting={isExporting}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div 
            className="fixed z-50 min-w-[160px] bg-popover border rounded-md shadow-md p-1 animate-in fade-in zoom-in-95"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
        >
            <button 
                className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left"
                onClick={handleRenameClick}
            >
                <Edit2 className="w-4 h-4 mr-2" />
                重命名
            </button>
            <button 
                className="flex items-center w-full px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left"
                onClick={handleCopyTab}
            >
                <Copy className="w-4 h-4 mr-2" />
                创建副本
            </button>
        </div>
      )}
    </div>
  );
};

const Editor = (props: { isInvite?: boolean }) => (
    <WorkspaceProvider>
        <EditorContent {...props} />
    </WorkspaceProvider>
);

export default Editor;

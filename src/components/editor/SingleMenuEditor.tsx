import { useState, useMemo, useRef, useEffect, forwardRef, useImperativeHandle, type ForwardedRef, memo } from 'react';
import { MenuGrid } from '@/components/editor/MenuGrid';
import { PropertyPanel } from '@/components/editor/PropertyPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, LayoutTemplate, Plus, Upload, Settings, ChevronLeft, ChevronRight, ClipboardPaste, Loader2, Trash2, RotateCcw, Palette, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type TrMenuConfiguration, type TrMenuIcon } from '@/lib/types';
import yaml from 'js-yaml';
import { convertToLayoutConfig, parseLayoutConfig } from '@/lib/layout-utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { YamlEditor } from '@/components/ui/yaml-editor';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { safeStorage } from '@/lib/storage';

import { MenuSettingsPanel } from '@/components/editor/MenuSettingsPanel';
import { useHistory } from '@/hooks/useHistory';
import { ShortcutHints } from '@/components/editor/ShortcutHints';
import { dumpYaml } from '@/lib/yaml-utils';
import { themes, applyTheme } from '@/lib/themes';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const DEFAULT_MENU_CONFIG: TrMenuConfiguration = {
  Title: ['Default Menu'],
  'Title-Update': -1,
  Icons: {
    'example_item': {
      display: {
        mats: 'compass',
        name: '&aExample Item',
        lore: ['&7This is an example item']
      },
      slot: 13,
      _page: 0
    }
  }
};

export interface SingleMenuEditorHandle {
    getConfig: () => TrMenuConfiguration;
    isDirty: boolean;
    openSettings: () => void;
    importConfig: (content: string) => void;
    exportConfig: () => void;
}

interface SingleMenuEditorProps {
    tabBar?: React.ReactNode;
    initialFilename?: string;
    initialConfig?: TrMenuConfiguration;
    externalConfig?: TrMenuConfiguration;
    onFilenameChange?: (name: string) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onConfigChange?: (config: TrMenuConfiguration) => void;
    openMenus?: string[];
    isActive?: boolean;
    onInvite?: () => void;
    onChatClick?: () => void;
    isConnected?: boolean;
    userName?: string;
    mode?: 'default' | 'canvas-node';
    menuId?: string; // Used in canvas mode to identify the menu
    zoom?: number;
}

export const SingleMenuEditor = memo(forwardRef(({ 
    tabBar, 
    initialFilename = 'menu.yml', 
    initialConfig, 
    externalConfig, 
    onFilenameChange, 
    onDirtyChange, 
    onConfigChange, 
    openMenus, 
    isActive = true, 
    onInvite, 
    onChatClick, 
    isConnected = false, 
    userName,
    mode = 'default',
    menuId,
    zoom = 1,
    readOnly = false
}: SingleMenuEditorProps & { readOnly?: boolean }, ref: ForwardedRef<SingleMenuEditorHandle>) => {
  const navigate = useNavigate();
  const [config, setConfig, undo, , canUndo] = useHistory<TrMenuConfiguration>(initialConfig || DEFAULT_MENU_CONFIG);
  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set());
  const [lastFocusedSlot, setLastFocusedSlot] = useState<number | null>(null);
  const [rows, setRows] = useState(initialConfig?._rows || 6);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Workspace integration
  const workspaceContext = useWorkspace();
  const { clipboard, setClipboard } = workspaceContext;

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilename, setSaveFilename] = useState(initialFilename);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showYamlPanel, setShowYamlPanel] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return safeStorage.getItem('theme') || 'light';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showRowDeleteConfirm, setShowRowDeleteConfirm] = useState(false);
  const [pendingRowCount, setPendingRowCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSavedConfigRef = useRef<string>(JSON.stringify(DEFAULT_MENU_CONFIG));
  const isRemoteUpdate = useRef(false);
  
  // Use ref to stabilize onDirtyChange to prevent infinite loops in useEffect
  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
      setSaveFilename(initialFilename);
  }, [initialFilename]);

  useImperativeHandle(ref, () => ({
      getConfig: () => config,
      isDirty: JSON.stringify(config) !== lastSavedConfigRef.current,
      openSettings: () => {
          setLastFocusedSlot(null);
          setSelectedSlots(new Set());
          setShowSettings(true);
      },
      importConfig: (content: string) => {
          try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let parsed = yaml.load(content) as any;
              
              if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid YAML format');
              }

              if (!parsed.Icons && !parsed.Layout && !parsed.Shape && !parsed.Title && !parsed.Buttons) {
                  const keys = Object.keys(parsed);
                  const looksLikeButtons = keys.length > 0 && keys.every(k => {
                      const v = parsed[k];
                      return typeof v === 'object' && (v.display || v.actions || v.icons || v.update || v.REFRESH || v.display_name);
                  });
                  
                  if (looksLikeButtons) {
                      console.log('Detected partial config (Buttons only), wrapping in Icons...');
                      parsed = { Icons: parsed, Title: ['Imported Menu'] };
                  }
              }
              
              if (!parsed.Icons) parsed.Icons = {};
              if (!parsed.Title) parsed.Title = ['Menu'];

              const finalConfig = parseLayoutConfig(parsed);
              
              let maxSlot = 0;
              Object.values(finalConfig.Icons).forEach((icon: any) => {
                   const s = icon.slot;
                   if (typeof s === 'number') maxSlot = Math.max(maxSlot, s);
                   else if (Array.isArray(s)) s.forEach((n:any) => maxSlot = Math.max(maxSlot, Number(n) || 0));
              });
              const importedRows = Math.max(1, Math.ceil((maxSlot + 1) / 9));
              
              setConfig(finalConfig);
              setLastFocusedSlot(null);
              setSelectedSlots(new Set());
              setRows(Math.min(6, Math.max(1, importedRows)));
              setCurrentPage(0);
              
              // Update dirty state
              lastSavedConfigRef.current = JSON.stringify(finalConfig);
              if (onDirtyChangeRef.current) onDirtyChangeRef.current(false);
              
              toast.success('导入成功', {
                  description: 'Layout 已转换为绝对槽位 (Slot) 以支持可视化编辑。'
              });
          } catch (e) {
              console.error('Failed to import menu:', e);
              toast.error('导入失败', {
                  description: '文件格式错误或内容无效'
              });
          }
      },
      exportConfig: () => {
          handleSaveClick();
      }
  }));

  // Sync with external config (for collaboration)
  useEffect(() => {
    if (externalConfig && JSON.stringify(externalConfig) !== JSON.stringify(config)) {
      
      // Sync rows from external config
      if (externalConfig._rows && externalConfig._rows !== rows) {
          setRows(externalConfig._rows);
      } else {
          // Auto-expand rows if needed
          let maxSlot = 0;
          Object.values(externalConfig.Icons || {}).forEach((icon: any) => {
               const s = icon.slot;
               if (typeof s === 'number') maxSlot = Math.max(maxSlot, s);
               else if (Array.isArray(s)) s.forEach((n:any) => maxSlot = Math.max(maxSlot, Number(n) || 0));
          });
          const newRows = Math.max(1, Math.ceil((maxSlot + 1) / 9));
          if (newRows > rows) setRows(Math.min(6, newRows));
      }

      isRemoteUpdate.current = true;
      setConfig(externalConfig);
    }
  }, [externalConfig]);

  // Notify parent of changes
  const onConfigChangeRef = useRef(onConfigChange);
  useEffect(() => {
    onConfigChangeRef.current = onConfigChange;
  }, [onConfigChange]);

  useEffect(() => {
    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }
    onConfigChangeRef.current?.(config);
  }, [config]);

  useEffect(() => {
      setSaveFilename(initialFilename);
  }, [initialFilename]);

  useEffect(() => {
      const callback = onDirtyChangeRef.current;
      if (callback) {
          const isDirty = JSON.stringify(config) !== lastSavedConfigRef.current;
          callback(isDirty);
      }
  }, [config]);

  // Compute slot content for current page
  const slotContent = useMemo(() => {
    const content: Record<number, { id: string, icon: TrMenuIcon }> = {};
    Object.entries(config.Icons).forEach(([id, icon]) => {
      // Filter by page
      if ((icon._page || 0) !== currentPage) return;

      // Handle different slot types
      if (typeof icon.slot === 'number') {
        content[icon.slot] = { id, icon };
      } else if (typeof icon.slot === 'string') {
          // Handle range "1-5" or list "1,2,3"
          if (icon.slot.includes('-')) {
              const [start, end] = icon.slot.split('-').map(Number);
              if (!isNaN(start) && !isNaN(end)) {
                  for (let i = start; i <= end; i++) {
                      content[i] = { id, icon };
                  }
              }
          } else if (icon.slot.includes(',')) {
              icon.slot.split(',').map(Number).forEach(s => {
                  if (!isNaN(s)) content[s] = { id, icon };
              });
          } else {
              const s = Number(icon.slot);
              if (!isNaN(s)) content[s] = { id, icon };
          }
      } else if (Array.isArray(icon.slot)) {
          // Handle array of numbers or strings
          icon.slot.forEach(s => {
             const sNum = Number(s);
             if (!isNaN(sNum)) content[sNum] = { id, icon };
          });
      }
    });
    return content;
  }, [config, currentPage]);

  const selectedSlot = lastFocusedSlot; // Backwards compatibility variable for property panel
  const selectedIconId = selectedSlot !== null ? slotContent[selectedSlot]?.id : null;
  const selectedIcon = selectedIconId ? config.Icons[selectedIconId] : null;

  const handleSlotClick = (slot: number, e?: React.MouseEvent) => {
    if (readOnly) return;
    
    // If e is missing (e.g. from drag start), assume simple click
    if (!e) {
         setSelectedSlots(new Set([slot]));
         setLastFocusedSlot(slot);
         setShowSettings(false);
         // If in canvas mode, activate this menu
         if (mode === 'canvas-node' && menuId && workspaceContext) {
             workspaceContext.setActiveMenuId(menuId);
         }
         return;
    }
    
    // Activate menu in workspace context
    if (mode === 'canvas-node' && menuId && workspaceContext) {
        workspaceContext.setActiveMenuId(menuId);
    }

    if (e.shiftKey && lastFocusedSlot !== null) {
        // Range selection (Rectangular)
        const start = lastFocusedSlot;
        const end = slot;
        
        // Convert to row/col
        const startRow = Math.floor(start / 9);
        const startCol = start % 9;
        const endRow = Math.floor(end / 9);
        const endCol = end % 9;
        
        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        
        const newSelection = new Set(e.ctrlKey || e.metaKey ? selectedSlots : []);
        
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                newSelection.add(r * 9 + c);
            }
        }
        
        setSelectedSlots(newSelection);
        
    } else if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        const newSelection = new Set(selectedSlots);
        if (newSelection.has(slot)) {
            newSelection.delete(slot);
            if (lastFocusedSlot === slot) {
                setLastFocusedSlot(null); 
            }
        } else {
            newSelection.add(slot);
            setLastFocusedSlot(slot);
        }
        setSelectedSlots(newSelection);
    } else {
        // Simple click
        setSelectedSlots(new Set([slot]));
        setLastFocusedSlot(slot);
    }
    
    setShowSettings(false);
  };

  const handleMoveItem = (fromSlot: number, toSlot: number) => {
    if (readOnly) return;
    const source = slotContent[fromSlot];
    if (!source) return;

    const target = slotContent[toSlot];

    setConfig(prev => {
      const newIcons = { ...prev.Icons };
      
      // Helper to remove slot from ID
      const removeSlotFromId = (id: string, slotToRemove: number) => {
          if (!newIcons[id]) return;
          const slots = Array.isArray(newIcons[id].slot) 
              ? newIcons[id].slot.map(Number)
              : (typeof newIcons[id].slot === 'number' ? [newIcons[id].slot as number] : []);
          
          const filtered = slots.filter(s => s !== slotToRemove);
          
          if (filtered.length === 1) {
              newIcons[id] = { ...newIcons[id], slot: filtered[0] };
          } else {
              newIcons[id] = { ...newIcons[id], slot: filtered };
          }
      };

      // Helper to add slot to ID
      const addSlotToId = (id: string, slotToAdd: number) => {
          if (!newIcons[id]) return;
          const slots = Array.isArray(newIcons[id].slot)
              ? newIcons[id].slot.map(Number)
              : (typeof newIcons[id].slot === 'number' ? [newIcons[id].slot as number] : []);
          
          if (!slots.includes(slotToAdd)) {
              slots.push(slotToAdd);
              slots.sort((a, b) => a - b);
              newIcons[id] = { ...newIcons[id], slot: slots };
          }
      };

      if (target && target.id !== source.id) {
          // Swap logic
          removeSlotFromId(source.id, fromSlot);
          removeSlotFromId(target.id, toSlot);
          
          addSlotToId(source.id, toSlot);
          addSlotToId(target.id, fromSlot);
      } else {
          if (!newIcons[source.id]) return prev;

          const sourceSlots = Array.isArray(newIcons[source.id].slot)
              ? (newIcons[source.id].slot as (string | number)[]).map(Number)
              : [Number(newIcons[source.id].slot)];
              
          if (sourceSlots.length > 1) {
             removeSlotFromId(source.id, fromSlot);
             addSlotToId(source.id, toSlot);
          } else {
             newIcons[source.id] = {
                 ...newIcons[source.id],
                 slot: toSlot
             };
          }
      }

      return { ...prev, Icons: newIcons };
    });
    
    if (selectedSlot === fromSlot) {
        setLastFocusedSlot(toSlot);
        const newSelected = new Set(selectedSlots);
        newSelected.delete(fromSlot);
        newSelected.add(toSlot);
        setSelectedSlots(newSelected);
    }
  };

  const handleUpdateIcon = (id: string, newIcon: TrMenuIcon) => {
    setConfig(prev => ({
      ...prev,
      Icons: {
        ...prev.Icons,
        [id]: newIcon
      }
    }));
  };

  const handleRowsChange = (newRows: number) => {
      if (newRows < rows) {
          const slotsToRemoveStart = newRows * 9;
          const hasOccupiedSlots = Object.values(config.Icons || {}).some((icon: any) => {
               const iconSlots = Array.isArray(icon.slot) ? icon.slot : [icon.slot];
               return iconSlots.some((s: number) => Number(s) >= slotsToRemoveStart);
          });
          
          if (hasOccupiedSlots) {
              setPendingRowCount(newRows);
              setShowRowDeleteConfirm(true);
              return;
          }
      }

      setRows(newRows);
      setConfig(prev => ({ ...prev, _rows: newRows }));
  };

  const confirmRowChange = () => {
      if (pendingRowCount === null) return;
      
      const slotsToRemoveStart = pendingRowCount * 9;
      
      const newIcons = { ...config.Icons };
      Object.keys(newIcons).forEach(key => {
          const icon = newIcons[key];
          if (Array.isArray(icon.slot)) {
               const validSlots = icon.slot.filter((s: string | number) => Number(s) < slotsToRemoveStart);
               if (validSlots.length === 0) {
                   delete newIcons[key];
               } else {
                   newIcons[key] = { ...icon, slot: validSlots };
               }
          } else if (typeof icon.slot === 'number' || typeof icon.slot === 'string') {
              if (Number(icon.slot) >= slotsToRemoveStart) {
                  delete newIcons[key];
              }
          }
      });
      
      setConfig(prev => ({ ...prev, Icons: newIcons, _rows: pendingRowCount }));
      setRows(pendingRowCount);
      setShowRowDeleteConfirm(false);
      setPendingRowCount(null);
  };
  
  const handleRenameIcon = (oldId: string, newId: string) => {
    if (oldId === newId) return;
    if (!newId.trim()) return;
    
    setConfig(prev => {
      const newIcons: Record<string, TrMenuIcon> = { ...prev.Icons };
      const oldIcon = newIcons[oldId];
      
      if (newIcons[newId]) {
        const targetIcon = newIcons[newId];
        
        const normalize = (s: number | string | (number | string)[] | undefined): number[] => {
            if (s === undefined) return [];
            if (Array.isArray(s)) return s.map(Number);
            if (typeof s === 'number') return [s];
            if (typeof s === 'string') {
                if (s.includes('-')) {
                    const [start, end] = s.split('-').map(Number);
                    const res = [];
                    for(let i=start; i<=end; i++) res.push(i);
                    return res;
                }
                if (s.includes(',')) return s.split(',').map(Number);
                return [Number(s)];
            }
            return [];
        };
        
        const targetSlots = normalize(targetIcon.slot);
        const sourceSlots = normalize(oldIcon.slot);
        
        const combined = Array.from(new Set([...targetSlots, ...sourceSlots]));
        
        newIcons[newId] = {
          ...targetIcon,
          slot: combined
        };
        
        delete newIcons[oldId];
        toast.success(`ID合并成功: ${oldId} -> ${newId}`);
      } else {
        const renamedIcons: Record<string, TrMenuIcon> = {};
        Object.keys(newIcons).forEach(key => {
            if (key === oldId) {
                renamedIcons[newId] = newIcons[oldId];
            } else {
                renamedIcons[key] = newIcons[key];
            }
        });
        return { ...prev, Icons: renamedIcons };
      }
      return { ...prev, Icons: newIcons };
    });
  };

  const handleDeleteIcon = (id: string) => {
      setConfig(prev => {
          const newIcons = { ...prev.Icons };
          const icon = newIcons[id];
          if (!icon) return prev;

          const normalize = (s: any): number[] => {
              if (s === undefined) return [];
              if (Array.isArray(s)) return s.map(Number);
              if (typeof s === 'number') return [s];
              if (typeof s === 'string') {
                  if (s.includes('-')) {
                      const [start, end] = s.split('-').map(Number);
                      const res = [];
                      if (!isNaN(start) && !isNaN(end)) {
                        for(let i=start; i<=end; i++) res.push(i);
                      }
                      return res;
                  }
                  if (s.includes(',')) return s.split(',').map(Number).filter(n => !isNaN(n));
                  const n = Number(s);
                  return isNaN(n) ? [] : [n];
              }
              return [];
          };

          const currentSlots = normalize(icon.slot);
          const slotsToDelete = currentSlots.filter(s => selectedSlots.has(s));
          
          if (slotsToDelete.length === 0) {
               delete newIcons[id];
          } else {
              const remainingSlots = currentSlots.filter(s => !selectedSlots.has(s));
              
              if (remainingSlots.length === 0) {
                  delete newIcons[id];
              } else {
                  remainingSlots.sort((a, b) => a - b);
                  if (remainingSlots.length === 1) {
                      newIcons[id] = { ...icon, slot: remainingSlots[0] };
                  } else {
                      newIcons[id] = { ...icon, slot: remainingSlots };
                  }
              }
          }
          
          return { ...prev, Icons: newIcons };
      });
      setLastFocusedSlot(null);
      setSelectedSlots(new Set());
  };

  const confirmDeleteId = () => {
      if (!deletingId) return;
      setConfig(prev => {
          const newIcons = { ...prev.Icons };
          delete newIcons[deletingId];
          return { ...prev, Icons: newIcons };
      });
      setDeletingId(null);
      setHighlightedId(null);
      toast.success(`已删除 ID: ${deletingId}`);
  };
  
  const handleCopyIcon = (id: string) => {
      if (selectedSlots.size > 1) {
           const items: { relativeSlot: number, id: string, icon: TrMenuIcon }[] = [];
           const sortedSlots = Array.from(selectedSlots).sort((a, b) => a - b);
           const anchor = sortedSlots[0];
           
           sortedSlots.forEach(slot => {
               const content = slotContent[slot];
               if (content) {
                   items.push({
                       relativeSlot: slot - anchor,
                       id: content.id,
                       icon: JSON.parse(JSON.stringify(content.icon))
                   });
               }
           });
           
           if (items.length > 0) {
               setClipboard({ type: 'batch', data: items });
               toast.success(`已复制 ${items.length} 个图标`);
           }
           return;
       }
 
       let targetId = id;
       if (!targetId && selectedSlots.size === 1) {
           const slot = Array.from(selectedSlots)[0];
           const content = slotContent[slot];
           if (content) targetId = content.id;
       }

       if (!config.Icons[targetId]) return;
       setClipboard({ type: 'single', data: { id: targetId, icon: JSON.parse(JSON.stringify(config.Icons[targetId])) } });
       toast.success('图标已复制', { description: `已复制 ID: ${targetId}` });
   };

  const handlePasteIcon = () => {
      if (!clipboard || selectedSlots.size === 0) return;
      
      const targetSlots = Array.from(selectedSlots).sort((a, b) => a - b);
      
      setConfig(prev => {
          const newIcons = { ...prev.Icons };
          
          const addSlotToId = (id: string, slot: number, iconData: TrMenuIcon) => {
              if (newIcons[id]) {
                  let existingSlots: number[] = [];
                  if (typeof newIcons[id].slot === 'number') existingSlots = [newIcons[id].slot as number];
                  else if (Array.isArray(newIcons[id].slot)) existingSlots = (newIcons[id].slot as any[]).map(Number);
                  else if (typeof newIcons[id].slot === 'string') {
                      existingSlots = []; 
                       if ((newIcons[id].slot as string).includes('-')) {
                          const [s, e] = (newIcons[id].slot as string).split('-').map(Number);
                          for(let i=s; i<=e; i++) existingSlots.push(i);
                       } else if ((newIcons[id].slot as string).includes(',')) {
                          existingSlots = (newIcons[id].slot as string).split(',').map(Number);
                       } else {
                          existingSlots = [Number(newIcons[id].slot)];
                       }
                  }

                  if (!existingSlots.includes(slot)) {
                      newIcons[id] = {
                          ...newIcons[id],
                          slot: [...existingSlots, slot].sort((a, b) => a - b)
                      };
                  }
              } else {
                  newIcons[id] = {
                      ...iconData,
                      slot: slot,
                      _page: currentPage
                  };
              }
          };

          if (clipboard.type === 'batch') {
              const items = clipboard.data as { relativeSlot: number, id: string, icon: TrMenuIcon }[];
              const anchor = targetSlots[0]; 
              
              items.forEach(item => {
                  const targetSlot = anchor + item.relativeSlot;
                  if (targetSlot < rows * 9) {
                      addSlotToId(item.id, targetSlot, item.icon);
                  }
              });
              toast.success('图标已粘贴', { description: `已粘贴 ${items.length} 个图标 (保持原ID)` });

          } else {
              const source = clipboard.data as { id: string, icon: TrMenuIcon };
              targetSlots.forEach(targetSlot => {
                  addSlotToId(source.id, targetSlot, source.icon);
              });
              toast.success('图标已粘贴', { description: `已粘贴 ${targetSlots.length} 个图标 (保持原ID)` });
          }
          
          return {
              ...prev,
              Icons: newIcons
          };
      });
  };
  
  const handleUpdateConfig = (newConfig: TrMenuConfiguration) => {
      setConfig(newConfig);
  };

  const handleCreateIcon = () => {
    if (selectedSlots.size === 0) return;
    
    const targetSlots = Array.from(selectedSlots);
    const newIconsToAdd: Record<string, TrMenuIcon> = {};
    
    targetSlots.forEach(slot => {
        let newId = `icon_${Date.now()}_${slot}`; 
        const simpleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        for (const char of simpleChars) {
            if (!config.Icons[char] && !newIconsToAdd[char]) {
                newId = char;
                break;
            }
        }
    
        const newIcon: TrMenuIcon = {
            display: {
                mats: 'stone',
                name: '&fNew Item',
                lore: []
            },
            slot: slot,
            _page: currentPage
        };
        newIconsToAdd[newId] = newIcon;
    });

    setConfig(prev => ({
        ...prev,
        Icons: {
            ...prev.Icons,
            ...newIconsToAdd
        }
    }));
  };

  const handleSaveClick = () => {
    setShowSaveDialog(true);
    setSaveFilename(initialFilename); // Use current filename
    setIsSaving(false);
    setSaveProgress(0);
  };

  const handleConfirmSave = async () => {
      setIsSaving(true);
      
      for (let i = 0; i <= 100; i += 20) {
          setSaveProgress(i);
          await new Promise(r => setTimeout(r, 50));
      }

      const success = handleSave(); 
      
      if (success) {
          await new Promise(r => setTimeout(r, 200));
          setIsSaving(false);
          setShowSaveDialog(false);
          toast.success('保存成功');
      } else {
          setIsSaving(false);
      }
  };

  const handleSave = () => {
    try {
      const exportConfig = convertToLayoutConfig(config, rows);
      
      const yamlStr = dumpYaml(exportConfig);

      const blob = new Blob([yamlStr], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = saveFilename.endsWith('.yml') || saveFilename.endsWith('.yaml') ? saveFilename : `${saveFilename}.yml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update filename if changed during save
      if (saveFilename !== initialFilename && onFilenameChange) {
          onFilenameChange(saveFilename);
      }

      // Update dirty state
      lastSavedConfigRef.current = JSON.stringify(config);
      if (onDirtyChangeRef.current) onDirtyChangeRef.current(false);
      
      return true;

    } catch (e) {
      console.error('Failed to save', e);
      alert('保存文件失败');
      return false;
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onFilenameChange) {
        onFilenameChange(file.name);
        setSaveFilename(file.name);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed = yaml.load(content) as any;
        
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid YAML format');
        }

        if (!parsed.Icons && !parsed.Layout && !parsed.Shape && !parsed.Title && !parsed.Buttons) {
            const keys = Object.keys(parsed);
            const looksLikeButtons = keys.length > 0 && keys.every(k => {
                const v = parsed[k];
                return typeof v === 'object' && (v.display || v.actions || v.icons || v.update || v.REFRESH || v.display_name);
            });
            
            if (looksLikeButtons) {
                console.log('Detected partial config (Buttons only), wrapping in Icons...');
                parsed = { Icons: parsed, Title: ['Imported Menu'] };
            }
        }
        
        if (!parsed.Icons) parsed.Icons = {};
        if (!parsed.Title) parsed.Title = ['Menu'];

        const finalConfig = parseLayoutConfig(parsed);
        
        let maxSlot = 0;
        Object.values(finalConfig.Icons).forEach((icon: any) => {
             const s = icon.slot;
             if (typeof s === 'number') maxSlot = Math.max(maxSlot, s);
             else if (Array.isArray(s)) s.forEach((n:any) => maxSlot = Math.max(maxSlot, Number(n) || 0));
        });
        const importedRows = Math.max(1, Math.ceil((maxSlot + 1) / 9));
        
        setConfig(finalConfig);
        setLastFocusedSlot(null);
        setSelectedSlots(new Set());
        setRows(Math.min(6, Math.max(1, importedRows)));
        setCurrentPage(0);
        
        // Update dirty state
        lastSavedConfigRef.current = JSON.stringify(finalConfig);
        if (onDirtyChange) onDirtyChange(false);
        
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        
        toast.success('导入成功', {
            description: 'Layout 已转换为绝对槽位 (Slot) 以支持可视化编辑。'
        });
      } catch (e) {
        console.error('Failed to import menu:', e);
        toast.error('导入失败', {
            description: '文件格式错误或内容无效'
        });
      }
    };
    reader.readAsText(file);
  };

  const handleOpenSettings = () => {
    setLastFocusedSlot(null);
    setSelectedSlots(new Set());
    setShowSettings(true);
    if (mode === 'canvas-node' && menuId && workspaceContext) {
        workspaceContext.setActiveMenuId(menuId);
    }
  };

  const handleClearDesign = () => {
      setConfig(prev => ({
          ...prev,
          Icons: {}
      }));
      setShowClearConfirm(false);
      toast.success("设计已清空");
  };

  const handleThemeChange = (themeId: string) => {
    applyTheme(themeId);
    setCurrentTheme(themeId);
    safeStorage.setItem('theme', themeId);
    setShowThemePicker(false);
  };

  useEffect(() => {
    // Clear selection when not active
    if (!isActive) {
        setLastFocusedSlot(null);
        setSelectedSlots(new Set());
        setShowSettings(false);
    }
  }, [isActive]);

  useEffect(() => {
    // Initialize theme
    applyTheme(currentTheme);
  }, []);

  // Use refs to access latest state in event listener without rebuilding it
  const stateRef = useRef({ selectedIconId, selectedSlots, clipboard, canUndo, config });
  const handlersRef = useRef({ handleCopyIcon, handlePasteIcon, handleDeleteIcon, handleSaveClick, undo });

  useEffect(() => {
      stateRef.current = { selectedIconId, selectedSlots, clipboard, canUndo, config };
      handlersRef.current = { handleCopyIcon, handlePasteIcon, handleDeleteIcon, handleSaveClick, undo };
  }, [selectedIconId, selectedSlots, clipboard, canUndo, config, handleCopyIcon, handlePasteIcon, handleDeleteIcon, handleSaveClick, undo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always check isActive first
      if (!isActive) return;
      
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      
      // Allow shortcuts if not typing in an input
      if (isInput) return;

      const { selectedIconId, selectedSlots, clipboard, canUndo } = stateRef.current;
      const { handleCopyIcon, handlePasteIcon, handleDeleteIcon, handleSaveClick, undo } = handlersRef.current;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c') {
          e.preventDefault();
          if (selectedIconId || selectedSlots.size > 0) {
             handleCopyIcon(selectedIconId || '');
          }
        } else if (e.key === 'v') {
          e.preventDefault();
          if (clipboard && selectedSlots.size > 0) {
             handlePasteIcon();
          }
        } else if (e.key === 'z') {
            e.preventDefault();
            if (canUndo) {
                undo();
                toast.info("已撤销");
            }
        } else if (e.key === 's') {
            e.preventDefault();
            handleSaveClick();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedIconId) {
              e.preventDefault();
              handleDeleteIcon(selectedIconId);
              toast.success(`已删除 ID: ${selectedIconId}`);
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]); // Only rebuild if isActive changes

  // If in canvas mode, sync panels to workspace context
  useEffect(() => {
      if (mode !== 'canvas-node' || !menuId || !workspaceContext) return;
      
      // Only update if this is the active menu
      if (workspaceContext.activeMenuId !== menuId) return;

      const propertyPanelContent = selectedIcon ? (
        <PropertyPanel 
             iconId={selectedIconId!}
             icon={selectedIcon}
             onChange={handleUpdateIcon}
             onRename={handleRenameIcon}
             onDelete={handleDeleteIcon}
             onCopy={handleCopyIcon}
             openMenus={openMenus}
             currentMenuName={saveFilename}
         />
      ) : (showSettings || selectedSlot === null) ? (
        <MenuSettingsPanel 
          config={config} 
          onChange={handleUpdateConfig}
          rows={rows}
          onRowsChange={handleRowsChange}
        />
      ) : (
         <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
          <div className="p-4 rounded-full bg-secondary/50">
             <Plus className="h-8 w-8 opacity-50" />
          </div>
          <div className="space-y-2">
             <p className="font-medium text-foreground">当前槽位为空</p>
             <p className="text-xs">您可以创建一个新图标或从其他位置拖拽图标到此处。</p>
          </div>
          <div className="flex flex-col gap-2 w-full">
              <Button onClick={handleCreateIcon} className="w-full">
                 创建图标
              </Button>
              {clipboard && (
                  <Button variant="secondary" onClick={handlePasteIcon} className="w-full gap-2">
                      <ClipboardPaste className="h-4 w-4" />
                      粘贴图标 ({clipboard.type === 'single' ? (clipboard.data as { id: string }).id : `${(clipboard.data as any[]).length}个`})
                  </Button>
              )}
          </div>
        </div>
      );

      // Prepare ID List
      const idListContent = (() => {
        const counts: Record<string, number> = {};
        Object.keys(config.Icons).forEach(key => {
            const icon = config.Icons[key];
            let count = 0;
            if (typeof icon.slot === 'number') count = 1;
            else if (Array.isArray(icon.slot)) count = icon.slot.length;
            else if (typeof icon.slot === 'string') {
                 if (icon.slot.includes('-')) {
                     const [s, e] = icon.slot.split('-').map(Number);
                     count = (!isNaN(s) && !isNaN(e)) ? (Math.abs(e - s) + 1) : 0;
                 } else if (icon.slot.includes(',')) {
                     count = icon.slot.split(',').length;
                 } else {
                     const n = Number(icon.slot);
                     count = isNaN(n) ? 0 : 1;
                 }
            }
            counts[key] = count;
        });
        
        const ids = Object.keys(config.Icons).filter(id => counts[id] > 0).sort();

        return (
             <div className="w-full h-full flex flex-col">
                <div className="p-3 border-b bg-muted/20 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold text-sm">组件列表</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={saveFilename}>
                                {saveFilename}
                            </span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0" 
                            onClick={() => setShowYamlPanel(!showYamlPanel)} 
                            title={showYamlPanel ? "隐藏 YAML 编辑" : "显示 YAML 编辑"}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {ids.map(id => (
                        <div 
                            key={id}
                            onClick={() => {
                                setHighlightedId(id === highlightedId ? null : id);
                                if (workspaceContext.activeMenuId !== menuId) {
                                    workspaceContext.setActiveMenuId(menuId);
                                }
                            }}
                            className={`
                                px-2 py-1.5 rounded text-xs font-mono cursor-pointer flex items-center justify-between group
                                ${highlightedId === id 
                                    ? 'bg-primary/10 text-primary font-medium border border-primary/20' 
                                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <span className="truncate flex-1" title={id}>{id}</span>
                            <div className="flex items-center gap-1 ml-2">
                                <span className="text-[10px] bg-muted-foreground/10 px-1.5 py-0.5 rounded text-muted-foreground font-medium min-w-[1.25rem] text-center">
                                    {counts[id]}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHighlightedId(id);
                                        setDeletingId(id);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-2 border-t text-[10px] text-muted-foreground text-center">
                    点击高亮 / Ctrl+C 复制
                </div>
             </div>
        );
      })();

      workspaceContext.setPanelContent({
          propertyPanel: propertyPanelContent,
          idList: idListContent
      });

  }, [config, selectedIcon, selectedSlot, showSettings, highlightedId, mode, menuId, workspaceContext?.activeMenuId, saveFilename]);
  
  // Render Canvas Node View
  if (mode === 'canvas-node') {
      return (
          <div className="w-fit min-w-max relative flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                 <span className="text-xs font-mono text-muted-foreground">Page {currentPage + 1}</span>
                 <div className="flex items-center gap-1">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage(p => Math.max(0, p - 1));
                        }} 
                        disabled={currentPage === 0}
                     >
                         <ChevronLeft className="h-3 w-3" />
                     </Button>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentPage(p => p + 1);
                        }}
                     >
                         <ChevronRight className="h-3 w-3" />
                     </Button>
                 </div>
              </div>

              <MenuGrid 
                  rows={rows}
                  selectedSlots={selectedSlots} 
                  onSlotClick={handleSlotClick}
                  slotContent={slotContent}
                  onMoveItem={handleMoveItem}
                  highlightedId={highlightedId}
                  title={config.Title}
                  titleUpdateInterval={config['Title-Update']}
                  onRowsChange={(r) => {
                      setRows(r);
                      setConfig(prev => ({ ...prev, _rows: r }));
                  }}
                  zoom={zoom}
              />
              
              {/* YAML Preview Panel Dialog for Canvas Mode */}
              <Dialog open={showYamlPanel} onOpenChange={setShowYamlPanel}>
                  <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                      <DialogHeader>
                          <DialogTitle>YAML 预览与编辑</DialogTitle>
                          <DialogDescription>
                              实时查看和编辑当前菜单的 YAML 配置。
                          </DialogDescription>
                      </DialogHeader>
                      <div className="flex-1 overflow-hidden border rounded-md">
                           <YamlEditor
                              value={convertToLayoutConfig(config, rows)}
                              onChange={(newYamlConfig) => {
                                   try {
                                       const parsed = parseLayoutConfig(newYamlConfig);
                                       let maxSlot = 0;
                                       Object.values(parsed.Icons).forEach((icon: any) => {
                                            const s = icon.slot;
                                            if (typeof s === 'number') maxSlot = Math.max(maxSlot, s);
                                            else if (Array.isArray(s)) s.forEach((n:any) => maxSlot = Math.max(maxSlot, Number(n) || 0));
                                       });
                                       const newRows = Math.max(1, Math.ceil((maxSlot + 1) / 9));
                                       if (newRows > rows) setRows(Math.min(6, newRows));
                                       setConfig(parsed);
                                   } catch(e) {
                                       console.error(e);
                                   }
                              }}
                              className="h-full"
                           />
                      </div>
                  </DialogContent>
              </Dialog>

              <Dialog open={showSaveDialog} onOpenChange={(open) => !isSaving && setShowSaveDialog(open)}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>保存菜单配置</DialogTitle>
                    <DialogDescription>
                      请输入要保存的文件名。文件将以 YAML 格式导出。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="filename" className="text-right">
                        文件名
                      </Label>
                      <Input
                        id="filename"
                        value={saveFilename}
                        onChange={(e) => setSaveFilename(e.target.value)}
                        className="col-span-3"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  
                  {isSaving && (
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-4 relative">
                          <div 
                            className="bg-primary h-full transition-all duration-300 ease-out"
                            style={{ width: `${saveProgress}%` }}
                          />
                      </div>
                  )}

                  <DialogFooter>
                    {!isSaving ? (
                        <>
                            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>取消</Button>
                            <Button onClick={handleConfirmSave}>确认保存</Button>
                        </>
                    ) : (
                        <Button disabled className="w-full">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            正在导出... {saveProgress}%
                        </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                        <DialogDescription>
                            确定要删除 ID 为 <span className="font-mono font-bold text-foreground">{deletingId}</span> 的所有按钮吗？
                            <br />
                            此操作将移除该 ID 下的所有槽位配置。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingId(null)}>取消</Button>
                        <Button variant="destructive" onClick={confirmDeleteId}>确认删除</Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>清空设计确认</DialogTitle>
                          <DialogDescription>
                              确定要清空当前的所有图标配置吗？此操作无法撤销。
                              <br/>
                              <span className="text-xs text-muted-foreground">注意：菜单标题和属性设置将保留。</span>
                          </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                          <Button variant="outline" onClick={() => setShowClearConfirm(false)}>取消</Button>
                          <Button variant="destructive" onClick={handleClearDesign}>确认清空</Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

              <Dialog open={showRowDeleteConfirm} onOpenChange={setShowRowDeleteConfirm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>删除行确认</DialogTitle>
                    <DialogDescription>
                      您当前操作的菜单行内有槽位功能，请问是否继续删除？
                      <br />
                      继续操作将移除该行内的所有图标。
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRowDeleteConfirm(false)}>取消</Button>
                    <Button variant="destructive" onClick={confirmRowChange}>确认删除</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
      );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-14 border-b flex items-center px-4 justify-between bg-background/95 backdrop-blur z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">菜单编辑器</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenSettings}>
             <Settings className="h-4 w-4" />
             菜单属性
           </Button>
           <div className="w-px h-6 bg-border mx-2" />
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".yml,.yaml" 
             onChange={handleFileChange}
           />
           <Button variant="outline" size="sm" className="gap-2" onClick={handleImportClick}>
             <Upload className="h-4 w-4" />
             导入配置
           </Button>
           <Button size="sm" className="gap-2" onClick={handleSaveClick}>
             <Save className="h-4 w-4" />
             保存菜单 ({saveFilename})
           </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - ID List */}
        <div className="w-48 bg-background border-r flex flex-col z-20">
            <div className="p-3 border-b bg-muted/20 flex items-center justify-between">
                <h3 className="font-semibold text-sm">ID 列表</h3>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setShowYamlPanel(!showYamlPanel)} 
                    title={showYamlPanel ? "隐藏 YAML 编辑" : "显示 YAML 编辑"}
                >
                    <LayoutTemplate className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {(() => {
                    const counts: Record<string, number> = {};
                    Object.keys(config.Icons).forEach(key => {
                        const icon = config.Icons[key];
                        let count = 0;
                        if (typeof icon.slot === 'number') count = 1;
                        else if (Array.isArray(icon.slot)) count = icon.slot.length;
                        else if (typeof icon.slot === 'string') {
                             if (icon.slot.includes('-')) {
                                 const [s, e] = icon.slot.split('-').map(Number);
                                 count = (!isNaN(s) && !isNaN(e)) ? (Math.abs(e - s) + 1) : 0;
                             } else if (icon.slot.includes(',')) {
                                 count = icon.slot.split(',').length;
                             } else {
                                 const n = Number(icon.slot);
                                 count = isNaN(n) ? 0 : 1;
                             }
                        }
                        counts[key] = count;
                    });
                    
                    const ids = Object.keys(config.Icons).filter(id => counts[id] > 0).sort();

                    return ids.map(id => (
                        <div 
                            key={id}
                            onClick={() => setHighlightedId(id === highlightedId ? null : id)}
                            className={`
                                px-2 py-1.5 rounded text-xs font-mono cursor-pointer flex items-center justify-between group
                                ${highlightedId === id 
                                    ? 'bg-primary/10 text-primary font-medium border border-primary/20' 
                                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <span className="truncate flex-1" title={id}>{id}</span>
                            <div className="flex items-center gap-1 ml-2">
                                <span className="text-[10px] bg-muted-foreground/10 px-1.5 py-0.5 rounded text-muted-foreground font-medium min-w-[1.25rem] text-center">
                                    {counts[id]}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setHighlightedId(id);
                                        setDeletingId(id);
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ));
                })()}
            </div>
            <div className="p-2 border-t text-[10px] text-muted-foreground text-center">
                点击高亮 / Ctrl+C 复制
            </div>
        </div>

        {/* YAML Preview Panel */}
        {showYamlPanel && (
            <div className="w-80 border-r bg-background flex flex-col z-20 transition-all duration-300 shadow-md">
                <div className="p-3 border-b bg-muted/20">
                     <h3 className="font-semibold text-sm">YAML 编辑预览</h3>
                </div>
                <div className="flex-1 p-0 overflow-hidden relative">
                     <YamlEditor
                        value={convertToLayoutConfig(config, rows)}
                        onChange={(newYamlConfig) => {
                             try {
                                 const parsed = parseLayoutConfig(newYamlConfig);
                                 
                                  let maxSlot = 0;
                                    Object.values(parsed.Icons).forEach((icon: any) => {
                                         const s = icon.slot;
                                         if (typeof s === 'number') maxSlot = Math.max(maxSlot, s);
                                         else if (Array.isArray(s)) s.forEach((n:any) => maxSlot = Math.max(maxSlot, Number(n) || 0));
                                    });
                                    const newRows = Math.max(1, Math.ceil((maxSlot + 1) / 9));
                                    if (newRows > rows) setRows(Math.min(6, newRows));

                                 setConfig(parsed);
                             } catch(e) {
                                 console.error(e);
                             }
                        }}
                        className="h-full"
                     />
                </div>
            </div>
        )}
        
        {/* Center - Canvas */}
        <div className="flex-1 bg-secondary/10 flex flex-col overflow-hidden relative">
           {/* Tab Bar Injection - Placed here to be to the right of ID list */}
           {tabBar && (
              <div className="w-full bg-background border-b z-20 shrink-0">
                  {tabBar}
              </div>
           )}

          <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                  backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
              }}></div>
              
              {/* Floating Toolbar */}
              <div className="absolute right-6 top-6 flex flex-col gap-2 p-1.5 bg-background/80 backdrop-blur border rounded-full shadow-sm z-10 transition-all hover:bg-background hover:shadow-md">
                  <TooltipProvider delayDuration={0}>
                      {onInvite && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={onInvite}
                              >
                                  <Users className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                              <p>邀请协作</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {userName && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 relative"
                                  onClick={onChatClick}
                              >
                                  <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className="text-xs font-bold">{userName.charAt(0).toUpperCase()}</span>
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                              <p>{userName} ({isConnected ? '已连接' : '未连接'}) - 点击打开协作面板</p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setShowClearConfirm(true)}
                              >
                                  <RotateCcw className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                              <p>清空设计</p>
                          </TooltipContent>
                      </Tooltip>
                      
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <div className="relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={() => setShowThemePicker(!showThemePicker)}
                                >
                                    <Palette className="h-4 w-4" />
                                </Button>
                                {showThemePicker && (
                                    <div className="absolute right-10 top-0 flex flex-col gap-1 p-2 bg-popover border rounded-md shadow-md min-w-[180px] z-50 animate-in fade-in zoom-in-95 max-h-[400px] overflow-y-auto">
                                        {themes.map(t => (
                                            <button
                                                key={t.id}
                                                className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground text-left w-full whitespace-nowrap ${currentTheme === t.id ? 'bg-accent' : ''}`}
                                                onClick={() => handleThemeChange(t.id)}
                                            >
                                                <div className={`w-3 h-3 rounded-full border shrink-0 ${t.color}`} />
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                              </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                              <p>切换主题</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </div>

              <div className="space-y-4 text-center z-0">
                {/* Pagination Controls */}
                <div className="flex items-center justify-center gap-4 bg-background/80 backdrop-blur-sm p-2 rounded-lg border shadow-sm w-fit mx-auto">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-mono text-sm font-medium w-16 text-center">
                        Page {currentPage + 1}
                    </span>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="bg-background/80 backdrop-blur-sm p-6 rounded-xl border shadow-sm relative">
                    <div className="absolute top-2 right-2 text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded">
                        Page {currentPage + 1}
                    </div>
                    <MenuGrid 
                  rows={rows}
                  selectedSlots={selectedSlots} 
                  onSlotClick={handleSlotClick}
                  slotContent={slotContent}
                  onMoveItem={handleMoveItem}
                  highlightedId={highlightedId}
                  title={config.Title}
                  titleUpdateInterval={config['Title-Update']}
                  onRowsChange={handleRowsChange}
                />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                {selectedSlot !== null ? `当前选中槽位: ${selectedSlot} (Page ${currentPage + 1})` : '点击槽位进行编辑，或点击上方“菜单属性”按钮'}
                </p>
              </div>
              <ShortcutHints />
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-80 border-l bg-background p-4 overflow-y-auto shadow-sm z-10">
           <div className="space-y-4">
             {selectedIcon ? (
               <PropertyPanel 
                    iconId={selectedIconId!}
                    icon={selectedIcon}
                    onChange={handleUpdateIcon}
                    onRename={handleRenameIcon}
                    onDelete={handleDeleteIcon}
                    onCopy={handleCopyIcon}
                    openMenus={openMenus}
                    currentMenuName={saveFilename}
                />
             ) : (showSettings || selectedSlot === null) ? (
               <MenuSettingsPanel 
                 config={config} 
                 onChange={handleUpdateConfig}
                 rows={rows}
                 onRowsChange={handleRowsChange}
               />
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
                 <div className="p-4 rounded-full bg-secondary/50">
                    <Plus className="h-8 w-8 opacity-50" />
                 </div>
                 <div className="space-y-2">
                    <p className="font-medium text-foreground">当前槽位为空</p>
                    <p className="text-xs">您可以创建一个新图标或从其他位置拖拽图标到此处。</p>
                 </div>
                 <div className="flex flex-col gap-2 w-full">
                     <Button onClick={handleCreateIcon} className="w-full">
                        创建图标
                     </Button>
                     {clipboard && (
                         <Button variant="secondary" onClick={handlePasteIcon} className="w-full gap-2">
                             <ClipboardPaste className="h-4 w-4" />
                             粘贴图标 ({clipboard.type === 'single' ? (clipboard.data as { id: string }).id : `${(clipboard.data as any[]).length}个`})
                         </Button>
                     )}
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={(open) => !isSaving && setShowSaveDialog(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>保存菜单配置</DialogTitle>
            <DialogDescription>
              请输入要保存的文件名。文件将以 YAML 格式导出。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filename" className="text-right">
                文件名
              </Label>
              <Input
                id="filename"
                value={saveFilename}
                onChange={(e) => setSaveFilename(e.target.value)}
                className="col-span-3"
                disabled={isSaving}
              />
            </div>
          </div>
          
          {isSaving && (
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-4 relative">
                  <div 
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{ width: `${saveProgress}%` }}
                  />
              </div>
          )}

          <DialogFooter>
            {!isSaving ? (
                <>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)}>取消</Button>
                    <Button onClick={handleConfirmSave}>确认保存</Button>
                </>
            ) : (
                <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    正在导出... {saveProgress}%
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>确认删除</DialogTitle>
                <DialogDescription>
                    确定要删除 ID 为 <span className="font-mono font-bold text-foreground">{deletingId}</span> 的所有按钮吗？
                    <br />
                    此操作将移除该 ID 下的所有槽位配置。
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingId(null)}>取消</Button>
                <Button variant="destructive" onClick={confirmDeleteId}>确认删除</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>清空设计确认</DialogTitle>
                  <DialogDescription>
                      确定要清空当前的所有图标配置吗？此操作无法撤销。
                      <br/>
                      <span className="text-xs text-muted-foreground">注意：菜单标题和属性设置将保留。</span>
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setShowClearConfirm(false)}>取消</Button>
                  <Button variant="destructive" onClick={handleClearDesign}>确认清空</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={showRowDeleteConfirm} onOpenChange={setShowRowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除行确认</DialogTitle>
            <DialogDescription>
              您当前操作的菜单行内有槽位功能，请问是否继续删除？
              <br />
              继续操作将移除该行内的所有图标。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRowDeleteConfirm(false)}>取消</Button>
            <Button variant="destructive" onClick={confirmRowChange}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}));

SingleMenuEditor.displayName = 'SingleMenuEditor';

export default SingleMenuEditor;

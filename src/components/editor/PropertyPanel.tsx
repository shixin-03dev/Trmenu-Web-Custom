import { type TrMenuIcon } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, X, Check, ArrowLeft, Layers, Copy } from 'lucide-react';
import { useState, useEffect } from 'react';

import { MaterialEditor } from './MaterialEditor';
import { ItemRenderer } from './ItemRenderer';
import { cn } from '@/lib/utils';

interface PropertyPanelProps {
  iconId: string;
  icon: TrMenuIcon;
  onChange: (id: string, newIcon: TrMenuIcon) => void;
  onRename?: (oldId: string, newId: string) => void;
  onDelete: (id: string) => void;
  onCopy?: (id: string) => void;
  openMenus?: string[];
  currentMenuName?: string;
}

export const PropertyPanel = ({ iconId, icon, onChange, onRename, onDelete, onCopy, openMenus, currentMenuName }: PropertyPanelProps) => {
  const [editingId, setEditingId] = useState(iconId);
  const [isRenaming, setIsRenaming] = useState(false);
  const [priorityIndex, setPriorityIndex] = useState<number | null>(null);

  // Sync internal state when iconId changes
  useEffect(() => {
    setEditingId(iconId);
    setIsRenaming(false);
    setPriorityIndex(null);
  }, [iconId]);

  const handleRenameSubmit = () => {
    if (editingId !== iconId && onRename) {
      onRename(iconId, editingId);
    }
    setIsRenaming(false);
  };

  const handleSubIconChange = (newSubIcon: TrMenuIcon) => {
    if (priorityIndex === null) return;
    const newIcons = [...(icon.icons || [])];
    newIcons[priorityIndex] = newSubIcon;
    onChange(iconId, { ...icon, icons: newIcons });
  };

  const handlePriorityListChange = (newIcons: TrMenuIcon[]) => {
      onChange(iconId, { ...icon, icons: newIcons });
  };

  // Sub-editor view
  if (priorityIndex !== null) {
      const subIcon = icon.icons?.[priorityIndex];
      if (!subIcon) {
          setPriorityIndex(null);
          return null;
      }

      return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-2 border-b pb-4">
                  <Button variant="ghost" size="icon" onClick={() => setPriorityIndex(null)}>
                      <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary rounded-md flex items-center justify-center overflow-hidden border shrink-0">
                        <ItemRenderer material={subIcon.display.mats} className="w-6 h-6" shiny={subIcon.display.shiny} />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm">优先级图标 #{priorityIndex + 1}</h3>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {subIcon.condition || '无条件'}
                        </p>
                    </div>
                  </div>
              </div>

              <IconEditor 
                  icon={subIcon} 
                  onChange={handleSubIconChange} 
                  isSubIcon={true}
              />
          </div>
      );
  }

  // Main editor view
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          <div className="w-10 h-10 bg-secondary rounded-md flex items-center justify-center overflow-hidden border shrink-0">
             <ItemRenderer material={icon.display.mats} className="w-8 h-8" shiny={icon.display.shiny} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg truncate">图标配置</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono shrink-0">ID:</span>
              {isRenaming ? (
                  <div className="flex items-center gap-1">
                      <Input 
                        value={editingId}
                        onChange={(e) => setEditingId(e.target.value)}
                        className="h-6 flex-1 min-w-0 text-xs font-mono px-1 py-0"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit();
                            if (e.key === 'Escape') {
                                setEditingId(iconId);
                                setIsRenaming(false);
                            }
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRenameSubmit}>
                          <Check className="h-3 w-3 text-green-500" />
                      </Button>
                  </div>
              ) : (
                  <div className="flex items-center gap-1 group cursor-pointer" onClick={() => setIsRenaming(true)} title="点击重命名">
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[100px] group-hover:text-foreground transition-colors">{iconId}</p>
                  </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
            {onCopy && (
                <Button variant="ghost" size="icon" onClick={() => onCopy(iconId)} title="复制图标">
                    <Copy className="h-4 w-4" />
                </Button>
            )}
            <Button variant="destructive" size="icon" onClick={() => onDelete(iconId)} title="删除图标">
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>

      <IconEditor 
          icon={icon} 
          onChange={(newIcon) => onChange(iconId, newIcon)}
          isSubIcon={false}
          onPrioritySelect={setPriorityIndex}
          onPriorityListChange={handlePriorityListChange}
          openMenus={openMenus}
          currentMenuName={currentMenuName}
      />
    </div>
  );
};

// --- Sub Components ---

interface IconEditorProps {
    icon: TrMenuIcon;
    onChange: (icon: TrMenuIcon) => void;
    isSubIcon?: boolean;
    onPrioritySelect?: (index: number) => void;
    onPriorityListChange?: (icons: TrMenuIcon[]) => void;
    openMenus?: string[];
    currentMenuName?: string;
}

const IconEditor = ({ icon, onChange, isSubIcon, onPrioritySelect, onPriorityListChange, openMenus, currentMenuName }: IconEditorProps) => {
    const updateDisplay = (key: keyof TrMenuIcon['display'], value: any) => {
        onChange({
          ...icon,
          display: {
            ...icon.display,
            [key]: value
          }
        });
    };
    
    const updateAction = (type: string, value: string[]) => {
        onChange({
          ...icon,
          actions: {
            ...icon.actions,
            [type]: value
          }
        });
    };

    return (
        <Tabs defaultValue="display" className="w-full">
            <TabsList className={cn("w-full grid", isSubIcon ? "grid-cols-3" : "grid-cols-4")}>
              <TabsTrigger value="display">展示</TabsTrigger>
              <TabsTrigger value="action">动作</TabsTrigger>
              <TabsTrigger value="other">其他</TabsTrigger>
              {!isSubIcon && <TabsTrigger value="priority">优先级</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="display" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>材质 (Material)</Label>
                <MaterialEditor 
                  value={icon.display.mats} 
                  onChange={(val) => updateDisplay('mats', val)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>名称 (Name)</Label>
                <Input 
                  value={Array.isArray(icon.display.name) ? icon.display.name.join('\n') : icon.display.name || ''} 
                  onChange={(e) => updateDisplay('name', e.target.value)}
                  placeholder="支持颜色代码 &aName"
                />
              </div>
    
              <div className="space-y-2">
                <Label>描述 (Lore)</Label>
                <Textarea 
                  value={icon.display.lore?.join('\n') || ''} 
                  onChange={(e) => updateDisplay('lore', e.target.value.split('\n'))}
                  placeholder="每行一条，支持颜色代码"
                  rows={5}
                />
              </div>
    
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label>发光 (Shiny)</Label>
                <Switch 
                  checked={icon.display.shiny || false}
                  onCheckedChange={(c) => updateDisplay('shiny', c)}
                />
              </div>
    
              <div className="space-y-2">
                 <Label>数量 (Amount)</Label>
                 <Input 
                   type="number"
                   value={icon.display.amount || 1}
                   onChange={(e) => updateDisplay('amount', parseInt(e.target.value))}
                 />
              </div>
              
              <div className="space-y-2">
                 <Label>自定义模型数据 (CustomModelData)</Label>
                 <Input 
                   type="number"
                   value={icon.display.custom_model_data || 0}
                   onChange={(e) => updateDisplay('custom_model_data', parseInt(e.target.value))}
                 />
              </div>
            </TabsContent>
    
            <TabsContent value="action" className="space-y-4 pt-4">
              <ActionList 
                title="点击动作 (All Actions)" 
                actions={icon.actions?.all || []}
                onChange={(actions) => updateAction('all', actions)}
                openMenus={openMenus}
                currentMenuName={currentMenuName}
              />
              <ActionList 
                title="左键动作 (Left Click)" 
                actions={icon.actions?.left || []}
                onChange={(actions) => updateAction('left', actions)}
                openMenus={openMenus}
                currentMenuName={currentMenuName}
              />
              <ActionList 
                title="右键动作 (Right Click)" 
                actions={icon.actions?.right || []}
                onChange={(actions) => updateAction('right', actions)}
                openMenus={openMenus}
                currentMenuName={currentMenuName}
              />
            </TabsContent>
    
            <TabsContent value="other" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>显示条件 (Condition / Permission)</Label>
                <Textarea 
                  value={icon.condition || ''}
                  onChange={(e) => onChange({ ...icon, condition: e.target.value })}
                  placeholder="perm *trmenu.use"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">支持 Kether, JavaScript, Jexl</p>
              </div>
    
              <div className="space-y-2">
                 <Label>优先级 (Priority)</Label>
                 <Input 
                   type="number"
                   value={icon.priority || 0}
                   onChange={(e) => onChange({ ...icon, priority: parseInt(e.target.value) })}
                 />
              </div>
    
              {!isSubIcon && (
                  <>
                      <div className="space-y-2">
                         <Label>所属页面 (Page)</Label>
                         <Input 
                           type="number"
                           min={0}
                           value={icon._page || 0}
                           onChange={(e) => onChange({ ...icon, _page: parseInt(e.target.value) })}
                         />
                      </div>
                      
                       <div className="space-y-2">
                         <Label>刷新周期 (Refresh)</Label>
                         <Input 
                           type="number"
                           value={icon.refresh || -1}
                           onChange={(e) => onChange({ ...icon, refresh: parseInt(e.target.value) })}
                         />
                      </div>
                  </>
              )}
            </TabsContent>

            {!isSubIcon && onPrioritySelect && onPriorityListChange && (
                <TabsContent value="priority" className="space-y-4 pt-4">
                    <PriorityList 
                        icons={icon.icons || []}
                        onSelect={onPrioritySelect}
                        onChange={onPriorityListChange}
                    />
                </TabsContent>
            )}
        </Tabs>
    );
};

const PriorityList = ({ icons, onSelect, onChange }: { icons: TrMenuIcon[], onSelect: (idx: number) => void, onChange: (icons: TrMenuIcon[]) => void }) => {
    const handleAdd = () => {
        const newIcon: TrMenuIcon = {
            condition: '',
            priority: 0,
            display: {
                mats: 'stone',
                name: '&fNew Priority Item',
            }
        };
        onChange([...icons, newIcon]);
    };

    const handleDelete = (idx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newIcons = icons.filter((_, i) => i !== idx);
        onChange(newIcons);
    };

    return (
        <div className="space-y-4">
             <div className="flex items-center justify-between">
                <Label>优先级图标列表</Label>
                <Button size="sm" onClick={handleAdd} className="gap-1">
                    <Plus className="h-4 w-4" /> 添加
                </Button>
             </div>
             
             <div className="space-y-2">
                 {icons.length === 0 && (
                     <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                         暂无优先级图标
                     </div>
                 )}
                 {icons.map((icon, idx) => (
                     <div 
                        key={idx} 
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
                        onClick={() => onSelect(idx)}
                     >
                         <div className="flex flex-col items-center gap-1 text-muted-foreground">
                             <Layers className="h-4 w-4" />
                             <span className="text-[10px] font-mono">#{idx + 1}</span>
                         </div>
                         
                         <div className="w-10 h-10 bg-secondary rounded-md flex items-center justify-center overflow-hidden border shrink-0">
                             <ItemRenderer material={icon.display.mats} className="w-8 h-8" shiny={icon.display.shiny} />
                         </div>
                         
                         <div className="flex-1 min-w-0">
                             <p className="text-sm font-medium truncate">
                                 {typeof icon.display.name === 'string' ? icon.display.name : 'Unknown'}
                             </p>
                             <p className="text-xs text-muted-foreground font-mono truncate">
                                 {icon.condition || 'No Condition'}
                             </p>
                         </div>
                         
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(idx, e)}
                         >
                             <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                     </div>
                 ))}
             </div>
        </div>
    );
};

const ensureArray = (val: any): string[] => {
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) {
        return val.map(v => typeof v === 'string' ? v : JSON.stringify(v));
    }
    return [typeof val === 'string' ? val : JSON.stringify(val)];
};

const ActionList = ({ title, actions, onChange, openMenus, currentMenuName }: { title: string, actions: (string | object)[] | string | object | undefined, onChange: (a: string[]) => void, openMenus?: string[], currentMenuName?: string }) => {
  const items = ensureArray(actions);
  
  return (
    <div className="space-y-2 border rounded-md p-3">
      <div className="flex items-center justify-between">
         <Label className="text-xs font-semibold uppercase text-muted-foreground">{title}</Label>
         <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onChange([...items, ''])}>
           <Plus className="h-3 w-3" />
         </Button>
      </div>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">无动作</p>}
      <div className="space-y-2">
        {items.map((action, idx) => (
          <ActionItemEditor 
            key={idx}
            action={action}
            onChange={(newVal) => {
               const newActions = [...items];
               newActions[idx] = newVal;
               onChange(newActions);
            }}
            onDelete={() => {
               const newActions = items.filter((_, i) => i !== idx);
               onChange(newActions);
            }}
            openMenus={openMenus}
            currentMenuName={currentMenuName}
          />
        ))}
      </div>
    </div>
  );
};

const ACTION_TYPES = [
    { value: 'command', label: '玩家命令 (command)' },
    { value: 'console', label: '控制台命令 (console)' },
    { value: 'op', label: 'OP命令 (op)' },
    { value: 'sound', label: '播放声音 (sound)' },
    { value: 'tell', label: '发送消息 (tell)' },
    { value: 'title', label: '发送标题 (title)' },
    { value: 'actionbar', label: 'ActionBar信息 (actionbar)' },
    { value: 'toast', label: '发送通知 (toast)' },
    { value: 'open', label: '打开菜单 (open)' },
    { value: 'close', label: '关闭菜单 (close)' },
    { value: 'return', label: '返回上级 (return)' },
    { value: 'connect', label: '跨服 (connect)' },
    { value: 'json', label: 'JSON消息 (json)' },
    { value: 'js', label: 'JavaScript (js)' },
    { value: 'kether', label: 'Kether脚本 (kether)' },
    { value: 'take-money', label: '扣除金币 (take-money)' },
    { value: 'give-money', label: '给予金币 (give-money)' },
];

const ActionItemEditor = ({ action, onChange, onDelete, openMenus, currentMenuName }: { action: string, onChange: (v: string) => void, onDelete: () => void, openMenus?: string[], currentMenuName?: string }) => {
    // Parse action: "type: value" or just "value" (default command)
    
    let type = 'command';
    let value = action;
    
    // Check if it matches a known type
    const match = action.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) {
        const possibleType = match[1].toLowerCase();
        if (ACTION_TYPES.some(t => t.value === possibleType)) {
            type = possibleType;
            value = match[2];
        }
    } else if (['close', 'return'].includes(action.trim().toLowerCase())) {
        type = action.trim().toLowerCase();
        value = '';
    }

    const handleChangeType = (newType: string) => {
        if (['close', 'return'].includes(newType)) {
            onChange(newType);
        } else {
            onChange(`${newType}: ${value}`);
        }
    };

    const handleChangeValue = (newValue: string) => {
        onChange(`${type}: ${newValue}`);
    };

    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex gap-2 items-start">
                <select 
                    value={type} 
                    onChange={(e) => handleChangeType(e.target.value)}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    {ACTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.value}</option>
                    ))}
                </select>
                
                {!['close', 'return'].includes(type) && (
                    <Input 
                        value={value} 
                        onChange={(e) => handleChangeValue(e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                        placeholder="value..."
                    />
                )}
                
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onDelete}>
                    <X className="h-3 w-3" />
                </Button>
            </div>
            {type === 'open' && openMenus && (
                 <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                     <span>快速选择:</span>
                     <select 
                        className="h-6 rounded border bg-background px-2 text-xs max-w-[200px]"
                        onChange={(e) => {
                            if (e.target.value) handleChangeValue(e.target.value);
                        }}
                        value=""
                     >
                        <option value="" disabled>选择已打开的菜单...</option>
                        {(() => {
                            const filtered = openMenus.filter(m => m !== currentMenuName);
                            if (filtered.length === 0) {
                                return <option disabled>无其他打开菜单</option>;
                            }
                            return filtered.map(m => (
                                <option key={m} value={m.replace(/\.(yml|yaml)$/, '')}>{m}</option>
                            ));
                        })()}
                     </select>
                 </div>
            )}
        </div>
    );
};

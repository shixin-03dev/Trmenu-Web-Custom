import { type TrMenuConfiguration } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X, Trash2, GripVertical, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState, useRef, useEffect } from 'react';
import { getSlots } from '@/lib/layout-utils';
import { MC_COLORS, parseMinecraftColors } from '@/lib/color-utils';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MenuSettingsPanelProps {
  config: TrMenuConfiguration;
  onChange: (newConfig: TrMenuConfiguration) => void;
  rows?: number;
  onRowsChange?: (rows: number) => void;
}

export const MenuSettingsPanel = ({ config, onChange, rows = 6, onRowsChange }: MenuSettingsPanelProps) => {
  const updateConfig = (key: keyof TrMenuConfiguration, value: any) => {
    onChange({
      ...config,
      [key]: value
    });
  };

  const layoutPreview = useMemo(() => {
      // Create empty grid based on rows
      const grid: string[][] = Array(rows).fill(null).map(() => Array(9).fill(' '));
      
      // Fill grid with icons from Page 0
      Object.entries(config.Icons).forEach(([id, icon]) => {
          if ((icon._page || 0) !== 0) return; // Only consider Page 0 for layout preview
          
          const slots = getSlots(icon);
          slots.forEach(slot => {
              const r = Math.floor(slot / 9);
              const c = slot % 9;
              
              if (r < rows && c < 9) {
                  // If ID is single char, use it. Otherwise use backticks
                  if (id.length === 1) {
                      grid[r][c] = id;
                  } else {
                      grid[r][c] = `\`${id}\``;
                  }
              }
          });
      });

      // The spaces in my grid initialization are correct.
      
      return grid.map(row => `'${row.join('')}'`).join('\n');
  }, [config.Icons, rows]);

  const updateBindings = (type: 'Commands' | 'Items', value: string[]) => {
    onChange({
      ...config,
      Bindings: {
        ...config.Bindings,
        [type]: value
      }
    });
  };

  const updateEvents = (type: 'Close', value: string[]) => {
    onChange({
      ...config,
      Events: {
        ...config.Events,
        [type]: value
      }
    });
  };

  const currentUpdateTicks = config['Title-Update'] || -1;
  const isDynamicTitle = currentUpdateTicks > 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="border-b pb-4">
        <h3 className="font-medium text-lg">菜单设置</h3>
        <p className="text-xs text-muted-foreground">全局菜单配置</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="general">常规</TabsTrigger>
          <TabsTrigger value="bindings">绑定</TabsTrigger>
          <TabsTrigger value="events">事件</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="space-y-2">
            <TitleEditor 
                title={config.Title} 
                onChange={(newTitle) => updateConfig('Title', newTitle)} 
            />
          </div>

          <div className="space-y-4 border rounded-md p-4 bg-card shadow-sm">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="text-base">动态标题 (Dynamic Title)</Label>
                    <p className="text-xs text-muted-foreground">是否启用标题轮播动画</p>
                </div>
                <Switch 
                    checked={isDynamicTitle}
                    onCheckedChange={(checked) => updateConfig('Title-Update', checked ? 20 : -1)}
                />
             </div>
             
             {isDynamicTitle && (
                 <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label>刷新周期 (Ticks)</Label>
                    <div className="flex gap-2 items-center">
                        <div className="relative flex-1">
                            <Input 
                                type="number"
                                value={currentUpdateTicks}
                                onChange={(e) => updateConfig('Title-Update', parseInt(e.target.value) || 20)}
                                placeholder="输入 Ticks..."
                                className="pr-12"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                ticks
                            </div>
                        </div>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0" title="查看推荐值">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="end">
                                <div className="space-y-1">
                                    <h4 className="font-medium text-xs mb-2 px-2 text-muted-foreground">推荐预设值</h4>
                                    {[
                                        { label: '极快 (0.25s)', val: 5 },
                                        { label: '快速 (0.5s)', val: 10 },
                                        { label: '标准 (1.0s)', val: 20 },
                                        { label: '慢速 (2.0s)', val: 40 },
                                        { label: '极慢 (5.0s)', val: 100 },
                                    ].map((preset) => (
                                        <Button
                                            key={preset.val}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-xs h-8"
                                            onClick={() => updateConfig('Title-Update', preset.val)}
                                        >
                                            {preset.label} <span className="ml-auto opacity-50">{preset.val}t</span>
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        1 tick = 0.05 秒。设置多行标题配合此选项可实现动画效果。
                    </p>
                 </div>
             )}
          </div>
          
          <div className="space-y-3 border rounded-md p-4 bg-card shadow-sm">
             <div className="space-y-1">
                 <Label className="text-base">菜单行数 (Rows)</Label>
                 <p className="text-xs text-muted-foreground">点击数字按钮快速切换菜单高度</p>
             </div>
             
             <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map(r => (
                    <Button
                        key={r}
                        variant={rows === r ? "default" : "outline"}
                        className={cn(
                            "h-10 text-sm font-medium transition-all",
                            rows === r ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                        )}
                        onClick={() => onRowsChange?.(r)}
                    >
                        {r}
                    </Button>
                ))}
             </div>
          </div>

          <div className="space-y-2">
            <Label>布局预览 (Layout)</Label>
            <Textarea 
              value={layoutPreview} 
              readOnly
              className="font-mono bg-muted text-xs tracking-widest"
              rows={rows}
            />
            <div className="text-xs text-muted-foreground space-y-1">
                <p>根据当前图标位置自动生成。</p>
                <p>
                    <span className="text-yellow-500 font-bold">?</span> 
                    <span className="ml-1">表示该位置有图标，但其 ID 长度超过 1 个字符，为了保持布局对齐，此处显示为问号。</span>
                </p>
                <p className="text-muted-foreground/80">这不影响功能，TrMenu 支持多字符 ID，但在 Layout 模式下推荐使用单字符 ID 以便直观查看。</p>
             </div>
           </div>
        </TabsContent>

        <TabsContent value="bindings" className="space-y-4 pt-4">
          <StringList 
            title="绑定命令 (Commands)" 
            items={config.Bindings?.Commands || []}
            onChange={(items) => updateBindings('Commands', items)}
            placeholder="menu open"
          />
          <StringList 
            title="绑定物品 (Items)" 
            items={config.Bindings?.Items || []}
            onChange={(items) => updateBindings('Items', items)}
            placeholder="material:diamond"
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4 pt-4">
          <StringList 
            title="关闭菜单动作 (Close Actions)" 
            items={config.Events?.Close || []}
            onChange={(items) => updateEvents('Close', items)}
            placeholder="sound: block.chest.close"
          />
          <div className="p-4 border rounded bg-secondary/10">
            <p className="text-xs text-muted-foreground">
              * Open 事件配置较为复杂，建议直接在 YAML 中配置或后续添加支持。
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SortableTitleItem = ({
    id,
    index,
    line,
    removeLine,
    editorRefs,
    setFocusedIndex,
    handleInput,
    canRemove
}: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex gap-3 items-center group relative">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground outline-none">
                <GripVertical className="h-4 w-4" />
            </div>
            <span className="text-xs font-mono text-muted-foreground/50 w-4 text-center select-none pt-2">{index + 1}</span>
            <div className="flex-1 relative min-h-[40px] bg-background border rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <div
                    ref={el => {
                        if (editorRefs.current) editorRefs.current[index] = el;
                        if (el && document.activeElement !== el) {
                            const currentHTML = el.innerHTML;
                            const newHTML = minecraftToHtml(line);
                            if (stripHtml(currentHTML) !== stripHtml(newHTML)) {
                                el.innerHTML = newHTML;
                            }
                        }
                    }}
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full h-full p-2 min-h-[40px] outline-none font-minecraft text-sm whitespace-pre-wrap"
                    onInput={() => handleInput(index)}
                    onFocus={() => setFocusedIndex(index)}
                    onKeyDown={(e) => e.stopPropagation()}
                    spellCheck={false}
                    style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.1)' }}
                />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-8 top-1/2 -translate-y-1/2 px-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={() => removeLine(index)}
                    disabled={!canRemove}
                    title="删除此行"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
};

const TitleEditor = ({ title, onChange }: { title: string | string[], onChange: (t: string[]) => void }) => {
    const [internalLines, setInternalLines] = useState<{id: string, text: string}[]>(() => 
        (Array.isArray(title) ? title : [title]).map(t => ({ id: crypto.randomUUID(), text: t }))
    );
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [showSource, setShowSource] = useState(false);
    
    // Using refs to access contentEditable elements
    const editorRefs = useRef<(HTMLDivElement | null)[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    useEffect(() => {
        const propLines = Array.isArray(title) ? title : [title];
        
        setInternalLines(prev => {
            const currentContent = prev.map(l => l.text);
            if (JSON.stringify(propLines) === JSON.stringify(currentContent)) {
                return prev;
            }
            
            // Try to preserve IDs by matching index
            return propLines.map((text, index) => {
                if (index < prev.length) {
                    return { id: prev[index].id, text };
                }
                return { id: crypto.randomUUID(), text };
            });
        });
    }, [title]);

    const updateLine = (index: number, val: string) => {
        const newLines = [...internalLines];
        newLines[index].text = val;
        setInternalLines(newLines);
        onChange(newLines.map(l => l.text));
    };

    const addLine = () => {
        const newLines = [...internalLines, { id: crypto.randomUUID(), text: '' }];
        setInternalLines(newLines);
        onChange(newLines.map(l => l.text));
    };

    const removeLine = (index: number) => {
        if (internalLines.length <= 1) return;
        const newLines = internalLines.filter((_, i) => i !== index);
        setInternalLines(newLines);
        onChange(newLines.map(l => l.text));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setInternalLines((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                onChange(newItems.map(i => i.text));
                return newItems;
            });
        }
    };

    // Apply color/style to current selection
    const applyStyle = (code: string) => {
        if (showSource) {
            // In source mode, just insert code (omitted for brevity)
            return;
        }

        if (focusedIndex === null) return;
        
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const editor = editorRefs.current[focusedIndex];
        if (!editor || !editor.contains(range.commonAncestorContainer)) return;

        if (MC_COLORS[code]) {
            document.execCommand('foreColor', false, MC_COLORS[code]);
            triggerInput(focusedIndex);
        } else {
             const commands: Record<string, string> = {
                 'l': 'bold',
                 'o': 'italic',
                 'n': 'underline',
                 'm': 'strikeThrough',
                 'r': 'removeFormat'
             };
             if (commands[code]) {
                 document.execCommand(commands[code]);
                 triggerInput(focusedIndex);
             }
        }
    };
    
    const triggerInput = (index: number) => {
        const editor = editorRefs.current[index];
        if (editor) {
            const mcText = htmlToMinecraft(editor);
            updateLine(index, mcText);
        }
    };
    
    const handleInput = (index: number) => {
        triggerInput(index);
    };

    return (
        <div className="space-y-4 border rounded-md p-4 bg-card shadow-sm">
             <div className="flex flex-col gap-3">
                {/* Toolbar Row */}
                <div className="flex flex-col gap-2 bg-secondary/20 p-2 rounded-lg border">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <Label className="text-base font-semibold">标题编辑器</Label>
                             <div className="text-xs text-muted-foreground ml-2 flex gap-2">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> 所见即所得</span>
                             </div>
                         </div>
                    </div>
                    
                    {/* Color Picker Toolbar */}
                    <div className="flex flex-col gap-2">
                        {/* Colors */}
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(MC_COLORS).map(([code, color]) => (
                                <button
                                    key={code}
                                    className="w-5 h-5 rounded-sm shadow-sm border border-white/10 hover:scale-110 hover:z-10 transition-all active:scale-95"
                                    style={{ backgroundColor: color }}
                                    onClick={() => applyStyle(code)}
                                    onMouseDown={(e) => e.preventDefault()} // Prevent losing focus
                                    title={`Color: &${code}`}
                                />
                            ))}
                        </div>
                        
                        {/* Formats */}
                        <div className="flex gap-1 pt-1 border-t border-border/50">
                            {[
                                { code: 'l', label: 'B', style: 'font-bold', desc: 'Bold' },
                                { code: 'o', label: 'I', style: 'italic', desc: 'Italic' },
                                { code: 'n', label: 'U', style: 'underline', desc: 'Underline' },
                                { code: 'm', label: 'S', style: 'line-through', desc: 'Strikethrough' },
                                { code: 'r', label: 'Tx', style: '', desc: 'Reset Format' },
                            ].map(btn => (
                                <button
                                    key={btn.code}
                                    className={`w-8 h-6 rounded hover:bg-muted-foreground/20 flex items-center justify-center text-xs font-serif transition-colors border border-transparent hover:border-border ${btn.style}`}
                                    onClick={() => applyStyle(btn.code)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    title={`&${btn.code} - ${btn.desc}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="space-y-3">
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={internalLines.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {internalLines.map((line, idx) => (
                            <SortableTitleItem 
                                key={line.id}
                                id={line.id}
                                index={idx}
                                line={line.text}
                                updateLine={updateLine}
                                removeLine={removeLine}
                                editorRefs={editorRefs}
                                setFocusedIndex={setFocusedIndex}
                                handleInput={handleInput}
                                canRemove={internalLines.length > 1}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
             </div>
             
             <div className="flex justify-between items-center pt-2">
                 <Button variant="outline" size="sm" className="border-dashed hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all h-9" onClick={addLine}>
                    <Plus className="h-4 w-4 mr-2" /> 添加新行
                 </Button>
                 
                 <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowSource(!showSource)}>
                        {showSource ? "切换回预览" : "查看源码"}
                     </Button>
                 </div>
             </div>
             
             {showSource && (
                 <div className="mt-4 p-3 bg-muted/50 rounded-md border text-xs font-mono break-all">
                    <p className="mb-2 font-semibold text-muted-foreground">Raw Output:</p>
                    {internalLines.map((l, i) => (
                        <div key={i} className="mb-1">{i+1}: {l.text}</div>
                    ))}
                 </div>
             )}
        </div>
    );
};

// Helper: Convert Minecraft Codes to HTML
const minecraftToHtml = (text: string): string => {
    if (!text) return '';
    const parts = parseMinecraftColors(text);
    return parts.map(p => {
        let styleStr = '';
        if (p.style.color) styleStr += `color:${p.style.color};`;
        if (p.style.fontWeight === 'bold') styleStr += 'font-weight:bold;';
        if (p.style.fontStyle === 'italic') styleStr += 'font-style:italic;';
        if (p.style.textDecoration) styleStr += `text-decoration:${p.style.textDecoration};`;
        
        // Escape HTML in text
        const safeText = p.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return `<span style="${styleStr}">${safeText}</span>`;
    }).join('');
};

// Helper: Convert HTML Element content back to Minecraft Codes
const htmlToMinecraft = (element: HTMLElement): string => {
    let result = '';
    
    // Recursive walker
    const walk = (node: Node, context: { color?: string, bold?: boolean, italic?: boolean, underline?: boolean, strike?: boolean }) => {
        if (node.nodeType === Node.TEXT_NODE) {
            result += node.textContent || '';
            return;
        }
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const newContext = { ...context };
            
            // Detect Color
            // Computed style returns rgb(...) usually. We need to match to closest MC Color.
            // Or, if we use execCommand('foreColor'), it puts <font color="#HEX"> or <span style="color: rgb(...)">
            
            // Simplification: Check inline style first (most reliable for our editor)
            const inlineColor = el.style.color; 
            const inlineFontWeight = el.style.fontWeight;
            const inlineFontStyle = el.style.fontStyle;
            const inlineTextDecoration = el.style.textDecoration;
            
            // Also check tags
            const tagName = el.tagName.toLowerCase();
            const isBold = tagName === 'b' || tagName === 'strong' || inlineFontWeight === 'bold' || parseInt(inlineFontWeight) >= 700;
            const isItalic = tagName === 'i' || tagName === 'em' || inlineFontStyle === 'italic';
            const isUnderline = tagName === 'u' || inlineTextDecoration.includes('underline');
            const isStrike = tagName === 's' || tagName === 'strike' || inlineTextDecoration.includes('line-through');
            
            // Diff Context
            if (isBold && !context.bold) { result += '&l'; newContext.bold = true; }
            if (isItalic && !context.italic) { result += '&o'; newContext.italic = true; }
            if (isUnderline && !context.underline) { result += '&n'; newContext.underline = true; }
            if (isStrike && !context.strike) { result += '&m'; newContext.strike = true; }
            
            // Color Logic
            // Try to find hex from style
            let colorHex = '';
            if (inlineColor) {
                // Convert rgb to hex
                if (inlineColor.startsWith('rgb')) {
                    const rgb = inlineColor.match(/\d+/g);
                    if (rgb) {
                         const r = parseInt(rgb[0]);
                         const g = parseInt(rgb[1]);
                         const b = parseInt(rgb[2]);
                         colorHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                    }
                } else if (inlineColor.startsWith('#')) {
                    colorHex = inlineColor.toUpperCase();
                }
            } else if (el.getAttribute('color')) { // <font color="...">
                 colorHex = el.getAttribute('color') || '';
            }

            if (colorHex) {
                // Find closest MC color code
                let bestCode = '';
                // Check exact match first
                const entry = Object.entries(MC_COLORS).find(([, v]) => v.toUpperCase() === colorHex.toUpperCase() || v.toUpperCase() === colorHex);
                if (entry) {
                    bestCode = entry[0];
                } else {
                    // Fuzzy match? Or just default to white if unknown?
                    // For now, assume exact match from our palette
                }

                if (bestCode && bestCode !== context.color) {
                    result += `&${bestCode}`;
                    newContext.color = bestCode;
                    // Reset formatting? In MC &c resets formatting.
                    // But here we are nested.
                    // If we emit &c, we might lose bold/italic.
                    // So we might need to re-emit formatting if it persists.
                    if (newContext.bold) result += '&l';
                    if (newContext.italic) result += '&o';
                    if (newContext.underline) result += '&n';
                    if (newContext.strike) result += '&m';
                }
            }
            
            node.childNodes.forEach(child => walk(child, newContext));
            
            // On exit, do we need to reset?
            // MC codes are stateful linear.
            // If we exit a <b> tag, we are no longer bold.
            // We must emit &r and restore parent context.
            // Optimization: Only if context changed.
            
            // Actually, simply emitting &r at end of block and re-applying parent context is safest for linear conversion.
            if ( (isBold && !context.bold) || (isItalic && !context.italic) || (isUnderline && !context.underline) || (isStrike && !context.strike) || (colorHex && colorHex !== context.color) ) {
                 // Something changed in this scope. Reset.
                 result += '&r';
                 // Restore parent context
                 if (context.color) result += `&${context.color}`;
                 if (context.bold) result += '&l';
                 if (context.italic) result += '&o';
                 if (context.underline) result += '&n';
                 if (context.strike) result += '&m';
            }
        }
    };
    
    walk(element, {});
    // Clean up empty codes or redundant resets
    return result.replace(/&r+$/, '').replace(/&r&r/g, '&r');
};

const stripHtml = (html: string) => {
   const tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
};

const StringList = ({ title, items, onChange, placeholder }: { title: string, items: (string | object)[], onChange: (a: string[]) => void, placeholder?: string }) => {
  const displayItems = items.map(i => typeof i === 'string' ? i : JSON.stringify(i));

  return (
    <div className="space-y-2 border rounded-md p-3">
      <div className="flex items-center justify-between">
         <Label className="text-xs font-semibold uppercase text-muted-foreground">{title}</Label>
         <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onChange([...displayItems, ''])}>
           <Plus className="h-3 w-3" />
         </Button>
      </div>
      {displayItems.length === 0 && <p className="text-xs text-muted-foreground italic">无内容</p>}
      <div className="space-y-2">
        {displayItems.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <Input 
              value={item} 
              onChange={(e) => {
                const newItems = [...displayItems];
                newItems[idx] = e.target.value;
                onChange(newItems);
              }}
              className="h-8 text-xs font-mono"
              placeholder={placeholder}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
               const newItems = displayItems.filter((_, i) => i !== idx);
               onChange(newItems);
            }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { parseMaterial, formatMaterial, type MaterialType, searchMaterials } from '@/lib/material-utils';
import { ItemRenderer } from './ItemRenderer';
import { Search, X, Box, Loader2, Image as ImageIcon } from 'lucide-react';
import { listMaterials, type Material } from '@/api/material';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

interface MaterialEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface PluginSource {
  id: string;
  name: string;
  aliases: string[];
  color: string;
  borderColor: string;
}

const PLUGIN_SOURCES: PluginSource[] = [
  { id: 'HeadDatabase', name: 'HeadDatabase', aliases: ['HDB'], color: 'text-amber-500', borderColor: 'border-amber-500' },
  { id: 'ItemsAdder', name: 'ItemsAdder', aliases: ['ITEMSADDER', 'IA'], color: 'text-green-500', borderColor: 'border-green-500' },
  { id: 'Oraxen', name: 'Oraxen', aliases: ['ORAXEN'], color: 'text-cyan-500', borderColor: 'border-cyan-500' },
  { id: 'Zaphkiel', name: 'Zaphkiel', aliases: ['ZAPHKIEL', 'ZL'], color: 'text-red-500', borderColor: 'border-red-500' },
  { id: 'SXItem', name: 'SXItem', aliases: ['SXITEM', 'SI'], color: 'text-orange-500', borderColor: 'border-orange-500' },
  { id: 'NeigeItems', name: 'NeigeItems', aliases: ['NEIGEITEMS', 'NI'], color: 'text-slate-500', borderColor: 'border-slate-500' },
  { id: 'EcoItems', name: 'EcoItems', aliases: ['ECOITEMS', 'EI'], color: 'text-emerald-500', borderColor: 'border-emerald-500' },
  { id: 'MMOItems', name: 'MMOItems', aliases: ['MMOITEMS', 'MI'], color: 'text-yellow-500', borderColor: 'border-yellow-500' },
  { id: 'MagicGem', name: 'MagicGem', aliases: ['MAGICGEM', 'MG'], color: 'text-pink-500', borderColor: 'border-pink-500' },
  { id: 'HMCCosmetics', name: 'HMCCosmetics', aliases: ['HMC'], color: 'text-purple-500', borderColor: 'border-purple-500' },
  { id: 'MagicCosmeticsE', name: 'MagicCosmetics (装备)', aliases: ['MAGICE'], color: 'text-indigo-500', borderColor: 'border-indigo-500' },
  { id: 'MagicCosmeticsI', name: 'MagicCosmetics (时装)', aliases: ['MAGICI'], color: 'text-indigo-400', borderColor: 'border-indigo-400' },
  { id: 'MythicMobs', name: 'MythicMobs', aliases: ['MYTHICMOBS', 'MM'], color: 'text-violet-600', borderColor: 'border-violet-600' },
  { id: 'AzureFlow', name: 'AzureFlow', aliases: ['AZUREFLOW', 'AF'], color: 'text-sky-500', borderColor: 'border-sky-500' },
  { id: 'Nexo', name: 'Nexo', aliases: ['NEXO'], color: 'text-blue-600', borderColor: 'border-blue-600' },
  { id: 'CraftEngine', name: 'CraftEngine', aliases: ['CRAFTENGINE', 'CE'], color: 'text-amber-600', borderColor: 'border-amber-600' },
  { id: 'PxRpg', name: 'PxRpg', aliases: ['PXRPG', 'PX'], color: 'text-rose-500', borderColor: 'border-rose-500' },
];

export const MaterialEditor = ({ value, onChange }: MaterialEditorProps) => {
  const [parsed, setParsed] = useState(parseMaterial(value));
  const [searchTerm, setSearchTerm] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [repoMaterials, setRepoMaterials] = useState<Material[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [selectedRepoImage, setSelectedRepoImage] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sync internal state when prop changes externally
  useEffect(() => {
    setParsed(parseMaterial(value));
  }, [value]);

  // Handle click outside to close picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRepoMaterials = async (sourceId: string) => {
    setLoadingRepo(true);
    try {
        const res = await listMaterials({ page: 1, size: 100, type: sourceId });
        // @ts-ignore
        if (res.code === 200) {
            // @ts-ignore
            setRepoMaterials(res.rows);
        }
    } catch (error) {
        console.error("Failed to fetch repo materials", error);
        toast.error("获取素材库失败");
    } finally {
        setLoadingRepo(false);
    }
  };

  const handleRepoSelect = (mat: Material) => {
    const code = mat.code || `${mat.type}:${mat.dataId}`;
    updateValue(code);
    
    if (mat.fileUrl) {
        setSelectedRepoImage(mat.fileUrl.startsWith('http') ? mat.fileUrl : `${API_BASE_URL}${mat.fileUrl}`);
    } else {
        setSelectedRepoImage(null);
    }
    
    setRepoDialogOpen(false);
  };

  const updateType = (type: MaterialType) => {
    const newParsed = { ...parsed, type, value: type === 'standard' ? 'stone' : '' };
    setParsed(newParsed);
    onChange(formatMaterial(newParsed));
  };

  const updateValue = (val: string) => {
    const newParsed = { ...parsed, value: val };
    setParsed(newParsed);
    onChange(formatMaterial(newParsed));
    setShowPicker(false);
  };
  
  const handleSourceSelect = (sourceId: string) => {
    updateValue(`${sourceId}:`);
    setSourceDialogOpen(false);
  };

  const allFilteredMaterials = searchMaterials(searchTerm);
  const displayedMaterials = allFilteredMaterials.slice(0, displayLimit);
  const hasMore = allFilteredMaterials.length > displayLimit;

  // Identify current source if in source mode
  const currentSource = parsed.type === 'source' 
    ? PLUGIN_SOURCES.find(s => parsed.value.startsWith(s.id + ':') || s.aliases.some(a => parsed.value.startsWith(a + ':'))) 
    : null;

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-secondary/10">
      <div className="flex items-center gap-2">
         <div className="w-12 h-12 bg-secondary/50 rounded-md border flex-shrink-0 flex items-center justify-center overflow-hidden">
            <ItemRenderer material={value} className="w-10 h-10" />
         </div>
         <div className="flex-1 space-y-1 min-w-0">
            <Label className="text-xs text-muted-foreground">类型 (Type)</Label>
            <Select 
                value={parsed.type} 
                onChange={(e) => updateType(e.target.value as MaterialType)}
                className="h-8 w-full text-xs"
            >
                <option value="standard">Minecraft 原版 (Standard)</option>
                <option value="head">头颅 (Head)</option>
                <option value="url">URL图片/纹理 (URL)</option>
                <option value="source">插件源 (Source)</option>
                <option value="mod">模组物品 (Mod)</option>
                <option value="repo">自定义仓库 (Repo)</option>
                <option value="json">JSON / NBT</option>
            </Select>
         </div>
      </div>

      <div className="space-y-2">
         {parsed.type === 'standard' && (
             <div className="space-y-2 relative" ref={pickerRef}>
                 <Label className="text-xs">选择物品</Label>
                 <div className="relative">
                     <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input 
                        placeholder="搜索材质..." 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowPicker(true);
                            setDisplayLimit(50);
                        }}
                        onFocus={() => setShowPicker(true)}
                        className="pl-8 mb-2"
                     />
                     {searchTerm && (
                         <button 
                             onClick={() => {
                                 setSearchTerm('');
                                 setDisplayLimit(50);
                             }}
                             className="absolute right-2 top-2.5"
                         >
                             <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                         </button>
                     )}
                 </div>
                 
                 {showPicker && (
                     <div className="absolute top-full left-0 right-0 bg-popover border shadow-md rounded-md z-50 max-h-[300px] overflow-y-auto p-1">
                        <div className="grid grid-cols-6 gap-1 p-1">
                            {displayedMaterials.map((mat) => (
                                <button
                                    key={mat.name}
                                    className={`aspect-square flex items-center justify-center rounded-sm hover:bg-accent ${parsed.value === mat.name ? 'bg-accent ring-1 ring-primary' : ''}`}
                                    onClick={() => updateValue(mat.name)}
                                    title={mat.name}
                                >
                                    <ItemRenderer material={mat.name} className="w-8 h-8" />
                                </button>
                            ))}
                        </div>
                        {hasMore && (
                            <div className="p-2 text-center text-xs text-muted-foreground border-t">
                                ... 更多结果 (请输入搜索词)
                            </div>
                        )}
                        {allFilteredMaterials.length === 0 && (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                未找到物品
                            </div>
                        )}
                     </div>
                 )}
                 <div className="text-xs text-muted-foreground truncate font-mono bg-secondary/50 p-1 rounded">
                    {parsed.value}
                 </div>
             </div>
         )}

         {parsed.type === 'head' && (
            <div className="space-y-2">
                <Label className="text-xs">玩家名 / Base64</Label>
                <Input 
                    value={parsed.value} 
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder="Steve"
                />
                <p className="text-[10px] text-muted-foreground">输入玩家名或 Head Base64 数据</p>
            </div>
         )}
         
         {parsed.type === 'url' && (
            <div className="space-y-2">
                <Label className="text-xs">图片/纹理链接 (URL)</Label>
                <Input 
                    value={parsed.value} 
                    onChange={(e) => updateValue(e.target.value)}
                    placeholder="http://..."
                />
                <p className="text-[10px] text-muted-foreground">
                    输入皮肤纹理URL或直接图片链接。
                    <br/>
                    注意：TrMenu通常需要texture值，如为普通图片链接，仅在编辑器内预览，导出后可能需要手动调整。
                </p>
            </div>
         )}

         {(parsed.type === 'source') && (
             <div className="space-y-2">
                 <Label className="text-xs">插件源与ID (Source:ID)</Label>
                 <div className="flex gap-2">
                     <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                className={`w-[120px] justify-start px-2 font-normal ${currentSource ? currentSource.color : ''}`}
                            >
                                {currentSource ? (
                                    <span className="truncate">{currentSource.name}</span>
                                ) : (
                                    <span className="text-muted-foreground">选择插件...</span>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>选择物品源插件</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4 max-h-[60vh] overflow-y-auto">
                                {PLUGIN_SOURCES.map((source) => (
                                    <button
                                        key={source.id}
                                        onClick={() => handleSourceSelect(source.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 hover:bg-accent transition-all gap-2 ${source.borderColor} bg-card`}
                                    >
                                        <Box className={`h-8 w-8 ${source.color}`} />
                                        <span className={`text-xs font-bold text-center ${source.color}`}>{source.name}</span>
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {source.aliases.map(a => (
                                                <span key={a} className="text-[10px] bg-secondary px-1 rounded text-muted-foreground">{a}</span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </DialogContent>
                     </Dialog>

                    <Input 
                        value={parsed.value} 
                        onChange={(e) => updateValue(e.target.value)} 
                        placeholder="例如: HeadDatabase:123"
                        className="flex-1"
                    />
                    
                    {currentSource && (
                        <Dialog open={repoDialogOpen} onOpenChange={(open) => {
                            setRepoDialogOpen(open);
                            if (open) fetchRepoMaterials(currentSource.id);
                        }}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" title="从素材库选择" className="shrink-0 p-0 overflow-hidden">
                                    {selectedRepoImage ? (
                                        <img src={selectedRepoImage} alt="Selected" className="w-full h-full object-contain" />
                                    ) : (
                                        <Box className="w-4 h-4 text-primary" />
                                    )}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
                                <DialogHeader className="px-6 py-4 border-b">
                                    <DialogTitle>选择 {currentSource.name} 素材</DialogTitle>
                                </DialogHeader>
                                <div className="flex-1 overflow-y-auto p-6">
                                    {loadingRepo ? (
                                        <div className="flex justify-center items-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : repoMaterials.length === 0 ? (
                                        <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                                            <Box className="w-12 h-12 mb-2 opacity-20" />
                                            <p>该分类下暂无素材</p>
                                            <Button variant="link" className="mt-2" onClick={() => window.open('/creative-center', '_blank')}>
                                                去创意中心添加
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {repoMaterials.map((mat) => (
                                                <div 
                                                    key={mat.id} 
                                                    className="group relative border rounded-lg overflow-hidden cursor-pointer hover:border-primary/50 hover:shadow-md transition-all bg-card"
                                                    onClick={() => handleRepoSelect(mat)}
                                                >
                                                    <div className="aspect-square bg-muted/30 relative flex items-center justify-center p-4">
                                                        {mat.fileUrl ? (
                                                            <img 
                                                                src={mat.fileUrl.startsWith('http') ? mat.fileUrl : `${API_BASE_URL}${mat.fileUrl}`} 
                                                                alt={mat.name} 
                                                                className="w-full h-full object-contain drop-shadow-md transition-transform group-hover:scale-110" 
                                                            />
                                                        ) : (
                                                            <ImageIcon className="w-1/3 h-1/3 text-muted-foreground/30" />
                                                        )}
                                                    </div>
                                                    <div className="p-3">
                                                        <div className="font-medium text-sm truncate" title={mat.name}>{mat.name}</div>
                                                        <div className="text-xs text-muted-foreground font-mono truncate mt-1 bg-muted inline-block px-1.5 py-0.5 rounded">
                                                            {mat.dataId}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                 </div>
                 {currentSource && (
                     <p className={`text-[10px] ${currentSource.color}`}>
                         已选择: {currentSource.name}
                     </p>
                 )}
             </div>
         )}

         {(parsed.type === 'mod' || parsed.type === 'repo') && (
             <div className="space-y-2">
                 <Label className="text-xs">{parsed.type === 'mod' ? '模组ID (Mod:ID)' : '仓库ID (Repo:ID)'}</Label>
                 <Input 
                    value={parsed.value} 
                    onChange={(e) => updateValue(e.target.value)} 
                 />
             </div>
         )}

         {parsed.type === 'json' && (
             <div className="space-y-2">
                 <Label className="text-xs">JSON 数据</Label>
                 <Textarea 
                    value={parsed.value} 
                    onChange={(e) => updateValue(e.target.value)} 
                    rows={4}
                    className="font-mono text-xs"
                 />
             </div>
         )}
      </div>
    </div>
  );
};

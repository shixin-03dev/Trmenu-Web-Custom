import { useState, useEffect, useRef } from 'react';
import { 
  getMaterialTypes, 
  listMaterials, 
  addMaterial, 
  updateMaterial, 
  deleteMaterial, 
  type Material 
} from '@/api/material';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2, 
  Image as ImageIcon, 
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import request from '@/lib/request';
import { API_BASE_URL } from '@/config/api';

// Predefined material types
const MATERIAL_TYPES = [
  'ItemsAdder', 'Oraxen', 'HeadDatabase', 'Zaphkiel', 
  'SXItem', 'NeigeItems', 'EcoItems', 'MMOItems', 
  'MagicGem', 'HMCCosmetics', 'MagicCosmetics', 
  'MythicMobs', 'AzureFlow', 'Nexo', 'CraftEngine', 'PxRpg'
];

export const MaterialRepository = () => {
  const { user } = useAuth();
  const [view, setView] = useState<'types' | 'list'>('types');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Types View State
  const [typeStats, setTypeStats] = useState<{ type: string; count: number }[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // List View State
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<Partial<Material>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'types') {
      fetchTypes();
    } else {
      fetchMaterials();
    }
  }, [view, selectedType, page, keyword]);

  const fetchTypes = async () => {
    setLoadingTypes(true);
    try {
      const res: any = await getMaterialTypes();
      setTypeStats(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error("加载分类统计失败");
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchMaterials = async () => {
    setLoadingList(true);
    try {
      const res: any = await listMaterials({
        page,
        size: 20,
        type: selectedType || undefined,
        keyword
      });
      setMaterials(res.rows || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      toast.error("加载素材列表失败");
    } finally {
      setLoadingList(false);
    }
  };

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    setPage(1);
    setKeyword('');
    setView('list');
  };

  const handleBackToTypes = () => {
    setView('types');
    setSelectedType(null);
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setFormData({
      type: selectedType || 'ItemsAdder',
      ownerId: user?.userId
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (m: Material) => {
    setEditingMaterial(m);
    setFormData({ ...m });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("确定要删除这个素材吗？")) {
      try {
        await deleteMaterial(id);
        toast.success("删除成功");
        fetchMaterials();
        // Refresh types count if needed
      } catch (e) {
        toast.error("删除失败");
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res: any = await request({
        url: '/common/upload',
        method: 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.code === 200) {
        setFormData(prev => ({
          ...prev,
          fileUrl: res.url,
          fileId: res.fileName // Or whatever ID field RuoYi returns
        }));
        toast.success("上传成功");
      } else {
        toast.error(res.msg || "上传失败");
      }
    } catch (e) {
      console.error(e);
      toast.error("上传出错");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.dataId || !formData.type) {
      toast.error("请填写完整信息");
      return;
    }

    try {
      const payload = {
        ...formData,
        code: `${formData.type}:${formData.dataId}`,
        ownerId: user?.userId || 0,
        ownerName: user?.nickName || user?.userName
      } as Material;

      if (editingMaterial) {
        await updateMaterial(payload);
        toast.success("更新成功");
      } else {
        await addMaterial(payload);
        toast.success("添加成功");
      }
      setIsDialogOpen(false);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error("保存失败");
    }
  };

  const getTypeCount = (type: string) => {
    return typeStats.find(s => s.type === type)?.count || 0;
  };

  const getHeadImage = (type: string) => {
    // Generate a consistent pseudo-random index based on the type string
    const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // List of reliable MHF heads and common heads
    const heads = [
      'MHF_Apple', 'MHF_Chest', 'MHF_TNT', 'MHF_Cake', 'MHF_Cactus', 
      'MHF_Melon', 'MHF_Pumpkin', 'MHF_OakLog', 'MHF_Lava', 'MHF_Water',
      'MHF_Slime', 'MHF_Spider', 'MHF_Enderman', 'MHF_Pig', 'MHF_Sheep',
      'MHF_Cow', 'MHF_Chicken', 'MHF_Squid', 'MHF_Blaze', 'MHF_Golem',
      'MHF_Villager', 'MHF_Ocelot', 'MHF_Herobrine', 'MHF_Alex', 'MHF_Steve',
      'MHF_Question', 'MHF_Exclamation', 'MHF_ArrowUp', 'MHF_ArrowDown', 'MHF_ArrowLeft',
      'MHF_ArrowRight', 'MHF_Present1', 'MHF_Present2', 'MHF_Youtube', 'MHF_Facebook',
      'MHF_Twitter', 'MHF_Instagram', 'MHF_Globe', 'MHF_Cam', 'MHF_Sound'
    ];
    
    const headName = heads[hash % heads.length];
    return `https://minotar.net/helm/${headName}/100.png`;
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {view === 'list' && (
            <Button variant="ghost" size="icon" onClick={handleBackToTypes}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {view === 'types' ? '材质仓库' : `${selectedType} 素材列表`}
            </h2>
            <p className="text-muted-foreground text-sm">
              {view === 'types' ? '管理你的所有插件素材资源' : `共 ${total} 个素材`}
            </p>
          </div>
        </div>
        
        {view === 'list' && (
          <div className="flex gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="搜索名称或编码..." 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleAdd} className="gap-2">
              <Plus className="w-4 h-4" /> 添加素材
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'types' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {loadingTypes && (
            <div className="col-span-full flex justify-center items-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
          {MATERIAL_TYPES.map((type) => (
            <Card 
              key={type} 
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group relative overflow-hidden"
              onClick={() => handleTypeClick(type)}
            >
              <div className="absolute top-2 right-2 bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full font-mono">
                {getTypeCount(type)}
              </div>
              <CardContent className="p-6 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 overflow-hidden shadow-sm">
                  <img 
                    src={getHeadImage(type)} 
                    alt={type}
                    className="w-12 h-12 object-contain filter drop-shadow-md"
                    onError={(e) => {
                      // Fallback if image fails
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<svg class="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold">{type}</h3>
                  <p className="text-xs text-muted-foreground mt-1">点击管理</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex-1 bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-4 font-medium text-muted-foreground">预览</th>
                  <th className="p-4 font-medium text-muted-foreground">名称 / 编码</th>
                  <th className="p-4 font-medium text-muted-foreground">数据ID</th>
                  <th className="p-4 font-medium text-muted-foreground">所有者</th>
                  <th className="p-4 font-medium text-muted-foreground">创建时间</th>
                  <th className="p-4 font-medium text-muted-foreground text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingList ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="w-12 h-12 rounded-lg bg-secondary/50 border flex items-center justify-center overflow-hidden">
                          {m.fileUrl ? (
                            <img src={m.fileUrl.startsWith('http') ? m.fileUrl : `${API_BASE_URL}${m.fileUrl}`} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5 bg-muted inline-block px-1 rounded">
                            {m.code}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{m.dataId}</td>
                      <td className="p-4 text-muted-foreground">{m.ownerName || m.ownerId}</td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {m.createTime ? formatDistanceToNow(new Date(m.createTime), { addSuffix: true, locale: zhCN }) : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id!)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination could go here */}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMaterial ? '编辑素材' : '添加素材'}</DialogTitle>
            <DialogDescription>
              配置素材的基本信息和图片文件。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">类型</Label>
              <div className="col-span-3">
                <select 
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  disabled={!!editingMaterial}
                >
                  {MATERIAL_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">名称</Label>
              <Input 
                className="col-span-3" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="例如: 魔法剑"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">数据ID</Label>
              <Input 
                className="col-span-3" 
                value={formData.dataId || ''} 
                onChange={e => setFormData({...formData, dataId: e.target.value})}
                placeholder="例如: 97"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">图片</Label>
              <div className="col-span-3">
                <div 
                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors h-32"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.fileUrl ? (
                    <img 
                      src={formData.fileUrl.startsWith('http') ? formData.fileUrl : `${API_BASE_URL}${formData.fileUrl}`} 
                      className="h-full object-contain" 
                      alt="Preview" 
                    />
                  ) : (
                    <>
                      {uploading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground mt-2">点击上传图片</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleUpload}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

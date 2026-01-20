import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, LayoutTemplate, Users, Search, Crown, FolderKanban, Plus, Trash2, Edit2, Loader2, ArrowRight, Clock, FileJson, User as UserIcon, Upload, Image as ImageIcon, X, Globe, DollarSign, Share2, Ban, Heart, Star, Bookmark, PlayCircle, Eye, ShoppingCart, LogOut, Box } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lobby } from './Lobby';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { 
    listWorkspaces, 
    deleteWorkspace, 
    createWorkspace, 
    publishWorkspace, 
    unpublishWorkspace, 
    listMarketWorkspaces, 
    listSubscribedWorkspaces,
    listLikedWorkspaces,
    listFavoriteWorkspaces,
    toggleLike,
    toggleFavorite,
    subscribeWorkspace,
    type Workspace 
} from '@/api/workspace';
import { WorkspacePreview } from '@/components/preview/WorkspacePreview';
import { UserCenterView } from '@/components/creative/UserCenterView';
import { MaterialRepository } from '@/components/creative/MaterialRepository';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { API_BASE_URL } from '@/config/api';

export default function CreativeCenter() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeSection, setActiveSection] = useState('market'); // market, workspace, lobby, user
    const [workspaceSubTab, setWorkspaceSubTab] = useState('created');
    const [templateFilter, setTemplateFilter] = useState('all'); // all, public, paid
    
    // Workspace State
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [marketWorkspaces, setMarketWorkspaces] = useState<Workspace[]>([]);
    const [subscribedWorkspaces, setSubscribedWorkspaces] = useState<Workspace[]>([]);
    const [likedWorkspaces, setLikedWorkspaces] = useState<Workspace[]>([]);
    const [favoriteWorkspaces, setFavoriteWorkspaces] = useState<Workspace[]>([]);
    
    const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
    const [loadingMarket, setLoadingMarket] = useState(false);
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [loadingLikes, setLoadingLikes] = useState(false);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    
    // Create Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [templateToUse, setTemplateToUse] = useState<Workspace | null>(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Publish Dialog State
    const [isPublishOpen, setIsPublishOpen] = useState(false);
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
    const [publishType, setPublishType] = useState<'public' | 'paid'>('public');
    const [publishPrice, setPublishPrice] = useState<string>('0');
    const [publishCover, setPublishCover] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview Dialog State
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewWorkspace, setPreviewWorkspace] = useState<Workspace | null>(null);

    const fetchWorkspaces = async () => {
        setLoadingWorkspaces(true);
        try {
            const data = await listWorkspaces();
            setWorkspaces(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingWorkspaces(false);
        }
    };

    const fetchMarketWorkspaces = async () => {
        setLoadingMarket(true);
        try {
            const data = await listMarketWorkspaces();
            setMarketWorkspaces(data);
        } catch (error) {
            console.error(error);
            toast.error("获取市场数据失败");
        } finally {
            setLoadingMarket(false);
        }
    };

    const fetchSubscribedWorkspaces = async () => {
        setLoadingSubs(true);
        try {
            const data = await listSubscribedWorkspaces();
            setSubscribedWorkspaces(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingSubs(false);
        }
    };

    const fetchLikedWorkspaces = async () => {
        setLoadingLikes(true);
        try {
            const data = await listLikedWorkspaces();
            setLikedWorkspaces(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingLikes(false);
        }
    };

    const fetchFavoriteWorkspaces = async () => {
        setLoadingFavorites(true);
        try {
            const data = await listFavoriteWorkspaces();
            setFavoriteWorkspaces(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingFavorites(false);
        }
    };

    useEffect(() => {
        // Fetch all user interactions initially so we can show state correctly in all tabs
        fetchLikedWorkspaces();
        fetchFavoriteWorkspaces();
        fetchSubscribedWorkspaces();

        if (activeSection === 'workspace') {
            fetchWorkspaces();
        } else if (activeSection === 'market') {
            fetchMarketWorkspaces();
        } 
    }, [activeSection]);

    const handleUseTemplate = (ws: Workspace) => {
        setTemplateToUse(ws);
        setNewWorkspaceName(`${ws.name} (副本)`);
        setNewWorkspaceDesc(ws.description);
        setIsCreateOpen(true);
    };

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim()) {
            toast.error("请输入工作空间名称");
            return;
        }
        setCreating(true);
        try {
            const initialData = templateToUse && templateToUse.data 
                ? (typeof templateToUse.data === 'string' ? templateToUse.data : JSON.stringify(templateToUse.data))
                : JSON.stringify({});

            await createWorkspace({
                name: newWorkspaceName,
                description: newWorkspaceDesc,
                userName: user?.nickName || user?.userName || 'Unknown',
                menuCount: templateToUse ? (templateToUse.menuCount || 0) : 0,
                data: initialData
            });
            toast.success("创建成功");
            setIsCreateOpen(false);
            setNewWorkspaceName('');
            setNewWorkspaceDesc('');
            setTemplateToUse(null);
            
            // If we used a template, switch to "My Created" tab to show the new workspace
            if (templateToUse) {
                setActiveSection('workspace');
                setWorkspaceSubTab('created');
            }
            
            fetchWorkspaces();
        } catch (e) {
            console.error(e);
            toast.error("创建失败");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteWorkspace = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("确定要删除这个工作空间吗？此操作不可恢复。")) {
            try {
                await deleteWorkspace(id);
                toast.success("已删除");
                setWorkspaces(prev => prev.filter(w => w.id !== id));
            } catch (e) {
                console.error(e);
                toast.error("删除失败");
            }
        }
    };

    const handleOpenWorkspace = (ws: Workspace) => {
        navigate('/editor', { state: { workspaceId: ws.id, loadFromDb: true } });
    };

    // Publish Logic
    const openPublishDialog = (ws: Workspace, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedWorkspace(ws);
        setPublishType(ws.publishType || 'public');
        setPublishPrice(ws.price ? ws.price.toString() : '0');
        setPublishCover(ws.coverImage || null);
        setIsPublishOpen(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("图片大小不能超过 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPublishCover(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePublish = async () => {
        if (!selectedWorkspace) return;
        if (!publishCover) {
            toast.error("请上传封面图");
            return;
        }
        if (publishType === 'paid' && (!publishPrice || parseFloat(publishPrice) < 0)) {
            toast.error("请输入有效的价格");
            return;
        }

        setPublishing(true);
        try {
            await publishWorkspace(selectedWorkspace.id, {
                isPublished: true,
                publishType,
                price: publishType === 'paid' ? parseFloat(publishPrice) : 0,
                coverImage: publishCover
            });
            toast.success("发布成功！");
            setIsPublishOpen(false);
            fetchWorkspaces(); // Refresh local list to show status
        } catch (error) {
            console.error(error);
            toast.error("发布失败");
        } finally {
            setPublishing(false);
        }
    };

    const handleUnpublish = async (ws: Workspace, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("确定要取消发布吗？该工作空间将从市场中移除。")) {
            try {
                await unpublishWorkspace(ws.id);
                toast.success("已取消发布");
                fetchWorkspaces();
            } catch (error) {
                console.error(error);
                toast.error("操作失败");
            }
        }
    };

    // Market Interactions
    const handleLike = async (ws: Workspace, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const currentlyLiked = isLiked(ws.id);
            await toggleLike(ws.id);
            
            // Optimistic update
            const updateList = (list: Workspace[]) => list.map(p => {
                if (p.id === ws.id) {
                    return { 
                        ...p, 
                        likes: Math.max(0, (p.likes || 0) + (currentlyLiked ? -1 : 1)) 
                    };
                }
                return p;
            });
            
            setMarketWorkspaces(prev => updateList(prev));
            // Also update likes list: Add or Remove
            if (currentlyLiked) {
                setLikedWorkspaces(prev => prev.filter(w => w.id !== ws.id));
            } else {
                setLikedWorkspaces(prev => [...prev, { ...ws, likes: (ws.likes || 0) + 1 }]);
            }
            
            // Update other lists if present
            setFavoriteWorkspaces(prev => updateList(prev));
            setSubscribedWorkspaces(prev => updateList(prev));
            
        } catch (e) {
            toast.error("操作失败");
        }
    };

    const handleFavorite = async (ws: Workspace, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const currentlyFavorited = isFavorited(ws.id);
            await toggleFavorite(ws.id);
            
            const updateList = (list: Workspace[]) => list.map(p => {
                if (p.id === ws.id) {
                    return { 
                        ...p, 
                        favorites: Math.max(0, (p.favorites || 0) + (currentlyFavorited ? -1 : 1)) 
                    };
                }
                return p;
            });

            setMarketWorkspaces(prev => updateList(prev));
            setLikedWorkspaces(prev => updateList(prev));
            
            if (currentlyFavorited) {
                setFavoriteWorkspaces(prev => prev.filter(w => w.id !== ws.id));
            } else {
                setFavoriteWorkspaces(prev => [...prev, { ...ws, favorites: (ws.favorites || 0) + 1 }]);
            }
            
            setSubscribedWorkspaces(prev => updateList(prev));
        } catch (e) {
            toast.error("操作失败");
        }
    };

    const handleSubscribe = async (ws: Workspace, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isSubscribed(ws.id)) return; // Already subscribed
        
        try {
            await subscribeWorkspace(ws.id);
            toast.success(ws.publishType === 'paid' ? "订阅成功！" : "已添加到我的订阅");
            
            setSubscribedWorkspaces(prev => [...prev, ws]);
        } catch (e) {
            toast.error("订阅失败");
        }
    };

    const handleOpenPreview = (ws: Workspace) => {
        setPreviewWorkspace(ws);
        setIsPreviewOpen(true);
    };

    const filteredTemplates = (marketWorkspaces || []).filter(t => {
        if (templateFilter === 'all') return true;
        if (templateFilter === 'public') return t.publishType === 'public';
        if (templateFilter === 'paid') return t.publishType === 'paid';
        return true;
    });

    // Check user interaction state
    const isLiked = (id: string) => (likedWorkspaces || []).some(w => w.id === id);
    const isFavorited = (id: string) => (favoriteWorkspaces || []).some(w => w.id === id);
    const isSubscribed = (id: string) => (subscribedWorkspaces || []).some(w => w.id === id);

    return (
        <div className="flex h-screen w-full bg-background font-sans selection:bg-primary/20 overflow-hidden">
             {/* Sidebar */}
             <div className="w-64 flex-shrink-0 border-r bg-card/50 flex flex-col backdrop-blur-md">
                 {/* Logo */}
                 <div className="h-16 flex items-center px-6 border-b gap-3 cursor-pointer" onClick={() => navigate('/')}>
                     <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg text-white shadow-lg shadow-purple-500/20">
                        <Sparkles className="h-4 w-4" />
                     </div>
                     <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">创意中心</span>
                 </div>
                 
                 {/* Nav */}
                 <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                     <Button 
                        variant={activeSection === 'market' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start gap-3 h-10 font-medium"
                        onClick={() => setActiveSection('market')}
                     >
                        <LayoutTemplate className="w-4 h-4" /> 模板市场
                     </Button>
                     <Button 
                        variant={activeSection === 'workspace' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start gap-3 h-10 font-medium"
                        onClick={() => setActiveSection('workspace')}
                     >
                        <FolderKanban className="w-4 h-4" /> 我的工作台
                     </Button>
                     <Button 
                        variant={activeSection === 'repository' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start gap-3 h-10 font-medium"
                        onClick={() => setActiveSection('repository')}
                     >
                        <Box className="w-4 h-4" /> 材质仓库
                     </Button>
                     <Button 
                        variant={activeSection === 'lobby' ? 'secondary' : 'ghost'} 
                        className="w-full justify-start gap-3 h-10 font-medium"
                        onClick={() => setActiveSection('lobby')}
                     >
                        <Users className="w-4 h-4" /> 协作大厅
                     </Button>
                 </div>
                 
                 {/* User */}
                 <div className="p-4 border-t bg-muted/20">
                     <div className="flex items-center gap-2 mb-3">
                         <div 
                            className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => setActiveSection('user')}
                         >
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`) : ''} />
                                <AvatarFallback>{user?.nickName?.charAt(0) || user?.userName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.nickName || user?.userName}</p>
                                <p className="text-xs text-muted-foreground truncate">点击管理账户</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={logout} title="退出登录">
                             <LogOut className="w-4 h-4" />
                         </Button>
                     </div>
                 </div>
             </div>
             
             {/* Content */}
             <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
                 {/* Header Bar */}
                 <div className="h-16 border-b flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
                     <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => navigate('/')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <span className="opacity-30">/</span>
                        <span className="font-medium text-foreground">
                            {activeSection === 'market' && '模板市场'}
                            {activeSection === 'workspace' && '我的工作台'}
                            {activeSection === 'repository' && '材质仓库'}
                            {activeSection === 'lobby' && '协作大厅'}
                            {activeSection === 'user' && '个人中心'}
                        </span>
                     </div>
                     <div className="flex items-center gap-2">
                         {/* Optional: Add search or other global actions here */}
                     </div>
                 </div>
                 
                 {/* Main Area */}
                 <div className="flex-1 overflow-auto p-6 scrollbar-hide">
                     <div className="max-w-[1600px] mx-auto h-full">
                         {activeSection === 'market' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Template Filters */}
                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                    <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl overflow-x-auto max-w-full border">
                                        <Button 
                                            variant={templateFilter === 'all' ? 'secondary' : 'ghost'} 
                                            size="sm" 
                                            onClick={() => setTemplateFilter('all')}
                                            className="rounded-lg text-xs"
                                        >
                                            全部
                                        </Button>
                                        <Button 
                                            variant={templateFilter === 'public' ? 'secondary' : 'ghost'} 
                                            size="sm" 
                                            onClick={() => setTemplateFilter('public')}
                                            className="rounded-lg text-xs"
                                        >
                                            <Sparkles className="w-3 h-3 mr-1.5 text-blue-500" />
                                            公开空间
                                        </Button>
                                        <Button 
                                            variant={templateFilter === 'paid' ? 'secondary' : 'ghost'} 
                                            size="sm" 
                                            onClick={() => setTemplateFilter('paid')}
                                            className="rounded-lg text-xs"
                                        >
                                            <Crown className="w-3 h-3 mr-1.5 text-amber-500" />
                                            付费空间
                                        </Button>
                                    </div>
                                    
                                    <div className="relative w-full md:w-64 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <Input placeholder="搜索模板..." className="pl-9 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20 rounded-xl" />
                                    </div>
                                </div>

                                {/* Templates Grid */}
                                {loadingMarket ? (
                                    <div className="flex justify-center py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                                            <Search className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium">暂无相关模板</h3>
                                        <p className="text-muted-foreground">换个筛选条件试试看</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredTemplates.map((t, i) => (
                                            <motion.div
                                                key={t.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <Card 
                                                    className="group overflow-hidden border-muted hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full flex flex-col rounded-2xl bg-card/50 backdrop-blur-sm"
                                                    onClick={() => handleOpenPreview(t)}
                                                >
                                                    <div className="aspect-[16/10] overflow-hidden bg-muted relative group-hover:shadow-inner transition-all">
                                                        {t.coverImage ? (
                                                            <img src={t.coverImage} alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                                                                <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                                            <div className="flex items-center gap-2">
                                                                <Button variant="secondary" size="sm" className="rounded-full gap-1">
                                                                    <Eye className="w-3 h-3" /> 预览详情
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-30">
                                                            {t.publishType === 'paid' && (
                                                                <Badge className="bg-amber-500 hover:bg-amber-600 border-none shadow-sm backdrop-blur-md">
                                                                    <Crown className="w-3 h-3 mr-1" /> 
                                                                    ¥{t.price}
                                                                </Badge>
                                                            )}
                                                            {t.publishType === 'public' && (
                                                                <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-foreground shadow-sm">
                                                                    免费公开
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <CardHeader className="p-4 pb-2">
                                                        <div className="flex justify-between items-start">
                                                            <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                                                {t.name}
                                                            </CardTitle>
                                                        </div>
                                                        <CardDescription className="flex items-center gap-1 text-xs">
                                                            <UserIcon className="w-3 h-3" />
                                                            {t.userName || '未知作者'}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-2 flex-1">
                                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                                            {t.description || '该作者很懒，没有留下描述...'}
                                                        </p>
                                                        
                                                        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Heart className="w-3 h-3" /> {t.likes || 0}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-3 h-3" /> {t.favorites || 0}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <LayoutTemplate className="w-3 h-3" /> {t.downloads || 0}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <CardFooter className="p-4 pt-0 flex items-center gap-2 mt-auto">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn("h-8 w-8 hover:text-red-500", isLiked(t.id) ? "text-red-500" : "text-muted-foreground")}
                                                            onClick={(e) => handleLike(t, e)}
                                                            title="喜欢"
                                                        >
                                                            <Heart className={cn("w-4 h-4", isLiked(t.id) && "fill-current")} />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className={cn("h-8 w-8 hover:text-amber-500", isFavorited(t.id) ? "text-amber-500" : "text-muted-foreground")}
                                                            onClick={(e) => handleFavorite(t, e)}
                                                            title="收藏"
                                                        >
                                                            <Star className={cn("w-4 h-4", isFavorited(t.id) && "fill-current")} />
                                                        </Button>
                                                        
                                                        <Button 
                                                            size="sm" 
                                                            className="flex-1 h-8 ml-2 gap-1"
                                                            variant={t.publishType === 'paid' ? 'default' : 'secondary'}
                                                            onClick={(e) => handleSubscribe(t, e)}
                                                            disabled={isSubscribed(t.id)}
                                                        >
                                                            {isSubscribed(t.id) ? (
                                                                <>
                                                                    <Bookmark className="w-3 h-3 fill-current" /> 已订阅
                                                                </>
                                                            ) : t.publishType === 'paid' ? (
                                                                <>
                                                                    <ShoppingCart className="w-3 h-3" /> 立即订阅
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <PlayCircle className="w-3 h-3" /> 立即使用
                                                                </>
                                                            )}
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                         )}

                         {activeSection === 'workspace' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Tabs value={workspaceSubTab} onValueChange={setWorkspaceSubTab} className="w-full space-y-6">
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
                                        <TabsList className="bg-transparent p-0 gap-6 h-auto">
                                            <TabsTrigger value="created" className="bg-transparent p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-primary/80 transition-all">
                                                我创建的 ({workspaces.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="likes" className="bg-transparent p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-primary/80 transition-all">
                                                我的喜欢 ({likedWorkspaces.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="favorites" className="bg-transparent p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-primary/80 transition-all">
                                                我的收藏 ({favoriteWorkspaces.length})
                                            </TabsTrigger>
                                            <TabsTrigger value="subscriptions" className="bg-transparent p-0 pb-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none hover:text-primary/80 transition-all">
                                                我的订阅 ({subscribedWorkspaces.length})
                                            </TabsTrigger>
                                        </TabsList>

                                        <Dialog open={isCreateOpen} onOpenChange={(open) => {
                                            setIsCreateOpen(open);
                                            if (!open) {
                                                setTemplateToUse(null);
                                                setNewWorkspaceName('');
                                                setNewWorkspaceDesc('');
                                            }
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button className="rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    新建项目
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[500px] rounded-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>{templateToUse ? '从模板创建工作空间' : '创建新工作空间'}</DialogTitle>
                                                    <DialogDescription>
                                                        {templateToUse ? `基于 "${templateToUse.name}" 创建一个新的项目。` : '创建一个新的空白项目开始构建。'}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-6 py-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="name">名称</Label>
                                                        <Input id="name" value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} placeholder="例如：生存服主菜单" className="rounded-lg" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="desc">描述</Label>
                                                        <Textarea id="desc" value={newWorkspaceDesc} onChange={e => setNewWorkspaceDesc(e.target.value)} placeholder="简要描述这个菜单的功能..." className="rounded-lg resize-none h-24" />
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button onClick={handleCreateWorkspace} disabled={creating} className="w-full rounded-lg">
                                                        {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        {creating ? '创建中...' : '立即创建'}
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <TabsContent value="created" className="focus-visible:outline-none mt-0">
                                        {(workspaces || []).length === 0 && !loadingWorkspaces ? (
                                            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                                                <div className="bg-background p-6 rounded-full inline-flex mb-6 shadow-sm">
                                                    <FolderKanban className="h-10 w-10 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="text-xl font-medium text-foreground">暂无项目</h3>
                                                <p className="text-muted-foreground mt-2 max-w-sm text-center">
                                                    创建一个新项目，开始你的菜单设计之旅。
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                <AnimatePresence>
                                                    {(workspaces || []).map((ws, index) => (
                                                        <motion.div
                                                            key={ws.id}
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ delay: index * 0.05 }}
                                                        >
                                                            <Card 
                                                                className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col relative overflow-hidden rounded-2xl border-muted/60"
                                                                onClick={() => handleOpenWorkspace(ws)}
                                                            >
                                                                {ws.isPublished && (
                                                                    <div className="absolute top-3 right-3 z-10">
                                                                        <Badge variant={ws.publishType === 'paid' ? 'default' : 'secondary'} className={`${ws.publishType === 'paid' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'} backdrop-blur-sm border-none shadow-sm`}>
                                                                            {ws.publishType === 'paid' ? <Crown className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                                                                            {ws.publishType === 'paid' ? '已售卖' : '已公开'}
                                                                        </Badge>
                                                                    </div>
                                                                )}

                                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                                
                                                                <CardHeader className="pb-3 pt-5">
                                                                    <div className="flex justify-between items-start gap-2">
                                                                        <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                                                            {ws.name}
                                                                        </CardTitle>
                                                                        <Button 
                                                                            variant="ghost" 
                                                                            size="icon" 
                                                                            className="h-7 w-7 -mt-1 -mr-2 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                                            onClick={(e) => handleDeleteWorkspace(ws.id, e)}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                    <CardDescription className="line-clamp-2 min-h-[40px] text-xs">
                                                                        {ws.description || '暂无描述'}
                                                                    </CardDescription>
                                                                </CardHeader>
                                                                
                                                                <CardContent className="flex-1 pb-3 space-y-3">
                                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <FileJson className="w-3.5 h-3.5 text-blue-500" />
                                                                            <span className="font-medium">{ws.menuCount || 0}</span> 菜单
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Clock className="w-3.5 h-3.5 text-orange-500" />
                                                                            <span>{ws.updatedAt ? formatDistanceToNow(new Date(ws.updatedAt), { addSuffix: true, locale: zhCN }) : '刚刚'}</span>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                                
                                                                <CardFooter className="pt-0 pb-4 flex gap-2">
                                                                    {ws.isPublished ? (
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="flex-1 h-8 text-xs border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                                                            onClick={(e) => handleUnpublish(ws, e)}
                                                                        >
                                                                            <Ban className="w-3 h-3 mr-1.5" />
                                                                            取消发布
                                                                        </Button>
                                                                    ) : (
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="flex-1 h-8 text-xs hover:border-primary/50 hover:text-primary"
                                                                            onClick={(e) => openPublishDialog(ws, e)}
                                                                        >
                                                                            <Share2 className="w-3 h-3 mr-1.5" />
                                                                            发布市场
                                                                        </Button>
                                                                    )}
                                                                    <Button size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => handleOpenWorkspace(ws)}>
                                                                        <ArrowRight className="w-4 h-4" />
                                                                    </Button>
                                                                </CardFooter>
                                                            </Card>
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="likes" className="focus-visible:outline-none mt-0">
                                        {(likedWorkspaces || []).length === 0 && !loadingLikes ? (
                                            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                                                <div className="bg-background p-6 rounded-full inline-flex mb-6 shadow-sm">
                                                    <Heart className="h-10 w-10 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="text-xl font-medium text-foreground">暂无喜欢的空间</h3>
                                                <p className="text-muted-foreground mt-2 max-w-sm text-center">
                                                    你在市场中点赞的空间将显示在这里。
                                                </p>
                                                <Button variant="outline" className="mt-4" onClick={() => setActiveSection('market')}>
                                                    去逛逛
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {(likedWorkspaces || []).map((t, i) => (
                                                    <motion.div
                                                        key={t.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                    >
                                                        <Card 
                                                            className="group overflow-hidden border-muted hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full flex flex-col rounded-2xl bg-card/50 backdrop-blur-sm"
                                                            onClick={() => handleOpenPreview(t)}
                                                        >
                                                            <div className="aspect-[16/10] overflow-hidden bg-muted relative group-hover:shadow-inner transition-all">
                                                                {t.coverImage ? (
                                                                    <img src={t.coverImage} alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                                                                        <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                                                    <div className="flex items-center gap-2">
                                                                        <Button variant="secondary" size="sm" className="rounded-full gap-1">
                                                                            <Eye className="w-3 h-3" /> 预览详情
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-30">
                                                                    {t.publishType === 'paid' && (
                                                                        <Badge className="bg-amber-500 hover:bg-amber-600 border-none shadow-sm backdrop-blur-md">
                                                                            <Crown className="w-3 h-3 mr-1" /> 
                                                                            ¥{t.price}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <CardHeader className="p-4 pb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                                                        {t.name}
                                                                    </CardTitle>
                                                                </div>
                                                                <CardDescription className="flex items-center gap-1 text-xs">
                                                                    <UserIcon className="w-3 h-3" />
                                                                    {t.userName || '未知作者'}
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="p-4 pt-2 flex-1">
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {t.description || '该作者很懒，没有留下描述...'}
                                                                </p>
                                                                
                                                                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1">
                                                                        <Heart className="w-3 h-3" /> {t.likes || 0}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="w-3 h-3" /> {t.favorites || 0}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <LayoutTemplate className="w-3 h-3" /> {t.downloads || 0}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="p-4 pt-0 flex items-center gap-2 mt-auto">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-red-500", isLiked(t.id) ? "text-red-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleLike(t, e)}
                                                                    title="喜欢"
                                                                >
                                                                    <Heart className={cn("w-4 h-4", isLiked(t.id) && "fill-current")} />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-amber-500", isFavorited(t.id) ? "text-amber-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleFavorite(t, e)}
                                                                    title="收藏"
                                                                >
                                                                    <Star className={cn("w-4 h-4", isFavorited(t.id) && "fill-current")} />
                                                                </Button>
                                                                
                                                                <Button 
                                                                    size="sm" 
                                                                    className="flex-1 h-8 ml-2 gap-1"
                                                                    variant={t.publishType === 'paid' ? 'default' : 'secondary'}
                                                                    onClick={(e) => handleSubscribe(t, e)}
                                                                    disabled={isSubscribed(t.id)}
                                                                >
                                                                    {isSubscribed(t.id) ? (
                                                                        <>
                                                                            <Bookmark className="w-3 h-3 fill-current" /> 已订阅
                                                                        </>
                                                                    ) : t.publishType === 'paid' ? (
                                                                        <>
                                                                            <ShoppingCart className="w-3 h-3" /> 立即订阅
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Bookmark className="w-3 h-3" /> 免费订阅
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="favorites" className="focus-visible:outline-none mt-0">
                                        {(favoriteWorkspaces || []).length === 0 && !loadingFavorites ? (
                                            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                                                <div className="bg-background p-6 rounded-full inline-flex mb-6 shadow-sm">
                                                    <Star className="h-10 w-10 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="text-xl font-medium text-foreground">暂无收藏的空间</h3>
                                                <p className="text-muted-foreground mt-2 max-w-sm text-center">
                                                    你在市场中收藏的空间将显示在这里。
                                                </p>
                                                <Button variant="outline" className="mt-4" onClick={() => setActiveSection('market')}>
                                                    去逛逛
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {(favoriteWorkspaces || []).map((t, i) => (
                                                    <motion.div
                                                        key={t.id}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                    >
                                                        <Card 
                                                            className="group overflow-hidden border-muted hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer h-full flex flex-col rounded-2xl bg-card/50 backdrop-blur-sm"
                                                            onClick={() => handleOpenPreview(t)}
                                                        >
                                                            <div className="aspect-[16/10] overflow-hidden bg-muted relative group-hover:shadow-inner transition-all">
                                                                {t.coverImage ? (
                                                                    <img src={t.coverImage} alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                                                                        <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                                                    </div>
                                                                )}
                                                                
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                                                                    <div className="flex items-center gap-2">
                                                                        <Button variant="secondary" size="sm" className="rounded-full gap-1">
                                                                            <Eye className="w-3 h-3" /> 预览详情
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-30">
                                                                    {t.publishType === 'paid' && (
                                                                        <Badge className="bg-amber-500 hover:bg-amber-600 border-none shadow-sm backdrop-blur-md">
                                                                            <Crown className="w-3 h-3 mr-1" /> 
                                                                            ¥{t.price}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <CardHeader className="p-4 pb-2">
                                                                <div className="flex justify-between items-start">
                                                                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                                                        {t.name}
                                                                    </CardTitle>
                                                                </div>
                                                                <CardDescription className="flex items-center gap-1 text-xs">
                                                                    <UserIcon className="w-3 h-3" />
                                                                    {t.userName || '未知作者'}
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardContent className="p-4 pt-2 flex-1">
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {t.description || '该作者很懒，没有留下描述...'}
                                                                </p>
                                                                
                                                                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1">
                                                                        <Heart className="w-3 h-3" /> {t.likes || 0}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="w-3 h-3" /> {t.favorites || 0}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <LayoutTemplate className="w-3 h-3" /> {t.downloads || 0}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="p-4 pt-0 flex items-center gap-2 mt-auto">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-red-500", isLiked(t.id) ? "text-red-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleLike(t, e)}
                                                                    title="喜欢"
                                                                >
                                                                    <Heart className={cn("w-4 h-4", isLiked(t.id) && "fill-current")} />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-amber-500", isFavorited(t.id) ? "text-amber-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleFavorite(t, e)}
                                                                    title="收藏"
                                                                >
                                                                    <Star className={cn("w-4 h-4", isFavorited(t.id) && "fill-current")} />
                                                                </Button>
                                                                
                                                                <Button 
                                                                    size="sm" 
                                                                    className="flex-1 h-8 ml-2 gap-1"
                                                                    variant={t.publishType === 'paid' ? 'default' : 'secondary'}
                                                                    onClick={(e) => handleSubscribe(t, e)}
                                                                    disabled={isSubscribed(t.id)}
                                                                >
                                                                    {isSubscribed(t.id) ? (
                                                                        <>
                                                                            <Bookmark className="w-3 h-3 fill-current" /> 已订阅
                                                                        </>
                                                                    ) : t.publishType === 'paid' ? (
                                                                        <>
                                                                            <ShoppingCart className="w-3 h-3" /> 立即订阅
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <PlayCircle className="w-3 h-3" /> 立即使用
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="subscriptions" className="focus-visible:outline-none mt-0">
                                        {(subscribedWorkspaces || []).length === 0 && !loadingSubs ? (
                                            <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                                                <div className="bg-background p-6 rounded-full inline-flex mb-6 shadow-sm">
                                                    <Bookmark className="h-10 w-10 text-muted-foreground/40" />
                                                </div>
                                                <h3 className="text-xl font-medium text-foreground">暂无订阅</h3>
                                                <p className="text-muted-foreground mt-2 max-w-sm text-center">
                                                    在模板市场中订阅或购买的空间将显示在这里。
                                                </p>
                                                <Button variant="outline" className="mt-4" onClick={() => setActiveSection('market')}>
                                                    去逛逛
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {(subscribedWorkspaces || []).map((ws, index) => (
                                                    <motion.div
                                                        key={ws.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.05 }}
                                                    >
                                                        <Card 
                                                            className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer h-full flex flex-col relative overflow-hidden rounded-2xl border-muted/60"
                                                            onClick={() => handleOpenPreview(ws)} 
                                                        >
                                                            <div className="aspect-[16/10] overflow-hidden bg-muted relative group-hover:shadow-inner transition-all">
                                                                {ws.coverImage ? (
                                                                    <img src={ws.coverImage} alt={ws.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                                                                        <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                                                                    </div>
                                                                )}
                                                                <div className="absolute top-2 right-2">
                                                                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-md">已订阅</Badge>
                                                                </div>
                                                            </div>
                                                            <CardHeader className="pb-3 pt-4">
                                                                <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                                                    {ws.name}
                                                                </CardTitle>
                                                                <CardDescription className="line-clamp-2 min-h-[40px] text-xs">
                                                                    {ws.description || '暂无描述'}
                                                                </CardDescription>
                                                            </CardHeader>
                                                            <CardFooter className="p-4 pt-0 flex items-center gap-2 mt-auto">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-red-500", isLiked(ws.id) ? "text-red-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleLike(ws, e)}
                                                                    title="喜欢"
                                                                >
                                                                    <Heart className={cn("w-4 h-4", isLiked(ws.id) && "fill-current")} />
                                                                </Button>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className={cn("h-8 w-8 hover:text-amber-500", isFavorited(ws.id) ? "text-amber-500" : "text-muted-foreground")}
                                                                    onClick={(e) => handleFavorite(ws, e)}
                                                                    title="收藏"
                                                                >
                                                                    <Star className={cn("w-4 h-4", isFavorited(ws.id) && "fill-current")} />
                                                                </Button>
                                                                
                                                                <Button 
                                                                    size="sm" 
                                                                    className="flex-1 h-8 ml-2 gap-1"
                                                                    variant={ws.publishType === 'paid' ? 'default' : 'secondary'}
                                                                    onClick={(e) => {
                                                                        if (isSubscribed(ws.id)) {
                                                                            e.stopPropagation();
                                                                            handleUseTemplate(ws);
                                                                        } else {
                                                                            handleSubscribe(ws, e);
                                                                        }
                                                                    }}
                                                                    disabled={false}
                                                                >
                                                                    {isSubscribed(ws.id) ? (
                                                                        <>
                                                                            <PlayCircle className="w-3 h-3" /> 开始使用
                                                                        </>
                                                                    ) : ws.publishType === 'paid' ? (
                                                                        <>
                                                                            <ShoppingCart className="w-3 h-3" /> 立即订阅
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Bookmark className="w-3 h-3" /> 免费订阅
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                         )}

                         {activeSection === 'repository' && (
                             <div className="h-full">
                                 <MaterialRepository />
                             </div>
                         )}

                         {activeSection === 'lobby' && (
                             <div className="bg-card rounded-2xl border shadow-sm min-h-[600px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                 <Lobby isEmbedded={true} />
                             </div>
                         )}
                         
                         {activeSection === 'user' && (
                             <UserCenterView />
                         )}
                     </div>
                 </div>
             </div>

            {/* Publish Dialog */}
            <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>发布到模板市场</DialogTitle>
                        <DialogDescription>
                            将 "{selectedWorkspace?.name}" 分享给其他用户。
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                        {/* Cover Image Upload */}
                        <div className="space-y-2">
                            <Label>封面预览 (必须)</Label>
                            <div 
                                className="border-2 border-dashed border-muted-foreground/20 rounded-xl h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all relative overflow-hidden group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {publishCover ? (
                                    <>
                                        <img src={publishCover} alt="Cover" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-sm font-medium flex items-center gap-2">
                                                <Edit2 className="w-4 h-4" /> 点击更换
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">点击上传封面图</p>
                                        <p className="text-xs opacity-60">支持 JPG, PNG (Max 2MB)</p>
                                    </div>
                                )}
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-3">
                            <Label>发布类型</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div 
                                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${publishType === 'public' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}
                                    onClick={() => setPublishType('public')}
                                >
                                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-sm">公开分享</div>
                                        <div className="text-xs text-muted-foreground">免费供所有人下载</div>
                                    </div>
                                </div>

                                <div 
                                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${publishType === 'paid' ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}
                                    onClick={() => setPublishType('paid')}
                                >
                                    <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-sm">付费出售</div>
                                        <div className="text-xs text-muted-foreground">设定价格获取收益</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Price Input (Conditional) */}
                        {publishType === 'paid' && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2"
                            >
                                <Label htmlFor="price">设置价格 (CNY)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                                    <Input 
                                        id="price" 
                                        type="number" 
                                        min="0" 
                                        step="0.01"
                                        value={publishPrice} 
                                        onChange={e => setPublishPrice(e.target.value)} 
                                        className="pl-7"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPublishOpen(false)}>取消</Button>
                        <Button onClick={handlePublish} disabled={publishing}>
                            {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                            确认发布
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl">
                    <div className="p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-xl font-bold">{previewWorkspace?.name}</DialogTitle>
                            {previewWorkspace?.publishType === 'paid' && (
                                <Badge className="bg-amber-500"><Crown className="w-3 h-3 mr-1"/> ¥{previewWorkspace.price}</Badge>
                            )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative bg-muted/30">
                        {previewWorkspace && (
                            <WorkspacePreview data={previewWorkspace.data} />
                        )}
                    </div>

                    <div className="p-4 border-t bg-card flex items-center justify-between">
                         <div className="flex items-center gap-4 text-sm text-muted-foreground">
                             <div className="flex items-center gap-1">
                                 <Heart className="w-4 h-4" /> {previewWorkspace?.likes || 0}
                             </div>
                             <div className="flex items-center gap-1">
                                 <Star className="w-4 h-4" /> {previewWorkspace?.favorites || 0}
                             </div>
                             <div className="flex items-center gap-1">
                                 <Users className="w-4 h-4" /> {previewWorkspace?.downloads || 0} 使用
                             </div>
                         </div>
                         <Button onClick={() => { 
                             if (previewWorkspace) {
                                 if (isSubscribed(previewWorkspace.id)) {
                                     handleUseTemplate(previewWorkspace);
                                 } else {
                                     handleSubscribe(previewWorkspace, {} as any); 
                                 }
                             }
                             setIsPreviewOpen(false); 
                         }}>
                             {previewWorkspace && isSubscribed(previewWorkspace.id) 
                                 ? '开始使用' 
                                 : (previewWorkspace?.publishType === 'paid' ? '立即订阅' : '立即使用')
                             }
                         </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

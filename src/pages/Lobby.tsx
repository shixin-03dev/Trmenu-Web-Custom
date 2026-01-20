import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRooms, type CollaborationRoom } from '@/api/collaboration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Clock, Lock, ArrowLeft, Plus, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface LobbyProps {
    isEmbedded?: boolean;
}

export const Lobby = ({ isEmbedded = false }: LobbyProps) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<CollaborationRoom[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await listRooms(keyword);
      setRooms(data);
    } catch (error) {
      console.error(error);
      toast.error("获取房间列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  const handleJoin = (room: CollaborationRoom) => {
    if (room.currentUsers >= room.capacity) {
        toast.error("房间已满");
        return;
    }
    navigate(`/editor/invite-ed/${room.roomId}`);
  };

  return (
    <div className={`min-h-screen ${!isEmbedded ? 'bg-gradient-to-b from-background to-muted/20' : 'bg-transparent'}`}>
      <div className={`container mx-auto px-4 py-8 max-w-7xl ${isEmbedded ? 'p-6' : ''}`}>
        
        {/* Header Section - Only show if not embedded */}
        {!isEmbedded && (
            <div className="text-center mb-12 space-y-4 pt-8 relative">
                 <div className="absolute left-0 top-8 hidden md:block">
                     <Button variant="ghost" className="gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-4 w-4" />
                        返回首页
                     </Button>
                 </div>
                 
                 <div className="md:hidden flex justify-start mb-4">
                     <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        返回
                     </Button>
                 </div>

                 <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                 >
                     <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent pb-2">
                         协作大厅
                     </h1>
                     <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                         探索正在进行的创意，加入实时协作，或者创建属于你自己的即时工作区。
                     </p>
                 </motion.div>
                 
                 {/* Search Bar */}
                 <div className="max-w-md mx-auto mt-8 relative z-10">
                     <div className="absolute inset-0 bg-primary/5 blur-xl rounded-full" />
                     <form onSubmit={handleSearch} className="relative flex shadow-lg rounded-full overflow-hidden bg-background border transition-shadow focus-within:shadow-xl focus-within:border-primary/50">
                        <Input 
                            placeholder="搜索房间名或ID..." 
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            className="border-0 focus-visible:ring-0 pl-6 pr-12 py-6 text-base"
                        />
                        <Button type="submit" size="icon" className="absolute right-1 top-1 bottom-1 w-10 h-10 rounded-full transition-transform hover:scale-105 active:scale-95">
                            <Search className="h-5 w-5" />
                        </Button>
                     </form>
                 </div>
            </div>
        )}

        {/* Action Bar - Different style if embedded */}
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 ${isEmbedded ? '' : 'mt-8'}`}>
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">
                    活跃房间 ({rooms.length})
                </h2>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {isEmbedded && (
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="快速搜索..." 
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            className="pl-9 h-9" 
                        />
                    </div>
                )}
                <Button onClick={() => navigate('/editor', { state: { isNew: true } })} className="shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    创建新房间
                </Button>
            </div>
        </div>

        {/* Room Grid */}
        {rooms.length === 0 && !loading ? (
            <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed">
                <div className="bg-background p-4 rounded-full inline-flex mb-4 shadow-sm">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-medium text-muted-foreground">暂无活跃房间</h3>
                <p className="text-sm text-muted-foreground/60 mt-1">创建一个新房间开始协作吧！</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {rooms.map((room, index) => (
                        <motion.div
                            key={room.roomId}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 overflow-hidden border-muted/60 bg-card/50 backdrop-blur-sm h-full flex flex-col">
                                <CardHeader className="pb-3 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                                {room.roomName}
                                            </CardTitle>
                                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-md">
                                                    <Users className="w-3 h-3" />
                                                    {room.hostName}
                                                </span>
                                                <span className="flex items-center gap-1" title={room.createTime}>
                                                    <Clock className="w-3 h-3" />
                                                    {room.createTime ? formatDistanceToNow(new Date(room.createTime), { addSuffix: true, locale: zhCN }) : '刚刚'}
                                                </span>
                                            </div>
                                        </div>
                                        {room.hasPassword && (
                                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">
                                                <Lock className="w-3 h-3 mr-1" />
                                                私密
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3 flex-1">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {/* Tags placeholders or future features */}
                                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                            v3.0.0
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                                            生存
                                        </Badge>
                                    </div>
                                    <div className="w-full bg-secondary/50 rounded-full h-2 mt-4 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${room.currentUsers >= room.capacity ? 'bg-red-500' : 'bg-green-500'}`} 
                                            style={{ width: `${(room.currentUsers / room.capacity) * 100}%` }} 
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1.5 font-medium">
                                        <span>在线人数</span>
                                        <span className={room.currentUsers >= room.capacity ? 'text-red-500' : 'text-green-500'}>
                                            {room.currentUsers} / {room.capacity}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-0 pb-4">
                                    <Button 
                                        className="w-full shadow-sm group-hover:shadow-md transition-all" 
                                        variant={room.currentUsers >= room.capacity ? "secondary" : "default"}
                                        onClick={() => handleJoin(room)}
                                        disabled={room.currentUsers >= room.capacity}
                                    >
                                        {room.currentUsers >= room.capacity ? '房间已满' : '加入协作'}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Code, 
  ExternalLink,
  Github, 
  Terminal, 
  Box, 
  LayoutGrid,
  Heart,
  Palette,
  User,
  Users,
  LogOut,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeWidget } from '@/components/widgets/TimeWidget';
import { WeekendWidget } from '@/components/widgets/WeekendWidget';
import { useNavigate } from 'react-router-dom';
import { safeStorage } from '@/lib/storage';
import { themes, applyTheme } from '@/lib/themes';
import { useAuth } from '@/contexts/AuthContext';
import { LoginDialog } from '@/components/LoginDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config/api';

function Home() {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return safeStorage.getItem('theme') || 'light';
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, loading } = useAuth();

  useEffect(() => {
    // Check local storage or system preference safely
    applyTheme(currentTheme);
  }, []);

  const handleThemeChange = (themeId: string) => {
    applyTheme(themeId);
    setCurrentTheme(themeId);
    safeStorage.setItem('theme', themeId);
    setShowThemePicker(false);
  };

  const handleStartBuilding = () => {
    if (isAuthenticated) {
      setIsGenerating(true);
      
      // Simulate generation delay
      setTimeout(() => {
          // Fire confetti (Fireworks effect)
          const duration = 2 * 1000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };

          const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }, 250);

          // Wait a bit for the fireworks to show, then navigate
          setTimeout(() => {
               // Pass isNew state to indicate new room creation
               navigate('/editor', { state: { isNew: true } });
          }, 1000); // Navigate after 1s of fireworks
          
      }, 1500); // 1.5 seconds loading delay
    } else {
      toast.info('请先登录');
      setIsLoginOpen(true);
    }
  };

  const handleEnterLobby = () => {
    if (isAuthenticated) {
        navigate('/lobby');
    } else {
        toast.info('请先登录');
        setIsLoginOpen(true);
    }
  };

  const handleEnterCreativeCenter = () => {
    if (isAuthenticated) {
        navigate('/creative-center');
    } else {
        toast.info('请先登录');
        setIsLoginOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased transition-colors duration-300">
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md"
          >
            <div className="flex flex-col items-center space-y-6">
               {/* Spinner */}
               <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="relative"
               >
                  <div className="absolute inset-0 rounded-full blur-md bg-primary/30" />
                  <Loader2 className="h-16 w-16 text-primary relative z-10" />
               </motion.div>
               
               {/* Text with typing effect or just fade in */}
               <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent text-center"
               >
                  正在生成你的专属工作空间...
               </motion.h2>
               
               <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-muted-foreground"
               >
                  准备环境与资源中
               </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
      
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Box className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              TrMenu Web Custom
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-2">
              <TimeWidget />
              <WeekendWidget />
            </div>

            {loading ? (
              <Button variant="ghost" size="icon" disabled>
                <Loader2 className="h-5 w-5 animate-spin" />
              </Button>
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={user.avatar ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar}`) : ''} alt={user.nickName} />
                      <AvatarFallback>{user.nickName ? user.nickName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.nickName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.userName}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => setIsLoginOpen(true)} variant="default" size="sm" className="gap-2">
                <User className="h-4 w-4" />
                <span>点击登录</span>
              </Button>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full"
                      onClick={() => setShowThemePicker(!showThemePicker)}
                    >
                      <Palette className="h-5 w-5" />
                    </Button>
                    {showThemePicker && (
                      <div className="absolute right-0 top-12 flex flex-col gap-1 p-2 bg-popover border rounded-md shadow-md min-w-[180px] z-50 animate-in fade-in zoom-in-95 max-h-[400px] overflow-y-auto">
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
                <TooltipContent>
                  <p>切换主题</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-16 min-w-0">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-4xl mx-auto pt-8">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/20 mb-4">
            v1.0.0 Alpha
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            可视化你的 Minecraft 菜单
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            专为 TrMenu V3 打造的终极可视化编辑器。通过拖拽界面和实时预览，轻松构建复杂、动态的菜单系统。
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" onClick={handleStartBuilding}>
              <LayoutGrid className="mr-2 h-5 w-5" />
              开始构建
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full px-8 shadow-md hover:shadow-lg transition-all" onClick={handleEnterCreativeCenter}>
              <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
              创意中心
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <a href="https://hhhhhy.gitbook.io/trmenu-v3" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-5 w-5" />
                官方文档
              </a>
            </Button>
          </div>
        </section>

        {/* Prerequisites */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="h-5 w-5" />
            <h2 className="text-lg font-semibold tracking-tight">系统前置要求</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="group hover:shadow-md transition-all duration-300 border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  PlaceholderAPI
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-normal">v2.10.9+</span>
                </CardTitle>
                <CardDescription>动态变量支持的核心组件。</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">请确保您的服务器已安装最新版 PAPI 以获得完整兼容性。</p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full group-hover:bg-orange-50 dark:group-hover:bg-orange-950/20" asChild>
                  <a href="https://ci.extendedclip.com/job/PlaceholderAPI/" target="_blank" rel="noreferrer">
                    下载 <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>

            <Card className="group hover:shadow-md transition-all duration-300 border-l-4 border-l-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Item NBT API
                  <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground font-normal">必须</span>
                </CardTitle>
                <CardDescription>高级 NBT 数据操作支持。</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">处理自定义物品标签和高级属性所必需的 API。</p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" size="sm" className="w-full group-hover:bg-yellow-50 dark:group-hover:bg-yellow-950/20" asChild>
                  <a href="https://www.spigotmc.org/resources/nbt-api.7939/" target="_blank" rel="noreferrer">
                    下载 <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Feature Blocks */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <Settings className="h-10 w-10 text-primary mb-2" />
              <CardTitle>基础配置</CardTitle>
              <CardDescription>可视化属性编辑器</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                通过直观的表单界面修改基础设置、菜单标题和更新频率。告别繁琐的 YAML 语法错误。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full" onClick={() => navigate('/config')}>修改配置</Button>
            </CardFooter>
          </Card>

          <Card className="hover:border-primary/50 transition-colors bg-primary/5 border-primary/20">
            <CardHeader>
              <LayoutGrid className="h-10 w-10 text-primary mb-2" />
              <CardTitle className="text-xl">在线协作编辑器</CardTitle>
              <CardDescription>
                多人实时同步，像 Google Docs 一样共同编辑 TrMenu 菜单配置。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span>实时光标同步与冲突处理</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>多标签页支持</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                  <span>邀请链接与权限控制</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button className="flex-1 group" onClick={handleStartBuilding}>
                开始创作
                <Code className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button variant="secondary" className="flex-1 group" onClick={handleEnterLobby}>
                协作大厅
                <Users className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <Code className="h-10 w-10 text-primary mb-2" />
              <CardTitle>TrMenu V3</CardTitle>
              <CardDescription>官方文档支持</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                深入了解 TrMenu V3 的强大功能，包括 Kether 脚本和复杂的动作系统。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="secondary" className="w-full" asChild>
                <a href="https://hhhhhy.gitbook.io/trmenu-v3" target="_blank" rel="noreferrer">访问 Wiki</a>
              </Button>
            </CardFooter>
          </Card>
        </section>

        {/* Developer Info */}
        <section className="bg-secondary/30 rounded-3xl p-8 md:p-12 border border-border/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
              S
            </div>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h2 className="text-2xl font-bold">dev-shixin.gao</h2>
                <p className="text-muted-foreground">全栈开发者 & Minecraft 爱好者</p>
              </div>
              <p className="text-muted-foreground italic">
                "致力于构建让服务器管理更轻松、更有趣的工具。TrMenu Web Custom 只是我们打造更好的 Minecraft 工具生态的开始。"
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
                  <a href="https://gitee.com/gao-shixin/tr-menu-web-custom" target="_blank" rel="noreferrer">
                    <Github className="h-4 w-4" />
                    Gitee
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="gap-2 rounded-full" asChild>
                  <a href="http://www.xincraft.cn" target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    博客 (xincraft.cn)
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        </main>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            {/* Top Section */}
            <div className="flex flex-col gap-4 sticky top-24">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-orange-500" />
                            小工具
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <TimeWidget />
                        <WeekendWidget />
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <LayoutGrid className="h-4 w-4 text-blue-500" />
                            快速导航
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                         <Button variant="ghost" className="justify-start h-auto py-2" onClick={handleEnterLobby}>
                            <Users className="mr-2 h-4 w-4 text-purple-500" />
                            <div className="flex flex-col items-start text-left">
                                <span className="text-sm font-medium">协作大厅</span>
                                <span className="text-xs text-muted-foreground">加入或创建房间</span>
                            </div>
                         </Button>
                         <Button variant="ghost" className="justify-start h-auto py-2" onClick={handleEnterCreativeCenter}>
                            <Palette className="mr-2 h-4 w-4 text-pink-500" />
                            <div className="flex flex-col items-start text-left">
                                <span className="text-sm font-medium">创意中心</span>
                                <span className="text-xs text-muted-foreground">浏览模板与资源</span>
                            </div>
                         </Button>
                    </CardContent>
                </Card>
                
                {/* Bottom Section (Info) */}
                 <Card className="shadow-sm mt-auto bg-muted/30 border-dashed">
                    <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                        <p>TrMenu Web Custom v1.0.0</p>
                        <p>Designed for TrMenu V3</p>
                        <div className="flex gap-2 mt-2">
                            <a href="https://github.com/TrMenu/TrMenu" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">GitHub</a>
                            <span>•</span>
                            <a href="https://trmenu.trixey.cn" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Wiki</a>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </aside>

      </div>

      {/* Footer */}
      <footer className="border-t bg-secondary/20 mt-12">
        <div className="container mx-auto px-4 md:px-8 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-4">
              <h3 className="font-bold text-lg">TrMenu Web Custom</h3>
              <p className="text-sm text-muted-foreground">
                一款现代化的 TrMenu V3 可视化配置工具。
                <br />
                让配置变得前所未有的简单。
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg">链接</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">文档</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">反馈问题</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">隐私政策</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-lg">关注</h3>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 TrMenu Web Custom. 保留所有权利。</p>
            <div className="flex items-center gap-4">
              <span>ICP 备案号: 待备案</span>
              <span className="hidden md:inline">|</span>
              <span>Made with ❤️ by dev-shixin.gao</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;

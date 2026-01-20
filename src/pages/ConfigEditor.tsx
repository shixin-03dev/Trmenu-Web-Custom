import { useState } from 'react';
import { type TrMenuSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Settings, Database, Globe, Zap, Box, Command, Terminal, MousePointer, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { YamlEditor } from '@/components/ui/yaml-editor';
import { generateYamlWithComments } from '@/lib/yaml-generator';

const DEFAULT_CONFIG: TrMenuSettings = {
  Options: {
    'Running-Performance': 'Normal',
    'Multi-Thread': true,
    'Async-Load-Menus': true,
    'Load-Menu-Concurrent': false,
    'Static-Inventory': {
      Java: false,
      Bedrock: false,
    },
    'Packet-Inventory': {
      'Create-Id': false,
    },
    'Bedrock-Open-Delay': 20,
    Placeholders: {
      'JavaScript-Parse': false,
      'Jexl-Parse': false,
    },
  },
  Language: {
    Default: 'zh_CN',
    Player: '',
    CodeTransfer: {
      zh_hans_cn: 'zh_CN',
      zh_hant_cn: 'zh_TW',
      en_ca: 'en_US',
      en_au: 'en_US',
      en_gb: 'en_US',
      en_nz: 'en_US',
    },
  },
  Database: {
    'Use-Legacy-Database': false,
    Method: 'SQLITE',
    Type: {
      SQLite: {
        'file-name': 'data',
      },
      SQL: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'root',
        database: 'test',
      },
    },
    Index: {
      Player: 'USERNAME',
    },
    SQL: {
      enable: false,
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'root',
      database: 'minecraft',
      prefix: 'trmenu',
    },
    'Join-Load-Delay': 40,
    'Global-Data-Sync': 200,
  },
  Loader: {
    'Listen-Files': true,
    'Menu-Files': ['plugins/CustomMenusFolder'],
  },
  Menu: {
    Settings: {
      'Bound-Item-Interval': 3,
    },
    Icon: {
      Inherit: false,
      Item: {
        'Default-Name-Color': '&7',
        'Default-Lore-Color': '&7',
        'Pre-Color': false,
      },
    },
  },
  Action: {
    'Using-Component': true,
    'Title-Using-Component': true,
    Inputer: {
      'Cancel-Words': ['cancel|quit|end', 'q'],
    },
    Kether: {
      'Allow-Tolerance-Parser': true,
    },
  },
  Shortcuts: {
    Offhand: [],
    'Sneaking-Offhand': [
      {
        condition: 'perm *trmenu.shortcut',
        execute: 'open: Example',
        deny: 'return',
      },
    ],
    'Right-Click-Player': 'open: Profile',
    'Sneaking-Right-Click-Player': [],
    'PlayerInventory-Border-Left': [],
    'PlayerInventory-Border-Right': [],
    'PlayerInventory-Border-Middle': [],
  },
  RegisterCommands: {
    openMenus: {
      aliases: [],
      permission: null,
      execute: ['tell: &7Argument `example` Required!'],
      arguments: {
        example: 'open: example',
      },
    },
  },
  Scripts: {
    'Export-Hook-Plugin': true,
    'Mozilla-Compat': true,
    'Enable-GraalJS': false,
    'Binding-Map': null,
  },
};

type Section = keyof TrMenuSettings;

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: 'Options', label: '基础选项', icon: Zap },
  { id: 'Language', label: '语言设置', icon: Globe },
  { id: 'Database', label: '数据存储', icon: Database },
  { id: 'Loader', label: '加载设置', icon: Box },
  { id: 'Menu', label: '菜单默认', icon: Settings },
  { id: 'Action', label: '动作相关', icon: MousePointer },
  { id: 'Shortcuts', label: '快捷操作', icon: Command },
  { id: 'RegisterCommands', label: '命令注册', icon: Terminal },
  { id: 'Scripts', label: '脚本设置', icon: Terminal },
];

export default function ConfigEditor() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<TrMenuSettings>(DEFAULT_CONFIG);
  const [activeSection, setActiveSection] = useState<Section>('Options');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const yamlStr = generateYamlWithComments(config);
      setPreviewContent(yamlStr);
      setIsGenerating(false);
      setShowPreview(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff']
      });
    } catch (e) {
      console.error('Failed to generate YAML', e);
      setIsGenerating(false);
      alert('生成配置失败，请检查控制台错误。');
    }
  };

  const handleSave = () => {
    try {
      const blob = new Blob([previewContent], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'settings.yml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowPreview(false);
    } catch (e) {
      console.error('Failed to save', e);
      alert('保存文件失败');
    }
  };

  const updateConfig = (section: Section, path: string[], value: any) => {
    setConfig((prev) => {
      const newConfig = { ...prev };
      let current: any = newConfig[section];
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      
      current[path[path.length - 1]] = value;
      return newConfig;
    });
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'Options':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>性能模式 (Running-Performance)</Label>
                <Select
                  value={config.Options['Running-Performance']}
                  onChange={(e) => updateConfig('Options', ['Running-Performance'], e.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                  <option value="Low">Low</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>基岩版延迟 (Bedrock-Open-Delay)</Label>
                <Input
                  type="number"
                  value={config.Options['Bedrock-Open-Delay']}
                  onChange={(e) => updateConfig('Options', ['Bedrock-Open-Delay'], parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">开关选项</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>多线程 (Multi-Thread)</Label>
                  <Switch
                    checked={config.Options['Multi-Thread']}
                    onCheckedChange={(c) => updateConfig('Options', ['Multi-Thread'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>异步载入 (Async-Load-Menus)</Label>
                  <Switch
                    checked={config.Options['Async-Load-Menus']}
                    onCheckedChange={(c) => updateConfig('Options', ['Async-Load-Menus'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>并发加载 (Load-Menu-Concurrent)</Label>
                  <Switch
                    checked={config.Options['Load-Menu-Concurrent']}
                    onCheckedChange={(c) => updateConfig('Options', ['Load-Menu-Concurrent'], c)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">静态背包 (Static-Inventory)</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>Java 版</Label>
                  <Switch
                    checked={config.Options['Static-Inventory'].Java}
                    onCheckedChange={(c) => updateConfig('Options', ['Static-Inventory', 'Java'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Bedrock 版</Label>
                  <Switch
                    checked={config.Options['Static-Inventory'].Bedrock}
                    onCheckedChange={(c) => updateConfig('Options', ['Static-Inventory', 'Bedrock'], c)}
                  />
                </div>
              </div>
            </div>

             <div className="space-y-4">
              <h3 className="font-semibold border-b pb-2">变量解析 (Placeholders)</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>JavaScript Parse</Label>
                  <Switch
                    checked={config.Options.Placeholders['JavaScript-Parse']}
                    onCheckedChange={(c) => updateConfig('Options', ['Placeholders', 'JavaScript-Parse'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Jexl Parse</Label>
                  <Switch
                    checked={config.Options.Placeholders['Jexl-Parse']}
                    onCheckedChange={(c) => updateConfig('Options', ['Placeholders', 'Jexl-Parse'], c)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Language':
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>默认语言 (Default)</Label>
                <Input
                  value={config.Language.Default}
                  onChange={(e) => updateConfig('Language', ['Default'], e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>玩家语言 (Player)</Label>
                <Input
                  placeholder="留空使用本地化设置"
                  value={config.Language.Player}
                  onChange={(e) => updateConfig('Language', ['Player'], e.target.value)}
                />
              </div>
             </div>
             <div className="space-y-2">
               <Label>语言代码映射 (CodeTransfer)</Label>
               <div className="bg-muted/50 p-4 rounded-md">
                 <p className="text-sm text-muted-foreground mb-2">JSON 格式编辑映射关系：</p>
                 <Textarea
                    className="font-mono text-xs"
                    rows={8}
                    value={JSON.stringify(config.Language.CodeTransfer, null, 2)}
                    onChange={(e) => {
                      try {
                        const val = JSON.parse(e.target.value);
                        updateConfig('Language', ['CodeTransfer'], val);
                      } catch (e) {
                        // Ignore parse errors while typing
                      }
                    }}
                 />
               </div>
             </div>
          </div>
        );
      case 'Database':
        return (
          <div className="space-y-6">
             <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">旧版数据库 (Legacy)</Label>
                  <p className="text-sm text-muted-foreground">Use-Legacy-Database</p>
                </div>
                <Switch
                  checked={config.Database['Use-Legacy-Database']}
                  onCheckedChange={(c) => updateConfig('Database', ['Use-Legacy-Database'], c)}
                />
             </div>

             <div className="space-y-4">
               <Label>存储方式 (Method)</Label>
               <Select
                  value={config.Database.Method}
                  onChange={(e) => updateConfig('Database', ['Method'], e.target.value)}
                  disabled={!config.Database['Use-Legacy-Database']}
                >
                  <option value="SQLITE">SQLITE</option>
                  <option value="SQL">SQL</option>
                </Select>
                {!config.Database['Use-Legacy-Database'] && <p className="text-xs text-muted-foreground">需启用旧版数据库才能修改此项</p>}
             </div>

            {config.Database['Use-Legacy-Database'] && config.Database.Method === 'SQL' && (
              <div className="border border-orange-200 rounded-md p-4 space-y-4 bg-orange-50/50 dark:bg-orange-950/10 animate-in fade-in slide-in-from-top-2">
                 <h4 className="font-medium text-sm text-orange-600 dark:text-orange-400">旧版 SQL 配置 (Legacy)</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label>主机 (Host)</Label>
                       <Input value={config.Database.Type.SQL.host} onChange={(e) => updateConfig('Database', ['Type', 'SQL', 'host'], e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <Label>端口 (Port)</Label>
                       <Input type="number" value={config.Database.Type.SQL.port} onChange={(e) => updateConfig('Database', ['Type', 'SQL', 'port'], parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                       <Label>用户 (User)</Label>
                       <Input value={config.Database.Type.SQL.user} onChange={(e) => updateConfig('Database', ['Type', 'SQL', 'user'], e.target.value)} />
                    </div>
                     <div className="space-y-2">
                       <Label>密码 (Password)</Label>
                       <Input type="password" value={config.Database.Type.SQL.password} onChange={(e) => updateConfig('Database', ['Type', 'SQL', 'password'], e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <Label>数据库 (Database)</Label>
                       <Input value={config.Database.Type.SQL.database} onChange={(e) => updateConfig('Database', ['Type', 'SQL', 'database'], e.target.value)} />
                    </div>
                 </div>
              </div>
            )}

            <div className="border rounded-md p-4 space-y-4 bg-muted/20">
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium text-sm">新版 SQL 模块 (New SQL Module)</h4>
                      <p className="text-xs text-muted-foreground">推荐使用新版数据库模块</p>
                    </div>
                    <Switch checked={config.Database.SQL.enable} onCheckedChange={(c) => updateConfig('Database', ['SQL', 'enable'], c)} />
                 </div>
                 
                 {config.Database.SQL.enable && (
                 <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-2">
                       <Label>主机 (Host)</Label>
                       <Input value={config.Database.SQL.host} onChange={(e) => updateConfig('Database', ['SQL', 'host'], e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <Label>端口 (Port)</Label>
                       <Input type="number" value={config.Database.SQL.port} onChange={(e) => updateConfig('Database', ['SQL', 'port'], parseInt(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                       <Label>用户 (User)</Label>
                       <Input value={config.Database.SQL.user} onChange={(e) => updateConfig('Database', ['SQL', 'user'], e.target.value)} />
                    </div>
                     <div className="space-y-2">
                       <Label>密码 (Password)</Label>
                       <Input type="password" value={config.Database.SQL.password} onChange={(e) => updateConfig('Database', ['SQL', 'password'], e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <Label>数据库 (Database)</Label>
                       <Input value={config.Database.SQL.database} onChange={(e) => updateConfig('Database', ['SQL', 'database'], e.target.value)} />
                    </div>
                     <div className="space-y-2">
                       <Label>表前缀 (Prefix)</Label>
                       <Input value={config.Database.SQL.prefix} onChange={(e) => updateConfig('Database', ['SQL', 'prefix'], e.target.value)} />
                    </div>
                 </div>
                 )}
              </div>

             <div className="space-y-4">
               <h3 className="font-semibold">索引方式</h3>
               <div className="flex items-center gap-4">
                 <Label>Player Index</Label>
                 <Select
                    value={config.Database.Index.Player}
                    onChange={(e) => updateConfig('Database', ['Index', 'Player'], e.target.value)}
                    className="w-40"
                  >
                    <option value="USERNAME">USERNAME</option>
                    <option value="UUID">UUID</option>
                  </Select>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>进服延迟 (Join-Load-Delay)</Label>
                 <Input
                   type="number"
                   value={config.Database['Join-Load-Delay']}
                   onChange={(e) => updateConfig('Database', ['Join-Load-Delay'], parseInt(e.target.value))}
                 />
               </div>
               <div className="space-y-2">
                 <Label>同步间隔 (Global-Data-Sync)</Label>
                 <Input
                   type="number"
                   value={config.Database['Global-Data-Sync']}
                   onChange={(e) => updateConfig('Database', ['Global-Data-Sync'], parseInt(e.target.value))}
                 />
               </div>
             </div>
          </div>
        );
      case 'Loader':
        return (
           <div className="space-y-6">
             <div className="flex items-center justify-between">
                <Label>自动重载 (Listen-Files)</Label>
                <Switch
                  checked={config.Loader['Listen-Files']}
                  onCheckedChange={(c) => updateConfig('Loader', ['Listen-Files'], c)}
                />
             </div>
             <div className="space-y-2">
               <Label>菜单加载路径 (Menu-Files)</Label>
               <Textarea
                  value={config.Loader['Menu-Files'].join('\n')}
                  onChange={(e) => updateConfig('Loader', ['Menu-Files'], e.target.value.split('\n'))}
                  placeholder="一行一个路径"
               />
               <p className="text-xs text-muted-foreground">每行输入一个文件夹路径</p>
             </div>
           </div>
        );
      case 'Menu':
        return (
          <div className="space-y-6">
             <div className="space-y-2">
               <Label>物品触发间隔 (Bound-Item-Interval)</Label>
               <Input
                 type="number"
                 value={config.Menu.Settings['Bound-Item-Interval']}
                 onChange={(e) => updateConfig('Menu', ['Settings', 'Bound-Item-Interval'], parseInt(e.target.value))}
               />
             </div>
             
             <div className="space-y-4 border-t pt-4">
               <h3 className="font-semibold">图标设置 (Icon)</h3>
               <div className="flex items-center justify-between">
                  <Label>继承主图标 (Inherit)</Label>
                  <Switch
                    checked={config.Menu.Icon.Inherit}
                    onCheckedChange={(c) => updateConfig('Menu', ['Icon', 'Inherit'], c)}
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>默认名称颜色</Label>
                    <Input
                      value={config.Menu.Icon.Item['Default-Name-Color']}
                      onChange={(e) => updateConfig('Menu', ['Icon', 'Item', 'Default-Name-Color'], e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>默认Lore颜色</Label>
                    <Input
                      value={config.Menu.Icon.Item['Default-Lore-Color']}
                      onChange={(e) => updateConfig('Menu', ['Icon', 'Item', 'Default-Lore-Color'], e.target.value)}
                    />
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <Label>优先着色 (Pre-Color)</Label>
                  <Switch
                    checked={config.Menu.Icon.Item['Pre-Color']}
                    onCheckedChange={(c) => updateConfig('Menu', ['Icon', 'Item', 'Pre-Color'], c)}
                  />
               </div>
             </div>
          </div>
        );
      case 'Action':
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>使用组件 (Using-Component)</Label>
                  <Switch
                    checked={config.Action['Using-Component']}
                    onCheckedChange={(c) => updateConfig('Action', ['Using-Component'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>标题解析 (Title-Using-Component)</Label>
                  <Switch
                    checked={config.Action['Title-Using-Component']}
                    onCheckedChange={(c) => updateConfig('Action', ['Title-Using-Component'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Kether 宽容解析 (Allow-Tolerance-Parser)</Label>
                  <Switch
                    checked={config.Action.Kether['Allow-Tolerance-Parser']}
                    onCheckedChange={(c) => updateConfig('Action', ['Kether', 'Allow-Tolerance-Parser'], c)}
                  />
                </div>
             </div>

             <div className="space-y-2">
               <Label>捕获器取消词 (Cancel-Words)</Label>
               <Textarea
                  value={config.Action.Inputer['Cancel-Words'].join('\n')}
                  onChange={(e) => updateConfig('Action', ['Inputer', 'Cancel-Words'], e.target.value.split('\n'))}
                  placeholder="一行一个正则表达式"
               />
             </div>
          </div>
        );
      case 'Shortcuts':
        return (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              配置快捷操作绑定的动作。支持 YAML 格式输入。<br/>
              如果不需要该快捷操作，请留空或设置为 []。
            </p>
            <div className="grid gap-6">
              {['Offhand', 'Sneaking-Offhand', 'Right-Click-Player', 'Sneaking-Right-Click-Player', 'PlayerInventory-Border-Left', 'PlayerInventory-Border-Right', 'PlayerInventory-Border-Middle'].map((key) => (
                <YamlEditor
                  key={key}
                  label={key}
                  value={config.Shortcuts[key]}
                  onChange={(val) => updateConfig('Shortcuts', [key], val)}
                  placeholder={`配置 ${key} 的动作列表`}
                />
              ))}
            </div>
          </div>
        );
      case 'RegisterCommands':
        return (
           <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                   <Label className="text-base">注册命令</Label>
                   <p className="text-sm text-muted-foreground">在此处定义注册到服务器的命令及其行为。</p>
                </div>
             </div>
             <YamlEditor
               value={config.RegisterCommands}
               onChange={(val) => updateConfig('RegisterCommands', [], val)}
               placeholder="输入命令注册配置 (YAML 格式)"
             />
           </div>
        );
      case 'Scripts':
        return (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <Label>导出 Hook 插件 (Export-Hook-Plugin)</Label>
                  <Switch
                    checked={config.Scripts['Export-Hook-Plugin']}
                    onCheckedChange={(c) => updateConfig('Scripts', ['Export-Hook-Plugin'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Mozilla 兼容 (Mozilla-Compat)</Label>
                  <Switch
                    checked={config.Scripts['Mozilla-Compat']}
                    onCheckedChange={(c) => updateConfig('Scripts', ['Mozilla-Compat'], c)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>启用 GraalJS (Enable-GraalJS)</Label>
                  <Switch
                    checked={config.Scripts['Enable-GraalJS']}
                    onCheckedChange={(c) => updateConfig('Scripts', ['Enable-GraalJS'], c)}
                  />
                </div>
             </div>
             
             <div className="space-y-2">
               <Label>Binding Map</Label>
               <YamlEditor
                 value={config.Scripts['Binding-Map']}
                 onChange={(val) => updateConfig('Scripts', ['Binding-Map'], val)}
                 placeholder="配置脚本绑定映射 (YAML 格式)"
               />
             </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <h1 className="font-semibold text-lg">基础配置修改</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerate} disabled={isGenerating} className="min-w-[140px]">
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span> 正在努力生成中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  生成配置文件
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-8 grid grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="col-span-3 space-y-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="col-span-9">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl">{SECTIONS.find(s => s.id === activeSection)?.label}</CardTitle>
              <CardDescription>
                配置 {activeSection} 相关选项
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="bg-card border rounded-xl p-6 shadow-sm">
                {renderSectionContent()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-background rounded-lg shadow-xl w-full h-full max-w-5xl max-h-[90vh] flex flex-col border border-border">
            <div className="flex items-center justify-between p-4 border-b">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-green-600 dark:text-green-500">
                        <Check className="w-5 h-5" />
                        配置生成成功
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        平台已为您自动添加中文注释，您可以直接保存或在下方手动微调。
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                    <X className="w-5 h-5" />
                </Button>
            </div>
            <div className="flex-1 p-0 overflow-hidden relative">
                <Textarea 
                    className="w-full h-full font-mono text-sm resize-none bg-muted/30 border-0 focus-visible:ring-0 rounded-none p-4"
                    value={previewContent}
                    onChange={(e) => setPreviewContent(e.target.value)}
                    spellCheck={false}
                />
            </div>
            <div className="p-4 border-t flex justify-end gap-4 bg-muted/10">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                    取消
                </Button>
                <Button onClick={handleSave} className="gap-2">
                    <Download className="w-4 h-4" />
                    保存并下载 (settings.yml)
                </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import yaml from 'js-yaml';
import { type TrMenuSettings } from './types';

export function generateYamlWithComments(config: TrMenuSettings): string {
  // Helper for indented dump
  const di = (val: any, indent: number = 2) => {
      if (val === undefined || val === null) return '';
      const str = yaml.dump(val, { lineWidth: -1, noRefs: true });
      if (str.trim() === '{}') return '{}';
      if (str.trim() === '[]') return '[]';
      return str.split('\n').map((line) => {
          if (!line.trim()) return line;
          return ' '.repeat(indent) + line;
      }).join('\n').trimEnd();
  };

  return `# # 插件的选项
Options:
  # 性能模式: High, Normal, Low
  Running-Performance: ${config.Options['Running-Performance']}
  # 多线程
  Multi-Thread: ${config.Options['Multi-Thread']}
  # 异步载入菜单
  Async-Load-Menus: ${config.Options['Async-Load-Menus']}
  # 是否启用并发加载菜单
  # 启用后会导致多级捕获器顺序错乱
  Load-Menu-Concurrent: ${config.Options['Load-Menu-Concurrent']}
  Static-Inventory:
    Java: ${config.Options['Static-Inventory'].Java}
    Bedrock: ${config.Options['Static-Inventory'].Bedrock}
  Packet-Inventory:
    Create-Id: ${config.Options['Packet-Inventory']['Create-Id']}
  Bedrock-Open-Delay: ${config.Options['Bedrock-Open-Delay']}
  Placeholders:
    JavaScript-Parse: ${config.Options.Placeholders['JavaScript-Parse']}
    Jexl-Parse: ${config.Options.Placeholders['Jexl-Parse']}

# 菜单多语言系统
Language:
  Default: '${config.Language.Default}'
  # 将提供的文本解析为玩家语言
  # 若留空则使用玩家本地化设置
  Player: '${config.Language.Player}'
  CodeTransfer:
${di(config.Language.CodeTransfer, 4)}

# 插件的玩家数据储存方式
Database:
  # 使用旧版数据库储存
  Use-Legacy-Database: ${config.Database['Use-Legacy-Database']}
  # Local: SQLITE
  # External: SQL
  Method: '${config.Database.Method}'
  Type:
    SQLite:
      file-name: ${config.Database.Type.SQLite['file-name']}
    SQL:
      host: ${config.Database.Type.SQL.host}
      port: ${config.Database.Type.SQL.port}
      user: ${config.Database.Type.SQL.user}
      password: ${config.Database.Type.SQL.password}
      database: ${config.Database.Type.SQL.database}
  Index:
    # UUID, USERNAME
    Player: '${config.Database.Index.Player}'
  # 新版数据库模块
  SQL:
    # 启用 MYSQL, 否则使用 SQLITE
    enable: ${config.Database.SQL.enable}
    host: ${config.Database.SQL.host}
    port: ${config.Database.SQL.port}
    user: ${config.Database.SQL.user}
    password: ${config.Database.SQL.password}
    database: ${config.Database.SQL.database}
    prefix: ${config.Database.SQL.prefix}
  # 进服延迟加载数据
  Join-Load-Delay: ${config.Database['Join-Load-Delay']}
  # 全局数据跨服同步间隔
  Global-Data-Sync: ${config.Database['Global-Data-Sync']}

# 菜单加载器
Loader:
  # 启用菜单自动重载
  Listen-Files: ${config.Loader['Listen-Files']}
  Menu-Files:
${di(config.Loader['Menu-Files'], 4)}

# 菜单设置
Menu:
  # 选项
  Settings:
    # 绑定物品触发开启菜单的最低间隔 (防止频刷)
    Bound-Item-Interval: ${config.Menu.Settings['Bound-Item-Interval']}
    # 图标
    Icon:
      # 是否默认开启子图标继承主图标
      Inherit: ${config.Menu.Icon.Inherit}
      # 显示物品
      Item:
        # 默认名称颜色
        Default-Name-Color: "${config.Menu.Icon.Item['Default-Name-Color']}"
        # 默认Lore颜色
        Default-Lore-Color: "${config.Menu.Icon.Item['Default-Lore-Color']}"
        # 优先着色
        # 若开启，则先替换颜色再处理函数变量
        Pre-Color: ${config.Menu.Icon.Item['Pre-Color']}

# 动作相关
# 开启 Kether 宽容解析语句后无需添加 * 号
Action:
  Using-Component: ${config.Action['Using-Component']}
  # 启用标题解析 TabooLib Component 文本, 开启后 title 将会被解析为 json 使用
  Title-Using-Component: ${config.Action['Title-Using-Component']}
  # 捕获器
  Inputer:
    # 取消词（正则）
    Cancel-Words:
${di(config.Action.Inputer['Cancel-Words'], 4)}
  Kether:
    # 开启Kether语句宽容解析
    # 自 3.5.0 版本删除该选项，强制开启宽容解析
    Allow-Tolerance-Parser: ${config.Action.Kether['Allow-Tolerance-Parser']}

# 快捷绑定执行的动作
# 具体注解详见 [USAGE-快捷绑定] 章节
Shortcuts:
${di(config.Shortcuts, 2)}

# 注册自定义命令
# 具体注解详见 [USAGE-命令注册] 章节
RegisterCommands:
${di(config.RegisterCommands, 2)}

# JS/JEXL 命名导出
# 具体注解详见 [SCRIPT-JAVASCRIPT] 章节
Scripts:
  Export-Hook-Plugin: ${config.Scripts['Export-Hook-Plugin']}
  Mozilla-Compat: ${config.Scripts['Mozilla-Compat']}
  # 是否启用 GraalJS 作为引擎
  Enable-GraalJS: ${config.Scripts['Enable-GraalJS']}
  Binding-Map:
${config.Scripts['Binding-Map'] ? di(config.Scripts['Binding-Map'], 4) : ''}
`;
}

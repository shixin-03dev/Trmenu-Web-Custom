export interface TrMenuIcon {
  display: {
    mats: string;
    name?: string | string[];
    lore?: string[];
    amount?: number;
    shiny?: boolean;
    flags?: string[];
    nbt?: Record<string, any>;
    custom_model_data?: number;
    // Allow 'material' as alias for import compatibility
    material?: string;
  };
  actions?: {
    all?: (string | object)[];
    left?: (string | object)[];
    right?: (string | object)[];
    middle?: (string | object)[];
    shift_left?: (string | object)[];
    shift_right?: (string | object)[];
    [key: string]: (string | object)[] | undefined;
  };
  condition?: string;
  priority?: number;
  update?: number | number[];
  refresh?: number;
  // Slot can be a single number, a range string "1-5", a list of numbers, or part of a layout char
  slot?: number | string | (number | string)[]; 
  _page?: number; // Internal use for editor pagination
  // Conditional icons support
  icons?: TrMenuIcon[];
}

export interface TrMenuConfiguration {
  Title: string | string[];
  'Title-Update'?: number;
  Layout?: string[] | string[][];
  Shape?: string[] | string[][]; // Alias for Layout
  Options?: {
    Arguments?: boolean;
    'Default-Arguments'?: string[];
    'Free-Slots'?: number[];
    'Default-Layout'?: number;
    'Hide-Player-Inventory'?: boolean;
    'Min-Click-Delay'?: number;
    'Depend-Expansions'?: string[];
  };
  Bindings?: {
    Commands?: string[];
    Items?: string[];
  };
  Events?: {
    Open?: { condition?: string; actions?: (string | object)[]; deny?: (string | object)[] }[];
    Close?: (string | object)[];
  };
  Icons: Record<string, TrMenuIcon>;
  _rows?: number; // Editor only: number of rows
}

export interface TrMenuSettings {
  Options: {
    'Running-Performance': 'High' | 'Normal' | 'Low';
    'Multi-Thread': boolean;
    'Async-Load-Menus': boolean;
    'Load-Menu-Concurrent': boolean;
    'Static-Inventory': {
      Java: boolean;
      Bedrock: boolean;
    };
    'Packet-Inventory': {
      'Create-Id': boolean;
    };
    'Bedrock-Open-Delay': number;
    Placeholders: {
      'JavaScript-Parse': boolean;
      'Jexl-Parse': boolean;
    };
  };
  Language: {
    Default: string;
    Player: string;
    CodeTransfer: Record<string, string>;
  };
  Database: {
    'Use-Legacy-Database': boolean;
    Method: 'SQLITE' | 'SQL';
    Type: {
      SQLite: {
        'file-name': string;
      };
      SQL: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
      };
    };
    Index: {
      Player: 'UUID' | 'USERNAME';
    };
    SQL: {
      enable: boolean;
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      prefix: string;
    };
    'Join-Load-Delay': number;
    'Global-Data-Sync': number;
  };
  Loader: {
    'Listen-Files': boolean;
    'Menu-Files': string[];
  };
  Menu: {
    Settings: {
      'Bound-Item-Interval': number;
    };
    Icon: {
      Inherit: boolean;
      Item: {
        'Default-Name-Color': string;
        'Default-Lore-Color': string;
        'Pre-Color': boolean;
      };
    };
  };
  Action: {
    'Using-Component': boolean;
    'Title-Using-Component': boolean;
    Inputer: {
      'Cancel-Words': string[];
    };
    Kether: {
      'Allow-Tolerance-Parser': boolean;
    };
  };
  Shortcuts: Record<string, any>; // Simplified for now, or define specific structure
  RegisterCommands: Record<string, any>;
  Scripts: {
    'Export-Hook-Plugin': boolean;
    'Mozilla-Compat': boolean;
    'Enable-GraalJS': boolean;
    'Binding-Map': any;
  };
}

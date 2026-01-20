import type { TrMenuConfiguration, TrMenuIcon } from './types';

export const LAYOUT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?';

export function convertToLayoutConfig(config: TrMenuConfiguration, targetRows?: number): TrMenuConfiguration {
  const newConfig = JSON.parse(JSON.stringify(config)) as TrMenuConfiguration;
  const icons = newConfig.Icons || {};
  const newIcons: Record<string, TrMenuIcon> = {};
  
  // 1. Determine Pages
  let maxPage = 0;
  Object.values(icons).forEach(icon => {
      if (icon._page && icon._page > maxPage) maxPage = icon._page;
  });

  // 2. Determine Grid Size (Rows)
  let rows = targetRows || 6;
  if (!targetRows) {
      let maxSlotFound = 0;
      Object.values(icons).forEach(icon => {
        const slots = getSlots(icon);
        if (slots.length > 0) {
            const max = Math.max(...slots);
            if (max > maxSlotFound) maxSlotFound = max;
        }
      });
      rows = Math.max(1, Math.ceil((maxSlotFound + 1) / 9));
      if (rows > 6) rows = 6;
  }

  // 3. Initialize Layout Grids: [Page][Row][Col]
  const layoutGrids: string[][][] = [];
  for (let p = 0; p <= maxPage; p++) {
      layoutGrids[p] = Array(rows).fill(null).map(() => Array(9).fill(' '));
  }
  
  // 4. Assign Chars and Fill Grids
  Object.entries(icons).forEach(([key, icon]) => {
    const page = icon._page || 0;
    const slots = getSlots(icon);
    
    // Remove _page from output icon (it's internal)
    delete icon._page;

    // Check compatibility: 
    // - Single char allowed in LAYOUT_CHARS
    // - Multi-char allowed (will be backticked)
    // - Avoid backticks in ID itself if possible (or escape? TrMenu doesn't mention escaping)
    const isSingleChar = key.length === 1;
    const isMultiChar = key.length > 1;
    
    // We try to put everything in Layout if possible
    if (isSingleChar || isMultiChar) {
        slots.forEach(slot => {
            const row = Math.floor(slot / 9);
            const col = slot % 9;
            if (page <= maxPage && row < rows) {
                layoutGrids[page][row][col] = key;
            }
        });
        
        // Remove slot property as it is now in Layout
        delete icon.slot;
    }
    
    newIcons[key] = icon;
  });

  // 5. Generate Layout Strings
  let finalLayout: string[] | string[][];
  
  const generateRowString = (row: string[]) => {
      return row.map(id => {
          if (id.length > 1) return `\`${id}\``;
          return id;
      }).join('');
  };

  if (maxPage === 0) {
      // Single page: string[]
      finalLayout = layoutGrids[0].map(generateRowString);
  } else {
      // Multi page: string[][]
      finalLayout = layoutGrids.map(grid => grid.map(generateRowString));
  }
  
  // 6. Reconstruct config
  const orderedConfig: any = {};
  if (newConfig.Title) orderedConfig.Title = newConfig.Title;
  if (newConfig['Title-Update']) orderedConfig['Title-Update'] = newConfig['Title-Update'];
  
  orderedConfig.Layout = finalLayout;
  
  // Copy other properties
  Object.keys(newConfig).forEach(k => {
      if (k !== 'Title' && k !== 'Title-Update' && k !== 'Layout' && k !== 'Icons') {
          orderedConfig[k] = (newConfig as any)[k];
      }
  });
  
  orderedConfig.Icons = newIcons;

  return orderedConfig as TrMenuConfiguration;
}

export function parseLayoutConfig(parsed: any): TrMenuConfiguration {
    // Ensure basic structure
    if (!parsed.Icons) parsed.Icons = {};
    
    // Normalize keys (strip backticks from keys)
    const normalizedIcons: any = {};
    Object.keys(parsed.Icons).forEach(k => {
        let newKey = k;
        if (k.startsWith('`') && k.endsWith('`') && k.length > 2) {
            newKey = k.substring(1, k.length - 1);
        }
        normalizedIcons[newKey] = parsed.Icons[k];
    });
    parsed.Icons = normalizedIcons;

    if (!parsed.Title) parsed.Title = ['Menu'];

    // 1. Handle Layout based positioning
    // Support Shape as alias for Layout
    if (parsed.Shape && !parsed.Layout) {
        parsed.Layout = parsed.Shape;
        delete parsed.Shape;
    }

    if (parsed.Layout) {
         let layoutPages: string[][];
         if (Array.isArray(parsed.Layout) && Array.isArray(parsed.Layout[0])) {
             layoutPages = parsed.Layout as string[][];
         } else if (Array.isArray(parsed.Layout)) {
             layoutPages = [parsed.Layout as string[]];
         } else {
             layoutPages = [];
         }
         
         layoutPages.forEach((pageRows, pageIndex) => {
             pageRows.forEach((rowStr, rowIndex) => {
                 // Parse row string into tokens (IDs)
                 const rowTokens = parseLayoutRow(rowStr);
                 
                 for (let colIndex = 0; colIndex < rowTokens.length && colIndex < 9; colIndex++) {
                     const char = rowTokens[colIndex];
                     if (char && char.trim() !== '' && parsed.Icons[char]) {
                         const slot = rowIndex * 9 + colIndex;
                         if (!parsed.Icons[char].slot) {
                             parsed.Icons[char].slot = slot;
                         } else {
                             const existing = parsed.Icons[char].slot;
                             if (Array.isArray(existing)) {
                                 parsed.Icons[char].slot = [...existing, slot];
                             } else {
                                 parsed.Icons[char].slot = [existing, slot];
                             }
                         }
                         // Set internal page
                         parsed.Icons[char]._page = pageIndex;
                     }
                 }
             });
         });
         // We keep Layout in the parsed object for reference? 
         // Or delete it? The Editor uses 'slot' property as source of truth.
         // Usually we delete it so we don't have stale Layout data conflicting with state.
         delete parsed.Layout;
    } else {
        // If no layout, try to detect rows from explicit slots
        // (This part is handled by Editor state, but we ensure structure)
    }

    // 2. Normalize icons (ensure display, etc.)
    // This is optional but good for safety
    Object.keys(parsed.Icons).forEach(key => {
        const icon = parsed.Icons[key];
        if (!icon.display) icon.display = { mats: 'stone', name: 'Unnamed' };
        // If no slot assigned and not in Layout, it might be a template or invalid.
        // We leave it as is.
    });

    return parsed as TrMenuConfiguration;
}

function parseLayoutRow(row: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < row.length) {
        if (row[i] === '`') {
            // Start of multi-char ID
            const end = row.indexOf('`', i + 1);
            if (end === -1) {
                 // Malformed, treat as literal backtick?
                 tokens.push(row[i]);
                 i++;
            } else {
                 // Found ID
                 tokens.push(row.substring(i + 1, end));
                 i = end + 1;
            }
        } else {
             // Single char ID
             tokens.push(row[i]);
             i++;
        }
    }
    return tokens;
}

export function getSlots(icon: TrMenuIcon): number[] {
  const s = icon.slot;
  if (typeof s === 'number') return [s];
  if (Array.isArray(s)) return s.map(Number).filter(n => !isNaN(n));
  if (typeof s === 'string') {
    if (s.includes('-')) {
      const [start, end] = s.split('-').map(Number);
      const res = [];
      for (let i = start; i <= end; i++) res.push(i);
      return res;
    }
    if (s.includes(',')) {
      return s.split(',').map(Number).filter(n => !isNaN(n));
    }
    const n = Number(s);
    if (!isNaN(n)) return [n];
  }
  return [];
}

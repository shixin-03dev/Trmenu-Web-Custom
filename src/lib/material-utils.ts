
export type MaterialType = 'standard' | 'head' | 'source' | 'mod' | 'repo' | 'json' | 'url';

interface ParsedMaterial {
  type: MaterialType;
  value: string;
}

export function parseMaterial(raw: string | any): ParsedMaterial {
  if (!raw) return { type: 'standard', value: 'stone' };
  
  // Handle non-string inputs safely
  if (typeof raw !== 'string') {
      if (Array.isArray(raw)) {
          // If array, use first element recursively
          return parseMaterial(raw[0]);
      }
      // Try to stringify
      raw = String(raw);
  }

  if (raw.startsWith('head:')) {
    return { type: 'head', value: raw.substring(5) };
  }
  
  if (raw.startsWith('url:') || raw.startsWith('http')) {
      // If it starts with http, treat as URL. Or explicit url: prefix
      const val = raw.startsWith('url:') ? raw.substring(4) : raw;
      return { type: 'url', value: val };
  }
  
  if (raw.startsWith('source:') || raw.startsWith('hook:')) {
    // Support both source: and legacy hook: for parsing, but standardize to source type
    const prefix = raw.startsWith('source:') ? 'source:' : 'hook:';
    return { type: 'source', value: raw.substring(prefix.length) };
  }
  
  if (raw.startsWith('mod:')) {
    return { type: 'mod', value: raw.substring(4) };
  }
  
  if (raw.startsWith('repo:')) {
    return { type: 'repo', value: raw.substring(5) };
  }
  
  if (raw.trim().startsWith('{')) {
    return { type: 'json', value: raw };
  }

  return { type: 'standard', value: raw };
}

export function formatMaterial(parsed: ParsedMaterial): string {
  switch (parsed.type) {
    case 'head':
      return `head:${parsed.value}`;
    case 'url':
      return `url:${parsed.value}`;
    case 'source':
      return `source:${parsed.value}`;
    case 'mod':
      return `mod:${parsed.value}`;
    case 'repo':
      return `repo:${parsed.value}`;
    case 'json':
      return parsed.value;
    default:
      return parsed.value;
  }
}

import minecraftItems from './minecraft-items.json';

export const COMMON_MATERIALS = minecraftItems.map(item => item.name);

export const ALL_MATERIALS_FULL = minecraftItems;

export const searchMaterials = (term: string) => {
    const lower = term.toLowerCase();
    return minecraftItems.filter(item => 
        item.name.toLowerCase().includes(lower) || 
        item.displayName.toLowerCase().includes(lower)
    );
};

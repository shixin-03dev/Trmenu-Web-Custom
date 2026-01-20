export const MC_COLORS: Record<string, string> = {
  '0': '#000000',
  '1': '#0000AA',
  '2': '#00AA00',
  '3': '#00AAAA',
  '4': '#AA0000',
  '5': '#AA00AA',
  '6': '#FFAA00',
  '7': '#AAAAAA',
  '8': '#555555',
  '9': '#5555FF',
  'a': '#55FF55',
  'b': '#55FFFF',
  'c': '#FF5555',
  'd': '#FF55FF',
  'e': '#FFFF55',
  'f': '#FFFFFF',
};

export const MC_STYLES: Record<string, string> = {
  'l': 'font-weight: bold;',
  'm': 'text-decoration: line-through;',
  'n': 'text-decoration: underline;',
  'o': 'font-style: italic;',
  // 'k': obfuscated - usually ignored or random chars
};

export function parseMinecraftColors(text: string, defaultCode: string = 'f'): { text: string, style: React.CSSProperties }[] {
  if (!text) return [];

  const parts = text.split(/(&[0-9a-fk-or])/g);
  const result: { text: string, style: React.CSSProperties }[] = [];
  
  let currentColor = MC_COLORS[defaultCode] || MC_COLORS['f'];
  let currentStyles: React.CSSProperties = {};

  // If text doesn't start with color code, assume gray/white? 
  // TrMenu/Minecraft usually defaults to white for names, purple for lore (if standard item), 
  // but for raw strings, usually white.

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith('&') && part.length === 2) {
      const code = part[1].toLowerCase();
      if (MC_COLORS[code]) {
        currentColor = MC_COLORS[code];
        // Reset styles on color change? In MC, yes, color resets formatting usually?
        // Actually in modern MC, color resets formatting.
        currentStyles = {}; 
      } else if (MC_STYLES[code]) {
         // Add style
         if (code === 'l') currentStyles.fontWeight = 'bold';
         if (code === 'm') currentStyles.textDecoration = (currentStyles.textDecoration || '') + ' line-through';
         if (code === 'n') currentStyles.textDecoration = (currentStyles.textDecoration || '') + ' underline';
         if (code === 'o') currentStyles.fontStyle = 'italic';
      } else if (code === 'r') {
         currentColor = MC_COLORS['f']; // Reset to white usually
         currentStyles = {};
      }
    } else {
       // It's text
       result.push({
           text: part,
           style: { color: currentColor, ...currentStyles, textShadow: '1px 1px 0px #3f3f3f' } // MC text shadow
       });
    }
  }

  return result;
}

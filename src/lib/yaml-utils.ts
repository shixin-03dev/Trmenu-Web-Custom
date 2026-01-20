import yaml from 'js-yaml';

export const dumpYaml = (value: any) => {
    const dumped = yaml.dump(value, { indent: 2, lineWidth: -1, noRefs: true, sortKeys: false });
    const lines = dumped.split('\n');
    let inIcons = false;
    let iconsIndent = -1;
    let inLayout = false;
    let layoutIndent = -1;

    return lines.map(line => {
        const match = line.match(/^(\s*)(.*)/);
        if (!match) return line;
        
        const indent = match[1].length;
        const content = match[2];

        // --- Layout Section Handling ---
        if (content.startsWith('Layout:')) {
            inLayout = true;
            layoutIndent = indent;
            return line;
        }

        if (inLayout) {
            if (content.trim() !== '' && indent <= layoutIndent) {
                inLayout = false;
            } else if (content.startsWith('- ')) {
                 // It's a list item in Layout
                 const itemContent = content.substring(2);
                 const isQuoted = (itemContent.startsWith("'") && itemContent.endsWith("'")) || 
                                  (itemContent.startsWith('"') && itemContent.endsWith('"'));
                 
                 if (!isQuoted) {
                     return `${match[1]}- '${itemContent}'`;
                 }
            }
        }

        // --- Icons Section Handling ---
        if (content.startsWith('Icons:')) {
            inIcons = true;
            iconsIndent = indent;
            return line;
        }

        if (inIcons) {
            // Check if we exited Icons block
            // If indent is same or less than Icons, we exited
            if (content.trim() !== '' && indent <= iconsIndent) {
                inIcons = false;
            } else if (indent === iconsIndent + 2) {
                // Direct child of Icons
                const keyMatch = content.match(/^([^:]+):(.*)/);
                if (keyMatch) {
                    const key = keyMatch[1].trim();
                    const rest = keyMatch[2];
                    
                    // Quote if length > 1 and not already quoted
                    // (User requested multi-char IDs to be quoted, e.g. 'aaasss')
                    if (key.length > 1 && !key.startsWith("'") && !key.startsWith('"') && !key.startsWith('`')) {
                         return `${match[1]}'${key}':${rest}`;
                    }
                }
            }
        }
        return line;
    }).join('\n');
};

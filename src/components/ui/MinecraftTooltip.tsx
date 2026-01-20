import { createPortal } from 'react-dom';
import { parseMinecraftColors } from '@/lib/color-utils';

interface MinecraftTooltipProps {
  name?: string;
  lore?: string[];
  x: number;
  y: number;
  visible: boolean;
}

export const MinecraftTooltip = ({ name, lore, x, y, visible }: MinecraftTooltipProps) => {
  if (!visible) return null;

  const renderText = (text: string) => {
      const parts = parseMinecraftColors(text);
      return (
          <span>
              {parts.map((p, i) => (
                  <span key={i} style={p.style}>{p.text}</span>
              ))}
          </span>
      );
  };

  return createPortal(
    <div 
        className="fixed z-[9999] pointer-events-none flex flex-col gap-1 min-w-[120px] max-w-[300px]"
        style={{ 
            left: x + 15, 
            top: y + 15,
            backgroundColor: 'rgba(16, 0, 16, 0.95)', // Dark purple/black background
            border: '2px solid #2a002a', // Darker border
            padding: '4px 6px',
            borderRadius: '4px',
            boxShadow: '0 0 10px rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.1), inset -2px -2px 0 rgba(0,0,0,0.5)',
            fontFamily: 'Minecraft, monospace', // Assuming a pixel font or fallback
            fontSize: '14px',
            lineHeight: '1.2'
        }}
    >
        {/* Border gradient effect simulation if needed, but simple border is fine for now */}
        <div 
            className="absolute inset-0 pointer-events-none rounded-[2px]" 
            style={{ 
                border: '2px solid #5000ff', // Inner purple border typical of MC
                opacity: 0.3,
                margin: '1px'
            }} 
        />
        
        {name && (
            <div className="font-bold relative z-10 mb-1">
                {renderText(name)}
            </div>
        )}
        
        {lore && lore.length > 0 && (
            <div className="flex flex-col relative z-10">
                {lore.map((line, i) => (
                    <div key={i}>{renderText(line)}</div>
                ))}
            </div>
        )}
    </div>,
    document.body
  );
};

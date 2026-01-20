import { useState, useEffect } from 'react';
import { parseMaterial } from '@/lib/material-utils';
import { Box } from 'lucide-react';
import { getMaterialByCode } from '@/api/material';
import { API_BASE_URL } from '@/config/api';

interface ItemRendererProps {
  material: string;
  className?: string;
  shiny?: boolean;
}

// Global cache to avoid redundant API calls
const materialCache: Record<string, string | null> = {};
const pendingRequests: Record<string, Promise<string | null>> = {};

export const ItemRenderer = ({ material, className, shiny }: ItemRendererProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const parsed = parseMaterial(material);

  useEffect(() => {
    setHasError(false);
    setImgSrc(null);

    if (parsed.type === 'head') {
      // Handle base64 or player name
      if (parsed.value.length > 20 && !parsed.value.includes(' ')) {
         if (parsed.value.length < 17) { // Valid usernames are max 16 chars
             setImgSrc(`https://minotar.net/avatar/${parsed.value}`);
         } else {
             if (parsed.value.length === 64) {
                 setImgSrc(`https://mc-heads.net/head/${parsed.value}`);
             } else {
                 try {
                     const decoded = atob(parsed.value);
                     if (decoded.includes('"url":')) {
                         const urlMatch = decoded.match(/"url":"([^"]+)"/);
                         if (urlMatch) {
                             setImgSrc(urlMatch[1]);
                             return;
                         }
                     }
                 } catch (e) {
                     // ignore
                 }
                 setImgSrc('https://minotar.net/avatar/Steve');
             }
         }
      } else {
         setImgSrc(`https://minotar.net/avatar/${parsed.value}`);
      }
    } else if (parsed.type === 'url') {
      // Direct URL
      setImgSrc(parsed.value);
    } else if (parsed.type === 'source' || parsed.type === 'repo') {
        const code = parsed.value;
        
        // Check cache first
        if (materialCache[code] !== undefined) {
            if (materialCache[code]) {
                setImgSrc(materialCache[code]);
            } else {
                setHasError(true);
            }
            return;
        }

        // Check if request is pending
        if (!pendingRequests[code]) {
            pendingRequests[code] = getMaterialByCode(code)
                .then(res => {
                    // @ts-ignore
                    if (res.code === 200 && res.data && res.data.fileUrl) {
                        // @ts-ignore
                        const url = res.data.fileUrl.startsWith('http') 
                            // @ts-ignore
                            ? res.data.fileUrl 
                            // @ts-ignore
                            : `${API_BASE_URL}${res.data.fileUrl}`;
                        materialCache[code] = url;
                        return url;
                    }
                    materialCache[code] = null;
                    return null;
                })
                .catch(err => {
                    console.error("Failed to fetch material image", err);
                    materialCache[code] = null;
                    return null;
                });
        }

        pendingRequests[code].then(url => {
            if (url) {
                setImgSrc(url);
            } else {
                setHasError(true);
            }
        });

    } else if (parsed.type === 'standard') {
      // Convert "Red Stained Glass Pane" to "red_stained_glass_pane"
      const snakeName = parsed.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
      
      const itemUrl = `https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.1/items/${snakeName}.png`;
      setImgSrc(itemUrl);
    }
  }, [material, parsed.type, parsed.value]);

  const handleImgError = () => {
      if (!imgSrc) return;

      const snakeName = parsed.value.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '');
      
      // Define fallback chains
      // 1. PrismarineJS Items (1.21.1) -> Initial
      // 2. PrismarineJS Blocks (1.21.1)
      // 3. MCAssets Items (1.21.1)
      // 4. MCAssets Blocks (1.21.1)
      
      if (imgSrc.includes('PrismarineJS') && imgSrc.includes('/items/')) {
          // Fallback to PrismarineJS blocks
          setImgSrc(`https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.21.1/blocks/${snakeName}.png`);
      } else if (imgSrc.includes('PrismarineJS') && imgSrc.includes('/blocks/')) {
          // Fallback to MCAssets items
          setImgSrc(`https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/item/${snakeName}.png`);
      } else if (imgSrc.includes('mcasset.cloud') && imgSrc.includes('/item/')) {
          // Fallback to MCAssets blocks
          setImgSrc(`https://assets.mcasset.cloud/1.21.1/assets/minecraft/textures/block/${snakeName}.png`);
      } else {
          setHasError(true);
      }
  };

  if (hasError || !imgSrc) {
     // Fallback icon
     return (
        <div className={`flex items-center justify-center bg-secondary/50 rounded-sm ${className} ${shiny ? 'ring-2 ring-yellow-400/50' : ''}`} title={material}>
           {parsed.type === 'head' ? <div className="w-full h-full bg-neutral-400 rounded-sm" /> : <Box className="w-1/2 h-1/2 opacity-50" />}
        </div>
     );
  }

  return (
    <div className={`relative ${className} ${shiny ? 'after:absolute after:inset-0 after:ring-2 after:ring-yellow-400/50 after:rounded-sm' : ''}`}>
       <img 
         src={imgSrc} 
         alt={material} 
         className="w-full h-full object-contain image-pixelated"
         onError={handleImgError}
       />
    </div>
  );
};

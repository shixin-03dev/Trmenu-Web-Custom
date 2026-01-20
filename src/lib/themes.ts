export interface Theme {
  id: string;
  name: string;
  color: string;
  type: 'light' | 'dark';
}

export const themes: Theme[] = [
  // Light Themes
  { id: 'light', name: '亮色 (Light)', color: 'bg-white border-gray-200', type: 'light' },
  { id: 'dopamine', name: '多巴胺 (Dopamine)', color: 'bg-pink-100 border-pink-300', type: 'light' },
  { id: 'forest', name: '森林 (Forest)', color: 'bg-green-50 border-green-800', type: 'light' },
  { id: 'ocean', name: '海洋 (Ocean)', color: 'bg-blue-50 border-blue-500', type: 'light' },
  { id: 'sunset', name: '日落 (Sunset)', color: 'bg-orange-50 border-orange-500', type: 'light' },
  { id: 'lavender', name: '薰衣草 (Lavender)', color: 'bg-purple-50 border-purple-400', type: 'light' },
  { id: 'mint', name: '薄荷 (Mint)', color: 'bg-emerald-50 border-emerald-400', type: 'light' },
  { id: 'clouds', name: '云端 (Clouds)', color: 'bg-sky-50 border-sky-200', type: 'light' },
  { id: 'lemon', name: '柠檬 (Lemon)', color: 'bg-yellow-50 border-yellow-400', type: 'light' },
  { id: 'rose', name: '玫瑰 (Rose)', color: 'bg-rose-50 border-rose-400', type: 'light' },

  // Dark Themes
  { id: 'dark', name: '暗色 (Dark)', color: 'bg-slate-950 border-slate-800', type: 'dark' },
  { id: 'cyberpunk', name: '赛博 (Cyberpunk)', color: 'bg-black border-pink-500', type: 'dark' },
  { id: 'coffee', name: '咖啡 (Coffee)', color: 'bg-amber-900 border-amber-700', type: 'dark' },
  { id: 'dracula', name: '吸血鬼 (Dracula)', color: 'bg-slate-900 border-purple-600', type: 'dark' },
  { id: 'midnight', name: '午夜 (Midnight)', color: 'bg-blue-950 border-blue-800', type: 'dark' },
  { id: 'abyss', name: '深渊 (Abyss)', color: 'bg-neutral-950 border-neutral-800', type: 'dark' },
  { id: 'neon', name: '霓虹 (Neon)', color: 'bg-black border-green-500', type: 'dark' },
  { id: 'vampire', name: '血族 (Vampire)', color: 'bg-red-950 border-red-800', type: 'dark' },
  { id: 'deep-space', name: '深空 (Deep Space)', color: 'bg-indigo-950 border-indigo-800', type: 'dark' },
  { id: 'gold', name: '黑金 (Gold)', color: 'bg-neutral-900 border-yellow-600', type: 'dark' },
];

export const applyTheme = (themeId: string) => {
  const root = document.documentElement;
  // Remove all known theme classes
  themes.forEach(t => root.classList.remove(t.id));
  
  // Add the new theme class
  root.classList.add(themeId);
};

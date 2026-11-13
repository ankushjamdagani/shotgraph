import React, { useEffect } from 'react';
import { Palette } from 'lucide-react';

export type StudioTheme = 'studio-dark' | 'film-lab-mono' | 'midnight-navy';
export type StudioLayout = 'canvas-spatial' | 'balanced-nle' | 'canvas-focus' | 'script-focus';

interface ThemeCustomizerProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  currentLayout?: StudioLayout;
  onLayoutChange?: (layout: StudioLayout) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  currentTheme,
  onThemeChange,
}) => {
  // Apply theme class to documentElement whenever it changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-studio-dark', 'theme-film-lab-mono', 'theme-midnight-navy');
    root.classList.add(`theme-${currentTheme}`);
    try {
      localStorage.setItem('studio_theme', currentTheme);
    } catch {
      // ignore
    }
  }, [currentTheme]);

  return (
    <div className="flex items-center gap-1.5 bg-[#18181B] px-2 py-1 rounded-xl border border-[#27272A] text-xs">
      <Palette className="w-3.5 h-3.5 text-[#A1A1AA]" />
      <select
        value={currentTheme}
        onChange={(e) => onThemeChange(e.target.value as StudioTheme)}
        className="bg-transparent text-[11px] font-mono font-medium text-[#FAFAFA] focus:outline-none cursor-pointer"
      >
        <option value="studio-dark" className="bg-[#121215] text-white">Obsidian Dark</option>
        <option value="film-lab-mono" className="bg-[#0A0A0A] text-white">Film Lab Mono</option>
        <option value="midnight-navy" className="bg-[#0F172A] text-white">Midnight Navy</option>
      </select>
    </div>
  );
};

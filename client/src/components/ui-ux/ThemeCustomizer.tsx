import React from 'react';
import { Palette, LayoutTemplate } from 'lucide-react';

export type StudioTheme = 'studio-dark' | 'midnight-navy' | 'film-lab' | 'cyberpunk';
export type StudioLayout = 'balanced-nle' | 'canvas-focus' | 'script-focus';

interface ThemeCustomizerProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  currentLayout: StudioLayout;
  onLayoutChange: (layout: StudioLayout) => void;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  currentTheme,
  onThemeChange,
  currentLayout,
  onLayoutChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Theme Picker */}
      <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded-lg border border-slate-800 text-xs">
        <Palette className="w-3.5 h-3.5 text-slate-400 ml-1" />
        <select
          value={currentTheme}
          onChange={(e) => onThemeChange(e.target.value as StudioTheme)}
          className="bg-transparent text-[11px] font-medium text-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="studio-dark" className="bg-[#0A0D14]">Studio Dark</option>
          <option value="midnight-navy" className="bg-[#0A0D14]">Midnight Navy</option>
          <option value="film-lab" className="bg-[#0A0D14]">Film Lab Mono</option>
          <option value="cyberpunk" className="bg-[#0A0D14]">Cyberpunk Neon</option>
        </select>
      </div>

      {/* Layout Mode Picker */}
      <div className="flex items-center gap-1 bg-[#0A0D14] p-1 rounded-lg border border-slate-800 text-xs">
        <LayoutTemplate className="w-3.5 h-3.5 text-slate-400 ml-1" />
        <select
          value={currentLayout}
          onChange={(e) => onLayoutChange(e.target.value as StudioLayout)}
          className="bg-transparent text-[11px] font-medium text-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="balanced-nle" className="bg-[#0A0D14]">Director NLE</option>
          <option value="canvas-focus" className="bg-[#0A0D14]">Canvas Focus</option>
          <option value="script-focus" className="bg-[#0A0D14]">Script Focus</option>
        </select>
      </div>
    </div>
  );
};

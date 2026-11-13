import React, { useEffect } from 'react';
import { Palette } from 'lucide-react';

export type StudioTheme = 'studio-dark' | 'film-lab-mono' | 'midnight-navy';

interface ThemeCustomizerProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
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
    <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded-xl border border-subtle text-xs shadow-sm">
      <Palette className="w-3.5 h-3.5 text-text-muted" />
      <select
        value={currentTheme}
        onChange={(e) => onThemeChange(e.target.value as StudioTheme)}
        className="bg-transparent text-[11px] font-mono font-medium text-text-primary focus:outline-none cursor-pointer"
      >
        <option value="studio-dark" className="bg-surface text-text-primary">Obsidian Dark</option>
        <option value="film-lab-mono" className="bg-surface text-text-primary">Film Lab Mono</option>
        <option value="midnight-navy" className="bg-surface text-text-primary">Midnight Navy</option>
      </select>
    </div>
  );
};

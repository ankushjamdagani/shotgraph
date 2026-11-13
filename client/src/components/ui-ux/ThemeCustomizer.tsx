import React, { useEffect } from 'react';
import { Palette } from 'lucide-react';

export type StudioTheme =
  | 'studio-dark'
  | 'film-lab-mono'
  | 'midnight-navy'
  | 'cinema-tungsten'
  | 'paper-ink'
  | 'studio-daylight'
  | 'nordic-light';

export const THEME_METADATA: Record<
  StudioTheme,
  { name: string; mode: 'dark' | 'light'; description: string; previewBg: string; accent: string }
> = {
  'studio-dark': {
    name: 'Studio Obsidian',
    mode: 'dark',
    description: 'Deep neutral black and zinc with high-contrast borders',
    previewBg: '#09090B',
    accent: '#FAFAFA',
  },
  'film-lab-mono': {
    name: 'Film Lab Mono',
    mode: 'dark',
    description: 'High-density pure black OLED with sharp typography',
    previewBg: '#000000',
    accent: '#FFFFFF',
  },
  'midnight-navy': {
    name: 'Midnight Director',
    mode: 'dark',
    description: 'Deep slate navy with cyan optical accents',
    previewBg: '#050811',
    accent: '#38BDF8',
  },
  'cinema-tungsten': {
    name: 'Cinema Tungsten',
    mode: 'dark',
    description: 'Warm dark charcoal with rich amber highlights',
    previewBg: '#12100E',
    accent: '#F59E0B',
  },
  'paper-ink': {
    name: 'Paper & Ink (Light)',
    mode: 'light',
    description: 'Warm editorial ivory/cream with crisp dark ink typography',
    previewBg: '#F5F3EF',
    accent: '#1C1917',
  },
  'studio-daylight': {
    name: 'Studio Daylight (Light)',
    mode: 'light',
    description: 'Clean modern architectural light gray with vivid sky blue accents',
    previewBg: '#F1F5F9',
    accent: '#0284C7',
  },
  'nordic-light': {
    name: 'Nordic Light (Light)',
    mode: 'light',
    description: 'Cool minimalist white with subtle slate borders',
    previewBg: '#F8FAFC',
    accent: '#2563EB',
  },
};

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
    root.classList.remove(
      'theme-studio-dark',
      'theme-film-lab-mono',
      'theme-midnight-navy',
      'theme-cinema-tungsten',
      'theme-paper-ink',
      'theme-studio-daylight',
      'theme-nordic-light'
    );
    root.classList.add(`theme-${currentTheme}`);
    try {
      localStorage.setItem('studio_theme', currentTheme);
    } catch {
      // ignore
    }
  }, [currentTheme]);

  return (
    <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded border border-subtle text-xs shadow-sm">
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

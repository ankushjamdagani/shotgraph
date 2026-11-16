import React, { useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle.js';

export type StudioTheme = 'film-lab-mono' | 'paper-ink';

export const THEME_METADATA: Record<
  StudioTheme,
  { name: string; mode: 'dark' | 'light'; description: string; previewBg: string; accent: string }
> = {
  'film-lab-mono': {
    name: 'Film Lab Mono',
    mode: 'dark',
    description: 'High-density pure black OLED with sharp typography',
    previewBg: '#000000',
    accent: '#FFFFFF',
  },
  'paper-ink': {
    name: 'Paper & Ink',
    mode: 'light',
    description: 'Warm editorial ivory/cream with crisp dark ink typography',
    previewBg: '#F5F3EF',
    accent: '#1C1917',
  },
};

export { ThemeToggle };

interface ThemeCustomizerProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  className?: string;
}

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  currentTheme,
  onThemeChange,
  className = '',
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
    <ThemeToggle
      currentTheme={currentTheme}
      onThemeChange={onThemeChange}
      className={className}
    />
  );
};

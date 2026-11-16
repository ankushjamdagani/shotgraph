import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { StudioTheme } from './ThemeCustomizer.js';

interface ThemeToggleProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  currentTheme,
  onThemeChange,
  className = '',
}) => {
  const isLight = currentTheme === 'paper-ink';

  const handleToggle = () => {
    onThemeChange(isLight ? 'film-lab-mono' : 'paper-ink');
  };

  const title = isLight
    ? 'Switch to dark theme (Film Lab)'
    : 'Switch to light theme (Paper)';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center justify-center rounded bg-card border border-subtle text-text-muted hover:text-text-primary hover:bg-subtle transition active:scale-[0.98] shadow-xs ${
        className || 'w-7 h-7'
      }`}
      title={title}
      aria-label={title}
      data-testid="theme-toggle"
    >
      {isLight ? (
        <Moon className="w-3.5 h-3.5 text-text-primary transition-transform duration-200" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-text-primary transition-transform duration-200" />
      )}
    </button>
  );
};

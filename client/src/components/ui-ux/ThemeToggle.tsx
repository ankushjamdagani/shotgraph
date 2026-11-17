import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Toggle } from 'radix-ui';
import { IconButton } from '../ui';
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
    <Toggle.Root asChild pressed={isLight} onPressedChange={handleToggle}>
      <IconButton
        label={title}
        variant="secondary"
        borderTone="subtle"
        className={className}
        data-testid="theme-toggle"
      >
        {isLight ? <Moon /> : <Sun />}
      </IconButton>
    </Toggle.Root>
  );
};

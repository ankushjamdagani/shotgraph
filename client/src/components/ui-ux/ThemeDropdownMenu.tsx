import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, ChevronDown, Moon, Sun } from 'lucide-react';
import { StudioTheme, THEME_METADATA } from './ThemeCustomizer.js';

interface ThemeDropdownMenuProps {
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
  className?: string;
}

export const ThemeDropdownMenu: React.FC<ThemeDropdownMenuProps> = ({
  currentTheme,
  onThemeChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeMeta = THEME_METADATA[currentTheme] || THEME_METADATA['studio-dark'];

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const darkThemes = (Object.entries(THEME_METADATA) as [StudioTheme, (typeof THEME_METADATA)[StudioTheme]][]).filter(
    ([, meta]) => meta.mode === 'dark'
  );

  const lightThemes = (Object.entries(THEME_METADATA) as [StudioTheme, (typeof THEME_METADATA)[StudioTheme]][]).filter(
    ([, meta]) => meta.mode === 'light'
  );

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-card hover:bg-subtle border border-subtle text-text-primary text-xs font-medium shadow-sm transition group"
        title="Change Studio Theme"
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-3.5 h-3.5 rounded-full border border-subtle flex items-center justify-center shadow-inner"
            style={{ backgroundColor: activeMeta.previewBg }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeMeta.accent }} />
          </div>
          <span className="truncate max-w-[120px] font-semibold">{activeMeta.name}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-surface/95 backdrop-blur-xl border border-subtle rounded-lg shadow-2xl p-2 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-subtle">
          <div className="px-2.5 py-1 flex items-center justify-between border-b border-subtle text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider">
            <span>Visual Theme System</span>
            <Palette className="w-3 h-3 text-accent-primary" />
          </div>

          {/* 1. DARK THEMES */}
          <div className="space-y-0.5">
            <div className="px-2 py-0.5 text-[9px] font-mono text-text-muted uppercase font-bold flex items-center gap-1">
              <Moon className="w-2.5 h-2.5 text-sky-400" />
              <span>Dark Themes</span>
            </div>
            {darkThemes.map(([themeKey, meta]) => {
              const isSelected = currentTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => {
                    onThemeChange(themeKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded text-left transition ${
                    isSelected ? 'bg-card border border-accent-primary/40 shadow-sm' : 'hover:bg-card/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full border border-subtle flex items-center justify-center shrink-0 shadow-inner"
                      style={{ backgroundColor: meta.previewBg }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-primary">{meta.name}</div>
                      <div className="text-[10px] text-text-muted font-sans line-clamp-1">{meta.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="w-full h-[1px] bg-subtle my-1" />

          {/* 2. LIGHT THEMES */}
          <div className="space-y-0.5">
            <div className="px-2 py-0.5 text-[9px] font-mono text-text-muted uppercase font-bold flex items-center gap-1">
              <Sun className="w-2.5 h-2.5 text-amber-400" />
              <span>Light Themes</span>
            </div>
            {lightThemes.map(([themeKey, meta]) => {
              const isSelected = currentTheme === themeKey;
              return (
                <button
                  key={themeKey}
                  onClick={() => {
                    onThemeChange(themeKey);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded text-left transition ${
                    isSelected ? 'bg-card border border-accent-primary/40 shadow-sm' : 'hover:bg-card/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full border border-subtle flex items-center justify-center shrink-0 shadow-inner"
                      style={{ backgroundColor: meta.previewBg }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text-primary">{meta.name}</div>
                      <div className="text-[10px] text-text-muted font-sans line-clamp-1">{meta.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

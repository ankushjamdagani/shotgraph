import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { Film, Sliders, GitBranch, Cpu, ShieldAlert, Sparkles } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTasteMixer: () => void;
  onOpenDaVinciExport: () => void;
  onBranchSelected: () => void;
  onSelectModel: (engine: any) => void;
  onToggleSafeAreas: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenTasteMixer,
  onOpenDaVinciExport,
  onBranchSelected,
  onSelectModel,
  onToggleSafeAreas,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(); // toggle logic handled in parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-subtle shadow-2xl overflow-hidden animate-scale-up text-text-primary">
        <Command label="Global Command Menu" className="w-full">
          <div className="flex items-center px-4 border-b border-subtle bg-surface">
            <Sparkles className="w-4 h-4 text-accent-primary mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search action (Cmd+K)..."
              className="w-full py-3 bg-transparent text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none"
            />
          </div>

          <Command.List className="p-2 max-h-72 overflow-y-auto space-y-1 text-xs bg-surface">
            <Command.Empty className="py-6 text-center text-text-muted text-xs">
              No matching actions found.
            </Command.Empty>

            <Command.Group heading="Studio Actions" className="text-[10px] font-bold text-text-muted px-2 py-1 font-mono uppercase">
              <Command.Item
                onSelect={() => {
                  onBranchSelected();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <GitBranch className="w-4 h-4 text-accent-primary" />
                <span>Branch Current Node</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onOpenTasteMixer();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Open Taste & Style Mixer (`STYLE.md`)</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onOpenDaVinciExport();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <Film className="w-4 h-4 text-accent-primary" />
                <span>Export DaVinci Resolve Multi-Track Bundle</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onToggleSafeAreas();
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Toggle 9:16 Safe Area Overlay</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Switch Default AI Model" className="text-[10px] font-bold text-text-muted px-2 py-1 pt-2 font-mono uppercase">
              <Command.Item
                onSelect={() => {
                  onSelectModel('antigravity-cli');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <Cpu className="w-4 h-4 text-accent-primary" />
                <span>Switch to Antigravity CLI</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectModel('claude-cli');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>Switch to Claude Code CLI</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  onSelectModel('ollama');
                  onClose();
                }}
                className="flex items-center gap-2 p-2 rounded-lg text-text-primary hover:bg-card hover:text-accent-primary cursor-pointer transition"
              >
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Switch to Local Ollama</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};

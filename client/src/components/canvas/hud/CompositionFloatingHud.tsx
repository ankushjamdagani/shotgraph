import React from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Film, Wand2, Pin, X } from 'lucide-react';

interface CompositionFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject?: (updated: FilmProject) => void;
  onClose: () => void;
  onOpenDaVinciExport?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const CompositionFloatingHud: React.FC<CompositionFloatingHudProps> = ({
  project,
  onClose,
  onOpenDaVinciExport,
  isPinned,
  onTogglePin,
}) => {
  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  return (
    <div className="w-88 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3.5 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-accent-primary">Composition & Timeline HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-accent-primary border border-subtle font-mono font-bold">
            NLE
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded text-xs transition ${isPinned ? 'text-amber-400 bg-card' : 'text-text-muted hover:text-text-primary'}`}
              title={isPinned ? 'Unpin HUD' : 'Pin HUD Open'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-Track Channel Strips */}
      <div className="space-y-1.5 text-[10px] font-mono">
        <div className="text-[10px] font-mono uppercase text-text-muted">Active Multi-Track Stack</div>

        {/* Track V2 Overlay */}
        <div className="p-2 rounded-xl bg-card border border-subtle flex items-center justify-between text-text-primary">
          <div className="flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-accent-primary" />
            <span className="font-bold">Track V2: Alpha Overlays</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle font-mono text-text-muted">ProRes 4444</span>
        </div>

        {/* Track V1 Footage */}
        <div className="p-2 rounded-xl bg-card border border-subtle flex items-center justify-between text-text-primary">
          <div className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-accent-primary" />
            <span className="font-bold">Track V1: Video Footage Cuts</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle font-mono text-text-muted">{project.fps} FPS</span>
        </div>

        {/* Track A1 Dialogue */}
        <div className="p-2 rounded-xl bg-card border border-subtle flex items-center justify-between text-text-primary">
          <span>Track A1: Dialogue & Kokoro Voiceover</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle font-mono text-text-muted">-15 LUFS</span>
        </div>

        {/* Track A2 Audio / SFX */}
        <div className="p-2 rounded-xl bg-card border border-subtle flex items-center justify-between text-text-primary">
          <span>Track A2: Procedural Foley & Ambience (Earshot)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle font-mono text-text-muted">Duck 12dB</span>
        </div>
      </div>

      {/* Assembly Stats */}
      <div className="p-2.5 rounded-xl bg-card border border-subtle text-[10px] font-mono grid grid-cols-2 gap-1.5 text-text-muted">
        <div>Target: <span className="text-text-primary">{totalDuration}s Total</span></div>
        <div>Aspect: <span className="text-text-primary">{project.aspectRatio}</span></div>
        <div>Scenes: <span className="text-text-primary">{project.scenes.length} Scenes</span></div>
        <div>Audio: <span className="text-text-primary">48kHz 24-bit</span></div>
      </div>

      {/* Export DaVinci Resolve Button */}
      <button
        onClick={onOpenDaVinciExport}
        className="w-full py-2.5 px-3 rounded-xl bg-accent-primary hover:opacity-90 text-app font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono"
      >
        <Film className="w-4 h-4 fill-app" />
        <span>Export DaVinci Resolve Bundle 🚀</span>
      </button>
    </div>
  );
};

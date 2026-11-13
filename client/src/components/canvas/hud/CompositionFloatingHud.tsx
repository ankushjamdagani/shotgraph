import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Film, Wand2, Pin, X, Sparkles, Loader2, Scissors, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../../../services/toastService.js';

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
  const [pacingStyle, setPacingStyle] = useState<'frenetic' | 'rhythmic' | 'measured' | 'contemplative'>('rhythmic');
  const [targetBpm, setTargetBpm] = useState(120);
  const [isCooking, setIsCooking] = useState(false);
  const [montageRecipe, setMontageRecipe] = useState<any>(null);
  const [showRecipeDetails, setShowRecipeDetails] = useState(false);

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0);

  const handleGenerateCookRecipe = async () => {
    setIsCooking(true);
    try {
      const shots = project.scenes.map((s, idx) => ({
        id: s.id,
        durationSec: s.targetDurationSec || 5,
        motionIntensity: idx % 2 === 0 ? 'high' : 'medium',
        focalLength: '35mm',
      }));

      const res = await fetch('http://localhost:3030/api/skills/cook/montage-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shots: shots.length > 0 ? shots : [{ id: 'shot_1', durationSec: 5 }],
          targetBpm,
          pacingStyle,
        }),
      });
      const data = await res.json();
      if (data.success && data.montageRecipe) {
        setMontageRecipe(data.montageRecipe);
        setShowRecipeDetails(true);
        toast.success(`Cook generated ${data.montageRecipe.cutInstructions?.length || 0} rhythm-matched cuts!`);
      } else {
        toast.error('Failed to cook montage recipe');
      }
    } catch (err: any) {
      console.error('Cook error:', err);
      toast.error('Cook loop service unreachable');
    } finally {
      setIsCooking(false);
    }
  };

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

      {/* Cook Montage Loop & Rhythm Pacing (Leonxlnx/cook + argo) */}
      <div className="p-2.5 rounded-xl bg-card border border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-accent-primary" />
            <span className="text-[10px] font-bold font-mono text-text-primary uppercase tracking-wide">
              Cook Montage Loop
            </span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-surface text-accent-primary font-mono border border-subtle">
              Leonxlnx/cook
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerateCookRecipe}
            disabled={isCooking}
            className="px-2 py-0.5 rounded-md bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[10px] font-mono font-bold flex items-center gap-1 transition"
          >
            {isCooking ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{isCooking ? 'Cooking...' : 'Cook Cuts'}</span>
          </button>
        </div>

        {/* Pacing Controls */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div>
            <label className="block text-[9px] uppercase text-text-muted mb-0.5">Pacing</label>
            <select
              value={pacingStyle}
              onChange={(e: any) => setPacingStyle(e.target.value)}
              className="w-full p-1 rounded-lg bg-surface border border-subtle text-text-primary font-mono text-[10px] focus:outline-none focus:border-accent-primary"
            >
              <option value="rhythmic">Rhythmic (Default)</option>
              <option value="frenetic">Frenetic (Fast cuts)</option>
              <option value="measured">Measured (Editorial)</option>
              <option value="contemplative">Contemplative (Slow)</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase text-text-muted mb-0.5">Tempo ({targetBpm} BPM)</label>
            <input
              type="range"
              min="60"
              max="160"
              step="5"
              value={targetBpm}
              onChange={(e) => setTargetBpm(Number(e.target.value))}
              className="w-full accent-accent-primary cursor-pointer h-1.5 bg-subtle rounded-lg mt-1.5"
            />
          </div>
        </div>

        {montageRecipe ? (
          <div className="space-y-1.5 text-[9px] font-mono pt-1 border-t border-subtle">
            <div className="p-1.5 rounded-lg bg-surface/80 border border-subtle text-text-muted">
              <span className="text-text-primary font-bold">Flow:</span> {montageRecipe.flowAnalysis}
            </div>

            <button
              type="button"
              onClick={() => setShowRecipeDetails(!showRecipeDetails)}
              className="w-full flex items-center justify-between text-text-muted hover:text-text-primary pt-0.5"
            >
              <span>{montageRecipe.cutInstructions?.length || 0} Cut Instructions ({montageRecipe.beatIntervalMs}ms bar)</span>
              {showRecipeDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showRecipeDetails && montageRecipe.cutInstructions && (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {montageRecipe.cutInstructions.map((c: any, i: number) => (
                  <div key={i} className="p-1 rounded bg-surface/50 border border-subtle/50 flex items-center justify-between">
                    <span className="text-accent-primary font-bold">{c.cutInTimecode}</span>
                    <span className="text-text-primary truncate mx-1">{c.transitionType} ({c.cutDurationSec}s)</span>
                    <span className="text-[8px] text-text-muted shrink-0">{c.eyelineVector}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[9px] font-mono text-text-muted/70 italic">
            Autonomous Cook loop evaluates rhythm bars and eyeline continuity.
          </div>
        )}
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

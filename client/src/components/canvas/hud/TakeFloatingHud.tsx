import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Play, Pause, Star, Pin, X, Upload } from 'lucide-react';

interface TakeFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const TakeFloatingHud: React.FC<TakeFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const isActiveCut = node.sceneId ? project.activeCut[node.sceneId] === node.id : false;

  const handleMakeActiveCut = async () => {
    if (!node.sceneId) return;
    try {
      const res = await fetch('http://localhost:3030/api/tree/active-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: node.sceneId,
          nodeId: node.id,
          projectId: project.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onUpdateProject({
          ...project,
          activeCut: {
            ...project.activeCut,
            [node.sceneId]: node.id,
          },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-84 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-accent-primary">Video Take Review HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-accent-primary border border-subtle font-mono font-bold">
            TAKE-ONE
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

      {/* Video Preview Monitor */}
      <div className="w-full h-36 rounded-xl bg-card border border-subtle relative overflow-hidden flex flex-col justify-end p-2.5">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition backdrop-blur-sm"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        </div>

        {/* Video Scrubber & Timecode */}
        <div className="relative z-10 space-y-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-text-muted">
            <span>{isPlaying ? 'PLAYING...' : 'PAUSED'}</span>
            <span>00:00:02:18 / 00:00:05:00</span>
          </div>
          <div className="w-full h-1 bg-subtle rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-accent-primary"></div>
          </div>
        </div>
      </div>

      {/* Take Metadata & Status */}
      <div className="p-2 rounded-xl bg-card border border-subtle text-[10px] font-mono grid grid-cols-2 gap-1.5 text-text-muted">
        <div>Engine: <span className="text-text-primary">Runway Gen-3</span></div>
        <div>Duration: <span className="text-text-primary">5.0s</span></div>
        <div>Format: <span className="text-text-primary">4K 24fps</span></div>
        <div>Resolution: <span className="text-text-primary">2160x3840</span></div>
      </div>

      {/* Active Cut Button */}
      <button
        onClick={handleMakeActiveCut}
        className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono ${
          isActiveCut
            ? 'bg-accent-primary text-app border border-accent-primary'
            : 'bg-card hover:bg-subtle/50 text-text-primary border border-subtle'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${isActiveCut ? 'fill-app' : 'text-accent-primary'}`} />
        <span>{isActiveCut ? '⭐ Currently Active Cut (Live Edit)' : 'Star as Active Cut'}</span>
      </button>

      {/* Replacement Dropzone */}
      <div className="p-2.5 rounded-xl border border-dashed border-subtle hover:border-accent-primary bg-card/40 text-center cursor-pointer transition">
        <Upload className="w-3.5 h-3.5 mx-auto mb-1 text-accent-primary" />
        <div className="text-[10px] font-bold text-text-primary">Drop MP4 Video File to Replace</div>
      </div>
    </div>
  );
};

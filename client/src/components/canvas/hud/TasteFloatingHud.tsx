import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Palette, Pin, X, Check, Sliders, Film } from 'lucide-react';

interface TasteFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const TasteFloatingHud: React.FC<TasteFloatingHudProps> = ({
  node: _node,
  project,
  onUpdateProject,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(project.basePresetId || 'editorial_grain');
  const [grainIntensity, setGrainIntensity] = useState(
    project.styleOverrides?.grainIntensity || 45
  );
  const [lightingMood, setLightingMood] = useState(
    project.styleOverrides?.lightingMood || 'Warm Morning Dawn'
  );
  const [isSaved, setIsSaved] = useState(false);

  const presets = [
    {
      id: 'editorial_grain',
      name: 'Editorial Grain',
      palette: ['#F5EFEB', '#C2412D', '#1A1A1A'],
      desc: 'Portra 400 warmth, natural daylight, 35mm optical halation.',
    },
    {
      id: 'liquid_glass',
      name: 'Liquid Glass',
      palette: ['#0A0D14', '#38BDF8', '#F8FAFC'],
      desc: 'Precision Apple-inspired reflections, dark slate, laser blue.',
    },
    {
      id: 'analog_16mm',
      name: 'Analog 16mm',
      palette: ['#E6D5B8', '#B85D19', '#2C1D11'],
      desc: 'Vintage tactile film grain, heavy gate weave, nostalgic amber.',
    },
    {
      id: 'hyper_clean',
      name: 'Hyper-Clean Tech',
      palette: ['#09090B', '#FAFAFA', '#71717A'],
      desc: 'High-density obsidian monochrome, crisp studio key, pure contrast.',
    },
  ];

  const handleSaveTaste = async () => {
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/taste`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePresetId: selectedPreset,
          styleOverrides: {
            ...project.styleOverrides,
            grainIntensity,
            lightingMood,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        onUpdateProject(data.project);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update taste DNA:', err);
    }
  };

  return (
    <div className="w-96 rounded-2xl bg-surface/95 backdrop-blur-xl border border-cyan-500/80 shadow-2xl p-4 text-text-primary space-y-3.5 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <Palette className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold font-mono text-cyan-300">Director Taste & Style DNA HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
            STAGE 2
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
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Visual Signatures */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-2">
          Visual Signature Preset (`STYLE.md`)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`p-2 rounded-xl text-left border transition ${
                  isSelected
                    ? 'bg-card border-cyan-400 ring-1 ring-cyan-400'
                    : 'bg-card/50 border-subtle hover:border-text-muted'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-text-primary">{p.name}</span>
                  <div className="flex items-center gap-1">
                    {p.palette.map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/50"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-text-muted line-clamp-2 leading-tight">
                  {p.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Film Grain & Texture Slider */}
      <div>
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3 text-cyan-400" />
            <span>Film Stock Grain Intensity</span>
          </span>
          <span className="text-text-primary font-bold">{grainIntensity}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={grainIntensity}
          onChange={(e) => setGrainIntensity(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-subtle rounded-lg"
        />
      </div>

      {/* Lighting Mood */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
          Lighting Direction & Atmosphere
        </label>
        <select
          value={lightingMood}
          onChange={(e) => setLightingMood(e.target.value)}
          className="w-full p-2 rounded-xl bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-cyan-400"
        >
          <option value="Warm Morning Dawn">🌅 Warm Morning Dawn (Golden Hour Soft Diffuse)</option>
          <option value="Overcast Nordic Daylight">☁️ Overcast Nordic Daylight (Clean Balanced Key)</option>
          <option value="High-Contrast Noir">🎬 High-Contrast Noir (Hard Shadows & Rim Light)</option>
          <option value="Cyberpunk Neon Noir">🌆 Cyberpunk Neon Noir (Ambient Cyan & Crimson)</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        <div className="text-[10px] font-mono text-text-muted">
          Lock: <span className="text-text-primary font-bold">Cascading to All Shots</span>
        </div>
        <button
          onClick={handleSaveTaste}
          className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-md transition"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Sliders className="w-3.5 h-3.5" />}
          <span>{isSaved ? 'Style Locked ✓' : 'Lock Taste DNA 🔒'}</span>
        </button>
      </div>
    </div>
  );
};

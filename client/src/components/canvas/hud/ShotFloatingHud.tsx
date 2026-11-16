import { apiFetch } from '../../../services/api';
import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Copy, Check, X, Sparkles } from 'lucide-react';

interface ShotFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const ShotFloatingHud: React.FC<ShotFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
}) => {
  const [platform, setPlatform] = useState<'runway' | 'kling' | 'comfyui' | 'luma'>('runway');
  const [copied, setCopied] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>(['video-director', 'take-one', 'rossark-motion']);

  const overrides = node.shotContextOverrides || {};
  const lens = overrides.lensFocalLength || '35mm Anamorphic';
  const aperture = overrides.aperture || 'f/1.8';
  const cameraMove = overrides.cameraMovement || 'Slow Push-In Z-Axis';

  const handleUpdateOverride = async (field: string, val: string) => {
    const updatedOverrides = {
      ...overrides,
      [field]: val,
    };
    try {
      const res = await apiFetch(`/api/projects/${project.id}/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shotContextOverrides: updatedOverrides,
        }),
      });
      const data = await res.json();
      if (data.success && data.node) {
        onUpdateProject({
          ...project,
          nodes: {
            ...project.nodes,
            [node.id]: data.node,
          },
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const srefUrl = project.masterStyleAnchorAssetUrl || 'assets/subjects/anya/three_quarter.png';
  const richSynthesizedPrompt = `Cinematic video: ${node.prompt}, ${lens} lens at ${aperture}, camera: ${cameraMove.toLowerCase()}, warm morning dawn lighting, organic 16mm grain texture, editorial color palette #F5EFEB and #C2412D, motion: 3, duration: 5s, aspect: 9:16, resolution: 4k --sref ${srefUrl} --sw 100`;

  const handleCopyPrompt = async () => {
    let textToCopy = richSynthesizedPrompt;
    try {
      const res = await apiFetch('/api/skills/enrich-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: node.prompt,
          stage: 'shot',
          activeSkillIds: activeSkills,
        }),
      });
      const data = await res.json();
      if (data.success && data.enrichedPrompt) {
        textToCopy = `Cinematic video: ${data.enrichedPrompt}, ${lens} at ${aperture}, ${cameraMove}, motion: 3, duration: 5s, aspect: ${project.aspectRatio || '9:16'} --sref ${srefUrl}`;
      }
    } catch {}

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-88 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-accent-primary">Shot Director & Optics HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-accent-primary border border-subtle font-mono font-bold">
            ATTACHED
          </span>
        </div>
        <div className="flex items-center gap-1">

          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Motion Trajectory (rossark-motion / huashu-motion inspired) */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1.5">
          Camera Motion Trajectory (rossark-motion)
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
          {[
            { id: 'Slow Push-In Z-Axis', label: '➡️ Push-In Z' },
            { id: 'Orbit 360 Parallax', label: '🔄 Orbit 360' },
            { id: 'Truck Left Dolly', label: '⬅️ Truck Left' },
            { id: 'Boom Crane Up', label: '⬆️ Boom Crane' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => handleUpdateOverride('cameraMovement', m.id)}
              className={`p-2 rounded-lg border text-left transition ${
                cameraMove === m.id
                  ? 'bg-card border-accent-primary text-text-primary font-bold ring-1 ring-accent-primary/40'
                  : 'bg-card border-subtle text-text-muted hover:text-text-primary hover:border-text-muted/40'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optics Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">Focal Length</label>
          <select
            value={lens}
            onChange={(e) => handleUpdateOverride('lensFocalLength', e.target.value)}
            className="w-full p-2 rounded-lg bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
          >
            <option value="24mm Wide">24mm (Wide Establishing)</option>
            <option value="35mm Anamorphic">35mm (Cinematic Natural)</option>
            <option value="50mm Portrait">50mm (Portrait Crisp)</option>
            <option value="85mm Macro">85mm (Compressed Detail)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">Aperture</label>
          <select
            value={aperture}
            onChange={(e) => handleUpdateOverride('aperture', e.target.value)}
            className="w-full p-2 rounded-lg bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary"
          >
            <option value="f/1.4">f/1.4 (Dreamy Bokeh)</option>
            <option value="f/1.8">f/1.8 (Soft Defocus)</option>
            <option value="f/2.8">f/2.8 (Sharp Subject)</option>
            <option value="f/4">f/4 (Deep Field)</option>
          </select>
        </div>
      </div>

      {/* Creative Skills Injection (huashu, rossark, take-one, video-director) */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent-primary" /> Creative Suite Skills
          </span>
          <span className="text-[9px] text-accent-primary font-mono">Auto-Injected</span>
        </label>
        <div className="flex flex-wrap gap-1 text-[10px] font-mono">
          {[
            { id: 'video-director', label: '🎬 Video Director' },
            { id: 'take-one', label: '🎯 Take-One Pin' },
            { id: 'rossark-motion', label: '🎥 Rossark Flow' },
            { id: 'huashu-motion', label: '⚡ Huashu Spring' },
          ].map((skill) => {
            const isActive = activeSkills.includes(skill.id);
            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  setActiveSkills((prev) =>
                    isActive ? prev.filter((id) => id !== skill.id) : [...prev, skill.id]
                  );
                }}
                className={`px-2 py-1 rounded-md border text-[10px] transition ${
                  isActive
                    ? 'bg-accent-primary/10 border-accent-primary text-accent-primary font-bold'
                    : 'bg-card border-subtle text-text-muted hover:text-text-primary'
                }`}
              >
                {skill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Platform Tabs */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
          Generation Target Platform
        </label>
        <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-subtle text-[10px] font-mono">
          {(['runway', 'kling', 'comfyui', 'luma'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 py-1 rounded text-center transition ${
                platform === p
                  ? 'bg-accent-primary text-app font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Prompt Copy Button */}
      <button
        onClick={handleCopyPrompt}
        className="w-full py-2 px-3 rounded-xl bg-accent-primary hover:opacity-90 text-app font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copied with --sref Continuity!' : `Copy for ${platform.toUpperCase()}`}</span>
      </button>
    </div>
  );
};

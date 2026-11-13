import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Copy, Check, Pin, X } from 'lucide-react';

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
  isPinned,
  onTogglePin,
}) => {
  const [platform, setPlatform] = useState<'runway' | 'kling' | 'comfyui' | 'luma'>('runway');
  const [copied, setCopied] = useState(false);

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
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}`, {
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

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(richSynthesizedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-88 rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-amber-500/80 shadow-2xl p-4 text-[#FAFAFA] space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-amber-400">Shot Director & Optics HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
            ATTACHED
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded text-xs transition ${isPinned ? 'text-amber-400 bg-[#27272A]' : 'text-[#71717A] hover:text-white'}`}
              title={isPinned ? 'Unpin HUD' : 'Pin HUD Open'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-[#71717A] hover:text-white transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Camera Motion Trajectory (rossark-motion / huashu-motion inspired) */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-[#71717A] mb-1.5">
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
                  ? 'bg-amber-950/60 border-amber-500 text-white font-bold'
                  : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
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
          <label className="block text-[10px] uppercase font-mono text-[#71717A] mb-1">Focal Length</label>
          <select
            value={lens}
            onChange={(e) => handleUpdateOverride('lensFocalLength', e.target.value)}
            className="w-full p-2 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="24mm Wide">24mm (Wide Establishing)</option>
            <option value="35mm Anamorphic">35mm (Cinematic Natural)</option>
            <option value="50mm Portrait">50mm (Portrait Crisp)</option>
            <option value="85mm Macro">85mm (Compressed Detail)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-mono text-[#71717A] mb-1">Aperture</label>
          <select
            value={aperture}
            onChange={(e) => handleUpdateOverride('aperture', e.target.value)}
            className="w-full p-2 rounded-lg bg-[#09090B] border border-[#27272A] text-xs text-white font-mono focus:outline-none focus:border-amber-500"
          >
            <option value="f/1.4">f/1.4 (Dreamy Bokeh)</option>
            <option value="f/1.8">f/1.8 (Soft Defocus)</option>
            <option value="f/2.8">f/2.8 (Sharp Subject)</option>
            <option value="f/4">f/4 (Deep Field)</option>
          </select>
        </div>
      </div>

      {/* Target Platform Tabs */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-[#71717A] mb-1">
          Generation Target Platform
        </label>
        <div className="flex items-center gap-1 bg-[#09090B] p-1 rounded-lg border border-[#27272A] text-[10px] font-mono">
          {(['runway', 'kling', 'comfyui', 'luma'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex-1 py-1 rounded text-center transition ${
                platform === p
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-[#A1A1AA] hover:text-white'
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
        className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition font-mono"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copied with --sref Continuity!' : `Copy for ${platform.toUpperCase()}`}</span>
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Star, Copy, Check, Upload, Pin, X } from 'lucide-react';

interface AssetFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const AssetFloatingHud: React.FC<AssetFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [copied, setCopied] = useState(false);

  const isMasterAnchor = Boolean(
    node.assetMetadata?.isMasterStyleAnchor ||
    (project?.masterStyleAnchorAssetUrl && node.artifacts?.mediaUrl === project.masterStyleAnchorAssetUrl)
  );

  const activeAngle = node.assetMetadata?.turnaroundAngle || 'three_quarter';

  const handleToggleMasterAnchor = async () => {
    const newAnchorStatus = !isMasterAnchor;
    const mediaUrl = node.artifacts?.mediaUrl || `assets/subjects/${node.id}/turnaround.png`;
    const newMasterUrl = newAnchorStatus ? mediaUrl : undefined;

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/assets/master-style-anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetUrl: newMasterUrl }),
      });
      const data = await res.json();
      if (data.success) {
        const updatedNodes = { ...project.nodes };
        for (const [nid, n] of Object.entries(updatedNodes)) {
          if (n.stage === 'assets') {
            updatedNodes[nid] = {
              ...n,
              assetMetadata: {
                ...n.assetMetadata,
                isMasterStyleAnchor: nid === node.id ? newAnchorStatus : false,
                styleReferenceAssetUrl: newMasterUrl,
              },
            };
          }
        }
        onUpdateProject({
          ...project,
          masterStyleAnchorAssetUrl: newMasterUrl,
          nodes: updatedNodes,
        });
      }
    } catch (err) {
      console.error('Failed to update master anchor:', err);
    }
  };

  const handleSelectAngle = async (angle: 'portrait' | 'three_quarter' | 'full_body' | 'macro_detail') => {
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetMetadata: {
            ...node.assetMetadata,
            turnaroundAngle: angle,
          },
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
    } catch (err) {
      console.error('Failed to update turnaround angle:', err);
    }
  };

  const srefUrl = project.masterStyleAnchorAssetUrl || node.artifacts?.mediaUrl || 'assets/subjects/anya/three_quarter.png';
  const fullSrefPrompt = `${node.prompt} --sref ${srefUrl} --sw 100 --v 6.1`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(fullSrefPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-84 rounded-2xl bg-[#121215]/95 backdrop-blur-xl border border-purple-500/80 shadow-2xl p-4 text-[#FAFAFA] space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-purple-300">Asset & Character HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono font-bold">
            IN-PLACE
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
          <button
            onClick={onClose}
            className="p-1 rounded text-[#71717A] hover:text-white transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Master Visual Style Anchor Banner */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
        isMasterAnchor
          ? 'bg-purple-950/40 border-purple-500/80'
          : 'bg-[#18181B] border-[#27272A]'
      }`}>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Star className={`w-3.5 h-3.5 ${isMasterAnchor ? 'fill-purple-400 text-purple-400' : 'text-slate-500'}`} />
            <span>{isMasterAnchor ? '⭐️ Project Master Style Anchor' : 'Style Parity Sync'}</span>
          </div>
          <p className="text-[10px] text-[#A1A1AA] mt-0.5 leading-snug">
            {isMasterAnchor
              ? 'Defines visual DNA, lighting & grain for the entire cast.'
              : 'Inherits visual style from Master Anchor via --sref --sw 100.'}
          </p>
        </div>
        <button
          onClick={handleToggleMasterAnchor}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition border ${
            isMasterAnchor
              ? 'bg-purple-500 text-black border-purple-400'
              : 'bg-[#27272A] text-white border-[#3F3F46] hover:bg-[#3F3F46]'
          }`}
        >
          {isMasterAnchor ? 'Anchor Set' : 'Set as Anchor'}
        </button>
      </div>

      {/* Turnaround Angle Selector */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-[#71717A] mb-1.5">
          Turnaround Framing Angle
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
          {[
            { id: 'portrait', label: 'Studio Portrait (50mm)' },
            { id: 'three_quarter', label: '3/4 Profile (35mm)' },
            { id: 'full_body', label: 'Full Stance (35mm)' },
            { id: 'macro_detail', label: 'Macro Texture (85mm)' },
          ].map((angle) => (
            <button
              key={angle.id}
              onClick={() => handleSelectAngle(angle.id as any)}
              className={`p-2 rounded-lg border text-left transition ${
                activeAngle === angle.id
                  ? 'bg-purple-950/60 border-purple-500 text-white font-bold'
                  : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#3F3F46]'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Card with --sref Lock */}
      <div className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
          <span>LOCKED TURNAROUND PROMPT</span>
          <span className="text-purple-400 font-bold">--sref ACTIVE</span>
        </div>
        <p className="text-[11px] font-mono text-slate-200 select-all leading-relaxed line-clamp-3">
          {fullSrefPrompt}
        </p>
        <button
          onClick={handleCopyPrompt}
          className="w-full py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied with --sref Parity!' : 'Copy for Midjourney / Flux'}</span>
        </button>
      </div>

      {/* Turnaround Dropzone */}
      <div className="p-3 rounded-xl border border-dashed border-[#27272A] hover:border-purple-500/60 bg-[#09090B]/60 text-center cursor-pointer transition">
        <Upload className="w-4 h-4 mx-auto mb-1 text-purple-400" />
        <div className="text-[11px] font-bold text-slate-300">Drop Generated PNG Turnaround</div>
        <div className="text-[9px] font-mono text-[#71717A]">Auto-attaches to assets/subjects/</div>
      </div>
    </div>
  );
};

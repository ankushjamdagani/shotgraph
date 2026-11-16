import { apiFetch } from '../../../services/api';
import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Star, Copy, Check, Upload, X } from 'lucide-react';

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
      const res = await apiFetch(`/api/projects/${project.id}/assets/master-style-anchor`, {
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
      const res = await apiFetch(`/api/projects/${project.id}/nodes/${node.id}`, {
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
    <div className="w-84 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-accent-primary">Asset & Character HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-accent-primary border border-subtle font-mono font-bold">
            IN-PLACE
          </span>
        </div>
        <div className="flex items-center gap-1">

          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Master Visual Style Anchor Banner */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
        isMasterAnchor
          ? 'bg-card border-accent-primary ring-1 ring-accent-primary/40'
          : 'bg-card border-subtle'
      }`}>
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <Star className={`w-3.5 h-3.5 ${isMasterAnchor ? 'fill-accent-primary text-accent-primary' : 'text-text-muted'}`} />
            <span>{isMasterAnchor ? '⭐️ Project Master Style Anchor' : 'Style Parity Sync'}</span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5 leading-snug">
            {isMasterAnchor
              ? 'Defines visual DNA, lighting & grain for the entire cast.'
              : 'Inherits visual style from Master Anchor via --sref --sw 100.'}
          </p>
        </div>
        <button
          onClick={handleToggleMasterAnchor}
          className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition border ${
            isMasterAnchor
              ? 'bg-accent-primary text-app border-accent-primary'
              : 'bg-surface text-text-primary border-subtle hover:bg-subtle/50'
          }`}
        >
          {isMasterAnchor ? 'Anchor Set' : 'Set as Anchor'}
        </button>
      </div>

      {/* Turnaround Angle Selector */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1.5">
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
                  ? 'bg-card border-accent-primary text-text-primary font-bold ring-1 ring-accent-primary/40'
                  : 'bg-card border-subtle text-text-muted hover:text-text-primary hover:border-text-muted/40'
              }`}
            >
              {angle.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Card with --sref Lock */}
      <div className="p-2.5 rounded-xl bg-card border border-subtle space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>LOCKED TURNAROUND PROMPT</span>
          <span className="text-accent-primary font-bold">--sref ACTIVE</span>
        </div>
        <p className="text-[11px] font-mono text-text-primary select-all leading-relaxed line-clamp-3">
          {fullSrefPrompt}
        </p>
        <button
          onClick={handleCopyPrompt}
          className="w-full py-1.5 px-3 rounded-lg bg-accent-primary hover:opacity-90 text-app font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied with --sref Parity!' : 'Copy for Midjourney / Flux'}</span>
        </button>
      </div>

      {/* Turnaround Dropzone */}
      <div className="p-3 rounded-xl border border-dashed border-subtle hover:border-accent-primary bg-card/40 text-center cursor-pointer transition">
        <Upload className="w-4 h-4 mx-auto mb-1 text-accent-primary" />
        <div className="text-[11px] font-bold text-text-primary">Drop Generated PNG Turnaround</div>
        <div className="text-[9px] font-mono text-text-muted">Auto-attaches to assets/subjects/</div>
      </div>
    </div>
  );
};

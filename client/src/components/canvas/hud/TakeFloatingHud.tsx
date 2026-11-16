import { apiFetch } from '../../../services/api';
import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Star, X, Upload, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from '../../../services/toastService.js';

interface TakeFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  onMediaDrop?: (nodeId:string,file:File)=>void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const TakeFloatingHud: React.FC<TakeFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose, onMediaDrop,
}) => {
  const [coverageType, setCoverageType] = useState('Master Angle');
  const [copied, setCopied] = useState(false);
  const [activeSkills, setActiveSkills] = useState(['take-one', 'video-director']);

  const isActiveCut = node.sceneId ? project.activeCut[node.sceneId] === node.id : false;

  const handleCopyEnrichedPrompt = async () => {
    let basePrompt = node.prompt || 'Cinematic footage take';
    try {
      const res = await apiFetch('http://localhost:3030/api/skills/enrich-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${basePrompt} [Coverage: ${coverageType}]`,
          stage: 'take',
          activeSkillIds: activeSkills,
        }),
      });
      const data = await res.json();
      if (data.success && data.enrichedPrompt) {
        basePrompt = data.enrichedPrompt;
      }
    } catch {}

    navigator.clipboard.writeText(basePrompt);
    setCopied(true);
    toast.success('Take prompt copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMakeActiveCut = async () => {
    if (!node.sceneId) return;
    try {
      const res = await apiFetch('http://localhost:3030/api/tree/active-cut', {
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

          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {node.artifacts.mediaUrl ? <video controls playsInline className="w-full max-h-60 bg-black rounded" src={`/api/projects/${project.id}/media/${node.artifacts.mediaUrl}`}/> : <p className="p-5 bg-card rounded text-sm text-text-muted">Import a video to review this take.</p>}
      <p className="text-xs text-text-muted">Engine: {node.modelEngine} · {node.artifacts.metadata?.durationSec ? `${node.artifacts.metadata.durationSec}s`:'Duration not measured'}</p>
      {/* Take-One Coverage Matrix & Actor Seed Pinning */}
      <div className="p-2.5 rounded-xl bg-card border border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
            <span className="text-[10px] font-bold font-mono text-text-primary uppercase tracking-wide">
              Take-One Consistency
            </span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-surface text-accent-primary font-mono border border-subtle">
              Prompt settings
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyEnrichedPrompt}
            className="px-2 py-0.5 rounded-md bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[10px] font-mono font-bold flex items-center gap-1 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Take Prompt'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
          <div>
            <label className="block text-[9px] uppercase text-text-muted mb-0.5">Coverage Angle</label>
            <select
              value={coverageType}
              onChange={(e) => setCoverageType(e.target.value)}
              className="w-full p-1 rounded-lg bg-surface border border-subtle text-text-primary font-mono text-[10px] focus:outline-none focus:border-accent-primary"
            >
              <option value="Master Angle">Master Angle (Full Scene)</option>
              <option value="OTS Over-the-Shoulder">OTS (Over-the-Shoulder)</option>
              <option value="Medium Close-Up">Medium Close-Up (Reaction)</option>
              <option value="Choker Macro">Choker Macro (Eyes/Detail)</option>
              <option value="Dutch Angle">Dutch Angle (Tension)</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase text-text-muted mb-0.5">Creative Skills</label>
            <div className="flex items-center gap-1 pt-0.5">
              {[
                { id: 'take-one', label: '🎯 Seed' },
                { id: 'video-director', label: '🎬 Optics' },
              ].map((s) => {
                const isAct = activeSkills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveSkills((prev) =>
                        isAct ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                      );
                    }}
                    className={`flex-1 py-1 rounded text-[9px] border transition ${
                      isAct
                        ? 'bg-accent-primary/10 border-accent-primary text-accent-primary font-bold'
                        : 'bg-surface border-subtle text-text-muted'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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

      {onMediaDrop && <label className="block p-3 rounded border border-dashed border-subtle text-center text-sm cursor-pointer"><Upload className="w-4 h-4 mx-auto mb-1"/>Import replacement video<input className="sr-only" aria-label="Import replacement video" type="file" accept="video/*" onChange={event=>{const file=event.target.files?.[0];if(file)onMediaDrop(node.id,file);event.target.value='';}}/></label>}
    </div>
  );
};

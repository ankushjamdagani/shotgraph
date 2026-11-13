import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  FolderOpen,
  Smartphone,
  Monitor,
  Square,
  Clock,
  Palette,
  Check,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { GlobalStylePreset, FilmProject } from '../../types';

interface NewProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: FilmProject) => void;
}

export const NewProjectWizard: React.FC<NewProjectWizardProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('New AI Video Project');
  const [folderPath, setFolderPath] = useState('');
  const [ideaPrompt, setIdeaPrompt] = useState(
    'An intense neon cyberpunk chase scene through rain-soaked streets with high visual contrast and cinematic shallow depth of field.'
  );
  const [preset, setPreset] = useState<'reel_9_16' | 'youtube_16_9' | 'ad_1_1'>('reel_9_16');
  const [targetDurationSec, setTargetDurationSec] = useState(30);
  const [basePresetId, setBasePresetId] = useState('liquid_glass');
  const [stylePresets, setStylePresets] = useState<GlobalStylePreset[]>([]);
  const [isPickingDirectory, setIsPickingDirectory] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Fetch available global style presets
      fetch('http://localhost:3030/api/styles/presets')
        .then((res) => res.json())
        .then((presets: GlobalStylePreset[]) => {
          if (Array.isArray(presets)) {
            setStylePresets(presets);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickDirectory = async () => {
    setIsPickingDirectory(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:3030/api/projects/pick-directory', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.path) {
        setFolderPath(data.path);
      }
    } catch {
      setErrorMsg('Finder folder picker was dismissed or is unavailable.');
    } finally {
      setIsPickingDirectory(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg('Please provide a project name.');
      return;
    }
    if (!folderPath.trim()) {
      setErrorMsg('Please select or enter a target directory.');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:3030/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          path: folderPath.trim(),
          ideaPrompt: ideaPrompt.trim(),
          preset,
          targetDurationSec,
          basePresetId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create project');
      }

      onProjectCreated(data.project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Creation failed');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden flex flex-col text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-card border border-subtle flex items-center justify-center text-accent-primary">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary leading-tight">Create New Video Project</h2>
              <p className="text-xs text-text-muted">Configure narrative thesis, canvas format, and initial style guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Project Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">Project Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neon Horizon Ep. 1"
              className="w-full px-3.5 py-2.5 bg-card border border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary transition"
            />
          </div>

          {/* 2. Stage 1 Ideation: Creative Premise & Narrative Thesis */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                <span>Stage 1: Creative Concept & Narrative Thesis</span>
              </label>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-subtle text-accent-primary font-bold">
                ROOT SEED
              </span>
            </div>
            <textarea
              rows={3}
              value={ideaPrompt}
              onChange={(e) => setIdeaPrompt(e.target.value)}
              placeholder="Describe the story premise, tone, visual thesis, and core conflict..."
              className="w-full px-3.5 py-2.5 bg-card border border-subtle rounded-xl text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary transition resize-none leading-relaxed font-mono"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Seeds Stage 1 (Ideation) and branches directly into Director Taste DNA, Screenplay Beats, and Shot Lineage.
            </p>
          </div>

          {/* 3. Target Directory */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-primary">Target Folder on Mac</label>
              <button
                type="button"
                onClick={handlePickDirectory}
                disabled={isPickingDirectory}
                className="flex items-center gap-1.5 text-xs text-accent-primary hover:opacity-80 transition"
              >
                {isPickingDirectory ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5" />
                )}
                <span>Choose in Finder...</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/Users/username/videos/my-project"
                className="w-full px-3.5 py-2.5 bg-card border border-subtle rounded-xl text-xs text-text-primary font-mono placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary transition"
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Creates self-contained `.studio`, `assets`, `raw_footage`, and `exports` inside this folder.
            </p>
          </div>

          {/* 4. Format Preset */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-2">Canvas & Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'reel_9_16' as const,
                  label: '9:16 Vertical Reel',
                  desc: 'Instagram Reels, TikTok, YouTube Shorts',
                  dimensions: '1080 × 1920',
                  defaultDur: 30,
                  silhouette: (
                    <div className="w-7 h-12 rounded border border-subtle bg-app flex flex-col items-center justify-between p-0.5 mb-2 shadow-inner">
                      <div className="w-1.5 h-0.5 rounded-full bg-subtle" />
                      <div className="w-full flex-1 my-0.5 border border-dashed border-subtle rounded flex items-center justify-center">
                        <Smartphone className="w-2.5 h-2.5 text-accent-primary" />
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'youtube_16_9' as const,
                  label: '16:9 Widescreen',
                  desc: 'YouTube Long-form & Explainer Docs',
                  dimensions: '1920 × 1080',
                  defaultDur: 60,
                  silhouette: (
                    <div className="w-12 h-7 rounded border border-subtle bg-app flex items-center justify-center mb-2 shadow-inner">
                      <div className="w-full h-full border border-dashed border-subtle rounded flex items-center justify-center">
                        <Monitor className="w-3 h-3 text-accent-primary" />
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'ad_1_1' as const,
                  label: '1:1 Square Ad',
                  desc: 'Social feed & Carousel Commercials',
                  dimensions: '1080 × 1080',
                  defaultDur: 15,
                  silhouette: (
                    <div className="w-8 h-8 rounded border border-subtle bg-app flex items-center justify-center mb-2 shadow-inner">
                      <div className="w-full h-full border border-dashed border-subtle rounded flex items-center justify-center">
                        <Square className="w-3 h-3 text-accent-primary" />
                      </div>
                    </div>
                  ),
                },
              ].map((item) => {
                const isSelected = preset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPreset(item.id);
                      setTargetDurationSec(item.defaultDur);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col items-start ${
                      isSelected
                        ? 'bg-card border-accent-primary text-text-primary shadow-lg ring-1 ring-accent-primary/40'
                        : 'bg-card border-subtle text-text-muted hover:border-text-muted/40 hover:text-text-primary'
                    }`}
                  >
                    {item.silhouette}
                    <div className="text-xs font-bold text-text-primary mb-0.5">{item.label}</div>
                    <div className="text-[10px] text-text-muted leading-tight mb-2">{item.desc}</div>
                    <span className="mt-auto px-1.5 py-0.5 rounded text-[9px] font-mono bg-surface text-text-muted border border-subtle">
                      {item.dimensions}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Target Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Clock className="w-3.5 h-3.5 text-accent-primary" />
                Target Video Duration
              </label>
              <span className="text-xs font-mono font-bold text-accent-primary">{targetDurationSec} seconds</span>
            </div>
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={targetDurationSec}
              onChange={(e) => setTargetDurationSec(Number(e.target.value))}
              className="w-full accent-accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
              <span>10s (Hook micro)</span>
              <span>30s (Viral Reel)</span>
              <span>60s (Deep Dive)</span>
              <span>180s (3m Master)</span>
            </div>
          </div>

          {/* 6. Base Style Preset */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2">
              <Palette className="w-3.5 h-3.5 text-accent-primary" />
              Base Style Preset (Inheritable)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {stylePresets.map((sp) => {
                const isSelected = basePresetId === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setBasePresetId(sp.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-card border-accent-primary text-text-primary ring-1 ring-accent-primary/40'
                        : 'bg-card border-subtle text-text-muted hover:border-text-muted/40 hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-text-primary truncate">{sp.name}</div>
                      <div
                        className="w-3 h-3 rounded-full border border-subtle"
                        style={{ backgroundColor: sp.tokens.palette.accent }}
                      />
                    </div>
                    <div className="text-[10px] text-text-muted line-clamp-2 leading-tight">
                      {sp.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-subtle bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-primary hover:opacity-90 text-app font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scaffolding Workspace...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Create & Open Project</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

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
    } catch (err: any) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B0F19]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Create New Video Project</h2>
              <p className="text-xs text-slate-400">Configure format, location, and initial style guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Viral Hook Test v1"
              className="w-full px-3.5 py-2.5 bg-[#111726] border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          {/* 2. Target Directory */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Folder on Mac</label>
              <button
                type="button"
                onClick={handlePickDirectory}
                disabled={isPickingDirectory}
                className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition"
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
                className="w-full px-3.5 py-2.5 bg-[#111726] border border-slate-800 rounded-xl text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Creates self-contained `.studio`, `assets`, `raw_footage`, and `exports` inside this folder.
            </p>
          </div>

          {/* 3. Format Preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Canvas & Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'reel_9_16' as const,
                  label: '9:16 Vertical Reel',
                  desc: 'Reels, TikTok, Shorts (1080x1920)',
                  icon: Smartphone,
                  defaultDur: 30,
                },
                {
                  id: 'youtube_16_9' as const,
                  label: '16:9 Widescreen',
                  desc: 'YouTube & Explainer (1920x1080)',
                  icon: Monitor,
                  defaultDur: 60,
                },
                {
                  id: 'ad_1_1' as const,
                  label: '1:1 Square Ad',
                  desc: 'Social feed & Carousel (1080x1080)',
                  icon: Square,
                  defaultDur: 15,
                },
              ].map((item) => {
                const Icon = item.icon;
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
                        ? 'bg-sky-950/60 border-sky-500 text-white shadow-lg shadow-sky-950/40'
                        : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                    <div className="text-xs font-bold text-white mb-0.5">{item.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Target Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                Target Video Duration
              </label>
              <span className="text-xs font-mono font-bold text-sky-400">{targetDurationSec} seconds</span>
            </div>
            <input
              type="range"
              min={10}
              max={180}
              step={5}
              value={targetDurationSec}
              onChange={(e) => setTargetDurationSec(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>10s (Hook micro)</span>
              <span>30s (Viral Reel)</span>
              <span>60s (Deep Dive)</span>
              <span>180s (3m Master)</span>
            </div>
          </div>

          {/* 5. Base Style Preset */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Palette className="w-3.5 h-3.5 text-sky-400" />
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
                        ? 'bg-sky-950/60 border-sky-500 text-white'
                        : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-white truncate">{sp.name}</div>
                      <div
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ backgroundColor: sp.tokens.palette.accent }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                      {sp.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-[#0B0F19]/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
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

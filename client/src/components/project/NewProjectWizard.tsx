import React, { useState } from 'react';
import {
  FolderPlus,
  FolderOpen,
  Smartphone,
  Monitor,
  Square,
  Sparkles,
  Layers,
  X,
  Loader2,
  Film,
} from 'lucide-react';
import { FilmProject } from '../../types';

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
  const [name, setName] = useState('New Video Project');
  const [folderPath, setFolderPath] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [targetDurationSec, setTargetDurationSec] = useState(30);
  const [isStarterTemplate, setIsStarterTemplate] = useState(false);
  const [isPickingDirectory, setIsPickingDirectory] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('Directory picker was cancelled or unavailable.');
    } finally {
      setIsPickingDirectory(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a project name.');
      return;
    }
    if (!folderPath.trim()) {
      setErrorMsg('Please select a target directory.');
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
          aspectRatio,
          targetDurationSec,
          emptyDAG: !isStarterTemplate,
        }),
      });

      const data = await res.json();
      if (data.success && data.project) {
        onProjectCreated(data.project);
        onClose();
      } else {
        setErrorMsg(data.error || 'Failed to create project.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-subtle rounded-lg shadow-2xl p-5 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">New Project</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-950/60 border border-red-800 rounded text-xs text-red-200">
            {errorMsg}
          </div>
        )}

        {/* Project Setup Form */}
        <div className="space-y-3.5">
          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted font-mono uppercase">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commercial Reel"
              className="w-full px-3 py-1.5 bg-card border border-subtle rounded text-xs text-text-primary focus:outline-none focus:border-accent-primary transition"
            />
          </div>

          {/* Directory Path */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted font-mono uppercase">
              Location
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/Users/name/projects/my-video"
                className="flex-1 px-3 py-1.5 bg-card border border-subtle rounded text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary transition"
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                disabled={isPickingDirectory}
                className="px-3 py-1.5 bg-card hover:bg-subtle text-text-primary border border-subtle rounded text-xs font-semibold flex items-center gap-1.5 transition"
              >
                {isPickingDirectory ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
                )}
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Template Mode */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted font-mono uppercase">
              Template
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsStarterTemplate(false)}
                className={`p-2.5 rounded border text-left transition flex items-start gap-2 ${
                  !isStarterTemplate
                    ? 'border-accent-primary bg-card text-text-primary ring-1 ring-accent-primary'
                    : 'border-subtle bg-card/50 text-text-muted hover:border-text-muted'
                }`}
              >
                <Layers className="w-4 h-4 text-accent-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-text-primary">Blank Canvas</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Start empty with zero nodes
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsStarterTemplate(true)}
                className={`p-2.5 rounded border text-left transition flex items-start gap-2 ${
                  isStarterTemplate
                    ? 'border-accent-primary bg-card text-text-primary ring-1 ring-accent-primary'
                    : 'border-subtle bg-card/50 text-text-muted hover:border-text-muted'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-text-primary">Sample Pipeline</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Includes 8-stage lineage
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted font-mono uppercase">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '9:16', label: '9:16', icon: Smartphone, desc: 'Vertical' },
                { id: '16:9', label: '16:9', icon: Monitor, desc: 'Landscape' },
                { id: '1:1', label: '1:1', icon: Square, desc: 'Square' },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = aspectRatio === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setAspectRatio(fmt.id as any)}
                    className={`p-2.5 rounded border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-accent-primary bg-card text-text-primary ring-1 ring-accent-primary'
                        : 'border-subtle bg-card/50 text-text-muted hover:border-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-accent-primary" />
                      <span className="text-xs font-bold font-mono text-text-primary">{fmt.label}</span>
                    </div>
                    <div className="text-[10px] text-text-muted mt-0.5">{fmt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Duration */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-muted font-mono uppercase">
                Duration
              </label>
              <span className="text-xs font-mono font-bold text-text-primary">{targetDurationSec}s</span>
            </div>
            <input
              type="range"
              min={5}
              max={180}
              step={5}
              value={targetDurationSec}
              onChange={(e) => setTargetDurationSec(Number(e.target.value))}
              className="w-full accent-accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs font-semibold text-text-muted hover:text-text-primary transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="px-4 py-1.5 bg-accent-primary hover:opacity-90 disabled:opacity-50 text-app font-bold text-xs rounded flex items-center gap-1.5 shadow-xs transition"
          >
            {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
            <span>{isCreating ? 'Creating...' : 'Create Project'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

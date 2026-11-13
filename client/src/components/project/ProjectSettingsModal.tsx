import React, { useState } from 'react';
import { FilmProject } from '../../types.js';
import { StudioTheme, THEME_METADATA } from '../ui-ux/ThemeCustomizer.js';
import { X, Sliders, Type, Palette, Check, Save, Sparkles, ShieldAlert, Plus, Trash2 } from 'lucide-react';
import { toast } from '../../services/toastService.js';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  currentTheme: StudioTheme;
  onThemeChange: (theme: StudioTheme) => void;
}

type SettingsTab = 'general' | 'typography' | 'theme' | 'taste';

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  currentTheme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Form State
  const [name, setName] = useState(project.name);
  const [aspectRatio, setAspectRatio] = useState(project.aspectRatio || '9:16');
  const [targetDurationSec, setTargetDurationSec] = useState(project.targetDurationSec || 30);
  const [fps, setFps] = useState(project.fps || 30);
  const [isSaving, setIsSaving] = useState(false);

  // Taste DNA State
  const [styleMarkdown, setStyleMarkdown] = useState(project.styleMarkdown || '');
  const [basePresetId, setBasePresetId] = useState(project.basePresetId || 'liquid_glass');
  const [accentColor, setAccentColor] = useState(
    project.styleOverrides?.palette?.accent || project.styleTokens?.palette?.accent || '#38BDF8'
  );
  const [cutPacing, setCutPacing] = useState(
    project.styleOverrides?.pacing?.avgCutDurationSec || project.styleTokens?.pacing?.avgCutDurationSec || 1.6
  );
  const [constraints, setConstraints] = useState<string[]>(project.additionalConstraints || []);
  const [newConstraint, setNewConstraint] = useState('');

  if (!isOpen) return null;

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const updatedProject: FilmProject = {
        ...project,
        name,
        aspectRatio: aspectRatio as any,
        targetDurationSec: Number(targetDurationSec),
        fps: Number(fps),
        styleMarkdown,
        basePresetId,
        styleOverrides: {
          ...project.styleOverrides,
          palette: { ...project.styleOverrides?.palette, accent: accentColor },
          pacing: { ...project.styleOverrides?.pacing, avgCutDurationSec: cutPacing },
        },
        additionalConstraints: constraints,
      };

      const res = await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          aspectRatio,
          targetDurationSec: Number(targetDurationSec),
          fps: Number(fps),
          styleMarkdown,
          basePresetId,
          styleOverrides: updatedProject.styleOverrides,
          additionalConstraints: constraints,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onUpdateProject(data.project || updatedProject);
        toast.success('Project settings saved successfully');
        onClose();
      } else {
        // Fallback local update if patch route not present
        onUpdateProject(updatedProject);
        toast.success('Project settings updated in memory');
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving project settings:', err);
      toast.error('Failed to save project settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface border border-subtle rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-subtle bg-card/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Project Settings</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-subtle bg-surface">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs font-mono transition ${
              activeTab === 'general'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>General Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('typography')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs font-mono transition ${
              activeTab === 'typography'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Typography</span>
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs font-mono transition ${
              activeTab === 'theme'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Visual Theme</span>
          </button>

          <button
            onClick={() => setActiveTab('taste')}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 font-bold text-xs font-mono transition ${
              activeTab === 'taste'
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Taste & Style DNA</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase font-mono">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-subtle rounded text-xs text-text-primary focus:outline-none focus:border-accent-primary transition"
                  placeholder="e.g. Minimalist Tech Launch Video"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase font-mono">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { id: '9:16', label: '9:16 Vertical', desc: 'Reels / Shorts / TikTok' },
                    { id: '16:9', label: '16:9 Widescreen', desc: 'YouTube / Cinema' },
                    { id: '1:1', label: '1:1 Square', desc: 'Feed & Social Ads' },
                    { id: '2.39:1', label: '2.39:1 Anamorphic', desc: 'Theatrical Scope' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setAspectRatio(ratio.id as any)}
                      className={`p-3 rounded border text-left transition flex flex-col justify-between ${
                        aspectRatio === ratio.id
                          ? 'border-accent-primary bg-card text-text-primary ring-1 ring-accent-primary'
                          : 'border-subtle bg-card/50 text-text-muted hover:text-text-primary hover:border-text-muted'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono text-text-primary">{ratio.label}</div>
                      <div className="text-[10px] text-text-muted mt-1 leading-tight">{ratio.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Duration & FPS Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase font-mono">
                    Target Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={600}
                    value={targetDurationSec}
                    onChange={(e) => setTargetDurationSec(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-card border border-subtle rounded text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary transition"
                  />
                  <div className="text-[10px] text-text-muted font-mono">
                    Total: {Math.floor(targetDurationSec / 60)}m {targetDurationSec % 60}s
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase font-mono">
                    Timeline Framerate (FPS)
                  </label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-card border border-subtle rounded text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary transition"
                  >
                    <option value={24}>24 FPS (Cinematic standard)</option>
                    <option value={30}>30 FPS (Digital & Web standard)</option>
                    <option value={60}>60 FPS (Fluid High Frame Rate)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              <div className="p-4 rounded bg-card border border-subtle space-y-3">
                <div className="text-xs font-bold text-text-primary">Studio Interface Typography</div>
                <div className="text-xs text-text-muted leading-relaxed">
                  Default: <span className="font-bold text-text-primary font-sans">Plus Jakarta Sans & Inter</span>
                </div>
                <div className="p-3 rounded bg-surface border border-subtle font-sans text-sm font-semibold">
                  The quick brown fox jumps over the cinematic master cut.
                </div>
              </div>

              <div className="p-4 rounded bg-card border border-subtle space-y-3">
                <div className="text-xs font-bold text-text-primary">Screenplay Dialogue & Timecode Font</div>
                <div className="text-xs text-text-muted leading-relaxed">
                  Default: <span className="font-bold text-text-primary font-mono">JetBrains Mono</span>
                </div>
                <div className="p-3 rounded bg-surface border border-subtle font-mono text-xs text-emerald-400">
                  SCENE 1 - ATRIUM - DAY<br />
                  ANYA: Style is not what is added. It is what cannot be stripped away.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-5">
              {/* Dark Themes */}
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-text-muted mb-2.5">Dark Themes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['studio-dark', 'film-lab-mono', 'midnight-navy', 'cinema-tungsten'] as StudioTheme[]).map((thm) => {
                    const meta = THEME_METADATA[thm];
                    const isSelected = currentTheme === thm;
                    return (
                      <button
                        key={thm}
                        type="button"
                        onClick={() => onThemeChange(thm)}
                        className={`p-3.5 rounded border text-left transition flex items-start gap-3 relative ${
                          isSelected
                            ? 'border-accent-primary bg-card ring-1 ring-accent-primary'
                            : 'border-subtle bg-card/60 hover:bg-card hover:border-text-muted'
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded border border-white/20 shrink-0 mt-0.5 shadow"
                          style={{ backgroundColor: meta.previewBg }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                            <span>{meta.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary" />}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5 leading-snug">{meta.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Light Themes */}
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-text-muted mb-2.5">Light Themes</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(['paper-ink', 'studio-daylight', 'nordic-light'] as StudioTheme[]).map((thm) => {
                    const meta = THEME_METADATA[thm];
                    const isSelected = currentTheme === thm;
                    return (
                      <button
                        key={thm}
                        type="button"
                        onClick={() => onThemeChange(thm)}
                        className={`p-3.5 rounded border text-left transition flex items-start gap-2.5 relative ${
                          isSelected
                            ? 'border-accent-primary bg-card ring-1 ring-accent-primary'
                            : 'border-subtle bg-card/60 hover:bg-card hover:border-text-muted'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-lg border border-black/10 shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: meta.previewBg }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-text-primary flex items-center justify-between">
                            <span className="truncate">{meta.name.replace(' (Light)', '')}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-accent-primary shrink-0" />}
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5 leading-snug line-clamp-2">{meta.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'taste' && (
            <div className="space-y-6">
              {/* Base Aesthetic Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase font-mono">
                  Director Base Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'liquid_glass', label: 'Liquid Glass', desc: 'Glossy modern tech, refractive translucency' },
                    { id: 'cinema_noir', label: 'Cinema Noir', desc: 'High-contrast shadow play, moody anamorphic' },
                    { id: 'swiss_brutalist', label: 'Swiss Brutalism', desc: 'Monochrome grids, bold grotesque fonts' },
                    { id: 'anime_cyberpunk', label: 'Cyberpunk Neon', desc: 'Vibrant chromatic glow & anime line art' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setBasePresetId(preset.id)}
                      className={`p-3 rounded border text-left transition ${
                        basePresetId === preset.id
                          ? 'border-accent-primary bg-card ring-1 ring-accent-primary'
                          : 'border-subtle bg-card/60 hover:bg-card'
                      }`}
                    >
                      <div className="text-xs font-bold text-text-primary">{preset.label}</div>
                      <div className="text-[10px] text-text-muted mt-1 leading-snug">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color & Pacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase font-mono">
                    Palette Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-9 h-9 rounded border border-subtle bg-card cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-card border border-subtle rounded text-xs font-mono text-text-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase font-mono">
                      Average Cut Pacing (Sec)
                    </label>
                    <span className="text-xs font-mono font-bold text-accent-primary">{cutPacing}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={cutPacing}
                    onChange={(e) => setCutPacing(parseFloat(e.target.value))}
                    className="w-full accent-accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-text-muted">
                    <span>0.5s (Montage Blitz)</span>
                    <span>5.0s (Cinematic Breathe)</span>
                  </div>
                </div>
              </div>

              {/* Negative Aesthetic Constraints */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Negative Guard Constraints</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {constraints.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-card border border-subtle text-[11px] font-mono text-text-primary flex items-center gap-1.5"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => setConstraints(constraints.filter((_, idx) => idx !== i))}
                        className="text-text-muted hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newConstraint}
                    onChange={(e) => setNewConstraint(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newConstraint.trim()) {
                        e.preventDefault();
                        setConstraints([...constraints, newConstraint.trim()]);
                        setNewConstraint('');
                      }
                    }}
                    placeholder="Add negative style guard (e.g. no 3D cartoon, no oversaturated bloom)..."
                    className="flex-1 px-3 py-1.5 bg-card border border-subtle rounded text-xs text-text-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newConstraint.trim()) {
                        setConstraints([...constraints, newConstraint.trim()]);
                        setNewConstraint('');
                      }
                    }}
                    className="px-3 py-1.5 bg-card border border-subtle rounded text-xs font-bold hover:bg-subtle text-text-primary flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Raw STYLE.md Guidelines Editor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase font-mono">
                  Master Style Directives (`STYLE.md`)
                </label>
                <textarea
                  value={styleMarkdown}
                  onChange={(e) => setStyleMarkdown(e.target.value)}
                  rows={5}
                  placeholder="# Director Visual System..."
                  className="w-full px-3 py-2 bg-card border border-subtle rounded text-xs font-mono text-text-primary leading-relaxed focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-subtle bg-card/60">
          <div className="text-[11px] font-mono text-text-muted">
            Theme changes apply immediately. Click Save to persist general specs.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-semibold text-text-muted hover:text-text-primary transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGeneral}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-accent-primary hover:opacity-90 text-app font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

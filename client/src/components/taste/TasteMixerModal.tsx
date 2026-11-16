import { useDialog } from '../common/useDialog';
import { apiFetch } from '../../services/api';
import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Check,
  Palette,
  ShieldAlert,
  Plus,
  Trash2,
  BookmarkPlus,
  Loader2,
} from 'lucide-react';
import { GlobalStylePreset, FilmProject } from '../../types';

interface TasteMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FilmProject;
  onUpdateProject: (updatedProject: FilmProject) => void;
}

export const TasteMixerModal: React.FC<TasteMixerModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
}) => {
  const [stylePresets, setStylePresets] = useState<GlobalStylePreset[]>([]);
  const [selectedBasePresetId, setSelectedBasePresetId] = useState(
    project.basePresetId || 'liquid_glass'
  );

  // Local overrides
  const [overrideAccent, setOverrideAccent] = useState(
    project.styleOverrides?.palette?.accent || project.styleTokens?.palette?.accent || '#38BDF8'
  );
  const [overrideDisplayFont, setOverrideDisplayFont] = useState(
    project.styleOverrides?.typography?.displayFont || project.styleTokens?.typography?.displayFont || 'Inter-700'
  );
  const [overrideCutDuration, setOverrideCutDuration] = useState<number>(
    project.styleOverrides?.pacing?.avgCutDurationSec || project.styleTokens?.pacing?.avgCutDurationSec || 1.6
  );

  // Additional negative constraints
  const [additionalConstraints, setAdditionalConstraints] = useState<string[]>(
    project.additionalConstraints || []
  );
  const [newConstraintInput, setNewConstraintInput] = useState('');

  // Save as preset state
  const [newPresetName, setNewPresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/styles/presets')
        .then((res) => res.json())
        .then((presets) => {
          if (Array.isArray(presets)) {
            setStylePresets(presets);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  const handleAddConstraint = () => {
    if (!newConstraintInput.trim()) return;
    setAdditionalConstraints([...additionalConstraints, newConstraintInput.trim()]);
    setNewConstraintInput('');
  };

  const handleRemoveConstraint = (index: number) => {
    setAdditionalConstraints(additionalConstraints.filter((_, i) => i !== index));
  };

  const handleApplyCascadingStyles = async () => {
    setIsApplying(true);
    setErrorMsg('');

    try {
      const payload = {
        basePresetId: selectedBasePresetId,
        styleOverrides: {
          palette: { accent: overrideAccent },
          typography: { displayFont: overrideDisplayFont },
          pacing: { avgCutDurationSec: overrideCutDuration },
        },
        additionalConstraints,
      };

      const res = await apiFetch(`/api/projects/${project.id}/style/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update style system');
      }

      onUpdateProject(data.project);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error applying styles');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveAsGlobalPreset = async () => {
    if (!newPresetName.trim()) return;
    setIsSavingPreset(true);

    try {
      const base = stylePresets.find((p) => p.id === selectedBasePresetId) || stylePresets[0];
      const newPreset: GlobalStylePreset = {
        id: newPresetName.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        name: newPresetName.trim(),
        description: `Custom preset derived from ${base?.name || 'Base'} with ${overrideAccent} accents`,
        archetype: base?.archetype || 'liquid_glass',
        tokens: {
          palette: {
            ...base.tokens.palette,
            accent: overrideAccent,
          },
          typography: {
            ...base.tokens.typography,
            displayFont: overrideDisplayFont,
          },
          pacing: {
            ...base.tokens.pacing,
            avgCutDurationSec: overrideCutDuration,
          },
          motion: { ...base.tokens.motion },
          audioRules: { ...base.tokens.audioRules },
          negativeConstraints: Array.from(
            new Set([...base.tokens.negativeConstraints, ...additionalConstraints])
          ),
        },
        styleDocMarkdown: `# ${newPresetName}\n\nDerived from ${base.name}`,
        updatedAt: Date.now(),
      };

      const res = await apiFetch('/api/styles/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset),
      });

      const data = await res.json();
      if (data.preset) {
        setStylePresets((prev) => [...prev, data.preset]);
        setSelectedBasePresetId(data.preset.id);
        setShowSavePresetInput(false);
        setNewPresetName('');
      }
    } catch {
      setErrorMsg('Failed to save global preset');
    } finally {
      setIsSavingPreset(false);
    }
  };

  return (
    <div ref={dialogRef} aria-label="Project style" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-lg bg-surface border border-subtle shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-surface">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-card border border-subtle flex items-center justify-center text-accent-primary">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary leading-tight">
                Taste & Cascading Style System
              </h2>
              <p className="text-xs text-text-muted">
                Global Presets + Local Overrides + Project Negative Constraints
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-surface">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Global Base Preset */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-accent-primary" />
                <span>1. Global Base Preset (Inherited Defaults)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSavePresetInput(!showSavePresetInput)}
                className="text-xs text-accent-primary hover:opacity-80 flex items-center gap-1 transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Current Look as New Preset...</span>
              </button>
            </div>

            {showSavePresetInput && (
              <div className="p-3 mb-3 bg-card border border-accent-primary/40 rounded flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New Preset Name (e.g. Acme Tech Vibrant)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-app border border-subtle rounded-lg text-xs text-text-primary"
                />
                <button
                  onClick={handleSaveAsGlobalPreset}
                  disabled={isSavingPreset || !newPresetName.trim()}
                  className="px-3 py-1.5 bg-accent-primary text-app font-bold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {isSavingPreset ? 'Saving...' : 'Save Global'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {stylePresets.map((sp) => {
                const isSelected = selectedBasePresetId === sp.id;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      setSelectedBasePresetId(sp.id);
                      setOverrideAccent(sp.tokens.palette.accent);
                      setOverrideDisplayFont(sp.tokens.typography.displayFont);
                      setOverrideCutDuration(sp.tokens.pacing.avgCutDurationSec);
                    }}
                    className={`p-3 rounded border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-card border-accent-primary text-text-primary shadow-md ring-1 ring-accent-primary/40'
                        : 'bg-card border-subtle text-text-muted hover:border-text-muted/40 hover:text-text-primary'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-text-primary truncate">{sp.name}</span>
                        <div
                          className="w-3 h-3 rounded-full border border-subtle shrink-0"
                          style={{ backgroundColor: sp.tokens.palette.accent }}
                        />
                      </div>
                      <p className="text-[10px] text-text-muted line-clamp-2 leading-tight">
                        {sp.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Project-Level Local Overrides */}
          <div className="p-4 rounded bg-card border border-subtle space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-accent-primary" />
                2. Project Local Overrides (Selective Customization)
              </span>
              <span className="text-[10px] text-text-muted font-mono">
                Overrides preset for this project only
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Accent Color Override */}
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-subtle bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="flex-1 p-2 bg-app border border-subtle rounded-lg text-xs text-text-primary font-mono"
                  />
                </div>
              </div>

              {/* Display Font Override */}
              <div>
                <label className="block text-[11px] text-text-muted mb-1">Display Headings Font</label>
                <select
                  value={overrideDisplayFont}
                  onChange={(e) => setOverrideDisplayFont(e.target.value)}
                  className="w-full p-2 bg-app border border-subtle rounded-lg text-xs text-text-primary"
                >
                  <option value="Inter-700">Inter (700 Bold)</option>
                  <option value="ArchivoBlack-400">Archivo Black (Impact Heavy)</option>
                  <option value="InstrumentSerif-400">Instrument Serif (Editorial Luxury)</option>
                  <option value="Syne-700">Syne (Playful Pop Bold)</option>
                  <option value="SpaceGrotesk-700">Space Grotesk (Tech Modern)</option>
                </select>
              </div>

              {/* Cut Cadence Slider Override */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] text-text-muted">Target Cut Cadence</label>
                  <span className="font-mono text-accent-primary font-bold">{overrideCutDuration}s</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={3.5}
                  step={0.1}
                  value={overrideCutDuration}
                  onChange={(e) => setOverrideCutDuration(Number(e.target.value))}
                  className="w-full accent-accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-text-muted">
                  <span>0.8s (Ultra-Rapid)</span>
                  <span>1.6s (Balanced)</span>
                  <span>3.5s (Unhurried)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Additional Negative Constraints */}
          <div className="p-4 rounded bg-card border border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                3. Additional Project Negative Guards (Banned Elements)
              </span>
              <span className="text-[10px] text-text-muted">
                {additionalConstraints.length} active custom rules
              </span>
            </div>

            {/* List of custom constraints */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {additionalConstraints.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-app border border-subtle text-xs text-text-primary"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">✕</span>
                    {rule}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(idx)}
                    className="p-1 rounded text-text-muted hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Input to add new rule */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. No competitor logos or red discount banners..."
                value={newConstraintInput}
                onChange={(e) => setNewConstraintInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddConstraint()}
                className="flex-1 p-2 bg-app border border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary"
              />
              <button
                type="button"
                onClick={handleAddConstraint}
                className="flex items-center gap-1 px-3 py-2 bg-surface hover:bg-subtle/50 text-text-primary font-semibold text-xs rounded-lg border border-subtle transition"
              >
                <Plus className="w-3.5 h-3.5 text-accent-primary" />
                <span>Add Guard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-subtle bg-surface">
          <span className="text-[11px] text-text-muted">
            Compiles resolved tokens into portable <code className="text-text-primary">STYLE.md</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCascadingStyles}
              disabled={isApplying}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-accent-primary hover:opacity-90 text-app font-bold text-xs shadow-lg transition disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Styles...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Project (`STYLE.md`)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

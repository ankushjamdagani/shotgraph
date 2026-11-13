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

  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:3030/api/styles/presets')
        .then((res) => res.json())
        .then((presets) => {
          if (Array.isArray(presets)) {
            setStylePresets(presets);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddConstraint = () => {
    if (!newConstraintInput.trim()) return;
    setAdditionalConstraints((prev) => [...prev, newConstraintInput.trim()]);
    setNewConstraintInput('');
  };

  const handleRemoveConstraint = (index: number) => {
    setAdditionalConstraints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyCascadingStyles = async () => {
    setIsApplying(true);
    setErrorMsg('');

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/style/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basePresetId: selectedBasePresetId,
          styleOverrides: {
            palette: { accent: overrideAccent },
            typography: { displayFont: overrideDisplayFont },
            pacing: { avgCutDurationSec: overrideCutDuration },
          },
          additionalConstraints,
          applyToProject: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resolve cascading styles');
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

      const res = await fetch('http://localhost:3030/api/styles/presets', {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0B0F19] border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Taste & Cascading Style System
              </h2>
              <p className="text-xs text-slate-400">
                Global Presets + Local Overrides + Project Negative Constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {/* 1. Global Base Preset */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-sky-400" />
                <span>1. Global Base Preset (Inherited Defaults)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowSavePresetInput(!showSavePresetInput)}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Current Look as New Preset...</span>
              </button>
            </div>

            {showSavePresetInput && (
              <div className="p-3 mb-3 bg-[#111827] border border-sky-500/40 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New Preset Name (e.g. Acme Tech Vibrant)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-[#0B0F19] border border-slate-700 rounded-lg text-xs text-white"
                />
                <button
                  onClick={handleSaveAsGlobalPreset}
                  disabled={isSavingPreset || !newPresetName.trim()}
                  className="px-3 py-1.5 bg-sky-500 text-slate-950 font-bold text-xs rounded-lg transition disabled:opacity-50"
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
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
                        : 'bg-[#111827] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{sp.name}</span>
                        <div
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: sp.tokens.palette.accent }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                        {sp.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Project-Level Local Overrides */}
          <div className="p-4 rounded-xl bg-[#0E1526] border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                2. Project Local Overrides (Selective Customization)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Overrides preset for this project only
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              {/* Accent Color Override */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Brand Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={overrideAccent}
                    onChange={(e) => setOverrideAccent(e.target.value)}
                    className="flex-1 p-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Display Font Override */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Display Headings Font</label>
                <select
                  value={overrideDisplayFont}
                  onChange={(e) => setOverrideDisplayFont(e.target.value)}
                  className="w-full p-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white"
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
                  <label className="text-[11px] text-slate-400">Target Cut Cadence</label>
                  <span className="font-mono text-sky-400 font-bold">{overrideCutDuration}s</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={3.5}
                  step={0.1}
                  value={overrideCutDuration}
                  onChange={(e) => setOverrideCutDuration(Number(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>0.8s (Ultra-Rapid)</span>
                  <span>1.6s (Balanced)</span>
                  <span>3.5s (Unhurried)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Additional Negative Constraints */}
          <div className="p-4 rounded-xl bg-[#0E1526] border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                3. Additional Project Negative Guards (Banned Elements)
              </span>
              <span className="text-[10px] text-slate-400">
                {additionalConstraints.length} active custom rules
              </span>
            </div>

            {/* List of custom constraints */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {additionalConstraints.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#111827] border border-slate-800 text-xs text-slate-300"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">✕</span>
                    {rule}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveConstraint(idx)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
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
                className="flex-1 p-2 bg-[#111827] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddConstraint}
                className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Guard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0F172A]/70">
          <span className="text-[11px] text-slate-500">
            Compiles resolved tokens into portable <code className="text-slate-400">STYLE.md</code>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCascadingStyles}
              disabled={isApplying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
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

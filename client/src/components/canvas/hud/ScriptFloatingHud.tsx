import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Volume2, Pin, X, Check, Loader2, Headphones, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../../../services/toastService.js';

interface ScriptFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const ScriptFloatingHud: React.FC<ScriptFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
  isPinned,
  onTogglePin,
}) => {
  const [dialogueText, setDialogueText] = useState(node.prompt || '');
  const [actionText, setActionText] = useState(node.artifacts?.textContent || '');
  const [selectedSpeaker, setSelectedSpeaker] = useState(
    node.boundSubjectAnchorIds?.[0] || 'subj_anya'
  );
  const [voicePreset, setVoicePreset] = useState('narrator_daniel');
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Earshot Foley & Acoustic Cues State
  const [isGeneratingFoley, setIsGeneratingFoley] = useState(false);
  const [audioPlan, setAudioPlan] = useState<any>(node.artifacts?.metadata?.foleyPlan || null);
  const [showFoleyDetails, setShowFoleyDetails] = useState(false);

  const subjects = project.subjectAnchors || [];

  const audioSrc = node.artifacts?.audioUrl
    ? `http://localhost:3030/media/${node.artifacts.audioUrl}`
    : node.artifacts?.mediaUrl?.endsWith('.wav')
    ? `http://localhost:3030/media/${node.artifacts.mediaUrl}`
    : null;

  const handleSaveBeat = async () => {
    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: dialogueText,
          boundSubjectAnchorIds: [selectedSpeaker],
          artifacts: {
            ...node.artifacts,
            textContent: actionText,
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
        setIsSaved(true);
        toast.success('Script dialogue beat saved');
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err: any) {
      console.error('Failed to update script beat:', err);
      toast.error('Failed to save script beat');
    }
  };

  const handleSynthesizeKokoro = async () => {
    const textToSpeak = dialogueText.trim() || actionText.trim();
    if (!textToSpeak) {
      toast.warning('Please enter dialogue text before generating voiceover');
      return;
    }

    setIsSynthesizingVoice(true);
    try {
      const res = await fetch(
        `http://localhost:3030/api/projects/${project.id}/nodes/${node.id}/synthesize-voice`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voicePreset,
          }),
        }
      );
      const data = await res.json();
      if (data.success && data.node) {
        onUpdateProject({
          ...project,
          nodes: {
            ...project.nodes,
            [node.id]: data.node,
          },
        });
        toast.success(`Generated voice stem (${data.durationSec}s)`);
      } else {
        toast.error(data.error || 'Voice synthesis failed');
      }
    } catch (err: any) {
      console.error('Voice synthesis error:', err);
      toast.error(err.message || 'Voice synthesis service failed');
    } finally {
      setIsSynthesizingVoice(false);
    }
  };

  const handleGenerateFoley = async () => {
    const sceneDesc = actionText.trim() || dialogueText.trim() || 'Anya in architectural studio space';
    setIsGeneratingFoley(true);
    try {
      const res = await fetch('http://localhost:3030/api/skills/earshot/audio-cues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneDescription: sceneDesc,
          dialogueText: dialogueText.trim(),
          durationSec: 5,
        }),
      });
      const data = await res.json();
      if (data.success && data.audioPlan) {
        setAudioPlan(data.audioPlan);
        setShowFoleyDetails(true);
        toast.success(`Earshot generated ${data.audioPlan.foleyCues?.length || 0} foley cues & ambience bed`);

        // Save into node artifacts metadata
        const updatedArtifacts = {
          ...node.artifacts,
          metadata: {
            ...(node.artifacts?.metadata || {}),
            foleyPlan: data.audioPlan,
          },
        };
        fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifacts: updatedArtifacts }),
        }).then((r) => r.json()).then((d) => {
          if (d.success && d.node) {
            onUpdateProject({
              ...project,
              nodes: {
                ...project.nodes,
                [node.id]: d.node,
              },
            });
          }
        }).catch(() => {});
      } else {
        toast.error('Could not generate Earshot foley cues');
      }
    } catch (err: any) {
      console.error('Earshot error:', err);
      toast.error('Earshot foley generation failed');
    } finally {
      setIsGeneratingFoley(false);
    }
  };

  return (
    <div className="w-88 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold font-mono text-accent-primary">Screenplay & Voiceover HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-card text-accent-primary border border-subtle font-mono font-bold">
            IN-PLACE
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1 rounded text-xs transition ${isPinned ? 'text-amber-400 bg-card' : 'text-text-muted hover:text-text-primary'}`}
              title={isPinned ? 'Unpin HUD' : 'Pin HUD Open'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action & Scene Setting */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
          Scene Visual Action
        </label>
        <textarea
          rows={2}
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          placeholder="e.g. Anya walks across concrete atrium in morning light..."
          className="w-full p-2 rounded-xl bg-card border border-subtle text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary font-mono resize-none leading-relaxed"
        />
      </div>

      {/* Spoken Dialogue Line */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
          Spoken Dialogue / Voiceover Line
        </label>
        <textarea
          rows={2}
          value={dialogueText}
          onChange={(e) => setDialogueText(e.target.value)}
          placeholder="e.g. 'Style isn't what is added. It's what cannot be stripped away.'"
          className="w-full p-2 rounded-xl bg-card border border-subtle text-xs text-accent-primary placeholder:text-text-muted/60 focus:outline-none focus:border-accent-primary font-mono resize-none leading-relaxed italic"
        />
      </div>

      {/* Speaker Casting & Voice Artist Selection */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">Speaker Cast</label>
          <select
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
            className="w-full p-1.5 rounded-lg bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary cursor-pointer truncate"
          >
            {subjects.length > 0 ? (
              subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            ) : (
              <>
                <option value="subj_anya">Anya</option>
                <option value="subj_marcus">Marcus</option>
                <option value="narrator">Narrator</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">Voice Artist</label>
          <select
            value={voicePreset}
            onChange={(e) => setVoicePreset(e.target.value)}
            className="w-full p-1.5 rounded-lg bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary cursor-pointer truncate"
          >
            <option value="narrator_daniel">Daniel (Doc)</option>
            <option value="presenter_eddy">Eddy (US Lead)</option>
            <option value="presenter_flo">Flo (Narrative)</option>
            <option value="presenter_aman">Aman (Global)</option>
          </select>
        </div>
      </div>

      {/* Earshot Foley Sound Design (Leonxlnx/earshot + explainroo) */}
      <div className="p-2.5 rounded-xl bg-card border border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Headphones className="w-3.5 h-3.5 text-accent-primary" />
            <span className="text-[10px] font-bold font-mono text-text-primary uppercase tracking-wide">
              Earshot Foley Engine
            </span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-surface text-accent-primary font-mono border border-subtle">
              v1.0
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerateFoley}
            disabled={isGeneratingFoley}
            className="px-2 py-0.5 rounded-md bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-[10px] font-mono font-bold flex items-center gap-1 transition"
          >
            {isGeneratingFoley ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            <span>{isGeneratingFoley ? 'Analyzing...' : 'Generate Cues'}</span>
          </button>
        </div>

        {audioPlan ? (
          <div className="space-y-1.5 text-[9px] font-mono">
            <div className="p-1.5 rounded-lg bg-surface/80 border border-subtle text-text-muted">
              <span className="text-text-primary font-bold">Bed:</span> {audioPlan.ambienceBed}
            </div>

            <button
              type="button"
              onClick={() => setShowFoleyDetails(!showFoleyDetails)}
              className="w-full flex items-center justify-between text-text-muted hover:text-text-primary pt-0.5"
            >
              <span>{audioPlan.foleyCues?.length || 0} Foley Hitpoints</span>
              {showFoleyDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showFoleyDetails && audioPlan.foleyCues && (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                {audioPlan.foleyCues.map((c: any, i: number) => (
                  <div key={i} className="p-1 rounded bg-surface/50 border border-subtle/50 flex items-center justify-between">
                    <span className="text-accent-primary font-bold">{c.timecode}</span>
                    <span className="text-text-primary truncate mx-1">{c.soundType}</span>
                    <span className="text-[8px] text-text-muted shrink-0">{c.intensity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[9px] font-mono text-text-muted/70 italic">
            Procedural acoustic scene analysis & cut-synced foley cues ready to generate.
          </div>
        )}
      </div>

      {/* Audio Stem Preview Player if Generated */}
      {audioSrc && (
        <div className="p-2.5 rounded-xl bg-card border border-subtle space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Volume2 className="w-3.5 h-3.5" /> Spoken Stem Ready
            </span>
          </div>
          <audio controls src={audioSrc} className="w-full h-7 rounded-lg" />
        </div>
      )}

      {/* Action Triggers */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        <button
          onClick={handleSaveBeat}
          className="px-3 py-1.5 rounded-lg bg-card hover:bg-subtle/50 text-text-primary border border-subtle text-xs font-bold font-mono transition flex items-center gap-1"
        >
          {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
          <span>{isSaved ? 'Saved' : 'Save Beat'}</span>
        </button>

        <button
          onClick={handleSynthesizeKokoro}
          disabled={isSynthesizingVoice || (!dialogueText.trim() && !actionText.trim())}
          className="px-3 py-1.5 rounded-xl bg-accent-primary hover:opacity-90 disabled:opacity-50 text-app font-bold text-xs flex items-center gap-1.5 shadow-md transition font-mono"
        >
          {isSynthesizingVoice ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          <span>{isSynthesizingVoice ? 'Synthesizing...' : 'Generate Voice 🔊'}</span>
        </button>
      </div>
    </div>
  );
};

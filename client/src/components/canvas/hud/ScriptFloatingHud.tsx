import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Volume2, Pin, X, Check } from 'lucide-react';

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
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const subjects = project.subjectAnchors || [];

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
        setTimeout(() => setIsSaved(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update script beat:', err);
    }
  };

  const handleSynthesizeKokoro = async () => {
    setIsSynthesizingVoice(true);
    // Simulate offline Kokoro speech generation (0 API keys)
    setTimeout(async () => {
      setIsSynthesizingVoice(false);
      try {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artifacts: {
              ...node.artifacts,
              mediaUrl: `assets/voice/${node.id}_kokoro_voice.wav`,
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
      } catch (e) {
        console.error(e);
      }
    }, 1200);
  };

  return (
    <div className="w-84 rounded-2xl bg-surface/95 backdrop-blur-xl border border-subtle shadow-2xl p-4 text-text-primary space-y-3 z-30 select-none animate-in fade-in zoom-in-95 duration-150 ring-1 ring-subtle">
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

      {/* Speaker Casting Dropdown */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">Speaker Cast</label>
          <select
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
            className="w-full p-1.5 rounded-lg bg-card border border-subtle text-xs text-text-primary font-mono focus:outline-none focus:border-accent-primary cursor-pointer"
          >
            {subjects.length > 0 ? (
              subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))
            ) : (
              <>
                <option value="subj_anya">Anya (Lead Presenter)</option>
                <option value="subj_marcus">Marcus (Co-Star)</option>
                <option value="narrator">Neutral Voiceover Narrator</option>
              </>
            )}
          </select>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSaveBeat}
            className="px-3 py-1.5 rounded-lg bg-card hover:bg-subtle/50 text-text-primary border border-subtle text-xs font-bold font-mono transition flex items-center gap-1"
          >
            {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
            <span>{isSaved ? 'Saved' : 'Save Beat'}</span>
          </button>
        </div>
      </div>

      {/* Local Kokoro Speech Synthesis Trigger (0 API keys) */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        <div className="text-[10px] font-mono text-text-muted">
          Engine: <span className="text-text-primary font-bold">Kokoro (Local TTS)</span>
        </div>
        <button
          onClick={handleSynthesizeKokoro}
          disabled={isSynthesizingVoice || !dialogueText.trim()}
          className="px-3 py-1.5 rounded-xl bg-accent-primary hover:opacity-90 disabled:opacity-50 text-app font-bold text-xs flex items-center gap-1.5 shadow-md transition font-mono"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>{isSynthesizingVoice ? 'Synthesizing...' : 'Generate Voice 🔊'}</span>
        </button>
      </div>
    </div>
  );
};

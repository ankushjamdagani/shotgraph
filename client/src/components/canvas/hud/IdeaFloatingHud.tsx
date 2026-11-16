import { apiFetch } from '../../../services/api';
import React, { useState } from 'react';
import { VersionNode, FilmProject } from '../../../types.js';
import { Lightbulb, Copy, Check, X, Sparkles } from 'lucide-react';

interface IdeaFloatingHudProps {
  node: VersionNode;
  project: FilmProject;
  onUpdateProject: (updated: FilmProject) => void;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const IdeaFloatingHud: React.FC<IdeaFloatingHudProps> = ({
  node,
  project,
  onUpdateProject,
  onClose,
}) => {
  const [promptText, setPromptText] = useState(node.prompt || '');
  const [thesisText, setThesisText] = useState(node.artifacts?.textContent || '');
  const [copied, setCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [audience, setAudience] = useState('creative_pro');
  const [tone, setTone] = useState('high_energy');

  const handleSaveIdea = async () => {
    try {
      const res = await apiFetch(`/api/projects/${project.id}/nodes/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          artifacts: {
            ...node.artifacts,
            textContent: thesisText,
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
      console.error('Failed to update idea:', err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Idea Premise:\n${promptText}\n\nThesis:\n${thesisText}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-96 rounded-2xl bg-surface/95 backdrop-blur-xl border border-amber-500/80 shadow-2xl p-4 text-text-primary space-y-3.5 z-30 select-none animate-in fade-in zoom-in-95 duration-150">
      {/* HUD Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-2">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold font-mono text-amber-300">Creative Ideation & Premise HUD</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
            STAGE 1
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

      {/* Idea Prompt Input */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1 flex items-center justify-between">
          <span>Creative Concept & Story Hook</span>
          <span className="text-[9px] text-text-muted">{promptText.length} chars</span>
        </label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          rows={3}
          placeholder="Describe your raw concept, core conflict, and opening visual gesture..."
          className="w-full p-2.5 rounded-xl bg-card border border-subtle text-xs text-text-primary font-sans leading-relaxed focus:border-amber-400 focus:outline-none resize-none transition"
        />
      </div>

      {/* Narrative Thesis & Audience */}
      <div>
        <label className="block text-[10px] uppercase font-mono text-text-muted mb-1">
          Narrative Thesis & Audience Angles
        </label>
        <textarea
          value={thesisText}
          onChange={(e) => setThesisText(e.target.value)}
          rows={2}
          placeholder="Key audience takeaway, core problem, emotional arc..."
          className="w-full p-2 rounded-xl bg-card border border-subtle text-[11px] text-text-primary font-mono leading-relaxed focus:border-amber-400 focus:outline-none resize-none transition"
        />
      </div>

      {/* Audience & Tone Calibration */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <label className="block text-[9px] uppercase text-text-muted mb-1">Target Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full p-1.5 rounded-lg bg-card border border-subtle text-[10px] text-text-primary focus:outline-none"
          >
            <option value="creative_pro">Creative Pros & Trendsetters</option>
            <option value="gen_z">TikTok / Gen Z (Ultra Fast)</option>
            <option value="b2b_saas">High-Intent B2B Buyers</option>
            <option value="luxury">Luxury & Premium Consumer</option>
          </select>
        </div>
        <div>
          <label className="block text-[9px] uppercase text-text-muted mb-1">Tone & Pacing</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full p-1.5 rounded-lg bg-card border border-subtle text-[10px] text-text-primary focus:outline-none"
          >
            <option value="high_energy">⚡ High Energy Punchy (3s Hook)</option>
            <option value="cinematic">🎬 Slow-Burn Cinematic</option>
            <option value="conversational">🎙️ Casual & Authentic</option>
            <option value="suspense">👁️ Mystery / Tension Build</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between gap-2">
        <button
          onClick={handleCopy}
          className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-subtle text-text-muted hover:text-text-primary text-[10px] font-mono font-medium flex items-center gap-1 border border-subtle transition"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy Premise'}</span>
        </button>

        <button
          onClick={handleSaveIdea}
          className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-md transition"
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 fill-black" />}
          <span>{isSaved ? 'Saved to Project' : 'Commit Idea ⚡'}</span>
        </button>
      </div>
    </div>
  );
};

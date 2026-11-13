import React, { useState } from 'react';
import { VersionNode, ModelEngine } from '../../types.js';
import { Sparkles, Copy, Check, Sliders, Terminal, Cpu } from 'lucide-react';

interface A2UIInspectorProps {
  node: VersionNode | null;
  onUpdatePrompt: (nodeId: string, newPrompt: string) => void;
  onExecuteSkill: (skillId: string, modelEngine: ModelEngine, input: any) => Promise<void>;
  streamingLog: string;
}

export const A2UIInspector: React.FC<A2UIInspectorProps> = ({
  node,
  onUpdatePrompt,
  onExecuteSkill,
  streamingLog,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<ModelEngine>(node?.modelEngine || 'antigravity-cli');
  const [targetPlatform, setTargetPlatform] = useState<'midjourney' | 'flux' | 'kling' | 'runway' | 'elevenlabs'>('midjourney');
  const [promptText, setPromptText] = useState(node?.prompt || '');
  const [refinementInput, setRefinementInput] = useState('');
  const [overshoot, setOvershoot] = useState(15);
  const [surfaceStyle, setSurfaceStyle] = useState('liquid_glass');
  const [isExecuting, setIsExecuting] = useState(false);

  React.useEffect(() => {
    if (node) {
      setSelectedEngine(node.modelEngine);
      setPromptText(node.prompt);
    }
  }, [node]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs p-6 text-center">
        <Sliders className="w-8 h-8 mb-2 text-slate-600" />
        Select a node in the Version Tree to inspect parameters, switch models, and tune creative knobs.
      </div>
    );
  }

  const handleCopyExternalPrompt = () => {
    const externalPrompt = `${node.prompt}, ${surfaceStyle} visual style, cinematic lighting, photorealistic 8k detail --ar 9:16 --v 6.1`;
    navigator.clipboard.writeText(externalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunGeneration = async () => {
    setIsExecuting(true);
    try {
      await onExecuteSkill('skill-beat-scriptwriter', selectedEngine, {
        selectedHook: promptText,
        targetDurationSec: 30,
        topicOrProduct: promptText,
        keyPoints: ['Speed', 'Simplicity', 'Power'],
        callToAction: 'Try it free',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border-l border-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#0A0D14]/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
            {node.stage} Inspector
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
            {node.versionLabel}
          </span>
        </div>
        <div className="text-sm font-bold text-white truncate">{node.title}</div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* 1. Model Engine Selector */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Model Runner (Zero API Key)
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'antigravity-cli', label: 'Antigravity CLI', desc: 'Default powerful assistant' },
              { id: 'claude-cli', label: 'Claude CLI', desc: 'Creative motion graphics' },
              { id: 'ollama', label: 'Local Ollama', desc: '100% offline' },
              { id: 'hyperframes', label: 'HyperFrames', desc: 'TTS & Video engine' },
            ].map((engine) => (
              <button
                key={engine.id}
                onClick={() => setSelectedEngine(engine.id as ModelEngine)}
                className={`p-2 rounded-lg text-left border transition ${
                  selectedEngine === engine.id
                    ? 'bg-sky-950/60 border-sky-500 text-white shadow-sm'
                    : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold leading-none mb-1">{engine.label}</div>
                <div className="text-[10px] text-slate-400">{engine.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Prompt Editor */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Active Generation Prompt
          </label>
          <textarea
            value={promptText}
            onChange={(e) => {
              setPromptText(e.target.value);
              onUpdatePrompt(node.id, e.target.value);
            }}
            rows={3}
            className="w-full p-2.5 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition resize-none font-mono"
            placeholder="Describe what to generate for this step..."
          />
        </div>

        {/* 3. Turn the Knobs (A2UI Controls) */}
        <div className="p-3.5 rounded-xl bg-[#111726]/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Turn the Knobs</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Motion Overshoot</span>
              <span className="font-mono text-sky-400">{overshoot}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={overshoot}
              onChange={(e) => setOvershoot(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Surface Treatment</label>
            <select
              value={surfaceStyle}
              onChange={(e) => setSurfaceStyle(e.target.value)}
              className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="liquid_glass">Liquid Glass (Frosted Blur)</option>
              <option value="kinetic_type">Kinetic Type (High Contrast)</option>
              <option value="editorial_grain">Editorial Grain (Paper & Serif)</option>
              <option value="pop_bold">Pop Bold (Neon & Chunky Borders)</option>
            </select>
          </div>
        </div>

        {/* 4. External Prompt Synthesizer Fallback */}
        <div className="p-3.5 rounded-xl bg-[#111726]/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">Copy Prompt for Elsewhere</span>
            <select
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value as any)}
              className="px-2 py-0.5 rounded bg-[#0A0D14] border border-slate-800 text-[10px] text-slate-300"
            >
              <option value="midjourney">Midjourney</option>
              <option value="flux">Flux</option>
              <option value="kling">Kling</option>
              <option value="runway">Runway</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Auto-injects your project's exact camera lens, lighting, and palette rules.
          </p>
          <button
            onClick={handleCopyExternalPrompt}
            className="w-full py-2 px-3 rounded-lg bg-[#0A0D14] border border-slate-700 hover:border-sky-400 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-sky-400" />}
            {copied ? 'Copied with Style Tokens!' : `Copy for ${targetPlatform.toUpperCase()}`}
          </button>
        </div>

        {/* 5. Plain-English Refinement ("Say what feels off") */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Say what feels off
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="e.g. Make hook bigger, remove zoom at 00:03..."
              className="flex-1 p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
            <button
              onClick={handleRunGeneration}
              disabled={isExecuting}
              className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              Apply
            </button>
          </div>
        </div>

        {/* 6. Live Streaming Terminal Drawer */}
        {streamingLog && (
          <div className="rounded-xl bg-[#070A0F] border border-slate-800 p-3 font-mono text-[10px] text-emerald-400 overflow-hidden">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1.5 border-b border-slate-800/60 pb-1">
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>Live Agent Thought Stream</span>
            </div>
            <div className="max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-300">
              {streamingLog}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

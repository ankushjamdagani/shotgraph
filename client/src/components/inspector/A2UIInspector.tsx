import React, { useState, useEffect, useMemo } from 'react';
import { VersionNode, FilmProject, ModelEngine, ProjectSubjectAnchor } from '../../types.js';
import {
  Sparkles,
  Copy,
  Check,
  Sliders,
  Terminal,
  Cpu,
  Camera,
  Film,
  User,
  Clock,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  ShieldCheck,
  Star,
  Wand2,
} from 'lucide-react';

interface A2UIInspectorProps {
  node: VersionNode | null;
  project?: FilmProject | null;
  onUpdateProject?: (updated: FilmProject) => void;
  onUpdatePrompt: (nodeId: string, newPrompt: string) => void;
  onExecuteSkill: (skillId: string, modelEngine: ModelEngine, input: any) => Promise<void>;
  onOpenSubjectManager?: () => void;
  onMediaDrop?: (nodeId: string, file: File) => void;
  streamingLog: string;
}

export const A2UIInspector: React.FC<A2UIInspectorProps> = ({
  node,
  project,
  onUpdateProject,
  onUpdatePrompt,
  onExecuteSkill,
  onOpenSubjectManager,
  onMediaDrop,
  streamingLog,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<ModelEngine>(node?.modelEngine || 'antigravity-cli');
  const [targetPlatform, setTargetPlatform] = useState<
    'runway' | 'kling' | 'luma' | 'minimax' | 'comfyui' | 'flux' | 'midjourney' | 'elevenlabs'
  >('runway');
  const [promptText, setPromptText] = useState(node?.prompt || '');
  const [refinementInput, setRefinementInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisCache, setSynthesisCache] = useState<any>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Derive scene timing & context
  const currentScene = useMemo(() => {
    if (!project || !node || !node.sceneId) return null;
    return project.scenes.find((s) => s.id === node.sceneId);
  }, [project, node]);

  const sceneDuration = currentScene?.targetDurationSec || 4;

  // Active overrides from node
  const overrides = node?.shotContextOverrides || {};
  const lens = overrides.lensFocalLength || '35mm';
  const aperture = overrides.aperture || 'f/1.8';
  const cameraMove = overrides.cameraMovement || 'slow_dolly_in';
  const motionSpeed = overrides.motionSpeed || 'slow_cinematic';
  const boundAnchorIds = node?.boundSubjectAnchorIds || [];

  const projectSubjects: ProjectSubjectAnchor[] = project?.subjectAnchors || [];

  // Update prompt on node change
  useEffect(() => {
    if (node) {
      setSelectedEngine(node.modelEngine);
      setPromptText(node.prompt);
      setSynthesisCache(null);
    }
  }, [node?.id]);

  // Auto-synthesize when platform or parameters change for Shot nodes
  const triggerSynthesize = async (platform = targetPlatform) => {
    if (!project || !node) return;
    setIsSynthesizing(true);
    try {
      if (node.stage === 'assets') {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/assets/synthesize-turnaround`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectName: node.title,
            coreDescription: node.prompt,
            turnaroundAngle: node.assetMetadata?.turnaroundAngle || 'portrait',
            targetPlatform: platform === 'flux' || platform === 'comfyui' ? platform : 'midjourney',
          }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setSynthesisCache({
            finalPrompt: data.result.synthesizedPrompt,
            copyableFullString: data.result.fullString,
            negativePrompt: data.result.negativeGuards,
            injectedStyleTokens: data.result.styleTokensInjected,
          });
        }
      } else {
        const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}/synthesize-prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPlatform: platform }),
        });
        const data = await res.json();
        if (data.success && data.result) {
          setSynthesisCache(data.result);
          if (data.node && onUpdateProject) {
            onUpdateProject({
              ...project,
              nodes: {
                ...project.nodes,
                [node.id]: data.node,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to synthesize prompt:', err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Trigger initial synthesis on node selection if not cached
  useEffect(() => {
    if (node && project && !synthesisCache && !isSynthesizing) {
      triggerSynthesize(targetPlatform);
    }
  }, [node?.id, targetPlatform]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs p-6 text-center">
        <Sliders className="w-8 h-8 mb-2 text-slate-600" />
        Select a node in the Version Tree to inspect parameters, switch models, and tune creative knobs.
      </div>
    );
  }

  // Handle Shot Overrides update
  const handleUpdateOverride = async (key: string, value: string) => {
    if (!project || !node) return;
    const newOverrides = {
      ...(node.shotContextOverrides || {}),
      [key]: value,
    };

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}/shot-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: newOverrides }),
      });
      const data = await res.json();
      if (data.success && onUpdateProject) {
        onUpdateProject({
          ...project,
          nodes: {
            ...project.nodes,
            [node.id]: data.node,
          },
        });
        setTimeout(() => triggerSynthesize(targetPlatform), 100);
      }
    } catch (err) {
      console.error('Failed to update shot override:', err);
    }
  };

  // Toggle Master Style Anchor on an Asset Node
  const handleToggleMasterStyleAnchor = async () => {
    if (!project || !node) return;
    const isCurrentlyAnchor = node.assetMetadata?.isMasterStyleAnchor;
    const newAssetUrl = isCurrentlyAnchor ? undefined : (node.artifacts.mediaUrl || `assets/subjects/${node.id}.png`);

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/assets/master-style-anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetUrl: newAssetUrl, nodeId: isCurrentlyAnchor ? null : node.id }),
      });
      const data = await res.json();
      if (data.success && onUpdateProject) {
        onUpdateProject(data.project);
      }
    } catch (err) {
      console.error('Failed to toggle master style anchor:', err);
    }
  };

  // Toggle bound subject anchor
  const handleToggleAnchor = async (subjectId: string) => {
    if (!project || !node) return;
    const currentBound = node.boundSubjectAnchorIds || [];
    const newBound = currentBound.includes(subjectId)
      ? currentBound.filter((id) => id !== subjectId)
      : [...currentBound, subjectId];

    try {
      const res = await fetch(`http://localhost:3030/api/projects/${project.id}/nodes/${node.id}/subject-bindings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectAnchorIds: newBound }),
      });
      const data = await res.json();
      if (data.success && onUpdateProject) {
        onUpdateProject({
          ...project,
          nodes: {
            ...project.nodes,
            [node.id]: data.node,
          },
        });
        setTimeout(() => triggerSynthesize(targetPlatform), 100);
      }
    } catch (err) {
      console.error('Failed to toggle subject anchor binding:', err);
    }
  };

  // Copy Platform Prompt
  const handleCopyPrompt = () => {
    const textToCopy =
      synthesisCache?.allPlatformPrompts?.[targetPlatform]?.fullString ||
      synthesisCache?.copyableFullString ||
      node.prompt;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy reference image URL
  const handleCopyImageUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedImage(true);
    setTimeout(() => setCopiedImage(false), 2000);
  };

  // Plain-English refinement execution
  const handleRunGeneration = async () => {
    setIsExecuting(true);
    try {
      await onExecuteSkill('skill-beat-scriptwriter', selectedEngine, {
        selectedHook: promptText,
        targetDurationSec: sceneDuration,
        topicOrProduct: refinementInput || promptText,
        keyPoints: ['Speed', 'Simplicity', 'Power'],
        callToAction: 'Try it free',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Video Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (onMediaDrop) {
        onMediaDrop(node.id, file);
      }
    }
  };

  const activePromptDetail = synthesisCache?.allPlatformPrompts?.[targetPlatform];
  const refImages = activePromptDetail?.referenceImageUrls || synthesisCache?.referenceImageUrls || [];
  const isAssetMode = node.stage === 'assets';
  const isVfxMode = node.stage === 'vfx';

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border-l border-slate-800 overflow-y-auto">
      {/* 1. Header */}
      <div className="p-4 border-b border-slate-800/80 bg-[#0A0D14]/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            {isAssetMode ? <User className="w-3.5 h-3.5 text-purple-400" /> : isVfxMode ? <Wand2 className="w-3.5 h-3.5 text-orange-400" /> : <Camera className="w-3.5 h-3.5 text-sky-400" />}
            {isAssetMode ? 'Subject Asset Studio' : isVfxMode ? 'VFX & Overlay Compositor' : 'Shot Director & Inspector'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
            {node.versionLabel}
          </span>
        </div>
        <div className="text-sm font-bold text-white truncate">{node.title}</div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* ======================================================== */}
        {/* A. ASSET MODE (When node.stage === 'assets') */}
        {/* ======================================================== */}
        {isAssetMode ? (
          <div className="space-y-4">
            {/* Master Style Anchor Parity Banner */}
            <div className={`p-3 rounded border flex flex-col gap-2 ${
              node.assetMetadata?.isMasterStyleAnchor
                ? 'bg-purple-950/40 border-purple-500/80'
                : project?.masterStyleAnchorAssetUrl
                ? 'bg-sky-950/30 border-sky-500/60'
                : 'bg-[#111726] border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Star className={`w-3.5 h-3.5 ${node.assetMetadata?.isMasterStyleAnchor ? 'fill-purple-400 text-purple-400' : 'text-slate-400'}`} />
                  {node.assetMetadata?.isMasterStyleAnchor ? '⭐️ Project Master Style Anchor' : 'Style Parity Lock'}
                </span>
                <button
                  onClick={handleToggleMasterStyleAnchor}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                    node.assetMetadata?.isMasterStyleAnchor
                      ? 'bg-purple-500 text-slate-950 border-purple-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  {node.assetMetadata?.isMasterStyleAnchor ? 'Active Style Anchor' : 'Set as Style Anchor'}
                </button>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {node.assetMetadata?.isMasterStyleAnchor
                  ? 'This asset defines the visual DNA, camera lens, lighting, and film grain for all subsequent characters, boys, and products in this film.'
                  : project?.masterStyleAnchorAssetUrl
                  ? `Locked to Master Style Anchor (${project.masterStyleAnchorAssetUrl}). Prompt automatically receives --sref and IP-Adapter reference to guarantee 100% style parity.`
                  : 'Generate and approve this asset to designate it as the Master Style Anchor for the rest of your cast and products.'}
              </p>
            </div>

            {/* Turnaround Angle Selector */}
            <div className="p-3.5 rounded bg-[#111726]/80 border border-slate-800 space-y-2">
              <label className="block text-[10px] uppercase font-mono text-slate-400">
                Turnaround Angle & Framing
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'portrait', label: 'Studio Portrait (50mm)', desc: 'Direct eye-contact, f/1.8' },
                  { id: 'three_quarter', label: '3/4 Profile (35mm)', desc: 'Side profile & jawline' },
                  { id: 'full_body', label: 'Full Stance (35mm)', desc: 'Complete wardrobe & stance' },
                  { id: 'macro_detail', label: 'Macro Texture (85mm)', desc: 'Close texture & fabric' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      if (node.assetMetadata) node.assetMetadata.turnaroundAngle = a.id as any;
                      triggerSynthesize(targetPlatform);
                    }}
                    className={`p-2 rounded-lg text-left border transition ${
                      (node.assetMetadata?.turnaroundAngle || 'portrait') === a.id
                        ? 'bg-purple-950/60 border-purple-500 text-white'
                        : 'bg-[#0A0D14] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold leading-none mb-1">{a.label}</div>
                    <div className="text-[10px] text-slate-400">{a.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Synthesized Asset Prompt Card */}
            <div className="p-3.5 rounded bg-[#111726]/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Locked Turnaround Prompt
                </span>
                <button
                  onClick={() => triggerSynthesize(targetPlatform)}
                  disabled={isSynthesizing}
                  className="text-[10px] font-mono text-purple-400 hover:text-purple-300 disabled:opacity-50"
                >
                  {isSynthesizing ? 'Locking...' : 'Re-synthesize'}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-[#070A0F] border border-slate-800 font-mono text-xs text-slate-200 select-all leading-relaxed">
                {synthesisCache?.copyableFullString || synthesisCache?.finalPrompt || 'Synthesizing locked turnaround prompt...'}
              </div>

              <button
                onClick={handleCopyPrompt}
                className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied with --sref Style Lock!' : 'Copy for Midjourney / Flux / ComfyUI'}
              </button>
            </div>

            {/* Turnaround Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded border-2 border-dashed transition text-center cursor-pointer ${
                isDraggingOver
                  ? 'bg-purple-950/40 border-purple-400 text-white'
                  : 'bg-[#0A0D14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-purple-400" />
              <div className="text-xs font-semibold text-slate-200">Drop Generated PNG Turnaround Here</div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Automatically attaches to this version and preserves into <code className="font-mono text-slate-300">assets/subjects/</code>.
              </p>
            </div>
          </div>
        ) : isVfxMode ? (
          /* ======================================================== */
          /* B. VFX & OVERLAY MODE (When node.stage === 'vfx') */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="p-3 rounded bg-orange-950/30 border border-orange-500/60 text-xs text-orange-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-white">
                <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                Track V2: Alpha Overlays & Motion Graphics
              </div>
              <p className="text-[11px] text-slate-300">
                Layered on top of base video shots. Exported as transparent ProRes 4444 MOV in DaVinci Resolve bundle.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#111726]/80 border border-slate-800 space-y-3">
              <label className="block text-[10px] uppercase font-mono text-slate-400">
                Overlay Category
              </label>
              <select
                value={node.vfxMetadata?.overlayType || 'kinetic_text'}
                onChange={(e) => {
                  node.vfxMetadata = { ...(node.vfxMetadata || { inPointSec: 0, durationSec: 2 }), overlayType: e.target.value as any };
                  onUpdateProject && onUpdateProject({ ...project!, nodes: { ...project!.nodes, [node.id]: node } });
                }}
                className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500"
              >
                <option value="kinetic_text">Kinetic Typography (Animated Text / Stat Counter)</option>
                <option value="ui_mockup">UI Mockup & Isometric Device Frame</option>
                <option value="callout_badge">Callout Badge / Feature Pointer</option>
                <option value="atmospheric_vfx">Atmospheric VFX (Light Leak / Film Burn / Particles)</option>
              </select>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    In-Point (Sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={node.vfxMetadata?.inPointSec || 0}
                    onChange={(e) => {
                      node.vfxMetadata = { ...(node.vfxMetadata || { durationSec: 2, overlayType: 'kinetic_text' }), inPointSec: Number(e.target.value) };
                      onUpdateProject && onUpdateProject({ ...project!, nodes: { ...project!.nodes, [node.id]: node } });
                    }}
                    className="w-full p-2 rounded bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Duration (Sec)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={node.vfxMetadata?.durationSec || 2}
                    onChange={(e) => {
                      node.vfxMetadata = { ...(node.vfxMetadata || { inPointSec: 0, overlayType: 'kinetic_text' }), durationSec: Number(e.target.value) };
                      onUpdateProject && onUpdateProject({ ...project!, nodes: { ...project!.nodes, [node.id]: node } });
                    }}
                    className="w-full p-2 rounded bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Alpha Overlay Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded border-2 border-dashed transition text-center cursor-pointer ${
                isDraggingOver
                  ? 'bg-orange-950/40 border-orange-400 text-white'
                  : 'bg-[#0A0D14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-orange-400" />
              <div className="text-xs font-semibold text-slate-200">Drop Alpha ProRes 4444 MOV / PNG Here</div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Attached directly as Track V2 transparent overlay.
              </p>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* C. SHOT & SCENE DIRECTOR MODE (Default Video Stage) */
          /* ======================================================== */
          <>
            {/* Live Context Badges Bar */}
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded bg-[#0A0D14] border border-slate-800/80 text-[10px] font-mono">
              <div className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-sky-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" />
                <span>{sceneDuration}s Duration</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                <Film className="w-3 h-3 text-amber-400" />
                <span>{project?.aspectRatio || '9:16'} ({project?.fps || 30} FPS)</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1">
                <Camera className="w-3 h-3 text-purple-400" />
                <span>{lens} {aperture}</span>
              </div>
              <div className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>2-Layer Guards</span>
              </div>
            </div>

            {/* Interactive Shot Director Knobs */}
            <div className="p-3.5 rounded bg-[#111726]/80 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Camera & Optics Overrides</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Scene {currentScene?.order || 1}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Focal Length */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Focal Length
                  </label>
                  <select
                    value={lens}
                    onChange={(e) => handleUpdateOverride('lensFocalLength', e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="24mm">24mm (Wide Establishing)</option>
                    <option value="35mm">35mm (Cinematic Natural)</option>
                    <option value="50mm">50mm (Portrait Crisp)</option>
                    <option value="85mm">85mm (Compressed Macro)</option>
                  </select>
                </div>

                {/* Aperture */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Aperture & Depth
                  </label>
                  <select
                    value={aperture}
                    onChange={(e) => handleUpdateOverride('aperture', e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="f/1.4">f/1.4 (Dreamy Bokeh)</option>
                    <option value="f/1.8">f/1.8 (Soft Natural Defocus)</option>
                    <option value="f/2.8">f/2.8 (Sharp Subject & Depth)</option>
                    <option value="f/4">f/4 (Deep Field Detail)</option>
                  </select>
                </div>

                {/* Camera Movement */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Camera Movement
                  </label>
                  <select
                    value={cameraMove}
                    onChange={(e) => handleUpdateOverride('cameraMovement', e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="slow_dolly_in">Slow Dolly In</option>
                    <option value="smooth_tracking_pan">Smooth Tracking Pan</option>
                    <option value="crane_up">Crane / Pedestal Up</option>
                    <option value="orbit">Orbit Around Subject</option>
                    <option value="static_lock">Static Tripod Lock</option>
                  </select>
                </div>

                {/* Motion Speed */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                    Motion Speed
                  </label>
                  <select
                    value={motionSpeed}
                    onChange={(e) => handleUpdateOverride('motionSpeed', e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="slow_cinematic">Slow Cinematic</option>
                    <option value="normal">Normal Speed</option>
                    <option value="high_energy">Dynamic High Energy</option>
                    <option value="time_lapse">Time Lapse</option>
                  </select>
                </div>
              </div>

              {/* Subject Anchors Binding Selector */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-sky-400" />
                    Bound Subject Anchors
                  </label>
                  {onOpenSubjectManager && (
                    <button
                      onClick={onOpenSubjectManager}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 transition flex items-center gap-0.5"
                    >
                      Manage Roster <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {projectSubjects.length === 0 ? (
                  <div className="p-2 rounded-lg bg-[#0A0D14] border border-dashed border-slate-800 text-[11px] text-slate-400 text-center">
                    No subjects defined.{' '}
                    {onOpenSubjectManager && (
                      <button onClick={onOpenSubjectManager} className="text-sky-400 underline">
                        Add project anchors
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {projectSubjects.map((sub) => {
                      const isBound = boundAnchorIds.includes(sub.id);
                      const activeVar = sub.variants.find((v) => v.id === sub.activeVariantId) || sub.variants[0];
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleToggleAnchor(sub.id)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 border transition ${
                            isBound
                              ? 'bg-sky-500/15 border-sky-500 text-sky-300 font-bold'
                              : 'bg-[#0A0D14] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isBound ? 'bg-sky-400' : 'bg-slate-600'}`} />
                          <span>{sub.name}</span>
                          {activeVar && <span className="text-[9px] opacity-75">({activeVar.label})</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Platform-Tailored Synthesizer Tabs */}
            <div className="p-3.5 rounded bg-[#111726]/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Model-Tailored Prompt Synthesizer
                </span>
                <button
                  onClick={() => triggerSynthesize(targetPlatform)}
                  disabled={isSynthesizing}
                  className="text-[10px] font-mono text-sky-400 hover:text-sky-300 disabled:opacity-50"
                >
                  {isSynthesizing ? 'Synthesizing...' : 'Re-synthesize'}
                </button>
              </div>

              {/* Platform Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[#070A0F] border border-slate-800 text-[10px] font-mono">
                {[
                  { id: 'runway', label: 'Runway Gen-3' },
                  { id: 'kling', label: 'Kling 1.5' },
                  { id: 'luma', label: 'Luma' },
                  { id: 'minimax', label: 'Minimax' },
                  { id: 'comfyui', label: 'ComfyUI' },
                  { id: 'flux', label: 'Flux Still' },
                  { id: 'midjourney', label: 'Midjourney' },
                  { id: 'elevenlabs', label: 'ElevenLabs' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setTargetPlatform(p.id as any);
                      triggerSynthesize(p.id as any);
                    }}
                    className={`py-1 px-1.5 rounded text-center truncate transition ${
                      targetPlatform === p.id
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Live Prompt Output Preview */}
              <div className="p-2.5 rounded-lg bg-[#070A0F] border border-slate-800/80 font-mono text-xs text-slate-200 space-y-2">
                <div className="text-[10px] text-slate-400 flex items-center justify-between border-b border-slate-800/60 pb-1">
                  <span>{activePromptDetail?.platform || targetPlatform.toUpperCase()} PROMPT</span>
                  <span className="text-sky-400">{sceneDuration}s • {project?.aspectRatio}</span>
                </div>
                <div className="text-[11px] leading-relaxed select-all text-slate-100 max-h-36 overflow-y-auto">
                  {activePromptDetail?.prompt || synthesisCache?.finalPrompt || 'Synthesizing prompt...'}
                </div>

                {/* Negative Guards Box */}
                {(activePromptDetail?.negativePrompt || synthesisCache?.negativePrompt) &&
                  ['kling', 'comfyui', 'flux', 'midjourney'].includes(targetPlatform) && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <div className="text-[9px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">
                        Two-Layer Negative Guards
                      </div>
                      <div className="text-[10px] text-rose-300/80 line-clamp-2 select-all">
                        {activePromptDetail?.negativePrompt || synthesisCache?.negativePrompt}
                      </div>
                    </div>
                  )}
              </div>

              {/* Active Reference Image for Image-to-Video models */}
              {refImages.length > 0 && ['runway', 'kling', 'luma', 'flux', 'midjourney'].includes(targetPlatform) && (
                <div className="p-2 rounded-lg bg-[#0A0D14] border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-[10px] font-mono truncate">{refImages[0]}</span>
                  </div>
                  <button
                    onClick={() => handleCopyImageUrl(refImages[0])}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 transition"
                  >
                    {copiedImage ? 'Copied Path!' : 'Copy Asset Path'}
                  </button>
                </div>
              )}

              {/* Copy Prompt Button */}
              <button
                onClick={handleCopyPrompt}
                className="w-full py-2 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied with Rich Context & Tokens!' : `Copy for ${targetPlatform.toUpperCase()}`}
              </button>
            </div>

            {/* In-Inspector Video Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded border-2 border-dashed transition text-center cursor-pointer ${
                isDraggingOver
                  ? 'bg-sky-950/40 border-sky-400 text-white'
                  : 'bg-[#0A0D14]/60 border-slate-800/80 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Upload className="w-5 h-5 mx-auto mb-1.5 text-sky-400" />
              <div className="text-xs font-semibold text-slate-200">Drop Rendered Video Here</div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Target duration: <span className="font-mono text-sky-400">{sceneDuration}s</span>. Auto-launches trimmer if length differs.
              </p>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* COMMON SECTIONS (Prompt Editor, Model Engine, Streaming) */}
        {/* ======================================================== */}

        {/* Active Generation Concept */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Active Generation Concept / Prompt
          </label>
          <textarea
            value={promptText}
            onChange={(e) => {
              setPromptText(e.target.value);
              onUpdatePrompt(node.id, e.target.value);
            }}
            rows={2}
            className="w-full p-2.5 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition resize-none font-mono"
            placeholder="Describe what to generate for this step..."
          />
        </div>

        {/* Model Engine Runner Selector */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Model Runner (Zero Cloud API Keys)
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

        {/* Plain-English Refinement ("Say what feels off") */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Say what feels off
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="e.g. Make hook bigger, add punch-in zoom..."
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

        {/* Live Streaming Terminal Drawer */}
        {streamingLog && (
          <div className="rounded bg-[#070A0F] border border-slate-800 p-3 font-mono text-[10px] text-emerald-400 overflow-hidden">
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

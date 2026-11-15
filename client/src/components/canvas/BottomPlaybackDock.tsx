import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FilmProject } from '../../types.js';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  Film,
  ChevronUp,
  ChevronDown,
  Volume2,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Layers,
  Scissors,
  Code,
} from 'lucide-react';
import { toast } from '../../services/toastService.js';

interface BottomPlaybackDockProps {
  project: FilmProject;
  onUpdateProject?: (updated: FilmProject) => void;
  onFocusScene?: (sceneId: string) => void;
  onSetActiveCut?: (sceneId: string, nodeId: string) => void;
  onOpenDaVinciExport?: () => void;
}

// Generate deterministic audio waveform bars for a given seed string
function getWaveformBars(seedStr: string, count = 24): number[] {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    // Harmonic envelope simulating dialogue bursts and dynamic audio
    const baseEnvelope = Math.sin(t * Math.PI) * 0.45 + 0.25;
    const pseudo = Math.abs(Math.sin((hash + i * 31) * 0.23)) * 0.45;
    const detail = Math.abs(Math.cos((i * 17 + hash) * 0.37)) * 0.2;
    const val = Math.min(1, Math.max(0.12, (baseEnvelope + pseudo + detail) * 0.85));
    bars.push(Number(val.toFixed(3)));
  }
  return bars;
}

// High-precision SMPTE timecode breakdown helper (HH:MM:SS:FF)
function getSMPTEComponents(sec: number, fps = 30) {
  const safeSec = Math.max(0, sec);
  const totalFrames = Math.floor(safeSec * fps);
  const ff = String(totalFrames % fps).padStart(2, '0');
  const ss = String(Math.floor(safeSec) % 60).padStart(2, '0');
  const mm = String(Math.floor(safeSec / 60) % 60).padStart(2, '0');
  const hh = String(Math.floor(safeSec / 3600)).padStart(2, '0');
  return {
    hh,
    mm,
    ss,
    ff,
    formatted: `${hh}:${mm}:${ss}:${ff}`,
    totalFrames,
  };
}

export const BottomPlaybackDock: React.FC<BottomPlaybackDockProps> = ({
  project,
  onUpdateProject,
  onFocusScene,
  onSetActiveCut,
  onOpenDaVinciExport,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editNameDraft, setEditNameDraft] = useState('');
  const [editDurationDraft, setEditDurationDraft] = useState(5);
  const [activeCutDropdownSceneId, setActiveCutDropdownSceneId] = useState<string | null>(null);

  // Scrubber drag & hover state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);

  const [isExportingBlender, setIsExportingBlender] = useState(false);

  const handleExportBlender = useCallback(async () => {
    setIsExportingBlender(true);
    try {
      const res = await fetch('http://localhost:3030/api/export/blender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success) {
        navigator.clipboard.writeText(data.cliCommand);
        toast.success('Exported Blender script! Command copied to clipboard.');
      } else {
        toast.error('Blender export failed');
      }
    } catch (err) {
      console.error('Blender export failed:', err);
      toast.error('Failed to connect to export service');
    } finally {
      setIsExportingBlender(false);
    }
  }, [project.id]);

  const fps = project.fps || 30;
  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0) || 30;

  // Precompute scene time boundaries
  const sceneTimeRanges = useMemo(() => {
    let accumulated = 0;
    return project.scenes.map((scene) => {
      const startSec = accumulated;
      accumulated += scene.targetDurationSec;
      return {
        scene,
        startSec,
        endSec: accumulated,
      };
    });
  }, [project.scenes]);

  // Find currently active scene under playhead
  let activeScene = project.scenes[0];
  for (const range of sceneTimeRanges) {
    if (currentSec >= range.startSec && currentSec <= range.endSec) {
      activeScene = range.scene;
      break;
    }
  }

  // Active cut node for current active scene
  const activeCutNodeId = activeScene ? project.activeCut?.[activeScene.id] : null;
  const activeCutNode = activeCutNodeId ? project.nodes[activeCutNodeId] : null;

  // Frame-stepping controls
  const stepFrame = useCallback(
    (direction: -1 | 1) => {
      setIsPlaying(false);
      setCurrentSec((prev) => {
        const currentFrame = Math.round(prev * fps);
        const nextFrame = Math.max(
          0,
          Math.min(Math.floor(totalDuration * fps), currentFrame + direction)
        );
        return nextFrame / fps;
      });
    },
    [fps, totalDuration]
  );

  const handleReturnToStart = useCallback(() => {
    setIsPlaying(false);
    setCurrentSec(0);
  }, []);

  const handleGoToEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentSec(totalDuration);
  }, [totalDuration]);

  // Spacebar and transport keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowLeft' || e.key === ',') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.code === 'ArrowRight' || e.key === '.') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleReturnToStart();
      } else if (e.code === 'End') {
        e.preventDefault();
        handleGoToEnd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stepFrame, handleReturnToStart, handleGoToEnd]);

  // Playback timer tick
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const updatePlayhead = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      setCurrentSec((prev) => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(updatePlayhead);
    };

    animFrameRef.current = requestAnimationFrame(updatePlayhead);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalDuration]);

  // Scrubber drag / click calculation
  const calculateTimeFromEvent = useCallback(
    (clientX: number): number => {
      if (!scrubberTrackRef.current) return 0;
      const rect = scrubberTrackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * totalDuration;
    },
    [totalDuration]
  );

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const newSec = calculateTimeFromEvent(e.clientX);
    setCurrentSec(newSec);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newSec = calculateTimeFromEvent(e.clientX);
      setCurrentSec(newSec);
    };
    const handleMouseUp = () => {
      setIsScrubbing(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, calculateTimeFromEvent]);

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberTrackRef.current) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setHoverSec(ratio * totalDuration);
    setHoverPos(x);
  };

  const handleScrubberMouseLeave = () => {
    setHoverSec(null);
    setHoverPos(null);
  };

  // Click a scene to jump to its in-point and pan canvas to that scene
  const handleSceneClick = (scene: (typeof project.scenes)[0], startSec: number) => {
    setCurrentSec(startSec);
    if (onFocusScene) {
      onFocusScene(scene.id);
    }
  };

  // Add Scene
  const handleAddScene = async () => {
    const newSceneId = `scene_${Math.random().toString(36).slice(2, 7)}`;
    const newOrder = project.scenes.length + 1;
    const newScene = {
      id: newSceneId,
      name: `Scene ${newOrder}: New Beat`,
      order: newOrder,
      targetDurationSec: 5,
    };

    const updatedScenes = [...project.scenes, newScene];
    const updatedProject = {
      ...project,
      scenes: updatedScenes,
    };

    if (onUpdateProject) {
      onUpdateProject(updatedProject);
    }

    try {
      await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: updatedScenes }),
      });
      toast.success(`Added ${newScene.name}`);
    } catch {
      // Local fallback
    }
  };

  // Commit Scene Edit
  const handleCommitSceneEdit = async (sceneId: string) => {
    const updatedScenes = project.scenes.map((s) => {
      if (s.id === sceneId) {
        return {
          ...s,
          name: editNameDraft.trim() || s.name,
          targetDurationSec: Math.max(1, Number(editDurationDraft) || s.targetDurationSec),
        };
      }
      return s;
    });

    const updatedProject = { ...project, scenes: updatedScenes };
    if (onUpdateProject) onUpdateProject(updatedProject);

    try {
      await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: updatedScenes }),
      });
      toast.success('Scene updated');
    } catch {
      // Local fallback
    }
    setEditingSceneId(null);
  };

  // Delete Scene
  const handleDeleteScene = async (sceneId: string) => {
    if (project.scenes.length <= 1) {
      toast.warning('A project must have at least one scene');
      return;
    }
    const updatedScenes = project.scenes.filter((s) => s.id !== sceneId);
    const updatedProject = { ...project, scenes: updatedScenes };
    if (onUpdateProject) onUpdateProject(updatedProject);

    try {
      await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: updatedScenes }),
      });
      toast.success('Scene removed');
    } catch {
      // Local fallback
    }
    setEditingSceneId(null);
  };

  // Reorder Scene Left/Right
  const handleMoveScene = async (sceneIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? sceneIndex - 1 : sceneIndex + 1;
    if (targetIndex < 0 || targetIndex >= project.scenes.length) return;

    const newScenes = [...project.scenes];
    const temp = newScenes[sceneIndex];
    newScenes[sceneIndex] = newScenes[targetIndex];
    newScenes[targetIndex] = temp;

    // Update order numbers
    newScenes.forEach((s, idx) => (s.order = idx + 1));

    const updatedProject = { ...project, scenes: newScenes };
    if (onUpdateProject) onUpdateProject(updatedProject);

    try {
      await fetch(`http://localhost:3030/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes: newScenes }),
      });
      toast.success('Timeline order updated');
    } catch {}
  };

  // Nodes for Cut selection
  const getNodesForScene = (sceneId: string) => {
    return Object.values(project.nodes).filter((n) => n.sceneId === sceneId);
  };

  const currentTimecode = getSMPTEComponents(currentSec, fps);
  const totalTimecode = getSMPTEComponents(totalDuration, fps);

  return (
    <div className="border-t border-subtle bg-surface/95 backdrop-blur-xl shrink-0 select-none shadow-2xl transition-all">
      {/* Precision DaVinci / Final Cut Transport Scrubber Track */}
      <div
        ref={scrubberTrackRef}
        onMouseDown={handleScrubberMouseDown}
        onMouseMove={handleScrubberMouseMove}
        onMouseLeave={handleScrubberMouseLeave}
        className="relative w-full h-8 bg-card/80 hover:bg-card/95 cursor-pointer border-b border-subtle select-none overflow-hidden group transition-colors"
      >
        {/* Proportional Scene Blocks */}
        <div className="absolute inset-0 flex h-full">
          {sceneTimeRanges.map(({ scene }, idx) => {
            const widthPct = (scene.targetDurationSec / (totalDuration || 1)) * 100;
            const isCurrentScene = activeScene?.id === scene.id;
            const cutNodeId = project.activeCut?.[scene.id];
            const cutNode = cutNodeId ? project.nodes[cutNodeId] : null;
            const versionLabel = cutNode?.versionLabel || 'v1.0';
            const isLast = idx === sceneTimeRanges.length - 1;
            const waveformBars = getWaveformBars(scene.id, 24);

            return (
              <div
                key={scene.id}
                style={{ width: `${widthPct}%` }}
                className={`relative h-full flex flex-col justify-between px-2 py-0.5 transition-colors ${
                  isCurrentScene
                    ? 'bg-accent-primary/10'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Scene Meta Bar: Short Name & Version Badge */}
                <div className="flex items-center justify-between z-10 pointer-events-none gap-1">
                  <span className="text-[9px] font-mono font-medium text-text-muted/90 truncate">
                    {scene.name.replace(/^Scene\s*\d+:?\s*/i, `SC ${String(idx + 1).padStart(2, '0')} `)}
                  </span>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-black/50 border border-subtle text-text-muted shrink-0 font-semibold">
                    {versionLabel}
                  </span>
                </div>

                {/* Audio Waveform Ghost Indicator */}
                <div className="absolute inset-x-0 bottom-0 h-4 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity overflow-hidden flex items-end px-1">
                  <svg
                    className="w-full h-full text-accent-primary"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 20"
                  >
                    {waveformBars.map((h, bIdx) => (
                      <rect
                        key={bIdx}
                        x={bIdx * 4.1 + 0.5}
                        y={20 - h * 17}
                        width={2.2}
                        height={h * 17}
                        rx={0.8}
                        fill="currentColor"
                      />
                    ))}
                  </svg>
                </div>

                {/* Clear Cut Boundary Marker (Edit Point Razor & Notches) */}
                {!isLast && (
                  <div className="absolute right-0 top-0 bottom-0 w-px bg-subtle/90 pointer-events-none z-10">
                    {/* Top edit point tick */}
                    <div className="absolute top-0 -right-[2px] w-[5px] h-[3px] bg-subtle/90 rounded-b-xs" />
                    {/* Bottom edit point tick */}
                    <div className="absolute bottom-0 -right-[2px] w-[5px] h-[3px] bg-subtle/90 rounded-t-xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Playhead Progress Elapsed Fill */}
        <div
          style={{ width: `${(currentSec / (totalDuration || 1)) * 100}%` }}
          className="absolute inset-y-0 left-0 bg-accent-primary/10 pointer-events-none border-r border-accent-primary/40"
        />

        {/* Precision Playhead Needle & Scrubber Head */}
        <div
          style={{ left: `${(currentSec / (totalDuration || 1)) * 100}%` }}
          className="absolute inset-y-0 -ml-[1px] w-[2px] bg-accent-primary pointer-events-none z-20 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
        >
          {/* DaVinci Resolve Diamond / Flag Scrubber Head */}
          <div className="absolute -top-0.5 -left-[4px] w-2.5 h-2.5 bg-accent-primary rotate-45 rounded-[1px] shadow border border-app" />
        </div>

        {/* Hover Guide Needle & Tooltip */}
        {hoverPos !== null && hoverSec !== null && !isScrubbing && (
          <div
            style={{ left: `${hoverPos}px` }}
            className="absolute inset-y-0 w-px bg-white/40 pointer-events-none z-20 -ml-[0.5px]"
          >
            <div className="absolute -top-6 -left-10 px-1.5 py-0.5 rounded bg-surface/95 border border-subtle shadow-xl text-[9px] font-mono text-text-primary whitespace-nowrap tabular-nums">
              {getSMPTEComponents(hoverSec, fps).formatted}
            </div>
          </div>
        )}
      </div>

      {/* Primary Transport Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-mono">
        {/* Playback Controls & High-Precision SMPTE Timecode */}
        <div className="flex items-center gap-3">
          {/* Transport Controls Deck */}
          <div className="flex items-center gap-1 bg-surface/60 p-0.5 rounded border border-subtle/70">
            <button
              onClick={handleReturnToStart}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-subtle active:scale-[0.97] transition-all"
              title="Return to start (Home)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => stepFrame(-1)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-subtle active:scale-[0.97] transition-all"
              title="Step 1 frame back (Left Arrow or ,)"
            >
              <StepBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-8 rounded-lg bg-accent-primary text-app hover:opacity-90 flex items-center justify-center font-bold shadow-sm active:scale-[0.97] transition-all"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 ml-0.5 fill-current" />
              )}
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-subtle active:scale-[0.97] transition-all"
              title="Step 1 frame forward (Right Arrow or .)"
            >
              <StepForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleGoToEnd}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card border border-transparent hover:border-subtle active:scale-[0.97] transition-all"
              title="Go to end (End)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-subtle">|</span>

          {/* Dedicated High-Precision SMPTE Timecode Display */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-subtle/80 shadow-inner font-mono tabular-nums select-text">
            <div className="flex items-center text-xs tracking-wider font-semibold">
              <span className="text-text-primary">{currentTimecode.hh}</span>
              <span className="text-text-muted/40 px-0.5">:</span>
              <span className="text-text-primary">{currentTimecode.mm}</span>
              <span className="text-text-muted/40 px-0.5">:</span>
              <span className="text-text-primary">{currentTimecode.ss}</span>
              <span className="text-text-muted/40 px-0.5">:</span>
              {/* Highlighted SMPTE Frame Box */}
              <span className="px-1.5 py-0.2 ml-0.5 rounded bg-accent-primary/10 text-accent-primary font-bold text-xs border border-accent-primary/20 shadow-xs">
                {currentTimecode.ff}
              </span>
            </div>
            <span className="text-text-muted/30 text-[10px]">/</span>
            <span className="text-text-muted text-[11px] tracking-wide">
              {totalTimecode.formatted}
            </span>
            <span className="ml-1 text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-surface border border-subtle text-text-muted uppercase">
              {fps} FPS
            </span>
          </div>
        </div>

        {/* Current Beat & Active Cut Telemetry */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-accent-primary/60'}`} />
          <span className="text-text-primary font-bold truncate max-w-[240px]">
            {activeScene?.name || 'Scene Sequence'}
          </span>
          {activeCutNode && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-card text-text-muted border border-subtle flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-accent-primary" />
              <span>{activeCutNode.versionLabel}</span>
            </span>
          )}
          <span className="text-[10px] text-text-muted">({project.aspectRatio})</span>
        </div>

        {/* Right Audio VU Meter, Add Scene & DaVinci Export */}
        <div className="flex items-center gap-3">
          {/* Calibrated Audio VU Meter */}
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="tabular-nums">-14 LUFS</span>
            <div className="w-14 h-2 bg-black/40 rounded-sm overflow-hidden flex gap-0.5 p-0.5 border border-subtle">
              <div
                className={`h-full rounded-xs transition-all duration-75 ${
                  isPlaying ? 'bg-emerald-500 w-8' : 'bg-emerald-500/70 w-6'
                }`}
              />
              <div
                className={`h-full rounded-xs transition-all duration-75 ${
                  isPlaying ? 'bg-amber-400 w-3' : 'bg-amber-400/30 w-1'
                }`}
              />
              <div
                className={`h-full rounded-xs transition-all duration-75 ${
                  isPlaying ? 'bg-rose-500/80 w-1' : 'bg-transparent w-1'
                }`}
              />
            </div>
          </div>

          <span className="text-subtle">|</span>

          <button
            onClick={handleAddScene}
            className="px-2.5 py-1 rounded text-xs font-bold bg-card hover:bg-hover border border-subtle text-text-primary flex items-center gap-1 active:scale-[0.97] transition-all"
            title="Add a new scene to timeline"
          >
            <Plus className="w-3.5 h-3.5 text-accent-primary" />
            <span>Scene</span>
          </button>

          {onOpenDaVinciExport && (
            <button
              onClick={onOpenDaVinciExport}
              className="px-3 py-1 rounded text-xs font-bold bg-card hover:bg-hover border border-subtle text-text-primary flex items-center gap-1.5 active:scale-[0.97] transition-all"
              title="Export DaVinci Resolve FCPXML bundle"
            >
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>Export DaVinci</span>
            </button>
          )}

          <button
            onClick={handleExportBlender}
            disabled={isExportingBlender}
            className="px-2.5 py-1 rounded text-xs font-bold bg-card hover:bg-hover border border-subtle text-text-primary flex items-center gap-1.5 active:scale-[0.97] transition-all"
            title="Export Blender 3D Scene Assembly Script"
          >
            <Code className="w-3.5 h-3.5 text-purple-400" />
            <span>{isExportingBlender ? 'Exporting...' : 'Blender'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card active:scale-[0.97] transition-all"
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline Strip'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Track Scene Sequencer Strip */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-subtle flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
          {sceneTimeRanges.map(({ scene, startSec, endSec }, idx) => {
            const isCurrentScene = activeScene?.id === scene.id;
            const cutNodeId = project.activeCut?.[scene.id];
            const cutNode = cutNodeId ? project.nodes[cutNodeId] : null;
            const sceneNodes = getNodesForScene(scene.id);
            const waveformBars = getWaveformBars(scene.id, 20);

            return (
              <React.Fragment key={scene.id}>
                <div
                  style={{ flex: Math.max(1, scene.targetDurationSec) }}
                  onClick={() => handleSceneClick(scene, startSec)}
                  className={`group relative p-2.5 rounded-md border transition-all cursor-pointer min-w-[150px] flex flex-col justify-between overflow-hidden ${
                    isCurrentScene
                      ? 'bg-card border-accent-primary shadow-lg ring-1 ring-accent-primary/30'
                      : 'bg-card/50 border-subtle hover:bg-card hover:border-text-muted'
                  }`}
                >
                  {/* Waveform ghost underlay in clip */}
                  <div className="absolute inset-x-0 bottom-0 h-6 pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity flex items-end px-2">
                    <svg
                      className="w-full h-full text-accent-primary"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 20"
                    >
                      {waveformBars.map((h, bIdx) => (
                        <rect
                          key={bIdx}
                          x={bIdx * 5 + 0.5}
                          y={20 - h * 16}
                          width={2.8}
                          height={h * 16}
                          rx={0.8}
                          fill="currentColor"
                        />
                      ))}
                    </svg>
                  </div>

                  {/* Scene Header */}
                  <div className="flex items-center justify-between mb-1 relative z-10">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[9px] px-1 py-0.2 rounded bg-surface border border-subtle text-text-muted font-bold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-bold text-text-primary truncate">{scene.name}</span>
                    </div>
                    <span className="text-text-muted shrink-0 ml-1 font-mono">{scene.targetDurationSec}s</span>
                  </div>

                  {/* Clip Timecode In / Out */}
                  <div className="flex items-center justify-between text-[8px] text-text-muted/70 font-mono tracking-tight my-0.5 relative z-10">
                    <span>IN {getSMPTEComponents(startSec, fps).formatted.slice(3)}</span>
                    <span>OUT {getSMPTEComponents(endSec, fps).formatted.slice(3)}</span>
                  </div>

                  {/* Cut Info & Reorder Controls */}
                  <div className="flex items-center justify-between text-text-muted mt-1 pt-1 border-t border-subtle/50 relative z-10">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCutDropdownSceneId(
                          activeCutDropdownSceneId === scene.id ? null : scene.id
                        );
                      }}
                      className="flex items-center gap-1 text-[9px] hover:text-text-primary transition truncate active:scale-[0.97]"
                      title="Click to switch active cut node"
                    >
                      <Layers className={`w-3 h-3 ${cutNode ? 'text-accent-primary' : 'text-text-muted'}`} />
                      <span className="font-semibold px-1 py-0.2 rounded bg-surface border border-subtle text-[8px] text-text-primary">
                        {cutNode?.versionLabel || 'v1.0'}
                      </span>
                      <span className="truncate">{cutNode?.title || 'Default'}</span>
                    </div>

                    {/* Quick scene edit button */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSceneId(scene.id);
                          setEditNameDraft(scene.name);
                          setEditDurationDraft(scene.targetDurationSec);
                        }}
                        className="p-1 rounded hover:bg-subtle text-text-muted hover:text-text-primary active:scale-[0.97] transition-all"
                        title="Edit scene name and duration"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>

                      {idx > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveScene(idx, 'left');
                          }}
                          className="p-1 rounded hover:bg-subtle text-text-muted hover:text-text-primary active:scale-[0.97] transition-all"
                          title="Move scene left"
                        >
                          <ArrowLeft className="w-2.5 h-2.5" />
                        </button>
                      )}

                      {idx < project.scenes.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveScene(idx, 'right');
                          }}
                          className="p-1 rounded hover:bg-subtle text-text-muted hover:text-text-primary active:scale-[0.97] transition-all"
                          title="Move scene right"
                        >
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cut Switcher Dropdown Popover */}
                  {activeCutDropdownSceneId === scene.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-12 left-0 w-52 bg-surface border border-subtle rounded shadow-2xl p-1.5 z-40 space-y-1 animate-scale-in"
                    >
                      <div className="text-[9px] font-bold text-text-muted uppercase px-1.5 py-0.5 flex items-center justify-between">
                        <span>Select Active Cut</span>
                        <span className="text-[8px] px-1 rounded bg-card border border-subtle text-text-muted">{sceneNodes.length} takes</span>
                      </div>
                      {sceneNodes.length > 0 ? (
                        sceneNodes.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (onSetActiveCut) onSetActiveCut(scene.id, n.id);
                              setActiveCutDropdownSceneId(null);
                            }}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left text-[10px] transition active:scale-[0.97] ${
                              project.activeCut?.[scene.id] === n.id
                                ? 'bg-accent-primary/10 text-accent-primary font-bold border border-accent-primary/30'
                                : 'text-text-muted hover:text-text-primary hover:bg-card border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="px-1 py-0.2 rounded bg-card text-[8px] font-mono border border-subtle">
                                {n.versionLabel}
                              </span>
                              <span className="truncate">{n.title}</span>
                            </div>
                            {project.activeCut?.[scene.id] === n.id && (
                              <Check className="w-3 h-3 text-accent-primary shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="text-[10px] text-text-muted p-1.5">No version nodes for this scene yet</div>
                      )}
                    </div>
                  )}

                  {/* Inline Scene Edit Popover */}
                  {editingSceneId === scene.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-12 left-0 w-56 bg-surface border border-subtle rounded-md shadow-2xl p-3 z-40 space-y-2.5 animate-scale-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-primary uppercase font-mono">
                          Edit Scene
                        </span>
                        <button
                          onClick={() => setEditingSceneId(null)}
                          className="p-1 rounded text-text-muted hover:text-text-primary active:scale-[0.97] transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted uppercase">Scene Name</label>
                        <input
                          type="text"
                          value={editNameDraft}
                          onChange={(e) => setEditNameDraft(e.target.value)}
                          className="w-full px-2 py-1 bg-card border border-subtle rounded-lg text-[11px] text-text-primary focus:outline-none focus:border-border-focus"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-text-muted uppercase">Duration (Seconds)</label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={editDurationDraft}
                          onChange={(e) => setEditDurationDraft(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-card border border-subtle rounded-lg text-[11px] text-text-primary focus:outline-none focus:border-border-focus"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-subtle">
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-card active:scale-[0.97] transition-all"
                          title="Delete scene"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCommitSceneEdit(scene.id)}
                          className="px-3 py-1 bg-accent-primary text-app rounded-lg text-[10px] font-bold active:scale-[0.97] transition-all"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Point Cut Marker between clips */}
                {idx < sceneTimeRanges.length - 1 && (
                  <div
                    className="flex flex-col items-center justify-center shrink-0 text-text-muted/40 select-none px-0.5 group/joint"
                    title={`Cut Point: ${getSMPTEComponents(endSec, fps).formatted}`}
                  >
                    <div className="w-px h-2 bg-subtle" />
                    <Scissors className="w-2.5 h-2.5 my-0.5 text-text-muted/40 group-hover/joint:text-accent-primary transition-colors" />
                    <div className="w-px h-2 bg-subtle" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { FilmProject } from '../../types.js';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Film,
  ChevronUp,
  ChevronDown,
  Volume2,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Star,
  Check,
  X,
} from 'lucide-react';
import { toast } from '../../services/toastService.js';

interface BottomPlaybackDockProps {
  project: FilmProject;
  onUpdateProject?: (updated: FilmProject) => void;
  onFocusScene?: (sceneId: string) => void;
  onSetActiveCut?: (sceneId: string, nodeId: string) => void;
  onOpenDaVinciExport?: () => void;
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

  const animFrameRef = useRef<number | null>(null);
  const scrubberTrackRef = useRef<HTMLDivElement | null>(null);

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0) || 30;

  // Spacebar play/pause listener
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Format seconds to SMPTE timecode (HH:MM:SS:FF)
  const formatTimecode = (sec: number, fps = project.fps || 30) => {
    const totalFrames = Math.floor(sec * fps);
    const ff = String(totalFrames % fps).padStart(2, '0');
    const ss = String(Math.floor(sec) % 60).padStart(2, '0');
    const mm = String(Math.floor(sec / 60) % 60).padStart(2, '0');
    const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
    return `${hh}:${mm}:${ss}:${ff}`;
  };

  // Find currently active scene under playhead
  let accumulated = 0;
  let activeScene = project.scenes[0];
  for (const s of project.scenes) {
    if (currentSec >= accumulated && currentSec <= accumulated + s.targetDurationSec) {
      activeScene = s;
      break;
    }
    accumulated += s.targetDurationSec;
  }

  // Handle clicking anywhere on the scrubber bar
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubberTrackRef.current) return;
    const rect = scrubberTrackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * totalDuration;
    setCurrentSec(targetTime);
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

  return (
    <div className="border-t border-subtle bg-surface/95 backdrop-blur-xl shrink-0 select-none shadow-2xl transition-all">
      {/* Interactive Global Timecode Scrubber Bar */}
      <div
        ref={scrubberTrackRef}
        onClick={handleScrubberClick}
        className="relative w-full h-2.5 bg-card/80 hover:bg-card cursor-pointer border-b border-subtle group transition"
      >
        {/* Playhead Progress Fill */}
        <div
          style={{ width: `${(currentSec / (totalDuration || 1)) * 100}%` }}
          className="h-full bg-accent-primary opacity-80"
        />

        {/* Playhead Scrubber Needle */}
        <div
          style={{ left: `${(currentSec / (totalDuration || 1)) * 100}%` }}
          className="absolute top-0 w-3 h-3 -mt-0.5 -ml-1.5 rounded-full bg-accent-primary shadow-lg border border-app group-hover:scale-125 transition-transform"
        />
      </div>

      {/* Primary Transport Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs font-mono">
        {/* Playback Controls & Timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentSec(0)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
            title="Return to start (00:00:00:00)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-xl bg-accent-primary text-app hover:opacity-90 flex items-center justify-center font-bold shadow-lg transition"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5 fill-current" />
            )}
          </button>
          <button
            onClick={() => setCurrentSec(totalDuration)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
            title="Go to end"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-subtle">|</span>

          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5">
            <span className="text-text-primary font-bold tracking-wider">
              {formatTimecode(currentSec)}
            </span>
            <span className="text-text-muted">/</span>
            <span className="text-text-muted">{formatTimecode(totalDuration)}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-card text-text-muted border border-subtle">
              {project.fps || 30} FPS
            </span>
          </div>
        </div>

        {/* Current Chapter Beat */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-text-primary font-bold truncate max-w-[280px]">
            {activeScene?.name || 'Scene Sequence'}
          </span>
          <span className="text-[10px] text-text-muted">({project.aspectRatio})</span>
        </div>

        {/* Right Audio Meter, Add Scene & DaVinci Export */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>-15 LUFS</span>
            <div className="w-12 h-1.5 bg-card rounded-full overflow-hidden flex gap-0.5">
              <div className="w-8 h-full bg-emerald-500"></div>
              <div className="w-2 h-full bg-amber-400"></div>
            </div>
          </div>

          <span className="text-subtle">|</span>

          <button
            onClick={handleAddScene}
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-card hover:bg-subtle border border-subtle text-text-primary flex items-center gap-1 transition"
            title="Add a new scene to timeline"
          >
            <Plus className="w-3.5 h-3.5 text-accent-primary" />
            <span>Scene</span>
          </button>

          {onOpenDaVinciExport && (
            <button
              onClick={onOpenDaVinciExport}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-card hover:bg-subtle border border-subtle text-text-primary flex items-center gap-1.5 transition"
            >
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>Export DaVinci</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary transition"
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline Strip'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Multi-Track Scene Sequencer Strip */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 border-t border-subtle flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
          {(() => {
            let startSecTracker = 0;
            return project.scenes.map((scene, idx) => {
              const currentStart = startSecTracker;
              startSecTracker += scene.targetDurationSec;

              const isCurrentScene = activeScene?.id === scene.id;
              const cutNodeId = project.activeCut[scene.id];
              const cutNode = cutNodeId ? project.nodes[cutNodeId] : null;
              const sceneNodes = getNodesForScene(scene.id);

              return (
                <div
                  key={scene.id}
                  style={{ flex: Math.max(1, scene.targetDurationSec) }}
                  onClick={() => handleSceneClick(scene, currentStart)}
                  className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer min-w-[140px] flex flex-col justify-between ${
                    isCurrentScene
                      ? 'bg-card border-accent-primary shadow-lg ring-1 ring-accent-primary/30'
                      : 'bg-card/50 border-subtle hover:bg-card hover:border-text-muted'
                  }`}
                >
                  {/* Scene Header */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-text-primary truncate">{scene.name}</span>
                    <span className="text-text-muted shrink-0 ml-1">{scene.targetDurationSec}s</span>
                  </div>

                  {/* Cut Info & Reorder Controls */}
                  <div className="flex items-center justify-between text-text-muted mt-1 pt-1 border-t border-subtle/50">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCutDropdownSceneId(
                          activeCutDropdownSceneId === scene.id ? null : scene.id
                        );
                      }}
                      className="flex items-center gap-1 text-[9px] hover:text-text-primary transition truncate"
                      title="Click to switch active cut node"
                    >
                      <Star className={`w-2.5 h-2.5 ${cutNode ? 'text-amber-400 fill-amber-400' : 'text-text-muted'}`} />
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
                        className="p-0.5 rounded hover:bg-subtle text-text-muted hover:text-text-primary"
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
                          className="p-0.5 rounded hover:bg-subtle text-text-muted hover:text-text-primary"
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
                          className="p-0.5 rounded hover:bg-subtle text-text-muted hover:text-text-primary"
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
                      className="absolute bottom-12 left-0 w-48 bg-surface border border-subtle rounded-xl shadow-2xl p-1.5 z-40 space-y-1 animate-scale-in"
                    >
                      <div className="text-[9px] font-bold text-text-muted uppercase px-1.5 py-0.5">
                        Select Active Cut
                      </div>
                      {sceneNodes.length > 0 ? (
                        sceneNodes.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => {
                              if (onSetActiveCut) onSetActiveCut(scene.id, n.id);
                              setActiveCutDropdownSceneId(null);
                            }}
                            className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left text-[10px] transition ${
                              project.activeCut[scene.id] === n.id
                                ? 'bg-amber-500/10 text-amber-300 font-bold'
                                : 'text-text-muted hover:text-text-primary hover:bg-card'
                            }`}
                          >
                            <span className="truncate">{n.title}</span>
                            {project.activeCut[scene.id] === n.id && (
                              <Check className="w-3 h-3 text-amber-400 shrink-0" />
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
                      className="absolute bottom-12 left-0 w-56 bg-surface border border-subtle rounded-2xl shadow-2xl p-3 z-40 space-y-2.5 animate-scale-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-primary uppercase font-mono">
                          Edit Scene
                        </span>
                        <button
                          onClick={() => setEditingSceneId(null)}
                          className="p-1 rounded text-text-muted hover:text-text-primary"
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
                          className="w-full px-2 py-1 bg-card border border-subtle rounded-lg text-[11px] text-text-primary focus:outline-none"
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
                          className="w-full px-2 py-1 bg-card border border-subtle rounded-lg text-[11px] text-text-primary focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-subtle">
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-card transition"
                          title="Delete scene"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCommitSceneEdit(scene.id)}
                          className="px-3 py-1 bg-accent-primary text-app rounded-lg text-[10px] font-bold transition"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
};

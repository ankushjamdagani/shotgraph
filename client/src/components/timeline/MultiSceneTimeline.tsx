import React, { useState, useEffect } from 'react';
import { FilmProject } from '../../types.js';
import { Play, Pause, RotateCcw, ShieldAlert, Monitor, Smartphone, Volume2 } from 'lucide-react';

interface MultiSceneTimelineProps {
  project: FilmProject;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const MultiSceneTimeline: React.FC<MultiSceneTimelineProps> = ({
  project,
  selectedNodeId: _selectedNodeId,
  onSelectNode,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [showSafeAreas, setShowSafeAreas] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0) || 30;

  // Playhead timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((t) => {
          if (t >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(t + 0.1, totalDuration);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Determine which scene is active based on playhead
  let runningTime = 0;
  let activeScene = project.scenes[0];
  for (const scene of project.scenes) {
    if (currentTimeSec >= runningTime && currentTimeSec < runningTime + scene.targetDurationSec) {
      activeScene = scene;
      break;
    }
    runningTime += scene.targetDurationSec;
  }

  const activeNodeId = project.activeCut[activeScene.id];
  const activeNode = project.nodes[activeNodeId];

  return (
    <div className="flex flex-col h-full bg-[#0E131F] border-t border-slate-800">
      {/* Upper Deck: Video Preview Screen & Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-[#0A0D14]/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
          </button>
          <button
            onClick={() => setCurrentTimeSec(0)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Reset to 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="font-mono text-xs font-semibold text-slate-300">
            {currentTimeSec.toFixed(1)}s / {totalDuration.toFixed(1)}s
          </div>
        </div>

        {/* Safe Area & Aspect Ratio Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeAreas(!showSafeAreas)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition ${
              showSafeAreas
                ? 'bg-amber-950/40 text-amber-300 border-amber-600/50'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Toggle Instagram / TikTok Safe Areas (170px to 1330px)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Safe Areas {showSafeAreas ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setAspectRatio(aspectRatio === '9:16' ? '16:9' : '9:16')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700 transition"
          >
            {aspectRatio === '9:16' ? <Smartphone className="w-3.5 h-3.5 text-sky-400" /> : <Monitor className="w-3.5 h-3.5 text-sky-400" />}
            {aspectRatio}
          </button>
        </div>
      </div>

      {/* Middle Deck: Preview Box */}
      <div className="flex-1 flex items-center justify-center p-3 overflow-hidden bg-black/40">
        <div
          className={`relative border-2 border-slate-700/80 rounded-2xl overflow-hidden bg-[#0F172A] shadow-2xl transition-all duration-300 flex flex-col items-center justify-center ${
            aspectRatio === '9:16' ? 'w-[200px] h-[355px]' : 'w-[480px] h-[270px]'
          }`}
        >
          {/* Safe Area Guides (Instagram / TikTok) */}
          {showSafeAreas && aspectRatio === '9:16' && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Top 10% protected area */}
              <div className="absolute top-0 inset-x-0 h-[10%] bg-red-500/10 border-b border-dashed border-red-400/40 flex items-center justify-center">
                <span className="text-[8px] font-mono text-red-300">HEADER UI ZONE</span>
              </div>
              {/* Bottom 20% protected area */}
              <div className="absolute bottom-0 inset-x-0 h-[20%] bg-red-500/10 border-t border-dashed border-red-400/40 flex items-center justify-center">
                <span className="text-[8px] font-mono text-red-300">CAPTION & AUDIO ZONE</span>
              </div>
              {/* Right 15% like/comment zone */}
              <div className="absolute top-[10%] bottom-[20%] right-0 w-[15%] bg-red-500/10 border-l border-dashed border-red-400/40 flex items-center justify-center">
                <span className="text-[7px] font-mono text-red-300 rotate-90">BUTTONS</span>
              </div>
            </div>
          )}

          {/* Active Cut Content Display */}
          <div className="text-center px-4 z-10">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 uppercase tracking-wider mb-2 inline-block">
              {activeScene.name}
            </span>
            <div className="text-sm font-extrabold text-white mb-2 leading-tight">
              {activeNode?.title || 'Preview Clip'}
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-3 italic">
              "{activeNode?.artifacts.textContent || 'Spoken line synchronized with motion graphics.'}"
            </p>
          </div>

          <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-400 z-10">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span>-14 LUFS Ducked</span>
          </div>
        </div>
      </div>

      {/* Bottom Deck: Multi-Scene Timeline Tracks */}
      <div className="p-3 border-t border-slate-800 bg-[#0A0D14]">
        {/* Scrubber Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setCurrentTimeSec(pct * totalDuration);
          }}
          className="relative w-full h-2 bg-slate-800 rounded-full cursor-pointer mb-2.5 overflow-hidden"
        >
          <div
            style={{ width: `${(currentTimeSec / totalDuration) * 100}%` }}
            className="h-full bg-sky-400 rounded-full"
          />
        </div>

        {/* Scene Blocks Track */}
        <div className="flex gap-1.5 w-full">
          {project.scenes.map((scene) => {
            const activeId = project.activeCut[scene.id];
            const node = project.nodes[activeId];
            const widthPct = (scene.targetDurationSec / totalDuration) * 100;

            return (
              <div
                key={scene.id}
                style={{ width: `${widthPct}%` }}
                onClick={() => node && onSelectNode(node.id)}
                className="group p-2 rounded-lg bg-[#111726] border border-slate-800 hover:border-sky-500/60 cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {scene.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {scene.targetDurationSec}s
                  </span>
                </div>
                <div className="text-[10px] text-amber-400 font-medium truncate">
                  ★ {node?.versionLabel || 'v1.0'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

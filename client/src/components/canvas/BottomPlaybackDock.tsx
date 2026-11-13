import React, { useState, useEffect, useRef } from 'react';
import { FilmProject } from '../../types.js';
import { Play, Pause, SkipBack, SkipForward, Film, ChevronUp, ChevronDown, Volume2 } from 'lucide-react';

interface BottomPlaybackDockProps {
  project: FilmProject;
  onOpenDaVinciExport?: () => void;
}

export const BottomPlaybackDock: React.FC<BottomPlaybackDockProps> = ({
  project,
  onOpenDaVinciExport,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  const totalDuration = project.scenes.reduce((acc, s) => acc + s.targetDurationSec, 0) || 30;

  // Spacebar play/pause listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
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
    const frames = totalFrames % fps;
    const totalSeconds = Math.floor(sec);
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(
      2,
      '0'
    )}:${String(frames).padStart(2, '0')}`;
  };

  // Determine current active scene
  let accumulated = 0;
  let activeSceneName = project.scenes[0]?.name || 'Scene 1';
  for (const scene of project.scenes) {
    if (currentSec >= accumulated && currentSec < accumulated + scene.targetDurationSec) {
      activeSceneName = scene.name;
      break;
    }
    accumulated += scene.targetDurationSec;
  }

  const progressPercent = Math.min(100, (currentSec / totalDuration) * 100);

  return (
    <div
      className={`w-full bg-[#09090B]/95 backdrop-blur-xl border-t border-[#27272A] z-30 flex flex-col select-none transition-all duration-200 ${
        isExpanded ? 'h-24' : 'h-11'
      }`}
    >
      {/* Top Scrubber Line */}
      <div
        className="w-full h-1 bg-[#18181B] hover:h-2 cursor-pointer transition-all relative group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPercent = (e.clientX - rect.left) / rect.width;
          setCurrentSec(clickPercent * totalDuration);
        }}
      >
        <div
          className="h-full bg-amber-500 relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition"></div>
        </div>
      </div>

      {/* Main Control Bar */}
      <div className="flex-1 px-4 flex items-center justify-between text-xs font-mono">
        {/* Playback Controls & Timecode */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentSec(0)}
            className="p-1 rounded text-[#A1A1AA] hover:text-white transition"
            title="Return to start (00:00:00:00)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-7 h-7 rounded-lg bg-white text-black hover:bg-slate-200 flex items-center justify-center font-bold shadow transition"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5 fill-black" />}
          </button>
          <button
            onClick={() => setCurrentSec(totalDuration)}
            className="p-1 rounded text-[#A1A1AA] hover:text-white transition"
            title="Go to end"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-[#3F3F46]">|</span>

          {/* Timecode Readout */}
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold tracking-wider">{formatTimecode(currentSec)}</span>
            <span className="text-[#71717A]">/</span>
            <span className="text-[#71717A]">{formatTimecode(totalDuration)}</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-[#18181B] text-[#A1A1AA] border border-[#27272A]">
              {project.fps || 30} FPS
            </span>
          </div>
        </div>

        {/* Current Chapter Beat */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="text-white font-bold truncate max-w-[260px]">{activeSceneName}</span>
          <span className="text-[10px] text-[#71717A]">({project.aspectRatio})</span>
        </div>

        {/* Audio Meter & DaVinci Export Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>-15 LUFS</span>
            <div className="w-12 h-1.5 bg-[#18181B] rounded-full overflow-hidden flex gap-0.5">
              <div className="w-8 h-full bg-emerald-500"></div>
              <div className="w-2 h-full bg-amber-400"></div>
            </div>
          </div>

          <span className="text-[#3F3F46]">|</span>

          {onOpenDaVinciExport && (
            <button
              onClick={onOpenDaVinciExport}
              className="px-3 py-1 rounded-lg text-xs font-bold bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-white flex items-center gap-1.5 transition"
            >
              <Film className="w-3.5 h-3.5 text-sky-400" />
              <span>Export DaVinci</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-[#71717A] hover:text-white transition"
            title={isExpanded ? 'Collapse Timeline' : 'Expand Timeline Strip'}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Detailed Track Lane Scrubber */}
      {isExpanded && (
        <div className="px-4 pb-2 pt-1 border-t border-[#18181B] flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono">
          {project.scenes.map((scene) => {
            const cutNodeId = project.activeCut[scene.id];
            const cutNode = cutNodeId ? project.nodes[cutNodeId] : null;
            return (
              <div
                key={scene.id}
                style={{ flex: scene.targetDurationSec }}
                className="p-1.5 rounded-lg bg-[#121215] border border-[#27272A] flex flex-col justify-between truncate"
              >
                <div className="flex items-center justify-between text-[#A1A1AA]">
                  <span className="font-bold text-white truncate">{scene.name}</span>
                  <span>{scene.targetDurationSec}s</span>
                </div>
                <div className="text-[#71717A] truncate mt-0.5">
                  Cut: {cutNode?.title || 'Default'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import * as THREE from 'three';
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Film,
  Code,
  Check,
  Compass,
  Sliders,
} from 'lucide-react';
import { PORT_COLOR_MAP } from '../../../utils/graphTopology.js';
import {
  CameraSplineTrajectory,
  createDefaultTrajectory,
  setupPrevisScene,
} from '../../../utils/three/cameraSpline.js';
import { renderPrevisAnimaticToMP4 } from '../../../utils/three/webCodecsExporter.js';
import {
  generateBlenderCameraScript,
  threeToKlingDelta,
} from '../../../utils/three/coordinateAdapters.js';
import { toast } from '../../../services/toastService.js';

interface PrevisThreeJsNodeProps {
  data: {
    id: string;
    title?: string;
    durationSec?: number;
    initialMoveType?: 'push_in' | 'orbit' | 'crane' | 'dolly_zoom';
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onAnimaticRendered?: (nodeId: string, videoUrl: string) => void;
  };
}

const PrevisThreeJsNodeComponent: React.FC<PrevisThreeJsNodeProps> = ({ data }) => {
  const { id, title = '3D Previs Simulator', durationSec = 3.0, onAnimaticRendered } = data;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [viewMode, setViewMode] = useState<'viewfinder' | 'god_view'>('viewfinder');
  const [moveType, setMoveType] = useState<'push_in' | 'orbit' | 'crane' | 'dolly_zoom'>('push_in');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isCopiedBlender, setIsCopiedBlender] = useState(false);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const trajectoryRef = useRef<CameraSplineTrajectory>(createDefaultTrajectory(moveType, durationSec));

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;

    const width = 320;
    const height = 180;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    setupPrevisScene(scene);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42.5, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    trajectoryRef.current.evaluate(0, camera);
    renderer.render(scene, camera);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
    };
  }, []);

  // Update trajectory when moveType changes
  useEffect(() => {
    trajectoryRef.current = createDefaultTrajectory(moveType, durationSec);
    if (cameraRef.current && sceneRef.current && rendererRef.current) {
      trajectoryRef.current.evaluate(currentTimeSec, cameraRef.current);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [moveType, durationSec, currentTimeSec]);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTimeSec((t) => {
        const next = t + dt;
        if (next >= durationSec) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, durationSec]);

  // Render on time update
  useEffect(() => {
    if (cameraRef.current && sceneRef.current && rendererRef.current) {
      if (viewMode === 'viewfinder') {
        trajectoryRef.current.evaluate(currentTimeSec, cameraRef.current);
      } else {
        // God view orbit
        cameraRef.current.position.set(2.8, 3.2, 3.8);
        cameraRef.current.lookAt(0, 1.0, 0);
        cameraRef.current.fov = 50;
        cameraRef.current.updateProjectionMatrix();
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [currentTimeSec, viewMode]);

  // Render Headless CFR MP4 Animatic Video
  const handleRenderAnimatic = useCallback(async () => {
    if (!sceneRef.current || !cameraRef.current) return;
    setIsRendering(true);
    try {
      const blob = await renderPrevisAnimaticToMP4(
        sceneRef.current,
        cameraRef.current,
        trajectoryRef.current,
        durationSec,
        30,
        640,
        360
      );
      const videoUrl = URL.createObjectURL(blob);
      if (onAnimaticRendered) {
        onAnimaticRendered(id, videoUrl);
      }
      toast.success('Generated 30fps CFR H.264 animatic MP4');
    } catch (err) {
      console.error('Animatic render failed:', err);
      toast.error('Animatic render failed');
    } finally {
      setIsRendering(false);
    }
  }, [id, durationSec, onAnimaticRendered]);

  // Copy Blender Python Script
  const handleCopyBlenderScript = useCallback(() => {
    const script = generateBlenderCameraScript(trajectoryRef.current.keyframes);
    navigator.clipboard.writeText(script);
    setIsCopiedBlender(true);
    toast.success('Copied Blender Python camera script');
    setTimeout(() => setIsCopiedBlender(false), 2000);
  }, []);

  // Copy Kling / Runway Delta Matrix
  const handleCopyKlingDelta = useCallback(() => {
    const kfs = trajectoryRef.current.keyframes;
    if (kfs.length >= 2) {
      const delta = threeToKlingDelta(kfs[kfs.length - 1], kfs[0]);
      navigator.clipboard.writeText(JSON.stringify(delta, null, 2));
      toast.success('Copied Kling/Runway camera delta vector');
    }
  }, []);

  return (
    <div className="relative min-w-[340px] rounded-xl border border-purple-500/40 bg-[#0E0B16]/95 backdrop-blur-md p-3 shadow-2xl transition hover:border-purple-400">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-purple-500/20 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-500/20 text-purple-400">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-purple-200">{title}</h4>
            <span className="text-[10px] text-purple-400/80 font-mono">Three.js Previs Viewfinder</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'viewfinder' ? 'god_view' : 'viewfinder')}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border border-purple-500/30 bg-purple-900/30 text-purple-200 hover:bg-purple-800/40 transition"
        >
          {viewMode === 'viewfinder' ? <Eye className="w-3 h-3" /> : <Compass className="w-3 h-3" />}
          <span>{viewMode === 'viewfinder' ? 'Viewfinder' : 'God View'}</span>
        </button>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black aspect-video mb-2.5">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Viewfinder crosshairs overlay */}
        {viewMode === 'viewfinder' && (
          <div className="absolute inset-0 pointer-events-none border border-white/10 m-3 flex items-center justify-center">
            <div className="w-2 h-2 border-t border-l border-sky-400/80" />
            <div className="w-2 h-2 border-t border-r border-sky-400/80" />
            <div className="w-2 h-2 border-b border-l border-sky-400/80" />
            <div className="w-2 h-2 border-b border-r border-sky-400/80" />
            <span className="absolute bottom-1 right-1 text-[9px] font-mono text-zinc-400 bg-black/60 px-1 rounded">
              35mm f/1.8
            </span>
          </div>
        )}
      </div>

      {/* Scrubber & Controls */}
      <div className="flex items-center gap-2 mb-2 bg-black/40 p-1.5 rounded border border-white/5">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1 rounded bg-purple-600 hover:bg-purple-500 text-white transition"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button
          onClick={() => setCurrentTimeSec(0)}
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Reset"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <input
          type="range"
          min={0}
          max={durationSec}
          step={0.05}
          value={currentTimeSec}
          onChange={(e) => setCurrentTimeSec(parseFloat(e.target.value))}
          className="flex-1 accent-purple-500 h-1 bg-zinc-800 rounded cursor-pointer"
        />
        <span className="text-[10px] font-mono text-zinc-300 w-12 text-right">
          {currentTimeSec.toFixed(1)}s
        </span>
      </div>

      {/* Camera Trajectory Selector */}
      <div className="grid grid-cols-4 gap-1 mb-2.5">
        {(['push_in', 'orbit', 'crane', 'dolly_zoom'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setMoveType(type)}
            className={`text-[9px] font-mono capitalize py-1 rounded border transition ${
              moveType === type
                ? 'bg-purple-600 border-purple-400 text-white font-bold'
                : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Action Footers */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-purple-500/20">
        <button
          onClick={handleRenderAnimatic}
          disabled={isRendering}
          className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-[10px] font-medium text-purple-200 transition"
        >
          <Film className="w-3 h-3 text-purple-300" />
          <span>{isRendering ? 'Rendering MP4...' : 'Render Animatic'}</span>
        </button>

        <button
          onClick={handleCopyBlenderScript}
          className="flex items-center gap-1 py-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] font-mono text-zinc-300 transition"
          title="Copy Blender Python Script"
        >
          {isCopiedBlender ? <Check className="w-3 h-3 text-emerald-400" /> : <Code className="w-3 h-3 text-zinc-400" />}
          <span>Blender.py</span>
        </button>

        <button
          onClick={handleCopyKlingDelta}
          className="flex items-center gap-1 py-1 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] font-mono text-zinc-300 transition"
          title="Copy Kling/Runway Delta Matrix"
        >
          <Sliders className="w-3 h-3 text-sky-400" />
          <span>Kling</span>
        </button>
      </div>

      {/* Typed Input Handles on Left */}
      <div className="group/port">
        <Handle
          type="target"
          position={Position.Left}
          id="in_shot"
          style={{ top: '35%', backgroundColor: PORT_COLOR_MAP.story }}
          className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
        />
        <span className="absolute left-3.5 top-[35%] -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-zinc-900 border border-white/20 text-white shadow-xl pointer-events-none">
          Shot Spec (story)
        </span>
      </div>

      <div className="group/port">
        <Handle
          type="target"
          position={Position.Left}
          id="in_audio"
          style={{ top: '65%', backgroundColor: PORT_COLOR_MAP.audio }}
          className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
        />
        <span className="absolute left-3.5 top-[65%] -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-zinc-900 border border-white/20 text-white shadow-xl pointer-events-none">
          Audio Sync (audio)
        </span>
      </div>

      {/* Typed Output Handles on Right */}
      <div className="group/port">
        <Handle
          type="source"
          position={Position.Right}
          id="out_media"
          style={{ top: '35%', backgroundColor: PORT_COLOR_MAP.media }}
          className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
        />
        <span className="absolute right-3.5 top-[35%] -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-zinc-900 border border-white/20 text-white shadow-xl pointer-events-none">
          Animatic MP4 (media)
        </span>
      </div>

      <div className="group/port">
        <Handle
          type="source"
          position={Position.Right}
          id="out_spatial"
          style={{ top: '65%', backgroundColor: PORT_COLOR_MAP.spatial_3d }}
          className="!w-2.5 !h-2.5 !border !border-black transition-transform hover:!scale-150 !z-30 after:absolute after:-inset-2 after:content-[''] cursor-crosshair"
        />
        <span className="absolute right-3.5 top-[65%] -translate-y-1/2 hidden group-hover/port:inline-block z-50 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap bg-zinc-900 border border-white/20 text-white shadow-xl pointer-events-none">
          Camera Matrix (spatial_3d)
        </span>
      </div>
    </div>
  );
};

export const PrevisThreeJsNode = React.memo(PrevisThreeJsNodeComponent);

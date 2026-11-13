import React, { useState } from 'react';
import {
  MousePointer,
  BoxSelect,
  Hand,
  StickyNote,
  Plus,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  FileText,
  Camera,
  User,
  Video,
  Lightbulb,
  Film,
  Wand2,
} from 'lucide-react';

export type CanvasToolMode = 'select' | 'marquee' | 'pan';

interface FloatingCanvasToolbarProps {
  toolMode: CanvasToolMode;
  onSetToolMode: (mode: CanvasToolMode) => void;
  onAddStickyNote: () => void;
  onAddNode: (stage: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onBeautifyFlow: () => void;
}

export const FloatingCanvasToolbar: React.FC<FloatingCanvasToolbarProps> = ({
  toolMode,
  onSetToolMode,
  onAddStickyNote,
  onAddNode,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onZoomIn,
  onZoomOut,
  onFitView,
  onBeautifyFlow,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="absolute top-16 left-4 z-30 flex flex-col items-center bg-surface/90 backdrop-blur-xl border border-subtle rounded-lg p-1.5 shadow-2xl space-y-1 select-none animate-in fade-in duration-150">
      {/* 1. Selection Tool (V) */}
      <button
        onClick={() => onSetToolMode('select')}
        className={`p-2 rounded transition ${
          toolMode === 'select'
            ? 'bg-accent-primary text-app shadow'
            : 'text-text-muted hover:text-text-primary hover:bg-card'
        }`}
        title="Pointer / Select Tool (V)"
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* 2. Marquee Box Select Tool (S) */}
      <button
        onClick={() => onSetToolMode('marquee')}
        className={`p-2 rounded transition ${
          toolMode === 'marquee'
            ? 'bg-accent-primary text-app shadow'
            : 'text-text-muted hover:text-text-primary hover:bg-card'
        }`}
        title="Area / Box Select Tool (S)"
      >
        <BoxSelect className="w-4 h-4" />
      </button>

      {/* 3. Hand / Pan Tool (H) */}
      <button
        onClick={() => onSetToolMode('pan')}
        className={`p-2 rounded transition ${
          toolMode === 'pan'
            ? 'bg-accent-primary text-app shadow'
            : 'text-text-muted hover:text-text-primary hover:bg-card'
        }`}
        title="Pan Canvas Hand Tool (H)"
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-subtle my-1" />

      {/* 4. Add Node Quick Menu (+) */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={`p-2 rounded transition ${
            showAddMenu
              ? 'bg-accent-primary text-app shadow'
              : 'text-text-muted hover:text-text-primary hover:bg-card'
          }`}
          title="Add Node to Canvas (+)"
        >
          <Plus className="w-4 h-4" />
        </button>

        {showAddMenu && (
          <div className="absolute left-11 top-0 w-52 bg-surface border border-subtle rounded-lg shadow-2xl p-2 z-40 space-y-1 animate-scale-in">
            <div className="text-[10px] font-mono font-bold text-text-muted uppercase px-2 py-1">
              Add Production Node
            </div>

            <button
              onClick={() => {
                onAddNode('script');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Screenplay Beat</span>
            </button>

            <button
              onClick={() => {
                onAddNode('shot');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>Shot & Optics</span>
            </button>

            <button
              onClick={() => {
                onAddNode('assets');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Subject Anchor</span>
            </button>

            <button
              onClick={() => {
                onAddNode('footage');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Video Take Slate</span>
            </button>

            <button
              onClick={() => {
                onAddNode('ideation');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Idea Premise</span>
            </button>

            <button
              onClick={() => {
                onAddNode('vfx');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Wand2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Motion Graphics & VFX</span>
            </button>

            <button
              onClick={() => {
                onAddNode('assembly');
                setShowAddMenu(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded text-xs text-text-primary hover:bg-card hover:text-accent-primary transition text-left"
            >
              <Film className="w-3.5 h-3.5 text-accent-primary" />
              <span>Master Composition</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Sticky Note (N) */}
      <button
        onClick={onAddStickyNote}
        className="p-2 rounded text-text-muted hover:text-amber-400 hover:bg-card transition"
        title="Add Director Sticky Note (N)"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-subtle my-1" />

      {/* 6. Undo / Redo */}
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded text-text-muted hover:text-text-primary hover:bg-card disabled:opacity-30 transition"
          title="Undo (Cmd+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
      )}

      {onRedo && (
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded text-text-muted hover:text-text-primary hover:bg-card disabled:opacity-30 transition"
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      )}

      <div className="w-5 h-[1px] bg-subtle my-1" />

      {/* 7. Zoom & Fit Controls */}
      <button
        onClick={onZoomIn}
        className="p-2 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
        title="Zoom In (Cmd+=)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <button
        onClick={onZoomOut}
        className="p-2 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
        title="Zoom Out (Cmd+-)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        onClick={onFitView}
        className="p-2 rounded text-text-muted hover:text-text-primary hover:bg-card transition"
        title="Fit Canvas to Screen (Shift+1)"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      <div className="w-5 h-[1px] bg-subtle my-1" />

      {/* 8. Beautify Flow (B) */}
      <button
        onClick={onBeautifyFlow}
        className="p-2 rounded text-text-muted hover:text-amber-400 hover:bg-card transition"
        title="Auto-Align DAG Layout (Beautify)"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
      </button>
    </div>
  );
};

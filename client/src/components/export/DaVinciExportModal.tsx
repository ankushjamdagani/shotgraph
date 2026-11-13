import React, { useState } from 'react';
import { X, Film, CheckCircle2, FolderCheck, Loader2 } from 'lucide-react';

interface DaVinciExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  totalDurationSec: number;
}

export const DaVinciExportModal: React.FC<DaVinciExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  totalDurationSec,
}) => {
  const [fps, setFps] = useState<number>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/export/davinci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fps }),
      });
      const data = await res.json();
      setExportResult(data);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-lg bg-surface border border-subtle shadow-2xl p-6 text-text-primary">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Film className="w-4 h-4 text-accent-primary" />
            <span>DaVinci Resolve Multi-Track Export Bundle</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center text-xs text-text-muted">
            <span>Project: <strong className="text-text-primary">{projectName}</strong></span>
            <span>Duration: <strong className="font-mono text-accent-primary">{totalDurationSec.toFixed(1)}s</strong></span>
          </div>

          {/* Frame Rate Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Timeline Frame Rate (FPS)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[24, 29.97, 30, 60].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFps(rate)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    fps === rate
                      ? 'bg-accent-primary text-app border-accent-primary'
                      : 'bg-card text-text-muted border-subtle hover:border-text-muted/40 hover:text-text-primary'
                  }`}
                >
                  {rate} fps
                </button>
              ))}
            </div>
          </div>

          {/* Stems Manifest Preview */}
          <div className="p-3.5 rounded bg-card border border-subtle text-xs space-y-2">
            <span className="font-bold text-text-primary block">Export Bundle Stems:</span>
            <div className="space-y-1 font-mono text-[11px] text-text-muted">
              <div>📹 <span className="text-text-primary">timeline.fcpxml</span> (FCPXML v1.10)</div>
              <div>📼 <span className="text-text-primary">timeline.edl</span> (Universal EDL)</div>
              <div>🎞️ <span className="text-text-primary">V1_footage/</span> (Cut background video clips)</div>
              <div>✨ <span className="text-text-primary">V2_motion_overlays/</span> (ProRes 4444 with alpha)</div>
              <div>🎙️ <span className="text-text-primary">A1_dialogue/</span> (Normalized voiceover master)</div>
              <div>🔔 <span className="text-text-primary">A2_sfx/</span> (Exact frame SFX stems)</div>
              <div>🎵 <span className="text-text-primary">A3_music/</span> (Ducked bed at -14 LUFS)</div>
              <div>💬 <span className="text-text-primary">subtitles.srt</span> (Word-level SRT)</div>
            </div>
          </div>

          {exportResult && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-600/50 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Export Complete!</span>
              </div>
              <div className="font-mono text-[11px] text-text-primary break-all">
                {exportResult.bundlePath}
              </div>
              <div className="text-[11px] text-emerald-200 pt-1">
                {exportResult.instructions}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary transition"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-primary hover:opacity-90 disabled:opacity-50 text-app font-bold text-xs shadow transition"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-app" /> : <FolderCheck className="w-4 h-4 text-app" />}
            {isExporting ? 'Generating Bundle...' : 'Export DaVinci Bundle'}
          </button>
        </div>
      </div>
    </div>
  );
};

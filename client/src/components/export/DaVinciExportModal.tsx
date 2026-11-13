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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-slate-700 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Film className="w-4 h-4 text-sky-400" />
            <span>DaVinci Resolve Multi-Track Export Bundle</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-300">
            <span>Project: <strong className="text-white">{projectName}</strong></span>
            <span>Duration: <strong className="font-mono text-sky-400">{totalDurationSec.toFixed(1)}s</strong></span>
          </div>

          {/* Frame Rate Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Timeline Frame Rate (FPS)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[24, 29.97, 30, 60].map((rate) => (
                <button
                  key={rate}
                  onClick={() => setFps(rate)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    fps === rate
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-[#0A0D14] text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {rate} fps
                </button>
              ))}
            </div>
          </div>

          {/* Stems Manifest Preview */}
          <div className="p-3.5 rounded-xl bg-[#0A0D14] border border-slate-800 text-xs space-y-2">
            <span className="font-bold text-slate-300 block">Export Bundle Stems:</span>
            <div className="space-y-1 font-mono text-[11px] text-slate-400">
              <div>📹 <span className="text-slate-200">timeline.fcpxml</span> (FCPXML v1.10)</div>
              <div>📼 <span className="text-slate-200">timeline.edl</span> (Universal EDL)</div>
              <div>🎞️ <span className="text-slate-200">V1_footage/</span> (Cut background video clips)</div>
              <div>✨ <span className="text-slate-200">V2_motion_overlays/</span> (ProRes 4444 with alpha)</div>
              <div>🎙️ <span className="text-slate-200">A1_dialogue/</span> (Normalized voiceover master)</div>
              <div>🔔 <span className="text-slate-200">A2_sfx/</span> (Exact frame SFX stems)</div>
              <div>🎵 <span className="text-slate-200">A3_music/</span> (Ducked bed at -14 LUFS)</div>
              <div>💬 <span className="text-slate-200">subtitles.srt</span> (Word-level SRT)</div>
            </div>
          </div>

          {exportResult && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-xs text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Export Complete!</span>
              </div>
              <div className="font-mono text-[11px] text-slate-300 break-all">
                {exportResult.bundlePath}
              </div>
              <div className="text-[11px] text-emerald-200 pt-1">
                {exportResult.instructions}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Close
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow transition"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <FolderCheck className="w-4 h-4 text-slate-950" />}
            {isExporting ? 'Generating Bundle...' : 'Export DaVinci Bundle'}
          </button>
        </div>
      </div>
    </div>
  );
};

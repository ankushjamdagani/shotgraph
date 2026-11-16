import { useDialog } from '../common/useDialog';
import { apiFetch } from '../../services/api';
import React, { useState } from 'react';
import { X, Film, CheckCircle2, FolderCheck, Loader2 } from 'lucide-react';

interface DaVinciExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectFps: number;
  revision?: number;
  projectName: string;
  totalDurationSec: number;
}

export const DaVinciExportModal: React.FC<DaVinciExportModalProps> = ({
  isOpen,
  onClose,
  projectId, projectFps, revision,
  projectName,
  totalDurationSec,
}) => {
  const [fps, setFps] = useState<number>(projectFps);
  const [error, setError] = useState('');
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

  const dialogRef = useDialog(isOpen, onClose);
  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    setExportResult(null);
    try {
      const res = await apiFetch('/api/export/davinci', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fps, projectId, revision }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Export failed');
      setExportResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={dialogRef} aria-label="Export project" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="max-h-[90vh] overflow-y-auto w-full max-w-lg rounded-lg bg-surface border border-subtle shadow-2xl p-6 text-text-primary">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Film className="w-4 h-4 text-accent-primary" />
            <span>DaVinci Resolve Multi-Track Export Bundle</span>
          </div>
          <button
            aria-label="Close export"
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

          <div className="p-3 rounded bg-card text-sm text-text-muted">
            Creates FCPXML and EDL timelines. Exports the active video takes, attached overlays and dialogue into a portable media bundle.
            Missing footage blocks export. Subtitles are included only when transcript text is available.
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
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
            aria-label="Close export"
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

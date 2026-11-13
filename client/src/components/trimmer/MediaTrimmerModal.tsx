import React, { useState } from 'react';
import { X, Scissors, Check } from 'lucide-react';

interface MediaTrimmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDurationSec: number;
  fileName: string;
  onConfirmTrim: (startSec: number, durationSec: number) => void;
}

export const MediaTrimmerModal: React.FC<MediaTrimmerModalProps> = ({
  isOpen,
  onClose,
  targetDurationSec,
  fileName,
  onConfirmTrim,
}) => {
  const [startSec, setStartSec] = useState(0);
  const [clipDurationSec, _setClipDurationSec] = useState(8.5); // mock detected external clip length

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-lg bg-surface border border-subtle shadow-2xl p-5 text-text-primary">
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <Scissors className="w-4 h-4 text-accent-primary" />
            <span>Visual Media Trimmer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="text-xs text-text-muted">
            Imported file <span className="font-mono text-accent-primary">"{fileName}"</span> is{' '}
            <span className="font-bold text-amber-400">{clipDurationSec.toFixed(1)}s</span>, but this shot target is{' '}
            <span className="font-bold text-accent-primary">{targetDurationSec.toFixed(1)}s</span>.
          </div>

          {/* Visual Scrubber Track */}
          <div className="p-4 rounded bg-card border border-subtle space-y-3">
            <div className="flex justify-between text-xs text-text-muted font-mono">
              <span>In-Point: {startSec.toFixed(1)}s</span>
              <span>Duration: {targetDurationSec.toFixed(1)}s</span>
              <span>Out-Point: {(startSec + targetDurationSec).toFixed(1)}s</span>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(0, clipDurationSec - targetDurationSec)}
              step={0.1}
              value={startSec}
              onChange={(e) => setStartSec(parseFloat(e.target.value))}
              className="w-full accent-accent-primary cursor-pointer"
            />

            <div className="h-6 w-full bg-app rounded-md relative overflow-hidden flex items-center border border-subtle">
              <div
                style={{
                  left: `${(startSec / clipDurationSec) * 100}%`,
                  width: `${(targetDurationSec / clipDurationSec) * 100}%`,
                }}
                className="absolute h-full bg-accent-primary/20 border-2 border-accent-primary rounded flex items-center justify-center text-[10px] font-bold text-accent-primary"
              >
                ACTIVE CUT ({targetDurationSec}s)
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmTrim(startSec, targetDurationSec);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-primary hover:opacity-90 text-app font-bold text-xs shadow transition"
          >
            <Check className="w-3.5 h-3.5" />
            Trim & Attach to Shot
          </button>
        </div>
      </div>
    </div>
  );
};

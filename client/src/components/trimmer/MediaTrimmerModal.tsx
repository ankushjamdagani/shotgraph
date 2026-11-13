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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0E131F] border border-slate-700 shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Scissors className="w-4 h-4 text-sky-400" />
            <span>Visual Media Trimmer</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="text-xs text-slate-300">
            Imported file <span className="font-mono text-sky-400">"{fileName}"</span> is{' '}
            <span className="font-bold text-amber-400">{clipDurationSec.toFixed(1)}s</span>, but this shot target is{' '}
            <span className="font-bold text-sky-400">{targetDurationSec.toFixed(1)}s</span>.
          </div>

          {/* Visual Scrubber Track */}
          <div className="p-4 rounded-xl bg-[#0A0D14] border border-slate-800 space-y-3">
            <div className="flex justify-between text-xs text-slate-400 font-mono">
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
              className="w-full accent-sky-400 cursor-pointer"
            />

            <div className="h-6 w-full bg-slate-900 rounded-md relative overflow-hidden flex items-center">
              <div
                style={{
                  left: `${(startSec / clipDurationSec) * 100}%`,
                  width: `${(targetDurationSec / clipDurationSec) * 100}%`,
                }}
                className="absolute h-full bg-sky-500/30 border-2 border-sky-400 rounded flex items-center justify-center text-[10px] font-bold text-sky-200"
              >
                ACTIVE CUT ({targetDurationSec}s)
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmTrim(startSec, targetDurationSec);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow transition"
          >
            <Check className="w-3.5 h-3.5" />
            Trim & Attach to Shot
          </button>
        </div>
      </div>
    </div>
  );
};

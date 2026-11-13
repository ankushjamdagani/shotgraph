import React, { useState } from 'react';
import { X, Sparkles, Sliders, Check } from 'lucide-react';

interface TasteMixerModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleMarkdown: string;
  onSaveStyle: (styleMd: string) => void;
}

export const TasteMixerModal: React.FC<TasteMixerModalProps> = ({
  isOpen,
  onClose,
  styleMarkdown,
  onSaveStyle,
}) => {
  const [refUrlInput, setRefUrlInput] = useState('');
  const [pacingChoice, setPacingChoice] = useState('Ref 1 (Snappy 1.4s)');
  const [paletteChoice, setPaletteChoice] = useState('Ref 2 (Midnight Slate #0F172A & Sky #38BDF8)');
  const [typeChoice, setTypeChoice] = useState('Ref 1 (Archivo Black Display + Inter)');
  const [motionChoice, setMotionChoice] = useState('Ref 2 (Liquid Glass with 15% Overshoot)');
  const [styleContent, setStyleContent] = useState(styleMarkdown);

  if (!isOpen) return null;

  const handleApplyMixer = () => {
    const updated = `# PROJECT STYLE GUIDE (STYLE.md)

### Archetype & Vibe
- **Dominant Style**: LIQUID GLASS
- **Pacing Source**: ${pacingChoice}

### Color Palette Source
- ${paletteChoice}

### Typography Source
- ${typeChoice}

### Motion Engineering
- ${motionChoice}

### Audio Rules
- Master Target: -14 LUFS
- Music Ducking Depth: -15 dB under speech
- SFX Palette: subtle_click, counter_roll, chime

### Banned Aesthetics (Negative Constraints)
- No generic AI purple or neon rainbow button glows
- No cartoonish 3D floating without ground contact shadow
- No unmotivated whooshes on basic card slides
- No text inside Instagram safe margins (top 10%, bottom 20%, right 15%)
`;
    setStyleContent(updated);
    onSaveStyle(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0E131F] border border-slate-700 shadow-2xl p-6 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Interactive Taste & Style Mixer (`STYLE.md`)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 overflow-y-auto flex-1">
          {/* Reference Video Ingest Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Add Reference Inspiration URL (YouTube / TikTok / Reel)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={refUrlInput}
                onChange={(e) => setRefUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or local MP4 path"
                className="flex-1 p-2 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
              <button
                onClick={() => {
                  if (refUrlInput) {
                    alert(`Reference ${refUrlInput} queued for yt-dlp download & FFmpeg frame analysis.`);
                    setRefUrlInput('');
                  }
                }}
                className="px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                Ingest
              </button>
            </div>
          </div>

          {/* Attribute Mixing Matrix */}
          <div className="p-4 rounded-xl bg-[#0A0D14] border border-slate-800 space-y-3.5">
            <span className="text-xs font-bold text-slate-200 block">Attribute Mixing Matrix</span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cut Pacing & Rhythm</label>
                <select
                  value={pacingChoice}
                  onChange={(e) => setPacingChoice(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#111726] border border-slate-800 text-slate-200"
                >
                  <option>Ref 1 (Snappy 1.4s)</option>
                  <option>Ref 2 (Conversational 2.2s)</option>
                  <option>Ref 3 (Cinematic 3.5s)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Color Palette & Mood</label>
                <select
                  value={paletteChoice}
                  onChange={(e) => setPaletteChoice(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#111726] border border-slate-800 text-slate-200"
                >
                  <option>Ref 2 (Midnight Slate #0F172A & Sky #38BDF8)</option>
                  <option>Ref 1 (Warm Paper #EFE8DC & Deep Red #C2412D)</option>
                  <option>Ref 3 (Neon Pop Bold #C6FF3D & Flat Black)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Typography Pairing</label>
                <select
                  value={typeChoice}
                  onChange={(e) => setTypeChoice(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#111726] border border-slate-800 text-slate-200"
                >
                  <option>Ref 1 (Archivo Black Display + Inter)</option>
                  <option>Ref 2 (Instrument Serif + Inter)</option>
                  <option>Ref 3 (Bricolage Grotesque ExtraBold)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Motion Easing Curve</label>
                <select
                  value={motionChoice}
                  onChange={(e) => setMotionChoice(e.target.value)}
                  className="w-full p-2 rounded-lg bg-[#111726] border border-slate-800 text-slate-200"
                >
                  <option>Ref 2 (Liquid Glass with 15% Overshoot)</option>
                  <option>Ref 1 (Editorial Staggered Gentle Wipes)</option>
                  <option>Ref 3 (Springy Pop with back.out(2.5))</option>
                </select>
              </div>
            </div>
          </div>

          {/* Living STYLE.md Viewer */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Current `STYLE.md` Document
            </label>
            <textarea
              value={styleContent}
              onChange={(e) => setStyleContent(e.target.value)}
              rows={8}
              className="w-full p-3 rounded-lg bg-[#0A0D14] border border-slate-800 text-xs text-slate-300 font-mono resize-none focus:outline-none focus:border-sky-500"
            />
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
            onClick={handleApplyMixer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow transition"
          >
            <Check className="w-3.5 h-3.5" />
            Save to `STYLE.md`
          </button>
        </div>
      </div>
    </div>
  );
};

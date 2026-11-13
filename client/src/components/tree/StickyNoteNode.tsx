import React, { useState, useEffect } from 'react';
import { NodeProps } from '@xyflow/react';
import { Pin, Trash2, CheckSquare, Square } from 'lucide-react';

export type StickyColor = 'yellow' | 'cyan' | 'rose' | 'emerald';

export interface StickyNoteData {
  id: string;
  text?: string;
  color?: StickyColor;
  isPinned?: boolean;
  onUpdateNote?: (id: string, text: string, color: StickyColor, isPinned: boolean) => void;
  onDeleteNote?: (id: string) => void;
}

const COLOR_STYLES: Record<
  StickyColor,
  { container: string; dot: string; border: string; accent: string }
> = {
  yellow: {
    container: 'bg-amber-50/95 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 border-amber-300 dark:border-amber-700/60',
    dot: 'bg-amber-400',
    border: 'border-amber-400',
    accent: '#F59E0B',
  },
  cyan: {
    container: 'bg-sky-50/95 dark:bg-sky-950/50 text-sky-950 dark:text-sky-100 border-sky-300 dark:border-sky-700/60',
    dot: 'bg-sky-400',
    border: 'border-sky-400',
    accent: '#38BDF8',
  },
  rose: {
    container: 'bg-rose-50/95 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100 border-rose-300 dark:border-rose-700/60',
    dot: 'bg-rose-400',
    border: 'border-rose-400',
    accent: '#FB7185',
  },
  emerald: {
    container: 'bg-emerald-50/95 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 border-emerald-300 dark:border-emerald-700/60',
    dot: 'bg-emerald-400',
    border: 'border-emerald-400',
    accent: '#34D399',
  },
};

export const StickyNoteNode: React.FC<NodeProps<any>> = ({ id, data, selected }) => {
  const [text, setText] = useState<string>(data.text || 'Director Note: Add feedback or reference links...');
  const [color, setColor] = useState<StickyColor>(data.color || 'yellow');
  const [isPinned, setIsPinned] = useState<boolean>(Boolean(data.isPinned));
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (data.text !== undefined) setText(data.text);
    if (data.color !== undefined) setColor(data.color);
    if (data.isPinned !== undefined) setIsPinned(Boolean(data.isPinned));
  }, [data.text, data.color, data.isPinned]);

  const handleCommit = (newText: string, newColor: StickyColor, newPinned: boolean) => {
    if (data.onUpdateNote) {
      data.onUpdateNote(id, newText, newColor, newPinned);
    }
  };

  const handleColorChange = (newColor: StickyColor) => {
    setColor(newColor);
    handleCommit(text, newColor, isPinned);
  };

  const handleTogglePin = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    handleCommit(text, color, nextPin);
  };

  const handleToggleCheckbox = (lineIndex: number) => {
    const lines = text.split('\n');
    if (lineIndex < lines.length) {
      if (lines[lineIndex].startsWith('- [ ] ')) {
        lines[lineIndex] = lines[lineIndex].replace('- [ ] ', '- [x] ');
      } else if (lines[lineIndex].startsWith('- [x] ')) {
        lines[lineIndex] = lines[lineIndex].replace('- [x] ', '- [ ] ');
      }
      const updated = lines.join('\n');
      setText(updated);
      handleCommit(updated, color, isPinned);
    }
  };

  const activeStyle = COLOR_STYLES[color] || COLOR_STYLES.yellow;

  // Simple Markdown Parser for rendered view
  const renderMarkdown = () => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs leading-relaxed font-sans">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-bold text-sm tracking-tight border-b border-black/10 dark:border-white/10 pb-0.5">
                {line.slice(2)}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h4 key={idx} className="font-bold text-xs tracking-tight">
                {line.slice(3)}
              </h4>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
            const isChecked = line.startsWith('- [x] ');
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleCheckbox(idx);
                }}
                className="flex items-start gap-1.5 cursor-pointer hover:opacity-80 transition select-none"
              >
                {isChecked ? (
                  <CheckSquare className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                ) : (
                  <Square className="w-3.5 h-3.5 mt-0.5 opacity-60 shrink-0" />
                )}
                <span className={isChecked ? 'line-through opacity-60' : ''}>
                  {line.slice(6)}
                </span>
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="opacity-60">•</span>
                <span>{line.slice(2)}</span>
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }
          return <div key={idx}>{line}</div>;
        })}
      </div>
    );
  };

  return (
    <div
      onDoubleClick={() => setIsEditing(true)}
      className={`group w-64 min-h-[160px] rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-150 select-none ${
        activeStyle.container
      } ${selected ? 'ring-2 ring-accent-primary shadow-2xl scale-[1.01]' : ''}`}
    >
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10 mb-2.5">
        {/* Color Palette Dots */}
        <div className="flex items-center gap-1.5">
          {(['yellow', 'cyan', 'rose', 'emerald'] as StickyColor[]).map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation();
                handleColorChange(c);
              }}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                COLOR_STYLES[c].dot
              } ${color === c ? 'scale-125 ring-1 ring-black/40 dark:ring-white/60' : 'opacity-70 hover:opacity-100 hover:scale-110'}`}
              title={`Color: ${c}`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin();
            }}
            className={`p-1 rounded-lg transition ${
              isPinned ? 'text-amber-500 bg-amber-500/20' : 'opacity-50 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            title={isPinned ? 'Unpin note (Locked)' : 'Pin note to lock position'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {data.onDeleteNote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onDeleteNote(id);
              }}
              className="p-1 rounded-lg opacity-50 hover:opacity-100 hover:text-red-500 hover:bg-black/10 dark:hover:bg-white/10 transition"
              title="Delete sticky note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Note Content (Edit vs Render) */}
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              setIsEditing(false);
              handleCommit(text, color, isPinned);
            }}
            className="w-full bg-transparent text-xs p-1 rounded-lg border border-black/15 dark:border-white/15 focus:outline-none resize-none leading-relaxed font-sans"
            placeholder="Type notes (supports - [ ] checklist, - bullets, # headers)..."
          />
          <div className="text-[10px] opacity-60 font-mono text-right">Click away to save</div>
        </div>
      ) : (
        <div className="min-h-[90px] cursor-text">{renderMarkdown()}</div>
      )}
    </div>
  );
};

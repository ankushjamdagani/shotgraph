import { Button } from './button';
import { useState, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  PenLine,
} from 'lucide-react';
import { Label } from './input';
import { cn } from './cn';
import type { VisualListVariant } from './visual-choice-list';

export interface StoryBeat {
  label: string;
  text: string;
}

export interface StoryDirection {
  id: number;
  title: string;
  summary?: string;
  story?: string;
  durationLabel: string;
  beats: StoryBeat[];
  audioFreq?: number;
  audioType?: OscillatorType;
}

export interface StoryDeckProps {
  directions: StoryDirection[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  variant?: VisualListVariant;
  customPrompt?: string;
  onCustomPromptChange?: (val: string) => void;
  onAddCustomDirection?: () => void;
}

export function StoryDeck({
  directions,
  selected,
  onToggle,
  variant = 'Arched fan',
  customPrompt = '',
  onCustomPromptChange,
  onAddCustomDirection,
}: StoryDeckProps) {
  // Active index in the infinite carousel (0 to directions.length)
  // Index directions.length corresponds to the "Custom direction" card
  const [activeIndex, setActiveIndex] = useState(0);

  const totalCards = directions.length + 1; // story directions + 1 custom card
  const isCustomCardActive = activeIndex === directions.length;
  const currentDirection = directions[activeIndex] as StoryDirection | undefined;

  const handleSelectIndex = useCallback(
    (index: number) => {
      setActiveIndex((index + totalCards) % totalCards);
    },
    [totalCards],
  );

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
  }, [totalCards]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalCards);
  }, [totalCards]);

  // Touch and drag swipe tracking
  const dragStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartX.current === null) return;
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX.current;
    if (deltaX > 35) {
      handlePrev();
    } else if (deltaX < -35) {
      handleNext();
    }
    dragStartX.current = null;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable=true]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (currentDirection && !isCustomCardActive) {
        e.preventDefault();
        onToggle(currentDirection.id);
      }
    }
  };

  // Circular offset modulo calculation for infinite ribbon feel
  const getCircularOffset = (index: number, active: number, total: number) => {
    let diff = (index - active) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <div
      className="group/storydeck relative w-full select-none py-3 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Story directions"
      role="region"
    >
      {/* Infinite Carousel Stage with Left/Right Edge Fade Out */}
      <div
        className="relative mx-auto flex h-[340px] w-full max-w-[1100px] items-center justify-center overflow-hidden sm:h-[400px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Ambient Back-Reflection Glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl transition-colors duration-500"
          style={{
            background: isCustomCardActive
              ? 'radial-gradient(circle, #38bdf8 0%, transparent 70%)'
              : 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          }}
        />

        {/* Visual Fade-out Gradient Overlays on Left and Right (pointer-events-none) */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-app via-app/80 to-transparent z-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-app via-app/80 to-transparent z-40" />

        {/* Cards Infinite Track - pointer-events-none ensures child cards receive direct clicks */}
        <div
          className="pointer-events-none relative flex h-full w-full items-center justify-center"
        >
          {Array.from({ length: totalCards }).map((_, index) => {
            const isCustom = index === directions.length;
            const dir = directions[index];
            const offset = getCircularOffset(index, activeIndex, totalCards);
            const absOffset = Math.abs(offset);
            const isCenter = offset === 0;

            if (absOffset > 3) return null;

            let translateX = 0;
            let translateY = 0;
            let rotateZ = 0;
            let rotateY = 0;
            let scale = 1;
            // Active card always shows above all other cards; neighbors decrease strictly by distance
            const zIndex = isCenter ? 50 : Math.max(1, 40 - absOffset * 10);
            let opacity = 1;

            if (variant === 'Arched fan') {
              translateX = offset * 210;
              translateY = Math.min(absOffset * absOffset * 18, 75);
              rotateZ = Math.max(-20, Math.min(20, offset * 6.5));
              scale = Math.max(0.75, 1.05 - absOffset * 0.1);
              opacity = Math.max(0.35, 1 - absOffset * 0.22);
            } else if (variant === 'Tilted deck') {
              translateX = offset * 190;
              translateY = absOffset * 12;
              rotateZ = offset * 5;
              scale = offset === 0 ? 1.05 : 0.9;
              opacity = Math.max(0.4, 1 - absOffset * 0.18);
            } else if (variant === 'Cover flow') {
              translateX =
                offset === 0 ? 0 : offset < 0 ? offset * 180 - 30 : offset * 180 + 30;
              translateY = 0;
              rotateY = offset === 0 ? 0 : offset < 0 ? 35 : -35;
              rotateZ = offset === 0 ? 0 : offset < 0 ? -1.5 : 1.5;
              scale = offset === 0 ? 1.06 : 0.88;
              opacity = Math.max(0.4, 1 - absOffset * 0.18);
            }

            const isDirSelected = dir && selected.has(dir.id);

            const handleCardClick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!isCenter) {
                handleSelectIndex(index);
              } else if (!isCustom && dir) {
                onToggle(dir.id);
              }
            };

            return (
              <div
                key={isCustom ? 'custom-card' : dir.id}
                onClick={handleCardClick}
                className={cn(
                  'pointer-events-auto absolute cursor-pointer will-change-transform transition-all duration-300 ease-out select-none',
                  isCenter ? 'cursor-pointer' : 'hover:scale-[0.98]',
                )}
                style={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) ${variant === 'Cover flow' ? `perspective(1000px) rotateY(${rotateY}deg) ` : ''}rotateZ(${rotateZ}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                }}
                role="button"
                tabIndex={-1}
                aria-label={
                  isCustom
                    ? 'Custom story direction'
                    : `${dir.title} (${dir.durationLabel})`
                }
              >
                <div
                  className={cn(
                    'relative h-[280px] w-[260px] sm:h-[340px] sm:w-[320px] overflow-hidden rounded-[24px] sm:rounded-[28px] transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between select-none',
                    isCenter
                      ? 'border-2 border-white/95 shadow-[0_25px_50px_rgba(0,0,0,0.7)] ring-4 ring-white/10'
                      : 'border border-white/20 shadow-md hover:border-white/50 hover:brightness-105',
                    isCustom
                      ? 'bg-gradient-to-br from-surface to-card border-dashed'
                      : isDirSelected
                        ? 'bg-gradient-to-br from-card via-surface/90 to-app/95'
                        : 'bg-card/90 backdrop-blur-sm',
                  )}
                >
                  {isCustom ? (
                    /* Custom Direction Card Face */
                    <div className="flex size-full flex-col items-center justify-center text-center p-4">
                      <div className="flex size-14 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20 mb-3 shadow-inner">
                        <PenLine className="size-6" />
                      </div>
                      <span className="text-sm font-semibold text-text-primary tracking-wide">
                        Custom Direction
                      </span>
                      <span className="mt-1.5 text-xs text-text-muted leading-relaxed">
                        Write your own cinematic narrative arc & scene beats
                      </span>
                    </div>
                  ) : (
                    /* Complete Story Direction Card Face */
                    <>
                      {/* Top Header: Badge & Checkbox */}
                      <div className="flex items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-app/80 px-2 py-0.5 text-[10px] font-mono text-text-muted border border-subtle">
                            {dir.durationLabel.split('•')[0] || '30s'}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {dir.beats.length} beats
                          </span>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(dir.id);
                          }}
                          className={cn(
                            'flex size-6 items-center justify-center rounded-full transition cursor-pointer',
                            isDirSelected
                              ? 'bg-text-primary text-app shadow-xs scale-105'
                              : 'border border-subtle hover:border-text-primary text-transparent',
                          )}
                        >
                          <Check className="size-3.5 stroke-[2.5]" />
                        </div>
                      </div>

                      {/* Title & 1-line hook */}
                      <div className="pt-2 shrink-0 space-y-1">
                        <h4 className="text-sm sm:text-base font-bold text-text-primary leading-tight line-clamp-1">
                          {dir.title}
                        </h4>
                        {dir.summary && (
                          <p className="text-[11px] text-accent-primary font-medium italic line-clamp-1">
                            "{dir.summary}"
                          </p>
                        )}
                      </div>

                      {/* Complete Narrative Text inside Card */}
                      <div className="flex-1 min-h-0 my-2 overflow-y-auto pr-1 text-left scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-18px),transparent_100%)]">
                        {dir.story ? (
                          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line font-sans">
                            {dir.story}
                          </p>
                        ) : (
                          <div className="space-y-1.5 text-xs text-text-secondary">
                            {dir.beats.map((b, i) => (
                              <div key={i} className="flex gap-1.5">
                                <span className="font-semibold text-text-muted shrink-0 text-[11px]">{b.label}:</span>
                                <span className="text-[11px] leading-relaxed">{b.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer */}
                      <div className="flex items-center justify-between pt-2 border-t border-subtle/50 text-[11px] text-text-muted shrink-0">
                        <span className={isDirSelected ? 'text-accent-primary font-medium' : 'text-text-muted'}>
                          {isDirSelected ? 'Selected for production' : 'Click card to select'}
                        </span>
                        <div className="flex items-center gap-1">
                          {dir.beats.slice(0, 4).map((_, i) => (
                            <span
                              key={i}
                              className={cn(
                                'size-1.5 rounded-full',
                                isDirSelected ? 'bg-accent-primary' : 'bg-subtle',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direction Title Navigation & Custom Input */}
      <div className="mt-4 flex flex-col items-center text-center space-y-2 px-4">
        {/* Navigation row wrapping direction title */}
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={handlePrev}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 transition backdrop-blur-sm shadow-xs"
            aria-label="Previous story direction"
          >
            <ChevronLeft className="size-4" />
          </button>

          <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-white min-w-0">
            {isCustomCardActive ? 'Custom Story Direction' : currentDirection?.title}
          </h3>

          <button
            type="button"
            onClick={handleNext}
            className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95 transition backdrop-blur-sm shadow-xs"
            aria-label="Next story direction"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Custom Direction Direct Input (only when Custom Card is selected) */}
        {isCustomCardActive && (
          <div className="w-full max-w-lg mx-auto pt-2 space-y-2 animate-in fade-in duration-200">
            <Label htmlFor="custom-story-direction" className="text-xs font-medium text-text-primary">
              Your custom story arc & narrative brief
            </Label>
            <textarea
              id="custom-story-direction"
              rows={3}
              value={customPrompt}
              onChange={(e) => onCustomPromptChange?.(e.target.value)}
              placeholder="Describe your story hook, plot development, character emotional journey, and ending…"
              className="w-full rounded-md border border-subtle bg-card px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              autoFocus
            />
            <Button variant="soft" disabled={!customPrompt?.trim()} onClick={onAddCustomDirection}>Add direction</Button>
          </div>
        )}
      </div>
    </div>
  );
}

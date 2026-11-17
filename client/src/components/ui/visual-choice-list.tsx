import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PenLine,
} from 'lucide-react';
import { cn } from './cn';

export const visualListVariants = [
  'Arched fan',
  'Tilted deck',
  'Cover flow',
] as const;

export type VisualListVariant = (typeof visualListVariants)[number];

export interface VisualChoice {
  value: string;
  label: string;
  description: string;
  image?: string;
  grade?: string;
  detail?: string;
  badge?: string;
  isCustom?: boolean;
  isAiSuggested?: boolean;
}

export interface VisualChoiceListProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: VisualChoice[];
  variant?: VisualListVariant;
}

export function VisualChoiceList({
  label,
  value,
  onChange,
  options,
  variant: propVariant,
}: VisualChoiceListProps) {
  const [currentVariant, setCurrentVariant] = useState<VisualListVariant>(
    propVariant || 'Arched fan',
  );

  useEffect(() => {
    if (propVariant && visualListVariants.includes(propVariant)) {
      setCurrentVariant(propVariant);
    }
  }, [propVariant]);

  const activeVariant = currentVariant;

  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );

  const activeOption = options[activeIndex] || options[0];

  const handleSelectIndex = useCallback(
    (index: number) => {
      const target = options[index];
      if (target) {
        onChange(target.value);
      }
    },
    [options, onChange],
  );

  // Infinite list cycling helper
  const handlePrev = useCallback(() => {
    if (options.length === 0) return;
    const nextIdx = (activeIndex - 1 + options.length) % options.length;
    handleSelectIndex(nextIdx);
  }, [activeIndex, options.length, handleSelectIndex]);

  const handleNext = useCallback(() => {
    if (options.length === 0) return;
    const nextIdx = (activeIndex + 1) % options.length;
    handleSelectIndex(nextIdx);
  }, [activeIndex, options.length, handleSelectIndex]);

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
    if ((e.target as HTMLElement).closest('input, textarea, button, [contenteditable=true]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeOption) {
        onChange(activeOption.value);
      }
    }
  };

  // Calculate circular offset for infinite carousel feel
  const getCircularOffset = (index: number, active: number, total: number) => {
    let diff = (index - active) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <div
      className="group/carousel relative w-full select-none py-3 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label={label}
      role="region"
    >
      {/* Overscan leaves room for rotated cards and their shadows. */}
      <div
        className="relative left-1/2 flex -translate-x-1/2 h-[300px] w-[min(1240px,var(--setup-rail-width,calc(100vw-32px)))] items-center justify-center overflow-hidden sm:h-[340px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Subtle Ambient Back-Reflection Glow of Active Card */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl transition-colors duration-500"
          style={{
            background:
              activeOption?.isCustom
                ? 'radial-gradient(circle, #38bdf8 0%, transparent 70%)'
                : activeOption?.isAiSuggested
                  ? 'radial-gradient(circle, #ec4899 0%, transparent 70%)'
                  : activeOption?.value.includes('Bold') || activeOption?.value.includes('Pop')
                    ? 'radial-gradient(circle, #f43f5e 0%, transparent 70%)'
                    : activeOption?.value.includes('Warm')
                      ? 'radial-gradient(circle, #f59e0b 0%, transparent 70%)'
                      : 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          }}
        />

        {/* Cards Infinite Track - pointer-events-none on parent ensures child cards receive all click events */}
        <div
          className="pointer-events-none relative flex h-full w-full items-center justify-center"
        >
          {options.map((option, index) => {
            const offset = getCircularOffset(index, activeIndex, options.length);
            const absOffset = Math.abs(offset);
            const isCenter = offset === 0;

            // Only render cards within visual reach to keep performance crisp
            if (absOffset > 3) return null;

            let translateX = 0;
            let translateY = 0;
            let rotateZ = 0;
            let rotateY = 0;
            let scale = 1;
            // Active card always shows above all other cards; neighbors decrease strictly by distance
            const zIndex = isCenter ? 50 : Math.max(1, 40 - absOffset * 10);
            let opacity = 1;

            if (activeVariant === 'Arched fan') {
              translateX = offset * 160;
              translateY = Math.min(absOffset * absOffset * 10, 40);
              rotateZ = Math.max(-24, Math.min(24, offset * 7.5));
              scale = Math.max(0.72, 1.05 - absOffset * 0.1);
              opacity = Math.max(0.35, 1 - absOffset * 0.22);
            } else if (activeVariant === 'Tilted deck') {
              translateX = offset * 145;
              translateY = absOffset * 10;
              rotateZ = offset * 6;
              scale = offset === 0 ? 1.05 : 0.9;
              opacity = Math.max(0.4, 1 - absOffset * 0.18);
            } else if (activeVariant === 'Cover flow') {
              translateX =
                offset === 0 ? 0 : offset < 0 ? offset * 140 - 30 : offset * 140 + 30;
              translateY = 0;
              rotateY = offset === 0 ? 0 : offset < 0 ? 40 : -40;
              rotateZ = offset === 0 ? 0 : offset < 0 ? -1.5 : 1.5;
              scale = offset === 0 ? 1.08 : 0.88;
              opacity = Math.max(0.4, 1 - absOffset * 0.18);
            }

            return (
              <div
                key={option.value}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectIndex(index);
                }}
                className={cn(
                  'pointer-events-auto absolute cursor-pointer will-change-transform transition-all duration-300 ease-out select-none',
                  isCenter ? 'cursor-pointer' : 'hover:scale-[0.98]',
                )}
                style={{
                  transform: `translateX(${translateX}px) translateY(${translateY}px) ${activeVariant === 'Cover flow' ? `perspective(1000px) rotateY(${rotateY}deg) ` : ''}rotateZ(${rotateZ}deg) scale(${scale})`,
                  zIndex,
                  opacity,
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelectIndex(index);
                  }
                }}
                aria-label={`${option.label} (${option.description})`}
              >
                <div
                  className={cn(
                    'relative h-[180px] w-[180px] sm:h-[210px] sm:w-[210px] aspect-square overflow-hidden rounded-[26px] sm:rounded-[30px] transition-all duration-300',
                    isCenter
                      ? 'border-2 border-white/95 shadow-md ring-4 ring-white/10'
                      : 'border border-white/20 shadow-md hover:border-white/50 hover:brightness-105',
                    option.isCustom && 'bg-gradient-to-br from-surface to-card border-dashed',
                  )}
                >
                  {option.isCustom ? (
                    /* Custom Prompt Card Artwork */
                    <div className="flex size-full flex-col items-center justify-center p-4 text-center bg-card/60 backdrop-blur-sm">
                      <div className="flex size-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20 mb-3 shadow-inner">
                        <PenLine className="size-5" />
                      </div>
                      <span className="text-xs font-semibold text-text-primary tracking-wide">
                        Custom Prompt
                      </span>
                      <span className="mt-1 text-[10px] text-text-muted leading-tight">
                        Your words & references
                      </span>
                    </div>
                  ) : option.image ? (
                    <img
                      src={option.image}
                      alt={option.label}
                      className={cn(
                        'size-full object-cover transition-transform duration-500',
                        option.grade,
                        isCenter ? 'scale-105' : 'scale-100',
                      )}
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-card">
                      <Sparkles className="size-8 text-text-muted" />
                    </div>
                  )}

                  {/* Gradient shading overlay */}
                  {!option.isCustom && (
                    <div
                      className={cn(
                        'pointer-events-none absolute inset-0 transition-opacity',
                        isCenter
                          ? 'bg-gradient-to-t from-black/60 via-transparent to-black/20'
                          : 'bg-gradient-to-t from-black/75 via-black/20 to-transparent',
                      )}
                    />
                  )}

                  {/* Badges: AI Suggested or Custom */}
                  {option.isAiSuggested && (
                    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-accent-primary px-2 py-0.5 text-[9px] font-bold text-app shadow-xs">
                      <Sparkles className="size-2.5" />
                      AI PICK
                    </div>
                  )}

                  {/* Checkmark badge on center card */}
                  {isCenter && value === option.value && (
                    <div className="absolute right-3.5 top-3.5 flex size-6 items-center justify-center rounded-full bg-text-primary text-app shadow-md animate-in fade-in zoom-in duration-200">
                      <Check className="size-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simplified Option Information with Arrows at Start and End of Title */}
      {activeOption && (
        <div className="mt-4 flex flex-col items-center text-center space-y-1.5 px-4">
          {/* Left and Right arrows wrapping the option title */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handlePrev}
              className="flex size-8 items-center justify-center rounded-full border border-subtle bg-card text-text-muted hover:bg-hover hover:text-text-primary hover:scale-105 active:scale-95 transition backdrop-blur-sm shadow-xs"
              aria-label="Previous option"
            >
              <ChevronLeft className="size-4" />
            </button>

            <h3 className="text-xl sm:text-2xl font-normal tracking-tight text-text-primary min-w-0">
              {activeOption.label}
            </h3>

            <button
              type="button"
              onClick={handleNext}
              className="flex size-8 items-center justify-center rounded-full border border-subtle bg-card text-text-muted hover:bg-hover hover:text-text-primary hover:scale-105 active:scale-95 transition backdrop-blur-sm shadow-xs"
              aria-label="Next option"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Simplified Description */}
          <p className="max-w-md text-xs sm:text-sm text-text-muted font-light leading-relaxed line-clamp-2 pt-0.5">
            {activeOption.description}
          </p>
        </div>
      )}
    </div>
  );
}

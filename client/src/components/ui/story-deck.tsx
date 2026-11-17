import { StoryContent, type StoryConcept, type StoryContentVariant } from './story-content';
import { useState } from 'react';
import { RadioGroup } from 'radix-ui';
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { Button, IconButton } from './button';
import { Label, Textarea } from './input';
import { cn } from './cn';
export interface StoryBeat { label: string; text: string }
export interface StoryDirection extends StoryConcept {
  id: number; title: string; summary?: string; story?: string; durationLabel: string;
  beats: StoryBeat[];
}
export const storyPresentationVariants = ['Editorial carousel', 'Screenplay deck', 'Filmstrip', 'Story spread', 'Focus stage', 'Story gallery'] as const;
export type StoryPresentationVariant = typeof storyPresentationVariants[number];
export interface StoryDeckProps {
  directions: StoryDirection[]; selected: Set<number>; onToggle: (id: number) => void;
  presentation?: StoryPresentationVariant; contentVariant?: StoryContentVariant;
  customPrompt?: string; onCustomPromptChange?: (value: string) => void; onAddCustomDirection?: () => void;
}
export function StoryDeck({ directions, selected, onToggle, presentation = 'Editorial carousel', contentVariant = 'Original paragraph', customPrompt = '', onCustomPromptChange, onAddCustomDirection }: StoryDeckProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [images, setImages] = useState<Record<number, string>>({});
  const [writing, setWriting] = useState(false);
  const activeIndex = Math.max(0, directions.findIndex(direction => selected.has(direction.id)));
  const move = (offset: number) => { const next = directions[(activeIndex + offset + directions.length) % directions.length]; if (next) onToggle(next.id); };
  const deck = presentation === 'Screenplay deck';
  const strip = presentation === 'Filmstrip';
  const spread = presentation === 'Story spread';
  const focus = presentation === 'Focus stage';
  const boards = presentation === 'Story gallery';
  return <div className="mx-auto w-full max-w-[1240px] space-y-2">
    {!writing && <>
      <RadioGroup.Root orientation="horizontal" aria-label="Story directions" value={String(directions[activeIndex]?.id ?? '')} onValueChange={value => onToggle(Number(value))}
        className={cn('relative flex items-start justify-center overflow-hidden px-5 py-5 sm:px-10', deck && 'pb-12 pt-6')}>
        {directions.map((direction, index) => {
          let offset = index - activeIndex;
          if (offset > directions.length / 2) offset -= directions.length;
          if (offset < -directions.length / 2) offset += directions.length;
          const active = index === activeIndex;
          const transform = active ? 'none' : deck
            ? `translateX(${offset * 34}px) translateY(${Math.abs(offset) * 9}px) rotate(${offset * 5}deg) scale(${1 - Math.min(Math.abs(offset), 3) * .025})`
            : `translateX(calc(${offset} * (100% + ${strip ? 12 : 28}px))) scale(${focus ? .88 : .96})`;
          return <RadioGroup.Item key={direction.id} value={String(direction.id)} aria-label={direction.title}
            className={cn('group max-w-full shrink-0 text-left outline-none transition-[transform,opacity] duration-300 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-app',
              'w-[min(720px,calc(100vw-88px))]',
              active ? 'relative z-20' : 'absolute top-5 opacity-50 hover:opacity-80',
              strip && 'w-[min(840px,calc(100vw-88px))]',
              spread && 'w-[min(880px,calc(100vw-88px))]',
              focus && 'w-[min(680px,calc(100vw-88px))]',
              deck && 'w-[min(640px,calc(100vw-104px))]')}
            style={{ transform, zIndex: active ? 20 : Math.max(1, 10 - Math.abs(offset)), visibility: Math.abs(offset) > 2 ? 'hidden' : undefined }}>
            <article aria-label={active ? 'Selected story' : undefined} className={cn('min-h-72 border border-subtle bg-card px-5 py-5 sm:px-7 sm:py-6',
              deck ? 'rounded-sm shadow-md' : 'rounded-thumbnail',
              spread && 'grid gap-6 sm:grid-cols-[.85fr_1.2fr] sm:gap-8',
              focus && 'border-transparent bg-transparent text-center',
              presentation === 'Editorial carousel' && 'sm:grid sm:grid-cols-[.8fr_1.2fr] sm:gap-8',
              strip && 'border-y-4 border-control',
              boards && 'bg-transparent')}>
              <header className={cn('space-y-3', spread && 'sm:flex sm:flex-col sm:justify-between sm:border-r sm:border-subtle sm:pr-8', focus && 'mx-auto max-w-lg', deck && 'border-b border-subtle pb-5')}>
                <p className="text-xs text-text-muted">{String(index + 1).padStart(2, '0')} / {String(directions.length).padStart(2, '0')} <span className="mx-2">·</span>Story concept</p>
                {active ? <h3 className={cn('break-words text-2xl font-semibold leading-tight tracking-tight', spread && 'sm:text-4xl', focus && 'sm:text-4xl', deck && 'text-center sm:text-3xl')}>{direction.title}</h3> : <p className="break-words text-2xl font-semibold leading-tight tracking-tight">{direction.title}</p>}
                {contentVariant === 'Original paragraph' && direction.summary && direction.story && <p className="text-sm leading-relaxed text-text-muted">{direction.summary}</p>}
              </header>
              <div aria-hidden={!active || undefined} className={cn('mt-5 space-y-4 text-sm leading-relaxed',
                (spread || presentation === 'Editorial carousel') && 'sm:mt-0',
                (strip || boards) && 'sm:grid sm:grid-cols-3 sm:gap-5 sm:space-y-0',
                deck && 'sm:px-6', focus && 'mx-auto max-w-prose text-left')}>
                <div className={cn((strip || boards) && 'sm:col-span-3')}><StoryContent concept={{...direction, story: direction.story || direction.beats.map(beat => beat.text).join(' ')}} variant={contentVariant} expanded={expandedId === direction.id} image={images[direction.id]}/></div>
              </div>
              {active && <p className="mt-5 text-xs text-text-muted">Selected story</p>}
            </article>
          </RadioGroup.Item>;
        })}
      </RadioGroup.Root>
      {contentVariant === 'Progressive detail' && directions[activeIndex] && <div className="mx-auto max-w-[832px] px-5"><Button variant="quiet" aria-expanded={expandedId === directions[activeIndex].id} onClick={() => setExpandedId(expandedId === directions[activeIndex].id ? null : directions[activeIndex].id)}>{expandedId === directions[activeIndex].id ? 'Show less' : 'Read full concept'}</Button></div>}
      {contentVariant === 'Concept + reference image' && directions[activeIndex] && <div className="mx-auto max-w-[832px] space-y-2 px-5"><Label htmlFor="story-reference-image">Reference image</Label><input id="story-reference-image" type="file" accept="image/*" className="block w-full text-xs text-text-muted file:mr-3 file:rounded-md file:border file:border-subtle file:bg-card file:px-3 file:py-2 file:text-text-primary focus-visible:outline-focus" onChange={event => { const file = event.target.files?.[0]; const id = directions[activeIndex].id; if (!file) return; const reader = new FileReader(); reader.onload = () => setImages(previous => ({...previous, [id]: String(reader.result)})); reader.readAsDataURL(file); }}/><p className="text-xs text-text-muted">Use a reference to compare this presentation. The image is kept for this preview session.</p></div>}
      <div className="mx-auto flex max-w-[832px] items-center justify-between gap-3 px-5">
        <IconButton label="Previous story direction" disabled={directions.length < 2} onClick={() => move(-1)}><ChevronLeft/></IconButton>
        <p aria-live="polite" className="text-xs tabular-nums text-text-muted">{directions.length ? activeIndex + 1 : 0} of {directions.length} directions</p>
        <IconButton label="Next story direction" disabled={directions.length < 2} onClick={() => move(1)}><ChevronRight/></IconButton>
      </div>
    </>}
    <div className="mx-auto max-w-[832px] space-y-3 px-5 pt-3">
      <Button variant="quiet" onClick={() => setWriting(!writing)} aria-expanded={writing}><PenLine/>{writing ? 'Back to story directions' : 'Or write your own direction'}</Button>
      {writing && <>
        <Label htmlFor="custom-story-direction" className="block">Your story direction</Label>
        <Textarea id="custom-story-direction" rows={3} value={customPrompt} onChange={event => onCustomPromptChange?.(event.target.value)} placeholder="Describe the opening, what changes, and how the story ends." autoFocus/>
        <Button variant="secondary" disabled={!customPrompt.trim()} onClick={() => { onAddCustomDirection?.(); setWriting(false); }}>Use my direction</Button>
      </>}
    </div>
  </div>;
}

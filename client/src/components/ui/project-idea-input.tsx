import { forwardRef } from 'react';
import { Textarea, SetupInputContext } from './input';
import { cn } from './cn';

export const projectIdeaInputVariants = ['Original', 'Open canvas', 'Editorial page', 'Focus prompt', 'Framed canvas', 'Compact composer'] as const;
export type ProjectIdeaInputVariant = typeof projectIdeaInputVariants[number];

/** The primary creative brief: independent of the smaller setup-field comparisons. */
export const ProjectIdeaInput = forwardRef<HTMLTextAreaElement, {
  value: string;
  onChange: (value: string) => void;
  variant?: ProjectIdeaInputVariant;
}>(({ value, onChange, variant = 'Framed canvas' }, ref) => (
  <div data-idea-input={variant} className={cn('space-y-4', variant === 'Editorial page' && 'border-y border-subtle py-6', variant === 'Framed canvas' && 'rounded-dialog border border-subtle p-4 sm:p-6')}>
    <SetupInputContext.Provider value={variant === 'Original' ? 'soft' : null}>
      <Textarea ref={ref} id="project-idea" aria-label="Project idea" aria-describedby="idea-help" variant="plain" value={value} onChange={event => onChange(event.target.value)} rows={5}
        placeholder="A story, a scene, a character. What do you have in mind?"
        className={cn('min-h-48 text-xl leading-relaxed sm:min-h-56 sm:text-2xl',
          variant === 'Open canvas' && 'min-h-40 px-0 text-2xl sm:min-h-48 sm:text-3xl',
          variant === 'Editorial page' && 'min-h-48 px-2 font-medium sm:px-4',
          variant === 'Focus prompt' && 'min-h-40 text-center sm:min-h-48 sm:text-3xl',
          variant === 'Framed canvas' && 'min-h-40 sm:min-h-48',
          variant === 'Compact composer' && 'min-h-32 rounded-thumbnail bg-card px-5 py-4 text-lg sm:min-h-36 sm:text-xl',
        )}/>
    </SetupInputContext.Provider>
    <p id="idea-help" className={cn('text-xs text-text-muted', variant === 'Focus prompt' && 'text-center', variant === 'Editorial page' && 'px-2 sm:px-4')}>Include reference links, or start with just a thought.</p>
  </div>
));
ProjectIdeaInput.displayName = 'ProjectIdeaInput';

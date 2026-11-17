import { cn } from './cn';
export const storyContentVariants = ['Original paragraph', 'Hook + three lines', 'Pitch card', 'Progressive detail', 'Highlight the difference', 'Concept + reference image'] as const;
export type StoryContentVariant = typeof storyContentVariants[number];
export interface StoryConcept {
  title: string; summary?: string; story?: string;
  subject?: string; tension?: string; payoff?: string; pitch?: string; distinction?: string;
}
export function StoryContent({ concept, variant, expanded = false, image }: { concept: StoryConcept; variant: StoryContentVariant; expanded?: boolean; image?: string }) {
  const original = concept.story || concept.summary || '';
  const hook = concept.summary || concept.pitch || original;
  const details = [['Subject', concept.subject], ['Tension', concept.tension], ['Emotional payoff', concept.payoff]].filter(([, value]) => value);
  return <div className="space-y-4 text-sm leading-relaxed text-text-muted">
    {variant === 'Original paragraph' && <p className="whitespace-pre-line leading-7">{original}</p>}
    {variant === 'Hook + three lines' && <><p className="font-medium text-text-primary">{hook}</p>{details.length ? <dl className="space-y-3">{details.map(([label, value]) => <div key={label} className="grid gap-1 sm:grid-cols-[110px_1fr] sm:gap-3"><dt className="font-medium text-text-primary">{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="whitespace-pre-line">{original !== hook ? original : 'Add subject, tension and emotional payoff when refining this direction.'}</p>}</>}
    {variant === 'Pitch card' && <p className="text-lg font-medium leading-relaxed tracking-tight text-text-primary">{concept.pitch || hook}</p>}
    {variant === 'Progressive detail' && <><p className="font-medium text-text-primary">{hook}</p>{expanded && original !== hook && <p className="whitespace-pre-line leading-7">{original}</p>}</>}
    {variant === 'Highlight the difference' && <><p className="border-b border-subtle pb-4 text-lg font-semibold leading-snug text-text-primary">{concept.distinction || hook}</p><p>{concept.pitch || original}</p></>}
    {variant === 'Concept + reference image' && <>{image ? <img src={image} alt={`Visual reference for ${concept.title}`} className="aspect-[16/9] w-full rounded-md object-cover"/> : <p className="rounded-md border border-dashed border-subtle px-4 py-6 text-center">Add a visual reference below to compare this direction with an image.</p>}<p className={cn('font-medium text-text-primary')}>{concept.pitch || hook}</p></>}
  </div>;
}

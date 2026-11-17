import { cn } from './cn';
import { selectedCard } from './selection';
import { Check } from 'lucide-react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from './button';
import { ChoiceGroup } from './choice-group';
export const presetMoods = [
  {value:'Calm & reflective',label:'Calm & reflective',description:'Gentle pacing, quiet moments and space to breathe.'},
  {value:'Warm & uplifting',label:'Warm & uplifting',description:'Hopeful, human and full of possibility.'},
  {value:'Bold & energetic',label:'Bold & energetic',description:'Fast rhythm, confident movement and impact.'},
  {value:'Tense & mysterious',label:'Tense & mysterious',description:'Slow reveals, anticipation and uncertainty.'},
  {value:'Playful & light',label:'Playful & light',description:'Curiosity, humor and unexpected little moments.'},
  {value:'Dreamlike & atmospheric',label:'Dreamlike & atmospheric',description:'Soft transitions, texture and a sense of wonder.'},
];
export function MoodPicker({value,onChange,suggestion,loading,error,hasIdea,onRetry}:{value:string;onChange:(title:string,description:string)=>void;suggestion?:{title:string;desc:string};loading?:boolean;error?:boolean;hasIdea?:boolean;onRetry:()=>void}) {
  return <div className="space-y-5">
    <section aria-label="Suggested mood" className={cn("rounded-thumbnail border border-subtle p-4",suggestion && value===suggestion.title && selectedCard)}>
      <div className="mb-3 flex items-center gap-2 text-xs text-text-muted"><Sparkles className="size-3.5"/>Suggested for your idea{suggestion && value===suggestion.title && <span className="ml-auto flex items-center gap-1 font-medium text-text-primary"><Check className="size-3.5"/>Selected</span>}</div>
      {loading ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin motion-reduce:animate-none"/>Reading the mood of your idea…</p> : suggestion ? <><p className="text-sm font-semibold">{suggestion.title}</p><p className="mt-2 text-sm leading-relaxed text-text-muted">{suggestion.desc}</p><Button variant="soft" size="sm" className="mt-3" aria-pressed={value===suggestion.title} onClick={()=>onChange(suggestion.title,suggestion.desc)}>{value===suggestion.title?'Selected':'Use this mood'}</Button></> : <div role="status"><p className="text-sm text-text-muted">{error?'Suggestions are unavailable. Pick a mood below or describe your own.':hasIdea?'Find a mood that suits your idea, or choose one below.':'Add an idea in Brief for a suggestion. You can choose a mood below now.'}</p>{hasIdea && <Button variant="soft" size="sm" className="mt-3" onClick={onRetry}>{error?'Try again':'Suggest a mood'}</Button>}</div>}
    </section>
    <ChoiceGroup label="Mood" className="sm:grid-cols-2" value={value} onChange={title=>onChange(title,presetMoods.find(mood=>mood.value===title)?.description || '')} options={presetMoods}/>
  </div>;
}

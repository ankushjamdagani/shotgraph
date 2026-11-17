import { cn } from './cn';
export const moodVisuals = [
  {image:'editorial.jpg',grade:'saturate-50 brightness-90',pace:'Slow',light:'Soft daylight'},
  {image:'editorial.jpg',grade:'sepia-[.55] saturate-150 brightness-110',pace:'Flowing',light:'Golden warmth'},
  {image:'cyber-noir.jpg',grade:'saturate-150 contrast-125',pace:'Fast',light:'High contrast'},
  {image:'cyber-noir.jpg',grade:'saturate-50 brightness-50 contrast-125',pace:'Suspenseful',light:'Deep shadows'},
  {image:'editorial.jpg',grade:'saturate-200 brightness-125',pace:'Bouncy',light:'Bright color'},
  {image:'editorial.jpg',grade:'hue-rotate-30 saturate-50 blur-[1px] brightness-110',pace:'Drifting',light:'Diffused glow'},
];
/** Illustrative reference matching, not an AI-generated frame. */
export function getMoodVisual(title:string,description='') {
  const presetIndex=['calm & reflective','warm & uplifting','bold & energetic','tense & mysterious','playful & light','dreamlike & atmospheric'].indexOf(title.toLowerCase());
  if(presetIndex>=0) return moodVisuals[presetIndex];
  const text=(title+' '+description).toLowerCase();
  const index=/dream|atmospher|surreal|ethereal/.test(text)?5:/playful|humor|bouncy/.test(text)?4:/tense|myster|suspense|noir/.test(text)?3:/bold|energet|fast|adrenaline/.test(text)?2:/warm|uplift|golden|nostalg|hope/.test(text)?1:0;
  return moodVisuals[index];
}
export function MoodThumbnail({title,description,className}:{title:string;description?:string;className?:string}) {
  const visual=getMoodVisual(title,description);
  return <div className={cn('overflow-hidden rounded-md',className)}><img src={`/look-previews/${visual.image}`} alt={`${title} mood reference`} className={cn('size-full object-cover',visual.grade)} loading="lazy"/></div>;
}

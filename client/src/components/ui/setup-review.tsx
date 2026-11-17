import { MoodThumbnail } from './mood-visuals';
import { LookThumbnail } from './look-picker';
export function SetupReview({name,location,format,engine,mood,moodNotes,directions}:{name:string;location:string;format:string;engine:string;mood:string;moodNotes:string;directions:{id:number;title:string;look:string;customLook:string}[]}) {
 return <div className="space-y-6"><dl className="divide-y divide-subtle">{[['Project',name],['Location',location],['Format',format],['Engine',engine]].map(([label,value])=><div key={label} className="grid gap-2 py-3 sm:grid-cols-[100px_1fr]"><dt className="text-sm text-text-muted">{label}</dt><dd className="break-words text-sm">{value}</dd></div>)}</dl>
   <section className="space-y-3"><h2 className="text-sm font-medium">Mood</h2>{mood ? <div className="flex items-start gap-4"><MoodThumbnail title={mood} description={moodNotes} className="h-24 w-36 shrink-0"/><div><p className="text-sm font-semibold">{mood}</p>{moodNotes && <p className="mt-2 text-sm leading-relaxed text-text-muted">{moodNotes}</p>}</div></div>:<p className="text-sm text-text-muted">Not specified</p>}</section>
   {directions.map(direction=><section key={direction.id} className="flex items-start gap-4 border-t border-subtle pt-4"><LookThumbnail value={direction.look} className="h-24 w-36 shrink-0"/><div><h2 className="text-sm font-semibold">{direction.title}</h2><p className="mt-2 text-sm text-text-muted">{direction.look}</p>{direction.customLook && <p className="mt-1 text-sm text-text-muted">{direction.customLook}</p>}</div></section>)}
 </div>;
}

import { VisualChoiceList, type VisualListVariant } from './visual-choice-list';
import { cn } from './cn';
export const visualLooks=[
  {value:'Liquid Glass',image:'/look-previews/liquid-glass.svg',description:'Translucent layers, cool light and crisp reflections.'},
  {value:'Editorial 35mm',image:'/look-previews/editorial.jpg',description:'Warm tones, soft highlights and a natural film texture.'},
  {value:'Pop Kinetic',image:'/look-previews/pop-kinetic.svg',description:'Bold type, saturated color and graphic energy.'},
  {value:'Cyber Noir',image:'/look-previews/cyber-noir.jpg',description:'Neon light, deep shadows and city atmosphere.'},
];
export function LookThumbnail({value,className}:{value:string;className?:string}) {
  const look=visualLooks.find(item=>item.value===value)||visualLooks[0];
  return <img src={look.image} alt={`${look.value} visual reference`} className={cn('rounded-md object-cover',look.value==='Editorial 35mm'&&'sepia-[.35] saturate-75',className)} loading="lazy"/>;
}
export function LookPicker({label,value,onChange,variant='Landscape cards'}:{label:string;value:string;onChange:(value:string)=>void;variant?:VisualListVariant}) {
  return <div className="space-y-2"><VisualChoiceList label={label} value={value} onChange={onChange} variant={variant} options={visualLooks.map(look=>({...look,label:look.value,grade:look.value==='Editorial 35mm'?'sepia-[.35] saturate-75':undefined}))}/><p className="text-xs text-text-muted">Style references, not generated previews of your film.</p></div>;
}

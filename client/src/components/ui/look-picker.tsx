import { RadioGroup } from 'radix-ui';
import { Check } from 'lucide-react';
import { selectedCardData } from './selection';
import { cn } from './cn';
export const visualLooks=[
  {value:'Liquid Glass',image:'/look-previews/liquid-glass.svg',description:'Translucent layers, cool light and crisp reflections.'},
  {value:'Editorial 35mm',image:'/look-previews/editorial.jpg',description:'Warm tones, soft highlights and a natural film texture.'},
  {value:'Pop Kinetic',image:'/look-previews/pop-kinetic.svg',description:'Bold type, saturated color and graphic energy.'},
  {value:'Cyber Noir',image:'/look-previews/cyber-noir.jpg',description:'Neon light, deep shadows and city atmosphere.'},
];
export function LookPicker({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) {
  return <div className="space-y-2"><RadioGroup.Root aria-label={label} value={value} onValueChange={onChange} className="grid gap-4 sm:grid-cols-2">{visualLooks.map(look=><RadioGroup.Item value={look.value} key={look.value} className={cn('group overflow-hidden rounded-thumbnail border border-subtle bg-transparent text-left outline-none transition-colors duration-fast focus-visible:ring-1 focus-visible:ring-focus',selectedCardData)}>
    <div className="relative"><img src={look.image} alt={`${look.value} visual reference`} className={cn('aspect-video w-full object-cover',look.value==='Editorial 35mm'&&'sepia-[.35] saturate-75')} loading="lazy"/><RadioGroup.Indicator className="absolute right-3 top-3 flex size-6 items-center justify-center rounded-full bg-text-primary text-app"><Check className="size-4"/></RadioGroup.Indicator></div><div className="space-y-2 p-4"><span className="block text-sm font-semibold">{look.value}</span><span className="block text-xs leading-relaxed text-text-muted">{look.description}</span></div>
  </RadioGroup.Item>)}</RadioGroup.Root><p className="text-xs text-text-muted">Style references, not generated previews of your film.</p></div>;
}

import {useState,useEffect} from 'react';
import {LevaPanel,useControls,useCreateStore,button} from 'leva';
import {SlidersHorizontal} from 'lucide-react';
import {IconButton} from '../components/ui';
import {visualListVariants,type VisualListVariant} from '../components/ui/visual-choice-list';
export default function VisualListTools({onChange}:{onChange:(variant:VisualListVariant)=>void}) {
 const store=useCreateStore(),[open,setOpen]=useState(false);
 const [values,set]=useControls('Visual choices',()=>({layout:{value:'Landscape cards',options:[...visualListVariants],label:'Horizontal cards'},Reset:button(()=>set({layout:'Landscape cards'}))}),{store});
 useEffect(()=>onChange(values.layout as VisualListVariant),[values.layout,onChange]);
 return <><div className="fixed bottom-5 left-5 z-[60]"><IconButton variant="secondary" borderTone="subtle" label="Visual card design controls" onClick={()=>setOpen(!open)}><SlidersHorizontal/></IconButton></div><LevaPanel store={store} hidden={!open} titleBar={{title:'Create · Card lists'}}/></>;
}

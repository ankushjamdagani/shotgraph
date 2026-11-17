import { useEffect,useState } from 'react';
import { LevaPanel,useControls,useCreateStore,button } from 'leva';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { progressVariants,type ProgressVariant } from '../components/ui/setup-progress';
export default function SetupProgressTools({onChange}:{onChange:(value:ProgressVariant)=>void}) {
  const store=useCreateStore(); const [open,setOpen]=useState(false);
  const [values,set]=useControls('Setup progress',()=>({variant:{value:'Named track',options:[...progressVariants],label:'Progress panel'},Reset:button(()=>set({variant:'Named track'}))}),{store});
  useEffect(()=>onChange(values.variant as ProgressVariant),[values.variant,onChange]);
  return <><div className="fixed bottom-5 left-5 z-[60]"><IconButton label="Progress design controls" variant="secondary" borderTone="subtle" onClick={()=>setOpen(!open)}><SlidersHorizontal/></IconButton></div><LevaPanel hidden={!open} store={store} titleBar={{title:'Create · Progress'}}/></>;
}

import { useEffect, useState } from 'react';
import { LevaPanel, useControls, useCreateStore, button } from 'leva';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { setupActionVariants, type SetupActionVariant } from '../components/ui/setup-actions';
export default function SetupDesignTools({onChange}:{onChange:(value:SetupActionVariant)=>void}) {
  const store=useCreateStore(); const [open,setOpen]=useState(false);
  const [values,set]=useControls('Create project',()=>({actions:{value:'Quiet split',options:[...setupActionVariants],label:'Action layout'},Reset:button(()=>set({actions:'Quiet split'}))}),{store});
  useEffect(()=>onChange(values.actions as SetupActionVariant),[values.actions,onChange]);
  return <><div className="fixed bottom-5 left-5 z-[60]"><IconButton variant="secondary" borderTone="subtle" label="Creation design controls" onClick={()=>setOpen(!open)}><SlidersHorizontal/></IconButton></div><LevaPanel store={store} hidden={!open} titleBar={{title:'Create · Actions'}}/></>;
}

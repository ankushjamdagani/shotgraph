import { projectTitleVariants, type ProjectTitleVariant } from '../components/ui/project-title-field';
import { useEffect, useState } from 'react';
import { LevaPanel, useControls, useCreateStore, button } from 'leva';
import { SlidersHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { setupActionVariants, type SetupActionVariant } from '../components/ui/setup-actions';
export default function SetupDesignTools({onChange,onTitleChange}:{onChange:(value:SetupActionVariant)=>void;onTitleChange:(value:ProjectTitleVariant)=>void}) {
  const store=useCreateStore(); const [open,setOpen]=useState(false);
  const [values,set]=useControls('Create project',()=>({actions:{value:'Quiet split',options:[...setupActionVariants],label:'Action layout'},title:{value:'Above idea',options:[...projectTitleVariants],label:'Title placement'},Reset:button(()=>set({actions:'Quiet split',title:'Above idea'}))}),{store});
  useEffect(()=>onChange(values.actions as SetupActionVariant),[values.actions,onChange]);
  useEffect(()=>onTitleChange(values.title as ProjectTitleVariant),[values.title,onTitleChange]);
  return <><div className="fixed bottom-5 left-5 z-[60]"><IconButton variant="secondary" borderTone="subtle" label="Creation design controls" onClick={()=>setOpen(!open)}><SlidersHorizontal/></IconButton></div><LevaPanel store={store} hidden={!open} titleBar={{title:'Create · Layout'}}/></>;
}

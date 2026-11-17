import type { Meta,StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StoryDeck } from './story-deck';
const directions=['Coastal drift','Meadow reverie','City at dawn'].map((title,index)=>({id:index+1,title,durationLabel:'30s · 3 beats',beats:[{label:'Opening',text:'A quiet detail introduces the setting.'},{label:'Movement',text:'The camera follows the subject into a changing landscape.'},{label:'Closing',text:'A final wide frame lets the moment settle.'}]}));
const meta={title:'Patterns/Story deck',component:StoryDeck} satisfies Meta<typeof StoryDeck>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Stacked:Story={args:{directions,selected:new Set([1]),onToggle:()=>{}},render:function Example(args){const [selected,setSelected]=useState(new Set([1]));return <div className="w-[min(760px,85vw)]"><StoryDeck {...args} selected={selected} onToggle={id=>setSelected(previous=>{const next=new Set(previous);if(next.has(id)){if(next.size>1)next.delete(id);}else next.add(id);return next;})}/></div>;}};

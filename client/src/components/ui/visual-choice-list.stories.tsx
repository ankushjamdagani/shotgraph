import type { Meta,StoryObj } from '@storybook/react-vite';
import {useState} from 'react';
import {VisualChoiceList,visualListVariants} from './visual-choice-list';
import {visualLooks} from './look-picker';
const meta={title:'Patterns/Horizontal visual choices',component:VisualChoiceList} satisfies Meta<typeof VisualChoiceList>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Variants:Story={args:{label:'Visual style',value:'Liquid Glass',onChange:()=>{},options:visualLooks.map(item=>({...item,label:item.value}))},render:function Example(args){const [value,setValue]=useState(args.value);return <div className="w-[min(800px,85vw)] space-y-8">{visualListVariants.map(variant=><section key={variant}><h2 className="mb-3 text-sm font-semibold">{variant}</h2><VisualChoiceList {...args} variant={variant} value={value} onChange={setValue}/></section>)}</div>;}};

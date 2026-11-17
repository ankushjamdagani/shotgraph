import type { Meta,StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { LookPicker } from './look-picker';
const meta={title:'Inputs/Visual looks',component:LookPicker} satisfies Meta<typeof LookPicker>;
export default meta;
type Story=StoryObj<typeof meta>;
export const References:Story={args:{label:'Visual style',value:'Liquid Glass',onChange:()=>{}},render:function Example(args){const [value,setValue]=useState(args.value);return <div className="w-[min(760px,85vw)]"><LookPicker {...args} value={value} onChange={setValue}/></div>;}};

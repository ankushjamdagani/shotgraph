import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SetupProgress } from './setup-progress';
const meta={title:'Patterns/Setup progress',component:SetupProgress} satisfies Meta<typeof SetupProgress>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Revisitable:Story={args:{steps:['Brief','Format','Mood','Engine','Story','Look','Review'],current:3,furthest:4,onSelect:()=>{}},render:function Example(args){const [current,setCurrent]=useState(args.current);return <div className="w-[min(760px,85vw)]"><SetupProgress {...args} current={current} onSelect={setCurrent}/></div>;}};

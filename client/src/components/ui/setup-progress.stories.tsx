import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SetupProgress, progressVariants } from './setup-progress';
const meta={title:'Patterns/Setup progress',component:SetupProgress} satisfies Meta<typeof SetupProgress>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Revisitable:Story={args:{steps:['Brief','Format','Mood','Engine','Story','Look','Review'],current:3,furthest:4,onSelect:()=>{}},render:function Example(args){const [current,setCurrent]=useState(args.current);return <div className="w-[min(760px,85vw)]"><SetupProgress {...args} current={current} onSelect={setCurrent}/></div>;}};

export const Variants: Story = {
  args: Revisitable.args,
  render: args => <div className="w-[min(760px,85vw)] space-y-8">{progressVariants.map(variant=><section key={variant}><h2 className="mb-4 text-sm font-medium">{variant}</h2><SetupProgress {...args} variant={variant}/></section>)}</div>,
};
